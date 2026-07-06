/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Employee {
  id: string;
  name: string;
  role: string;
  avatar: string;
  department: string;
  avatarColor: string;
  picture?: string;
}

export interface AttendanceInterval {
  id: string;
  enterTime: string; // "HH:MM" 24h format
  exitTime: string | null; // "HH:MM" or null for currently checked in
  enterDate?: string; // "YYYY-MM-DD" — calendar date of entry (populated by API sync)
  exitDate?: string; // "YYYY-MM-DD" — calendar date of exit (differs from enterDate for night shifts)
  crossesMidnight?: boolean; // true when the interval spans midnight into the next calendar day
  durationMinutes: number; // pre-computed helper (accurate for closed intervals)
}

export interface AttendanceLog {
  id: string;
  employeeId: string;
  locationId: string;
  date: string; // "YYYY-MM-DD"
  intervals: AttendanceInterval[];
}

export interface OfficeLocation {
  id: string;
  name: string;
  code: string;
  city: string;
  cameraCount: number;
  ipAddress: string;
  targetFewerThanMaxCapacity: number;
}

export interface CameraDetection {
  id: string;
  timestamp: string; // "HH:MM:SS"
  date?: string; // "YYYY-MM-DD" — Cairo calendar date of this detection event
  employeeId: string;
  employeeName: string;
  direction: "In" | "Out";
  locationId: string;
  confidence: number; // e.g., 98.4
  cameraName: string;
  cameraId?: number;
}

export interface HourlyHeadcount {
  hour: string; // "08:00", etc.
  headcount: number;
}
