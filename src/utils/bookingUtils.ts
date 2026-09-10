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
    .replace(/scotter\s+united\s+junior\s+football\s+club/gi, ' ')
    .replace(/scotter\s+united\s+j\.?f\.?c\.?/gi, ' ')
    .replace(/scotter\s+united\s+f\.?c\.?/gi, ' ')
    .replace(/scotter\s+junior\s+football\s+club/gi, ' ')
    .replace(/scotter\s+j\.?f\.?c\.?/gi, ' ')
    .replace(/scotter\s+f\.?c\.?/gi, ' ')
    .replace(/scotter\s+united/gi, ' ')
    .replace(/\bscotter\b/gi, ' ')
    .replace(/\bjfc\b/gi, ' ')
    .replace(/\bfc\b/gi, ' ')
    .trim();

  if (str.includes('vet')) return 'vets';

  // Standardize "under 13" or "u-13" or "u 13" to "u13"
  str = str.replace(/(?:under\s*|u[\s-]*)(\d{1,2})s?\b/gi, 'u$1');

  // If Saints, Colts, or Girls is present, strip "Junior" or "Juniors" as it's purely club nomenclature
  if (/\b(saints?|colts?|girls?)\b/i.test(str)) {
    str = str.replace(/\bjuniors?\b/gi, ' ').trim();
  }

  // Canonical tokenization: age + specific sub-team
  const ageMatch = str.match(/\bu(\d{1,2})\b/i);
  let suffix = '';
  if (/\bsaints?\b/i.test(str)) suffix = 'saints';
  else if (/\bcolts?\b/i.test(str)) suffix = 'colts';
  else if (/\bgirls?\b/i.test(str) || /\b(women|womens|female|w&g)\b/i.test(str)) suffix = 'girls';
  else if (/\bjuniors?\b/i.test(str)) suffix = 'juniors';

  if (ageMatch && suffix) {
    return `${ageMatch[0].toLowerCase()} ${suffix}`;
  }
  if (ageMatch) {
    return ageMatch[0].toLowerCase();
  }

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
 * Formats a Date or 'YYYY-MM-DD' ISO date string into numeric UK format: 'DD/MM/YYYY'.
 */
export function formatUKDateNumeric(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [y, m, d] = dateInput.split('-');
    return `${d}/${m}/${y}`;
  }
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (!d || isNaN(d.getTime())) return String(dateInput || '');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Parses any date format (UK 'DD/MM/YYYY', 'DD/MM/YY', 'D/M/YYYY', 'YYYY-MM-DD') into ISO 'YYYY-MM-DD'.
 */
export function parseUKDateToISO(input?: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const m = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    const day = m[1].padStart(2, '0');
    const month = m[2].padStart(2, '0');
    let year = m[3];
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }
  return trimmed;
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

/**
 * Detects if a team name or fixture refers to Scotter United U14 Girls.
 */
export function isU14GirlsTeam(teamName?: string): boolean {
  if (!teamName) return false;
  const lower = teamName.toLowerCase();
  return lower.includes('u14') && (lower.includes('girl') || lower.includes('girls'));
}

/**
 * Checks if there is a mutual exclusion constraint between 5v5 pitch and 11v11 pitch.
 * Rule: The 5v5 pitch cannot be used when the U14 Girls play on the 11v11 pitch.
 */
export function check5v5And11v11U14GirlsConflict(
  pitchA: string,
  teamA: string,
  pitchB: string,
  teamB: string
): boolean {
  if (pitchA === '5v5' && pitchB === '11v11') {
    return isU14GirlsTeam(teamB);
  }
  if (pitchA === '11v11' && pitchB === '5v5') {
    return isU14GirlsTeam(teamA);
  }
  return false;
}

/**
 * Parses time string HH:MM to total minutes from midnight.
 */
export function parseTimeToMinutes(t: string): number {
  if (!t || !t.includes(':')) return 0;
  const [h, m] = t.split(':').map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

