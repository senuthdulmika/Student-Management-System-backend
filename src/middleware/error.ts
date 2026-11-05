import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction): void => {
  let status = 500;
  let message = 'Internal server error';
  let errors: { field: string; message: string }[] | undefined;

  if (err instanceof AppError) {
    status = err.statusCode;
    message = err.message;
  } else if (err instanceof ZodError) {
    status = 400;
    errors = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    message = errors[0]?.message || 'Validation failed';
  } else if (err?.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors as Record<string, { message: string }>).map((e) => e.message).join(', ');
  } else if (err?.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err?.code === 11000) {
    status = 409;
    message = 'Duplicate value: that record already exists';
  }

  if (status === 500) console.error(err);
  res.status(status).json({ success: false, message, ...(errors && { errors }), ...(!env.isProd && status === 500 && { stack: err?.stack }) });
};
