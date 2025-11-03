const { Server } = require('socket.io');
const { redisSub } = require('./config/redis');

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
  });

  // Handle socket connections
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join a poll room
    socket.on('join-poll', (joinCode) => {
      socket.join(joinCode);
      console.log(`Socket ${socket.id} joined poll ${joinCode}`);
    });

    // Leave a poll room
    socket.on('leave-poll', (joinCode) => {
      socket.leave(joinCode);
      console.log(`Socket ${socket.id} left poll ${joinCode}`);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  // Subscribe to Redis pub/sub for real-time updates
  redisSub.subscribe('vote-updates', 'poll-updates', (err) => {
    if (err) {
      console.error('Failed to subscribe to Redis channels:', err);
    } else {
      console.log('Subscribed to Redis channels: vote-updates, poll-updates');
    }
  });

  // Handle messages from Redis
  redisSub.on('message', (channel, message) => {
    try {
      const data = JSON.parse(message);

      if (channel === 'vote-updates') {
        // Broadcast vote update to poll room
        if (data.joinCode) {
          io.to(data.joinCode).emit('vote-update', {
            totalVotes: data.totalVotes,
            questions: data.questions,
          });
        }
      } else if (channel === 'poll-updates') {
        // Broadcast poll status update
        if (data.joinCode) {
          io.to(data.joinCode).emit('poll-status', {
            type: data.type,
            pollId: data.pollId,
          });
        }
      }
    } catch (error) {
      console.error('Error processing Redis message:', error);
    }
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = { initializeSocket, getIO };