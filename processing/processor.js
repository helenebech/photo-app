import sharp from 'sharp';
import { s3, BUCKET } from '../config/s3.js';             
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'; 

//Helperfunction
async function getBufferFromS3(key) {                      
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const res = await s3.send(cmd);
  return Buffer.from(await res.Body.transformToByteArray());
}

//Helperfunction
async function putBufferToS3(key, buffer, contentType = 'image/jpeg') { 
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType
  });
  await s3.send(cmd);
}

//Different edits of picture, saved in s3
export async function processImage({ srcPath, outThumb, outMedium, edit, outEdit }) {
  const srcBuffer = await getBufferFromS3(srcPath);

  if (outThumb) {
    const buf = await sharp(srcBuffer)
      .resize({ width: 256, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    await putBufferToS3(outThumb, buf);                   
  }

  if (outMedium) {
    const buf = await sharp(srcBuffer)
      .resize({ width: 1024, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    await putBufferToS3(outMedium, buf);                  
  }

  if (edit && outEdit) {
    let img = sharp(srcBuffer);
    if (edit.effect === 'grayscale') {
      img = img.grayscale();
    }
    const buf = await img.jpeg({ quality: 85 }).toBuffer();
    await putBufferToS3(outEdit, buf);                    
  }
}
