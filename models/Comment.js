import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema({
  imageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Image', required: true },
  authorId: { type: String, required: true },
  text: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('Comment', CommentSchema);
