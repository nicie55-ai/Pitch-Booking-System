/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lock, User as UserIcon, AlertCircle, X } from 'lucide-react';
import { User } from '../types';

const crestLogo = "https://scontent.flba3-2.fna.fbcdn.net/v/t39.30808-6/532879163_1049671360484279_2775875583844224736_n.jpg?stp=dst-jpg_tt6&cstp=mx2048x2048&ctp=s2048x2048&_nc_cat=104&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=eCF7zTVkUQEQ7kNvwEacYoT&_nc_oc=AdrDmMD5XKLVxZ040zbGBw64OXnv61rCrzxc2w1AyzQdfGaqzRiL9wrWj9iLvXk9vDgXTsDOCjlT1JD9rdcpkvoF&_nc_zt=23&_nc_ht=scontent.flba3-2.fna&_nc_gid=kh5cgTy1FKc7Hnz65yn4fA&_nc_ss=7b289&oh=00_AQJhKqqDIV_LknF_qzey2pmOYWFpI8zSGEW7BOM5ExeuCw&oe=6AAF7752";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onLoginSuccess: (user: User) => void;
  isForced?: boolean;
}

export default function LoginModal({
  isOpen,
  onClose,
  users,
  onLoginSuccess,
  isForced = false,
}: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setError('Please enter both your username and password.');
      return;
    }

    const matchedUser = users.find(
      (u) =>
        u.name.toLowerCase() === cleanUsername ||
        u.id.toLowerCase() === cleanUsername ||
        (u.id === 'admin-scotteradmin' && (cleanUsername === 'scotteradmin' || cleanUsername === 'scotter admin' || cleanUsername === 'scotter exec team')) ||
        (u.id === 'admin-adamh' && (cleanUsername === 'adamh'))
    );

    if (!matchedUser) {
      setError('Username or Coach Name not found. Please check spelling.');
      return;
    }

    if (matchedUser.password && matchedUser.password !== cleanPassword) {
      setError('Incorrect password. Please try again.');
      return;
    }

    // Login successful
    onLoginSuccess(matchedUser);
    onClose();
  };

  return (
    <div
      onClick={isForced ? undefined : onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
        <div
          className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-slate-200 relative space-y-6"
        >
          {!isForced && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Header branding */}
          <div className="flex items-center space-x-3.5 border-b border-slate-100 pb-5">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-900 shadow-sm flex-shrink-0">
              <img src={crestLogo} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                SCOTTER UNITED JFC
              </h3>
              <p className="text-xs text-blue-900 font-extrabold uppercase tracking-wider">
                {isForced ? 'Login Required' : 'Coach & Admin Login'}
              </p>
            </div>
          </div>

          {isForced && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-950 font-bold flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-900 flex-shrink-0" />
              <span>Please log in to your Coach or Admin profile to access the pitch diary.</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                Username / Coach Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. ScotterAdmin, AdamH, AnnaW"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-9 pr-3 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-900 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-9 pr-3 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-900 focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-900 hover:bg-blue-800 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 pt-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Log In to Account</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
