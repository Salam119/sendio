'use client';

import CompanyHeader from '@/components/company/CompanyHeader';
import CompanyServices from '@/components/company/CompanyServices';
import CompanyProjects from '@/components/company/CompanyProjects';
import CompanyAbout from '@/components/company/CompanyAbout';
import CompanyInfo from '@/components/company/CompanyInfo';
import CompanySocialLinks from '@/components/company/CompanySocialLinks';
import CompanyStatus from '@/components/company/CompanyStatus';
import CompanyFeatures from '@/components/company/CompanyFeatures';
import CompanyGallery from '@/components/company/CompanyGallery';

export default function CompanyDashboardPage() {
  return (
    <div className="space-y-6">
      <CompanyHeader />
      <CompanyInfo />
      <CompanyStatus />
      <CompanyAbout />
      <CompanyServices />
      <CompanyProjects />
      <CompanyFeatures />
      <CompanySocialLinks />
      <CompanyGallery />
    </div>
  );
}