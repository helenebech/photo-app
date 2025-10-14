// processing/queue.js
import Image from './models/Image.js';
import sharp from 'sharp';
import { s3, BUCKET } from './config/s3.js';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const q = [];
let running = 0;
const CONCURRENCY = parseInt(process.env.PROCESSING_CONCURRENCY || '2', 10);

// Helper function
async function getBufferFromS3(key) {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const res = await s3.send(cmd);
  return Buffer.from(await res.Body.transformToByteArray());
}

// Helper function
async function putBufferToS3(key, buffer, contentType = 'image/jpeg') {
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType
  });
  await s3.send(cmd);
}

// Helper function to convert stream to buffer
// async function streamToBuffer(stream) {
//   const chunks = [];
//   for await (const chunk of stream) {
//     chunks.push(chunk);
//   }
//   return Buffer.concat(chunks);
// }

// Queue job
export function enqueue(image, options = {}) {
  q.push({ image, options });
  tick();
}

// Process jobs from queue
async function tick() {
  if (running >= CONCURRENCY) return;
  const job = q.shift();
  if (!job) return;

  running++;
  try {
    const img = job.image;
    await Image.findByIdAndUpdate(img._id, { status: 'processing', error: null });

    const outThumb = `thumbs/${img._id}.jpg`;
    const outMedium = `medium/${img._id}.jpg`;
    const outEdit = `edits/${img._id}.jpg`;

    // Get original image from S3
    const imgDoc = await Image.findById(img._id);
    if (!imgDoc) throw new Error('Image not found in DB');

    const srcBuffer = await getBufferFromS3(imgDoc.originalPath);

    // Generate thumbnail
    const bufThumb = await sharp(srcBuffer)
      .resize({ width: 256, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    await putBufferToS3(outThumb, bufThumb);

    // Generate medium size
    const bufMedium = await sharp(srcBuffer)
      .resize({ width: 1024, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    await putBufferToS3(outMedium, bufMedium);

    // Apply edit effect if requested (e.g., grayscale)
    if (job.options?.edit?.effect) {
      let sharpInstance = sharp(srcBuffer).rotate();
      
      if (job.options.edit.effect === 'grayscale') {
        sharpInstance = sharpInstance.grayscale();
      }
      
      const bufEdit = await sharpInstance.jpeg({ quality: 85 }).toBuffer();
      await putBufferToS3(outEdit, bufEdit);
    }

    // Update DB with S3 keys
    const updateData = {
      status: 'done',
      variants: {
        ...(imgDoc.variants || {}),
        thumbPath: outThumb,
        mediumPath: outMedium,
        ...(job.options?.edit ? { editPath: outEdit } : {})
      }
    };

    await Image.findByIdAndUpdate(img._id, updateData);
  } catch (err) {
    console.error('Processing error:', err);
    await Image.findByIdAndUpdate(job.image._id, {
      status: 'error',
      error: String(err?.message || err)
    });
  } finally {
    running--;
    setImmediate(tick);
  }
}
