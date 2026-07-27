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
  Info,
  Layers,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Award
} from 'lucide-react';
import { User, PitchSize, ClubTeam } from '../types';
import { SCOTTER_TEAMS } from '../mockData';
import { sortTeamsByAge, sortUsersByTeamAge } from '../utils/bookingUtils';

interface CoachesSetupProps {
  users: User[];
  onUpdateUsers: (newUsers: User[]) => void;
  currentUser: User;
  onUpdateCurrentUser: (user: User) => void;
  teams?: ClubTeam[];
  onUpdateTeams?: (newTeams: ClubTeam[]) => void;
  onRenameTeam?: (oldName: string, newName: string, newPitchSize?: PitchSize) => void;
  onPromoteToNextSeason?: () => void;
}

export default function CoachesSetup({
  users,
  onUpdateUsers,
  currentUser,
  onUpdateCurrentUser,
  teams = SCOTTER_TEAMS,
  onUpdateTeams,
  onRenameTeam,
  onPromoteToNextSeason,
}: CoachesSetupProps) {
  // Setup state
  const [newCoachName, setNewCoachName] = useState('');
  const [newCoachPassword, setNewCoachPassword] = useState('');
  const [newCoachTeam, setNewCoachTeam] = useState('');
  const [newCoachRole, setNewCoachRole] = useState<'MANAGER' | 'ADMIN'>('MANAGER');
  
  // Team creation state
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamCategory, setNewTeamCategory] = useState('U10s');
  const [newTeamPitchSize, setNewTeamPitchSize] = useState<PitchSize>('7v7');

  // Team editing state
  const [editingTeamName, setEditingTeamName] = useState<string | null>(null);
  const [editTeamNewName, setEditTeamNewName] = useState('');
  const [editTeamPitchSize, setEditTeamPitchSize] = useState<PitchSize>('9v9');

  // Season Promotion Modal state
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);

  // Visibility and editing states for coach accounts
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

  // Add team handler
  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
      setError('Please provide a team name.');
      return;
    }

    if (teams.some((t) => t.name.toLowerCase() === newTeamName.trim().toLowerCase())) {
      setError(`A team named "${newTeamName.trim()}" already exists.`);
      return;
    }

    const createdTeam: ClubTeam = {
      id: `team-${Date.now()}`,
      name: newTeamName.trim(),
      category: newTeamCategory,
      pitchSize: newTeamPitchSize,
    };

    const updatedTeams = [...teams, createdTeam];
    if (onUpdateTeams) {
      onUpdateTeams(updatedTeams);
    }
    setSuccess(`Team "${createdTeam.name}" has been created!`);
    setNewTeamName('');
    setIsAddingTeam(false);
  };

  // Start editing team
  const startEditingTeam = (team: ClubTeam) => {
    setEditingTeamName(team.name);
    setEditTeamNewName(team.name);
    setEditTeamPitchSize(team.pitchSize);
  };

  // Save edited team
  const handleSaveEditedTeam = () => {
    if (!editingTeamName || !editTeamNewName.trim()) return;
    const oldName = editingTeamName;
    const newName = editTeamNewName.trim();

    if (onRenameTeam) {
      onRenameTeam(oldName, newName, editTeamPitchSize);
    } else if (onUpdateTeams) {
      const updated = teams.map((t) =>
        t.name === oldName ? { ...t, name: newName, pitchSize: editTeamPitchSize } : t
      );
      onUpdateTeams(updated);
    }

    setSuccess(`Team "${oldName}" renamed to "${newName}". Assigned coaches updated.`);
    setEditingTeamName(null);
  };

  // Delete team
  const handleDeleteTeam = (teamToDelete: ClubTeam) => {
    const updatedTeams = teams.filter((t) => t.id !== teamToDelete.id && t.name !== teamToDelete.name);
    if (onUpdateTeams) {
      onUpdateTeams(updatedTeams);
    }

    // Unassign coaches attached to this deleted team
    const updatedUsers = users.map((u) =>
      u.teamName === teamToDelete.name ? { ...u, teamName: undefined } : u
    );
    onUpdateUsers(updatedUsers);

    if (currentUser.teamName === teamToDelete.name) {
      onUpdateCurrentUser({ ...currentUser, teamName: undefined });
    }

    setSuccess(`Team "${teamToDelete.name}" removed successfully.`);
  };

  // Assign coach to team directly
  const handleAssignCoachToTeam = (coachId: string, teamName: string) => {
    if (!coachId) return;
    const targetCoach = users.find((u) => u.id === coachId);
    const updatedUsers = users.map((u) => {
      if (u.id === coachId) {
        return { ...u, teamName };
      }
      return u;
    });
    onUpdateUsers(updatedUsers);
    setSuccess(`Assigned ${targetCoach?.name || 'coach'} to ${teamName}.`);
  };

  // Unassign/Remove coach from team
  const handleUnassignCoach = (coachId: string) => {
    const targetCoach = users.find((u) => u.id === coachId);
    const updatedUsers = users.map((u) => {
      if (u.id === coachId) {
        return { ...u, teamName: undefined };
      }
      return u;
    });
    onUpdateUsers(updatedUsers);
    setSuccess(`Unassigned ${targetCoach?.name || 'coach'} from team.`);
  };

  // Trigger Season Promotion
  const handleConfirmSeasonPromotion = () => {
    if (onPromoteToNextSeason) {
      onPromoteToNextSeason();
    }
    setIsPromotionModalOpen(false);
    setSuccess('Season promotion completed! All teams promoted to next age group and coaches updated.');
  };

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
      teamName: newCoachTeam.trim() ? newCoachTeam.trim() : undefined,
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
    if (id === currentUser.id && users.length === 1) {
      setError('You cannot delete the only remaining account!');
      return;
    }
    setError(null);
    setSuccess(null);

    const coachToDelete = users.find((u) => u.id === id);
    const remainingUsers = users.filter((u) => u.id !== id);
    onUpdateUsers(remainingUsers);

    if (id === currentUser.id && remainingUsers.length > 0) {
      onUpdateCurrentUser(remainingUsers[0]);
    }

    setSuccess(`Coach account for "${coachToDelete?.name || 'User'}" removed successfully.`);
  };

  const startEditing = (user: User) => {
    setError(null);
    setSuccess(null);
    setEditingUserId(user.id);
    setEditName(user.name);
    setEditTeam(user.teamName || '');
    setEditPassword('');
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

    if (editPassword.trim() && editPassword.trim().length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    // Update list of users
    const updatedUsers = users.map((u) => {
      if (u.id === editingUserId) {
        const updated: User = {
          ...u,
          name: editName.trim(),
          role: editRole,
          teamName: editTeam.trim() ? editTeam.trim() : undefined,
        };
        if (editPassword.trim()) {
          updated.password = editPassword.trim();
        }
        return updated;
      }
      return u;
    });

    onUpdateUsers(updatedUsers);

    // If we edited the active logged-in user, sync current user state too
    if (editingUserId === currentUser.id) {
      const updatedSelf = updatedUsers.find((u) => u.id === currentUser.id);
      if (updatedSelf) {
        onUpdateCurrentUser(updatedSelf);
      }
    }

    setSuccess('Coach profile updated successfully!');
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

      {/* TEAM MANAGEMENT & SEASON PROMOTION CARD */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-900" />
              <span>Club Teams & Coach Assignments ({teams.length})</span>
            </h3>
            <p className="text-xs text-slate-500">
              Easily view assigned coaches per team, add or rename teams, or promote the whole club to the next season.
            </p>
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            {currentUser.role === 'ADMIN' && (
              <button
                type="button"
                onClick={() => setIsPromotionModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all uppercase tracking-wider"
                title="Promote all teams to next age group (e.g. U11 -> U12) while keeping assigned coaches"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Update to Next Season</span>
              </button>
            )}

            {currentUser.role === 'ADMIN' && (
              <button
                type="button"
                onClick={() => setIsAddingTeam(!isAddingTeam)}
                className="bg-blue-900 hover:bg-blue-800 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all uppercase tracking-wider"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Team</span>
              </button>
            )}
          </div>
        </div>

        {/* Inline Add Team Form */}
        <AnimatePresence>
          {isAddingTeam && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleCreateTeam}
              className="bg-slate-50 p-5 rounded-2xl border-2 border-blue-200 space-y-4 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span>Create New Club Team</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddingTeam(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase">Team Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. U11 Saints or U10 Colts"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-xs font-bold text-slate-800 focus:border-blue-900 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase">Age Category</label>
                  <select
                    value={newTeamCategory}
                    onChange={(e) => setNewTeamCategory(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-xs font-bold text-slate-800 focus:border-blue-900 focus:outline-none"
                  >
                    {['U7s', 'U8s', 'U9s', 'U10s', 'U11s', 'U12', 'U13', 'U14', 'U15', 'U17', 'U18', 'U12 Girls', 'U14 Girls', 'Veterans', 'Seniors'].map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase">Pitch Format</label>
                  <select
                    value={newTeamPitchSize}
                    onChange={(e) => setNewTeamPitchSize(e.target.value as PitchSize)}
                    className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-xs font-bold text-slate-800 focus:border-blue-900 focus:outline-none"
                  >
                    <option value="3v3">3v3 Pitch (Mini / U7s)</option>
                    <option value="5v5">5v5 Pitch (U7 - U8)</option>
                    <option value="7v7">7v7 Pitch (U9 - U10)</option>
                    <option value="9v9">9v9 Pitch (U11 - U12)</option>
                    <option value="11v11">11v11 Full Pitch (U13 - Adults)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingTeam(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-900 text-white font-extrabold px-5 py-2 rounded-lg text-xs hover:bg-blue-800 transition-colors uppercase tracking-wider"
                >
                  Save Team
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Club Teams & Coach Assignments Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 text-[11px] font-black text-slate-700 uppercase tracking-wider">
                <th className="p-3.5">Team Name</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Pitch Format</th>
                <th className="p-3.5">Assigned Coaches</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {sortTeamsByAge(teams).map((team) => {
                const assignedCoaches = users.filter((u) => u.teamName === team.name);
                const isEditingThis = editingTeamName === team.name;

                return (
                  <tr key={team.id || team.name} className="hover:bg-slate-50/80 transition-colors">
                    {/* Team Name */}
                    <td className="p-3.5 font-bold text-slate-900">
                      {isEditingThis ? (
                        <input
                          type="text"
                          value={editTeamNewName}
                          onChange={(e) => setEditTeamNewName(e.target.value)}
                          className="bg-white border-2 border-blue-900 rounded-lg py-1 px-2.5 text-xs font-bold text-slate-900 w-full min-w-[140px]"
                        />
                      ) : (
                        <span>{team.name}</span>
                      )}
                    </td>

                    {/* Category */}
                    <td className="p-3.5 font-semibold text-slate-600">
                      {team.category}
                    </td>

                    {/* Pitch Format */}
                    <td className="p-3.5">
                      {isEditingThis ? (
                        <select
                          value={editTeamPitchSize}
                          onChange={(e) => setEditTeamPitchSize(e.target.value as PitchSize)}
                          className="bg-white border border-slate-300 rounded-lg py-1 px-2 text-xs font-bold text-slate-800"
                        >
                          <option value="3v3">3v3 Pitch</option>
                          <option value="5v5">5v5 Pitch</option>
                          <option value="7v7">7v7 Pitch</option>
                          <option value="9v9">9v9 Pitch</option>
                          <option value="11v11">11v11 Full Pitch</option>
                        </select>
                      ) : (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-900">
                          {team.pitchSize}
                        </span>
                      )}
                    </td>

                    {/* Assigned Coaches with Removal & Assign Dropdown */}
                    <td className="p-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {assignedCoaches.map((coach) => (
                          <span
                            key={coach.id}
                            className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-950 px-2.5 py-1 rounded-lg text-xs font-bold shadow-2xs"
                          >
                            <UserCheck className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                            <span>{coach.name}</span>
                            {currentUser.role === 'ADMIN' && (
                              <button
                                type="button"
                                onClick={() => handleUnassignCoach(coach.id)}
                                className="ml-1 text-slate-400 hover:text-red-600 hover:bg-emerald-100/80 p-0.5 rounded transition-colors"
                                title={`Remove ${coach.name} from ${team.name}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        ))}

                        {currentUser.role === 'ADMIN' && (
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignCoachToTeam(e.target.value, team.name);
                              }
                            }}
                            className="bg-slate-50 border border-slate-300 text-slate-700 text-[11px] font-bold rounded-lg py-1 px-2 focus:border-blue-900 focus:outline-none"
                          >
                            <option value="">+ Assign Coach...</option>
                            {users.map((u) => {
                              if (u.teamName === team.name) return null;
                              return (
                                <option key={u.id} value={u.id}>
                                  {u.name} {u.teamName ? `(${u.teamName})` : '(unassigned)'}
                                </option>
                              );
                            })}
                          </select>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right">
                      {isEditingThis ? (
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingTeamName(null)}
                            className="p-1 text-slate-400 hover:text-slate-600"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveEditedTeam}
                            className="bg-blue-900 text-white px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 shadow-xs hover:bg-blue-800"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end space-x-1">
                          {currentUser.role === 'ADMIN' && (
                            <>
                              <button
                                type="button"
                                onClick={() => startEditingTeam(team)}
                                className="p-1.5 text-slate-500 hover:text-blue-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 font-bold text-xs"
                                title="Edit team details"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTeam(team)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete team"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

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
                      onChange={(e) => setNewCoachTeam(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg py-2.5 px-3 text-slate-800 font-semibold focus:border-blue-900 focus:outline-none transition-colors"
                    >
                      <option value="">-- None / Unassigned --</option>
                      {sortTeamsByAge(teams).map((t) => (
                        <option key={t.name} value={t.name}>
                          {t.name} ({t.pitchSize})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Role selection */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-extrabold text-slate-700 uppercase">System Permissions</label>
                    <select
                      value={newCoachRole}
                      onChange={(e) => setNewCoachRole(e.target.value as 'MANAGER' | 'ADMIN')}
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg py-2.5 px-3 text-slate-800 font-semibold focus:border-blue-900 focus:outline-none transition-colors"
                    >
                      <option value="MANAGER">MANAGER (Pitch Booker)</option>
                      <option value="ADMIN">ADMIN (Full Control + Coach)</option>
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
                        disabled={currentUser.role !== 'ADMIN' && !isEditingSelf}
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
                        <option value="">-- None / Unassigned --</option>
                        {sortTeamsByAge(teams).map((t) => (
                          <option key={t.name} value={t.name}>
                            {t.name} ({t.pitchSize})
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
                          value={editPassword}
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

          {/* Coach Directory / User List with Inline Editing */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Coach Directory ({users.length})
            </h3>
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {sortUsersByTeamAge(users).map((u) => {
                const isEditingThisUser = editingUserId === u.id;

                if (isEditingThisUser) {
                  return (
                    <div
                      key={u.id}
                      className="p-4 rounded-2xl border-2 border-blue-900 bg-blue-50/40 space-y-3 shadow-md"
                    >
                      <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                        <span className="text-xs font-black text-blue-900 uppercase">
                          Editing {u.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingUserId(null)}
                          className="text-slate-400 hover:text-slate-600 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Inline Form Fields */}
                      <div className="space-y-2.5 text-xs">
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                            Coach Name
                          </label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2.5 font-bold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                            Assigned Squad
                          </label>
                          <select
                            value={editTeam}
                            onChange={(e) => setEditTeam(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2.5 font-bold text-slate-800"
                          >
                            <option value="">-- None / Unassigned --</option>
                            {sortTeamsByAge(teams).map((t) => (
                              <option key={t.name} value={t.name}>
                                {t.name} ({t.pitchSize})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                            System Permissions
                          </label>
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as 'MANAGER' | 'ADMIN')}
                            className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2.5 font-bold text-slate-800"
                          >
                            <option value="MANAGER">MANAGER (Pitch Booker)</option>
                            <option value="ADMIN">ADMIN (Full Control + Coach)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                            New Password (Optional)
                          </label>
                          <input
                            type="password"
                            placeholder="Leave blank to keep current"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2.5 font-bold text-slate-900"
                          />
                        </div>

                        <div className="flex items-center justify-end space-x-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setEditingUserId(null)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-white text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            className="bg-blue-900 text-white font-extrabold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-xs hover:bg-blue-800"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Profile</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
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
                        <span className="font-bold text-xs text-slate-900 truncate max-w-[130px]">{u.name}</span>
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                          u.role === 'ADMIN'
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {u.role}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold truncate">
                        Squad: <strong className="text-slate-800">{u.teamName || 'None (Admin)'}</strong>
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
                          className="p-1.5 border border-slate-200 text-slate-500 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit coach profile & permissions"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete button */}
                      {currentUser.role === 'ADMIN' && (
                        <button
                          onClick={() => handleDeleteCoach(u.id)}
                          className="p-1.5 border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete coach account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* SEASON PROMOTION PREVIEW MODAL */}
      <AnimatePresence>
        {isPromotionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-amber-100 text-amber-900 rounded-2xl">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                      Promote Club to Next Season
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Review how teams will be renamed for the upcoming season.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPromotionModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Informational banner */}
              <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-xs text-amber-950 leading-relaxed font-medium">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold uppercase tracking-wide text-[10px] text-amber-800">
                    Important Season Update Rule
                  </p>
                  <p className="mt-0.5">
                    Coaches remain assigned to their existing team entity (e.g. ChrisW stays with U12 Saints). Past pitch bookings stay linked to the coach without transferring to another coach.
                  </p>
                </div>
              </div>

              {/* Promotion Preview Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Promotion Preview ({teams.length} Teams)
                </h4>

                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
                  {teams.map((t) => {
                    const match = t.name.match(/U(\d+)/i) || t.name.match(/Under\s*(\d+)/i);
                    let newName = t.name;
                    let newCategory = t.category;
                    let newPitchSize = t.pitchSize;

                    if (match) {
                      const age = parseInt(match[1], 10);
                      const nextAge = age + 1;
                      newName = t.name.replace(/U\d+/i, `U${nextAge}`).replace(/Under\s*\d+/i, `U${nextAge}`);
                      newCategory = t.category.replace(/U\d+/i, `U${nextAge}`).replace(/Under\s*\d+/i, `U${nextAge}`);
                      if (nextAge <= 8) newPitchSize = '5v5';
                      else if (nextAge <= 10) newPitchSize = '7v7';
                      else if (nextAge <= 12) newPitchSize = '9v9';
                      else newPitchSize = '11v11';
                    }

                    const assigned = users.filter((u) => u.teamName === t.name);

                    return (
                      <div key={t.id || t.name} className="p-3 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between gap-4 text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-500 line-through text-[11px]">{t.name}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                            <span className="font-black text-slate-900 text-xs bg-amber-100 text-amber-950 px-2 py-0.5 rounded">{newName}</span>
                          </div>
                          <p className="text-[10px] text-slate-500">Format: {t.pitchSize} → {newPitchSize}</p>
                        </div>

                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase">Coach</p>
                          <p className="font-bold text-slate-800 text-[11px]">
                            {assigned.length > 0 ? assigned.map(a => a.name).join(', ') : 'Unassigned'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPromotionModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSeasonPromotion}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all uppercase tracking-wider"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Confirm & Promote All Teams</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
