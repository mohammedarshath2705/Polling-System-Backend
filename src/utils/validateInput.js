/**
 * Validate email format
 */
const validateEmail = (email) => {
  const re = /^\S+@\S+\.\S+$/;
  return re.test(email);
};

/**
 * Validate poll creation data
 */
const validatePollData = (data) => {
  const errors = [];

  if (!data.title || data.title.trim().length === 0) {
    errors.push('Poll title is required');
  }

  if (!data.questions || data.questions.length === 0) {
    errors.push('At least one question is required');
  }

  if (data.questions) {
    data.questions.forEach((q, index) => {
      if (!q.questionText || q.questionText.trim().length === 0) {
        errors.push(`Question ${index + 1}: Question text is required`);
      }

      if (q.type !== 'text' && (!q.options || q.options.length < 2)) {
        errors.push(`Question ${index + 1}: At least 2 options are required`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate vote data
 */
const validateVoteData = (voteData, poll) => {
  const errors = [];

  if (!voteData.answers || voteData.answers.length === 0) {
    errors.push('No answers provided');
  }

  // Check if all required questions are answered
  poll.questions.forEach((question) => {
    if (question.required) {
      const answer = voteData.answers.find(
        (a) => a.questionId.toString() === question._id.toString()
      );

      if (!answer) {
        errors.push(`Question "${question.questionText}" is required`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateEmail,
  validatePollData,
  validateVoteData,
};