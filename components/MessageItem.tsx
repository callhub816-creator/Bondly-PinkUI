import React, { useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'model';
  text: string;
  mood?: string;
  timestamp: Date;
  isError?: boolean;
  isRead?: boolean;
  replyTo?: {
    id: string;
    text: string;
    sender: 'user' | 'model';
  };
}

interface MessageItemProps {
  message: Message;
  isSelected: boolean;
  isSelectMode: boolean;
  onToggleSelect: (id: string) => void;
  onLongPress: () => void;
  children: React.ReactNode; // The rendered message content
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isSelected,
  isSelectMode,
  onToggleSelect,
  onLongPress,
  children,
}) => {
  return (
    <div
      className={`flex items-start gap-3 transition-all duration-200 ${isSelectMode ? 'ml-2' : ''
        }`}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress();
      }}
      role="option"
      aria-selected={isSelected}
    >
      {/* Selection Checkbox */}
      {isSelectMode && (
        <button
          onClick={() => onToggleSelect(message.id)}
          className="flex-shrink-0 mt-1 p-1 hover:bg-white/20 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400"
          aria-label={`${isSelected ? 'Deselect' : 'Select'} message`}
          type="button"
        >
          {isSelected ? (
            <CheckCircle2 className="w-6 h-6 text-pink-600 flex-shrink-0" />
          ) : (
            <Circle className="w-6 h-6 text-gray-400 flex-shrink-0" />
          )}
        </button>
      )}

      {/* Message Content */}
      <div className="flex-1">{children}</div>
    </div>
  );
};
