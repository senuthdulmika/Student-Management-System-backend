import { Document, Schema, Types, model } from 'mongoose';

export interface ISubject extends Document {
  name: string;
  code?: string;
  color: string;
  user: Types.ObjectId;
}

const subjectSchema = new Schema<ISubject>(
  {
    name: { type: String, required: [true, 'Subject name is required'], trim: true, maxlength: 80 },
    code: { type: String, trim: true, uppercase: true, maxlength: 20 },
    color: { type: String, default: '#6366f1', match: [/^#[0-9a-fA-F]{6}$/, 'Invalid color'] },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

subjectSchema.index({ user: 1, name: 1 }, { unique: true });

export const Subject = model<ISubject>('Subject', subjectSchema);
