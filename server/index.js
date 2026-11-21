import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  readDB,
  writeDB,
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  sanitizeUser,
} from './store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Auth middleware
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  const db = readDB();
  const user = db.users.find((u) => u.id === decoded.id);
  if (!user) {
    return res.status(401).json({ error: 'User account no longer exists.' });
  }
  req.user = user;
  req.db = db;
  next();
}

function canEditDepartment(user, department) {
  if (user.role === 'core_council' || user.role === 'gs_control' || user.gsControl) {
    return true;
  }
  if (user.role === 'media' && department === 'Media') return true;
  if (user.role === 'operations' && department === 'Operations') return true;
  return false;
}

function hasGSControl(user) {
  return user.role === 'gs_control' || user.role === 'core_council' || Boolean(user.gsControl);
}

function addAuditLog(db, { user, action, targetType, targetId, targetTitle, department, details }) {
  const entry = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action,
    targetType,
    targetId,
    targetTitle,
    department,
    details,
  };
  db.auditLogs.unshift(entry);
  return entry;
}

// --- AUTH ROUTES ---
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'ID / username and password are required.' });
  }
  const db = readDB();
  const user = db.users.find(
    (u) => u.username.toLowerCase() === String(username).trim().toLowerCase()
  );
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid ID or password.' });
  }
  const token = signToken({
    id: user.id,
    username: user.username,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ token, user: sanitizeUser(user) });
});

