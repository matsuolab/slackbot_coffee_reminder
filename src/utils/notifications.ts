import { getCurrentState } from '../db/schema';
import { parseISO, addMinutes, isAfter, format } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { getWeeklySchedule, getTodayCleaner } from '../db/schema';
import { formatWeeklySchedule } from './scheduleUtils';

export const checkAndNotify = async (say: Function) => {
  const state = await getCurrentState();
  if (!state.isRunning) return;

  const now = utcToZonedTime(new Date(), 'Asia/Tokyo');
  const cleanupTime = parseISO(`${now.toISOString().split('T')[0]}T${state.cleanupTime}:00`);
  const jstCleanupTime = utcToZonedTime(cleanupTime, 'Asia/Tokyo');
  
  const thirtyMinsBefore = addMinutes(jstCleanupTime, -30);
  const thirtyMinsAfter = addMinutes(jstCleanupTime, 30);

  const nowTime = now.getTime();
  const targetTime = thirtyMinsBefore.getTime();
  
  if (Math.abs(nowTime - targetTime) <= 60000) {
    await say({
      channel: process.env.SLACK_CHANNEL_ID,
      text: `<@${state.startedBy}> あと30分で片付ける時間です`
    });
  }

  if (isAfter(now, thirtyMinsAfter)) {
    await say({
      channel: process.env.SLACK_CHANNEL_ID,
      text: `<!here> マシンを片付け忘れています！`
    });
  }
};

// 金曜日に次週のスケジュールを通知する関数
export const notifyWeeklySchedule = async (client: any) => {
  try {
    // 今日が金曜日で15時かどうか確認
    const now = utcToZonedTime(new Date(), 'Asia/Tokyo');
    const isTime = now.getDay() === 5 && now.getHours() === 15 && now.getMinutes() < 5;
    
    if (!isTime) return;

    const nextWeekSchedule = await getWeeklySchedule(true);
    const formattedSchedule = formatWeeklySchedule(nextWeekSchedule);
    
    await client.chat.postMessage({
      channel: process.env.SLACK_CHANNEL_ID,
      text: `来週の掃除当番表をお知らせします:\n${formattedSchedule}`
    });
  } catch (error) {
    console.error('Error sending weekly schedule notification:', error);
  }
};

// 当日の掃除担当者を通知
export const notifyTodayCleaner = async (client: any) => {
  try {
    const userId = await getTodayCleaner();
    if (!userId) return null;
    
    return userId;
  } catch (error) {
    console.error('Error getting today cleaner:', error);
    return null;
  }
}; 