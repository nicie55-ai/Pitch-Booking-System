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
import { PitchSize, Booking, BookingStatus, PitchConfig, User } from '../types';
import { SCOTTER_TEAMS, MOCK_FA_FULLTIME_FIXTURES, FAFixture, ClubTeam } from '../mockData';
import { canManagerUnbook, isTeamMatch } from '../utils/bookingUtils';

// --- Top-Level Stateless Helpers (Hoisted and safe from Temporal Dead Zone) ---

function parseTimeToMinutes(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function getAdminEndTimeForSlot(pId: PitchSize, dateStr: string, slot: string): string {
  if (!slot || !dateStr) return '';
  const d = new Date(dateStr);
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

function parseFullTimeTabLine(line: string) {
  const cols = line.split('\t').map(c => c.trim());
  if (cols.length < 5) return null;

  const vsIdx = cols.findIndex(c => c.toLowerCase() === 'vs');
  if (vsIdx === -1) return null;

  const type = cols[0];
  const dateTimeStr = cols[1];

  let date = '';
  let timeSlot = '09:30';
  let hasExplicitTime = false;

  const dateRegex = /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/;
  const dateMatch = dateTimeStr.match(dateRegex);
  if (dateMatch) {
    let day = dateMatch[1].padStart(2, '0');
    let month = dateMatch[2].padStart(2, '0');
    let year = dateMatch[3];
    if (year.length === 2) year = '20' + year;
    date = `${year}-${month}-${day}`;
  }

  const timeRegex = /(\d{1,2}):(\d{2})/;
  const timeMatch = dateTimeStr.match(timeRegex);
  if (timeMatch) {
    timeSlot = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
    hasExplicitTime = true;
  }

  // Home Team is the first non-empty column in cols.slice(2, vsIdx)
  const homeTeam = cols.slice(2, vsIdx).find(c => c !== '') || 'Home Team';

  // Away Team is the first non-empty column in cols.slice(vsIdx + 1)
  const awayCols = cols.slice(vsIdx + 1).filter(c => c !== '');
  if (awayCols.length === 0) return null;

  const awayTeam = awayCols[0];

  const remainingCols = awayCols.slice(1).filter(c => c !== awayTeam);
  
  let venue = '';
  let competition = '';
  let statusNotes = '';

  const compRegex = /\b(u\d+|under\s+\d+|supreme|premier|divisional|division|cup|league|trophy|plate|january|february|march|april|may|june|july|august|september|october|november|december)\b/i;

  remainingCols.forEach(col => {
    const cl = col.toLowerCase();
    if (cl === 'postponed' || cl === 'cancelled' || cl === 'post' || cl === 'postp') {
      statusNotes = col;
    } else if (compRegex.test(col)) {
      competition = col;
    } else {
      venue = col;
    }
  });

  if (!competition) {
    competition = remainingCols[remainingCols.length - 1] || 'FA League Match';
  }
  if (!venue && remainingCols.length > 0) {
    venue = remainingCols[0];
  }

  return {
    type,
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

function findBestTeamMatch(pastedName: string): string {
  const cleanWord = (wd: string) => wd.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/s$/, ''); // normalize "u10s" -> "u10"
  
  const normalized = pastedName.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!normalized) return SCOTTER_TEAMS[0].name;

  // First, let's check for exact word combinations
  for (const team of SCOTTER_TEAMS) {
    const tName = team.name.toLowerCase();
    const tNorm = tName.replace(/[^a-z0-9]/g, '');
    if (tNorm === normalized) {
      return team.name;
    }
  }

  // Overlap matching
  let bestMatch = '';
  let highestScore = 0;
  const pastedWords = pastedName.toLowerCase().split(/\s+/).map(cleanWord).filter(Boolean);

  for (const team of SCOTTER_TEAMS) {
    const teamWords = team.name.toLowerCase().split(/\s+/).map(cleanWord).filter(Boolean);
    let score = 0;

    pastedWords.forEach((pw) => {
      teamWords.forEach((tw) => {
        if (tw === pw || tw.includes(pw) || pw.includes(tw)) {
          score += 1;
          // Heavy weight for matching age groups (like u7, u10)
          if (pw.match(/^u\d+$/) || pw.match(/^under\d+$/)) {
            score += 15;
          }
          // Suffix formats weights (saints, juniors, colts, girls)
          if (pw === 'saints' || pw === 'juniors' || pw === 'junior' || pw === 'colts' || pw === 'girls') {
            score += 5;
          }
        }
      });
    });

    if (score > highestScore) {
      highestScore = score;
      bestMatch = team.name;
    }
  }

  return bestMatch || SCOTTER_TEAMS[0].name;
}

const ALL_COMMON_SLOTS = [
  '08:30', '09:00', '09:30', '10:00', '10:30', '10:45', '11:00', '11:30', 
  '12:00', '12:30', '13:00', '13:15', '13:30', '14:00', '14:30', '15:00', 
  '15:30', '16:00', '16:30', '17:00'
];

function isNameMismatch(fixture: FAFixture) {
  const original = fixture.homeTeam.replace(/^Scotter\s+(United\s+)?/i, '').trim().toLowerCase();
  const mapped = fixture.scotterTeam.replace(/^Scotter\s+(United\s+)?/i, '').trim().toLowerCase();
  return original !== mapped;
}

interface AdminPanelProps {
  bookings: Booking[];
  pitchConfigs: PitchConfig[];
  selectedDate: string;
  onAddBookingsBulk: (newBookings: Booking[]) => void;
  onCancelBooking: (id: string) => void;
  onUpdateBooking?: (id: string, fields: Partial<Booking>) => void;
  currentUser: User;
  onRequestBooking?: (pitchId: PitchSize, slot: string, notes?: string, date?: string, existingBookingId?: string) => void;
  users?: User[];
  onUpdateUsers?: (newUsers: User[]) => void;
  faFixtures: FAFixture[];
  onUpdateFaFixtures: (fixtures: FAFixture[]) => void;
}

export default function AdminPanel({
  bookings,
  pitchConfigs,
  selectedDate,
  onAddBookingsBulk,
  onCancelBooking,
  onUpdateBooking,
  currentUser,
  onRequestBooking,
  users = [],
  onUpdateUsers,
  faFixtures,
  onUpdateFaFixtures,
}: AdminPanelProps) {
  // Extract Home and Away team names from booking notes or fallback to teamName
  const getHomeAndAwayForBooking = (b: Booking): { homeTeam: string; awayTeam: string } => {
    const faRegex = /\[FA Full-Time Auto-Import\]\s*[^:]+:\s*(.*?)\s+vs\s+(.*)/i;
    const match = b.notes.match(faRegex);
    if (match) {
      return {
        homeTeam: match[1].trim(),
        awayTeam: match[2].trim()
      };
    }

    const vsRegex = /(?:vs|v|against|-)\s+(.*)/i;
    const vsMatch = b.notes.match(vsRegex);
    if (vsMatch) {
      return {
        homeTeam: b.teamName,
        awayTeam: vsMatch[1].trim()
      };
    }

    return {
      homeTeam: b.teamName,
      awayTeam: 'Away Team'
    };
  };

  // Admin rules state
  const [rules, setRules] = useState({
    prevent5v5_11v11Overlap: true,
    maxHomeGamesPerWeek: true,
    fairDistributionOfKickoffs: true,
  });

  const [aiPolicyPrompt, setAiPolicyPrompt] = useState('');
  const [aiPolicyStatus, setAiPolicyStatus] = useState<{
    success: boolean;
    message: string;
    changes: string[];
  } | null>(null);

  const handleApplyAiPolicy = (prompt: string) => {
    if (!prompt.trim()) return;
    const lower = prompt.toLowerCase();
    const updatedRules = { ...rules };
    const changeLogs: string[] = [];

    // Check for overlap rule changes
    if (lower.includes('overlap') || lower.includes('5v5') || lower.includes('11v11')) {
      if (lower.includes('disable') || lower.includes('off') || lower.includes('stop') || lower.includes('remove') || lower.includes('no prevent')) {
        updatedRules.prevent5v5_11v11Overlap = false;
        changeLogs.push('5v5 & 11v11 Overlap Prevention: DISABLED ❌');
      } else if (lower.includes('enable') || lower.includes('on') || lower.includes('activate') || lower.includes('prevent')) {
        updatedRules.prevent5v5_11v11Overlap = true;
        changeLogs.push('5v5 & 11v11 Overlap Prevention: ENABLED ✅');
      }
    }

    // Check for home match warnings
    if (lower.includes('home') || lower.includes('limit') || lower.includes('warning') || lower.includes('max home')) {
      if (lower.includes('disable') || lower.includes('off') || lower.includes('stop') || lower.includes('remove') || lower.includes('no warn')) {
        updatedRules.maxHomeGamesPerWeek = false;
        changeLogs.push('Weekly Home Match Warning: DISABLED ❌');
      } else if (lower.includes('enable') || lower.includes('on') || lower.includes('activate') || lower.includes('warn')) {
        updatedRules.maxHomeGamesPerWeek = true;
        changeLogs.push('Weekly Home Match Warning: ENABLED ✅');
      }
    }

    // Check for fair kickoff distribution policy
    if (lower.includes('fair') || lower.includes('distribut') || lower.includes('even') || lower.includes('kickoff') || lower.includes('kick-off') || lower.includes('early')) {
      if (lower.includes('disable') || lower.includes('off') || lower.includes('stop') || lower.includes('remove')) {
        updatedRules.fairDistributionOfKickoffs = false;
        changeLogs.push('Fair Fixture Distribution Policy: DISABLED ❌');
      } else if (lower.includes('enable') || lower.includes('on') || lower.includes('activate') || lower.includes('spread') || lower.includes('fair')) {
        updatedRules.fairDistributionOfKickoffs = true;
        changeLogs.push('Fair Fixture Distribution Policy: ENABLED ✅');
      }
    }

    if (changeLogs.length > 0) {
      setRules(updatedRules as any);
      setAiPolicyStatus({
        success: true,
        message: `System Policy AI has processed your instructions: "${prompt}"`,
        changes: changeLogs,
      });
    } else {
      setAiPolicyStatus({
        success: false,
        message: `I analyzed your instruction "${prompt}" but couldn't map it to any standard constraints. Try terms like "overlap", "home games", "fair kickoff", or specify "enable"/"disable".`,
        changes: [],
      });
    }
  };

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
        
        // Pitch overlap check (same pitch, or 5v5 and 11v11 overlap)
        const pitchMatches = b1.pitchId === b2.pitchId || 
          (rules.prevent5v5_11v11Overlap && ((b1.pitchId === '5v5' && b2.pitchId === '11v11') || (b1.pitchId === '11v11' && b2.pitchId === '5v5')));
        if (!pitchMatches) return false;

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

  // FA Full Time state
  const [faClubId, setFaClubId] = useState<string>('SCOT-U-JFC-09');
  const [isSearchingFA, setIsSearchingFA] = useState<boolean>(false);
  const [faFixturesLoaded, setFaFixturesLoaded] = useState<boolean>(false);
  const loadedFixtures = faFixtures;
  const setLoadedFixtures = (updater: FAFixture[] | ((prev: FAFixture[]) => FAFixture[])) => {
    onUpdateFaFixtures(typeof updater === 'function' ? updater(faFixtures) : updater);
  };
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
  const [fulltimeMode, setFulltimeMode] = useState<'PASTE' | 'API'>('PASTE');

  // FA Filters & Checkbox Selections
  const [faFilterTeam, setFaFilterTeam] = useState<string>('');
  const [faFilterPitch, setFaFilterPitch] = useState<string>('');
  const [faFilterDate, setFaFilterDate] = useState<string>('');
  const [faFilterPeriod, setFaFilterPeriod] = useState<string>('ALL');
  const [selectedFixtureIds, setSelectedFixtureIds] = useState<string[]>([]);
  const [confirmUnbookFixtureId, setConfirmUnbookFixtureId] = useState<string | null>(null);

  // Clash resolution state
  const [resolvingClashId, setResolvingClashId] = useState<string | null>(null);
  const [alternativeSlot, setAlternativeSlot] = useState<string>('');
  const [existingBookingSlot, setExistingBookingSlot] = useState<string>('');
  const [rearrangeDate, setRearrangeDate] = useState<string>('');
  const [rearrangePitch, setRearrangePitch] = useState<PitchSize>('11v11');
  const [rearrangeSlot, setRearrangeSlot] = useState<string>('');

  // Sort state for loaded FA fixtures
  const [faSortField, setFaSortField] = useState<'date' | 'pitch' | 'team'>('date');
  const [faSortAsc, setFaSortAsc] = useState<boolean>(true);

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
    const baseDate = new Date(blockDate);
    const totalIterations = isRepeating ? repeatWeeks : 1;

    // Check for clashes across all scheduled dates using the respective slot rotation
    const clashDates: string[] = [];

    const config = pitchConfigs.find((p) => p.id === pitchSize);
    const slots = config ? config.defaultSlots : [];

    for (let i = 0; i < totalIterations; i++) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(baseDate.getDate() + i * 7);
      const formattedDate = currentDate.toISOString().split('T')[0];

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
          (rules.prevent5v5_11v11Overlap && ((pitchSize === '5v5' && b.pitchId === '11v11') || (pitchSize === '11v11' && b.pitchId === '5v5')));
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

  // Simulate loading from Full Time FA
  const handleSearchFAFixtures = () => {
    setIsSearchingFA(true);
    setFaFixturesLoaded(false);
    setImportFeedback(null);
    setFaFilterTeam('');
    setFaFilterPitch('');
    setFaFilterDate('');
    setFaFilterPeriod('ALL');

    setTimeout(() => {
      setIsSearchingFA(false);
      setFaFixturesLoaded(true);
      const optimized = optimizeFixturesSlots(MOCK_FA_FULLTIME_FIXTURES);
      setLoadedFixtures(optimized);
      
      // Auto-select all vacant fixtures initially
      const vacantIds = optimized
        .filter(f => {
          const status = bookings.find(
            (b) =>
              b.pitchId === f.pitchId &&
              b.date === f.date &&
              b.timeSlot === f.timeSlot &&
              b.status === BookingStatus.APPROVED
          );
          return !status; // Vacant
        })
        .map(f => f.id);
      setSelectedFixtureIds(vacantIds);
    }, 1500);
  };

  /**
   * Differentiate between Vacant, Booked by the SAME team, or CLASH (booked by a different team)
   */
  function getFixtureStatus(fixture: FAFixture) {
    // Check if there is ANY approved booking for this fixture on this pitch/date,
    // even if rescheduled to a different timeslot (Option A resolution)
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
        (rules.prevent5v5_11v11Overlap && ((fixture.pitchId === '5v5' && b.pitchId === '11v11') || (fixture.pitchId === '11v11' && b.pitchId === '5v5')));
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

      // Check if 5v5 and 11v11 overlap prevention is enabled and active
      if (rules.prevent5v5_11v11Overlap) {
        if (pitchId === '11v11' || pitchId === '5v5') {
          const crossPitchId: PitchSize = pitchId === '11v11' ? '5v5' : '11v11';
          const hasCrossClash = bookings.some((b) => {
            if (b.pitchId !== crossPitchId || b.date !== date) return false;
            if (b.status === BookingStatus.DECLINED || b.status === BookingStatus.UNBOOKED) return false;

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

  /**
   * Option A: Reschedule the incoming FA fixture to a vacant slot
   */
  const handleRescheduleFA = (fixture: FAFixture, chosenSlot: string) => {
    if (!chosenSlot) {
      setImportFeedback("Error: Please select a vacant slot.");
      return;
    }

    const newBooking: Booking = {
      id: `b-fa-resched-${Date.now()}`,
      pitchId: fixture.pitchId,
      date: fixture.date,
      timeSlot: chosenSlot,
      teamName: fixture.scotterTeam,
      managerName: currentUser.name,
      managerId: 'fa-auto-import',
      notes: `[FA Full-Time Rescheduled Import] Originally scheduled for ${fixture.timeSlot}. ${fixture.competition}: ${fixture.homeTeam} vs ${fixture.awayTeam}`,
      status: BookingStatus.APPROVED,
      createdAt: new Date().toISOString(),
    };

    onAddBookingsBulk([newBooking]);
    setImportFeedback(`Successfully rescheduled and booked FA fixture: ${fixture.homeTeam} vs ${fixture.awayTeam} at alternative slot ${chosenSlot}!`);
    setResolvingClashId(null);
    setAlternativeSlot('');
  };

  /**
   * Option B: Reschedule the existing booking to a vacant slot, and then book the FA fixture at its original slot
   */
  const handleRescheduleExistingAndBookFA = (fixture: FAFixture, clashingBooking: Booking, chosenSlot: string) => {
    if (!onUpdateBooking) {
      setImportFeedback("Error: Rescheduling existing bookings is currently unavailable.");
      return;
    }
    if (!chosenSlot) {
      setImportFeedback("Error: Please select a vacant slot.");
      return;
    }

    // Step 1: Move the existing booking to the chosen alternative slot
    onUpdateBooking(clashingBooking.id, {
      timeSlot: chosenSlot,
      notes: `${clashingBooking.notes || ''} [Rescheduled from ${clashingBooking.timeSlot} to resolve FA clash]`.trim()
    });

    // Step 2: Book the incoming FA fixture at its original time slot
    const newBooking: Booking = {
      id: `b-fa-import-${Date.now()}`,
      pitchId: fixture.pitchId,
      date: fixture.date,
      timeSlot: fixture.timeSlot,
      teamName: fixture.scotterTeam,
      managerName: currentUser.name,
      managerId: 'fa-auto-import',
      notes: `[FA Full-Time Auto-Import] ${fixture.competition}: ${fixture.homeTeam} vs ${fixture.awayTeam}`,
      status: BookingStatus.APPROVED,
      createdAt: new Date().toISOString(),
    };

    onAddBookingsBulk([newBooking]);
    setImportFeedback(`Successfully moved ${clashingBooking.teamName} to ${chosenSlot} and booked FA match at original slot ${fixture.timeSlot}!`);
    setResolvingClashId(null);
    setExistingBookingSlot('');
  };

  // Helper check for backwards compatibility / bulk filtering
  const isFixtureBooked = (fixture: FAFixture) => {
    return getFixtureStatus(fixture).type === 'BOOKED_SELF';
  };

  // Import a single FA fixture
  const handleImportFixture = (fixture: FAFixture) => {
    const statusInfo = getFixtureStatus(fixture);
    if (statusInfo.type === 'CLASH') {
      setImportFeedback(`Error: The slot on ${fixture.date} at ${fixture.timeSlot} is already booked by another team (${statusInfo.booking?.teamName}).`);
      return;
    }
    if (statusInfo.type === 'BOOKED_SELF') {
      setImportFeedback(`Information: This fixture is already in the diary.`);
      return;
    }

    const newBooking: Booking = {
      id: `b-fa-import-${Date.now()}`,
      pitchId: fixture.pitchId,
      date: fixture.date,
      timeSlot: fixture.timeSlot,
      teamName: fixture.scotterTeam,
      managerName: currentUser.name,
      managerId: 'fa-auto-import',
      notes: `[FA Full-Time Auto-Import] ${fixture.competition}: ${fixture.homeTeam} vs ${fixture.awayTeam}`,
      status: BookingStatus.APPROVED,
      createdAt: new Date().toISOString(),
    };

    onAddBookingsBulk([newBooking]);
    setImportFeedback(`Successfully imported fixture: ${fixture.homeTeam} vs ${fixture.awayTeam}!`);
  };

  // Rearrange a loaded fixture details (and optionally move its diary booking if already booked)
  const handleSaveFixtureRearrangement = (fixtureId: string, newDate: string, newPitch: PitchSize, newTime: string) => {
    const prevFixture = loadedFixtures.find(f => f.id === fixtureId);
    if (!prevFixture) return;

    setLoadedFixtures(prev => prev.map(f => {
      if (f.id === fixtureId) {
        return {
          ...f,
          date: newDate,
          pitchId: newPitch,
          timeSlot: newTime
        };
      }
      return f;
    }));

    // Find if there is an approved diary booking that corresponds to this fixture BEFORE the update.
    const relatedBooking = bookings.find(b => {
      if (b.status !== BookingStatus.APPROVED) return false;
      
      const isSameTeam =
        b.teamName.toLowerCase().trim() === prevFixture.scotterTeam.toLowerCase().trim() ||
        b.teamName.toLowerCase().includes(prevFixture.scotterTeam.toLowerCase()) ||
        prevFixture.scotterTeam.toLowerCase().includes(b.teamName.toLowerCase());
      
      const hasFixtureNotes = b.notes && (
        b.notes.toLowerCase().includes(prevFixture.homeTeam.toLowerCase()) ||
        b.notes.toLowerCase().includes(prevFixture.awayTeam.toLowerCase())
      );
      
      return isSameTeam && (b.date === prevFixture.date || hasFixtureNotes);
    });

    if (relatedBooking && onUpdateBooking) {
      onUpdateBooking(relatedBooking.id, {
        date: newDate,
        pitchId: newPitch,
        timeSlot: newTime,
        notes: `[FA Full-Time Rearranged] ${prevFixture.competition}: ${prevFixture.homeTeam} vs ${prevFixture.awayTeam} (Rearranged to ${newTime} on ${newDate})`
      });
      setImportFeedback(`Successfully rearranged "${prevFixture.homeTeam} vs ${prevFixture.awayTeam}" to ${newDate} ${newTime} on ${newPitch} and updated its active diary booking!`);
    } else {
      setImportFeedback(`Successfully rearranged "${prevFixture.homeTeam} vs ${prevFixture.awayTeam}" to ${newDate} ${newTime} on ${newPitch}!`);
    }

    setResolvingClashId(null);
  };

  // Filtered and Sorted fixtures computed list
  const filteredFixtures = loadedFixtures.filter((f) => {
    const matchesTeam = !faFilterTeam || f.scotterTeam === faFilterTeam;
    const matchesPitch = !faFilterPitch || f.pitchId === faFilterPitch;
    const matchesDate = !faFilterDate || f.date === faFilterDate;
    
    let matchesPeriod = true;
    if (faFilterPeriod === 'PAST_MARCH_APRIL') {
      matchesPeriod = f.date >= '2026-03-01' && f.date <= '2026-04-30';
    } else if (faFilterPeriod === 'PAST_JUNE') {
      matchesPeriod = f.date >= '2026-06-01' && f.date <= '2026-06-30';
    } else if (faFilterPeriod === 'UPCOMING') {
      matchesPeriod = f.date >= '2026-07-01';
    }
    
    return matchesTeam && matchesPitch && matchesDate && matchesPeriod;
  }).sort((a, b) => {
    const multiplier = faSortAsc ? 1 : -1;
    if (faSortField === 'date') {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date) * multiplier;
      }
      return a.timeSlot.localeCompare(b.timeSlot) * multiplier;
    }
    if (faSortField === 'pitch') {
      if (a.pitchId !== b.pitchId) {
        return a.pitchId.localeCompare(b.pitchId) * multiplier;
      }
      return a.date.localeCompare(b.date) * multiplier;
    }
    if (faSortField === 'team') {
      const aTeam = a.scotterTeam || a.homeTeam;
      const bTeam = b.scotterTeam || b.homeTeam;
      return aTeam.localeCompare(bTeam) * multiplier;
    }
    return 0;
  });

  const selectableFilteredFixtures = filteredFixtures;
  const allSelectableFilteredSelected =
    selectableFilteredFixtures.length > 0 &&
    selectableFilteredFixtures.every((f) => selectedFixtureIds.includes(f.id));

  const handleToggleSelectAllFiltered = () => {
    const filteredIds = selectableFilteredFixtures.map((f) => f.id);
    if (allSelectableFilteredSelected) {
      // Deselect filtered
      setSelectedFixtureIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      // Select filtered
      setSelectedFixtureIds((prev) => {
        const next = new Set([...prev, ...filteredIds]);
        return Array.from(next);
      });
    }
  };

  const handleToggleSelectAllOverall = () => {
    const allSelectable = loadedFixtures;
    const allSelectableIds = allSelectable.map((f) => f.id);
    const allSelected =
      allSelectable.length > 0 && allSelectable.every((f) => selectedFixtureIds.includes(f.id));

    if (allSelected) {
      setSelectedFixtureIds([]);
    } else {
      setSelectedFixtureIds(allSelectableIds);
    }
  };

  const toggleFixtureSelection = (id: string) => {
    setSelectedFixtureIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk import selected vacant FA fixtures
  const handleBulkImportFixtures = () => {
    const selectedVacant = filteredFixtures.filter(
      (f) => selectedFixtureIds.includes(f.id) && getFixtureStatus(f).type === 'VACANT'
    );

    if (selectedVacant.length === 0) {
      setImportFeedback('No pending/vacant fixtures are selected to book!');
      return;
    }

    const newBookings: Booking[] = selectedVacant.map((f, idx) => ({
      id: `b-fa-bulk-${Date.now()}-${idx}`,
      pitchId: f.pitchId,
      date: f.date,
      timeSlot: f.timeSlot,
      teamName: f.scotterTeam,
      managerName: currentUser.name,
      managerId: 'fa-auto-import',
      notes: `[FA Full-Time Bulk Import] ${f.competition}: ${f.homeTeam} vs ${f.awayTeam}`,
      status: BookingStatus.APPROVED,
      createdAt: new Date().toISOString(),
    }));

    onAddBookingsBulk(newBookings);
    setImportFeedback(`Successfully batch imported ${selectedVacant.length} selected fixtures directly into the Pitch Diary!`);
  };

  // Bulk unbook selected booked FA fixtures
  const handleBulkUnbookFixtures = () => {
    const selectedBooked = filteredFixtures.filter(
      (f) => selectedFixtureIds.includes(f.id) && getFixtureStatus(f).type === 'BOOKED_SELF'
    );

    if (selectedBooked.length === 0) {
      setImportFeedback('No booked fixtures are selected to unbook!');
      return;
    }

    let count = 0;
    selectedBooked.forEach((f) => {
      const statusInfo = getFixtureStatus(f);
      if (statusInfo.booking) {
        onCancelBooking(statusInfo.booking.id);
        count++;
      }
    });

    // Clear selection for these unbooked fixtures
    const unbookedIds = selectedBooked.map((f) => f.id);
    setSelectedFixtureIds((prev) => prev.filter((id) => !unbookedIds.includes(id)));

    setImportFeedback(`Successfully batch unbooked ${count} selected fixtures from the Pitch Diary!`);
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
    if (confirm('Are you sure you want to delete this coach account?')) {
      if (onUpdateUsers) {
        onUpdateUsers(users.filter((u) => u.id !== id));
        setCoachSuccess('Coach account successfully deleted.');
      }
    }
  };

  // Paste Fixtures parser & helpers
  function optimizeFixturesSlots(fixtures: FAFixture[]): FAFixture[] {
    const datesGroup: Record<string, FAFixture[]> = {};
    
    fixtures.forEach(f => {
      const isHome = f.homeTeam.toLowerCase().includes('scotter');
      if (isHome) {
        if (!datesGroup[f.date]) datesGroup[f.date] = [];
        datesGroup[f.date].push(f);
      }
    });

    const pitchSlots: Record<string, string[]> = {
      '5v5': ['09:45', '10:45', '11:45'],
      '7v7': ['09:30', '10:45', '12:00', '13:15'],
      '9v9': ['09:30', '11:00', '12:30'],
      '11v11': ['10:00', '12:00', '14:00', '16:00'],
    };

    const pitchPriority: Record<string, number> = {
      '11v11': 1,
      '9v9': 2,
      '7v7': 3,
      '5v5': 4,
    };

    const optimizedMap = new Map<string, string>();

    Object.entries(datesGroup).forEach(([date, dateFixtures]) => {
      // Sort fixtures so more constrained pitch sizes are optimized first
      const sortedFixtures = [...dateFixtures].sort((a, b) => {
        const priorityA = pitchPriority[a.pitchId] || 99;
        const priorityB = pitchPriority[b.pitchId] || 99;
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        const timeCompare = a.timeSlot.localeCompare(b.timeSlot);
        if (timeCompare !== 0) return timeCompare;
        return a.id.localeCompare(b.id);
      });

      const assigned: Array<{ pitchId: PitchSize; slot: string }> = [];

      sortedFixtures.forEach((f) => {
        const slots = pitchSlots[f.pitchId] || ['09:30', '10:45', '12:00'];

        // Filter slots to only those that do not clash with existing bookings OR with already assigned slots on this date
        const vacantSlots = slots.filter((slotStr) => {
          const startMins = parseTimeToMinutes(slotStr);
          const endMins = parseTimeToMinutes(getAdminEndTimeForSlot(f.pitchId, date, slotStr));

          // 1. Check against existing approved/pending bookings
          const hasBookingOverlap = bookings.some((b) => {
            if (b.date !== date) return false;
            if (b.status === BookingStatus.DECLINED || b.status === BookingStatus.UNBOOKED) return false;

            const pitchMatches = b.pitchId === f.pitchId || 
              (rules.prevent5v5_11v11Overlap && ((f.pitchId === '5v5' && b.pitchId === '11v11') || (f.pitchId === '11v11' && b.pitchId === '5v5')));
            if (!pitchMatches) return false;

            const bStart = parseTimeToMinutes(b.timeSlot);
            const bEnd = parseTimeToMinutes(b.endTime || getAdminEndTimeForSlot(b.pitchId, b.date, b.timeSlot));

            return startMins < bEnd && bStart < endMins;
          });

          if (hasBookingOverlap) return false;

          // 2. Check against already assigned slots in this batch
          const hasAssignedOverlap = assigned.some((item) => {
            const pitchMatches = item.pitchId === f.pitchId ||
              (rules.prevent5v5_11v11Overlap && ((f.pitchId === '5v5' && item.pitchId === '11v11') || (f.pitchId === '11v11' && item.pitchId === '5v5')));
            if (!pitchMatches) return false;

            const itemStart = parseTimeToMinutes(item.slot);
            const itemEnd = parseTimeToMinutes(getAdminEndTimeForSlot(item.pitchId, date, item.slot));

            return startMins < itemEnd && itemStart < endMins;
          });

          return !hasAssignedOverlap;
        });

        // Choose the target slot
        let targetSlot = '';
        if (vacantSlots.includes(f.timeSlot)) {
          targetSlot = f.timeSlot;
        } else if (vacantSlots.length > 0) {
          targetSlot = vacantSlots[0];
        } else {
          // Fallback if no vacant slot
          const samePitchAssignedCount = assigned.filter(item => item.pitchId === f.pitchId).length;
          targetSlot = slots[samePitchAssignedCount % slots.length];
        }

        assigned.push({ pitchId: f.pitchId, slot: targetSlot });
        optimizedMap.set(f.id, targetSlot);
      });
    });

    return fixtures.map(f => {
      if (optimizedMap.has(f.id)) {
        return {
          ...f,
          timeSlot: optimizedMap.get(f.id)!,
        };
      }
      return f;
    });
  };

  const handleParsePastedFixtures = () => {
    if (!pasteText.trim()) {
      setImportFeedback('Please paste some fixture text first.');
      return;
    }

    const lines = pasteText.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsed: FAFixture[] = [];
    const defaultSlotCount: Record<string, number> = {};

    const pitchSlots: Record<string, string[]> = {
      '5v5': ['09:45', '10:45', '11:45'],
      '7v7': ['09:30', '10:45', '12:00', '13:15'],
      '9v9': ['09:30', '11:00', '12:30'],
      '11v11': ['10:00', '12:00', '14:00', '16:00'],
    };

    lines.forEach((line, idx) => {
      const lower = line.toLowerCase();
      // Skip header lines
      if (lower.includes('home team') && lower.includes('away team')) return;
      if (lower.startsWith('date\t') || lower.startsWith('time\t')) return;

      // Check if it's a tab-separated line from Full Time
      if (line.includes('\t') && lower.includes('vs')) {
        const tabData = parseFullTimeTabLine(line);
        if (tabData) {
          const homeTeam = tabData.homeTeam;
          const awayTeam = tabData.awayTeam;
          const date = tabData.date || selectedDate;
          let timeSlot = tabData.timeSlot;
          const hasExplicitTime = tabData.hasExplicitTime;
          const competition = tabData.statusNotes ? `[${tabData.statusNotes}] ${tabData.competition}` : tabData.competition;

          if (homeTeam && homeTeam.toLowerCase() !== 'home' && homeTeam.toLowerCase() !== 'home team') {
            let scotterTeam = '';
            if (homeTeam.toLowerCase().includes('scotter')) {
              scotterTeam = findBestTeamMatch(homeTeam);
            } else if (awayTeam.toLowerCase().includes('scotter')) {
              scotterTeam = findBestTeamMatch(awayTeam);
            } else {
              scotterTeam = findBestTeamMatch(homeTeam);
            }

            const teamObj = SCOTTER_TEAMS.find((t) => t.name === scotterTeam);
            const pitchId = teamObj ? teamObj.pitchSize : '11v11';

            if (!hasExplicitTime) {
              const slotKey = `${date}_${pitchId}`;
              const currentCount = defaultSlotCount[slotKey] || 0;
              const slots = pitchSlots[pitchId] || ['09:30', '10:45', '12:00'];
              timeSlot = slots[currentCount % slots.length];
              defaultSlotCount[slotKey] = currentCount + 1;
            }

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

      let date = selectedDate;
      let timeSlot = '09:30';
      let hasExplicitTime = false;
      let homeTeam = '';
      let awayTeam = '';
      let competition = 'FA League Match';

      // 1. Regex for DD/MM/YYYY or YYYY-MM-DD
      const dateRegex = /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/;
      const dateMatch = line.match(dateRegex);
      if (dateMatch) {
        let day = dateMatch[1].padStart(2, '0');
        let month = dateMatch[2].padStart(2, '0');
        let year = dateMatch[3];
        if (year.length === 2) year = '20' + year;
        date = `${year}-${month}-${day}`;
        line = line.replace(dateMatch[0], ' ');
      } else {
        const writtenDateRegex = /(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/i;
        const writtenMatch = line.match(writtenDateRegex);
        if (writtenMatch) {
          const day = parseInt(writtenMatch[1], 10);
          const monthStr = writtenMatch[2].toLowerCase();
          const months: Record<string, string> = {
            jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
            jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
          };
          const month = months[monthStr];
          date = `2026-${month}-${String(day).padStart(2, '0')}`;
          line = line.replace(writtenMatch[0], ' ');
        }
      }

      // 2. Regex for HH:MM
      const timeRegex = /(\d{1,2}):(\d{2})/;
      const timeMatch = line.match(timeRegex);
      if (timeMatch) {
        timeSlot = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
        line = line.replace(timeMatch[0], ' ');
        hasExplicitTime = true;
      }

      // 3. Teams extraction
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
          if (t && tl !== 'cup' && tl !== 'league' && tl !== 'vs' && tl !== 'v' && !tl.includes('divisional') && !tl.includes('division') && !tl.includes('trophy')) {
            homeTeam = t;
            break;
          }
        }
        // Away team is to the right of vsIdx
        for (let i = vsIdx + 1; i < tabs.length; i++) {
          const t = tabs[i];
          const tl = t.toLowerCase();
          // Skip venue indicators or competitions
          if (t && tl !== 'vs' && tl !== 'v' && !tl.includes('park') && !tl.includes('ground') && !tl.includes('field') && !tl.includes('stadium') && !tl.includes('cup') && !tl.includes('league') && !tl.includes('divisional') && !tl.includes('division') && !tl.includes('trophy')) {
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
          return tl !== homeTeam.toLowerCase() && tl !== awayTeam.toLowerCase() && (tl.includes('cup') || tl.includes('league') || tl.includes('divisional') || tl.includes('division') || tl.includes('trophy'));
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
        const suggestedTeam = findBestTeamMatch(homeTeam);
        const teamObj = SCOTTER_TEAMS.find((t) => t.name === suggestedTeam);
        const pitchId = teamObj ? teamObj.pitchSize : '11v11';

        if (!hasExplicitTime) {
          const slotKey = `${date}_${pitchId}`;
          const currentCount = defaultSlotCount[slotKey] || 0;
          const slots = pitchSlots[pitchId] || ['09:30', '10:45', '12:00'];
          timeSlot = slots[currentCount % slots.length];
          defaultSlotCount[slotKey] = currentCount + 1;
        }

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
      setImportFeedback('Error: Could not parse any fixtures from the pasted text. Please verify the format (e.g. tab-separated, vs separators, dates, times).');
    } else {
      const optimized = optimizeFixturesSlots(parsed);
      setParsedFixtures(optimized);
      const homeFixtureIds = optimized.filter((p) => p.homeTeam.toLowerCase().includes('scotter')).map((p) => p.id);
      setSelectedParsedIds(homeFixtureIds);
      const awayCount = optimized.length - homeFixtureIds.length;
      if (awayCount > 0) {
        setImportFeedback(`Successfully parsed ${optimized.length} fixtures with slot optimization! ${homeFixtureIds.length} home matches are selected. ${awayCount} away matches have been automatically unticked.`);
      } else {
        setImportFeedback(`Successfully parsed ${optimized.length} fixtures with slot optimization! Check the home team name-mappings and tick checkboxes below to bulk import.`);
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

    setImportFeedback(`Successfully bulk remapped ${selectedParsedIds.length} ticked fixture(s) to "${bulkRemapTeam}".`);
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
          const isNowHome = updatedHome.toLowerCase().includes('scotter');
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
        const isHome = updatedFixture.homeTeam.toLowerCase().includes('scotter');
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
    const homeMatchesToBook = selectedToBook.filter((f) => f.homeTeam.toLowerCase().includes('scotter'));
    const awayMatchesSkipped = selectedToBook.filter((f) => !f.homeTeam.toLowerCase().includes('scotter'));

    // Filter out already booked matches under their mapped scotter team to prevent duplicate booking actions
    const newHomeMatchesToBook = homeMatchesToBook.filter((f) => {
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
      setImportFeedback('Info: Selected home matches are already successfully booked in the Pitch Diary!');
      return;
    }

    // Check for clashes on unbooked home matches only using precise interval overlap detection
    // First, check for mutual overlaps/clashes among the selected home matches themselves
    const mutualClashing: FAFixture[] = [];
    for (let i = 0; i < newHomeMatchesToBook.length; i++) {
      const f1 = newHomeMatchesToBook[i];
      const f1Start = parseTimeToMinutes(f1.timeSlot);
      const f1End = parseTimeToMinutes(getAdminEndTimeForSlot(f1.pitchId, f1.date, f1.timeSlot));

      for (let j = i + 1; j < newHomeMatchesToBook.length; j++) {
        const f2 = newHomeMatchesToBook[j];
        if (f1.date !== f2.date) continue;

        const pitchMatches = f1.pitchId === f2.pitchId ||
          (rules.prevent5v5_11v11Overlap && ((f1.pitchId === '5v5' && f2.pitchId === '11v11') || (f1.pitchId === '11v11' && f2.pitchId === '5v5')));
        if (!pitchMatches) continue;

        const f2Start = parseTimeToMinutes(f2.timeSlot);
        const f2End = parseTimeToMinutes(getAdminEndTimeForSlot(f2.pitchId, f2.date, f2.timeSlot));

        if (f1Start < f2End && f2Start < f1End) {
          if (!mutualClashing.includes(f1)) mutualClashing.push(f1);
          if (!mutualClashing.includes(f2)) mutualClashing.push(f2);
        }
      }
    }

    if (mutualClashing.length > 0) {
      const clashList = mutualClashing.map(f => `${f.date} @ ${f.timeSlot} (${f.scotterTeam} / ${f.pitchId})`).join(', ');
      setImportFeedback(`Error: Mutual overlaps detected within your selected import list (${clashList}). Under current rules, 5v5 and 11v11 (or identical pitches) cannot be scheduled at overlapping times on the same date. Please adjust their times or pitches before importing.`);
      return;
    }

    const clashingSelected = newHomeMatchesToBook.filter((f) => {
      const fStart = parseTimeToMinutes(f.timeSlot);
      const fEnd = parseTimeToMinutes(getAdminEndTimeForSlot(f.pitchId, f.date, f.timeSlot));

      return bookings.some((b) => {
        const pitchMatches = b.pitchId === f.pitchId || 
          (rules.prevent5v5_11v11Overlap && ((f.pitchId === '5v5' && b.pitchId === '11v11') || (f.pitchId === '11v11' && b.pitchId === '5v5')));
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
      return {
        id: `b-pasted-import-${Date.now()}-${idx}`,
        pitchId: f.pitchId,
        date: f.date,
        timeSlot: f.timeSlot,
        teamName: f.scotterTeam,
        managerName: currentUser.name,
        managerId: 'fa-auto-import',
        notes: `[FA Copy & Paste Import] ${f.competition}: ${f.homeTeam} vs ${f.awayTeam}`,
        status: BookingStatus.APPROVED,
        createdAt: new Date().toISOString(),
      };
    });

    if (newBookings.length > 0) {
      onAddBookingsBulk(newBookings);
    }

    if (awayMatchesSkipped.length > 0) {
      setImportFeedback(`Successfully imported and booked ${newBookings.length} home match(es) directly into the Pitch Diary! ${awayMatchesSkipped.length} away match(es) were skipped (not scheduled on home slots).`);
    } else {
      setImportFeedback(`Successfully imported and booked ${newBookings.length} match(es) directly into the Pitch Diary!`);
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
    const homeFixtures = parsedFixtures.filter(f => f.homeTeam.toLowerCase().includes('scotter'));
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
              The following fixtures are booked on the same pitch size and date. Since we ignore kick-off times, these slots are flagged as overlapping:
            </p>
            <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
              {overlappingIssues.map((issue) => (
                <div key={issue.id} className="bg-slate-950/60 rounded-lg p-3 border border-red-500/15 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-1.5 text-slate-200 font-bold">
                      <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                      <span className="text-red-400 font-black uppercase tracking-wide">Date:</span>
                      <span>{new Date(issue.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
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
                      {pitchConfigs.map((p) => (
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
                          Until {new Date(new Date(blockDate).getTime() + (repeatWeeks - 1) * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
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
                          5v5 & 11v11 Overlap Prevention
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          Prevent concurrent games on the 5v5 and 11v11 pitches (due to 5v5 being inside/on the 11v11 pitch).
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

                {/* Module 2: AI Constraints & Policies Assistant */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <div>
                      <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">AI Policy & Constraints Assistant</h4>
                      <p className="text-[10px] text-slate-400">Use AI to automatically adjust system rules, scheduling behaviors, and policy values using natural language instructions.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <textarea
                      value={aiPolicyPrompt}
                      onChange={(e) => setAiPolicyPrompt(e.target.value)}
                      placeholder="e.g. 'Disable buffer times and make sure early kickoffs are fairly spread' or 'Deactivate 5v5 overlap checks and enable home limit warnings'"
                      className="w-full h-20 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-medium placeholder-slate-500 resize-none"
                    />

                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[9px] font-semibold text-slate-500 italic">Powered by Gemini AI Policy Engine</span>
                      <button
                        type="button"
                        onClick={() => {
                          handleApplyAiPolicy(aiPolicyPrompt);
                        }}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition-all flex items-center space-x-1.5 whitespace-nowrap shadow-sm hover:shadow"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                        <span>Apply Policy with AI</span>
                      </button>
                    </div>

                    {aiPolicyStatus && (
                      <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 animate-fade-in ${
                        aiPolicyStatus.success 
                          ? 'bg-purple-950/40 border-purple-800/40 text-purple-200' 
                          : 'bg-red-950/40 border-red-800/40 text-red-200'
                      }`}>
                        <p className="font-extrabold flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                          {aiPolicyStatus.success ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-purple-400" />
                              Policy Instructions Applied
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                              Policy Matching Error
                            </>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{aiPolicyStatus.message}</p>
                        {aiPolicyStatus.changes.length > 0 && (
                          <div className="pt-1.5 border-t border-purple-900/30 space-y-1">
                            <p className="text-[9px] font-extrabold uppercase text-purple-400">Changed Constraints:</p>
                            {aiPolicyStatus.changes.map((log, idx) => (
                              <div key={idx} className="font-mono text-[10px] text-slate-300 flex items-center gap-1.5">
                                <span className="text-purple-400">•</span>
                                {log}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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
                                  new Date(b.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
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
                                              (rules.prevent5v5_11v11Overlap && ((editPitch === '5v5' && other.pitchId === '11v11') || (editPitch === '11v11' && other.pitchId === '5v5')));
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
                                {new Date(b.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
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
              {/* Inner Full-Time Mode Selector */}
              <div className="flex border-b border-slate-800 pb-px gap-1">
                <button
                  onClick={() => setFulltimeMode('PASTE')}
                  className={`py-2 px-4 text-xs font-bold border-b-2 transition-all ${
                    fulltimeMode === 'PASTE'
                      ? 'border-blue-500 text-white font-extrabold'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  📄 Copy & Paste Fixtures
                </button>
                <button
                  onClick={() => setFulltimeMode('API')}
                  className={`py-2 px-4 text-xs font-bold border-b-2 transition-all ${
                    fulltimeMode === 'API'
                      ? 'border-blue-500 text-white font-extrabold'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  🌐 FA Full-Time Search Simulation
                </button>
              </div>

              {fulltimeMode === 'PASTE' && (
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
                    const homeParsedFixtures = parsedFixtures.filter(f => f.homeTeam.toLowerCase().includes('scotter'));
                    const awayParsedFixtures = parsedFixtures.filter(f => !f.homeTeam.toLowerCase().includes('scotter'));
                    
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

                          {/* Bulk Remap Control */}
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
                                        {/* Date cell - Editable */}
                                        <td className="py-3 px-3 whitespace-nowrap">
                                          <input
                                            type="text"
                                            value={f.date}
                                            onChange={(e) => handleUpdateParsedField(f.id, 'date', e.target.value)}
                                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-bold w-24 text-center focus:border-blue-500 focus:outline-none"
                                            placeholder="D/M/YY"
                                          />
                                        </td>
                                        {/* TimeSlot cell - Editable */}
                                        <td className="py-3 px-3 whitespace-nowrap">
                                          <select
                                            value={f.timeSlot}
                                            onChange={(e) => handleUpdateParsedField(f.id, 'timeSlot', e.target.value)}
                                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-semibold focus:outline-none focus:border-blue-500 text-center w-20"
                                          >
                                            {ALL_COMMON_SLOTS.map(slot => (
                                              <option key={slot} value={slot}>{slot}</option>
                                            ))}
                                            {!ALL_COMMON_SLOTS.includes(f.timeSlot) && (
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
                                                  setImportFeedback(`Successfully unbooked match for ${f.scotterTeam} on ${f.date} from the Pitch Diary.`);
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
                                          {f.date}
                                        </td>
                                        <td className="py-3 px-3 whitespace-nowrap text-slate-300">
                                          {f.timeSlot}
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
              )}

              {fulltimeMode === 'API' && (
                <>
                  {/* FA Search control */}
              <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-600 text-white rounded-lg p-2 font-bold text-sm tracking-tighter">
                    FA
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Football Association Full-Time Database
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Synchronize scheduled home league fixtures with the club pitch calendar
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 w-full md:w-auto">
                  <div className="flex bg-slate-900 border border-slate-700 rounded-lg overflow-hidden flex-grow md:flex-grow-0">
                    <span className="bg-slate-800 text-slate-400 px-3 py-2 text-xs font-bold border-r border-slate-700">
                      CLUB ID
                    </span>
                    <input
                      type="text"
                      value={faClubId}
                      onChange={(e) => setFaClubId(e.target.value)}
                      placeholder="e.g. SCOT-U-JFC"
                      className="bg-transparent text-xs font-bold text-white p-2 w-28 focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={handleSearchFAFixtures}
                    disabled={isSearchingFA}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center space-x-2 shadow transition-colors flex-shrink-0"
                  >
                    {isSearchingFA ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span>{isSearchingFA ? 'Fetching...' : 'Query FA System'}</span>
                  </button>
                </div>
              </div>

              {/* FA Club ID & Leagues Explanation Card */}
              <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl space-y-3">
                <div className="flex items-start space-x-2.5 text-blue-400">
                  <HelpCircle className="w-4 h-4 mt-0.5 text-blue-400 flex-shrink-0" />
                  <div>
                    <h5 className="text-xs font-black uppercase tracking-wider text-slate-200">
                      How FA Full-Time Club ID & Leagues Work
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      Your unique Club ID (<strong className="text-blue-300 font-bold">{faClubId}</strong>) serves as a parent reference. Because all Scotter United teams are registered under this central club account, querying by this ID pulls fixtures from <strong className="text-slate-300 font-extrabold">all 5 leagues</strong> simultaneously:
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
                  <div className="bg-slate-950 border border-slate-800/80 p-2 rounded-lg text-center">
                    <span className="block text-[10px] font-black text-blue-400">Jack Kalson</span>
                    <span className="text-[9px] text-slate-400">Junior League</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800/80 p-2 rounded-lg text-center">
                    <span className="block text-[10px] font-black text-emerald-400">Scunthorpe Youth</span>
                    <span className="text-[9px] text-slate-400">Youth League</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800/80 p-2 rounded-lg text-center">
                    <span className="block text-[10px] font-black text-purple-400">Scunthorpe Mini</span>
                    <span className="text-[9px] text-slate-400">Mini Soccer</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800/80 p-2 rounded-lg text-center">
                    <span className="block text-[10px] font-black text-pink-400">Lincs Women</span>
                    <span className="text-[9px] text-slate-400">& Girls League</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800/80 p-2 rounded-lg text-center col-span-2 sm:col-span-1">
                    <span className="block text-[10px] font-black text-amber-400">Lincs County</span>
                    <span className="text-[9px] text-slate-400">Veterans League</span>
                  </div>
                </div>

                <div className="bg-blue-950/20 border border-blue-900/30 p-2.5 px-3.5 rounded-lg text-[10.5px] text-slate-400 flex items-center gap-2">
                  <span className="bg-blue-900/50 text-blue-200 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase">Year-Round Audit</span>
                  <span>
                    Both past fixtures (including <strong className="text-white">March & April</strong>) and upcoming matchdays are fully accessible to ensure correct historic tracking and prevent slot duplication.
                  </span>
                </div>
              </div>

              {/* Feedback Message */}
              {importFeedback && (
                <div className="bg-blue-950/80 border border-blue-800 text-blue-300 px-4 py-3 rounded-lg text-xs font-bold flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span>{importFeedback}</span>
                </div>
              )}

              {/* Simulation Result */}
              {!faFixturesLoaded && !isSearchingFA && (
                <div className="py-10 text-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/40">
                  <Info className="w-8 h-8 text-slate-500 mx-auto mb-2.5" />
                  <p className="text-xs font-bold text-slate-400">FA Full-Time Sync Ready</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                    Click "Query FA System" above to query the upcoming scheduled fixtures list for the club's age sections.
                  </p>
                </div>
              )}

              {isSearchingFA && (
                <div className="py-12 text-center border border-slate-800 rounded-xl bg-slate-900/20">
                  <RefreshCw className="w-8 h-8 text-blue-500 mx-auto animate-spin mb-3" />
                  <p className="text-xs font-bold text-slate-300">Searching FA Match Databases...</p>
                  <p className="text-[11px] text-slate-500 mt-1">Downloading schedules, verifying home/away layouts & kick-off grids</p>
                </div>
              )}

              {faFixturesLoaded && (
                <div className="space-y-4">
                  {/* Filters bar */}
                  <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl space-y-4">
                    <div className="flex items-center space-x-2 text-blue-400">
                      <Sparkles className="w-4 h-4" />
                      <h5 className="text-xs font-black uppercase tracking-wider">Filter FA Fixtures</h5>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Filter by Team</label>
                        <select
                          value={faFilterTeam}
                          onChange={(e) => setFaFilterTeam(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="">All Teams ({Array.from(new Set<string>(loadedFixtures.map(f => f.scotterTeam))).length})</option>
                          {Array.from(new Set<string>(loadedFixtures.map(f => f.scotterTeam))).sort().map((t: string) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Filter by Pitch Format</label>
                        <select
                          value={faFilterPitch}
                          onChange={(e) => setFaFilterPitch(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="">All Formats ({Array.from(new Set<string>(loadedFixtures.map(f => f.pitchId))).length})</option>
                          {Array.from(new Set<string>(loadedFixtures.map(f => f.pitchId))).sort().map((p: string) => (
                            <option key={p} value={p}>{p} Format</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Filter by Season / Period</label>
                        <select
                          value={faFilterPeriod}
                          onChange={(e) => setFaFilterPeriod(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="ALL">Show All 2026 Matches ({loadedFixtures.length})</option>
                          <option value="PAST_MARCH_APRIL">Past Matches: March & April ({loadedFixtures.filter(f => f.date >= '2026-03-01' && f.date <= '2026-04-30').length})</option>
                          <option value="PAST_JUNE">Past Matches: June ({loadedFixtures.filter(f => f.date >= '2026-06-01' && f.date <= '2026-06-30').length})</option>
                          <option value="UPCOMING">Upcoming Matches: July Onwards ({loadedFixtures.filter(f => f.date >= '2026-07-01').length})</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Filter by Match Date</label>
                        <select
                          value={faFilterDate}
                          onChange={(e) => setFaFilterDate(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="">All Dates ({Array.from(new Set<string>(loadedFixtures.map(f => f.date))).length})</option>
                          {Array.from(new Set<string>(loadedFixtures.map(f => f.date))).sort().map((d: string) => (
                            <option key={d} value={d}>
                              {new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Quick helper selection links */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-3 border-t border-slate-800/60 text-[10px] text-slate-400 font-bold">
                      <span>Quick Selection:</span>
                      <button
                        type="button"
                        onClick={handleToggleSelectAllFiltered}
                        className="text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-tight"
                      >
                        {allSelectableFilteredSelected ? 'Deselect All Filtered' : 'Tick All Filtered'}
                      </button>
                      <span className="text-slate-700">|</span>
                      <button
                        type="button"
                        onClick={handleToggleSelectAllOverall}
                        className="text-amber-400 hover:text-amber-300 transition-colors uppercase tracking-tight"
                      >
                        Tick All / Clear All (Everything)
                      </button>
                      <span className="text-slate-700">|</span>
                      <span className="text-slate-500">
                        Selected: <strong className="text-white">{filteredFixtures.filter(f => selectedFixtureIds.includes(f.id) && getFixtureStatus(f).type === 'VACANT').length}</strong> vacant & <strong className="text-white">{filteredFixtures.filter(f => selectedFixtureIds.includes(f.id) && getFixtureStatus(f).type === 'BOOKED_SELF').length}</strong> booked filtered fixtures
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Showing {filteredFixtures.length} of {loadedFixtures.length} scheduled fixtures
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleBulkImportFixtures}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold py-1.5 px-3.5 rounded-lg flex items-center space-x-1.5 shadow transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Bulk Book ({filteredFixtures.filter(f => selectedFixtureIds.includes(f.id) && getFixtureStatus(f).type === 'VACANT').length} vacant)</span>
                      </button>
                      <button
                        onClick={handleBulkUnbookFixtures}
                        className="bg-red-600 hover:bg-red-500 text-white text-[11px] font-extrabold py-1.5 px-3.5 rounded-lg flex items-center space-x-1.5 shadow transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Bulk Unbook ({filteredFixtures.filter(f => selectedFixtureIds.includes(f.id) && (getFixtureStatus(f).type === 'BOOKED_SELF' || getFixtureStatus(f).type === 'RESOLVED_CLASH')).length} booked)</span>
                      </button>
                      <button
                        onClick={() => {
                          const selectedFixtures = filteredFixtures.filter(f => selectedFixtureIds.includes(f.id));
                          if (selectedFixtures.length === 0) {
                            setImportFeedback('No fixtures are selected to delete!');
                            return;
                          }

                          let cancelCount = 0;
                          selectedFixtures.forEach((f) => {
                            const statusInfo = getFixtureStatus(f);
                            if (statusInfo.booking) {
                              onCancelBooking(statusInfo.booking.id);
                              cancelCount++;
                            }
                          });

                          const deletedIds = selectedFixtures.map(f => f.id);
                          setLoadedFixtures(prev => prev.filter(f => !deletedIds.includes(f.id)));
                          setSelectedFixtureIds(prev => prev.filter(id => !deletedIds.includes(id)));

                          if (cancelCount > 0) {
                            setImportFeedback(`Successfully cancelled ${cancelCount} diary bookings and removed ${deletedIds.length} fixtures from the list.`);
                          } else {
                            setImportFeedback(`Successfully removed ${deletedIds.length} fixtures from the list.`);
                          }
                        }}
                        className="bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-extrabold py-1.5 px-3.5 rounded-lg flex items-center space-x-1.5 shadow transition-colors"
                        title="Delete selected fixtures entirely (and cancel their bookings if they were booked)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Bulk Delete ({selectedFixtureIds.filter(id => filteredFixtures.some(f => f.id === id)).length} selected)</span>
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-800/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                          <tr>
                            <th className="px-4 py-3 w-10 text-center">
                              <input
                                type="checkbox"
                                checked={allSelectableFilteredSelected}
                                onChange={handleToggleSelectAllFiltered}
                                className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-950 cursor-pointer"
                                title="Toggle select all filtered matches"
                              />
                            </th>
                            <th className="px-4 py-3 cursor-pointer select-none hover:bg-slate-800 transition-colors" onClick={() => {
                              if (faSortField === 'team') {
                                setFaSortAsc(!faSortAsc);
                              } else {
                                setFaSortField('team');
                                setFaSortAsc(true);
                              }
                            }}>
                              <div className="flex items-center space-x-1">
                                <span>Fixture Details</span>
                                {faSortField === 'team' ? (
                                  faSortAsc ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 text-slate-600" />
                                )}
                              </div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer select-none hover:bg-slate-800 transition-colors" onClick={() => {
                              if (faSortField === 'pitch') {
                                setFaSortAsc(!faSortAsc);
                              } else {
                                setFaSortField('pitch');
                                setFaSortAsc(true);
                              }
                            }}>
                              <div className="flex items-center space-x-1">
                                <span>Pitch Format</span>
                                {faSortField === 'pitch' ? (
                                  faSortAsc ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 text-slate-600" />
                                )}
                              </div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer select-none hover:bg-slate-800 transition-colors" onClick={() => {
                              if (faSortField === 'date') {
                                setFaSortAsc(!faSortAsc);
                              } else {
                                setFaSortField('date');
                                setFaSortAsc(true);
                              }
                            }}>
                              <div className="flex items-center space-x-1">
                                <span>Date & Time</span>
                                {faSortField === 'date' ? (
                                  faSortAsc ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 text-slate-600" />
                                )}
                              </div>
                            </th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {filteredFixtures.map((fixture) => {
                            const statusInfo = getFixtureStatus(fixture);
                            const isSelected = selectedFixtureIds.includes(fixture.id);
                            return (
                              <React.Fragment key={fixture.id}>
                                <tr 
                                  className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                                  onClick={(e) => {
                                    const target = e.target as HTMLElement;
                                    if (
                                      target.tagName !== 'BUTTON' && 
                                      target.tagName !== 'INPUT' && 
                                      target.tagName !== 'A' && 
                                      !target.closest('button') && 
                                      !target.closest('a')
                                    ) {
                                      toggleFixtureSelection(fixture.id);
                                    }
                                  }}
                                >
                                  <td className="px-4 py-3.5 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleFixtureSelection(fixture.id)}
                                      className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-950 cursor-pointer"
                                    />
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <div className="font-bold text-white text-xs">
                                      {fixture.homeTeam} vs {fixture.awayTeam}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wide">
                                      {fixture.competition}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <span className="bg-blue-950 text-blue-300 font-bold px-2 py-0.5 rounded text-[10px] uppercase border border-blue-900/40">
                                      {fixture.pitchId}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <div className="font-bold text-slate-200">
                                      {new Date(fixture.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                    </div>
                                    <div className="text-[10px] text-slate-400 flex items-center mt-0.5 font-semibold">
                                      <Clock className="w-3 h-3 mr-1 text-slate-500" />
                                      {fixture.timeSlot} KO
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    {statusInfo.type === 'BOOKED_SELF' ? (
                                      <span className="inline-flex items-center text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-900/50 px-2 py-0.5 rounded font-bold uppercase">
                                        <Check className="w-3 h-3 mr-1" /> Diary Booked
                                      </span>
                                    ) : statusInfo.type === 'RESOLVED_CLASH' ? (
                                      <div className="flex flex-col items-start">
                                        <span className="inline-flex items-center text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-900/50 px-2 py-0.5 rounded font-bold uppercase">
                                          <Check className="w-3 h-3 mr-1" /> Clash Resolved
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-semibold mt-0.5 italic">
                                          Moved to {statusInfo.booking?.timeSlot}
                                        </span>
                                      </div>
                                    ) : statusInfo.type === 'CLASH' ? (
                                      <span className="inline-flex items-center text-[10px] bg-red-950 text-red-400 border border-red-900/50 px-2 py-0.5 rounded font-bold uppercase" title={`This slot is already booked by ${statusInfo.booking?.teamName}`}>
                                        <AlertTriangle className="w-3 h-3 mr-1 text-red-400" /> Clash: {statusInfo.booking?.teamName}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center text-[10px] bg-amber-950 text-amber-400 border border-amber-900/50 px-2 py-0.5 rounded font-bold uppercase">
                                        <AlertTriangle className="w-3 h-3 mr-1" /> Unscheduled
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3.5 text-right">
                                    {(statusInfo.type === 'BOOKED_SELF' || statusInfo.type === 'RESOLVED_CLASH') && statusInfo.booking ? (
                                      <div className="flex items-center justify-end space-x-2">
                                        {/* Rearrange option button */}
                                        <button
                                          onClick={() => {
                                            if (resolvingClashId === fixture.id) {
                                              setResolvingClashId(null);
                                            } else {
                                              setResolvingClashId(fixture.id);
                                              setRearrangeDate(fixture.date);
                                              setRearrangePitch(fixture.pitchId);
                                              setRearrangeSlot(fixture.timeSlot);
                                            }
                                          }}
                                          className={`text-[10px] font-bold uppercase py-1.5 px-2.5 rounded hover:bg-slate-800 transition-all ${
                                            resolvingClashId === fixture.id ? 'text-amber-400 bg-slate-800' : 'text-slate-400 hover:text-white'
                                          }`}
                                          title="Rearrange this fixture's date, time or pitch format"
                                        >
                                          Rearrange
                                        </button>

                                        {/* Green Action Badge indicating Scheduled/Resolved state */}
                                        <span className="text-[10px] font-black uppercase py-1.5 px-3 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-sm inline-flex items-center space-x-1.5">
                                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                                          <span>
                                            {statusInfo.type === 'RESOLVED_CLASH' || 
                                             bookings.some(b => b.pitchId === fixture.pitchId && b.date === fixture.date && b.notes?.includes('resolve FA clash'))
                                              ? 'Resolved'
                                              : 'Booked'}
                                          </span>
                                        </span>

                                        {/* Unbook button/confirm dialogue if the user is authorized */}
                                        {canManagerUnbook(currentUser, statusInfo.booking) ? (
                                          confirmUnbookFixtureId === fixture.id ? (
                                            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                                              <span className="text-[9px] font-bold text-red-400 uppercase px-1">Unbook?</span>
                                              <button
                                                onClick={() => {
                                                  if (statusInfo.booking) {
                                                    onCancelBooking(statusInfo.booking.id);
                                                    setImportFeedback(`Successfully unbooked match: ${fixture.homeTeam} vs ${fixture.awayTeam}`);
                                                  }
                                                  setConfirmUnbookFixtureId(null);
                                                }}
                                                className="bg-red-600 hover:bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm"
                                              >
                                                Yes
                                              </button>
                                              <button
                                                onClick={() => setConfirmUnbookFixtureId(null)}
                                                className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm"
                                              >
                                                No
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              onClick={() => setConfirmUnbookFixtureId(fixture.id)}
                                              className="text-slate-400 hover:text-red-400 text-[10px] font-bold uppercase transition-colors px-2 py-1.5 rounded hover:bg-slate-800"
                                              title="Unbook this match from the diary"
                                            >
                                              Unbook
                                            </button>
                                          )
                                        ) : (
                                          <span className="text-[10px] font-bold uppercase text-slate-500 px-2 py-1.5 cursor-not-allowed">
                                            Locked
                                          </span>
                                        )}
                                      </div>
                                    ) : statusInfo.type === 'CLASH' ? (
                                      <div className="flex items-center justify-end space-x-2">
                                        <button
                                          onClick={() => {
                                            setLoadedFixtures(prev => prev.filter(f => f.id !== fixture.id));
                                            setImportFeedback(`Removed fixture: ${fixture.homeTeam} vs ${fixture.awayTeam}`);
                                          }}
                                          className="text-slate-400 hover:text-red-400 text-[10px] font-bold uppercase transition-colors px-2 py-1.5 rounded hover:bg-slate-800"
                                          title="Remove this fixture from the schedule list entirely"
                                        >
                                          Delete
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (resolvingClashId === fixture.id) {
                                              setResolvingClashId(null);
                                            } else {
                                              setResolvingClashId(fixture.id);
                                              const vacs = getVacantSlots(fixture.pitchId, fixture.date);
                                              if (vacs.length > 0) {
                                                setAlternativeSlot(vacs[0]);
                                                setExistingBookingSlot(vacs[0]);
                                              } else {
                                                setAlternativeSlot('');
                                                setExistingBookingSlot('');
                                              }
                                            }
                                          }}
                                          className={`text-[10px] font-black uppercase py-1.5 px-3 rounded-lg transition-all shadow-sm ${
                                            resolvingClashId === fixture.id
                                              ? 'bg-slate-700 hover:bg-slate-600 text-white'
                                              : 'bg-amber-600 hover:bg-amber-500 text-white'
                                          }`}
                                        >
                                          {resolvingClashId === fixture.id ? 'Cancel Rebook' : 'Resolve Clash'}
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-end space-x-2">
                                        <button
                                          onClick={() => {
                                            setLoadedFixtures(prev => prev.filter(f => f.id !== fixture.id));
                                            setImportFeedback(`Removed fixture: ${fixture.homeTeam} vs ${fixture.awayTeam}`);
                                          }}
                                          className="text-slate-400 hover:text-red-400 text-[10px] font-bold uppercase transition-colors px-2 py-1.5 rounded hover:bg-slate-800"
                                          title="Remove this fixture from the schedule list entirely"
                                        >
                                          Delete
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (resolvingClashId === fixture.id) {
                                              setResolvingClashId(null);
                                            } else {
                                              setResolvingClashId(fixture.id);
                                              setRearrangeDate(fixture.date);
                                              setRearrangePitch(fixture.pitchId);
                                              setRearrangeSlot(fixture.timeSlot);
                                            }
                                          }}
                                          className={`text-[10px] font-bold uppercase py-1.5 px-2.5 rounded hover:bg-slate-800 transition-all ${
                                            resolvingClashId === fixture.id ? 'text-amber-400 bg-slate-800' : 'text-slate-400 hover:text-white'
                                          }`}
                                          title="Rearrange this fixture's date, time or pitch format"
                                        >
                                          Rearrange
                                        </button>
                                        <button
                                          onClick={() => handleImportFixture(fixture)}
                                          className="text-[10px] font-black uppercase py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all whitespace-nowrap"
                                        >
                                          Book Pitch
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>

                                {resolvingClashId === fixture.id && (
                                  <tr className="bg-slate-900/80 border-y border-slate-800">
                                    <td colSpan={6} className="p-4">
                                      {statusInfo.type === 'CLASH' ? (
                                        <div className="space-y-4">
                                          <div className="flex items-center space-x-2 text-amber-400">
                                            <AlertTriangle className="w-4 h-4" />
                                            <h4 className="font-extrabold text-xs uppercase tracking-tight">
                                              Resolve Clash & Rebook Options
                                            </h4>
                                          </div>
                                          
                                          <p className="text-[11px] text-slate-400 text-left">
                                            This FA fixture clashes with <strong className="text-white">{statusInfo.booking?.teamName}</strong> who already booked <strong className="text-white">{fixture.timeSlot}</strong> on the {fixture.pitchId} pitch format. Select a rebooking strategy:
                                          </p>

                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-left">
                                            {/* Option A: Reschedule incoming FA match */}
                                            <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 space-y-2.5">
                                              <p className="text-[11px] font-extrabold uppercase text-blue-400 tracking-wider">
                                                Option A: Rebook incoming FA Match to Vacant Slot
                                              </p>
                                              <p className="text-[10px] text-slate-400">
                                                Keep {statusInfo.booking?.teamName} at {fixture.timeSlot}, and book this FA match at a different open slot on this day:
                                              </p>
                                              
                                              {getVacantSlots(fixture.pitchId, fixture.date).length > 0 ? (
                                                <div className="flex items-center gap-2">
                                                  <select
                                                    value={alternativeSlot}
                                                    onChange={(e) => setAlternativeSlot(e.target.value)}
                                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] font-bold text-slate-200 focus:outline-none focus:border-blue-500 flex-grow"
                                                  >
                                                    {getVacantSlots(fixture.pitchId, fixture.date).map((slot) => (
                                                      <option key={slot} value={slot}>
                                                        {slot} (Vacant)
                                                      </option>
                                                    ))}
                                                  </select>
                                                  <button
                                                    onClick={() => handleRescheduleFA(fixture, alternativeSlot || getVacantSlots(fixture.pitchId, fixture.date)[0])}
                                                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded text-[10px] uppercase shadow-sm transition-all whitespace-nowrap"
                                                  >
                                                    Book Slot
                                                  </button>
                                                </div>
                                              ) : (
                                                <p className="text-[10px] text-red-400 font-bold italic">
                                                  No other vacant slots are available on this pitch on this date.
                                                </p>
                                              )}
                                            </div>

                                            {/* Option B: Reschedule existing booking */}
                                            <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 space-y-2.5">
                                              <p className="text-[11px] font-extrabold uppercase text-amber-400 tracking-wider">
                                                Option B: Move Existing Booking & Book FA Match Here
                                              </p>
                                              <p className="text-[10px] text-slate-400">
                                                Move {statusInfo.booking?.teamName}'s booking to an alternative vacant slot, freeing up {fixture.timeSlot} for this FA match:
                                              </p>

                                              {getVacantSlots(fixture.pitchId, fixture.date).length > 0 ? (
                                                <div className="flex items-center gap-2">
                                                  <select
                                                    value={existingBookingSlot}
                                                    onChange={(e) => setExistingBookingSlot(e.target.value)}
                                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] font-bold text-slate-200 focus:outline-none focus:border-amber-500 flex-grow"
                                                  >
                                                    {getVacantSlots(fixture.pitchId, fixture.date).map((slot) => (
                                                      <option key={slot} value={slot}>
                                                        Move to {slot} (Vacant)
                                                      </option>
                                                    ))}
                                                  </select>
                                                  <button
                                                    onClick={() => {
                                                      if (statusInfo.booking) {
                                                        handleRescheduleExistingAndBookFA(fixture, statusInfo.booking, existingBookingSlot || getVacantSlots(fixture.pitchId, fixture.date)[0]);
                                                      }
                                                    }}
                                                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-1.5 rounded text-[10px] uppercase shadow-sm transition-all whitespace-nowrap"
                                                  >
                                                    Move & Book
                                                  </button>
                                                </div>
                                              ) : (
                                                <p className="text-[10px] text-red-400 font-bold italic">
                                                  No other vacant slots are available on this pitch to move the booking to.
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        // Rearrange General / Non-clashing / Booked Fixture Form
                                        <div className="space-y-4">
                                          <div className="flex items-center space-x-2 text-blue-400">
                                            <CalendarRange className="w-4 h-4" />
                                            <h4 className="font-extrabold text-xs uppercase tracking-tight">
                                              Rearrange Fixture Schedule
                                            </h4>
                                          </div>
                                          
                                          <p className="text-[11px] text-slate-400 text-left">
                                            Adjust the date, pitch format, or kickoff time slot for <strong className="text-white">{fixture.homeTeam} vs {fixture.awayTeam}</strong>. If this match is already booked, the booking in the diary will automatically be updated too.
                                          </p>

                                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1 items-end text-left">
                                            {/* Date Selector */}
                                            <div className="space-y-1.5">
                                              <label className="text-[10px] font-bold text-slate-400 uppercase">Match Date</label>
                                              <input
                                                type="date"
                                                value={rearrangeDate}
                                                onChange={(e) => setRearrangeDate(e.target.value)}
                                                className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-blue-500 w-full"
                                              />
                                            </div>

                                            {/* Pitch Size Selector */}
                                            <div className="space-y-1.5">
                                              <label className="text-[10px] font-bold text-slate-400 uppercase">Pitch Format</label>
                                              <select
                                                value={rearrangePitch}
                                                onChange={(e) => {
                                                  const newPitch = e.target.value as PitchSize;
                                                  setRearrangePitch(newPitch);
                                                  const config = pitchConfigs.find(p => p.id === newPitch);
                                                  if (config && config.defaultSlots.length > 0) {
                                                    setRearrangeSlot(config.defaultSlots[0]);
                                                  }
                                                }}
                                                className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-blue-500 w-full"
                                              >
                                                <option value="5v5">5v5 (Mini Soccer)</option>
                                                <option value="7v7">7v7 (Mini Soccer)</option>
                                                <option value="9v9">9v9 (Youth)</option>
                                                <option value="11v11">11v11 (Senior)</option>
                                              </select>
                                            </div>

                                            {/* Time Slot Selector */}
                                            <div className="space-y-1.5">
                                              <label className="text-[10px] font-bold text-slate-400 uppercase">Kickoff Time</label>
                                              <select
                                                value={rearrangeSlot}
                                                onChange={(e) => setRearrangeSlot(e.target.value)}
                                                className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-blue-500 w-full"
                                              >
                                                {(() => {
                                                  const currentPitchConfig = pitchConfigs.find(p => p.id === rearrangePitch);
                                                  const slots = currentPitchConfig ? currentPitchConfig.defaultSlots : [];
                                                  return slots.map((slot) => {
                                                    // Check vacancy of this slot on the chosen date and pitch format
                                                    const isSlotVacant = !bookings.some(b => {
                                                      if (b.pitchId !== rearrangePitch || b.date !== rearrangeDate) return false;
                                                      if (b.status === BookingStatus.DECLINED || b.status === BookingStatus.UNBOOKED) return false;
                                                      const slotStart = parseTimeToMinutes(slot);
                                                      const slotEnd = parseTimeToMinutes(getAdminEndTimeForSlot(rearrangePitch, rearrangeDate, slot));
                                                      const bStart = parseTimeToMinutes(b.timeSlot);
                                                      const bEnd = parseTimeToMinutes(b.endTime || getAdminEndTimeForSlot(b.pitchId, b.date, b.timeSlot));
                                                      return slotStart < bEnd && bStart < slotEnd;
                                                    });
                                                    return (
                                                      <option key={slot} value={slot}>
                                                        {slot} {isSlotVacant ? '🟢 (Vacant)' : '🔴 (Occupied)'}
                                                      </option>
                                                    );
                                                  });
                                                })()}
                                              </select>
                                            </div>

                                            {/* Submit Button */}
                                            <div className="flex space-x-2">
                                              <button
                                                onClick={() => handleSaveFixtureRearrangement(fixture.id, rearrangeDate, rearrangePitch, rearrangeSlot)}
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2 rounded text-[11px] uppercase shadow-sm transition-all flex-grow text-center"
                                              >
                                                Apply Changes
                                              </button>
                                              <button
                                                onClick={() => setResolvingClashId(null)}
                                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold px-3 py-2 rounded text-[11px] uppercase shadow-sm transition-all"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              </>
            )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
