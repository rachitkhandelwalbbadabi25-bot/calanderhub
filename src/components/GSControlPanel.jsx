import React, { useEffect, useState } from 'react';
import { ShieldCheck, Download, Search } from 'lucide-react';
import {
  subscribeToGSReport,
  updateMemberPermissions,
  DEPARTMENT_META,
  ROLE_LABELS,
} from '../lib/api';

export default function GSControlPanel({ currentUser, events = [] }) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');
  const [updatingUserId, setUpdatingUserId] = useState(null);

  useEffect(() => {
    const unsub = subscribeToGSReport(({ auditLogs: logs, users: members }) => {
      setAuditLogs(logs);
      setUsers(members);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function handleRoleChange(targetUser, newRole) {
    setUpdatingUserId(targetUser.id);
    setError('');
    try {
      await updateMemberPermissions(
        targetUser,
        { role: newRole, gsControl: newRole === 'gs_control' },
        currentUser
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function handleToggleGS(targetUser) {
    setUpdatingUserId(targetUser.id);
    setError('');
    try {
      await updateMemberPermissions(
        targetUser,
        { gsControl: !targetUser.gsControl },
        currentUser
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingUserId(null);
    }
  }

  const filteredLogs = auditLogs.filter((log) => {
    if (deptFilter !== 'All' && log.department !== deptFilter) return false;
    if (actionFilter !== 'All' && log.action !== actionFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = `${log.actorName} ${log.targetTitle} ${log.details} ${log.department}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  function exportCSV() {
    const rows = [
      ['Timestamp', 'Actor', 'Role', 'Action', 'Department', 'Target', 'Details'],
      ...filteredLogs.map((l) => [
        l.timestamp,
        l.actorName,
        ROLE_LABELS[l.actorRole] || l.actorRole,
        l.action,
        l.department,
        l.targetTitle,
        l.details,
      ]),
    ];
    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gs-control-audit-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-white border border-zinc-200 p-12 text-center text-xs text-zinc-500">
        Connecting to live GS Control stream...
      </div>
    );
  }

  const summary = {
    totalEvents: events.length,
    mediaCount: events.filter((e) => e.department === 'Media').length,
    opsCount: events.filter((e) => e.department === 'Operations').length,
    completedCount: events.filter((e) => e.status === 'Completed').length,
    activeCount: events.filter((e) => e.status === 'In Progress').length,
    totalAuditEntries: auditLogs.length,
    totalUsers: users.length,
  };

  const actionColors = {
    CREATED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    UPDATED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    DELETED: 'bg-rose-50 text-rose-700 border-rose-200',
    ROLE_CHANGED: 'bg-amber-50 text-amber-800 border-amber-200',
    SIGNED_UP: 'bg-sky-50 text-sky-700 border-sky-200',
  };

  return (
    <div className="space-y-5">
      {/* Crisp Executive Header */}
      <div className="rounded-xl bg-white border border-zinc-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            GS Control &amp; Accountability Report (Live)
          </div>
          <h2 className="font-display text-xl font-bold text-zinc-950">
            Oversight Dashboard — {currentUser.name}
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Track every edit across Media, Operations (Tech), and Core Council in real time.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCSV}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition cursor-pointer shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Tight Metric Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-xl bg-white border border-zinc-200 p-4">
          <span className="text-[11px] font-semibold text-zinc-500">Total Events</span>
          <p className="text-2xl font-bold text-zinc-950 mt-1 tabular-nums">{summary.totalEvents}</p>
          <p className="text-[11px] text-zinc-400 mt-1">
            {summary.completedCount} done • {summary.activeCount} active
          </p>
        </div>

        <div className="rounded-xl bg-white border border-zinc-200 p-4 border-l-[3px] border-l-rose-500">
          <span className="text-[11px] font-semibold text-zinc-500">Media Track</span>
          <p className="text-2xl font-bold text-rose-600 mt-1 tabular-nums">{summary.mediaCount}</p>
          <p className="text-[11px] text-zinc-400 mt-1">Campaigns, shoots &amp; design</p>
        </div>

        <div className="rounded-xl bg-white border border-zinc-200 p-4 border-l-[3px] border-l-sky-500">
          <span className="text-[11px] font-semibold text-zinc-500">Operations (Tech)</span>
          <p className="text-2xl font-bold text-sky-600 mt-1 tabular-nums">{summary.opsCount}</p>
          <p className="text-[11px] text-zinc-400 mt-1">Tech infra, staging &amp; deploys</p>
        </div>

        <div className="rounded-xl bg-white border border-zinc-200 p-4 border-l-[3px] border-l-indigo-600">
          <span className="text-[11px] font-semibold text-zinc-500">Logged Actions</span>
          <p className="text-2xl font-bold text-zinc-950 mt-1 tabular-nums">{summary.totalAuditEntries}</p>
          <p className="text-[11px] text-zinc-400 mt-1">{summary.totalUsers} active team IDs</p>
        </div>
      </div>

      {/* Audit Log */}
      <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
        <div className="p-4 border-b border-zinc-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-sm font-bold text-zinc-950">Accountability &amp; Edit Log</h3>
            <p className="text-xs text-zinc-500">Live Firestore record of who edited what and when.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user or event..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-zinc-200 text-xs bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
              />
            </div>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs bg-white font-medium text-zinc-700"
            >
              <option value="All">All Tracks</option>
              <option value="Media">Media</option>
              <option value="Operations">Operations (Tech)</option>
              <option value="Core Council">Core Council</option>
            </select>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs bg-white font-medium text-zinc-700"
            >
              <option value="All">All Actions</option>
              <option value="CREATED">Created</option>
              <option value="UPDATED">Updated</option>
              <option value="DELETED">Deleted</option>
              <option value="ROLE_CHANGED">Role Changed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
                <th className="py-2.5 px-4">Time</th>
                <th className="py-2.5 px-4">User</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Track</th>
                <th className="py-2.5 px-4">Target</th>
                <th className="py-2.5 px-4">Change Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs">
              {filteredLogs.map((log) => {
                const deptMeta = DEPARTMENT_META[log.department];
                return (
                  <tr key={log.id} className="hover:bg-zinc-50/70">
                    <td className="py-2.5 px-4 font-mono text-[11px] text-zinc-500 whitespace-nowrap tabular-nums">
                      {new Date(log.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-semibold text-zinc-900 block">{log.actorName}</span>
                      <span className="text-[10px] text-zinc-400">
                        {ROLE_LABELS[log.actorRole] || log.actorRole}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border ${actionColors[log.action] || 'bg-zinc-100 text-zinc-700 border-zinc-200'
                          }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      {deptMeta ? (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${deptMeta.badge}`}>
                          {deptMeta.shortLabel}
                        </span>
                      ) : (
                        <span className="text-zinc-600">{log.department}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-zinc-800">{log.targetTitle}</td>
                    <td className="py-2.5 px-4 text-zinc-600 max-w-xs">{log.details}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hierarchy & Permissions Table */}
      <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
        <div className="p-4 border-b border-zinc-200">
          <h3 className="font-display text-sm font-bold text-zinc-950">Team Hierarchy &amp; Permissions</h3>
          <p className="text-xs text-zinc-500">
            Core Council and GS Control have all capabilities open. Media &amp; Operations edit only their own track.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
                <th className="py-2.5 px-4">Member</th>
                <th className="py-2.5 px-4">User ID</th>
                <th className="py-2.5 px-4">Title</th>
                <th className="py-2.5 px-4">Hierarchy Role</th>
                <th className="py-2.5 px-4">GS Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50/70">
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-6 h-6 rounded-full text-white font-bold flex items-center justify-center text-[10px] shrink-0"
                        style={{ backgroundColor: u.avatarColor || '#4F46E5' }}
                      >
                        {(u.name || 'U').slice(0, 2).toUpperCase()}
                      </span>
                      <span className="font-semibold text-zinc-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-zinc-500">@{u.username}</td>
                  <td className="py-2.5 px-4 text-zinc-600">{u.title}</td>
                  <td className="py-2.5 px-4">
                    <select
                      disabled={updatingUserId === u.id}
                      value={u.role}
                      onChange={(e) => handleRoleChange(u, e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-800"
                    >
                      <option value="gs_control">GS Control</option>
                      <option value="core_council">Core Council (Full Power)</option>
                      <option value="media">Media Team</option>
                      <option value="operations">Operations (Tech)</option>
                    </select>
                  </td>
                  <td className="py-2.5 px-4">
                    <button
                      type="button"
                      disabled={updatingUserId === u.id}
                      onClick={() => handleToggleGS(u)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer ${u.gsControl || u.role === 'gs_control'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200'
                        }`}
                    >
                      {u.gsControl || u.role === 'gs_control' ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
