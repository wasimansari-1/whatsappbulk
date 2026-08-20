import { apiError } from '@whatsapp-saas/shared-utils';
import { ErrorCodes } from '@whatsapp-saas/shared-constants';

export function errorHandler(err, req, res, next) {
  console.error(`[ErrorHandler] [${req.method} ${req.url}]:`, err);

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'record';
    return res.status(409).json(
      apiError(ErrorCodes.CONFLICT, `A record with this ${field} already exists.`)
    );
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message
    }));
    return res.status(400).json(
      apiError(ErrorCodes.VALIDATION_ERROR, 'Database validation error', details)
    );
  }

  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || ErrorCodes.INTERNAL_ERROR;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'An unexpected internal server error occurred.'
    : err.message || 'Internal server error';

  res.status(statusCode).json(apiError(errorCode, message));
}

export default errorHandler;
