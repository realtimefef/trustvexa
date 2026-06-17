// Attachment persistence (task 6.7). Thin repository over message_attachments,
// file_access_links, and file_preview_events. Injected transactional client;
// not barrel-exported; runs only against a real DB.
// (Requirements 29.1, 29.4, 29.7, 29.8, 29.9)

import type { AttachmentKind, ScanStatus } from './upload-validation.js';

export interface AttachmentTxClient {
  query<R>(text: string, params?: unknown[]): Promise<{ rows: R[]; rowCount: number | null }>;
}

export interface InsertAttachmentInput {
  messageId: string;
  kind: AttachmentKind;
  fileKey: string;
  mimeType: string;
  sizeBytes: bigint;
  durationSeconds?: number | null;
}

export interface AttachmentRow {
  id: string;
  message_id: string;
  kind: AttachmentKind;
  scan_status: ScanStatus;
}

export async function insertAttachment(
  client: AttachmentTxClient,
  input: InsertAttachmentInput,
): Promise<AttachmentRow> {
  const res = await client.query<AttachmentRow>(
    `INSERT INTO message_attachments
		   (message_id, kind, file_key, mime_type, size_bytes, duration_seconds)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, message_id, kind, scan_status`,
    [
      input.messageId,
      input.kind,
      input.fileKey,
      input.mimeType,
      // bind bigint as string to preserve precision
      input.sizeBytes.toString(),
      input.durationSeconds ?? null,
    ],
  );
  const row = res.rows[0];
  if (!row) throw new Error('failed to insert attachment');
  return row;
}

/** Update the malware-scan outcome, optionally quarantining. */
export async function setScanStatus(
  client: AttachmentTxClient,
  attachmentId: string,
  scanStatus: ScanStatus,
  quarantineReason: string | null,
): Promise<void> {
  await client.query(
    `UPDATE message_attachments
		    SET scan_status = $2, quarantine_reason = $3
		  WHERE id = $1`,
    [attachmentId, scanStatus, quarantineReason],
  );
}

/** Mint an expiring signed-link record for a viewer. */
export async function createAccessLink(
  client: AttachmentTxClient,
  attachmentId: string,
  userId: string | null,
  signedUrlHash: string,
  expiresAtIso: string,
): Promise<void> {
  await client.query(
    `INSERT INTO file_access_links (attachment_id, user_id, signed_url_hash, expires_at)
		 VALUES ($1, $2, $3, $4)`,
    [attachmentId, userId, signedUrlHash, expiresAtIso],
  );
}

/** Audit a preview or download action. */
export async function recordPreviewEvent(
  client: AttachmentTxClient,
  attachmentId: string,
  userId: string | null,
  action: 'preview' | 'download',
): Promise<void> {
  await client.query(
    `INSERT INTO file_preview_events (attachment_id, user_id, action) VALUES ($1, $2, $3)`,
    [attachmentId, userId, action],
  );
}

export interface AttachmentDetails {
  id: string;
  message_id: string;
  kind: AttachmentKind;
  file_key: string;
  mime_type: string;
  size_bytes: string;
  scan_status: ScanStatus;
  quarantine_reason: string | null;
}

export async function getAttachmentById(
  client: AttachmentTxClient,
  id: string,
): Promise<AttachmentDetails | null> {
  const res = await client.query<AttachmentDetails>(
    `SELECT id, message_id, kind, file_key, mime_type, size_bytes::text AS size_bytes, scan_status, quarantine_reason
       FROM message_attachments
      WHERE id = $1`,
    [id],
  );
  return res.rows[0] ?? null;
}
