/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Shield, UserCircle, LogOut } from 'lucide-react';
import { User } from '../types';

const crestLogo = "https://scontent.flba3-1.fna.fbcdn.net/v/t39.30808-6/532879163_1049671360484279_2775875583844224736_n.jpg?stp=dst-jpg_tt6&cstp=mx2048x2048&ctp=s2048x2048&_nc_cat=104&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=yQERBlLgKlQQ7kNvwGGP89g&_nc_oc=Ado7n_EZXrVrOS6njNvWtnyzBK03xbFfrH-GjasCny1vTx9tG7bz-kdCu72pprbQxw-Sue_FCO62d1bO3WEyrZ2y&_nc_zt=23&_nc_ht=scontent.flba3-1.fna&_nc_gid=KCk6menvg1d-eIAovc2YEA&_nc_ss=7b2a8&oh=00_AQFAZzWysdEiqUrM7l4lPtWX-N6IF--Hj7UdFJw5wSS3FQ&oe=6A706792";

interface HeaderProps {
  currentUser: User | null;
  users: User[];
  onOpenLoginModal: () => void;
  onLogout: () => void;
}

export default function Header({ currentUser, onOpenLoginModal, onLogout }: HeaderProps) {
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

          {/* Secure User Profile & Logout / Account Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {currentUser ? (
              <>
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

                {currentUser.role === 'ADMIN' && (
                  <button
                    onClick={onOpenLoginModal}
                    className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-3 py-2 rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                    title="Switch coach or admin account"
                  >
                    <span>Switch</span>
                  </button>
                )}

                <button
                  onClick={onLogout}
                  className="flex items-center space-x-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold px-3 py-2 rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                  title="Log out of account"
                >
                  <LogOut className="w-4 h-4 text-white" />
                  <span>Log Out</span>
                </button>
              </>
            ) : (
              <button
                onClick={onOpenLoginModal}
                className="flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer"
              >
                <span>Log In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
