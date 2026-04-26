export class AppError extends Error {
  constructor(public message: string, public statusCode: number = 500, public code?: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: any) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super(`${entity} with id ${id} not found`, 404, 'NOT_FOUND');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'A database error occurred', public originalError?: any) {
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
