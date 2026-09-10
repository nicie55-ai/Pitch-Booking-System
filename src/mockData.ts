/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Booking, BookingStatus, PitchConfig, SlotChangeRequest, User, PitchSize, ClubTeam, FAFixture } from './types';
import { RAW_MOCK_FA_FULLTIME_FIXTURES } from './faFixturesData';

export type { FAFixture };

const RAW_MOCK_USERS: User[] = [
  {
    id: 'admin-scotteradmin',
    name: 'Scotter Exec Team',
    role: 'ADMIN',
    teamName: undefined,
    password: 'Riversiders19£',
  },
  {
    id: 'admin-waynef',
    name: 'WayneF',
    role: 'ADMIN',
    teamName: 'U18',
    password: 'ScotterWF18',
  },
  {
    id: 'coach-karlm',
    name: 'KarlM',
    role: 'MANAGER',
    teamName: 'U7 Juniors',
    password: 'ScotterKM7',
  },
  {
    id: 'coach-dans',
    name: 'DanS',
    role: 'MANAGER',
    teamName: 'U7 Saints',
    password: 'ScotterDS7',
  },
  {
    id: 'coach-philc',
    name: 'PhilC',
    role: 'MANAGER',
    teamName: 'U8 Juniors',
    password: 'ScotterPC8',
  },
  {
    id: 'coach-dannyr',
    name: 'DannyR',
    role: 'MANAGER',
    teamName: 'U8 Saints',
    password: 'ScotterDR8',
  },
  {
    id: 'coach-mitchg',
    name: 'MitchG',
    role: 'MANAGER',
    teamName: 'U9 Juniors',
    password: 'ScotterMG9',
  },
  {
    id: 'coach-tomc',
    name: 'TomC',
    role: 'MANAGER',
    teamName: 'U9 Saints',
    password: 'ScotterTC9',
  },
  {
    id: 'coach-marke',
    name: 'MarkE',
    role: 'MANAGER',
    teamName: 'U10 Juniors',
    password: 'ScotterME10',
  },
  {
    id: 'coach-annaw',
    name: 'AnnaW',
    role: 'MANAGER',
    teamName: 'U10 Saints',
    password: 'ScotterAW10',
  },
  {
    id: 'coach-olig',
    name: 'OliG',
    role: 'MANAGER',
    teamName: 'U11 Juniors',
    password: 'ScotterOG11',
  },
  {
    id: 'coach-chrisw',
    name: 'ChrisW',
    role: 'MANAGER',
    teamName: 'U11 Saints',
    password: 'ScotterCW11',
  },
  {
    id: 'admin-adamh',
    name: 'AdamH',
    role: 'ADMIN',
    teamName: 'U12 Colts',
    password: 'ScotterAH12',
  },
  {
    id: 'admin-liamw',
    name: 'LiamW',
    role: 'ADMIN',
    teamName: 'U12 Juniors',
    password: 'ScotterLW12',
  },
  {
    id: 'coach-sarahs',
    name: 'SarahS',
    role: 'MANAGER',
    teamName: 'U12 Girls',
    password: 'ScotterSS12',
  },
  {
    id: 'coach-dana',
    name: 'DanA',
    role: 'MANAGER',
    teamName: 'U13 Juniors',
    password: 'ScotterDA13',
  },
  {
    id: 'coach-paulh',
    name: 'PaulH',
    role: 'MANAGER',
    teamName: 'U13 Saints',
    password: 'ScotterPH13',
  },
  {
    id: 'coach-paulf',
    name: 'PaulF',
    role: 'MANAGER',
    teamName: 'U14s',
    password: 'ScotterPF14',
  },
  {
    id: 'coach-gavd',
    name: 'GavD',
    role: 'MANAGER',
    teamName: 'U14 Girls',
    password: 'ScotterGD14',
  },
  {
    id: 'coach-chriss',
    name: 'ChrisS',
    role: 'MANAGER',
    teamName: 'Vets',
    password: 'ScotterCS1',
  },
  {
    id: 'coach-andyc',
    name: 'AndyC',
    role: 'MANAGER',
    teamName: 'U15',
    password: 'ScotterAC15',
  },
  {
    id: 'coach-willc',
    name: 'WillC',
    role: 'MANAGER',
    teamName: 'U17',
    password: 'ScotterWC17',
  },
];

