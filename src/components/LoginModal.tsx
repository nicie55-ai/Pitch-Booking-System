/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, User as UserIcon, Shield, Sparkles, CheckCircle2, AlertCircle, X, Mail, Loader2 } from 'lucide-react';
import { User } from '../types';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';

const crestLogo = "https://scontent.flba3-1.fna.fbcdn.net/v/t39.30808-6/532879163_1049671360484279_2775875583844224736_n.jpg?stp=dst-jpg_tt6&cstp=mx2048x2048&ctp=s2048x2048&_nc_cat=104&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=TpepDxCIu0oQ7kNvwEjFmJo&_nc_oc=AdrOXpIxIdKo5Uu0YmupwagkZ0seTNbqr_sTpn_Tg820H6-mWU5m87XdJtgmi8PWkNKIaNWrLs0DCmWf4Y8LMJVO&_nc_zt=23&_nc_ht=scontent.flba3-1.fna&_nc_gid=N9cmcQ6fJTelyxScaauaOQ&_nc_ss=7b2a8&oh=00_AQEg1QZ6AQnbndQ8iU1F3Pbw-zlEGXuSaxiOOF0GNiPyGA&oe=6A79A212";

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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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
        (u.id === 'admin-scotteradmin' && (cleanUsername === 'scotteradmin' || cleanUsername === 'scotter exec team')) ||
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

  const handleGooglePopupLogin = async () => {
    setSsoError(null);
    setIsGoogleLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const authenticatedEmail = result.user?.email;

      if (!authenticatedEmail) {
        setSsoError('Could not retrieve an email address from Google authentication.');
        setIsGoogleLoading(false);
        return;
      }

      const cleanEmail = authenticatedEmail.toLowerCase();
      const matchedUser = users.find(
        (u) => u.googleEmail && u.googleEmail.toLowerCase() === cleanEmail
      );

      if (!matchedUser) {
        setSsoError(
          `Google authenticated as (${authenticatedEmail}), but no Scotter United JFC account is linked to this Google email. Please log in with your username and password first to link your account.`
        );
        setSsoEmail(authenticatedEmail);
        setIsGoogleLoading(false);
        return;
      }

      onLoginSuccess(matchedUser);
      onClose();
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setSsoError('Google Sign-In popup was closed before completing authentication.');
      } else if (err.code === 'auth/popup-blocked') {
        setSsoError('Popups are blocked by your browser. Please allow popups or use your email address below.');
      } else {
        setSsoError(`Google Sign-In error: ${err.message || 'Authentication failed'}. You can also type your linked Google email below.`);
      }
    } finally {
      setIsGoogleLoading(false);
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
              <div className="space-y-4">
                {ssoError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <span>{ssoError}</span>
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-3">
                  <p className="text-xs text-slate-600 font-bold leading-relaxed">
                    Authenticate securely through Google OAuth to verify your identity and log into your Scotter United JFC account.
                  </p>
                  
                  <button
                    type="button"
                    onClick={handleGooglePopupLogin}
                    disabled={isGoogleLoading}
                    className="w-full bg-white hover:bg-slate-50 text-slate-800 font-extrabold py-3 px-4 rounded-xl text-xs border-2 border-slate-200 shadow-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-900" />
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                    )}
                    <span>{isGoogleLoading ? 'Authenticating with Google...' : 'Sign In with Google Account'}</span>
                  </button>
                </div>

                <div className="relative flex items-center justify-center my-2">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-3 text-[10px] font-extrabold uppercase text-slate-400 absolute">Or enter linked email</span>
                </div>

                <form onSubmit={handleSsoSubmit} className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
                      Linked Google Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="email"
                        placeholder="e.g. coach@gmail.com"
                        value={ssoEmail}
                        onChange={(e) => setSsoEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 pl-9 pr-3 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-900 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-extrabold py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <span>Log In via Linked Email</span>
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
