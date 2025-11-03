const Vote = require('../models/vote.model');
const Poll = require('../models/poll.model');
const { validateVoteData } = require('../utils/validateInput');
const { voteQueue } = require('../queue/voteQueue');

/**
 * @route   POST /api/votes
 * @desc    Submit a vote
 */
exports.submitVote = async (req, res, next) => {
  try {
    const { pollId, sessionId, answers } = req.body;

    // Validate input
    if (!pollId || !sessionId || !answers) {
      return res.status(400).json({
        success: false,
        message: 'Poll ID, session ID, and answers are required',
      });
    }

    // Get poll
    const poll = await Poll.findById(pollId);

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found',
      });
    }

    // Check if poll is active
    if (poll.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This poll is not currently active',
      });
    }

    // Check if user has already voted (if multiple responses not allowed)
    if (!poll.settings.allowMultipleResponses) {
      const existingVote = await Vote.findOne({ poll: pollId, sessionId });
      if (existingVote) {
        return res.status(400).json({
          success: false,
          message: 'You have already voted in this poll',
        });
      }
    }

    // Validate vote data
    const validation = validateVoteData({ answers }, poll);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    // Create vote
    const vote = await Vote.create({
      poll: pollId,
      sessionId,
      answers,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Add to queue for async processing
    await voteQueue.add('process-vote', {
      voteId: vote._id,
      pollId: poll._id,
      answers,
    });

    res.status(201).json({
      success: true,
      message: 'Vote submitted successfully',
      voteId: vote._id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/votes/check/:pollId/:sessionId
 * @desc    Check if user has already voted
 */
exports.checkVote = async (req, res, next) => {
  try {
    const { pollId, sessionId } = req.params;

    const vote = await Vote.findOne({ poll: pollId, sessionId });

    res.status(200).json({
      success: true,
      hasVoted: !!vote,
    });
  } catch (error) {
    next(error);
  }
};