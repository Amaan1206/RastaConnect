const express = require('express');
const router = express.Router();

router.post('/register', (req, res) => {
  return res.status(200).json({ message: 'Authentication handled by Supabase' });
});

router.post('/login', (req, res) => {
  return res.status(200).json({ message: 'Authentication handled by Supabase' });
});

module.exports = router;
