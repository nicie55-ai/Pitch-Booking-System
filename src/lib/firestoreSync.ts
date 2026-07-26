import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import {
  User,
  Booking,
  PitchConfig,
  SlotChangeRequest,
  ClubTeam,
} from '../types';
import { FAFixture, MOCK_USERS, INITIAL_BOOKINGS, DEFAULT_PITCH_CONFIGS, INITIAL_SLOT_CHANGES, MOCK_FA_FULLTIME_FIXTURES, SCOTTER_TEAMS } from '../mockData';

// Helper to remove undefined fields before writing to Firestore
function sanitizeData<T extends Record<string, any>>(obj: T): T {
  const cleanObj: any = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      cleanObj[key] = obj[key];
    }
  });
  return cleanObj as T;
}

// Collections names
const COLLECTIONS = {
  USERS: 'users',
  BOOKINGS: 'bookings',
  FA_FIXTURES: 'faFixtures',
  PITCH_CONFIGS: 'pitchConfigs',
  SLOT_CHANGE_REQUESTS: 'slotChangeRequests',
  TEAMS: 'teams',
};

/**
 * Initialize real-time listeners for all Firestore collections.
 * Automatically seeds default initial data if Firestore collections are empty.
 */
export function subscribeToFirestoreData(callbacks: {
  onUsersUpdate: (users: User[]) => void;
  onBookingsUpdate: (bookings: Booking[]) => void;
  onFaFixturesUpdate: (fixtures: FAFixture[]) => void;
  onPitchConfigsUpdate: (configs: PitchConfig[]) => void;
  onSlotChangeRequestsUpdate: (requests: SlotChangeRequest[]) => void;
  onTeamsUpdate?: (teams: ClubTeam[]) => void;
}) {
  const unsubscribers: (() => void)[] = [];

  // 1. Users Subscription
  const usersRef = collection(db, COLLECTIONS.USERS);
  const unsubUsers = onSnapshot(usersRef, async (snapshot) => {
    if (snapshot.empty) {
      // Seed default users
      const batch = writeBatch(db);
      MOCK_USERS.forEach((u) => {
        batch.set(doc(db, COLLECTIONS.USERS, u.id), sanitizeData(u));
      });
      await batch.commit();
    } else {
      const usersList: User[] = snapshot.docs.map((d) => d.data() as User);
      callbacks.onUsersUpdate(usersList);
    }
  }, (err) => console.error('Error listening to users collection:', err));
  unsubscribers.push(unsubUsers);

  // 2. Bookings Subscription
  const bookingsRef = collection(db, COLLECTIONS.BOOKINGS);
  const unsubBookings = onSnapshot(bookingsRef, async (snapshot) => {
    const hasBeenInitialized = localStorage.getItem('scotter_jfc_bookings_initialized');
    if (snapshot.empty) {
      if (!hasBeenInitialized) {
        localStorage.setItem('scotter_jfc_bookings_initialized', 'true');
        const batch = writeBatch(db);
        INITIAL_BOOKINGS.forEach((b) => {
          batch.set(doc(db, COLLECTIONS.BOOKINGS, b.id), sanitizeData(b));
        });
        await batch.commit();
      } else {
        callbacks.onBookingsUpdate([]);
      }
    } else {
      localStorage.setItem('scotter_jfc_bookings_initialized', 'true');
      const bookingsList: Booking[] = snapshot.docs.map((d) => d.data() as Booking);
      callbacks.onBookingsUpdate(bookingsList);
    }
  }, (err) => console.error('Error listening to bookings collection:', err));
  unsubscribers.push(unsubBookings);

  // 3. FA Fixtures Subscription
  const faFixturesRef = collection(db, COLLECTIONS.FA_FIXTURES);
  const unsubFaFixtures = onSnapshot(faFixturesRef, async (snapshot) => {
    const hasBeenInitialized = localStorage.getItem('scotter_jfc_fafixtures_initialized');
    if (snapshot.empty) {
      if (!hasBeenInitialized) {
        localStorage.setItem('scotter_jfc_fafixtures_initialized', 'true');
        const batch = writeBatch(db);
        MOCK_FA_FULLTIME_FIXTURES.forEach((f) => {
          batch.set(doc(db, COLLECTIONS.FA_FIXTURES, f.id), sanitizeData(f));
        });
        await batch.commit();
      } else {
        callbacks.onFaFixturesUpdate([]);
      }
    } else {
      localStorage.setItem('scotter_jfc_fafixtures_initialized', 'true');
      const fixturesList: FAFixture[] = snapshot.docs.map((d) => d.data() as FAFixture);
      callbacks.onFaFixturesUpdate(fixturesList);
    }
  }, (err) => console.error('Error listening to faFixtures collection:', err));
  unsubscribers.push(unsubFaFixtures);

  // 4. Pitch Configs Subscription
  const pitchConfigsRef = collection(db, COLLECTIONS.PITCH_CONFIGS);
  const unsubPitchConfigs = onSnapshot(pitchConfigsRef, async (snapshot) => {
    if (snapshot.empty) {
      const batch = writeBatch(db);
      DEFAULT_PITCH_CONFIGS.forEach((p) => {
        batch.set(doc(db, COLLECTIONS.PITCH_CONFIGS, p.id), sanitizeData(p));
      });
      await batch.commit();
    } else {
      const configsList: PitchConfig[] = snapshot.docs.map((d) => d.data() as PitchConfig);
      callbacks.onPitchConfigsUpdate(configsList);
    }
  }, (err) => console.error('Error listening to pitchConfigs collection:', err));
  unsubscribers.push(unsubPitchConfigs);

  // 5. Slot Change Requests Subscription
  const slotChangesRef = collection(db, COLLECTIONS.SLOT_CHANGE_REQUESTS);
  const unsubSlotChanges = onSnapshot(slotChangesRef, async (snapshot) => {
    if (snapshot.empty) {
      const batch = writeBatch(db);
      INITIAL_SLOT_CHANGES.forEach((s) => {
        batch.set(doc(db, COLLECTIONS.SLOT_CHANGE_REQUESTS, s.id), sanitizeData(s));
      });
      await batch.commit();
    } else {
      const requestsList: SlotChangeRequest[] = snapshot.docs.map((d) => d.data() as SlotChangeRequest);
      callbacks.onSlotChangeRequestsUpdate(requestsList);
    }
  }, (err) => console.error('Error listening to slotChangeRequests collection:', err));
  unsubscribers.push(unsubSlotChanges);

  // 6. Teams Subscription
  const teamsRef = collection(db, COLLECTIONS.TEAMS);
  const unsubTeams = onSnapshot(teamsRef, async (snapshot) => {
    if (snapshot.empty) {
      const batch = writeBatch(db);
      SCOTTER_TEAMS.forEach((t) => {
        batch.set(doc(db, COLLECTIONS.TEAMS, t.id), sanitizeData(t));
      });
      await batch.commit();
    } else {
      const teamsList: ClubTeam[] = snapshot.docs.map((d) => d.data() as ClubTeam);
      if (callbacks.onTeamsUpdate) {
        callbacks.onTeamsUpdate(teamsList);
      }
    }
  }, (err) => console.error('Error listening to teams collection:', err));
  unsubscribers.push(unsubTeams);

  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}

