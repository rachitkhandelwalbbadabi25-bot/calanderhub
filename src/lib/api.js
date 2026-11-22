import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
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
import { findRosterMember, COUNCIL_STARTER_PASS } from './roster';

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
      title: 'NHRDN Tech & Ops Portal Sync',
      department: 'Operations',
      date: getDateOffset(0),
      startTime: '17:00',
      endTime: '18:30',
      status: 'In Progress',
      priority: 'High',
      assignee: 'Bansham Gupta & Rachit Khandelwal',
      location: 'Tech Lab',
      description: 'Verify NHRDN Mathura Chapter portal deployment and member access.',
    },
    {
      title: 'Media & Branding Launch Reel',
      department: 'Media',
      date: getDateOffset(0),
      startTime: '14:00',
      endTime: '16:00',
      status: 'Scheduled',
      priority: 'High',
      assignee: 'Vidhi Bathija & Krishna Gupta',
      location: 'Campus Quad',
      description: 'Shoot council intro reel and branding assets for NHRDN Mathura Chapter.',
    },
    {
      title: 'Core Council Executive Alignment',
      department: 'Core Council',
      date: getDateOffset(1),
      startTime: '11:00',
      endTime: '12:30',
      status: 'Scheduled',
      priority: 'Critical',
      assignee: 'Aditya Chauhan, Nrisingha Kripa Das & Brajika Poudel',
      location: 'Conference Room A',
      description: 'Monthly roadmap, treasury sign-off, and faculty review with Sushmita Ma\'am.',
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
  const rosterEntry = findRosterMember(usernameOrEmail) || findRosterMember(email);

  let cred;
  try {
    cred = await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    // Auto-provision official NHRDN roster members on first login with starter password (or admin123 for Sushmita Ma'am)
    const isValidStarter =
      rosterEntry &&
      (password === COUNCIL_STARTER_PASS || (rosterEntry.email === 'sushmita@councilflow.app' && password === 'admin123'));

    if (isValidStarter) {
      cred = await createUserWithEmailAndPassword(auth, email, password);
      const profile = {
        id: cred.user.uid,
        username: shortId,
        email,
        name: rosterEntry.name,
        title: rosterEntry.title,
        teamCategory: rosterEntry.teamCategory,
        role: rosterEntry.role,
        department: rosterEntry.department,
        gsControl: rosterEntry.gsControl,
        avatarColor: rosterEntry.avatarColor,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', cred.user.uid), profile);
      await seedInitialEventsIfEmpty(profile);
      return profile;
    }
    throw new Error(err.message || 'Invalid Email / User ID or password.');
  }

  const userSnap = await getDoc(doc(db, 'users', cred.user.uid));
  if (userSnap.exists()) {
    return { id: cred.user.uid, ...userSnap.data() };
  }

  const profile = {
    id: cred.user.uid,
    username: shortId,
    email,
    name: rosterEntry?.name || shortId,
    title: rosterEntry?.title || 'Team Member',
    teamCategory: rosterEntry?.teamCategory || 'Media',
    role: rosterEntry?.role || 'media',
    department: rosterEntry?.department || 'Media',
    gsControl: rosterEntry?.gsControl || false,
    avatarColor: rosterEntry?.avatarColor || '#4F46E5',
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'users', cred.user.uid), profile);
  return profile;
}

export async function signUpMember({ username, password, name, department, title }) {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured. Add VITE_FIREBASE_* keys to .env.local or Vercel.');
  }
  const email = toAuthEmail(username);
  const cleanUsername = email.split('@')[0];
  const rosterEntry = findRosterMember(username) || findRosterMember(email);

  const chosenDept = rosterEntry?.department || (department === 'Operations' ? 'Operations' : 'Media');
  const assignedRole = rosterEntry?.role || (chosenDept === 'Operations' ? 'operations' : 'media');

  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const profile = {
    id: cred.user.uid,
    username: cleanUsername,
    email,
    name: rosterEntry?.name || String(name).trim(),
    title: rosterEntry?.title || (title ? String(title).trim() : `${chosenDept} Member`),
    teamCategory: rosterEntry?.teamCategory || chosenDept,
    role: assignedRole,
    department: chosenDept,
    gsControl: rosterEntry?.gsControl || false,
    avatarColor: rosterEntry?.avatarColor || (chosenDept === 'Operations' ? '#0284C7' : '#E11D48'),
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
    targetTitle: `${profile.name} (${profile.email})`,
    department: profile.department,
    details: `Activated ${profile.title} account (${profile.teamCategory}).`,
  });

  await seedInitialEventsIfEmpty(profile);
  return profile;
}

