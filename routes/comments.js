//This page defines API for creating comments

import express from 'express';
import jwt from 'jsonwebtoken';
import Comment from '../models/Comment.js';
import Image from '../models/Image.js';

const router = express.Router();

//verifying 
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

//endpoints (POST, GET one)

//POST - make comment for a picture
router.post('/', auth, async (req, res) => {
  const { imageId, text } = req.body;
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

//GET - fetch comments on imageId
router.get('/', auth, async (req, res) => {
  const { imageId } = req.query;
  const filter = imageId ? { imageId } : {};
  const comments = await Comment.find(filter)
    .sort('-createdAt')
    .limit(100);

  res.json({ items: comments });
});

export default router;
