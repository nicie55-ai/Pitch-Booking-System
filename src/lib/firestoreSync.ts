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

  try {
    // 1. Users Subscription
    const usersRef = collection(db, COLLECTIONS.USERS);
    const unsubUsers = onSnapshot(usersRef, async (snapshot) => {
      try {
        if (snapshot.empty) {
          // Seed default users
          const batch = writeBatch(db);
          MOCK_USERS.forEach((u) => {
            batch.set(doc(db, COLLECTIONS.USERS, u.id), sanitizeData(u));
          });
          await batch.commit().catch(() => {});
        } else {
          const usersList: User[] = snapshot.docs.map((d) => d.data() as User);
          // Auto-upsert any missing default user accounts into Firestore
          const existingIds = new Set(usersList.map((u) => u.id));
          const missingUsers = MOCK_USERS.filter((u) => !existingIds.has(u.id));
          if (missingUsers.length > 0) {
            const batch = writeBatch(db);
            missingUsers.forEach((u) => {
              batch.set(doc(db, COLLECTIONS.USERS, u.id), sanitizeData(u));
            });
            await batch.commit().catch(() => {});
          }
          callbacks.onUsersUpdate(usersList);
        }
      } catch (err) {
        console.warn('Users snapshot process notice:', err);
      }
    }, (err) => console.warn('Users collection listener notice (offline/reconnecting):', err?.message || err));
    unsubscribers.push(unsubUsers);

    // 2. Bookings Subscription
    const bookingsRef = collection(db, COLLECTIONS.BOOKINGS);
    const unsubBookings = onSnapshot(bookingsRef, async (snapshot) => {
      try {
        const hasBeenInitialized = localStorage.getItem('scotter_jfc_bookings_initialized');
        if (snapshot.empty) {
          if (!hasBeenInitialized) {
            localStorage.setItem('scotter_jfc_bookings_initialized', 'true');
            const batch = writeBatch(db);
            INITIAL_BOOKINGS.forEach((b) => {
              batch.set(doc(db, COLLECTIONS.BOOKINGS, b.id), sanitizeData(b));
            });
            await batch.commit().catch(() => {});
          } else {
            callbacks.onBookingsUpdate([]);
          }
        } else {
          localStorage.setItem('scotter_jfc_bookings_initialized', 'true');
          const bookingsList: Booking[] = snapshot.docs.map((d) => d.data() as Booking);
          callbacks.onBookingsUpdate(bookingsList);
        }
      } catch (err) {
        console.warn('Bookings snapshot process notice:', err);
      }
    }, (err) => console.warn('Bookings collection listener notice (offline/reconnecting):', err?.message || err));
    unsubscribers.push(unsubBookings);

    // 3. FA Fixtures Subscription
    const faFixturesRef = collection(db, COLLECTIONS.FA_FIXTURES);
    const unsubFaFixtures = onSnapshot(faFixturesRef, async (snapshot) => {
      try {
        const hasBeenInitialized = localStorage.getItem('scotter_jfc_fafixtures_initialized');
        if (snapshot.empty) {
          if (!hasBeenInitialized) {
            localStorage.setItem('scotter_jfc_fafixtures_initialized', 'true');
            const batch = writeBatch(db);
            MOCK_FA_FULLTIME_FIXTURES.forEach((f) => {
              batch.set(doc(db, COLLECTIONS.FA_FIXTURES, f.id), sanitizeData(f));
            });
            await batch.commit().catch(() => {});
          } else {
            callbacks.onFaFixturesUpdate([]);
          }
        } else {
          localStorage.setItem('scotter_jfc_fafixtures_initialized', 'true');
          const fixturesList: FAFixture[] = snapshot.docs.map((d) => d.data() as FAFixture);
          callbacks.onFaFixturesUpdate(fixturesList);
        }
      } catch (err) {
        console.warn('FA Fixtures snapshot process notice:', err);
      }
    }, (err) => console.warn('FA Fixtures listener notice (offline/reconnecting):', err?.message || err));
    unsubscribers.push(unsubFaFixtures);

    // 4. Pitch Configs Subscription
    const pitchConfigsRef = collection(db, COLLECTIONS.PITCH_CONFIGS);
    const unsubPitchConfigs = onSnapshot(pitchConfigsRef, async (snapshot) => {
      try {
        if (snapshot.empty) {
          const batch = writeBatch(db);
          DEFAULT_PITCH_CONFIGS.forEach((p) => {
            batch.set(doc(db, COLLECTIONS.PITCH_CONFIGS, p.id), sanitizeData(p));
          });
          await batch.commit().catch(() => {});
        } else {
          const configsList: PitchConfig[] = snapshot.docs.map((d) => d.data() as PitchConfig);
          callbacks.onPitchConfigsUpdate(configsList);
        }
      } catch (err) {
        console.warn('Pitch Configs snapshot process notice:', err);
      }
    }, (err) => console.warn('Pitch Configs listener notice (offline/reconnecting):', err?.message || err));
    unsubscribers.push(unsubPitchConfigs);

    // 5. Slot Change Requests Subscription
    const slotChangesRef = collection(db, COLLECTIONS.SLOT_CHANGE_REQUESTS);
    const unsubSlotChanges = onSnapshot(slotChangesRef, async (snapshot) => {
      try {
        if (snapshot.empty) {
          const batch = writeBatch(db);
          INITIAL_SLOT_CHANGES.forEach((s) => {
            batch.set(doc(db, COLLECTIONS.SLOT_CHANGE_REQUESTS, s.id), sanitizeData(s));
          });
          await batch.commit().catch(() => {});
        } else {
          const requestsList: SlotChangeRequest[] = snapshot.docs.map((d) => d.data() as SlotChangeRequest);
          callbacks.onSlotChangeRequestsUpdate(requestsList);
        }
      } catch (err) {
        console.warn('Slot Changes snapshot process notice:', err);
      }
    }, (err) => console.warn('Slot Changes listener notice (offline/reconnecting):', err?.message || err));
    unsubscribers.push(unsubSlotChanges);

    // 6. Teams Subscription
    const teamsRef = collection(db, COLLECTIONS.TEAMS);
    const unsubTeams = onSnapshot(teamsRef, async (snapshot) => {
      try {
        if (snapshot.empty) {
          const batch = writeBatch(db);
          SCOTTER_TEAMS.forEach((t) => {
            batch.set(doc(db, COLLECTIONS.TEAMS, t.id), sanitizeData(t));
          });
          await batch.commit().catch(() => {});
        } else {
          const teamsList: ClubTeam[] = snapshot.docs.map((d) => d.data() as ClubTeam);
          if (callbacks.onTeamsUpdate) {
            callbacks.onTeamsUpdate(teamsList);
          }
        }
      } catch (err) {
        console.warn('Teams snapshot process notice:', err);
      }
    }, (err) => console.warn('Teams listener notice (offline/reconnecting):', err?.message || err));
    unsubscribers.push(unsubTeams);
  } catch (globalListenerErr) {
    console.warn('Firestore subscription initialized with offline fallback:', globalListenerErr);
  }

  return () => {
    unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
  };
}

