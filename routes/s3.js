// routes/s3.js
import express from "express";
import crypto from "crypto";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET } from "../config/s3.js";

const router = express.Router();

// enkel whitelist
const ALLOWED = ["image/jpeg","image/png","image/webp","image/gif"];

router.post("/upload-url", async (req, res) => {
  try {
    const { filename, contentType } = req.body || {};
    if (!filename || !contentType) return res.status(400).json({ error: "filename + contentType required" });
    if (!ALLOWED.includes(contentType)) return res.status(415).json({ error: "Unsupported contentType" });

    const datePrefix = new Date().toISOString().slice(0,10).replace(/-/g,"/");
    const key = `uploads/${datePrefix}/${crypto.randomUUID()}-${filename}`;

    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      // ServerSideEncryption: "AES256", // valgfritt
      // CacheControl: "public,max-age=31536000,immutable", // hvis du bruker CDN
    });

    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 90 });
    res.json({ uploadUrl, key });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not create upload URL" });
  }
});

// signert GET for å vise private objekter (5 min)
router.get("/view-url", async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ error: "key required" });
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 300 });
    res.json({ url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not create view URL" });
  }
});

export default router;
