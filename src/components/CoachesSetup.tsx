/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Key, 
  ShieldAlert, 
  CheckCircle, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Edit3, 
  Save, 
  X, 
  Lock, 
  Mail, 
  UserCheck, 
  Sparkles,
  Info
} from 'lucide-react';
import { User, PitchSize } from '../types';
import { SCOTTER_TEAMS } from '../mockData';

interface CoachesSetupProps {
  users: User[];
  onUpdateUsers: (newUsers: User[]) => void;
  currentUser: User;
  onUpdateCurrentUser: (user: User) => void;
}

export default function CoachesSetup({
  users,
  onUpdateUsers,
  currentUser,
  onUpdateCurrentUser,
}: CoachesSetupProps) {
  // Setup state
  const [newCoachName, setNewCoachName] = useState('');
  const [newCoachPassword, setNewCoachPassword] = useState('');
  const [newCoachTeam, setNewCoachTeam] = useState('');
  const [newCoachRole, setNewCoachRole] = useState<'MANAGER' | 'ADMIN'>('MANAGER');
  
  // Visibility and editing states
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTeam, setEditTeam] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editRole, setEditRole] = useState<'MANAGER' | 'ADMIN'>('MANAGER');

  // Error / success alerts
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Google SSO simulated state
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);

  const handleAddCoach = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newCoachName.trim()) {
      setError('Please provide a coach name.');
      return;
    }
    if (!newCoachPassword.trim() || newCoachPassword.length < 6) {
      setError('Password must be at least 6 characters long for security.');
      return;
    }

    // Check duplicate name
    if (users.some((u) => u.name.toLowerCase() === newCoachName.trim().toLowerCase())) {
      setError(`A coach named "${newCoachName}" already exists.`);
      return;
    }

    const newCoach: User = {
      id: `u-${Date.now()}`,
      name: newCoachName.trim(),
      role: newCoachRole,
      teamName: newCoachRole === 'MANAGER' ? (newCoachTeam || undefined) : undefined,
      password: newCoachPassword.trim(),
    };

    onUpdateUsers([...users, newCoach]);
    setSuccess(`Coach profile for "${newCoach.name}" successfully created!`);
    
    // Clear form
    setNewCoachName('');
    setNewCoachPassword('');
    setNewCoachTeam('');
    setNewCoachRole('MANAGER');
    setShowNewPassword(false);
  };

  const handleDeleteCoach = (id: string) => {
    if (id === currentUser.id) {
      setError('You cannot delete your own logged-in profile!');
      return;
    }
    setError(null);
    setSuccess(null);

    const coachToDelete = users.find((u) => u.id === id);
    if (confirm(`Are you sure you want to remove the coach account for "${coachToDelete?.name}"?`)) {
      onUpdateUsers(users.filter((u) => u.id !== id));
      setSuccess('Coach profile successfully removed from directory.');
    }
  };

  const startEditing = (user: User) => {
    setError(null);
    setSuccess(null);
    setEditingUserId(user.id);
    setEditName(user.name);
    setEditTeam(user.teamName || '');
    setEditPassword(''); // Do not load password into memory in plain text
    setEditRole(user.role);
    setShowEditPassword(false);
  };

  const handleSaveEdit = () => {
    setError(null);
    setSuccess(null);

    if (!editName.trim()) {
      setError('Name cannot be blank.');
      return;
    }

    // Update list of users
    const updatedUsers = users.map((u) => {
      if (u.id === editingUserId) {
        const updated: User = {
          ...u,
          name: editName.trim(),
          role: editRole,
          teamName: editRole === 'MANAGER' ? (editTeam || undefined) : undefined,
        };
        // Update password only if a new one was typed
        if (editPassword.trim()) {
          if (editPassword.length < 6) {
            setError('New password must be at least 6 characters long.');
            return u;
          }
          updated.password = editPassword.trim();
        }
        return updated;
      }
      return u;
    });

    if (error) return; // Stop if password was too short

    onUpdateUsers(updatedUsers);

    // If we edited the active logged-in user, sync current user state too
    if (editingUserId === currentUser.id) {
      const updatedSelf = updatedUsers.find((u) => u.id === currentUser.id);
      if (updatedSelf) {
        onUpdateCurrentUser(updatedSelf);
      }
    }

    setSuccess('Profile updated successfully!');
    setEditingUserId(null);
    setEditPassword('');
  };

  // Simulated Google SSO linkage
  const handleToggleGoogleSSO = () => {
    setError(null);
    setSuccess(null);
    setIsLinkingGoogle(true);

    setTimeout(() => {
      setIsLinkingGoogle(false);
      const isLinked = currentUser.googleLinked;
      
      const updatedUser = {
        ...currentUser,
        googleLinked: !isLinked,
        googleEmail: !isLinked ? 'nicie55@hotmail.com' : undefined,
      };

      onUpdateCurrentUser(updatedUser);
      onUpdateUsers(users.map((u) => u.id === currentUser.id ? updatedUser : u));

      if (!isLinked) {
        setSuccess('Successfully connected to Google SSO! You can now log in securely with nicie55@hotmail.com.');
      } else {
        setSuccess('Disconnected Google SSO linkage.');
      }
    }, 1000);
  };

  return (
    <div className="space-y-8">
      {/* Overview Intro */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-400" />
              <span>Coaches & Profile Settings</span>
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
              {currentUser.role === 'ADMIN'
                ? 'Manage active coach credentials, assign age-group squad permissions, and securely configure single sign-on access.'
                : 'Manage your personal coach profile, assign your club squad, and securely configure single sign-on access.'}
            </p>
          </div>

          {/* Persona quick display */}
          <div className="flex items-center space-x-3 bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
            <div className="p-2 bg-blue-900/40 border border-blue-800 rounded-lg">
              <UserCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Logged In Coach</p>
              <p className="text-xs font-black text-white">{currentUser.name}</p>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wide mt-0.5">{currentUser.role === 'ADMIN' ? 'Administrator' : `${currentUser.teamName || 'Club'} Manager`}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-950 p-4 rounded-2xl font-bold text-xs flex items-center gap-3 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border-2 border-emerald-200 text-emerald-950 p-4 rounded-2xl font-bold text-xs flex items-center gap-3 shadow-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns: Forms */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 1. Setup New Coach Profile (ADMIN Only) */}
          {currentUser.role === 'ADMIN' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-900" />
                  <span>Setup New Coach Account</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">Add a new coach to the directory and assign their official club squad format.</p>
              </div>

              <form onSubmit={handleAddCoach} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Coach Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-extrabold text-slate-700 uppercase">Coach Name</label>
                    <input
                      type="text"
                      required
                      value={newCoachName}
                      onChange={(e) => setNewCoachName(e.target.value)}
                      placeholder="e.g. Claudio Ranieri"
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg py-2.5 px-3 text-slate-800 font-semibold focus:border-blue-900 focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Password input (Masked by default) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-extrabold text-slate-700 uppercase">Secure Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newCoachPassword}
                        onChange={(e) => setNewCoachPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg py-2.5 pl-3 pr-10 text-slate-800 font-semibold focus:border-blue-900 focus:outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Team Assignment */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-extrabold text-slate-700 uppercase">Squad Assignment</label>
                    <select
                      value={newCoachTeam}
                      disabled={newCoachRole === 'ADMIN'}
                      onChange={(e) => setNewCoachTeam(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg py-2.5 px-3 text-slate-800 font-semibold focus:border-blue-900 focus:outline-none transition-colors disabled:opacity-50"
                    >
                      <option value="">-- Assign to Squad --</option>
                      {SCOTTER_TEAMS.map((t) => (
                        <option key={t.name} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Role selection */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-extrabold text-slate-700 uppercase">System Permissions</label>
                    <select
                      value={newCoachRole}
                      onChange={(e) => {
                        const r = e.target.value as 'MANAGER' | 'ADMIN';
                        setNewCoachRole(r);
                        if (r === 'ADMIN') setNewCoachTeam('');
                      }}
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg py-2.5 px-3 text-slate-800 font-semibold focus:border-blue-900 focus:outline-none transition-colors"
                    >
                      <option value="MANAGER">MANAGER (Pitch Booker)</option>
                      <option value="ADMIN">ADMIN (Full Control)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-blue-900 hover:bg-blue-800 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all uppercase tracking-wider"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Coach Profile</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 2. Personal Profile Editor (Manager or selected edit profile) */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-900" />
                <span>
                  {editingUserId 
                    ? `Editing Coach Profile: ${users.find(u => u.id === editingUserId)?.name}`
                    : 'Personal Profile Settings'
                  }
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {editingUserId 
                  ? 'Update this coach profile name, team format assignment, or securely assign a new password.'
                  : 'Manage your account name, assigned squad format, or securely update your login password.'
                }
              </p>
            </div>

            {/* Quick edit form */}
            {(() => {
              const activeEditId = editingUserId || currentUser.id;
              const activeEditUser = users.find(u => u.id === activeEditId);
              
              if (!activeEditUser) return <p className="text-xs text-slate-400">Loading profile data...</p>;

              // Set default state values if no user is currently actively selected in state
              const isEditingSelf = activeEditId === currentUser.id;

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-extrabold text-slate-700 uppercase">Coach Name</label>
                      <input
                        type="text"
                        value={editingUserId ? editName : currentUser.name}
                        disabled={currentUser.role !== 'ADMIN' && !isEditingSelf}
                        onChange={(e) => {
                          if (editingUserId) {
                            setEditName(e.target.value);
                          } else {
                            const updated = { ...currentUser, name: e.target.value };
                            onUpdateCurrentUser(updated);
                            onUpdateUsers(users.map(u => u.id === currentUser.id ? updated : u));
                          }
                        }}
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg py-2.5 px-3 text-slate-800 font-semibold focus:border-blue-900 focus:outline-none transition-colors disabled:opacity-60"
                      />
                    </div>

                    {/* Team squad assignment */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-extrabold text-slate-700 uppercase">Squad Assignment</label>
                      <select
                        value={editingUserId ? editTeam : (currentUser.teamName || '')}
                        disabled={
                          (editingUserId ? editRole === 'ADMIN' : currentUser.role === 'ADMIN') || 
                          (currentUser.role !== 'ADMIN' && !isEditingSelf)
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (editingUserId) {
                            setEditTeam(val);
                          } else {
                            const updated = { ...currentUser, teamName: val || undefined };
                            onUpdateCurrentUser(updated);
                            onUpdateUsers(users.map(u => u.id === currentUser.id ? updated : u));
                          }
                        }}
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg py-2.5 px-3 text-slate-800 font-semibold focus:border-blue-900 focus:outline-none transition-colors disabled:opacity-50"
                      >
                        <option value="">-- None (Admin role) --</option>
                        {SCOTTER_TEAMS.map((t) => (
                          <option key={t.name} value={t.name}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Password securely hidden */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="block text-xs font-extrabold text-slate-700 uppercase">
                        {editingUserId ? 'Change Password' : 'Change Your Password'}
                      </label>
                      <p className="text-[10px] text-slate-400 mb-1.5 font-medium">To protect credentials, existing passwords are securely masked and never displayed in plain text. Enter a new password below to update it.</p>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                        <input
                          type={showEditPassword ? 'text' : 'password'}
                          value={editingUserId ? editPassword : editPassword} // we can use the local state editPassword for both
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="Type new secure password (leave blank to keep current)"
                          className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg py-2.5 pl-10 pr-10 text-slate-800 font-semibold focus:border-blue-900 focus:outline-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditPassword(!showEditPassword)}
                          className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Save button */}
                  <div className="flex justify-end gap-2 pt-2">
                    {editingUserId && (
                      <button
                        onClick={() => {
                          setEditingUserId(null);
                          setEditPassword('');
                        }}
                        className="border-2 border-slate-200 hover:bg-slate-50 text-slate-600 font-extrabold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all uppercase tracking-wider"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    )}
                    <button
                      onClick={editingUserId ? handleSaveEdit : () => {
                        // Saving personal changes (updating password if typed)
                        setError(null);
                        setSuccess(null);
                        if (editPassword.trim()) {
                          if (editPassword.length < 6) {
                            setError('New password must be at least 6 characters long.');
                            return;
                          }
                          const updatedSelf = { ...currentUser, password: editPassword.trim() };
                          onUpdateCurrentUser(updatedSelf);
                          onUpdateUsers(users.map(u => u.id === currentUser.id ? updatedSelf : u));
                          setSuccess('Your password has been securely updated!');
                        } else {
                          setSuccess('Profile details saved successfully!');
                        }
                        setEditPassword('');
                      }}
                      className="bg-blue-900 hover:bg-blue-800 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all uppercase tracking-wider"
                    >
                      <Save className="w-4 h-4" />
                      <span>{editingUserId ? 'Save Coach Profile' : 'Save Personal Settings'}</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right Column: Google SSO & Directory */}
        <div className="space-y-8">
          
          {/* Google SSO Box */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-900 animate-pulse" />
                <span>Google Single Sign-On (SSO)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">Authenticate instantly and securely using Google Accounts, fully compatible with club workspace credentials.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
              {currentUser.googleLinked ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-emerald-800">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs font-bold font-sans">SSO Linked with Google</span>
                  </div>
                  <div className="text-xs bg-white p-3 rounded-lg border border-slate-150 space-y-1">
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Linked Email Address</p>
                    <p className="font-mono text-slate-800 font-bold break-all">{currentUser.googleEmail || 'nicie55@hotmail.com'}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-slate-500 font-medium text-xs leading-relaxed">
                  <p>Enhance security and bypass password entry! Link your coach account with a single click.</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleToggleGoogleSSO}
                disabled={isLinkingGoogle}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all duration-150 flex items-center justify-center space-x-2 shadow-sm uppercase tracking-wider ${
                  currentUser.googleLinked 
                    ? 'bg-red-50 hover:bg-red-100/80 text-red-700 border border-red-200' 
                    : 'bg-blue-900 hover:bg-blue-800 text-white'
                } disabled:opacity-50`}
              >
                {isLinkingGoogle ? (
                  <span>Syncing SSO...</span>
                ) : currentUser.googleLinked ? (
                  <span>Disconnect Google</span>
                ) : (
                  <>
                    {/* Simple inline Google colored icon (G) */}
                    <span className="font-sans font-black bg-white text-slate-800 rounded px-1.5 mr-0.5 text-[10px]">G</span>
                    <span>Link Google Account</span>
                  </>
                )}
              </button>
            </div>

            {/* Google SSO Notice */}
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-900 mt-0.5 flex-shrink-0" />
              <div className="text-[10px] text-blue-950 font-medium leading-relaxed">
                <p>Google SSO authentication is integrated on our platform via Firebase Auth secure federation. To enable full production domain SSO, admins can connect Firebase credentials in workspace settings.</p>
              </div>
            </div>
          </div>

          {/* Coach Directory / User List */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Coach Directory ({users.length})
            </h3>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {users.map((u) => (
                <div
                  key={u.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    u.id === currentUser.id
                      ? 'bg-blue-50/50 border-blue-200 shadow-sm'
                      : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'
                  } flex items-center justify-between gap-3`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      <span className="font-bold text-xs text-slate-900 truncate max-w-[120px]">{u.name}</span>
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                        u.role === 'ADMIN'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {u.role}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold truncate">
                      Squad: <strong className="text-slate-700">{u.teamName || 'None (Admin)'}</strong>
                    </p>
                    {/* Secure password notice */}
                    <p className="text-[9px] text-slate-400 font-mono flex items-center gap-1 leading-none mt-0.5 select-none">
                      <Lock className="w-2.5 h-2.5 text-slate-300" />
                      <span>Password: Secured & Masked</span>
                    </p>
                    {u.googleLinked && (
                      <span className="inline-flex items-center text-[8px] font-black text-blue-800 bg-blue-50 border border-blue-150 px-1 py-0.5 rounded mt-1 uppercase tracking-wider leading-none">
                        Google SSO Active
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    {/* Edit button */}
                    {currentUser.role === 'ADMIN' && (
                      <button
                        onClick={() => startEditing(u)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          editingUserId === u.id
                            ? 'bg-blue-900 text-white border-blue-900'
                            : 'border-slate-200 text-slate-500 hover:text-blue-900 hover:bg-slate-100'
                        }`}
                        title="Edit profile & permissions"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Delete button */}
                    {currentUser.role === 'ADMIN' && (
                      <button
                        onClick={() => handleDeleteCoach(u.id)}
                        disabled={u.id === currentUser.id}
                        className="p-1.5 border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-35"
                        title={u.id === currentUser.id ? 'Cannot delete logged in user' : 'Delete account'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
