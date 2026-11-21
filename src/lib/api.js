import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase';

export const DEMO_PRESETS = {
  sushmita: {
    username: 'sushmita',
    pass: 'admin123',
    name: "Sushmita Ma'am",
    title: 'Faculty Advisor',
    role: 'gs_control',
    department: 'Core Council',
    gsControl: true,
    avatarColor: '#7C3AED',
  },
  gs_head: {
    username: 'gs_head',
    pass: 'gs123',
    name: 'Aarav Sharma',
    title: 'General Secretary',
    role: 'gs_control',
    department: 'Core Council',
    gsControl: true,
    avatarColor: '#4F46E5',
  },
  core_council: {
    username: 'core_council',
    pass: 'core123',
    name: 'Riya Verma',
    title: 'Core Council Lead',
    role: 'core_council',
    department: 'Core Council',
    gsControl: false,
    avatarColor: '#D97706',
  },
  media_user: {
    username: 'media_user',
    pass: 'media123',
    name: 'Kabir Nair',
    title: 'Media & Design Lead',
    role: 'media',
    department: 'Media',
    gsControl: false,
    avatarColor: '#E11D48',
  },
  ops_user: {
    username: 'ops_user',
    pass: 'ops123',
    name: 'Devansh Patel',
    title: 'Tech & Operations Lead',
    role: 'operations',
    department: 'Operations',
    gsControl: false,
    avatarColor: '#0284C7',
  },
};

export function toAuthEmail(input) {
  const clean = String(input || '').trim().toLowerCase();
  if (clean.includes('@')) return clean;
  return `${clean}@councilflow.app`;
}

function getDateOffset(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().slice(0, 10);
}

async function seedInitialEventsIfEmpty(user) {
  const snap = await getDocs(query(collection(db, 'events'), limit(1)));
  if (!snap.empty) return;

  const seedEvents = [
    {
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
    },
    {
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
    },
    {
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
    },
    {
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
    },
    {
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
    },
  ];

  const now = new Date().toISOString();
  for (const ev of seedEvents) {
    const ref = await addDoc(collection(db, 'events'), {
      ...ev,
      createdBy: user.id,
      createdByName: user.name,
      updatedBy: user.id,
      updatedByName: user.name,
      updatedAt: now,
    });
    await addDoc(collection(db, 'auditLogs'), {
      timestamp: now,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'CREATED',
      targetType: 'Event',
      targetId: ref.id,
      targetTitle: ev.title,
      department: ev.department,
      details: `Initial schedule for ${ev.date} (${ev.startTime}–${ev.endTime})`,
    });
  }
}

export async function loginWithId(usernameOrEmail, password) {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured. Add VITE_FIREBASE_* keys to .env.local or Vercel.');
  }
  const email = toAuthEmail(usernameOrEmail);
  const shortId = email.split('@')[0];

  let cred;
  try {
    cred = await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    // Auto-provision known demo preset on first login in a fresh Firebase project
    const preset = DEMO_PRESETS[shortId];
    if (preset && password === preset.pass) {
      cred = await createUserWithEmailAndPassword(auth, email, password);
      const profile = {
        id: cred.user.uid,
        username: preset.username,
        email,
        name: preset.name,
        title: preset.title,
        role: preset.role,
        department: preset.department,
        gsControl: preset.gsControl,
        avatarColor: preset.avatarColor,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', cred.user.uid), profile);
      await seedInitialEventsIfEmpty(profile);
      return profile;
    }
    throw new Error(err.message || 'Invalid User ID or password.');
  }

  const userSnap = await getDoc(doc(db, 'users', cred.user.uid));
  if (userSnap.exists()) {
    return { id: cred.user.uid, ...userSnap.data() };
  }

  const preset = DEMO_PRESETS[shortId];
  const fallbackProfile = {
    id: cred.user.uid,
    username: shortId,
    email,
    name: preset?.name || shortId,
    title: preset?.title || 'Team Member',
    role: preset?.role || 'media',
    department: preset?.department || 'Media',
    gsControl: preset?.gsControl || false,
    avatarColor: preset?.avatarColor || '#4F46E5',
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'users', cred.user.uid), fallbackProfile);
  return fallbackProfile;
}

