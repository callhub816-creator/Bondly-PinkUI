import React, { useEffect, useState } from 'react';
import { AlertCircle, Trash2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  showUndo?: boolean;
  onUndo?: () => void;
  undoTimeLeft?: number;
}

/**
 * Confirmation modal for deleting messages
 * Shows the number of messages to be deleted
 * Can show an undo button after deletion for 12 seconds
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  count,
  onConfirm,
  onCancel,
  isLoading = false,
  showUndo = false,
  onUndo,
  undoTimeLeft = 0,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4 animate-fade-in">
        {/* Header with icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-red-100">
            <Trash2 className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>

        {/* Message body */}
        <p className="text-gray-700 text-sm mb-2">{message}</p>
        <p className="text-gray-900 font-medium mb-6">
          {count} {count === 1 ? 'message' : 'messages'} will be deleted
        </p>

        {/* Undo confirmation */}
        {showUndo && (
          <div className="bg-green-50 border border-green-200 rounded p-3 mb-6">
            <p className="text-green-800 text-sm mb-2">✓ Messages deleted</p>
            {undoTimeLeft > 0 && (
              <button
                onClick={onUndo}
                className="text-green-600 hover:text-green-700 font-medium text-sm underline"
              >
                Undo ({undoTimeLeft}s)
              </button>
            )}
          </div>
        )}

        {/* Action buttons */}
        {!showUndo && (
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded font-medium transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
