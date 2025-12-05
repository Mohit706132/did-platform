// backend/src/utils/logger.ts
/**
 * Centralized logging with error tracking
 * Fixes Bug #20: No error logging details
 */

import { randomUUID } from "crypto";

export interface LogEntry {
  errorId: string;
  timestamp: string;
  level: "error" | "warn" | "info";
  endpoint?: string;
  message: string;
  stack?: string;
  context?: any;
}

class Logger {
  private logs: LogEntry[] = [];

  error(
    message: string,
    endpoint?: string,
    error?: any,
    context?: any
  ): string {
    const errorId = `ERR-${randomUUID()}`;
    const entry: LogEntry = {
      errorId,
      timestamp: new Date().toISOString(),
      level: "error",
      endpoint,
      message,
      stack: error?.stack,
      context
    };

    this.logs.push(entry);
    console.error(`[${errorId}] ${message}`, error?.message || "");
    
    return errorId;
  }

  warn(message: string, context?: any): void {
    console.warn(`[WARN] ${message}`, context || "");
  }

  info(message: string, context?: any): void {
    console.log(`[INFO] ${message}`, context || "");
  }

  getLogs(): LogEntry[] {
    return this.logs;
  }

  getLog(errorId: string): LogEntry | undefined {
    return this.logs.find(log => log.errorId === errorId);
  }
}

export const logger = new Logger();
