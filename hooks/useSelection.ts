import { useState, useCallback } from 'react';

/**
 * Custom hook to manage message selection state
 * Handles toggling selection, clearing all, and tracking selected IDs
 */
export const useSelection = () => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  const enterSelectMode = useCallback(() => {
    console.log('[selection] entering select mode');
    setIsSelectMode(true);
  }, []);

  const exitSelectMode = useCallback(() => {
    console.log('[selection] exiting select mode');
    setIsSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const getSelectedArray = useCallback(() => {
    return Array.from(selectedIds);
  }, [selectedIds]);

  return {
    selectedIds,
    isSelectMode,
    selectedCount: selectedIds.size,
    enterSelectMode,
    exitSelectMode,
    toggleSelection,
    isSelected,
    selectAll,
    clearSelection,
    getSelectedArray,
  };
};
