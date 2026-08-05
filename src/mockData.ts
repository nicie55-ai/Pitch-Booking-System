/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Booking, BookingStatus, PitchConfig, SlotChangeRequest, User, PitchSize, ClubTeam } from './types';

const RAW_MOCK_USERS: User[] = [
  {
    id: 'admin-scotteradmin',
    name: 'ScotterAdmin',
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
    id: '3v3',
    name: '3v3',
    description: 'Mini pitch for Under 7s fun-football sessions (2026-27 FA guidelines).',
    defaultSlots: ['09:30', '10:45', '12:00', '13:15'],
  },
  {
    id: '5v5',
    name: '5v5',
    description: 'Designed for Under 8s and Under 9s matches (2026-27 FA guidelines).',
    defaultSlots: ['09:45', '10:45', '11:45'],
  },
  {
    id: '7v7',
    name: '7v7',
    description: 'Designed for Under 10s and Under 11s age groups (2026-27 FA guidelines).',
    defaultSlots: ['09:30', '10:45', '12:00', '13:15'],
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
    defaultSlots: ['10:00', '12:00', '14:00', '16:00'],
  },
];

// Helper to get formatted dates relative to June 25th, 2026 (Thursday)
// Saturday June 27, 2026 & Sunday June 28, 2026
const RAW_INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'b-1',
    pitchId: '7v7',
    date: '2026-06-27',
    timeSlot: '09:30',
    teamName: 'Scotter United U9s',
    managerName: 'Paul Scholes',
    managerId: 'manager-u9',
    notes: 'League fixture vs Messingham JFC. Ref has been confirmed.',
    status: BookingStatus.APPROVED,
    createdAt: '2026-06-24T10:00:00Z',
  },
  {
    id: 'b-2',
    pitchId: '9v9',
    date: '2026-06-27',
    timeSlot: '10:45',
    teamName: 'Scotter United U11s',
    managerName: 'Steven Gerrard',
    managerId: 'manager-u11',
    notes: 'County Cup Quarter Final. Expecting higher attendance, extra pitch lines marked if possible.',
    status: BookingStatus.PENDING,
    createdAt: '2026-06-25T08:30:00Z',
  },
  {
    id: 'b-3',
    pitchId: '11v11',
    date: '2026-06-28',
    timeSlot: '12:00',
    teamName: 'Scotter United U15s',
    managerName: 'Wayne Rooney',
    managerId: 'manager-u15',
    notes: 'Pre-season friendly against Gainsborough Trinity. Nets are required.',
    status: BookingStatus.APPROVED,
    createdAt: '2026-06-23T14:15:00Z',
  },
  {
    id: 'b-4',
    pitchId: '5v5',
    date: '2026-06-27',
    timeSlot: '09:30',
    teamName: 'Scotter United U7 Juniors',
    managerName: 'David Beckham',
    managerId: 'manager-u7',
    notes: 'Early training friendly tournament with visiting club.',
    status: BookingStatus.DECLINED,
    declineReason: 'Pitch is reserved for Under 8s development league matches this morning.',
    createdAt: '2026-06-25T09:15:00Z',
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
  // U7s - 3v3
  { name: 'Scotter United U7 Juniors', category: 'U7s', pitchSize: '3v3' },
  { name: 'Scotter United U7 Saints', category: 'U7s', pitchSize: '3v3' },
  // U8s - 5v5
  { name: 'Scotter United U8 Juniors', category: 'U8s', pitchSize: '5v5' },
  { name: 'Scotter United U8 Saints', category: 'U8s', pitchSize: '5v5' },
  // U9s - 5v5
  { name: 'Scotter United U9 Saints', category: 'U9s', pitchSize: '5v5' },
  { name: 'Scotter United U9s Juniors', category: 'U9s', pitchSize: '5v5' },
  // U10s - 7v7
  { name: 'Scotter United U10 Saints', category: 'U10s', pitchSize: '7v7' },
  { name: 'Scotter United U10 Juniors', category: 'U10s', pitchSize: '7v7' },
  // U11s - 7v7
  { name: 'Scotter United U11 Colts', category: 'U11s', pitchSize: '7v7' },
  { name: 'Scotter United U11s Juniors', category: 'U11s', pitchSize: '7v7' },
  // U12s - 9v9
  { name: 'Scotter United U12s Juniors', category: 'U12', pitchSize: '9v9' },
  { name: 'Scotter United U12 Colts', category: 'U12', pitchSize: '9v9' },
  // U13s - 9v9
  { name: 'Scotter United U13 Saints', category: 'U13', pitchSize: '9v9' },
  { name: 'Scotter United U13 Juniors', category: 'U13', pitchSize: '9v9' },
  // Senior formats - 11v11
  { name: 'Scotter United U14s', category: 'U14', pitchSize: '11v11' },
  // Girls
  { name: 'Scotter United U12 Girls', category: 'U12 Girls', pitchSize: '9v9' },
  { name: 'Scotter United U14 Girls', category: 'U14 Girls', pitchSize: '11v11' },
];

