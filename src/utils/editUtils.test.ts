import { canEditMessage } from './editUtils';

describe('canEditMessage', () => {
  const now = Date.now();
  const userId = 'user-123';

  test('allows edit within 5 minutes for same sender', () => {
    const createdAt = new Date(now - 2 * 60 * 1000).toISOString(); // 2 minutes ago
    expect(canEditMessage(createdAt, userId, userId)).toBe(true);
  });

  test('disallows edit after 5 minutes', () => {
    const createdAt = new Date(now - 10 * 60 * 1000).toISOString(); // 10 minutes ago
    expect(canEditMessage(createdAt, userId, userId)).toBe(false);
  });

  test('disallows edit for different sender', () => {
    const createdAt = new Date(now - 2 * 60 * 1000).toISOString();
    expect(canEditMessage(createdAt, userId, 'other-user')).toBe(false);
  });
});
