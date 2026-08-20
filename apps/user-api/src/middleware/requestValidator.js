import { apiError } from '@whatsapp-saas/shared-utils';
import { ErrorCodes } from '@whatsapp-saas/shared-constants';

export function validateBody(schema) {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync(req.body);
      req.body = parsed;
      next();
    } catch (error) {
      const formattedErrors = error.errors?.map((err) => ({
        path: err.path.join('.'),
        message: err.message
      }));
      return res.status(400).json(
        apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid request data', formattedErrors)
      );
    }
  };
}

export function validateQuery(schema) {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync(req.query);
      req.query = parsed;
      next();
    } catch (error) {
      const formattedErrors = error.errors?.map((err) => ({
        path: err.path.join('.'),
        message: err.message
      }));
      return res.status(400).json(
        apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid query parameters', formattedErrors)
      );
    }
  };
}

export default { validateBody, validateQuery };
