export default function ReviewsPage() {
  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-3xl font-bold text-[#2c3e2f]">
          Reviews
        </h1>

        <p className="text-gray-500 mt-2">
          Customer ratings and reviews.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#e2cfbc] p-6">

        <div className="grid md:grid-cols-3 gap-4">

          <div className="p-4 bg-[#fefcf5] rounded-xl">
            <p className="text-gray-500">Average Rating</p>
            <h2 className="text-3xl font-bold text-[#c49a6c]">
              0.0
            </h2>
          </div>

          <div className="p-4 bg-[#fefcf5] rounded-xl">
            <p className="text-gray-500">Total Reviews</p>
            <h2 className="text-3xl font-bold text-[#0b5b2f]">
              0
            </h2>
          </div>

          <div className="p-4 bg-[#fefcf5] rounded-xl">
            <p className="text-gray-500">Recommendations</p>
            <h2 className="text-3xl font-bold text-[#003366]">
              0
            </h2>
          </div>

        </div>

      </div>

    </div>
  );
}