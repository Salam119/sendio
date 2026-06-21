'use client';

import { useState } from "react";
import { useCompany } from "@/context/CompanyContext";

export default function CompanyServices() {
  const { company, addService, deleteService } = useCompany();
  const [title, setTitle] = useState("");

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">

      {/* TITLE */}
      <h2 className="text-xl font-semibold mb-4">
        Company Services
      </h2>

      {/* ADD SERVICE */}
      <div className="flex gap-3 mb-6">

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter service name"
          className="flex-1 border rounded-xl px-4 py-2 text-sm"
        />

        <button
          onClick={() => {
            if (!title.trim()) return;

            addService(title);
            setTitle("");
          }}
          className="bg-black text-white px-4 py-2 rounded-xl text-sm hover:bg-gray-800"
        >
          Add
        </button>

      </div>

      {/* SERVICES LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

        {company.services.length === 0 ? (
          <p className="text-gray-400 text-sm text-center col-span-full">
            No services added yet
          </p>
        ) : (
          company.services.map((service) => (
            <div
              key={service.id}
              className="flex justify-between items-center border rounded-xl p-4"
            >

              <div>
                <h3 className="font-medium text-sm text-gray-800">
                  {service.title}
                </h3>
              </div>

              <button
                onClick={() => deleteService(service.id)}
                className="text-red-500 text-sm hover:underline"
              >
                Delete
              </button>

            </div>
          ))
        )}

      </div>
    </div>
  );
}