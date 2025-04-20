import { createClient } from '@supabase/supabase-js';
import { CoffeeMachineState, CleaningSchedule, WeeklySchedule } from '../types';
import { getDaysOfWeek, getNextWeekDays, getAllWeekdaysInMonth } from '../utils/scheduleUtils';
import { format } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
);

let stateCache: {
  data: CoffeeMachineState;
  timestamp: number;
} | null = null;

const CACHE_TTL = 5000; // 5秒

export const getCurrentState = async (): Promise<CoffeeMachineState> => {
  if (stateCache && Date.now() - stateCache.timestamp < CACHE_TTL) {
    return stateCache.data;
  }

  try {
    const { data, error } = await supabase
      .from('machine_state')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    const state = {
      isRunning: data?.is_running ?? false,
      startedBy: data?.started_by ?? null,
      startedAt: data?.started_at ?? null,
      cleanupTime: data?.cleanup_time ?? null,
      stoppedBy: data?.stopped_by ?? null,
      stoppedAt: data?.stopped_at ?? null
    };

    stateCache = {
      data: state,
      timestamp: Date.now()
    };

    return state;
  } catch (error) {
    console.error('Error in getCurrentState:', error);
    return {
      isRunning: false,
      startedBy: null,
      startedAt: null,
      cleanupTime: null,
      stoppedBy: null,
      stoppedAt: null
    };
  }
};

export const updateState = async (state: CoffeeMachineState) => {
  try {
    const { error } = await supabase
      .from('machine_state')
      .upsert([{
        is_running: state.isRunning,
        started_by: state.startedBy,
        started_at: state.startedAt,
        cleanup_time: state.cleanupTime,
        stopped_by: state.stoppedBy,
        stopped_at: state.stoppedAt,
        updated_at: new Date().toISOString()
      }], {
        onConflict: 'id'
      });

    if (error) throw error;
    
    // キャッシュを無効化
    stateCache = null;
    
  } catch (error) {
    console.error('Failed to update state:', error);
    throw error;
  }
};

export const logAction = async (
  action: 'START' | 'STOP',
  userId: string,
  cleanupTime: string | null
) => {
  const { error } = await supabase
    .from('machine_logs')
    .insert([{
      action,
      user_id: userId,
      cleanup_time: cleanupTime
    }]);

  if (error) throw error;
};

// JEONGさんのユーザーID（固定値）
const JEONG_USER_ID = 'U04Q5BG479T'; // JEONGさんの実際のSlack ユーザーID

// getTodayCleaner関数を修正して常にJEONGさんを返すように
export const getTodayCleaner = async (): Promise<string | null> => {
  // 常にJEONGさんのIDを返す
  return JEONG_USER_ID;
};

export const getWeeklySchedule = async (useNextWeek = false): Promise<WeeklySchedule> => {
  const dates = useNextWeek ? getNextWeekDays() : getDaysOfWeek();
  
  try {
    const { data, error } = await supabase
      .from('cleaning_schedule')
      .select('*')
      .in('date', dates);
      
    if (error) throw error;
    
    const schedule: WeeklySchedule = {};
    
    // 全ての平日を追加（データがない場合も空で表示するため）
    dates.forEach(date => {
      schedule[date] = {
        date,
        userId: '未設定',
        completed: false
      };
    });
    
    // 実際のデータで上書き
    data?.forEach(item => {
      const dateStr = item.date;
      schedule[dateStr] = {
        date: dateStr,
        userId: item.user_id,
        completed: item.completed || false
      };
    });
    
    return schedule;
  } catch (error) {
    console.error('Error in getWeeklySchedule:', error);
    return {};
  }
};

export const setCleaningCompleted = async (userId: string): Promise<boolean> => {
  const today = format(utcToZonedTime(new Date(), 'Asia/Tokyo'), 'yyyy-MM-dd');
  const now = new Date().toISOString();
  
  try {
    const { error } = await supabase
      .from('cleaning_schedule')
      .update({
        completed: true,
        completed_at: now,
        completed_by: userId
      })
      .eq('date', today);
      
    if (error) {
      console.error('Error setting cleaning completed:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in setCleaningCompleted:', error);
    return false;
  }
};

export const changeCleaningAssignment = async (
  newUserId: string,
  dateStr: string
): Promise<boolean> => {
  try {
    // 既存の割り当てを確認
    const { data: existingData, error: checkError } = await supabase
      .from('cleaning_schedule')
      .select('*')
      .eq('date', dateStr)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116はデータがない場合のエラー
      console.error('Error checking existing assignment:', checkError);
      return false;
    }
    
    if (existingData) {
      // 既存データを更新
      const { error } = await supabase
        .from('cleaning_schedule')
        .update({ user_id: newUserId })
        .eq('date', dateStr);
        
      if (error) {
        console.error('Error updating assignment:', error);
        return false;
      }
    } else {
      // 新規データを作成
      const { error } = await supabase
        .from('cleaning_schedule')
        .insert([{
          user_id: newUserId,
          date: dateStr,
          completed: false
        }]);
        
      if (error) {
        console.error('Error creating assignment:', error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in changeCleaningAssignment:', error);
    return false;
  }
};

// 新規追加: 月間の掃除当番を登録する関数
export const registerCleaningSchedules = async (
  userIds: string[],
  yearMonth: string
): Promise<boolean> => {
  try {
    // 指定された月の平日を取得
    const dates = getAllWeekdaysInMonth(yearMonth);
    
    if (userIds.length === 0) {
      console.error('No users provided for schedule registration');
      return false;
    }
    
    // 既存のスケジュールを確認して削除
    const { error: deleteError } = await supabase
      .from('cleaning_schedule')
      .delete()
      .gte('date', `${yearMonth}-01`)
      .lt('date', `${yearMonth}-32`); // 32は存在しないので月末までカバー
      
    if (deleteError) {
      console.error('Error deleting existing schedules:', deleteError);
      return false;
    }
    
    // ユーザーを日数分に分配（ラウンドロビン方式）
    const assignments = [];
    dates.forEach((date, index) => {
      const userIndex = index % userIds.length;
      assignments.push({
        user_id: userIds[userIndex],
        date: date,
        completed: false
      });
    });
    
    // バッチ挿入
    const { error } = await supabase
      .from('cleaning_schedule')
      .insert(assignments);
      
    if (error) {
      console.error('Error registering cleaning schedules:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in registerCleaningSchedules:', error);
    return false;
  }
};

// setDailyCleanerAsJeong関数はもう不要なので削除してもよいですが、
// 将来の拡張性のために保持しておくことも可能
export const setDailyCleanerAsJeong = async (): Promise<boolean> => {
  // この関数は実質的に使われなくなりますが、API互換性のために残します
  return true;
}; 