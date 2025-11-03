const Poll = require('../models/poll.model');

/**
 * Generate a unique 6-character join code
 */
const generateJoinCode = async () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  let isUnique = false;

  while (!isUnique) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Check if code already exists
    const existingPoll = await Poll.findOne({ joinCode: code });
    if (!existingPoll) {
      isUnique = true;
    }
  }

  return code;
};

/**
 * Generate session ID for voters
 */
const generateSessionId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

module.exports = {
  generateJoinCode,
  generateSessionId,
};