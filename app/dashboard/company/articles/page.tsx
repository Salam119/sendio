'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { FaNewspaper, FaPlus, FaTrash } from 'react-icons/fa6';
import { getCompanyId } from '@/lib/getCompanyId';
import { supabase } from '@/lib/supabase';

type CompanyArticle = {
  id: string;
  company_id: string | null;
  title: string;
  content: string;
  created_at: string | null;
};

type CompanyInfo = {
  id: string;
  name: string | null;
  slug: string | null;
};

export default function ArticlesPage() {
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [articles, setArticles] = useState<CompanyArticle[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadArticles() {
      setLoading(true);
      setNotice('');

      const companyId = await getCompanyId();

      if (!isMounted) {
        return;
      }

      if (!companyId) {
        setNotice('Company profile was not found for this account.');
        setLoading(false);
        return;
      }

      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, name, slug')
        .eq('id', companyId)
        .single();

      if (!isMounted) {
        return;
      }

      if (companyError) {
        setNotice(companyError.message);
        setLoading(false);
        return;
      }

      const { data: articleData, error: articleError } = await supabase
        .from('company_articles')
        .select('id, company_id, title, content, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (!isMounted) {
        return;
      }

      if (articleError) {
        setNotice(articleError.message);
        setLoading(false);
        return;
      }

      setCompany(companyData as CompanyInfo);
      setArticles((articleData ?? []) as CompanyArticle[]);
      setLoading(false);
    }

    void loadArticles();

    return () => {
      isMounted = false;
    };
  }, []);

  async function createArticle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!company) {
      setNotice('Company profile was not found.');
      return;
    }

    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (!cleanTitle || !cleanContent) {
      setNotice('Please add both a title and article content.');
      return;
    }

    setSaving(true);
    setNotice('');

    const { data, error } = await supabase
      .from('company_articles')
      .insert({
        company_id: company.id,
        title: cleanTitle,
        content: cleanContent,
      })
      .select('id, company_id, title, content, created_at')
      .single();

    if (error) {
      setNotice(error.message);
      setSaving(false);
      return;
    }

    setArticles((current) => [data as CompanyArticle, ...current]);
    setTitle('');
    setContent('');
    setNotice('Article published successfully.');
    setSaving(false);
  }

  async function deleteArticle(articleId: string) {
    setDeletingId(articleId);
    setNotice('');

    const { error } = await supabase
      .from('company_articles')
      .delete()
      .eq('id', articleId);

    if (error) {
      setNotice(error.message);
      setDeletingId('');
      return;
    }

    setArticles((current) =>
      current.filter((article) => article.id !== articleId),
    );
    setNotice('Article deleted successfully.');
    setDeletingId('');
  }

  const publicProfileHref = company?.slug
    ? `/companies/${company.slug}`
    : '/dashboard/company';

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-[var(--sendio-border)] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--sendio-muted)]">
              Company Articles
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--sendio-text)]">
              Articles
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--sendio-muted)]">
              Publish company news, offers, updates, and helpful articles. New
              articles appear on your public company profile.
            </p>
          </div>

          <Link
            href={publicProfileHref}
            className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-4 py-2 text-sm font-black text-[var(--sendio-text)] transition hover:bg-[var(--sendio-soft-hover)]"
          >
            Open public profile
          </Link>
        </div>

        {notice ? (
          <div className="mt-4 rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-4 py-3 text-sm font-bold text-[var(--sendio-text)]">
            {notice}
          </div>
        ) : null}
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <form
          onSubmit={createArticle}
          className="rounded-[28px] border border-[var(--sendio-border)] bg-white p-5 shadow-sm xl:col-span-1"
        >
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
              Publish
            </p>

            <h2 className="mt-1 flex items-center gap-2 text-xl font-black text-[var(--sendio-text)]">
              <FaPlus className="text-[var(--sendio-accent)]" />
              New article
            </h2>

            <p className="mt-1 text-sm font-semibold text-[var(--sendio-muted)]">
              Keep it short, useful, and clear for visitors.
            </p>
          </div>

          <label className="block space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.15em] text-[var(--sendio-muted)]">
              Title
            </span>

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Example: Summer offer for Sendio clients"
              className="w-full rounded-2xl border border-[var(--sendio-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--sendio-text)] outline-none placeholder:text-gray-400 focus:border-[var(--sendio-accent)]"
            />
          </label>

          <label className="mt-4 block space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.15em] text-[var(--sendio-muted)]">
              Content
            </span>

            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={7}
              placeholder="Write the article, offer, company update, or helpful note here..."
              className="w-full resize-none rounded-2xl border border-[var(--sendio-border)] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[var(--sendio-text)] outline-none placeholder:text-gray-400 focus:border-[var(--sendio-accent)]"
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 rounded-full bg-[var(--sendio-accent)] px-5 py-2.5 text-sm font-black text-[var(--sendio-accent-text)] transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Publishing...' : 'Publish article'}
          </button>
        </form>

        <section className="rounded-[28px] border border-[var(--sendio-border)] bg-white p-5 shadow-sm xl:col-span-2">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
                Published
              </p>

              <h2 className="mt-1 flex items-center gap-2 text-xl font-black text-[var(--sendio-text)]">
                <FaNewspaper className="text-[var(--sendio-accent)]" />
                Company articles
              </h2>
            </div>

            <p className="text-sm font-bold text-[var(--sendio-muted)]">
              {articles.length} article{articles.length === 1 ? '' : 's'}
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-4 text-sm font-bold text-[var(--sendio-muted)]">
              Loading articles...
            </div>
          ) : articles.length ? (
            <div className="space-y-3">
              {articles.map((article) => (
                <article
                  key={article.id}
                  className="rounded-2xl border border-[var(--sendio-border)] bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-base font-black text-[var(--sendio-text)]">
                        {article.title}
                      </h3>

                      <p className="mt-1 text-xs font-bold text-[var(--sendio-muted)]">
                        {article.created_at
                          ? new Date(article.created_at).toLocaleDateString()
                          : 'No date'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void deleteArticle(article.id)}
                      disabled={deletingId === article.id}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                    >
                      <FaTrash />
                      {deletingId === article.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>

                  <p className="mt-3 line-clamp-4 text-sm font-semibold leading-6 text-[var(--sendio-muted)]">
                    {article.content}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-5">
              <h3 className="text-base font-black text-[var(--sendio-text)]">
                No articles published yet
              </h3>

              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--sendio-muted)]">
                Publish your first company update. It will appear on your public
                company profile after saving.
              </p>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}