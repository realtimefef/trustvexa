export interface ContactFormInput {
    name: string;
    email: string;
    subject: string;
    message: string;
    /** Hidden honeypot field; bots fill it, humans leave it empty. */
    honeypot?: string;
}
export type ContactFormError = 'name_required' | 'name_too_long' | 'email_invalid' | 'subject_required' | 'subject_too_long' | 'message_too_short' | 'message_too_long' | 'spam_detected';
export interface NormalizedContact {
    name: string;
    email: string;
    subject: string;
    message: string;
}
export type ContactFormResult = {
    ok: true;
    value: NormalizedContact;
} | {
    ok: false;
    error: ContactFormError;
};
export declare const NAME_MAX = 100;
export declare const SUBJECT_MAX = 150;
export declare const MESSAGE_MIN = 10;
export declare const MESSAGE_MAX = 5000;
export declare function validateContactForm(input: ContactFormInput): ContactFormResult;
//# sourceMappingURL=contact-form.d.ts.map