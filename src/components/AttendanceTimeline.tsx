/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Clock, HelpCircle, Activity, Hourglass } from "lucide-react";
import { Employee, AttendanceLog } from "../types";
import { formatMinutesToDuration, timeToMinutes, getIntervalDuration, isIntervalActiveAtTime } from "../data/mockData";

interface AttendanceTimelineProps {
  employees: Employee[];
  logs: AttendanceLog[];
  simulatedTime: string;
}

export default function AttendanceTimeline({
  employees,
  logs,
  simulatedTime,
}: AttendanceTimelineProps) {
  const [viewScope, setViewScope] = useState<"workday" | "fullday">("fullday");

  // Determine hours based on viewScope
  // workday: 08:00 to 18:00
  // fullday: 00:00 to 24:00
  const startHour = viewScope === "workday" ? 8 : 0;
  const endHour = viewScope === "workday" ? 18 : 24;
  const totalHours = endHour - startHour;
  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;
  const totalMinutesScope = endMinutes - startMinutes;

  // Generate array of hours for display
  const hourTicks: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    const formattedHour = `${String(h).padStart(2, "0")}:00`;
    hourTicks.push(formattedHour);
  }

  return (
    <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl p-6 shadow-xl" id="attendance-timeline-panel">
      {/* Title section */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5 mb-6">
        <div>
          <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2 font-serif">
            <Clock className="w-4.5 h-4.5 text-[#A9853B]" />
            Empirical Attendance Gantt (Timeline)
          </h3>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Visual interval block parsing for high-fidelity client verification (AIPix.ai engine)
          </p>
        </div>

        {/* View toggles */}
        <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-850">
          <button
            onClick={() => setViewScope("workday")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewScope === "workday"
                ? "bg-gradient-to-r from-[#D4AF37] to-[#A9853B] text-zinc-950 shadow-md border border-transparent font-bold"
                : "text-zinc-400 hover:text-zinc-100 cursor-pointer"
            }`}
          >
            Workday (08:00 - 18:00)
          </button>
          <button
            onClick={() => setViewScope("fullday")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewScope === "fullday"
                ? "bg-gradient-to-r from-[#D4AF37] to-[#A9853B] text-zinc-950 shadow-md border border-transparent font-bold"
                : "text-zinc-400 hover:text-zinc-100 cursor-pointer"
            }`}
          >
            24-Hour Scope
          </button>
        </div>
      </div>

      {/* Quick math explainer */}
      <div className="mb-6 bg-zinc-950 rounded-xl p-4 border border-zinc-850/80 flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-amber-950/40 text-[#A9853B] mt-0.5 border border-[#A9853B]/20">
          <HelpCircle className="w-4 h-4" />
        </div>
        <div className="text-xs text-zinc-300 space-y-1">
          <p className="font-bold text-zinc-100 font-mono">Camera Attendance Mathematics Parse:</p>
          <p className="leading-relaxed">
            AIPix.ai records precise milliseconds of visibility. We aggregate overlapping durations. E.g.,{" "}
            <span className="text-[#D4AF37] font-semibold font-mono">Sarah Al-Gamil</span> was tracked inside from{" "}
            <span className="text-[#D4AF37] font-semibold font-mono">14:30 - 14:50</span> (20 mins) and re-entered from{" "}
            <span className="text-[#D4AF37] font-semibold font-mono">15:30 - 16:00</span> (30 mins). Cumulative ={" "}
            <span className="text-[#D4AF37] font-bold font-mono">50 minutes</span> total daily duration!
          </p>
        </div>
      </div>

      {/* Timeline core chart */}
      <div className="overflow-x-auto">
        <div className="min-w-[640px] space-y-4">
          {/* Header Row showing hour ticks */}
          <div className="flex items-center">
            {/* Left aligned column for names */}
            <div className="w-52 pr-4 text-xs font-bold font-mono text-zinc-500 uppercase tracking-wider">
              Subject Name
            </div>

            {/* Right horizontal timeline scale */}
            <div className="flex-1 grid grid-cols-10 border-b border-zinc-800 pb-2 relative">
              {hourTicks.slice(0, -1).map((tick, index) => (
                <div
                  key={tick}
                  className="text-[10px] font-mono text-zinc-500 border-l border-zinc-800 pl-1.5 h-4 flex items-end justify-start"
                  style={{ gridColumnStart: index + 1 }}
                >
                  {tick}
                </div>
              ))}
              {/* Last tick on far right */}
              <div className="absolute right-0 bottom-2 text-[10px] text-zinc-500 font-mono">
                {hourTicks[hourTicks.length - 1]}
              </div>
            </div>
          </div>

          {/* Employee Row entries */}
          {employees.map((emp) => {
            const empLog = logs.find((l) => l.employeeId === emp.id);
            const intervals = empLog?.intervals || [];

            // Determine current presence status based on simulated time
            const isInside = intervals.some((interval) => {
              return isIntervalActiveAtTime(interval.enterTime, interval.exitTime, simulatedTime);
            });

            // Calculate active cumulative minutes
            const logTotalMinutes = intervals.reduce((accum, interval) => {
              return accum + getIntervalDuration(interval.enterTime, interval.exitTime, simulatedTime);
            }, 0);

            return (
              <div key={emp.id} className="flex items-center py-2.5 hover:bg-zinc-900/30 rounded-xl px-2 transition-all">
                {/* Employee Name & total duration bubble */}
                <div className="w-52 flex items-center gap-3 pr-4 shrink-0 min-w-0">
                  {/* Status Indicator Avatar */}
                  <div className="relative shrink-0">
                    {emp.picture ? (
                      <img
                        src={emp.picture}
                        alt={emp.name}
                        className="w-8 h-8 rounded-lg object-cover border border-zinc-800/60 shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div
                        className={`w-8 h-8 rounded-lg bg-gradient-to-br ${emp.avatarColor} text-white font-bold flex items-center justify-center text-xs font-mono shadow-sm`}
                      >
                        {emp.avatar}
                      </div>
                    )}
                    {/* Tiny blinking green/gray icon in corner */}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full border border-zinc-900 ${
                        isInside ? "bg-[#A9853B]" : "bg-zinc-600"
                      }`}
                    >
                      {isInside ? (
                        <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-amber-400 opacity-75 animate-pulse"></span>
                      ) : null}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 leading-tight">
                    <span className="font-semibold text-xs text-zinc-200 block truncate font-serif" title={emp.name}>
                      {emp.name}
                    </span>
                    <span className="text-[10px] text-zinc-450 font-mono mt-0.5 flex items-center gap-1">
                      <Hourglass className="w-2.5 h-2.5 text-zinc-500" />
                      {formatMinutesToDuration(logTotalMinutes)}
                    </span>
                  </div>
                </div>

                {/* Simulated visual timeline track */}
                <div className="flex-1 h-8 bg-zinc-950 border border-zinc-850 rounded-xl relative">
                  {/* Render background vertical lines */}
                  <div className="absolute inset-0 grid grid-cols-10 pointer-events-none rounded-xl overflow-hidden">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="border-r border-zinc-800/40 h-full" />
                    ))}
                  </div>

                  {/* Render presence interval blocks */}
                  {intervals.flatMap((interval) => {
                    const enterMins = timeToMinutes(interval.enterTime);
                    const exitMins = interval.exitTime
                      ? timeToMinutes(interval.exitTime)
                      : timeToMinutes(simulatedTime);

                    const isActive = interval.exitTime === null;

                    if (exitMins >= enterMins) {
                      return [{
                        id: interval.id,
                        enter: enterMins,
                        exit: exitMins,
                        label: `${interval.enterTime}-${interval.exitTime || "Inside"}`,
                        isActive
                      }];
                    } else {
                      // Night shift crossing midnight: split into before-midnight and after-midnight segments
                      return [
                        {
                          id: `${interval.id}-d1`,
                          enter: enterMins,
                          exit: 1440,
                          label: `${interval.enterTime}-24:00`,
                          isActive: false
                        },
                        {
                          id: `${interval.id}-d2`,
                          enter: 0,
                          exit: exitMins,
                          label: `00:00-${interval.exitTime || "Inside"}`,
                          isActive
                        }
                      ];
                    }
                  }).map((seg) => {
                    if (!seg) return null;

                    // Clamp to selected view scope bounds
                    const boundedEnter = Math.max(startMinutes, seg.enter);
                    const boundedExit = Math.min(endMinutes, seg.exit);

                    if (boundedEnter >= boundedExit) return null; // out of current view bounds

                    // Calculate percentages
                    const leftPct = ((boundedEnter - startMinutes) / totalMinutesScope) * 100;
                    const widthPct = ((boundedExit - boundedEnter) / totalMinutesScope) * 100;

                    const segmentDuration = seg.exit - seg.enter;

                    return (
                      <div
                        key={seg.id}
                        className={`group absolute top-1.5 h-5 rounded-md flex items-center justify-center text-[9px] font-mono font-bold px-1.5 transition-all shadow-3xs cursor-help ${
                          seg.isActive
                            ? "bg-gradient-to-r from-[#D4AF37] to-[#A9853B] text-zinc-950 border border-[#D4AF37]/20 text-shadow-none animate-pulse animate-duration-1000"
                            : "bg-[#A9853B]/20 text-[#D4AF37] border border-[#A9853B]/30 hover:bg-[#A9853B]/35 hover:text-[#fff]"
                        }`}
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                        }}
                        title={`${emp.name}: ${seg.label}`}
                      >
                        <span className="truncate">
                          {seg.label}
                        </span>

                        {/* Highly elegant custom hover mathematical calculation tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50 pointer-events-none">
                          <div className="bg-zinc-950 border border-[#A9853B]/70 p-3 rounded-xl text-[10px] text-zinc-200 font-mono whitespace-nowrap shadow-2xl flex flex-col gap-1.5 min-w-[180px] leading-normal border-b-2">
                            <div className="font-bold text-[#D4AF37] text-[11px] border-b border-zinc-800 pb-1.5 mb-1 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#A9853B]" />
                              {emp.name}
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-zinc-500">Segment:</span>
                              <span className="text-zinc-100 font-semibold">{seg.label}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-zinc-500">Segment Span:</span>
                              <span className="text-[#D4AF37] font-bold">
                                {formatMinutesToDuration(segmentDuration)} ({segmentDuration}m)
                              </span>
                            </div>
                            <div className="text-[9px] text-zinc-500 border-t border-zinc-900 pt-1 mt-0.5 text-center font-serif italic">
                              AIPix.ai Visual Math Parse
                            </div>
                          </div>
                          <div className="w-1.5 h-1.5 bg-zinc-950 border-r border-b border-[#A9853B]/70 rotate-45 -mt-[4px]" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
