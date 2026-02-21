import { useState, useCallback, useRef, useEffect } from 'react';
import { bulkSoftDelete, restoreMessages } from '../api/messages';

interface DeleteState<T> {
  isDeleting: boolean;
  deletedItems: T[] | null;
  undoTimeLeft: number;
  showConfirm: boolean;
}

/**
 * Custom hook to manage delete flow with undo
 * Handles optimistic updates, rollback, and undo with timer
 */
export const useDeleteWithUndo = <T extends { id: string }>(
  onMessagesDelete: (ids: string[]) => void,
  onMessagesRestore: (items: T[]) => void,
  onPermanentDelete?: (ids: string[]) => void,
) => {
  const [deleteState, setDeleteState] = useState<DeleteState<T>>({
    isDeleting: false,
    deletedItems: null,
    undoTimeLeft: 0,
    showConfirm: false,
  });

  const undoTimerRef = useRef<number | null>(null);
  const undoCountdownRef = useRef<number | null>(null);
  // Keep track of IDs for permanent deletion after timer
  const pendingIdsRef = useRef<string[] | null>(null);

  const clearUndoState = useCallback((commitPending = false) => {
    if (undoTimerRef.current !== null) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    if (undoCountdownRef.current !== null) {
      window.clearInterval(undoCountdownRef.current);
      undoCountdownRef.current = null;
    }
    if (commitPending && pendingIdsRef.current && onPermanentDelete) {
      onPermanentDelete(pendingIdsRef.current);
    }
    setDeleteState(prev => ({
      ...prev,
      deletedItems: null,
      undoTimeLeft: 0,
    }));
    pendingIdsRef.current = null;
  }, [onPermanentDelete]);

  // Cleanup on unmount - trigger permanent delete if timer was running
  useEffect(() => {
    return () => {
      if (pendingIdsRef.current && onPermanentDelete) {
        onPermanentDelete(pendingIdsRef.current);
      }
    };
  }, [onPermanentDelete]);

  const startUndoCountdown = useCallback((items: T[]) => {
    const ids = items.map(i => i.id);
    pendingIdsRef.current = ids;
    let timeLeft = 10;

    setDeleteState(prev => ({
      ...prev,
      deletedItems: items,
      undoTimeLeft: timeLeft,
    }));

    undoCountdownRef.current = window.setInterval(() => {
      timeLeft -= 1;
      setDeleteState(prev => ({
        ...prev,
        undoTimeLeft: timeLeft,
      }));

      if (timeLeft <= 0) {
        clearUndoState(true);
      }
    }, 1000);

    undoTimerRef.current = window.setTimeout(() => {
      // Handled by countdown interval reaching 0
    }, 10000);
  }, [clearUndoState]);

  const deleteMessages = useCallback(
    async (items: T[]) => {
      if (!items || items.length === 0) return;

      // If there's already a pending delete, commit it now
      if (pendingIdsRef.current) {
        clearUndoState(true);
      }

      const ids = items.map(i => i.id);

      setDeleteState(prev => ({
        ...prev,
        isDeleting: true,
        showConfirm: false,
      }));

      try {
        // Optimistic UI update
        onMessagesDelete(ids);

        // Call API (Soft Delete)
        const result = await bulkSoftDelete(ids);

        if (result.success) {
          startUndoCountdown(items);
        } else {
          onMessagesRestore(items);
        }
      } catch (error) {
        console.error('[delete] exception:', error);
        onMessagesRestore(items);
      } finally {
        setDeleteState(prev => ({
          ...prev,
          isDeleting: false,
        }));
      }
    },
    [onMessagesDelete, onMessagesRestore, startUndoCountdown],
  );

  const undoDelete = useCallback(async () => {
    const items = deleteState.deletedItems;
    if (!items || items.length === 0) return;
    const ids = items.map(i => i.id);

    try {
      setDeleteState(prev => ({
        ...prev,
        isDeleting: true,
      }));

      // Call restore API
      const result = await restoreMessages(ids);

      if (result.success) {
        // Optimistic restore
        onMessagesRestore(items);
      } else {
        // If API fails, we keep them deleted (or show error)
        console.error('[undo] API failure:', result.error);
      }
    } catch (error) {
      console.error('[undo] exception:', error);
    } finally {
      clearUndoState();
      setDeleteState(prev => ({
        ...prev,
        isDeleting: false,
      }));
    }
  }, [deleteState.deletedItems, onMessagesRestore, clearUndoState]);

  const openConfirm = useCallback(() => {
    setDeleteState(prev => ({
      ...prev,
      showConfirm: true,
    }));
  }, []);

  const closeConfirm = useCallback(() => {
    setDeleteState(prev => ({
      ...prev,
      showConfirm: false,
    }));
  }, []);

  return {
    ...deleteState,
    deleteMessages,
    undoDelete,
    openConfirm,
    closeConfirm,
    clearUndoState,
  };
};

