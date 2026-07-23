'use client';

import { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

function Section({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="font-semibold">{heading}</h3>
      <div className="text-muted-foreground space-y-2 text-sm leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function TermsBody() {
  return (
    <div className="space-y-5">
      <Section heading="1. Acceptance of Terms">
        <p>
          By registering a business on iLokal, you agree to be bound by these
          Terms and Conditions. If you do not agree, do not submit a
          registration.
        </p>
      </Section>
      <Section heading="2. Business Registration">
        <p>
          You confirm that all information, documents, and images you submit
          (including your business license and tax certificate) are accurate,
          current, and belong to a business you are legally authorized to
          represent.
        </p>
        <p>
          Submitting falsified documents or misrepresenting your business may
          result in rejection, suspension, or permanent removal from the
          platform.
        </p>
      </Section>
      <Section heading="3. Verification">
        <p>
          Registrations are subject to review by the iLokal team. Approval is
          not guaranteed, and we may request additional documents before
          verifying your business.
        </p>
      </Section>
      <Section heading="4. Your Content">
        <p>
          You retain ownership of the logos, photos, and descriptions you
          upload, and grant iLokal a non-exclusive license to display them on
          the platform (including the mobile app) to promote your business.
        </p>
        <p>
          You must not upload content that infringes the rights of others or
          that is unlawful, misleading, or offensive.
        </p>
      </Section>
      <Section heading="5. Coupons and Promotions">
        <p>
          You are responsible for honoring coupons and deals you publish,
          including their stated discounts, validity dates, and redemption
          limits. iLokal is not a party to transactions between you and your
          customers.
        </p>
      </Section>
      <Section heading="6. Account Responsibilities">
        <p>
          You are responsible for safeguarding your account credentials and for
          all activity under your account. Notify us immediately of any
          unauthorized use.
        </p>
      </Section>
      <Section heading="7. Suspension and Termination">
        <p>
          We may suspend or remove businesses that violate these terms, receive
          verified abuse reports, or engage in fraudulent activity.
        </p>
      </Section>
      <Section heading="8. Changes to These Terms">
        <p>
          We may update these Terms and Conditions from time to time. Continued
          use of the platform after changes take effect constitutes acceptance
          of the revised terms.
        </p>
      </Section>
      <Section heading="9. Contact">
        <p>
          Questions about these terms? Contact the iLokal team through the
          support channels listed on our website.
        </p>
      </Section>
    </div>
  );
}

function PrivacyBody() {
  return (
    <div className="space-y-5">
      <Section heading="1. Information We Collect">
        <p>
          When you register a business we collect: your account details (name,
          email), business details (shop name, description, category, address,
          and map coordinates), uploaded images (logo, banner, interior photos),
          and verification documents (business license, tax certificate).
        </p>
      </Section>
      <Section heading="2. How We Use Your Information">
        <p>
          Business details and images are displayed publicly on the iLokal
          platform, including the mobile app, so customers can discover your
          shop. Verification documents are used solely to verify your business
          and are never displayed publicly.
        </p>
      </Section>
      <Section heading="3. Location Data">
        <p>
          Your branch coordinates are used to show your business in
          location-based features such as &ldquo;Shops Near Me&rdquo;.
        </p>
      </Section>
      <Section heading="4. Sharing">
        <p>
          We do not sell your personal information. Data is shared only with
          service providers that host and operate the platform, or when required
          by law.
        </p>
      </Section>
      <Section heading="5. Retention and Deletion">
        <p>
          We retain your data while your account is active. You may request
          deactivation or deletion of your account; some records may be kept
          where required for legal or audit purposes.
        </p>
      </Section>
      <Section heading="6. Security">
        <p>
          We use industry-standard safeguards — including encrypted transport
          and access controls — to protect your data. Verification documents are
          stored in private storage accessible only to authorized reviewers.
        </p>
      </Section>
      <Section heading="7. Your Rights">
        <p>
          Under the Philippine Data Privacy Act of 2012 (RA 10173), you have the
          right to access, correct, and request deletion of your personal data.
          Contact us through our support channels to exercise these rights.
        </p>
      </Section>
      <Section heading="8. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. Material changes
          will be communicated through the platform.
        </p>
      </Section>
    </div>
  );
}

const LEGAL_DOCS = {
  terms: {
    title: 'Terms and Conditions',
    description: 'Last updated: July 23, 2026',
    body: <TermsBody />,
  },
  privacy: {
    title: 'Privacy Policy',
    description: 'Last updated: July 23, 2026',
    body: <PrivacyBody />,
  },
} as const;

export function LegalDialog({
  type,
  trigger,
}: {
  type: keyof typeof LEGAL_DOCS;
  trigger: ReactNode;
}) {
  const doc = LEGAL_DOCS[type];

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{doc.title}</DialogTitle>
          <DialogDescription>{doc.description}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">{doc.body}</ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
