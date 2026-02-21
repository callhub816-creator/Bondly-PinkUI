import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, Loader, AlertCircle, Wifi } from 'lucide-react';
import ProfileCard from './components/ProfileCard';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const IS_SERVER_CONFIGURED = !!import.meta.env.VITE_SOCKET_URL;

interface Message {
  id: string;
  guestId: string;
  userName: string;
  message: string;
  tags: string[];
  timestamp: string;
  source: 'rest' | 'socket';
}

interface GuestChatProps {
  onBack?: () => void;
}

export default function GuestChat({ onBack }: GuestChatProps) {
  // State
  const [guestId, setGuestId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeUsers, setActiveUsers] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [connectedAt, setConnectedAt] = useState<Date | null>(null);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [connectionTimeout, setConnectionTimeout] = useState<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Socket.IO connection
  useEffect(() => {
    let guestIdReceived = false;
    let connectionAttempted = false;

    // If server is not configured, use local mode (demo mode)
    if (!IS_SERVER_CONFIGURED) {
      // Generate a demo guest ID and start in local mode
      const demoGuestId = `guest_${Math.random().toString(36).substr(2, 9)}`;
      setGuestId(demoGuestId);
      console.log('🔧 Running in demo mode (no server configured). Messages are local only.');
      return;
    }

    let guestIdTimeout: NodeJS.Timeout;

    const newSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 3,
      transports: ['websocket', 'polling'],
      timeout: 5000
    });

    // Connection established
    newSocket.on('connect', () => {
      console.log('✅ Connected to server');
      connectionAttempted = true;
      setError(null);
      setConnectedAt(new Date());
    });

    // Receive guest ID
    newSocket.on('guest_id', (data: any) => {
      guestIdReceived = true;
      setGuestId(data.guestId);
      console.log('🆔 Guest ID:', data.guestId);
      // Clear timeout since we got the ID
      if (guestIdTimeout) clearTimeout(guestIdTimeout);
    });

    // Load initial messages
    newSocket.on('load_messages', (data: any) => {
      setMessages(data.messages || []);
    });

    // Receive new message
    newSocket.on('new_message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    // User count update
    newSocket.on('user_count', (data: any) => {
      setActiveUsers(data.activeUsers);
    });

    // Handle errors
    newSocket.on('error', (data: any) => {
      console.error('Socket error:', data);
      setError(`❌ Connection error: ${data?.message || 'Server unavailable'}`);
    });

    // Handle connection error
    newSocket.on('connect_error', (error: any) => {
      console.error('Socket connect_error:', error.message);
      if (!guestIdReceived) {
        setError(`⚠️ Cannot connect to server at ${SOCKET_URL}. Running in demo mode.`);
        // Auto-create guest ID after failed connection attempt
        setTimeout(() => {
          if (!guestIdReceived) {
            const demoGuestId = `guest_${Math.random().toString(36).substr(2, 9)}`;
            setGuestId(demoGuestId);
            console.log('🔧 Switched to demo mode');
          }
        }, 3000);
      }
    });

    // Messages cleared (admin action)
    newSocket.on('messages_cleared', () => {
      setMessages([]);
    });

    // Handle typing indicator
    newSocket.on('user_typing', (data) => {
      console.log(`${data.userName} is typing...`);
    });

    // Handle disconnect
    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      if (guestIdReceived) {
        setGuestId(null);
        setMessages([]);
        setError('📡 Disconnected from server. Refresh to reconnect.');
      }
    });

    setSocket(newSocket);

    // Set a timeout for guest ID to arrive - if not received within 8 seconds, switch to demo mode
    guestIdTimeout = setTimeout(() => {
      if (!guestIdReceived && newSocket.connected) {
        console.warn('Guest ID not received after 8 seconds, switching to demo mode');
        const demoGuestId = `guest_${Math.random().toString(36).substr(2, 9)}`;
        setGuestId(demoGuestId);
        setError(null);
        newSocket.disconnect();
      }
    }, 8000);

    return () => {
      if (guestIdTimeout) clearTimeout(guestIdTimeout);
      newSocket.disconnect();
    };
  }, []);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputMessage.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const messageText = inputMessage.trim();
      const senderName = userName || `Guest ${guestId?.slice(0, 5)}`;

      // If socket is connected, send via server
      if (socket && socket.connected) {
        socket.emit('send_message', {
          message: messageText,
          userName: senderName
        });
      } else {
        // Demo mode: create local message
        const localMessage: Message = {
          id: `msg_${Date.now()}`,
          guestId: guestId || 'guest_demo',
          userName: senderName,
          message: messageText,
          tags: [],
          timestamp: new Date().toISOString(),
          source: 'rest'
        };
        setMessages(prev => [...prev, localMessage]);
      }

      setInputMessage('');
      inputRef.current?.focus();
    } catch (err) {
      setError('Failed to send message');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);

    // Clear previous timeout
    if (typingTimeout) clearTimeout(typingTimeout);

    // Emit typing
    socket?.emit('typing', { userName: userName || `Guest ${guestId?.slice(0, 5)}` });

    // Set new timeout for stop typing
    const timeout = setTimeout(() => {
      socket?.emit('stop_typing', {});
    }, 1000);

    setTypingTimeout(timeout);
  };

  // Handle logout
  const handleLogout = () => {
    socket?.disconnect();
    setGuestId(null);
    setMessages([]);
    setInputMessage('');
    if (onBack) onBack();
  };

  if (!guestId) {
    return (
      <div className="h-screen bg-gradient-to-br from-rose-50 to-pink-100 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          {error ? (
            <>
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Wifi className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Server Connection Issue</h2>
              <p className="text-gray-600 mb-6 text-sm">{error}</p>
              <p className="text-gray-500 text-xs mb-6">You can still use chat in demo mode (messages won't be saved)</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => { setError(null); setGuestId(`guest_${Math.random().toString(36).substr(2, 9)}`); }}
                  className="px-6 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold rounded-lg hover:shadow-lg transition"
                >
                  Continue in Demo Mode
                </button>
                <button
                  onClick={onBack || (() => window.history.back())}
                  className="px-6 py-2 border border-gray-400 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                >
                  Go Back
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <span className="text-2xl">💬</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Connecting...</h2>
              <p className="text-gray-600">Setting up your anonymous chat session</p>
              <p className="text-sm text-gray-500 mt-4">This may take a few seconds...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Left: Profile Sidebar */}
      <div className="hidden lg:block w-80 flex-shrink-0">
        <ProfileCard
          guestId={guestId}
          userName={userName}
          connectedAt={connectedAt}
          onLogout={handleLogout}
        />
      </div>

      {/* Middle: Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">💬 Guest Chat</h1>
              <p className="text-sm text-gray-600">
                {activeUsers} {activeUsers === 1 ? 'user' : 'users'} online
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">ID: {guestId?.slice(0, 8)}...</p>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">💌</div>
                <p className="text-gray-500 text-lg">No messages yet. Be the first to say hello!</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.guestId === guestId ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md xl:max-w-lg ${
                    msg.guestId === guestId
                      ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-3xl rounded-tr-none'
                      : 'bg-white text-gray-900 rounded-3xl rounded-tl-none border border-gray-200'
                  } px-5 py-3 shadow-sm`}
                >
                  {/* User name */}
                  <p
                    className={`text-xs font-bold mb-1 ${
                      msg.guestId === guestId ? 'text-pink-100' : 'text-pink-600'
                    }`}
                  >
                    {msg.userName}
                  </p>

                  {/* Message text */}
                  <p className="text-sm break-words">{msg.message}</p>

                  {/* Tags */}
                  {msg.tags && msg.tags.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-opacity-30 border-white">
                      <div className="flex flex-wrap gap-1">
                        {msg.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${
                              msg.guestId === guestId
                                ? 'bg-white bg-opacity-30 text-white'
                                : 'bg-pink-100 text-pink-700'
                            }`}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <p
                        className={`text-xs mt-2 font-medium ${
                          msg.guestId === guestId ? 'text-pink-100' : 'text-gray-500'
                        }`}
                      >
                        🏷️ {msg.tags.length} {msg.tags.length === 1 ? 'keyword' : 'keywords'} detected
                      </p>
                    </div>
                  )}

                  {/* Timestamp */}
                  <p
                    className={`text-xs mt-2 ${
                      msg.guestId === guestId ? 'text-pink-100' : 'text-gray-500'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-6">
          {/* Error Alert */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Name Input (optional) */}
          <input
            type="text"
            placeholder="Enter name (optional)"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            maxLength={50}
            className="w-full px-4 py-2 mb-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
          />

          {/* Message Input Form */}
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type your message... (max 3000 chars)"
              value={inputMessage}
              onChange={handleInputChange}
              maxLength={3000}
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-50"
              autoFocus
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {isLoading ? (
                <Loader size={20} className="animate-spin" />
              ) : (
                <Send size={20} />
              )}
              Send
            </button>
          </form>

          {/* Character Counter */}
          <p className="text-xs text-gray-500 mt-2">
            {inputMessage.length} / 3000 characters
          </p>
        </div>
      </div>

      {/* Right: Activity Panel (collapsible) */}
      <div className="hidden xl:block w-64 bg-white border-l border-gray-200 p-6 overflow-y-auto">
        <h3 className="text-sm font-bold text-gray-900 mb-4">📊 Activity</h3>

        {/* Online Users */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 mb-4">
          <p className="text-xs font-bold text-blue-900 mb-1">Active Users</p>
          <p className="text-2xl font-bold text-blue-600">{activeUsers}</p>
        </div>

        {/* Total Messages */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 mb-4">
          <p className="text-xs font-bold text-purple-900 mb-1">Messages Sent</p>
          <p className="text-2xl font-bold text-purple-600">{messages.length}</p>
        </div>

        {/* Session Info */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-bold text-gray-700 mb-2">Session Info</p>
          <div className="space-y-2 text-xs text-gray-600">
            <div>
              <span className="font-bold">Guest ID:</span>
              <p className="font-mono text-gray-500 break-all">{guestId}</p>
            </div>
            <div>
              <span className="font-bold">Status:</span>
              <p className="text-green-600 font-medium">🟢 Connected</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
