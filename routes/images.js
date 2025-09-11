//This page defines API for uploading, processing, listing, retrieving, and (for admins) deleting images

import express from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import sharp from 'sharp';
import crypto from 'crypto';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

import Image from '../models/Image.js';
import { s3, BUCKET } from '../config/s3.js';

const router = express.Router();

//Helper-functions (authentication++)

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

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const ok = /image\/(jpeg|png|webp)/i.test(file.mimetype);
    cb(ok ? null : new Error('Only JPEG/PNG/WebP'), ok);
  },
  limits: { fileSize: 25 * 1024 * 1024 }
});

function normalizeKey(p) {
  if (!p) return null;
  const s = String(p);
  const i = s.indexOf('/uploads/');
  if (i >= 0) return s.slice(i + 1); 
  return s.replace(/^\/+/, '');
}

function buildUrls(doc) {
  const v = doc.variants || {};
  return {
    key: doc.originalPath || null,
    original: doc.originalPath || null,
    medium: v.mediumPath || null,
    thumb: v.thumbPath || null,
    edit: v.editPath || null
  };
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}

//ENDPOINTS

//POST picture
router.post('/', upload.single('image'), async (req, res) => { //commented out auth
  if (!req.file) return res.status(400).json({ error: 'Missing file' });

  const safeName = req.file.originalname.normalize('NFC').replace(/[^\w.\-]+/g, '_');
  const key = `uploads/${crypto.randomUUID()}-${safeName}`;

  try {
    const fixedBuffer = await sharp(req.file.buffer).rotate().toBuffer();

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: fixedBuffer,
      ContentType: req.file.mimetype
    }));

    const img = await Image.create({
      ownerId: req.user.sub,
      originalPath: key,
      mimeType: req.file.mimetype,
      size: req.file.size,
      status: 'uploaded'
    });

    res.status(201).json(img);
  } catch (err) {
    console.error('S3 upload error', {
      name: err?.name,
      code: err?.Code || err?.code,
      status: err?.$metadata?.httpStatusCode,
      message: err?.message
    });
    res.status(500).json({ error: 'Upload failed' });
  }
});

//POST image (ny! registrer fra S3-key etter presigned upload)
router.post('/from-key', auth, async (req, res) => {
  try {
    const { key, mimeType, size, title } = req.body || {};
    if (!key) return res.status(400).json({ error: 'key required' });

    const img = await Image.create({
      ownerId: req.user.sub,
      originalPath: key,
      mimeType: mimeType || 'application/octet-stream',
      size: size || 0,
      title: title || null,
      status: 'uploaded'
    });

    res.status(201).json(img);
  } catch (e) {
    console.error('from-key error', e);
    res.status(500).json({ error: 'Could not register image' });
  }
});

//POST edited image
router.post('/:id/process', auth, async (req, res) => {
  const img = await Image.findById(req.params.id);
  if (!img) return res.status(404).json({ error: 'Not found' });

  if (!isAdmin(req) && img.ownerId !== req.user.sub) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const effect = req.body?.effect;

  if (effect !== 'grayscale') {
    return res.json({ ok: true, skipped: true });
  }

  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: img.originalPath }));
    const buf = await streamToBuffer(obj.Body);

    const outBuf = await sharp(buf)
      .rotate()
      .grayscale()
      .jpeg({ quality: 85 })
      .toBuffer();

    const editKey = img.originalPath.replace(/(\.[a-z0-9]+)?$/i, '_edit.jpg'); // uploads/abc.jpg -> uploads/abc_edit.jpg

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: editKey,
      Body: outBuf,
      ContentType: 'image/jpeg'
    }));

    await Image.updateOne(
      { _id: img._id },
      { $set: { 'variants.editPath': editKey, status: 'processed' } }
    );

    res.json({ ok: true, id: img._id, editKey });
  } catch (e) {
    console.error('process grayscale error', e);
    await Image.updateOne({ _id: img._id }, { $set: { status: 'error' } });
    res.status(500).json({ error: 'Processing failed' });
  }
});

//GET all pictures
router.get('/', async (req, res) => {
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
    if (o.urls.original) o.urls.original = normalizeKey(o.urls.original);
    if (o.urls.medium)   o.urls.medium   = normalizeKey(o.urls.medium);
    if (o.urls.thumb)    o.urls.thumb    = normalizeKey(o.urls.thumb);
    if (o.urls.edit)     o.urls.edit     = normalizeKey(o.urls.edit);
    return o;
  });

  res.json({ items: out, page: p, limit: l, total, isAdmin: isAdmin(req) });
});

//GET one picture
router.get('/:id', async (req, res) => {
  const img = await Image.findById(req.params.id);
  if (!img) return res.status(404).json({ error: 'Not found' });
  if (!isAdmin(req) && img.ownerId !== req.user.sub) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const o = img.toObject();
  o.urls = buildUrls(o);
  if (o.urls.original) o.urls.original = normalizeKey(o.urls.original);
  if (o.urls.medium)   o.urls.medium   = normalizeKey(o.urls.medium);
  if (o.urls.thumb)    o.urls.thumb    = normalizeKey(o.urls.thumb);
  if (o.urls.edit)     o.urls.edit     = normalizeKey(o.urls.edit);
  res.json(o);
});

//DELETE picture (admin only)
router.delete('/:id', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });

  const img = await Image.findById(req.params.id);
  if (!img) return res.status(404).json({ error: 'Not found' });

  await Image.deleteOne({ _id: img._id });
  res.json({ ok: true, deleted: img._id });
});

export default router;
