import Image from '../models/Image.js';
import sharp from 'sharp';                                      // endret (assistant): direkte prosessering her
import { s3, BUCKET } from '../config/s3.js';                   // endret (assistant)
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'; // endret (assistant)

const q = [];
let running = 0;
const CONCURRENCY = parseInt(process.env.PROCESSING_CONCURRENCY || '2', 10);

// liten helper for å hente original fra S3
async function getBufferFromS3(key) {                           // endret (assistant)
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const res = await s3.send(cmd);
  return Buffer.from(await res.Body.transformToByteArray());
}

// liten helper for å laste opp et buffer til S3
async function putBufferToS3(key, buffer, contentType = 'image/jpeg') { // endret (assistant)
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType });
  await s3.send(cmd);
}

//queue job
export function enqueue(image, options = {}) {
  q.push({ image, options });
  tick();
}

//uploads one photo at the time
async function tick() {
  if (running >= CONCURRENCY) return;
  const job = q.shift();
  if (!job) return;

  running++;
  try {
    const img = job.image;
    await Image.findByIdAndUpdate(img._id, { status: 'processing', error: null });

    // endret (assistant): definer S3 keys i stedet for lokale stier
    const outThumb  = `thumbs/${img._id}.jpg`;
    const outMedium = `medium/${img._id}.jpg`;
    const outEdit   = `edits/${img._id}.jpg`;

    // hent original fra S3
    const srcBuffer = await getBufferFromS3(img.originalPath);  // endret (assistant)

    // thumb
    const bufThumb = await sharp(srcBuffer)
      .resize({ width: 256, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    await putBufferToS3(outThumb, bufThumb);                    // endret (assistant)

    // medium
    const bufMedium = await sharp(srcBuffer)
      .resize({ width: 1024, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    await putBufferToS3(outMedium, bufMedium);                  // endret (assistant)

    // grayscale edit (hvis valgt)
    if (job.options?.edit) {
      let sh = sharp(srcBuffer);
      if (job.options.edit.effect === 'grayscale') {
        sh = sh.grayscale();
      }
      const bufEdit = await sh.jpeg({ quality: 85 }).toBuffer();
      await putBufferToS3(outEdit, bufEdit);                    // endret (assistant)
    }

    // oppdater DB med S3 keys
    const set = {
      status: 'done',
      variants: {
        ...(img.variants || {}),
        thumbPath: outThumb,
        mediumPath: outMedium,
        ...(job.options?.edit ? { editPath: outEdit } : {})
      }
    };

    await Image.findByIdAndUpdate(img._id, set);
  } catch (err) {
    await Image.findByIdAndUpdate(job.image._id, {
      status: 'error',
      error: String(err?.message || err)
    });
  } finally {
    running--;
    setImmediate(tick);
  }
}
