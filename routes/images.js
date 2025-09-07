//This page defines API for uploading, processing, listing, retrieving, and (for admins) deleting images

import express from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import sharp from "sharp";
import crypto from 'crypto';               // endret
// import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';  // endret
import { PutObjectCommand } from '@aws-sdk/client-s3';              // endret (assistant): bruker felles s3-klient

import Image from '../models/Image.js';
import { enqueue } from '../processing/queue.js';

// endret (assistant): bruk felles S3-klient/konfig i stedet for å instansiere her
import { s3, BUCKET } from '../config/s3.js'; // endret (assistant)

const router = express.Router();

// endret: fjernet fs/path-diskoppsett, nå brukes S3
// const s3 = new S3Client({ region: process.env.AWS_REGION });  // endret
// const BUCKET = process.env.S3_BUCKET;                        // endret

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

// endret: bruk memoryStorage i stedet for diskStorage
const upload = multer({
  storage: multer.memoryStorage(),  // endret
  fileFilter: (_req, file, cb) => {
    const ok = /image\/(jpeg|png|webp)/i.test(file.mimetype);
    cb(ok ? null : new Error('Only JPEG/PNG/WebP'), ok);
  },
  limits: { fileSize: 25 * 1024 * 1024 }
});

//different versions of picture (quality, edit etc.) 
// endret: buildUrls er ikke lenger knyttet til lokalt filsystem.
// Du kan senere utvide til å generere presigned GET URLs fra S3.

// endret (assistant): normaliser nøkkel hvis noen gamle dokumenter har lokal sti
function normalizeKey(p) { // endret (assistant)
  if (!p) return null;
  const s = String(p);
  const i = s.indexOf('/uploads/');
  if (i >= 0) return s.slice(i + 1); // 'uploads/...'
  return s.replace(/^\/+/, '');
}

// endret (assistant): vis edit-varianten hvis den finnes, ellers original
function pickDisplayKey(doc) { // endret (assistant)
  return doc?.variants?.editPath || doc?.originalPath || null;
}

// endret (assistant): returner nøkkelen som frontend vil slå opp via /api/v1/s3/view-url
function buildUrls(doc) {
  const v = doc.variants || {};
  return {
    key: doc.originalPath || null,   // nøkkelen til original i S3
    original: doc.originalPath || null,
    thumb: v.thumbPath || null,
    medium: v.mediumPath || null,
    edit: v.editPath || null         // 👈 viktig: nå får frontend u.edit
  };
}

//Endpoints POST, GET all, GET one, DELETE

//POST picture
router.post('/', auth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Missing file' });

  const safeName = req.file.originalname.normalize('NFC').replace(/[^\w.\-]+/g, '_');
  const key = `uploads/${crypto.randomUUID()}-${safeName}`;

  try {
    // ✅ Normaliser EXIF-orientering før opplasting til S3
    const fixedBuffer = await sharp(req.file.buffer)
      .rotate()               // <- viktig
      .toBuffer();

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: fixedBuffer,      // <- bruk fixedBuffer
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

//POST picture (queue)
router.post('/:id/process', auth, async (req, res) => {
  const img = await Image.findById(req.params.id);
  if (!img) return res.status(404).json({ error: 'Not found' });

  if (!isAdmin(req) && img.ownerId !== req.user.sub) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const edit = req.body?.effect === 'grayscale'
  ? { effect: 'grayscale' }
  : undefined;

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
    o.urls = buildUrls(o);   // endret: bygger nå nøkkel for variant/eller original
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
  o.urls = buildUrls(o);   // endret
  res.json(o);
});

//DELETE picture (admin only)
router.delete('/:id', auth, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });

  const img = await Image.findById(req.params.id);
  if (!img) return res.status(404).json({ error: 'Not found' });

  // endret: lokal fil-sletting fjernet. For full støtte bør vi bruke s3.deleteObject her.
  await Image.deleteOne({ _id: img._id });
  res.json({ ok: true, deleted: img._id });
});

export default router;
