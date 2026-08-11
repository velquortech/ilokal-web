/**
 * Legal wording for the hosted /terms and /privacy pages.
 *
 * Mirrors `constants/legal.ts` in the MOBILE repo (ilokal-mobile), which is
 * the single source for the in-app LegalReader modal. The shape is the same
 * `LegalSection[]` structure, so syncing the two is a structural diff rather
 * than a proofread. Update BOTH whenever the wording changes — see
 * `ilokal-mobile/legal/README.md` ("Hosted copies").
 *
 * These pages exist because Google Play's App-content step requires a privacy
 * policy (and delete-account flow) at a public URL — the app itself cannot
 * satisfy that. Rendered by `app/privacy/page.tsx` and `app/terms/page.tsx`.
 */

/** Matches `LEGAL_LAST_UPDATED` in ilokal-mobile `constants/legal.ts`. */
export const LEGAL_LAST_UPDATED = 'August 11, 2026';

export type LegalSection = {
  heading: string;
  /** Body paragraphs, each rendered as its own text block. */
  paragraphs?: string[];
  /** Bullet items, each rendered on its own line with a dot. */
  bullets?: string[];
};

export type LegalDoc = {
  id: 'terms' | 'privacy';
  title: string;
  intro: string;
  sections: LegalSection[];
};

export const TERMS_DOC: LegalDoc = {
  id: 'terms',
  title: 'Terms of Service',
  intro:
    'These Terms of Service (“Terms”) govern your use of the iLokal app and its services. By downloading, accessing, or using iLokal, you agree to these Terms and to our Privacy Policy. If you don’t agree, please don’t use the app.',
  sections: [
    {
      heading: 'What is iLokal',
      paragraphs: [
        'iLokal is a local-business discovery platform. It helps you find nearby shops and establishments, browse their profiles, menus, and products, follow them, discover local events, and claim coupons and deals to redeem in store.',
        'The businesses you find on iLokal are independent third parties. Their listings, products, prices, events, and offers belong to them — iLokal is the marketplace that connects you, not the merchant.',
      ],
    },
    {
      heading: 'Eligibility',
      paragraphs: [
        'You must be at least 18 years old to create an account. If you are under 18, you may use iLokal only with the involvement and consent of a parent or legal guardian.',
      ],
    },
    {
      heading: 'Accounts',
      paragraphs: [
        'You can browse much of iLokal as a guest without an account. An account is required for follows, claiming coupons and deals, your coupon wallet, the updates feed, notifications, and ratings.',
        'You can register with email and password or with a supported third-party sign-in. You are responsible for keeping your credentials safe and for everything done under your account — notify us promptly if you think someone else has accessed it.',
      ],
    },
    {
      heading: 'Coupons and deals — please read',
      paragraphs: [
        'Coupons and deals are offered by the businesses, not by iLokal. iLokal helps you discover, claim, and redeem them, but each offer is subject to the terms set by the business that made it — including validity period, expiry, quantity limits, and any per-user limits such as one claim per user.',
        'Claiming an offer does not guarantee a product’s availability. Redemption is validated in store with a code, and is subject to the business honoring it. Offers have no cash value and cannot be exchanged for money.',
        'iLokal is not responsible if a business refuses, changes, or withdraws an offer, or for the quality, safety, or legality of anything you buy. Disputes about a purchase or redemption are between you and the business.',
      ],
    },
    {
      heading: 'Ratings and reviews',
      paragraphs: [
        'You may submit ratings and reviews. You keep ownership of what you write, and you grant iLokal a worldwide, non-exclusive, royalty-free license to host, store, and display it in the app to operate the service.',
        'Please be honest and respectful: your reviews should reflect your own experience and must not violate any law or third-party right. We may remove content that breaks these Terms.',
      ],
    },
    {
      heading: 'Acceptable use',
      paragraphs: ['You agree not to:'],
      bullets: [
        'use iLokal for any unlawful purpose or in violation of these Terms;',
        'submit false, misleading, defamatory, harassing, or infringing content;',
        'abuse offers — for example, fraudulent, automated, or bulk claiming, or working around per-user limits;',
        'reverse engineer, scrape, or bulk-extract data except as permitted by law;',
        'interfere with, overload, or try to gain unauthorized access to the app, our systems, or other users’ accounts;',
        'impersonate any person or business, or misrepresent your affiliation.',
      ],
    },
    {
      heading: 'Third-party businesses',
      paragraphs: [
        'Business listings, profiles, menus, prices, events, and offers are provided by independent businesses. iLokal does not verify, endorse, or guarantee the accuracy, availability, quality, safety, or legality of any listing or offer. Your dealings with any business are solely between you and that business.',
      ],
    },
    {
      heading: 'Location services',
      paragraphs: [
        'iLokal can use your device location to show nearby businesses and directions. Location is optional and controlled by your device permissions — you can decline it or revoke it anytime in your device settings.',
      ],
    },
    {
      heading: 'Notifications',
      paragraphs: [
        'By creating an account, you agree to receive service and transactional messages — for example, email confirmation, password resets, and in-app notifications from businesses you follow. You can manage notification preferences in the app and your device settings.',
      ],
    },
    {
      heading: 'Intellectual property',
      paragraphs: [
        'The iLokal app, its software, design, and branding belong to iLokal or its licensors and are protected by intellectual-property laws. We grant you a limited, personal, non-exclusive, non-transferable license to use the app for its intended purpose. No other rights are granted.',
      ],
    },
    {
      heading: 'Termination',
      paragraphs: [
        'You can stop using iLokal at any time. To pause your account, use Profile → Account Settings → Deactivate Account — this is reversible, and you can reactivate it by signing back in. To delete your account and have your data removed, use Delete Account.',
        'We may suspend or terminate your access if you violate these Terms or for legal, security, or operational reasons.',
      ],
    },
    {
      heading: 'Disclaimers',
      paragraphs: [
        'The app is provided “as is” and “as available”, without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the app will be uninterrupted, error-free, or secure, or that any listing, price, or offer is accurate or available.',
      ],
    },
    {
      heading: 'Limitation of liability',
      paragraphs: [
        'To the maximum extent permitted by law, iLokal will not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, or goodwill, arising from your use of (or inability to use) the app or any dealings with a business. Our total liability for any claim will not exceed the amount you paid us, if any, in the 12 months before the claim.',
      ],
    },
    {
      heading: 'Governing law',
      paragraphs: [
        'These Terms are governed by the laws of the Republic of the Philippines. You agree to the exclusive jurisdiction of the courts of Iloilo City for any dispute, subject to any mandatory consumer-protection rights you have where you live.',
      ],
    },
    {
      heading: 'Changes to these Terms',
      paragraphs: [
        'We may update these Terms. When we do, we will post the updated version with a new “Last updated” date and, for material changes, provide additional notice. Continued use after the changes take effect means you accept the updated Terms.',
      ],
    },
    {
      heading: 'Contact',
      paragraphs: [
        'Questions about these Terms? Email us at support@ilokal.shop.',
      ],
    },
  ],
};

