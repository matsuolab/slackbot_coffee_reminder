import { getCurrentState } from '../db/schema';
import { parseISO, addMinutes, isAfter } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

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