/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { ArrowLeft, UserCheck, UserX, Clock, Calendar, ShieldCheck, Video, HelpCircle, AlertTriangle } from "lucide-react";
import { Employee, AttendanceLog, OfficeLocation, CameraDetection } from "../types";
import { formatMinutesToDuration, timeToMinutes, getIntervalDuration, isIntervalActiveAtTime } from "../data/mockData";

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
}: StaffDossierProps) {
  // Find the target employee
  const emp = employees.find((e) => e.id === employeeId);

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

  // Find attendance logs
  const empLog = logs.find((l) => l.employeeId === emp.id);
  const intervals = empLog?.intervals || [];

  // Determine current presence status based on simulated time
  const isInside = intervals.some((interval) => {
    return isIntervalActiveAtTime(interval.enterTime, interval.exitTime, simulatedTime);
  });
  const currentLoc = isInside
    ? locations.find((l) => l.id === empLog?.locationId)
    : null;

  // Calculate cumulative today's active minutes
  const cumulativeMinutes = intervals.reduce((accum, interval) => {
    return accum + getIntervalDuration(interval.enterTime, interval.exitTime, simulatedTime);
  }, 0);

  // Calculate FTE weight contribution
  const empFTE = Number((cumulativeMinutes / (fteHoursStandard * 60)).toFixed(3));

  // Get raw face-recognition detections for this employee
  // Sort them with latest first
  const personalDetections = detections
    .filter((d) => d.employeeId === emp.id)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // Earliest check-in and latest check-out
  const earliestCheckIn = intervals.length > 0 ? intervals[0].enterTime : "N/A";
  const latestCheckOut = intervals.length > 0 
    ? (intervals[intervals.length - 1].exitTime || "Still Inside") 
    : "N/A";

  // Check if there are successive entries without exit (overlaps)
  const totalInTriggers = personalDetections.filter(d => d.direction === "In").length;
  const totalOutTriggers = personalDetections.filter(d => d.direction === "Out").length;
  const hasConsecutiveTriggers = totalInTriggers > totalOutTriggers + 1 || totalInTriggers > 1 && totalOutTriggers === 0;

  return (
    <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden animate-in fade-in zoom-in duration-200">
      {/* Decorative radial background glow */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#A9853B]/5 rounded-full blur-[80px] pointer-events-none"></div>

      {/* Breadcrumb row & Controls */}
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
          <span>Active Date: <strong className="text-zinc-100">{selectedDate}</strong></span>
        </div>
      </div>

      {/* Main Employee Profile Banner Card */}
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
              <div
                className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${emp.avatarColor} text-white font-extrabold flex items-center justify-center text-xl shadow-md`}
              >
                {emp.avatar}
              </div>
            )}
            <span
              className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-zinc-950 ${
                isInside ? "bg-[#A9853B]" : "bg-zinc-600"
              }`}
            >
              {isInside && (
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-amber-400 opacity-75"></span>
              )}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-serif tracking-tight text-zinc-100">
                {emp.name}
              </h2>
              <span className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                {emp.id}
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              {emp.role} • <strong className="text-[#D4AF37]">{emp.department}</strong>
            </p>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono mt-1.5">
              <span>Security Access Level:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Class-A Vault Authorized
              </span>
            </div>
          </div>
        </div>

        {/* Status indicator display */}
        <div className="bg-[#121212] px-5 py-3 rounded-xl border border-zinc-800 text-right min-w-[200px]">
          <p className="text-[10px] font-mono uppercase text-zinc-500 font-semibold">Current State</p>
          <div className="flex items-center justify-end gap-1.5 mt-1">
            {isInside ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-sm font-bold text-emerald-400 font-mono">INSIDE SECURE VAULT</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-zinc-600"></span>
                <span className="text-sm font-bold text-zinc-400 font-mono">OFFSITE / DISPATCHED</span>
              </>
            )}
          </div>
          <p className="text-[10.5px] text-zinc-400 mt-1 font-mono">
            {isInside ? (currentLoc?.name || "BTC HQ Main Gold Vault") : "Outside security parameter"}
          </p>
        </div>
      </div>

      {/* Statistics Block Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/60 border border-zinc-850 p-4.5 rounded-xl space-y-2">
          <p className="text-[10px] uppercase font-mono text-zinc-500 font-semibold tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#A9853B]" /> Cumulative Duration
          </p>
          <p className="text-2xl font-bold text-[#D4AF37] font-serif">
            {formatMinutesToDuration(cumulativeMinutes)}
          </p>
          <p className="text-[10px] text-zinc-500 font-mono">Accrued from scan triggers</p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-850 p-4.5 rounded-xl space-y-2">
          <p className="text-[10px] uppercase font-mono text-zinc-500 font-semibold tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#A9853B]" /> Compliance Yield
          </p>
          <p className="text-2xl font-bold text-zinc-200 font-serif">
            {empFTE} <span className="text-xs text-zinc-500 font-mono font-normal">FTE</span>
          </p>
          <p className="text-[10px] text-zinc-500 font-mono">Based on {fteHoursStandard}hr standard shift</p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-850 p-4.5 rounded-xl space-y-2">
          <p className="text-[10px] uppercase font-mono text-zinc-500 font-semibold tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#A9853B]" /> Earliest Entrance
          </p>
          <p className="text-2xl font-bold text-zinc-200 font-mono">
            {earliestCheckIn}
          </p>
          <p className="text-[10px] text-zinc-500 font-mono">First scan of the day</p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-850 p-4.5 rounded-xl space-y-2">
          <p className="text-[10px] uppercase font-mono text-zinc-500 font-semibold tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#A9853B]" /> Latest Departure
          </p>
          <p className="text-2xl font-bold text-zinc-200 font-mono">
            {latestCheckOut}
          </p>
          <p className="text-[10px] text-zinc-500 font-mono">Last checkout timestamp</p>
        </div>
      </div>

      {/* Technical explainer block for overlap time (Especially for Mohamed El Saied) */}
      <div className="bg-amber-950/15 border border-[#A9853B]/20 p-4.5 rounded-2xl space-y-2.5">
        <div className="flex items-center gap-2 text-[#D4AF37]">
          <HelpCircle className="w-4.5 h-4.5 shrink-0" />
          <h4 className="text-xs font-bold uppercase tracking-wider font-mono">
            Security Camera Overlap & Trigger Consolidation Analysis
          </h4>
        </div>
        <div className="text-xs text-zinc-350 text-zinc-300 leading-relaxed space-y-2">
          <p>
            An audit of the raw logs shows that some employees (especially <strong className="text-zinc-100">Mohamed El Saied</strong>) generate 
            multiple consecutive <span className="text-[#D4AF37] font-semibold">"Entrance"</span> check-in triggers on the face recognition scanners before passing an Exit gate. 
            For example, Mohamed was registered at <strong>14:39</strong>, <strong>14:48</strong>, <strong>14:49</strong>, <strong>14:52</strong>, and <strong>14:56</strong> on the Entrance camera before finally checking out at <strong>14:57</strong>.
          </p>
          <p className="border-l-2 border-[#A9853B]/40 pl-3 italic text-zinc-400">
            "These repetitive entry triggers occur naturally when an operator remains in front of the camera field, undergoes several automatic safety scans, or steps momentarily out of range and returns immediately."
          </p>
          <p>
            To prevent over-counting and false active hours, the <strong className="text-[#D4AF37]">AIPix.ai core engine</strong> runs a 
            consolidation algorithm. It takes the first initial "Entrance" time (e.g. 14:39) and bonds it to the first actual "Exit" checkout time (e.g. 14:57), 
            merging all overlapping intermediate scans into a single, clean segment of <strong className="text-[#D4AF37]">18 minutes</strong>. 
            This represents the precise, compliant duration of security vault exposure.
          </p>
        </div>
      </div>

      {/* Split layout: Intervals vs Camera logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Merged segments (Timeline) - Width: 6 columns */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider font-mono text-zinc-400 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#A9853B]" />
              Consolidated Audit Segments ({intervals.length})
            </h3>
            <span className="text-[10px] text-emerald-400 font-mono font-medium">Bypass Overrides Enabled</span>
          </div>

          <div className="bg-[#090909] border border-zinc-850 rounded-xl p-4 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
            {intervals.length === 0 ? (
              <p className="text-xs text-zinc-500 italic text-center py-10">No attendance segments logged on this date range.</p>
            ) : (
              intervals.map((interval, i) => {
                const duration = getIntervalDuration(interval.enterTime, interval.exitTime, simulatedTime);

                return (
                  <div 
                    key={interval.id}
                    className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between text-xs font-mono text-zinc-300"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] bg-amber-950/40 text-[#A9853B] font-bold px-1.5 py-0.5 rounded border border-[#A9853B]/20">
                          SEGMENT {i + 1}
                        </span>
                        <span className="text-zinc-550 text-zinc-500">[{interval.id.substring(0, 8)}]</span>
                      </div>
                      <div className="mt-1.5 space-x-3">
                        <span>In: <strong className="text-zinc-100">{interval.enterTime}</strong></span>
                        <span>•</span>
                        <span>Out: <strong className="text-zinc-100">{interval.exitTime || "Active..."}</strong></span>
                      </div>
                    </div>

                    <span className="bg-[#A9853B]/10 border border-[#A9853B]/20 text-[#D4AF37] px-2.5 py-1 rounded font-bold">
                      {formatMinutesToDuration(duration)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Raw Camera Face recognition events - Width: 6 columns */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider font-mono text-zinc-400 flex items-center gap-2">
              <Video className="w-4 h-4 text-[#A9853B]" />
              Raw AIPix Camera Logs ({personalDetections.length})
            </h3>
            {hasConsecutiveTriggers && (
              <span className="text-[10px] bg-amber-950/50 text-[#D4AF37] border border-[#A9853B]/20 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Repetitive Triggers Detected
              </span>
            )}
          </div>

          <div className="bg-[#090909] border border-zinc-850 rounded-xl p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
            {personalDetections.length === 0 ? (
              <p className="text-xs text-zinc-500 italic text-center py-10">No raw camera triggers registered for this employee.</p>
            ) : (
              <div className="divide-y divide-zinc-850">
                {personalDetections.map((det) => (
                  <div key={det.id} className="py-2.5 flex items-center justify-between text-xs font-mono">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
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
                      <p className="text-[10px] text-zinc-500">Confidence Match</p>
                      <p className="text-xs text-[#D4AF37] font-bold mt-0.5">{det.confidence}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom return navigation footer */}
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
