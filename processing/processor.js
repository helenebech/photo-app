import sharp from 'sharp';

/**
 * Basert på originalfil lager vi:
 *  - thumb (256w), medium (1024w)
 *  - art (tung pipeline)
 *  - edit (valgfri “redigering” fra klienten)
 */
export async function processImage({ srcPath, outThumb, outMedium, outArt, edit, outEdit }) {
  // hent metadata
  const meta = await sharp(srcPath).metadata();
  const needsRotate = meta.width > meta.height; // 🔹 antar landskap = feil, så vi snur

  const autoRotate = (img) => needsRotate ? img.rotate(90) : img;

  if (outThumb) {
    await autoRotate(sharp(srcPath))
      .withMetadata({ orientation: 1 })
      .resize({ width: 256, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(outThumb);
  }

  if (outMedium) {
    await autoRotate(sharp(srcPath))
      .withMetadata({ orientation: 1 })
      .resize({ width: 1024, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(outMedium);
  }

  if (outArt) {
    let img = autoRotate(sharp(srcPath))
      .withMetadata({ orientation: 1 });

    img = img.blur(8);
    img = img.linear(1.2, -10); // enkel kontrast
    img = img.sharpen();
    img = img.gamma(1.1);

    await img.jpeg({ quality: 88 }).toFile(outArt);
  }

  // Valgfri redigering fra klient
  if (edit && outEdit) {
    let img = autoRotate(sharp(srcPath))
      .withMetadata({ orientation: 1 });

    const width = Number(edit.width) || null;
    const quality = Math.min(Math.max(Number(edit.quality) || 85, 40), 100);
    if (width) img = img.resize({ width, withoutEnlargement: true });

    if (edit.rotate) img = img.rotate(Number(edit.rotate));

    switch (edit.effect) {
      case 'grayscale':
        img = img.grayscale();
        break;
      case 'blur':
        img = img.blur(Math.min(Math.max(Number(edit.blur) || 5, 1), 20));
        break;
      case 'sepia':
        img = img.modulate({ saturation: 0.6, brightness: 1 })
                 .tint({ r: 112, g: 66, b: 20 });
        break;
      default:
        break;
    }

    await img.jpeg({ quality }).toFile(outEdit);
  }
}
