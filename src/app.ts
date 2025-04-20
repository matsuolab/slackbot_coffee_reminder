import 'dotenv/config';
import { App, ExpressReceiver } from '@slack/bolt';
import { generateHourOptions, generateMinuteOptions, getDefaultHour } from './utils/timeUtils';
import { 
  getCurrentState, 
  updateState, 
  logAction, 
  getTodayCleaner, 
  getWeeklySchedule,
  setCleaningCompleted,
  changeCleaningAssignment,
  registerCleaningSchedules
} from './db/schema';
import { CronJob } from 'cron';
import { 
  checkAndNotify, 
  notifyWeeklySchedule,
  notifyTodayCleaner 
} from './utils/notifications';
import { withRetry } from './utils/retry';
import { formatWeeklySchedule } from './utils/scheduleUtils';
import { format } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET!
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  receiver: receiver,
  socketMode: false
});

// エラーハンドリングを追加
app.error(async (error) => {
  console.error('Slackアプリエラー詳細:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
});

// Slackコマンドのハンドラ
app.command('/barista', async ({ command, client, say, ack }) => {
  await ack();
  try {
    await withRetry(async () => {
      const params = command.text.split(' ');
      const action = params[0];
      
      switch (action) {
        case 'on':
          await handleOnCommand(command.user_id, client);
          break;
        case 'off':
          await handleOffCommand(command.user_id, client);
          break;
        case 'status':
          await handleStatusCommand(say);
          break;
        case 'schedule':
          await handleScheduleCommand(say);
          break;
        case 'change':
          if (params.length < 3) {
            await client.chat.postMessage({
              channel: command.user_id,
              text: '使用方法: /barista change @ユーザー 日付(YYYY-MM-DD)'
            });
            break;
          }
          const userId = params[1].replace(/[<@>]/g, '');
          const date = params[2];
          await handleChangeCommand(command.user_id, userId, date, client);
          break;
        case 'register':
          await handleRegisterCommand(command.user_id, command.text, client);
          break;
        case 'help':
          await handleHelpCommand(say);
          break;
        // 以下は隠しコマンド（そのまま残す）
        case 'matsuo':
          await say(':prof_matsuo: < 100万ごえのコーヒーの味はどうすか？');
          break;
        case 'jeong':
          await say('ちょん< 正直味のちがいわからん :hanpanai:');
          break;
        case 'taniguchi':
          await say('谷口< 俺は人が開けたときしか飲まない');
          break;
        case 'ohshima':
          await say('大島< そのコップはおとといのやつ');
          break;
        case 'nakano':
          await say('中野< カフェインが足りない :atamawarui:');
          break;
        case 'joji':
          await say(':joji: < カフェインとったら筋トレしろって');
          break;
        case 'minegishi':
          await say(':gouki: < ねむい');
          break;
        case 'iiyama':
          await say('飯山< カフェインは錠剤のんでるのでコーヒーいらない');
          break;
        case 'secret':
          await say('隠しコマンド一覧\n/barista jeong\n/barista taniguchi\n/barista ohshima\n/barista nakano\n/barista joji\n/barista minegishi\n/barista iiyama');
          break;
        default:
          await client.chat.postMessage({
            channel: command.user_id,
            text: '無効なコマンドです。'
          });
      }
    }, 3, 2000);
  } catch (error) {
    console.error('コマンド実行エラー:', error);
    await client.chat.postMessage({
      channel: command.user_id,
      text: 'エラーが発生しました。しばらく待ってから再度お試しください。'
    });
  }
});

const handleOnCommand = async (userId: string, client: any) => {
  const currentState = await getCurrentState();
  if (currentState.isRunning) {
    await client.chat.postMessage({
      channel: userId,
      text: 'すでにマシンは起動しています。'
    });
    return;
  }

  const now = new Date().toISOString();
  
  await updateState({
    isRunning: true,
    startedBy: userId,
    startedAt: now,
    cleanupTime: null,
    stoppedBy: null,
    stoppedAt: null
  });
  
  await logAction('START', userId, null);
  
  const todayCleaner = await getTodayCleaner();
  
  if (!process.env.SLACK_CHANNEL_ID) {
    throw new Error('SLACK_CHANNEL_ID is not defined');
  }
  
  let message = `マシンが開けられました! :kami:\n<@${userId}>さんがマシンを開けました。`;
  
  if (todayCleaner) {
    const todayDate = format(utcToZonedTime(new Date(), 'Asia/Tokyo'), 'M/d');
    message += `\n本日（${todayDate}）の掃除担当は <@${todayCleaner}> さんです。`;
  }
  
  await client.chat.postMessage({
    channel: process.env.SLACK_CHANNEL_ID,
    text: message
  });
};

const handleOffCommand = async (userId: string, client: any) => {
  const currentState = await getCurrentState();
  if (!currentState.isRunning) {
    await client.chat.postMessage({
      channel: userId,
      text: 'すでにマシンはしまっています。'
    });
    return;
  }

  const stoppedAt = new Date().toISOString();
  
  await updateState({
    isRunning: false,
    startedBy: null,
    startedAt: null,
    cleanupTime: null,
    stoppedBy: userId,
    stoppedAt: stoppedAt
  });

  await logAction('STOP', userId, currentState.cleanupTime || '');
  
  // 掃除完了を記録
  await setCleaningCompleted(userId);
  
  if (!process.env.SLACK_CHANNEL_ID) {
    throw new Error('SLACK_CHANNEL_ID is not defined');
  }
  
  await client.chat.postMessage({
    channel: process.env.SLACK_CHANNEL_ID,
    text: `マシンをしめました!:cry2: \n<@${userId}>さん、今日もお手入れありがとうございました！:fb-laugh:`
  });
};

const handleStatusCommand = async (say: Function) => {
  const currentState = await getCurrentState();
  if (currentState.isRunning) {
    const startTime = new Date(currentState.startedAt!).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });
    await say(`:coffee_parrot: マシンは起動中です。:coffee_parrot: \n開けた時刻: ${startTime}、開けた人: <@${currentState.startedBy}>さん`);
  } else {
    if (currentState.stoppedAt && currentState.stoppedBy) {
      const stoppedTime = new Date(currentState.stoppedAt).toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
      });
      await say(`マシンはしまっています。\n最後に閉めた時刻: ${stoppedTime}、閉めた人: <@${currentState.stoppedBy}>さん`);
    } else {
      await say('マシンはしまっています。');
    }
  }
  
  // 当日の掃除担当者を取得して表示
  const todayCleaner = await getTodayCleaner();
  if (todayCleaner) {
    const today = format(utcToZonedTime(new Date(), 'Asia/Tokyo'), 'M/d');
    await say(`本日（${today}）の掃除担当: <@${todayCleaner}>さん`);
  }
};

