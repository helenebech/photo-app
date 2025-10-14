import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { enqueue } from './queue.js';

dotenv.config();
const app = express();
app.use(express.json());

app.post('/process', async (req, res) => {
  try {
    const { imageId, effect } = req.body || {};
    if (!imageId) return res.status(400).json({ error: 'Missing imageId' });

    // Enqueue the processing job
    enqueue({ _id: imageId }, { edit: { effect } });
    
    res.status(202).json({ ok: true, message: 'Processing started', imageId });
  } catch (err) {
    console.error('Enqueue error:', err);
    res.status(500).json({ error: 'Processing failed' });
  }
});

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'processor' });
});

const PORT = process.env.PORT || 3001;
(async () => {
  try {
    if (!process.env.MONGO_URL) throw new Error("Missing MONGO_URL");
    await mongoose.connect(process.env.MONGO_URL);
    console.log('MongoDB connected (processor)');
    
    app.listen(PORT, () => console.log(`Processor running on port ${PORT}`));
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
})();
