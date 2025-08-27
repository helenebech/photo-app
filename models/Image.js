import mongoose from 'mongoose';

const VariantSchema = new mongoose.Schema({
  thumbPath: String,
  mediumPath: String,
  artPath: String,
  editPath: String   // ny: sist redigerte variant
}, { _id: false });

const ImageSchema = new mongoose.Schema({
  ownerId: { type: String, required: true },
  originalPath: { type: String, required: true },
  mimeType: String,
  size: Number,
  width: Number,
  height: Number,
  tags: { type: [String], default: [] },
  status: { type: String, enum: ['uploaded','queued','processing','done','error'], default: 'uploaded' },
  variants: VariantSchema,
  error: String
}, { timestamps: true });

export default mongoose.model('Image', ImageSchema);
