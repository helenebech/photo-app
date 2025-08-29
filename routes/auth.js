//This page creates a login endpoint with express

import express from 'express';
import jwt from 'jsonwebtoken';
import users from '../config/users.json' assert { type: 'json' };

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid username/password' });

  const token = jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({ token, role: user.role });
});

export default router;