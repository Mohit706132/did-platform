// backend/src/utils/auditLog.ts
/**
 * Audit logging for credential operations
 * Fixes Bug #19: No audit logging of issued credentials
 */

import { randomUUID } from "crypto";

export interface AuditLogEntry {
  auditId: string;
  timestamp: string;
  operation: "issue" | "verify" | "revoke" | "register_did" | "resolve_did";
  status: "success" | "failure";
  actor?: string; // DID of the actor
  subject?: string; // DID of the subject
  resourceId?: string; // Credential ID, credential hash, or DID
  details?: Record<string, any>;
  error?: string;
}

class AuditLogger {
  private logs: AuditLogEntry[] = [];

  /**
   * Log a credential issuance
   */
  logIssueCredential(
    subjectDid: string,
    credentialId: string,
    metadata?: Record<string, any>,
    error?: string
  ): string {
    const auditId = `AUDIT-${randomUUID()}`;
    const entry: AuditLogEntry = {
      auditId,
      timestamp: new Date().toISOString(),
      operation: "issue",
      status: error ? "failure" : "success",
      subject: subjectDid,
      resourceId: credentialId,
      details: metadata,
      error,
    };
    this.logs.push(entry);
    console.log(`[AUDIT] ${entry.operation.toUpperCase()}: ${auditId}`, entry);
    return auditId;
  }

  /**
   * Log a credential verification
   */
  logVerifyCredential(
    credentialId: string,
    subjectDid?: string,
    valid?: boolean,
    error?: string
  ): string {
    const auditId = `AUDIT-${randomUUID()}`;
    const entry: AuditLogEntry = {
      auditId,
      timestamp: new Date().toISOString(),
      operation: "verify",
      status: error || !valid ? "failure" : "success",
      subject: subjectDid,
      resourceId: credentialId,
      error: error || (!valid ? "Credential verification failed" : undefined),
    };
    this.logs.push(entry);
    console.log(`[AUDIT] ${entry.operation.toUpperCase()}: ${auditId}`, entry);
    return auditId;
  }

  /**
   * Log a credential revocation
   */
  logRevokeCredential(
    credentialId: string,
    actor?: string,
    error?: string
  ): string {
    const auditId = `AUDIT-${randomUUID()}`;
    const entry: AuditLogEntry = {
      auditId,
      timestamp: new Date().toISOString(),
      operation: "revoke",
      status: error ? "failure" : "success",
      actor,
      resourceId: credentialId,
      error,
    };
    this.logs.push(entry);
    console.log(`[AUDIT] ${entry.operation.toUpperCase()}: ${auditId}`, entry);
    return auditId;
  }

  /**
   * Log a DID registration
   */
  logRegisterDID(subjectDid: string, error?: string): string {
    const auditId = `AUDIT-${randomUUID()}`;
    const entry: AuditLogEntry = {
      auditId,
      timestamp: new Date().toISOString(),
      operation: "register_did",
      status: error ? "failure" : "success",
      subject: subjectDid,
      resourceId: subjectDid,
      error,
    };
    this.logs.push(entry);
    console.log(`[AUDIT] ${entry.operation.toUpperCase()}: ${auditId}`, entry);
    return auditId;
  }

  /**
   * Log a DID resolution
   */
  logResolveDID(subjectDid: string, found: boolean, error?: string): string {
    const auditId = `AUDIT-${randomUUID()}`;
    const entry: AuditLogEntry = {
      auditId,
      timestamp: new Date().toISOString(),
      operation: "resolve_did",
      status: error || !found ? "failure" : "success",
      subject: subjectDid,
      resourceId: subjectDid,
      error: error || (!found ? "DID not found" : undefined),
    };
    this.logs.push(entry);
    console.log(`[AUDIT] ${entry.operation.toUpperCase()}: ${auditId}`, entry);
    return auditId;
  }

  /**
   * Retrieve all audit logs
   */
  getLogs(): AuditLogEntry[] {
    return this.logs;
  }

  /**
   * Retrieve logs for a specific resource
   */
  getLogsByResource(resourceId: string): AuditLogEntry[] {
    return this.logs.filter(log => log.resourceId === resourceId);
  }

  /**
   * Retrieve logs for a specific operation
   */
  getLogsByOperation(operation: AuditLogEntry["operation"]): AuditLogEntry[] {
    return this.logs.filter(log => log.operation === operation);
  }

  /**
   * Retrieve logs for a specific subject DID
   */
  getLogsBySubject(subjectDid: string): AuditLogEntry[] {
    return this.logs.filter(log => log.subject === subjectDid);
  }
}

export const auditLogger = new AuditLogger();