export interface FAFixture {
  id: string;
  date: string;
  timeSlot: string;
  pitchId: PitchSize;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  scotterTeam: string;
}

const RAW_MOCK_FA_FULLTIME_FIXTURES: FAFixture[] = [
  {
    id: 'fa-mar-1',
    date: '2026-03-07',
    timeSlot: '09:30',
    pitchId: '9v9',
    homeTeam: 'Scotter United U12s Juniors',
    awayTeam: 'Gainsborough Trinity U12s',
    competition: 'Jack Kalson Junior League',
    scotterTeam: 'Scotter United U12s Juniors',
  },
  {
    id: 'fa-mar-2',
    date: '2026-03-07',
    timeSlot: '10:45',
    pitchId: '7v7',
    homeTeam: 'Scotter United U9 Saints',
    awayTeam: 'Kirton Lindsey U9s',
    competition: 'Scunthorpe Youth Football League',
    scotterTeam: 'Scotter United U9 Saints',
  },
  {
    id: 'fa-mar-3',
    date: '2026-03-08',
    timeSlot: '10:45',
    pitchId: '9v9',
    homeTeam: 'Scotter United U11 Colts',
    awayTeam: 'Barton Town U11s',
    competition: 'Jack Kalson Junior League',
    scotterTeam: 'Scotter United U11 Colts',
  },
  {
    id: 'fa-mar-4',
    date: '2026-03-08',
    timeSlot: '12:00',
    pitchId: '11v11',
    homeTeam: 'Scotter United U18s',
    awayTeam: 'App-Frod U18s',
    competition: 'Lincolnshire Intermediate League',
    scotterTeam: 'Scotter United U18s',
  },
  {
    id: 'fa-mar-5',
    date: '2026-03-14',
    timeSlot: '09:30',
    pitchId: '5v5',
    homeTeam: 'Scotter United U8 Juniors',
    awayTeam: 'Kirton Lindsey U8s',
    competition: 'Scunthorpe Mini Soccer League',
    scotterTeam: 'Scotter United U8 Juniors',
  },
  {
    id: 'fa-apr-1',
    date: '2026-04-11',
    timeSlot: '09:30',
    pitchId: '9v9',
    homeTeam: 'Scotter United U12s Juniors',
    awayTeam: 'Messingham Juniors U12s',
    competition: 'Jack Kalson Junior League',
    scotterTeam: 'Scotter United U12s Juniors',
  },
  {
    id: 'fa-apr-2',
    date: '2026-04-11',
    timeSlot: '12:00',
    pitchId: '11v11',
    homeTeam: 'Scotter United U15s',
    awayTeam: 'Bottesford Town U15s',
    competition: 'Lincolnshire Intermediate League',
    scotterTeam: 'Scotter United U15s',
  },
  {
    id: 'fa-apr-3',
    date: '2026-04-12',
    timeSlot: '09:30',
    pitchId: '9v9',
    homeTeam: 'Scotter United U12 Girls',
    awayTeam: 'Louth Girls U12',
    competition: 'Lincs Women & Girls League',
    scotterTeam: 'Scotter United U12 Girls',
  },
  {
    id: 'fa-apr-4',
    date: '2026-04-12',
    timeSlot: '12:00',
    pitchId: '11v11',
    homeTeam: 'Scotter United Veterans',
    awayTeam: 'Ruston Sports Vets',
    competition: 'Lincs County Veterans League',
    scotterTeam: 'Scotter United Veterans',
  },
  {
    id: 'fa-apr-5',
    date: '2026-04-25',
    timeSlot: '09:30',
    pitchId: '5v5',
    homeTeam: 'Scotter United U7 Saints',
    awayTeam: 'Crosby United U7s',
    competition: 'Scunthorpe Mini Soccer League',
    scotterTeam: 'Scotter United U7 Saints',
  },
  {
    id: 'fa-apr-6',
    date: '2026-04-25',
    timeSlot: '12:00',
    pitchId: '11v11',
    homeTeam: 'Scotter United U13 Saints',
    awayTeam: 'Brigg Town U13s',
    competition: 'Jack Kalson Junior League',
    scotterTeam: 'Scotter United U13 Saints',
  },
  {
    id: 'fa-1',
    date: '2026-06-27',
    timeSlot: '09:30',
    pitchId: '9v9',
    homeTeam: 'Scotter United U12s Juniors',
    awayTeam: 'Gainsborough Trinity U12s',
    competition: 'Jack Kalson Junior League',
    scotterTeam: 'Scotter United U12s Juniors',
  },
  {
    id: 'fa-2',
    date: '2026-06-27',
    timeSlot: '10:45',
    pitchId: '7v7',
    homeTeam: 'Scotter United U9 Saints',
    awayTeam: 'Kirton Lindsey U9s',
    competition: 'Scunthorpe Youth Football League',
    scotterTeam: 'Scotter United U9 Saints',
  },
  {
    id: 'fa-3',
    date: '2026-06-27',
    timeSlot: '12:00',
    pitchId: '11v11',
    homeTeam: 'Scotter United U15s',
    awayTeam: 'Bottesford Town U15s',
    competition: 'Lincolnshire Intermediate League',
    scotterTeam: 'Scotter United U15s',
  },
  {
    id: 'fa-4',
    date: '2026-06-27',
    timeSlot: '09:30',
    pitchId: '5v5',
    homeTeam: 'Scotter United U8 Juniors',
    awayTeam: 'Scunthorpe United U8s',
    competition: 'Scunthorpe Mini Soccer League',
    scotterTeam: 'Scotter United U8 Juniors',
  },
  {
    id: 'fa-5',
    date: '2026-06-28',
    timeSlot: '10:45',
    pitchId: '9v9',
    homeTeam: 'Scotter United U11 Colts',
    awayTeam: 'Brigg Town U11s',
    competition: 'Jack Kalson Junior League',
    scotterTeam: 'Scotter United U11 Colts',
  },
  {
    id: 'fa-6',
    date: '2026-06-28',
    timeSlot: '12:00',
    pitchId: '11v11',
    homeTeam: 'Scotter United Veterans',
    awayTeam: 'Lincoln Veterans',
    competition: 'Lincs County Veterans League',
    scotterTeam: 'Scotter United Veterans',
  },
  {
    id: 'fa-7',
    date: '2026-06-28',
    timeSlot: '09:30',
    pitchId: '9v9',
    homeTeam: 'Scotter United U12 Girls',
    awayTeam: 'Epworth Girls U12',
    competition: 'Lincs Women & Girls League',
    scotterTeam: 'Scotter United U12 Girls',
  },
  // Saturday July 4th Fixtures
  {
    id: 'fa-8',
    date: '2026-07-04',
    timeSlot: '09:30',
    pitchId: '9v9',
    homeTeam: 'Scotter United U12s Juniors',
    awayTeam: 'Crowle Colts U12s',
    competition: 'Jack Kalson Junior League',
    scotterTeam: 'Scotter United U12s Juniors',
  },
  {
    id: 'fa-9',
    date: '2026-07-04',
    timeSlot: '10:45',
    pitchId: '7v7',
    homeTeam: 'Scotter United U9 Saints',
    awayTeam: 'Messingham Juniors U9s',
    competition: 'Scunthorpe Youth Football League',
    scotterTeam: 'Scotter United U9 Saints',
  },
  {
    id: 'fa-10',
    date: '2026-07-04',
    timeSlot: '10:00',
    pitchId: '11v11',
    homeTeam: 'Scotter United U15s',
    awayTeam: 'Barton Town U15s',
    competition: 'Lincolnshire Intermediate League',
    scotterTeam: 'Scotter United U15s',
  },
  {
    id: 'fa-11',
    date: '2026-07-04',
    timeSlot: '12:00',
    pitchId: '11v11',
    homeTeam: 'Scotter United U13 Saints',
    awayTeam: 'Appleby Frodingham U13s',
    competition: 'Jack Kalson Junior League',
    scotterTeam: 'Scotter United U13 Saints',
  },
  {
    id: 'fa-12',
    date: '2026-07-04',
    timeSlot: '09:30',
    pitchId: '5v5',
    homeTeam: 'Scotter United U7 Saints',
    awayTeam: 'Kirton Lindsey U7s',
    competition: 'Scunthorpe Mini Soccer League',
    scotterTeam: 'Scotter United U7 Saints',
  },
  // Sunday July 5th Fixtures
  {
    id: 'fa-13',
    date: '2026-07-05',
    timeSlot: '10:45',
    pitchId: '9v9',
    homeTeam: 'Scotter United U11 Colts',
    awayTeam: 'Crosby United U11s',
    competition: 'Jack Kalson Junior League',
    scotterTeam: 'Scotter United U11 Colts',
  },
  {
    id: 'fa-14',
    date: '2026-07-05',
    timeSlot: '12:00',
    pitchId: '11v11',
    homeTeam: 'Scotter United Veterans',
    awayTeam: 'Grimsby Veterans',
    competition: 'Lincs County Veterans League',
    scotterTeam: 'Scotter United Veterans',
  },
  // Saturday July 11th Fixtures
  {
    id: 'fa-15',
    date: '2026-07-11',
    timeSlot: '09:30',
    pitchId: '9v9',
    homeTeam: 'Scotter United U12s Juniors',
    awayTeam: 'Winterton Rangers U12s',
    competition: 'Jack Kalson Junior League',
    scotterTeam: 'Scotter United U12s Juniors',
  },
  {
    id: 'fa-16',
    date: '2026-07-11',
    timeSlot: '10:45',
    pitchId: '7v7',
    homeTeam: 'Scotter United U10 Saints',
    awayTeam: 'Epworth Town U10s',
    competition: 'Scunthorpe Youth Football League',
    scotterTeam: 'Scotter United U10 Saints',
  },
  {
    id: 'fa-17',
    date: '2026-07-11',
    timeSlot: '12:00',
    pitchId: '11v11',
    homeTeam: 'Scotter United U13 Juniors',
    awayTeam: 'Bottesford Town U13s',
    competition: 'Jack Kalson Junior League',
    scotterTeam: 'Scotter United U13 Juniors',
  },
  {
    id: 'fa-18',
    date: '2026-07-11',
    timeSlot: '09:30',
    pitchId: '5v5',
    homeTeam: 'Scotter United U8 Juniors',
    awayTeam: 'App-Frod U8s',
    competition: 'Scunthorpe Mini Soccer League',
    scotterTeam: 'Scotter United U8 Juniors',
  },
  // Sunday July 12th Fixtures
  {
    id: 'fa-19',
    date: '2026-07-12',
    timeSlot: '09:30',
    pitchId: '9v9',
    homeTeam: 'Scotter United U12 Girls',
    awayTeam: 'Cleethorpes Girls U12',
    competition: 'Lincs Women & Girls League',
    scotterTeam: 'Scotter United U12 Girls',
  },
  {
    id: 'fa-20',
    date: '2026-07-12',
    timeSlot: '12:00',
    pitchId: '11v11',
    homeTeam: 'Scotter United U18s',
    awayTeam: 'Scunthorpe United Devs U18s',
    competition: 'Lincolnshire Intermediate League',
    scotterTeam: 'Scotter United U18s',
  },
];

// Calculate day shift to align 2026-06-27 to the Saturday of the current week
const getDayShift = (): number => {
  const targetDate = new Date('2026-06-27');
  
  // Find Saturday of the current week
  const today = new Date();
  const currentDay = today.getDay(); // 0 is Sunday, 6 is Saturday
  const diffToSaturday = 6 - currentDay; // Days to add to reach Saturday
  const saturdayOfCurrentWeek = new Date(today);
  saturdayOfCurrentWeek.setDate(today.getDate() + diffToSaturday);
  
  // Difference in milliseconds
  const diffTime = saturdayOfCurrentWeek.getTime() - targetDate.getTime();
  // Difference in days, rounded
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const shiftDateString = (dateStr: string): string => {
  if (!dateStr) return dateStr;
  const shift = getDayShift();
  const d = new Date(dateStr);
  d.setDate(d.getDate() + shift);
  return d.toISOString().split('T')[0];
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
  date: shiftDateString(f.date),
  homeTeam: f.homeTeam.replace('Scotter United ', ''),
  awayTeam: f.awayTeam.replace('Scotter United ', ''),
  scotterTeam: f.scotterTeam.replace('Scotter United ', ''),
}));


