export class AppError extends Error {
  constructor(public message: string, public statusCode: number = 500, public code?: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export function formatValidationMessage(error: Error): string {
  if (error instanceof ValidationError && Array.isArray(error.details) && error.details.length > 0) {
    const issues = error.details.map((issue: { path?: string[]; message: string }) => {
      const path = issue.path?.join?.('.') || 'field';
      return `${path}: ${issue.message}`;
    });
    return issues.join('; ');
  }
  return error.message;
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super(`${entity} with id ${id} not found`, 404, 'NOT_FOUND');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'A database error occurred', public originalError?: unknown) {
    super(message, 500, 'DATABASE_ERROR');
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'UNAUTHENTICATED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(message, 403, 'FORBIDDEN');
  }
}