// Data Mutation Utilities

// Teams
export async function saveTeamToFirestore(team: ClubTeam) {
  await setDoc(doc(db, COLLECTIONS.TEAMS, team.id), sanitizeData(team), { merge: true });
}

export async function saveTeamsListToFirestore(teams: ClubTeam[]) {
  const batch = writeBatch(db);
  teams.forEach((t) => {
    batch.set(doc(db, COLLECTIONS.TEAMS, t.id), sanitizeData(t));
  });
  await batch.commit();
}

export async function deleteTeamFromFirestore(teamId: string) {
  await deleteDoc(doc(db, COLLECTIONS.TEAMS, teamId));
}

export async function syncTeamsListToFirestore(teams: ClubTeam[]) {
  const snapshot = await getDocs(collection(db, COLLECTIONS.TEAMS));
  const newIds = new Set(teams.map((t) => t.id));
  const batch = writeBatch(db);

  snapshot.docs.forEach((docSnap) => {
    if (!newIds.has(docSnap.id)) {
      batch.delete(docSnap.ref);
    }
  });

  teams.forEach((t) => {
    batch.set(doc(db, COLLECTIONS.TEAMS, t.id), sanitizeData(t));
  });

  await batch.commit();
}

// Users / Coaches
export async function saveUserToFirestore(user: User) {
  await setDoc(doc(db, COLLECTIONS.USERS, user.id), sanitizeData(user), { merge: true });
}

