import type { Metadata } from 'next';
import Link from 'next/link';

import { ROUTES } from '@/config/routeConfig';
import {
  ACCOUNT_PURGE_AFTER_DAYS,
  PRIVACY_CONTACT_EMAIL,
} from '@/lib/legal/content';

/**
 * The hosted account-deletion page — the "Data deletion" URL Google Play asks
 * for alongside the privacy policy.
 *
 * Play's requirement is specific and it is why this page is written the way it
 * is: a user must be able to REQUEST deletion without installing the app, and
 * the page must say what is deleted, what is kept, and for how long. So the
 * email route is given equal weight to the in-app route, and the retention
 * window is stated as a number rather than as "a period of time".
 *
 * Deliberately no sign-in and no form. A form here would be a new
 * unauthenticated, side-effecting endpoint that mutates accounts by email
 * address — an account-enumeration oracle at best and a griefing tool at
 * worst — for a flow that is inherently manual anyway (identity has to be
 * confirmed before an account is archived on someone's say-so).
 */
export const metadata: Metadata = {
  title: 'Delete your account',
  description:
    'How to delete your iLokal account and what happens to your data — in the app, or by request without installing it.',
  alternates: { canonical: ROUTES.LEGAL.DELETE_ACCOUNT },
  robots: { index: true, follow: true },
};

const mailtoHref = [
  `mailto:${PRIVACY_CONTACT_EMAIL}`,
  '?subject=',
  encodeURIComponent('Account deletion request'),
  '&body=',
  encodeURIComponent(
    [
      'Please delete my iLokal account.',
      '',
      'Email address on the account:',
      '',
      '(Send this from the address registered to the account if you can — it',
      'is the quickest way for us to confirm the request is really yours.)',
    ].join('\n'),
  ),
].join('');

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span
        aria-hidden
        className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums"
      >
        {n}
      </span>
      <div className="space-y-1">
        <h3 className="font-medium">{title}</h3>
        <div className="text-muted-foreground text-sm leading-relaxed">
          {children}
        </div>
      </div>
    </li>
  );
}

export default function DeleteAccountPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Delete your iLokal account
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          You can delete your iLokal account from inside the app, or ask us to
          delete it for you — you do not need the app installed to make the
          request.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Option 1 — in the app
        </h2>
        <ol className="space-y-4">
          <Step n={1} title="Open your profile">
            Tap <strong>Profile</strong> in the bottom navigation.
          </Step>
          <Step n={2} title="Open account settings">
            Tap <strong>Account Settings</strong>.
          </Step>
          <Step n={3} title="Delete the account">
            Tap <strong>Delete Account</strong> and confirm. You are signed out
            straight away.
          </Step>
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Option 2 — ask us by email
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Email{' '}
          <a
            href={mailtoHref}
            className="text-primary font-medium underline underline-offset-4"
          >
            {PRIVACY_CONTACT_EMAIL}
          </a>{' '}
          from the address registered to the account and ask us to delete it.
          Sending from the registered address is the quickest way for us to
          confirm the request is genuinely yours; if you cannot, we will ask you
          for something else that proves it before we touch the account.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          What happens to your data
        </h2>

        <div className="space-y-4">
          <div className="rounded-lg border p-5">
            <h3 className="font-medium">Straight away</h3>
            <ul className="text-muted-foreground mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
              <li>Your account is archived and you are signed out.</li>
              <li>Your profile stops being visible to anyone.</li>
              <li>You can no longer sign in with it.</li>
            </ul>
          </div>

          <div className="rounded-lg border p-5">
            <h3 className="font-medium">
              For the next {ACCOUNT_PURGE_AFTER_DAYS} days
            </h3>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              We keep the archived record so the account can be restored if you
              delete it by mistake or change your mind. Email{' '}
              <a
                href={mailtoHref}
                className="text-primary font-medium underline underline-offset-4"
              >
                {PRIVACY_CONTACT_EMAIL}
              </a>{' '}
              within that window and we will bring it back.
            </p>
          </div>

          <div className="rounded-lg border p-5">
            <h3 className="font-medium">
              After {ACCOUNT_PURGE_AFTER_DAYS} days
            </h3>
            <ul className="text-muted-foreground mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
              <li>
                <strong className="text-foreground">Purged</strong> — your email
                address, name, phone number and profile photo.
              </li>
              <li>
                <strong className="text-foreground">Kept</strong> — records of
                things you did, such as offers you redeemed, for the businesses’
                own records and for legal and fraud-prevention reasons. These
                are kept in a form that no longer identifies you.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <footer className="border-t pt-6">
        <p className="text-muted-foreground text-sm leading-relaxed">
          Full detail on what we collect and why is in our{' '}
          <Link
            href={ROUTES.LEGAL.PRIVACY}
            className="text-primary font-medium underline underline-offset-4"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </footer>
    </div>
  );
}
