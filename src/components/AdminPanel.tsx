/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, 
  CalendarRange, 
  RefreshCw, 
  FileDown, 
  Search, 
  Check, 
  AlertTriangle, 
  Layers, 
  Plus, 
  Users, 
  Radio, 
  Clock, 
  ArrowRight,
  Sparkles,
  Info,
  Trash2
} from 'lucide-react';
import { PitchSize, Booking, BookingStatus, PitchConfig, User } from '../types';
import { SCOTTER_TEAMS, MOCK_FA_FULLTIME_FIXTURES, FAFixture, ClubTeam } from '../mockData';
import { canManagerUnbook, isTeamMatch } from '../utils/bookingUtils';

interface AdminPanelProps {
  bookings: Booking[];
  pitchConfigs: PitchConfig[];
  selectedDate: string;
  onAddBookingsBulk: (newBookings: Booking[]) => void;
  onCancelBooking: (id: string) => void;
  onUpdateBooking?: (id: string, fields: Partial<Booking>) => void;
  currentUser: User;
  onRequestBooking?: (pitchId: PitchSize, slot: string, notes?: string, date?: string, existingBookingId?: string) => void;
}

export default function AdminPanel({
  bookings,
  pitchConfigs,
  selectedDate,
  onAddBookingsBulk,
  onCancelBooking,
  onUpdateBooking,
  currentUser,
  onRequestBooking,
}: AdminPanelProps) {
  // Admins see BLOCK first, Managers see FULLTIME first
  const [activeSubTab, setActiveSubTab] = useState<'BLOCK' | 'FULLTIME'>(
    currentUser.role === 'ADMIN' ? 'BLOCK' : 'FULLTIME'
  );

  // Block booking state
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [pitchSize, setPitchSize] = useState<PitchSize>('11v11');
  const [blockDate, setBlockDate] = useState<string>(selectedDate);
  const [blockSlot, setBlockSlot] = useState<string>('');
  const [opponent, setOpponent] = useState<string>('');
  const [fixtureNotes, setFixtureNotes] = useState<string>('');
  const [isRepeating, setIsRepeating] = useState<boolean>(false);
  const [repeatWeeks, setRepeatWeeks] = useState<number>(4);
  const [equityMode, setEquityMode] = useState<'FIXED' | 'ALTERNATE' | 'SEQUENCE'>('FIXED');
  const [alternateSlotValue, setAlternateSlotValue] = useState<string>('');
  const [blockBookingSuccess, setBlockBookingSuccess] = useState<string | null>(null);
  const [blockBookingError, setBlockBookingError] = useState<string | null>(null);

  // FA Full Time state
  const [faClubId, setFaClubId] = useState<string>('SCOT-U-JFC-09');
  const [isSearchingFA, setIsSearchingFA] = useState<boolean>(false);
  const [faFixturesLoaded, setFaFixturesLoaded] = useState<boolean>(false);
  const [loadedFixtures, setLoadedFixtures] = useState<FAFixture[]>([]);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // FA Filters & Checkbox Selections
  const [faFilterTeam, setFaFilterTeam] = useState<string>('');
  const [faFilterPitch, setFaFilterPitch] = useState<string>('');
  const [faFilterDate, setFaFilterDate] = useState<string>('');
  const [selectedFixtureIds, setSelectedFixtureIds] = useState<string[]>([]);
  const [confirmUnbookFixtureId, setConfirmUnbookFixtureId] = useState<string | null>(null);

  // Clash resolution state
  const [resolvingClashId, setResolvingClashId] = useState<string | null>(null);
  const [alternativeSlot, setAlternativeSlot] = useState<string>('');
  const [existingBookingSlot, setExistingBookingSlot] = useState<string>('');

  // Automatically adjust pitch size when team is selected
  const handleTeamChange = (teamName: string) => {
    setSelectedTeam(teamName);
    const team = SCOTTER_TEAMS.find((t) => t.name === teamName);
    if (team) {
      setPitchSize(team.pitchSize);
      // Pre-select first slot for this pitch size if not set
      const config = pitchConfigs.find((p) => p.id === team.pitchSize);
      if (config && config.defaultSlots.length > 0) {
        setBlockSlot(config.defaultSlots[0]);
      }
    }
  };

  // Sync default alternate slot
  useEffect(() => {
    const config = pitchConfigs.find((p) => p.id === pitchSize);
    if (config) {
      const otherSlots = config.defaultSlots.filter((s) => s !== blockSlot);
      if (otherSlots.length > 0 && !otherSlots.includes(alternateSlotValue)) {
        setAlternateSlotValue(otherSlots[0]);
      }
    }
  }, [pitchSize, blockSlot, pitchConfigs]);

  // Group teams by category for UI optgroup selection
  const teamCategories = Array.from(new Set(SCOTTER_TEAMS.map((t) => t.category)));

  // Handle single / repeating block booking submission
  const handleBlockBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBlockBookingSuccess(null);
    setBlockBookingError(null);

    if (!selectedTeam) {
      setBlockBookingError('Please select a team.');
      return;
    }
    if (!blockSlot) {
      setBlockBookingError('Please select a kick-off slot.');
      return;
    }

    const newBookings: Booking[] = [];
    const baseDate = new Date(blockDate);
    const totalIterations = isRepeating ? repeatWeeks : 1;

    // Check for clashes across all scheduled dates using the respective slot rotation
    const clashDates: string[] = [];

    const config = pitchConfigs.find((p) => p.id === pitchSize);
    const slots = config ? config.defaultSlots : [];

    for (let i = 0; i < totalIterations; i++) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(baseDate.getDate() + i * 7);
      const formattedDate = currentDate.toISOString().split('T')[0];

      // Determine slot for this week according to the selected Equity Mode
      let currentSlot = blockSlot;
      if (isRepeating) {
        if (equityMode === 'ALTERNATE' && alternateSlotValue) {
          currentSlot = i % 2 === 0 ? blockSlot : alternateSlotValue;
        } else if (equityMode === 'SEQUENCE' && slots.length > 0) {
          const startIndex = slots.indexOf(blockSlot);
          const activeIndex = startIndex !== -1 ? (startIndex + i) % slots.length : 0;
          currentSlot = slots[activeIndex];
        }
      }

      // Check if slot is already taken on this date
      const clash = bookings.find(
        (b) =>
          b.pitchId === pitchSize &&
          b.date === formattedDate &&
          b.timeSlot === currentSlot &&
          b.status !== BookingStatus.DECLINED
      );

      if (clash) {
        clashDates.push(`${formattedDate} @ ${currentSlot} (${clash.teamName})`);
      } else {
        const rotationInfo = isRepeating && equityMode !== 'FIXED'
          ? ` [Rotated: ${equityMode === 'ALTERNATE' ? 'Alternating' : 'Sequential'} Mode - Slot: ${currentSlot}]`
          : '';
        newBookings.push({
          id: `b-block-${Date.now()}-${i}`,
          pitchId: pitchSize,
          date: formattedDate,
          timeSlot: currentSlot,
          teamName: selectedTeam,
          managerName: currentUser.name,
          managerId: currentUser.id,
          notes: `[BLOCK BOOKING]${rotationInfo} ${opponent ? `vs ${opponent}. ` : ''}${fixtureNotes}`.trim(),
          status: BookingStatus.APPROVED, // Admins auto-approve
          createdAt: new Date().toISOString(),
        });
      }
    }

    if (clashDates.length > 0) {
      setBlockBookingError(
        `Booking clashed on the following dates: ${clashDates.join(', ')}. No bookings were created to prevent overriding existing requests.`
      );
      return;
    }

    onAddBookingsBulk(newBookings);
    setBlockBookingSuccess(
      `Successfully block booked ${newBookings.length} fixture slot(s) for ${selectedTeam} on the ${pitchSize} pitch!`
    );

    // Reset some form parts
    setOpponent('');
    setFixtureNotes('');
    setIsRepeating(false);
  };

  // Simulate loading from Full Time FA
  const handleSearchFAFixtures = () => {
    setIsSearchingFA(true);
    setFaFixturesLoaded(false);
    setImportFeedback(null);
    setFaFilterTeam('');
    setFaFilterPitch('');
    setFaFilterDate('');

    setTimeout(() => {
      setIsSearchingFA(false);
      setFaFixturesLoaded(true);
      setLoadedFixtures(MOCK_FA_FULLTIME_FIXTURES);
      
      // Auto-select all vacant fixtures initially
      const vacantIds = MOCK_FA_FULLTIME_FIXTURES
        .filter(f => {
          const status = bookings.find(
            (b) =>
              b.pitchId === f.pitchId &&
              b.date === f.date &&
              b.timeSlot === f.timeSlot &&
              b.status === BookingStatus.APPROVED
          );
          return !status; // Vacant
        })
        .map(f => f.id);
      setSelectedFixtureIds(vacantIds);
    }, 1500);
  };

  /**
   * Differentiate between Vacant, Booked by the SAME team, or CLASH (booked by a different team)
   */
  const getFixtureStatus = (fixture: FAFixture) => {
    const existing = bookings.find(
      (b) =>
        b.pitchId === fixture.pitchId &&
        b.date === fixture.date &&
        b.timeSlot === fixture.timeSlot &&
        b.status === BookingStatus.APPROVED
    );

    if (!existing) {
      return { type: 'VACANT', booking: null };
    }

    // Direct name match or substring relationship
    const isSameTeam =
      existing.teamName.toLowerCase().trim() === fixture.scotterTeam.toLowerCase().trim() ||
      existing.teamName.toLowerCase().includes(fixture.scotterTeam.toLowerCase()) ||
      fixture.scotterTeam.toLowerCase().includes(existing.teamName.toLowerCase());

    if (isSameTeam) {
      return { type: 'BOOKED_SELF', booking: existing };
    }

    return { type: 'CLASH', booking: existing };
  };

  /**
   * Retrieves vacant slots for a given pitch format and date
   */
  const getVacantSlots = (pitchId: PitchSize, date: string) => {
    const config = pitchConfigs.find((p) => p.id === pitchId);
    if (!config) return [];

    const bookedSlots = bookings
      .filter((b) => b.pitchId === pitchId && b.date === date && b.status === BookingStatus.APPROVED)
      .map((b) => b.timeSlot);

    return config.defaultSlots.filter((slot) => !bookedSlots.includes(slot));
  };

  /**
   * Option A: Reschedule the incoming FA fixture to a vacant slot
   */
  const handleRescheduleFA = (fixture: FAFixture, chosenSlot: string) => {
    if (!chosenSlot) {
      setImportFeedback("Error: Please select a vacant slot.");
      return;
    }

    const newBooking: Booking = {
      id: `b-fa-resched-${Date.now()}`,
      pitchId: fixture.pitchId,
      date: fixture.date,
      timeSlot: chosenSlot,
      teamName: fixture.scotterTeam,
      managerName: currentUser.name,
      managerId: 'fa-auto-import',
      notes: `[FA Full-Time Rescheduled Import] Originally scheduled for ${fixture.timeSlot}. ${fixture.competition}: ${fixture.homeTeam} vs ${fixture.awayTeam}`,
      status: BookingStatus.APPROVED,
      createdAt: new Date().toISOString(),
    };

    onAddBookingsBulk([newBooking]);
    setImportFeedback(`Successfully rescheduled and booked FA fixture: ${fixture.homeTeam} vs ${fixture.awayTeam} at alternative slot ${chosenSlot}!`);
    setResolvingClashId(null);
    setAlternativeSlot('');
  };

  /**
   * Option B: Reschedule the existing booking to a vacant slot, and then book the FA fixture at its original slot
   */
  const handleRescheduleExistingAndBookFA = (fixture: FAFixture, clashingBooking: Booking, chosenSlot: string) => {
    if (!onUpdateBooking) {
      setImportFeedback("Error: Rescheduling existing bookings is currently unavailable.");
      return;
    }
    if (!chosenSlot) {
      setImportFeedback("Error: Please select a vacant slot.");
      return;
    }

    // Step 1: Move the existing booking to the chosen alternative slot
    onUpdateBooking(clashingBooking.id, {
      timeSlot: chosenSlot,
      notes: `${clashingBooking.notes || ''} [Rescheduled from ${clashingBooking.timeSlot} to resolve FA clash]`.trim()
    });

    // Step 2: Book the incoming FA fixture at its original time slot
    const newBooking: Booking = {
      id: `b-fa-import-${Date.now()}`,
      pitchId: fixture.pitchId,
      date: fixture.date,
      timeSlot: fixture.timeSlot,
      teamName: fixture.scotterTeam,
      managerName: currentUser.name,
      managerId: 'fa-auto-import',
      notes: `[FA Full-Time Auto-Import] ${fixture.competition}: ${fixture.homeTeam} vs ${fixture.awayTeam}`,
      status: BookingStatus.APPROVED,
      createdAt: new Date().toISOString(),
    };

    onAddBookingsBulk([newBooking]);
    setImportFeedback(`Successfully moved ${clashingBooking.teamName} to ${chosenSlot} and booked FA match at original slot ${fixture.timeSlot}!`);
    setResolvingClashId(null);
    setExistingBookingSlot('');
  };

  // Helper check for backwards compatibility / bulk filtering
  const isFixtureBooked = (fixture: FAFixture) => {
    return getFixtureStatus(fixture).type === 'BOOKED_SELF';
  };

  // Import a single FA fixture
  const handleImportFixture = (fixture: FAFixture) => {
    const statusInfo = getFixtureStatus(fixture);
    if (statusInfo.type === 'CLASH') {
      setImportFeedback(`Error: The slot on ${fixture.date} at ${fixture.timeSlot} is already booked by another team (${statusInfo.booking?.teamName}).`);
      return;
    }
    if (statusInfo.type === 'BOOKED_SELF') {
      setImportFeedback(`Information: This fixture is already in the diary.`);
      return;
    }

    const newBooking: Booking = {
      id: `b-fa-import-${Date.now()}`,
      pitchId: fixture.pitchId,
      date: fixture.date,
      timeSlot: fixture.timeSlot,
      teamName: fixture.scotterTeam,
      managerName: currentUser.name,
      managerId: 'fa-auto-import',
      notes: `[FA Full-Time Auto-Import] ${fixture.competition}: ${fixture.homeTeam} vs ${fixture.awayTeam}`,
      status: BookingStatus.APPROVED,
      createdAt: new Date().toISOString(),
    };

    onAddBookingsBulk([newBooking]);
    setImportFeedback(`Successfully imported fixture: ${fixture.homeTeam} vs ${fixture.awayTeam}!`);
  };

  // Filtered fixtures computed list
  const filteredFixtures = loadedFixtures.filter((f) => {
    const matchesTeam = !faFilterTeam || f.scotterTeam === faFilterTeam;
    const matchesPitch = !faFilterPitch || f.pitchId === faFilterPitch;
    const matchesDate = !faFilterDate || f.date === faFilterDate;
    return matchesTeam && matchesPitch && matchesDate;
  });

  const selectableFilteredFixtures = filteredFixtures.filter(
    (f) => getFixtureStatus(f).type === 'VACANT' || getFixtureStatus(f).type === 'BOOKED_SELF'
  );
  const allSelectableFilteredSelected =
    selectableFilteredFixtures.length > 0 &&
    selectableFilteredFixtures.every((f) => selectedFixtureIds.includes(f.id));

  const handleToggleSelectAllFiltered = () => {
    const filteredIds = selectableFilteredFixtures.map((f) => f.id);
    if (allSelectableFilteredSelected) {
      // Deselect filtered
      setSelectedFixtureIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      // Select filtered
      setSelectedFixtureIds((prev) => {
        const next = new Set([...prev, ...filteredIds]);
        return Array.from(next);
      });
    }
  };

  const handleToggleSelectAllOverall = () => {
    const allSelectable = loadedFixtures.filter(
      (f) => getFixtureStatus(f).type === 'VACANT' || getFixtureStatus(f).type === 'BOOKED_SELF'
    );
    const allSelectableIds = allSelectable.map((f) => f.id);
    const allSelected =
      allSelectable.length > 0 && allSelectable.every((f) => selectedFixtureIds.includes(f.id));

    if (allSelected) {
      setSelectedFixtureIds([]);
    } else {
      setSelectedFixtureIds(allSelectableIds);
    }
  };

  const toggleFixtureSelection = (id: string) => {
    setSelectedFixtureIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk import selected vacant FA fixtures
  const handleBulkImportFixtures = () => {
    const selectedVacant = filteredFixtures.filter(
      (f) => selectedFixtureIds.includes(f.id) && getFixtureStatus(f).type === 'VACANT'
    );

    if (selectedVacant.length === 0) {
      setImportFeedback('No pending/vacant fixtures are selected to book!');
      return;
    }

    const newBookings: Booking[] = selectedVacant.map((f, idx) => ({
      id: `b-fa-bulk-${Date.now()}-${idx}`,
      pitchId: f.pitchId,
      date: f.date,
      timeSlot: f.timeSlot,
      teamName: f.scotterTeam,
      managerName: currentUser.name,
      managerId: 'fa-auto-import',
      notes: `[FA Full-Time Bulk Import] ${f.competition}: ${f.homeTeam} vs ${f.awayTeam}`,
      status: BookingStatus.APPROVED,
      createdAt: new Date().toISOString(),
    }));

    onAddBookingsBulk(newBookings);
    setImportFeedback(`Successfully batch imported ${selectedVacant.length} selected fixtures directly into the Pitch Diary!`);
  };

  // Bulk unbook selected booked FA fixtures
  const handleBulkUnbookFixtures = () => {
    const selectedBooked = filteredFixtures.filter(
      (f) => selectedFixtureIds.includes(f.id) && getFixtureStatus(f).type === 'BOOKED_SELF'
    );

    if (selectedBooked.length === 0) {
      setImportFeedback('No booked fixtures are selected to unbook!');
      return;
    }

    let count = 0;
    selectedBooked.forEach((f) => {
      const statusInfo = getFixtureStatus(f);
      if (statusInfo.booking) {
        onCancelBooking(statusInfo.booking.id);
        count++;
      }
    });

    // Clear selection for these unbooked fixtures
    const unbookedIds = selectedBooked.map((f) => f.id);
    setSelectedFixtureIds((prev) => prev.filter((id) => !unbookedIds.includes(id)));

    setImportFeedback(`Successfully batch unbooked ${count} selected fixtures from the Pitch Diary!`);
  };

  const selectedPitchConfig = pitchConfigs.find((p) => p.id === pitchSize);
  const slotsAvailable = selectedPitchConfig ? selectedPitchConfig.defaultSlots : [];

  return (
    <div className="bg-slate-900 text-white rounded-2xl border-2 border-blue-900 shadow-xl overflow-hidden mb-8">
      {/* Panel Title & Subtitle */}
      <div className="bg-gradient-to-r from-[#002366] to-blue-950 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-blue-800/60 gap-3">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-500/20 p-2 rounded-xl text-blue-300 border border-blue-500/30">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-extrabold tracking-tight flex items-center gap-1.5 uppercase text-white">
              {currentUser.role === 'ADMIN' ? 'Admin Fixtures Hub' : 'Club Fixtures Hub'} <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black normal-case tracking-normal">{currentUser.role}</span>
            </h3>
            <p className="text-xs text-blue-200/80">
              {currentUser.role === 'ADMIN'
                ? 'Easily bulk schedule squad games or fetch live league fixtures'
                : 'Synchronize and manage live match schedules from the FA Full-Time system'}
            </p>
          </div>
        </div>

        {/* Sub-tabs */}
        {currentUser.role === 'ADMIN' && (
          <div className="flex space-x-1 bg-blue-950/80 p-1 rounded-xl border border-blue-800/40">
            <button
              onClick={() => setActiveSubTab('BLOCK')}
              className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'BLOCK'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Block Book Tool</span>
            </button>
            <button
              onClick={() => setActiveSubTab('FULLTIME')}
              className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'FULLTIME'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>FA Full-Time Loader</span>
            </button>
          </div>
        )}
      </div>

      {/* Panel Inner Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {activeSubTab === 'BLOCK' ? (
            <motion.div
              key="block"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <form onSubmit={handleBlockBookingSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Team Dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Select Club Team
                    </label>
                    <select
                      value={selectedTeam}
                      onChange={(e) => handleTeamChange(e.target.value)}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-lg py-2.5 px-3 text-white font-semibold focus:border-blue-500 focus:outline-none"
                      required
                    >
                      <option value="">-- Choose Team --</option>
                      {teamCategories.map((cat) => (
                        <optgroup key={cat} label={`${cat} Section`} className="bg-slate-900 text-blue-300 font-bold">
                          {SCOTTER_TEAMS.filter((t) => t.category === cat).map((t) => (
                            <option key={t.name} value={t.name} className="text-white font-medium">
                              {t.name} ({t.pitchSize})
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {/* Pitch format display/override */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Pitch Format Required
                    </label>
                    <select
                      value={pitchSize}
                      onChange={(e) => setPitchSize(e.target.value as PitchSize)}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-lg py-2.5 px-3 text-white font-semibold focus:border-blue-500 focus:outline-none"
                    >
                      {pitchConfigs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Opponent Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Away Opponent Team
                    </label>
                    <input
                      type="text"
                      value={opponent}
                      onChange={(e) => setOpponent(e.target.value)}
                      placeholder="e.g. Scunthorpe United JFC"
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-lg py-2.5 px-3 text-white placeholder-slate-500 font-medium focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Kick-off Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={blockDate}
                      onChange={(e) => setBlockDate(e.target.value)}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-lg py-2 px-3 text-white font-medium focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Time slot dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Kick-off Time Slot
                    </label>
                    <select
                      value={blockSlot}
                      onChange={(e) => setBlockSlot(e.target.value)}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-lg py-2.5 px-3 text-white font-semibold focus:border-blue-500 focus:outline-none"
                      required
                    >
                      <option value="">-- Select Time Slot --</option>
                      {slotsAvailable.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Notes / Fixture Details */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Fixture Notes
                    </label>
                    <input
                      type="text"
                      value={fixtureNotes}
                      onChange={(e) => setFixtureNotes(e.target.value)}
                      placeholder="e.g. Referee confirmed, flags required"
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-lg py-2.5 px-3 text-white placeholder-slate-500 font-medium focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Repeating Options */}
                <div className="bg-slate-800/50 border border-slate-800 p-4 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="repeat-booking"
                        checked={isRepeating}
                        onChange={(e) => setIsRepeating(e.target.checked)}
                        className="w-4.5 h-4.5 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900 mt-0.5"
                      />
                      <label htmlFor="repeat-booking" className="cursor-pointer">
                        <span className="block text-xs font-bold text-white uppercase tracking-wide">
                          Repeat Block Booking Weekly
                        </span>
                        <span className="block text-[11px] text-slate-400 font-medium mt-0.5">
                          Schedule this kick-off slot recursively on consecutive weeks (perfect for season fixtures)
                        </span>
                      </label>
                    </div>
                  </div>

                  {isRepeating && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="border-t border-slate-700/50 pt-3.5 space-y-4"
                    >
                      {/* Repeat Weeks Duration */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-left">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wide min-w-[120px]">Repeat duration:</span>
                        <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-1.5 space-x-1">
                          {[2, 4, 6, 8, 12].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setRepeatWeeks(num)}
                              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                                repeatWeeks === num
                                  ? 'bg-blue-600 text-white'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {num} Wks
                            </button>
                          ))}
                        </div>
                        <span className="text-xs text-slate-400 font-semibold">
                          Until {new Date(new Date(blockDate).getTime() + (repeatWeeks - 1) * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      {/* Equity & Time-slot Rotation Strategies */}
                      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3.5 text-left">
                        <div className="flex items-center space-x-2">
                          <span className="bg-amber-500/10 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider border border-amber-500/20">
                            Team Equity Guard
                          </span>
                          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                            Time-Slot Rotation Strategy
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          To provide fair play and equity across all club teams, configure if this team holds the same kick-off slot all season or rotates through alternative times.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Option 1: FIXED */}
                          <label className={`flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            equityMode === 'FIXED'
                              ? 'bg-slate-950/80 border-blue-500/80 shadow-md'
                              : 'bg-slate-950/30 border-slate-800 hover:border-slate-700'
                          }`}>
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name="equityMode"
                                value="FIXED"
                                checked={equityMode === 'FIXED'}
                                onChange={() => setEquityMode('FIXED')}
                                className="text-blue-500 bg-slate-900 border-slate-700"
                              />
                              <span className="text-xs font-extrabold text-white">None (Fixed Slot)</span>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1.5 leading-snug">
                              Stays at {blockSlot || 'selected slot'} every single week. No rotation.
                            </span>
                          </label>

                          {/* Option 2: ALTERNATE */}
                          <label className={`flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            equityMode === 'ALTERNATE'
                              ? 'bg-slate-950/80 border-blue-500/80 shadow-md'
                              : 'bg-slate-950/30 border-slate-800 hover:border-slate-700'
                          }`}>
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name="equityMode"
                                value="ALTERNATE"
                                checked={equityMode === 'ALTERNATE'}
                                onChange={() => setEquityMode('ALTERNATE')}
                                className="text-blue-500 bg-slate-900 border-slate-700"
                              />
                              <span className="text-xs font-extrabold text-white">Alternating Slots</span>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1.5 leading-snug">
                              Alternates week-to-week between {blockSlot || 'selected slot'} and another chosen time.
                            </span>
                          </label>

                          {/* Option 3: SEQUENCE */}
                          <label className={`flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            equityMode === 'SEQUENCE'
                              ? 'bg-slate-950/80 border-blue-500/80 shadow-md'
                              : 'bg-slate-950/30 border-slate-800 hover:border-slate-700'
                          }`}>
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name="equityMode"
                                value="SEQUENCE"
                                checked={equityMode === 'SEQUENCE'}
                                onChange={() => setEquityMode('SEQUENCE')}
                                className="text-blue-500 bg-slate-900 border-slate-700"
                              />
                              <span className="text-xs font-extrabold text-white">Sequential Cycle</span>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1.5 leading-snug">
                              Cycles through all pitch slots forward each week to distribute early/late game slots fully equally.
                            </span>
                          </label>
                        </div>

                        {/* Alternate Slot Dropdown if ALTERNATE is selected */}
                        {equityMode === 'ALTERNATE' && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-slate-950/90 border border-slate-800 p-3 rounded-lg mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left"
                          >
                            <div>
                              <span className="block text-xs font-bold text-white">Select Alternate Slot:</span>
                              <span className="block text-[10px] text-slate-400">Week A uses {blockSlot || 'selected slot'}, Week B uses this slot.</span>
                            </div>
                            <select
                              value={alternateSlotValue}
                              onChange={(e) => setAlternateSlotValue(e.target.value)}
                              className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500 min-w-[140px]"
                            >
                              {slotsAvailable.filter(s => s !== blockSlot).map((slot) => (
                                <option key={slot} value={slot}>
                                  {slot}
                                </option>
                              ))}
                            </select>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Error/Success messages */}
                {blockBookingSuccess && (
                  <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-4 py-3 rounded-lg text-xs font-bold flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{blockBookingSuccess}</span>
                  </div>
                )}

                {blockBookingError && (
                  <div className="bg-red-950/80 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-xs font-bold flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>{blockBookingError}</span>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs flex items-center space-x-2 shadow-md hover:shadow-lg transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Confirm Block Booking</span>
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="fulltime"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {/* FA Search control */}
              <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-600 text-white rounded-lg p-2 font-bold text-sm tracking-tighter">
                    FA
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Football Association Full-Time Database
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Synchronize scheduled home league fixtures with the club pitch calendar
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 w-full md:w-auto">
                  <div className="flex bg-slate-900 border border-slate-700 rounded-lg overflow-hidden flex-grow md:flex-grow-0">
                    <span className="bg-slate-800 text-slate-400 px-3 py-2 text-xs font-bold border-r border-slate-700">
                      CLUB ID
                    </span>
                    <input
                      type="text"
                      value={faClubId}
                      onChange={(e) => setFaClubId(e.target.value)}
                      placeholder="e.g. SCOT-U-JFC"
                      className="bg-transparent text-xs font-bold text-white p-2 w-28 focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={handleSearchFAFixtures}
                    disabled={isSearchingFA}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center space-x-2 shadow transition-colors flex-shrink-0"
                  >
                    {isSearchingFA ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span>{isSearchingFA ? 'Fetching...' : 'Query FA System'}</span>
                  </button>
                </div>
              </div>

              {/* Feedback Message */}
              {importFeedback && (
                <div className="bg-blue-950/80 border border-blue-800 text-blue-300 px-4 py-3 rounded-lg text-xs font-bold flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span>{importFeedback}</span>
                </div>
              )}

              {/* Simulation Result */}
              {!faFixturesLoaded && !isSearchingFA && (
                <div className="py-10 text-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/40">
                  <Info className="w-8 h-8 text-slate-500 mx-auto mb-2.5" />
                  <p className="text-xs font-bold text-slate-400">FA Full-Time Sync Ready</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                    Click "Query FA System" above to query the upcoming scheduled fixtures list for the club's age sections.
                  </p>
                </div>
              )}

              {isSearchingFA && (
                <div className="py-12 text-center border border-slate-800 rounded-xl bg-slate-900/20">
                  <RefreshCw className="w-8 h-8 text-blue-500 mx-auto animate-spin mb-3" />
                  <p className="text-xs font-bold text-slate-300">Searching FA Match Databases...</p>
                  <p className="text-[11px] text-slate-500 mt-1">Downloading schedules, verifying home/away layouts & kick-off grids</p>
                </div>
              )}

              {faFixturesLoaded && (
                <div className="space-y-4">
                  {/* Filters bar */}
                  <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl space-y-4">
                    <div className="flex items-center space-x-2 text-blue-400">
                      <Sparkles className="w-4 h-4" />
                      <h5 className="text-xs font-black uppercase tracking-wider">Filter FA Fixtures</h5>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Filter by Team</label>
                        <select
                          value={faFilterTeam}
                          onChange={(e) => setFaFilterTeam(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="">All Teams ({Array.from(new Set<string>(loadedFixtures.map(f => f.scotterTeam))).length})</option>
                          {Array.from(new Set<string>(loadedFixtures.map(f => f.scotterTeam))).sort().map((t: string) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Filter by Pitch Format</label>
                        <select
                          value={faFilterPitch}
                          onChange={(e) => setFaFilterPitch(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="">All Formats ({Array.from(new Set<string>(loadedFixtures.map(f => f.pitchId))).length})</option>
                          {Array.from(new Set<string>(loadedFixtures.map(f => f.pitchId))).sort().map((p: string) => (
                            <option key={p} value={p}>{p} Format</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Filter by Match Date</label>
                        <select
                          value={faFilterDate}
                          onChange={(e) => setFaFilterDate(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="">All Dates ({Array.from(new Set<string>(loadedFixtures.map(f => f.date))).length})</option>
                          {Array.from(new Set<string>(loadedFixtures.map(f => f.date))).sort().map((d: string) => (
                            <option key={d} value={d}>
                              {new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Quick helper selection links */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-3 border-t border-slate-800/60 text-[10px] text-slate-400 font-bold">
                      <span>Quick Selection:</span>
                      <button
                        type="button"
                        onClick={handleToggleSelectAllFiltered}
                        className="text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-tight"
                      >
                        {allSelectableFilteredSelected ? 'Deselect All Filtered' : 'Tick All Filtered'}
                      </button>
                      <span className="text-slate-700">|</span>
                      <button
                        type="button"
                        onClick={handleToggleSelectAllOverall}
                        className="text-amber-400 hover:text-amber-300 transition-colors uppercase tracking-tight"
                      >
                        Tick All / Clear All (Everything)
                      </button>
                      <span className="text-slate-700">|</span>
                      <span className="text-slate-500">
                        Selected: <strong className="text-white">{filteredFixtures.filter(f => selectedFixtureIds.includes(f.id) && getFixtureStatus(f).type === 'VACANT').length}</strong> vacant & <strong className="text-white">{filteredFixtures.filter(f => selectedFixtureIds.includes(f.id) && getFixtureStatus(f).type === 'BOOKED_SELF').length}</strong> booked filtered fixtures
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Showing {filteredFixtures.length} of {loadedFixtures.length} scheduled fixtures
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleBulkImportFixtures}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold py-1.5 px-3.5 rounded-lg flex items-center space-x-1.5 shadow transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Bulk Book ({filteredFixtures.filter(f => selectedFixtureIds.includes(f.id) && getFixtureStatus(f).type === 'VACANT').length} vacant)</span>
                      </button>
                      <button
                        onClick={handleBulkUnbookFixtures}
                        className="bg-red-600 hover:bg-red-500 text-white text-[11px] font-extrabold py-1.5 px-3.5 rounded-lg flex items-center space-x-1.5 shadow transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Bulk Unbook ({filteredFixtures.filter(f => selectedFixtureIds.includes(f.id) && getFixtureStatus(f).type === 'BOOKED_SELF').length} booked)</span>
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-800/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                          <tr>
                            <th className="px-4 py-3 w-10 text-center">
                              <input
                                type="checkbox"
                                checked={allSelectableFilteredSelected}
                                onChange={handleToggleSelectAllFiltered}
                                className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-950 cursor-pointer"
                                title="Toggle select all filtered matches"
                              />
                            </th>
                            <th className="px-4 py-3">Fixture Details</th>
                            <th className="px-4 py-3">Pitch Format</th>
                            <th className="px-4 py-3">Date & Time</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {filteredFixtures.map((fixture) => {
                            const statusInfo = getFixtureStatus(fixture);
                            const isSelected = selectedFixtureIds.includes(fixture.id);
                            return (
                              <React.Fragment key={fixture.id}>
                                <tr 
                                  className={`hover:bg-slate-800/30 transition-colors ${(statusInfo.type === 'VACANT' || statusInfo.type === 'BOOKED_SELF') ? 'cursor-pointer' : ''}`}
                                  onClick={(e) => {
                                    const target = e.target as HTMLElement;
                                    if (
                                      (statusInfo.type === 'VACANT' || statusInfo.type === 'BOOKED_SELF') &&
                                      target.tagName !== 'BUTTON' && 
                                      target.tagName !== 'INPUT' && 
                                      target.tagName !== 'A' && 
                                      !target.closest('button') && 
                                      !target.closest('a')
                                    ) {
                                      toggleFixtureSelection(fixture.id);
                                    }
                                  }}
                                >
                                  <td className="px-4 py-3.5 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      disabled={statusInfo.type !== 'VACANT' && statusInfo.type !== 'BOOKED_SELF'}
                                      onChange={() => toggleFixtureSelection(fixture.id)}
                                      className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-950 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <div className="font-bold text-white text-xs">
                                      {fixture.homeTeam} vs {fixture.awayTeam}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wide">
                                      {fixture.competition}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <span className="bg-blue-950 text-blue-300 font-bold px-2 py-0.5 rounded text-[10px] uppercase border border-blue-900/40">
                                      {fixture.pitchId}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <div className="font-bold text-slate-200">
                                      {new Date(fixture.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                    </div>
                                    <div className="text-[10px] text-slate-400 flex items-center mt-0.5 font-semibold">
                                      <Clock className="w-3 h-3 mr-1 text-slate-500" />
                                      {fixture.timeSlot} KO
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    {statusInfo.type === 'BOOKED_SELF' ? (
                                      <span className="inline-flex items-center text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-900/50 px-2 py-0.5 rounded font-bold uppercase">
                                        <Check className="w-3 h-3 mr-1" /> Diary Booked
                                      </span>
                                    ) : statusInfo.type === 'CLASH' ? (
                                      <span className="inline-flex items-center text-[10px] bg-red-950 text-red-400 border border-red-900/50 px-2 py-0.5 rounded font-bold uppercase" title={`This slot is already booked by ${statusInfo.booking?.teamName}`}>
                                        <AlertTriangle className="w-3 h-3 mr-1 text-red-400" /> Clash: {statusInfo.booking?.teamName}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center text-[10px] bg-amber-950 text-amber-400 border border-amber-900/50 px-2 py-0.5 rounded font-bold uppercase">
                                        <AlertTriangle className="w-3 h-3 mr-1" /> Unscheduled
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3.5 text-right">
                                    {statusInfo.type === 'BOOKED_SELF' && statusInfo.booking ? (
                                      canManagerUnbook(currentUser, statusInfo.booking) ? (
                                        confirmUnbookFixtureId === fixture.id ? (
                                          <div className="flex items-center justify-end space-x-1">
                                            <span className="text-[9px] font-bold text-red-400 uppercase">Unbook?</span>
                                            <button
                                              onClick={() => {
                                                if (statusInfo.booking) {
                                                  onCancelBooking(statusInfo.booking.id);
                                                  setImportFeedback(`Successfully unbooked match: ${fixture.homeTeam} vs ${fixture.awayTeam}`);
                                                }
                                                setConfirmUnbookFixtureId(null);
                                              }}
                                              className="bg-red-600 hover:bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm"
                                            >
                                              Yes
                                            </button>
                                            <button
                                              onClick={() => setConfirmUnbookFixtureId(null)}
                                              className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm"
                                            >
                                              No
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => setConfirmUnbookFixtureId(fixture.id)}
                                            className="text-[10px] font-black uppercase py-1.5 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-all shadow-sm"
                                          >
                                            Unbook Match
                                          </button>
                                        )
                                      ) : (
                                        <button
                                          disabled
                                          className="text-[10px] font-black uppercase py-1.5 px-3 rounded-lg bg-slate-800 text-slate-500 cursor-not-allowed"
                                        >
                                          Booked
                                        </button>
                                      )
                                    ) : statusInfo.type === 'CLASH' ? (
                                      <button
                                        onClick={() => {
                                          if (resolvingClashId === fixture.id) {
                                            setResolvingClashId(null);
                                          } else {
                                            setResolvingClashId(fixture.id);
                                            const vacs = getVacantSlots(fixture.pitchId, fixture.date);
                                            if (vacs.length > 0) {
                                              setAlternativeSlot(vacs[0]);
                                              setExistingBookingSlot(vacs[0]);
                                            } else {
                                              setAlternativeSlot('');
                                              setExistingBookingSlot('');
                                            }
                                          }
                                        }}
                                        className={`text-[10px] font-black uppercase py-1.5 px-3 rounded-lg transition-all shadow-sm ${
                                          resolvingClashId === fixture.id
                                            ? 'bg-slate-700 hover:bg-slate-600 text-white'
                                            : 'bg-amber-600 hover:bg-amber-500 text-white'
                                        }`}
                                      >
                                        {resolvingClashId === fixture.id ? 'Cancel Rebook' : 'Resolve Clash'}
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleImportFixture(fixture)}
                                        className="text-[10px] font-black uppercase py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all"
                                      >
                                        Book Pitch
                                      </button>
                                    )}
                                  </td>
                                </tr>

                                {resolvingClashId === fixture.id && (
                                  <tr className="bg-slate-900/60 border-y border-red-900/40">
                                    <td colSpan={6} className="p-4">
                                      <div className="space-y-4">
                                        <div className="flex items-center space-x-2 text-amber-400">
                                          <AlertTriangle className="w-4 h-4" />
                                          <h4 className="font-extrabold text-xs uppercase tracking-tight">
                                            Resolve Clash & Rebook Options
                                          </h4>
                                        </div>
                                        
                                        <p className="text-[11px] text-slate-400">
                                          This FA fixture clashes with <strong className="text-white">{statusInfo.booking?.teamName}</strong> who already booked <strong className="text-white">{fixture.timeSlot}</strong> on the {fixture.pitchId} pitch format. Select a rebooking strategy:
                                        </p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-left">
                                          {/* Option A: Reschedule incoming FA match */}
                                          <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 space-y-2.5">
                                            <p className="text-[11px] font-extrabold uppercase text-blue-400 tracking-wider">
                                              Option A: Rebook incoming FA Match to Vacant Slot
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                              Keep {statusInfo.booking?.teamName} at {fixture.timeSlot}, and book this FA match at a different open slot on this day:
                                            </p>
                                            
                                            {getVacantSlots(fixture.pitchId, fixture.date).length > 0 ? (
                                              <div className="flex items-center gap-2">
                                                <select
                                                  value={alternativeSlot}
                                                  onChange={(e) => setAlternativeSlot(e.target.value)}
                                                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] font-bold text-slate-200 focus:outline-none focus:border-blue-500 flex-grow"
                                                >
                                                  {getVacantSlots(fixture.pitchId, fixture.date).map((slot) => (
                                                    <option key={slot} value={slot}>
                                                      {slot} (Vacant)
                                                    </option>
                                                  ))}
                                                </select>
                                                <button
                                                  onClick={() => handleRescheduleFA(fixture, alternativeSlot)}
                                                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded text-[10px] uppercase shadow-sm transition-all whitespace-nowrap"
                                                >
                                                  Book Slot
                                                </button>
                                              </div>
                                            ) : (
                                              <p className="text-[10px] text-red-400 font-bold italic">
                                                No other vacant slots are available on this pitch on this date.
                                              </p>
                                            )}
                                          </div>

                                          {/* Option B: Reschedule existing booking */}
                                          <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 space-y-2.5">
                                            <p className="text-[11px] font-extrabold uppercase text-amber-400 tracking-wider">
                                              Option B: Move Existing Booking & Book FA Match Here
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                              Move {statusInfo.booking?.teamName}'s booking to an alternative vacant slot, freeing up {fixture.timeSlot} for this FA match:
                                            </p>

                                            {getVacantSlots(fixture.pitchId, fixture.date).length > 0 ? (
                                              <div className="flex items-center gap-2">
                                                <select
                                                  value={existingBookingSlot}
                                                  onChange={(e) => setExistingBookingSlot(e.target.value)}
                                                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] font-bold text-slate-200 focus:outline-none focus:border-amber-500 flex-grow"
                                                >
                                                  {getVacantSlots(fixture.pitchId, fixture.date).map((slot) => (
                                                    <option key={slot} value={slot}>
                                                      Move to {slot} (Vacant)
                                                    </option>
                                                  ))}
                                                </select>
                                                <button
                                                  onClick={() => {
                                                    if (statusInfo.booking) {
                                                      handleRescheduleExistingAndBookFA(fixture, statusInfo.booking, existingBookingSlot);
                                                    }
                                                  }}
                                                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-1.5 rounded text-[10px] uppercase shadow-sm transition-all whitespace-nowrap"
                                                >
                                                  Move & Book
                                                </button>
                                              </div>
                                            ) : (
                                              <p className="text-[10px] text-red-400 font-bold italic">
                                                No other vacant slots are available on this pitch to move the booking to.
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
