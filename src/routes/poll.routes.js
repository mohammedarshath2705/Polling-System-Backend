const express = require('express');
const router = express.Router();
const {
  createPoll,
  getMyPolls,
  getPollById,
  getPollByJoinCode,
  updatePoll,
  startPoll,
  pausePoll,
  endPoll,
  deletePoll,
} = require('../controllers/poll.controller');
const { protect } = require('../middleware/auth');

router.get('/join/:joinCode', getPollByJoinCode);

router.use(protect);

router.route('/')
  .post(createPoll)
  .get(getMyPolls);

router.route('/:id')
  .get(getPollById)
  .put(updatePoll)
  .delete(deletePoll);

router.post('/:id/start', startPoll);
router.post('/:id/pause', pausePoll);
router.post('/:id/end', endPoll);

module.exports = router;