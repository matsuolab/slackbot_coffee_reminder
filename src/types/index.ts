export interface CoffeeMachineState {
  isRunning: boolean;
  startedBy: string | null;
  startedAt: string | null;
  cleanupTime: string | null;
  stoppedBy: string | null;
  stoppedAt: string | null;
} 