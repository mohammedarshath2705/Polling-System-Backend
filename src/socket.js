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

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('join-poll', (joinCode) => {
      socket.join(joinCode);
      console.log(`Socket ${socket.id} joined poll ${joinCode}`);
    });

    socket.on('leave-poll', (joinCode) => {
      socket.leave(joinCode);
      console.log(`Socket ${socket.id} left poll ${joinCode}`);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  redisSub.subscribe('vote-updates', 'poll-updates', (err) => {
    if (err) {
      console.error('Failed to subscribe to Redis channels:', err);
    } else {
      console.log('Subscribed to Redis channels: vote-updates, poll-updates');
    }
  });

  redisSub.on('message', (channel, message) => {
    try {
      const data = JSON.parse(message);

      if (channel === 'vote-updates') {
        if (data.joinCode) {
          io.to(data.joinCode).emit('vote-update', {
            totalVotes: data.totalVotes,
            questions: data.questions,
          });
        }
      } else if (channel === 'poll-updates') {
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