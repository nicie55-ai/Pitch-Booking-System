/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserIcon, Shield, UserCircle, RefreshCw } from 'lucide-react';
import { User } from '../types';

const crestLogo = "/src/assets/images/scotter_united_crest_1782420923383.jpg";

interface HeaderProps {
  currentUser: User;
  users: User[];
  onUserChange: (user: User) => void;
}

export default function Header({ currentUser, users, onUserChange }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="bg-[#002366] text-white shadow-md relative z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo & Branding */}
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-white rounded-full p-0.5 border border-white shadow-md overflow-hidden flex items-center justify-center">
              <img
                src={crestLogo}
                alt="Scotter United JFC Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                SCOTTER UNITED JFC
              </h1>
              <p className="text-xs md:text-sm font-semibold text-blue-200 tracking-widest uppercase">
                Pitch Booking & Diary System
              </p>
            </div>
          </div>

          {/* User Role Switching Portal */}
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center space-x-2 md:space-x-3 bg-blue-800/40 border border-blue-400/30 px-3.5 py-2 rounded-lg text-white hover:bg-blue-800/60 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {currentUser.role === 'ADMIN' ? (
                <Shield className="w-5 h-5 text-blue-300" />
              ) : (
                <UserCircle className="w-5 h-5 text-blue-300" />
              )}
              <div className="text-left hidden sm:block">
                <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider leading-none mb-0.5">
                  Logged in as
                </p>
                <p className="text-sm font-extrabold text-white leading-none">
                  {currentUser.name}
                </p>
              </div>
              <RefreshCw className="w-4 h-4 text-blue-200 opacity-80 animate-pulse" />
            </button>

            {/* Dropdown list of coaches / admin */}
            <AnimatePresence>
              {isOpen && (
                <>
                  {/* Backdrop for closing dropdown */}
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-40 overflow-hidden"
                  >
                    <div className="p-3 bg-blue-900 text-white">
                      <p className="text-xs font-bold uppercase tracking-wider opacity-85">
                        Select Booking Persona
                      </p>
                      <p className="text-xs text-blue-100 mt-1">
                        Switch accounts to simulate requests & approvals.
                      </p>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {users.map((user) => {
                        const isSelected = user.id === currentUser.id;
                        return (
                          <button
                            key={user.id}
                            onClick={() => {
                              onUserChange(user);
                              setIsOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 flex items-start space-x-3 transition-colors hover:bg-slate-50 ${
                              isSelected ? 'bg-blue-50/50' : ''
                            }`}
                          >
                            <div className="mt-1">
                              {user.role === 'ADMIN' ? (
                                <Shield className="w-4 h-4 text-blue-800" />
                              ) : (
                                <UserIcon className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center">
                                <span className={`text-sm font-semibold ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                                  {user.name}
                                </span>
                                {user.role === 'ADMIN' && (
                                  <span className="ml-2 bg-blue-900 text-white text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">
                                    Admin
                                  </span>
                                )}
                              </div>
                              {user.teamName && (
                                <p className="text-xs text-slate-500 font-medium">
                                  {user.teamName}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
