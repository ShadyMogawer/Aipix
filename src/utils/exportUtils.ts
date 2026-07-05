/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Employee, AttendanceLog, OfficeLocation } from "../types";
import { timeToMinutes, formatMinutesToDuration, getIntervalDuration, isIntervalActiveAtTime } from "../data/mockData";

/**
 * Calculates current status, active location and cumulative minutes for an employee
 */
export function getEmployeeAttendanceStats(
  emp: Employee,
  logs: AttendanceLog[],
  locations: OfficeLocation[],
  simulatedTime: string
) {
  const empLog = logs.find((l) => l.employeeId === emp.id);
  const intervals = empLog?.intervals || [];

  // Determine current presence status based on simulated time
  const isInside = intervals.some((interval) => {
    return isIntervalActiveAtTime(interval.enterTime, interval.exitTime, simulatedTime);
  });
  const currentLoc = isInside
    ? locations.find((l) => l.id === empLog?.locationId)
    : null;
  const currentLocName = currentLoc ? currentLoc.name : "Outside company perimeter";

  // Calculate cumulative today's active minutes
  const cumulativeMinutes = intervals.reduce((accum, interval) => {
    return accum + getIntervalDuration(interval.enterTime, interval.exitTime, simulatedTime);
  }, 0);

  return {
    isInside,
    currentLocName,
    currentLocCode: currentLoc ? currentLoc.code : "N/A",
    cumulativeMinutes,
    intervals,
  };
}

/**
 * Generates a clean corporate CSV representation of current daily attendance list and FTE records
 */
export function generateCSV(
  employees: Employee[],
  logs: AttendanceLog[],
  locations: OfficeLocation[],
  simulatedTime: string,
  fteHoursBaseline: number
): string {
  const fteMinutesStandard = fteHoursBaseline * 60;
  
  // Headers
  const csvRows = [
    [
      "Date",
      "Employee ID",
      "Employee Name",
      "Department",
      "Role",
      "Current Status",
      "Current Location Name",
      "Current Location Code",
      "Attendance Segments (Today)",
      "Cumulative Duration (Mins)",
      "Cumulative Duration (Formatted)",
      "FTE Weight Contribution",
      "Workday Shift Standard (Hrs)"
    ].map(escapeCSVCell).join(",")
  ];

  // Data Rows
  employees.forEach((emp) => {
    const stats = getEmployeeAttendanceStats(emp, logs, locations, simulatedTime);
    const fteWeight = (stats.cumulativeMinutes / fteMinutesStandard).toFixed(3);
    
    // Format segments as a single cell string list: "enter-exit, enter-in progress"
    const segmentStrList = stats.intervals.map(
      (int) => `${int.enterTime} to ${int.exitTime || "Inside (ongoing)"}`
    ).join(" | ") || "No check-ins";

    const row = [
      "2026-06-09", // Current Day
      emp.id,
      emp.name,
      emp.department,
      emp.role,
      stats.isInside ? "Inside Plant" : "Outside",
      stats.currentLocName,
      stats.currentLocCode,
      segmentStrList,
      stats.cumulativeMinutes.toString(),
      formatMinutesToDuration(stats.cumulativeMinutes),
      fteWeight,
      fteHoursBaseline.toString()
    ];

    csvRows.push(row.map(escapeCSVCell).join(","));
  });

  return csvRows.join("\n");
}

/**
 * Escapes a cell value for standard RFC 4180 CSV compliance
 */
function escapeCSVCell(val: string): string {
  // If the value contains quotes, commas, or newlines, we wrap it in double quotes and escape existing quotes
  const stringified = val === null || val === undefined ? "" : String(val);
  if (stringified.includes(",") || stringified.includes('"') || stringified.includes("\n") || stringified.includes("\r")) {
    return `"${stringified.replace(/"/g, '""')}"`;
  }
  return stringified;
}

/**
 * Triggers a native document/file download in client browser context
 */
export function triggerCSVDownload(csvContent: string, filename: string = "acc_daily_attendance_report.csv") {
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
