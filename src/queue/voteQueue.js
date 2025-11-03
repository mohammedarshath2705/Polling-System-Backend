const { Queue } = require('bullmq');
const { redisClient } = require('../config/redis');

// Create vote processing queue
const voteQueue = new Queue('vote-processing', {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs
    },
  },
});

// Event listeners for monitoring
voteQueue.on('waiting', (job) => {
  console.log(`Job ${job.id} is waiting`);
});

voteQueue.on('active', (job) => {
  console.log(`Job ${job.id} is now active`);
});

voteQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

voteQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed with error:`, err.message);
});

module.exports = { voteQueue };