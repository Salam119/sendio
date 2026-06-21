import CompanyProjects from "@/components/company/CompanyProjects";

export default function ProjectsPage() {
  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-3xl font-bold text-[#2c3e2f]">
          Company Projects
        </h1>

        <p className="text-gray-500 mt-2">
          Manage your portfolio and showcase completed work.
        </p>
      </div>

      <CompanyProjects />

    </div>
  );
}