const handleScheduleCommand = async (say: Function) => {
  try {
    const weeklySchedule = await getWeeklySchedule();
    const formattedSchedule = formatWeeklySchedule(weeklySchedule);
    await say(formattedSchedule);
  } catch (error) {
    console.error('Error in schedule command:', error);
    await say('スケジュールの取得中にエラーが発生しました。');
  }
};

const handleChangeCommand = async (
  requesterId: string,
  targetUserId: string,
  dateStr: string,
  client: any
) => {
  try {
    // 日付形式の検証（YYYY-MM-DD）
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      await client.chat.postMessage({
        channel: requesterId,
        text: '日付はYYYY-MM-DD形式で指定してください。例: 2024-06-10'
      });
      return;
    }
    
    // 担当を変更
    const success = await changeCleaningAssignment(targetUserId, dateStr);
    
    if (success) {
      const formattedDate = format(new Date(dateStr), 'M/d');
      
      await client.chat.postMessage({
        channel: process.env.SLACK_CHANNEL_ID,
        text: `${formattedDate}の掃除担当が <@${targetUserId}> さんに変更されました。`
      });
    } else {
      await client.chat.postMessage({
        channel: requesterId,
        text: '担当変更処理中にエラーが発生しました。もう一度お試しください。'
      });
    }
  } catch (error) {
    console.error('Error in change command:', error);
    await client.chat.postMessage({
      channel: requesterId,
      text: 'エラーが発生しました。しばらく待ってから再度お試しください。'
    });
  }
};

