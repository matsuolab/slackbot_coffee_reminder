import { TimeOption } from '../types';

export const generateHourOptions = (currentTime: Date): number[] => {
    const current = new Date(currentTime);
    const currentHour = current.getHours();
    
    let startHour = 15;
    
    if (currentHour >= 15) {
      startHour = currentHour;
    }
    
    const hours: number[] = [];
    for (let hour = startHour; hour <= 21; hour++) {
      hours.push(hour);
    }
    
    return hours;
};
  
export const generateMinuteOptions = (): number[] => {
  return [0, 15, 30, 45];
};