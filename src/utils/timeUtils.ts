export const generateHourOptions = (currentTime: Date): number[] => {
    const hours: number[] = [];
    for (let hour = 12; hour <= 21; hour++) {
      hours.push(hour);
    }
    return hours;
};
  
export const getDefaultHour = (currentTime: Date): number => {
    const currentHour = currentTime.getHours();
    if (currentHour < 12) return 15;
    if (currentHour > 21) return 21;
    return currentHour >= 15 ? currentHour : 15;
};
  
export const generateMinuteOptions = (): number[] => {
  return [0, 15, 30, 45];
};