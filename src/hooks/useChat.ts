import { useState, useCallback, useEffect, useRef } from 'react';
import type { Message } from '../types/chat';

interface UseChatProps {
    chatId: string;
    userId: string;
}

export const useChat = ({ chatId, userId }: UseChatProps) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const pollIntervalRef = useRef<number | null>(null);

    // 1. Fetch Messages (GET)
    const fetchMessages = useCallback(async () => {
        try {
            const res = await fetch(`/api/chat?chatId=${chatId}`);
            if (!res.ok) throw new Error('Failed to load chat');
            const data = await res.json();
            setMessages(data.messages || []);
            setLoading(false);
        } catch (err: any) {
            // console.error('Chat Load Error:', err);
            // Silent fail on poll
            if (loading) setLoading(false);
        }
    }, [chatId, loading]);

    // Initial Load + Polling
    useEffect(() => {
        fetchMessages();
        pollIntervalRef.current = window.setInterval(fetchMessages, 3000);
        return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
    }, [fetchMessages]);

    // 2. Send Message (POST)
    const sendMessage = useCallback(async (body: string, replyTo?: string, isVoiceNote?: boolean) => {
        try {
            setIsTyping(true); // START TYPING
            const tempId = Date.now().toString();
            // Optimistic Update
            const optimisticMsg: Message = {
                id: tempId,
                chat_id: chatId,
                sender_id: userId,
                body: body,
                created_at: new Date().toISOString(),
                role: 'user'
            };
            setMessages(prev => [...prev, optimisticMsg]);

            const res = await fetch('/api/chat/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: body, chatId, isVoiceNote })
            });

            if (!res.ok) {
                const errorText = await res.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    throw new Error(`Server Error (${res.status}): ${errorText.substring(0, 100)}`);
                }

                setIsTyping(false);
                if (errorData.action === 'open_shop') throw new Error('INSUFFICIENT_HEARTS');
                const fullError = errorData.error || errorData.detail || errorData.details || 'Unknown Server Error';
                console.error('Server Auth Error:', errorData);
                throw new Error(fullError);
            }

            // Success
            setIsTyping(false); // STOP TYPING (Response Arrived)
            fetchMessages(); // Refresh immediately

        } catch (err: any) {
            setIsTyping(false);
            console.error('Send Failed:', err);
            setError(err.message);
            throw err;
        }
    }, [chatId, userId, fetchMessages]);

    return {
        messages,
        loading,
        error,
        isTyping,
        sendMessage,
        // Legacy stubs (with args to satisfy TS)
        deleteMessage: async (id: string) => { },
        restoreMessage: async (id: string) => { },
        editMessage: async (id: string, body: string) => { },
        bulkDelete: async (ids: string[]) => { },
        undoBulkDelete: async (ids: string[]) => { },
        setPreferredLanguage: async (lang: string) => { }
    };
};
