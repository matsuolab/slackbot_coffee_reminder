import { TimeOption } from '../types';

export const generateHourOptions = (currentTime: Date): number[] => {
    const current = new Date(currentTime);
    const currentHour = current.getHours();
    
    const hours: number[] = [];
    for (let hour = currentHour; hour <= 23; hour++) {
      hours.push(hour);
    }
    
    return hours;
};
  
export const generateMinuteOptions = (): number[] => {
  return [0, 15, 30, 45];
};