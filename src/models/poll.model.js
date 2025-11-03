const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
  },
  voteCount: {
    type: Number,
    default: 0,
  },
});

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['single-choice', 'multiple-choice', 'text'],
    default: 'single-choice',
  },
  options: [optionSchema],
  required: {
    type: Boolean,
    default: true,
  },
});

const pollSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a poll title'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organizer',
    required: true,
  },
  joinCode: {
    type: String,
    required: true,
    unique: true, 
    uppercase: true,
  },
  questions: [questionSchema],
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'ended'],
    default: 'draft',
  },
  settings: {
    allowAnonymous: {
      type: Boolean,
      default: true,
    },
    showResultsLive: {
      type: Boolean,
      default: true,
    },
    allowMultipleResponses: {
      type: Boolean,
      default: false,
    },
  },
  totalVotes: {
    type: Number,
    default: 0,
  },
  startedAt: Date,
  endedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

pollSchema.index({ organizer: 1, createdAt: -1 });
pollSchema.index({ status: 1 });

module.exports = mongoose.model('Poll', pollSchema);
