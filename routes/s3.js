//This page handles image upload and access with s3-buckets

import express from "express";
import crypto from "crypto";
import sharp from "sharp";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import multer from "multer";
import { s3, BUCKET } from "../config/s3.js";

const router = express.Router();

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const upload = multer({ storage: multer.memoryStorage() });

//POST
router.post("/upload-url", async (req, res) => {
  try {
    const { filename, contentType } = req.body || {};
    if (!filename || !contentType) {
      return res.status(400).json({ error: "filename + contentType required" });
    }
    if (!ALLOWED.includes(contentType)) {
      return res.status(415).json({ error: "Unsupported contentType" });
    }

    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
    const key = `uploads/${datePrefix}/${crypto.randomUUID()}-${filename}`;

    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 90 });
    res.json({ uploadUrl, key });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not create upload URL" });
  }
});

//POST 
router.post("/upload-direct", upload.single("image"), async (req, res) => {
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

//GET
router.get("/view-url", async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) 
      return res.status(400).json({ error: "key required" });
    const rawKey = decodeURIComponent(String(key));
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: rawKey });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 300 });
    res.json({ url });
    } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not create view URL" });
  }
});

export default router;
