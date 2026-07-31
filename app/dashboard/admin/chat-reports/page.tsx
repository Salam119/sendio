'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from 'react';
import {
  deleteSendioReportedMessage,
  getSendioAdminChatReports,
  moderateSendioChatUser,
  updateSendioAdminChatReportStatus,
  type SendioAdminChatReport,
  type SendioChatModerationStatus,
  type SendioChatParticipant,
  type SendioChatReportEvidence,
} from '@/lib/sendio-chat-client';

type FilterMode = 'active' | 'all' | 'resolved';

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat('fr-BE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getRoleLabel(role: SendioChatParticipant['role']): string {
  if (role === 'company') return 'Entreprise';
  if (role === 'worker') return 'Professionnel';
  if (role === 'client') return 'Client';
  if (role === 'super_admin') return 'Super administrateur';
  return 'Administrateur';
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(value: string, maxLength = 52): string[] {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (!clean) return ['Message supprimé'];

  const words = clean.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxLength) {
      current = next;
      continue;
    }

    if (current) lines.push(current);
    current = word.slice(0, maxLength);
  }

  if (current) lines.push(current);
  return lines.slice(0, 4);
}

function buildEvidenceImage(
  evidence: SendioChatReportEvidence,
  reportedUserId: string | null,
): { src: string; width: number; height: number } {
  const width = 760;
  const messages = evidence.messages.slice(-18);
  const participantMap = new Map(
    evidence.participants.map((participant) => [
      participant.userId,
      participant,
    ]),
  );

  let y = 84;
  const blocks: string[] = [];

  for (const message of messages) {
    const isReported = message.senderId === reportedUserId;
    const participant = participantMap.get(message.senderId);
    const name = participant?.displayName ?? 'Utilisateur Sendio';
    const lines = wrapText(message.deletedAt ? 'Message supprimé' : message.body ?? '');
    const bubbleHeight = 52 + lines.length * 21;
    const bubbleWidth = 540;
    const x = isReported ? width - bubbleWidth - 34 : 34;
    const fill = isReported ? '#dff7ff' : '#f2eef8';
    const stroke = isReported ? '#45cfe7' : '#d9cfee';

    blocks.push(`
      <text x="${x + 18}" y="${y + 22}" font-size="13" font-weight="700" fill="#374151">${escapeXml(name)}</text>
      <rect x="${x}" y="${y + 30}" width="${bubbleWidth}" height="${bubbleHeight - 30}" rx="18" fill="${fill}" stroke="${stroke}" />
      ${lines
        .map(
          (line, index) =>
            `<text x="${x + 18}" y="${y + 58 + index * 21}" font-size="15" fill="#111827">${escapeXml(line)}</text>`,
        )
        .join('')}
      <text x="${x + 18}" y="${y + bubbleHeight - 8}" font-size="11" fill="#6b7280">${escapeXml(formatDate(message.createdAt))}</text>
    `);

    y += bubbleHeight + 18;
  }

  const height = Math.max(330, y + 50);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" rx="24" fill="#f8fafc" />
      <rect width="100%" height="58" rx="24" fill="#2fc1e8" />
      <rect y="34" width="100%" height="24" fill="#2fc1e8" />
      <text x="28" y="36" font-size="21" font-weight="800" fill="#ffffff">Sendio Chat — Capture de signalement</text>
      <text x="28" y="73" font-size="12" fill="#64748b">Capture automatique protégée • ${escapeXml(formatDate(evidence.capturedAt))}</text>
      ${blocks.join('')}
    </svg>
  `;

  return {
    src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    width,
    height,
  };
}

function statusLabel(status: SendioAdminChatReport['status']): string {
  if (status === 'open') return 'Nouveau';
  if (status === 'reviewing') return 'En cours';
  if (status === 'resolved') return 'Résolu';
  return 'Rejeté';
}

function userStatusLabel(status: SendioChatModerationStatus): string {
  if (status === 'suspended') return 'Suspendu du chat';
  if (status === 'deleted') return 'Supprimé du chat';
  return 'Actif';
}

export default function AdminChatReportsPage() {
  const [reports, setReports] = useState<SendioAdminChatReport[]>([]);
  const [filter, setFilter] = useState<FilterMode>('active');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getSendioAdminChatReports();
      setReports(response.reports);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load chat reports.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadReports();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadReports]);

  const visibleReports = useMemo(() => {
    if (filter === 'all') return reports;
    if (filter === 'resolved') {
      return reports.filter(
        (report) =>
          report.status === 'resolved' || report.status === 'dismissed',
      );
    }

    return reports.filter(
      (report) => report.status === 'open' || report.status === 'reviewing',
    );
  }, [filter, reports]);

  async function runAction(
    reportId: string,
    action: () => Promise<unknown>,
    successMessage: string,
  ): Promise<void> {
    setBusyId(reportId);
    setNotice('');
    setError('');

    try {
      await action();
      setNotice(successMessage);
      await loadReports();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'Action failed.',
      );
    } finally {
      setBusyId(null);
    }
  }

  function moderateUser(
    report: SendioAdminChatReport,
    status: SendioChatModerationStatus,
  ): void {
    if (!report.reportedUser) return;

    const labels: Record<SendioChatModerationStatus, string> = {
      active: 'réactiver',
      suspended: 'suspendre',
      deleted: 'supprimer du chat',
    };
    const confirmed = window.confirm(
      `Confirmer: ${labels[status]} ${report.reportedUser.displayName} ?`,
    );
    if (!confirmed) return;

    const reason =
      status === 'active'
        ? 'Accès rétabli par l’administration.'
        : window.prompt('Motif de la décision', report.reason)?.trim();

    if (status !== 'active' && !reason) return;

    void runAction(
      report.id,
      () => moderateSendioChatUser(report.id, status, reason || ''),
      status === 'active'
        ? 'Accès au chat rétabli.'
        : status === 'suspended'
          ? 'Utilisateur suspendu de Sendio Chat.'
          : 'Utilisateur supprimé de Sendio Chat.',
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-[#d8c3a5] bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8b5a2b]">
            Moderation
          </p>
          <h2 className="text-2xl font-black text-[#0b5b2f]">
            Sendio Chat Reports
          </h2>
          <p className="mt-1 text-sm font-semibold text-[#526257]">
            Signalements, captures automatiques et actions administratives.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/admin/moderation"
            className="rounded-full border border-[#d8c3a5] bg-white px-4 py-2 text-sm font-black text-[#173321]"
          >
            Moderation Center
          </Link>
          <button
            type="button"
            onClick={() => void loadReports()}
            className="rounded-full bg-[#0b5b2f] px-4 py-2 text-sm font-black text-white"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['active', 'Nouveaux / en cours'],
            ['resolved', 'Terminés'],
            ['all', 'Tous'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full px-4 py-2 text-sm font-black ${
              filter === value
                ? 'bg-[#2fc1e8] text-white'
                : 'border border-[#cfe8f3] bg-white text-[#173321]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {notice ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-[#e2d3bf] bg-white p-8 text-center font-bold">
          Loading chat reports...
        </div>
      ) : visibleReports.length === 0 ? (
        <div className="rounded-3xl border border-[#e2d3bf] bg-white p-8 text-center font-bold">
          Aucun signalement dans cette section.
        </div>
      ) : (
        <div className="space-y-5">
          {visibleReports.map((report) => {
            const capture = report.evidence
              ? buildEvidenceImage(report.evidence, report.reportedUserId)
              : null;
            const busy = busyId === report.id;

            return (
              <article
                key={report.id}
                className="overflow-hidden rounded-3xl border border-[#d8c3a5] bg-white shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#eee2d3] bg-[#fbf8f3] p-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#fff1d6] px-3 py-1 text-xs font-black text-[#8b5a2b]">
                        {statusLabel(report.status)}
                      </span>
                      <span className="text-xs font-bold text-[#66756b]">
                        {formatDate(report.createdAt)}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-black text-[#173321]">
                      {report.reason}
                    </h3>
                  </div>

                  <select
                    value={report.status}
                    disabled={busy}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                      void runAction(
                        report.id,
                        () =>
                          updateSendioAdminChatReportStatus(
                            report.id,
                            event.target.value as SendioAdminChatReport['status'],
                          ),
                        'Statut du signalement mis à jour.',
                      )
                    }
                    className="rounded-xl border border-[#d8c3a5] bg-white px-3 py-2 text-sm font-bold"
                  >
                    <option value="open">Nouveau</option>
                    <option value="reviewing">En cours</option>
                    <option value="resolved">Résolu</option>
                    <option value="dismissed">Rejeté</option>
                  </select>
                </div>

                <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
                  <div>
                    {capture ? (
                      <div className="overflow-hidden rounded-2xl border border-[#cfe8f3] bg-[#f8fafc]">
                        <Image
                          src={capture.src}
                          alt="Capture automatique de la conversation signalée"
                          width={capture.width}
                          height={capture.height}
                          unoptimized
                          className="h-auto w-full"
                        />
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[#d8c3a5] p-6 text-center text-sm font-bold text-[#66756b]">
                        Capture indisponible pour cet ancien signalement.
                      </div>
                    )}
                  </div>

                  <aside className="space-y-4">
                    <div className="rounded-2xl border border-[#e7ddd0] bg-[#fbf8f3] p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-[#8b5a2b]">
                        Reporter
                      </p>
                      <p className="mt-2 font-black text-[#173321]">
                        {report.reporter?.displayName ?? report.reporterId}
                      </p>
                      <p className="text-xs font-bold text-[#66756b]">
                        {report.reporter
                          ? getRoleLabel(report.reporter.role)
                          : 'Utilisateur'}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#e7ddd0] bg-white p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-[#8b5a2b]">
                        Utilisateur signalé
                      </p>
                      <p className="mt-2 font-black text-[#173321]">
                        {report.reportedUser?.displayName ?? 'Inconnu'}
                      </p>
                      <p className="text-xs font-bold text-[#66756b]">
                        {report.reportedUser
                          ? getRoleLabel(report.reportedUser.role)
                          : 'Utilisateur'}
                      </p>
                      <span className="mt-3 inline-flex rounded-full bg-[#eef6ff] px-3 py-1 text-xs font-black text-[#0b5b2f]">
                        {userStatusLabel(report.reportedUserStatus)}
                      </span>
                      {report.reportedUser?.profileUrl ? (
                        <Link
                          href={report.reportedUser.profileUrl}
                          className="mt-3 block text-sm font-black text-[#168db1] underline"
                        >
                          Ouvrir le profil
                        </Link>
                      ) : null}
                    </div>

                    <div className="grid gap-2">
                      {report.messageId ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            if (!window.confirm('Supprimer le message signalé ?')) return;
                            void runAction(
                              report.id,
                              () => deleteSendioReportedMessage(report.id),
                              'Message supprimé par l’administration.',
                            );
                          }}
                          className="rounded-xl bg-[#fff0f1] px-4 py-3 text-sm font-black text-[#c62828] disabled:opacity-50"
                        >
                          🗑️ Supprimer le message
                        </button>
                      ) : null}

                      <button
                        type="button"
                        disabled={busy || !report.reportedUser}
                        onClick={() => moderateUser(report, 'suspended')}
                        className="rounded-xl bg-[#fff1d6] px-4 py-3 text-sm font-black text-[#8b5a2b] disabled:opacity-50"
                      >
                        ⏸ Suspendre du chat
                      </button>

                      <button
                        type="button"
                        disabled={busy || !report.reportedUser}
                        onClick={() => moderateUser(report, 'active')}
                        className="rounded-xl bg-[#eefaf1] px-4 py-3 text-sm font-black text-[#0b5b2f] disabled:opacity-50"
                      >
                        ▶ Réactiver le chat
                      </button>

                      <button
                        type="button"
                        disabled={busy || !report.reportedUser}
                        onClick={() => moderateUser(report, 'deleted')}
                        className="rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                      >
                        ✕ Supprimer du chat
                      </button>
                    </div>
                  </aside>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
