const express = require('express');
const router = express.Router();
const {
  getPollResults,
  getLiveResults,
  exportResults,
} = require('../controllers/result.controller');
const { protect } = require('../middleware/auth');

// Public route for live results
router.get('/live/:joinCode', getLiveResults);

// Protected routes
router.get('/:pollId', protect, getPollResults);
router.get('/:pollId/export', protect, exportResults);

module.exports = router;