const handleRegisterCommand = async (userId: string, commandText: string, client: any) => {
  try {
    // 入力解析
    const parts = commandText.split(' ');
    
    if (parts.length < 3) {
      await client.chat.postMessage({
        channel: userId,
        text: '使用方法: /barista register YYYY-MM @user1 @user2 @user3...\n例: /barista register 2024-06 @tanaka @suzuki @yamada'
      });
      return;
    }
    
    const yearMonth = parts[1];
    // 日付形式チェック
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      await client.chat.postMessage({
        channel: userId,
        text: '年月はYYYY-MM形式で指定してください。例: 2024-06'
      });
      return;
    }
    
    // ユーザーID抽出
    const userIds = parts.slice(2).map(user => user.replace(/[<@>]/g, ''));
    
    if (userIds.length === 0) {
      await client.chat.postMessage({
        channel: userId,
        text: '少なくとも1人のユーザーを指定してください。'
      });
      return;
    }
    
    // スケジュール登録
    const success = await registerCleaningSchedules(userIds, yearMonth);
    
    if (success) {
      // フォーマット（例：2024年6月）
      const [year, month] = yearMonth.split('-');
      const formattedMonth = `${year}年${parseInt(month)}月`;
      
      await client.chat.postMessage({
        channel: process.env.SLACK_CHANNEL_ID!,
        text: `${formattedMonth}の掃除当番表を登録しました。\n担当者: ${userIds.map(id => `<@${id}>`).join(', ')}`
      });
    } else {
      await client.chat.postMessage({
        channel: userId,
        text: '掃除当番の登録中にエラーが発生しました。もう一度お試しください。'
      });
    }
  } catch (error) {
    console.error('Error in register command:', error);
    await client.chat.postMessage({
      channel: userId,
      text: 'エラーが発生しました。しばらく待ってから再度お試しください。'
    });
  }
};

const handleHelpCommand = async (say: Function) => {
  await say(`
コーヒーマシン管理ボットのコマンド一覧:

\`/barista on\` - マシンを開ける + 当日の掃除当番をメンション
\`/barista off\` - マシンを閉じる + 掃除完了報告
\`/barista status\` - 現在のマシン状態を確認
\`/barista schedule\` - 掃除スケジュール確認
\`/barista change @ユーザー 日付\` - 担当日変更（例: /barista change @user 2024-06-10）
\`/barista register YYYY-MM @user1 @user2...\` - 月間掃除当番登録
\`/barista help\` - このヘルプを表示
  `);
};

// 通知用のCronジョブ設定
// 元のcronを削除し、17時チェックだけにする
// const checkCron = new CronJob(
//   '*/1 * * * *', // 1分ごとに実行
//   async () => {
//     try {
//       await checkAndNotify(app.client.chat.postMessage);
//     } catch (error) {
//       console.error('Error in checkCron:', error);
//     }
//   },
//   null,
//   true
// );

// 金曜日の15時に次週のスケジュール通知用のCronジョブ
const scheduleCron = new CronJob(
  '0 15 * * 5', // 金曜日の15時に実行
  async () => {
    try {
      await notifyWeeklySchedule(app.client);
    } catch (error) {
      console.error('Error in scheduleCron:', error);
    }
  },
  null,
  true
);

// 17時チェック用のCronジョブを追加
const dailyReminderCron = new CronJob(
  '0 17 * * *', // 毎日17時に実行
  async () => {
    try {
      const currentState = await getCurrentState();
      
      // マシンがまだ開いている場合は通知
      if (currentState.isRunning) {
        await app.client.chat.postMessage({
          channel: process.env.SLACK_CHANNEL_ID!,
          text: `<!here> マシンがまだ開いています！閉め忘れていませんか？\n<@${currentState.startedBy}>さんが${format(new Date(currentState.startedAt!), 'HH:mm')}に開けました。`
        });
      }
    } catch (error) {
      console.error('Error in daily reminder cron:', error);
    }
  },
  null,
  true,
  'Asia/Tokyo'
);

// サーバーの起動処理
(async () => {
  await app.start(process.env.PORT || 3000);
  console.log(`⚡️ Bolt app is running on port ${process.env.PORT || 3000}!`);
})();