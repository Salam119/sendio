'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCompanyId } from '@/lib/getCompanyId';

type Project = {
  id: string;
  title: string;
  description: string | null;
};

export default function CompanyProjects() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadProjects(id?: string) {
    const currentCompanyId = id || companyId;

    if (!currentCompanyId) {
      return;
    }

    const { data, error } = await supabase
      .from('company_projects')
      .select('*')
      .eq('company_id', currentCompanyId);

    if (error) {
      console.error(error);
      return;
    }

    setProjects(data || []);
  }

  useEffect(() => {
    async function initProjects() {
      const id = await getCompanyId();

      if (!id) {
        alert('Company not found for this user.');
        return;
      }

      setCompanyId(id);
      await loadProjects(id);
    }

    initProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addProject() {
    if (!companyId) {
      alert('Company ID not found.');
      return;
    }

    if (!title.trim()) return;

    setLoading(true);

    const { error } = await supabase
      .from('company_projects')
      .insert([
        {
          company_id: companyId,
          title: title.trim(),
          description: description.trim() || null,
        },
      ]);

    if (error) {
      console.error(error);
      alert(error.message);
      setLoading(false);
      return;
    }

    setTitle('');
    setDescription('');
    await loadProjects(companyId);

    setLoading(false);
  }

  async function deleteProject(id: string) {
    const { error } = await supabase
      .from('company_projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    await loadProjects();
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e2cfbc] p-6">
      <h2 className="text-2xl font-bold text-[#2c3e2f] mb-6">
        Company Projects
      </h2>

      <div className="space-y-3 mb-6">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Project title"
          className="w-full border border-[#e2cfbc] rounded-xl px-4 py-3"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Project description"
          className="w-full border border-[#e2cfbc] rounded-xl px-4 py-3 h-28 resize-none"
        />

        <button
          onClick={addProject}
          disabled={loading}
          className="bg-[#c49a6c] text-white px-5 py-3 rounded-xl"
        >
          {loading ? 'Saving...' : 'Add Project'}
        </button>
      </div>

      <div className="space-y-3">
        {projects.map((project) => (
          <div
            key={project.id}
            className="border border-[#e2cfbc] rounded-xl p-4"
          >
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="font-semibold text-[#2c3e2f]">
                  {project.title}
                </h3>

                <p className="text-gray-500 mt-1">
                  {project.description || 'No description'}
                </p>
              </div>

              <button
                onClick={() => deleteProject(project.id)}
                className="text-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {projects.length === 0 && (
          <div className="text-gray-400">
            No projects added yet.
          </div>
        )}
      </div>
    </div>
  );
}
