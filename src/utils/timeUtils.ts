export const generateHourOptions = (currentTime: Date): number[] => {
    const current = new Date(currentTime);
    const currentHour = current.getHours();
    
    const hours: number[] = [];
    const startHour = Math.max(currentHour, 12);
    const endHour = 21;
    
    for (let hour = startHour; hour <= endHour; hour++) {
      hours.push(hour);
    }
    
    return hours;
};
  
export const getDefaultHour = (currentTime: Date): number => {
    const currentHour = currentTime.getHours();
    return currentHour >= 15 ? currentHour : 15;
};
  
export const generateMinuteOptions = (): number[] => {
  return [0, 15, 30, 45];
};