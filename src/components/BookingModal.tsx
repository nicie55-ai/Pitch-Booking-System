/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Calendar, Clock, MapPin, Clipboard, FileText } from 'lucide-react';
import { PitchSize, Booking, BookingStatus, User } from '../types';
import { SCOTTER_TEAMS } from '../mockData';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    pitchId: PitchSize;
    date: string;
    timeSlot: string;
    notes: string;
    teamName?: string;
  }) => void;
  selectedPitchId?: PitchSize;
  selectedDate?: string;
  selectedSlot?: string;
  selectedNotes?: string;
  selectedBookingId?: string;
  pitches: Array<{ id: PitchSize; name: string; defaultSlots: string[] }>;
  existingBookings: Booking[];
  currentUser: User;
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
}: BookingModalProps) {
  const [pitchId, setPitchId] = useState<PitchSize>(selectedPitchId);
  const [date, setDate] = useState<string>(selectedDate);
  const [timeSlot, setTimeSlot] = useState<string>(selectedSlot);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [adminSelectedTeam, setAdminSelectedTeam] = useState<string>('');
  const [isCustomTime, setIsCustomTime] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (selectedBookingId) {
        const existing = existingBookings.find((b) => b.id === selectedBookingId);
        if (existing) {
          setPitchId(existing.pitchId);
          setDate(existing.date);
          const pitchSlots = pitches.find((p) => p.id === existing.pitchId)?.defaultSlots || [];
          const isCustom = existing.timeSlot && !pitchSlots.includes(existing.timeSlot);
          setIsCustomTime(!!isCustom);
          setTimeSlot(existing.timeSlot);
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

      setTimeSlot(selectedSlot || pitchSlots[0] || '');
      setNotes(selectedNotes);
      setError('');
      
      // Auto pre-select team matching pitch size format
      const defaultTeam = SCOTTER_TEAMS.find((t) => t.pitchSize === selectedPitchId)?.name || SCOTTER_TEAMS[0].name;
      setAdminSelectedTeam(defaultTeam);
    }
  }, [isOpen, selectedPitchId, selectedDate, selectedSlot, selectedNotes, selectedBookingId, pitches, existingBookings]);

  if (!isOpen) return null;

  // Selected pitch's configured slots
  const activePitch = pitches.find((p) => p.id === pitchId);
  const slotsAvailable = activePitch ? activePitch.defaultSlots : [];

  const handlePitchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value as PitchSize;
    setPitchId(selected);
    const updatedSlots = pitches.find((p) => p.id === selected)?.defaultSlots || [];
    const firstSlot = updatedSlots[0] || '';
    
    if (!isCustomTime) {
      setTimeSlot(firstSlot);
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

    // Validate 24-hour format HH:MM if custom time is requested
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeSlot)) {
      setError('Please enter a valid 24-hour time format (e.g. 10:30 or 14:15).');
      return;
    }

    // Check if there's already an approved or pending booking for this pitch, date, and slot
    const clash = existingBookings.find(
      (b) =>
        b.id !== selectedBookingId &&
        b.pitchId === pitchId &&
        b.date === date &&
        b.timeSlot === timeSlot &&
        b.status !== BookingStatus.DECLINED &&
        b.status !== BookingStatus.UNBOOKED
    );

    if (clash) {
      const statusText = clash.status === BookingStatus.APPROVED ? 'already booked' : 'currently requested';
      setError(
        `This slot is ${statusText} by ${clash.teamName} (${clash.managerName}). Please select another time or pitch.`
      );
      return;
    }

    onSubmit({
      pitchId,
      date,
      timeSlot,
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

            {/* Time Slot Select */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Kick-off Time Slot</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomTime(!isCustomTime);
                    setTimeSlot(!isCustomTime ? '10:00' : (slotsAvailable[0] || ''));
                  }}
                  className="text-[10px] text-blue-700 hover:underline font-extrabold focus:outline-none"
                >
                  {isCustomTime ? "Use Standard Slots" : "Request Custom Time"}
                </button>
              </label>
              {isCustomTime ? (
                <input
                  type="text"
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  placeholder="e.g. 11:15 or 13:30"
                  maxLength={5}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg py-2.5 px-3 text-slate-800 font-semibold focus:border-blue-900 focus:outline-none"
                  required
                />
              ) : (
                <select
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg py-2.5 px-3 text-slate-800 font-semibold focus:border-blue-900 focus:outline-none"
                  required
                >
                  <option value="">-- Select Time Slot --</option>
                  {slotsAvailable.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
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
