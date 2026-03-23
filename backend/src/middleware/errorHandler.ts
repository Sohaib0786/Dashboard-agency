import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import logger from '../utils/logger';
import { sendError } from '../utils/response';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Unhandled error', { error: err.message, stack: err.stack, path: req.path });

  // Never expose raw stack traces
  sendError(res, 'An internal server error occurred', 500);
}

export function notFound(req: Request, res: Response): void {
  sendError(res, `Route ${req.path} not found`, 404);
}

export function validateRequest(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(e => e.msg).join(', ');
    sendError(res, errorMessages, 422);
    return;
  }
  next();
}
