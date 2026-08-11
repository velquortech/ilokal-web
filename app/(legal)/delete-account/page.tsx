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
 * Play asks for two things here: that a user can REQUEST deletion without
 * installing the app, and that the page says what is deleted, what is kept,
 * and for how long. This page fully satisfies the second — the window is a
 * number, not "a period of time" — and currently CANNOT satisfy the first.
 *
 * ⚠️ There is no off-app channel, and it is not an oversight. `ilokal.app`
 * does not resolve (NXDOMAIN) and `ilokal.shop` publishes no MX record, so no
 * address can receive mail; a dead `mailto:` would look like a working route
 * and swallow the request. Every email block is gated on
 * `PRIVACY_CONTACT_EMAIL`, so adding one working mailbox restores them all.
 * Acceptable exposure for closed testing; resolve before production.
 *
 * Deliberately no sign-in and no form either. A form would be a new
 * unauthenticated, side-effecting endpoint that mutates accounts by email
 * address — an account-enumeration oracle at best and a griefing tool at
 * worst — for a flow that is manual anyway (identity has to be confirmed
 * before an account is archived on someone's say-so).
 */
export const metadata: Metadata = {
  title: 'Delete your account',
  description:
    'How to delete your iLokal account, and what happens to your data afterwards.',
  alternates: { canonical: ROUTES.LEGAL.DELETE_ACCOUNT },
  robots: { index: true, follow: true },
};

/**
 * The email route renders only when there is a mailbox to render.
 *
 * `PRIVACY_CONTACT_EMAIL` is null: `ilokal.app` does not resolve at all and
 * `ilokal.shop` publishes no MX record, so no address here can receive mail.
 * A dead `mailto:` on this page is worse than none — it looks like a working
 * request channel and swallows the request. Setting that constant to a working
 * address brings this whole section back with no other edit.
 */
const mailtoHref = PRIVACY_CONTACT_EMAIL
  ? [
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
    ].join('')
  : null;

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
          You can delete your iLokal account at any time from inside the app.
          Here is how, and what happens to your data afterwards.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          How to delete it
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

      {mailtoHref && PRIVACY_CONTACT_EMAIL && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Or ask us by email
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
            confirm the request is genuinely yours; if you cannot, we will ask
            you for something else that proves it before we touch the account.
          </p>
        </section>
      )}

      {/* The reversible option, offered before the data section so a hesitant
          reader meets it while still deciding. Same pairing Facebook uses, and
          the reason both controls exist rather than one destructive one.
          Deliberately no claim that the profile becomes invisible while
          deactivated — mobile routes gate on JWT validity, not status. */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Not sure? Deactivate instead
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          If you want a break rather than a deletion, use{' '}
          <strong>Profile → Account Settings → Deactivate Account</strong>.
          Deactivating signs you out and pauses your account, and your data is
          kept — you can reactivate by signing back in. It deletes nothing.
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
              {/* No "you can no longer sign in" claim: true on the web, where
                  the login gate blocks an archived profile, but NOT on mobile,
                  where the app checks `archived_at` nowhere and an archived
                  user can re-authenticate. Verified end-to-end. */}
              <li>Your account is archived and marked for deletion.</li>
              <li>You are signed out on every device.</li>
              <li>Your profile stops being visible to anyone.</li>
            </ul>
          </div>

          <div className="rounded-lg border p-5">
            <h3 className="font-medium">
              For the next {ACCOUNT_PURGE_AFTER_DAYS} days
            </h3>
            {/* Says what is RETAINED, not that the user can request it back.
                Restoring an archived account needs a support channel, and
                there is none while `PRIVACY_CONTACT_EMAIL` is null — promising
                a route that does not exist is the failure this page is
                supposed to avoid. The offer returns with the address. */}
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              We keep the archived record for this period before removing your
              personal details, so a deletion made by mistake is not immediately
              irreversible.
              {mailtoHref && PRIVACY_CONTACT_EMAIL && (
                <>
                  {' '}
                  Email{' '}
                  <a
                    href={mailtoHref}
                    className="text-primary font-medium underline underline-offset-4"
                  >
                    {PRIVACY_CONTACT_EMAIL}
                  </a>{' '}
                  within that window and we will bring it back.
                </>
              )}
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
