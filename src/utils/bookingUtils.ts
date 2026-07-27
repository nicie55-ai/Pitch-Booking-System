/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Booking, User } from '../types';

/**
 * Extracts the age token (e.g. u7, u11, vets) from a team name.
 */
export function getAgeToken(name: string): string | null {
  const normalized = name.toLowerCase();
  const match = normalized.match(/u\d+/i);
  if (match) return match[0].toLowerCase();
  if (normalized.includes('vet') || normalized.includes('vets') || normalized.includes('veteran')) {
    return 'vets';
  }
  return null;
}

/**
 * Checks if two team names are a match (either identical, containing each other, or sharing the same age group token).
 */
export function isTeamMatch(userTeam?: string, bookingTeam?: string): boolean {
  if (!userTeam || !bookingTeam) return false;

  const ut = userTeam.toLowerCase().trim();
  const bt = bookingTeam.toLowerCase().trim();

  // Direct match or partial containing
  if (ut === bt || bt.includes(ut) || ut.includes(bt)) {
    return true;
  }

  // Age token match (e.g. "u12" matches "Scotter United U12s Juniors" and "Scotter United U12 Colts")
  const userAge = getAgeToken(ut);
  const bookingAge = getAgeToken(bt);

  if (userAge && bookingAge && userAge === bookingAge) {
    return true;
  }

  return false;
}

/**
 * Extracts numeric age rank from a team name string (e.g. "U7" -> 7, "U12 Girls" -> 12.5, "U14" -> 14).
 */
export function getTeamAgeRank(teamNameStr?: string): number {
  if (!teamNameStr) return 999;
  const str = teamNameStr.trim().toUpperCase();
  const match = str.match(/U(\d+)/i);
  if (match) {
    let rank = parseInt(match[1], 10);
    if (str.includes('GIRLS')) {
      rank += 0.5;
    }
    return rank;
  }
  if (str.includes('VET') || str.includes('VETERAN')) return 900;
  if (str.includes('SENIOR') || str.includes('ADULT')) return 950;
  return 800;
}

/**
 * Sorts array of teams by age order starting from U7 up to U14+.
 */
export function sortTeamsByAge<T extends { name: string; category?: string }>(teams: T[]): T[] {
  return [...teams].sort((a, b) => {
    const rankA = getTeamAgeRank(a.name || a.category);
    const rankB = getTeamAgeRank(b.name || b.category);
    if (rankA !== rankB) return rankA - rankB;
    return (a.name || '').localeCompare(b.name || '');
  });
}

/**
 * Sorts users/coaches by role (ADMIN first) then by assigned team age rank (U7 -> U14).
 */
export function sortUsersByTeamAge(users: User[]): User[] {
  return [...users].sort((a, b) => {
    if (a.role === 'ADMIN' && b.role !== 'ADMIN') return -1;
    if (a.role !== 'ADMIN' && b.role === 'ADMIN') return 1;
    const rankA = getTeamAgeRank(a.teamName);
    const rankB = getTeamAgeRank(b.teamName);
    if (rankA !== rankB) return rankA - rankB;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Checks if a manager has permission to unbook/cancel a booking.
 * - Admins can cancel anything.
 * - Managers can cancel bookings they created.
 * - Managers can cancel FA system bookings for their own team/age group.
 */
export function canManagerUnbook(currentUser: User, booking: Booking): boolean {
  if (currentUser.role === 'ADMIN') return true;
  if (currentUser.role !== 'MANAGER') return false;

  // Created by the user
  if (booking.managerId === currentUser.id) return true;

  // FA Auto-imported fixture matching the manager's team or age category
  if (booking.managerId === 'fa-auto-import') {
    return isTeamMatch(currentUser.teamName, booking.teamName);
  }

  return false;
}
