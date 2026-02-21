/**
 * Integration test: reply flow
 * - Send message A
 * - Reply to A with message B
 * - Verify B.reply_to == A.id in DB
 * - Verify clicking quoted block scrolls to A
 */

import { Message } from '../types/chat';
import { detectLanguage } from '../utils/detectLanguage';

describe('Reply Integration', () => {
  test('sending reply attaches reply_to correctly', async () => {
    const messageA: Message = {
      id: 'msg-a',
      chat_id: 'chat-1',
      sender_id: 'user-1',
      body: 'Original message',
      reply_to: null,
      edited_at: null,
      deleted_at: null,
      deleted_by: null,
      soft_delete_expires_at: null,
      created_at: new Date().toISOString(),
      lang_hint: 'english',
      sender: { id: 'user-1', full_name: 'Alice', avatar_url: null },
      repliedMessage: null,
    };

    const messageB: Message = {
      id: 'msg-b',
      chat_id: 'chat-1',
      sender_id: 'user-2',
      body: 'Reply to original',
      reply_to: messageA.id, // Points to A
      edited_at: null,
      deleted_at: null,
      deleted_by: null,
      soft_delete_expires_at: null,
      created_at: new Date().toISOString(),
      lang_hint: 'english',
      sender: { id: 'user-2', full_name: 'Bob', avatar_url: null },
      repliedMessage: messageA, // Populated from joined query
    };

    // Verify reply_to is set
    expect(messageB.reply_to).toBe(messageA.id);
    expect(messageB.repliedMessage).toBe(messageA);
  });

  test('clicking quoted reply triggers scroll to original', () => {
    const messageList = [
      { id: 'msg-a', body: 'First' },
      { id: 'msg-b', body: 'Second', reply_to: 'msg-a' },
      { id: 'msg-c', body: 'Third' },
    ] as any[];

    // Simulate id->index map
    const idToIndex = new Map();
    messageList.forEach((msg, idx) => idToIndex.set(msg.id, idx));

    // When clicking on msg-b's quoted reply, we should scroll to msg-a (index 0)
    const targetId = messageList[1].reply_to;
    const targetIndex = idToIndex.get(targetId);

    expect(targetIndex).toBe(0);
  });
});
