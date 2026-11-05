import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { User } from '../models/User';

(async () => {
  await connectDB();
  const email = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Admin already exists: ${email}`);
  } else {
    await User.create({
      name: process.env.ADMIN_NAME || 'System Admin',
      email,
      password: process.env.ADMIN_PASSWORD || 'Admin1234',
      role: 'admin',
    });
    console.log(`Admin created: ${email}`);
  }
  await mongoose.disconnect();
})();
