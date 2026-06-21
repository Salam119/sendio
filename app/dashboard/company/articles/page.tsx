export default function ArticlesPage() {
  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-3xl font-bold text-[#2c3e2f]">
          Articles
        </h1>

        <p className="text-gray-500 mt-2">
          Publish company news, offers and articles.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#e2cfbc] p-6">

        <div className="flex justify-between items-center mb-6">

          <h2 className="text-xl font-semibold">
            Company Articles
          </h2>

          <button className="bg-[#c49a6c] text-white px-5 py-2 rounded-xl">
            + New Article
          </button>

        </div>

        <div className="text-gray-400">
          No articles published yet.
        </div>

      </div>

    </div>
  );
}