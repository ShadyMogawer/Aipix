/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Users, UserCheck, UserX, Calendar, ChevronDown, ChevronUp, Trash2, Clock, Search, ExternalLink, FileText, Moon, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Employee, AttendanceLog, OfficeLocation } from "../types";
import {
  formatMinutesToDuration,
  timeToMinutes,
  getIntervalDurationDateAware,
  isIntervalActiveAtTime,
} from "../data/mockData";

interface RosterListProps {
  employees: Employee[];
  logs: AttendanceLog[];
  locations: OfficeLocation[];
  simulatedTime: string;
  onAddInterval: (employeeId: string, locationId: string, enter: string, exit: string | null) => void;
  onDeleteInterval: (employeeId: string, intervalId: string) => void;
  fteHoursStandard?: number;
  selectedDate?: string;
  /** Start of the selected date range (YYYY-MM-DD) */
  dateFrom?: string;
  /** End of the selected date range (YYYY-MM-DD) */
  dateTo?: string;
  /** Cairo calendar date of today — drives open-interval logic */
  todayDate?: string;
  onViewStaffDetails?: (employeeId: string) => void;
}

/** Returns every calendar date (YYYY-MM-DD) from dateFrom to dateTo inclusive. */
function getDateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  try {
    const cur = new Date(from + "T00:00:00Z");
    const end = new Date(to + "T00:00:00Z");
    while (cur <= end) {
      dates.push(cur.toISOString().substring(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  } catch { /* fallback empty */ }
  return dates;
}

/** Friendly short date label, e.g. "Mon, Jul 05" */
function shortDate(dateStr: string): string {
  try {
    return new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "2-digit", timeZone: "UTC"
    });
  } catch { return dateStr; }
}

