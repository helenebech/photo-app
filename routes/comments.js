// routes/comments.js
// This page defines API for creating comments

import express from 'express';
import Comment from '../models/Comment.js';
import Image from '../models/Image.js';

const router = express.Router();

// Cognito auth gjøres i server.js; sørg for at vi har req.user
router.use((req, res, next) => {
  if (!req.user?.sub) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

// POST - make comment for a picture
router.post('/', async (req, res) => {
  const { imageId, text } = req.body || {};
  if (!imageId || !text) return res.status(400).json({ error: 'imageId and text required' });

  const image = await Image.findById(imageId);
  if (!image) {
    return res.status(404).json({ error: 'Image not found' });
  }

  const comment = await Comment.create({
    imageId,
    authorId: req.user.sub,
    text
  });

  res.status(201).json(comment);
});

// GET - fetch comments on imageId
router.get('/', async (req, res) => {
  const { imageId } = req.query;
  const filter = imageId ? { imageId } : {};
  const comments = await Comment.find(filter)
    .sort('-createdAt')
    .limit(100);

  res.json({ items: comments });
});

export default router;
