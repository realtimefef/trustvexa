// Persistence for public contact-form submissions (task 8.3). Email and body
// are stored encrypted (email_enc, body_enc); encryption happens in the service
// layer before insert. Not barrel-exported.
export async function insertContactMessage(tx, input) {
    const { rows } = await tx.query(`INSERT INTO contact_messages (name, email_enc, subject, body_enc, status)
		 VALUES ($1, $2, $3, $4, 'new')
		 RETURNING id, name, email_enc, subject, body_enc, status, created_at`, [input.name, input.emailEnc, input.subject, input.bodyEnc]);
    const row = rows[0];
    if (!row)
        throw new Error('insertContactMessage returned no row');
    return row;
}
export async function setContactStatus(tx, id, status) {
    await tx.query(`UPDATE contact_messages SET status = $2 WHERE id = $1`, [id, status]);
}
//# sourceMappingURL=contact.repository.js.map