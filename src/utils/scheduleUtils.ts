import { startOfWeek, endOfWeek, format, eachDayOfInterval, addDays, parse, startOfMonth, endOfMonth } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { WeeklySchedule } from '../types';

export const getDaysOfWeek = (referenceDate?: Date) => {
  const date = referenceDate || new Date();
  const jstDate = utcToZonedTime(date, 'Asia/Tokyo');
  
  // 月曜始まりの週
  const start = startOfWeek(jstDate, { weekStartsOn: 1 });
  const end = endOfWeek(jstDate, { weekStartsOn: 1 });
  
  // 平日のみ (月-金)
  return eachDayOfInterval({ start, end })
    .filter(date => {
      const day = date.getDay();
      return day !== 0 && day !== 6; // 日曜と土曜を除外
    })
    .map(date => format(date, 'yyyy-MM-dd'));
};

export const getNextWeekDays = () => {
  const today = new Date();
  const nextMonday = addDays(today, (1 + 7 - today.getDay()) % 7 || 7);
  return getDaysOfWeek(nextMonday);
};

export const formatWeeklySchedule = (schedule: WeeklySchedule) => {
  const days = ['月', '火', '水', '木', '金'];
  const dayNames = Object.keys(schedule).sort();
  
  let formattedText = '今週の掃除当番:\n';
  
  dayNames.forEach((date, index) => {
    const dayInfo = schedule[date];
    const dateStr = format(new Date(date), 'M/d');
    const completedMark = dayInfo.completed ? '✅' : '⬜';
    const isToday = format(utcToZonedTime(new Date(), 'Asia/Tokyo'), 'yyyy-MM-dd') === date;
    const todayMark = isToday ? ' ← 本日' : '';
    
    formattedText += `${days[index]}(${dateStr}): <@${dayInfo.userId}> ${completedMark}${todayMark}\n`;
  });
  
  return formattedText;
};

// 月内の全平日を取得
export const getAllWeekdaysInMonth = (yearMonth: string): string[] => {
  // YYYY-MM形式の入力を受け取る
  const date = parse(yearMonth, 'yyyy-MM', new Date());
  const jstDate = utcToZonedTime(date, 'Asia/Tokyo');
  
  const start = startOfMonth(jstDate);
  const end = endOfMonth(jstDate);
  
  // 月内の全日を取得し、平日（月-金）のみをフィルタリング
  return eachDayOfInterval({ start, end })
    .filter(date => {
      const day = date.getDay();
      return day !== 0 && day !== 6; // 日曜(0)と土曜(6)を除外
    })
    .map(date => format(date, 'yyyy-MM-dd'));
}; 