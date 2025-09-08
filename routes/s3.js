// routes/s3.js
// Håndterer opplasting og visning av bilder via S3 med presigned URLs

import express from "express";
import crypto from "crypto";
import sharp from "sharp";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import multer from "multer";
import { s3, BUCKET } from "../config/s3.js";
import jwt from "jsonwebtoken";

const router = express.Router();
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const upload = multer({ storage: multer.memoryStorage() });

// --- Hjelpefunksjon: auth ---
function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// --- PRESIGNED PUT (for opplasting) ---
router.post("/upload-url", auth, async (req, res) => {
  try {
    const { filename, contentType } = req.body || {};
    if (!filename || !contentType) {
      return res.status(400).json({ error: "filename + contentType required" });
    }
    if (!ALLOWED.includes(contentType)) {
      return res.status(415).json({ error: "Unsupported contentType" });
    }

    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
    const userPrefix = req.user?.sub ? `${req.user.sub}/` : "";
    const key = `uploads/${userPrefix}${datePrefix}/${crypto.randomUUID()}-${filename}`;

    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });

    // gyldig i 90 sekunder (kort levetid for opplasting)
    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 90 });
    res.json({ uploadUrl, key });
  } catch (e) {
    console.error("upload-url error", e);
    res.status(500).json({ error: "Could not create upload URL" });
  }
});

// --- Direkte opplasting (fallback) ---
router.post("/upload-direct", auth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Missing file" });
    if (!ALLOWED.includes(req.file.mimetype)) {
      return res.status(415).json({ error: "Unsupported contentType" });
    }

    const safeName = req.file.originalname
      .normalize("NFC")
      .replace(/[^\w.\-]+/g, "_");
    const key = `uploads/${crypto.randomUUID()}-${safeName}`;

    const fixedBuffer = await sharp(req.file.buffer).rotate().toBuffer();

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: fixedBuffer,
        ContentType: req.file.mimetype,
      })
    );

    res.json({ ok: true, key });
  } catch (e) {
    console.error("upload-direct error", e);
    res.status(500).json({ error: "Could not upload file" });
  }
});

// --- PRESIGNED GET (for visning) ---
router.get("/view-url", auth, async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ error: "key required" });

    const rawKey = decodeURIComponent(String(key));
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: rawKey });

    // gyldig i 600 sekunder = 10 minutter
    // du kan endre dette til f.eks. 60 (1 min) hvis du vil være strengere
    const url = await getSignedUrl(s3, cmd, { expiresIn: 600 });
    res.json({ url });
  } catch (e) {
    console.error("view-url error", e);
    res.status(500).json({ error: "Could not create view URL" });
  }
});

export default router;
