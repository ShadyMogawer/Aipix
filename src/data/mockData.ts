/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Employee, OfficeLocation, AttendanceLog, CameraDetection } from "../types";

// Helper to convert HH:MM to minutes
export const timeToMinutes = (timeStr: string): number => {
  const parts = timeStr.split(":");
  if (parts.length < 2) return 0;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
};

// Helper to format minutes as hours and minutes (e.g., "5h 20m" or "50 mins")
export const formatMinutesToDuration = (minutes: number): string => {
  if (minutes < 0) return "0 mins";
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) {
    return `${mins} mins`;
  }
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
};

// Helper to calculate the duration of an interval (handling cross-midnight night shifts)
export const getIntervalDuration = (
  enterTime: string,
  exitTime: string | null,
  simulatedTime: string
): number => {
  const enterMins = timeToMinutes(enterTime);
  const exitMins = exitTime ? timeToMinutes(exitTime) : timeToMinutes(simulatedTime);

  if (exitTime) {
    if (exitMins >= enterMins) {
      return exitMins - enterMins;
    } else {
      // Night shift (crossed midnight)
      return (1440 - enterMins) + exitMins;
    }
  } else {
    // Open-ended (still inside)
    if (exitMins >= enterMins) {
      return exitMins - enterMins;
    } else {
      const elapsed = (1440 - enterMins) + exitMins;
      // Cap at 16 hours (960 minutes) for ongoing night shifts
      return elapsed <= 960 ? elapsed : 0;
    }
  }
};

// Helper to check if a simulated time falls within an interval (handling cross-midnight night shifts)
export const isIntervalActiveAtTime = (
  enterTime: string,
  exitTime: string | null,
  simulatedTime: string
): boolean => {
  const enterMins = timeToMinutes(enterTime);
  const simMins = timeToMinutes(simulatedTime);

  if (exitTime) {
    const exitMins = timeToMinutes(exitTime);
    if (exitMins >= enterMins) {
      return simMins >= enterMins && simMins <= exitMins;
    } else {
      // Night shift crossing midnight
      return simMins >= enterMins || simMins <= exitMins;
    }
  } else {
    // If still inside, they are active if simulatedTime is after enterTime,
    // or if it has crossed midnight and elapsed time is within a standard 16-hour shift window
    if (simMins >= enterMins) {
      return true;
    } else {
      const elapsed = (1440 - enterMins) + simMins;
      return elapsed <= 960;
    }
  }
};

// Initial Employees representing the Bullion Trading Center (BTC) theme
export const initialEmployees: Employee[] = [
  {
    id: "EMP-001",
    name: "Sameh Mogawer",
    role: "Chief Technology Officer",
    avatar: "SM",
    department: "Executive Branch",
    avatarColor: "from-teal-500 to-emerald-600",
    picture: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&q=80",
  },
  {
    id: "EMP-002",
    name: "John Carter",
    role: "Safety Integrity Auditor",
    avatar: "JC",
    department: "Operations Control",
    avatarColor: "from-blue-500 to-indigo-600",
    picture: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face&q=80",
  },
  {
    id: "EMP-003",
    name: "Sarah Al-Gamil",
    role: "AIPix Vision Specialist",
    avatar: "SA",
    department: "AI & Innovation Labs",
    avatarColor: "from-pink-500 to-rose-600",
    picture: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face&q=80",
  },
  {
    id: "EMP-004",
    name: "Omar Khalifa",
    role: "Lead Systems Engineer",
    avatar: "OK",
    department: "HQ Vault Operations",
    avatarColor: "from-amber-500 to-orange-600",
    picture: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face&q=80",
  },
  {
    id: "EMP-005",
    name: "Nour El-Din",
    role: "Logistics Coordinator",
    avatar: "ND",
    department: "Supply Chain",
    avatarColor: "from-purple-500 to-violet-600",
    picture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face&q=80",
  },
];

// Locations matching BTC HQ facilities & divisions
export const initialLocations: OfficeLocation[] = [
  {
    id: "LOC-001",
    name: "BTC HQ Main Gold Vault",
    code: "HQ-VAULT",
    city: "BTC HQ - Vault Level",
    cameraCount: 14,
    ipAddress: "192.168.10.45",
    targetFewerThanMaxCapacity: 15,
  },
  {
    id: "LOC-002",
    name: "BTC HQ Trading & Corporate Suite",
    code: "HQ-TRADING",
    city: "BTC HQ - Floor 3",
    cameraCount: 8,
    ipAddress: "192.168.1.110",
    targetFewerThanMaxCapacity: 25,
  },
  {
    id: "LOC-003",
    name: "BTC HQ Logistics & Delivery Terminal",
    code: "HQ-LOGISTICS",
    city: "BTC HQ - Ground Floor",
    cameraCount: 6,
    ipAddress: "192.168.20.15",
    targetFewerThanMaxCapacity: 10,
  },
];

