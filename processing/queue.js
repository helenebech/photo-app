import Image from '../models/Image.js';
import sharp from 'sharp';                                      
import { s3, BUCKET } from '../config/s3.js';                  
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'; 

const q = [];
let running = 0;
const CONCURRENCY = parseInt(process.env.PROCESSING_CONCURRENCY || '2', 10);

//Helperfunction
async function getBufferFromS3(key) {                           
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const res = await s3.send(cmd);
  return Buffer.from(await res.Body.transformToByteArray());
}

//Helperfunction
async function putBufferToS3(key, buffer, contentType = 'image/jpeg') { // endret (assistant)
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType });
  await s3.send(cmd);
}

//Queue job
export function enqueue(image, options = {}) {
  q.push({ image, options });
  tick();
}

//Makes sure one picture is uploaded at the time
//For assignment 03: Her kan vi kanskje bruke SQS
async function tick() {
  if (running >= CONCURRENCY) return;
  const job = q.shift();
  if (!job) return;

  running++;
  try {
    const img = job.image;
    await Image.findByIdAndUpdate(img._id, { status: 'processing', error: null });

    const outThumb  = `thumbs/${img._id}.jpg`;
    const outMedium = `medium/${img._id}.jpg`;
    const outEdit   = `edits/${img._id}.jpg`;

    const srcBuffer = await getBufferFromS3(img.originalPath);  

    const bufThumb = await sharp(srcBuffer)
      .resize({ width: 256, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    await putBufferToS3(outThumb, bufThumb);                   

    const bufMedium = await sharp(srcBuffer)
      .resize({ width: 1024, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    await putBufferToS3(outMedium, bufMedium);                  

    if (job.options?.edit) {
      let sh = sharp(srcBuffer);
      if (job.options.edit.effect === 'grayscale') {
        sh = sh.grayscale();
      }
      const bufEdit = await sh.jpeg({ quality: 85 }).toBuffer();
      await putBufferToS3(outEdit, bufEdit);                    
    }

    //Updates DB with S3-keys
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
