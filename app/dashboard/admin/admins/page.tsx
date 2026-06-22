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
  id?: string;
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

type AuditLogRow = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  description: string | null;
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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getDisplayName(profile: ProfileRow) {
  return profile.full_name?.trim() || profile.email || 'Unnamed admin';
}

function getAvatar(profile: ProfileRow) {
  return getDisplayName(profile).charAt(0).toUpperCase();
}

function getRoleLabel(role: string | null) {
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'admin') return 'Admin';
  return 'User';
}

function formatDate(value: string | null) {
  if (!value) return 'Not available';

  return new Date(value).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function AdminTeamPage() {
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<ProfileRow | null>(null);

  const [adminProfiles, setAdminProfiles] = useState<ProfileRow[]>([]);
  const [permissions, setPermissions] = useState<AdminPermissionRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PermissionDraft>>({});
  const [pendingInvites, setPendingInvites] = useState<AdminInviteRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);

  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const isSuperAdmin = currentRole === 'super_admin';

  const activeAdminsCount = useMemo(() => {
    return adminProfiles.filter((profile) => profile.role === 'admin').length;
  }, [adminProfiles]);

  const superAdminCount = useMemo(() => {
    return adminProfiles.filter((profile) => profile.role === 'super_admin').length;
  }, [adminProfiles]);

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

  const permissionsByUserId = useMemo(() => {
    const map = new Map<string, AdminPermissionRow>();

    permissions.forEach((permission) => {
      map.set(permission.user_id, permission);
    });

    return map;
  }, [permissions]);

  async function writeAuditLog(description: string, targetId?: string) {
    if (!currentUserId) return;

    await supabase.from('admin_audit_logs').insert({
      actor_id: currentUserId,
      actor_role: currentRole,
      action: 'admin_team',
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

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, user_type, role')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profileError || !profileData) {
      setError('Unable to read your profile.');
      setLoading(false);
      return;
    }

    const myProfile = profileData as ProfileRow;

    setCurrentProfile(myProfile);
    setCurrentRole(myProfile.role);

    if (myProfile.role !== 'super_admin' && myProfile.role !== 'admin') {
      setError('Only admins can access Admin Team.');
      setLoading(false);
      return;
    }

    let adminQuery = supabase
      .from('profiles')
      .select('id, full_name, email, user_type, role')
      .order('role', { ascending: false })
      .order('full_name', { ascending: true });

    let permissionQuery = supabase.from('admin_permissions').select('*');

    if (myProfile.role === 'super_admin') {
      adminQuery = adminQuery.in('role', ['super_admin', 'admin']);
    } else {
      adminQuery = adminQuery.eq('id', authData.user.id);
      permissionQuery = permissionQuery.eq('user_id', authData.user.id);
    }

    const logsQuery =
      myProfile.role === 'super_admin'
        ? supabase
            .from('admin_audit_logs')
            .select('id, actor_id, actor_role, action, target_table, target_id, description, created_at')
            .order('created_at', { ascending: false })
            .limit(30)
        : supabase
            .from('admin_audit_logs')
            .select('id, actor_id, actor_role, action, target_table, target_id, description, created_at')
            .eq('actor_id', authData.user.id)
            .order('created_at', { ascending: false })
            .limit(15);

    const invitesQuery = supabase
      .from('admin_invites')
      .select('id, name, email, status, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    const [adminsResult, permissionsResult, logsResult, invitesResult] =
      myProfile.role === 'super_admin'
        ? await Promise.all([adminQuery, permissionQuery, logsQuery, invitesQuery])
        : await Promise.all([adminQuery, permissionQuery, logsQuery, Promise.resolve(null)]);

    if (adminsResult.error) {
      setError(adminsResult.error.message);
      setLoading(false);
      return;
    }

    if (permissionsResult.error) {
      setError(permissionsResult.error.message);
      setLoading(false);
      return;
    }

    if (logsResult.error) {
      setError(logsResult.error.message);
      setLoading(false);
      return;
    }

    if (isSuperAdmin && invitesResult && invitesResult.error) {
      setError(invitesResult.error.message);
      setLoading(false);
      return;
    }

    const loadedAdmins = (adminsResult.data ?? []) as ProfileRow[];
    const loadedPermissions = (permissionsResult.data ?? []) as AdminPermissionRow[];

    const nextDrafts: Record<string, PermissionDraft> = {};

    loadedAdmins.forEach((admin) => {
      const permission = loadedPermissions.find((item) => item.user_id === admin.id);
      nextDrafts[admin.id] = getPermissionDraft(permission);
    });

    setAdminProfiles(loadedAdmins);
    setPermissions(loadedPermissions);
    setDrafts(nextDrafts);
    setAuditLogs((logsResult.data ?? []) as AuditLogRow[]);

    if (myProfile.role === 'super_admin' && invitesResult) {
      setPendingInvites((invitesResult.data ?? []) as AdminInviteRow[]);
    } else {
      setPendingInvites([]);
    }

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

  function updateDraft(userId: string, key: PermissionKey, checked: boolean) {
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [userId]: {
        ...(currentDrafts[userId] ?? emptyPermissionDraft()),
        [key]: checked,
      },
    }));
  }

  function renderPermissionButton(
    profile: ProfileRow,
    key: PermissionKey,
    icon: string,
    label: string
  ) {
    const isOwner = profile.role === 'super_admin';
    const isAdmin = profile.role === 'admin';
    const draft = drafts[profile.id] ?? emptyPermissionDraft();
    const checked = isOwner || draft[key];

    return (
      <button
        type="button"
        className={checked ? 'permissionCell activePermission' : 'permissionCell'}
        title={label}
        disabled={!isSuperAdmin || !isAdmin || isOwner}
        onClick={() => {
          if (!isSuperAdmin || !isAdmin || isOwner) return;
          updateDraft(profile.id, key, !draft[key]);
        }}
      >
        <span>{icon}</span>
        <small>{label}</small>
      </button>
    );
  }

  async function savePermissions(profile: ProfileRow) {
    if (!isSuperAdmin || profile.role !== 'admin') return;

    setError('');
    setNotice('');
    setSavingUserId(profile.id);

    const draft = drafts[profile.id] ?? emptyPermissionDraft();

    const { error: permissionError } = await supabase.from('admin_permissions').upsert(
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

    setNotice('Permissions saved successfully.');
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

    setNotice('Admin removed successfully.');
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

    if (activeAdminsCount >= 5) {
      setError('Maximum regular admins is 5.');
      setAddingAdmin(false);
      return;
    }

    const { data: foundProfile, error: foundProfileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, user_type, role')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (foundProfileError) {
      setError(foundProfileError.message);
      setAddingAdmin(false);
      return;
    }

    if (foundProfile) {
      const targetProfile = foundProfile as ProfileRow;

      if (targetProfile.role === 'super_admin') {
        setError('Super Admin cannot be changed.');
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

      await writeAuditLog(`Assigned admin role to ${cleanEmail}.`, targetProfile.id);

      setNotice('Registered user assigned as admin.');
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
      note: 'Pending admin invite.',
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

    await writeAuditLog(`Cancelled pending admin invite for ${invite.email}.`);

    setNotice('Invite cancelled.');
    await loadData();
  }

  if (loading) {
    return (
      <main className="pageShell">
        <section className="loadingCard">
          <h1>Admin Team</h1>
          <p>Loading admin team...</p>
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
          <p>{error || 'Only admins can access this page.'}</p>
          <Link href="/">Home</Link>
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
          {isSuperAdmin ? <Link href="/dashboard/admin">Control Center</Link> : null}
          <Link href="/dashboard/admin/admins" className="activeNav">Admin Team</Link>
          <Link href="/dashboard/admin/moderation">Moderation</Link>
          <Link href="/dashboard/admin/ads">Ads Control</Link>
          <Link href="/">Home</Link>
        </nav>

        <div className="sideUser">
          <div className="sideAvatar">{currentProfile ? getAvatar(currentProfile) : 'A'}</div>
          <div>
            <strong>{currentProfile ? getDisplayName(currentProfile) : 'Admin'}</strong>
            <span>{currentRole}</span>
          </div>
        </div>
      </aside>

      <section className="mainArea">
        <header className="hero">
          <div>
            <p className="eyebrow">Administration</p>
            <h1>Admin Team</h1>
            <p>Manage admins, permissions, invites, and activity.</p>
          </div>

          <div className="heroActions">
            <Link href="/">Home</Link>

            {isSuperAdmin ? (
              <Link href="/dashboard/admin">Control Center</Link>
            ) : null}

            <Link href="/dashboard/admin/moderation">Next</Link>
          </div>
        </header>

        {notice ? <p className="notice">{notice}</p> : null}
        {error ? <p className="error">{error}</p> : null}

        <section className="summaryGrid">
          <article>
            <span>👑</span>
            <strong>{superAdminCount}</strong>
            <p>Super Admin</p>
          </article>

          <article>
            <span>🛡</span>
            <strong>{activeAdminsCount}</strong>
            <p>Admins</p>
          </article>

          <article>
            <span>✉️</span>
            <strong>{pendingInvites.length}</strong>
            <p>Pending Invites</p>
          </article>

          <article>
            <span>📋</span>
            <strong>{auditLogs.length}</strong>
            <p>Recent Activity</p>
          </article>
        </section>

        <section className="contentGrid">
          <section className="panel teamPanel">
            <div className="panelHeader">
              <div>
                <h2>Admins & Permissions</h2>
                <p>
                  {isSuperAdmin
                    ? 'Activate permissions and manage admin access.'
                    : 'View your admin role and granted permissions.'}
                </p>
              </div>

              <button type="button" onClick={loadData}>Refresh</button>
            </div>

            {isSuperAdmin ? (
              <input
                className="searchInput"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search admin by name or email..."
              />
            ) : null}

            <div className="adminTable">
              <div className="tableHead">
                <span>Admin</span>
                <span>Role</span>
                <span>Permissions</span>
                <span>Status</span>
                <span>Actions</span>
              </div>

              {filteredAdmins.map((profile) => {
                const isOwner = profile.role === 'super_admin';
                const isAdmin = profile.role === 'admin';
                const isSaving = savingUserId === profile.id;
                const savedPermission = permissionsByUserId.get(profile.id);
                const draft = drafts[profile.id] ?? emptyPermissionDraft();
                const permissionCount = isOwner
                  ? 13
                  : Object.values(draft).filter(Boolean).length;

                return (
                  <article className="tableRow" key={profile.id}>
                    <div className="adminIdentity">
                      <div className={isOwner ? 'avatar ownerAvatar' : 'avatar'}>
                        {getAvatar(profile)}
                      </div>

                      <div>
                        <strong>{getDisplayName(profile)}</strong>
                        {profile.email ? <small>{profile.email}</small> : null}
                      </div>
                    </div>

                    <span className={isOwner ? 'roleBadge ownerBadge' : 'roleBadge'}>
                      {getRoleLabel(profile.role)}
                    </span>

                    <div className="permissionSummary">
                      <strong>{isOwner ? 'All Access' : `${permissionCount} / 13`}</strong>
                      <div className="permissionsGrid">
                        {renderPermissionButton(profile, 'can_manage_settings', '⚙', 'Settings')}
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
                        {renderPermissionButton(profile, 'can_view_audit_logs', '📋', 'Logs')}
                        {renderPermissionButton(profile, 'can_manage_payments', '💳', 'Payments')}
                      </div>
                    </div>

                    <span className="statusBadge">Active</span>

                    <div className="adminActions">
                      {isOwner ? (
                        <span className="protectedBadge">Protected</span>
                      ) : isAdmin && isSuperAdmin ? (
                        <>
                          <button
                            type="button"
                            onClick={() => savePermissions(profile)}
                            disabled={isSaving}
                          >
                            {isSaving ? 'Saving...' : 'Save'}
                          </button>

                          <button
                            type="button"
                            className="dangerButton"
                            onClick={() => removeAdmin(profile)}
                            disabled={isSaving}
                          >
                            Remove
                          </button>

                          {savedPermission ? <small>Saved</small> : <small>New</small>}
                        </>
                      ) : (
                        <span className="protectedBadge">View Only</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="rightColumn">
            {isSuperAdmin ? (
              <form className="panel invitePanel" onSubmit={handleAddAdmin}>
                <h2>Add / Invite Admin</h2>
                <p>The system searches only the email you enter.</p>

                <label>
                  Full Name
                  <input
                    value={inviteName}
                    onChange={(event) => setInviteName(event.target.value)}
                    placeholder="Optional"
                  />
                </label>

                <label>
                  Email Address
                  <input
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="admin@email.com"
                    type="email"
                  />
                </label>

                <button type="submit" disabled={addingAdmin || activeAdminsCount >= 5}>
                  {addingAdmin ? 'Saving...' : 'Assign / Invite'}
                </button>
              </form>
            ) : null}

            {isSuperAdmin ? (
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
                        <small>{formatDate(invite.created_at)}</small>
                      </div>

                      <button type="button" onClick={() => cancelInvite(invite)}>
                        Cancel
                      </button>
                    </article>
                  ))
                )}
              </section>
            ) : null}

            <section className="panel activitySidePanel">
              <h2>Recent Activity</h2>

              {auditLogs.length === 0 ? (
                <p>No recent admin activity found.</p>
              ) : (
                <div className="miniLogs">
                  {auditLogs.slice(0, 5).map((log) => (
                    <article className="miniLogItem" key={log.id}>
                      <strong>{log.description || log.action}</strong>
                      <small>{formatDate(log.created_at)}</small>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </section>

        <section className="panel logsPanel">
          <div className="panelHeader">
            <div>
              <h2>Admin Activity Logs</h2>
              <p>
                {isSuperAdmin
                  ? 'All recent admin activity.'
                  : 'Your available admin activity.'}
              </p>
            </div>
          </div>

          {auditLogs.length === 0 ? (
            <p className="emptyText">No recent admin activity found.</p>
          ) : (
            <div className="logsList">
              {auditLogs.map((log) => (
                <article className="logItem" key={log.id}>
                  <div>
                    <strong>{log.description || log.action}</strong>
                    <span>
                      {log.actor_role || 'admin'} · {log.target_table || 'system'}
                    </span>
                  </div>

                  <small>{formatDate(log.created_at)}</small>
                </article>
              ))}
            </div>
          )}
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
    grid-template-columns: 250px 1fr;
    background:
      radial-gradient(circle at top right, rgba(230, 187, 114, 0.2), transparent 34%),
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

  .sideUser {
    margin-top: auto;
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    padding: 14px;
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
    padding: 28px;
    min-width: 0;
  }

  .hero {
    background: rgba(255, 255, 255, 0.82);
    border: 1px solid rgba(196, 151, 103, 0.16);
    border-radius: 24px;
    padding: 22px;
    box-shadow: 0 18px 40px rgba(16, 43, 36, 0.07);
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: center;
  }

  .eyebrow {
    margin: 0 0 7px;
    color: #b9823f;
    font-weight: 950;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-size: 12px;
  }

  .hero h1 {
    margin: 0;
    font-size: 34px;
    letter-spacing: -0.04em;
  }

  .hero p {
    margin: 8px 0 0;
    color: #63716d;
    font-weight: 750;
  }

  .heroActions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .heroActions a {
    display: inline-flex;
    border-radius: 13px;
    padding: 11px 14px;
    background: #004534;
    color: white;
    text-decoration: none;
    font-weight: 900;
  }

  .heroActions a:first-child {
    background: white;
    color: #004534;
    border: 1px solid rgba(0, 69, 52, 0.18);
  }

  .notice,
  .error {
    margin: 16px 0 0;
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

  .summaryGrid {
    margin-top: 18px;
    display: grid;
    grid-template-columns: repeat(4, minmax(150px, 1fr));
    gap: 14px;
  }

  .summaryGrid article,
  .panel {
    background: rgba(255, 255, 255, 0.86);
    border: 1px solid rgba(196, 151, 103, 0.18);
    border-radius: 20px;
    box-shadow: 0 14px 34px rgba(16, 43, 36, 0.06);
  }

  .summaryGrid article {
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

  .contentGrid {
    margin-top: 18px;
    display: grid;
    grid-template-columns: minmax(0, 1.7fr) 360px;
    gap: 16px;
  }

  .panel {
    padding: 17px;
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
    letter-spacing: -0.03em;
  }

  .panel p {
    margin: 6px 0 0;
    color: #6d7b76;
    font-size: 13px;
    font-weight: 750;
  }

  .panelHeader button,
  .invitePanel button,
  .adminActions button {
    border: 0;
    border-radius: 11px;
    background: #004534;
    color: white;
    font-weight: 900;
    padding: 9px 11px;
    cursor: pointer;
  }

  .searchInput,
  .invitePanel input {
    width: 100%;
    border: 1px solid rgba(196, 151, 103, 0.22);
    border-radius: 13px;
    padding: 12px 13px;
    margin-top: 14px;
    background: white;
    outline: none;
    font-weight: 800;
  }

  .adminTable {
    margin-top: 14px;
    border: 1px solid rgba(196, 151, 103, 0.16);
    border-radius: 18px;
    overflow: hidden;
    background: rgba(255, 250, 241, 0.52);
  }

  .tableHead,
  .tableRow {
    display: grid;
    grid-template-columns: minmax(190px, 1fr) 110px minmax(300px, 1.35fr) 90px 115px;
    gap: 12px;
    align-items: center;
  }

  .tableHead {
    padding: 12px 14px;
    background: rgba(196, 151, 103, 0.08);
    color: #596965;
    font-size: 12px;
    font-weight: 950;
  }

  .tableRow {
    padding: 14px;
    border-top: 1px solid rgba(196, 151, 103, 0.14);
  }

  .adminIdentity {
    display: flex;
    align-items: center;
    gap: 11px;
    min-width: 0;
  }

  .avatar {
    width: 43px;
    height: 43px;
    min-width: 43px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: #5d4ac7;
    color: white;
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
    margin-top: 3px;
    color: #6d7b76;
    font-size: 12px;
    font-weight: 760;
    max-width: 210px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .roleBadge {
    border-radius: 999px;
    background: #f2d196;
    color: #4d3210;
    padding: 7px 10px;
    font-size: 12px;
    font-weight: 950;
    white-space: nowrap;
    width: fit-content;
  }

  .ownerBadge {
    background: #cdebcf;
    color: #004534;
  }

  .permissionSummary {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .permissionSummary > strong {
    font-size: 12px;
    color: #004534;
  }

  .permissionsGrid {
    display: grid;
    grid-template-columns: repeat(7, minmax(34px, 1fr));
    gap: 6px;
  }

  .permissionCell {
    min-height: 34px;
    border: 1px solid rgba(16, 43, 36, 0.11);
    border-radius: 10px;
    background: #f3eee6;
    color: #102b24;
    display: grid;
    place-items: center;
    cursor: pointer;
  }

  .permissionCell span {
    font-size: 14px;
  }

  .permissionCell small {
    display: none;
  }

  .activePermission {
    background: #004534;
    color: white;
  }

  .permissionCell:disabled {
    cursor: default;
  }

  .statusBadge {
    border-radius: 999px;
    background: #dff3df;
    color: #0b6b40;
    padding: 7px 10px;
    font-size: 12px;
    font-weight: 950;
    width: fit-content;
  }

  .adminActions {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .adminActions button {
    width: 100%;
    padding: 8px 9px;
    font-size: 12px;
  }

  .adminActions .dangerButton {
    background: white;
    color: #d22;
    border: 1px solid rgba(210, 34, 34, 0.28);
  }

  .adminActions small,
  .protectedBadge {
    color: #0b6b40;
    font-size: 11px;
    font-weight: 950;
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
    font-weight: 950;
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
  .inviteItem span,
  .inviteItem small {
    display: block;
  }

  .inviteItem span,
  .inviteItem small {
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

  .activitySidePanel {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .miniLogs {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .miniLogItem {
    border-top: 1px solid rgba(196, 151, 103, 0.14);
    padding-top: 9px;
  }

  .miniLogItem strong,
  .miniLogItem small {
    display: block;
  }

  .miniLogItem strong {
    font-size: 12px;
  }

  .miniLogItem small {
    margin-top: 4px;
    color: #6d7b76;
    font-size: 11px;
    font-weight: 800;
  }

  .logsPanel {
    margin-top: 16px;
  }

  .emptyText {
    color: #6d7b76;
    font-weight: 800;
  }

  .logsList {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .logItem {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    border: 1px solid rgba(196, 151, 103, 0.16);
    background: #fffaf1;
    border-radius: 14px;
    padding: 11px 12px;
  }

  .logItem strong,
  .logItem span {
    display: block;
  }

  .logItem span,
  .logItem small {
    color: #6d7b76;
    font-size: 12px;
    font-weight: 800;
  }

  .loadingCard {
    width: min(680px, calc(100% - 40px));
    margin: 80px auto;
    background: white;
    border-radius: 22px;
    padding: 30px;
    box-shadow: 0 16px 36px rgba(16, 43, 36, 0.08);
  }

  .loadingCard a {
    display: inline-flex;
    margin-top: 14px;
    color: #004534;
    font-weight: 900;
  }

  @media (max-width: 1300px) {
    .tableHead {
      display: none;
    }

    .tableRow {
      grid-template-columns: 1fr;
      align-items: stretch;
    }

    .permissionsGrid {
      grid-template-columns: repeat(7, 34px);
    }

    .adminActions {
      flex-direction: row;
      align-items: center;
    }

    .adminActions button {
      width: auto;
    }
  }

  @media (max-width: 1050px) {
    .pageShell {
      grid-template-columns: 1fr;
    }

    .sideBar {
      min-height: auto;
    }

    .summaryGrid,
    .contentGrid {
      grid-template-columns: 1fr;
    }

    .hero {
      flex-direction: column;
      align-items: flex-start;
    }

    .heroActions {
      justify-content: flex-start;
    }
  }
`;