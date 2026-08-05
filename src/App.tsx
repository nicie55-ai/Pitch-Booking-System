/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, ClipboardList, Settings, Shield, User, HelpCircle, CheckCircle, Info, X } from 'lucide-react';

import { Booking, BookingStatus, PitchConfig, PitchSize, SlotChangeRequest, User as UserType, ClubTeam } from './types';
import { DEFAULT_PITCH_CONFIGS, INITIAL_BOOKINGS, INITIAL_SLOT_CHANGES, MOCK_USERS, MOCK_FA_FULLTIME_FIXTURES, FAFixture, SCOTTER_TEAMS } from './mockData';
import {
  subscribeToFirestoreData,
  saveUserToFirestore,
  saveUsersListToFirestore,
  syncUsersListToFirestore,
  deleteUserFromFirestore,
  saveBookingToFirestore,
  saveBookingsBulkToFirestore,
  deleteBookingFromFirestore,
  syncBookingsListToFirestore,
  saveFaFixtureToFirestore,
  syncFaFixturesListToFirestore,
  savePitchConfigsListToFirestore,
  saveSlotChangeRequestToFirestore,
  deleteSlotChangeRequestFromFirestore,
  saveTeamsListToFirestore,
  syncTeamsListToFirestore,
} from './lib/firestoreSync';

export const PITCH_ORDER: Record<string, number> = {
  '3v3': 1,
  '5v5': 2,
  '7v7': 3,
  '9v9': 4,
  '11v11': 5,
};

export function sortPitches(configs: PitchConfig[]): PitchConfig[] {
  return [...configs].sort((a, b) => (PITCH_ORDER[a.id] || 99) - (PITCH_ORDER[b.id] || 99));
}

import Header from './components/Header';
import PitchDiary from './components/PitchDiary';
import RequestManager from './components/RequestManager';
import SlotConfigurator from './components/SlotConfigurator';
import BookingModal from './components/BookingModal';
import CoachesSetup from './components/CoachesSetup';
import LoginModal from './components/LoginModal';

