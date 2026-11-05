import app from './app';
import { connectDB } from './config/db';
import { env } from './config/env';

connectDB()
  .then(() => app.listen(env.PORT, () => console.log(`API running on port ${env.PORT} (${env.NODE_ENV})`)))
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
