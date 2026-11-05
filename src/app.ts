import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler, notFound } from './middleware/error';
import adminRoutes from './routes/adminRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import authRoutes from './routes/authRoutes';
import subjectRoutes from './routes/subjectRoutes';
import taskRoutes from './routes/taskRoutes';

const app = express();
app.set('trust proxy', 1); // Render / Railway sit behind a proxy

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL.split(','), credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
if (!env.isProd) app.use(morgan('dev'));

app.get('/', (_req, res) => void res.json({ success: true, message: 'Student Task Management API is running' }));
app.get('/api/health', (_req, res) => void res.json({ success: true, status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
