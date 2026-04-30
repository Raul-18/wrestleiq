/**
 * WrestleIQ API — Express + PostgreSQL + JWT (httpOnly cookie).
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { validateServerEnv } from './startup/validateEnv.js';
import authRouter from './routes/auth.js';
import matchesRouter from './routes/matches.js';
import tagsRouter from './routes/tags.js';
import statsRouter from './routes/stats.js';
import { requireAuth } from './middleware/auth.js';

dotenv.config();
validateServerEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3001;

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(
  helmet({
    // Allow the browser SPA (often another dev port) to read JSON API responses with CORS + credentials
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

const uploadsDir = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'wrestleiq-api' });
});

app.use('/api/auth', authRouter);

const protectedApi = express.Router();
protectedApi.use(requireAuth);
protectedApi.use(matchesRouter);
protectedApi.use(tagsRouter);
protectedApi.use(statsRouter);
app.use('/api', protectedApi);

app.use((err, _req, res, _next) => {
  console.error('unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`WrestleIQ API listening on http://localhost:${PORT}`);
});
