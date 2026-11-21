import React, { useState, useEffect } from 'react';
import { X, Trash2, Lock, Clock, MapPin, User, History } from 'lucide-react';
import {
  DEPARTMENT_META,
  canUserEditDepartment,
  getAllowedCreateDepartments,
} from '../lib/api';

export default function EventModal({
  isOpen,
  onClose,
  event,
  defaultDate,
  currentUser,
  onSave,
  onDelete,
}) {
  const isEditing = Boolean(event?.id);
  const allowedDepts = getAllowedCreateDepartments(currentUser);
  const canEdit = isEditing
    ? canUserEditDepartment(currentUser, event.department)
    : allowedDepts.length > 0;

  const [form, setForm] = useState({
    title: '',
    department: allowedDepts[0] || 'Media',
    date: defaultDate || new Date().toISOString().slice(0, 10),
    startTime: '10:00',
    endTime: '11:30',
    status: 'Scheduled',
    priority: 'Medium',
    assignee: currentUser?.name || '',
    location: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (event) {
      setForm({
        title: event.title || '',
        department: event.department || 'Media',
        date: event.date || new Date().toISOString().slice(0, 10),
        startTime: event.startTime || '10:00',
        endTime: event.endTime || '11:30',
        status: event.status || 'Scheduled',
        priority: event.priority || 'Medium',
        assignee: event.assignee || '',
        location: event.location || '',
        description: event.description || '',
      });
    } else {
      setForm({
        title: '',
        department: allowedDepts[0] || 'Media',
        date: defaultDate || new Date().toISOString().slice(0, 10),
        startTime: '10:00',
        endTime: '11:30',
        status: 'Scheduled',
        priority: 'Medium',
        assignee: currentUser?.name || '',
        location: '',
        description: '',
      });
    }
    setError('');
  }, [event, defaultDate, isOpen]);

  if (!isOpen) return null;

  const deptMeta = DEPARTMENT_META[form.department] || DEPARTMENT_META.Media;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setError('');
    try {
      await onSave(form, event?.id);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!canEdit || !event?.id) return;
    setSaving(true);
    setError('');
    try {
      await onDelete(event.id);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/30 backdrop-blur-[2px]">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-zinc-200 shadow-2xl overflow-hidden">
        <div className={`h-1.5 w-full ${deptMeta.strip}`} />

        <div className="p-6 max-h-[88vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${deptMeta.badge}`}>
                  {deptMeta.label}
                </span>
                {!canEdit && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200">
                    <Lock className="w-3 h-3" /> Read-only
                  </span>
                )}
              </div>
              <h3 className="font-display text-lg font-bold text-zinc-950">
                {isEditing ? (canEdit ? 'Edit Event' : 'Event Details') : 'New Event'}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!canEdit && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <Lock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <p>
                Everyone sees the shared calendar, but only <strong>{event?.department}</strong> members,{' '}
                <strong>Core Council</strong>, or <strong>GS Control</strong> can modify this event.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Title</label>
              <input
                type="text"
                required
                disabled={!canEdit}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Event or task name"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 disabled:bg-zinc-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Track</label>
                <select
                  disabled={!canEdit}
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 disabled:bg-zinc-50"
                >
                  {(canEdit ? allowedDepts : [form.department]).map((d) => (
                    <option key={d} value={d}>
                      {DEPARTMENT_META[d]?.label || d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  disabled={!canEdit}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 disabled:bg-zinc-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Start</label>
                <input
                  type="time"
                  disabled={!canEdit}
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 text-xs bg-white disabled:bg-zinc-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">End</label>
                <input
                  type="time"
                  disabled={!canEdit}
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 text-xs bg-white disabled:bg-zinc-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Status</label>
                <select
                  disabled={!canEdit}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 text-xs bg-white disabled:bg-zinc-50"
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Priority</label>
                <select
                  disabled={!canEdit}
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 text-xs bg-white disabled:bg-zinc-50"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  <span className="inline-flex items-center gap-1"><User className="w-3 h-3" /> Owner</span>
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={form.assignee}
                  onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-xs bg-white disabled:bg-zinc-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</span>
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-xs bg-white disabled:bg-zinc-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Notes</label>
              <textarea
                rows={3}
                disabled={!canEdit}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Deliverables, links, or checklist..."
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 disabled:bg-zinc-50"
              />
            </div>

            {isEditing && (
              <div className="px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200/80 text-[11px] text-zinc-600 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1">
                  <History className="w-3 h-3 text-indigo-600" />
                  Created by <strong className="text-zinc-900">{event.createdByName}</strong>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-400" />
                  Last edit: <strong className="text-zinc-900">{event.updatedByName}</strong>
                </span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between gap-3">
              {isEditing && canEdit ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-semibold transition cursor-pointer"
                >
                  {canEdit ? 'Cancel' : 'Close'}
                </button>
                {canEdit && (
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition disabled:opacity-60 cursor-pointer"
                  >
                    {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Event'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
