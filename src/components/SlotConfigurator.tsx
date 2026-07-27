/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Settings, Plus, Trash2, Shield, Info, Clock, CheckCircle } from 'lucide-react';
import { PitchSize, PitchConfig, SlotChangeRequest, User } from '../types';

interface SlotConfiguratorProps {
  pitchConfigs: PitchConfig[];
  currentUser: User;
  onUpdatePitchSlots: (pitchId: PitchSize, newSlots: string[]) => void;
  slotChangeRequests?: SlotChangeRequest[];
  onSubmitSlotChangeRequest?: (request: Omit<SlotChangeRequest, 'id' | 'status' | 'createdAt' | 'managerId' | 'managerName' | 'teamName'>) => void;
  onApproveSlotChange?: (id: string) => void;
  onDeclineSlotChange?: (id: string, reason: string) => void;
}

export default function SlotConfigurator({
  pitchConfigs,
  currentUser,
  onUpdatePitchSlots,
}: SlotConfiguratorProps) {
  const [selectedPitchId, setSelectedPitchId] = useState<PitchSize>('7v7');
  
  // Admin local states
  const [newSlotTime, setNewSlotTime] = useState('');
  const [adminError, setAdminError] = useState('');

  const activeConfig = pitchConfigs.find((p) => p.id === selectedPitchId) || pitchConfigs[0];

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
    const updatedSlots = activeConfig.defaultSlots.filter((s) => s !== slotToRemove);
    onUpdatePitchSlots(selectedPitchId, updatedSlots);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header & Pitch Selector */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-blue-900" />
            <span>Standard Pitch Kick-Off Slots</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Select a pitch format below to view and manage standard kick-off slot times across the club.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {pitchConfigs.map((p) => {
            const isSelected = p.id === selectedPitchId;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedPitchId(p.id);
                  setAdminError('');
                }}
                className={`py-3.5 px-4 rounded-xl border-2 font-bold text-sm transition-all text-center ${
                  isSelected
                    ? 'bg-blue-900 border-blue-900 text-white shadow-md'
                    : 'bg-slate-50 border-slate-100 text-slate-700 hover:border-slate-200'
                }`}
              >
                {p.id} Format
                <span className="block text-[10px] font-normal mt-0.5 opacity-80">
                  {p.defaultSlots.length} Standard Slots
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Pitch Format Details & Slot Grid */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-bold text-blue-900 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-md uppercase">
              {activeConfig.id} Format Configuration
            </span>
            <h3 className="text-xl font-black text-slate-800 mt-2">{activeConfig.name}</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{activeConfig.description}</p>
          </div>
          
          <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 self-start sm:self-auto">
            <Clock className="w-4 h-4 text-blue-900" />
            <span>{activeConfig.defaultSlots.length} Active Default Slots</span>
          </div>
        </div>

        {/* Custom Times Notice Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-100/80 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-900 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-extrabold text-blue-950 uppercase tracking-wide">
              Custom Time Requests Available
            </p>
            <p className="text-slate-600 leading-relaxed font-semibold">
              Coaches and managers can request custom kickoff times directly when booking a pitch in the Pitch Diary. Standard slots provide quick selection guidelines, but custom timing is fully supported.
            </p>
          </div>
        </div>

        {/* Active Slots Grid */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Configured Standard Slots ({activeConfig.defaultSlots.length})
          </label>

          {activeConfig.defaultSlots.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium border-2 border-dashed border-slate-200 rounded-xl">
              No default kick-off slots defined for this pitch format yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {activeConfig.defaultSlots.map((slot) => (
                <div
                  key={slot}
                  className="bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between shadow-xs group hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-base font-black text-slate-900">{slot}</span>
                  </div>
                  
                  {currentUser.role === 'ADMIN' && (
                    <button
                      onClick={() => handleAdminRemoveSlot(slot)}
                      className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors opacity-80 group-hover:opacity-100"
                      title={`Remove ${slot} slot`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admin Direct Slot Configuration Controls */}
        {currentUser.role === 'ADMIN' && (
          <div className="border-t-2 border-slate-100 pt-6 space-y-4">
            <div className="flex items-center space-x-2 bg-blue-900 text-white p-3 rounded-xl">
              <Shield className="w-5 h-5 flex-shrink-0 text-blue-200" />
              <span className="text-xs font-bold">Admin Management Controls: Add new standard kick-off slots below</span>
            </div>

            <form onSubmit={handleAdminAddSlot} className="space-y-3 max-w-md">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Add Standard Kick-Off Slot ({activeConfig.id})
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newSlotTime}
                  onChange={(e) => setNewSlotTime(e.target.value)}
                  placeholder="e.g. 13:15 or 14:30"
                  maxLength={5}
                  className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 font-bold focus:border-blue-900 focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-blue-900 hover:bg-blue-800 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 transition-colors shadow-sm uppercase tracking-wider"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Slot</span>
                </button>
              </div>
              {adminError && <p className="text-xs text-red-600 font-bold">{adminError}</p>}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
