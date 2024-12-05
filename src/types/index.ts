export interface CoffeeMachineState {
  isRunning: boolean;
  startedBy: string | null;
  startedAt: string | null;
  cleanupTime: string | null;
  stoppedBy: string | null;
  stoppedAt: string | null;
}

export interface TimeOption {
  value: string;
  label: string;
  text: string;
  disabled: boolean;
}

export type TimeString = `${number}:${number}`;

export interface SlackResponse {
  ok: boolean;
  error?: string;
}

export interface CommandResponse {
  success: boolean;
  message: string;
} 