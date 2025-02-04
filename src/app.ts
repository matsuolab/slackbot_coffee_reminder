import 'dotenv/config';
import { App, ExpressReceiver } from '@slack/bolt';
import { generateHourOptions, generateMinuteOptions, getDefaultHour } from './utils/timeUtils';
import { getCurrentState, updateState, logAction } from './db/schema';
import { CronJob } from 'cron';
import { checkAndNotify } from './utils/notifications';
import { withRetry } from './utils/retry';

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
      const [action] = command.text.split(' ');
      switch (action) {
        case 'on':
          await handleOnCommand(command.user_id, client, command.trigger_id);
          break;
        case 'off':
          await handleOffCommand(command.user_id, client);
          break;
        case 'status':
          await handleStatusCommand(say);
          break;
        case 'help':
          await handleHelpCommand(say);
          break;
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

const handleOnCommand = async (userId: string, client: any, triggerId: string) => {
    const currentState = await getCurrentState();
    if (currentState.isRunning) {
      await client.chat.postMessage({
        channel: userId,
        text: 'すでにマシンは起動しています。'
      });
      return;
    }
  
    const currentTime = new Date();
    const hours = generateHourOptions(currentTime);
    const minutes = generateMinuteOptions();
    const defaultHour = getDefaultHour(currentTime);
  
    if (!hours.includes(15)) {
      hours.push(15);
      hours.sort((a, b) => a - b);
    }
  
    const defaultHourOption = {
      text: {
        type: 'plain_text',
        text: `${defaultHour}時`,
        emoji: true
      },
      value: defaultHour.toString()
    };

    const defaultMinuteOption = {
      text: {
        type: 'plain_text',
        text: '00分',
        emoji: true
      },
      value: '00'
    };

    try {
      await client.views.open({
        trigger_id: triggerId,
        view: {
          type: 'modal',
          callback_id: 'coffee_time_selection',
          title: {
            type: 'plain_text',
            text: '片付け時間の選択',
            emoji: true
          },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '片付ける時間を選択してください：'
              }
            },
            {
              type: 'actions',
              block_id: 'time_select_block',
              elements: [
                {
                  type: 'static_select',
                  action_id: 'hour_select',
                  placeholder: {
                    type: 'plain_text',
                    text: '時間を選択',
                    emoji: true
                  },
                  options: hours.map(hour => ({
                    text: {
                      type: 'plain_text',
                      text: `${hour}時`,
                      emoji: true
                    },
                    value: hour.toString()
                  })),
                  initial_option: defaultHourOption
                },
                {
                  type: 'static_select',
                  action_id: 'minute_select',
                  placeholder: {
                    type: 'plain_text',
                    text: '分を選択',
                    emoji: true
                  },
                  options: minutes.map(minute => ({
                    text: {
                      type: 'plain_text',
                      text: `${minute.toString().padStart(2, '0')}分`,
                      emoji: true
                    },
                    value: minute.toString().padStart(2, '0')
                  })),
                  initial_option: defaultMinuteOption
                }
              ]
            }
          ],
          submit: {
            type: 'plain_text',
            text: '確定',
            emoji: true
          }
        }
      });
    } catch (error) {
      console.error('Error opening modal:', error);
      await client.chat.postMessage({
        channel: userId,
        text: 'エラーが発生しました。もう一度お試しください。'
      });
    }
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
      await say(`:coffee_parrot: マシンは起動中です。:coffee_parrot: \n開けた時刻: ${startTime}、しめる時刻: ${currentState.cleanupTime}、開けた人: <@${currentState.startedBy}>さん`);
    } else {
      if (currentState.stoppedAt && currentState.stoppedBy) {
        const stoppedTime = new Date(currentState.stoppedAt).toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit'
        });
        await say(`:loading: マシンは停止しています。:loading: \nしめた時刻: ${stoppedTime}、しめた人: <@${currentState.stoppedBy}>さん`);
      } else {
        await say(':loading: マシンは停止しています。:loading:');
      }
    }
  };
  
  const handleHelpCommand = async (say: Function) => {
    await say('使用可能なコマンド:\n/barista on - マシンをあけるとき使う\n/barista off - マシンをしめるとき使う\n/barista status - マシンの起動状態・開けた人・しめた人を確認できる\n/barista help - このヘルプメッセージを表示');
  };
  
  // 時間選択のハンドラ
  app.view('coffee_time_selection', async ({ body, view, client, ack }) => {
    await ack();
    try {
      const hourValue = view.state.values.time_select_block.hour_select.selected_option?.value;
      const minuteValue = view.state.values.time_select_block.minute_select.selected_option?.value;
      const userId = body.user.id;
  
      if (!hourValue || !minuteValue) {
        throw new Error('時間が選択されていません');
      }
  
      const selectedTime = `${hourValue.padStart(2, '0')}:${minuteValue}`;
  
      await updateState({
        isRunning: true,
        startedBy: userId,
        startedAt: new Date().toISOString(),
        cleanupTime: selectedTime,
        stoppedBy: null,
        stoppedAt: null
      });
  
      await logAction('START', userId, selectedTime);
  
      if (!process.env.SLACK_CHANNEL_ID) {
        throw new Error('SLACK_CHANNEL_ID is not defined');
      }
  
      await client.chat.postMessage({
        channel: process.env.SLACK_CHANNEL_ID,
        text: `マシンが開きました！\n開けてくれた人: <@${userId}>、しめる時刻: ${selectedTime}`
      });
    } catch (error) {
      console.error('Error handling time selection:', error);
      if (body.user.id) {
        await client.chat.postMessage({
          channel: body.user.id,
          text: 'エラーが発生しました。もう一度お試しください。'
        });
      }
    }
  });

  // 通知チェック用エンドポイント
  receiver.router.post('/check-notifications', async (req, res) => {
    try {
      await checkAndNotify(app.client.chat.postMessage);
      res.status(200).json({ 
        status: 'success',
        message: 'Notification check completed'
      });
    } catch (error) {
      console.error('Notification check error:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Failed to check notifications'
      });
    }
  });

  // Expressサーバーの起動
  (async () => {
    const port = process.env.PORT || 3000;
    await app.start(port);
    console.log(`⚡️ Bolt app is running on port ${port}!`);
  })();

  app.message('ping', async ({ say }) => {
    await say('pong');
  });

  // 定期的なウォームアップ用エンドポイント
  receiver.router.get('/warmup', (req, res) => {
    res.send('OK');
  });

  // 30分ごとに通知をチェック
  const notificationJob = new CronJob(
    '*/30 * * * *',  // 30分ごと
    async () => {
      try {
        await checkAndNotify(app.client.chat.postMessage);
      } catch (error) {
        console.error('Notification check error:', error);
      }
    },
    null,
    true,
    'Asia/Tokyo'
  );

  // サーバー起動時にcronジョブを開始
  notificationJob.start();