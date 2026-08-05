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
 * Normalizes a team name string for exact team comparisons.
 * Standardizes prefixes (Scotter United, JFC), trailing age 's' (U12s -> U12), and synonyms (Veterans -> Vets).
 */
export function normalizeTeamName(name?: string): string {
  if (!name) return '';
  let str = name.toLowerCase().trim();
  str = str
    .replace(/scotter\s+united/g, '')
    .replace(/scotter/g, '')
    .replace(/jfc/g, '')
    .replace(/fc/g, '')
    .trim();
  if (str.includes('vet')) return 'vets';
  str = str.replace(/\bu(\d+)s\b/g, 'u$1');
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Checks if two team names are an exact match for the same specific team.
 */
export function isTeamMatch(userTeam?: string, bookingTeam?: string): boolean {
  if (!userTeam || !bookingTeam) return false;

  const normUser = normalizeTeamName(userTeam);
  const normBooking = normalizeTeamName(bookingTeam);

  if (!normUser || !normBooking) return false;

  return normUser === normBooking;
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
 * Safely parses a 'YYYY-MM-DD' date string into a local Date object (midnight local time),
 * avoiding timezone offset shifts caused by `new Date("YYYY-MM-DD")` parsing in UTC.
 */
export function parseDateLocal(dateStr: string): Date {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/**
 * Formats a Date object to local 'YYYY-MM-DD' string without timezone offset drift.
 */
export function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats a 'YYYY-MM-DD' date string or Date object into standard UK format, e.g. "22 Aug 2026".
 * - If includeWeekday: true -> "Sat, 22 Aug 2026"
 * - If includeYear: false -> "22 Aug" (or "Sat, 22 Aug")
 */
export function formatDateUK(
  dateInput?: string | Date | null,
  options: { includeWeekday?: boolean; includeYear?: boolean } = { includeYear: true }
): string {
  if (!dateInput) return '';
  let d: Date;
  if (typeof dateInput === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      d = parseDateLocal(dateInput);
    } else {
      d = new Date(dateInput);
    }
  } else {
    d = dateInput;
  }

  if (isNaN(d.getTime())) return String(dateInput);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const dayNum = d.getDate();
  const monthStr = months[d.getMonth()];
  const yearStr = d.getFullYear();

  let formatted = `${dayNum} ${monthStr}`;
  if (options.includeYear !== false) {
    formatted += ` ${yearStr}`;
  }
  if (options.includeWeekday) {
    formatted = `${daysMap[d.getDay()]}, ${formatted}`;
  }
  return formatted;
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
