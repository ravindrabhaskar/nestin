import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../shared/types.js";

export interface GatewayRouteConfig {
  prefix: string;
  targetService: string;
  description: string;
  requiresAuth?: boolean;
  allowedRoles?: string[];
  downstreamUrl?: string;
}

export interface ServiceHealthStatus {
  name: string;
  status: "UP" | "DOWN" | "DEGRADED";
  url?: string;
  latencyMs?: number;
  lastChecked: string;
}

export interface GatewayHealthReport {
  gateway: "UP" | "DOWN";
  version: string;
  architecture: "MICROSERVICES";
  uptimeSeconds: number;
  environment: string;
  services: Record<string, ServiceHealthStatus>;
  timestamp: string;
}

export interface CorsConfig {
  allowedOrigins?: string[] | "*";
  allowedMethods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  maxAge?: number;
  credentials?: boolean;
}
