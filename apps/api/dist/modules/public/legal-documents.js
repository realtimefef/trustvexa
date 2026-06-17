// Legal & trust document registry for the public site (task 8.2,
// Requirements 42.5, 42.6, 42.7). Each entry maps to a routable slug and a
// policy_versions.doc_type so published versions can be wired in.
export const LEGAL_DOCS = [
    {
        docType: 'terms',
        slug: '/legal/terms',
        title: 'Terms of Service',
        versioned: true,
        requiresAcceptance: true,
    },
    {
        docType: 'privacy',
        slug: '/legal/privacy',
        title: 'Privacy Policy',
        versioned: true,
        requiresAcceptance: true,
    },
    {
        docType: 'cookie',
        slug: '/legal/cookies',
        title: 'Cookie Policy',
        versioned: true,
        requiresAcceptance: false,
    },
    {
        docType: 'refund_dispute',
        slug: '/legal/refunds',
        title: 'Refund & Dispute Policy',
        versioned: true,
        requiresAcceptance: false,
    },
    {
        docType: 'prohibited_items',
        slug: '/legal/prohibited-items',
        title: 'Prohibited Items',
        versioned: true,
        requiresAcceptance: true,
    },
    {
        docType: 'security',
        slug: '/security',
        title: 'Security',
        versioned: false,
        requiresAcceptance: false,
    },
    {
        docType: 'accessibility',
        slug: '/accessibility',
        title: 'Accessibility Statement',
        versioned: false,
        requiresAcceptance: false,
    },
    {
        docType: 'sitemap',
        slug: '/sitemap.xml',
        title: 'Sitemap',
        versioned: false,
        requiresAcceptance: false,
    },
];
export function findLegalDoc(docType) {
    const doc = LEGAL_DOCS.find((d) => d.docType === docType);
    if (!doc)
        throw new Error(`unknown legal doc type: ${docType}`);
    return doc;
}
/** Doc types that a user must (re)accept; feeds the signup + re-acceptance gate. */
export function acceptanceRequiredDocTypes() {
    return LEGAL_DOCS.filter((d) => d.requiresAcceptance).map((d) => d.docType);
}
//# sourceMappingURL=legal-documents.js.map