export default function App() {
  // Load initial state from LocalStorage or mock data
  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('scotter_jfc_bookings');
    const parsed: Booking[] = saved ? JSON.parse(saved) : INITIAL_BOOKINGS;
    return parsed.map(b => ({
      ...b,
      teamName: b.teamName ? b.teamName.replace('Scotter United ', '') : '',
    }));
  });

  const [faFixtures, setFaFixtures] = useState<FAFixture[]>(() => {
    const saved = localStorage.getItem('scotter_jfc_fa_fixtures');
    if (saved) {
      return JSON.parse(saved);
    }
    return MOCK_FA_FULLTIME_FIXTURES;
  });

  useEffect(() => {
    localStorage.setItem('scotter_jfc_fa_fixtures', JSON.stringify(faFixtures));
  }, [faFixtures]);

  const [pitchConfigs, setPitchConfigs] = useState<PitchConfig[]>(() => {
    const saved = localStorage.getItem('scotter_jfc_pitch_configs');
    let configs: PitchConfig[] = saved ? JSON.parse(saved) : DEFAULT_PITCH_CONFIGS;
    // Upgrade existing stored configs to new slots automatically
    configs = configs.map(cfg => {
      if (cfg.id === '11v11' && (cfg.defaultSlots.includes('09:30') || cfg.defaultSlots.length === 3)) {
        return { ...cfg, defaultSlots: ['10:00', '12:00', '14:00', '16:00'] };
      }
      if (cfg.id === '9v9' && (cfg.defaultSlots.includes('10:45') || cfg.defaultSlots.includes('12:00'))) {
        return { ...cfg, defaultSlots: ['09:30', '11:00', '12:30'] };
      }
      if (cfg.id === '5v5' && (cfg.defaultSlots.includes('09:30') || cfg.defaultSlots.includes('12:00'))) {
        return { ...cfg, defaultSlots: ['09:45', '10:45', '11:45'] };
      }
      if (cfg.id === '7v7' && cfg.defaultSlots.length === 3) {
        return { ...cfg, defaultSlots: ['09:30', '10:45', '12:00', '13:15'] };
      }
      return cfg;
    });
    // Ensure 3v3 is present
    if (!configs.some(c => c.id === '3v3')) {
      const default3v3 = DEFAULT_PITCH_CONFIGS.find(c => c.id === '3v3');
      if (default3v3) {
        configs.unshift(default3v3);
      }
    }
    return sortPitches(configs);
  });

  const [slotChangeRequests, setSlotChangeRequests] = useState<SlotChangeRequest[]>(() => {
    const saved = localStorage.getItem('scotter_jfc_slot_changes');
    const parsed: SlotChangeRequest[] = saved ? JSON.parse(saved) : INITIAL_SLOT_CHANGES;
    return parsed.map(sc => ({
      ...sc,
      teamName: sc.teamName ? sc.teamName.replace('Scotter United ', '') : '',
    }));
  });

  const [users, setUsers] = useState<UserType[]>(() => {
    const saved = localStorage.getItem('scotter_jfc_users');
    if (saved) {
      try {
        const parsed: UserType[] = JSON.parse(saved);
        return parsed.map((u) => {
          if (u.name.toLowerCase() === 'scotteradmin') {
            return {
              ...u,
              password: 'Riversiders19£',
              teamName: u.teamName === 'Club Admin' ? undefined : u.teamName,
            };
          }
          return u;
        });
      } catch {
        return MOCK_USERS;
      }
    }
    return MOCK_USERS;
  });

  const [teams, setTeams] = useState<ClubTeam[]>(() => {
    const saved = localStorage.getItem('scotter_jfc_teams');
    if (saved) {
      return JSON.parse(saved);
    }
    return SCOTTER_TEAMS;
  });

  useEffect(() => {
    localStorage.setItem('scotter_jfc_teams', JSON.stringify(teams));
  }, [teams]);

  const [currentUser, setCurrentUser] = useState<UserType | null>(() => {
    const saved = localStorage.getItem('scotter_jfc_current_user');
    if (!saved) return null;
    try {
      const parsed: UserType = JSON.parse(saved);
      if (parsed && parsed.teamName) {
        parsed.teamName = parsed.teamName.replace('Scotter United ', '');
      }
      return parsed;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('scotter_jfc_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('scotter_jfc_current_user');
    }
  }, [currentUser]);

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('scotter_jfc_current_user');
    setIsLoginModalOpen(true);
  };

  // Default Selected Date: Current week (dynamically shifted relative to today)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'DIARY' | 'REQUESTS' | 'SLOTS' | 'COACHES'>('DIARY');

  // Protect Admin-only tabs
  useEffect(() => {
    if (currentUser && currentUser.role !== 'ADMIN') {
      if (activeTab === 'SLOTS' || activeTab === 'COACHES') {
        setActiveTab('DIARY');
      }
    }
  }, [currentUser, activeTab]);

  // Booking Modal States
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [modalPrefills, setModalPrefills] = useState<{
    pitchId?: PitchSize;
    slot?: string;
    notes?: string;
    bookingId?: string;
    fixtureId?: string;
  }>({});

  const [bookingConfirmation, setBookingConfirmation] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'info';
  } | null>(null);

  // Auto-dismiss booking confirmation after 6 seconds
  useEffect(() => {
    if (bookingConfirmation?.show) {
      const timer = setTimeout(() => {
        setBookingConfirmation(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [bookingConfirmation]);

  // Real-time synchronization with Firebase Firestore
  useEffect(() => {
    const unsubscribe = subscribeToFirestoreData({
      onUsersUpdate: (fetchedUsers) => {
        if (fetchedUsers && fetchedUsers.length > 0) {
          setUsers(fetchedUsers);
        }
      },
      onTeamsUpdate: (fetchedTeams) => {
        if (fetchedTeams && fetchedTeams.length > 0) {
          setTeams(fetchedTeams);
        }
      },
      onBookingsUpdate: (fetchedBookings) => {
        if (fetchedBookings) {
          setBookings(fetchedBookings);
        }
      },
      onFaFixturesUpdate: (fetchedFixtures) => {
        if (fetchedFixtures) {
          setFaFixtures(fetchedFixtures);
        }
      },
      onPitchConfigsUpdate: (fetchedConfigs) => {
        if (fetchedConfigs) {
          setPitchConfigs(sortPitches(fetchedConfigs));
        }
      },
      onSlotChangeRequestsUpdate: (fetchedRequests) => {
        if (fetchedRequests) {
          setSlotChangeRequests(fetchedRequests);
        }
      },
    });

    return () => unsubscribe();
  }, []);

  // Handlers for state updates with automatic Firestore persistence
  const handleUpdateUsers = (newUsers: UserType[]) => {
    setUsers(newUsers);
    syncUsersListToFirestore(newUsers).catch(console.error);
  };

  const handleUpdateTeams = (newTeams: ClubTeam[]) => {
    setTeams(newTeams);
    syncTeamsListToFirestore(newTeams).catch(console.error);
  };

  const handleRenameTeam = (oldName: string, newName: string, newPitchSize?: PitchSize) => {
    const nextTeams = teams.map((t) =>
      t.name === oldName
        ? { ...t, name: newName, pitchSize: newPitchSize || t.pitchSize }
        : t
    );
    setTeams(nextTeams);
    syncTeamsListToFirestore(nextTeams).catch(console.error);

    const nextUsers = users.map((u) =>
      u.teamName === oldName ? { ...u, teamName: newName } : u
    );
    setUsers(nextUsers);
    syncUsersListToFirestore(nextUsers).catch(console.error);

    if (currentUser && currentUser.teamName === oldName) {
      const updatedSelf = { ...currentUser, teamName: newName };
      setCurrentUser(updatedSelf);
      saveUserToFirestore(updatedSelf).catch(console.error);
    }
  };

  const handlePromoteToNextSeason = () => {
    const teamNameMap: Record<string, string> = {};

    const nextTeams = teams.map((t) => {
      const match = t.name.match(/U(\d+)/i) || t.name.match(/Under\s*(\d+)/i);
      if (!match) return t;

      const age = parseInt(match[1], 10);
      const nextAge = age + 1;
      const newName = t.name.replace(/U\d+/i, `U${nextAge}`).replace(/Under\s*\d+/i, `U${nextAge}`);
      const newCategory = t.category.replace(/U\d+/i, `U${nextAge}`).replace(/Under\s*\d+/i, `U${nextAge}`);

      let newPitchSize: PitchSize = t.pitchSize;
      if (nextAge <= 7) newPitchSize = '3v3';
      else if (nextAge <= 9) newPitchSize = '5v5';
      else if (nextAge <= 11) newPitchSize = '7v7';
      else if (nextAge <= 13) newPitchSize = '9v9';
      else newPitchSize = '11v11';

      teamNameMap[t.name] = newName;

      return {
        ...t,
        name: newName,
        category: newCategory,
        pitchSize: newPitchSize,
      };
    });

    setTeams(nextTeams);
    saveTeamsListToFirestore(nextTeams).catch(console.error);

    const nextUsers = users.map((u) => {
      if (u.teamName && teamNameMap[u.teamName]) {
        return { ...u, teamName: teamNameMap[u.teamName] };
      }
      return u;
    });

    setUsers(nextUsers);
    saveUsersListToFirestore(nextUsers).catch(console.error);

    if (currentUser.teamName && teamNameMap[currentUser.teamName]) {
      const updatedSelf = { ...currentUser, teamName: teamNameMap[currentUser.teamName] };
      setCurrentUser(updatedSelf);
      saveUserToFirestore(updatedSelf).catch(console.error);
    }
  };

  const handleUpdateCurrentUser = (user: UserType) => {
    setCurrentUser(user);
    saveUserToFirestore(user).catch(console.error);
  };

  const handleUpdateFaFixtures = (updater: FAFixture[] | ((prev: FAFixture[]) => FAFixture[])) => {
    setFaFixtures((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      syncFaFixturesListToFirestore(next).catch(console.error);
      return next;
    });
  };

  // Sync state to LocalStorage as secondary cache
  useEffect(() => {
    localStorage.setItem('scotter_jfc_bookings', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem('scotter_jfc_pitch_configs', JSON.stringify(pitchConfigs));
  }, [pitchConfigs]);

  useEffect(() => {
    localStorage.setItem('scotter_jfc_slot_changes', JSON.stringify(slotChangeRequests));
  }, [slotChangeRequests]);

  useEffect(() => {
    localStorage.setItem('scotter_jfc_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('scotter_jfc_users', JSON.stringify(users));
  }, [users]);

  // Handle login from LoginModal
  const handleLogin = (user: UserType) => {
    setCurrentUser(user);
    saveUserToFirestore(user).catch(console.error);
  };

  // Handle persona switching
  const handleUserChange = (user: UserType) => {
    if (user.password) {
      const entered = prompt(`Enter password for coach ${user.name}:`);
      if (entered !== user.password) {
        alert('Incorrect password!');
        return;
      }
    }
    setCurrentUser(user);
  };

  // Launch modal pre-filled from specific diary grid slot
  const handleOpenBookingModal = (
    pitchId: PitchSize,
    slot: string,
    notes?: string,
    date?: string,
    existingBookingId?: string,
    fixtureId?: string
  ) => {
    if (date) {
      setSelectedDate(date);
    }
    setModalPrefills({ pitchId, slot, notes, bookingId: existingBookingId, fixtureId });
    setIsBookingModalOpen(true);
  };

  // Create a new Booking Request (Pending by default for managers, Approved immediately if Admin creates it)
  const handleCreateBooking = (data: {
    pitchId: PitchSize;
    date: string;
    timeSlot: string;
    notes: string;
    teamName?: string;
    endTime?: string;
    bookingType?: 'STANDARD' | 'MATCH';
  }) => {
    // Check if this booking correlates to an FA Fixture
    const targetFixtureId = modalPrefills.fixtureId;
    let targetFaFixture = targetFixtureId ? faFixtures.find((f) => f.id === targetFixtureId) : undefined;

    if (!targetFaFixture) {
      targetFaFixture = faFixtures.find((f) => {
        if (modalPrefills.bookingId) {
          const b = bookings.find((bk) => bk.id === modalPrefills.bookingId);
          if (
            b &&
            ((b.pitchId === f.pitchId && b.date === f.date && b.timeSlot === f.timeSlot) ||
              (b.notes && (b.notes.includes(f.homeTeam) || b.notes.includes(f.awayTeam))))
          ) {
            return true;
          }
        }
        if (data.notes) {
          const notesLower = data.notes.toLowerCase();
          const homeLower = f.homeTeam.toLowerCase();
          const awayLower = f.awayTeam.toLowerCase();
          if (
            (notesLower.includes(homeLower) && notesLower.includes(awayLower)) ||
            (notesLower.includes(homeLower) && notesLower.includes('vs'))
          ) {
            return true;
          }
        }
        return false;
      });
    }

    const newStatus = currentUser?.role === 'ADMIN' ? BookingStatus.APPROVED : BookingStatus.PENDING;

    if (targetFaFixture) {
      const matchedFixtureId = targetFaFixture.id;
      const prevDate = targetFaFixture.date;
      const prevPitch = targetFaFixture.pitchId;
      const prevSlot = targetFaFixture.timeSlot;
      const homeTeam = targetFaFixture.homeTeam;
      const awayTeam = targetFaFixture.awayTeam;

      const updatedFixture: FAFixture = {
        ...targetFaFixture,
        pitchId: data.pitchId,
        date: data.date,
        timeSlot: data.timeSlot,
      };

      // 1. Keep the SAME fixture entry by updating its date, pitchId, and timeSlot
      setFaFixtures((prev) =>
        prev.map((f) => (f.id === matchedFixtureId ? updatedFixture : f))
      );
      saveFaFixtureToFirestore(updatedFixture).catch(console.error);

      // 2. Update existing booking or create new booking linked to the fixture
      const existingBooking = bookings.find((b) => {
        if (modalPrefills.bookingId && b.id === modalPrefills.bookingId) return true;
        if (b.status === BookingStatus.DECLINED) return false;
        const matchesOldSlot = b.pitchId === prevPitch && b.date === prevDate && b.timeSlot === prevSlot;
        const matchesNewSlot = b.pitchId === data.pitchId && b.date === data.date && b.timeSlot === data.timeSlot;
        const matchesNotes = b.notes && (b.notes.includes(homeTeam) || b.notes.includes(awayTeam));
        return matchesOldSlot || matchesNewSlot || matchesNotes;
      });

      if (existingBooking) {
        const updatedBooking: Booking = {
          ...existingBooking,
          pitchId: data.pitchId,
          date: data.date,
          timeSlot: data.timeSlot,
          endTime: data.endTime,
          bookingType: data.bookingType,
          notes: data.notes || existingBooking.notes,
          teamName: data.teamName || existingBooking.teamName,
          status: newStatus,
        };
        setBookings((prev) =>
          prev.map((b) => (b.id === existingBooking.id ? updatedBooking : b))
        );
        saveBookingToFirestore(updatedBooking).catch(console.error);
      } else {
        const newBooking: Booking = {
          id: `b-fa-${matchedFixtureId}-${Date.now()}`,
          pitchId: data.pitchId,
          date: data.date,
          timeSlot: data.timeSlot,
          endTime: data.endTime,
          bookingType: data.bookingType,
          teamName: data.teamName || targetFaFixture.scotterTeam,
          managerName: currentUser.name,
          managerId: currentUser.id,
          notes: data.notes || `[FA Full-Time Match] ${targetFaFixture.competition}: ${homeTeam} vs ${awayTeam}`,
          status: newStatus,
          createdAt: new Date().toISOString(),
        };
        setBookings((prev) => [newBooking, ...prev]);
        saveBookingToFirestore(newBooking).catch(console.error);
      }

      setBookingConfirmation({
        show: true,
        message:
          currentUser.role === 'ADMIN'
            ? 'Fixture schedule updated and pitch booking approved!'
            : 'Fixture update submitted and sent to the admin for approval.',
        type: currentUser.role === 'ADMIN' ? 'success' : 'info',
      });

      setIsBookingModalOpen(false);
      setModalPrefills({});
      return;
    }

    if (modalPrefills.bookingId) {
      // UPDATE/RE-BOOK EXISTING BOOKING
      const existingB = bookings.find((b) => b.id === modalPrefills.bookingId);
      if (existingB) {
        const updatedB: Booking = {
          ...existingB,
          pitchId: data.pitchId,
          date: data.date,
          timeSlot: data.timeSlot,
          endTime: data.endTime,
          bookingType: data.bookingType,
          notes: data.notes,
          status: currentUser.role === 'ADMIN' ? BookingStatus.APPROVED : BookingStatus.PENDING,
        };
        setBookings((prev) =>
          prev.map((b) => (b.id === modalPrefills.bookingId ? updatedB : b))
        );
        saveBookingToFirestore(updatedB).catch(console.error);
      }

      setBookingConfirmation({
        show: true,
        message: currentUser.role === 'ADMIN'
          ? "Booking has been successfully updated and auto-approved."
          : "Your booking update has been successfully submitted and sent to the admin for approval.",
        type: currentUser.role === 'ADMIN' ? 'success' : 'info',
      });

      setIsBookingModalOpen(false);
      setModalPrefills({});
      return;
    }

    const newBooking: Booking = {
      id: `b-${Date.now()}`,
      pitchId: data.pitchId,
      date: data.date,
      timeSlot: data.timeSlot,
      endTime: data.endTime,
      bookingType: data.bookingType,
      teamName: data.teamName || (currentUser.role === 'ADMIN' ? 'Club Booking' : (currentUser.teamName || 'Club Team')),
      managerName: currentUser.name,
      managerId: currentUser.id,
      notes: data.notes,
      status: currentUser.role === 'ADMIN' ? BookingStatus.APPROVED : BookingStatus.PENDING,
      createdAt: new Date().toISOString(),
    };

    setBookings((prev) => [newBooking, ...prev]);
    saveBookingToFirestore(newBooking).catch(console.error);

    setBookingConfirmation({
      show: true,
      message: currentUser.role === 'ADMIN'
        ? "Booking has been successfully created and auto-approved."
        : "Your booking request has been successfully submitted and sent to the admin for approval.",
      type: currentUser.role === 'ADMIN' ? 'success' : 'info',
    });
  };

  // Approve Booking Request
  const handleApproveBooking = (id: string) => {
    const updated = bookings.find((b) => b.id === id);
    if (updated) {
      const newB = { ...updated, status: BookingStatus.APPROVED };
      setBookings((prev) => prev.map((b) => (b.id === id ? newB : b)));
      saveBookingToFirestore(newB).catch(console.error);
    }
  };

  // Decline Booking Request (with a mandatory reason)
  const handleDeclineBooking = (id: string, reason: string) => {
    const updated = bookings.find((b) => b.id === id);
    if (updated) {
      const newB = { ...updated, status: BookingStatus.DECLINED, declineReason: reason };
      setBookings((prev) => prev.map((b) => (b.id === id ? newB : b)));
      saveBookingToFirestore(newB).catch(console.error);
    }
  };

  // Cancel Booking or Request
  const handleCancelBooking = (id: string) => {
    setBookings((prev) => prev.filter((x) => x.id !== id));
    deleteBookingFromFirestore(id).catch(console.error);
  };

  const handleClearAllBookings = () => {
    setBookings([]);
    syncBookingsListToFirestore([]).catch(console.error);
  };

  // Update or reschedule an existing booking
  const handleUpdateBooking = (id: string, updatedFields: Partial<Booking>) => {
    const existingBooking = bookings.find((b) => b.id === id);
    if (existingBooking) {
      const updatedBooking = { ...existingBooking, ...updatedFields };
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? updatedBooking : b))
      );
      saveBookingToFirestore(updatedBooking).catch(console.error);

      if (updatedFields.date || updatedFields.pitchId || updatedFields.timeSlot) {
        const newPitch = updatedFields.pitchId || existingBooking.pitchId;
        const newDate = updatedFields.date || existingBooking.date;
        const newSlot = updatedFields.timeSlot || existingBooking.timeSlot;

        const updatedFixturesList: FAFixture[] = faFixtures.map((f) => {
          const matchesOldSlot =
            f.pitchId === existingBooking.pitchId &&
            f.date === existingBooking.date &&
            f.timeSlot === existingBooking.timeSlot;
          const matchesNotes =
            existingBooking.notes &&
            (existingBooking.notes.includes(f.homeTeam) || existingBooking.notes.includes(f.awayTeam));
          if (matchesOldSlot || matchesNotes) {
            return {
              ...f,
              pitchId: newPitch,
              date: newDate,
              timeSlot: newSlot,
            };
          }
          return f;
        });

        setFaFixtures(updatedFixturesList);
        syncFaFixturesListToFirestore(updatedFixturesList).catch(console.error);
      }
    }
  };

  // Add multiple bookings at once (block booking & auto imports)
  const handleAddBookingsBulk = (newBookingsList: Booking[]) => {
    setBookings((prev) => [...newBookingsList, ...prev]);
    saveBookingsBulkToFirestore(newBookingsList).catch(console.error);
  };

  // Update Standard Pitch Slots (Admin directly changes slots)
  const handleUpdatePitchSlots = (pitchId: PitchSize, newSlots: string[]) => {
    const nextConfigs = pitchConfigs.map((p) => (p.id === pitchId ? { ...p, defaultSlots: newSlots } : p));
    setPitchConfigs(nextConfigs);
    savePitchConfigsListToFirestore(nextConfigs).catch(console.error);
  };

  // Submit Slot Change Request (from Manager)
  const handleSubmitSlotChangeRequest = (requestData: Omit<SlotChangeRequest, 'id' | 'status' | 'createdAt' | 'managerId' | 'managerName' | 'teamName'>) => {
    const newRequest: SlotChangeRequest = {
      id: `sc-${Date.now()}`,
      managerId: currentUser.id,
      managerName: currentUser.name,
      teamName: currentUser.teamName || 'Club Team',
      pitchId: requestData.pitchId,
      actionType: requestData.actionType,
      targetSlot: requestData.targetSlot,
      newSlotTime: requestData.newSlotTime,
      notes: requestData.notes,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    setSlotChangeRequests((prev) => [newRequest, ...prev]);
    saveSlotChangeRequestToFirestore(newRequest).catch(console.error);
  };

  // Approve Slot Change Request (automatically alters the PitchConfig!)
  const handleApproveSlotChange = (id: string) => {
    const req = slotChangeRequests.find((r) => r.id === id);
    if (!req) return;

    // Apply the actual slot modification to the corresponding pitch configuration!
    const updatedPitchConfigs = pitchConfigs.map((p) => {
      if (p.id !== req.pitchId) return p;

      let updatedSlots = [...p.defaultSlots];
      if (req.actionType === 'ADD') {
        if (!updatedSlots.includes(req.targetSlot)) {
          updatedSlots.push(req.targetSlot);
        }
      } else if (req.actionType === 'REMOVE') {
        updatedSlots = updatedSlots.filter((s) => s !== req.targetSlot);
      } else if (req.actionType === 'CHANGE' && req.newSlotTime) {
        updatedSlots = updatedSlots.map((s) => (s === req.targetSlot ? req.newSlotTime! : s));
      }

      return { ...p, defaultSlots: updatedSlots.sort() };
    });

    setPitchConfigs(updatedPitchConfigs);
    savePitchConfigsListToFirestore(updatedPitchConfigs).catch(console.error);

    // Update the request status
    const updatedReq: SlotChangeRequest = { ...req, status: 'APPROVED' };
    setSlotChangeRequests((prev) =>
      prev.map((r) => (r.id === id ? updatedReq : r))
    );
    saveSlotChangeRequestToFirestore(updatedReq).catch(console.error);
  };

  // Decline Slot Change Request
  const handleDeclineSlotChange = (id: string, reason: string) => {
    const req = slotChangeRequests.find((r) => r.id === id);
    if (req) {
      const updatedReq: SlotChangeRequest = { ...req, status: 'DECLINED', declineReason: reason };
      setSlotChangeRequests((prev) =>
        prev.map((r) => (r.id === id ? updatedReq : r))
      );
      saveSlotChangeRequestToFirestore(updatedReq).catch(console.error);
    }
  };


  // Count pending bookings for indicator badge
  const pendingBookingsCount = bookings.filter((b) => b.status === BookingStatus.PENDING).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-200">
      
      {/* Club Banner Header */}
      <Header
        currentUser={currentUser}
        users={users}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Role Indicator Info Banner */}
      {currentUser && (
        <div className="bg-blue-900 text-white border-b border-blue-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs md:text-sm">
            <div className="flex items-center space-x-2">
              <span className="bg-white/20 text-white font-extrabold px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">
                {currentUser.role} View
              </span>
              <span>
                {currentUser.role === 'ADMIN' ? (
                  <>Logged in as <strong>{currentUser.name} (Admin)</strong>. You can approve/decline pitch bookings and manage kickoff slots.</>
                ) : (
                  <>Logged in as <strong>{currentUser.name}</strong>{currentUser.teamName ? <>, managing <strong>{currentUser.teamName}</strong></> : null}. Book match & training times.</>
                )}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {currentUser.role === 'ADMIN' && (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="bg-white text-blue-900 font-bold px-3 py-1 rounded-lg hover:bg-slate-100 transition-colors text-xs uppercase tracking-wider cursor-pointer"
                >
                  Switch Account
                </button>
              )}
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1 rounded-lg transition-colors text-xs uppercase tracking-wider cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Navigation Tabs */}
        <div className="flex border-b-2 border-slate-200 mb-8 space-x-2 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab('DIARY')}
            className={`flex items-center space-x-2 py-3 px-5 border-b-4 font-bold text-sm tracking-tight transition-all whitespace-nowrap ${
              activeTab === 'DIARY'
                ? 'border-blue-900 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Pitch Diary & Bookings</span>
          </button>

          <button
            onClick={() => setActiveTab('REQUESTS')}
            className={`flex items-center space-x-2 py-3 px-5 border-b-4 font-bold text-sm tracking-tight transition-all relative whitespace-nowrap ${
              activeTab === 'REQUESTS'
                ? 'border-blue-900 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Requests Center</span>
            {pendingBookingsCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full ml-1">
                {pendingBookingsCount}
              </span>
            )}
          </button>

          {/* Slot Settings - ADMIN ONLY */}
          {currentUser?.role === 'ADMIN' && (
            <button
              onClick={() => setActiveTab('SLOTS')}
              className={`flex items-center space-x-2 py-3 px-5 border-b-4 font-bold text-sm tracking-tight transition-all relative whitespace-nowrap ${
                activeTab === 'SLOTS'
                  ? 'border-blue-900 text-blue-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Slot Settings</span>
            </button>
          )}

          {/* Coaches & Profiles - ADMIN ONLY */}
          {currentUser?.role === 'ADMIN' && (
            <button
              onClick={() => setActiveTab('COACHES')}
              className={`flex items-center space-x-2 py-3 px-5 border-b-4 font-bold text-sm tracking-tight transition-all relative whitespace-nowrap ${
                activeTab === 'COACHES'
                  ? 'border-blue-900 text-blue-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Coaches & Profiles</span>
            </button>
          )}
        </div>

        {/* Dynamic Tab Panel */}
        <div className="space-y-6">
          {currentUser ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.15 }}
              >
                {activeTab === 'DIARY' && (
                  <PitchDiary
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    pitchConfigs={pitchConfigs}
                    bookings={bookings}
                    currentUser={currentUser}
                    onRequestBooking={handleOpenBookingModal}
                    onApproveBooking={handleApproveBooking}
                    onDeclineBooking={handleDeclineBooking}
                    onCancelBooking={handleCancelBooking}
                    onAddBookingsBulk={handleAddBookingsBulk}
                    onUpdateBooking={handleUpdateBooking}
                    users={users}
                    onUpdateUsers={handleUpdateUsers}
                    faFixtures={faFixtures}
                    onUpdateFaFixtures={handleUpdateFaFixtures}
                    onClearAllBookings={handleClearAllBookings}
                  />
                )}

                {activeTab === 'REQUESTS' && (
                  <RequestManager
                    bookings={bookings}
                    currentUser={currentUser}
                    onApproveBooking={handleApproveBooking}
                    onDeclineBooking={handleDeclineBooking}
                    onCancelBooking={handleCancelBooking}
                  />
                )}

                {activeTab === 'SLOTS' && currentUser.role === 'ADMIN' && (
                  <SlotConfigurator
                    pitchConfigs={pitchConfigs}
                    currentUser={currentUser}
                    onUpdatePitchSlots={handleUpdatePitchSlots}
                  />
                )}

                {activeTab === 'COACHES' && currentUser.role === 'ADMIN' && (
                  <CoachesSetup
                    users={users}
                    onUpdateUsers={handleUpdateUsers}
                    currentUser={currentUser}
                    onUpdateCurrentUser={handleUpdateCurrentUser}
                    teams={teams}
                    onUpdateTeams={handleUpdateTeams}
                    onRenameTeam={handleRenameTeam}
                    onPromoteToNextSeason={handlePromoteToNextSeason}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4 shadow-sm my-12">
              <div className="w-16 h-16 bg-blue-50 text-blue-900 rounded-2xl mx-auto flex items-center justify-center font-black text-2xl border border-blue-200 shadow-sm">
                ⚽
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Login Required</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Please log in with your coach or administrator account to view pitch schedules and submit booking requests.
              </p>
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="bg-blue-900 hover:bg-blue-800 text-white font-extrabold px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
              >
                Log In Now
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Helper FAQ & Notice Footer */}
      <footer className="bg-white border-t border-slate-200 py-10 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Quick Rules */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wider flex items-center">
                <Info className="w-4 h-4 mr-1.5" />
                <span>Club Booking Policy</span>
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                All junior team managers must request match slots through this diary at least 48 hours prior to kickoff. Home teams hold pitch preference.
              </p>
            </div>

            {/* Pitch Setup Information */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wider flex items-center">
                <HelpCircle className="w-4 h-4 mr-1.5" />
                <span>Youth Guidelines (2026-27 FA Guidelines)</span>
              </h4>
              <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside font-medium">
                <li>3v3 format is for U7s fun-football sessions.</li>
                <li>5v5 format is reserved for U8s and U9s teams.</li>
                <li>7v7 format accommodates U10s and U11s leagues.</li>
                <li>9v9 pitch hosts U12s and U13s fixtures.</li>
                <li>11v11 Main Pitch is shared by U14s to Adult squads.</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-100 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            <span>© 2026 Scotter United Junior Football Club. All Rights Reserved.</span>
          </div>
        </div>
      </footer>

      {/* Booking Dialog Modal Component */}
      <AnimatePresence>
        {isBookingModalOpen && (
          <BookingModal
            isOpen={isBookingModalOpen}
            onClose={() => {
              setIsBookingModalOpen(false);
              setModalPrefills({});
            }}
            onSubmit={handleCreateBooking}
            selectedPitchId={modalPrefills.pitchId}
            selectedSlot={modalPrefills.slot}
            selectedDate={selectedDate}
            selectedNotes={modalPrefills.notes}
            selectedBookingId={modalPrefills.bookingId}
            pitches={pitchConfigs}
            existingBookings={bookings}
            currentUser={currentUser}
            faFixtures={faFixtures}
          />
        )}
      </AnimatePresence>

      {/* Booking confirmation alert */}
      <AnimatePresence>
        {bookingConfirmation?.show && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[999] max-w-md w-full px-4"
          >
            <div className={`p-4 rounded-2xl border-2 shadow-2xl flex items-start gap-3 bg-white ${
              bookingConfirmation.type === 'success' 
                ? 'border-emerald-200 text-slate-800' 
                : 'border-blue-200 text-slate-800'
            }`}>
              {bookingConfirmation.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-xs font-black text-slate-900 uppercase tracking-wider mb-0.5">
                  {bookingConfirmation.type === 'success' ? 'Booking Saved' : 'Request Sent'}
                </p>
                <p className="text-xs text-slate-600 font-bold leading-normal">
                  {bookingConfirmation.message}
                </p>
              </div>
              <button 
                onClick={() => setBookingConfirmation(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login / Switch Account Modal */}
      <AnimatePresence>
        {(!currentUser || isLoginModalOpen) && (
          <LoginModal
            isOpen={!currentUser || isLoginModalOpen}
            isForced={!currentUser}
            onClose={() => setIsLoginModalOpen(false)}
            users={users}
            onLoginSuccess={(loggedInUser) => {
              handleLogin(loggedInUser);
              setIsLoginModalOpen(false);
            }}
            onUpdateUserEmail={(userId, email) => {
              const updatedUsers = users.map((u) =>
                u.id === userId ? { ...u, googleEmail: email, googleLinked: true } : u
              );
              handleUpdateUsers(updatedUsers);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
