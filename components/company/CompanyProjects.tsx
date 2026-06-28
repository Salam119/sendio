'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCompanyId } from '@/lib/getCompanyId';

type Project = {
  id: string;
  title: string;
  description: string | null;
};

const PROJECT_DESCRIPTION_LIMIT = 600;

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
      .eq('company_id', currentCompanyId)
      .order('id', { ascending: true });

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

    void initProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addProject() {
    if (!companyId) {
      alert('Company ID not found.');
      return;
    }

    if (!title.trim()) return;

    setLoading(true);

    const { error } = await supabase.from('company_projects').insert([
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
    <section className="rounded-[22px] border border-[var(--sendio-border)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
            Projects
          </p>
          <h2 className="mt-1 text-base font-black text-[var(--sendio-text)]">
            Work highlights
          </h2>
        </div>

        <span className="rounded-full bg-[var(--sendio-soft)] px-3 py-1 text-[11px] font-black text-[var(--sendio-text)]">
          {projects.length}
        </span>
      </div>

      <div className="grid gap-2 md:grid-cols-[0.8fr_1fr_auto]">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Project title"
          className="rounded-2xl border border-[var(--sendio-border)] bg-white px-3 py-2.5 text-sm font-semibold text-[var(--sendio-text)] outline-none placeholder:text-gray-400 focus:border-[var(--sendio-accent)]"
        />

        <input
          value={description}
          maxLength={PROJECT_DESCRIPTION_LIMIT}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description"
          className="rounded-2xl border border-[var(--sendio-border)] bg-white px-3 py-2.5 text-sm font-semibold text-[var(--sendio-text)] outline-none placeholder:text-gray-400 focus:border-[var(--sendio-accent)]"
        />

        <button
          type="button"
          onClick={() => void addProject()}
          disabled={loading}
          className="rounded-full bg-[var(--sendio-accent)] px-4 py-2 text-xs font-black text-[var(--sendio-accent-text)] disabled:opacity-60"
        >
          {loading ? '...' : 'Add'}
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {projects.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-3 py-2 text-xs font-bold text-[var(--sendio-muted)]">
            No projects added yet.
          </p>
        ) : (
          projects.map((project) => (
            <article
              key={project.id}
              className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-3 py-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-black text-[var(--sendio-text)]">
                    {project.title}
                  </h3>

                  {project.description ? (
                    <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[var(--sendio-muted)]">
                      {project.description}
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => void deleteProject(project.id)}
                  className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-black text-red-500"
                >
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}