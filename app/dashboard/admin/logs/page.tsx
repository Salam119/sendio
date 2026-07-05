"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type UserRole = "admin" | "super_admin";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
};

type AuditLogRow = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  category: string | null;
  status: string | null;
  archived_at: string | null;
  archive_period: string | null;
  log_day: string | null;
  log_month: string | null;
  log_quarter: string | null;
  log_year: number | null;
  archive_level: string | null;
  access_scope: string | null;
  created_at: string | null;
};

type LogMode = "daily" | "monthly" | "quarterly" | "yearly";

const CATEGORY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "ads", label: "Ads" },
  { value: "messages", label: "Messages" },
  { value: "reviews", label: "Reviews" },
  { value: "users", label: "Users" },
  { value: "complaints", label: "Complaints" },
  { value: "warnings", label: "Warnings" },
  { value: "admin_team", label: "Admin Team" },
  { value: "moderation", label: "Moderation" },
  { value: "system", label: "System" },
];

const MONTH_OPTIONS = [
  { value: "all", label: "All months" },
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const LOG_MODE_OPTIONS: Array<{
  value: LogMode;
  label: string;
  icon: string;
  superAdminOnly?: boolean;
}> = [
  { value: "daily", label: "Daily Logs", icon: "📅" },
  { value: "monthly", label: "Monthly Archive", icon: "🗓" },
  { value: "quarterly", label: "Quarterly Archive", icon: "🗄" },
  {
    value: "yearly",
    label: "Yearly Archive",
    icon: "🔐",
    superAdminOnly: true,
  },
];

function formatDateTime(value: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getMonthPeriod(value: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getQuarterPeriod(value: string | null) {
  if (!value) return "Not archived";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not archived";

  const quarter = Math.floor(date.getMonth() / 3) + 1;

  return `${date.getFullYear()}-Q${quarter}`;
}

function getYearOptions() {
  const currentYear = new Date().getFullYear();

  return Array.from({ length: 8 }, (_item, index) =>
    String(currentYear - index),
  );
}

function getCategoryLabel(value: string | null) {
  if (!value) return "System";

  const option = CATEGORY_OPTIONS.find((item) => item.value === value);

  if (option) return option.label;

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getStatusLabel(value: string | null) {
  return value || "success";
}

function getArchiveLevelLabel(value: string | null) {
  if (value === "daily") return "Daily";
  if (value === "monthly") return "Monthly";
  if (value === "quarterly") return "Quarterly";
  if (value === "yearly") return "Yearly";

  return "Daily";
}

function getArchivePeriodLabel(log: AuditLogRow) {
  if (log.archive_level === "daily")
    return log.log_day || getMonthPeriod(log.created_at);
  if (log.archive_level === "monthly")
    return log.log_month || getMonthPeriod(log.created_at);
  if (log.archive_level === "quarterly")
    return log.log_quarter || getQuarterPeriod(log.created_at);
  if (log.archive_level === "yearly") return String(log.log_year || "Yearly");

  return log.archive_period || getMonthPeriod(log.created_at);
}

function getMetadataText(metadata: Record<string, unknown> | null) {
  if (!metadata || Object.keys(metadata).length === 0) return "";

  return JSON.stringify(metadata, null, 2);
}

function formatMetadataValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '';

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

function getMetadataField(metadata: Record<string, unknown> | null, keys: string[]) {
  if (!metadata) return '';

  for (const key of keys) {
    const value = formatMetadataValue(metadata[key]);

    if (value) return value;
  }

  return '';
}

function getFriendlyMetadataRows(log: AuditLogRow) {
  const metadata = log.metadata;

  if (!metadata || Object.keys(metadata).length === 0) return [];

  const rows = [
    { label: 'Client', value: getMetadataField(metadata, ['client_name', 'client_email', 'email']) },
    { label: 'Owner', value: getMetadataField(metadata, ['owner_name', 'company_name', 'worker_name', 'provider_name']) },
    { label: 'Event type', value: getMetadataField(metadata, ['event_type', 'type', 'kind']) },
    { label: 'Source', value: getMetadataField(metadata, ['source_channel', 'source_url', 'owner_href']) },
    { label: 'Phone', value: getMetadataField(metadata, ['client_phone', 'phone']) },
    { label: 'Email', value: getMetadataField(metadata, ['client_email', 'email']) },
    { label: 'Old status', value: getMetadataField(metadata, ['old_status', 'previous_status']) },
    { label: 'New status', value: getMetadataField(metadata, ['new_status', 'status', 'new_moderation_status']) },
    { label: 'Admin note', value: getMetadataField(metadata, ['admin_note', 'new_admin_note', 'note']) },
    { label: 'Reason', value: getMetadataField(metadata, ['reason', 'rejected_reason']) },
  ];

  return rows.filter((row) => row.value);
}

function getActorName(log: AuditLogRow, profilesById: Map<string, ProfileRow>) {
  if (!log.actor_id) return "System";

  const profile = profilesById.get(log.actor_id);

  return profile?.full_name?.trim() || profile?.email || log.actor_id;
}

function escapeCsv(value: string | number | null | undefined) {
  const cleanValue = String(value ?? "").replace(/"/g, '""');

  return `"${cleanValue}"`;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
    .join("\n");

  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

export default function AdminLogsPage() {
  const router = useRouter();

  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [profilesById, setProfilesById] = useState<Map<string, ProfileRow>>(
    new Map(),
  );

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [pageMessage, setPageMessage] = useState("");

  const [mode, setMode] = useState<LogMode>("daily");
  const [category, setCategory] = useState("all");
  const [month, setMonth] = useState("all");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [keyword, setKeyword] = useState("");

  const yearOptions = useMemo(() => getYearOptions(), []);


  const levelLogs = useMemo(() => {
    return logs.filter((log) => {
      const level = log.archive_level || "daily";

      return level === mode;
    });
  }, [logs, mode]);

  const filteredLogs = useMemo(() => {
    const cleanKeyword = keyword.trim().toLowerCase();

    return levelLogs.filter((log) => {
      if (category !== "all" && (log.category || "system") !== category) {
        return false;
      }

      if (month !== "all") {
        const logMonth = log.log_month?.slice(5, 7);

        if (logMonth !== month) {
          return false;
        }
      }

      if (year !== "all") {
        const logYear = log.log_year ? String(log.log_year) : null;

        if (logYear !== year) {
          return false;
        }
      }

      if (!cleanKeyword) return true;

      return [
        log.action,
        log.target_table,
        log.target_id,
        log.description,
        log.category,
        log.status,
        log.archive_period,
        log.log_day,
        log.log_month,
        log.log_quarter,
        log.log_year,
        log.archive_level,
        log.access_scope,
        getMetadataText(log.metadata),
        getActorName(log, profilesById),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(cleanKeyword);
    });
  }, [category, keyword, levelLogs, month, profilesById, year]);

  const dailyLogsCount = useMemo(() => {
    return logs.filter((log) => (log.archive_level || "daily") === "daily")
      .length;
  }, [logs]);

  const monthlyLogsCount = useMemo(() => {
    return logs.filter((log) => log.archive_level === "monthly").length;
  }, [logs]);

  const quarterlyLogsCount = useMemo(() => {
    return logs.filter((log) => log.archive_level === "quarterly").length;
  }, [logs]);

  const yearlyLogsCount = useMemo(() => {
    return logs.filter((log) => log.archive_level === "yearly").length;
  }, [logs]);

  const visibleCategoryCounts = useMemo(() => {
    const counts = new Map<string, number>();

    filteredLogs.forEach((log) => {
      const key = log.category || "system";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return counts;
  }, [filteredLogs]);

  async function checkAccess() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/login");
      return null;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profileData) {
      setPageError(profileError?.message || "Unable to read admin profile.");
      return null;
    }

    const profile = profileData as ProfileRow;

    if (profile.role !== "admin" && profile.role !== "super_admin") {
      router.replace("/");
      return null;
    }

    setCurrentRole(profile.role);

    return {
      userId: user.id,
      role: profile.role as UserRole,
    };
  }

  async function loadLogs() {
    setLoading(true);
    setPageError("");
    setPageMessage("");

    const access = await checkAccess();

    if (!access) {
      setLoading(false);
      return;
    }

    let query = supabase
      .from("admin_audit_logs")
      .select(
        "id, actor_id, actor_role, action, target_table, target_id, description, metadata, category, status, archived_at, archive_period, log_day, log_month, log_quarter, log_year, archive_level, access_scope, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (access.role !== "super_admin") {
      query = query.eq("actor_id", access.userId);
    }

    const { data, error } = await query;

    if (error) {
      setPageError(error.message);
      setLogs([]);
      setLoading(false);
      return;
    }

    const loadedLogs = (data ?? []) as AuditLogRow[];
    setLogs(loadedLogs);

    const actorIds = Array.from(
      new Set(
        loadedLogs
          .map((log) => log.actor_id)
          .filter((actorId): actorId is string => Boolean(actorId)),
      ),
    );

    if (actorIds.length > 0) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .in("id", actorIds);

      const nextProfilesById = new Map<string, ProfileRow>();

      ((profileRows ?? []) as ProfileRow[]).forEach((profile) => {
        nextProfilesById.set(profile.id, profile);
      });

      setProfilesById(nextProfilesById);
    } else {
      setProfilesById(new Map());
    }

    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadLogs();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleExportCsv() {
    if (filteredLogs.length === 0) {
      setPageMessage("There are no logs to export.");
      return;
    }

    const rows = [
      [
        "Date and Time",
        "Day",
        "Month",
        "Quarter",
        "Year",
        "Archive Level",
        "Archive Period",
        "Access Scope",
        "Admin",
        "Role",
        "Category",
        "Action",
        "Target Table",
        "Target ID",
        "Status",
        "Description",
        "Metadata",
      ],
      ...filteredLogs.map((log) => [
        formatDateTime(log.created_at),
        log.log_day || "",
        log.log_month || getMonthPeriod(log.created_at),
        log.log_quarter || getQuarterPeriod(log.created_at),
        String(log.log_year || ""),
        getArchiveLevelLabel(log.archive_level),
        getArchivePeriodLabel(log),
        log.access_scope || "",
        getActorName(log, profilesById),
        log.actor_role || "",
        getCategoryLabel(log.category),
        log.action,
        log.target_table || "",
        log.target_id || "",
        getStatusLabel(log.status),
        log.description || "",
        getMetadataText(log.metadata),
      ]),
    ];

    const fileDate = new Date().toISOString().slice(0, 10);
    const fileMode = mode;
    const fileCategory = category === "all" ? "all-categories" : category;

    downloadCsv(
      `sendio-admin-logs-${fileMode}-${fileCategory}-${fileDate}.csv`,
      rows,
    );

    setPageMessage("CSV exported successfully. You can open it in Excel.");
  }

  if (loading) {
    return (
      <main className="logsPage">
        <section className="loadingCard">
          <h1>Admin Logs</h1>
          <p>Loading Sendio audit logs...</p>
        </section>

        <style>{styles}</style>
      </main>
    );
  }

  return (
    <main className="logsPage">
      <aside className="sideBar">
        <Link href="/" className="brand">
          <span className="brandIcon">S</span>
          <span>Sendio</span>
        </Link>

        <nav className="sideNav">
          <Link href="/dashboard/admin">Control Center</Link>
          <Link href="/dashboard/admin/admins">Admin Team</Link>
          <Link href="/dashboard/admin/moderation">Moderation</Link>
          <Link href="/dashboard/admin/ads">Ads Control</Link>
          <Link href="/dashboard/admin/logs" className="activeNav">
            Logs
          </Link>
          <Link href="/">Home</Link>
        </nav>

        <div className="sideNote">
          <strong>Visibility</strong>
          <span>
            {currentRole === "super_admin"
              ? "Super admin can view all audit records."
              : "You can view only your own records."}
          </span>
        </div>
      </aside>

      <section className="mainArea">
        <header className="hero">
          <div>
            <p className="eyebrow">Sendio audit reference</p>
            <h1>Admin Activity Logs</h1>
            <p>
              Permanent, non-editable admin activity records for actions,
              moderation, messages, ads, reviews, users, and warnings.
            </p>
          </div>

          <div className="heroActions">
            <button type="button" onClick={() => router.back()}>
              Back
            </button>

            <Link href="/dashboard/admin">Control Center</Link>

            <button type="button" onClick={loadLogs}>
              Refresh
            </button>
          </div>
        </header>

        {pageError ? <p className="errorBox">{pageError}</p> : null}
        {pageMessage ? <p className="noticeBox">{pageMessage}</p> : null}

        <section className="summaryGrid">
          <article>
            <span>📋</span>
            <strong>{logs.length}</strong>
            <p>Loaded Logs</p>
          </article>

          <article>
            <span>📅</span>
            <strong>{dailyLogsCount}</strong>
            <p>Daily Logs</p>
          </article>

          <article>
            <span>🗓</span>
            <strong>{monthlyLogsCount}</strong>
            <p>Monthly Archive</p>
          </article>

          <article>
            <span>🗄</span>
            <strong>{quarterlyLogsCount}</strong>
            <p>Quarterly Archive</p>
          </article>

          {currentRole === "super_admin" ? (
            <article>
              <span>🔐</span>
              <strong>{yearlyLogsCount}</strong>
              <p>Yearly Archive</p>
            </article>
          ) : null}

          <article>
            <span>🔎</span>
            <strong>{filteredLogs.length}</strong>
            <p>Filtered Results</p>
          </article>
        </section>

        <section className="filtersPanel">
          <div className="modeSwitch">
            {LOG_MODE_OPTIONS.filter(
              (option) =>
                !option.superAdminOnly || currentRole === "super_admin",
            ).map((option) => (
              <button
                type="button"
                key={option.value}
                className={mode === option.value ? "activeMode" : ""}
                onClick={() => setMode(option.value)}
              >
                <span>{option.icon}</span>
                {option.label}
              </button>
            ))}
          </div>

          <div className="filtersGrid">
            <label>
              Keyword
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Search action, admin, company, comment, email..."
              />
            </label>

            <label>
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Month
              <select
                value={month}
                onChange={(event) => setMonth(event.target.value)}
              >
                {MONTH_OPTIONS.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Year
              <select
                value={year}
                onChange={(event) => setYear(event.target.value)}
              >
                <option value="all">All years</option>
                {yearOptions.map((item) => (
                  <option value={item} key={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="filterActions">
            <button type="button" onClick={handleExportCsv}>
              Export XLS / CSV
            </button>

            <button
              type="button"
              className="softButton"
              onClick={() => {
                setKeyword("");
                setCategory("all");
                setMonth("all");
                setYear(String(new Date().getFullYear()));
              }}
            >
              Clear Filters
            </button>
          </div>
        </section>

        <section className="categoryStrip">
          {CATEGORY_OPTIONS.filter((item) => item.value !== "all").map(
            (option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => setCategory(option.value)}
              >
                <strong>{visibleCategoryCounts.get(option.value) ?? 0}</strong>
                <span>{option.label}</span>
              </button>
            ),
          )}
        </section>

        <section className="logsPanel">
          <div className="panelHeader">
            <div>
              <h2>
                {
                  LOG_MODE_OPTIONS.find((option) => option.value === mode)
                    ?.label
                }
              </h2>

              <p>
                {currentRole === "super_admin"
                  ? "Showing logs allowed for super admin."
                  : "Showing only your own admin activity."}
              </p>
            </div>

            <span>{filteredLogs.length} records</span>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="emptyBox">
              <h3>No logs found</h3>
              <p>
                Try another month, category, or keyword. New admin actions will
                appear here after they are written to admin_audit_logs.
              </p>
            </div>
          ) : (
            <div className="logsList">
              {filteredLogs.map((log) => {
                const metadataText = getMetadataText(log.metadata);
                const friendlyMetadataRows = getFriendlyMetadataRows(log);

                return (
                  <article className="logItem" key={log.id}>
                    <div className="logTop">
                      <div>
                        <span className="categoryBadge">
                          {getCategoryLabel(log.category)}
                        </span>

                        <h3>{log.description || log.action}</h3>
                      </div>

                      <time>{formatDateTime(log.created_at)}</time>
                    </div>

                    <div className="logMeta">
                      <span>Admin: {getActorName(log, profilesById)}</span>
                      <span>Role: {log.actor_role || "system"}</span>
                      <span>Action: {log.action}</span>
                      <span>Target: {log.target_table || "system"}</span>
                      <span>Status: {getStatusLabel(log.status)}</span>
                      <span>
                        Level: {getArchiveLevelLabel(log.archive_level)}
                      </span>
                      <span>Period: {getArchivePeriodLabel(log)}</span>
                      <span>Access: {log.access_scope || "admin_allowed"}</span>
                    </div>

                    {friendlyMetadataRows.length > 0 ? (
                      <div className="friendlyMetaGrid">
                        {friendlyMetadataRows.map((row) => (
                          <span key={`${log.id}-${row.label}`}>
                            <strong>{row.label}</strong>
                            <em>{row.value}</em>
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {metadataText && currentRole === "super_admin" ? (
                      <details className="technicalDetails">
                        <summary>View technical details</summary>
                        <pre className="metadataBox">{metadataText}</pre>
                      </details>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="archiveNote">
          <h2>Archive rule</h2>
          <p>
            Sendio logs must never be permanently deleted. Daily logs show today
            only. Monthly archive keeps the current month except today.
            Quarterly archive keeps the previous months inside the last 3
            months. Yearly archive is reserved for super admin access and older
            protected records. Regular admins can retrieve only their own
            allowed records.
          </p>
        </section>
      </section>

      <style>{styles}</style>
    </main>
  );
}

const styles = `
  .logsPage {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 250px 1fr;
    background:
      radial-gradient(circle at top right, rgba(230, 187, 114, 0.18), transparent 34%),
      #fffaf1;
    color: #102b24;
    font-family: Inter, Arial, sans-serif;
  }

  .sideBar {
    background: linear-gradient(180deg, #004534, #002f25);
    color: white;
    padding: 26px 18px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #e6bb72;
    text-decoration: none;
    font-size: 27px;
    font-weight: 950;
  }

  .brandIcon {
    width: 42px;
    height: 42px;
    border-radius: 15px;
    border: 2px solid #e6bb72;
    display: grid;
    place-items: center;
  }

  .sideNav {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .sideNav a {
    color: rgba(255, 255, 255, 0.9);
    text-decoration: none;
    border-radius: 14px;
    padding: 13px 14px;
    font-size: 14px;
    font-weight: 850;
  }

  .sideNav a:hover,
  .activeNav {
    background: rgba(255, 255, 255, 0.12);
  }

  .sideNote {
    margin-top: auto;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.08);
    padding: 14px;
  }

  .sideNote strong,
  .sideNote span {
    display: block;
  }

  .sideNote span {
    margin-top: 5px;
    color: rgba(255, 255, 255, 0.78);
    font-size: 12px;
    font-weight: 750;
    line-height: 1.45;
  }

  .mainArea {
    padding: 28px;
    min-width: 0;
  }

  .hero,
  .filtersPanel,
  .logsPanel,
  .archiveNote,
  .summaryGrid article,
  .categoryStrip button {
    background: rgba(255, 255, 255, 0.88);
    border: 1px solid rgba(196, 151, 103, 0.18);
    box-shadow: 0 14px 34px rgba(16, 43, 36, 0.06);
  }

  .hero {
    border-radius: 24px;
    padding: 22px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 18px;
  }

  .eyebrow {
    margin: 0 0 7px;
    color: #b9823f;
    font-weight: 950;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-size: 12px;
  }

  .hero h1,
  .logsPanel h2,
  .archiveNote h2 {
    margin: 0;
    letter-spacing: -0.04em;
  }

  .hero h1 {
    font-size: 34px;
  }

  .hero p {
    margin: 8px 0 0;
    color: #63716d;
    font-weight: 750;
    line-height: 1.5;
  }

  .heroActions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
  }

  .heroActions a,
  .heroActions button,
  .filterActions button,
  .modeSwitch button {
    border: 0;
    border-radius: 13px;
    background: #004534;
    color: white;
    padding: 11px 14px;
    text-decoration: none;
    font-weight: 900;
    cursor: pointer;
  }

  .heroActions button:first-child,
  .filterActions .softButton,
  .modeSwitch button {
    background: white;
    color: #004534;
    border: 1px solid rgba(0, 69, 52, 0.18);
  }

  .modeSwitch .activeMode {
    background: #004534;
    color: white;
  }

  .modeSwitch button span {
    margin-right: 6px;
  }


  .noticeBox,
  .errorBox {
    margin: 16px 0 0;
    border-radius: 14px;
    padding: 12px 14px;
    font-weight: 900;
  }

  .noticeBox {
    background: rgba(18, 135, 82, 0.1);
    color: #0b6b40;
  }

  .errorBox {
    background: rgba(201, 48, 48, 0.1);
    color: #b62b2b;
  }

  .summaryGrid {
    margin-top: 18px;
    display: grid;
    grid-template-columns: repeat(5, minmax(140px, 1fr));
    gap: 14px;
  }

  .summaryGrid article {
    border-radius: 20px;
    padding: 16px;
  }

  .summaryGrid span {
    font-size: 22px;
  }

  .summaryGrid strong {
    display: block;
    margin-top: 8px;
    font-size: 28px;
  }

  .summaryGrid p {
    margin: 4px 0 0;
    color: #6d7b76;
    font-size: 13px;
    font-weight: 850;
  }

  .filtersPanel {
    margin-top: 18px;
    border-radius: 22px;
    padding: 17px;
  }

  .modeSwitch {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .filtersGrid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: minmax(220px, 1.4fr) repeat(3, minmax(140px, 0.75fr));
    gap: 12px;
  }

  .filtersGrid label {
    display: grid;
    gap: 7px;
    color: #102b24;
    font-size: 12px;
    font-weight: 950;
  }

  .filtersGrid input,
  .filtersGrid select {
    min-height: 42px;
    border-radius: 13px;
    border: 1px solid rgba(196, 151, 103, 0.22);
    background: white;
    color: #102b24;
    padding: 0 12px;
    font-size: 13px;
    font-weight: 800;
    outline: none;
  }

  .filterActions {
    margin-top: 14px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .categoryStrip {
    margin-top: 18px;
    display: grid;
    grid-template-columns: repeat(5, minmax(120px, 1fr));
    gap: 10px;
  }

  .categoryStrip button {
    border-radius: 16px;
    padding: 12px;
    color: #102b24;
    cursor: pointer;
    text-align: left;
  }

  .categoryStrip strong,
  .categoryStrip span {
    display: block;
  }

  .categoryStrip strong {
    font-size: 22px;
  }

  .categoryStrip span {
    margin-top: 3px;
    color: #6d7b76;
    font-size: 12px;
    font-weight: 850;
  }

  .logsPanel,
  .archiveNote {
    margin-top: 18px;
    border-radius: 22px;
    padding: 18px;
  }

  .panelHeader {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
  }

  .panelHeader h2 {
    font-size: 24px;
  }

  .panelHeader p,
  .archiveNote p {
    margin: 6px 0 0;
    color: #6d7b76;
    font-size: 13px;
    font-weight: 750;
    line-height: 1.55;
  }

  .panelHeader > span {
    border-radius: 999px;
    background: #dff3df;
    color: #0b6b40;
    padding: 7px 10px;
    font-size: 12px;
    font-weight: 950;
    white-space: nowrap;
  }

  .emptyBox {
    margin-top: 14px;
    border-radius: 18px;
    border: 1px dashed rgba(196, 151, 103, 0.35);
    background: #fffaf1;
    padding: 22px;
    text-align: center;
  }

  .emptyBox h3 {
    margin: 0;
    color: #004534;
  }

  .emptyBox p {
    margin: 8px auto 0;
    max-width: 560px;
    color: #6d7b76;
    font-weight: 750;
  }

  .logsList {
    margin-top: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .logItem {
    border-radius: 18px;
    border: 1px solid rgba(196, 151, 103, 0.16);
    background: #fffaf1;
    padding: 14px;
  }

  .logTop {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: flex-start;
  }

  .categoryBadge {
    display: inline-flex;
    width: fit-content;
    border-radius: 999px;
    background: #e7f3e5;
    color: #004534;
    padding: 5px 9px;
    font-size: 11px;
    font-weight: 950;
  }

  .logItem h3 {
    margin: 8px 0 0;
    color: #102b24;
    font-size: 15px;
    line-height: 1.35;
  }

  .logTop time {
    color: #6d7b76;
    font-size: 12px;
    font-weight: 900;
    white-space: nowrap;
  }

  .logMeta {
    margin-top: 11px;
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  .logMeta span {
    border-radius: 999px;
    background: white;
    border: 1px solid rgba(196, 151, 103, 0.16);
    padding: 5px 9px;
    color: #6d7b76;
    font-size: 11px;
    font-weight: 850;
  }


  .friendlyMetaGrid {
    margin-top: 12px;
    display: grid;
    grid-template-columns: repeat(2, minmax(180px, 1fr));
    gap: 8px;
  }

  .friendlyMetaGrid span {
    border-radius: 14px;
    background: white;
    border: 1px solid rgba(196, 151, 103, 0.16);
    padding: 9px 10px;
    min-width: 0;
  }

  .friendlyMetaGrid strong,
  .friendlyMetaGrid em {
    display: block;
  }

  .friendlyMetaGrid strong {
    color: #004534;
    font-size: 11px;
    font-weight: 950;
  }

  .friendlyMetaGrid em {
    margin-top: 4px;
    color: #53635f;
    font-size: 12px;
    font-style: normal;
    font-weight: 800;
    overflow-wrap: anywhere;
  }

  .technicalDetails {
    margin-top: 12px;
  }

  .technicalDetails summary {
    width: fit-content;
    border-radius: 999px;
    background: #e7f3e5;
    color: #004534;
    padding: 7px 11px;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
  }

  .metadataBox {
    margin: 12px 0 0;
    max-height: 220px;
    overflow: auto;
    border-radius: 14px;
    background: #102b24;
    color: #eaf7ee;
    padding: 12px;
    font-size: 12px;
    white-space: pre-wrap;
  }

  .loadingCard {
    width: min(720px, calc(100% - 40px));
    margin: 80px auto;
    background: white;
    border-radius: 22px;
    padding: 30px;
    box-shadow: 0 16px 36px rgba(16, 43, 36, 0.08);
  }

  @media (max-width: 1100px) {
    .logsPage {
      grid-template-columns: 1fr;
    }

    .sideBar {
      min-height: auto;
    }

    .summaryGrid,
    .filtersGrid,
    .categoryStrip,
    .friendlyMetaGrid {
      grid-template-columns: 1fr;
    }

    .hero,
    .logTop {
      flex-direction: column;
    }

    .heroActions {
      justify-content: flex-start;
    }
  }
`;
