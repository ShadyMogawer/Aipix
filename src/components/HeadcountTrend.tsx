/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { TrendingUp, Users, Activity, Clock, ShieldCheck, Eye } from "lucide-react";
import { AttendanceLog, CameraDetection, OfficeLocation } from "../types";
import { timeToMinutes } from "../data/mockData";
import { motion } from "motion/react";

interface HeadcountTrendProps {
  logs: AttendanceLog[];
  detections: CameraDetection[];
  locations: OfficeLocation[];
  selectedLocationId: string;
  simulatedTime: string;
}

export default function HeadcountTrend({
  logs,
  detections,
  locations,
  selectedLocationId,
  simulatedTime,
}: HeadcountTrendProps) {
  const [viewScope, setViewScope] = useState<"selected" | "all">("selected");
  const [timeRange, setTimeRange] = useState<"working" | "full">("full");

  const activeLocation = useMemo(() => {
    return locations.find((l) => l.id === selectedLocationId);
  }, [locations, selectedLocationId]);

  // Compute hourly metrics
  const trendData = useMemo(() => {
    // Hour numbers based on selection
    const hours = timeRange === "full"
      ? Array.from({ length: 24 }, (_, i) => i) // 0 to 23
      : Array.from({ length: 15 }, (_, i) => i + 7); // 7:00 AM to 9:00 PM (15 hours)

    return hours.map((h) => {
      const hourStr = `${String(h).padStart(2, "0")}:00`;
      
      // Formatting visual label (e.g. 8 AM, 12 PM, 6 PM)
      let hourLabel = "";
      if (h === 0) hourLabel = "12 AM";
      else if (h === 12) hourLabel = "12 PM";
      else if (h > 12) hourLabel = `${h - 12} PM`;
      else hourLabel = `${h} AM`;

      // 1. Calculate Occupancy headcount at the top of this hour
      let occupancyCount = 0;
      const targetLogs = viewScope === "selected"
        ? logs.filter((log) => log.locationId === selectedLocationId)
        : logs;

      // Group by employee to prevent double-counting across multiple log entries
      const insideEmployees = new Set<string>();

      targetLogs.forEach((log) => {
        log.intervals.forEach((interval) => {
          // Skip missingIn orphan intervals — they have no enterTime and no duration
          if (interval.missingIn) return;

          const enterM = timeToMinutes(interval.enterTime);
          const hourM  = h * 60; // minutes since midnight for this hour bucket

          if (interval.exitTime) {
            const exitM = timeToMinutes(interval.exitTime);
            if (exitM >= enterM) {
              // Normal same-day interval: inside if hourM is between enter and exit
              if (hourM >= enterM && hourM <= exitM) {
                insideEmployees.add(log.employeeId);
              }
            } else {
              // Cross-midnight (night shift): inside if after enter OR before exit
              if (hourM >= enterM || hourM <= exitM) {
                insideEmployees.add(log.employeeId);
              }
            }
          } else {
            // Open interval (employee still inside, no exit recorded yet).
            // ONLY count them as inside from their enterTime onwards —
            // do NOT use the night-shift fallback here, which would wrongly
            // mark them as present at 00:00–07:59 before they even arrived.
            if (hourM >= enterM) {
              insideEmployees.add(log.employeeId);
            }
          }
        });
      });
      occupancyCount = insideEmployees.size;

      // 2. Calculate Detections (camera traffic) within the hour window (h:00 to h:59)
      const targetDetections = viewScope === "selected"
        ? detections.filter((d) => d.locationId === selectedLocationId)
        : detections;

      const detectionCount = targetDetections.filter((d) => {
        const parts = d.timestamp.split(":");
        if (parts.length === 0) return false;
        const detHour = parseInt(parts[0], 10);
        return detHour === h;
      }).length;

      return {
        hourStr,
        hourLabel,
        occupancy: occupancyCount,
        cameraActivity: detectionCount,
      };
    });
  }, [logs, detections, selectedLocationId, simulatedTime, viewScope, timeRange]);

  // Peak metrics for summary
  const statsSummary = useMemo(() => {
    let peakOccupancy = 0;
    let peakHour = "N/A";
    let totalDetections = 0;

    trendData.forEach((d) => {
      if (d.occupancy > peakOccupancy) {
        peakOccupancy = d.occupancy;
        peakHour = d.hourLabel;
      }
      totalDetections += d.cameraActivity;
    });

    return {
      peakOccupancy,
      peakHour,
      totalDetections,
    };
  }, [trendData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-[#121212] border border-zinc-800/80 rounded-2xl p-5 shadow-xl space-y-5"
      id="headcount-trend-card"
    >
      {/* Header controls row */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-950/20 rounded-xl border border-[#A9853B]/20 text-[#A9853B]">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-serif font-bold text-zinc-100 flex flex-wrap items-center gap-2">
              Facility Occupancy & Activity Trend
              <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono font-medium px-2 py-0.5 rounded-full uppercase">
                Hourly Parse
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] bg-amber-950/10 border border-[#A9853B]/30 text-[#D4AF37] px-2 py-0.5 rounded-full font-mono animate-pulse">
                <Eye className="w-3 h-3" />
                Hover points for exact stats
              </span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Comparative analysis of active headcount occupancy and raw AIPix sensor scan volume
            </p>
          </div>
        </div>

        {/* Chart View and Time Range Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Facility Selector */}
          <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-850">
            <button
              onClick={() => setViewScope("selected")}
              className={`px-3 py-1 rounded-lg text-xs font-medium font-mono transition-all ${
                viewScope === "selected"
                  ? "bg-gradient-to-r from-[#D4AF37] to-[#A9853B] text-zinc-950 font-bold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {activeLocation ? activeLocation.name : "Active Facility"}
            </button>
            <button
              onClick={() => setViewScope("all")}
              className={`px-3 py-1 rounded-lg text-xs font-medium font-mono transition-all ${
                viewScope === "all"
                  ? "bg-gradient-to-r from-[#D4AF37] to-[#A9853B] text-zinc-950 font-bold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              All Facilities
            </button>
          </div>

          {/* Time range Selector */}
          <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-850">
            <button
              onClick={() => setTimeRange("working")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium font-mono transition-all ${
                timeRange === "working"
                  ? "bg-zinc-850 text-zinc-100 border border-zinc-700/50"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              title="7:00 AM - 9:00 PM"
            >
              Business Day
            </button>
            <button
              onClick={() => setTimeRange("full")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium font-mono transition-all ${
                timeRange === "full"
                  ? "bg-zinc-850 text-zinc-100 border border-zinc-700/50"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              title="00:00 - 23:00 Full Cycle"
            >
              24h Range
            </button>
          </div>
        </div>
      </div>

      {/* Mini-Analytical Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-zinc-900/30 p-4 rounded-xl border border-zinc-850/60">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#A9853B]/10 text-[#D4AF37] border border-[#A9853B]/20">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Peak Occupancy</div>
            <div className="text-base font-serif font-bold text-zinc-200 flex items-baseline gap-1.5 mt-0.5">
              {statsSummary.peakOccupancy} <span className="text-xs text-zinc-400 font-sans font-normal">employees</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-zinc-800/80 sm:pl-4">
          <div className="p-2 rounded-lg bg-amber-950/10 text-amber-500 border border-amber-900/20">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Peak Hour Window</div>
            <div className="text-base font-bold text-zinc-200 mt-0.5">
              {statsSummary.peakHour}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-zinc-800/80 sm:pl-4">
          <div className="p-2 rounded-lg bg-emerald-950/10 text-emerald-400 border border-emerald-900/20">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Total Scans Parsed</div>
            <div className="text-base font-serif font-bold text-zinc-200 flex items-baseline gap-1.5 mt-0.5">
              {statsSummary.totalDetections} <span className="text-xs text-zinc-400 font-sans font-normal">events</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recharts Area Container */}
      <div className="h-[280px] w-full" id="trend-chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={trendData}
            margin={{ top: 10, right: 15, left: -25, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#A9853B" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#A9853B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1c1c1c" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="hourLabel"
              stroke="#52525b"
              fontSize={10}
              fontFamily="monospace"
              tickLine={false}
              axisLine={{ stroke: "#27272a" }}
              dy={10}
            />
            <YAxis
              stroke="#52525b"
              fontSize={10}
              fontFamily="monospace"
              tickLine={false}
              axisLine={{ stroke: "#27272a" }}
              allowDecimals={false}
            />
             <Tooltip
              cursor={{ stroke: "#A9853B", strokeWidth: 1.2, strokeDasharray: "4 4" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-zinc-950 border border-[#A9853B]/70 p-3 rounded-xl shadow-2xl text-[11px] font-mono leading-relaxed space-y-1.5 min-w-[200px] border-b-2">
                      <div className="text-[#D4AF37] font-bold border-b border-zinc-800 pb-1.5 mb-1.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#A9853B]" />
                        <span>Hour: {data.hourLabel} ({data.hourStr})</span>
                      </div>
                      
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-zinc-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                          Active Headcount:
                        </span>
                        <span className="text-zinc-100 font-bold text-xs">{data.occupancy} inside</span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-zinc-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#A9853B] bg-opacity-60" />
                          Camera Traffic:
                        </span>
                        <span className="text-[#D4AF37] font-bold text-xs">{data.cameraActivity} scans</span>
                      </div>

                      <div className="text-[9px] text-zinc-500 border-t border-zinc-900 pt-1.5 text-center font-serif italic">
                        {viewScope === "selected" ? "Single Facility Focus" : "Combined Operations"}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{
                fontSize: "11px",
                fontFamily: "monospace",
                color: "#a1a1aa",
                paddingLeft: "20px",
              }}
            />
            <Area
              name="Active Occupancy (Headcount)"
              type="monotone"
              dataKey="occupancy"
              stroke="#D4AF37"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorOccupancy)"
              activeDot={{ r: 6, stroke: "#121212", strokeWidth: 2, fill: "#D4AF37" }}
            />
            <Area
              name="Camera Traffic (Scan Events)"
              type="monotone"
              dataKey="cameraActivity"
              stroke="#A9853B"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorActivity)"
              activeDot={{ r: 4, stroke: "#121212", strokeWidth: 1, fill: "#A9853B" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Under-chart compliance advisory footer */}
      <div className="flex items-center gap-2.5 p-3.5 bg-zinc-900/40 border border-zinc-850/50 text-zinc-400 rounded-xl text-[10px] leading-relaxed">
        <ShieldCheck className="w-4 h-4 text-[#A9853B] shrink-0" />
        <div>
          <span className="text-zinc-300 font-semibold uppercase font-mono">Operations Audit Integrity:</span> This graph leverages camera computer vision matrices inside the Bullion Trading Center to log and visualize hourly occupancy. Ensure that all camera hardware is active and synchronized to maintain high confidence intervals.
        </div>
      </div>
    </motion.div>
  );
}
