type LogLevel = 'info' | 'warn' | 'error';

export const logger = {
  log: (level: LogLevel, message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    console.log(JSON.stringify({
      timestamp,
      level,
      message,
      meta
    }));
  }
}; 