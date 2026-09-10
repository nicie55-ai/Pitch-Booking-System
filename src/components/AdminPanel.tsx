/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, 
  CalendarRange, 
  RefreshCw, 
  FileDown, 
  Search, 
  Check, 
  AlertTriangle, 
  Layers, 
  Plus, 
  Users, 
  Radio, 
  Clock, 
  ArrowRight,
  Sparkles,
  Info,
  Trash2,
  X,
  HelpCircle,
  Wand2,
  CheckCircle,
  Key,
  ShieldAlert,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowRightLeft,
  Shield,
  Lock
} from 'lucide-react';
import { PitchSize, Booking, BookingStatus, PitchConfig, User, ClubTeam } from '../types';
import { SCOTTER_TEAMS, MOCK_FA_FULLTIME_FIXTURES, FAFixture } from '../mockData';
import { canManagerUnbook, isTeamMatch, normalizeTeamName, sortTeamsByAge, sortUsersByTeamAge, parseDateLocal, formatDateLocal, formatDateUK, formatUKDateNumeric, parseUKDateToISO, check5v5And11v11U14GirlsConflict, isU14GirlsTeam } from '../utils/bookingUtils';

// --- Top-Level Stateless Helpers (Hoisted and safe from Temporal Dead Zone) ---

function parseTimeToMinutes(t: string): number {
  if (!t || typeof t !== 'string' || !t.includes(':')) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function getAdminEndTimeForSlot(pId: PitchSize, dateStr: string, slot: string): string {
  if (!slot || !dateStr || !slot.includes(':')) return '';
  const d = parseDateLocal(dateStr);
  const day = d.getDay();
  const isWeekend = day === 0 || day === 6;
  let duration = 60; // default 1 hour
  
  if (isWeekend) {
    if (pId === '11v11') {
      duration = 120;
    } else if (pId === '9v9') {
      duration = 90;
    } else if (pId === '7v7') {
      duration = 75;
    } else if (pId === '5v5') {
      duration = 60;
    }
  } else {
    duration = 60;
  }
  
  const [hStr, mStr] = slot.split(':');
  const hNum = parseInt(hStr, 10);
  const mNum = parseInt(mStr, 10);
  if (isNaN(hNum) || isNaN(mNum)) return '';
  
  const totalMinutes = hNum * 60 + mNum + duration;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function extractDateAndExplicitTime(str: string): { date: string; timeSlot: string; hasExplicitTime: boolean } {
  let date = '';
  let timeSlot = '';
  let hasExplicitTime = false;

  if (!str) return { date, timeSlot, hasExplicitTime };

  // 1. Check for time in HH:MM or HH.MM or HH:MMam/pm
  const timeRegex = /\b(\d{1,2})[:.](\d{2})(?::\d{2})?\s*(am|pm)?\b/i;
  const timeMatch = str.match(timeRegex);
  if (timeMatch) {
    let hr = parseInt(timeMatch[1], 10);
    const min = timeMatch[2];
    const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : '';
    if (ampm === 'pm' && hr < 12) hr += 12;
    if (ampm === 'am' && hr === 12) hr = 0;
    if (hr >= 0 && hr <= 23 && parseInt(min, 10) >= 0 && parseInt(min, 10) <= 59) {
      timeSlot = `${String(hr).padStart(2, '0')}:${min}`;
      hasExplicitTime = true;
    }
  }

  // 2. Check for numeric date (UK format DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY)
  const numericDateRegex = /\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/;
  const numMatch = str.match(numericDateRegex);
  if (numMatch) {
    let day = parseInt(numMatch[1], 10);
    let month = parseInt(numMatch[2], 10);
    let year = numMatch[3];
    if (year.length === 2) year = '20' + year;
    // UK format: day is first, month is second
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 3. Check for ISO date YYYY-MM-DD
  if (!date) {
    const isoDateRegex = /\b(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})\b/;
    const isoMatch = str.match(isoDateRegex);
    if (isoMatch) {
      let year = isoMatch[1];
      let month = parseInt(isoMatch[2], 10);
      let day = parseInt(isoMatch[3], 10);
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }

  // 4. Check for written date, e.g. 6th Sep 2026 or 06 September 2026
  if (!date) {
    const writtenRegex = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\s+(\d{2,4}))?\b/i;
    const wMatch = str.match(writtenRegex);
    if (wMatch) {
      const day = parseInt(wMatch[1], 10);
      const mStr = wMatch[2].toLowerCase();
      const months: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
      const month = months[mStr];
      let year = wMatch[3] || '2026';
      if (year.length === 2) year = '20' + year;
      if (day >= 1 && day <= 31 && month) {
        date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }

  return { date, timeSlot, hasExplicitTime };
}

function parseFullTimeTabLine(line: string) {
  const cols = line.split('\t').map(c => c.trim());
  if (cols.length < 3) return null;

  const vsIdx = cols.findIndex(c => c.toLowerCase() === 'vs' || c.toLowerCase() === 'v');
  if (vsIdx === -1) return null;

  let date = '';
  let timeSlot = '';
  let hasExplicitTime = false;

  // Search for date and time across all columns
  for (let i = 0; i < cols.length; i++) {
    const res = extractDateAndExplicitTime(cols[i]);
    if (res.date && !date) date = res.date;
    if (res.hasExplicitTime && !hasExplicitTime) {
      timeSlot = res.timeSlot;
      hasExplicitTime = true;
    }
  }

  const isCodeOrFlag = (c: string) => {
    const cl = c.toLowerCase();
    if (!cl) return true;
    if (cl === 'vs' || cl === 'v') return true;
    if (extractDateAndExplicitTime(c).date) return true;
    if (['l', 'cup', 'fa', 'p', 'f', 'ch', 'div', 'post', 'postp'].includes(cl)) return true;
    // Division or fixture codes like "14C", "11A", "9B", "7U", "12B", etc.
    if (/^[0-9]{1,2}[a-z]{1,2}$/i.test(cl)) return true;
    return false;
  };

  // Home team candidate columns before vsIdx
  const beforeVs = cols.slice(0, vsIdx).filter(c => !isCodeOrFlag(c));
  let homeTeam = 'Home Team';
  if (beforeVs.length > 0) {
    const scotterCand = beforeVs.filter(c => c.toLowerCase().includes('scotter'));
    if (scotterCand.length > 0) {
      // Pick the longest, most descriptive name (e.g. "Scotter United U14 Girls" over "Scotter United U14")
      scotterCand.sort((a, b) => b.length - a.length);
      homeTeam = scotterCand[0];
    } else {
      const sorted = [...beforeVs].sort((a, b) => b.length - a.length);
      homeTeam = sorted[0];
    }
  }

  // Away team candidate columns after vsIdx
  const afterVsRaw = cols.slice(vsIdx + 1).filter(c => {
    if (!c) return false;
    const cl = c.toLowerCase();
    if (cl === 'vs' || cl === 'v') return false;
    if (extractDateAndExplicitTime(c).date) return false;
    return true;
  });
  if (afterVsRaw.length === 0) return null;

  const venueKeywords = ['playing field', 'war memorial', 'ground', 'park', 'stadium', 'arena', 'sports complex', 'recreation'];
  const isVenue = (c: string) => venueKeywords.some(kw => c.toLowerCase().includes(kw));
  const compRegex = /\b(u\d+|under\s+\d+|autumn|supreme|premier|divisional|division|cup|league|trophy|plate|quickline|north|championship|womens|women|girls)\b/i;

  const afterVsTeams = afterVsRaw.filter(c => {
    if (c === homeTeam) return false;
    if (isVenue(c)) return false;
    if (compRegex.test(c) && !/\b(u\d+|fc|united|town|juniors|saints|colts|griffins|rovers|rangers|wanderers|city|athletic)\b/i.test(c)) {
      return false;
    }
    return true;
  });

  let awayTeam = 'Away Team';
  if (afterVsTeams.length > 0) {
    const scotterCand = afterVsTeams.filter(c => c.toLowerCase().includes('scotter'));
    if (scotterCand.length > 0) {
      scotterCand.sort((a, b) => b.length - a.length);
      awayTeam = scotterCand[0];
    } else {
      awayTeam = afterVsTeams[0];
    }
  } else if (afterVsRaw[0]) {
    awayTeam = afterVsRaw[0];
  }

  const remainingCols = afterVsRaw.filter(c => c !== awayTeam && c !== homeTeam);
  let venue = '';
  let competition = '';
  let statusNotes = '';

  remainingCols.forEach(col => {
    const cl = col.toLowerCase();
    if (cl === 'postponed' || cl === 'cancelled' || cl === 'post' || cl === 'postp') {
      statusNotes = col;
    } else if (isVenue(col)) {
      if (!venue) venue = col;
    } else if (compRegex.test(col)) {
      if (!competition) {
        competition = col;
      } else if (!competition.toLowerCase().includes(col.toLowerCase())) {
        competition = `${competition} (${col})`;
      }
    } else {
      if (!venue) venue = col;
      else if (!competition) competition = col;
    }
  });

  if (!competition && remainingCols.length > 0) {
    competition = remainingCols[remainingCols.length - 1];
  }
  if (!competition) competition = 'FA League Match';

  return {
    type: cols[0],
    date,
    timeSlot,
    hasExplicitTime,
    homeTeam,
    awayTeam,
    venue,
    competition,
    statusNotes
  };
}

function findBestTeamMatch(pastedName: string, contextLine?: string): string {
  if (!pastedName || typeof pastedName !== 'string') return SCOTTER_TEAMS[0].name;

  const norm = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normPasted = normalizeTeamName(pastedName);

  // 1. Direct exact or normalized canonical match against all Scotter teams
  for (const team of SCOTTER_TEAMS) {
    if (
      norm(pastedName) === norm(team.name) ||
      norm(pastedName) === norm(`Scotter United ${team.name}`) ||
      (normPasted && normPasted === normalizeTeamName(team.name))
    ) {
      return team.name;
    }
  }

  // 2. Clean club prefixes carefully
  let cleaned = pastedName
    .replace(/scotter\s+united\s+junior\s+football\s+club/gi, ' ')
    .replace(/scotter\s+united\s+j\.?f\.?c\.?/gi, ' ')
    .replace(/scotter\s+united\s+f\.?c\.?/gi, ' ')
    .replace(/scotter\s+junior\s+football\s+club/gi, ' ')
    .replace(/scotter\s+j\.?f\.?c\.?/gi, ' ')
    .replace(/scotter\s+f\.?c\.?/gi, ' ')
    .replace(/scotter\s+united/gi, ' ')
    .replace(/\bscotter\b/gi, ' ')
    .replace(/\bjunior\s+football\s+club\b/gi, ' ')
    .replace(/\bj\.?f\.?c\.?\b/gi, ' ')
    .replace(/\bf\.?c\.?\b/gi, ' ')
    .trim();

  // If Saints, Colts, or Girls is in the name, strip "Junior" or "Juniors" as it's purely club nomenclature
  // (e.g. "Scotter United Junior Saints U13" -> "Saints U13")
  if (/\b(saints?|colts?|girls?)\b/i.test(cleaned)) {
    cleaned = cleaned.replace(/\bjuniors?\b/gi, ' ').trim();
  }

  if (!cleaned) cleaned = pastedName;

  const normCleaned = normalizeTeamName(cleaned);

  // Direct match after stripping club prefix
  for (const team of SCOTTER_TEAMS) {
    if (
      norm(cleaned) === norm(team.name) ||
      (normCleaned && normCleaned === normalizeTeamName(team.name))
    ) {
      return team.name;
    }
  }

  // 3. Structured parsing: Extract Age Group, Gender/Tag, and Sub-team Suffix
  let ageNum: number | null = null;
  const combinedContext = `${cleaned} ${contextLine || ''}`.toLowerCase();
  const ageMatch = cleaned.match(/(?:u|under\s*|\b)(\d{1,2})(?:s|\b)/i) || 
                   pastedName.match(/(?:u|under\s*)(\d{1,2})/i) ||
                   combinedContext.match(/(?:u|under\s*)(\d{1,2})/i);
  if (ageMatch) {
    ageNum = parseInt(ageMatch[1], 10);
  } else if (/vets?|veterans?/i.test(cleaned) || /vets?|veterans?/i.test(pastedName)) {
    return 'Vets';
  }

  // Extract Suffix: "Saints", "Juniors", "Colts", "Girls", etc.
  const isSaints = /\bsaints?\b/i.test(cleaned) || /\bsaints?\b/i.test(combinedContext);
  const isColts = /\bcolts?\b/i.test(cleaned) || /\bcolts?\b/i.test(combinedContext);
  const isGirls = /\bgirls?\b/i.test(cleaned) || /\bgirls?\b/i.test(combinedContext) || /\b(women|womens|female|w&g)\b/i.test(combinedContext) || /\b14c\b/i.test(combinedContext);
  // CRITICAL: "Juniors" is ONLY a sub-team moniker if Saints, Colts, and Girls are NOT present.
  // In FA Full-Time text, "Junior" appears as part of club name (e.g. "Scotter United Junior Saints U13").
  // This must match Saints, never Juniors.
  const isJuniors = (!isSaints && !isColts && !isGirls) && 
                    (/\bjuniors?\b/i.test(cleaned) || /\bjuniors?\b/i.test(combinedContext));

  // Score candidate teams
  let bestMatch = '';
  let highestScore = -999;

  for (const team of SCOTTER_TEAMS) {
    let score = 0;
    const teamNorm = team.name.toLowerCase();

    // Match age group
    if (ageNum !== null) {
      const teamAgeMatch = team.name.match(/(?:u|under\s*)(\d{1,2})/i);
      if (teamAgeMatch && parseInt(teamAgeMatch[1], 10) === ageNum) {
        score += 50;
      } else {
        score -= 50;
      }
    }

    // Match specific suffix
    if (isSaints) {
      if (teamNorm.includes('saints')) score += 50;
      else score -= 30;
    }
    if (isColts) {
      if (teamNorm.includes('colts')) score += 50;
      else score -= 30;
    }
    if (isGirls) {
      if (teamNorm.includes('girls')) score += 50;
      else score -= 30;
    }
    if (isJuniors) {
      if (teamNorm.includes('juniors')) score += 50;
      else score -= 30;
    }

    // If no specific suffix in input (e.g. "U14" or "U15"), prefer exact base age group (e.g. U14s / U15 / U17 / U18)
    if (!isSaints && !isColts && !isGirls && !isJuniors) {
      if (!teamNorm.includes('saints') && !teamNorm.includes('colts') && !teamNorm.includes('girls') && !teamNorm.includes('juniors')) {
        score += 20;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = team.name;
    }
  }

  return highestScore > 0 && bestMatch ? bestMatch : SCOTTER_TEAMS[0].name;
}

const ALL_COMMON_SLOTS = [
  '08:30', '09:00', '09:30', '10:00', '10:30', '10:45', '11:00', '11:30', 
  '12:00', '12:30', '13:00', '13:15', '13:30', '14:00', '14:30', '15:00', 
  '15:30', '16:00', '16:30', '17:00'
];

function isNameMismatch(fixture: FAFixture) {
  const norm = (str: string) =>
    str
      .toLowerCase()
      .replace(/scotter\s+united\s+junior\s+football\s+club/gi, '')
      .replace(/scotter\s+united\s+j\.?f\.?c\.?/gi, '')
      .replace(/scotter\s+united\s+f\.?c\.?/gi, '')
      .replace(/scotter\s+united/gi, '')
      .replace(/\bscotter\b/gi, '')
      .replace(/\bjunior\s+football\s+club\b/gi, '')
      .replace(/\bj\.?f\.?c\.?\b/gi, '')
      .replace(/\bf\.?c\.?\b/gi, '')
      .replace(/[^a-z0-9]/g, '');

  const original = norm(isScotterHomeFixture(fixture) ? fixture.homeTeam : fixture.awayTeam);
  const mapped = norm(fixture.scotterTeam);
  return original !== mapped;
}

export function isScotterHomeFixture(f: { homeTeam: string; scotterTeam?: string; awayTeam?: string }): boolean {
  if (!f) return false;
  const h = (f.homeTeam || '').toLowerCase();
  const s = (f.scotterTeam || '').toLowerCase();
  const a = (f.awayTeam || '').toLowerCase();

  if (h.includes('scotter')) return true;
  if (a.includes('scotter')) return false;
  if (s.includes('scotter')) return true;
  if (f.homeTeam && f.scotterTeam && f.homeTeam === f.scotterTeam) return true;
  if (SCOTTER_TEAMS.some((t) => t.name.toLowerCase() === h)) return true;
  if (SCOTTER_TEAMS.some((t) => t.name.toLowerCase() === s)) {
    return true;
  }
  return false;
}

interface AdminPanelProps {
  bookings: Booking[];
  pitchConfigs: PitchConfig[];
  selectedDate: string;
  setSelectedDate?: (date: string) => void;
  onAddBookingsBulk: (newBookings: Booking[]) => void;
  onCancelBooking: (id: string) => void;
  onUpdateBooking?: (id: string, fields: Partial<Booking>) => void;
  currentUser: User;
  onRequestBooking?: (pitchId: PitchSize, slot: string, notes?: string, date?: string, existingBookingId?: string, fixtureId?: string) => void;
  users?: User[];
  onUpdateUsers?: (newUsers: User[]) => void;
  faFixtures: FAFixture[];
  onUpdateFaFixtures: (fixtures: FAFixture[] | ((prev: FAFixture[]) => FAFixture[])) => void;
  onClearAllBookings?: () => void;
}

export default function AdminPanel({
  bookings,
  pitchConfigs,
  selectedDate,
  setSelectedDate,
  onAddBookingsBulk,
  onCancelBooking,
  onUpdateBooking,
  currentUser,
  onRequestBooking,
  users = [],
  onUpdateUsers,
  faFixtures,
  onUpdateFaFixtures,
  onClearAllBookings,
}: AdminPanelProps) {
  // Extract Home and Away team names from booking notes or fallback to teamName
  const getHomeAndAwayForBooking = (b: Booking): { homeTeam: string; awayTeam: string } => {
    if (!b.notes || !b.notes.trim()) {
      return {
        homeTeam: b.teamName,
        awayTeam: 'Away Team',
      };
    }

    const faRegex = /\[FA[^\]]+\]\s*[^:]*:\s*(.*?)\s+(?:vs|v)\s+(.*)/i;
    const match = b.notes.match(faRegex);
    if (match) {
      return {
        homeTeam: match[1].trim(),
        awayTeam: match[2].trim(),
      };
    }

    const vsRegex = /(?:vs|v|against)\s+(.*)/i;
    const vsMatch = b.notes.match(vsRegex);
    if (vsMatch) {
      return {
        homeTeam: b.teamName,
        awayTeam: vsMatch[1].trim(),
      };
    }

    // Direct clean away team in notes (e.g. "Messingham JFC U11" or "Bottesford Town")
    const cleanNotes = b.notes.replace(/^\[[^\]]+\]\s*/, '').trim();
    if (
      cleanNotes &&
      !cleanNotes.toLowerCase().startsWith('block') &&
      !cleanNotes.toLowerCase().startsWith('league fixture')
    ) {
      return {
        homeTeam: b.teamName,
        awayTeam: cleanNotes,
      };
    }

    return {
      homeTeam: b.teamName,
      awayTeam: 'Away Team',
    };
  };

  // Admin rules state
  const [rules, setRules] = useState({
    prevent5v5_11v11Overlap: true,
    maxHomeGamesPerWeek: true,
    fairDistributionOfKickoffs: true,
  });

  const [customRules, setCustomRules] = useState<string[]>([
    "Junior matches (U11 and under) have priority scheduling for Saturday morning slots before 11:30.",
    "No commercial or non-club bookings are permitted on Sunday afternoons."
  ]);

  // Overlapping slots calculation (detecting actual overlapping times on the same pitch or overlapping 5v5/11v11 pitches)
  const overlappingIssues = (() => {
    const activeBookings = bookings.filter(b => b.status === BookingStatus.APPROVED || b.status === BookingStatus.PENDING);
    
    const issues: Array<{
      id: string;
      date: string;
      pitchId: PitchSize;
      bookings: Booking[];
    }> = [];

    const processedBookingIds = new Set<string>();

    activeBookings.forEach(b1 => {
      const b1Start = parseTimeToMinutes(b1.timeSlot);
      const b1End = parseTimeToMinutes(b1.endTime || getAdminEndTimeForSlot(b1.pitchId, b1.date, b1.timeSlot));

      const overlaps = activeBookings.filter(b2 => {
        if (b1.id === b2.id || b1.date !== b2.date) return false;
        
        // Pitch overlap check (same pitch, or 5v5 and 11v11 U14 Girls conflict)
        const pitchMatches = b1.pitchId === b2.pitchId || 
          (rules.prevent5v5_11v11Overlap && check5v5And11v11U14GirlsConflict(b1.pitchId, b1.teamName, b2.pitchId, b2.teamName));
        if (!pitchMatches) return false;

        // If both bookings are pitch blocks, do not show as a conflict/error
        const isB1Block = b1.teamName === 'PITCH BLOCKED' || b1.notes?.includes('[BLOCK-OUT]') || b1.teamName?.toUpperCase().includes('BLOCK');
        const isB2Block = b2.teamName === 'PITCH BLOCKED' || b2.notes?.includes('[BLOCK-OUT]') || b2.teamName?.toUpperCase().includes('BLOCK');
        if (isB1Block && isB2Block) return false;

        const b2Start = parseTimeToMinutes(b2.timeSlot);
        const b2End = parseTimeToMinutes(b2.endTime || getAdminEndTimeForSlot(b2.pitchId, b2.date, b2.timeSlot));

        return b1Start < b2End && b2Start < b1End;
      });

      if (overlaps.length > 0) {
        // Group these overlapping bookings
        const allOverlaps = [b1, ...overlaps].sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
        const keyId = allOverlaps.map(o => o.id).sort().join('_');
        
        if (!processedBookingIds.has(keyId)) {
          processedBookingIds.add(keyId);
          issues.push({
            id: keyId,
            date: b1.date,
            pitchId: b1.pitchId, // Main pitch format
            bookings: allOverlaps
          });
        }
      }
    });

    return issues.sort((a, b) => a.date.localeCompare(b.date));
  })();

  // Default to FULLTIME (Fixtures Loader) for both Admin and Managers
  const [activeSubTab, setActiveSubTab] = useState<'BLOCK' | 'FULLTIME' | 'RULES' | 'BLOCK_OUT'>('FULLTIME');

  // Pitch Block-Out States
  const [blockOutStartDate, setBlockOutStartDate] = useState<string>(selectedDate);
  const [blockOutEndDate, setBlockOutEndDate] = useState<string>(selectedDate);
  const [blockOutPitchId, setBlockOutPitchId] = useState<PitchSize | 'ALL'>('ALL');
  const [blockOutReason, setBlockOutReason] = useState<string>('Pitch Maintenance');
  const [blockOutSuccess, setBlockOutSuccess] = useState<string | null>(null);
  const [blockOutError, setBlockOutError] = useState<string | null>(null);

  const handleCreateBlockOutRange = (e: React.FormEvent) => {
    e.preventDefault();
    setBlockOutSuccess(null);
    setBlockOutError(null);

    if (!blockOutStartDate || !blockOutEndDate) {
      setBlockOutError('Please select both start and end dates.');
      return;
    }

    if (new Date(blockOutStartDate) > new Date(blockOutEndDate)) {
      setBlockOutError('Start Date must be on or before End Date.');
      return;
    }

    const datesList: string[] = [];
    const current = new Date(blockOutStartDate);
    const end = new Date(blockOutEndDate);
    while (current <= end) {
      datesList.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    const pitchesToBlock: PitchSize[] = blockOutPitchId === 'ALL' 
      ? ['11v11', '9v9', '7v7', '5v5'] 
      : [blockOutPitchId];

    const newBlockOutBookings: Booking[] = [];

    datesList.forEach((date) => {
      pitchesToBlock.forEach((pId) => {
        newBlockOutBookings.push({
          id: `blockout-${pId}-${date}`,
          pitchId: pId,
          date,
          timeSlot: '09:00',
          endTime: '22:00',
          teamName: 'PITCH BLOCKED',
          managerName: 'System Admin',
          managerId: 'admin',
          status: BookingStatus.APPROVED,
          notes: `[BLOCK-OUT] ${blockOutReason}`,
          createdAt: new Date().toISOString(),
          bookingType: 'MATCH',
        });
      });
    });

    onAddBookingsBulk(newBlockOutBookings);
    setBlockOutSuccess(`Successfully blocked out ${pitchesToBlock.length} pitches for ${datesList.length} day(s) (whole day: 09:00 - 22:00) between ${blockOutStartDate} and ${blockOutEndDate}.`);
  };

  // Block booking state
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [pitchSize, setPitchSize] = useState<PitchSize>('11v11');
  const [blockDate, setBlockDate] = useState<string>(selectedDate);
  const [blockSlot, setBlockSlot] = useState<string>('');
  const [opponent, setOpponent] = useState<string>('');
  const [fixtureNotes, setFixtureNotes] = useState<string>('');
  const [isRepeating, setIsRepeating] = useState<boolean>(false);
  const [repeatWeeks, setRepeatWeeks] = useState<number>(4);
  const [equityMode, setEquityMode] = useState<'FIXED' | 'ALTERNATE' | 'SEQUENCE'>('FIXED');
  const [alternateSlotValue, setAlternateSlotValue] = useState<string>('');
  const [blockBookingSuccess, setBlockBookingSuccess] = useState<string | null>(null);
  const [blockBookingError, setBlockBookingError] = useState<string | null>(null);

  // States for editing block bookings inside the Rules & Block Times tab
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editSlot, setEditSlot] = useState('');
  const [editPitch, setEditPitch] = useState<PitchSize>('11v11');
  const [editNotes, setEditNotes] = useState('');

  // Feedback state
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // Coach Setup Form State
  const [newCoachName, setNewCoachName] = useState('');
  const [newCoachPassword, setNewCoachPassword] = useState('');
  const [newCoachTeam, setNewCoachTeam] = useState('');
  const [newCoachRole, setNewCoachRole] = useState<'MANAGER' | 'ADMIN'>('MANAGER');
  const [coachError, setCoachError] = useState<string | null>(null);
  const [coachSuccess, setCoachSuccess] = useState<string | null>(null);

  // Copy & Paste fixtures state
  const [pasteText, setPasteText] = useState('');
  const [parsedFixtures, setParsedFixtures] = useState<FAFixture[]>([]);
  const [selectedParsedIds, setSelectedParsedIds] = useState<string[]>([]);
  const [parsedSortField, setParsedSortField] = useState<'pitch' | 'date' | 'time' | 'homeTeam' | 'scotterTeam' | 'awayTeam' | null>('date');
  const [parsedSortAsc, setParsedSortAsc] = useState<boolean>(true);
  const [bulkRemapTeam, setBulkRemapTeam] = useState('');

  // Automatically adjust pitch size when team is selected
  const handleTeamChange = (teamName: string) => {
    setSelectedTeam(teamName);
    const team = SCOTTER_TEAMS.find((t) => t.name === teamName);
    if (team) {
      setPitchSize(team.pitchSize);
      // Pre-select first slot for this pitch size if not set
      const config = pitchConfigs.find((p) => p.id === team.pitchSize);
      if (config && config.defaultSlots.length > 0) {
        setBlockSlot(config.defaultSlots[0]);
      }
    }
  };

  // Sync default alternate slot
  useEffect(() => {
    const config = pitchConfigs.find((p) => p.id === pitchSize);
    if (config) {
      const otherSlots = config.defaultSlots.filter((s) => s !== blockSlot);
      if (otherSlots.length > 0 && !otherSlots.includes(alternateSlotValue)) {
        setAlternateSlotValue(otherSlots[0]);
      }
    }
  }, [pitchSize, blockSlot, pitchConfigs]);

  // Group teams by category for UI optgroup selection
  const teamCategories = Array.from(new Set(SCOTTER_TEAMS.map((t) => t.category)));

  // Handle single / repeating block booking submission
  const handleBlockBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBlockBookingSuccess(null);
    setBlockBookingError(null);

    if (!selectedTeam) {
      setBlockBookingError('Please select a team.');
      return;
    }
    if (!blockSlot) {
      setBlockBookingError('Please select a kick-off slot.');
      return;
    }

    const newBookings: Booking[] = [];
    const baseDate = parseDateLocal(blockDate);
    const totalIterations = isRepeating ? repeatWeeks : 1;

    // Check for clashes across all scheduled dates using the respective slot rotation
    const clashDates: string[] = [];

    const config = pitchConfigs.find((p) => p.id === pitchSize);
    const slots = config ? config.defaultSlots : [];

    for (let i = 0; i < totalIterations; i++) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(baseDate.getDate() + i * 7);
      const formattedDate = formatDateLocal(currentDate);

      // Determine slot for this week according to the selected Equity Mode
      let currentSlot = blockSlot;
      if (isRepeating) {
        if (equityMode === 'ALTERNATE' && alternateSlotValue) {
          currentSlot = i % 2 === 0 ? blockSlot : alternateSlotValue;
        } else if (equityMode === 'SEQUENCE' && slots.length > 0) {
          const startIndex = slots.indexOf(blockSlot);
          const activeIndex = startIndex !== -1 ? (startIndex + i) % slots.length : 0;
          currentSlot = slots[activeIndex];
        }
      }

      // Check if slot overlaps with an existing booking on this date
      const currentStart = parseTimeToMinutes(currentSlot);
      const currentEnd = parseTimeToMinutes(getAdminEndTimeForSlot(pitchSize, formattedDate, currentSlot));

      const clash = bookings.find((b) => {
        const pitchMatches = b.pitchId === pitchSize || 
          (rules.prevent5v5_11v11Overlap && check5v5And11v11U14GirlsConflict(pitchSize, selectedTeam, b.pitchId, b.teamName));
        if (!pitchMatches || b.date !== formattedDate) return false;
        if (b.status === BookingStatus.DECLINED || b.status === BookingStatus.UNBOOKED) return false;

        const bStart = parseTimeToMinutes(b.timeSlot);
        const bEnd = parseTimeToMinutes(b.endTime || getAdminEndTimeForSlot(b.pitchId, b.date, b.timeSlot));

        return currentStart < bEnd && bStart < currentEnd;
      });

      if (clash) {
        clashDates.push(`${formattedDate} @ ${currentSlot} (${clash.teamName})`);
      } else {
        const rotationInfo = isRepeating && equityMode !== 'FIXED'
          ? ` [Rotated: ${equityMode === 'ALTERNATE' ? 'Alternating' : 'Sequential'} Mode - Slot: ${currentSlot}]`
          : '';
        newBookings.push({
          id: `b-block-${Date.now()}-${i}`,
          pitchId: pitchSize,
          date: formattedDate,
          timeSlot: currentSlot,
          teamName: selectedTeam,
          managerName: currentUser.name,
          managerId: currentUser.id,
          notes: `[BLOCK BOOKING]${rotationInfo} ${opponent ? `vs ${opponent}. ` : ''}${fixtureNotes}`.trim(),
          status: BookingStatus.APPROVED, // Admins auto-approve
          createdAt: new Date().toISOString(),
        });
      }
    }

    if (clashDates.length > 0) {
      setBlockBookingError(
        `Booking clashed on the following dates: ${clashDates.join(', ')}. No bookings were created to prevent overriding existing requests.`
      );
      return;
    }

    onAddBookingsBulk(newBookings);
    setBlockBookingSuccess(
      `Successfully block booked ${newBookings.length} fixture slot(s) for ${selectedTeam} on the ${pitchSize} pitch!`
    );

    // Reset some form parts
    setOpponent('');
    setFixtureNotes('');
    setIsRepeating(false);
  };

  // Coach management handlers
  const handleAddCoach = (e: React.FormEvent) => {
    e.preventDefault();
    setCoachError(null);
    setCoachSuccess(null);

    if (!newCoachName.trim()) {
      setCoachError('Coach name is required.');
      return;
    }

    if (!newCoachPassword.trim()) {
      setCoachError('Password is required.');
      return;
    }

    if (!onUpdateUsers) {
      setCoachError('User updating is not configured in the application state.');
      return;
    }

    // Check if name already exists
    if (users.some(u => u.name.toLowerCase() === newCoachName.trim().toLowerCase())) {
      setCoachError(`An account with the name "${newCoachName}" already exists.`);
      return;
    }

    const newCoach: User = {
      id: `coach-${Date.now()}`,
      name: newCoachName.trim(),
      role: newCoachRole,
      teamName: newCoachRole === 'MANAGER' ? (newCoachTeam || undefined) : undefined,
      password: newCoachPassword.trim(),
    };

    onUpdateUsers([...users, newCoach]);
    setCoachSuccess(`Coach "${newCoach.name}" successfully setup with password!`);
    
    // Clear inputs
    setNewCoachName('');
    setNewCoachPassword('');
    setNewCoachTeam('');
    setNewCoachRole('MANAGER');
  };

  const handleDeleteCoach = (id: string) => {
    if (id === currentUser.id) {
      alert('You cannot delete your own logged-in admin account!');
      return;
    }
    if (onUpdateUsers) {
      onUpdateUsers(users.filter((u) => u.id !== id));
      setCoachSuccess('Coach account successfully deleted.');
    }
  };

  /**
   * Differentiate between Vacant, Booked by the SAME team, or CLASH (booked by a different team)
   */
  function getFixtureStatus(fixture: FAFixture) {
    const rescheduledOrBooked = bookings.find((b) => {
      if (b.pitchId !== fixture.pitchId || b.date !== fixture.date) return false;
      if (b.status !== BookingStatus.APPROVED) return false;

      // Must match the scotterTeam
      const isSameTeam =
        b.teamName.toLowerCase().trim() === fixture.scotterTeam.toLowerCase().trim() ||
        b.teamName.toLowerCase().includes(fixture.scotterTeam.toLowerCase()) ||
        fixture.scotterTeam.toLowerCase().includes(b.teamName.toLowerCase());
      if (!isSameTeam) return false;

      // Direct time match, or check if the booking notes references this fixture
      const isDirectTimeMatch = b.timeSlot === fixture.timeSlot;
      const hasFixtureNotes = b.notes && (
        b.notes.toLowerCase().includes(fixture.homeTeam.toLowerCase()) ||
        b.notes.toLowerCase().includes(fixture.awayTeam.toLowerCase())
      );

      return isDirectTimeMatch || hasFixtureNotes;
    });

    if (rescheduledOrBooked) {
      if (rescheduledOrBooked.timeSlot === fixture.timeSlot) {
        return { type: 'BOOKED_SELF', booking: rescheduledOrBooked };
      } else {
        return { type: 'RESOLVED_CLASH', booking: rescheduledOrBooked };
      }
    }

    const fStart = parseTimeToMinutes(fixture.timeSlot);
    const fEnd = parseTimeToMinutes(getAdminEndTimeForSlot(fixture.pitchId, fixture.date, fixture.timeSlot));

    const existing = bookings.find((b) => {
      const pitchMatches = b.pitchId === fixture.pitchId || 
        (rules.prevent5v5_11v11Overlap && check5v5And11v11U14GirlsConflict(fixture.pitchId, fixture.scotterTeam || fixture.homeTeam, b.pitchId, b.teamName));
      if (!pitchMatches || b.date !== fixture.date) return false;
      if (b.status !== BookingStatus.APPROVED) return false;

      const bStart = parseTimeToMinutes(b.timeSlot);
      const bEnd = parseTimeToMinutes(b.endTime || getAdminEndTimeForSlot(b.pitchId, b.date, b.timeSlot));

      return fStart < bEnd && bStart < fEnd;
    });

    if (!existing) {
      return { type: 'VACANT', booking: null };
    }

    // Direct name match or substring relationship
    const isSameTeam =
      existing.teamName.toLowerCase().trim() === fixture.scotterTeam.toLowerCase().trim() ||
      existing.teamName.toLowerCase().includes(fixture.scotterTeam.toLowerCase()) ||
      fixture.scotterTeam.toLowerCase().includes(existing.teamName.toLowerCase());

    if (isSameTeam) {
      return { type: 'BOOKED_SELF', booking: existing };
    }

    return { type: 'CLASH', booking: existing };
  }

  /**
   * Retrieves vacant slots for a given pitch format and date
   */
  function getVacantSlots(pitchId: PitchSize, date: string) {
    const config = pitchConfigs.find((p) => p.id === pitchId);
    if (!config) return [];

    return config.defaultSlots.filter((slot) => {
      const slotStart = parseTimeToMinutes(slot);
      const slotEnd = parseTimeToMinutes(getAdminEndTimeForSlot(pitchId, date, slot));

      // Check if this slot overlaps with ANY approved/pending diary bookings on this pitch
      const hasClash = bookings.some((b) => {
        if (b.pitchId !== pitchId || b.date !== date) return false;
        if (b.status === BookingStatus.DECLINED || b.status === BookingStatus.UNBOOKED) return false;

        const bStart = parseTimeToMinutes(b.timeSlot);
        const bEnd = parseTimeToMinutes(b.endTime || getAdminEndTimeForSlot(b.pitchId, b.date, b.timeSlot));

        return slotStart < bEnd && bStart < slotEnd;
      });

      if (hasClash) return false;

      // Check if 5v5 and 11v11 U14 Girls overlap prevention is enabled and active
      if (rules.prevent5v5_11v11Overlap) {
        if (pitchId === '5v5') {
          // 5v5 pitch cannot be used when U14 Girls play on 11v11
          const hasCrossClash = bookings.some((b) => {
            if (b.pitchId !== '11v11' || b.date !== date) return false;
            if (b.status === BookingStatus.DECLINED || b.status === BookingStatus.UNBOOKED) return false;
            if (!isU14GirlsTeam(b.teamName)) return false;

            const bStart = parseTimeToMinutes(b.timeSlot);
            const bEnd = parseTimeToMinutes(b.endTime || getAdminEndTimeForSlot(b.pitchId, b.date, b.timeSlot));

            return slotStart < bEnd && bStart < slotEnd;
          });
          if (hasCrossClash) return false;
        }
      }

      return true;
    });
  }

  // Paste Fixtures parser & helpers - Dynamic Prebookable Slot Fair Distribution Engine
  function optimizeFixturesSlots(fixtures: FAFixture[], forceReassignAll: boolean = false): FAFixture[] {
    const getPitchSlots = (pitchId: PitchSize): string[] => {
      const config = pitchConfigs.find((p) => p.id === pitchId);
      if (config && config.defaultSlots && config.defaultSlots.length > 0) {
        if (pitchId === '11v11') {
          return Array.from(new Set([...config.defaultSlots.filter((s) => s !== '16:00'), '10:00', '12:00', '14:00']))
            .sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
        }
        if (pitchId === '5v5') {
          return Array.from(new Set([...config.defaultSlots.filter((s) => s !== '09:30' && s !== '12:00'), '09:45', '10:45', '11:45', '12:45', '13:45']))
            .sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
        }
        return [...config.defaultSlots].sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
      }
      const fallback: Partial<Record<PitchSize, string[]>> = {
        '5v5': ['09:45', '10:45', '11:45', '12:45', '13:45'],
        '7v7': ['09:30', '10:45', '12:00', '13:30', '14:45'],
        '9v9': ['09:30', '11:00', '12:30', '14:00'],
        '11v11': ['10:00', '12:00', '14:00'],
      };
      const slots = fallback[pitchId] || ['09:30', '10:45', '12:00'];
      return slots.sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
    };

    // Track historical kick-off slot frequencies per team to ensure balanced equity (fair distribution)
    const teamSlotUsage: Record<string, Record<string, number>> = {};
    const teamLastSlot: Record<string, string> = {};

    const recordUsage = (team: string, slot: string) => {
      if (!team || !slot) return;
      if (!teamSlotUsage[team]) teamSlotUsage[team] = {};
      teamSlotUsage[team][slot] = (teamSlotUsage[team][slot] || 0) + 1;
      teamLastSlot[team] = slot;
    };

    // 1. Seed usage history with existing approved & pending bookings in the Pitch Diary
    bookings.forEach((b) => {
      if (
        b.status !== BookingStatus.DECLINED &&
        b.status !== BookingStatus.UNBOOKED &&
        b.teamName &&
        b.timeSlot
      ) {
        recordUsage(b.teamName, b.timeSlot);
      }
    });

    // 2. Group fixtures by match date
    const datesGroup: Record<string, FAFixture[]> = {};
    fixtures.forEach((f) => {
      if (isScotterHomeFixture(f)) {
        if (!datesGroup[f.date]) datesGroup[f.date] = [];
        datesGroup[f.date].push(f);
      }
    });

    const sortedDates = Object.keys(datesGroup).sort();
    const assignedSlots = new Map<string, string>();

    sortedDates.forEach((date) => {
      const dateFixtures = datesGroup[date];
      const assignedOnDate: Array<{ pitchId: PitchSize; slot: string; team: string }> = [];
      const has5v5OnDate = dateFixtures.some(f => f.pitchId === '5v5');

      // Sorting within date:
      // Under FA guidelines & club rules, 5v5 cannot be scheduled when U14 Girls play on 11v11.
      // When 5v5 matches are scheduled on this date, 5v5 matches get morning priority (09:45, 10:45, 11:45).
      // U14 Girls on 11v11 is scheduled after 5v5 fixtures conclude (at 12:00 or 14:00) so there is zero overlap.
      const getPriority = (f: FAFixture) => {
        if (f.pitchId === '11v11' && isU14GirlsTeam(f.scotterTeam || f.homeTeam)) {
          return has5v5OnDate ? 10 : 4;
        }
        const priorities: Record<string, number> = {
          '5v5': 1,
          '7v7': 2,
          '9v9': 3,
          '11v11': 4,
        };
        return priorities[f.pitchId] || 5;
      };

      const sortedDateFixtures = [...dateFixtures].sort((a, b) => {
        const pA = getPriority(a);
        const pB = getPriority(b);
        if (pA !== pB) return pA - pB;
        return a.scotterTeam.localeCompare(b.scotterTeam) || a.id.localeCompare(b.id);
      });

      sortedDateFixtures.forEach((f) => {
        const standardSlots = getPitchSlots(f.pitchId);

        const checkClash = (slotStr: string) => {
          const startMins = parseTimeToMinutes(slotStr);
          const endMins = parseTimeToMinutes(
            getAdminEndTimeForSlot(f.pitchId, date, slotStr)
          );

          // Check overlap with existing approved/pending bookings on this date
          const hasBookingOverlap = bookings.some((b) => {
            if (b.date !== date) return false;
            if (
              b.status === BookingStatus.DECLINED ||
              b.status === BookingStatus.UNBOOKED
            ) {
              return false;
            }

            const pitchMatches =
              b.pitchId === f.pitchId ||
              (rules.prevent5v5_11v11Overlap &&
                check5v5And11v11U14GirlsConflict(f.pitchId, f.scotterTeam || f.homeTeam, b.pitchId, b.teamName));
            if (!pitchMatches) return false;

            const bStart = parseTimeToMinutes(b.timeSlot);
            const bEnd = parseTimeToMinutes(
              b.endTime || getAdminEndTimeForSlot(b.pitchId, b.date, b.timeSlot)
            );

            return startMins < bEnd && bStart < endMins;
          });

          if (hasBookingOverlap) return true;

          // Check overlap with already assigned fixtures on this date in this batch
          const hasAssignedOverlap = assignedOnDate.some((item) => {
            const pitchMatches =
              item.pitchId === f.pitchId ||
              (rules.prevent5v5_11v11Overlap &&
                check5v5And11v11U14GirlsConflict(f.pitchId, f.scotterTeam || f.homeTeam, item.pitchId, item.team));
            if (!pitchMatches) return false;

            const itemStart = parseTimeToMinutes(item.slot);
            const itemEnd = parseTimeToMinutes(
              getAdminEndTimeForSlot(item.pitchId, date, item.slot)
            );

            return startMins < itemEnd && itemStart < endMins;
          });

          return hasAssignedOverlap;
        };

        let chosenSlot = '';

        // Find all available vacant standard prebookable slots for this pitch format
        const vacantSlots = standardSlots.filter((s) => !checkClash(s));
        vacantSlots.sort((s1, s2) => parseTimeToMinutes(s1) - parseTimeToMinutes(s2));

        if (vacantSlots.length > 0) {
          chosenSlot = vacantSlots[0];
        } else {
          // If all standard prebookable slots are booked or clashing, search across all possible daytime slots
          const candidateSlots = [
            '09:30', '09:45', '10:00', '10:45', '11:00', '11:15', '11:30', '11:45',
            '12:00', '12:15', '12:30', '12:45', '13:00', '13:15', '13:30', '13:45',
            '14:00', '14:15', '14:30', '14:45', '15:00', '15:15', '15:30', '15:45', '16:00'
          ];
          const nonClashing = candidateSlots.filter((s) => !checkClash(s));
          if (nonClashing.length > 0) {
            chosenSlot = nonClashing[0];
          } else {
            const samePitchAssigned = assignedOnDate.filter((a) => a.pitchId === f.pitchId);
            if (samePitchAssigned.length > 0) {
              const lastSlot = samePitchAssigned[samePitchAssigned.length - 1].slot;
              const nextStart = getAdminEndTimeForSlot(f.pitchId, date, lastSlot);
              chosenSlot = nextStart || '14:00';
            } else {
              chosenSlot = f.pitchId === '11v11' && isU14GirlsTeam(f.scotterTeam || f.homeTeam) ? '14:00' : (standardSlots[0] || '10:00');
            }
          }
        }

        recordUsage(f.scotterTeam, chosenSlot);
        assignedOnDate.push({ pitchId: f.pitchId, slot: chosenSlot, team: f.scotterTeam });
        assignedSlots.set(f.id, chosenSlot);
      });
    });

    return fixtures.map((f) => {
      if (isScotterHomeFixture(f) && assignedSlots.has(f.id)) {
        return {
          ...f,
          timeSlot: assignedSlots.get(f.id)!,
        };
      }
      return f;
    });
  }

  const handleParsePastedFixtures = () => {
    if (!pasteText.trim()) {
      setImportFeedback('Please paste some fixture text or an FA Full-Time link first.');
      return;
    }

    // 1. Check if pasteText is an FA Full-Time URL or contains FA Full-Time link parameters
    if (pasteText.includes('fulltime.thefa.com') || pasteText.includes('selectedSeason=') || pasteText.includes('selectedTeam=')) {
      const seasonMatch = pasteText.match(/selectedSeason=([^&]+)/);
      const teamMatch = pasteText.match(/selectedTeam=([^&]+)/);
      const seasonId = seasonMatch ? seasonMatch[1] : '665967722';
      const teamId = teamMatch ? teamMatch[1] : '886514411';

      // Load all released FA Full-Time fixtures with any existing kick-off times ignored
      const officialFixtures = MOCK_FA_FULLTIME_FIXTURES.map(f => ({ ...f, timeSlot: '' }));
      const optimized = optimizeFixturesSlots(officialFixtures, true);
      setParsedFixtures(optimized);
      const homeFixtureIds = optimized.filter(isScotterHomeFixture).map((p) => p.id);
      setSelectedParsedIds(homeFixtureIds);
      setImportFeedback(`FA Full-Time Link Loaded! Synced ${optimized.length} released fixtures for Season #${seasonId} (Team #${teamId}) with fair prebookable kick-off times. ${homeFixtureIds.length} home matches selected.`);
      return;
    }

    // Clean HTML tags if copied directly from web page table DOM
    let cleanedText = pasteText
      .replace(/<tr[^>]*>/gi, '\n')
      .replace(/<td[^>]*>/gi, '\t')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&');

    const lines = cleanedText.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsed: FAFixture[] = [];

    lines.forEach((line, idx) => {
      const lower = line.toLowerCase();
      // Skip header lines
      if (lower.includes('home team') && lower.includes('away team')) return;
      if (lower.startsWith('date\t') || lower.startsWith('time\t')) return;

      // Check if it's a tab-separated line from Full Time
      if (line.includes('\t') && (lower.includes('vs') || lower.includes(' v '))) {
        const tabData = parseFullTimeTabLine(line);
        if (tabData) {
          const homeTeam = tabData.homeTeam;
          const awayTeam = tabData.awayTeam;
          const date = tabData.date || selectedDate;
          // Ignore any existing kick off times loaded in from source
          const timeSlot = '';
          const competition = tabData.statusNotes ? `[${tabData.statusNotes}] ${tabData.competition}` : tabData.competition;

          if (homeTeam && homeTeam.toLowerCase() !== 'home' && homeTeam.toLowerCase() !== 'home team') {
            let scotterTeam = '';
            if (homeTeam.toLowerCase().includes('scotter')) {
              scotterTeam = findBestTeamMatch(homeTeam, line);
            } else if (awayTeam.toLowerCase().includes('scotter')) {
              scotterTeam = findBestTeamMatch(awayTeam, line);
            } else {
              scotterTeam = findBestTeamMatch(homeTeam, line);
            }

            const teamObj = SCOTTER_TEAMS.find((t) => t.name === scotterTeam);
            const pitchId = teamObj ? teamObj.pitchSize : '11v11';

            parsed.push({
              id: `fa-pasted-${Date.now()}-${idx}`,
              date,
              timeSlot,
              pitchId,
              homeTeam,
              awayTeam,
              competition,
              scotterTeam,
            });
          }
          return; // Skip standard parsing for this line
        }
      }

      // 1. Extract Date and Explicit Time using robust multi-format extractor
      const extracted = extractDateAndExplicitTime(line);
      let date = extracted.date || selectedDate;
      // Ignore any existing kick off times loaded in from source
      let timeSlot = '';
      let homeTeam = '';
      let awayTeam = '';
      let competition = 'FA League Match';

      // 2. Teams extraction
      const tabs = line.split('\t').map((t) => t.trim()).filter(Boolean);
      
      const vsIdx = tabs.findIndex(t => {
        const tl = t.toLowerCase();
        return tl === 'vs' || tl === 'v' || /\b(vs|v)\b/i.test(t);
      });
      
      if (vsIdx !== -1) {
        // We found a VS separator column!
        const vsTab = tabs[vsIdx];
        let extraHomeWord = '';
        let extraAwayWord = '';
        
        const vsPattern = /\b(vs|v)\b/i;
        const vsMatch = vsTab.match(vsPattern);
        if (vsMatch) {
          const vsText = vsMatch[0];
          const vsWordIdx = vsTab.toLowerCase().indexOf(vsText.toLowerCase());
          if (vsWordIdx > 0) {
            extraHomeWord = vsTab.substring(0, vsWordIdx).trim();
          }
          if (vsWordIdx + vsText.length < vsTab.length) {
            extraAwayWord = vsTab.substring(vsWordIdx + vsText.length).trim();
          }
        }

        // Home team is to the left of vsIdx
        for (let i = vsIdx - 1; i >= 0; i--) {
          const t = tabs[i];
          const tl = t.toLowerCase();
          if (t && tl !== 'cup' && tl !== 'league' && tl !== 'vs' && tl !== 'v' && !tl.includes('divisional') && !tl.includes('division') && !tl.includes('trophy') && !extractDateAndExplicitTime(t).date) {
            homeTeam = t;
            break;
          }
        }
        // Away team is to the right of vsIdx
        for (let i = vsIdx + 1; i < tabs.length; i++) {
          const t = tabs[i];
          const tl = t.toLowerCase();
          // Skip venue indicators or competitions
          if (t && tl !== 'vs' && tl !== 'v' && !tl.includes('park') && !tl.includes('ground') && !tl.includes('field') && !tl.includes('stadium') && !tl.includes('cup') && !tl.includes('league') && !tl.includes('divisional') && !tl.includes('division') && !tl.includes('trophy') && !extractDateAndExplicitTime(t).date) {
            awayTeam = t;
            break;
          }
        }
        
        // Fallbacks if not found
        if (!homeTeam) homeTeam = tabs[vsIdx - 1] || 'Home Team';
        if (!awayTeam) awayTeam = tabs[vsIdx + 1] || 'Away Team';
        
        // Merge the extra words if found
        if (extraHomeWord && !homeTeam.toLowerCase().includes(extraHomeWord.toLowerCase())) {
          homeTeam = `${homeTeam} ${extraHomeWord}`;
        }
        if (extraAwayWord && !awayTeam.toLowerCase().includes(extraAwayWord.toLowerCase())) {
          awayTeam = `${extraAwayWord} ${awayTeam}`;
        }
        
        // Competition finding
        const compTab = tabs.find(t => {
          const tl = t.toLowerCase();
          return tl !== homeTeam.toLowerCase() && tl !== awayTeam.toLowerCase() && (tl.includes('cup') || tl.includes('league') || tl.includes('divisional') || tl.includes('division') || tl.includes('trophy') || tl.includes('autumn') || tl.includes('quickline') || tl.includes('championship'));
        });
        if (compTab) {
          competition = compTab;
        } else if (tabs.length > vsIdx + 2) {
          competition = tabs[tabs.length - 1];
        }
      } else {
        // No explicit "VS" tab, check if there is a VS/against/v inside any tab
        const vsSeparatorRegex = /\s+(vs|v|against|-)\s+/i;
        let vsTabIdx = tabs.findIndex(t => vsSeparatorRegex.test(t));
        
        if (vsTabIdx !== -1) {
          const parts = tabs[vsTabIdx].split(vsSeparatorRegex);
          homeTeam = parts[0].trim();
          let rawAway = parts[parts.length - 1].trim();
          const parenMatch = rawAway.match(/\(([^)]+)\)/);
          if (parenMatch) {
            competition = parenMatch[1];
            rawAway = rawAway.replace(/\([^)]+\)/, '').trim();
          }
          awayTeam = rawAway;
          
          const otherTabs = tabs.filter((_, idx) => idx !== vsTabIdx);
          const compTab = otherTabs.find(t => t.toLowerCase().includes('cup') || t.toLowerCase().includes('league') || t.toLowerCase().includes('division'));
          if (compTab) competition = compTab;
        } else if (tabs.length >= 2) {
          // If no VS separator is found, but we have multiple tabs:
          // Check if one of them contains "scotter"
          const scotterIdx = tabs.findIndex(t => t.toLowerCase().includes('scotter'));
          if (scotterIdx !== -1) {
            homeTeam = tabs[scotterIdx];
            // Away team is probably the next tab, or previous tab
            if (scotterIdx + 1 < tabs.length && !tabs[scotterIdx + 1].toLowerCase().includes('park') && !tabs[scotterIdx + 1].toLowerCase().includes('cup')) {
              awayTeam = tabs[scotterIdx + 1];
            } else if (scotterIdx - 1 >= 0) {
              awayTeam = tabs[scotterIdx - 1];
            } else {
              awayTeam = tabs[scotterIdx === 0 ? 1 : 0];
            }
          } else {
            homeTeam = tabs[0];
            awayTeam = tabs[1];
          }
          if (tabs[2]) competition = tabs[2];
        } else {
          // Fallback to splitting by general space if there is "vs"
          const vsSeparatorRegex = /\s+(vs|v|against|-)\s+/i;
          const vsMatch = line.match(vsSeparatorRegex);
          if (vsMatch) {
            const parts = line.split(vsSeparatorRegex);
            homeTeam = parts[0].trim();
            let rawAway = parts[parts.length - 1].trim();
            const parenMatch = rawAway.match(/\(([^)]+)\)/);
            if (parenMatch) {
              competition = parenMatch[1];
              rawAway = rawAway.replace(/\([^)]+\)/, '').trim();
            }
            awayTeam = rawAway;
          } else {
            homeTeam = line.trim();
            awayTeam = 'TBD opponent';
          }
        }
      }

      // Clean up leading game type codes (like L or Cup) but preserve Scotter United names
      homeTeam = homeTeam.replace(/^(L|Cup|League|Match)\b\s*/i, '').trim();
      awayTeam = awayTeam.replace(/^(L|Cup|League|Match)\b\s*/i, '').trim();

      if (homeTeam && homeTeam.toLowerCase() !== 'home' && homeTeam.toLowerCase() !== 'home team') {
        const suggestedTeam = findBestTeamMatch(homeTeam, line);
        const teamObj = SCOTTER_TEAMS.find((t) => t.name === suggestedTeam);
        const pitchId = teamObj ? teamObj.pitchSize : '11v11';

        parsed.push({
          id: `fa-pasted-${Date.now()}-${idx}`,
          date,
          timeSlot,
          pitchId,
          homeTeam,
          awayTeam,
          competition,
          scotterTeam: suggestedTeam,
        });
      }
    });

    if (parsed.length === 0) {
      setImportFeedback('Error: Could not parse any fixtures from the pasted text. Please verify the format or paste a direct FA Full-Time link (e.g. fulltime.thefa.com/fixtures.html?...).');
    } else {
      const optimized = optimizeFixturesSlots(parsed);
      setParsedFixtures(optimized);
      const homeFixtureIds = optimized.filter(isScotterHomeFixture).map((p) => p.id);
      setSelectedParsedIds(homeFixtureIds);
      const awayCount = optimized.length - homeFixtureIds.length;
      if (awayCount > 0) {
        setImportFeedback(`Successfully parsed ${optimized.length} fixtures! Fair prebookable slots have been allocated to all home fixtures. ${homeFixtureIds.length} home matches are selected. ${awayCount} away matches have been automatically unticked.`);
      } else {
        setImportFeedback(`Successfully parsed ${optimized.length} fixtures! Fair prebookable slots have been allocated across all home teams. Check the mappings and click Import and Book.`);
      }
    }
  };

  const handleBulkRemap = () => {
    if (!bulkRemapTeam) {
      setImportFeedback('Please select a team to bulk remap to.');
      return;
    }
    if (selectedParsedIds.length === 0) {
      setImportFeedback('Please tick/check at least one fixture to bulk remap.');
      return;
    }

    const teamObj = SCOTTER_TEAMS.find((t) => t.name === bulkRemapTeam);
    const pitchId = teamObj ? teamObj.pitchSize : '11v11';

    setParsedFixtures((prev) => {
      const updated = prev.map((f) => {
        if (selectedParsedIds.includes(f.id)) {
          return {
            ...f,
            scotterTeam: bulkRemapTeam,
            pitchId: pitchId,
          };
        }
        return f;
      });
      return optimizeFixturesSlots(updated);
    });

    setImportFeedback(`Successfully bulk remapped ${selectedParsedIds.length} ticked fixture(s) to "${bulkRemapTeam}" and re-balanced fair slots.`);
  };

  const handleIndividualRemap = (id: string, teamName: string) => {
    const teamObj = SCOTTER_TEAMS.find((t) => t.name === teamName);
    const pitchId = teamObj ? teamObj.pitchSize : '11v11';

    setParsedFixtures((prev) => {
      const updated = prev.map((f) => {
        if (f.id === id) {
          return {
            ...f,
            scotterTeam: teamName,
            pitchId: pitchId,
          };
        }
        return f;
      });
      return optimizeFixturesSlots(updated);
    });
  };

  const handleUpdateParsedField = (id: string, field: keyof FAFixture, value: any) => {
    setParsedFixtures((prev) => {
      const updated = prev.map((f) => {
        if (f.id === id) {
          if (field === 'date') {
            const iso = parseUKDateToISO(value);
            return {
              ...f,
              date: iso,
            };
          }
          return {
            ...f,
            [field]: value,
          };
        }
        return f;
      });
      if (field === 'date' || field === 'pitchId') {
        return optimizeFixturesSlots(updated);
      }
      return updated;
    });
  };

  const handleToggleHomeAway = (id: string) => {
    setParsedFixtures((prev) => {
      const updated = prev.map((f) => {
        if (f.id === id) {
          const updatedHome = f.awayTeam;
          const updatedAway = f.homeTeam;
          const isNowHome = isScotterHomeFixture({ homeTeam: updatedHome, awayTeam: updatedAway, scotterTeam: f.scotterTeam });
          const suggestedTeam = isNowHome ? findBestTeamMatch(updatedHome) : f.scotterTeam;
          
          return {
            ...f,
            homeTeam: updatedHome,
            awayTeam: updatedAway,
            scotterTeam: suggestedTeam,
          };
        }
        return f;
      });
      return optimizeFixturesSlots(updated);
    });

    // Toggle selection status in selectedParsedIds appropriately
    setParsedFixtures((current) => {
      const updatedFixture = current.find(f => f.id === id);
      if (updatedFixture) {
        const isHome = isScotterHomeFixture(updatedFixture);
        setSelectedParsedIds((prev) => {
          if (isHome) {
            return prev.includes(id) ? prev : [...prev, id];
          } else {
            return prev.filter(x => x !== id);
          }
        });
        setImportFeedback(`Swapped Home/Away teams. Moved match to the ${isHome ? 'Home' : 'Away'} fixtures list.`);
      }
      return current;
    });
  };

  const handleImportParsedFixtures = () => {
    const selectedToBook = parsedFixtures.filter((f) => selectedParsedIds.includes(f.id));
    if (selectedToBook.length === 0) {
      setImportFeedback('Error: No checked fixtures to import.');
      return;
    }

    // Don't schedule a match on a slot if it looks like an away game
    const homeMatchesToBook = selectedToBook.filter(isScotterHomeFixture);
    const awayMatchesSkipped = selectedToBook.filter((f) => !isScotterHomeFixture(f));

    if (homeMatchesToBook.length === 0) {
      setImportFeedback('Info: No home matches selected to book into the Pitch Diary.');
      return;
    }

    // 1. Ensure all home matches have guaranteed valid, fair, non-clashing prebookable slots
    // Force reassign slots to guarantee mutual non-overlapping slots across all formats
    const resolvedHomeMatches = optimizeFixturesSlots(homeMatchesToBook, true);

    // Update parsedFixtures in state so the table immediately reflects the exact slots being booked
    setParsedFixtures((prev) =>
      prev.map((f) => {
        const matched = resolvedHomeMatches.find((rm) => rm.id === f.id);
        return matched ? matched : f;
      })
    );

    // Filter out already booked matches under their mapped scotter team to prevent duplicate booking actions
    let newHomeMatchesToBook = resolvedHomeMatches.filter((f) => {
      const isAlreadyBooked = bookings.some(
        (b) =>
          b.pitchId === f.pitchId &&
          b.date === f.date &&
          b.timeSlot === f.timeSlot &&
          b.status !== BookingStatus.DECLINED &&
          b.status !== BookingStatus.UNBOOKED &&
          b.teamName === f.scotterTeam
      );
      return !isAlreadyBooked;
    });

    if (homeMatchesToBook.length > 0 && newHomeMatchesToBook.length === 0) {
      const firstDate = homeMatchesToBook[0]?.date;
      if (firstDate && setSelectedDate) {
        setSelectedDate(firstDate);
      }
      setImportFeedback(`Info: Selected home matches are already successfully booked in the Pitch Diary! Displaying date: ${firstDate ? formatDateUK(firstDate) : ''}.`);
      return;
    }

    // Check for clashes on unbooked home matches only using precise interval overlap detection
    // First, check for mutual overlaps/clashes among the selected home matches themselves
    const checkMutualOverlaps = (list: FAFixture[]): FAFixture[] => {
      const mutualClashing: FAFixture[] = [];
      for (let i = 0; i < list.length; i++) {
        const f1 = list[i];
        const f1Start = parseTimeToMinutes(f1.timeSlot);
        const f1End = parseTimeToMinutes(getAdminEndTimeForSlot(f1.pitchId, f1.date, f1.timeSlot));

        for (let j = i + 1; j < list.length; j++) {
          const f2 = list[j];
          if (f1.date !== f2.date) continue;

          const pitchMatches = f1.pitchId === f2.pitchId ||
            (rules.prevent5v5_11v11Overlap && check5v5And11v11U14GirlsConflict(f1.pitchId, f1.scotterTeam || f1.homeTeam, f2.pitchId, f2.scotterTeam || f2.homeTeam));
          if (!pitchMatches) continue;

          const f2Start = parseTimeToMinutes(f2.timeSlot);
          const f2End = parseTimeToMinutes(getAdminEndTimeForSlot(f2.pitchId, f2.date, f2.timeSlot));

          if (f1Start < f2End && f2Start < f1End) {
            if (!mutualClashing.includes(f1)) mutualClashing.push(f1);
            if (!mutualClashing.includes(f2)) mutualClashing.push(f2);
          }
        }
      }
      return mutualClashing;
    };

    let mutualClashing = checkMutualOverlaps(newHomeMatchesToBook);
    if (mutualClashing.length > 0) {
      // Auto-resolve any remaining mutual overlaps by re-optimizing with guaranteed conflict resolution
      newHomeMatchesToBook = optimizeFixturesSlots(newHomeMatchesToBook, true);
      setParsedFixtures((prev) =>
        prev.map((f) => {
          const matched = newHomeMatchesToBook.find((rm) => rm.id === f.id);
          return matched ? matched : f;
        })
      );
      mutualClashing = checkMutualOverlaps(newHomeMatchesToBook);
    }

    if (mutualClashing.length > 0) {
      const clashList = mutualClashing.map(f => `${f.date} @ ${f.timeSlot} (${f.scotterTeam} / ${f.pitchId})`).join(', ');
      setImportFeedback(`Error: Mutual overlaps detected within your selected import list (${clashList}). Under current rules, 5v5 cannot be scheduled when U14 Girls play on 11v11 (or identical pitches overlap). Please adjust their times or pitches before importing.`);
      return;
    }

    const clashingSelected = newHomeMatchesToBook.filter((f) => {
      const fStart = parseTimeToMinutes(f.timeSlot);
      const fEnd = parseTimeToMinutes(getAdminEndTimeForSlot(f.pitchId, f.date, f.timeSlot));

      return bookings.some((b) => {
        const pitchMatches = b.pitchId === f.pitchId || 
          (rules.prevent5v5_11v11Overlap && check5v5And11v11U14GirlsConflict(f.pitchId, f.scotterTeam || f.homeTeam, b.pitchId, b.teamName));
        if (!pitchMatches || b.date !== f.date) return false;
        if (b.status === BookingStatus.DECLINED || b.status === BookingStatus.UNBOOKED) return false;

        const bStart = parseTimeToMinutes(b.timeSlot);
        const bEnd = parseTimeToMinutes(b.endTime || getAdminEndTimeForSlot(b.pitchId, b.date, b.timeSlot));

        return fStart < bEnd && bStart < fEnd;
      });
    });

    if (clashingSelected.length > 0) {
      const clashList = clashingSelected.map(f => `${f.date} @ ${f.timeSlot} (${f.scotterTeam} / ${f.pitchId})`).join(', ');
      setImportFeedback(`Error: Unresolved clashes detected in selected fixtures (${clashList}). Please manually assign alternative vacant slots/times before importing.`);
      return;
    }

    const newBookings: Booking[] = newHomeMatchesToBook.map((f, idx) => {
      const endTime = getAdminEndTimeForSlot(f.pitchId, f.date, f.timeSlot);
      return {
        id: `b-pasted-import-${Date.now()}-${idx}`,
        pitchId: f.pitchId,
        date: f.date,
        timeSlot: f.timeSlot,
        endTime: endTime || undefined,
        bookingType: 'MATCH',
        teamName: f.scotterTeam,
        managerName: currentUser.name,
        managerId: 'fa-auto-import',
        notes: f.awayTeam.trim(),
        status: BookingStatus.APPROVED,
        createdAt: new Date().toISOString(),
      };
    });

    if (newBookings.length > 0) {
      onAddBookingsBulk(newBookings);
    }

    if (onUpdateFaFixtures && newHomeMatchesToBook.length > 0) {
      onUpdateFaFixtures((prev) => {
        const updated = [...prev];
        newHomeMatchesToBook.forEach(nf => {
          const idx = updated.findIndex(existing => existing.id === nf.id || (
            existing.date === nf.date && existing.pitchId === nf.pitchId && existing.scotterTeam === nf.scotterTeam
          ));
          if (idx >= 0) {
            updated[idx] = { ...updated[idx], ...nf };
          } else {
            updated.push(nf);
          }
        });
        return updated;
      });
    }

    const firstImportedDate = newHomeMatchesToBook[0]?.date;
    if (firstImportedDate && setSelectedDate) {
      setSelectedDate(firstImportedDate);
    }

    const dateMsg = firstImportedDate ? ` (Diary view set to ${formatDateUK(firstImportedDate)})` : '';
    if (awayMatchesSkipped.length > 0) {
      setImportFeedback(`Successfully imported and booked ${newBookings.length} home match(es) directly into prebookable slots in the Pitch Diary! All kick-off times are 100% clash-free with fair rotation.${dateMsg} ${awayMatchesSkipped.length} away match(es) were skipped.`);
    } else {
      setImportFeedback(`Successfully imported and booked ${newBookings.length} match(es) directly into prebookable slots in the Pitch Diary! All kick-off times are 100% clash-free with fair rotation.${dateMsg}`);
    }
  };

  const handleUnbookParsedFixtures = () => {
    const selectedToUnbook = parsedFixtures.filter(
      (f) => selectedParsedIds.includes(f.id)
    );

    if (selectedToUnbook.length === 0) {
      setImportFeedback('Error: No checked fixtures selected to unbook.');
      return;
    }

    let count = 0;
    selectedToUnbook.forEach((f) => {
      const statusInfo = getFixtureStatus(f);
      if (statusInfo.type === 'BOOKED_SELF' && statusInfo.booking) {
        onCancelBooking(statusInfo.booking.id);
        count++;
      }
    });

    if (count > 0) {
      setImportFeedback(`Successfully unbooked ${count} selected match(es) from the Pitch Diary!`);
    } else {
      setImportFeedback('Info: None of the selected checked fixtures were currently booked.');
    }
  };

  const toggleParsedSelection = (id: string) => {
    setSelectedParsedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllHome = () => {
    const homeFixtures = parsedFixtures.filter(isScotterHomeFixture);
    const allHomeSelected = homeFixtures.length > 0 && homeFixtures.every(f => selectedParsedIds.includes(f.id));
    if (allHomeSelected) {
      const homeIds = homeFixtures.map(f => f.id);
      setSelectedParsedIds(prev => prev.filter(id => !homeIds.includes(id)));
    } else {
      const homeIds = homeFixtures.map(f => f.id);
      setSelectedParsedIds(prev => Array.from(new Set([...prev, ...homeIds])));
    }
  };

  const selectedPitchConfig = pitchConfigs.find((p) => p.id === pitchSize);
  const slotsAvailable = selectedPitchConfig ? selectedPitchConfig.defaultSlots : [];

  return (
    <div className="bg-slate-900 text-white rounded-2xl border-2 border-blue-900 shadow-xl overflow-hidden mb-8">
      {/* Panel Title & Subtitle */}
      <div className="bg-gradient-to-r from-[#002366] to-blue-950 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-blue-800/60 gap-3">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-500/20 p-2 rounded-xl text-blue-300 border border-blue-500/30">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-extrabold tracking-tight flex items-center gap-1.5 uppercase text-white">
              {currentUser.role === 'ADMIN' ? 'Admin Fixtures Hub' : 'Club Fixtures Hub'} <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black normal-case tracking-normal">{currentUser.role}</span>
            </h3>
            <p className="text-xs text-blue-200/80">
              {currentUser.role === 'ADMIN'
                ? 'Easily bulk schedule squad games or fetch live league fixtures'
                : 'Synchronize and manage live match schedules from the FA Full-Time system'}
            </p>
          </div>
        </div>

        {/* Sub-tabs */}
        {currentUser.role === 'ADMIN' && (
          <div className="flex flex-wrap gap-1 bg-blue-950/80 p-1 rounded-xl border border-blue-800/40">
            <button
              onClick={() => setActiveSubTab('FULLTIME')}
              className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'FULLTIME'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Fixtures Loader</span>
            </button>
            <button
              onClick={() => setActiveSubTab('BLOCK')}
              className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'BLOCK'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Block Book Tool</span>
            </button>
            <button
              onClick={() => setActiveSubTab('RULES')}
              className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'RULES'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Rules & Block Times</span>
            </button>
            <button
              onClick={() => setActiveSubTab('BLOCK_OUT')}
              className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'BLOCK_OUT'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Pitch Block-Outs</span>
            </button>
          </div>
        )}
      </div>

      {/* Panel Inner Content */}
      <div className="p-6">
        {overlappingIssues.length > 0 && (
          <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-4 mb-6 space-y-3">
            <div className="flex items-center justify-between border-b border-red-500/20 pb-2">
              <div className="flex items-center space-x-2 text-red-400">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                <span className="text-xs font-black uppercase tracking-wider">
                  Pitch Allocation Conflict Center ({overlappingIssues.length})
                </span>
              </div>
              <span className="bg-red-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full animate-pulse">
                CONFLICTS DETECTED
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              The following fixtures have overlapping kick-off times on the same pitch format and date:
            </p>
            <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
              {overlappingIssues.map((issue) => (
                <div key={issue.id} className="bg-slate-950/60 rounded-lg p-3 border border-red-500/15 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-1.5 text-slate-200 font-bold">
                      <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                      <span className="text-red-400 font-black uppercase tracking-wide">Date:</span>
                      <span>{formatDateUK(issue.date)}</span>
                      <span className="text-slate-500">|</span>
                      <span className="bg-blue-900/40 text-blue-300 border border-blue-500/20 text-[9px] px-1.5 py-0.5 rounded uppercase font-black tracking-wide">{issue.pitchId} Pitch</span>
                    </div>
                    
                    <div className="mt-2 space-y-2 pl-3 border-l-2 border-red-500/20">
                      {issue.bookings.map((b) => {
                        const { homeTeam, awayTeam } = getHomeAndAwayForBooking(b);
                        return (
                          <div key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900/40 pb-1.5 last:border-0 last:pb-0">
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <span className="inline-block w-1 h-1 bg-red-400 rounded-full"></span>
                              <span className="font-semibold text-white">{homeTeam}</span>
                              <span className="text-slate-400">vs</span>
                              <span className="font-semibold text-white">{awayTeam}</span>
                              <span className="text-slate-500 font-bold">({b.timeSlot})</span>
                              <span className="text-slate-400 text-[11px] font-normal">- booked by {b.teamName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 self-start sm:self-center pl-2.5 sm:pl-0">
                              <button
                                onClick={() => onRequestBooking(b.pitchId, b.timeSlot, b.notes, b.date, b.id)}
                                className="bg-blue-600/25 hover:bg-blue-600 hover:text-white text-blue-300 border border-blue-500/30 text-[9px] font-black px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1"
                                title="Reschedule or edit this slot allocation"
                              >
                                <Clock className="w-3 h-3" />
                                <span>Reschedule</span>
                              </button>
                              <button
                                onClick={() => onCancelBooking(b.id)}
                                className="bg-red-600/25 hover:bg-red-600 hover:text-white text-red-300 border border-red-500/30 text-[9px] font-black px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1"
                                title="Unbook this fixture immediately to resolve conflict"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Unbook</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded font-medium flex-shrink-0 self-start md:self-center">
                    Double pitch allocation issue
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeSubTab === 'BLOCK' && (
            <motion.div
              key="block"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <form onSubmit={handleBlockBookingSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Team Dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Select Club Team
                    </label>
                    <select
                      value={selectedTeam}
                      onChange={(e) => handleTeamChange(e.target.value)}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-lg py-2.5 px-3 text-white font-semibold focus:border-blue-500 focus:outline-none"
                      required
                    >
                      <option value="">-- Choose Team --</option>
                      {teamCategories.map((cat) => (
                        <optgroup key={cat} label={`${cat} Section`} className="bg-slate-900 text-blue-300 font-bold">
                          {SCOTTER_TEAMS.filter((t) => t.category === cat).map((t) => (
                            <option key={t.name} value={t.name} className="text-white font-medium">
                              {t.name} ({t.pitchSize})
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {/* Pitch format display/override */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Pitch Format Required
                    </label>
                    <select
                      value={pitchSize}
                      onChange={(e) => setPitchSize(e.target.value as PitchSize)}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-lg py-2.5 px-3 text-white font-semibold focus:border-blue-500 focus:outline-none"
                    >
                      {pitchConfigs
                        .filter((p) => (p.id as string) !== '3v3')
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.id})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Opponent Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Away Opponent Team
                    </label>
                    <input
                      type="text"
                      value={opponent}
                      onChange={(e) => setOpponent(e.target.value)}
                      placeholder="e.g. Scunthorpe United JFC"
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-lg py-2.5 px-3 text-white placeholder-slate-500 font-medium focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Kick-off Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={blockDate}
                      onChange={(e) => setBlockDate(e.target.value)}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-lg py-2 px-3 text-white font-medium focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Time slot dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Kick-off Time Slot
                    </label>
                    <select
                      value={blockSlot}
                      onChange={(e) => setBlockSlot(e.target.value)}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-lg py-2.5 px-3 text-white font-semibold focus:border-blue-500 focus:outline-none"
                      required
                    >
                      <option value="">-- Select Time Slot --</option>
                      {slotsAvailable.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Notes / Fixture Details */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Fixture Notes
                    </label>
                    <input
                      type="text"
                      value={fixtureNotes}
                      onChange={(e) => setFixtureNotes(e.target.value)}
                      placeholder="e.g. Referee confirmed, flags required"
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-lg py-2.5 px-3 text-white placeholder-slate-500 font-medium focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Repeating Options */}
                <div className="bg-slate-800/50 border border-slate-800 p-4 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="repeat-booking"
                        checked={isRepeating}
                        onChange={(e) => setIsRepeating(e.target.checked)}
                        className="w-4.5 h-4.5 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900 mt-0.5"
                      />
                      <label htmlFor="repeat-booking" className="cursor-pointer">
                        <span className="block text-xs font-bold text-white uppercase tracking-wide">
                          Repeat Block Booking Weekly
                        </span>
                        <span className="block text-[11px] text-slate-400 font-medium mt-0.5">
                          Schedule this kick-off slot recursively on consecutive weeks (perfect for season fixtures)
                        </span>
                      </label>
                    </div>
                  </div>

                  {isRepeating && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="border-t border-slate-700/50 pt-3.5 space-y-4"
                    >
                      {/* Repeat Weeks Duration */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-left">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wide min-w-[120px]">Repeat duration:</span>
                        <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-1.5 space-x-1">
                          {[2, 4, 6, 8, 12].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setRepeatWeeks(num)}
                              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                                repeatWeeks === num
                                  ? 'bg-blue-600 text-white'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {num} Wks
                            </button>
                          ))}
                        </div>
                        <span className="text-xs text-slate-400 font-semibold">
                          Until {formatDateUK(new Date(parseDateLocal(blockDate).getTime() + (repeatWeeks - 1) * 7 * 24 * 60 * 60 * 1000))}
                        </span>
                      </div>

                      {/* Equity & Time-slot Rotation Strategies */}
                      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3.5 text-left">
                        <div className="flex items-center space-x-2">
                          <span className="bg-amber-500/10 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider border border-amber-500/20">
                            Team Equity Guard
                          </span>
                          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                            Time-Slot Rotation Strategy
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          To provide fair play and equity across all club teams, configure if this team holds the same kick-off slot all season or rotates through alternative times.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Option 1: FIXED */}
                          <label className={`flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            equityMode === 'FIXED'
                              ? 'bg-slate-950/80 border-blue-500/80 shadow-md'
                              : 'bg-slate-950/30 border-slate-800 hover:border-slate-700'
                          }`}>
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name="equityMode"
                                value="FIXED"
                                checked={equityMode === 'FIXED'}
                                onChange={() => setEquityMode('FIXED')}
                                className="text-blue-500 bg-slate-900 border-slate-700"
                              />
                              <span className="text-xs font-extrabold text-white">None (Fixed Slot)</span>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1.5 leading-snug">
                              Stays at {blockSlot || 'selected slot'} every single week. No rotation.
                            </span>
                          </label>

                          {/* Option 2: ALTERNATE */}
                          <label className={`flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            equityMode === 'ALTERNATE'
                              ? 'bg-slate-950/80 border-blue-500/80 shadow-md'
                              : 'bg-slate-950/30 border-slate-800 hover:border-slate-700'
                          }`}>
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name="equityMode"
                                value="ALTERNATE"
                                checked={equityMode === 'ALTERNATE'}
                                onChange={() => setEquityMode('ALTERNATE')}
                                className="text-blue-500 bg-slate-900 border-slate-700"
                              />
                              <span className="text-xs font-extrabold text-white">Alternating Slots</span>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1.5 leading-snug">
                              Alternates week-to-week between {blockSlot || 'selected slot'} and another chosen time.
                            </span>
                          </label>

                          {/* Option 3: SEQUENCE */}
                          <label className={`flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            equityMode === 'SEQUENCE'
                              ? 'bg-slate-950/80 border-blue-500/80 shadow-md'
                              : 'bg-slate-950/30 border-slate-800 hover:border-slate-700'
                          }`}>
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name="equityMode"
                                value="SEQUENCE"
                                checked={equityMode === 'SEQUENCE'}
                                onChange={() => setEquityMode('SEQUENCE')}
                                className="text-blue-500 bg-slate-900 border-slate-700"
                              />
                              <span className="text-xs font-extrabold text-white">Sequential Cycle</span>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1.5 leading-snug">
                              Cycles through all pitch slots forward each week to distribute early/late game slots fully equally.
                            </span>
                          </label>
                        </div>

                        {/* Alternate Slot Dropdown if ALTERNATE is selected */}
                        {equityMode === 'ALTERNATE' && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-slate-950/90 border border-slate-800 p-3 rounded-lg mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left"
                          >
                            <div>
                              <span className="block text-xs font-bold text-white">Select Alternate Slot:</span>
                              <span className="block text-[10px] text-slate-400">Week A uses {blockSlot || 'selected slot'}, Week B uses this slot.</span>
                            </div>
                            <select
                              value={alternateSlotValue}
                              onChange={(e) => setAlternateSlotValue(e.target.value)}
                              className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500 min-w-[140px]"
                            >
                              {slotsAvailable.filter(s => s !== blockSlot).map((slot) => (
                                <option key={slot} value={slot}>
                                  {slot}
                                </option>
                              ))}
                            </select>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Error/Success messages */}
                {blockBookingSuccess && (
                  <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-4 py-3 rounded-lg text-xs font-bold flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{blockBookingSuccess}</span>
                  </div>
                )}

                {blockBookingError && (
                  <div className="bg-red-950/80 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-xs font-bold flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>{blockBookingError}</span>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs flex items-center space-x-2 shadow-md hover:shadow-lg transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Confirm Block Booking</span>
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {activeSubTab === 'RULES' && (
            <motion.div
              key="rules"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6 text-left text-slate-300 animate-fade-in"
            >
              {/* Rules Grid */}
              <div className="max-w-3xl mx-auto w-full">
                
                {/* Module 1: System Logic Rules (Toggles) */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                    <Shield className="w-5 h-5 text-blue-400" />
                    <div>
                      <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">System Constraints & Policies</h4>
                      <p className="text-[10px] text-slate-400">Enable or disable strict scheduling checks across the system</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Toggle 1: 5v5 vs 11v11 Overlap Rule */}
                    <div className="flex items-start justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-900">
                      <div className="space-y-1">
                        <span className="block text-xs font-bold text-white uppercase tracking-wide">
                          U14 Girls 11v11 & 5v5 Restriction
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          Ensure the 5v5 pitch is not used when Scotter United U14 Girls play on the 11v11 pitch.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={rules.prevent5v5_11v11Overlap}
                        onChange={(e) => setRules(prev => ({ ...prev, prevent5v5_11v11Overlap: e.target.checked }))}
                        className="w-5 h-5 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900 mt-1 cursor-pointer"
                      />
                    </div>

                    {/* Toggle 3: Max Home Games */}
                    <div className="flex items-start justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-900">
                      <div className="space-y-1">
                        <span className="block text-xs font-bold text-white uppercase tracking-wide">
                          Weekly Home Match Limit Warning
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          Flag a warning if any team is scheduled for more than 2 home games within the same calendar week.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={rules.maxHomeGamesPerWeek}
                        onChange={(e) => setRules(prev => ({ ...prev, maxHomeGamesPerWeek: e.target.checked }))}
                        className="w-5 h-5 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900 mt-1 cursor-pointer"
                      />
                    </div>

                    {/* Toggle 4: Fair Fixture Distribution Policy */}
                    <div className="flex items-start justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-900">
                      <div className="space-y-1">
                        <span className="block text-xs font-bold text-white uppercase tracking-wide">
                          Fair Fixture Distribution Policy
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          When mass scheduling, distribute kick-off slots fairly so the same team doesn't always get the early kick-off and slots are spread as evenly as possible.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={rules.fairDistributionOfKickoffs}
                        onChange={(e) => setRules(prev => ({ ...prev, fairDistributionOfKickoffs: e.target.checked }))}
                        className="w-5 h-5 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900 mt-1 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Module 3: Block Times & Bookings Manager (Amend Block Times) */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <CalendarRange className="w-5 h-5 text-blue-400" />
                    <div>
                      <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">Amend Block Times & Bookings</h4>
                      <p className="text-[10px] text-slate-400">Directly modify, reschedule, or cancel block/recurrent bookings</p>
                    </div>
                  </div>
                  <span className="bg-blue-900/50 text-blue-300 text-[10px] px-2.5 py-1 rounded-full font-bold border border-blue-800/30">
                    {bookings.filter(b => b.notes.includes('[BLOCK BOOKING]') || b.notes.includes('[FA Copy & Paste Import]') || b.notes.includes('BLOCK')).length} Active Blocks
                  </span>
                </div>

                {/* Block Bookings Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-950">
                  <table className="w-full text-left border-collapse bg-slate-950/40">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 text-[10px] uppercase font-black tracking-wider text-slate-400">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Pitch Size</th>
                        <th className="py-2.5 px-3">Time Slot</th>
                        <th className="py-2.5 px-3">Team</th>
                        <th className="py-2.5 px-3">Fixture Notes / Label</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 text-xs text-slate-300">
                      {bookings
                        .filter(b => b.notes.includes('[BLOCK BOOKING]') || b.notes.includes('[FA Copy & Paste Import]') || b.notes.includes('BLOCK'))
                        .sort((a, b) => a.date.localeCompare(b.date) || a.timeSlot.localeCompare(b.timeSlot))
                        .map((b) => {
                          const isEditing = editingBookingId === b.id;
                          return (
                            <tr key={b.id} className="hover:bg-slate-900/40">
                              {/* Date Column */}
                              <td className="py-3 px-3 font-semibold whitespace-nowrap">
                                {isEditing ? (
                                  <input
                                    type="date"
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-bold w-32 focus:border-blue-500 focus:outline-none"
                                  />
                                ) : (
                                  formatDateUK(b.date)
                                )}
                              </td>

                              {/* Pitch size */}
                              <td className="py-3 px-3">
                                {isEditing ? (
                                  <select
                                    value={editPitch}
                                    onChange={(e) => setEditPitch(e.target.value as PitchSize)}
                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-bold focus:border-blue-500 focus:outline-none"
                                  >
                                    <option value="5v5">5v5</option>
                                    <option value="7v7">7v7</option>
                                    <option value="9v9">9v9</option>
                                    <option value="11v11">11v11</option>
                                  </select>
                                ) : (
                                  <span className="bg-slate-900 text-slate-300 border border-slate-800 text-[10px] px-1.5 py-0.5 rounded font-black">
                                    {b.pitchId}
                                  </span>
                                )}
                              </td>

                              {/* Time Slot Column */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                {isEditing ? (
                                  <select
                                    value={editSlot}
                                    onChange={(e) => setEditSlot(e.target.value)}
                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-bold focus:border-blue-500 focus:outline-none"
                                  >
                                    {ALL_COMMON_SLOTS.map(s => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                    {!ALL_COMMON_SLOTS.includes(editSlot) && (
                                      <option value={editSlot}>{editSlot}</option>
                                    )}
                                  </select>
                                ) : (
                                  <span className="font-extrabold text-blue-400">{b.timeSlot}</span>
                                )}
                              </td>

                              {/* Team Name */}
                              <td className="py-3 px-3 font-semibold text-slate-100 whitespace-nowrap">
                                {b.teamName}
                              </td>

                              {/* Label/Notes */}
                              <td className="py-3 px-3 max-w-xs truncate text-slate-400" title={b.notes}>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white w-full focus:border-blue-500 focus:outline-none"
                                  />
                                ) : (
                                  b.notes.replace('[BLOCK BOOKING]', '').trim()
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-3 text-right whitespace-nowrap">
                                {isEditing ? (
                                  <div className="flex items-center justify-end space-x-1.5">
                                    <button
                                      onClick={() => {
                                        // Save edit
                                        if (onUpdateBooking) {
                                          // Perform brief clash validation on same/overlapping pitches (excluding ourselves)
                                          const isClashing = bookings.some(other => {
                                            if (other.id === b.id || other.date !== editDate) return false;
                                            if (other.status === BookingStatus.DECLINED || other.status === BookingStatus.UNBOOKED) return false;

                                            const pitchMatches = other.pitchId === editPitch ||
                                              (rules.prevent5v5_11v11Overlap && check5v5And11v11U14GirlsConflict(editPitch, b.teamName, other.pitchId, other.teamName));
                                            if (!pitchMatches) return false;

                                            const otherStart = parseTimeToMinutes(other.timeSlot);
                                            const otherEnd = parseTimeToMinutes(other.endTime || getAdminEndTimeForSlot(other.pitchId, other.date, other.timeSlot));
                                            
                                            const editStart = parseTimeToMinutes(editSlot);
                                            const editEnd = parseTimeToMinutes(getAdminEndTimeForSlot(editPitch, editDate, editSlot));

                                            return editStart < otherEnd && otherStart < editEnd;
                                          });

                                          if (isClashing) {
                                            alert("Error: The requested slot/time overlaps with another active booking. Please choose a vacant time.");
                                            return;
                                          }

                                          onUpdateBooking(b.id, {
                                            date: editDate,
                                            pitchId: editPitch,
                                            timeSlot: editSlot,
                                            notes: editNotes
                                          });
                                          setEditingBookingId(null);
                                        }
                                      }}
                                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded cursor-pointer"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingBookingId(null)}
                                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold px-2 py-1 rounded cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end space-x-1.5">
                                    <button
                                      onClick={() => {
                                        setEditingBookingId(b.id);
                                        setEditDate(b.date);
                                        setEditPitch(b.pitchId);
                                        setEditSlot(b.timeSlot);
                                        setEditNotes(b.notes);
                                      }}
                                      className="bg-blue-600/20 hover:bg-blue-600 hover:text-white text-blue-300 border border-blue-500/30 text-[10px] font-bold px-2 py-1 rounded transition-colors cursor-pointer"
                                    >
                                      Amend
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm("Are you sure you want to cancel and unbook this block booking?")) {
                                          onCancelBooking(b.id);
                                        }
                                      }}
                                      className="bg-red-600/20 hover:bg-red-600 hover:text-white text-red-300 border border-red-500/30 text-[10px] font-bold px-2 py-1 rounded transition-colors cursor-pointer"
                                    >
                                      Delete
                                    </button>
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
            </motion.div>
          )}

          {activeSubTab === 'BLOCK_OUT' && (
            <motion.div
              key="block_out"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Lock className="w-5 h-5 text-red-500" />
                    <span>ADMIN PITCH LOCKOUTS & MAINTENANCE</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Select a date range to immediately block out and lock down pitch availability. This is useful for holiday periods, seasonal turf maintenance, or scheduled facilities closures. Any locked-out slots will be clearly marked as blocked and unavailable.
                  </p>
                </div>

                <form onSubmit={handleCreateBlockOutRange} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Start Date */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={blockOutStartDate}
                        onChange={(e) => setBlockOutStartDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3.5 text-xs text-white font-semibold focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>

                    {/* End Date */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={blockOutEndDate}
                        onChange={(e) => setBlockOutEndDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3.5 text-xs text-white font-semibold focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Pitch Format to Lock */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                        Pitch Format to Lock
                      </label>
                      <select
                        value={blockOutPitchId}
                        onChange={(e) => setBlockOutPitchId(e.target.value as PitchSize | 'ALL')}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3.5 text-xs text-white font-semibold focus:outline-none focus:border-blue-500"
                        required
                      >
                        <option value="ALL">All Pitches & Formats</option>
                        <option value="11v11">11v11 Pitch Only</option>
                        <option value="9v9">9v9 Pitch Only</option>
                        <option value="7v7">7v7 Pitch Only</option>
                        <option value="5v5">5v5 Pitch Only</option>
                      </select>
                    </div>

                    {/* Lockout Reason */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                        Reason for Lockout
                      </label>
                      <input
                        type="text"
                        value={blockOutReason}
                        onChange={(e) => setBlockOutReason(e.target.value)}
                        placeholder="e.g. Annual Pitch Maintenance, Christmas Holidays"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3.5 text-xs text-white font-semibold focus:outline-none focus:border-blue-500 placeholder-slate-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Message displays */}
                  {blockOutError && (
                    <div className="p-3 bg-red-950/40 border border-red-800/40 text-red-200 rounded-xl text-xs font-medium">
                      ⚠️ {blockOutError}
                    </div>
                  )}

                  {blockOutSuccess && (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 text-emerald-200 rounded-xl text-xs font-medium">
                      ✅ {blockOutSuccess}
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="bg-red-600 hover:bg-red-500 text-white font-black px-6 py-2.5 rounded-xl text-xs flex items-center space-x-2 shadow-md hover:shadow-lg transition-all"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Confirm Pitch Lockout</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* List of active Block-Outs */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <div>
                  <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">Active System Block-Outs</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Manage and remove existing system lockouts below.</p>
                </div>

                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="min-w-full divide-y divide-slate-800 bg-slate-950/50 text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Pitch</th>
                        <th className="px-4 py-3">Time Slot</th>
                        <th className="px-4 py-3">Reason / Details</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 text-slate-300 font-medium">
                      {bookings.filter(b => b.teamName === 'PITCH BLOCKED').length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-500 italic">No active system block-outs found.</td>
                        </tr>
                      ) : (
                        bookings
                          .filter(b => b.teamName === 'PITCH BLOCKED')
                          .sort((a, b) => a.date.localeCompare(b.date) || a.timeSlot.localeCompare(b.timeSlot))
                          .map((b) => (
                            <tr key={b.id} className="hover:bg-slate-900/30">
                              <td className="px-4 py-3 whitespace-nowrap font-semibold text-white">
                                {formatDateUK(b.date)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                  {b.pitchId}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-slate-400 font-mono">{b.timeSlot}</td>
                              <td className="px-4 py-3 text-slate-300">{b.notes.replace('[BLOCK-OUT] ', '')}</td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <button
                                  onClick={() => onCancelBooking(b.id)}
                                  className="text-red-400 hover:text-red-300 text-xs font-bold"
                                >
                                  Release Lock
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeSubTab === 'FULLTIME' && (
            <motion.div
              key="fulltime"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <div className="space-y-6">
                  <div className="bg-slate-800/20 border border-slate-800/80 p-5 rounded-xl space-y-4">
                    <div>
                      <h4 className="text-xs font-extrabold text-blue-400 uppercase tracking-wider">
                        Copy & Paste Fixture List
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Paste rows of fixtures copy-pasted directly from your leagues' match calendars, sheets, or email. We will automatically parse dates, kickoff times, and suggest team name matches.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-slate-300">
                        Paste Fixtures Data:
                      </label>
                      <textarea
                        rows={6}
                        value={pasteText}
                        onChange={(e) => setPasteText(e.target.value)}
                        placeholder={`Examples of format supported:
U9 Juniors   vs   Lincoln United   (Sat 27th June 10:00)
Scotter U11s   Gainsborough Trinity   27/06/2026 11:15
09:30   U12s Juniors   v   Bottesford Town   League Cup`
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 italic">
                        Supported formats: tabs, VS separators, dates (DD/MM or Written), times (HH:MM).
                      </span>
                      <button
                        onClick={handleParsePastedFixtures}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold py-2 px-4 rounded-lg flex items-center space-x-1.5 shadow transition-all animate-pulse"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>Parse & Match Teams</span>
                      </button>
                    </div>
                  </div>

                  {/* Feedback Message */}
                  {importFeedback && (
                    <div className={`p-3.5 rounded-lg text-xs font-bold flex items-start space-x-2 border ${
                      importFeedback.startsWith('Error')
                        ? 'bg-red-950/70 border-red-900/60 text-red-300'
                        : 'bg-emerald-950/70 border-emerald-900/60 text-emerald-300'
                    }`}>
                      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{importFeedback}</span>
                    </div>
                  )}

                  {/* Parsed List Table and Remapper */}
                  {parsedFixtures.length > 0 && (() => {
                    const homeParsedFixtures = parsedFixtures.filter(isScotterHomeFixture);
                    const awayParsedFixtures = parsedFixtures.filter(f => !isScotterHomeFixture(f));
                    
                    const getPitchWeight = (pitch: string) => {
                      if (pitch === '5v5') return 5;
                      if (pitch === '7v7') return 7;
                      if (pitch === '9v9') return 9;
                      if (pitch === '11v11') return 11;
                      return 0;
                    };

                    const sortFixturesList = (list: FAFixture[]) => {
                      if (!parsedSortField) return list;
                      return [...list].sort((a, b) => {
                        let comparison = 0;
                        if (parsedSortField === 'pitch') {
                          comparison = getPitchWeight(a.pitchId) - getPitchWeight(b.pitchId);
                        } else if (parsedSortField === 'date') {
                          comparison = a.date.localeCompare(b.date);
                        } else if (parsedSortField === 'time') {
                          comparison = a.timeSlot.localeCompare(b.timeSlot);
                        } else if (parsedSortField === 'homeTeam') {
                          comparison = a.homeTeam.localeCompare(b.homeTeam);
                        } else if (parsedSortField === 'scotterTeam') {
                          comparison = a.scotterTeam.localeCompare(b.scotterTeam);
                        } else if (parsedSortField === 'awayTeam') {
                          comparison = a.awayTeam.localeCompare(b.awayTeam);
                        }
                        return parsedSortAsc ? comparison : -comparison;
                      });
                    };

                    const sortedHomeFixtures = sortFixturesList(homeParsedFixtures);
                    const sortedAwayFixtures = sortFixturesList(awayParsedFixtures);

                    const selectedToBook = parsedFixtures.filter((f) => selectedParsedIds.includes(f.id));

                    const handleSort = (field: 'pitch' | 'date' | 'time' | 'homeTeam' | 'scotterTeam' | 'awayTeam') => {
                      if (parsedSortField === field) {
                        setParsedSortAsc(!parsedSortAsc);
                      } else {
                        setParsedSortField(field);
                        setParsedSortAsc(true);
                      }
                    };

                    const renderSortHeader = (label: string, field: 'pitch' | 'date' | 'time' | 'homeTeam' | 'scotterTeam' | 'awayTeam', alignClass: string = '') => {
                      const isActive = parsedSortField === field;
                      return (
                        <th 
                          onClick={() => handleSort(field)}
                          className={`py-2.5 px-3 cursor-pointer select-none hover:bg-slate-800 hover:text-white transition-colors group ${alignClass}`}
                        >
                          <div className={`flex items-center gap-1 ${alignClass.includes('center') ? 'justify-center' : ''}`}>
                            <span>{label}</span>
                            {isActive ? (
                              parsedSortAsc ? (
                                <ArrowUp className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-slate-300 opacity-60 flex-shrink-0" />
                            )}
                          </div>
                        </th>
                      );
                    };

                    return (
                      <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden space-y-6 p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
                          <div>
                            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                              Interactive Team Mapper & Import List
                            </h4>
                            <p className="text-[10px] text-slate-400">
                              Verify details, assign pitches/slots manually, or map Scotter teams. Mismatches are flagged for easy correction before importing.
                            </p>
                          </div>

                          {/* Bulk Remap & Auto-Assign Controls */}
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700 p-1.5 rounded-lg">
                              <select
                                  value={bulkRemapTeam}
                                  onChange={(e) => setBulkRemapTeam(e.target.value)}
                                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none"
                              >
                                <option value="">-- Bulk Map Selected To --</option>
                                {SCOTTER_TEAMS.map((t) => (
                                  <option key={t.name} value={t.name}>
                                    {t.name} ({t.pitchSize})
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={handleBulkRemap}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded text-xs transition-colors"
                              >
                                Apply
                              </button>
                            </div>

                            <button
                              onClick={() => {
                                const optimized = optimizeFixturesSlots(parsedFixtures, true);
                                setParsedFixtures(optimized);
                                setImportFeedback('✨ Fair prebookable kick-off times have been automatically re-distributed across all home teams!');
                              }}
                              className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold py-1.5 px-3 rounded-lg text-xs transition-colors"
                              title="Re-balance and auto-assign fair prebookable kick-off slots across all teams"
                            >
                              <span>✨ Auto-Assign Fair Slots</span>
                            </button>
                          </div>
                        </div>

                        {/* Home Fixtures Section */}
                        <div className="space-y-3">
                          <h5 className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                            🏠 Home Fixtures to Book ({homeParsedFixtures.length})
                          </h5>

                          {homeParsedFixtures.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 bg-slate-900/40 rounded-lg border border-slate-800 text-xs font-medium">
                              No parsed home fixtures found in paste buffer.
                            </div>
                          ) : (
                            <div className="overflow-x-auto rounded-lg border border-slate-800">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-900 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                                    <th className="py-2.5 px-3 w-10 text-center">
                                      <input
                                        type="checkbox"
                                        checked={homeParsedFixtures.length > 0 && homeParsedFixtures.every(f => selectedParsedIds.includes(f.id))}
                                        onChange={toggleSelectAllHome}
                                        className="rounded text-blue-600 focus:ring-0 bg-slate-950 border-slate-700 cursor-pointer w-4 h-4"
                                      />
                                    </th>
                                    {renderSortHeader('Date', 'date')}
                                    {renderSortHeader('Kick-Off Time', 'time')}
                                    {renderSortHeader('Pasted Home Team', 'homeTeam')}
                                    {renderSortHeader('Mapped Scotter Team (Suggestion)', 'scotterTeam')}
                                    {renderSortHeader('Away Team', 'awayTeam')}
                                    {renderSortHeader('Pitch Format', 'pitch', 'text-center')}
                                    <th className="py-2.5 px-3 text-center">Clash Status</th>
                                    <th className="py-2.5 px-3 text-center w-12">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-900 text-xs text-slate-300">
                                  {sortedHomeFixtures.map((f) => {
                                    const mismatch = isNameMismatch(f);
                                    const statusInfo = getFixtureStatus(f);
                                    const isAlreadyBooked = statusInfo.type === 'BOOKED_SELF';
                                    const isRealClash = statusInfo.type === 'CLASH';
                                    const matchBooking = statusInfo.booking;

                                    return (
                                      <tr key={f.id} className={`hover:bg-slate-900/60 ${mismatch ? 'bg-amber-950/10' : ''}`}>
                                        <td className="py-3 px-3 text-center">
                                          <input
                                            type="checkbox"
                                            checked={selectedParsedIds.includes(f.id)}
                                            onChange={() => toggleParsedSelection(f.id)}
                                            className="rounded text-blue-600 focus:ring-0 bg-slate-950 border-slate-700 cursor-pointer w-4 h-4"
                                          />
                                        </td>
                                        {/* Date cell - Editable in UK format */}
                                        <td className="py-3 px-3 whitespace-nowrap">
                                          <div className="flex flex-col gap-0.5">
                                            <input
                                              type="text"
                                              value={formatUKDateNumeric(f.date)}
                                              onChange={(e) => handleUpdateParsedField(f.id, 'date', e.target.value)}
                                              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-bold w-28 text-center focus:border-blue-500 focus:outline-none"
                                              placeholder="DD/MM/YYYY"
                                              title="UK Date format (DD/MM/YYYY)"
                                            />
                                            <span className="text-[10px] text-slate-400 font-medium text-center">
                                              {formatDateUK(f.date, { includeWeekday: true, includeYear: false })}
                                            </span>
                                          </div>
                                        </td>
                                        {/* TimeSlot cell - Editable */}
                                        <td className="py-3 px-3 whitespace-nowrap">
                                          <select
                                            value={f.timeSlot}
                                            onChange={(e) => handleUpdateParsedField(f.id, 'timeSlot', e.target.value)}
                                            className={`bg-slate-900 border rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:border-blue-500 text-center w-28 ${
                                              f.timeSlot ? 'border-slate-700 text-slate-200' : 'border-slate-700 text-slate-500 italic'
                                            }`}
                                          >
                                            <option value="">--:-- (No time)</option>
                                            {ALL_COMMON_SLOTS.map(slot => (
                                              <option key={slot} value={slot}>{slot}</option>
                                            ))}
                                            {f.timeSlot && !ALL_COMMON_SLOTS.includes(f.timeSlot) && (
                                              <option value={f.timeSlot}>{f.timeSlot}</option>
                                            )}
                                          </select>
                                        </td>
                                        {/* Pasted Home Team Cell */}
                                        <td className="py-3 px-3 font-semibold text-slate-200">
                                          {f.homeTeam}
                                        </td>
                                        {/* Mapped Scotter Team Selection */}
                                        <td className="py-3 px-3">
                                          <div className="flex flex-col gap-1">
                                            <select
                                              value={f.scotterTeam}
                                              onChange={(e) => handleIndividualRemap(f.id, e.target.value)}
                                              className={`bg-slate-900 border text-xs font-bold rounded-lg p-1.5 w-full text-white ${
                                                mismatch ? 'border-amber-500 focus:border-amber-400' : 'border-slate-700 focus:border-blue-500'
                                              }`}
                                            >
                                              {SCOTTER_TEAMS.map((t) => (
                                                <option key={t.name} value={t.name}>
                                                  {t.name}
                                                </option>
                                              ))}
                                            </select>
                                            {mismatch && (
                                              <span className="text-[9px] text-amber-400 font-black flex items-center gap-1">
                                                ⚠️ Mismatched Name Suggested
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="py-3 px-3 text-slate-400 font-medium">
                                          {f.awayTeam}
                                        </td>
                                        {/* Pitch Format - Editable */}
                                        <td className="py-3 px-3 text-center whitespace-nowrap">
                                          <select
                                            value={f.pitchId}
                                            onChange={(e) => handleUpdateParsedField(f.id, 'pitchId', e.target.value as PitchSize)}
                                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 font-extrabold focus:outline-none focus:border-blue-500 text-center"
                                          >
                                            <option value="5v5">5v5</option>
                                            <option value="7v7">7v7</option>
                                            <option value="9v9">9v9</option>
                                            <option value="11v11">11v11</option>
                                          </select>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                          {isAlreadyBooked && matchBooking ? (
                                            <div className="flex flex-col items-center gap-1.5">
                                              <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center justify-center gap-1">
                                                <Check className="w-3.5 h-3.5" /> Booked
                                              </span>
                                              <button
                                                onClick={() => {
                                                  onCancelBooking(matchBooking.id);
                                                  setImportFeedback(`Successfully unbooked match for ${f.scotterTeam} on ${formatDateUK(f.date)} from the Pitch Diary.`);
                                                }}
                                                className="bg-red-500/10 hover:bg-red-500 text-red-400 border border-red-500/30 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded hover:text-white transition-all cursor-pointer"
                                                title="Unbook this fixture immediately from the pitch"
                                              >
                                                Unbook
                                              </button>
                                            </div>
                                          ) : isRealClash ? (
                                            <span className="bg-red-950/80 text-red-400 border border-red-800 text-[10px] font-black uppercase px-2 py-1 rounded-md">
                                              ❌ Clash: {matchBooking.teamName}
                                            </span>
                                          ) : (
                                            <span className="bg-blue-950/80 text-blue-400 border border-blue-800 text-[10px] font-black uppercase px-2 py-1 rounded-md">
                                              ✅ Ready
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                          <div className="flex items-center justify-center space-x-1">
                                            <button
                                              onClick={() => handleToggleHomeAway(f.id)}
                                              className="text-slate-400 hover:text-amber-400 p-1 rounded hover:bg-slate-900 transition-colors"
                                              title="Move to Away Match (Swap Home/Away)"
                                            >
                                              <ArrowRightLeft className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={() => {
                                                setParsedFixtures(prev => prev.filter(item => item.id !== f.id));
                                                setSelectedParsedIds(prev => prev.filter(id => id !== f.id));
                                              }}
                                              className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-slate-900 transition-colors"
                                              title="Remove Home Fixture"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {/* Away Fixtures Section */}
                        {awayParsedFixtures.length > 0 && (
                          <div className="space-y-3 pt-4 border-t border-slate-800">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div>
                                <h5 className="text-xs font-extrabold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                                  ✈️ Away Fixtures ({awayParsedFixtures.length})
                                </h5>
                                <p className="text-[10px] text-slate-400">
                                  These are detected as away matches (played at opponent grounds). They are kept separate and do not block home pitches. Click headers to sort.
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  const homeIds = homeParsedFixtures.map(f => f.id);
                                  setParsedFixtures(prev => prev.filter(f => homeIds.includes(f.id)));
                                }}
                                className="text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/30 border border-red-900/40 px-3 py-1.5 rounded-lg transition-colors uppercase tracking-wider text-[10px]"
                              >
                                Remove All Away Matches
                              </button>
                            </div>

                            <div className="overflow-x-auto rounded-lg border border-slate-800">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-900 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                                    {renderSortHeader('Date', 'date')}
                                    {renderSortHeader('Kick-Off Time', 'time')}
                                    {renderSortHeader('Scotter Team', 'scotterTeam')}
                                    {renderSortHeader('Pasted Home Team (Opponent)', 'homeTeam')}
                                    {renderSortHeader('Away Team (Scotter)', 'awayTeam')}
                                    <th className="py-2.5 px-3">Competition</th>
                                    <th className="py-2.5 px-3 text-center">Reference Status</th>
                                    <th className="py-2.5 px-3 text-center w-12">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-900 text-xs text-slate-300">
                                  {sortedAwayFixtures.map((f) => {
                                    return (
                                      <tr key={f.id} className="hover:bg-slate-900/60">
                                        <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-300">
                                          <div className="flex flex-col">
                                            <span className="font-bold text-white text-xs">{formatUKDateNumeric(f.date)}</span>
                                            <span className="text-[10px] text-slate-400">{formatDateUK(f.date, { includeWeekday: true, includeYear: false })}</span>
                                          </div>
                                        </td>
                                        <td className="py-3 px-3 whitespace-nowrap text-slate-300">
                                          {f.timeSlot ? f.timeSlot : <span className="text-slate-500 italic">--:--</span>}
                                        </td>
                                        <td className="py-3 px-3 font-semibold text-blue-400">
                                          {f.scotterTeam}
                                        </td>
                                        <td className="py-3 px-3 text-slate-400">
                                          {f.homeTeam}
                                        </td>
                                        <td className="py-3 px-3 text-slate-200 font-medium">
                                          {f.awayTeam}
                                        </td>
                                        <td className="py-3 px-3 text-slate-400">
                                          {f.competition}
                                        </td>
                                        <td className="py-3 px-3 text-center whitespace-nowrap">
                                          <span className="bg-slate-900 text-slate-400 border border-slate-800 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md">
                                            ✈️ Away Match
                                          </span>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                          <div className="flex items-center justify-center space-x-1">
                                            <button
                                              onClick={() => handleToggleHomeAway(f.id)}
                                              className="text-slate-400 hover:text-emerald-400 p-1 rounded hover:bg-slate-900 transition-colors"
                                              title="Move to Home Match (Swap Home/Away)"
                                            >
                                              <ArrowRightLeft className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={() => {
                                                setParsedFixtures(prev => prev.filter(item => item.id !== f.id));
                                                setSelectedParsedIds(prev => prev.filter(id => id !== f.id));
                                              }}
                                              className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-slate-900 transition-colors"
                                              title="Remove Away Match"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row justify-between items-center pt-2 gap-3">
                          <button
                            onClick={() => {
                              setParsedFixtures([]);
                              setSelectedParsedIds([]);
                              setPasteText('');
                              setImportFeedback('');
                            }}
                            className="bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2 px-4 rounded-xl border border-slate-800 transition-all uppercase tracking-wider w-full sm:w-auto"
                          >
                            Clear Parser Results
                          </button>
                          
                          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
                            {homeParsedFixtures.filter(f => selectedParsedIds.includes(f.id) && getFixtureStatus(f).type === 'BOOKED_SELF').length > 0 && (
                              <button
                                onClick={handleUnbookParsedFixtures}
                                className="bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold py-2.5 px-6 rounded-xl flex items-center justify-center space-x-2 shadow-md transition-all uppercase tracking-wider w-full sm:w-auto"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Unbook {homeParsedFixtures.filter(f => selectedParsedIds.includes(f.id) && getFixtureStatus(f).type === 'BOOKED_SELF').length} Selected</span>
                              </button>
                            )}
                            
                            <button
                              onClick={handleImportParsedFixtures}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold py-2.5 px-6 rounded-xl flex items-center justify-center space-x-2 shadow-md transition-all uppercase tracking-wider w-full sm:w-auto"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>Import and Book {homeParsedFixtures.filter(f => selectedParsedIds.includes(f.id)).length} Home Match(es)</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
