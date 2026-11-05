import mongoose from 'mongoose';
import { env } from './env';

export const connectDB = async (): Promise<void> => {
  await mongoose.connect(env.MONGO_URI);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
};
