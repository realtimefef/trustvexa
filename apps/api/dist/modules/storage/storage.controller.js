import crypto from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';
import { query } from '@trustvexa/shared';
import { getObjectStorage } from './object-storage.js';
import { verifySignedToken } from './signed-links.js';
import { applyWatermark } from './watermark.js';
import { logger } from '../../logger.js';
function readRawBody(req, maxBytes = 50 * 1024 * 1024) {
    if (Buffer.isBuffer(req.body)) {
        if (req.body.length > maxBytes) {
            return Promise.reject(new Error('File size limit exceeded (max 50MB)'));
        }
        return Promise.resolve(req.body);
    }
    return new Promise((resolve, reject) => {
        const chunks = [];
        let bytesRead = 0;
        req.on('data', (chunk) => {
            bytesRead += chunk.length;
            if (bytesRead > maxBytes) {
                reject(new Error('File size limit exceeded (max 50MB)'));
            }
            chunks.push(chunk);
        });
        req.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
        req.on('error', (err) => {
            reject(err);
        });
    });
}
export async function uploadFile(req, res) {
    let bytes;
    try {
        bytes = await readRawBody(req);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to read request body';
        res.status(400).json({ error_code: 'BAD_REQUEST', message });
        return;
    }
    if (bytes.length === 0) {
        res.status(400).json({ error_code: 'BAD_REQUEST', message: 'No file content received' });
        return;
    }
    const typeResult = await fileTypeFromBuffer(bytes);
    if (!typeResult) {
        res.status(400).json({
            error_code: 'BAD_REQUEST',
            message: 'Could not determine file type from magic bytes',
        });
        return;
    }
    const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
        'video/mp4',
        'audio/webm',
    ];
    if (!allowedMimeTypes.includes(typeResult.mime)) {
        res.status(400).json({
            error_code: 'INVALID_FILE_TYPE',
            message: `MIME type ${typeResult.mime} is not allowed`,
        });
        return;
    }
    const contentType = typeResult.mime;
    const ext = typeResult.ext;
    const fileKey = `attachments/${crypto.randomUUID()}.${ext}`;
    const storage = getObjectStorage();
    const putResult = await storage.put(fileKey, bytes, contentType);
    if (!putResult.stored) {
        res
            .status(500)
            .json({ error_code: 'STORAGE_ERROR', message: 'Failed to persist uploaded file' });
        return;
    }
    res.status(200).json({
        stored: true,
        file_key: fileKey,
        mime_type: contentType,
        size_bytes: bytes.length,
    });
}
export async function viewFile(req, res) {
    const { fileId } = req.params;
    const token = req.query.token;
    if (!fileId || !token) {
        res.status(400).json({ error_code: 'BAD_REQUEST', message: 'File ID and token are required' });
        return;
    }
    // 1. Verify the signed token
    const verified = verifySignedToken(token);
    if (!verified || verified.fileId !== fileId) {
        res.status(403).json({ error_code: 'FORBIDDEN', message: 'Invalid or expired preview link' });
        return;
    }
    const { userId } = verified;
    // 2. Fetch the attachment from the database with the associated deal_id and check deal party membership
    const dbRes = await query(`SELECT a.id, a.kind, a.file_key, a.mime_type, a.scan_status, c.deal_id
       FROM message_attachments a
       JOIN messages m ON m.id = a.message_id
       JOIN chats c ON c.id = m.chat_id
       JOIN deals d ON d.id = c.deal_id
      WHERE a.id = $1
        AND (d.buyer_id = $2 OR d.seller_id = $2 OR d.middleman_id = $2)`, [fileId, userId]);
    let attachment = dbRes.rows[0];
    if (!attachment) {
        // Check if it's a dispute evidence file
        const evidenceRes = await query(`SELECT e.id, 'evidence' AS kind, e.file_key, e.mime_type, 'clean' AS scan_status, dp.deal_id
         FROM dispute_evidence e
         JOIN disputes dp ON dp.id = e.dispute_id
         JOIN deals d ON d.id = dp.deal_id
        WHERE e.id = $1
          AND (d.buyer_id = $2 OR d.seller_id = $2 OR d.middleman_id = $2)`, [fileId, userId]);
        attachment = evidenceRes.rows[0];
    }
    if (!attachment) {
        res.status(403).json({ error_code: 'FORBIDDEN', message: 'You are not authorized to view this file' });
        return;
    }
    // Ensure attachment scan status is clean
    if (attachment.scan_status !== 'clean') {
        res.status(403).json({ error_code: 'UNSAFE_FILE', message: 'File is not marked as clean' });
        return;
    }
    // 3. Load the bytes from object storage
    const storage = getObjectStorage();
    const bytes = await storage.get(attachment.file_key);
    if (!bytes) {
        res.status(404).json({ error_code: 'NOT_FOUND', message: 'File bytes not found in storage' });
        return;
    }
    // 4. Record the file preview event
    try {
        await query(`INSERT INTO file_preview_events (attachment_id, user_id, action) VALUES ($1, $2, $3)`, [fileId, userId, 'preview']);
    }
    catch (err) {
        const requestLogger = req.log || logger;
        requestLogger.error({ err, attachmentId: fileId, userId }, 'Failed to log file preview event to pii_access_logs/file_preview_events');
    }
    // 5. Watermark images if it's an image attachment
    let outputBytes = bytes;
    const isImage = attachment.mime_type.startsWith('image/');
    if (isImage && attachment.kind === 'image') {
        try {
            const dealSnippet = attachment.deal_id.slice(0, 8);
            outputBytes = await applyWatermark(bytes, `TrustVexa · Preview Only · Deal #${dealSnippet}`);
        }
        catch (err) {
            const requestLogger = req.log || logger;
            requestLogger.error({ err, attachmentId: fileId }, 'watermark_failed');
            res.status(500).json({ error_code: 'WATERMARK_FAILED', message: 'Failed to apply watermark' });
            return;
        }
    }
    // 6. Send response
    res.setHeader('Content-Type', attachment.mime_type);
    res.setHeader('Content-Length', outputBytes.length);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.status(200).send(outputBytes);
}
/**
 * GET /storage/serve/:fileKey — serve a connection-chat image directly by
 * file_key (no attachment DB row required). Used for images uploaded via the
 * connection chat before a deal exists. Access requires a valid JWT only.
 */
export async function serveFile(req, res) {
    const rawKey = req.params['fileKey'];
    if (!rawKey) {
        res.status(400).json({ error_code: 'BAD_REQUEST', message: 'fileKey is required' });
        return;
    }
    // Only allow keys in the attachments/ prefix to prevent path traversal
    const fileKey = decodeURIComponent(rawKey);
    if (!fileKey.startsWith('attachments/')) {
        res.status(403).json({ error_code: 'FORBIDDEN', message: 'Invalid file key' });
        return;
    }
    const storage = getObjectStorage();
    const bytes = await storage.get(fileKey);
    if (!bytes) {
        res.status(404).json({ error_code: 'NOT_FOUND', message: 'File not found' });
        return;
    }
    // Detect MIME from bytes
    let contentType = 'application/octet-stream';
    try {
        const { fileTypeFromBuffer: ft } = await import('file-type');
        const typeResult = await ft(bytes);
        if (typeResult)
            contentType = typeResult.mime;
    }
    catch {
        // fallback
    }
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', bytes.length);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.status(200).send(bytes);
}
//# sourceMappingURL=storage.controller.js.map