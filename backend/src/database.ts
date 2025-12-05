// backend/src/database.ts
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set. Please add it to your .env file');
}

export async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI!, {
      retryWrites: true,
      w: 'majority',
    });
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (err: any) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

export function getDatabase() {
  return mongoose.connection;
}

export { mongoose };
