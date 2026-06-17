// Public contact form validation (task 8.3, Requirement 42.8). Pure: the route
// persists the result to contact_messages (name, email_enc, subject, body_enc).
export const NAME_MAX = 100;
export const SUBJECT_MAX = 150;
export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 5000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function validateContactForm(input) {
    if (input.honeypot !== undefined && input.honeypot.trim().length > 0) {
        return { ok: false, error: 'spam_detected' };
    }
    const name = input.name.trim();
    if (name.length === 0)
        return { ok: false, error: 'name_required' };
    if (name.length > NAME_MAX)
        return { ok: false, error: 'name_too_long' };
    const email = input.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email))
        return { ok: false, error: 'email_invalid' };
    const subject = input.subject.trim();
    if (subject.length === 0)
        return { ok: false, error: 'subject_required' };
    if (subject.length > SUBJECT_MAX)
        return { ok: false, error: 'subject_too_long' };
    const message = input.message.trim();
    if (message.length < MESSAGE_MIN)
        return { ok: false, error: 'message_too_short' };
    if (message.length > MESSAGE_MAX)
        return { ok: false, error: 'message_too_long' };
    return { ok: true, value: { name, email, subject, message } };
}
//# sourceMappingURL=contact-form.js.map