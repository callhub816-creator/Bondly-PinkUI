import React, { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import type { Message } from '../types/chat';
import { formatTimestamp } from '../types/chat';
import { MessageItem } from './MessageItem';
import { SoftDeletePlaceholder } from './SoftDeletePlaceholder';
import { FixedSizeList as List } from 'react-window';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  onReply?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onEdit?: (message: Message) => void;
  onSelect?: (messageIds: string[]) => void;
  selectedMessageIds?: Set<string>;
  isSelectionMode?: boolean;
  chatHeight?: number;
  onScrollToMessage?: (messageId: string) => void;
  deletedUndoMap?: Map<string, NodeJS.Timeout>;
  onUndoDelete?: (messageId: string) => void;
  canEditMessage?: (msg: Message) => boolean;
}

/**
 * Virtualized message list using react-window
 * Features:
 * - Scroll-to-bottom on new messages
 * - "New messages" button if user scrolled up
 * - Message selection mode
 * - Undo delete with timer display
 * - Edit window validation
 * - Accessibility: keyboard navigation, ARIA labels
 */
export const MessageList = forwardRef<any, MessageListProps>(
  (
    {
      messages,
      currentUserId,
      onReply,
      onDelete,
      onEdit,
      onSelect,
      selectedMessageIds = new Set(),
      isSelectionMode = false,
      chatHeight = 400,
      onScrollToMessage,
      deletedUndoMap = new Map(),
      onUndoDelete,
      canEditMessage = () => true,
    },
    ref
  ) => {
  const [showNewMessagesButton, setShowNewMessagesButton] = useState(false);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const messageCountRef = useRef(messages.length);
  const idToIndexRef = useRef<Map<string, number>>(new Map());
  const listRef = useRef<any>(null);

  // Auto-scroll to bottom when new messages arrive (unless user scrolled up)
  useEffect(() => {
    if (messages.length > messageCountRef.current && isScrolledToBottom && (ref?.current || listRef.current)) {
      const target = ref?.current || listRef.current;
      target?.scrollToItem(messages.length - 1, 'end');
    }
    messageCountRef.current = messages.length;
  }, [messages.length, isScrolledToBottom, ref]);

  const handleScroll = useCallback(
    ({
      scrollOffset,
      scrollUpdateWasRequested,
    }: {
      scrollOffset: number;
      scrollUpdateWasRequested: boolean;
    }) => {
      if (!scrollUpdateWasRequested) {
        // User scrolled manually
        const isAtBottom = scrollOffset > (messages.length - 3) * 60; // Approximate item height
        setIsScrolledToBottom(isAtBottom);
        setShowNewMessagesButton(!isAtBottom && messages.length > 5);
      }
    },
    [messages.length]
  );

  const handleMessageSelect = useCallback(
    (messageId: string, selected: boolean) => {
      const newSelected = new Set(selectedMessageIds);
      if (selected) {
        newSelected.add(messageId);
      } else {
        newSelected.delete(messageId);
      }
      onSelect?.(Array.from(newSelected));
    },
    [selectedMessageIds, onSelect]
  );

  const rowRenderer = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    const message = messages[index];
    // keep id->index map for virtualization-safe scrolling
    if (message) idToIndexRef.current.set(message.id, index);
    if (!message) return null;

    const isDeleted = !!message.deleted_at;
    const hasUndo = deletedUndoMap.has(message.id);

    return (
      <div id={`msg-${message.id}`} style={style} key={message.id}>
        {isDeleted ? (
          // Use persistent countdown placeholder based on soft_delete_expires_at
          <SoftDeletePlaceholder
            messageId={message.id}
            expiresAt={message.soft_delete_expires_at}
            onUndo={onUndoDelete}
          />
        ) : (
          <MessageItem
            message={message}
            isOwn={message.sender_id === currentUserId}
            onReply={(msg) => onReply?.(msg)}
            onDelete={(id) => onDelete?.(id)}
            onEdit={(msg) => onEdit?.(msg)}
            onJumpToMessage={(id) => {
              // local scroll helper
              const idx = idToIndexRef.current.get(id);
              const target = ref?.current || listRef.current;
              if (typeof idx === 'number' && target?.scrollToItem) {
                target.scrollToItem(idx, 'center');
              } else {
                const el = document.getElementById(`msg-${id}`);
                if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
              }
            }}
            isSelected={selectedMessageIds.has(message.id)}
            onSelect={(selected) => handleMessageSelect(message.id, selected)}
            isSelectionMode={isSelectionMode}
            canEdit={canEditMessage(message)}
          />
        )}
      </div>
    );
  };

  // Expose scrollToMessage to parent via ref
  useImperativeHandle(ref, () => ({
    scrollToMessage: (id: string) => {
      const idx = idToIndexRef.current.get(id);
      const target = ref?.current || listRef.current;
      if (typeof idx === 'number' && target?.scrollToItem) {
        target.scrollToItem(idx, 'center');
      } else {
        // Fallback: scroll container to element by id
        const el = document.getElementById(`msg-${id}`);
        if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    },
  }));

  return (
    <div className="relative flex flex-col h-full bg-gray-50">
      {/* New messages button */}
      {showNewMessagesButton && (
        <button
          onClick={() => {
            setShowNewMessagesButton(false);
            setIsScrolledToBottom(true);
            ref.current?.scrollToItem(messages.length - 1, 'end');
          }}
          className="absolute bottom-3 left-1/2 transform -translate-x-1/2 z-10 px-3 py-1 bg-pink-500 text-white text-xs rounded-full shadow"
          aria-label="Scroll to latest messages"
        >
          New messages ↓
        </button>
      )}

      {/* Virtualized list */}
      {messages.length > 0 ? (
        <List
          ref={(r) => {
            // set both forwarded ref and local ref
            listRef.current = r;
            if (ref) {
              try {
                if (typeof ref === 'function') ref(r);
                else ref.current = r;
              } catch {}
            }
          }}
          height={chatHeight}
          itemCount={messages.length}
          itemSize={80} // Approximate; adjust based on your message bubble heights
          width="100%"
          onScroll={handleScroll}
        >
          {rowRenderer}
        </List>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400">
          <p>No messages yet. Start a conversation!</p>
        </div>
      )}
    </div>
  );
}
);

MessageList.displayName = 'MessageList';

export default MessageList;
