/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Users, UserCheck, UserX, Calendar, ChevronDown, ChevronUp, Plus, Trash2, Clock, Search, ExternalLink, FileText } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Employee, AttendanceLog, OfficeLocation } from "../types";
import { formatMinutesToDuration, timeToMinutes, getIntervalDuration, isIntervalActiveAtTime } from "../data/mockData";

interface RosterListProps {
  employees: Employee[];
  logs: AttendanceLog[];
  locations: OfficeLocation[];
  simulatedTime: string;
  onAddInterval: (employeeId: string, locationId: string, enter: string, exit: string | null) => void;
  onDeleteInterval: (employeeId: string, intervalId: string) => void;
  fteHoursStandard?: number;
  selectedDate?: string;
  onViewStaffDetails?: (employeeId: string) => void;
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
  onViewStaffDetails,
}: RosterListProps) {
  const [expandedEmpId, setExpandedEmpId] = useState<string | null>("EMP-003"); // Expanded Sarah by default to highlight mathematical scenario!
  const [newEnter, setNewEnter] = useState<string>("09:00");
  const [newExit, setNewExit] = useState<string>("17:00");
  const [selectedLoc, setSelectedLoc] = useState<string>(locations[0]?.id || "");
  const [isCurrentlyActive, setIsCurrentlyActive] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const toggleExpand = (id: string) => {
    setExpandedEmpId(expandedEmpId === id ? null : id);
  };

  const handleManualAdd = (empId: string) => {
    onAddInterval(empId, selectedLoc, newEnter, isCurrentlyActive ? null : newExit);
    // Reset defaults
    setNewEnter("09:00");
    setNewExit("17:00");
    setIsCurrentlyActive(false);
  };

  // Filter employees by Search Query (Name, ID, Department, Role, or Branch Location)
  const filteredEmployees = employees.filter((emp) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();

    // Check basic details
    if (emp.name.toLowerCase().includes(q)) return true;
    if (emp.id.toLowerCase().includes(q)) return true;
    if (emp.department.toLowerCase().includes(q)) return true;
    if (emp.role.toLowerCase().includes(q)) return true;

    // Check branch locations associated with employee check-ins
    const empLog = logs.find((l) => l.employeeId === emp.id);
    if (empLog) {
      const loc = locations.find((l) => l.id === empLog.locationId);
      if (loc) {
        if (loc.name.toLowerCase().includes(q)) return true;
        if (loc.code.toLowerCase().includes(q)) return true;
        if (loc.city.toLowerCase().includes(q)) return true;
      }
    }
    return false;
  });

  // Calculate live cumulative metrics for the matching filtered personnel
  const filteredTotals = filteredEmployees.reduce((totals, emp) => {
    const empLog = logs.find((l) => l.employeeId === emp.id);
    const intervals = empLog?.intervals || [];

    const cumulativeMinutes = intervals.reduce((accum, interval) => {
      return accum + getIntervalDuration(interval.enterTime, interval.exitTime, simulatedTime);
    }, 0);

    const empFTE = cumulativeMinutes / (fteHoursStandard * 60);

    return {
      count: totals.count + 1,
      minutes: totals.minutes + cumulativeMinutes,
      fte: totals.fte + empFTE,
    };
  }, { count: 0, minutes: 0, fte: 0 });

  return (
    <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl p-6 shadow-xl" id="employee-roster-section">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800 mb-5">
        <div>
          <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2 font-serif">
            <Users className="w-4.5 h-4.5 text-[#A9853B]" />
            Personnel Live Durations & Database Roster
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5 font-mono">
            Automatically tracks real-time entries, cumulative times, and compliance logs
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-850">
          <Calendar className="w-4 h-4 text-[#A9853B]" />
          <span>Date: <strong className="text-zinc-200">{selectedDate || "Today"}</strong></span>
        </div>
      </div>

      {/* Dynamic Search Bar with Suggestions */}
      <div className="mb-5 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by employee, branch location (e.g. HQ-VAULT), or department (e.g. IT, Security)..."
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
                Filtered Scope Analytics ({selectedDate || "Today"})
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
              <p className="text-[10px] uppercase font-mono text-zinc-500 font-semibold">Total Cumulative Time</p>
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

      {/* Roster List Accumulator Table Layout */}
      <div className="space-y-3">
        {filteredEmployees.length === 0 ? (
          <div className="p-10 text-center text-zinc-500 border border-dashed border-zinc-800/80 rounded-xl">
            <p className="italic text-xs">No employees found matching your search criteria.</p>
            <p className="text-[10px] text-zinc-650 text-zinc-600 mt-1.5 font-mono">
              Try searching for departments like "IT", roles, branch codes, or employee names.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredEmployees.map((emp) => {
              const isExpanded = expandedEmpId === emp.id;
              const empLog = logs.find((l) => l.employeeId === emp.id);
              const intervals = empLog?.intervals || [];

              // Determine current presence status based on simulated time
              const isInside = intervals.some((interval) => {
                return isIntervalActiveAtTime(interval.enterTime, interval.exitTime, simulatedTime);
              });
              const currentLocName = isInside
                ? locations.find((l) => l.id === empLog?.locationId)?.name || "Accruing location..."
                : "Outside company perimeter";

              // Calculate cumulative today's active minutes
              const cumulativeMinutes = intervals.reduce((accum, interval) => {
                return accum + getIntervalDuration(interval.enterTime, interval.exitTime, simulatedTime);
              }, 0);

              // Calculate FTE weight contribution
              const empFTE = Number((cumulativeMinutes / (fteHoursStandard * 60)).toFixed(3));

              return (
                <motion.div
                  key={emp.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className={`border rounded-xl transition-all ${
                    isInside
                      ? "bg-amber-950/10 border-[#A9853B]/30 shadow-md shadow-amber-950/5"
                      : "bg-zinc-900/30 border-zinc-800/80 hover:bg-zinc-900/50"
                  }`}
                >
                {/* Main summary row */}
                <div
                  onClick={() => toggleExpand(emp.id)}
                  className="p-4 flex flex-wrap items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    {/* Status Indicator Avatar */}
                    <div className="relative">
                      {emp.picture ? (
                        <img
                          src={emp.picture}
                          alt={emp.name}
                          className="w-10 h-10 rounded-xl object-cover border border-zinc-800/60 shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div
                          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${emp.avatarColor} text-white font-bold flex items-center justify-center text-sm shadow-sm`}
                        >
                          {emp.avatar}
                        </div>
                      )}
                      {/* Tiny blinking green/gray icon in corner */}
                      <span
                        className={`absolute -bottom-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-zinc-900 ${
                          isInside ? "bg-[#A9853B]" : "bg-zinc-600"
                        }`}
                      >
                        {isInside ? (
                          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-amber-400 opacity-75 animate-pulse"></span>
                        ) : null}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-zinc-100 flex items-center gap-2 font-serif">
                        {emp.name}
                        <span className="text-[10px] text-zinc-500 font-mono font-medium">({emp.id})</span>
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {emp.role} • <span className="text-[#D4AF37] font-medium">{emp.department}</span>
                      </p>
                    </div>
                  </div>

                  {/* Center specs: inside/outside location status badge */}
                  <div className="hidden md:block">
                    <div className="text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-zinc-300">
                        {isInside ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-mono">Inside Secure Vault</span>
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

                  {/* Right specs: Automatically calculated times */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs font-semibold text-zinc-500 font-mono tracking-wider uppercase">
                        Cumulative Duration
                      </p>
                      <p className="text-base font-bold text-[#D4AF37] font-serif mt-0.5">
                        {formatMinutesToDuration(cumulativeMinutes)}
                      </p>
                      <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                        FTE Weight: <span className="text-[#A9853B] font-semibold">{empFTE}</span>
                      </p>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                </div>

                {/* Collapsed detailed panel: interval history, actions, & manual adjustments */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-4 border-t border-zinc-800 bg-zinc-950/80 rounded-b-xl space-y-4">
                    
                    {/* Action row for Dossier */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/60">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#A9853B]" />
                        <span className="text-xs font-serif font-bold text-zinc-200">Staff Attendance Dossier & Analytics</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onViewStaffDetails) onViewStaffDetails(emp.id);
                          }}
                          className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-[#A9853B] text-zinc-200 text-[11px] font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#A9853B]" /> View Dossier Here
                        </button>
                        <a
                          href={`/?staffId=${emp.id}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className="bg-gradient-to-r from-amber-950/50 to-amber-900/40 hover:from-amber-900/60 hover:to-amber-800/50 border border-[#A9853B]/30 hover:border-[#A9853B]/80 text-[#D4AF37] text-[11px] font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab ↗
                        </a>
                      </div>
                    </div>

                    {/* Attendance Log list */}
                    <div>
                      <h5 className="text-[11px] font-bold text-zinc-500 font-mono uppercase tracking-wider mb-3">
                        Segment Logs Recorded Today
                      </h5>

                      {intervals.length === 0 ? (
                        <p className="text-xs text-zinc-400 italic py-2">
                          No check-ins recorded by AIPix core cameras for this subject today.
                        </p>
                      ) : (
                        <div className="space-y-2 mb-4">
                          {intervals.map((interval) => (
                            <div
                              key={interval.id}
                              className="bg-zinc-900 px-3.5 py-2.5 rounded-lg border border-zinc-800/80 flex justify-between items-center text-xs text-zinc-300 font-mono shadow-3xs"
                            >
                              <div className="flex items-center gap-3">
                                <span className="p-1 px-1.5 rounded bg-amber-950/40 text-[#A9853B] text-[10px] font-bold border border-[#A9853B]/20">
                                  INTERVAL
                                </span>
                                <span>
                                  Entered: <strong className="text-zinc-100">{interval.enterTime}</strong>
                                </span>
                                <span>•</span>
                                <span>
                                  Exited:{" "}
                                  <strong className="text-zinc-100">
                                    {interval.exitTime || `Inside (In progress...)`}
                                  </strong>
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-[#D4AF37] font-bold bg-[#A9853B]/10 px-2 py-0.5 rounded text-[10px] border border-[#A9853B]/20">
                                  {formatMinutesToDuration(
                                    getIntervalDuration(interval.enterTime, interval.exitTime, simulatedTime)
                                  )}
                                </span>

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
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick insert utility form */}
                    <div className="mt-5 pt-3.5 border-t border-zinc-800">
                      <h5 className="text-[11px] font-bold text-zinc-500 font-mono uppercase tracking-wider mb-3.5">
                        Manual Camera Adjustment (AIPix Bypass Override)
                      </h5>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-zinc-900 p-4 rounded-xl border border-zinc-800 shadow-3xs">
                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-400 mb-1 font-mono">
                            BTC Hub Location
                          </label>
                          <select
                            className="w-full bg-zinc-950 text-zinc-200 border border-zinc-800 rounded-lg py-1.5 px-2.5 text-xs focus:ring-1 focus:ring-[#A9853B] focus:border-[#A9853B]"
                            value={selectedLoc}
                            onChange={(e) => setSelectedLoc(e.target.value)}
                          >
                            {locations.map((loc) => (
                              <option key={loc.id} value={loc.id} className="bg-zinc-950 text-zinc-200">
                                {loc.code}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-400 mb-1 font-mono">
                            Enter Time (HH:MM)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 14:30"
                            value={newEnter}
                            onChange={(e) => setNewEnter(e.target.value)}
                            className="w-full bg-zinc-950 text-[#eae6dd] border border-zinc-800 rounded-lg py-1.5 px-2.5 text-xs font-mono focus:ring-1 focus:ring-[#A9853B] focus:border-[#A9853B]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-400 mb-1 font-mono">
                            Exit Time (HH:MM)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="e.g. 15:00"
                              disabled={isCurrentlyActive}
                              value={newExit}
                              onChange={(e) => setNewExit(e.target.value)}
                              className={`w-full bg-zinc-950 text-[#eae6dd] border border-zinc-800 rounded-lg py-1.5 px-2.5 text-xs font-mono focus:ring-1 focus:ring-[#A9853B] focus:border-[#A9853B] ${
                                isCurrentlyActive ? "opacity-50 cursor-not-allowed" : ""
                              }`}
                            />
                          </div>
                        </div>

                        <div className="flex flex-col justify-end">
                          <button
                            onClick={() => handleManualAdd(emp.id)}
                            className="w-full bg-gradient-to-r from-[#D4AF37] to-[#A9853B] text-zinc-950 font-bold py-1.5 px-3 rounded-lg text-xs flex justify-center items-center gap-1.5 transition-all shadow-md cursor-pointer hover:brightness-110 active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5 text-zinc-950" /> Adjust Log
                          </button>
                        </div>

                        {/* Active toggler check */}
                        <div className="sm:col-span-4 mt-2">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isCurrentlyActive}
                              onChange={(e) => setIsCurrentlyActive(e.target.checked)}
                              className="bg-zinc-950 border-zinc-800 rounded text-[#A9853B] focus:ring-0 focus:border-[#A9853B]"
                            />
                            <span className="text-[10.5px] font-mono text-zinc-400 font-semibold">
                              Subject is still inside secure vault perimeter (No departure checkout timestamp)
                            </span>
                          </label>
                        </div>
                      </div>
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
