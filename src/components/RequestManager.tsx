/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ClipboardList, CheckCircle, XCircle, AlertCircle, Calendar, Clock, MapPin, User, MessageSquare, Filter, ShieldAlert } from 'lucide-react';
import { Booking, BookingStatus, PitchSize, User as UserType } from '../types';

interface RequestManagerProps {
  bookings: Booking[];
  currentUser: UserType;
  onApproveBooking: (id: string) => void;
  onDeclineBooking: (id: string, reason: string) => void;
  onCancelBooking: (id: string) => void;
}

export default function RequestManager({
  bookings,
  currentUser,
  onApproveBooking,
  onDeclineBooking,
  onCancelBooking,
}: RequestManagerProps) {
  const [filterStatus, setFilterStatus] = useState<'ALL' | BookingStatus>('ALL');
  const [filterPitch, setFilterPitch] = useState<'ALL' | PitchSize>('ALL');
  
  // Local state for admin decline reasons
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  // Filter bookings based on user role and filters
  const visibleBookings = bookings.filter((b) => {
    // Managers can only see their own bookings/requests
    if (currentUser.role === 'MANAGER' && b.managerId !== currentUser.id) {
      return false;
    }
    
    // Status filter
    if (filterStatus !== 'ALL' && b.status !== filterStatus) {
      return false;
    }

    // Pitch filter
    if (filterPitch !== 'ALL' && b.pitchId !== filterPitch) {
      return false;
    }

    return true;
  });

  // Sort: pending first, then approved, then declined (and by date descending)
  const sortedBookings = [...visibleBookings].sort((a, b) => {
    if (a.status === BookingStatus.PENDING && b.status !== BookingStatus.PENDING) return -1;
    if (a.status !== BookingStatus.PENDING && b.status === BookingStatus.PENDING) return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Header Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {currentUser.role === 'ADMIN' ? (
          <>
            <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 shadow-sm" id="admin-total-bookings-card">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Club Total Bookings</p>
              <p className="text-2xl font-extrabold text-blue-900 mt-1">
                {bookings.filter((b) => b.status === BookingStatus.APPROVED).length}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Approved fixtures across all pitches</p>
            </div>
            <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 shadow-sm" id="admin-pending-requests-card">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Club Pending Requests</p>
              <p className="text-2xl font-extrabold text-amber-600 mt-1">
                {bookings.filter((b) => b.status === BookingStatus.PENDING).length}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Awaiting administrator action</p>
            </div>
            <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 shadow-sm" id="admin-block-bookings-card">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Admin Block Bookings</p>
              <p className="text-2xl font-extrabold text-slate-700 mt-1">
                {bookings.filter((b) => b.managerId === currentUser.id).length}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Direct admin block-bookings created</p>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 shadow-sm" id="team-total-bookings-card">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">My Team Bookings</p>
              <p className="text-2xl font-extrabold text-blue-900 mt-1">
                {bookings.filter((b) => b.managerId === currentUser.id && b.status === BookingStatus.APPROVED).length}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Approved fixtures for your team</p>
            </div>
            <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 shadow-sm" id="team-pending-requests-card">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">My Pending Requests</p>
              <p className="text-2xl font-extrabold text-amber-600 mt-1">
                {bookings.filter((b) => b.managerId === currentUser.id && b.status === BookingStatus.PENDING).length}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Awaiting admin approval</p>
            </div>
            <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 shadow-sm" id="team-total-requests-card">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">My Total Requests</p>
              <p className="text-2xl font-extrabold text-slate-700 mt-1">
                {bookings.filter((b) => b.managerId === currentUser.id).length}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">All historical sessions submitted</p>
            </div>
          </>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-blue-900" />
          <h3 className="text-sm font-extrabold text-slate-800">Filter Requests</h3>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Status</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-900"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="DECLINED">Declined</option>
            </select>
          </div>

          {/* Pitch Filter */}
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Pitch Size</span>
            <select
              value={filterPitch}
              onChange={(e) => setFilterPitch(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-900"
            >
              <option value="ALL">All Pitches</option>
              <option value="5v5">5v5 Pitch</option>
              <option value="7v7">7v7 Pitch</option>
              <option value="9v9">9v9 Pitch</option>
              <option value="11v11">11v11 Pitch</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests Feed list */}
      <div className="space-y-4">
        {sortedBookings.length === 0 ? (
          <div className="bg-white border-2 border-slate-100 rounded-2xl py-12 text-center text-slate-400 font-semibold text-sm">
            No booking requests match the current filters.
          </div>
        ) : (
          sortedBookings.map((b) => {
            const isPending = b.status === BookingStatus.PENDING;
            const isApproved = b.status === BookingStatus.APPROVED;
            const isDeclined = b.status === BookingStatus.DECLINED;

            // Formatted Date
            const matchDate = new Date(b.date).toLocaleDateString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <div
                key={b.id}
                className={`bg-white border-2 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md ${
                  isApproved
                    ? 'border-emerald-100'
                    : isDeclined
                    ? 'border-slate-100 opacity-80'
                    : 'border-amber-200 bg-amber-50/10'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left: General Slot Info */}
                  <div className="flex flex-col sm:flex-row items-start gap-4 flex-grow">
                    <div className={`p-4 rounded-xl flex-shrink-0 flex flex-col items-center justify-center font-black ${
                      isApproved
                        ? 'bg-emerald-100 text-emerald-800'
                        : isDeclined
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-amber-100 text-amber-800 animate-pulse'
                    }`}>
                      <Calendar className="w-5 h-5 mb-1" />
                      <span className="text-xs uppercase">{b.pitchId}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-base font-extrabold text-slate-900">{b.teamName}</span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                          isApproved
                            ? 'bg-emerald-100 text-emerald-800'
                            : isDeclined
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {b.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 font-semibold">
                        <span className="flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {matchDate} @ {b.timeSlot}
                        </span>
                        <span className="flex items-center">
                          <User className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          Coach: {b.managerName}
                        </span>
                      </div>

                      {b.notes && (
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 mt-2 max-w-xl text-xs text-slate-600 italic">
                          <span className="font-extrabold block text-[10px] text-slate-400 uppercase tracking-wide not-italic mb-0.5">Fixture Notes</span>
                          "{b.notes}"
                        </div>
                      )}

                      {isDeclined && b.declineReason && (
                        <div className="bg-red-50 border border-red-100 rounded-lg p-2.5 mt-2 max-w-xl text-xs text-red-800 font-medium">
                          <span className="font-extrabold block text-[10px] text-red-500 uppercase tracking-wide mb-0.5">Decline Reason (Sarah Jenkins, Admin)</span>
                          "{b.declineReason}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-col sm:items-end justify-center self-start lg:self-center">
                    {isPending && currentUser.role === 'ADMIN' ? (
                      /* Admin Approval Form */
                      <div className="space-y-2 w-full">
                        {decliningId === b.id ? (
                          <div className="flex flex-col space-y-2">
                            <input
                              type="text"
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              placeholder="Reason for declining..."
                              className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-red-600"
                              required
                            />
                            <div className="flex justify-end space-x-1.5">
                              <button
                                onClick={() => setDecliningId(null)}
                                className="text-slate-500 hover:bg-slate-100 text-[10px] font-bold px-2 py-1 rounded"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  if (!reason.trim()) {
                                    alert('Decline reason is mandatory.');
                                    return;
                                  }
                                  onDeclineBooking(b.id, reason);
                                  setDecliningId(null);
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold px-2.5 py-1 rounded shadow-sm"
                              >
                                Submit Decline
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setDecliningId(b.id);
                                setReason('');
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 px-3.5 rounded-lg transition-colors shadow-sm"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => onApproveBooking(b.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3.5 rounded-lg transition-colors shadow-sm"
                            >
                              Approve Request
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Cancellation / Info */
                      <div className="flex flex-col sm:items-end gap-1 text-xs">
                        {(isApproved || isPending) && (currentUser.role === 'ADMIN' || b.managerId === currentUser.id) && (
                          confirmCancelId === b.id ? (
                            <div className="flex items-center space-x-1.5 bg-red-50 border border-red-100 p-1.5 rounded-lg">
                              <span className="text-[10px] font-bold text-red-700">Cancel?</span>
                              <button
                                onClick={() => {
                                  onCancelBooking(b.id);
                                  setConfirmCancelId(null);
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm transition-all"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setConfirmCancelId(null)}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded transition-all"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmCancelId(b.id)}
                              className="text-red-700 hover:bg-red-50 font-bold border border-red-100 py-1.5 px-3.5 rounded-lg transition-all"
                            >
                              Cancel {isApproved ? 'Booking' : 'Request'}
                            </button>
                          )
                        )}
                        <span className="text-[10px] text-slate-500 font-bold mt-1 bg-slate-50 border border-slate-100 py-1 px-2 rounded-lg">
                          Submitted: {new Date(b.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(b.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
