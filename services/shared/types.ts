import { Request, Response, NextFunction } from "express";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    correlationId: string;
    service: string;
    version: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: "owner" | "employee" | "tenant" | "admin" | "super_admin" | string;
  ownerId?: string;
  permissions?: string[];
  authorityLevel?: "full" | "high" | "medium" | "low" | "limited" | string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  correlationId?: string;
  serviceSource?: string;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  serviceName: string,
  statusCode = 200,
  pagination?: any,
  correlationId = ""
) {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      correlationId: correlationId || (res.req as any).correlationId || "req-unknown",
      service: serviceName,
      version: "v1.0.0",
      ...(pagination ? { pagination } : {}),
    },
  };
  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  serviceName: string,
  statusCode = 400,
  details?: any,
  correlationId = ""
) {
  const payload: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    metadata: {
      timestamp: new Date().toISOString(),
      correlationId: correlationId || (res.req as any).correlationId || "req-unknown",
      service: serviceName,
      version: "v1.0.0",
    },
  };
  return res.status(statusCode).json(payload);
}
