import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

const TOKEN_SECRET = process.env.COUNCILFLOW_SECRET || 'councilflow-vibrant-team-secret-2026';

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const hashBuffer = crypto.scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, 'hex');
  if (hashBuffer.length !== keyBuffer.length) return false;
  return crypto.timingSafeEqual(hashBuffer, keyBuffer);
}

export function signToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [data, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (parsed.exp && Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function getDateOffset(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().slice(0, 10);
}

function createSeedData() {
  const users = [
    {
      id: 'u_sushmita',
      username: 'sushmita',
      name: "Sushmita Ma'am",
      title: 'Faculty Advisor',
      role: 'gs_control',
      department: 'Core Council',
      gsControl: true,
      avatarColor: '#7C3AED',
      passwordHash: hashPassword('admin123'),
      createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    },
    {
      id: 'u_gs',
      username: 'gs_head',
      name: 'Aarav Sharma',
      title: 'General Secretary',
      role: 'gs_control',
      department: 'Core Council',
      gsControl: true,
      avatarColor: '#4F46E5',
      passwordHash: hashPassword('gs123'),
      createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    },
    {
      id: 'u_core',
      username: 'core_council',
      name: 'Riya Verma',
      title: 'Core Council Lead',
      role: 'core_council',
      department: 'Core Council',
      gsControl: false,
      avatarColor: '#F59E0B',
      passwordHash: hashPassword('core123'),
      createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    },
    {
      id: 'u_media',
      username: 'media_user',
      name: 'Kabir Nair',
      title: 'Media & Design Lead',
      role: 'media',
      department: 'Media',
      gsControl: false,
      avatarColor: '#EC4899',
      passwordHash: hashPassword('media123'),
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    },
    {
      id: 'u_ops',
      username: 'ops_user',
      name: 'Devansh Patel',
      title: 'Tech & Operations Lead',
      role: 'operations',
      department: 'Operations',
      gsControl: false,
      avatarColor: '#0EA5E9',
      passwordHash: hashPassword('ops123'),
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    },
  ];

  const events = [
    {
      id: 'ev_1',
      title: 'Annual TechFest Teaser Reel Shoot',
      department: 'Media',
      date: getDateOffset(0),
      startTime: '14:00',
      endTime: '16:30',
      status: 'In Progress',
      priority: 'High',
      assignee: 'Kabir Nair',
      location: 'Main Auditorium & Quad',
      description: 'Shoot B-roll, student reactions, and core team intro clips for the Instagram launch reel.',
      createdBy: 'u_media',
      createdByName: 'Kabir Nair',
      updatedBy: 'u_media',
      updatedByName: 'Kabir Nair',
      updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: 'ev_2',
      title: 'Registration Portal & QR Check-in Deploy',
      department: 'Operations',
      date: getDateOffset(0),
      startTime: '17:00',
      endTime: '19:00',
      status: 'Scheduled',
      priority: 'High',
      assignee: 'Devansh Patel',
      location: 'Tech Lab 204',
      description: 'Deploy v2 ticketing backend, load-test QR scanner app, and verify webhook alerts.',
      createdBy: 'u_ops',
      createdByName: 'Devansh Patel',
      updatedBy: 'u_gs',
      updatedByName: 'Aarav Sharma',
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'ev_3',
      title: 'Core Council Budget & Sponsor Sign-off',
      department: 'Core Council',
      date: getDateOffset(1),
      startTime: '11:00',
      endTime: '12:30',
      status: 'Scheduled',
      priority: 'Critical',
      assignee: "Sushmita Ma'am & Aarav Sharma",
      location: 'Conference Room A',
      description: 'Final review of stage production budget, sponsor deliverables, and faculty approvals.',
      createdBy: 'u_sushmita',
      createdByName: "Sushmita Ma'am",
      updatedBy: 'u_sushmita',
      updatedByName: "Sushmita Ma'am",
      updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    },
    {
      id: 'ev_4',
      title: 'Speaker Lineup Carousel & Poster Pack',
      department: 'Media',
      date: getDateOffset(2),
      startTime: '10:30',
      endTime: '13:00',
      status: 'Scheduled',
      priority: 'Medium',
      assignee: 'Kabir Nair',
      location: 'Design Studio',
      description: 'Finalize 6 speaker announcement graphics, LinkedIn banners, and campus standee print files.',
      createdBy: 'u_media',
      createdByName: 'Kabir Nair',
      updatedBy: 'u_core',
      updatedByName: 'Riya Verma',
      updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: 'ev_5',
      title: 'Stage Audio, Mic & LED Wall Stress Test',
      department: 'Operations',
      date: getDateOffset(3),
      startTime: '15:00',
      endTime: '18:00',
      status: 'Scheduled',
      priority: 'High',
      assignee: 'Devansh Patel',
      location: 'Main Auditorium',
      description: 'Test wireless mic frequencies, HDMI backup switcher, and live stream RTMP feed.',
      createdBy: 'u_ops',
      createdByName: 'Devansh Patel',
      updatedBy: 'u_ops',
      updatedByName: 'Devansh Patel',
      updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
    {
      id: 'ev_6',
      title: 'Aftermovie Storyboard & Shot List',
      department: 'Media',
      date: getDateOffset(-2),
      startTime: '16:00',
      endTime: '17:30',
      status: 'Completed',
      priority: 'Medium',
      assignee: 'Kabir Nair',
      location: 'Media Room',
      description: 'Locked shot list for Day 1 & Day 2 coverage including drone permissions.',
      createdBy: 'u_media',
      createdByName: 'Kabir Nair',
      updatedBy: 'u_media',
      updatedByName: 'Kabir Nair',
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'ev_7',
      title: 'Wi-Fi Mesh & Hackathon Power Grid Setup',
      department: 'Operations',
      date: getDateOffset(5),
      startTime: '09:30',
      endTime: '13:00',
      status: 'Scheduled',
      priority: 'Critical',
      assignee: 'Devansh Patel',
      location: 'Innovation Hall',
      description: 'Install 6 enterprise access points and label 40+ extension power strips for 24h hackathon.',
      createdBy: 'u_ops',
      createdByName: 'Devansh Patel',
      updatedBy: 'u_ops',
      updatedByName: 'Devansh Patel',
      updatedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    },
    {
      id: 'ev_8',
      title: 'All-Team Alignment & Dry Run Sync',
      department: 'Core Council',
      date: getDateOffset(4),
      startTime: '18:00',
      endTime: '19:30',
      status: 'Scheduled',
      priority: 'High',
      assignee: 'Riya Verma',
      location: 'Seminar Hall 1',
      description: 'Joint sync between Media, Operations, and Core Council to lock run-of-show timings.',
      createdBy: 'u_core',
      createdByName: 'Riya Verma',
      updatedBy: 'u_gs',
      updatedByName: 'Aarav Sharma',
      updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    },
  ];

  const auditLogs = [
    {
      id: 'log_1',
      timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
      actorId: 'u_sushmita',
      actorName: "Sushmita Ma'am",
      actorRole: 'gs_control',
      action: 'CREATED',
      targetType: 'Event',
      targetId: 'ev_3',
      targetTitle: 'Core Council Budget & Sponsor Sign-off',
      department: 'Core Council',
      details: 'Scheduled budget & sponsor review in Conference Room A.',
    },
    {
      id: 'log_2',
      timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
      actorId: 'u_gs',
      actorName: 'Aarav Sharma',
      actorRole: 'gs_control',
      action: 'UPDATED',
      targetType: 'Event',
      targetId: 'ev_8',
      targetTitle: 'All-Team Alignment & Dry Run Sync',
      department: 'Core Council',
      details: 'Updated time to 18:00–19:30 and marked priority High.',
    },
    {
      id: 'log_3',
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
      actorId: 'u_core',
      actorName: 'Riya Verma',
      actorRole: 'core_council',
      action: 'UPDATED',
      targetType: 'Event',
      targetId: 'ev_4',
      targetTitle: 'Speaker Lineup Carousel & Poster Pack',
      department: 'Media',
      details: 'Added LinkedIn banners & campus standee print files to scope.',
    },
    {
      id: 'log_4',
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
      actorId: 'u_media',
      actorName: 'Kabir Nair',
      actorRole: 'media',
      action: 'UPDATED',
      targetType: 'Event',
      targetId: 'ev_1',
      targetTitle: 'Annual TechFest Teaser Reel Shoot',
      department: 'Media',
      details: 'Changed status from Scheduled → In Progress.',
    },
    {
      id: 'log_5',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      actorId: 'u_gs',
      actorName: 'Aarav Sharma',
      actorRole: 'gs_control',
      action: 'UPDATED',
      targetType: 'Event',
      targetId: 'ev_2',
      targetTitle: 'Registration Portal & QR Check-in Deploy',
      department: 'Operations',
      details: 'Added webhook verification checklist to deployment task.',
    },
  ];

  return { users, events, auditLogs };
}

export function readDB() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const seed = createSeedData();
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), 'utf8');
    return seed;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

export function writeDB(data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

export function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}
