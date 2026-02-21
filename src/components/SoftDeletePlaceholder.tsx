import React, { useState, useEffect } from 'react';

interface SoftDeletePlaceholderProps {
  messageId: string;
  expiresAt: string | null;
  onUndo: (messageId: string) => void;
}

/**
 * SoftDeletePlaceholder: renders "Message deleted" with countdown + undo button
 * Persists countdown across refresh by reading soft_delete_expires_at timestamp
 */
export const SoftDeletePlaceholder: React.FC<SoftDeletePlaceholderProps> = ({
  messageId,
  expiresAt,
  onUndo,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) {
      setIsExpired(true);
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const expireTime = new Date(expiresAt).getTime();
      const remaining = Math.max(0, Math.ceil((expireTime - now) / 1000));

      if (remaining <= 0) {
        setIsExpired(true);
        setSecondsLeft(0);
      } else {
        setSecondsLeft(remaining);
        setIsExpired(false);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (isExpired) {
    return (
      <div className="flex items-center gap-2 p-3 bg-gray-100 border-l-4 border-gray-400 mx-2 my-1 rounded">
        <span className="text-sm text-gray-600 italic">Message deleted</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-yellow-50 border-l-4 border-yellow-400 mx-2 my-1 rounded">
      <span className="text-sm text-yellow-800">Message deleted</span>
      <button
        onClick={() => onUndo(messageId)}
        className="text-xs text-yellow-700 hover:text-yellow-900 underline font-semibold"
        title={`Undo (${secondsLeft}s remaining)`}
      >
        Undo ({secondsLeft}s)
      </button>
    </div>
  );
};

export default SoftDeletePlaceholder;
