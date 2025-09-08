import sharp from 'sharp';
import { s3, BUCKET } from '../config/s3.js';              // endret (assistant)
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'; // endret (assistant)
import { Readable } from 'stream';                         // endret (assistant)

// liten helper for å lese S3 til buffer
async function getBufferFromS3(key) {                      // endret (assistant)
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const res = await s3.send(cmd);
  return Buffer.from(await res.Body.transformToByteArray());
}

// liten helper for å skrive buffer til S3
async function putBufferToS3(key, buffer, contentType = 'image/jpeg') { // endret (assistant)
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType
  });
  await s3.send(cmd);
}

export async function processImage({ srcPath, outThumb, outMedium, edit, outEdit }) {
  // endret (assistant): hent original fra S3
  const srcBuffer = await getBufferFromS3(srcPath);

  //thumb
  if (outThumb) {
    const buf = await sharp(srcBuffer)
      .resize({ width: 256, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    await putBufferToS3(outThumb, buf);                   // endret (assistant)
  }

  //medium
  if (outMedium) {
    const buf = await sharp(srcBuffer)
      .resize({ width: 1024, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    await putBufferToS3(outMedium, buf);                  // endret (assistant)
  }

  //grayscale edit
  if (edit && outEdit) {
    let img = sharp(srcBuffer);
    if (edit.effect === 'grayscale') {
      img = img.grayscale();
    }
    const buf = await img.jpeg({ quality: 85 }).toBuffer();
    await putBufferToS3(outEdit, buf);                    // endret (assistant)
  }
}
