const Poll = require('../models/poll.model');
const { generateJoinCode } = require('../utils/generateCode');
const { validatePollData } = require('../utils/validateInput');
const { redisPub } = require('../config/redis');

/**
 * @route   POST /api/polls
 * @desc    Create a new poll
 */
exports.createPoll = async (req, res, next) => {
  try {
    const { title, description, questions, settings } = req.body;

    // Validate poll data
    const validation = validatePollData({ title, questions });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    // Generate unique join code
    const joinCode = await generateJoinCode();

    // Create poll
    const poll = await Poll.create({
      title,
      description,
      questions,
      settings,
      joinCode,
      organizer: req.organizer._id,
    });

    res.status(201).json({
      success: true,
      poll,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/polls
 * @desc    Get all polls for logged-in organizer
 */
exports.getMyPolls = async (req, res, next) => {
  try {
    const polls = await Poll.find({ organizer: req.organizer._id })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.status(200).json({
      success: true,
      count: polls.length,
      polls,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/polls/:id
 * @desc    Get single poll by ID
 */
exports.getPollById = async (req, res, next) => {
  try {
    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found',
      });
    }

    // Check if organizer owns this poll
    if (poll.organizer.toString() !== req.organizer._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this poll',
      });
    }

    res.status(200).json({
      success: true,
      poll,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/polls/join/:joinCode
 * @desc    Get poll by join code (for voters)
 */
exports.getPollByJoinCode = async (req, res, next) => {
  try {
    const poll = await Poll.findOne({ 
      joinCode: req.params.joinCode.toUpperCase() 
    }).select('-organizer');

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found with this join code',
      });
    }

    if (poll.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `This poll is currently ${poll.status}`,
      });
    }

    res.status(200).json({
      success: true,
      poll,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/polls/:id
 * @desc    Update poll
 */
exports.updatePoll = async (req, res, next) => {
  try {
    let poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found',
      });
    }

    // Check ownership
    if (poll.organizer.toString() !== req.organizer._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this poll',
      });
    }

    // Can't update active or ended polls
    if (poll.status === 'active' || poll.status === 'ended') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update an active or ended poll',
      });
    }

    poll = await Poll.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      poll,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/polls/:id/start
 * @desc    Start a poll
 */
exports.startPoll = async (req, res, next) => {
  try {
    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found',
      });
    }

    // Check ownership
    if (poll.organizer.toString() !== req.organizer._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to start this poll',
      });
    }

    if (poll.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Poll is already active',
      });
    }

    poll.status = 'active';
    poll.startedAt = new Date();
    await poll.save();

    // Publish event to Redis
    await redisPub.publish('poll-updates', JSON.stringify({
      type: 'POLL_STARTED',
      pollId: poll._id,
      joinCode: poll.joinCode,
    }));

    res.status(200).json({
      success: true,
      message: 'Poll started successfully',
      poll,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/polls/:id/pause
 * @desc    Pause a poll
 */
exports.pausePoll = async (req, res, next) => {
  try {
    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found',
      });
    }

    // Check ownership
    if (poll.organizer.toString() !== req.organizer._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to pause this poll',
      });
    }

    if (poll.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Only active polls can be paused',
      });
    }

    poll.status = 'paused';
    await poll.save();

    // Publish event to Redis
    await redisPub.publish('poll-updates', JSON.stringify({
      type: 'POLL_PAUSED',
      pollId: poll._id,
      joinCode: poll.joinCode,
    }));

    res.status(200).json({
      success: true,
      message: 'Poll paused successfully',
      poll,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/polls/:id/end
 * @desc    End a poll
 */
exports.endPoll = async (req, res, next) => {
  try {
    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found',
      });
    }

    // Check ownership
    if (poll.organizer.toString() !== req.organizer._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to end this poll',
      });
    }

    if (poll.status === 'ended') {
      return res.status(400).json({
        success: false,
        message: 'Poll is already ended',
      });
    }

    poll.status = 'ended';
    poll.endedAt = new Date();
    await poll.save();

    // Publish event to Redis
    await redisPub.publish('poll-updates', JSON.stringify({
      type: 'POLL_ENDED',
      pollId: poll._id,
      joinCode: poll.joinCode,
    }));

    res.status(200).json({
      success: true,
      message: 'Poll ended successfully',
      poll,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/polls/:id
 * @desc    Delete poll
 */
exports.deletePoll = async (req, res, next) => {
  try {
    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found',
      });
    }

    // Check ownership
    if (poll.organizer.toString() !== req.organizer._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this poll',
      });
    }

    await poll.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Poll deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};