export const measurePerformance = async <T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    console.log(`${name} took ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`${name} failed after ${duration}ms:`, error);
    throw error;
  }
}; 