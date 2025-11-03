const express = require('express');
const router = express.Router();
const { submitVote, checkVote } = require('../controllers/vote.controller');

router.post('/', submitVote);
router.get('/check/:pollId/:sessionId', checkVote);

module.exports = router;