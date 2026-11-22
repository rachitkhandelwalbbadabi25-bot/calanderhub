import React, { useState } from 'react';
import { Plus, Clock, MapPin, User } from 'lucide-react';
import { DEPARTMENT_META } from '../lib/api';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function formatDateKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function StatusDot({ status }) {
  if (status === 'Completed') return <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Completed" />;
  if (status === 'In Progress') return <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" title="In Progress" />;
  return <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" title="Scheduled" />;
}

export default function CalendarGrid({
  viewMode,
  currentDate,
  events,
  onSelectEvent,
  onQuickAddDate,
  canCreateAny,
}) {
  const todayKey = formatDateKey(new Date());
  const [selectedMobileDay, setSelectedMobileDay] = useState(todayKey);

  const eventsByDate = events.reduce((acc, ev) => {
    if (!acc[ev.date]) acc[ev.date] = [];
    acc[ev.date].push(ev);
    return acc;
  }, {});

  Object.keys(eventsByDate).forEach((k) => {
    eventsByDate[k].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  });

  if (viewMode === 'agenda') {
    const sorted = [...events].sort((a, b) =>
      `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
    );

    if (sorted.length === 0) {
      return (
        <div className="rounded-xl bg-white border border-zinc-200 p-10 text-center">
          <p className="text-sm font-semibold text-zinc-800">No events match your filters</p>
          <p className="text-xs text-zinc-400 mt-1">Adjust the track filter or search query to see events.</p>
        </div>
      );
    }

    return (
      <div className="rounded-xl bg-white border border-zinc-200 divide-y divide-zinc-100 overflow-hidden">
        {sorted.map((ev) => {
          const meta = DEPARTMENT_META[ev.department] || DEPARTMENT_META.Media;
          return (
            <button
              key={ev.id}
              type="button"
              onClick={() => onSelectEvent(ev)}
              className="w-full text-left px-4 py-3.5 hover:bg-zinc-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-start gap-3.5">
                <div className={`w-1 self-stretch rounded-full ${meta.bar}`} />
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-semibold text-zinc-500 tabular-nums">
                      {ev.date}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${meta.badge}`}>
                      {meta.label}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600">
                      <StatusDot status={ev.status} />
                      {ev.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-zinc-950">{ev.title}</h4>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-1 text-xs text-zinc-500">
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      {ev.startTime} – {ev.endTime}
                    </span>
                    {ev.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                        {ev.location}
                      </span>
                    )}
                    {ev.assignee && (
                      <span className="inline-flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-zinc-400" />
                        {ev.assignee}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-left sm:text-right shrink-0 pl-4 sm:pl-0">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 block">Last edit</span>
                <span className="text-xs font-medium text-zinc-700">{ev.updatedByName}</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  if (viewMode === 'week') {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });

    return (
      <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-zinc-200">
          {weekDays.map((dayObj) => {
            const key = formatDateKey(dayObj);
            const isToday = key === todayKey;
            const dayEvents = eventsByDate[key] || [];
            return (
              <div key={key} className={`min-h-0 md:min-h-[420px] flex flex-col ${isToday ? 'bg-indigo-50/25' : 'bg-white'}`}>
                <div className="px-3 py-2.5 border-b border-zinc-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase text-zinc-400">
                      {WEEKDAYS[dayObj.getDay()]}
                    </span>
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold tabular-nums ${
                        isToday ? 'bg-indigo-600 text-white' : 'text-zinc-800'
                      }`}
                    >
                      {dayObj.getDate()}
                    </span>
                  </div>
                  {canCreateAny && (
                    <button
                      type="button"
                      onClick={() => onQuickAddDate(key)}
                      title="Schedule on this day"
                      className="p-1.5 rounded-md text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="p-2.5 space-y-1.5 flex-1">
                  {dayEvents.length === 0 ? (
                    <p className="text-[11px] text-zinc-400 py-1 md:hidden">No events</p>
                  ) : (
                    dayEvents.map((ev) => {
                      const meta = DEPARTMENT_META[ev.department] || DEPARTMENT_META.Media;
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => onSelectEvent(ev)}
                          className={`w-full text-left p-2.5 rounded-lg transition cursor-pointer ${meta.eventChip}`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-[10px] font-mono font-semibold opacity-75 tabular-nums">
                              {ev.startTime}
                            </span>
                            <StatusDot status={ev.status} />
                          </div>
                          <p className="text-xs font-semibold leading-snug line-clamp-2">{ev.title}</p>
                          <p className="text-[10px] opacity-70 mt-1 truncate">{ev.assignee}</p>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Month View (Desktop full grid + Mobile compact dot-calendar with selected day drawer)
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const startDayIndex = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startDayIndex; i++) {
    const prevDate = new Date(year, month, -(startDayIndex - 1 - i));
    cells.push({ dateObj: prevDate, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ dateObj: new Date(year, month, d), inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const nextOffset = cells.length - (startDayIndex + daysInMonth) + 1;
    cells.push({ dateObj: new Date(year, month + 1, nextOffset), inMonth: false });
  }

  const mobileSelectedEvents = eventsByDate[selectedMobileDay] || [];

  return (
    <>
      {/* Mobile Month View (< md) */}
      <div className="md:hidden space-y-3">
        <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
          <div className="grid grid-cols-7 bg-zinc-50 border-b border-zinc-200 py-2 text-center">
            {WEEKDAYS_SHORT.map((day, idx) => (
              <div key={idx} className="text-[11px] font-semibold text-zinc-500">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1 p-2">
            {cells.map(({ dateObj, inMonth }) => {
              const key = formatDateKey(dateObj);
              const isToday = key === todayKey;
              const isSelected = key === selectedMobileDay;
              const dayEvents = eventsByDate[key] || [];

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedMobileDay(key)}
                  className={`py-1.5 flex flex-col items-center justify-center rounded-lg transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50 ring-1 ring-indigo-600/40'
                      : 'hover:bg-zinc-50'
                  } ${!inMonth ? 'opacity-35' : ''}`}
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold tabular-nums ${
                      isToday
                        ? 'bg-indigo-600 text-white'
                        : isSelected
                          ? 'text-indigo-700 font-bold'
                          : 'text-zinc-800'
                    }`}
                  >
                    {dateObj.getDate()}
                  </span>
                  <div className="flex items-center gap-0.5 h-2 mt-0.5">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const meta = DEPARTMENT_META[ev.department] || DEPARTMENT_META.Media;
                      return <span key={ev.id} className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />;
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda on Mobile */}
        <div className="rounded-xl bg-white border border-zinc-200 p-3.5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-bold text-zinc-950">{selectedMobileDay}</p>
              <p className="text-[11px] text-zinc-500">
                {mobileSelectedEvents.length} {mobileSelectedEvents.length === 1 ? 'event' : 'events'}
              </p>
            </div>
            {canCreateAny && (
              <button
                type="button"
                onClick={() => onQuickAddDate(selectedMobileDay)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            )}
          </div>

          {mobileSelectedEvents.length === 0 ? (
            <p className="text-xs text-zinc-400 py-4 text-center">No events scheduled for this day.</p>
          ) : (
            <div className="space-y-2">
              {mobileSelectedEvents.map((ev) => {
                const meta = DEPARTMENT_META[ev.department] || DEPARTMENT_META.Media;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onSelectEvent(ev)}
                    className={`w-full text-left p-3 rounded-lg transition cursor-pointer ${meta.eventChip}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-mono font-semibold opacity-80 tabular-nums">
                        {ev.startTime} – {ev.endTime}
                      </span>
                      <span className="text-[10px] font-semibold">{meta.shortLabel}</span>
                    </div>
                    <p className="text-xs font-bold">{ev.title}</p>
                    <p className="text-[11px] opacity-75 mt-0.5">{ev.assignee}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Month Grid (md+) */}
      <div className="hidden md:block rounded-xl bg-white border border-zinc-200 overflow-hidden">
        <div className="grid grid-cols-7 bg-zinc-50 border-b border-zinc-200">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 divide-x divide-y divide-zinc-200/80">
          {cells.map(({ dateObj, inMonth }) => {
            const key = formatDateKey(dateObj);
            const isToday = key === todayKey;
            const dayEvents = eventsByDate[key] || [];

            return (
              <div
                key={key}
                className={`min-h-[124px] p-1.5 flex flex-col group transition ${
                  inMonth ? 'bg-white' : 'bg-zinc-50/70 text-zinc-400'
                } ${isToday ? 'bg-indigo-50/25' : ''}`}
              >
                <div className="flex items-center justify-between px-1 mb-1">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold tabular-nums ${
                      isToday
                        ? 'bg-indigo-600 text-white'
                        : inMonth
                          ? 'text-zinc-800'
                          : 'text-zinc-400'
                    }`}
                  >
                    {dateObj.getDate()}
                  </span>
                  {canCreateAny && (
                    <button
                      type="button"
                      onClick={() => onQuickAddDate(key)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                      title={`Add event on ${key}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-1 flex-1 overflow-y-auto max-h-[92px]">
                  {dayEvents.map((ev) => {
                    const meta = DEPARTMENT_META[ev.department] || DEPARTMENT_META.Media;
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => onSelectEvent(ev)}
                        className={`w-full text-left px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 truncate transition cursor-pointer ${meta.eventChip}`}
                      >
                        <span className="font-mono text-[10px] opacity-75 shrink-0 tabular-nums">
                          {ev.startTime}
                        </span>
                        <span className="truncate font-semibold">{ev.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
