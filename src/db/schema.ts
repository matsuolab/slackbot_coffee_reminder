import { createClient } from '@supabase/supabase-js';
import { CoffeeMachineState } from '../types';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export const getCurrentState = async (): Promise<CoffeeMachineState> => {
  try {
    const { data, error } = await supabase
      .from('machine_state')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    return {
      isRunning: data?.is_running ?? false,
      startedBy: data?.started_by ?? null,
      startedAt: data?.started_at ?? null,
      cleanupTime: data?.cleanup_time ?? null,
      stoppedBy: data?.stopped_by ?? null,
      stoppedAt: data?.stopped_at ?? null
    };
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
      .upsert([
        {
          is_running: state.isRunning,
          started_by: state.startedBy,
          started_at: state.startedAt,
          cleanup_time: state.cleanupTime,
          stopped_by: state.stoppedBy,
          stopped_at: state.stoppedAt,
          updated_at: new Date().toISOString()
        }
      ], {
        onConflict: 'id'
      });

    if (error) {
      console.error('Error in updateState:', error);
      throw error;
    }
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