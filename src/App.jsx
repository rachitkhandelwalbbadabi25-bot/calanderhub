import React, { useEffect, useState, useMemo } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  ShieldCheck,
  LogOut,
  Users,
  Menu,
  X,
} from 'lucide-react';
import {
  subscribeToAuth,
  subscribeToEvents,
  subscribeToGSReport,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  logoutUser,
  DEPARTMENT_META,
  ROLE_LABELS,
  hasGSControlAccess,
  getAllowedCreateDepartments,
} from './lib/api';
import AuthScreen from './components/AuthScreen';
import CalendarGrid from './components/CalendarGrid';
import EventModal from './components/EventModal';
import GSControlPanel from './components/GSControlPanel';

function MiniMonthPicker({ currentDate, onSelectDate }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <div className="px-3 py-3 border-b border-zinc-200">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-semibold text-zinc-900">
          {currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onSelectDate(new Date(year, month - 1, 1))}
            className="p-1 rounded hover:bg-zinc-100 text-zinc-500 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onSelectDate(new Date(year, month + 1, 1))}
            className="p-1 rounded hover:bg-zinc-100 text-zinc-500 cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] font-medium text-zinc-400 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {days.map((d, i) => {
          if (!d) return <span key={i} />;
          const isToday =
            d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const isSelected = d === currentDate.getDate();
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDate(new Date(year, month, d))}
              className={`w-6 h-6 mx-auto rounded-full text-[11px] font-medium tabular-nums transition cursor-pointer ${
                isToday
                  ? 'bg-indigo-600 text-white font-semibold'
                  : isSelected
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [activeTab, setActiveTab] = useState('calendar');
  const [viewMode, setViewMode] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [events, setEvents] = useState([]);
  const [gsAuditLogs, setGsAuditLogs] = useState([]);
  const [gsUsers, setGsUsers] = useState([]);
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [quickAddDate, setQuickAddDate] = useState(null);

  useEffect(() => {
    const unsub = subscribeToAuth((u) => {
      setUser(u);
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) {
      setEvents([]);
      setGsAuditLogs([]);
      setGsUsers([]);
      return;
    }
    const unsubEvents = subscribeToEvents((items) => setEvents(items));
    let unsubGS = () => {};
    if (hasGSControlAccess(user)) {
      unsubGS = subscribeToGSReport(({ auditLogs, users }) => {
        setGsAuditLogs(auditLogs);
        setGsUsers(users);
      });
    }
    return () => {
      unsubEvents();
      unsubGS();
    };
  }, [user]);

  function handleOptimisticUserUpdate(userId, updates) {
    setGsUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updates } : u)));
  }

  async function handleLogout() {
    await logoutUser();
    setUser(null);
    setEvents([]);
    setActiveTab('calendar');
    setMobileMenuOpen(false);
  }

  async function handleSaveEvent(formData, eventId) {
    if (eventId && selectedEvent) {
      await updateCalendarEvent(eventId, formData, selectedEvent, user);
    } else {
      await createCalendarEvent(formData, user);
    }
  }

  async function handleDeleteEvent(eventId) {
    if (selectedEvent && selectedEvent.id === eventId) {
      await deleteCalendarEvent(selectedEvent, user);
    }
  }

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (deptFilter !== 'All' && ev.department !== deptFilter) return false;
      if (statusFilter !== 'All' && ev.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${ev.title} ${ev.assignee} ${ev.location} ${ev.department}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events, deptFilter, statusFilter, searchQuery]);

  function navigateDate(direction) {
    const next = new Date(currentDate);
    if (viewMode === 'week') next.setDate(currentDate.getDate() + direction * 7);
    else next.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(next);
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center text-xs font-medium text-zinc-500">
        Loading workspace...
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthenticated={(u) => setUser(u)} />;
  }

  const gsAccess = hasGSControlAccess(user);
  const canCreateAny = getAllowedCreateDepartments(user).length > 0;
  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const SidebarContent = () => (
    <>
      <div>
        <div className="h-14 px-4 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <CalendarDays className="w-4 h-4" />
            </div>
            <span className="font-display font-bold text-sm text-zinc-950">CouncilFlow</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <Users className="w-2.5 h-2.5" /> Live
            </span>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1 rounded-md text-zinc-500 hover:bg-zinc-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {canCreateAny && (
          <div className="p-3 border-b border-zinc-200">
            <button
              type="button"
              onClick={() => {
                setSelectedEvent(null);
                setQuickAddDate(new Date().toISOString().slice(0, 10));
                setModalOpen(true);
                setMobileMenuOpen(false);
              }}
              className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Schedule Event
            </button>
          </div>
        )}

        <div className="p-2 border-b border-zinc-200 space-y-0.5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('calendar');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-zinc-100 text-zinc-950'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-indigo-600" />
            Shared Calendar
          </button>

          {gsAccess && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('gs_control');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'gs_control'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                GS Control
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700">
                Admin
              </span>
            </button>
          )}
        </div>

        <div className="hidden lg:block">
          <MiniMonthPicker currentDate={currentDate} onSelectDate={(d) => setCurrentDate(d)} />
        </div>

        <div className="p-3 space-y-1">
          <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
            Tracks
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveTab('calendar');
              setDeptFilter('All');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
              deptFilter === 'All' ? 'bg-zinc-100 text-zinc-950 font-semibold' : 'text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            <span>All Teams</span>
            <span className="text-[11px] text-zinc-400 tabular-nums">{events.length}</span>
          </button>

          {['Media', 'Operations', 'Core Council'].map((dept) => {
            const meta = DEPARTMENT_META[dept];
            const count = events.filter((e) => e.department === dept).length;
            const active = deptFilter === dept;
            return (
              <button
                key={dept}
                type="button"
                onClick={() => {
                  setActiveTab('calendar');
                  setDeptFilter(dept);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                  active ? 'bg-zinc-100 text-zinc-950 font-semibold' : 'text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
                <span className="text-[11px] text-zinc-400 tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-3 border-t border-zinc-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-7 h-7 rounded-full text-white font-bold text-[11px] flex items-center justify-center shrink-0"
            style={{ backgroundColor: user.avatarColor || '#4F46E5' }}
          >
            {(user.name || 'U').slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="text-xs font-semibold text-zinc-900 truncate">{user.name}</p>
            <p className="text-[10px] text-zinc-500 truncate">{ROLE_LABELS[user.role] || user.role}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          title="Sign out"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-950 flex flex-col lg:flex-row">
      {/* Mobile Top App Bar */}
      <div className="lg:hidden sticky top-0 z-30 h-14 bg-white border-b border-zinc-200 px-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 -ml-1.5 rounded-lg text-zinc-700 hover:bg-zinc-100"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <CalendarDays className="w-4 h-4" />
          </div>
          <span className="font-display font-bold text-sm text-zinc-950">CouncilFlow</span>
        </div>

        <div className="flex items-center gap-2">
          {gsAccess && (
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'gs_control' ? 'calendar' : 'gs_control')}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                activeTab === 'gs_control'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {activeTab === 'gs_control' ? 'Calendar' : 'GS Control'}
            </button>
          )}
          {canCreateAny && (
            <button
              type="button"
              onClick={() => {
                setSelectedEvent(null);
                setQuickAddDate(new Date().toISOString().slice(0, 10));
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
          )}
        </div>
      </div>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-zinc-950/35 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[82vw] bg-white h-full flex flex-col justify-between shadow-2xl z-10">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Desktop Left Architectural Sidebar */}
      <aside className="hidden lg:flex lg:w-64 shrink-0 bg-white border-r border-zinc-200 flex-col justify-between sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {activeTab === 'gs_control' && gsAccess ? (
          <main className="p-3.5 sm:p-6 max-w-6xl w-full mx-auto">
            <GSControlPanel
              currentUser={user}
              events={events}
              auditLogs={gsAuditLogs}
              users={gsUsers}
              onOptimisticUserUpdate={handleOptimisticUserUpdate}
            />
          </main>
        ) : (
          <>
            <header className="bg-white border-b border-zinc-200 px-3.5 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center justify-between sm:justify-start gap-3">
                <div className="flex items-center rounded-lg border border-zinc-200 bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => navigateDate(-1)}
                    className="p-1.5 hover:bg-zinc-50 text-zinc-600 border-r border-zinc-200 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentDate(new Date())}
                    className="px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateDate(1)}
                    className="p-1.5 hover:bg-zinc-50 text-zinc-600 border-l border-zinc-200 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <h1 className="font-display text-base sm:text-lg font-bold text-zinc-950">{monthLabel}</h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full sm:w-44 pl-8 pr-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700"
                >
                  <option value="All">All Statuses</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>

                <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 border border-zinc-200/70">
                  {['month', 'week', 'agenda'].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition cursor-pointer ${
                        viewMode === mode ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile Horizontal Track Filter Pills */}
              <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-0.5">
                <button
                  type="button"
                  onClick={() => setDeptFilter('All')}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition ${
                    deptFilter === 'All'
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white text-zinc-600 border-zinc-200'
                  }`}
                >
                  All ({events.length})
                </button>
                {['Media', 'Operations', 'Core Council'].map((dept) => {
                  const meta = DEPARTMENT_META[dept];
                  const count = events.filter((e) => e.department === dept).length;
                  const active = deptFilter === dept;
                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => setDeptFilter(dept)}
                      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition ${
                        active ? meta.pillActive : 'bg-white text-zinc-700 border-zinc-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : meta.dot}`} />
                      {meta.shortLabel} ({count})
                    </button>
                  );
                })}
              </div>
            </header>

            <main className="p-3.5 sm:p-6 flex-1">
              <CalendarGrid
                viewMode={viewMode}
                currentDate={currentDate}
                events={filteredEvents}
                canCreateAny={canCreateAny}
                onSelectEvent={(ev) => {
                  setSelectedEvent(ev);
                  setQuickAddDate(null);
                  setModalOpen(true);
                }}
                onQuickAddDate={(dateStr) => {
                  setSelectedEvent(null);
                  setQuickAddDate(dateStr);
                  setModalOpen(true);
                }}
              />
            </main>
          </>
        )}
      </div>

      <EventModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        event={selectedEvent}
        defaultDate={quickAddDate}
        currentUser={user}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
}
