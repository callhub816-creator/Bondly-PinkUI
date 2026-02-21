/**
 * API wrapper for message deletion operations
 */

interface DeleteMessageResponse {
  success: boolean;
  deletedCount?: number;
  error?: string;
}

interface RestoreMessageResponse {
  success: boolean;
  restoredCount?: number;
  error?: string;
}

const deletedMessagesCache: Record<string, any> = {};

/**
 * Soft-delete multiple messages via localStorage or mock API
 * In production, this would call supabase.rpc('messages_bulk_soft_delete', { message_ids })
 */
export const bulkSoftDelete = async (messageIds: string[]): Promise<DeleteMessageResponse> => {
  if (!messageIds || messageIds.length === 0) {
    return { success: false, error: 'No message IDs provided' };
  }

  try {
    console.log('[API] Deleting messages:', messageIds);

    // Simulate fetching messages before deletion
    const messagesToDelete = messageIds.map(id => ({ id, content: `Message content for ${id}` }));
    messagesToDelete.forEach(msg => {
      deletedMessagesCache[msg.id] = msg;
    });

    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 300));

    console.log('[API] Successfully soft-deleted', messageIds.length, 'messages');

    setTimeout(() => {
      messageIds.forEach(id => delete deletedMessagesCache[id]);
      console.log('[API] Cleared undo cache for messages:', messageIds);
    }, 5000); // 5 seconds to undo

    return {
      success: true,
      deletedCount: messageIds.length,
    };
  } catch (error) {
    console.error('[API] Error deleting messages:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Restore soft-deleted messages
 * In production, this would call supabase.rpc('messages_restore', { message_ids })
 * or a custom endpoint
 */
export const restoreMessages = async (messageIds: string[]): Promise<RestoreMessageResponse> => {
  if (!messageIds || messageIds.length === 0) {
    return { success: false, error: 'No message IDs provided' };
  }

  try {
    console.log('[API] Restoring messages:', messageIds);

    const restoredMessages = messageIds.map(id => deletedMessagesCache[id]).filter(Boolean);
    restoredMessages.forEach(msg => delete deletedMessagesCache[msg.id]);

    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 300));

    console.log('[API] Successfully restored', restoredMessages.length, 'messages');

    return {
      success: true,
      restoredCount: restoredMessages.length,
    };
  } catch (error) {
    console.error('[API] Error restoring messages:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
