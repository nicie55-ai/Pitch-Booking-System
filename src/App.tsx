/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, ClipboardList, Settings, Shield, User, HelpCircle, CheckCircle, Info } from 'lucide-react';

import { Booking, BookingStatus, PitchConfig, PitchSize, SlotChangeRequest, User as UserType } from './types';
import { DEFAULT_PITCH_CONFIGS, INITIAL_BOOKINGS, INITIAL_SLOT_CHANGES, MOCK_USERS } from './mockData';

import Header from './components/Header';
import PitchDiary from './components/PitchDiary';
import RequestManager from './components/RequestManager';
import SlotConfigurator from './components/SlotConfigurator';
import BookingModal from './components/BookingModal';

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

  const [pitchConfigs, setPitchConfigs] = useState<PitchConfig[]>(() => {
    const saved = localStorage.getItem('scotter_jfc_pitch_configs');
    return saved ? JSON.parse(saved) : DEFAULT_PITCH_CONFIGS;
  });

  const [slotChangeRequests, setSlotChangeRequests] = useState<SlotChangeRequest[]>(() => {
    const saved = localStorage.getItem('scotter_jfc_slot_changes');
    const parsed: SlotChangeRequest[] = saved ? JSON.parse(saved) : INITIAL_SLOT_CHANGES;
    return parsed.map(sc => ({
      ...sc,
      teamName: sc.teamName ? sc.teamName.replace('Scotter United ', '') : '',
    }));
  });

  const [currentUser, setCurrentUser] = useState<UserType>(() => {
    const saved = localStorage.getItem('scotter_jfc_current_user');
    // Default to Paul Scholes (U9 Manager) to give a nice interactive starting point
    const parsed: UserType = saved ? JSON.parse(saved) : MOCK_USERS[1];
    if (parsed && parsed.teamName) {
      parsed.teamName = parsed.teamName.replace('Scotter United ', '');
    }
    return parsed;
  });

  // Default Selected Date: Saturday, June 27th, 2026 (populated with mock bookings)
  const [selectedDate, setSelectedDate] = useState('2026-06-27');
  const [activeTab, setActiveTab] = useState<'DIARY' | 'REQUESTS' | 'SLOTS'>('DIARY');

  // Booking Modal States
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [modalPrefills, setModalPrefills] = useState<{
    pitchId?: PitchSize;
    slot?: string;
    notes?: string;
    bookingId?: string;
  }>({});

  // Sync state to LocalStorage
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

  // Handle persona switching
  const handleUserChange = (user: UserType) => {
    setCurrentUser(user);
  };

  // Launch modal pre-filled from specific diary grid slot
  const handleOpenBookingModal = (pitchId: PitchSize, slot: string, notes?: string, date?: string, existingBookingId?: string) => {
    if (date) {
      setSelectedDate(date);
    }
    setModalPrefills({ pitchId, slot, notes, bookingId: existingBookingId });
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
  }) => {
    if (modalPrefills.bookingId) {
      // UPDATE/RE-BOOK EXISTING BOOKING
      setBookings((prev) =>
        prev.map((b) =>
          b.id === modalPrefills.bookingId
            ? {
                ...b,
                pitchId: data.pitchId,
                date: data.date,
                timeSlot: data.timeSlot,
                endTime: data.endTime,
                notes: data.notes,
                status: currentUser.role === 'ADMIN' ? BookingStatus.APPROVED : BookingStatus.PENDING,
              }
            : b
        )
      );
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
      teamName: data.teamName || (currentUser.role === 'ADMIN' ? 'Club Booking' : (currentUser.teamName || 'Club Team')),
      managerName: currentUser.name,
      managerId: currentUser.id,
      notes: data.notes,
      status: currentUser.role === 'ADMIN' ? BookingStatus.APPROVED : BookingStatus.PENDING,
      createdAt: new Date().toISOString(),
    };

    setBookings((prev) => [newBooking, ...prev]);
  };

  // Approve Booking Request
  const handleApproveBooking = (id: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: BookingStatus.APPROVED } : b))
    );
  };

  // Decline Booking Request (with a mandatory reason)
  const handleDeclineBooking = (id: string, reason: string) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, status: BookingStatus.DECLINED, declineReason: reason } : b
      )
    );
  };

  // Cancel Booking or Request
  const handleCancelBooking = (id: string) => {
    setBookings((prev) => {
      const b = prev.find((x) => x.id === id);
      if (!b) return prev;
      
      // If the request was still pending, declined, or already unbooked, we can delete/dismiss it completely
      if (b.status === BookingStatus.PENDING || b.status === BookingStatus.DECLINED || b.status === BookingStatus.UNBOOKED) {
        return prev.filter((x) => x.id !== id);
      }
      
      // Otherwise, mark it as UNBOOKED so it stays in the team fixtures table but frees up the slot on the calendar
      return prev.map((x) => (x.id === id ? { ...x, status: BookingStatus.UNBOOKED } : x));
    });
  };

  // Update or reschedule an existing booking
  const handleUpdateBooking = (id: string, updatedFields: Partial<Booking>) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updatedFields } : b))
    );
  };

  // Add multiple bookings at once (block booking & auto imports)
  const handleAddBookingsBulk = (newBookingsList: Booking[]) => {
    setBookings((prev) => [...newBookingsList, ...prev]);
  };

  // Update Standard Pitch Slots (Admin directly changes slots)
  const handleUpdatePitchSlots = (pitchId: PitchSize, newSlots: string[]) => {
    setPitchConfigs((prev) =>
      prev.map((p) => (p.id === pitchId ? { ...p, defaultSlots: newSlots } : p))
    );
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
  };

  // Approve Slot Change Request (automatically alters the PitchConfig!)
  const handleApproveSlotChange = (id: string) => {
    const req = slotChangeRequests.find((r) => r.id === id);
    if (!req) return;

    // Apply the actual slot modification to the corresponding pitch configuration!
    setPitchConfigs((prev) =>
      prev.map((p) => {
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
      })
    );

    // Update the request status
    setSlotChangeRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'APPROVED' } : r))
    );
  };

  // Decline Slot Change Request
  const handleDeclineSlotChange = (id: string, reason: string) => {
    setSlotChangeRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'DECLINED', declineReason: reason } : r))
    );
  };

  // Clear local storage to reset to pristine mock state
  const handleResetApp = () => {
    if (confirm('Are you sure you want to reset all bookings and configurations back to default club settings?')) {
      localStorage.removeItem('scotter_jfc_bookings');
      localStorage.removeItem('scotter_jfc_pitch_configs');
      localStorage.removeItem('scotter_jfc_slot_changes');
      localStorage.removeItem('scotter_jfc_current_user');
      window.location.reload();
    }
  };

  // Count pending bookings for indicator badge
  const pendingBookingsCount = bookings.filter((b) => b.status === BookingStatus.PENDING).length;
  // Count pending slot changes for indicator badge
  const pendingSlotChangesCount = slotChangeRequests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-200">
      
      {/* Club Banner Header */}
      <Header
        currentUser={currentUser}
        users={MOCK_USERS}
        onUserChange={handleUserChange}
      />

      {/* Role Indicator Info Banner */}
      <div className="bg-blue-900 text-white border-b border-blue-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs md:text-sm">
          <div className="flex items-center space-x-2">
            <span className="bg-white/20 text-white font-extrabold px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">
              {currentUser.role} View
            </span>
            <span>
              {currentUser.role === 'ADMIN' ? (
                <>Logged in as <strong>Sarah Jenkins (Admin)</strong>. You can approve/decline pitch bookings and manage kickoff slots.</>
              ) : (
                <>Logged in as <strong>{currentUser.name}</strong>, managing <strong>{currentUser.teamName}</strong>. Request slots & suggested times.</>
              )}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-slate-300 font-medium">Simulation Mode:</span>
            <button
              onClick={() => handleUserChange(currentUser.role === 'ADMIN' ? MOCK_USERS[1] : MOCK_USERS[0])}
              className="bg-white text-blue-900 font-bold px-2 py-0.5 rounded hover:bg-slate-100 transition-colors text-[11px]"
            >
              Toggle to {currentUser.role === 'ADMIN' ? 'Manager' : 'Admin'}
            </button>
          </div>
        </div>
      </div>

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
            {pendingSlotChangesCount > 0 && currentUser.role === 'ADMIN' && (
              <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full ml-1">
                {pendingSlotChangesCount}
              </span>
            )}
          </button>
        </div>

        {/* Dynamic Tab Panel */}
        <div className="space-y-6">
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

              {activeTab === 'SLOTS' && (
                <SlotConfigurator
                  pitchConfigs={pitchConfigs}
                  slotChangeRequests={slotChangeRequests}
                  currentUser={currentUser}
                  onUpdatePitchSlots={handleUpdatePitchSlots}
                  onSubmitSlotChangeRequest={handleSubmitSlotChangeRequest}
                  onApproveSlotChange={handleApproveSlotChange}
                  onDeclineSlotChange={handleDeclineSlotChange}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Helper FAQ & Notice Footer */}
      <footer className="bg-white border-t border-slate-200 py-10 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                <span>Youth Guidelines</span>
              </h4>
              <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
                <li>5v5 format is reserved strictly for U7s and U8s teams.</li>
                <li>7v7 matches accommodate U9s and U10s leagues.</li>
                <li>9v9 pitch hosts U11s and U12s fixtures.</li>
                <li>11v11 Main Pitch is shared by U13s to Adult squads.</li>
              </ul>
            </div>

            {/* System Options */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wider">
                System Utilities
              </h4>
              <div className="flex flex-col space-y-2">
                <button
                  onClick={handleResetApp}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-lg text-center transition-colors self-start border border-slate-200"
                >
                  Reset Club Data to Default
                </button>
                <p className="text-[10px] text-slate-400">
                  Clears local storage persistence and loads pre-populated match bookings.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            <span>© 2026 Scotter United Junior Football Club. All Rights Reserved.</span>
            <span>Est. 1978 • Royal Blue & White Pride</span>
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
          />
        )}
      </AnimatePresence>
    </div>
  );
}
