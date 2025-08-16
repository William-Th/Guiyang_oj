const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// Login endpoint
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  // TODO: Implement login logic
  res.json({ message: 'Login endpoint', token: 'placeholder' });
});

// Register endpoint
router.post('/register', [
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['student', 'teacher', 'admin']).withMessage('Invalid role'),
  body('idCard').optional().matches(/^\d{18}$/).withMessage('Invalid ID card format')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  // TODO: Implement registration logic
  res.json({ message: 'Registration endpoint' });
});

// Logout endpoint
router.post('/logout', (req, res) => {
  // TODO: Implement logout logic (clear session/redis)
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;