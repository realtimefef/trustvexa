export type DocType = 'terms' | 'privacy' | 'cookie' | 'refund_dispute' | 'prohibited_items' | 'security' | 'accessibility' | 'sitemap';
export interface LegalDoc {
    docType: DocType;
    slug: string;
    title: string;
    /** Whether this document is version-tracked in policy_versions. */
    versioned: boolean;
    /** Whether acceptance is required at signup / on change. */
    requiresAcceptance: boolean;
}
export declare const LEGAL_DOCS: readonly LegalDoc[];
export declare function findLegalDoc(docType: DocType): LegalDoc;
/** Doc types that a user must (re)accept; feeds the signup + re-acceptance gate. */
export declare function acceptanceRequiredDocTypes(): DocType[];
//# sourceMappingURL=legal-documents.d.ts.map