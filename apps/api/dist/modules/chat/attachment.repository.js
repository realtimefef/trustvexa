// Attachment persistence (task 6.7). Thin repository over message_attachments,
// file_access_links, and file_preview_events. Injected transactional client;
// not barrel-exported; runs only against a real DB.
// (Requirements 29.1, 29.4, 29.7, 29.8, 29.9)
export async function insertAttachment(client, input) {
    const res = await client.query(`INSERT INTO message_attachments
		   (message_id, kind, file_key, mime_type, size_bytes, duration_seconds)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, message_id, kind, scan_status`, [
        input.messageId,
        input.kind,
        input.fileKey,
        input.mimeType,
        // bind bigint as string to preserve precision
        input.sizeBytes.toString(),
        input.durationSeconds ?? null,
    ]);
    const row = res.rows[0];
    if (!row)
        throw new Error('failed to insert attachment');
    return row;
}
/** Update the malware-scan outcome, optionally quarantining. */
export async function setScanStatus(client, attachmentId, scanStatus, quarantineReason) {
    await client.query(`UPDATE message_attachments
		    SET scan_status = $2, quarantine_reason = $3
		  WHERE id = $1`, [attachmentId, scanStatus, quarantineReason]);
}
/** Mint an expiring signed-link record for a viewer. */
export async function createAccessLink(client, attachmentId, userId, signedUrlHash, expiresAtIso) {
    await client.query(`INSERT INTO file_access_links (attachment_id, user_id, signed_url_hash, expires_at)
		 VALUES ($1, $2, $3, $4)`, [attachmentId, userId, signedUrlHash, expiresAtIso]);
}
/** Audit a preview or download action. */
export async function recordPreviewEvent(client, attachmentId, userId, action) {
    await client.query(`INSERT INTO file_preview_events (attachment_id, user_id, action) VALUES ($1, $2, $3)`, [attachmentId, userId, action]);
}
export async function getAttachmentById(client, id) {
    const res = await client.query(`SELECT id, message_id, kind, file_key, mime_type, size_bytes::text AS size_bytes, scan_status, quarantine_reason
       FROM message_attachments
      WHERE id = $1`, [id]);
    return res.rows[0] ?? null;
}
//# sourceMappingURL=attachment.repository.js.map