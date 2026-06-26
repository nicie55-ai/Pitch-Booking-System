/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Booking, BookingStatus, PitchConfig, SlotChangeRequest, User, PitchSize } from './types';

const RAW_MOCK_USERS: User[] = [
  {
    id: 'admin-1',
    name: 'Sarah Jenkins (Club Secretary)',
    role: 'ADMIN',
  },
  {
    id: 'manager-u7',
    name: 'David Beckham',
    role: 'MANAGER',
    teamName: 'Scotter United U7 Juniors',
  },
  {
    id: 'manager-u9',
    name: 'Paul Scholes',
    role: 'MANAGER',
    teamName: 'Scotter United U9 Saints',
  },
  {
    id: 'manager-u11',
    name: 'Steven Gerrard',
    role: 'MANAGER',
    teamName: 'Scotter United U11 Colts',
  },
  {
    id: 'manager-u13',
    name: 'Frank Lampard',
    role: 'MANAGER',
    teamName: 'Scotter United U13 Saints',
  },
  {
    id: 'manager-u15',
    name: 'Wayne Rooney',
    role: 'MANAGER',
    teamName: 'Scotter United U15s',
  },
];

export const DEFAULT_PITCH_CONFIGS: PitchConfig[] = [
  {
    id: '5v5',
    name: '5v5',
    description: 'Perfect for Under 7s and Under 8s matches.',
    defaultSlots: ['09:30', '10:45', '12:00'],
  },
  {
    id: '7v7',
    name: '7v7',
    description: 'Designed for Under 9s and Under 10s age groups.',
    defaultSlots: ['09:30', '10:45', '12:00'],
  },
  {
    id: '9v9',
    name: '9v9',
    description: 'Designed for Under 11s and Under 12s age groups.',
    defaultSlots: ['09:30', '10:45', '12:00'],
  },
  {
    id: '11v11',
    name: '11v11',
    description: 'Full-size pitch for Under 13s to Adults.',
    defaultSlots: ['09:30', '10:45', '12:00'],
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

export interface ClubTeam {
  name: string;
  category: string;
  pitchSize: PitchSize;
}

const RAW_SCOTTER_TEAMS: ClubTeam[] = [
  // U7s
  { name: 'Scotter United U7 Juniors', category: 'U7s', pitchSize: '5v5' },
  { name: 'Scotter United U7 Saints', category: 'U7s', pitchSize: '5v5' },
  // U8s
  { name: 'Scotter United U8 Juniors', category: 'U8s', pitchSize: '5v5' },
  { name: 'Scotter United U8 Saints', category: 'U8s', pitchSize: '5v5' },
  // U9s
  { name: 'Scotter United U9 Saints', category: 'U9s', pitchSize: '7v7' },
  { name: 'Scotter United U9s Juniors', category: 'U9s', pitchSize: '7v7' },
  // U10s
  { name: 'Scotter United U10 Saints', category: 'U10s', pitchSize: '7v7' },
  { name: 'Scotter United U10 Juniors', category: 'U10s', pitchSize: '7v7' },
  // U11s
  { name: 'Scotter United U11 Colts', category: 'U11s', pitchSize: '9v9' },
  { name: 'Scotter United U11s Juniors', category: 'U11s', pitchSize: '9v9' },
  // U12s
  { name: 'Scotter United U12s Juniors', category: 'U12', pitchSize: '9v9' },
  { name: 'Scotter United U12 Colts', category: 'U12', pitchSize: '9v9' },
  // U13s
  { name: 'Scotter United U13 Saints', category: 'U13', pitchSize: '11v11' },
  { name: 'Scotter United U13 Juniors', category: 'U13', pitchSize: '11v11' },
  // Senior formats
  { name: 'Scotter United U14s', category: 'U14', pitchSize: '11v11' },
  { name: 'Scotter United U15s', category: 'U15', pitchSize: '11v11' },
  { name: 'Scotter United U17s', category: 'U17', pitchSize: '11v11' },
  { name: 'Scotter United U18s', category: 'U18', pitchSize: '11v11' },
  // Girls
  { name: 'Scotter United U12 Girls', category: 'U12 Girls', pitchSize: '9v9' },
  { name: 'Scotter United U14 Girls', category: 'U14 Girls', pitchSize: '11v11' },
  // Veterans
  { name: 'Scotter United Veterans', category: 'Veterans', pitchSize: '11v11' },
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
    timeSlot: '12:00',
    pitchId: '11v11',
    homeTeam: 'Scotter United U15s',
    awayTeam: 'Barton Town U15s',
    competition: 'Lincolnshire Intermediate League',
    scotterTeam: 'Scotter United U15s',
  },
  {
    id: 'fa-11',
    date: '2026-07-04',
    timeSlot: '13:15',
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

export const MOCK_USERS: User[] = RAW_MOCK_USERS.map(u => ({
  ...u,
  teamName: u.teamName ? u.teamName.replace('Scotter United ', '') : undefined,
}));

export const INITIAL_BOOKINGS: Booking[] = RAW_INITIAL_BOOKINGS.map(b => ({
  ...b,
  teamName: b.teamName.replace('Scotter United ', ''),
}));

export const INITIAL_SLOT_CHANGES: SlotChangeRequest[] = RAW_INITIAL_SLOT_CHANGES.map(sc => ({
  ...sc,
  teamName: sc.teamName.replace('Scotter United ', ''),
}));

export const SCOTTER_TEAMS: ClubTeam[] = RAW_SCOTTER_TEAMS.map(t => ({
  ...t,
  name: t.name.replace('Scotter United ', ''),
}));

export const MOCK_FA_FULLTIME_FIXTURES: FAFixture[] = RAW_MOCK_FA_FULLTIME_FIXTURES.map(f => ({
  ...f,
  homeTeam: f.homeTeam.replace('Scotter United ', ''),
  awayTeam: f.awayTeam.replace('Scotter United ', ''),
  scotterTeam: f.scotterTeam.replace('Scotter United ', ''),
}));