export const DEFAULT_PITCH_CONFIGS: PitchConfig[] = [
  {
    id: '5v5',
    name: '5v5',
    description: 'Designed for Under 7s, Under 8s, and Under 9s matches (2026-27 FA guidelines).',
    defaultSlots: ['09:45', '10:45', '11:45', '12:45', '13:45'],
  },
  {
    id: '7v7',
    name: '7v7',
    description: 'Designed for Under 10s and Under 11s age groups (2026-27 FA guidelines).',
    defaultSlots: ['09:30', '10:45', '12:00', '13:30'],
  },
  {
    id: '9v9',
    name: '9v9',
    description: 'Designed for Under 12s and Under 13s age groups (2026-27 FA guidelines).',
    defaultSlots: ['09:30', '11:00', '12:30'],
  },
  {
    id: '11v11',
    name: '11v11',
    description: 'Full-size pitch for Under 14s to Adults.',
    defaultSlots: ['10:00', '12:00', '14:00'],
  },
];

// Initial bookings set prior to 12 September 2026 (5th and 6th September 2026)
const RAW_INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'b-1',
    pitchId: '7v7',
    date: '2026-09-05',
    timeSlot: '09:30',
    teamName: 'Scotter United U9s',
    managerName: 'Paul Scholes',
    managerId: 'manager-u9',
    notes: 'League fixture vs Messingham JFC. Ref has been confirmed.',
    status: BookingStatus.APPROVED,
    createdAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'b-2',
    pitchId: '9v9',
    date: '2026-09-05',
    timeSlot: '10:45',
    teamName: 'Scotter United U11s',
    managerName: 'Steven Gerrard',
    managerId: 'manager-u11',
    notes: 'County Cup Quarter Final. Expecting higher attendance, extra pitch lines marked if possible.',
    status: BookingStatus.PENDING,
    createdAt: '2026-09-02T08:30:00Z',
  },
  {
    id: 'b-3',
    pitchId: '11v11',
    date: '2026-09-06',
    timeSlot: '12:00',
    teamName: 'Scotter United U15s',
    managerName: 'Wayne Rooney',
    managerId: 'manager-u15',
    notes: 'Pre-season friendly against Gainsborough Trinity. Nets are required.',
    status: BookingStatus.APPROVED,
    createdAt: '2026-09-01T14:15:00Z',
  },
  {
    id: 'b-4',
    pitchId: '5v5',
    date: '2026-09-05',
    timeSlot: '09:30',
    teamName: 'Scotter United U7 Juniors',
    managerName: 'David Beckham',
    managerId: 'manager-u7',
    notes: 'Early training friendly tournament with visiting club.',
    status: BookingStatus.DECLINED,
    declineReason: 'Pitch is reserved for Under 8s development league matches this morning.',
    createdAt: '2026-09-02T09:15:00Z',
  },
];

const RAW_INITIAL_SLOT_CHANGES: SlotChangeRequest[] = [
  {
    id: 'sc-1',
    managerId: 'manager-u11',
    managerName: 'Steven Gerrard',
    teamName: 'Scotter United U11s',
    pitchId: '9v9',
    actionType: 'ADD',
    targetSlot: '13:15',
    notes: 'We have an extra game requested by the league, would love a 13:15 slot to be made available for 9v9 on Saturdays.',
    status: 'PENDING',
    createdAt: '2026-06-25T09:30:00Z',
  },
];