export default function RosterList({
  employees,
  logs,
  locations,
  simulatedTime,
  onAddInterval,
  onDeleteInterval,
  fteHoursStandard = 8,
  selectedDate,
  dateFrom,
  dateTo,
  todayDate,
  onViewStaffDetails,
}: RosterListProps) {
  const [expandedEmpId, setExpandedEmpId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Resolve effective date range
  const effectiveDateFrom = dateFrom || selectedDate || "";
  const effectiveDateTo   = dateTo   || selectedDate || "";
  const effectiveTodayDate = todayDate || selectedDate || "";

  const isMultiDay = effectiveDateFrom && effectiveDateTo && effectiveDateFrom !== effectiveDateTo;
  const dateRange = useMemo(
    () => (effectiveDateFrom && effectiveDateTo ? getDateRange(effectiveDateFrom, effectiveDateTo) : []),
    [effectiveDateFrom, effectiveDateTo]
  );

  const toggleExpand = (id: string) => {
    setExpandedEmpId(expandedEmpId === id ? null : id);
  };

  // ── Per-employee helpers ──────────────────────────────────────────────────

  /** All logs for a given employee within the selected period */
  const getEmpLogs = (empId: string): AttendanceLog[] =>
    logs.filter(
      l => l.employeeId === empId &&
        (!effectiveDateFrom || l.date >= effectiveDateFrom) &&
        (!effectiveDateTo   || l.date <= effectiveDateTo)
    );

  /** Today's log (for live "inside?" check) */
  const getTodayLog = (empId: string): AttendanceLog | undefined =>
    logs.find(l => l.employeeId === empId && l.date === effectiveTodayDate);

  /** Total working minutes across the period for one employee */
  const getEmpTotalMinutes = (empId: string): number => {
    const empLogs = getEmpLogs(empId);
    return empLogs.reduce((sum, log) => {
      return sum + log.intervals.reduce((s, iv) =>
        s + getIntervalDurationDateAware(iv, log.date, effectiveTodayDate, simulatedTime), 0);
    }, 0);
  };

  /** Per-day breakdown for one employee */
  const getEmpPerDay = (empId: string): Record<string, number> => {
    const perDay: Record<string, number> = {};
    const empLogs = getEmpLogs(empId);
    empLogs.forEach(log => {
      const dayMins = log.intervals.reduce((s, iv) =>
        s + getIntervalDurationDateAware(iv, log.date, effectiveTodayDate, simulatedTime), 0);
      perDay[log.date] = (perDay[log.date] || 0) + dayMins;
    });
    return perDay;
  };

  // ── Filter employees by search query ─────────────────────────────────────

  const filteredEmployees = employees.filter((emp) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    if (emp.name.toLowerCase().includes(q)) return true;
    if (emp.id.toLowerCase().includes(q)) return true;
    if (emp.department.toLowerCase().includes(q)) return true;
    if (emp.role.toLowerCase().includes(q)) return true;
    const empLog = logs.find(l => l.employeeId === emp.id);
    if (empLog) {
      const loc = locations.find(l => l.id === empLog.locationId);
      if (loc) {
        if (loc.name.toLowerCase().includes(q)) return true;
        if (loc.code.toLowerCase().includes(q)) return true;
        if (loc.city.toLowerCase().includes(q)) return true;
      }
    }
    return false;
  });

  // ── Aggregate totals across filtered employees ────────────────────────────

  const filteredTotals = filteredEmployees.reduce(
    (totals, emp) => {
      const mins = getEmpTotalMinutes(emp.id);
      return {
        count: totals.count + 1,
        minutes: totals.minutes + mins,
        fte: totals.fte + mins / (fteHoursStandard * 60),
      };
    },
    { count: 0, minutes: 0, fte: 0 }
  );

  // ── Period summary label ──────────────────────────────────────────────────
  const periodSuffix = isMultiDay
    ? ` (${effectiveDateFrom} → ${effectiveDateTo})`
    : effectiveDateFrom
    ? ` (${effectiveDateFrom})`
    : "";

  return (
    <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl p-6 shadow-xl" id="employee-roster-section">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800 mb-5">
        <div>
          <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2 font-serif">
            <Users className="w-4.5 h-4.5 text-[#A9853B]" />
            Personnel Working Hours &amp; Roster
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5 font-mono">
            Per-employee working time calculated precisely per shift, including night shifts crossing midnight
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-850">
          <Calendar className="w-4 h-4 text-[#A9853B]" />
          <span>
            Period:{" "}
            <strong className="text-zinc-200">
              {isMultiDay ? `${effectiveDateFrom} → ${effectiveDateTo}` : effectiveDateFrom || "Today"}
            </strong>
          </span>
        </div>
      </div>

      {/* Dynamic Search Bar */}
      <div className="mb-5 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by employee, branch location (e.g. HQ-VAULT), or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0a0a0a] text-[#eae6dd] border border-zinc-800 focus:border-[#A9853B] rounded-xl pl-10 pr-10 py-2.5 text-xs focus:ring-1 focus:ring-[#A9853B] focus:outline-none font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-450 hover:text-zinc-200 font-bold text-xs bg-zinc-800 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
          <span className="font-mono text-zinc-500">Quick Filters:</span>
          {["IT department", "Security", "Operations", "HQ-VAULT", "Sameh", "EMP-003"].map((chip) => (
            <button
              key={chip}
              onClick={() => setSearchQuery(chip)}
              className="px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 hover:border-[#A9853B]/50 hover:text-zinc-100 transition-all text-[10px] cursor-pointer text-zinc-400"
            >
              #{chip}
            </button>
          ))}
        </div>
      </div>

      {/* Filtered Scope Statistics Summary Banner */}
      {searchQuery && (
        <div className="mb-5 bg-[#181510] border border-[#A9853B]/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-md animate-in fade-in duration-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#A9853B] animate-pulse"></span>
              <span className="text-[10px] uppercase tracking-wider font-mono text-[#D4AF37] font-bold">
                Filtered Scope Analytics{periodSuffix}
              </span>
            </div>
            <p className="text-xs text-zinc-300">
              Aggregated attendance metrics for group matching <strong className="text-zinc-100">"{searchQuery}"</strong>
            </p>
          </div>

          <div className="flex items-center gap-6 divide-x divide-zinc-800">
            <div className="text-right pl-4 first:pl-0">
              <p className="text-[10px] uppercase font-mono text-zinc-500 font-semibold">Matched staff</p>
              <p className="text-lg font-bold text-zinc-100 font-serif mt-0.5">{filteredTotals.count}</p>
            </div>
            <div className="text-right pl-4">
              <p className="text-[10px] uppercase font-mono text-zinc-500 font-semibold">Total Working Time</p>
              <p className="text-lg font-bold text-[#D4AF37] font-serif mt-0.5">
                {formatMinutesToDuration(filteredTotals.minutes)}
              </p>
            </div>
            <div className="text-right pl-4">
              <p className="text-[10px] uppercase font-mono text-zinc-500 font-semibold">Aggregated FTE</p>
              <p className="text-lg font-bold text-[#A9853B] font-serif mt-0.5">{Number(filteredTotals.fte.toFixed(2))}</p>
            </div>
          </div>
        </div>
      )}

      {/* Roster rows */}
      <div className="space-y-3">
        {filteredEmployees.length === 0 ? (
          <div className="p-10 text-center text-zinc-500 border border-dashed border-zinc-800/80 rounded-xl">
            <p className="italic text-xs">No employees found matching your search criteria.</p>
            <p className="text-[10px] text-zinc-600 mt-1.5 font-mono">
              Try searching for departments like "IT", roles, branch codes, or employee names.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredEmployees.map((emp) => {
              const isExpanded = expandedEmpId === emp.id;

              // Today's intervals for live presence check
              const todayLog = getTodayLog(emp.id);
              const todayIntervals = todayLog?.intervals || [];
              const isInside = todayIntervals.some(iv =>
                isIntervalActiveAtTime(iv.enterTime, iv.exitTime, simulatedTime)
              );

              // All logs within the selected period
              const empLogs = getEmpLogs(emp.id);
              const allIntervals = empLogs.flatMap(l => l.intervals);

              // Location label
              const currentLocName = isInside
                ? locations.find(l => l.id === (empLogs[0]?.locationId || todayLog?.locationId))?.name || "On-site"
                : "Outside company perimeter";

              // Period totals
              const cumulativeMinutes = getEmpTotalMinutes(emp.id);
              const perDay = getEmpPerDay(emp.id);
              const empFTE = Number((cumulativeMinutes / (fteHoursStandard * 60)).toFixed(3));

              // Night shift flag — any cross-midnight interval in the period
              const hasNightShift = allIntervals.some(iv => iv.crossesMidnight);

              // Missing IN log — count orphan-exit intervals
              const missingInCount = allIntervals.filter(iv => iv.missingIn).length;
              const hasMissingIn   = missingInCount > 0;
              // True when the employee also has valid (non-missingIn) intervals with recorded time
              const hasNormalIntervals = cumulativeMinutes > 0;

              // Max minutes in period for bar scaling
              const maxDayMins = Math.max(...Object.values(perDay), fteHoursStandard * 60);

              return (
                <motion.div
                  key={emp.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className={`border rounded-xl transition-all ${
                    hasMissingIn && !hasNormalIntervals
                      ? "bg-red-950/15 border-red-700/40 shadow-md shadow-red-950/10"
                      : hasMissingIn && hasNormalIntervals
                      ? "bg-orange-950/10 border-orange-700/30 shadow-md shadow-orange-950/5"
                      : isInside
                      ? "bg-amber-950/10 border-[#A9853B]/30 shadow-md shadow-amber-950/5"
                      : "bg-zinc-900/30 border-zinc-800/80 hover:bg-zinc-900/50"
                  }`}
                >
                  {/* Summary row */}
                  <div
                    onClick={() => toggleExpand(emp.id)}
                    className="p-4 flex flex-wrap items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative">
                        {emp.picture ? (
                          <img
                            src={emp.picture}
                            alt={emp.name}
                            className="w-10 h-10 rounded-xl object-cover border border-zinc-800/60 shadow-sm"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${emp.avatarColor} text-white font-bold flex items-center justify-center text-sm shadow-sm`}>
                            {emp.avatar}
                          </div>
                        )}
                        <span className={`absolute -bottom-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-zinc-900 ${isInside ? "bg-[#A9853B]" : "bg-zinc-600"}`}>
                          {isInside && <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-amber-400 opacity-75"></span>}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-zinc-100 flex items-center gap-2 font-serif">
                          {emp.name}
                          {hasNightShift && (
                            <span title="Night shift detected" className="text-indigo-400">
                              <Moon className="w-3 h-3 inline" />
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-500 font-mono font-medium">({emp.id})</span>
                        </h4>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {emp.role} • <span className="text-[#D4AF37] font-medium">{emp.department}</span>
                        </p>
                      </div>
                    </div>

                    {/* Location status */}
                    <div className="hidden md:block">
                      <div className="text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-zinc-300">
                          {isInside ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400 font-mono">On-site Now</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-3.5 h-3.5 text-zinc-500" />
                              <span className="text-zinc-500 font-mono">Offsite</span>
                            </>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-1 font-mono font-medium truncate max-w-[180px]">
                          {currentLocName}
                        </p>
                      </div>
                    </div>

                    {/* Working time + FTE */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs font-semibold text-zinc-500 font-mono tracking-wider uppercase">
                          {isMultiDay ? "Period Total" : "Today's Time"}
                        </p>
                        <p className={`text-base font-bold font-serif mt-0.5 ${
                          hasMissingIn && !hasNormalIntervals ? "text-red-400" : "text-[#D4AF37]"
                        }`}>
                          {hasMissingIn && !hasNormalIntervals
                            ? <span className="flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />0 mins</span>
                            : cumulativeMinutes > 0 ? formatMinutesToDuration(cumulativeMinutes) : "—"}
                        </p>
                        {hasMissingIn && !hasNormalIntervals ? (
                          <p className="text-[10px] text-red-500 font-mono mt-0.5 font-semibold">⚠ Missing IN log</p>
                        ) : hasMissingIn && hasNormalIntervals ? (
                          <p className="text-[10px] text-red-500 font-mono mt-0.5 font-semibold flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5" />
                            ({missingInCount} missing IN log{missingInCount > 1 ? "s" : ""})
                          </p>
                        ) : (
                          <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                            FTE: <span className="text-[#A9853B] font-semibold">{empFTE}</span>
                          </p>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-zinc-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded detail panel */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-4 border-t border-zinc-800 bg-zinc-950/80 rounded-b-xl space-y-5">

                      {/* Dossier CTA */}
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/60">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#A9853B]" />
                          <span className="text-xs font-serif font-bold text-zinc-200">Staff Attendance Dossier &amp; Analytics</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); if (onViewStaffDetails) onViewStaffDetails(emp.id); }}
                            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-[#A9853B] text-zinc-200 text-[11px] font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#A9853B]" /> View Dossier
                          </button>
                          <a
                            href={`/?staffId=${emp.id}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="bg-gradient-to-r from-amber-950/50 to-amber-900/40 hover:from-amber-900/60 hover:to-amber-800/50 border border-[#A9853B]/30 hover:border-[#A9853B]/80 text-[#D4AF37] text-[11px] font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab ↗
                          </a>
                        </div>
                      </div>

                      {/* ── Period Working-Time Breakdown ────────────────────────────── */}
                      {dateRange.length > 0 && (
                        <div>
                          <h5 className="text-[11px] font-bold text-zinc-500 font-mono uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-[#A9853B]" />
                            Working Time Breakdown{isMultiDay ? ` — ${dateRange.length} Days` : ""}
                          </h5>

                          <div className="bg-[#090909] border border-zinc-850 rounded-xl p-3.5 space-y-2">
                            {dateRange.map(date => {
                              const mins = perDay[date] || 0;
                              const dayLog = logs.find(l => l.employeeId === emp.id && l.date === date);
                              const hasNight = dayLog?.intervals.some(iv => iv.crossesMidnight) || false;
                              const isOpen  = dayLog?.intervals.some(iv => !iv.exitTime && !iv.missingIn) || false;
                              const isToday = date === effectiveTodayDate;
                              const barPct  = maxDayMins > 0 ? Math.min(100, (mins / maxDayMins) * 100) : 0;
                              const fteDay  = mins / (fteHoursStandard * 60);
                              const dayMissingCount = dayLog?.intervals.filter(iv => iv.missingIn).length || 0;
                              const dayHasNormal = mins > 0;
                              const dayAllMissing = dayMissingCount > 0 && !dayHasNormal;

                              return (
                                <div key={date} className="flex items-center gap-3 text-[11px] font-mono">
                                  {/* Date label */}
                                  <span className={`w-[110px] shrink-0 ${isToday ? "text-[#D4AF37] font-bold" : "text-zinc-400"}`}>
                                    {shortDate(date)}{isToday ? " ⬅" : ""}
                                  </span>

                                  {/* Bar */}
                                  <div className="flex-1 bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        mins === 0
                                          ? dayAllMissing ? "bg-red-700/50 w-full" : "w-0"
                                          : hasNight
                                          ? "bg-indigo-500"
                                          : isToday && isOpen
                                          ? "bg-amber-400 animate-pulse"
                                          : "bg-[#A9853B]"
                                      }`}
                                      style={{ width: mins > 0 ? `${barPct}%` : dayAllMissing ? "100%" : "0%" }}
                                    />
                                  </div>

                                  {/* Duration */}
                                  <span className={`w-[62px] text-right ${
                                    mins > 0 ? "text-zinc-200" :
                                    dayAllMissing ? "text-red-500 font-semibold" :
                                    "text-zinc-600 italic"
                                  }`}>
                                    {mins > 0 ? formatMinutesToDuration(mins) : dayAllMissing ? "0 mins" : "—"}
                                  </span>

                                  {/* Badges */}
                                  <div className="flex items-center gap-1 w-[100px]">
                                    {dayAllMissing && (
                                      <span className="flex items-center gap-0.5 text-red-500 text-[9px] font-bold">
                                        <AlertCircle className="w-2.5 h-2.5" /> {dayMissingCount} MISSING IN
                                      </span>
                                    )}
                                    {!dayAllMissing && dayMissingCount > 0 && (
                                      <span className="flex items-center gap-0.5 text-red-500 text-[9px] font-bold">
                                        <AlertCircle className="w-2.5 h-2.5" /> ({dayMissingCount})
                                      </span>
                                    )}
                                    {hasNight && (
                                      <span title="Night shift — crosses midnight" className="flex items-center gap-0.5 text-indigo-400 text-[9px] font-bold">
                                        <Moon className="w-2.5 h-2.5" /> NIGHT
                                      </span>
                                    )}
                                    {isToday && isOpen && (
                                      <span className="text-amber-400 text-[9px] font-bold animate-pulse">⏳ LIVE</span>
                                    )}
                                    {mins > 0 && !hasNight && !isOpen && dayMissingCount === 0 && (
                                      <span className="text-zinc-600 text-[9px]">
                                        {Number(fteDay.toFixed(2))} FTE
                                      </span>
                                    )}
                                    {!dayLog && (
                                      <span className="text-zinc-700 text-[9px] italic">No record</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Totals row */}
                            <div className="border-t border-zinc-800 mt-2 pt-2 flex items-center justify-between text-[11px] font-mono">
                              <span className="text-zinc-500 uppercase tracking-wider">Period Total</span>
                              <div className="flex items-center gap-3 flex-wrap justify-end">
                                <span className={`font-bold text-sm ${
                                  hasMissingIn && !hasNormalIntervals ? "text-red-400" : "text-[#D4AF37]"
                                }`}>
                                  {hasNormalIntervals
                                    ? formatMinutesToDuration(cumulativeMinutes)
                                    : hasMissingIn ? "0 mins" : "No records"}
                                </span>
                                {hasMissingIn ? (
                                  <span className="text-red-500 font-semibold flex items-center gap-1">
                                    <AlertCircle className="w-2.5 h-2.5" />
                                    ({missingInCount} missing IN log{missingInCount > 1 ? "s" : ""})
                                  </span>
                                ) : (
                                  <span className="text-zinc-500">
                                    = <span className="text-[#A9853B] font-semibold">{empFTE}</span> FTE
                                    <span className="text-zinc-600 ml-1">({fteHoursStandard}h/shift)</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ── Interval Segments List ───────────────────────────────────── */}
                      <div>
                        <h5 className="text-[11px] font-bold text-zinc-500 font-mono uppercase tracking-wider mb-3">
                          All Recorded Segments{isMultiDay ? ` (${effectiveDateFrom} → ${effectiveDateTo})` : ""}
                        </h5>

                        {empLogs.length === 0 ? (
                          <p className="text-xs text-zinc-400 italic py-2">
                            No check-ins recorded by AIPix cameras for this period.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {empLogs
                              .sort((a, b) => a.date.localeCompare(b.date))
                              .map(log => (
                                <div key={log.id}>
                                  {/* Day header */}
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                                      log.date === effectiveTodayDate
                                        ? "bg-amber-950/40 text-[#D4AF37] border-[#A9853B]/30"
                                        : "bg-zinc-900 text-zinc-400 border-zinc-800"
                                    }`}>
                                      {shortDate(log.date)}
                                      {log.date === effectiveTodayDate ? "  (Today)" : ""}
                                    </span>
                                    <span className="text-[10px] text-zinc-600 font-mono">
                                      {formatMinutesToDuration(perDay[log.date] || 0)}
                                    </span>
                                  </div>

                                  {/* Intervals for this day */}
                                  <div className="space-y-1.5 pl-2 border-l border-zinc-800">
                                    {log.intervals.map(interval => {
                                      const dur = getIntervalDurationDateAware(
                                        interval, log.date, effectiveTodayDate, simulatedTime
                                      );
                                      return (
                                        <div key={interval.id}
                                          className={`px-3.5 py-2.5 rounded-lg border flex justify-between items-center text-xs font-mono shadow-3xs ${
                                            interval.missingIn
                                              ? "bg-red-950/20 border-red-700/40 text-red-300"
                                              : "bg-zinc-900 border-zinc-800/80 text-zinc-300"
                                          }`}
                                        >
                                          <div className="flex items-center gap-3 flex-wrap">
                                            {interval.missingIn ? (
                                              <span className="p-1 px-1.5 rounded bg-red-950/60 text-red-400 text-[10px] font-bold border border-red-700/40 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> MISSING IN
                                              </span>
                                            ) : (
                                              <span className="p-1 px-1.5 rounded bg-amber-950/40 text-[#A9853B] text-[10px] font-bold border border-[#A9853B]/20">
                                                INTERVAL
                                              </span>
                                            )}
                                            {interval.missingIn ? (
                                              <span className="text-red-400 font-semibold">Out only: <strong className="text-red-300">{interval.exitTime}</strong> — no IN log recorded</span>
                                            ) : (
                                              <>
                                                <span>
                                                  In: <strong className="text-zinc-100">{interval.enterTime}</strong>
                                                </span>
                                                <span>•</span>
                                                <span>
                                                  Out:{" "}
                                                  <strong className="text-zinc-100">
                                                    {interval.exitTime
                                                      ? interval.crossesMidnight
                                                        ? `${interval.exitTime} +1d`
                                                        : interval.exitTime
                                                      : "Active..."}
                                                  </strong>
                                                </span>
                                                {interval.crossesMidnight && (
                                                  <span className="flex items-center gap-0.5 text-indigo-400 text-[9px] font-bold">
                                                    <Moon className="w-2.5 h-2.5" /> NIGHT SHIFT
                                                  </span>
                                                )}
                                                {!interval.exitTime && log.date < effectiveTodayDate && (
                                                  <span className="flex items-center gap-1 text-amber-500 text-[9px] font-bold">
                                                    <AlertCircle className="w-2.5 h-2.5" /> EST. EXIT
                                                  </span>
                                                )}
                                              </>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-3">
                                            {interval.missingIn ? (
                                              <span className="text-red-400 font-bold bg-red-950/40 px-2 py-0.5 rounded text-[10px] border border-red-700/30">
                                                0 mins
                                              </span>
                                            ) : (
                                              <span className="text-[#D4AF37] font-bold bg-[#A9853B]/10 px-2 py-0.5 rounded text-[10px] border border-[#A9853B]/20">
                                                {formatMinutesToDuration(dur)}
                                              </span>
                                            )}
                                            <button
                                              onClick={() => onDeleteInterval(emp.id, interval.id)}
                                              className="p-1.5 hover:text-rose-400 hover:bg-rose-950/30 text-zinc-500 rounded transition-all cursor-pointer"
                                              title="Delete attendance interval segment"
                                              id={`delete-int-${interval.id}`}
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
