const Poll = require('../models/poll.model');
const Vote = require('../models/vote.model');

/**
 * @route   GET /api/results/:pollId
 * @desc    Get poll results (for organizer)
 */
exports.getPollResults = async (req, res, next) => {
  try {
    const poll = await Poll.findById(req.params.pollId);

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
        message: 'Not authorized to view results',
      });
    }

    // Get all votes for this poll
    const votes = await Vote.find({ poll: poll._id });

    // Calculate detailed results
    const results = {
      pollId: poll._id,
      title: poll.title,
      status: poll.status,
      totalVotes: poll.totalVotes,
      questions: poll.questions.map(question => {
        const questionResults = {
          questionId: question._id,
          questionText: question.questionText,
          type: question.type,
          totalResponses: 0,
          options: [],
        };

        if (question.type === 'text') {
          // For text questions, collect all answers
          questionResults.textAnswers = votes
            .map(vote => {
              const answer = vote.answers.find(
                a => a.questionId.toString() === question._id.toString()
              );
              return answer?.textAnswer;
            })
            .filter(Boolean);
          questionResults.totalResponses = questionResults.textAnswers.length;
        } else {
          // For choice questions, count votes per option
          questionResults.options = question.options.map(option => {
            const voteCount = votes.filter(vote => {
              const answer = vote.answers.find(
                a => a.questionId.toString() === question._id.toString()
              );
              return answer?.selectedOptions.some(
                opt => opt.toString() === option._id.toString()
              );
            }).length;

            return {
              optionId: option._id,
              text: option.text,
              voteCount,
              percentage: poll.totalVotes > 0 
                ? ((voteCount / poll.totalVotes) * 100).toFixed(2) 
                : 0,
            };
          });

          questionResults.totalResponses = votes.filter(vote => 
            vote.answers.some(
              a => a.questionId.toString() === question._id.toString()
            )
          ).length;
        }

        return questionResults;
      }),
      startedAt: poll.startedAt,
      endedAt: poll.endedAt,
    };

    res.status(200).json({
      success: true,
      results,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/results/live/:joinCode
 * @desc    Get live poll results (public if enabled)
 */
exports.getLiveResults = async (req, res, next) => {
  try {
    const poll = await Poll.findOne({ 
      joinCode: req.params.joinCode.toUpperCase() 
    });

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found',
      });
    }

    // Check if live results are enabled
    if (!poll.settings.showResultsLive) {
      return res.status(403).json({
        success: false,
        message: 'Live results are not enabled for this poll',
      });
    }

    // Return simplified results (just vote counts)
    const results = {
      pollId: poll._id,
      title: poll.title,
      totalVotes: poll.totalVotes,
      questions: poll.questions.map(question => ({
        questionId: question._id,
        questionText: question.questionText,
        type: question.type,
        options: question.options.map(option => ({
          optionId: option._id,
          text: option.text,
          voteCount: option.voteCount,
          percentage: poll.totalVotes > 0 
            ? ((option.voteCount / poll.totalVotes) * 100).toFixed(2) 
            : 0,
        })),
      })),
    };

    res.status(200).json({
      success: true,
      results,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/results/:pollId/export
 * @desc    Export poll results as CSV
 */
exports.exportResults = async (req, res, next) => {
  try {
    const poll = await Poll.findById(req.params.pollId);

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
        message: 'Not authorized to export results',
      });
    }

    const votes = await Vote.find({ poll: poll._id });

    // Create CSV data
    let csv = 'Timestamp,SessionID';
    poll.questions.forEach((q, idx) => {
      csv += `,Question${idx + 1}`;
    });
    csv += '\n';

    votes.forEach(vote => {
      csv += `${vote.createdAt.toISOString()},${vote.sessionId}`;
      
      poll.questions.forEach(question => {
        const answer = vote.answers.find(
          a => a.questionId.toString() === question._id.toString()
        );
        
        if (question.type === 'text') {
          csv += `,"${answer?.textAnswer || ''}"`;
        } else {
          const selectedTexts = answer?.selectedOptions.map(optId => {
            const option = question.options.find(
              o => o._id.toString() === optId.toString()
            );
            return option?.text || '';
          }).join('; ') || '';
          csv += `,"${selectedTexts}"`;
        }
      });
      
      csv += '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=poll-${poll._id}-results.csv`
    );
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};