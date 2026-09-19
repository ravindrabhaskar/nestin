import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, ShieldCheck, RotateCcw } from 'lucide-react';
import { SEO } from '../components/SEO';

/**
 * Legal pages. Operator details below are placeholders — replace them with the registered entity,
 * address and grievance officer before launch, and have the documents reviewed by counsel.
 */
export const LEGAL_ENTITY = {
  name: 'NestIn',
  legalName: '[Legal entity name], a company registered in India',
  address: '[Registered office address]',
  supportEmail: 'support@nestin.local',
  grievanceOfficer: { name: '[Grievance Officer name]', email: 'grievance@nestin.local' },
  effectiveDate: '17 September 2026',
};

interface Section {
  heading: string;
  body: React.ReactNode;
}

const LegalLayout: React.FC<{
  title: string;
  intro: string;
  icon: React.ReactNode;
  sections: Section[];
  description: string;
}> = ({ title, intro, icon, sections, description }) => {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="bg-[#FAF9F5] min-h-screen">
      <SEO title={`${title} — NestIn`} description={description} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-[#a3e635] flex items-center justify-center">
            {icon}
          </div>
          <span className="text-[11px] font-extrabold tracking-widest text-slate-500 uppercase font-heading">
            Legal
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black font-heading text-slate-900 tracking-tight">{title}</h1>
        <p className="text-xs text-slate-500 mt-2">Effective {LEGAL_ENTITY.effectiveDate}</p>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed mt-6">{intro}</p>

        <nav aria-label="Legal documents" className="mt-6 flex flex-wrap gap-2 text-xs font-bold">
          {[
            ['/terms', 'Terms of Service'],
            ['/privacy', 'Privacy Policy'],
            ['/refund-policy', 'Refund & Cancellation'],
          ].map(([href, label]) => (
            <Link
              key={href}
              to={href}
              className={`px-3 py-1.5 rounded-full border ${location.pathname === href ? 'bg-slate-900 text-[#a3e635] border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'}`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-10 space-y-8">
          {sections.map((s, i) => (
            <section key={s.heading} id={`s${i + 1}`}>
              <h2 className="text-lg font-black font-heading text-slate-900">
                {i + 1}. {s.heading}
              </h2>
              <div className="prose-sm text-sm text-slate-700 leading-relaxed mt-2 space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1">
                {s.body}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 p-5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-600">
          Questions about this document:{' '}
          <a className="font-bold underline" href={`mailto:${LEGAL_ENTITY.supportEmail}`}>
            {LEGAL_ENTITY.supportEmail}
          </a>
          . Grievance Officer (Information Technology Rules, 2021 and DPDP Act, 2023):{' '}
          {LEGAL_ENTITY.grievanceOfficer.name},{' '}
          <a className="font-bold underline" href={`mailto:${LEGAL_ENTITY.grievanceOfficer.email}`}>
            {LEGAL_ENTITY.grievanceOfficer.email}
          </a>
          .
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------

export const TermsPage: React.FC = () => (
  <LegalLayout
    title="Terms of Service"
    icon={<FileText className="w-5 h-5" />}
    description="The terms on which residents, owners and staff use the NestIn platform."
    intro={`These Terms govern your use of the NestIn website, app and APIs ("Platform") operated by ${LEGAL_ENTITY.legalName} ("NestIn", "we"). By creating an account or using the Platform you agree to them. NestIn is a technology marketplace: we list accommodation offered by independent property owners and provide software to manage it; we are not the landlord and are not a party to the tenancy between you and an owner.`}
    sections={[
      {
        heading: 'Accounts',
        body: (
          <ul>
            <li>
              You must be at least 18 and provide accurate details. One person, one account; staff accounts are created
              by an owner and belong to that owner's workspace.
            </li>
            <li>
              You are responsible for activity under your login. Tell us immediately at {LEGAL_ENTITY.supportEmail} if
              you suspect misuse; you can sign out of every device from Settings → Security.
            </li>
            <li>
              We may suspend accounts that breach these Terms, post fraudulent listings, harass other users or attempt
              to bypass Platform payments.
            </li>
          </ul>
        ),
      },
      {
        heading: 'Listings and the "NestIn Verified" badge',
        body: (
          <ul>
            <li>
              Owners are responsible for the accuracy of their listings, photos, pricing and house rules, and for
              holding the licences their state or municipality requires.
            </li>
            <li>
              A listing shows the NestIn Verified badge only after NestIn staff have completed a documented checklist
              including a physical site visit, document review and caretaker identity check. The badge reflects what we
              saw on the visit date; it is not a guarantee of future condition and it expires unless the property is
              re-verified.
            </li>
            <li>We may remove a listing or badge at any time for safety, fraud or complaint reasons.</li>
          </ul>
        ),
      },
      {
        heading: 'Bookings, visits and payments',
        body: (
          <ul>
            <li>
              A booking request becomes a reservation only when the owner approves it. Bed allocation, move-in, rent and
              deposit terms are set by the owner and shown on the listing.
            </li>
            <li>
              Online payments are processed by Razorpay; NestIn never stores card details. Receipts are available from
              Payments. Where a platform fee applies to online rent collection it is disclosed to the owner in advance.
            </li>
            <li>
              Refunds of booking fees, deposits and rent follow the owner's stated cancellation policy and our{' '}
              <Link to="/refund-policy" className="underline font-bold">
                Refund & Cancellation Policy
              </Link>
              .
            </li>
          </ul>
        ),
      },
      {
        heading: 'Owner subscriptions',
        body: (
          <ul>
            <li>
              Owner plans (Starter, Professional, Business) are described on the pricing page; limits are enforced by
              the Platform. Paid plans renew automatically until cancelled from Owner Hub → Subscription; cancellation
              takes effect at the end of the current period.
            </li>
            <li>
              Prices exclude GST, which is added on the invoice. Prices may change with 30 days' notice; changes apply
              from your next renewal.
            </li>
          </ul>
        ),
      },
      {
        heading: 'Acceptable use',
        body: (
          <ul>
            <li>
              No scraping, reverse engineering, automated account creation, or interference with the Platform or its
              security.
            </li>
            <li>
              No discriminatory listings or conduct. Gender-specific PGs are permitted where lawful; refusing residents
              on grounds of religion, caste, region or disability is not.
            </li>
            <li>Reviews must be by genuine current or former residents and must not be defamatory.</li>
          </ul>
        ),
      },
      {
        heading: 'Content and intellectual property',
        body: (
          <p>
            You keep ownership of photos and text you upload and grant NestIn a worldwide, royalty-free licence to
            display and promote them on the Platform and in marketing for as long as the listing is live. The Platform,
            its software and branding belong to NestIn.
          </p>
        ),
      },
      {
        heading: 'Disclaimers and liability',
        body: (
          <ul>
            <li>
              The Platform is provided "as is". We do not guarantee availability, that a property will be as described
              on arrival, or the conduct of any owner, resident or staff member.
            </li>
            <li>
              To the extent permitted by law, NestIn's total liability for any claim arising from the Platform is
              limited to the greater of ₹10,000 or the fees you paid NestIn in the 12 months before the claim. We are
              not liable for indirect or consequential loss.
            </li>
            <li>
              Nothing limits liability for fraud, death or personal injury caused by our negligence, or any liability
              that cannot be excluded under Indian law.
            </li>
          </ul>
        ),
      },
      {
        heading: 'Termination',
        body: (
          <p>
            You may delete your account from Settings → Security at any time. We retain records we are legally required
            to keep (for example, payment and tax records for 8 years) and delete or anonymise the rest as described in
            the Privacy Policy.
          </p>
        ),
      },
      {
        heading: 'Governing law and disputes',
        body: (
          <p>
            These Terms are governed by the laws of India. Courts at {LEGAL_ENTITY.address || '[city]'} have exclusive
            jurisdiction, subject to your rights under the Consumer Protection Act, 2019. We encourage you to contact
            our Grievance Officer first; we aim to acknowledge complaints within 48 hours and resolve them within 30
            days.
          </p>
        ),
      },
      {
        heading: 'Changes',
        body: (
          <p>
            We may update these Terms. Material changes are notified in-app or by email at least 15 days before they
            take effect. Continued use after that date is acceptance.
          </p>
        ),
      },
    ]}
  />
);

// ---------------------------------------------------------------------------------------------

export const PrivacyPage: React.FC = () => (
  <LegalLayout
    title="Privacy Policy"
    icon={<ShieldCheck className="w-5 h-5" />}
    description="How NestIn collects, uses, shares and protects personal data under the Digital Personal Data Protection Act, 2023."
    intro={`This Policy explains how ${LEGAL_ENTITY.legalName} ("NestIn") handles personal data as a Data Fiduciary under India's Digital Personal Data Protection Act, 2023 ("DPDP Act") and the Information Technology Act, 2000. It applies to residents, property owners, their staff and visitors to the Platform.`}
    sections={[
      {
        heading: 'Data we collect',
        body: (
          <ul>
            <li>
              <strong>Account data:</strong> name, email, phone, city, password (stored only as a salted scrypt hash) or
              Google sign-in identifier.
            </li>
            <li>
              <strong>Profile & preferences:</strong> occupation, college/company, living and search preferences,
              notification and privacy settings.
            </li>
            <li>
              <strong>Booking & payment data:</strong> bookings, visits, rent and deposit records, invoices, Razorpay
              order and payment IDs. We never receive full card numbers.
            </li>
            <li>
              <strong>KYC documents:</strong> government ID, address proof and agreements you choose to upload for a
              booking; owner ownership proofs and licences for verification. These are stored encrypted at rest in
              private storage and served only through authenticated, time-limited links.
            </li>
            <li>
              <strong>Listing data (owners):</strong> property details, photos, caretaker details, staff names and
              roles.
            </li>
            <li>
              <strong>Technical data:</strong> IP address, device/browser, session identifiers, correlation IDs and
              request logs kept for security and debugging.
            </li>
            <li>
              <strong>Communications:</strong> support tickets, contact-form messages and notification delivery records
              (email / WhatsApp / push).
            </li>
          </ul>
        ),
      },
      {
        heading: 'Why we process it (purposes and lawful basis)',
        body: (
          <ul>
            <li>
              To provide the service you asked for — search, booking, payments, owner CRM — on the basis of your consent
              given at sign-up and for the performance of that service.
            </li>
            <li>
              To verify listings and caretakers and to prevent fraud and abuse (legitimate use under section 7 of the
              DPDP Act, and our legal obligations).
            </li>
            <li>
              To send transactional messages (booking, payment, visit and rent reminders). Marketing messages are sent
              only with your opt-in and can be switched off in Settings → Notifications.
            </li>
            <li>To comply with law, including tax, accounting and lawful requests from authorities.</li>
          </ul>
        ),
      },
      {
        heading: 'Sharing',
        body: (
          <ul>
            <li>
              <strong>Between residents and owners:</strong> when you book or schedule a visit, the owner (and their
              authorised staff) sees your name, phone, email and the documents you attach to that booking. Owners see
              only residents of their own properties.
            </li>
            <li>
              <strong>Processors:</strong> Razorpay (payments), Google (sign-in verification), email provider (Resend or
              SendGrid), Twilio (WhatsApp), cloud storage (S3-compatible) and hosting. Each acts on our instructions
              under contract.
            </li>
            <li>
              <strong>Public:</strong> only listing content owners choose to publish. Resident names never appear
              publicly; reviews show the name you enter.
            </li>
            <li>We do not sell personal data.</li>
          </ul>
        ),
      },
      {
        heading: 'Your rights',
        body: (
          <ul>
            <li>
              <strong>Access & correction:</strong> view and edit your profile in Settings; request a copy of your data
              from {LEGAL_ENTITY.supportEmail}.
            </li>
            <li>
              <strong>Erasure:</strong> delete your account from Settings → Security. Financial records are retained as
              the law requires (see Retention) and then deleted.
            </li>
            <li>
              <strong>Withdraw consent:</strong> change notification channels in Settings; withdrawing consent for
              essential processing means we can no longer provide the service.
            </li>
            <li>
              <strong>Grievance redressal:</strong> write to our Grievance Officer at{' '}
              {LEGAL_ENTITY.grievanceOfficer.email}. If unresolved, you may approach the Data Protection Board of India.
            </li>
            <li>
              <strong>Nominate:</strong> you may nominate a person to exercise these rights in the event of death or
              incapacity.
            </li>
          </ul>
        ),
      },
      {
        heading: 'Retention',
        body: (
          <ul>
            <li>Account and profile data: for the life of the account and 30 days after deletion (backup cycle).</li>
            <li>Bookings, payments and invoices: 8 years from the transaction, for tax and audit obligations.</li>
            <li>
              KYC documents: deleted 90 days after the related booking ends or on account deletion, whichever is
              earlier, unless a dispute is open.
            </li>
            <li>Security and request logs: 90 days.</li>
          </ul>
        ),
      },
      {
        heading: 'Security',
        body: (
          <p>
            HTTPS everywhere, scrypt password hashing, signed session tokens that can be revoked per device, role-based
            access with audit trails, rate limiting, private document storage with expiring links, encrypted nightly
            backups and least-privilege access for staff. No system is perfectly secure; we will notify you and the Data
            Protection Board of a personal data breach as the DPDP Act requires.
          </p>
        ),
      },
      {
        heading: 'Cookies and local storage',
        body: (
          <p>
            We use strictly necessary storage only: your session token, remembered preferences and the install-prompt
            state. We do not use third-party advertising cookies. Razorpay and Google may set their own cookies during
            checkout or sign-in under their policies.
          </p>
        ),
      },
      {
        heading: 'Children',
        body: (
          <p>
            The Platform is for users aged 18 and over. We do not knowingly process children's data; contact us to have
            any such data removed.
          </p>
        ),
      },
      {
        heading: 'International transfers',
        body: (
          <p>
            Data is stored in India unless a processor listed above hosts it elsewhere; in that case we ensure
            contractual safeguards consistent with the DPDP Act and any restrictions notified by the Central Government.
          </p>
        ),
      },
      {
        heading: 'Changes',
        body: <p>We will notify material changes in-app or by email before they take effect.</p>,
      },
    ]}
  />
);

// ---------------------------------------------------------------------------------------------

export const RefundPolicyPage: React.FC = () => (
  <LegalLayout
    title="Refund & Cancellation Policy"
    icon={<RotateCcw className="w-5 h-5" />}
    description="How cancellations and refunds work for bookings, rent, deposits and owner subscriptions on NestIn."
    intro="Because NestIn connects you with independent owners, two sets of rules apply: the owner's policy for the stay itself, and NestIn's policy for platform charges. Both are shown before you pay."
    sections={[
      {
        heading: 'Booking requests (before owner approval)',
        body: (
          <p>
            You can cancel a pending request at any time from My Bookings at no cost. Any token amount collected online
            is refunded in full to the original payment method within 5–7 working days.
          </p>
        ),
      },
      {
        heading: 'Confirmed bookings and move-in',
        body: (
          <ul>
            <li>
              Each listing states its cancellation policy and notice period. Booking fees and rent paid for an approved
              booking are refunded according to that policy; the owner records the outcome and the receipt in your
              Payments page shows the refunded amount.
            </li>
            <li>
              If a property is materially not as described at move-in (safety, occupancy, or amenities that were marked
              Verified), report it within 48 hours through Support with photos. Where our verification record supports
              your claim, NestIn will secure a refund of platform-collected amounts and may remove the listing.
            </li>
            <li>
              Security deposits are held and returned by the owner under the tenancy terms; NestIn tracks the record but
              does not hold the deposit unless stated on the listing.
            </li>
          </ul>
        ),
      },
      {
        heading: 'Rent paid online',
        body: (
          <p>
            Rent paid for a period already occupied is not refundable. Duplicate or mistaken payments are reversed on
            request within 7 working days — payments carry an idempotency check so the same rent cannot be charged
            twice.
          </p>
        ),
      },
      {
        heading: 'Owner subscriptions',
        body: (
          <ul>
            <li>
              The Starter plan is free. Paid plans can be cancelled at any time from Owner Hub → Subscription; the plan
              remains active until the end of the paid period and is not renewed.
            </li>
            <li>
              First annual purchase: full refund if requested within 7 days and fewer than 2 properties were published
              during that time. Otherwise fees are non-refundable for the current period.
            </li>
            <li>If NestIn discontinues a paid feature or the service, unused time is refunded pro rata.</li>
          </ul>
        ),
      },
      {
        heading: 'How refunds are paid',
        body: (
          <p>
            Refunds go to the original payment method through Razorpay and typically appear in 5–7 working days
            depending on your bank. Cash payments recorded by an owner are refunded by that owner.
          </p>
        ),
      },
      {
        heading: 'Disputes',
        body: (
          <p>
            Raise a ticket from Support with the booking or invoice number. We respond within 48 hours. Unresolved
            disputes may be escalated to our Grievance Officer and, thereafter, under the Consumer Protection Act, 2019.
          </p>
        ),
      },
    ]}
  />
);
