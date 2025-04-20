export interface CoffeeMachineState {
  isRunning: boolean;
  startedBy: string | null;
  startedAt: string | null;
  cleanupTime: string | null;
  stoppedBy: string | null;
  stoppedAt: string | null;
} 

export interface CleaningSchedule {
  id: number;
  userId: string;
  date: string;
  completed: boolean;
  completedAt: string | null;
  completedBy: string | null;
}

export type WeeklySchedule = {
  [day: string]: {
    date: string;
    userId: string;
    completed: boolean;
  }
}; 