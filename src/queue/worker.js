require('dotenv').config();
const { Worker } = require('bullmq');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { redisClient, redisPub } = require('../config/redis');
const Poll = require('../models/poll.model');
const Vote = require('../models/vote.model');

connectDB();

const voteWorker = new Worker(
  'vote-processing',
  async (job) => {
    const { voteId, pollId, answers } = job.data;

    try {
      console.log(`Processing vote ${voteId} for poll ${pollId}`);

      const poll = await Poll.findById(pollId);
      if (!poll) {
        throw new Error('Poll not found');
      }

      for (const answer of answers) {
        const question = poll.questions.id(answer.questionId);
        
        if (question && question.type !== 'text') {
          for (const optionId of answer.selectedOptions) {
            const option = question.options.id(optionId);
            if (option) {
              option.voteCount += 1;
            }
          }
        }
      }

      poll.totalVotes += 1;
      await poll.save();

      await redisPub.publish('vote-updates', JSON.stringify({
        type: 'NEW_VOTE',
        pollId: poll._id.toString(),
        joinCode: poll.joinCode,
        totalVotes: poll.totalVotes,
        questions: poll.questions.map(q => ({
          questionId: q._id.toString(),
          options: q.options.map(o => ({
            optionId: o._id.toString(),
            voteCount: o.voteCount,
          })),
        })),
      }));

      console.log(`Vote ${voteId} processed successfully`);

      return { success: true, voteId };
    } catch (error) {
      console.error(`Error processing vote ${voteId}:`, error);
      throw error;
    }
  },
  {
    connection: redisClient,
    concurrency: 5, 
  }
);

voteWorker.on('completed', (job) => {
  console.log(`✓ Job ${job.id} completed`);
});

voteWorker.on('failed', (job, err) => {
  console.error(`✗ Job ${job.id} failed:`, err.message);
});

voteWorker.on('error', (err) => {
  console.error('Worker error:', err);
});

console.log('Vote processing worker started');

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing worker...');
  await voteWorker.close();
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing worker...');
  await voteWorker.close();
  await mongoose.connection.close();
  process.exit(0);
});