app.post('/api/auth/signup', (req, res) => {
  const { username, password, name, department, title } = req.body || {};
  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Name, ID/username, and password are required.' });
  }
  if (String(password).length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters.' });
  }
  const db = readDB();
  const cleanUsername = String(username).trim().toLowerCase();
  if (db.users.some((u) => u.username.toLowerCase() === cleanUsername)) {
    return res.status(409).json({ error: 'This User ID is already taken.' });
  }

  const chosenDept = department === 'Operations' ? 'Operations' : 'Media';
  const assignedRole = chosenDept === 'Operations' ? 'operations' : 'media';
  const palette = ['#EC4899', '#0EA5E9', '#6366F1', '#10B981', '#F59E0B'];
  const avatarColor = palette[db.users.length % palette.length];

  const newUser = {
    id: `u_${Date.now()}`,
    username: cleanUsername,
    name: String(name).trim(),
    title: title ? String(title).trim() : `${chosenDept} Member`,
    role: assignedRole,
    department: chosenDept,
    gsControl: false,
    avatarColor,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  addAuditLog(db, {
    user: newUser,
    action: 'SIGNED_UP',
    targetType: 'Account',
    targetId: newUser.id,
    targetTitle: `${newUser.name} (@${newUser.username})`,
    department: newUser.department,
    details: `Registered new ${newUser.department} account.`,
  });
  writeDB(db);

  const token = signToken({
    id: newUser.id,
    username: newUser.username,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  res.status(201).json({ token, user: sanitizeUser(newUser) });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

// --- EVENTS ROUTES ---
app.get('/api/events', requireAuth, (req, res) => {
  const { db } = req;
  res.json({ events: db.events });
});

app.post('/api/events', requireAuth, (req, res) => {
  const { user, db } = req;
  const { title, department, date, startTime, endTime, status, priority, assignee, location, description } =
    req.body || {};

  if (!title || !department || !date) {
    return res.status(400).json({ error: 'Title, department, and date are required.' });
  }
  if (!canEditDepartment(user, department)) {
    return res.status(403).json({
      error: `Permission denied: Your account (${user.department}) cannot create events for ${department}.`,
    });
  }

  const newEvent = {
    id: `ev_${Date.now()}`,
    title: String(title).trim(),
    department,
    date,
    startTime: startTime || '10:00',
    endTime: endTime || '11:00',
    status: status || 'Scheduled',
    priority: priority || 'Medium',
    assignee: assignee || user.name,
    location: location || 'Campus / Remote',
    description: description || '',
    createdBy: user.id,
    createdByName: user.name,
    updatedBy: user.id,
    updatedByName: user.name,
    updatedAt: new Date().toISOString(),
  };

  db.events.push(newEvent);
  addAuditLog(db, {
    user,
    action: 'CREATED',
    targetType: 'Event',
    targetId: newEvent.id,
    targetTitle: newEvent.title,
    department: newEvent.department,
    details: `Scheduled for ${newEvent.date} (${newEvent.startTime}–${newEvent.endTime}) • Priority: ${newEvent.priority}`,
  });
  writeDB(db);
  res.status(201).json({ event: newEvent });
});

app.put('/api/events/:id', requireAuth, (req, res) => {
  const { user, db } = req;
  const idx = db.events.findIndex((e) => e.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Event not found.' });
  }
  const existing = db.events[idx];
  const nextDept = req.body.department || existing.department;

  if (!canEditDepartment(user, existing.department) || !canEditDepartment(user, nextDept)) {
    return res.status(403).json({
      error: `Permission denied: You cannot edit ${existing.department} events.`,
    });
  }

  const trackedFields = ['title', 'department', 'date', 'startTime', 'endTime', 'status', 'priority', 'assignee', 'location'];
  const changes = [];
  for (const field of trackedFields) {
    if (req.body[field] !== undefined && req.body[field] !== existing[field]) {
      changes.push(`${field}: "${existing[field]}" → "${req.body[field]}"`);
    }
  }
  if (req.body.description !== undefined && req.body.description !== existing.description) {
    changes.push('updated description');
  }

  const updated = {
    ...existing,
    ...req.body,
    id: existing.id,
    createdBy: existing.createdBy,
    createdByName: existing.createdByName,
    updatedBy: user.id,
    updatedByName: user.name,
    updatedAt: new Date().toISOString(),
  };

  db.events[idx] = updated;
  addAuditLog(db, {
    user,
    action: 'UPDATED',
    targetType: 'Event',
    targetId: updated.id,
    targetTitle: updated.title,
    department: updated.department,
    details: changes.length > 0 ? changes.join('; ') : 'Saved event details.',
  });
  writeDB(db);
  res.json({ event: updated });
});

app.delete('/api/events/:id', requireAuth, (req, res) => {
  const { user, db } = req;
  const idx = db.events.findIndex((e) => e.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Event not found.' });
  }
  const existing = db.events[idx];
  if (!canEditDepartment(user, existing.department)) {
    return res.status(403).json({
      error: `Permission denied: You cannot delete ${existing.department} events.`,
    });
  }

  db.events.splice(idx, 1);
  addAuditLog(db, {
    user,
    action: 'DELETED',
    targetType: 'Event',
    targetId: existing.id,
    targetTitle: existing.title,
    department: existing.department,
    details: `Removed event originally scheduled for ${existing.date}.`,
  });
  writeDB(db);
  res.json({ deletedId: existing.id });
});

// --- GS CONTROL & REPORTING ROUTES ---
app.get('/api/gs-control/report', requireAuth, (req, res) => {
  const { user, db } = req;
  if (!hasGSControl(user)) {
    return res.status(403).json({ error: 'GS Control / Core Council access required.' });
  }

  const totalEvents = db.events.length;
  const byDepartment = {
    Media: db.events.filter((e) => e.department === 'Media').length,
    Operations: db.events.filter((e) => e.department === 'Operations').length,
    'Core Council': db.events.filter((e) => e.department === 'Core Council').length,
  };
  const byStatus = {
    Scheduled: db.events.filter((e) => e.status === 'Scheduled').length,
    'In Progress': db.events.filter((e) => e.status === 'In Progress').length,
    Completed: db.events.filter((e) => e.status === 'Completed').length,
  };

  res.json({
    summary: {
      totalEvents,
      totalAuditEntries: db.auditLogs.length,
      totalUsers: db.users.length,
      byDepartment,
      byStatus,
    },
    auditLogs: db.auditLogs,
    users: db.users.map(sanitizeUser),
  });
});

app.patch('/api/gs-control/users/:id', requireAuth, (req, res) => {
  const { user, db } = req;
  if (!hasGSControl(user)) {
    return res.status(403).json({ error: 'Only GS Control or Core Council can manage hierarchy.' });
  }
  const target = db.users.find((u) => u.id === req.params.id);
  if (!target) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const { role, gsControl } = req.body || {};
  const changes = [];
  if (role && role !== target.role) {
    changes.push(`role: ${target.role} → ${role}`);
    target.role = role;
    if (role === 'core_council' || role === 'gs_control') target.department = 'Core Council';
    if (role === 'media') target.department = 'Media';
    if (role === 'operations') target.department = 'Operations';
  }
  if (typeof gsControl === 'boolean' && gsControl !== target.gsControl) {
    changes.push(`GS Control: ${target.gsControl} → ${gsControl}`);
    target.gsControl = gsControl;
  }

  if (changes.length > 0) {
    addAuditLog(db, {
      user,
      action: 'ROLE_CHANGED',
      targetType: 'User',
      targetId: target.id,
      targetTitle: target.name,
      department: target.department,
      details: changes.join('; '),
    });
    writeDB(db);
  }

  res.json({ user: sanitizeUser(target) });
});

// Serve built frontend in production if dist exists
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`CouncilFlow API running on http://localhost:${PORT}`);
});
