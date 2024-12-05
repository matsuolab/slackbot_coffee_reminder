import 'dotenv/config';
import { App, ExpressReceiver } from '@slack/bolt';
import { generateHourOptions, generateMinuteOptions } from './utils/timeUtils';
import { getCurrentState, updateState, logAction } from './db/schema';
import { CronJob } from 'cron';
import { checkAndNotify } from './utils/notifications';
import { withRetry } from './utils/retry';

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  processBeforeResponse: true,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  receiver: receiver,
  processBeforeResponse: true,
  socketMode: false,
});

// エラーハンドリングを追加
app.error(async (error) => {
  console.error('Slackアプリでエラーが発生しました:', error);
});

// Slackコマンドのハンドラ
app.command('/barista', async ({ command, ack, client, say }) => {
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
  
    try {
      await client.views.open({
        trigger_id: triggerId,
        view: {
          type: 'modal',
          callback_id: 'coffee_time_selection',
          title: {
            type: 'plain_text',
            text: '片付け時間の選択'
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
                    text: '時間を選択'
                  },
                  initial_option: {
                    text: {
                      type: 'plain_text',
                      text: '15時'
                    },
                    value: '15'
                  },
                  options: hours.map(hour => ({
                    text: {
                      type: 'plain_text',
                      text: `${hour}時`
                    },
                    value: hour.toString()
                  }))
                },
                {
                  type: 'static_select',
                  action_id: 'minute_select',
                  placeholder: {
                    type: 'plain_text',
                    text: '分を選択'
                  },
                  initial_option: {
                    text: {
                      type: 'plain_text',
                      text: '00分'
                    },
                    value: '00'
                  },
                  options: minutes.map(minute => ({
                    text: {
                      type: 'plain_text',
                      text: `${minute.toString().padStart(2, '0')}分`
                    },
                    value: minute.toString().padStart(2, '0')
                  }))
                }
              ]
            }
          ],
          submit: {
            type: 'plain_text',
            text: '確定'
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
      text: `<@${userId}>さんがマシンをしめました。おつかれさまでした！`
    });
  };
  
  const handleStatusCommand = async (say: Function) => {
    const currentState = await getCurrentState();
    if (currentState.isRunning) {
      const startTime = new Date(currentState.startedAt!).toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
      });
      await say(`マシンは起動中です。開けた時刻: ${startTime}、しめる時刻: ${currentState.cleanupTime}、開けた人: <@${currentState.startedBy}>さん`);
    } else {
      if (currentState.stoppedAt && currentState.stoppedBy) {
        const stoppedTime = new Date(currentState.stoppedAt).toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit'
        });
        await say(`マシンは停止しています。しめた時刻: ${stoppedTime}、しめた人: <@${currentState.stoppedBy}>さん`);
      } else {
        await say('マシンは停止しています。');
      }
    }
  };
  
  const handleHelpCommand = async (say: Function) => {
    await say('使用可能なコマンド:\n/barista on - マシンをあけるとき使う\n/barista off - マシンをしめるとき使う\n/barista status - マシンの起動状態・開けた人・しめた人を確認できる\n/barista help - このヘルプメッセージを表示');
  };
  
  // 時間選択のハンドラ
  app.view('coffee_time_selection', async ({ ack, body, view, client }) => {
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
        text: `<@${userId}>がマシンを開けました。${selectedTime}にしめます。`
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

  const port = process.env.PORT || 3000;
  receiver.app.listen(port, () => {
    console.log(`⚡️ Slackボットサーバーが起動しました - ポート ${port}`);
  });