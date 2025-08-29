import sharp from 'sharp';


export async function processImage({ srcPath, outThumb, outMedium, edit, outEdit }) {
  //thumb
  if (outThumb) {
    await sharp(srcPath)
      .resize({ width: 256, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(outThumb);
  }

  //medium
  if (outMedium) {
    await sharp(srcPath)
      .resize({ width: 1024, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(outMedium);
  }

  //grayscale edit
  if (edit && outEdit) {
    let img = sharp(srcPath);
    if (edit.effect === 'grayscale') {
      img = img.grayscale();
    }
    await img.jpeg({ quality: 85 }).toFile(outEdit);
  }
}