export async function saveUsersListToFirestore(users: User[]) {
  const batch = writeBatch(db);
  users.forEach((u) => {
    batch.set(doc(db, COLLECTIONS.USERS, u.id), sanitizeData(u));
  });
  await batch.commit();
}

export async function syncUsersListToFirestore(users: User[]) {
  const snapshot = await getDocs(collection(db, COLLECTIONS.USERS));
  const newIds = new Set(users.map((u) => u.id));
  const batch = writeBatch(db);

  snapshot.docs.forEach((docSnap) => {
    if (!newIds.has(docSnap.id)) {
      batch.delete(docSnap.ref);
    }
  });

  users.forEach((u) => {
    batch.set(doc(db, COLLECTIONS.USERS, u.id), sanitizeData(u));
  });

  await batch.commit();
}

export async function deleteUserFromFirestore(userId: string) {
  await deleteDoc(doc(db, COLLECTIONS.USERS, userId));
}

// Bookings
export async function saveBookingToFirestore(booking: Booking) {
  await setDoc(doc(db, COLLECTIONS.BOOKINGS, booking.id), sanitizeData(booking), { merge: true });
}

export async function saveBookingsBulkToFirestore(bookings: Booking[]) {
  const batch = writeBatch(db);
  bookings.forEach((b) => {
    batch.set(doc(db, COLLECTIONS.BOOKINGS, b.id), sanitizeData(b));
  });
  await batch.commit();
}

export async function deleteBookingFromFirestore(bookingId: string) {
  await deleteDoc(doc(db, COLLECTIONS.BOOKINGS, bookingId));
}

export async function syncBookingsListToFirestore(bookings: Booking[]) {
  const snapshot = await getDocs(collection(db, COLLECTIONS.BOOKINGS));
  const newIds = new Set(bookings.map((b) => b.id));
  const batch = writeBatch(db);

  snapshot.docs.forEach((docSnap) => {
    if (!newIds.has(docSnap.id)) {
      batch.delete(docSnap.ref);
    }
  });

  bookings.forEach((b) => {
    batch.set(doc(db, COLLECTIONS.BOOKINGS, b.id), sanitizeData(b));
  });

  await batch.commit();
}

// FA Fixtures
export async function saveFaFixtureToFirestore(fixture: FAFixture) {
  await setDoc(doc(db, COLLECTIONS.FA_FIXTURES, fixture.id), sanitizeData(fixture), { merge: true });
}

export async function saveFaFixturesBulkToFirestore(fixtures: FAFixture[]) {
  const batch = writeBatch(db);
  fixtures.forEach((f) => {
    batch.set(doc(db, COLLECTIONS.FA_FIXTURES, f.id), sanitizeData(f));
  });
  await batch.commit();
}

export async function deleteFaFixtureFromFirestore(fixtureId: string) {
  await deleteDoc(doc(db, COLLECTIONS.FA_FIXTURES, fixtureId));
}

export async function syncFaFixturesListToFirestore(fixtures: FAFixture[]) {
  // First get existing docs to delete any removed
  const snapshot = await getDocs(collection(db, COLLECTIONS.FA_FIXTURES));
  const newIds = new Set(fixtures.map((f) => f.id));
  const batch = writeBatch(db);

  snapshot.docs.forEach((docSnap) => {
    if (!newIds.has(docSnap.id)) {
      batch.delete(docSnap.ref);
    }
  });

  fixtures.forEach((f) => {
    batch.set(doc(db, COLLECTIONS.FA_FIXTURES, f.id), sanitizeData(f));
  });

  await batch.commit();
}

// Pitch Configs
export async function savePitchConfigToFirestore(config: PitchConfig) {
  await setDoc(doc(db, COLLECTIONS.PITCH_CONFIGS, config.id), sanitizeData(config), { merge: true });
}

export async function savePitchConfigsListToFirestore(configs: PitchConfig[]) {
  const batch = writeBatch(db);
  configs.forEach((c) => {
    batch.set(doc(db, COLLECTIONS.PITCH_CONFIGS, c.id), sanitizeData(c));
  });
  await batch.commit();
}

// Slot Change Requests
export async function saveSlotChangeRequestToFirestore(request: SlotChangeRequest) {
  await setDoc(doc(db, COLLECTIONS.SLOT_CHANGE_REQUESTS, request.id), sanitizeData(request), { merge: true });
}

export async function deleteSlotChangeRequestFromFirestore(requestId: string) {
  await deleteDoc(doc(db, COLLECTIONS.SLOT_CHANGE_REQUESTS, requestId));
}