export async function signUpMember({ username, password, name, department, title }) {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured. Add VITE_FIREBASE_* keys to .env.local or Vercel.');
  }
  const email = toAuthEmail(username);
  const cleanUsername = email.split('@')[0];
  const chosenDept = department === 'Operations' ? 'Operations' : 'Media';
  const assignedRole = chosenDept === 'Operations' ? 'operations' : 'media';

  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const profile = {
    id: cred.user.uid,
    username: cleanUsername,
    email,
    name: String(name).trim(),
    title: title ? String(title).trim() : `${chosenDept} Member`,
    role: assignedRole,
    department: chosenDept,
    gsControl: false,
    avatarColor: chosenDept === 'Operations' ? '#0284C7' : '#E11D48',
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'users', cred.user.uid), profile);
  await addDoc(collection(db, 'auditLogs'), {
    timestamp: new Date().toISOString(),
    actorId: profile.id,
    actorName: profile.name,
    actorRole: profile.role,
    action: 'SIGNED_UP',
    targetType: 'Account',
    targetId: profile.id,
    targetTitle: `${profile.name} (@${profile.username})`,
    department: profile.department,
    details: `Registered new ${profile.department} account.`,
  });

  return profile;
}

export async function logoutUser() {
  if (auth) await signOut(auth);
}

export function subscribeToAuth(callback) {
  if (!isFirebaseConfigured || !auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) {
      callback(null);
      return;
    }
    const snap = await getDoc(doc(db, 'users', fbUser.uid));
    if (snap.exists()) {
      callback({ id: fbUser.uid, ...snap.data() });
    } else {
      callback({
        id: fbUser.uid,
        username: (fbUser.email || '').split('@')[0],
        email: fbUser.email,
        name: fbUser.email?.split('@')[0] || 'Member',
        title: 'Team Member',
        role: 'media',
        department: 'Media',
        gsControl: false,
        avatarColor: '#4F46E5',
      });
    }
  });
}

export function subscribeToEvents(callback) {
  if (!db) return () => {};
  return onSnapshot(collection(db, 'events'), (snapshot) => {
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(items);
  });
}

export async function createCalendarEvent(formData, user) {
  if (!canUserEditDepartment(user, formData.department)) {
    throw new Error(`Permission denied: ${user.department} cannot create ${formData.department} events.`);
  }
  const now = new Date().toISOString();
  const payload = {
    ...formData,
    createdBy: user.id,
    createdByName: user.name,
    updatedBy: user.id,
    updatedByName: user.name,
    updatedAt: now,
  };
  const ref = await addDoc(collection(db, 'events'), payload);
  await addDoc(collection(db, 'auditLogs'), {
    timestamp: now,
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: 'CREATED',
    targetType: 'Event',
    targetId: ref.id,
    targetTitle: formData.title,
    department: formData.department,
    details: `Scheduled for ${formData.date} (${formData.startTime}–${formData.endTime}) • Priority: ${formData.priority}`,
  });
}

export async function updateCalendarEvent(eventId, formData, existingEvent, user) {
  if (!canUserEditDepartment(user, existingEvent.department) || !canUserEditDepartment(user, formData.department)) {
    throw new Error(`Permission denied: You cannot edit ${existingEvent.department} events.`);
  }
  const trackedFields = ['title', 'department', 'date', 'startTime', 'endTime', 'status', 'priority', 'assignee', 'location'];
  const changes = [];
  for (const field of trackedFields) {
    if (formData[field] !== undefined && formData[field] !== existingEvent[field]) {
      changes.push(`${field}: "${existingEvent[field]}" → "${formData[field]}"`);
    }
  }
  if (formData.description !== undefined && formData.description !== existingEvent.description) {
    changes.push('updated description');
  }

  const now = new Date().toISOString();
  await updateDoc(doc(db, 'events', eventId), {
    ...formData,
    updatedBy: user.id,
    updatedByName: user.name,
    updatedAt: now,
  });
  await addDoc(collection(db, 'auditLogs'), {
    timestamp: now,
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: 'UPDATED',
    targetType: 'Event',
    targetId: eventId,
    targetTitle: formData.title,
    department: formData.department,
    details: changes.length > 0 ? changes.join('; ') : 'Saved event details.',
  });
}

export async function deleteCalendarEvent(existingEvent, user) {
  if (!canUserEditDepartment(user, existingEvent.department)) {
    throw new Error(`Permission denied: You cannot delete ${existingEvent.department} events.`);
  }
  await deleteDoc(doc(db, 'events', existingEvent.id));
  await addDoc(collection(db, 'auditLogs'), {
    timestamp: new Date().toISOString(),
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: 'DELETED',
    targetType: 'Event',
    targetId: existingEvent.id,
    targetTitle: existingEvent.title,
    department: existingEvent.department,
    details: `Removed event originally scheduled for ${existingEvent.date}.`,
  });
}

