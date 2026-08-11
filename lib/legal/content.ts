/**
 * Hosted legal content — the PUBLIC, canonical copy.
 *
 * WHY THIS FILE EXISTS
 * Google Play will not pass the App content step (closed testing included)
 * without a privacy policy at a public URL, and the policy had no URL: the
 * wording lived only inside the mobile app's in-app reader and, on the web,
 * inside a registration dialog behind auth. This is the hosted version.
 *
 * SOURCE OF TRUTH AND HOW TO SYNC
 * The wording is mirrored from the mobile repo, deliberately in the SAME shape
 * (`LegalSection[]`) so keeping them together is a structural diff rather than
 * a proofread of re-typed prose:
 *
 *   ilokal-mobile/constants/legal.ts        (in-app reader)
 *   ilokal-mobile/legal/PRIVACY_POLICY.md   (counsel-facing copy)
 *
 * When the app's data collection, permissions, third-party services or
 * retention rules change, update all three.
 *
 * ⚠️ ONE SECTION DELIBERATELY DIVERGES — "Deleting your account".
 * The mobile copy says deletion "permanently removes your account and the
 * profile data tied to it". That is NOT what happens and, as written, could
 * not happen: deletion is an ARCHIVE, and a hard delete would in fact fail for
 * any user who owns a shop, follows a business, or has ever redeemed an offer
 * (`businesses.owner_id`, `follows.user_id` and `user_redemptions.user_id` are
 * all ON DELETE NO ACTION — 21 of 58 live profiles would have raised a foreign
 * key violation). A policy has to describe what the system does, so the hosted
 * section describes the archive and the 90-day purge. The in-app wording is
 * corrected at the mobile source; until a new build ships, the shipped app
 * still shows the old sentence.
 */

export type LegalSection = {
  heading: string;
  /** Body paragraphs, each rendered as its own block. */
  paragraphs?: string[];
  /** Bullet items, each rendered on its own line. */
  bullets?: string[];
};

export type LegalDoc = {
  id: 'privacy';
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
};

/** Where deletion and data-rights requests go. Also used by /delete-account. */
export const PRIVACY_CONTACT_EMAIL = 'privacy@ilokal.app';

/**
 * Days an archived account is kept before its personal fields are purged.
 *
 * Stated on both /privacy and /delete-account, so it is one constant — a
 * retention period quoted as two different numbers on two pages is the kind of
 * discrepancy a Play reviewer reads as a misdeclared Data Safety form.
 */
export const ACCOUNT_PURGE_AFTER_DAYS = 90;

export const PRIVACY_POLICY: LegalDoc = {
  id: 'privacy',
  title: 'Privacy Policy',
  // Newer than the app's own "August 8, 2026" on purpose: the deletion section
  // below was corrected after that date.
  lastUpdated: 'August 11, 2026',
  intro:
    'This Privacy Policy explains what information iLokal collects when you use the app, how we use and share it, and the choices you have. We wrote it to be easy to read — if anything is unclear, contact us at privacy@ilokal.app.',
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
        'With businesses you interact with — when you redeem an offer, the business processes what is needed to honor it.',
        'With service providers who host and run the app for us — such as our authentication, database, hosting, email, and map providers.',
        'Where required by law, to enforce our Terms, or to protect rights, safety, and property.',
        'In a merger, acquisition, or asset sale, subject to this policy.',
      ],
    },
    {
      heading: 'Location data',
      paragraphs: [
        'We request location only to show nearby businesses and directions, and we use it while you use the app ("when in use"). Location is optional — you can decline it or use the app with a default area instead, and you can revoke access anytime in your device settings. We don’t build a persistent history of where you’ve been.',
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
        'We keep personal information for as long as your account is active or as long as needed to provide the service. When you delete your account we archive it immediately and then purge the personal fields after the recovery window described below, except where longer retention is required by law.',
        'We use encryption in transit, secure token storage on your device, and access controls at our providers. No system is 100% secure, so we can’t guarantee absolute security.',
      ],
    },
    {
      heading: 'Your rights',
      paragraphs: ['Depending on where you live, you may have the right to:'],
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
      // ⚠️ The one section that intentionally differs from the in-app copy.
      // See the file header for why. Describe the archive, not a deletion that
      // does not happen.
      heading: 'Deleting your account',
      paragraphs: [
        'You can delete your account in the app under Profile → Account Settings → Delete Account, or by emailing privacy@ilokal.app from your registered address. You do not need the app installed to ask us — see the account deletion page on our website.',
        'Deleting archives your account straight away: you are signed out, your profile stops being visible to anyone, and you can no longer sign in with it. We keep the archived record for 90 days so the account can be restored if you delete it by mistake or change your mind — write to privacy@ilokal.app within that window and we will bring it back.',
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
        'We may update this policy. When we do, we’ll post the new version with a revised "Last updated" date and, for material changes, provide additional notice.',
      ],
    },
    {
      heading: 'Contact',
      paragraphs: [
        'Questions or requests? Email privacy@ilokal.app — we’re happy to help.',
      ],
    },
  ],
};
