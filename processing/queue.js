import Image from '../models/Image.js';
import { processImage } from './processor.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const q = [];
let running = 0;
const CONCURRENCY = parseInt(process.env.PROCESSING_CONCURRENCY || '2', 10);

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

    const outDir    = path.join(__dirname, '..', 'uploads', 'derived');
    const outThumb  = path.join(outDir, `${img._id}-thumb.jpg`);
    const outMedium = path.join(outDir, `${img._id}-medium.jpg`);
    const outEdit   = path.join(outDir, `${img._id}-edit.jpg`);

    await processImage({
      srcPath: img.originalPath,
      outThumb,
      outMedium,
      edit: job.options?.edit,                 
      outEdit: job.options?.edit ? outEdit : undefined
    });

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