export function subscribeToGSReport(callback) {
  if (!db) return () => {};
  let latestLogs = [];
  let latestUsers = [];

  const unsubLogs = onSnapshot(
    query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(200)),
    (snap) => {
      latestLogs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback({ auditLogs: latestLogs, users: latestUsers });
    }
  );
  const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
    latestUsers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback({ auditLogs: latestLogs, users: latestUsers });
  });

  return () => {
    unsubLogs();
    unsubUsers();
  };
}

export async function updateMemberPermissions(targetUser, updates, actorUser) {
  const changes = [];
  const next = { ...updates };
  if (updates.role && updates.role !== targetUser.role) {
    changes.push(`role: ${targetUser.role} → ${updates.role}`);
    if (updates.role === 'core_council' || updates.role === 'gs_control') next.department = 'Core Council';
    if (updates.role === 'media') next.department = 'Media';
    if (updates.role === 'operations') next.department = 'Operations';
  }
  if (typeof updates.gsControl === 'boolean' && updates.gsControl !== targetUser.gsControl) {
    changes.push(`GS Control: ${targetUser.gsControl} → ${updates.gsControl}`);
  }

  await updateDoc(doc(db, 'users', targetUser.id), next);
  if (changes.length > 0) {
    await addDoc(collection(db, 'auditLogs'), {
      timestamp: new Date().toISOString(),
      actorId: actorUser.id,
      actorName: actorUser.name,
      actorRole: actorUser.role,
      action: 'ROLE_CHANGED',
      targetType: 'User',
      targetId: targetUser.id,
      targetTitle: targetUser.name,
      department: next.department || targetUser.department,
      details: changes.join('; '),
    });
  }
}

export const DEPARTMENT_META = {
  Media: {
    label: 'Media',
    shortLabel: 'Media',
    badge: 'bg-rose-50 text-rose-700 border-rose-200/80',
    pillActive: 'bg-rose-600 text-white border-rose-600',
    eventChip:
      'bg-rose-50/95 hover:bg-rose-100/90 text-rose-950 border border-rose-200/70 border-l-[3px] border-l-rose-500',
    dot: 'bg-rose-500',
    bar: 'bg-rose-500',
    strip: 'bg-rose-500',
  },
  Operations: {
    label: 'Operations (Tech)',
    shortLabel: 'Operations',
    badge: 'bg-sky-50 text-sky-700 border-sky-200/80',
    pillActive: 'bg-sky-600 text-white border-sky-600',
    eventChip:
      'bg-sky-50/95 hover:bg-sky-100/90 text-sky-950 border border-sky-200/70 border-l-[3px] border-l-sky-500',
    dot: 'bg-sky-500',
    bar: 'bg-sky-500',
    strip: 'bg-sky-500',
  },
  'Core Council': {
    label: 'Core Council',
    shortLabel: 'Core Council',
    badge: 'bg-amber-50 text-amber-800 border-amber-200/80',
    pillActive: 'bg-amber-500 text-white border-amber-500',
    eventChip:
      'bg-amber-50/95 hover:bg-amber-100/90 text-amber-950 border border-amber-200/70 border-l-[3px] border-l-amber-500',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
    strip: 'bg-amber-500',
  },
};

export const ROLE_LABELS = {
  gs_control: 'GS Control',
  core_council: 'Core Council',
  media: 'Media Team',
  operations: 'Operations (Tech)',
};

export function hasGSControlAccess(user) {
  if (!user) return false;
  return user.role === 'gs_control' || user.role === 'core_council' || Boolean(user.gsControl);
}

export function canUserEditDepartment(user, department) {
  if (!user) return false;
  if (user.role === 'core_council' || user.role === 'gs_control' || user.gsControl) {
    return true;
  }
  if (user.role === 'media' && department === 'Media') return true;
  if (user.role === 'operations' && department === 'Operations') return true;
  return false;
}

export function getAllowedCreateDepartments(user) {
  if (!user) return [];
  if (user.role === 'core_council' || user.role === 'gs_control' || user.gsControl) {
    return ['Media', 'Operations', 'Core Council'];
  }
  if (user.role === 'media') return ['Media'];
  if (user.role === 'operations') return ['Operations'];
  return [];
}
