/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
  const [filterManagerOnly, setFilterManagerOnly] = useState<boolean>(currentUser.role === 'MANAGER');
  const [fixturePitchFilter, setFixturePitchFilter] = useState<string>('ALL');
  const [fixtureDateFilter, setFixtureDateFilter] = useState<string>('ALL');

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
  // This gathers standard slots AND any custom booking requested/approved on that date
  const allDateSlots = Array.from(new Set([
    ...pitchConfigs.flatMap(p => p.defaultSlots),
    ...bookings.filter(b => b.date === selectedDate && b.status !== BookingStatus.DECLINED).map(b => b.timeSlot)
  ])).sort((a, b) => a.localeCompare(b));

  // 2. Build Unified Team Fixtures & Bookings List underneath
  // Filter FA full time fixtures matching criteria
  const filteredFAFixtures = MOCK_FA_FULLTIME_FIXTURES.filter((f) => {
    if (filterManagerOnly && !isTeamMatch(currentUser.teamName, f.scotterTeam)) {
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

  // Filter other non-FA manual bookings matching criteria
  const manualBookings = bookings.filter((b) => {
    if (b.status === BookingStatus.DECLINED) return false;
    if (filterManagerOnly && b.managerId !== currentUser.id && !isTeamMatch(currentUser.teamName, b.teamName)) {
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
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 border-collapse">
            <thead className="bg-slate-100/85">
              <tr>
                <th className="px-5 py-4 text-center text-xs font-bold text-blue-950 uppercase tracking-wider border-r border-slate-200 w-36">
                  KO Time Slot
                </th>
                {pitchConfigs.map((pitch) => (
                  <th key={pitch.id} className="px-6 py-4 text-center text-xs font-black text-blue-950 uppercase tracking-wider min-w-[240px]">
                    <div className="font-extrabold text-blue-900">{pitch.name}</div>
                    <div className="text-[9px] text-slate-400 font-bold mt-0.5 tracking-widest">{pitch.id} Pitch Format</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {allDateSlots.length === 0 ? (
                <tr>
                  <td colSpan={pitchConfigs.length + 1} className="py-12 text-center text-slate-400 font-semibold text-xs">
                    No kickoff slots available or configured for this day.
                  </td>
                </tr>
              ) : (
                allDateSlots.map((slot) => (
                  <tr key={slot} className="hover:bg-slate-50/45 transition-colors">
                    {/* Time Slot Column (Left) */}
                    <td className="px-5 py-6 whitespace-nowrap font-extrabold text-blue-900 bg-slate-50/50 border-r border-slate-200 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Clock className="w-4 h-4 text-blue-900/50" />
                        <span className="text-base tracking-tight font-black">{slot}</span>
                      </div>
                    </td>

                    {/* Pitches (Right Columns) */}
                    {pitchConfigs.map((pitch) => {
                      const isDefaultSlot = pitch.defaultSlots.includes(slot);
                      const booking = bookings.find(
                        (b) => b.pitchId === pitch.id && b.date === selectedDate && b.timeSlot === slot
                      );

                      return (
                        <td key={pitch.id} className="px-4 py-3 border-l border-slate-100 text-center align-middle">
                          {booking && booking.status !== BookingStatus.DECLINED && booking.status !== BookingStatus.UNBOOKED ? (
                            // Booked Slot representation
                            (() => {
                              const tooltipText = [
                                `Team: ${booking.teamName}`,
                                `Booked by: ${booking.managerName}`,
                                `Status: ${booking.status === BookingStatus.APPROVED ? 'Approved' : 'Pending Approval'}`,
                                `Submitted: ${new Date(booking.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at ${new Date(booking.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
                                booking.notes ? `Notes: "${booking.notes}"` : ''
                              ].filter(Boolean).join('\n');

                              return (
                                <div 
                                  className={`p-4 rounded-xl border text-left space-y-2.5 transition-all shadow-sm cursor-help ${
                                    booking.status === BookingStatus.APPROVED
                                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 shadow-emerald-50/50 hover:bg-emerald-100/90'
                                      : 'bg-amber-50/80 border-amber-200 text-amber-950 shadow-amber-50/50 hover:bg-amber-100/90'
                                  }`}
                                  title={tooltipText}
                                >
                                  <div className="flex justify-between items-start gap-2">
                                    <div>
                                      <div className="flex items-center space-x-1">
                                        <p className="text-xs font-black leading-snug">{booking.teamName}</p>
                                        <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 flex-shrink-0" />
                                      </div>
                                      <p className="text-[9px] text-slate-500 font-extrabold mt-0.5 uppercase tracking-wide">Booked by: {booking.managerName}</p>
                                    </div>
                                    {booking.status === BookingStatus.APPROVED ? (
                                      <span className="inline-flex items-center text-[8px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                        Approved
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center text-[8px] bg-amber-100 text-amber-800 font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                        Pending
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex justify-end pt-1 gap-1.5">
                                    {/* Actions for Admins */}
                                    {currentUser.role === 'ADMIN' && (
                                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                        {booking.status === BookingStatus.PENDING ? (
                                          <>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); onApproveBooking(booking.id); }}
                                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1 px-2.5 rounded-md shadow-sm transition-colors"
                                            >
                                              Approve
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setDecliningId(booking.id);
                                                setDeclineReason('');
                                              }}
                                              className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold py-1 px-2.5 rounded-md shadow-sm transition-colors"
                                            >
                                              Decline
                                            </button>
                                          </>
                                        ) : (
                                          confirmCancelBookingId === booking.id ? (
                                            <div className="flex items-center space-x-1 bg-red-100 border border-red-200 p-1 rounded">
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
                                              className="text-red-700 hover:bg-red-50 text-[10px] font-bold py-1 px-2.5 rounded-md border border-red-200 transition-colors bg-white"
                                            >
                                              Cancel
                                            </button>
                                          )
                                        )}
                                      </div>
                                    )}

                                    {/* Cancel for the requesting manager */}
                                    {currentUser.role === 'MANAGER' && canManagerUnbook(currentUser, booking) && (
                                      confirmCancelBookingId === booking.id ? (
                                        <div className="flex items-center space-x-1 bg-red-100 border border-red-200 p-1 rounded" onClick={(e) => e.stopPropagation()}>
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
                                          className="text-red-600 hover:bg-red-50 text-[10px] font-extrabold py-1 px-2.5 rounded-md border border-red-200 transition-colors bg-white"
                                        >
                                          Cancel Request
                                        </button>
                                      )
                                    )}
                                  </div>

                                  {/* Decline input inside cell */}
                                  {decliningId === booking.id && (
                                    <div className="mt-2 pt-2 border-t border-slate-200/50 text-left" onClick={(e) => e.stopPropagation()}>
                                      <label className="block text-[9px] font-bold text-slate-700 uppercase mb-1">
                                        Decline Reason
                                      </label>
                                      <textarea
                                        value={declineReason}
                                        onChange={(e) => setDeclineReason(e.target.value)}
                                        placeholder="Provide justification..."
                                        rows={1.5}
                                        className="w-full text-xs p-1.5 border border-slate-300 rounded focus:border-red-600 focus:outline-none bg-white font-medium text-slate-800"
                                        required
                                      />
                                      <div className="flex space-x-1.5 mt-1.5 justify-end">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setDecliningId(null); }}
                                          className="text-slate-500 hover:bg-slate-100 text-[9px] font-bold py-0.5 px-2 rounded"
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
                                          className="bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold py-0.5 px-2 rounded shadow-sm"
                                        >
                                          Submit
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()
                          ) : (
                            // Empty Vacant Slot representation
                            <div className="flex flex-col items-center justify-center py-4 bg-slate-50/30 rounded-xl border border-dashed border-slate-100 hover:border-slate-300 hover:bg-slate-50/80 transition-all">
                              <span className="text-[10px] text-slate-400 font-extrabold block mb-1.5 uppercase">
                                {isDefaultSlot ? 'Vacant' : 'Custom KO'}
                              </span>
                              {currentUser.role === 'MANAGER' ? (
                                <button
                                  onClick={() => onRequestBooking(pitch.id, slot)}
                                  className="bg-blue-900/10 hover:bg-blue-900 text-blue-900 hover:text-white text-[10px] font-bold py-1 px-2.5 rounded-lg transition-all flex items-center space-x-1"
                                >
                                  <PlusCircle className="w-3.5 h-3.5" />
                                  <span>Request Slot</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => onRequestBooking(pitch.id, slot)}
                                  className="border border-dashed border-blue-900/40 text-blue-900 hover:bg-blue-50 text-[10px] font-bold py-1 px-2.5 rounded-lg transition-all flex items-center space-x-1"
                                >
                                  <PlusCircle className="w-3.5 h-3.5" />
                                  <span>Admin Book</span>
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-105 text-emerald-800">
                              <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                              Pitch Booked
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-105 text-amber-800 animate-pulse">
                              <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-500" />
                              Approval Pending
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-red-105 text-red-800">
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