const RAW_SCOTTER_TEAMS: Omit<ClubTeam, 'id'>[] = [
  // U7s - planned on 5v5 (or 7v7 / 9v9)
  { name: 'Scotter United U7 Juniors', category: 'U7s', pitchSize: '5v5' },
  { name: 'Scotter United U7 Saints', category: 'U7s', pitchSize: '5v5' },
  // U8s - 5v5
  { name: 'Scotter United U8 Juniors', category: 'U8s', pitchSize: '5v5' },
  { name: 'Scotter United U8 Saints', category: 'U8s', pitchSize: '5v5' },
  // U9s - 5v5
  { name: 'Scotter United U9 Juniors', category: 'U9s', pitchSize: '5v5' },
  { name: 'Scotter United U9 Saints', category: 'U9s', pitchSize: '5v5' },
  // U10s - 7v7
  { name: 'Scotter United U10 Juniors', category: 'U10s', pitchSize: '7v7' },
  { name: 'Scotter United U10 Saints', category: 'U10s', pitchSize: '7v7' },
  // U11s - 7v7
  { name: 'Scotter United U11 Colts', category: 'U11s', pitchSize: '7v7' },
  { name: 'Scotter United U11 Juniors', category: 'U11s', pitchSize: '7v7' },
  { name: 'Scotter United U11 Saints', category: 'U11s', pitchSize: '7v7' },
  // U12s - 9v9
  { name: 'Scotter United U12 Juniors', category: 'U12', pitchSize: '9v9' },
  { name: 'Scotter United U12 Colts', category: 'U12', pitchSize: '9v9' },
  { name: 'Scotter United U12 Girls', category: 'U12 Girls', pitchSize: '9v9' },
  // U13s - 9v9
  { name: 'Scotter United U13 Juniors', category: 'U13', pitchSize: '9v9' },
  { name: 'Scotter United U13 Saints', category: 'U13', pitchSize: '9v9' },
  // Senior formats - 11v11
  { name: 'Scotter United U14s', category: 'U14', pitchSize: '11v11' },
  { name: 'Scotter United U14 Girls', category: 'U14 Girls', pitchSize: '11v11' },
  { name: 'Scotter United U15', category: 'U15', pitchSize: '11v11' },
  { name: 'Scotter United U17', category: 'U17', pitchSize: '11v11' },
  { name: 'Scotter United U18', category: 'U18', pitchSize: '11v11' },
  { name: 'Scotter United Vets', category: 'Vets', pitchSize: '11v11' },
];

export const shiftDateString = (dateStr: string): string => {
  if (!dateStr) return dateStr;
  // All initial fixtures/bookings must be prior to 12 September 2026
  if (dateStr >= '2026-09-12') {
    return '2026-09-05';
  }
  return dateStr;
};

export const MOCK_USERS: User[] = RAW_MOCK_USERS.map(u => ({
  ...u,
  teamName: u.teamName ? u.teamName.replace('Scotter United ', '') : undefined,
}));

export const INITIAL_BOOKINGS: Booking[] = RAW_INITIAL_BOOKINGS.map(b => ({
  ...b,
  date: shiftDateString(b.date),
  teamName: b.teamName.replace('Scotter United ', ''),
}));

export const INITIAL_SLOT_CHANGES: SlotChangeRequest[] = RAW_INITIAL_SLOT_CHANGES.map(sc => ({
  ...sc,
  teamName: sc.teamName.replace('Scotter United ', ''),
}));

export const SCOTTER_TEAMS: ClubTeam[] = RAW_SCOTTER_TEAMS.map((t, idx) => {
  const name = t.name.replace('Scotter United ', '');
  return {
    ...t,
    id: `team-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${idx}`,
    name,
  };
});

export const MOCK_FA_FULLTIME_FIXTURES: FAFixture[] = RAW_MOCK_FA_FULLTIME_FIXTURES.map(f => ({
  ...f,
  date: f.date,
  homeTeam: f.homeTeam,
  awayTeam: f.awayTeam,
  scotterTeam: f.scotterTeam,
}));
