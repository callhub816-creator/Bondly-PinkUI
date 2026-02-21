import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { extractTags, tagMessageMiddleware } from './middleware/keywordTagger.js';

const app = express();
const httpServer = createServer(app);
const io = new SocketIO(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(tagMessageMiddleware);

// In-memory storage
let messages = [];
const MAX_MESSAGES = 500;
const MAX_MESSAGE_LENGTH = 3000;

// Track active users
const activeUsers = new Map();

// Simple spam protection (basic rate limiting)
const messageTimestamps = new Map();
const SPAM_THRESHOLD = 3; // messages per 5 seconds
const SPAM_WINDOW = 5000; // 5 seconds in ms

/**
 * Check if user is spamming
 */
function isSpamming(userId) {
  if (!messageTimestamps.has(userId)) {
    messageTimestamps.set(userId, []);
  }

  const now = Date.now();
  const timestamps = messageTimestamps.get(userId);
  
  // Remove old timestamps
  const recentTimestamps = timestamps.filter(ts => now - ts < SPAM_WINDOW);
  messageTimestamps.set(userId, recentTimestamps);

  return recentTimestamps.length >= SPAM_THRESHOLD;
}

/**
 * Record message timestamp for spam detection
 */
function recordMessageTime(userId) {
  if (!messageTimestamps.has(userId)) {
    messageTimestamps.set(userId, []);
  }
  messageTimestamps.get(userId).push(Date.now());
}

// ============= REST API =============

/**
 * GET /api/health - Server health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeUsers: activeUsers.size,
    totalMessages: messages.length
  });
});

/**
 * POST /api/message - Send a message via REST
 */
app.post('/api/message', (req, res) => {
  const { guestId, message, userName } = req.body;

  // Validation
  if (!guestId || !message) {
    return res.status(400).json({ error: 'guestId and message are required' });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: `Message exceeds ${MAX_MESSAGE_LENGTH} characters` });
  }

  if (message.trim().length === 0) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  // Spam check
  if (isSpamming(guestId)) {
    return res.status(429).json({ error: 'Too many messages. Please slow down.' });
  }

  recordMessageTime(guestId);

  const tags = extractTags(message);
  const messageObj = {
    id: uuidv4(),
    guestId,
    userName: userName || `Guest ${guestId.slice(0, 5)}`,
    message,
    tags,
    timestamp: new Date().toISOString(),
    source: 'rest'
  };

  // Add to messages array
  messages.push(messageObj);

  // Maintain max messages limit
  if (messages.length > MAX_MESSAGES) {
    messages = messages.slice(-MAX_MESSAGES);
  }

  // Broadcast via Socket.IO
  io.emit('new_message', messageObj);

  res.status(201).json(messageObj);
});

/**
 * GET /api/messages - Get all messages
 */
app.get('/api/messages', (req, res) => {
  res.json({
    total: messages.length,
    messages: messages.slice(-100) // Return last 100 messages
  });
});

/**
 * GET /api/messages/search?q=keyword - Search messages by keyword
 */
app.get('/api/messages/search', (req, res) => {
  const query = req.query.q?.toLowerCase();
  
  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  const results = messages.filter(msg => 
    msg.message.toLowerCase().includes(query) || 
    msg.tags.some(tag => tag.includes(query))
  );

  res.json({
    query,
    total: results.length,
    messages: results
  });
});

/**
 * DELETE /api/messages - Clear all messages (admin only - for testing)
 */
app.delete('/api/messages', (req, res) => {
  const beforeCount = messages.length;
  messages = [];
  io.emit('messages_cleared', { count: beforeCount });
  res.json({ message: 'All messages cleared', count: beforeCount });
});

// ============= SOCKET.IO EVENTS =============

io.on('connection', (socket) => {
  const guestId = uuidv4();
  
  console.log(`✅ User connected: ${guestId}`);
  
  // Store user info
  activeUsers.set(socket.id, {
    guestId,
    userName: `Guest ${guestId.slice(0, 5)}`,
    connectedAt: new Date().toISOString()
  });

  // Send guest ID to client
  socket.emit('guest_id', { guestId, message: 'Anonymous chat connected!' });

  // Broadcast user count
  io.emit('user_count', { activeUsers: activeUsers.size });

  // Send recent messages to new user
  socket.emit('load_messages', {
    messages: messages.slice(-50) // Last 50 messages
  });

  /**
   * Handle incoming message via Socket
   */
  socket.on('send_message', (data) => {
    const user = activeUsers.get(socket.id);
    if (!user) return;

    const { message, userName } = data;

    // Validation
    if (!message || message.trim().length === 0) {
      socket.emit('error', { message: 'Message cannot be empty' });
      return;
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      socket.emit('error', { message: `Message exceeds ${MAX_MESSAGE_LENGTH} characters` });
      return;
    }

    // Spam check
    if (isSpamming(user.guestId)) {
      socket.emit('error', { message: 'Too many messages. Please slow down.' });
      return;
    }

    recordMessageTime(user.guestId);

    const tags = extractTags(message);
    const messageObj = {
      id: uuidv4(),
      guestId: user.guestId,
      userName: userName || user.userName,
      message,
      tags,
      timestamp: new Date().toISOString(),
      source: 'socket'
    };

    // Add to messages
    messages.push(messageObj);

    // Maintain limit
    if (messages.length > MAX_MESSAGES) {
      messages = messages.slice(-MAX_MESSAGES);
    }

    // Broadcast to all users
    io.emit('new_message', messageObj);
  });

  /**
   * Handle user disconnect
   */
  socket.on('disconnect', () => {
    activeUsers.delete(socket.id);
    console.log(`❌ User disconnected: ${guestId}`);
    io.emit('user_count', { activeUsers: activeUsers.size });
  });

  /**
   * Handle typing indicator
   */
  socket.on('typing', (data) => {
    socket.broadcast.emit('user_typing', {
      guestId: user?.guestId,
      userName: data.userName || 'Someone'
    });
  });

  /**
   * Handle stop typing
   */
  socket.on('stop_typing', () => {
    socket.broadcast.emit('user_stop_typing', {
      guestId: user?.guestId
    });
  });
});

// ============= ERROR HANDLING =============

app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// ============= SERVER START =============

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🚀 Guest Chat Server Running         ║
╚════════════════════════════════════════╝
  
  📍 Server: http://localhost:${PORT}
  🔌 Socket.IO: ws://localhost:${PORT}
  
  Routes:
  • GET  /api/health
  • POST /api/message
  • GET  /api/messages
  • GET  /api/messages/search?q=keyword
  • DELETE /api/messages (admin)
  
  Socket Events:
  • send_message
  • typing
  • stop_typing
  
  Active Users: ${activeUsers.size}
  Total Messages: ${messages.length}
  
  ✅ Ready to accept connections!
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
