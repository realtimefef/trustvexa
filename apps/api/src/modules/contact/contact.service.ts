/**
 * Public contact-form service (task 8.3, Requirement 42.8).
 *
 * Persists an inbound contact message so the support team can follow up.
 * `contact_messages.email_enc` and `body_enc` are sealed with `sealPii()`
 * before storage; the KEK-backed KeyProvider is fully wired.
 */
import { sealPii } from '../crypto/key-provider.js';
import { insertContactMessage } from './contact.repository.js';
import type { ContactMessageInput } from './contact.schemas.js';

export interface ContactSubmissionResult {
  id: string;
  status: string;
  createdAt: string;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

export async function submitContactMessage(
  input: ContactMessageInput,
): Promise<ContactSubmissionResult> {
  const emailEnc = await sealPii(input.email);
  const bodyEnc = await sealPii(input.message);

  const row = await insertContactMessage({
    name: input.name,
    emailEnc: emailEnc ?? '',
    subject: input.subject ?? null,
    bodyEnc: bodyEnc ?? '',
    status: 'new',
  });

  return {
    id: row.id,
    status: row.status ?? 'new',
    createdAt: toIso(row.created_at),
  };
}