// Data Mutation Utilities

// Teams
export async function saveTeamToFirestore(team: ClubTeam) {
  try {
    await setDoc(doc(db, COLLECTIONS.TEAMS, team.id), sanitizeData(team), { merge: true });
  } catch (err) {
    console.warn('Failed saving team to Firestore (saved locally):', err);
  }
}

export async function saveTeamsListToFirestore(teams: ClubTeam[]) {
  try {
    const batch = writeBatch(db);
    teams.forEach((t) => {
      batch.set(doc(db, COLLECTIONS.TEAMS, t.id), sanitizeData(t));
    });
    await batch.commit();
  } catch (err) {
    console.warn('Failed saving teams list to Firestore (saved locally):', err);
  }
}

export async function deleteTeamFromFirestore(teamId: string) {
  try {
    await deleteDoc(doc(db, COLLECTIONS.TEAMS, teamId));
  } catch (err) {
    console.warn('Failed deleting team from Firestore:', err);
  }
}

export async function syncTeamsListToFirestore(teams: ClubTeam[]) {
  try {
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
  } catch (err) {
    console.warn('Failed syncing teams to Firestore (cached locally):', err);
  }
}

// Users / Coaches
export async function saveUserToFirestore(user: User) {
  try {
    await setDoc(doc(db, COLLECTIONS.USERS, user.id), sanitizeData(user), { merge: true });
  } catch (err) {
    console.warn('Failed saving user to Firestore (saved locally):', err);
  }
}

export async function saveUsersListToFirestore(users: User[]) {
  try {
    const batch = writeBatch(db);
    users.forEach((u) => {
      batch.set(doc(db, COLLECTIONS.USERS, u.id), sanitizeData(u));
    });
    await batch.commit();
  } catch (err) {
    console.warn('Failed saving users list to Firestore (saved locally):', err);
  }
}

