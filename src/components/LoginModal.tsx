/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, User as UserIcon, Shield, Sparkles, CheckCircle2, AlertCircle, X, Mail } from 'lucide-react';
import { User } from '../types';

const crestLogo = "/src/assets/images/scotter_united_crest_1782589082484.jpg";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onLoginSuccess: (user: User) => void;
  onUpdateUserEmail: (userId: string, email: string) => void;
  isForced?: boolean;
}

export default function LoginModal({
  isOpen,
  onClose,
  users,
  onLoginSuccess,
  onUpdateUserEmail,
  isForced = false,
}: LoginModalProps) {
  const [activeTab, setActiveTab] = useState<'password' | 'sso'>('password');

  // Password Login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Google SSO state
  const [ssoEmail, setSsoEmail] = useState('');
  const [ssoError, setSsoError] = useState<string | null>(null);

  // Post-login Google Email Prompt state
  const [loggedInUserForEmailPrompt, setLoggedInUserForEmailPrompt] = useState<User | null>(null);
  const [promptEmail, setPromptEmail] = useState('');

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
        (u.googleEmail && u.googleEmail.toLowerCase() === cleanUsername)
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
    if (!matchedUser.googleEmail) {
      // Ask for Google SSO email
      setLoggedInUserForEmailPrompt(matchedUser);
    } else {
      onLoginSuccess(matchedUser);
      onClose();
    }
  };

  const handleSsoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSsoError(null);

    const cleanEmail = ssoEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setSsoError('Please enter your Google email address.');
      return;
    }

    const matchedUser = users.find(
      (u) => u.googleEmail && u.googleEmail.toLowerCase() === cleanEmail
    );

    if (!matchedUser) {
      setSsoError(
        'No Scotter United JFC account is linked to this Google email. Please log in with your username and password first to link your account.'
      );
      return;
    }

    onLoginSuccess(matchedUser);
    onClose();
  };

  const handleSavePromptEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (loggedInUserForEmailPrompt && promptEmail.trim()) {
      onUpdateUserEmail(loggedInUserForEmailPrompt.id, promptEmail.trim().toLowerCase());
      const updatedUser = {
        ...loggedInUserForEmailPrompt,
        googleEmail: promptEmail.trim().toLowerCase(),
        googleLinked: true,
      };
      onLoginSuccess(updatedUser);
    } else if (loggedInUserForEmailPrompt) {
      onLoginSuccess(loggedInUserForEmailPrompt);
    }
    setLoggedInUserForEmailPrompt(null);
    onClose();
  };

  const handleSkipPromptEmail = () => {
    if (loggedInUserForEmailPrompt) {
      onLoginSuccess(loggedInUserForEmailPrompt);
    }
    setLoggedInUserForEmailPrompt(null);
    onClose();
  };

  return (
    <div
      onClick={isForced ? undefined : onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
        <AnimatePresence mode="wait">
        {loggedInUserForEmailPrompt ? (
          /* STEP 2: Link Google Email Prompt */
          <motion.div
            key="email-prompt"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-slate-200 relative space-y-6"
          >
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-blue-50 text-blue-900 rounded-full mx-auto flex items-center justify-center border-2 border-blue-200 shadow-sm">
                <Mail className="w-8 h-8 text-blue-900" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Link Google Single Sign-On
              </h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Welcome, <span className="font-bold text-slate-900">{loggedInUserForEmailPrompt.name}</span>! Enter your Google email address to enable passwordless Single Sign-On (SSO) in the future.
              </p>
            </div>

            <form onSubmit={handleSavePromptEmail} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Google Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. coach@gmail.com"
                    value={promptEmail}
                    onChange={(e) => setPromptEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-9 pr-3 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-900 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="submit"
                  className="w-full bg-blue-900 hover:bg-blue-800 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save & Enable Google SSO</span>
                </button>
                <button
                  type="button"
                  onClick={handleSkipPromptEmail}
                  className="w-full text-slate-500 hover:text-slate-800 font-bold py-2 text-xs transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          /* STEP 1: Username/Password Login or SSO Login */
          <motion.div
            key="login-form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
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
                  {isForced ? 'Login Required' : 'Secure Coach & Admin Login'}
                </p>
              </div>
            </div>

            {isForced && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-950 font-bold flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-900 flex-shrink-0" />
                <span>Please log in to your Coach or Admin profile to access the pitch diary.</span>
              </div>
            )}

            {/* Login Mode Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('password');
                  setError(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'password'
                    ? 'bg-white text-blue-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Password</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('sso');
                  setSsoError(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'sso'
                    ? 'bg-white text-blue-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Google SSO</span>
              </button>
            </div>

            {/* PASSWORD TAB */}
            {activeTab === 'password' && (
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
                      placeholder="Enter username"
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
                  className="w-full bg-blue-900 hover:bg-blue-800 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 pt-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Log In to Account</span>
                </button>
              </form>
            )}

            {/* GOOGLE SSO TAB */}
            {activeTab === 'sso' && (
              <form onSubmit={handleSsoSubmit} className="space-y-4">
                {ssoError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <span>{ssoError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                    Linked Google Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. coach@gmail.com"
                      value={ssoEmail}
                      onChange={(e) => setSsoEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-9 pr-3 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-900 focus:outline-none transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium pt-0.5">
                    Enter the Google email address linked to your coach account.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Single Sign-On with Google</span>
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
