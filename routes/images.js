//This page defines API for uploading, processing, listing, retrieving, and (for admins) deleting images

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';

import Image from '../models/Image.js';
import { enqueue } from '../processing/queue.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.join(__dirname, '..');
const DIR_ORIG   = path.join(ROOT, 'uploads', 'originals');
const DIR_DER    = path.join(ROOT, 'uploads', 'derived');

fs.mkdirSync(DIR_ORIG, { recursive: true });
fs.mkdirSync(DIR_DER,  { recursive: true });

// ---- auth ----
function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
const isAdmin = (req) => req.user?.role === 'admin';

// ---- multer (opplasting) ----
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, DIR_ORIG),
  filename: (_req, file, cb) => {
    const safe = file.originalname.normalize('NFC').replace(/[^\w.\-]+/g, '_');
    cb(null, Date.now() + '-' + safe);
  }
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ok = /image\/(jpeg|png|webp)/i.test(file.mimetype);
    cb(ok ? null : new Error('Only JPEG/PNG/WebP'), ok);
  },
  limits: { fileSize: 25 * 1024 * 1024 }
});

const exists = (p) => { try { return p && fs.existsSync(p); } catch { return false; } };

function buildUrls(doc) {
  const id = doc._id;
  const origName = doc.originalPath ? path.basename(doc.originalPath) : null;

  const thumbP  = path.join(DIR_DER, `${id}-thumb.jpg`);
  const mediumP = path.join(DIR_DER, `${id}-medium.jpg`);
  const artP    = path.join(DIR_DER, `${id}-art.jpg`);
  const editP   = path.join(DIR_DER, `${id}-edit.jpg`);

  return {
    thumb:    exists(thumbP)  ? `/uploads/derived/${id}-thumb.jpg`  : null,
    medium:   exists(mediumP) ? `/uploads/derived/${id}-medium.jpg` : null,
    art:      exists(artP)    ? `/uploads/derived/${id}-art.jpg`    : null,
    edit:     exists(editP)   ? `/uploads/derived/${id}-edit.jpg`   : null,
    original: origName ? `/uploads/originals/${origName}` : null
  };
}

//Endpoints POST, GET all, GET one, DELETE

//POST picture
router.post('/', auth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Missing file' });

  const img = await Image.create({
    ownerId: req.user.sub,
    originalPath: req.file.path,
    mimeType: req.file.mimetype,
    size: req.file.size,
    status: 'uploaded'
  });

  res.status(201).json(img);
});

//POST picture (queue)
router.post('/:id/process', auth, async (req, res) => {
  const img = await Image.findById(req.params.id);
  if (!img) return res.status(404).json({ error: 'Not found' });

  if (!isAdmin(req) && img.ownerId !== req.user.sub) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const edit = Object.keys(req.body || {}).length ? {
    effect:  req.body.effect,
    blur:    req.body.blur,
    rotate:  req.body.rotate,
    width:   req.body.width,
    quality: req.body.quality
  } : undefined;

  if (['queued', 'processing'].includes(img.status)) {
    return res.status(202).json({ ok: true, alreadyQueued: true });
  }

  await Image.findByIdAndUpdate(img._id, { status: 'queued' });
  enqueue(img, edit ? { edit } : {});
  res.json({ ok: true, id: img._id, queued: true, edit: !!edit });
});

//GET all pictures
router.get('/', auth, async (req, res) => {
  const { page = 1, limit = 50, sort = '-createdAt', tag, all } = req.query;

  const query = (isAdmin(req) && all === '1') ? {} : { ownerId: req.user.sub };
  if (tag) query.tags = tag;

  const p = Math.max(parseInt(page, 10) || 1, 1);
  const l = Math.max(parseInt(limit, 10) || 50, 1);
  const skip = (p - 1) * l;

  const [items, total] = await Promise.all([
    Image.find(query).sort(sort).skip(skip).limit(l),
    Image.countDocuments(query)
  ]);

  const out = items.map(doc => {
    const o = doc.toObject();
    o.urls = buildUrls(o);
    return o;
  });

  res.json({ items: out, page: p, limit: l, total, isAdmin: isAdmin(req) });
});

//GET one picture
router.get('/:id', auth, async (req, res) => {
  const img = await Image.findById(req.params.id);
  if (!img) return res.status(404).json({ error: 'Not found' });
  if (!isAdmin(req) && img.ownerId !== req.user.sub) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const o = img.toObject();
  o.urls = buildUrls(o);
  res.json(o);
});

//DELETE picture (admin only)
router.delete('/:id', auth, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });

  const img = await Image.findById(req.params.id);
  if (!img) return res.status(404).json({ error: 'Not found' });

  try {
    const derived = [
      path.join(DIR_DER, `${img._id}-thumb.jpg`),
      path.join(DIR_DER, `${img._id}-medium.jpg`),
      path.join(DIR_DER, `${img._id}-art.jpg`),
      path.join(DIR_DER, `${img._id}-edit.jpg`)
    ];
    [img.originalPath, ...derived].filter(Boolean).forEach(p => {
      try { fs.unlinkSync(p); } catch {}
    });
  } catch {}

  await Image.deleteOne({ _id: img._id });
  res.json({ ok: true, deleted: img._id });
});

export default router;