export async function syncUsersListToFirestore(users: User[]) {
  try {
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
  } catch (err) {
    console.warn('Failed syncing users to Firestore (cached locally):', err);
  }
}

export async function deleteUserFromFirestore(userId: string) {
  try {
    await deleteDoc(doc(db, COLLECTIONS.USERS, userId));
  } catch (err) {
    console.warn('Failed deleting user from Firestore:', err);
  }
}

// Bookings
export async function saveBookingToFirestore(booking: Booking) {
  try {
    await setDoc(doc(db, COLLECTIONS.BOOKINGS, booking.id), sanitizeData(booking), { merge: true });
  } catch (err) {
    console.warn('Failed saving booking to Firestore (saved locally):', err);
  }
}

export async function saveBookingsBulkToFirestore(bookings: Booking[]) {
  try {
    const batch = writeBatch(db);
    bookings.forEach((b) => {
      batch.set(doc(db, COLLECTIONS.BOOKINGS, b.id), sanitizeData(b));
    });
    await batch.commit();
  } catch (err) {
    console.warn('Failed saving bulk bookings to Firestore (saved locally):', err);
  }
}

export async function deleteBookingFromFirestore(bookingId: string) {
  try {
    await deleteDoc(doc(db, COLLECTIONS.BOOKINGS, bookingId));
  } catch (err) {
    console.warn('Failed deleting booking from Firestore:', err);
  }
}

export async function syncBookingsListToFirestore(bookings: Booking[]) {
  try {
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
  } catch (err) {
    console.warn('Failed syncing bookings to Firestore (cached locally):', err);
  }
}

// FA Fixtures
export async function saveFaFixtureToFirestore(fixture: FAFixture) {
  try {
    await setDoc(doc(db, COLLECTIONS.FA_FIXTURES, fixture.id), sanitizeData(fixture), { merge: true });
  } catch (err) {
    console.warn('Failed saving FA fixture to Firestore (saved locally):', err);
  }
}

export async function saveFaFixturesBulkToFirestore(fixtures: FAFixture[]) {
  try {
    const batch = writeBatch(db);
    fixtures.forEach((f) => {
      batch.set(doc(db, COLLECTIONS.FA_FIXTURES, f.id), sanitizeData(f));
    });
    await batch.commit();
  } catch (err) {
    console.warn('Failed bulk saving FA fixtures to Firestore (saved locally):', err);
  }
}

export async function deleteFaFixtureFromFirestore(fixtureId: string) {
  try {
    await deleteDoc(doc(db, COLLECTIONS.FA_FIXTURES, fixtureId));
  } catch (err) {
    console.warn('Failed deleting FA fixture from Firestore:', err);
  }
}

export async function syncFaFixturesListToFirestore(fixtures: FAFixture[]) {
  try {
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
  } catch (err) {
    console.warn('Failed syncing FA fixtures to Firestore (cached locally):', err);
  }
}

// Pitch Configs
export async function savePitchConfigToFirestore(config: PitchConfig) {
  try {
    await setDoc(doc(db, COLLECTIONS.PITCH_CONFIGS, config.id), sanitizeData(config), { merge: true });
  } catch (err) {
    console.warn('Failed saving pitch config to Firestore (saved locally):', err);
  }
}

export async function savePitchConfigsListToFirestore(configs: PitchConfig[]) {
  try {
    const batch = writeBatch(db);
    configs.forEach((c) => {
      batch.set(doc(db, COLLECTIONS.PITCH_CONFIGS, c.id), sanitizeData(c));
    });
    await batch.commit();
  } catch (err) {
    console.warn('Failed saving pitch configs to Firestore (saved locally):', err);
  }
}

// Slot Change Requests
export async function saveSlotChangeRequestToFirestore(request: SlotChangeRequest) {
  try {
    await setDoc(doc(db, COLLECTIONS.SLOT_CHANGE_REQUESTS, request.id), sanitizeData(request), { merge: true });
  } catch (err) {
    console.warn('Failed saving slot change request to Firestore (saved locally):', err);
  }
}

export async function deleteSlotChangeRequestFromFirestore(requestId: string) {
  try {
    await deleteDoc(doc(db, COLLECTIONS.SLOT_CHANGE_REQUESTS, requestId));
  } catch (err) {
    console.warn('Failed deleting slot change request from Firestore:', err);
  }
}
