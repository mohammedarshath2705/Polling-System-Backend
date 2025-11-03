const express = require('express');
const router = express.Router();
const {
  getPollResults,
  getLiveResults,
  exportResults,
} = require('../controllers/result.controller');
const { protect } = require('../middleware/auth');

router.get('/live/:joinCode', getLiveResults);

router.get('/:pollId', protect, getPollResults);
router.get('/:pollId/export', protect, exportResults);

module.exports = router;