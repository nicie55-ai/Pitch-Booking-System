/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Plus, Trash2, HelpCircle, FileText, CheckCircle, XCircle, AlertCircle, MessageSquare, ClipboardList, Shield } from 'lucide-react';
import { PitchSize, PitchConfig, SlotChangeRequest, User } from '../types';

interface SlotConfiguratorProps {
  pitchConfigs: PitchConfig[];
  slotChangeRequests: SlotChangeRequest[];
  currentUser: User;
  onUpdatePitchSlots: (pitchId: PitchSize, newSlots: string[]) => void;
  onSubmitSlotChangeRequest: (request: Omit<SlotChangeRequest, 'id' | 'status' | 'createdAt' | 'managerId' | 'managerName' | 'teamName'>) => void;
  onApproveSlotChange: (id: string) => void;
  onDeclineSlotChange: (id: string, reason: string) => void;
}

export default function SlotConfigurator({
  pitchConfigs,
  slotChangeRequests,
  currentUser,
  onUpdatePitchSlots,
  onSubmitSlotChangeRequest,
  onApproveSlotChange,
  onDeclineSlotChange,
}: SlotConfiguratorProps) {
  const [selectedPitchId, setSelectedPitchId] = useState<PitchSize>('7v7');
  
  // Admin local states
  const [newSlotTime, setNewSlotTime] = useState('');
  const [adminError, setAdminError] = useState('');

  // Manager local states
  const [reqActionType, setReqActionType] = useState<'ADD' | 'REMOVE' | 'CHANGE'>('ADD');
  const [reqTargetSlot, setReqTargetSlot] = useState('');
  const [reqNewSlotTime, setReqNewSlotTime] = useState('');
  const [reqNotes, setReqNotes] = useState('');
  const [reqError, setReqError] = useState('');
  const [reqSuccess, setReqSuccess] = useState('');

  // Admin declining states
  const [decliningReqId, setDecliningReqId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const activeConfig = pitchConfigs.find((p) => p.id === selectedPitchId)!;

  // Add a slot as Admin
  const handleAdminAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');

    if (!newSlotTime) return;

    // Validate format HH:MM
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(newSlotTime)) {
      setAdminError('Please enter a valid 24-hour time format (e.g., 13:15 or 09:30).');
      return;
    }

    if (activeConfig.defaultSlots.includes(newSlotTime)) {
      setAdminError('This slot already exists for this pitch format.');
      return;
    }

    // Add and sort
    const updatedSlots = [...activeConfig.defaultSlots, newSlotTime].sort();
    onUpdatePitchSlots(selectedPitchId, updatedSlots);
    setNewSlotTime('');
  };

  // Remove a slot as Admin
  const handleAdminRemoveSlot = (slotToRemove: string) => {
    if (confirm(`Are you sure you want to remove the standard slot ${slotToRemove} for ${activeConfig.name}?`)) {
      const updatedSlots = activeConfig.defaultSlots.filter((s) => s !== slotToRemove);
      onUpdatePitchSlots(selectedPitchId, updatedSlots);
    }
  };

  // Submit Slot Change Request as Manager
  const handleManagerRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setReqError('');
    setReqSuccess('');

    if (!reqTargetSlot) {
      setReqError('Please specify the slot to change or add.');
      return;
    }

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(reqTargetSlot)) {
      setReqError('Please enter target slot time in valid 24-hour HH:MM format.');
      return;
    }

    if (reqActionType === 'CHANGE') {
      if (!reqNewSlotTime) {
        setReqError('Please specify the new slot time.');
        return;
      }
      if (!timeRegex.test(reqNewSlotTime)) {
        setReqError('Please enter new slot time in valid 24-hour HH:MM format.');
        return;
      }
    }

    if (!reqNotes.trim()) {
      setReqError('Please provide a reason / notes for the request.');
      return;
    }

    onSubmitSlotChangeRequest({
      pitchId: selectedPitchId,
      actionType: reqActionType,
      targetSlot: reqTargetSlot,
      newSlotTime: reqActionType === 'CHANGE' ? reqNewSlotTime : undefined,
      notes: reqNotes,
    });

    setReqTargetSlot('');
    setReqNewSlotTime('');
    setReqNotes('');
    setReqSuccess('Your slot change request was submitted to the Club Admin!');
    setTimeout(() => setReqSuccess(''), 4000);
  };

  return (
    <div className="space-y-8">
      {/* Pitch Selector */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
          <Settings className="w-5 h-5 text-blue-900" />
          <span>Slot & Pitch Configurations</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Select a pitch format below to view, update, or request changes to standard kick-off slots.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {pitchConfigs.map((p) => {
            const isSelected = p.id === selectedPitchId;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedPitchId(p.id);
                  setReqTargetSlot('');
                  setReqNewSlotTime('');
                  setAdminError('');
                  setReqError('');
                }}
                className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all text-center ${
                  isSelected
                    ? 'bg-blue-900 border-blue-900 text-white shadow-md'
                    : 'bg-slate-50 border-slate-100 text-slate-700 hover:border-slate-200'
                }`}
              >
                {p.id} Format
                <span className="block text-[10px] font-normal mt-0.5 opacity-80">
                  {p.defaultSlots.length} Slots Standard
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Two-Column Layout (Configurator vs Requests) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Config Panel */}
        <div className="lg:col-span-6 bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <span className="text-xs font-bold text-blue-900 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-md uppercase">
              Current Configuration
            </span>
            <h3 className="text-lg font-bold text-slate-800 mt-2">{activeConfig.name}</h3>
            <p className="text-xs text-slate-500">{activeConfig.description}</p>
          </div>

          {/* Active Slots Display */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Standard Daily Kick-Off Slots
            </label>
            <div className="grid grid-cols-3 gap-2">
              {activeConfig.defaultSlots.map((slot) => (
                <div
                  key={slot}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between"
                >
                  <span className="text-sm font-extrabold text-blue-900">{slot}</span>
                  {currentUser.role === 'ADMIN' && (
                    <button
                      onClick={() => handleAdminRemoveSlot(slot)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded-md transition-colors"
                      title="Remove Slot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Configuration Forms depending on Role */}
          {currentUser.role === 'ADMIN' ? (
            /* ADMIN COMPONENT - Direct slot changes */
            <div className="border-t-2 border-slate-100 pt-6 space-y-4">
              <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200 p-3 rounded-xl text-blue-900">
                <Shield className="w-5 h-5 flex-shrink-0" />
                <span className="text-xs font-semibold">You have admin access. Changes take immediate effect in the diary.</span>
              </div>
              <form onSubmit={handleAdminAddSlot} className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Add Standard Kick-Off Slot
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newSlotTime}
                    onChange={(e) => setNewSlotTime(e.target.value)}
                    placeholder="e.g. 13:15 or 14:30"
                    maxLength={5}
                    className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 font-bold focus:border-blue-900 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-blue-900 hover:bg-blue-800 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center space-x-1 transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Slot</span>
                  </button>
                </div>
                {adminError && <p className="text-xs text-red-600 font-medium">{adminError}</p>}
              </form>
            </div>
          ) : (
            /* MANAGER COMPONENT - Request changes to slots */
            <div className="border-t-2 border-slate-100 pt-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-blue-900" />
                  <span>Submit Slot Change Request</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Need a different slot time or custom kickoff layout for {activeConfig.id} matches? Suggest a change here.
                </p>

                <form onSubmit={handleManagerRequest} className="mt-4 space-y-4">
                  {/* Action Type */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Action Type
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['ADD', 'REMOVE', 'CHANGE'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setReqActionType(type);
                            setReqTargetSlot('');
                            setReqNewSlotTime('');
                          }}
                          className={`py-1.5 text-xs font-bold rounded-md border text-center transition-all ${
                            reqActionType === type
                              ? 'bg-blue-900 border-blue-900 text-white shadow-sm'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {type === 'ADD' ? 'Add New' : type === 'REMOVE' ? 'Remove' : 'Change Existing'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Slot targets */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        {reqActionType === 'ADD' ? 'Proposed Time' : 'Target Slot'}
                      </label>
                      {reqActionType === 'REMOVE' ? (
                        <select
                          value={reqTargetSlot}
                          onChange={(e) => setReqTargetSlot(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-900"
                        >
                          <option value="">Select slot</option>
                          {activeConfig.defaultSlots.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={reqTargetSlot}
                          onChange={(e) => setReqTargetSlot(e.target.value)}
                          placeholder="e.g. 13:15"
                          maxLength={5}
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-900"
                        />
                      )}
                    </div>

                    {reqActionType === 'CHANGE' && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          New proposed time
                        </label>
                        <input
                          type="text"
                          value={reqNewSlotTime}
                          onChange={(e) => setReqNewSlotTime(e.target.value)}
                          placeholder="e.g. 14:00"
                          maxLength={5}
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-900"
                        />
                      </div>
                    )}
                  </div>

                  {/* Notes / Reason */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Reason / Justification (Notes)
                    </label>
                    <textarea
                      value={reqNotes}
                      onChange={(e) => setReqNotes(e.target.value)}
                      placeholder="e.g. League requires double-headers; kickoffs need shifting due to travel distance..."
                      rows={2.5}
                      className="w-full bg-white border border-slate-200 rounded p-2 text-xs text-slate-700 focus:outline-none focus:border-blue-900"
                      required
                    />
                  </div>

                  {reqError && <p className="text-xs text-red-600 font-semibold">{reqError}</p>}
                  {reqSuccess && <p className="text-xs text-emerald-700 font-bold">{reqSuccess}</p>}

                  <button
                    type="submit"
                    className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-2 rounded-lg text-xs transition-colors shadow-sm"
                  >
                    Submit Slot Request
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Slot Change Requests Logs */}
        <div className="lg:col-span-6 bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <ClipboardList className="w-5 h-5 text-blue-900" />
            <h3 className="text-base font-bold text-slate-800">Slot Request Activity Feed</h3>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {slotChangeRequests.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                No slot change requests logged yet.
              </div>
            ) : (
              slotChangeRequests.map((req) => {
                const pitchName = pitchConfigs.find((pc) => pc.id === req.pitchId)?.id || req.pitchId;
                
                return (
                  <div
                    key={req.id}
                    className={`p-4 rounded-xl border border-slate-200 space-y-2 text-xs transition-colors ${
                      req.status === 'APPROVED'
                        ? 'bg-emerald-50/50'
                        : req.status === 'DECLINED'
                        ? 'bg-red-50/50'
                        : 'bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-extrabold text-blue-900">{req.teamName}</span>
                        <p className="text-[10px] text-slate-400">Proposed by {req.managerName}</p>
                        <p className="text-[9px] text-slate-500 font-medium mt-0.5">Submitted: {new Date(req.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(req.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      
                      {/* Status label */}
                      <span className={`px-2 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wide ${
                        req.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'DECLINED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800 animate-pulse'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="bg-white/80 p-2 rounded border border-slate-100 space-y-1">
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-500">Pitch Format:</span>
                        <span className="font-bold text-slate-800">{pitchName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-500">Type of Change:</span>
                        <span className="font-bold text-slate-800">
                          {req.actionType === 'ADD'
                            ? 'Add Time Slot'
                            : req.actionType === 'REMOVE'
                            ? 'Remove Time Slot'
                            : 'Change Time Slot'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-500">Proposed Slot(s):</span>
                        <span className="font-extrabold text-blue-900">
                          {req.actionType === 'CHANGE'
                            ? `${req.targetSlot} ➔ ${req.newSlotTime}`
                            : req.targetSlot}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-slate-700">Manager notes:</span>
                      <p className="text-slate-600 italic">"{req.notes}"</p>
                    </div>

                    {req.declineReason && (
                      <div className="bg-red-50 p-2 rounded text-[11px] text-red-800 border border-red-100">
                        <span className="font-bold uppercase">Decline Reason:</span> "{req.declineReason}"
                      </div>
                    )}

                    {/* Admin Actions */}
                    {currentUser.role === 'ADMIN' && req.status === 'PENDING' && (
                      <div className="pt-2 border-t border-slate-200 flex flex-col space-y-2">
                        {decliningReqId === req.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={declineReason}
                              onChange={(e) => setDeclineReason(e.target.value)}
                              placeholder="Reason for declining this slot change..."
                              className="w-full text-xs p-1.5 border border-slate-300 rounded focus:border-red-600 focus:outline-none"
                              required
                            />
                            <div className="flex justify-end space-x-1.5">
                              <button
                                onClick={() => setDecliningReqId(null)}
                                className="text-slate-500 hover:bg-slate-100 text-[10px] font-bold px-2.5 py-1 rounded"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  if (!declineReason.trim()) {
                                    alert('Decline reason is mandatory.');
                                    return;
                                  }
                                  onDeclineSlotChange(req.id, declineReason);
                                  setDecliningReqId(null);
                                }}
                                className="bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded"
                              >
                                Confirm Decline
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex space-x-2 justify-end">
                            <button
                              onClick={() => {
                                setDecliningReqId(req.id);
                                setDeclineReason('');
                              }}
                              className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded"
                            >
                              Decline Request
                            </button>
                            <button
                              onClick={() => onApproveSlotChange(req.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-3 py-1 rounded"
                            >
                              Approve & Update Slots
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