export const PRIVACY_DOC: LegalDoc = {
  id: 'privacy',
  title: 'Privacy Policy',
  intro:
    'This Privacy Policy explains what information iLokal collects when you use the app, how we use and share it, and the choices you have. We wrote it to be easy to read — if anything is unclear, contact us at support@ilokal.shop.',
  sections: [
    {
      heading: 'Who we are',
      paragraphs: [
        'iLokal is a local-business discovery app that helps you find nearby shops, follow them, discover events, and claim deals to redeem in store. We are the data controller for the app, and we process personal information in line with the Philippine Data Privacy Act of 2012 (RA 10173).',
      ],
    },
    {
      heading: 'Information you provide',
      bullets: [
        'Email address — required to create an account.',
        'Full name — shown on your profile.',
        'Phone number and profile photo — optional, added by you.',
        'Password — stored and managed by our authentication provider; we never store it in plaintext.',
        'Ratings and reviews — anything you write about a business.',
      ],
      paragraphs: [
        'If you sign in with Google, we receive the basic profile information (name, email, avatar) you authorize Google to share.',
      ],
    },
    {
      heading: 'Information we collect automatically',
      bullets: [
        'Approximate location — to show nearby businesses and directions (see Location below).',
        'Your activity — businesses you follow, offers you claim and redeem, events you view, and pages you visit.',
        'View counts — businesses and products you view, deduplicated to one view per item per day and used only as aggregate trending numbers.',
        'Device and technical data — device type, operating system, and app version, to operate and secure the app.',
      ],
    },
    {
      heading: 'Permissions the app asks for',
      bullets: [
        'Location — for nearby discovery and directions. Optional and revocable.',
        'Photos / storage — only when you choose to upload a profile photo.',
      ],
    },
    {
      heading: 'How we use your information',
      bullets: [
        'To provide the app — discovery, follows, events, offers, updates, and notifications.',
        'To manage your account and keep you signed in.',
        'To validate and honor offers you claim (redemption codes).',
        'To produce aggregate numbers like view and trending counts.',
        'To send service messages — email confirmations, password resets, and notifications from businesses you follow.',
        'To keep the app secure and prevent fraud and abuse.',
        'To comply with legal obligations.',
      ],
    },
    {
      heading: 'How we share information',
      paragraphs: [
        'We never sell your personal information. We share it only as needed:',
      ],
      bullets: [
        'With businesses you interact with — when you redeem an offer, the business processes what’s needed to honor it.',
        'With service providers who host and run the app for us — such as our authentication, database, hosting, email, and map providers.',
        'Where required by law, to enforce our Terms, or to protect rights, safety, and property.',
        'In a merger, acquisition, or asset sale, subject to this policy.',
      ],
    },
    {
      heading: 'Location data',
      paragraphs: [
        'We request location only to show nearby businesses and directions, and we use it while you use the app (“when in use”). Location is optional — you can decline it or use the app with a default area instead, and you can revoke access anytime in your device settings. We don’t build a persistent history of where you’ve been.',
      ],
    },
    {
      heading: 'Events you bookmark',
      paragraphs: [
        'Events you save with the heart button are stored only on your device — they aren’t uploaded to our servers. They stay with you even after you sign out.',
      ],
    },
    {
      heading: 'Retention and security',
      paragraphs: [
        'We keep personal information for as long as your account is active or as long as needed to provide the service, then delete or anonymize it — except where longer retention is required by law. We use encryption in transit, secure token storage on your device, and access controls at our providers. No system is 100% secure, so we can’t guarantee absolute security.',
      ],
    },
    {
      heading: 'Your rights',
      paragraphs: [
        'Depending on where you live, you may have the right to:',
        'To exercise any of these rights, email support@ilokal.shop. We’ll respond within the period required by law.',
      ],
      bullets: [
        'Access the personal information we hold about you;',
        'Correct inaccurate data — you can edit your name, phone, avatar, and email in the app;',
        'Delete your account and the data tied to it;',
        'Object to or restrict certain processing, and withdraw consent (for example, location);',
        'Receive your data in a portable form; and',
        'Lodge a complaint with a supervisory authority — in the Philippines, the National Privacy Commission (NPC).',
      ],
    },
    {
      heading: 'Deactivating your account',
      paragraphs: [
        'You can deactivate your account in Profile → Account Settings → Deactivate Account. Deactivating is reversible: it signs you out and pauses your account, and your data is kept while it is deactivated. You can reactivate a deactivated account by signing back in.',
        'Deactivation does not delete anything. To permanently remove your account and data, use Delete Account instead — see Deleting your account below.',
      ],
    },
    {
      heading: 'Deleting your account',
      paragraphs: [
        'You can delete your account in Profile → Account Settings → Delete Account.',
        'Deleting archives your account straight away: you’re signed out on every device and your profile stops being visible to anyone. We keep the archived record for 90 days before removing your personal details, so a deletion made by mistake is not immediately irreversible.',
        'After 90 days we purge the personal fields — your email address, name, phone number and profile photo. Records of things you did, such as offers you redeemed, may be kept for the businesses’ own records and for legal and fraud-prevention reasons, in a form that no longer identifies you.',
      ],
    },
    {
      heading: 'Children’s privacy',
      paragraphs: [
        'iLokal is not directed to children under 18. We do not knowingly collect personal information from children under 18. If you believe a child has provided us data, contact us and we will delete it.',
      ],
    },
    {
      heading: 'International users',
      paragraphs: [
        'Our providers may process and store data in countries other than yours. Where required, we use appropriate safeguards for such transfers.',
      ],
    },
    {
      heading: 'Changes to this policy',
      paragraphs: [
        'We may update this policy. When we do, we’ll post the new version in the app with a revised “Last updated” date and, for material changes, provide additional notice.',
      ],
    },
    {
      heading: 'Contact',
      paragraphs: [
        'Questions or requests? Email support@ilokal.shop — we’re happy to help.',
      ],
    },
  ],
};
