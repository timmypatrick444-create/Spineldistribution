import React from 'react';
import { ShieldCheck, FileText, Scale, AlertTriangle, ArrowRight } from 'lucide-react';

export interface TermsOfUsePageProps {
  onNavigate: (view: string, param?: string) => void;
}

export const TermsOfUsePage: React.FC<TermsOfUsePageProps> = ({ onNavigate }) => {
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
          <span className="text-gray-900 font-medium">Terms of Use</span>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#131921] via-[#1f2937] to-[#232f3e] text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-400 text-xs sm:text-sm font-semibold mb-3 border border-white/10">
            <Scale className="w-4 h-4" /> Commercial &amp; Procurement Terms
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white max-w-3xl leading-tight">
            Terms of Use &amp; Commercial Conditions
          </h1>
          <p className="mt-4 text-sm sm:text-base text-gray-300 max-w-2xl leading-relaxed">
            Effective Date: January 1, 2026. Please review these terms carefully before procuring equipment, requesting quotations, or opening an enterprise account with Spinel Distribution Ltd.
          </p>
        </div>
      </div>

      {/* Main Body */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="bg-white p-6 sm:p-12 rounded-xl border border-gray-200 shadow-sm space-y-8 text-sm leading-relaxed text-gray-700">
          
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" /> 1. Acceptance of Terms &amp; Scope
            </h2>
            <p>
              By accessing, browsing, registering for an account, generating quotations, or issuing purchase orders through the Spinel Distribution digital platform (the &quot;Platform&quot;), you (&quot;Purchaser&quot;, &quot;Client&quot;, or &quot;User&quot;) agree to be bound by these Terms of Use and all incorporated policies. If you represent an enterprise or institutional entity, you warrant that you are legally authorized to bind said organization to these provisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" /> 2. Commercial B2B Quotations &amp; Invoicing
            </h2>
            <p className="mb-2">
              Spinel Distribution Ltd operates primarily as an authorized business-to-business (B2B) ICT and engineering distributor. All quotes, proforma invoices, and price schedules generated online or provided by authorized sales representatives are subject to the following conditions:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li><strong>Validity Period:</strong> Quotations remain valid for thirty (30) calendar days from the date of generation unless otherwise specified in writing due to manufacturer price changes or extreme foreign exchange fluctuations.</li>
              <li><strong>Currency Settlement:</strong> Pricing is denominated in United States Dollars (USD $) and Nigerian Naira (NGN ₦). Formal invoices specify approved bank wire instruction channels.</li>
              <li><strong>Availability &amp; Lead Times:</strong> Quoted lead times represent good-faith estimates based on manufacturer dispatch schedules and customs clearance timelines.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" /> 3. Hazardous Environment &amp; Ex-Equipment Certification Disclaimer
            </h2>
            <p className="mb-2">
              Spinel Distribution supplies genuine, factory-certified hardware designed for classified industrial environments (including ATEX, IECEx, and NEC Class/Division zones).
            </p>
            <p className="mb-2">
              <strong>Customer Responsibility:</strong> It is the sole responsibility of the purchasing engineer, system integrator, or project contractor to verify that equipment specifications, zonal classifications (e.g., Zone 1, Zone 2, Zone 21, Gas Groups IIA/IIB/IIC, Temperature Classes T1–T6), ingress protection (IP) ratings, and cable gland selections comply with local plant safety regulations and engineer-of-record design requirements.
            </p>
            <p>
              Spinel Distribution expressly disclaims liability resulting from improper field installation, unapproved conduit entry modifications, or deployment of equipment outside manufacturer-rated operating thresholds.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Orders, Payment &amp; Taxes</h2>
            <p className="mb-2">
              Official purchase orders (POs) are confirmed upon issuance of a formal Spinel Order Confirmation or payment verification. Payments may be remitted via approved corporate wire transfer, institutional letter of credit, or secured online payment channels.
            </p>
            <p>
              Unless explicitly noted on the invoice, prices exclude applicable value-added taxes (VAT), withholding tax (WHT), import duties, and destination freight handling. Tax exemption certificates must be submitted prior to order finalization.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Inspection, Delivery &amp; Risk of Loss</h2>
            <p className="mb-2">
              Title and risk of loss pass to the Purchaser upon dispatch from Spinel Distribution logistics centers or upon handover to the authorized freight forwarder (Incoterms 2020 EXW or FCA, unless CIF/DDP is agreed in writing).
            </p>
            <p>
              Purchasers must inspect shipments within five (5) business days of physical receipt. Discrepancies, shortage claims, or transit damages must be reported immediately with accompanying bill of lading notes and photographic evidence.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Manufacturer Warranties &amp; RMA Process</h2>
            <p className="mb-2">
              All new equipment distributed by Spinel carries full manufacturer-backed warranties (typically 1 to 3 years depending on the OEM brand).
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>Warranty claims require a Return Merchandise Authorization (RMA) ticket issued by our technical support desk.</li>
              <li>Defective items undergo factory diagnostics. Warranties do not cover damage caused by power surges, lightning strikes, improper grounding, liquid immersion of non-rated items, or physical abuse.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Intellectual Property &amp; Trademarks</h2>
            <p>
              All trademarks, service marks, model designations, and brand names (including Spinel, Eaton Crouse-Hinds, CEAG, Tripp Lite, B-Line, Axis, Pelco, and Avigilon) referenced on this platform belong to their respective proprietary owners. Their usage is for genuine identification and authorized distribution purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Governing Law &amp; Dispute Resolution</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the commercial laws of the Federal Republic of Nigeria. Any disputes arising out of or in connection with commercial contracts shall be resolved amicably, failing which they shall be submitted to binding arbitration in Lagos, Nigeria under the Arbitration and Mediation Act.
            </p>
          </section>

          <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              Questions regarding these terms? Contact our legal &amp; compliance desk at <a href="mailto:compliance@spineldistribution.com" className="text-blue-600 hover:underline">compliance@spineldistribution.com</a>.
            </p>
            <button
              onClick={() => onNavigate('contact')}
              className="px-5 py-2.5 bg-[#febd69] hover:bg-[#f3a847] text-[#131921] font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              Contact Legal Desk <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
