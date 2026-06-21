export default function AnalyticsPage() {
  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-3xl font-bold text-[#2c3e2f]">
          Analytics
        </h1>

        <p className="text-gray-500 mt-2">
          Monitor profile performance and visitor activity.
        </p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">

        <div className="bg-white border border-[#e2cfbc] rounded-2xl p-6">
          <p className="text-gray-500">Profile Views</p>
          <h2 className="text-3xl font-bold text-[#c49a6c]">0</h2>
        </div>

        <div className="bg-white border border-[#e2cfbc] rounded-2xl p-6">
          <p className="text-gray-500">Unique Visitors</p>
          <h2 className="text-3xl font-bold text-[#0b5b2f]">0</h2>
        </div>

        <div className="bg-white border border-[#e2cfbc] rounded-2xl p-6">
          <p className="text-gray-500">Messages Received</p>
          <h2 className="text-3xl font-bold text-[#003366]">0</h2>
        </div>

        <div className="bg-white border border-[#e2cfbc] rounded-2xl p-6">
          <p className="text-gray-500">Ad Clicks</p>
          <h2 className="text-3xl font-bold text-[#8b5a2b]">0</h2>
        </div>

      </div>

      <div className="bg-white rounded-2xl border border-[#e2cfbc] p-6">
        <p className="text-gray-400">
          Analytics data will appear here once visitors interact with your company profile.
        </p>
      </div>

    </div>
  );
}