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
  durationMinutes: number; // computed helper
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
  employeeId: string;
  employeeName: string;
  direction: "In" | "Out";
  locationId: string;
  confidence: number; // e.g., 98.4
  cameraName: string;
}

export interface HourlyHeadcount {
  hour: string; // "08:00", etc.
  headcount: number;
}
