import CompanyHeader from "@/components/company/CompanyHeader";
import CompanyInfo from "@/components/company/CompanyInfo";
import CompanyAbout from "@/components/company/CompanyAbout";
import CompanyServices from "@/components/company/CompanyServices";
import CompanyProjects from "@/components/company/CompanyProjects";
import CompanyGallery from "@/components/company/CompanyGallery";
import CompanyFeatures from "@/components/company/CompanyFeatures";
import CompanySocialLinks from "@/components/company/CompanySocialLinks";
import CompanyStatus from "@/components/company/CompanyStatus";

export default function CompanyDashboardPage() {
  return (
    <div className="bg-[#fefcf5] min-h-screen">

      <CompanyHeader />

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">

        <CompanyInfo />

        <CompanyStatus />

        <CompanyAbout />

        <CompanyServices />

        <CompanyProjects />

        <CompanyGallery />

        <CompanyFeatures />

        <CompanySocialLinks />

      </div>

    </div>
  );
}