// Initial Attendance Logs for "Today" (e.g. 2026-07-02)
// Must precisely match user request scenario:
// Employee 1 (John Carter, EMP-002) - inside from 15:00 to 16:00 (total time: 1 hour)
// Employee 2 (Sarah Al-Gamil, EMP-003) - inside from 14:30 to 14:50 and from 15:30 to 16:00 (total time: 20m + 30m = 50 mins)
export const initialLogs: AttendanceLog[] = [
  {
    id: "LOG-001", // Sameh Mogawer
    employeeId: "EMP-001",
    locationId: "LOC-002", // BTC HQ Trading & Corporate Suite
    date: "2026-07-02",
    intervals: [
      {
        id: "INT-11",
        enterTime: "08:15",
        exitTime: "12:00",
        durationMinutes: 225, // 3h 45m
      },
      {
        id: "INT-12",
        enterTime: "13:00",
        exitTime: "17:15",
        durationMinutes: 255, // 4h 15m
      },
    ], // Total: 480 mins (8 hours, exactly 1.0 FTE)
  },
  {
    id: "LOG-002",
    employeeId: "EMP-002", // John Carter (user description case 1)
    locationId: "LOC-001", // BTC HQ Main Gold Vault
    date: "2026-07-02",
    intervals: [
      {
        id: "INT-21",
        enterTime: "15:00",
        exitTime: "16:00",
        durationMinutes: 60, // 1 hour
      },
    ],
  },
  {
    id: "LOG-003",
    employeeId: "EMP-003", // Sarah Al-Gamil (user description case 2)
    locationId: "LOC-001", // BTC HQ Main Gold Vault
    date: "2026-07-02",
    intervals: [
      {
        id: "INT-31",
        enterTime: "14:30",
        exitTime: "14:50",
        durationMinutes: 20, // 20 mins
      },
      {
        id: "INT-32",
        enterTime: "15:30",
        exitTime: "16:00",
        durationMinutes: 30, // 30 mins
      },
    ], // Total 50 mins
  },
  {
    id: "LOG-004",
    employeeId: "EMP-004", // Omar Khalifa
    locationId: "LOC-001", // BTC HQ Main Gold Vault
    date: "2026-07-02",
    intervals: [
      {
        id: "INT-41",
        enterTime: "09:00",
        exitTime: "12:30",
        durationMinutes: 210, // 3h 30m
      },
      {
        id: "INT-42",
        enterTime: "14:00",
        exitTime: null, // Still inside! Active.
        durationMinutes: 0, // Calculated dynamically in memory
      },
    ],
  },
  {
    id: "LOG-005",
    employeeId: "EMP-005", // Nour El-Din
    locationId: "LOC-003", // BTC HQ Logistics & Delivery Terminal
    date: "2026-07-02",
    intervals: [
      {
        id: "INT-51",
        enterTime: "10:00",
        exitTime: "15:45",
        durationMinutes: 345, // 5h 45m
      },
    ],
  },
];

// Initial list of camera detections stream representing aipix.ai computer vision events
export const initialDetections: CameraDetection[] = [
  {
    id: "DET-101",
    timestamp: "15:30:00",
    employeeId: "EMP-003",
    employeeName: "Sarah Al-Gamil",
    direction: "In",
    locationId: "LOC-001",
    confidence: 99.12,
    cameraName: "Vault Main Entry CAM-02",
  },
  {
    id: "DET-102",
    timestamp: "15:45:00",
    employeeId: "EMP-005",
    employeeName: "Nour El-Din",
    direction: "Out",
    locationId: "LOC-003",
    confidence: 98.67,
    cameraName: "Logistics Gate B Departure CAM-01",
  },
  {
    id: "DET-103",
    timestamp: "16:00:00",
    employeeId: "EMP-002",
    employeeName: "John Carter",
    direction: "Out",
    locationId: "LOC-001",
    confidence: 99.43,
    cameraName: "Vault Main Entry CAM-02",
  },
  {
    id: "DET-104",
    timestamp: "16:00:10",
    employeeId: "EMP-003",
    employeeName: "Sarah Al-Gamil",
    direction: "Out",
    locationId: "LOC-001",
    confidence: 97.98,
    cameraName: "Vault Corridor CAM-04",
  },
];
