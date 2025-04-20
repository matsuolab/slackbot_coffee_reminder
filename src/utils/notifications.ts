import { getCurrentState } from '../db/schema';
import { parseISO, addMinutes, isAfter, format } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { getWeeklySchedule, getTodayCleaner } from '../db/schema';
import { formatWeeklySchedule } from './scheduleUtils';

// 定期チェック関数を更新（片付け時間に関する通知を削除）
export const checkAndNotify = async (say: Function) => {
  // 元の30分前通知と片付け忘れ通知はもう不要なので削除
  // 17時のチェックがapp.tsで実装されているため
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