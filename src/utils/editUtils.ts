export const canEditMessage = (createdAt: string | Date, currentUserId: string, messageSenderId: string): boolean => {
  if (messageSenderId !== currentUserId) return false;
  const createdTime = new Date(createdAt).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  return now - createdTime < fiveMinutes;
};
