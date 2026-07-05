/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  ArrowLeft, UserCheck, UserX, Clock, Calendar, ShieldCheck, Video,
  HelpCircle, AlertTriangle, Moon, AlertCircle
} from "lucide-react";
import { Employee, AttendanceLog, OfficeLocation, CameraDetection } from "../types";
import {
  formatMinutesToDuration, timeToMinutes, getIntervalDurationDateAware, isIntervalActiveAtTime
} from "../data/mockData";

interface StaffDossierProps {
  employeeId: string;
  employees: Employee[];
  logs: AttendanceLog[];
  locations: OfficeLocation[];
  detections: CameraDetection[];
  simulatedTime: string;
  fteHoursStandard?: number;
  onClose: () => void;
  selectedDate?: string;
  /** Start of the selected date range (YYYY-MM-DD) */
  dateFrom?: string;
  /** End of the selected date range (YYYY-MM-DD) */
  dateTo?: string;
  /** Cairo calendar date of today */
  todayDate?: string;
}

/** Friendly short date label */
function shortDate(d: string): string {
  try {
    return new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "2-digit", timeZone: "UTC"
    });
  } catch { return d; }
}

export default function StaffDossier({
  employeeId,
  employees,
  logs,
  locations,
  detections,
  simulatedTime,
  fteHoursStandard = 8,
  onClose,
  selectedDate = "Today",
  dateFrom,
  dateTo,
  todayDate,
}: StaffDossierProps) {
  // Find the target employee
  const emp = employees.find(e => e.id === employeeId);

  const effectiveDateFrom  = dateFrom  || selectedDate || "";
  const effectiveDateTo    = dateTo    || selectedDate || "";
  const effectiveTodayDate = todayDate || selectedDate || "";
  const isMultiDay = effectiveDateFrom && effectiveDateTo && effectiveDateFrom !== effectiveDateTo;

  if (!emp) {
    return (
      <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-8 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-[#A9853B] mx-auto" />
        <h3 className="text-lg font-serif font-bold text-zinc-100">Subject Not Found</h3>
        <p className="text-xs text-zinc-400">Employee ID "{employeeId}" is not loaded in the current active camera index.</p>
        <button
          onClick={onClose}
          className="bg-[#A9853B] hover:bg-[#C5A862] text-zinc-950 font-bold py-2 px-5 rounded-xl text-xs transition-colors cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // ── Gather all logs for this employee within the selected period ───────────
  const empLogs = logs
    .filter(l =>
      l.employeeId === emp.id &&
      (!effectiveDateFrom || l.date >= effectiveDateFrom) &&
      (!effectiveDateTo   || l.date <= effectiveDateTo)
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  // Today's log for live presence check
  const todayLog = logs.find(l => l.employeeId === emp.id && l.date === effectiveTodayDate);
  const todayIntervals = todayLog?.intervals || [];
  const isInside = todayIntervals.some(iv =>
    isIntervalActiveAtTime(iv.enterTime, iv.exitTime, simulatedTime)
  );

  const currentLoc = isInside
    ? locations.find(l => l.id === (todayLog?.locationId || empLogs[0]?.locationId))
    : null;

  // ── Per-day breakdown ─────────────────────────────────────────────────────
  const perDay: Record<string, number> = {};
  empLogs.forEach(log => {
    const dayMins = log.intervals.reduce((s, iv) =>
      s + getIntervalDurationDateAware(iv, log.date, effectiveTodayDate, simulatedTime), 0
    );
    perDay[log.date] = (perDay[log.date] || 0) + dayMins;
  });

  const cumulativeMinutes = Object.values(perDay).reduce((a, b) => a + b, 0);
  const empFTE = Number((cumulativeMinutes / (fteHoursStandard * 60)).toFixed(3));

  // Earliest check-in / latest departure across the period
  const allIntervals = empLogs.flatMap(l => l.intervals);
  const hasNightShift = allIntervals.some(iv => iv.crossesMidnight);

  const firstLog = empLogs[0];
  const lastLog  = empLogs[empLogs.length - 1];
  const earliestCheckIn  = firstLog  ? `${shortDate(firstLog.date)} ${firstLog.intervals[0]?.enterTime || ""}`.trim() : "N/A";
  const lastInterval     = lastLog   ? lastLog.intervals[lastLog.intervals.length - 1] : null;
  const latestCheckOut   = lastInterval
    ? lastInterval.exitTime
      ? `${shortDate(lastLog.date)} ${lastInterval.crossesMidnight ? `${lastInterval.exitTime} +1d` : lastInterval.exitTime}`
      : "Still Inside"
    : "N/A";

  // Camera detections for this employee
  const personalDetections = detections
    .filter(d => d.employeeId === emp.id)
    .sort((a, b) => {
      const aKey = `${a.date || ""}${a.timestamp}`;
      const bKey = `${b.date || ""}${b.timestamp}`;
      return bKey.localeCompare(aKey); // newest first
    });

  const totalInTriggers  = personalDetections.filter(d => d.direction === "In").length;
  const totalOutTriggers = personalDetections.filter(d => d.direction === "Out").length;
  const hasConsecutiveTriggers =
    totalInTriggers > totalOutTriggers + 1 || (totalInTriggers > 1 && totalOutTriggers === 0);

  return (
    <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden animate-in fade-in zoom-in duration-200">
      {/* Decorative glow */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#A9853B]/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Breadcrumb & Controls */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 text-zinc-400 group-hover:text-[#A9853B] transition-colors" />
          <span>BACK TO BTC OPERATIONS DASHBOARD</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono bg-zinc-950 px-3.5 py-1.5 rounded-xl border border-zinc-850">
          <Calendar className="w-4 h-4 text-[#A9853B]" />
          <span>
            Period:{" "}
            <strong className="text-zinc-100">
              {isMultiDay ? `${effectiveDateFrom} → ${effectiveDateTo}` : effectiveDateFrom || "Today"}
            </strong>
          </span>
        </div>
      </div>

      {/* Employee Profile Banner */}
      <div className="bg-[#0c0c0c] border border-zinc-850 p-6 rounded-2xl flex flex-wrap items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="relative">
            {emp.picture ? (
              <img
                src={emp.picture}
                alt={emp.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-[#A9853B]/30 shadow-md"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${emp.avatarColor} text-white font-extrabold flex items-center justify-center text-xl shadow-md`}>
                {emp.avatar}
              </div>
            )}
            <span className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-zinc-950 ${isInside ? "bg-[#A9853B]" : "bg-zinc-600"}`}>
              {isInside && <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-amber-400 opacity-75" />}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold font-serif tracking-tight text-zinc-100">{emp.name}</h2>
              <span className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">{emp.id}</span>
              {hasNightShift && (
                <span className="flex items-center gap-1 bg-indigo-950/50 border border-indigo-700/30 text-indigo-400 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  <Moon className="w-2.5 h-2.5" /> Night Shift Worker
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-400 mt-1">{emp.role} • <strong className="text-[#D4AF37]">{emp.department}</strong></p>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono mt-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-emerald-400 font-bold">Class-A Vault Authorized</span>
            </div>
          </div>
        </div>

        <div className="bg-[#121212] px-5 py-3 rounded-xl border border-zinc-800 text-right min-w-[200px]">
          <p className="text-[10px] font-mono uppercase text-zinc-500 font-semibold">Current State</p>
          <div className="flex items-center justify-end gap-1.5 mt-1">
            {isInside ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-emerald-400 font-mono">INSIDE SECURE VAULT</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-zinc-600" />
                <span className="text-sm font-bold text-zinc-400 font-mono">OFFSITE / DISPATCHED</span>
              </>
            )}
          </div>
          <p className="text-[10.5px] text-zinc-400 mt-1 font-mono">
            {isInside ? (currentLoc?.name || "BTC HQ") : "Outside security perimeter"}
          </p>
        </div>
      </div>

      {/* Stats Block */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/60 border border-zinc-850 p-4 rounded-xl space-y-2">
          <p className="text-[10px] uppercase font-mono text-zinc-500 font-semibold tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#A9853B]" />
            {isMultiDay ? "Period Total" : "Working Time"}
          </p>
          <p className="text-2xl font-bold text-[#D4AF37] font-serif">
            {cumulativeMinutes > 0 ? formatMinutesToDuration(cumulativeMinutes) : "No records"}
          </p>
          <p className="text-[10px] text-zinc-500 font-mono">
            {isMultiDay ? `Across ${empLogs.length} day(s) with records` : "Accrued from scan triggers"}
          </p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-850 p-4 rounded-xl space-y-2">
          <p className="text-[10px] uppercase font-mono text-zinc-500 font-semibold tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#A9853B]" /> Compliance FTE
          </p>
          <p className="text-2xl font-bold text-zinc-200 font-serif">
            {empFTE} <span className="text-xs text-zinc-500 font-mono font-normal">FTE</span>
          </p>
          <p className="text-[10px] text-zinc-500 font-mono">Based on {fteHoursStandard}hr standard shift</p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-850 p-4 rounded-xl space-y-2">
          <p className="text-[10px] uppercase font-mono text-zinc-500 font-semibold tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#A9853B]" /> First Entry
          </p>
          <p className="text-sm font-bold text-zinc-200 font-mono leading-snug">{earliestCheckIn}</p>
          <p className="text-[10px] text-zinc-500 font-mono">Earliest scan in period</p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-850 p-4 rounded-xl space-y-2">
          <p className="text-[10px] uppercase font-mono text-zinc-500 font-semibold tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#A9853B]" /> Latest Departure
          </p>
          <p className="text-sm font-bold text-zinc-200 font-mono leading-snug">{latestCheckOut}</p>
          <p className="text-[10px] text-zinc-500 font-mono">Last checkout timestamp</p>
        </div>
      </div>

      {/* Overlap analysis explainer */}
      <div className="bg-amber-950/15 border border-[#A9853B]/20 p-4 rounded-2xl space-y-2.5">
        <div className="flex items-center gap-2 text-[#D4AF37]">
          <HelpCircle className="w-4.5 h-4.5 shrink-0" />
          <h4 className="text-xs font-bold uppercase tracking-wider font-mono">
            Security Camera Overlap & Trigger Consolidation Analysis
          </h4>
        </div>
        <div className="text-xs text-zinc-300 leading-relaxed space-y-2">
          <p>
            Repetitive consecutive <span className="text-[#D4AF37] font-semibold">"Entrance"</span> triggers are consolidated by AIPix.ai into a single clean segment,
            preventing over-counting. The engine takes the first entry time and bonds it to the first matching exit.
          </p>
          <p className="border-l-2 border-[#A9853B]/40 pl-3 italic text-zinc-400">
            "Night shifts spanning midnight are tracked across calendar dates — the total duration is computed
            using the exact entry and exit timestamps regardless of day boundaries."
          </p>
        </div>
      </div>

      {/* Main split: Consolidated Audit Segments (grouped by date) + Raw Camera Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left — Audit segments grouped by date */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider font-mono text-zinc-400 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#A9853B]" />
              Consolidated Audit Segments
            </h3>
            <span className="text-[10px] text-emerald-400 font-mono font-medium">Bypass Overrides Enabled</span>
          </div>

          <div className="bg-[#090909] border border-zinc-850 rounded-xl p-4 space-y-4 max-h-[480px] overflow-y-auto custom-scrollbar">
            {empLogs.length === 0 ? (
              <p className="text-xs text-zinc-500 italic text-center py-10">
                No attendance segments logged for this date range.
              </p>
            ) : (
              empLogs.map(log => {
                const dayTotal = perDay[log.date] || 0;
                const dayHasNight = log.intervals.some(iv => iv.crossesMidnight);
                const isToday = log.date === effectiveTodayDate;

                return (
                  <div key={log.id}>
                    {/* Day header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          isToday
                            ? "bg-amber-950/40 text-[#D4AF37] border-[#A9853B]/30"
                            : "bg-zinc-900 text-zinc-400 border-zinc-800"
                        }`}>
                          {shortDate(log.date)}{isToday ? " — Today" : ""}
                        </span>
                        {dayHasNight && (
                          <span className="flex items-center gap-0.5 text-indigo-400 text-[9px] font-bold">
                            <Moon className="w-2.5 h-2.5" /> Night Shift
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-[#A9853B] font-bold">
                        {formatMinutesToDuration(dayTotal)}
                      </span>
                    </div>

                    {/* Intervals for this day */}
                    <div className="space-y-2 pl-2 border-l border-zinc-800">
                      {log.intervals.map((interval, i) => {
                        const duration = getIntervalDurationDateAware(
                          interval, log.date, effectiveTodayDate, simulatedTime
                        );
                        const isOpenPast = !interval.exitTime && log.date < effectiveTodayDate;

                        return (
                          <div
                            key={interval.id}
                            className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between text-xs font-mono text-zinc-300"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[9px] bg-amber-950/40 text-[#A9853B] font-bold px-1.5 py-0.5 rounded border border-[#A9853B]/20">
                                  SEG {i + 1}
                                </span>
                                {interval.crossesMidnight && (
                                  <span className="flex items-center gap-0.5 text-indigo-400 text-[9px] font-bold">
                                    <Moon className="w-2.5 h-2.5" /> +1 DAY
                                  </span>
                                )}
                                {isOpenPast && (
                                  <span className="flex items-center gap-0.5 text-amber-500 text-[9px] font-bold">
                                    <AlertCircle className="w-2.5 h-2.5" /> EST.
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 space-x-3">
                                <span>In: <strong className="text-zinc-100">{interval.enterTime}</strong></span>
                                <span>•</span>
                                <span>
                                  Out:{" "}
                                  <strong className="text-zinc-100">
                                    {interval.exitTime
                                      ? interval.crossesMidnight
                                        ? `${interval.exitTime} (next day)`
                                        : interval.exitTime
                                      : isOpenPast
                                      ? "Not recorded (est.)"
                                      : "Active..."}
                                  </strong>
                                </span>
                              </div>
                            </div>
                            <span className="bg-[#A9853B]/10 border border-[#A9853B]/20 text-[#D4AF37] px-2.5 py-1 rounded font-bold ml-3 shrink-0">
                              {formatMinutesToDuration(duration)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}

            {/* Period grand total */}
            {empLogs.length > 0 && (
              <div className="border-t border-zinc-800 pt-3 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500 uppercase tracking-wider">Grand Total</span>
                <div className="flex items-center gap-3">
                  <span className="text-[#D4AF37] font-bold text-sm">
                    {formatMinutesToDuration(cumulativeMinutes)}
                  </span>
                  <span className="text-zinc-500">
                    = <span className="text-[#A9853B] font-semibold">{empFTE}</span> FTE
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right — Raw camera face-recognition events */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider font-mono text-zinc-400 flex items-center gap-2">
              <Video className="w-4 h-4 text-[#A9853B]" />
              Raw AIPix Camera Logs ({personalDetections.length})
            </h3>
            {hasConsecutiveTriggers && (
              <span className="text-[10px] bg-amber-950/50 text-[#D4AF37] border border-[#A9853B]/20 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Repetitive Triggers
              </span>
            )}
          </div>

          <div className="bg-[#090909] border border-zinc-850 rounded-xl p-4 max-h-[480px] overflow-y-auto custom-scrollbar">
            {personalDetections.length === 0 ? (
              <p className="text-xs text-zinc-500 italic text-center py-10">
                No raw camera triggers registered for this employee.
              </p>
            ) : (
              <div className="divide-y divide-zinc-850">
                {personalDetections.map(det => (
                  <div key={det.id} className="py-2.5 flex items-center justify-between text-xs font-mono">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        {det.date && det.date !== effectiveTodayDate && (
                          <span className="text-zinc-600 text-[9px]">{shortDate(det.date)}</span>
                        )}
                        <span className="text-zinc-500">[{det.timestamp}]</span>
                        <span className={det.direction === "In" ? "text-emerald-400" : "text-rose-400 font-bold"}>
                          {det.direction === "In" ? "📥 ENTRANCE (IN)" : "📤 EXIT (OUT)"}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-zinc-400">
                        Camera: <strong className="text-zinc-300">{det.cameraName}</strong>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-500">Confidence</p>
                      <p className="text-xs text-[#D4AF37] font-bold mt-0.5">{det.confidence}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Return footer */}
      <div className="flex justify-center border-t border-zinc-850/80 pt-6 mt-4">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-xs font-mono font-bold text-zinc-350 hover:text-zinc-100 rounded-xl transition-all cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 text-zinc-400 group-hover:text-[#A9853B] transition-all" />
          <span>RETURN TO BTC OPERATIONS DASHBOARD</span>
        </button>
      </div>
    </div>
  );
}
