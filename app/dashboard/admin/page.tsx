'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  user_type: string | null;
  role: string | null;
};

type AdminPermissionRow = {
  id: string;
  user_id: string;
  can_manage_settings: boolean;
  can_manage_pages: boolean;
  can_manage_navigation: boolean;
  can_manage_ads: boolean;
  can_manage_users: boolean;
  can_manage_companies: boolean;
  can_manage_workers: boolean;
  can_manage_clients: boolean;
  can_manage_reviews: boolean;
  can_manage_messages: boolean;
  can_moderate_content: boolean;
  can_view_audit_logs: boolean;
  can_manage_payments: boolean;
};

type AdminInviteRow = {
  id: string;
  name: string | null;
  email: string;
  status: string;
  created_at: string | null;
};

type PermissionKey =
  | 'can_manage_settings'
  | 'can_manage_pages'
  | 'can_manage_navigation'
  | 'can_manage_ads'
  | 'can_manage_users'
  | 'can_manage_companies'
  | 'can_manage_workers'
  | 'can_manage_clients'
  | 'can_manage_reviews'
  | 'can_manage_messages'
  | 'can_moderate_content'
  | 'can_view_audit_logs'
  | 'can_manage_payments';

type PermissionDraft = Record<PermissionKey, boolean>;

type DashboardCounts = {
  companies: number | null;
  workers: number | null;
  clients: number | null;
  companyReviews: number | null;
  workerReviews: number | null;
  totalAds: number | null;
  activeAds: number | null;
  companyMessages: number | null;
  workerRequests: number | null;
};

function emptyPermissionDraft(): PermissionDraft {
  return {
    can_manage_settings: false,
    can_manage_pages: false,
    can_manage_navigation: false,
    can_manage_ads: false,
    can_manage_users: false,
    can_manage_companies: false,
    can_manage_workers: false,
    can_manage_clients: false,
    can_manage_reviews: false,
    can_manage_messages: false,
    can_moderate_content: false,
    can_view_audit_logs: false,
    can_manage_payments: false,
  };
}

function getPermissionDraft(permission?: AdminPermissionRow | null): PermissionDraft {
  if (!permission) return emptyPermissionDraft();

  return {
    can_manage_settings: permission.can_manage_settings,
    can_manage_pages: permission.can_manage_pages,
    can_manage_navigation: permission.can_manage_navigation,
    can_manage_ads: permission.can_manage_ads,
    can_manage_users: permission.can_manage_users,
    can_manage_companies: permission.can_manage_companies,
    can_manage_workers: permission.can_manage_workers,
    can_manage_clients: permission.can_manage_clients,
    can_manage_reviews: permission.can_manage_reviews,
    can_manage_messages: permission.can_manage_messages,
    can_moderate_content: permission.can_moderate_content,
    can_view_audit_logs: permission.can_view_audit_logs,
    can_manage_payments: permission.can_manage_payments,
  };
}

function getDisplayName(profile: ProfileRow) {
  return profile.full_name?.trim() || 'Unnamed admin';
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getRoleLabel(role: string | null) {
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'admin') return 'Admin';
  return 'User';
}

function getAvatarLetter(profile: ProfileRow) {
  return getDisplayName(profile).charAt(0).toUpperCase();
}

function formatCount(value: number | null) {
  if (value === null) return '—';
  return value.toLocaleString();
}

function getTotalReviews(counts: DashboardCounts) {
  if (counts.companyReviews === null && counts.workerReviews === null) return null;
  return (counts.companyReviews ?? 0) + (counts.workerReviews ?? 0);
}

function getTotalMessages(counts: DashboardCounts) {
  if (counts.companyMessages === null && counts.workerRequests === null) return null;
  return (counts.companyMessages ?? 0) + (counts.workerRequests ?? 0);
}

