/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PitchSize = '5v5' | '7v7' | '9v9' | '11v11';

export enum BookingStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  UNBOOKED = 'UNBOOKED',
}

export interface Booking {
  id: string;
  pitchId: PitchSize;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "09:30"
  teamName: string;
  managerName: string;
  managerId: string;
  notes: string;
  status: BookingStatus;
  declineReason?: string;
  createdAt: string;
  endTime?: string; // e.g. "10:45"
  bookingType?: 'STANDARD' | 'MATCH';
}

export interface PitchConfig {
  id: PitchSize;
  name: string;
  description: string;
  defaultSlots: string[];
}

export interface SlotChangeRequest {
  id: string;
  managerId: string;
  managerName: string;
  teamName: string;
  pitchId: PitchSize;
  actionType: 'ADD' | 'REMOVE' | 'CHANGE';
  targetSlot: string; // the slot to remove or change, or new slot to add
  newSlotTime?: string; // used if changing slot
  notes: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED';
  declineReason?: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  role: 'ADMIN' | 'MANAGER';
  teamName?: string;
  password?: string;
  googleLinked?: boolean;
  googleEmail?: string;
}
