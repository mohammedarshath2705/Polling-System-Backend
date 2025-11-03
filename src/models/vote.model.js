const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  selectedOptions: [{
    type: mongoose.Schema.Types.ObjectId,
  }],
  textAnswer: String,
});

const voteSchema = new mongoose.Schema({
  poll: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Poll',
    required: true,
  },
  sessionId: {
    type: String,
    required: true,
  },
  answers: [answerSchema],
  ipAddress: String,
  userAgent: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to prevent duplicate votes (if not allowing multiple responses)
voteSchema.index({ poll: 1, sessionId: 1 });
voteSchema.index({ poll: 1, createdAt: -1 });

module.exports = mongoose.model('Vote', voteSchema);