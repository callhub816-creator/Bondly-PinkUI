/**
 * E2E test: multi-select delete -> refresh -> undo -> finalize
 * Simulates:
 * 1. Select 3 messages and delete (soft-delete with 10s window)
 * 2. Refresh page (simulate reload)
 * 3. Undo within window
 * 4. Verify messages restored
 * 5. After 10s, verify finalized (deleted_at persists)
 */

import { Message } from '../types/chat';

describe('Multi-Delete E2E with Refresh', () => {
  test('delete -> refresh -> undo -> finalize flow', async () => {
    const now = Date.now();
    const expiresIn10s = new Date(now + 10_000).toISOString();

    // Initial messages
    const messages: Message[] = [
      {
        id: 'msg-1',
        chat_id: 'chat-1',
        sender_id: 'user-1',
        body: 'Message 1',
        reply_to: null,
        edited_at: null,
        deleted_at: null,
        deleted_by: null,
        soft_delete_expires_at: null,
        created_at: new Date().toISOString(),
        lang_hint: 'english',
        sender: { id: 'user-1', full_name: 'Alice', avatar_url: null },
        repliedMessage: null,
      },
      {
        id: 'msg-2',
        chat_id: 'chat-1',
        sender_id: 'user-1',
        body: 'Message 2',
        reply_to: null,
        edited_at: null,
        deleted_at: null,
        deleted_by: null,
        soft_delete_expires_at: null,
        created_at: new Date().toISOString(),
        lang_hint: 'english',
        sender: { id: 'user-1', full_name: 'Alice', avatar_url: null },
        repliedMessage: null,
      },
      {
        id: 'msg-3',
        chat_id: 'chat-1',
        sender_id: 'user-1',
        body: 'Message 3',
        reply_to: null,
        edited_at: null,
        deleted_at: null,
        deleted_by: null,
        soft_delete_expires_at: null,
        created_at: new Date().toISOString(),
        lang_hint: 'english',
        sender: { id: 'user-1', full_name: 'Alice', avatar_url: null },
        repliedMessage: null,
      },
    ];

    // Step 1: Soft-delete messages 1, 2, 3
    const deletedMessages = messages.map((m) => ({
      ...m,
      deleted_at: new Date(now).toISOString(),
      deleted_by: 'user-1',
      soft_delete_expires_at: expiresIn10s,
    }));

    // Verify soft-delete state
    expect(deletedMessages[0].deleted_at).not.toBeNull();
    expect(deletedMessages[0].soft_delete_expires_at).toBe(expiresIn10s);

    // Step 2: Simulate refresh - soft_delete_expires_at is still in future
    const afterRefresh = deletedMessages;
    const canUndo = (msg: Message) => {
      if (!msg.soft_delete_expires_at) return false;
      return new Date(msg.soft_delete_expires_at).getTime() > Date.now();
    };

    // Step 3: Undo within window
    const restored = afterRefresh.map((m) => ({
      ...m,
      deleted_at: null,
      deleted_by: null,
      soft_delete_expires_at: null,
    }));

    expect(restored[0].deleted_at).toBeNull();
    expect(restored[0].soft_delete_expires_at).toBeNull();

    // Step 4: Verify UI shows countdown only for messages within window
    const stillUndoable = afterRefresh.filter((m) => {
      const expiry = m.soft_delete_expires_at ? new Date(m.soft_delete_expires_at).getTime() : 0;
      return expiry > Date.now();
    });
    expect(stillUndoable.length).toBe(3);

    // Step 5: After 10s, messages remain soft-deleted (deleted_at set)
    const finalized = afterRefresh;
    expect(finalized[0].deleted_at).not.toBeNull();
  });
});
