/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Calendar, Clock, MapPin, Clipboard, FileText, AlertTriangle } from 'lucide-react';
import { PitchSize, Booking, BookingStatus, User } from '../types';
import { SCOTTER_TEAMS, FAFixture } from '../mockData';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    pitchId: PitchSize;
    date: string;
    timeSlot: string;
    notes: string;
    teamName?: string;
    endTime?: string;
    bookingType?: 'STANDARD' | 'MATCH';
  }) => void;
  selectedPitchId?: PitchSize;
  selectedDate?: string;
  selectedSlot?: string;
  selectedNotes?: string;
  selectedBookingId?: string;
  pitches: Array<{ id: PitchSize; name: string; defaultSlots: string[] }>;
  existingBookings: Booking[];
  currentUser: User;
  faFixtures?: FAFixture[];
}

export default function BookingModal({
  isOpen,
  onClose,
  onSubmit,
  selectedPitchId = '7v7',
  selectedDate = '',
  selectedSlot = '',
  selectedNotes = '',
  selectedBookingId,
  pitches,
  existingBookings,
  currentUser,
  faFixtures,
}: BookingModalProps) {
  const [pitchId, setPitchId] = useState<PitchSize>(selectedPitchId);
  const [date, setDate] = useState<string>(selectedDate);
  const [timeSlot, setTimeSlot] = useState<string>(selectedSlot);
  const [endTime, setEndTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [adminSelectedTeam, setAdminSelectedTeam] = useState<string>('');
  const [isCustomTime, setIsCustomTime] = useState<boolean>(false);
  const [bookingType, setBookingType] = useState<'STANDARD' | 'MATCH'>('STANDARD');
  const [confirmDoubleBooking, setConfirmDoubleBooking] = useState<boolean>(false);
  const [confirmNoticeWarning, setConfirmNoticeWarning] = useState<boolean>(false);

  const parseTimeToMinutes = (t: string): number => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Helper to determine the standard end time for a given slot, date, and pitch format
  const getEndTimeForSlot = (pId: PitchSize, dateStr: string, slot: string, type: 'STANDARD' | 'MATCH' = bookingType): string => {
    if (!slot) return '';
    const [hStr, mStr] = slot.split(':');
    const hNum = parseInt(hStr, 10);
    const mNum = parseInt(mStr, 10);
    if (isNaN(hNum) || isNaN(mNum)) return '';

    // Default weekday durations: Standard is 60m, Match is 75m
    let duration = type === 'MATCH' ? 75 : 60;

    if (dateStr) {
      const d = new Date(dateStr);
      const day = d.getDay();
      const isWeekend = day === 0 || day === 6;
      if (isWeekend) {
        if (pId === '11v11') {
          duration = 120;
        } else if (pId === '9v9') {
          duration = 90;
        } else if (pId === '7v7') {
          duration = 75;
        } else if (pId === '5v5') {
          duration = 60;
        }
      }
    }

    const totalMinutes = hNum * 60 + mNum + duration;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isOpen) {
      setConfirmDoubleBooking(false);
      setConfirmNoticeWarning(false);
      if (selectedBookingId) {
        const existing = existingBookings.find((b) => b.id === selectedBookingId);
        if (existing) {
          setPitchId(existing.pitchId);
          setDate(existing.date);
          const pitchSlots = pitches.find((p) => p.id === existing.pitchId)?.defaultSlots || [];
          const isCustom = existing.timeSlot && !pitchSlots.includes(existing.timeSlot);
          setIsCustomTime(!!isCustom);
          setTimeSlot(existing.timeSlot);
          
          let extType: 'STANDARD' | 'MATCH' = 'STANDARD';
          if (existing.bookingType) {
            extType = existing.bookingType;
          } else if (existing.endTime && existing.timeSlot) {
            const diff = parseTimeToMinutes(existing.endTime) - parseTimeToMinutes(existing.timeSlot);
            if (diff === 75) {
              extType = 'MATCH';
            }
          }
          setBookingType(extType);
          setEndTime(existing.endTime || getEndTimeForSlot(existing.pitchId, existing.date, existing.timeSlot, extType));
          setNotes(existing.notes);
          setError('');
          setAdminSelectedTeam(existing.teamName);
          return;
        }
      }

      setPitchId(selectedPitchId);
      setDate(selectedDate || new Date().toISOString().split('T')[0]);
      
      const pitchSlots = pitches.find((p) => p.id === selectedPitchId)?.defaultSlots || [];
      const isCustom = selectedSlot && !pitchSlots.includes(selectedSlot);
      setIsCustomTime(!!isCustom);

      const resolvedSlot = selectedSlot || pitchSlots[0] || '09:30';
      setTimeSlot(resolvedSlot);
      setBookingType('STANDARD');
      setEndTime(getEndTimeForSlot(selectedPitchId, selectedDate || new Date().toISOString().split('T')[0], resolvedSlot, 'STANDARD'));
      setNotes(selectedNotes);
      setError('');
      
      // Auto pre-select team matching pitch size format
      const defaultTeam = SCOTTER_TEAMS.find((t) => t.pitchSize === selectedPitchId)?.name || SCOTTER_TEAMS[0].name;
      setAdminSelectedTeam(defaultTeam);
    }
  }, [isOpen, selectedPitchId, selectedDate, selectedSlot, selectedNotes, selectedBookingId, pitches, existingBookings]);

  // Keep standard slot endTime in sync
  useEffect(() => {
    if (!isCustomTime && date && timeSlot) {
      setEndTime(getEndTimeForSlot(pitchId, date, timeSlot, bookingType));
    }
  }, [isCustomTime, pitchId, date, timeSlot, bookingType]);

  if (!isOpen) return null;

  // Selected pitch's configured slots dynamically based on the selected date and format (filtering out occupied ones)
  const slotsAvailable = (() => {
    if (!date) return ['09:30', '10:45', '12:00'];
    const d = new Date(date);
    const day = d.getDay();
    const isWeekend = day === 0 || day === 6;
    let baseSlots: string[] = [];
    if (isWeekend) {
      if (pitchId === '11v11') {
        baseSlots = ['10:00', '12:00'];
      } else {
        baseSlots = ['09:30', '10:45', '12:00'];
      }
    } else {
      baseSlots = [
        '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
        '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
      ];
    }

    return baseSlots.filter((slot) => {
      const slotStart = parseTimeToMinutes(slot);
      const slotEnd = parseTimeToMinutes(getEndTimeForSlot(pitchId, date, slot, bookingType));

      let hasClash = existingBookings.some((b) => {
        if (b.id === selectedBookingId || b.date !== date) return false;
        
        const pitchMatches = b.pitchId === pitchId || 
          ((pitchId === '5v5' && b.pitchId === '11v11') || (pitchId === '11v11' && b.pitchId === '5v5'));
          
        if (!pitchMatches) return false;
        if (b.status === BookingStatus.DECLINED || b.status === BookingStatus.UNBOOKED) return false;

        const bStart = parseTimeToMinutes(b.timeSlot);
        const bEnd = parseTimeToMinutes(b.endTime || getEndTimeForSlot(b.pitchId, b.date, b.timeSlot));

        return slotStart < bEnd && bStart < slotEnd;
      });

      if (!hasClash && faFixtures) {
        hasClash = faFixtures.some((f) => {
          if (f.date !== date) return false;
          
          const pitchMatches = f.pitchId === pitchId || 
            ((pitchId === '5v5' && f.pitchId === '11v11') || (pitchId === '11v11' && f.pitchId === '5v5'));
          if (!pitchMatches) return false;

          const associatedBooking = existingBookings.find(
            b => b.pitchId === f.pitchId && b.date === f.date && b.timeSlot === f.timeSlot
          );
          if (associatedBooking && (associatedBooking.status === BookingStatus.DECLINED || associatedBooking.status === BookingStatus.UNBOOKED)) {
            return false;
          }

          const fStart = parseTimeToMinutes(f.timeSlot);
          const fEnd = parseTimeToMinutes(getEndTimeForSlot(f.pitchId, f.date, f.timeSlot, 'MATCH'));

          return slotStart < fEnd && fStart < slotEnd;
        });
      }

      return !hasClash;
    });
  })();

  const handlePitchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value as PitchSize;
    setPitchId(selected);
    
    // Determine slots available for the new pitch format (filtering out occupied ones)
    const tempSlotsAvailable = (() => {
      if (!date) return ['09:30', '10:45', '12:00'];
      const d = new Date(date);
      const day = d.getDay();
      const isWeekend = day === 0 || day === 6;
      let baseSlots: string[] = [];
      if (isWeekend) {
        if (selected === '11v11') {
          baseSlots = ['10:00', '12:00'];
        } else {
          baseSlots = ['09:30', '10:45', '12:00'];
        }
      } else {
        baseSlots = [
          '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
          '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
        ];
      }

      return baseSlots.filter((slot) => {
        const slotStart = parseTimeToMinutes(slot);
        const slotEnd = parseTimeToMinutes(getEndTimeForSlot(selected, date, slot, bookingType));

        let hasClash = existingBookings.some((b) => {
          if (b.id === selectedBookingId || b.date !== date) return false;
          
          const pitchMatches = b.pitchId === selected || 
            ((selected === '5v5' && b.pitchId === '11v11') || (selected === '11v11' && b.pitchId === '5v5'));
            
          if (!pitchMatches) return false;
          if (b.status === BookingStatus.DECLINED || b.status === BookingStatus.UNBOOKED) return false;

          const bStart = parseTimeToMinutes(b.timeSlot);
          const bEnd = parseTimeToMinutes(b.endTime || getEndTimeForSlot(b.pitchId, b.date, b.timeSlot));

          return slotStart < bEnd && bStart < slotEnd;
        });

        if (!hasClash && faFixtures) {
          hasClash = faFixtures.some((f) => {
            if (f.date !== date) return false;
            
            const pitchMatches = f.pitchId === selected || 
              ((selected === '5v5' && f.pitchId === '11v11') || (selected === '11v11' && f.pitchId === '5v5'));
            if (!pitchMatches) return false;

            const associatedBooking = existingBookings.find(
              b => b.pitchId === f.pitchId && b.date === f.date && b.timeSlot === f.timeSlot
            );
            if (associatedBooking && (associatedBooking.status === BookingStatus.DECLINED || associatedBooking.status === BookingStatus.UNBOOKED)) {
              return false;
            }

            const fStart = parseTimeToMinutes(f.timeSlot);
            const fEnd = parseTimeToMinutes(getEndTimeForSlot(f.pitchId, f.date, f.timeSlot, 'MATCH'));

            return slotStart < fEnd && fStart < slotEnd;
          });
        }

        return !hasClash;
      });
    })();
    const firstSlot = tempSlotsAvailable[0] || '';
    
    if (!isCustomTime) {
      setTimeSlot(firstSlot);
      setEndTime(getEndTimeForSlot(selected, date, firstSlot));
    }

    // Auto-update default team to fit this pitch size
    const matchingTeam = SCOTTER_TEAMS.find((t) => t.pitchSize === selected);
    if (matchingTeam) {
      setAdminSelectedTeam(matchingTeam.name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!date) {
      setError('Please select a booking date.');
      return;
    }
    if (!timeSlot) {
      setError('Please select or specify a kick-off time slot.');
      return;
    }
    if (!endTime) {
      setError('Please specify a finish time.');
      return;
    }

    // Validate 24-hour format HH:MM if custom time is requested
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeSlot)) {
      setError('Please enter a valid 24-hour start time format (e.g. 10:30 or 14:15).');
      return;
    }
    if (!timeRegex.test(endTime)) {
      setError('Please enter a valid 24-hour finish time format (e.g. 11:45 or 16:00).');
      return;
    }

    const parseTimeToMinutes = (t: string): number => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const startMins = parseTimeToMinutes(timeSlot);
    const endMins = parseTimeToMinutes(endTime);

    if (endMins <= startMins) {
      setError('Finish time must be after start time.');
      return;
    }

    const now = new Date();
    const slotDateTime = new Date(`${date}T${timeSlot}`);
    if (isNaN(slotDateTime.getTime())) {
      setError('Please provide a valid date and time slot.');
      return;
    }
    if (slotDateTime < now) {
      setError('Cannot book a slot in the past. Please select a future date and time.');
      return;
    }

    const diffMs = slotDateTime.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const isShortNotice = currentUser.role === 'MANAGER' && diffHours > 0 && diffHours < 24;

    if (isShortNotice && !confirmNoticeWarning) {
      setError('Warning: You are requesting this slot with less than 24 hours notice. You need to ask a member of the exec team to approve it. Please check the confirmation box below to submit.');
      return;
    }

    // Check if there's already an approved or pending booking for this pitch, date, and slot
    const clash = existingBookings.find((b) => {
      if (b.id === selectedBookingId || b.date !== date) return false;
      
      const pitchMatches = b.pitchId === pitchId || 
        ((pitchId === '5v5' && b.pitchId === '11v11') || (pitchId === '11v11' && b.pitchId === '5v5'));
        
      if (!pitchMatches) return false;
      if (b.status === BookingStatus.DECLINED || b.status === BookingStatus.UNBOOKED) return false;

      const bStart = parseTimeToMinutes(b.timeSlot);
      const bEnd = parseTimeToMinutes(b.endTime || getEndTimeForSlot(b.pitchId, b.date, b.timeSlot));

      return startMins < bEnd && bStart < endMins;
    });

    if (clash) {
      const statusText = clash.status === BookingStatus.APPROVED ? 'already booked' : 'currently requested';
      setError(
        `This slot overlaps with a session ${statusText} by ${clash.teamName} (${clash.managerName}) from ${clash.timeSlot} to ${clash.endTime || getEndTimeForSlot(clash.pitchId, clash.date, clash.timeSlot)}. Please select another time or pitch.`
      );
      return;
    }

    if (faFixtures) {
      const clashFixture = faFixtures.find((f) => {
        if (f.date !== date) return false;
        
        const pitchMatches = f.pitchId === pitchId || 
          ((pitchId === '5v5' && f.pitchId === '11v11') || (pitchId === '11v11' && f.pitchId === '5v5'));
        if (!pitchMatches) return false;

        const associatedBooking = existingBookings.find(
          b => b.pitchId === f.pitchId && b.date === f.date && b.timeSlot === f.timeSlot
        );
        if (associatedBooking && (associatedBooking.status === BookingStatus.DECLINED || associatedBooking.status === BookingStatus.UNBOOKED)) {
          return false;
        }

        const fStart = parseTimeToMinutes(f.timeSlot);
        const fEnd = parseTimeToMinutes(getEndTimeForSlot(f.pitchId, f.date, f.timeSlot, 'MATCH'));

        return startMins < fEnd && fStart < endMins;
      });

      if (clashFixture) {
        setError(
          `This slot overlaps with a scheduled FA fixture: ${clashFixture.homeTeam} vs ${clashFixture.awayTeam} on the ${clashFixture.pitchId} pitch at ${clashFixture.timeSlot}. Please select another time or pitch.`
        );
        return;
      }
    }

    // Raise an issue if same team already booked on same date
    const teamToCheck = currentUser.role === 'ADMIN' ? adminSelectedTeam : currentUser.teamName;
    const hasExistingBookingOnSameDate = !!(date && teamToCheck && existingBookings.some((b) => {
      if (b.id === selectedBookingId || b.date !== date) return false;
      if (b.status === BookingStatus.DECLINED || b.status === BookingStatus.UNBOOKED) return false;
      return b.teamName === teamToCheck;
    }));

    if (hasExistingBookingOnSameDate && !confirmDoubleBooking) {
      setError(`Warning: This team (${teamToCheck}) already has another active booking on this date (${date}). Please check the confirmation box below if you definitely want to do this.`);
      return;
    }

    onSubmit({
      pitchId,
      date,
      timeSlot,
      endTime,
      bookingType,
      notes,
      teamName: currentUser.role === 'ADMIN' ? adminSelectedTeam : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl border-t-4 border-blue-900 max-w-lg w-full overflow-hidden"
      >
        {/* Modal Header */}
        <div className="bg-blue-900 px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-200" />
            <h3 className="text-lg font-bold">
              {selectedBookingId ? "Reschedule / Re-book Pitch" : "Request Pitch Booking"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-200 transition-colors focus:outline-none p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Manager / Team Context Section */}
          {currentUser.role === 'ADMIN' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Booking For Team
              </label>
              <select
                value={adminSelectedTeam}
                onChange={(e) => setAdminSelectedTeam(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg py-2.5 px-3 text-slate-800 font-semibold focus:border-blue-900 focus:outline-none"
                required
              >
                {Array.from(new Set(SCOTTER_TEAMS.map((t) => t.category))).map((cat) => (
                  <optgroup key={cat} label={`${cat} Section`} className="bg-white text-blue-900 font-bold">
                    {SCOTTER_TEAMS.filter((t) => t.category === cat).map((t) => (
                      <option key={t.name} value={t.name} className="text-slate-800 font-medium">
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-center space-x-3">
              <div className="bg-blue-900 text-white rounded-full p-2">
                <Clipboard className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Booking For Team</p>
                <p className="text-sm font-bold text-blue-900">
                  {currentUser.teamName} <span className="font-normal text-slate-600">({currentUser.name})</span>
                </p>
              </div>
            </div>
          )}

          {/* Pitch Size Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Pitch Size
            </label>
            <div className="relative">
              <select
                value={pitchId}
                onChange={handlePitchChange}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg py-2.5 px-3 text-slate-800 font-semibold focus:border-blue-900 focus:outline-none focus:ring-0 transition-colors"
              >
                {pitches.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Booking Type Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Booking Type / Format
            </label>
            <div className="relative">
              <select
                value={bookingType}
                onChange={(e) => {
                  const nextType = e.target.value as 'STANDARD' | 'MATCH';
                  setBookingType(nextType);
                  if (!isCustomTime && date && timeSlot) {
                    setEndTime(getEndTimeForSlot(pitchId, date, timeSlot, nextType));
                  } else if (isCustomTime && date && timeSlot) {
                    const duration = nextType === 'MATCH' ? 75 : 60;
                    const [hStr, mStr] = timeSlot.split(':');
                    if (hStr && mStr) {
                      const mins = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + duration;
                      const h = Math.floor(mins / 60);
                      const m = mins % 60;
                      setEndTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
                    }
                  }
                }}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg py-2.5 px-3 text-slate-800 font-semibold focus:border-blue-900 focus:outline-none focus:ring-0 transition-colors"
              >
                <option value="STANDARD">Standard Slot (1 Hour)</option>
                <option value="MATCH">Match / Friendly (1 Hour 15 Mins)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Booking Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:border-blue-900 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Timing Select / Inputs */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Booking Timing</span>
                <button
                  type="button"
                  onClick={() => {
                    const nextCustom = !isCustomTime;
                    setIsCustomTime(nextCustom);
                    if (nextCustom) {
                      setTimeSlot(timeSlot || '10:00');
                      setEndTime(endTime || '11:00');
                    } else {
                      const firstS = slotsAvailable[0] || '09:30';
                      setTimeSlot(firstS);
                      setEndTime(getEndTimeForSlot(pitchId, date, firstS));
                    }
                  }}
                  className="text-[10px] text-blue-700 hover:underline font-extrabold focus:outline-none"
                >
                  {isCustomTime ? "Use Standard Slots" : "Request Custom Time"}
                </button>
              </label>

              {isCustomTime ? (
                <div className="space-y-2.5">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Start Time (HH:MM)</span>
                    <input
                      type="text"
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      placeholder="e.g. 11:15"
                      maxLength={5}
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-semibold focus:border-blue-900 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Finish Time (HH:MM)</span>
                    <input
                      type="text"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      placeholder="e.g. 12:45"
                      maxLength={5}
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-semibold focus:border-blue-900 focus:outline-none"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={timeSlot}
                    onChange={(e) => {
                      const selectedSlot = e.target.value;
                      setTimeSlot(selectedSlot);
                      setEndTime(getEndTimeForSlot(pitchId, date, selectedSlot));
                    }}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg py-2.5 px-3 text-slate-800 font-semibold focus:border-blue-900 focus:outline-none"
                    required
                  >
                    <option value="">-- Select Time Slot --</option>
                    {slotsAvailable.map((slot) => {
                      const computedEnd = getEndTimeForSlot(pitchId, date, slot);
                      return (
                        <option key={slot} value={slot}>
                          {slot} to {computedEnd}
                        </option>
                      );
                    })}
                  </select>
                  {timeSlot && endTime && (
                    <div className="text-[11px] text-slate-500 font-semibold bg-slate-50 border border-slate-100 rounded-lg p-2 flex items-center justify-between">
                      <span>Configured Period:</span>
                      <strong className="text-blue-900">{timeSlot} - {endTime}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notes Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Fixture Notes & Details</span>
              <span className="text-[10px] text-slate-400 font-normal capitalize">Optional but recommended</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Opposition name, cup vs friendly, special setup requests, referee details"
              rows={3}
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg p-3 text-slate-700 text-sm focus:border-blue-900 focus:outline-none transition-colors placeholder:text-slate-400"
            />
          </div>

          {/* Short Notice Warning */}
          {(() => {
            if (currentUser.role !== 'MANAGER' || !date || !timeSlot) return null;
            const now = new Date();
            const slotDateTime = new Date(`${date}T${timeSlot}`);
            if (isNaN(slotDateTime.getTime())) return null;
            const diffMs = slotDateTime.getTime() - now.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            const isShortNotice = diffHours > 0 && diffHours < 24;

            if (!isShortNotice) return null;

            return (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 space-y-2.5">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4.5 h-4.5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">Short Notice Booking Request</h4>
                    <p className="text-[11px] text-amber-700 leading-normal mt-0.5">
                      You are requesting a slot with less than 24 hours notice. Under club guidelines, you must contact a member of the executive team directly to obtain approval for this booking.
                    </p>
                  </div>
                </div>
                <label className="flex items-center space-x-2.5 font-bold text-xs text-amber-950 mt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmNoticeWarning}
                    onChange={(e) => setConfirmNoticeWarning(e.target.checked)}
                    className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                  />
                  <span>I understand and will ask a member of the exec team to approve this</span>
                </label>
              </div>
            );
          })()}

          {/* Double Booking Warning Checklist */}
          {(() => {
            const teamToCheck = currentUser.role === 'ADMIN' ? adminSelectedTeam : currentUser.teamName;
            const hasExistingBookingOnSameDate = !!(date && teamToCheck && existingBookings.some((b) => {
              if (b.id === selectedBookingId || b.date !== date) return false;
              if (b.status === BookingStatus.DECLINED || b.status === BookingStatus.UNBOOKED) return false;
              return b.teamName === teamToCheck;
            }));

            if (!hasExistingBookingOnSameDate) return null;

            return (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 space-y-2.5">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4.5 h-4.5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">Double Booking Notice</h4>
                    <p className="text-[11px] text-amber-700 leading-normal mt-0.5">
                      <strong>{teamToCheck}</strong> is already scheduled for a match or session on <strong>{date}</strong>. Please check the box below if you definitely want to schedule another booking on this date.
                    </p>
                  </div>
                </div>
                <label className="flex items-center space-x-2.5 font-bold text-xs text-amber-950 mt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmDoubleBooking}
                    onChange={(e) => setConfirmDoubleBooking(e.target.checked)}
                    className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                  />
                  <span>Yes, I definitely want to book this additional slot</span>
                </label>
              </div>
            );
          })()}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs font-semibold"
            >
              {error}
            </motion.div>
          )}

          {/* Footer Buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 rounded-lg transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-900 hover:bg-blue-800 text-white font-bold py-2.5 rounded-lg transition-colors text-sm shadow-md"
            >
              {selectedBookingId ? "Confirm Booking" : "Submit Request"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
