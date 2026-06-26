/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  PlusCircle, 
  HelpCircle, 
  User, 
  Info, 
  ArrowLeft, 
  ArrowRight, 
  ShieldCheck,
  Filter,
  BookOpen
} from 'lucide-react';
import { PitchSize, Booking, BookingStatus, PitchConfig, User as UserType } from '../types';
import AdminPanel from './AdminPanel';
import { canManagerUnbook, isTeamMatch } from '../utils/bookingUtils';
import { MOCK_FA_FULLTIME_FIXTURES } from '../mockData';

interface PitchDiaryProps {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  pitchConfigs: PitchConfig[];
  bookings: Booking[];
  currentUser: UserType;
  onRequestBooking: (pitchId: PitchSize, slot: string, notes?: string, date?: string, existingBookingId?: string) => void;
  onApproveBooking: (id: string) => void;
  onDeclineBooking: (id: string, reason: string) => void;
  onCancelBooking: (id: string) => void;
  onAddBookingsBulk?: (newBookings: Booking[]) => void;
  onUpdateBooking?: (id: string, fields: Partial<Booking>) => void;
}

export default function PitchDiary({
  selectedDate,
  setSelectedDate,
  pitchConfigs,
  bookings,
  currentUser,
  onRequestBooking,
  onApproveBooking,
  onDeclineBooking,
  onCancelBooking,
  onAddBookingsBulk,
  onUpdateBooking,
}: PitchDiaryProps) {
  // Decline active states for specific booking IDs (to show decline text area)
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState<string>('');

  // Inline Confirmation States (to bypass iframe confirm limitations)
  const [confirmDismissId, setConfirmDismissId] = useState<string | null>(null);
  const [confirmCancelBookingId, setConfirmCancelBookingId] = useState<string | null>(null);
  const [confirmUnbookFixtureId, setConfirmUnbookFixtureId] = useState<string | null>(null);

  // Sorter / Filter States for the Team Pitch List (underneath calendar)
  const [filterManagerOnly, setFilterManagerOnly] = useState<boolean>(!!currentUser.teamName);
  const [fixturePitchFilter, setFixturePitchFilter] = useState<string>('ALL');
  const [fixtureDateFilter, setFixtureDateFilter] = useState<string>('ALL');

  // Keep filterManagerOnly in sync with selected currentUser's teamName presence
  useEffect(() => {
    setFilterManagerOnly(!!currentUser.teamName);
  }, [currentUser]);

  // Get active day of the week
  const dateObj = new Date(selectedDate);
  const dayName = dateObj.toLocaleDateString('en-GB', { weekday: 'long' });
  const dayString = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // Generate week days (7 days around selected date to easily click)
  const getWeekDates = () => {
    const dates = [];
    const baseDate = new Date(selectedDate);
    // Move to previous Monday
    const day = baseDate.getDay();
    const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(baseDate.setDate(diff));

    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      dates.push(nextDay);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  // Find declined bookings for this manager
  const declinedBookings = bookings.filter(
    (b) => currentUser.role === 'MANAGER' && b.managerId === currentUser.id && b.status === BookingStatus.DECLINED
  );

  const handlePrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next.toISOString().split('T')[0]);
  };

  // 1. Dynamic Unique Slots generation for calendar rows on selectedDate
  // Show each of the hours between 9am and 9pm on weekdays.
  // Show prebook slots 09:30, 10:45, 12:00 on Saturdays and Sundays.
  const isWeekend = (() => {
    const d = new Date(selectedDate);
    const day = d.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  })();

  const weekendSlots = ['09:30', '10:45', '12:00'];
  const weekdaySlots = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
    '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
  ];

  const baseSlots = isWeekend ? weekendSlots : weekdaySlots;

  const allDateSlots = Array.from(new Set([
    ...baseSlots,
    ...bookings.filter(b => b.date === selectedDate && b.status !== BookingStatus.DECLINED && b.status !== BookingStatus.UNBOOKED).map(b => b.timeSlot)
  ])).sort((a, b) => a.localeCompare(b));

  // 2. Build Unified Team Fixtures & Bookings List underneath
  // Filter FA full time fixtures matching criteria
  const filteredFAFixtures = MOCK_FA_FULLTIME_FIXTURES.filter((f) => {
    if (filterManagerOnly && (!currentUser.teamName || !isTeamMatch(currentUser.teamName, f.scotterTeam))) {
      return false;
    }
    if (fixturePitchFilter !== 'ALL' && f.pitchId !== fixturePitchFilter) {
      return false;
    }
    if (fixtureDateFilter !== 'ALL' && f.date !== fixtureDateFilter) {
      return false;
    }
    return true;
  });

  // Filter other non-FA manual bookings matching criteria: only show matches for their team when filterManagerOnly is enabled
  const manualBookings = bookings.filter((b) => {
    if (b.status === BookingStatus.DECLINED) return false;
    if (filterManagerOnly && (!currentUser.teamName || !isTeamMatch(currentUser.teamName, b.teamName))) {
      return false;
    }
    if (fixturePitchFilter !== 'ALL' && b.pitchId !== fixturePitchFilter) {
      return false;
    }
    if (fixtureDateFilter !== 'ALL' && b.date !== fixtureDateFilter) {
      return false;
    }
    // Exclude bookings that map to an FA Full-time fixture to prevent duplicates
    const isMappedToFa = MOCK_FA_FULLTIME_FIXTURES.some(
      (f) => f.pitchId === b.pitchId && f.date === b.date && f.timeSlot === b.timeSlot
    );
    return !isMappedToFa;
  });

  // Unique list of dates for dropdown filtering
  const uniqueDates = Array.from(new Set([
    ...MOCK_FA_FULLTIME_FIXTURES.map(f => f.date),
    ...bookings.map(b => b.date)
  ])).sort();

  interface UnifiedItem {
    id: string;
    type: 'FA_FIXTURE' | 'MANUAL_BOOKING';
    date: string;
    timeSlot: string;
    pitchId: PitchSize;
    title: string;
    opponent?: string;
    competition?: string;
    booking?: Booking;
  }

  const unifiedList: UnifiedItem[] = [];

  // Add matching FA fixtures
  filteredFAFixtures.forEach(f => {
    const booking = bookings.find(
      b => b.pitchId === f.pitchId && b.date === f.date && b.timeSlot === f.timeSlot && b.status !== BookingStatus.DECLINED
    );
    unifiedList.push({
      id: f.id,
      type: 'FA_FIXTURE',
      date: f.date,
      timeSlot: f.timeSlot,
      pitchId: f.pitchId,
      title: `${f.homeTeam} vs ${f.awayTeam}`,
      opponent: f.homeTeam === f.scotterTeam ? f.awayTeam : f.homeTeam,
      competition: f.competition,
      booking
    });
  });

  // Add matching Custom Bookings
  manualBookings.forEach(b => {
    unifiedList.push({
      id: b.id,
      type: 'MANUAL_BOOKING',
      date: b.date,
      timeSlot: b.timeSlot,
      pitchId: b.pitchId,
      title: `${b.teamName} - Custom Session`,
      competition: b.notes || 'Training/Friendly Match',
      booking: b
    });
  });

  // Sort unified list chronologically
  unifiedList.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.timeSlot.localeCompare(b.timeSlot);
  });

  const parseTimeToMinutes = (t: string): number => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const START_HOUR = 9;
  const END_HOUR = 22; // up to 22:00
  const START_MINUTES = START_HOUR * 60; // 540
  const END_MINUTES = END_HOUR * 60;   // 1320
  const TOTAL_MINUTES = END_MINUTES - START_MINUTES; // 780 minutes

  const getPositionPercent = (timeStr: string): number => {
    const mins = parseTimeToMinutes(timeStr);
    const clamped = Math.max(START_MINUTES, Math.min(END_MINUTES, mins));
    return ((clamped - START_MINUTES) / TOTAL_MINUTES) * 100;
  };

  const getEndTimeForSlot = (pId: PitchSize, dateStr: string, slot: string): string => {
    if (!dateStr || !slot) return '';
    const d = new Date(dateStr);
    const day = d.getDay();
    const isWeekend = day === 0 || day === 6;
    if (isWeekend) {
      if (pId === '11v11') {
        if (slot === '10:00') return '12:00';
        if (slot === '12:00') return '14:00';
        const [hStr, mStr] = slot.split(':');
        const h = parseInt(hStr, 10) + 2;
        return `${String(h).padStart(2, '0')}:${mStr}`;
      } else {
        if (slot === '09:30') return '10:45';
        if (slot === '10:45') return '12:00';
        if (slot === '12:00') return '13:15';
        
        const [hStr, mStr] = slot.split(':');
        const totalMinutes = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + 75;
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
    } else {
      const [hStr, mStr] = slot.split(':');
      const h = parseInt(hStr, 10) + 1;
      return `${String(h).padStart(2, '0')}:${mStr}`;
    }
  };

  const WEEKEND_PREBOOKED_BLOCKS: Record<string, Array<{ start: string; end: string }>> = {
    '5v5': [
      { start: '09:30', end: '10:45' },
      { start: '10:45', end: '12:00' },
      { start: '12:00', end: '13:15' },
    ],
    '7v7': [
      { start: '09:30', end: '10:45' },
      { start: '10:45', end: '12:00' },
      { start: '12:00', end: '13:15' },
    ],
    '9v9': [
      { start: '09:30', end: '10:45' },
      { start: '10:45', end: '12:00' },
      { start: '12:00', end: '13:15' },
    ],
    '11v11': [
      { start: '10:00', end: '12:00' },
      { start: '12:00', end: '14:00' },
    ],
  };

  const getStandardSlotsForDate = (pitchId: string, dateStr: string): Array<{ start: string; end: string }> => {
    const d = new Date(dateStr);
    const day = d.getDay();
    const isWeekend = day === 0 || day === 6;
    if (isWeekend) {
      return WEEKEND_PREBOOKED_BLOCKS[pitchId] || [];
    }
    return [];
  };

  const isVacantSlotOverlapping = (slotStartStr: string, slotEndStr: string, pitchId: PitchSize, dateStr: string) => {
    const startMins = parseTimeToMinutes(slotStartStr);
    const endMins = parseTimeToMinutes(slotEndStr);
    
    return bookings.some(b => {
      if (b.pitchId !== pitchId || b.date !== dateStr) return false;
      if (b.status === BookingStatus.DECLINED || b.status === BookingStatus.UNBOOKED) return false;
      
      const bStart = parseTimeToMinutes(b.timeSlot);
      const bEnd = parseTimeToMinutes(b.endTime || getEndTimeForSlot(b.pitchId, b.date, b.timeSlot));
      
      return startMins < bEnd && bStart < endMins;
    });
  };

  const HOUR_ROWS = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
    '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
  ];

  return (
    <div className="space-y-8">
      {/* Club & Admin Fixtures Sync Hub */}
      {currentUser.role === 'ADMIN' && onAddBookingsBulk && (
        <AdminPanel
          bookings={bookings}
          pitchConfigs={pitchConfigs}
          selectedDate={selectedDate}
          onAddBookingsBulk={onAddBookingsBulk}
          onCancelBooking={onCancelBooking}
          onUpdateBooking={onUpdateBooking}
          currentUser={currentUser}
          onRequestBooking={onRequestBooking}
        />
      )}

      {/* Declined Bookings Notification Box for Managers */}
      {currentUser.role === 'MANAGER' && declinedBookings.length > 0 && (
        <div className="bg-red-50/70 border-2 border-red-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <h3 className="text-sm font-extrabold uppercase tracking-tight">
              Pitch Booking Requests Declined ({declinedBookings.length})
            </h3>
          </div>
          <p className="text-xs text-red-700 font-medium">
            The administrator has declined the following pitch booking request(s). Please review the reason of decline below:
          </p>
          <div className="divide-y divide-red-100 bg-white border border-red-100 rounded-xl overflow-hidden shadow-sm">
            {declinedBookings.map((b) => (
              <div key={b.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                      {new Date(b.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="bg-slate-100 text-slate-800 font-bold px-1.5 py-0.5 rounded text-[10px] uppercase">
                      {b.pitchId} Format
                    </span>
                    <span className="bg-slate-100 text-slate-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                      {b.timeSlot}
                    </span>
                  </div>
                  {b.notes && (
                    <p className="text-xs text-slate-500 font-medium">
                      Your notes: <span className="italic">"{b.notes}"</span>
                    </p>
                  )}
                  {b.declineReason && (
                    <div className="bg-red-50/80 border border-red-100/50 rounded-lg p-2.5 mt-1.5 text-xs text-red-900 font-semibold leading-relaxed">
                      <span className="text-[10px] text-red-600 font-extrabold uppercase tracking-wide block mb-0.5">Admin's Decline Reason:</span>
                      "{b.declineReason}"
                    </div>
                  )}
                </div>
                <div className="flex items-center self-start sm:self-center">
                  {confirmDismissId === b.id ? (
                    <div className="flex items-center space-x-2 bg-red-100 border border-red-200 py-1.5 px-3 rounded-lg">
                      <span className="text-xs text-red-800 font-extrabold uppercase">Confirm?</span>
                      <button
                        onClick={() => {
                          onCancelBooking(b.id);
                          setConfirmDismissId(null);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-extrabold py-1 px-2.5 rounded transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDismissId(null)}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-extrabold py-1 px-2.5 rounded transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDismissId(b.id)}
                      className="bg-red-600 hover:bg-red-700 text-white text-[11px] font-extrabold py-2 px-4 rounded-lg shadow-sm transition-colors whitespace-nowrap"
                    >
                      Acknowledge & Dismiss
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Date Navigation & Calendar Panel */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-900 text-white p-3 rounded-xl shadow-md">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{dayName}, {dayString}</h2>
              <p className="text-xs text-slate-500 font-medium">View other kickoff slots or select a different date from the timeline</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 self-start md:self-auto">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-50 border-2 border-slate-200 rounded-lg py-2 px-3 text-slate-700 font-semibold focus:outline-none focus:border-blue-900 text-sm"
            />
            
            <div className="flex space-x-1 bg-slate-50 border-2 border-slate-200 p-1 rounded-lg">
              <button
                onClick={handlePrevDay}
                className="hover:bg-white text-slate-700 p-1.5 rounded transition-colors"
                title="Previous Day"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextDay}
                className="hover:bg-white text-slate-700 p-1.5 rounded transition-colors"
                title="Next Day"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 7-Day Mini Calendar Slider */}
        <div className="grid grid-cols-7 gap-2 mt-6 border-t-2 border-slate-50 pt-4">
          {weekDates.map((d, idx) => {
            const formatted = d.toISOString().split('T')[0];
            const isSelected = formatted === selectedDate;
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const label = d.toLocaleDateString('en-GB', { weekday: 'short' });
            const dayNum = d.getDate();

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(formatted)}
                className={`flex flex-col items-center py-2.5 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'bg-blue-900 border-blue-900 text-white shadow-md'
                    : isWeekend
                    ? 'bg-blue-50 border-blue-100 text-blue-900 hover:border-blue-200'
                    : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-200'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">{label}</span>
                <span className="text-base font-extrabold mt-0.5">{dayNum}</span>
                {isWeekend && !isSelected && (
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1 animate-ping" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid Calendar: Slots on Left, Pitches on Right */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-blue-900" />
            <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Club Pitch Grid & Diary</h3>
          </div>
          <span className="text-xs text-slate-500 font-bold bg-white px-2.5 py-1 rounded-full border border-slate-200">
            Selected Date: <strong className="text-blue-900">{dayString}</strong>
          </span>
        </div>

        <div className="overflow-x-auto animate-fadeIn">
          {/* Scrollable scheduler wrapper */}
          <div className="min-w-[950px] relative flex flex-col bg-slate-50/25">
            {/* Header row */}
            <div className="flex border-b border-slate-200 bg-slate-100/90 sticky top-0 z-30 select-none">
              <div className="w-24 sm:w-28 flex-shrink-0 py-4 px-3 text-center text-xs font-bold text-blue-950 uppercase tracking-wider border-r border-slate-200 flex items-center justify-center">
                KO Time
              </div>
              <div className="flex-1 grid grid-cols-4 divide-x divide-slate-200">
                {pitchConfigs.map((pitch) => (
                  <div key={pitch.id} className="py-4 text-center text-xs font-black text-blue-950 uppercase tracking-wider flex flex-col justify-center">
                    <span className="font-black text-blue-900 text-[13px]">{pitch.name}</span>
                    <span className="text-[9px] text-slate-400 font-bold mt-0.5 tracking-wider">{pitch.id} Pitch Format</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Grid Body */}
            <div className="flex relative h-[1300px]">
              {/* Left Column (Hour markers) */}
              <div className="w-24 sm:w-28 flex-shrink-0 border-r border-slate-200 relative bg-slate-50/60 select-none">
                {HOUR_ROWS.map((hour, idx) => {
                  return (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 border-t border-transparent text-center"
                      style={{ top: `${(idx / HOUR_ROWS.length) * 100}%` }}
                    >
                      <div className="flex items-center justify-center space-x-1 py-1 text-slate-600">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="text-[11px] font-extrabold font-mono tracking-tight">{hour}</span>
                      </div>
                    </div>
                  );
                })}
                {/* 22:00 bottom label */}
                <div className="absolute left-0 right-0 bottom-0 text-center">
                  <div className="flex items-center justify-center space-x-1 py-1 text-slate-600">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-[11px] font-extrabold font-mono tracking-tight">22:00</span>
                  </div>
                </div>
              </div>

              {/* Pitch Columns Container */}
              <div className="flex-1 grid grid-cols-4 relative divide-x divide-slate-200 bg-white">
                {pitchConfigs.map((pitch) => {
                  // Get bookings for this pitch and date
                  const activeBookings = bookings.filter(
                    (b) =>
                      b.pitchId === pitch.id &&
                      b.date === selectedDate &&
                      b.status !== BookingStatus.DECLINED &&
                      b.status !== BookingStatus.UNBOOKED
                  );

                  // Get standard weekend slots
                  const standardSlots = getStandardSlotsForDate(pitch.id, selectedDate);

                  return (
                    <div key={pitch.id} className="relative h-full overflow-visible group/col">
                      {/* 1. Background Grid Hour lanes */}
                      {HOUR_ROWS.map((hour, idx) => {
                        return (
                          <div
                            key={hour}
                            onClick={() => onRequestBooking(pitch.id, hour)}
                            className="absolute left-0 right-0 border-b border-slate-100 hover:bg-slate-50/40 transition-colors cursor-pointer flex items-start justify-end p-1.5 group/cell"
                            style={{
                              top: `${(idx / HOUR_ROWS.length) * 100}%`,
                              height: `${(1 / HOUR_ROWS.length) * 100}%`,
                            }}
                          >
                            <span className="opacity-0 group-hover/cell:opacity-100 text-[9px] font-black text-blue-700 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 shadow-sm uppercase tracking-wider transition-opacity duration-150">
                              ＋ Request {hour}
                            </span>
                          </div>
                        );
                      })}

                      {/* 2. Render Vacant Prebooked Blocks (Saturdays/Sundays only) */}
                      {standardSlots.map((slot) => {
                        const isOverlapping = isVacantSlotOverlapping(slot.start, slot.end, pitch.id, selectedDate);
                        if (isOverlapping) return null;

                        const topPercent = getPositionPercent(slot.start);
                        const endPercent = getPositionPercent(slot.end);
                        const heightPercent = endPercent - topPercent;

                        return (
                          <div
                            key={`${slot.start}-${slot.end}`}
                            style={{
                              top: `${topPercent}%`,
                              height: `${heightPercent}%`,
                            }}
                            className="absolute left-1 right-1 z-10 p-2.5 bg-blue-50/15 hover:bg-blue-50/35 rounded-xl border-2 border-dashed border-blue-200/90 hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center space-x-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                <span className="text-[10px] text-blue-900 font-extrabold uppercase tracking-wide">
                                  Weekend Prebook Slot
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 font-bold font-mono mt-1">
                                {slot.start} - {slot.end}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRequestBooking(pitch.id, slot.start);
                              }}
                              className="bg-blue-900 hover:bg-blue-800 text-white text-[10px] font-extrabold py-1 px-2.5 rounded-lg shadow-sm transition-all flex items-center justify-center space-x-1"
                            >
                              <PlusCircle className="w-3 h-3" />
                              <span>Book Block</span>
                            </button>
                          </div>
                        );
                      })}

                      {/* 3. Render Active Bookings */}
                      {activeBookings.map((booking) => {
                        const resolvedEndTime = booking.endTime || getEndTimeForSlot(booking.pitchId, booking.date, booking.timeSlot);
                        const topPercent = getPositionPercent(booking.timeSlot);
                        const endPercent = getPositionPercent(resolvedEndTime);
                        const heightPercent = endPercent - topPercent;

                        const tooltipText = [
                          `Team: ${booking.teamName}`,
                          `Booked by: ${booking.managerName}`,
                          `Status: ${booking.status === BookingStatus.APPROVED ? 'Approved' : 'Pending Approval'}`,
                          `Submitted: ${new Date(booking.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at ${new Date(booking.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
                          booking.notes ? `Notes: "${booking.notes}"` : ''
                        ].filter(Boolean).join('\n');

                        return (
                          <div
                            key={booking.id}
                            style={{
                              top: `${topPercent}%`,
                              height: `${heightPercent}%`,
                            }}
                            className={`absolute left-1 right-1 z-20 p-2.5 rounded-xl border text-left shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group/bookingcard ${
                              booking.status === BookingStatus.APPROVED
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-emerald-50/30 hover:bg-emerald-100/90'
                                : 'bg-amber-50 border-amber-300 text-amber-950 shadow-amber-50/30 hover:bg-amber-100/90'
                            }`}
                            title={tooltipText}
                          >
                            <div className="space-y-1 overflow-hidden">
                              <div className="flex justify-between items-start gap-1">
                                <div className="flex items-center space-x-1 min-w-0">
                                  <p className="text-[11px] font-black leading-tight text-slate-900 truncate">
                                    {booking.teamName}
                                  </p>
                                  {/* Info Trigger with Custom Overlay Tooltip on Hover */}
                                  <div className="relative group/tooltip inline-block flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                                    {/* Tooltip Content positioned relative to the card to stay fully visible */}
                                    <div className="pointer-events-none absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-900 text-white text-[11px] rounded-xl p-3.5 shadow-2xl border border-slate-800 opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 ease-out text-left">
                                      <div className="space-y-2">
                                        <div className="border-b border-slate-800 pb-1 flex justify-between items-center">
                                          <span className="font-extrabold text-[9px] uppercase tracking-wider text-blue-400">Booking Details</span>
                                          <span className="text-[8px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-bold uppercase">{booking.status}</span>
                                        </div>
                                        <p className="font-black text-white text-xs leading-snug">{booking.teamName}</p>
                                        <div className="space-y-1 text-slate-300 font-medium font-sans">
                                          <p><strong className="text-slate-500">Booked by:</strong> {booking.managerName}</p>
                                          <p><strong className="text-slate-500">Date & Time:</strong> {new Date(booking.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} from {booking.timeSlot} to {resolvedEndTime}</p>
                                          <p><strong className="text-slate-500">Submitted:</strong> {new Date(booking.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(booking.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                                          {booking.notes && (
                                            <div className="italic text-slate-400 mt-1 bg-slate-950/50 p-2 rounded-lg border border-slate-800 text-[10px] font-sans">
                                              "{booking.notes}"
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
                                    </div>
                                  </div>
                                </div>
                                <span className={`inline-flex items-center text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                                  booking.status === BookingStatus.APPROVED ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-850 animate-pulse'
                                }`}>
                                  {booking.status === BookingStatus.APPROVED ? 'Approved' : 'Pending'}
                                </span>
                              </div>
                              <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wide truncate">
                                KO: {booking.timeSlot} - {resolvedEndTime}
                              </p>
                              <p className="text-[8px] text-slate-400 font-bold truncate">
                                By {booking.managerName}
                              </p>
                            </div>

                            {/* Booking Action Buttons inside Scheduler Card */}
                            <div className="flex justify-end pt-1 gap-1" onClick={(e) => e.stopPropagation()}>
                              {/* ADMIN ACTIONS */}
                              {currentUser.role === 'ADMIN' && (
                                <div className="flex gap-1">
                                  {booking.status === BookingStatus.PENDING ? (
                                    <>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); onApproveBooking(booking.id); }}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-extrabold py-0.5 px-2 rounded-md shadow-sm transition-colors"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDecliningId(booking.id);
                                          setDeclineReason('');
                                        }}
                                        className="bg-red-600 hover:bg-red-700 text-white text-[9px] font-extrabold py-0.5 px-2 rounded-md shadow-sm transition-colors"
                                      >
                                        Decline
                                      </button>
                                    </>
                                  ) : (
                                    confirmCancelBookingId === booking.id ? (
                                      <div className="flex items-center space-x-1 bg-red-100 border border-red-200 p-0.5 rounded">
                                        <span className="text-[8px] font-black text-red-800 uppercase">Cancel?</span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onCancelBooking(booking.id);
                                            setConfirmCancelBookingId(null);
                                          }}
                                          className="bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded"
                                        >
                                          Yes
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setConfirmCancelBookingId(null); }}
                                          className="bg-slate-300 text-slate-850 text-[8px] font-bold px-1.5 py-0.5 rounded"
                                        >
                                          No
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setConfirmCancelBookingId(booking.id); }}
                                        className="text-red-700 hover:bg-red-50 text-[9px] font-extrabold py-0.5 px-2 rounded-md border border-red-200 transition-colors bg-white shadow-sm"
                                      >
                                        Cancel
                                      </button>
                                    )
                                  )}
                                </div>
                              )}

                              {/* MANAGER ACTIONS */}
                              {currentUser.role === 'MANAGER' && canManagerUnbook(currentUser, booking) && (
                                confirmCancelBookingId === booking.id ? (
                                  <div className="flex items-center space-x-1 bg-red-100 border border-red-200 p-0.5 rounded">
                                    <span className="text-[8px] font-black text-red-800 uppercase">Unbook?</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onCancelBooking(booking.id);
                                        setConfirmCancelBookingId(null);
                                      }}
                                      className="bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded"
                                    >
                                      Yes
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setConfirmCancelBookingId(null); }}
                                      className="bg-slate-300 text-slate-850 text-[8px] font-bold px-1.5 py-0.5 rounded"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setConfirmCancelBookingId(booking.id); }}
                                    className="text-red-600 hover:bg-red-50 text-[9px] font-extrabold py-0.5 px-2 rounded-md border border-red-200 transition-colors bg-white shadow-sm"
                                  >
                                    Unbook
                                  </button>
                                )
                              )}
                            </div>

                            {/* Inline Decline Overlay for Admins inside scheduler card */}
                            {decliningId === booking.id && (
                              <div className="absolute inset-0 bg-white/95 p-2 z-30 flex flex-col justify-between" onClick={(e) => e.stopPropagation()}>
                                <div>
                                  <label className="block text-[8px] font-extrabold text-slate-700 uppercase mb-0.5">
                                    Decline Reason
                                  </label>
                                  <textarea
                                    value={declineReason}
                                    onChange={(e) => setDeclineReason(e.target.value)}
                                    placeholder="Reason..."
                                    rows={2}
                                    className="w-full text-[10px] p-1 border border-slate-300 rounded focus:border-red-600 focus:outline-none bg-white font-medium text-slate-800"
                                    required
                                  />
                                </div>
                                <div className="flex space-x-1 justify-end">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setDecliningId(null); }}
                                    className="text-slate-500 hover:bg-slate-100 text-[9px] font-extrabold py-0.5 px-1.5 rounded"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!declineReason.trim()) {
                                        alert('Please enter a decline reason.');
                                        return;
                                      }
                                      onDeclineBooking(booking.id, declineReason);
                                      setDecliningId(null);
                                    }}
                                    className="bg-red-600 hover:bg-red-700 text-white text-[9px] font-extrabold py-0.5 px-1.5 rounded shadow-sm"
                                  >
                                    Submit
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Pitch List Section: Underneath Calendar Grid */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-100 text-blue-900 rounded-lg">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">Team Fixtures & Pitch Booking Status</h3>
              <p className="text-xs text-slate-500 font-medium">
                Monitor upcoming league fixtures and book match slots from this unified panel.
              </p>
            </div>
          </div>

          {/* Unified Filters for the List */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Manager Filter Toggle (Only visible for managers) */}
            {currentUser.role === 'MANAGER' && (
              <button
                onClick={() => setFilterManagerOnly(!filterManagerOnly)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  filterManagerOnly
                    ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {filterManagerOnly ? 'Showing My Team Only' : 'Show All Club Teams'}
              </button>
            )}

            {/* Pitch Format Filter */}
            <div className="flex items-center space-x-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Format:</span>
              <select
                value={fixturePitchFilter}
                onChange={(e) => setFixturePitchFilter(e.target.value)}
                className="bg-slate-50 border-2 border-slate-200 rounded-lg py-1 px-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-900"
              >
                <option value="ALL">All Formats</option>
                {pitchConfigs.map(p => (
                  <option key={p.id} value={p.id}>{p.id}</option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div className="flex items-center space-x-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Date:</span>
              <select
                value={fixtureDateFilter}
                onChange={(e) => setFixtureDateFilter(e.target.value)}
                className="bg-slate-50 border-2 border-slate-200 rounded-lg py-1 px-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-900"
              >
                <option value="ALL">All Dates</option>
                {uniqueDates.map(date => (
                  <option key={date} value={date}>
                    {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Unified Table display */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          {unifiedList.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-white font-medium text-xs">
              No league fixtures or bookings found matching the active filter criteria.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 bg-white text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-5 py-3.5 font-black text-slate-700">Fixture / Match Details</th>
                  <th className="px-5 py-3.5 font-black text-slate-700">Competition</th>
                  <th className="px-5 py-3.5 font-black text-slate-700 text-center w-24">Format</th>
                  <th className="px-5 py-3.5 font-black text-slate-700 w-44">Date & Time</th>
                  <th className="px-5 py-3.5 font-black text-slate-700 w-40">Booking Status</th>
                  <th className="px-5 py-3.5 font-black text-slate-700 text-right w-40">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unifiedList.map((item) => {
                  const isBooked = !!item.booking && item.booking.status !== BookingStatus.UNBOOKED;
                  const isUnbooked = item.booking?.status === BookingStatus.UNBOOKED;
                  const bookingStatus = item.booking?.status;
                  const formattedDate = new Date(item.date).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });

                  return (
                    <tr
                      key={`${item.type}-${item.id}`}
                      className={`hover:bg-slate-50/40 transition-colors ${
                        isBooked
                          ? bookingStatus === BookingStatus.APPROVED
                            ? 'bg-emerald-50/15'
                            : 'bg-amber-50/15'
                          : isUnbooked
                          ? 'bg-rose-50/20'
                          : ''
                      }`}
                    >
                      {/* Fixture Details */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <div className="font-extrabold text-slate-900 text-sm">{item.title}</div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                              item.type === 'FA_FIXTURE'
                                ? 'bg-blue-50 text-blue-900 border border-blue-100'
                                : 'bg-indigo-50 text-indigo-900 border border-indigo-100'
                            }`}>
                              {item.type === 'FA_FIXTURE' ? 'FA Full-Time' : 'Custom Session'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Competition */}
                      <td className="px-5 py-4 text-slate-600 font-semibold">
                        {item.competition}
                      </td>

                      {/* Format */}
                      <td className="px-5 py-4 text-center">
                        <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-700 px-2.5 py-1 rounded">
                          {item.pitchId}
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td className="px-5 py-4 whitespace-nowrap text-slate-600 font-bold">
                        <div className="font-extrabold text-slate-800">{formattedDate}</div>
                        <div className="text-[11px] text-slate-500 font-medium font-mono mt-0.5">{item.timeSlot}</div>
                      </td>

                      {/* Booking Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {isBooked ? (
                          bookingStatus === BookingStatus.APPROVED ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                              Pitch Booked
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
                              <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-500" />
                              Approval Pending
                            </span>
                          )
                        ) : isUnbooked ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-50 text-rose-800 border border-rose-200 animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5 mr-1 text-rose-500" />
                            Pitch Unbooked
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-red-50 text-red-800 border border-red-200">
                            <AlertCircle className="w-3.5 h-3.5 mr-1 text-red-500" />
                            No Pitch Booked
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        {!isBooked ? (
                          <div className="flex items-center justify-end space-x-2">
                            {item.booking?.status === BookingStatus.UNBOOKED && (
                              <button
                                onClick={() => {
                                  onCancelBooking(item.booking!.id);
                                }}
                                className="bg-red-50 hover:bg-red-105 text-red-700 text-xs font-bold py-1.5 px-3 rounded-lg border border-red-200 transition-colors bg-white shadow-sm"
                              >
                                Delete Fixture
                              </button>
                            )}
                            <button
                              onClick={() => {
                                const defaultNotes = item.type === 'FA_FIXTURE'
                                  ? `[FA Full-Time Match] ${item.competition}: ${item.title}`
                                  : item.booking?.notes || '';
                                onRequestBooking(
                                  item.pitchId,
                                  item.timeSlot,
                                  defaultNotes,
                                  item.date,
                                  item.booking?.id
                                );
                              }}
                              className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm transition-colors"
                            >
                              {item.booking?.status === BookingStatus.UNBOOKED ? 'Rearrange / Book' : 'Book Pitch Now'}
                            </button>
                          </div>
                        ) : (
                          (currentUser.role === 'ADMIN' || canManagerUnbook(currentUser, item.booking!)) && (
                            confirmUnbookFixtureId === item.booking!.id ? (
                              <div className="flex items-center space-x-1.5 justify-end">
                                <span className="text-[10px] font-bold text-red-700 uppercase">Confirm?</span>
                                <button
                                  onClick={() => {
                                    onCancelBooking(item.booking!.id);
                                    setConfirmUnbookFixtureId(null);
                                  }}
                                  className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm transition-colors"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => setConfirmUnbookFixtureId(null)}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm transition-colors"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmUnbookFixtureId(item.booking!.id)}
                                className="text-red-600 hover:bg-red-50 text-xs font-bold py-1.5 px-3 rounded-lg border border-red-100 transition-colors bg-white"
                              >
                                Unbook Pitch
                              </button>
                            )
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
