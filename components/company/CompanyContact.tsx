'use client';

import { useCompany } from "@/context/CompanyContext";

export default function CompanyContact() {
  const { company } = useCompany();

  const whatsappLink = company.phone
    ? `https://wa.me/${company.phone.replace(/\D/g, "")}`
    : null;

  const callLink = company.phone
    ? `tel:${company.phone}`
    : null;

  const emailLink = company.email
    ? `mailto:${company.email}`
    : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">

      <h2 className="text-xl font-semibold mb-4">
        Contact Company
      </h2>

      <div className="flex flex-wrap gap-3">

        {/* WhatsApp */}
        {whatsappLink && (
          <a
            href={whatsappLink}
            target="_blank"
            className="px-5 py-3 rounded-xl bg-green-600 text-white text-sm"
          >
            WhatsApp
          </a>
        )}

        {/* Call */}
        {callLink && (
          <a
            href={callLink}
            className="px-5 py-3 rounded-xl bg-blue-600 text-white text-sm"
          >
            Call
          </a>
        )}

        {/* Email */}
        {emailLink && (
          <a
            href={emailLink}
            className="px-5 py-3 rounded-xl bg-purple-600 text-white text-sm"
          >
            Email
          </a>
        )}

        {/* Empty state */}
        {!company.phone && !company.email && (
          <p className="text-gray-400 text-sm">
            No contact information added yet
          </p>
        )}

      </div>
    </div>
  );
}