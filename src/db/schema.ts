import { createClient } from '@supabase/supabase-js';
import { CoffeeMachineState } from '../types';

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