export default function AdminDashboardPage() {
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [currentName, setCurrentName] = useState('');

  const [adminProfiles, setAdminProfiles] = useState<ProfileRow[]>([]);
  const [permissions, setPermissions] = useState<AdminPermissionRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PermissionDraft>>({});
  const [pendingInvites, setPendingInvites] = useState<AdminInviteRow[]>([]);

  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [search, setSearch] = useState('');

  const [counts, setCounts] = useState<DashboardCounts>({
    companies: null,
    workers: null,
    clients: null,
    companyReviews: null,
    workerReviews: null,
    totalAds: null,
    activeAds: null,
    companyMessages: null,
    workerRequests: null,
  });

  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const isSuperAdmin = currentRole === 'super_admin';

  const adminCount = useMemo(() => {
    return adminProfiles.filter((profile) => profile.role === 'admin').length;
  }, [adminProfiles]);

  const superAdminCount = useMemo(() => {
    return adminProfiles.filter((profile) => profile.role === 'super_admin').length;
  }, [adminProfiles]);

  const permissionsByUserId = useMemo(() => {
    const map = new Map<string, AdminPermissionRow>();

    permissions.forEach((permission) => {
      map.set(permission.user_id, permission);
    });

    return map;
  }, [permissions]);

  const filteredAdmins = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();

    if (!cleanSearch) return adminProfiles;

    return adminProfiles.filter((profile) =>
      [profile.full_name, profile.email, profile.role, profile.user_type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(cleanSearch)
    );
  }, [adminProfiles, search]);

  async function writeAuditLog(description: string, targetId?: string) {
    await supabase.from('admin_audit_logs').insert({
      actor_id: currentUserId,
      actor_role: currentRole,
      action: 'admin_dashboard',
      target_table: targetId ? 'profiles' : 'admin_invites',
      target_id: targetId || null,
      description,
    });
  }

  async function loadData() {
    setLoading(true);
    setError('');
    setNotice('');

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      setError('You must be logged in.');
      setLoading(false);
      return;
    }

    setCurrentUserId(authData.user.id);

    const { data: myProfile, error: myProfileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, user_type, role')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (myProfileError || !myProfile) {
      setError('Unable to read your admin profile.');
      setLoading(false);
      return;
    }

    const profile = myProfile as ProfileRow;

    setCurrentRole(profile.role);
    setCurrentName(profile.full_name || profile.email || 'Admin');

    if (profile.role !== 'super_admin' && profile.role !== 'admin') {
      setError('Only platform admins can access this page.');
      setLoading(false);
      return;
    }

    const [
      adminProfilesResult,
      permissionsResult,
      invitesResult,
      companiesResult,
      workersResult,
      clientsResult,
      companyReviewsResult,
      workerReviewsResult,
      adsResult,
      activeAdsResult,
      companyMessagesResult,
      workerRequestsResult,
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, user_type, role')
        .in('role', ['super_admin', 'admin'])
        .order('role', { ascending: false })
        .order('full_name', { ascending: true }),

      supabase.from('admin_permissions').select('*'),

      supabase
        .from('admin_invites')
        .select('id, name, email, status, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),

      supabase.from('companies').select('id', { count: 'exact', head: true }),
      supabase.from('workers').select('id', { count: 'exact', head: true }),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('user_type', 'client'),

      supabase.from('company_reviews').select('id', { count: 'exact', head: true }),
      supabase.from('worker_reviews').select('id', { count: 'exact', head: true }),

      supabase.from('company_ads').select('id', { count: 'exact', head: true }),
      supabase
        .from('company_ads')
        .select('id', { count: 'exact', head: true })
        .eq('active', true),

      supabase.from('company_messages').select('id', { count: 'exact', head: true }),
      supabase.from('worker_requests').select('id', { count: 'exact', head: true }),
    ]);

    if (adminProfilesResult.error) {
      setError(adminProfilesResult.error.message);
      setLoading(false);
      return;
    }

    if (permissionsResult.error) {
      setError(permissionsResult.error.message);
      setLoading(false);
      return;
    }

    if (invitesResult.error) {
      setError(invitesResult.error.message);
      setLoading(false);
      return;
    }

    const loadedAdmins = (adminProfilesResult.data ?? []) as ProfileRow[];
    const loadedPermissions = (permissionsResult.data ?? []) as AdminPermissionRow[];

    const nextDrafts: Record<string, PermissionDraft> = {};

    loadedAdmins.forEach((admin) => {
      const permission = loadedPermissions.find((item) => item.user_id === admin.id);
      nextDrafts[admin.id] = getPermissionDraft(permission);
    });

    setAdminProfiles(loadedAdmins);
    setPermissions(loadedPermissions);
    setPendingInvites((invitesResult.data ?? []) as AdminInviteRow[]);
    setDrafts(nextDrafts);

    setCounts({
      companies: companiesResult.error ? null : companiesResult.count ?? 0,
      workers: workersResult.error ? null : workersResult.count ?? 0,
      clients: clientsResult.error ? null : clientsResult.count ?? 0,
      companyReviews: companyReviewsResult.error ? null : companyReviewsResult.count ?? 0,
      workerReviews: workerReviewsResult.error ? null : workerReviewsResult.count ?? 0,
      totalAds: adsResult.error ? null : adsResult.count ?? 0,
      activeAds: activeAdsResult.error ? null : activeAdsResult.count ?? 0,
      companyMessages: companyMessagesResult.error ? null : companyMessagesResult.count ?? 0,
      workerRequests: workerRequestsResult.error ? null : workerRequestsResult.count ?? 0,
    });

    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadData();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  function updateDraft(
    userId: string,
    permissionKey: PermissionKey,
    checked: boolean
  ) {
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [userId]: {
        ...(currentDrafts[userId] ?? emptyPermissionDraft()),
        [permissionKey]: checked,
      },
    }));
  }

  function renderPermissionButton(
    profile: ProfileRow,
    key: PermissionKey,
    icon: string,
    title: string
  ) {
    const isProtectedSuperAdmin = profile.role === 'super_admin';
    const isRegularAdmin = profile.role === 'admin';
    const draft = drafts[profile.id] ?? emptyPermissionDraft();
    const checked = isProtectedSuperAdmin || draft[key];

    return (
      <button
        type="button"
        className={checked ? 'permissionIcon activePermissionIcon' : 'permissionIcon'}
        title={title}
        aria-label={title}
        disabled={!isSuperAdmin || !isRegularAdmin || isProtectedSuperAdmin}
        onClick={() => {
          if (!isSuperAdmin || !isRegularAdmin || isProtectedSuperAdmin) return;
          updateDraft(profile.id, key, !draft[key]);
        }}
      >
        {icon}
      </button>
    );
  }

  async function savePermissions(profile: ProfileRow) {
    if (!isSuperAdmin || profile.role !== 'admin') return;

    setError('');
    setNotice('');
    setSavingUserId(profile.id);

    const draft = drafts[profile.id] ?? emptyPermissionDraft();

    const { error: permissionError } = await supabase
      .from('admin_permissions')
      .upsert(
        {
          user_id: profile.id,
          can_manage_admins: false,
          ...draft,
          updated_by: currentUserId,
        },
        { onConflict: 'user_id' }
      );

    if (permissionError) {
      setError(permissionError.message);
      setSavingUserId(null);
      return;
    }

    await writeAuditLog(`Updated permissions for ${getDisplayName(profile)}.`, profile.id);

    setNotice('Permissions saved.');
    setSavingUserId(null);
    await loadData();
  }

  async function removeAdmin(profile: ProfileRow) {
    if (!isSuperAdmin || profile.role !== 'admin') return;

    const confirmed = window.confirm(`Remove admin role from ${getDisplayName(profile)}?`);
    if (!confirmed) return;

    setError('');
    setNotice('');
    setSavingUserId(profile.id);

    const { error: roleError } = await supabase
      .from('profiles')
      .update({ role: null })
      .eq('id', profile.id);

    if (roleError) {
      setError(roleError.message);
      setSavingUserId(null);
      return;
    }

    await supabase.from('admin_permissions').delete().eq('user_id', profile.id);
    await writeAuditLog(`Removed admin role from ${getDisplayName(profile)}.`, profile.id);

    setNotice('Admin removed.');
    setSavingUserId(null);
    await loadData();
  }

  async function handleAddAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isSuperAdmin) return;

    setError('');
    setNotice('');
    setAddingAdmin(true);

    const cleanEmail = normalizeEmail(inviteEmail);
    const cleanName = inviteName.trim();

    if (!cleanEmail) {
      setError('Email is required.');
      setAddingAdmin(false);
      return;
    }

    if (adminCount >= 5) {
      setError('Maximum number of admins is 5.');
      setAddingAdmin(false);
      return;
    }

    const { data: profileByEmail, error: profileSearchError } = await supabase
      .from('profiles')
      .select('id, full_name, email, user_type, role')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (profileSearchError) {
      setError(profileSearchError.message);
      setAddingAdmin(false);
      return;
    }

    if (profileByEmail) {
      const targetProfile = profileByEmail as ProfileRow;

      if (targetProfile.role === 'super_admin') {
        setError('The super_admin cannot be changed.');
        setAddingAdmin(false);
        return;
      }

      const { error: updateRoleError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', targetProfile.id);

      if (updateRoleError) {
        setError(updateRoleError.message);
        setAddingAdmin(false);
        return;
      }

      await supabase.from('admin_permissions').upsert(
        {
          user_id: targetProfile.id,
          can_manage_admins: false,
          ...emptyPermissionDraft(),
          created_by: currentUserId,
          updated_by: currentUserId,
        },
        { onConflict: 'user_id' }
      );

      await supabase
        .from('admin_invites')
        .update({
          status: 'accepted',
          accepted_by: targetProfile.id,
          accepted_at: new Date().toISOString(),
        })
        .eq('status', 'pending')
        .eq('email', cleanEmail);

      await writeAuditLog(
        `Assigned admin by email ${cleanEmail}.`,
        targetProfile.id
      );

      setNotice('Registered user was assigned as admin.');
      setInviteName('');
      setInviteEmail('');
      setAddingAdmin(false);
      await loadData();
      return;
    }

    const { error: inviteError } = await supabase.from('admin_invites').insert({
      name: cleanName || null,
      email: cleanEmail,
      invited_by: currentUserId,
      status: 'pending',
      note:
        'Pending admin invite. Email delivery should be connected through official email function later.',
    });

    if (inviteError) {
      setError(inviteError.message);
      setAddingAdmin(false);
      return;
    }

    await writeAuditLog(`Created pending admin invite for ${cleanEmail}.`);

    setNotice('Pending admin invite created.');
    setInviteName('');
    setInviteEmail('');
    setAddingAdmin(false);
    await loadData();
  }

  async function cancelInvite(invite: AdminInviteRow) {
    if (!isSuperAdmin) return;

    const confirmed = window.confirm(`Cancel invite for ${invite.email}?`);
    if (!confirmed) return;

    const { error: cancelError } = await supabase
      .from('admin_invites')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', invite.id);

    if (cancelError) {
      setError(cancelError.message);
      return;
    }

    await writeAuditLog(`Cancelled admin invite for ${invite.email}.`);
    setNotice('Invite cancelled.');
    await loadData();
  }

  if (loading) {
    return (
      <main className="pageShell">
        <section className="loadingCard">
          <h1>Admin Control Center</h1>
          <p>Loading admin data...</p>
        </section>

        <style>{styles}</style>
      </main>
    );
  }

  if (currentRole !== 'super_admin' && currentRole !== 'admin') {
    return (
      <main className="pageShell">
        <section className="loadingCard">
          <h1>Access denied</h1>
          <p>{error || 'Only admins can access this area.'}</p>
        </section>

        <style>{styles}</style>
      </main>
    );
  }

  return (
    <main className="pageShell">
      <aside className="sideBar">
        <Link href="/" className="brand">
          <span className="brandIcon">S</span>
          <span>Sendio</span>
        </Link>

        <nav className="sideNav">
          <a href="#overview" className="activeNav">Dashboard</a>
          <a href="#admins">Admins</a>
          <Link href="/dashboard/admin/moderation">Moderation</Link>
          <Link href="/dashboard/admin/ads">Ads</Link>
          <Link href="/dashboard/admin/admins">Admin Team</Link>
          <a href="#logs">Logs</a>
        </nav>

        <div className="sideUser">
          <div className="sideAvatar">{currentName.charAt(0).toUpperCase()}</div>
          <div>
            <strong>{currentName}</strong>
            <span>{currentRole}</span>
          </div>
        </div>
      </aside>

      <section className="mainArea">
        <header className="topHeader">
          <div>
            <h1>Admin Control Center</h1>
            <p>Manage Sendio platform with control and confidence.</p>
          </div>

          <div className="protectedPill">🛡 Super admin is protected and cannot be changed.</div>
        </header>

        {notice ? <p className="notice">{notice}</p> : null}
        {error ? <p className="error">{error}</p> : null}

        <section className="statsGrid" id="overview">
          <article className="statCard">
            <span>🏢</span>
            <strong>{formatCount(counts.companies)}</strong>
            <p>Companies</p>
          </article>

          <article className="statCard">
            <span>👥</span>
            <strong>{formatCount(counts.workers)}</strong>
            <p>Workers</p>
          </article>

          <article className="statCard">
            <span>👤</span>
            <strong>{formatCount(counts.clients)}</strong>
            <p>Clients</p>
          </article>

          <article className="statCard">
            <span>⭐</span>
            <strong>{formatCount(getTotalReviews(counts))}</strong>
            <p>Reviews</p>
          </article>

          <article className="statCard">
            <span>📣</span>
            <strong>{formatCount(counts.totalAds)}</strong>
            <p>Total Ads</p>
          </article>

          <article className="statCard">
            <span>🛡</span>
            <strong>{adminCount}</strong>
            <p>Active Admins</p>
          </article>

          <article className="statCard">
            <span>✉️</span>
            <strong>{pendingInvites.length}</strong>
            <p>Pending Invites</p>
          </article>

          <article className="statCard">
            <span>💬</span>
            <strong>{formatCount(getTotalMessages(counts))}</strong>
            <p>Messages</p>
          </article>
        </section>

        <section className="controlGrid" id="admins">
          <section className="panel adminPanel">
            <div className="panelHeader">
              <div>
                <h2>Admin Management</h2>
                <p>Only current admins and pending invites are shown here.</p>
              </div>

              <button type="button" onClick={loadData}>Refresh</button>
            </div>

            <input
              className="searchInput"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search current admins..."
            />

            <div className="compactTable">
              <div className="compactHeader">
                <span>Admin</span>
                <span>Role</span>
                <span>Permissions</span>
                <span>Action</span>
              </div>

              {filteredAdmins.map((profile) => {
                const isProtectedSuperAdmin = profile.role === 'super_admin';
                const isRegularAdmin = profile.role === 'admin';
                const savedPermission = permissionsByUserId.get(profile.id);
                const isSaving = savingUserId === profile.id;

                return (
                  <article className="compactRow" key={profile.id}>
                    <div className="adminIdentity">
                      <div className={isProtectedSuperAdmin ? 'adminAvatar ownerAvatar' : 'adminAvatar'}>
                        {getAvatarLetter(profile)}
                      </div>

                      <div>
                        <strong>{getDisplayName(profile)}</strong>
                        {profile.email ? <small>{profile.email}</small> : null}
                      </div>
                    </div>

                    <div>
                      <span className={isProtectedSuperAdmin ? 'roleBadge ownerRole' : 'roleBadge'}>
                        {getRoleLabel(profile.role)}
                      </span>
                    </div>

                    <div className="permissionStrip">
                      {renderPermissionButton(profile, 'can_manage_settings', '🛡', 'Settings')}
                      {renderPermissionButton(profile, 'can_manage_pages', '📄', 'Pages')}
                      {renderPermissionButton(profile, 'can_manage_navigation', '🧭', 'Navigation')}
                      {renderPermissionButton(profile, 'can_manage_ads', '📣', 'Ads')}
                      {renderPermissionButton(profile, 'can_manage_users', '👥', 'Users')}
                      {renderPermissionButton(profile, 'can_manage_companies', '🏢', 'Companies')}
                      {renderPermissionButton(profile, 'can_manage_workers', '💼', 'Workers')}
                      {renderPermissionButton(profile, 'can_manage_clients', '👤', 'Clients')}
                      {renderPermissionButton(profile, 'can_manage_reviews', '⭐', 'Reviews')}
                      {renderPermissionButton(profile, 'can_manage_messages', '💬', 'Messages')}
                      {renderPermissionButton(profile, 'can_moderate_content', '👁', 'Moderation')}
                      {renderPermissionButton(profile, 'can_view_audit_logs', '📋', 'Audit Logs')}
                      {renderPermissionButton(profile, 'can_manage_payments', '💳', 'Payments')}
                    </div>

                    <div className="rowActions">
                      {isProtectedSuperAdmin ? (
                        <span className="protectedText">Protected</span>
                      ) : isRegularAdmin ? (
                        <>
                          <button
                            type="button"
                            onClick={() => savePermissions(profile)}
                            disabled={isSaving || !isSuperAdmin}
                          >
                            Save
                          </button>

                          <button
                            type="button"
                            className="dangerButton"
                            onClick={() => removeAdmin(profile)}
                            disabled={isSaving || !isSuperAdmin}
                          >
                            Remove
                          </button>

                          {savedPermission ? <small>Saved</small> : null}
                        </>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="rightColumn">
            <form className="panel invitePanel" onSubmit={handleAddAdmin}>
              <h2>Invite Admin</h2>
              <p>Enter an email. If the user exists, they become admin directly.</p>

              <label>
                Full Name
                <input
                  value={inviteName}
                  onChange={(event) => setInviteName(event.target.value)}
                  placeholder="Optional name"
                  disabled={!isSuperAdmin}
                />
              </label>

              <label>
                Email Address
                <input
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="Email"
                  type="email"
                  disabled={!isSuperAdmin}
                />
              </label>

              <button type="submit" disabled={!isSuperAdmin || addingAdmin || adminCount >= 5}>
                {addingAdmin ? 'Saving...' : 'Assign / Invite'}
              </button>
            </form>

            <section className="panel invitePanel">
              <h2>Pending Invites</h2>

              {pendingInvites.length === 0 ? (
                <p>No pending admin invites.</p>
              ) : (
                pendingInvites.map((invite) => (
                  <article className="inviteItem" key={invite.id}>
                    <div>
                      <strong>{invite.email}</strong>
                      {invite.name ? <span>{invite.name}</span> : null}
                    </div>

                    {isSuperAdmin ? (
                      <button type="button" onClick={() => cancelInvite(invite)}>
                        Cancel
                      </button>
                    ) : null}
                  </article>
                ))
              )}
            </section>
          </aside>
        </section>

        <section className="panel shortcutsPanel" id="settings">
          <h2>Platform Shortcuts</h2>
          <p>Quick access to key control panels.</p>

          <div className="shortcutsGrid">
            <Link href="/dashboard/admin/ads">📣 Ads Control</Link>
            <Link href="/dashboard/admin/moderation">💬 Moderation</Link>
            <Link href="/dashboard/admin/settings">⚙ Platform Settings</Link>
            <span>🏢 Companies</span>
            <span>👥 Workers</span>
            <span>👤 Clients</span>
            <span>⭐ Reviews</span>
            <span id="logs">📋 Logs</span>
          </div>
        </section>

        <section className="protectedNote">
          🔒 The Super Admin account is permanently protected and cannot be removed,
          downgraded, or replaced by any admin.
        </section>
      </section>

      <style>{styles}</style>
    </main>
  );
}

const styles = `
  .pageShell {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 255px 1fr;
    background: #fffaf1;
    color: #102b24;
    font-family: Inter, Arial, sans-serif;
  }

  .sideBar {
    background: linear-gradient(180deg, #004534, #003326);
    color: white;
    padding: 28px 18px;
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
    font-size: 28px;
    font-weight: 950;
  }

  .brandIcon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
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
    font-weight: 850;
  }

  .sideNav a:hover,
  .activeNav {
    background: rgba(255, 255, 255, 0.12);
  }

  .sideUser {
    margin-top: auto;
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    padding: 15px;
  }

  .sideAvatar {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: #6b54c8;
    display: grid;
    place-items: center;
    font-weight: 950;
  }

  .sideUser strong,
  .sideUser span {
    display: block;
  }

  .sideUser span {
    color: #e6bb72;
    font-size: 12px;
    font-weight: 850;
  }

  .mainArea {
    padding: 30px;
    min-width: 0;
  }

  .topHeader {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: flex-start;
  }

  .topHeader h1 {
    margin: 0;
    font-size: 34px;
    letter-spacing: -0.04em;
  }

  .topHeader p {
    margin: 8px 0 0;
    color: #536560;
    font-weight: 700;
  }

  .protectedPill {
    background: #fff4dd;
    border: 1px solid rgba(196, 151, 103, 0.28);
    border-radius: 12px;
    padding: 12px 14px;
    font-size: 13px;
    font-weight: 850;
  }

  .notice,
  .error {
    margin-top: 16px;
    border-radius: 14px;
    padding: 12px 14px;
    font-weight: 900;
  }

  .notice {
    background: rgba(18, 135, 82, 0.1);
    color: #0b6b40;
  }

  .error {
    background: rgba(201, 48, 48, 0.1);
    color: #b62b2b;
  }

  .statsGrid {
    margin-top: 24px;
    display: grid;
    grid-template-columns: repeat(8, minmax(120px, 1fr));
    gap: 12px;
  }

  .statCard,
  .panel {
    background: rgba(255, 255, 255, 0.82);
    border: 1px solid rgba(196, 151, 103, 0.18);
    border-radius: 18px;
    box-shadow: 0 12px 28px rgba(16, 43, 36, 0.06);
  }

  .statCard {
    padding: 14px;
  }

  .statCard span {
    font-size: 20px;
  }

  .statCard strong {
    display: block;
    margin-top: 8px;
    font-size: 24px;
  }

  .statCard p {
    margin: 4px 0 0;
    color: #6d7b76;
    font-size: 12px;
    font-weight: 850;
  }

  .controlGrid {
    margin-top: 18px;
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) 360px;
    gap: 16px;
  }

  .panel {
    padding: 16px;
  }

  .panelHeader {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
  }

  .panel h2 {
    margin: 0;
    font-size: 22px;
  }

  .panel p {
    margin: 6px 0 0;
    color: #6d7b76;
    font-size: 13px;
    font-weight: 700;
  }

  .panelHeader button,
  .invitePanel button,
  .rowActions button {
    border: 0;
    border-radius: 10px;
    background: #004534;
    color: white;
    font-weight: 900;
    padding: 10px 12px;
    cursor: pointer;
  }

  .searchInput,
  .invitePanel input {
    width: 100%;
    border: 1px solid rgba(196, 151, 103, 0.22);
    border-radius: 12px;
    padding: 11px 12px;
    margin-top: 14px;
    background: white;
    outline: none;
    font-weight: 750;
  }

  .compactTable {
    margin-top: 14px;
    border: 1px solid rgba(196, 151, 103, 0.16);
    border-radius: 14px;
    overflow: hidden;
  }

  .compactHeader,
  .compactRow {
    display: grid;
    grid-template-columns: 230px 110px 1fr 118px;
    align-items: center;
  }

  .compactHeader {
    background: rgba(196, 151, 103, 0.08);
    padding: 10px 12px;
    font-size: 12px;
    font-weight: 950;
  }

  .compactRow {
    border-top: 1px solid rgba(196, 151, 103, 0.14);
    min-height: 72px;
    padding: 8px 12px;
    gap: 10px;
  }

  .adminIdentity {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .adminAvatar {
    width: 42px;
    height: 42px;
    min-width: 42px;
    border-radius: 50%;
    background: #5549bb;
    color: white;
    display: grid;
    place-items: center;
    font-weight: 950;
  }

  .ownerAvatar {
    background: #004534;
  }

  .adminIdentity strong,
  .adminIdentity small {
    display: block;
  }

  .adminIdentity small {
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #6d7b76;
    font-size: 11px;
    font-weight: 750;
  }

  .roleBadge {
    display: inline-flex;
    border-radius: 8px;
    padding: 6px 9px;
    background: #f2d196;
    color: #4d3210;
    font-size: 12px;
    font-weight: 950;
  }

  .ownerRole {
    background: #cdebcf;
    color: #004534;
  }

  .permissionStrip {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .permissionIcon {
    width: 28px;
    height: 28px;
    border: 1px solid rgba(16, 43, 36, 0.12);
    border-radius: 8px;
    background: #f3eee6;
    display: grid;
    place-items: center;
    cursor: pointer;
    font-size: 13px;
  }

  .activePermissionIcon {
    background: #004534;
    color: white;
  }

  .permissionIcon:disabled {
    cursor: default;
  }

  .rowActions {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .rowActions button {
    padding: 8px 9px;
    font-size: 12px;
  }

  .rowActions .dangerButton {
    background: white;
    color: #d22;
    border: 1px solid rgba(210, 34, 34, 0.3);
  }

  .rowActions small,
  .protectedText {
    color: #0b6b40;
    font-size: 11px;
    font-weight: 900;
  }

  .rightColumn {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .invitePanel label {
    display: block;
    margin-top: 12px;
    font-size: 12px;
    font-weight: 900;
  }

  .invitePanel button {
    width: 100%;
    margin-top: 14px;
  }

  .inviteItem {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(196, 151, 103, 0.16);
    display: flex;
    justify-content: space-between;
    gap: 10px;
  }

  .inviteItem strong,
  .inviteItem span {
    display: block;
  }

  .inviteItem span {
    color: #6d7b76;
    font-size: 12px;
    font-weight: 750;
  }

  .inviteItem button {
    width: auto;
    background: white;
    color: #d22;
    border: 1px solid rgba(210, 34, 34, 0.3);
  }

  .shortcutsPanel {
    margin-top: 16px;
  }

  .shortcutsGrid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(8, minmax(110px, 1fr));
    gap: 10px;
  }

  .shortcutsGrid a,
  .shortcutsGrid span {
    text-decoration: none;
    color: #102b24;
    background: #fffaf1;
    border: 1px solid rgba(196, 151, 103, 0.18);
    border-radius: 14px;
    padding: 13px;
    font-size: 13px;
    font-weight: 900;
  }

  .protectedNote {
    margin-top: 16px;
    background: rgba(16, 86, 64, 0.08);
    border: 1px solid rgba(16, 86, 64, 0.16);
    border-radius: 14px;
    padding: 13px 15px;
    font-weight: 850;
  }

  .loadingCard {
    width: min(720px, calc(100% - 40px));
    margin: 80px auto;
    background: white;
    border-radius: 20px;
    padding: 30px;
  }

  @media (max-width: 1200px) {
    .pageShell {
      grid-template-columns: 1fr;
    }

    .sideBar {
      min-height: auto;
    }

    .statsGrid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .controlGrid {
      grid-template-columns: 1fr;
    }

    .compactHeader {
      display: none;
    }

    .compactRow {
      grid-template-columns: 1fr;
    }

    .shortcutsGrid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
`;