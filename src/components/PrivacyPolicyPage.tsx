import React from 'react';
import { ShieldCheck, Lock, Eye, Database, FileCheck, ArrowRight } from 'lucide-react';

export interface PrivacyPolicyPageProps {
  onNavigate: (view: string, param?: string) => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onNavigate }) => {
  return (
    <div className="w-full bg-[#f8f9fa] text-gray-900 font-sans pb-16">
      {/* Breadcrumbs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 text-xs sm:text-sm text-gray-600 flex items-center gap-2">
          <button 
            onClick={() => onNavigate('home')} 
            className="hover:text-[#c45500] hover:underline cursor-pointer"
          >
            Home
          </button>
          <span>/</span>
          <span className="text-gray-900 font-medium">Privacy Policy</span>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#131921] via-[#1f2937] to-[#232f3e] text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-400 text-xs sm:text-sm font-semibold mb-3 border border-white/10">
            <Lock className="w-4 h-4" /> Data Protection &amp; Confidentiality
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white max-w-3xl leading-tight">
            Privacy Policy &amp; Data Security Statement
          </h1>
          <p className="mt-4 text-sm sm:text-base text-gray-300 max-w-2xl leading-relaxed">
            Effective Date: January 1, 2026. Spinel Distribution Ltd is committed to safeguarding corporate commercial data, procurement records, and personal account credentials in compliance with the Nigeria Data Protection Act (NDPA) and applicable global data protection standards.
          </p>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="bg-white p-6 sm:p-12 rounded-xl border border-gray-200 shadow-sm space-y-8 text-sm leading-relaxed text-gray-700">
          
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" /> 1. Overview &amp; Scope
            </h2>
            <p>
              This Privacy Policy describes how Spinel Distribution Ltd (&quot;Spinel&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, maintains, protects, and handles personal and institutional information collected through our website, catalog interfaces, quote builders, ordering portals, and direct customer interactions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-600" /> 2. Information We Collect
            </h2>
            <p className="mb-2">We collect information strictly necessary to provide quotation services, fulfill commercial orders, and maintain technical compliance:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li><strong>Account Credentials:</strong> Full name, professional corporate email address, encrypted passwords, and company affiliation.</li>
              <li><strong>Procurement &amp; Invoicing Details:</strong> Company registration name, corporate address, Tax Identification Number (TIN/VAT), authorized contact person, and billing addresses.</li>
              <li><strong>Logistics &amp; Delivery Information:</strong> Site contact details, project physical addresses, receiving person names, and delivery manifests.</li>
              <li><strong>Technical Communication Records:</strong> Equipment quote requests, bill of materials (BOM), custom enclosure entry configurations, and warranty tickets.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Eye className="w-5 h-5 text-amber-600" /> 3. How We Use Collected Data
            </h2>
            <p className="mb-2">Your information is processed under lawful bases including contract fulfillment and legal compliance:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>Generating official proforma invoices, quotes, and delivery documentation.</li>
              <li>Processing secure payments, wire reconciliation, and currency settlement in USD and NGN.</li>
              <li>Validating manufacturer warranties and registering serial numbers with authorized OEM brands.</li>
              <li>Transmitting order status updates, dispatch tracking, and technical safety advisories.</li>
              <li>Complying with statutory financial reporting, corporate tax audits, and anti-money laundering (AML) laws.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Commercial Confidentiality &amp; Third-Party Disclosure</h2>
            <p className="mb-2">
              <strong>We do not sell, rent, or trade your personal or commercial data.</strong>
            </p>
            <p>
              We only share relevant information with vetted third-party service providers essential for service delivery, such as authorized logistics and freight carriers (for physical delivery), certified payment gateways and banking partners (for wire/card settlement), and OEM manufacturers (solely for warranty registration).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Data Security &amp; Infrastructure Protection</h2>
            <p>
              We employ enterprise-grade technical and organizational safeguards to prevent unauthorized data access, modification, or exposure. All communication between your browser and our platform is encrypted via TLS 1.3/HTTPS. Sensitive account credentials utilize cryptographic hashing (such as salted bcrypt), and administrative access requires multi-factor authentication.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-indigo-600" /> 6. Your Rights Under Data Protection Laws
            </h2>
            <p className="mb-2">Subject to legal and regulatory retention obligations, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>Request access to the personal data we hold about you.</li>
              <li>Request correction or rectification of inaccurate corporate or personal records.</li>
              <li>Request erasure of your customer profile, provided there are no active commercial contracts or unsettled invoices.</li>
              <li>Opt-out of non-essential marketing or product update broadcasts at any time.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Retention Period</h2>
            <p>
              We retain account data for the duration of your active business relationship with Spinel. Commercial transaction history, tax invoices, and shipping records are retained for a minimum of seven (7) years to satisfy statutory statutory tax compliance requirements.
            </p>
          </section>

          <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              To exercise your data privacy rights or contact our Data Protection Officer (DPO), email <a href="mailto:privacy@spineldistribution.com" className="text-blue-600 hover:underline">privacy@spineldistribution.com</a>.
            </p>
            <button
              onClick={() => onNavigate('contact')}
              className="px-5 py-2.5 bg-[#febd69] hover:bg-[#f3a847] text-[#131921] font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              Contact Privacy Team <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