export async function loginWithGoogle() {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured. Add VITE_FIREBASE_* keys to .env.local or Vercel.');
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  const fbUser = cred.user;
  const email = (fbUser.email || '').toLowerCase();
  const shortId = email.split('@')[0];
  const rosterEntry = findRosterMember(email);

  const userRef = doc(db, 'users', fbUser.uid);
  try {
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const existing = { id: fbUser.uid, ...userSnap.data() };
      if (rosterEntry && existing.role !== rosterEntry.role) {
        const synced = {
          ...existing,
          name: rosterEntry.name,
          title: rosterEntry.title,
          teamCategory: rosterEntry.teamCategory,
          role: rosterEntry.role,
          department: rosterEntry.department,
          gsControl: rosterEntry.gsControl,
          avatarColor: rosterEntry.avatarColor,
        };
        await setDoc(userRef, synced, { merge: true });
        return synced;
      }
      return existing;
    }
  } catch (err) {
    console.error('Firestore read user failed:', err);
  }

  const profile = {
    id: fbUser.uid,
    username: shortId,
    email,
    name: rosterEntry?.name || fbUser.displayName || shortId,
    title: rosterEntry?.title || 'Team Member',
    teamCategory: rosterEntry?.teamCategory || 'Media',
    role: rosterEntry?.role || 'media',
    department: rosterEntry?.department || 'Media',
    gsControl: rosterEntry?.gsControl || false,
    avatarColor: rosterEntry?.avatarColor || '#4F46E5',
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(userRef, profile);
    await addDoc(collection(db, 'auditLogs'), {
      timestamp: new Date().toISOString(),
      actorId: profile.id,
      actorName: profile.name,
      actorRole: profile.role,
      action: 'SIGNED_UP',
      targetType: 'Account',
      targetId: profile.id,
      targetTitle: `${profile.name} (${profile.email})`,
      department: profile.department,
      details: `Signed in via Google (${profile.title}).`,
    });
    await seedInitialEventsIfEmpty(profile);
  } catch (err) {
    console.error('Firestore write user/seed failed:', err);
  }
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
    const rosterEntry = findRosterMember(fbUser.email);
    const immediateProfile = {
      id: fbUser.uid,
      username: (fbUser.email || '').split('@')[0],
      email: fbUser.email,
      name: rosterEntry?.name || fbUser.displayName || fbUser.email?.split('@')[0] || 'Member',
      title: rosterEntry?.title || 'Team Member',
      teamCategory: rosterEntry?.teamCategory || 'Operations',
      role: rosterEntry?.role || 'operations',
      department: rosterEntry?.department || 'Operations',
      gsControl: rosterEntry?.gsControl || false,
      avatarColor: rosterEntry?.avatarColor || '#0284C7',
    };
    // Deliver immediately so workspace renders in 0ms without waiting on Firestore roundtrip
    callback(immediateProfile);

    try {
      const userRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        if (rosterEntry && data.role !== rosterEntry.role) {
          const synced = { ...data, ...immediateProfile };
          await setDoc(userRef, synced, { merge: true });
          callback(synced);
        } else {
          callback({ id: fbUser.uid, ...data });
        }
      }
    } catch (err) {
      console.error('Firestore user profile sync failed:', err);
    }
  });
}

export async function updateOwnProfile(currentUser, { name, title, department }) {
  const cleanDept = department === 'Media' ? 'Media' : 'Operations';
  const nextRole =
    currentUser.role === 'gs_control' || currentUser.role === 'core_council'
      ? currentUser.role
      : cleanDept === 'Media'
        ? 'media'
        : 'operations';

  const updates = {
    name: String(name || currentUser.name).trim(),
    title: String(title || currentUser.title).trim(),
    department:
      currentUser.role === 'gs_control' || currentUser.role === 'core_council'
        ? currentUser.department
        : cleanDept,
    teamCategory: cleanDept === 'Media' ? 'Media & Branding' : 'Operations & Tech',
    role: nextRole,
    avatarColor: cleanDept === 'Media' ? '#E11D48' : '#0284C7',
  };

  if (db) {
    await setDoc(doc(db, 'users', currentUser.id), updates, { merge: true });
  }
  return { ...currentUser, ...updates };
}

export function subscribeToEvents(callback, onError) {
  if (!db) return () => {};
  return onSnapshot(
    collection(db, 'events'),
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(items);
    },
    (err) => {
      console.error('Firestore events error:', err);
      onError?.(err.message);
    }
  );
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
    query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(60)),
    (snap) => {
      latestLogs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback({ auditLogs: latestLogs, users: latestUsers, ready: true });
    }
  );
  const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
    latestUsers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback({ auditLogs: latestLogs, users: latestUsers, ready: true });
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
