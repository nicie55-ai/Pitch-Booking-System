/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Shield, UserCircle, LogOut } from 'lucide-react';
import { User } from '../types';

const crestLogo = "/src/assets/images/scotter_united_crest_1782589082484.jpg";

interface HeaderProps {
  currentUser: User;
  users: User[];
  onOpenLoginModal: () => void;
}

export default function Header({ currentUser, onOpenLoginModal }: HeaderProps) {
  return (
    <header className="bg-[#002366] text-white shadow-md relative z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo & Branding */}
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-white rounded-full border-2 border-white shadow-md overflow-hidden flex items-center justify-center">
              <img
                src={crestLogo}
                alt="Scotter United JFC Logo"
                className="w-full h-full object-cover"
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

          {/* Secure User Profile & Account Switcher Button */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-3 bg-blue-800/40 border border-blue-400/30 px-3.5 py-2 rounded-xl text-white">
              {currentUser.role === 'ADMIN' ? (
                <Shield className="w-5 h-5 text-blue-300" />
              ) : (
                <UserCircle className="w-5 h-5 text-blue-300" />
              )}
              <div className="text-left">
                <div className="flex items-center space-x-1.5">
                  <span className="text-sm font-extrabold text-white leading-none">
                    {currentUser.name}
                  </span>
                  {currentUser.role === 'ADMIN' && (
                    <span className="bg-blue-300 text-blue-950 text-[9px] px-1.5 py-0.5 rounded font-black uppercase">
                      Admin
                    </span>
                  )}
                </div>
                {currentUser.teamName && (
                  <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider leading-none mt-1">
                    {currentUser.teamName}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={onOpenLoginModal}
              className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              title="Log into another account"
            >
              <LogOut className="w-4 h-4 text-slate-950" />
              <span>Switch Account</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
