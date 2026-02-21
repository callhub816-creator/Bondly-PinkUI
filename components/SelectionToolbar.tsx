import React from 'react';
import { X, Trash2 } from 'lucide-react';

interface SelectionToolbarProps {
  selectedCount: number;
  onDelete: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Toolbar that appears when in select mode
 * Shows selected message count and Delete/Cancel buttons
 */
export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  selectedCount,
  onDelete,
  onCancel,
  isLoading = false,
}) => {
  return (
    <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-r from-pink-50 to-purple-50 border-t border-pink-200 px-4 py-3 flex items-center justify-between shadow-lg">
      {/* Selected count display */}
      <div className="flex items-center gap-2">
        <div className="bg-pink-600 text-white rounded-full px-3 py-1 text-sm font-semibold">
          {selectedCount}
        </div>
        <span className="text-gray-700 font-medium">
          {selectedCount === 1 ? 'message' : 'messages'} selected
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onDelete}
          disabled={isLoading || selectedCount === 0}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              Delete
            </>
          )}
        </button>

        <button
          onClick={onCancel}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-800 hover:bg-gray-400 rounded font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  );
};
