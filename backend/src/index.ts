import dotenv from "dotenv";

dotenv.config({
  path: "./.env",
});

import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { initSocketServer } from './services/socket.service';
import { startOverdueTaskJob } from './jobs/overdueTask.job';
import routes from './routes';
import { errorHandler, notFound } from './middleware/errorHandler';
import logger from './utils/logger';

const app = express();
const httpServer = http.createServer(app);

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

//prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza19PemdXVHd2ZGpWOFJ6RS1SRy0tblAiLCJhcGlfa2V5IjoiMDFLTUJERVFHRk1DMjUxMzBRN1YzNFBXRDUiLCJ0ZW5hbnRfaWQiOiJiOTI2NTkxY2Y1NTE5YTc3YTMyYTMyZTBjYWI3OTlmM2JjNjhkNGY3ZGFhMWQ5NTk4ZDA1ZWMwNGM5NzU2ZjQ5IiwiaW50ZXJuYWxfc2VjcmV0IjoiNDA4YzBmZjktNTM2NC00MWUxLTkzMDYtYzA3OGQyNjgxOGY0In0.jxB9506fs1ETwTRDUvcrI_i9vBQy4cVo1lEXAEsoneg
// Rate limiting

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, error: 'Too many requests' },
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many auth attempts' },
});
app.use('/api/auth/login', authLimiter);

// ─── ROUTES ──────────────────────────────────────────────────────────────────
app.use('/api', routes);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ─── ERROR HANDLERS ──────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── WEBSOCKET ───────────────────────────────────────────────────────────────
initSocketServer(httpServer);

// ─── BACKGROUND JOBS ─────────────────────────────────────────────────────────
startOverdueTaskJob();
//console.log("ENV CHECK:", process.env.DATABASE_URL);

// ─── START ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export default app;
