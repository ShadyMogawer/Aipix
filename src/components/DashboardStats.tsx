/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Users, Clock, Building, TrendingUp, TrendingDown, ShieldAlert } from "lucide-react";
import { Employee, AttendanceLog, OfficeLocation } from "../types";
import { formatMinutesToDuration, timeToMinutes, getIntervalDuration, isIntervalActiveAtTime } from "../data/mockData";

interface DashboardStatsProps {
  employees: Employee[];
  logs: AttendanceLog[];
  locations: OfficeLocation[];
  activeLocationId: string;
  simulatedTime: string;
  fteHoursStandard: number;
  selectedDate?: string;
  allEmployees?: Employee[];
  allLogs?: AttendanceLog[];
}

interface SparklineProps {
  todayData: number[];
  yesterdayData: number[];
  color: string;
}

function Sparkline({ todayData, yesterdayData, color }: SparklineProps) {
  const width = 100;
  const height = 28;
  const padding = 2;

  // Filter out future zero values from today's series to only plot up to current progress
  const activeTodayData = todayData.filter((v) => v !== null && v !== undefined);
  const allVals = [...activeTodayData, ...yesterdayData];
  const max = Math.max(...allVals, 1);
  const min = Math.min(...allVals, 0);
  const range = max - min || 1;

  const getPoints = (data: number[], limitIndex?: number) => {
    const subset = limitIndex !== undefined ? data.slice(0, limitIndex + 1) : data;
    return subset.map((val, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return { x, y };
    });
  };

  // Find how many elements in todayData are active (non-zero or up to current simulated index)
  // Let's draw today's path up to the active items only
  const activeCount = todayData.reduce((acc, val, i) => {
    return val > 0 || (i === 0 && val === 0) ? i : acc;
  }, 0);

  const todayPoints = getPoints(todayData, activeCount);
  const yesterdayPoints = getPoints(yesterdayData);

  const todayPath = todayPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const yesterdayPath = yesterdayPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  const todayAreaPath = todayPoints.length > 0 
    ? `${todayPath} L ${todayPoints[todayPoints.length - 1].x.toFixed(1)} ${height} L ${todayPoints[0].x.toFixed(1)} ${height} Z`
    : "";

  const lastPoint = todayPoints[todayPoints.length - 1];

  return (
    <svg width={width} height={height} className="overflow-visible" id={`sparkline-${color.replace("#", "")}`}>
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      
      {/* Yesterday baseline line */}
      {yesterdayPath && (
        <path
          d={yesterdayPath}
          fill="none"
          stroke="#27272a" // zinc-800
          strokeWidth="1.2"
          strokeDasharray="2 2"
          className="opacity-95"
        />
      )}

      {/* Today fill area */}
      {todayAreaPath && (
        <path
          d={todayAreaPath}
          fill={`url(#grad-${color.replace("#", "")})`}
        />
      )}

      {/* Today solid line */}
      {todayPath && (
        <path
          d={todayPath}
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* End glowing indicator dot */}
      {lastPoint && (
        <>
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r="2"
            fill={color}
          />
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r="4.5"
            fill={color}
            fillOpacity="0.25"
            className="animate-ping"
          />
        </>
      )}
    </svg>
  );
}

export default function DashboardStats({
  employees,
  logs,
  locations,
  activeLocationId,
  simulatedTime,
  fteHoursStandard,
  selectedDate = "Today",
  allEmployees,
  allLogs,
}: DashboardStatsProps) {
  const systemEmployees = allEmployees || employees;
  const systemLogs = allLogs || logs;

  // 1. Calculate active employees inside right now based on simulated time using systemLogs
  const activeInsideCount = systemLogs.reduce((count, log) => {
    const isInside = log.intervals.some((interval) => {
      return isIntervalActiveAtTime(interval.enterTime, interval.exitTime, simulatedTime);
    });
    return isInside ? count + 1 : count;
  }, 0);

  // 2. Total daily cumulative duration of all employees in minutes (counting ongoing inside time)
  const totalMinutes = logs.reduce((sum, log) => {
    const logSum = log.intervals.reduce((lSum, interval) => {
      return lSum + getIntervalDuration(interval.enterTime, interval.exitTime, simulatedTime);
    }, 0);
    return sum + logSum;
  }, 0);

  // 3. Calculated FTE - assuming custom workday shift standard
  const fteMinutesStandard = fteHoursStandard * 60;
  const rawFTE = totalMinutes / fteMinutesStandard;
  const calculatedFTE = Number(rawFTE.toFixed(2));

  // 4. Location metrics
  const activeLocation = locations.find((l) => l.id === activeLocationId);
  const locationLogCount = logs.filter((l) => l.locationId === activeLocationId).length;

  // --- Dynamic Sparkline calculations ---
  const sparklineHours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);
  const simMins = timeToMinutes(simulatedTime);
  const currentPlottedIndex = Math.max(0, sparklineHours.filter(h => timeToMinutes(h) <= simMins).length - 1);

  // 1. Active Inside Sparkline
  const activeInsideTodayTrend = sparklineHours.map((hour) => {
    const hourMins = timeToMinutes(hour);
    if (hourMins > simMins) return 0;
    
    return systemLogs.reduce((count, log) => {
      const isInsideAtHour = log.intervals.some((interval) => {
        return isIntervalActiveAtTime(interval.enterTime, interval.exitTime, hour);
      });
      return isInsideAtHour ? count + 1 : count;
    }, 0);
  });

  const activeInsideYesterdayTrend = sparklineHours.map((hour, idx) => {
    const hourMins = timeToMinutes(hour);
    const baseVal = systemLogs.reduce((count, log) => {
      const isInsideAtHour = log.intervals.some((interval) => {
        const enterMins = Math.max(480, timeToMinutes(interval.enterTime) - 25);
        const exitMins = interval.exitTime 
          ? Math.min(1080, timeToMinutes(interval.exitTime) - 10)
          : 1020;
        return enterMins <= hourMins && exitMins >= hourMins;
      });
      return isInsideAtHour ? count + 1 : count;
    }, 0);
    const mockVariance = Math.round(baseVal * (0.85 + Math.sin(idx) * 0.1) + (idx === 2 || idx === 3 ? 1 : 0));
    return Math.max(0, mockVariance);
  });

  // 2. Cumulative Effort Sparkline
  const cumulativeTodayTrend = sparklineHours.map((hour) => {
    const hourMins = timeToMinutes(hour);
    if (hourMins > simMins) return 0;

    return logs.reduce((sum, log) => {
      const logSum = log.intervals.reduce((lSum, interval) => {
        return lSum + getIntervalDuration(interval.enterTime, interval.exitTime, hour);
      }, 0);
      return sum + logSum;
    }, 0);
  });

  const cumulativeYesterdayTrend = sparklineHours.map((hour, idx) => {
    const hourMins = timeToMinutes(hour);
    const baseVal = logs.reduce((sum, log) => {
      const logSum = log.intervals.reduce((lSum, interval) => {
        const enterMins = Math.max(480, timeToMinutes(interval.enterTime) - 20);
        const exitMins = interval.exitTime 
          ? Math.min(1080, timeToMinutes(interval.exitTime) - 10)
          : 1020;
        if (enterMins >= hourMins) return lSum;

        const cappedExit = Math.min(exitMins, hourMins);
        const diff = cappedExit - enterMins;
        return lSum + (diff > 0 ? diff : 0);
      }, 0);
      return sum + logSum;
    }, 0);
    const scaleFactor = 0.95 + Math.sin(idx) * 0.05;
    return Math.max(0, Math.round(baseVal * scaleFactor));
  });

  // 3. FTE Sparkline
  const fteTodayTrend = cumulativeTodayTrend.map((m) => Number((m / fteMinutesStandard).toFixed(2)));
  const fteYesterdayTrend = cumulativeYesterdayTrend.map((m) => Number((m / fteMinutesStandard).toFixed(2)));

  // 4. Site Logs Sparkline
  const siteTodayTrend = sparklineHours.map((hour) => {
    const hourMins = timeToMinutes(hour);
    if (hourMins > simMins) return 0;

    return logs
      .filter((l) => l.locationId === activeLocationId)
      .reduce((count, log) => {
        const isInsideAtHour = log.intervals.some((interval) => {
          return isIntervalActiveAtTime(interval.enterTime, interval.exitTime, hour);
        });
        return isInsideAtHour ? count + 1 : count;
      }, 0);
  });

  const siteYesterdayTrend = sparklineHours.map((hour, idx) => {
    const hourMins = timeToMinutes(hour);
    const baseVal = logs
      .filter((l) => l.locationId === activeLocationId)
      .reduce((count, log) => {
        const isInsideAtHour = log.intervals.some((interval) => {
          const enterMins = Math.max(480, timeToMinutes(interval.enterTime) - 30);
          const exitMins = interval.exitTime ? Math.min(1080, timeToMinutes(interval.exitTime) - 15) : 1020;
          return enterMins <= hourMins && exitMins >= hourMins;
        });
        return isInsideAtHour ? count + 1 : count;
      }, 0);
    const mockVariance = Math.round(baseVal * (0.9 + Math.sin(idx) * 0.1) + (idx === 2 ? 1 : 0));
    return Math.max(0, mockVariance);
  });

  // Trend percentages
  const todayVal1 = activeInsideCount;
  const yesterdayVal1 = activeInsideYesterdayTrend[currentPlottedIndex] || 0;
  const diffPercent1 = yesterdayVal1 > 0 ? ((todayVal1 - yesterdayVal1) / yesterdayVal1) * 100 : 0;

  const todayVal2 = totalMinutes;
  const yesterdayVal2 = cumulativeYesterdayTrend[currentPlottedIndex] || 0;
  const diffPercent2 = yesterdayVal2 > 0 ? ((todayVal2 - yesterdayVal2) / yesterdayVal2) * 100 : 0;

  const todayVal3 = calculatedFTE;
  const yesterdayVal3 = fteYesterdayTrend[currentPlottedIndex] || 0;
  const diffPercent3 = yesterdayVal3 > 0 ? ((todayVal3 - yesterdayVal3) / yesterdayVal3) * 100 : 0;

  const todayVal4 = locationLogCount;
  const yesterdayVal4 = siteYesterdayTrend[currentPlottedIndex] || 0;
  const diffPercent4 = yesterdayVal4 > 0 ? ((todayVal4 - yesterdayVal4) / yesterdayVal4) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="metric-cards-grid">
      {/* Card 1: Active Inside */}
      <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl p-5 shadow-xl hover:border-emerald-500/30 transition-all flex flex-col justify-between min-h-[145px]" id="stat-card-active-inside">
        <div className="flex items-start justify-between w-full">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-zinc-400 font-mono tracking-wider uppercase">
                Active Inside
              </p>
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-zinc-100 font-serif">
                {activeInsideCount}
              </span>
              <span className="text-xs text-zinc-500 font-medium font-mono">/{systemEmployees.length} live</span>
            </div>
          </div>
          <div className="p-2.5 bg-emerald-950/20 text-emerald-400 rounded-xl border border-emerald-900/30 shadow-xs">
            <Users className="w-4 h-4" />
          </div>
        </div>

        {/* Sparkline & Intraday Trend */}
        <div className="mt-4 pt-3 border-t border-zinc-900/80 flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1 text-[11px] font-semibold font-mono">
              {diffPercent1 >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span className={diffPercent1 >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {diffPercent1 >= 0 ? "+" : ""}{diffPercent1.toFixed(1)}%
              </span>
            </div>
            <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">vs yesterday</span>
          </div>
          <div className="flex-1 flex justify-end">
            <Sparkline todayData={activeInsideTodayTrend} yesterdayData={activeInsideYesterdayTrend} color="#10B981" />
          </div>
        </div>
      </div>

      {/* Card 2: Cumulative Effort & Hours */}
      <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl p-5 shadow-xl hover:border-[#A9853B]/30 transition-all flex flex-col justify-between min-h-[145px]" id="stat-card-cumulative-time">
        <div className="flex items-start justify-between w-full">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-zinc-400 font-mono tracking-wider uppercase">
              {selectedDate && selectedDate !== "Today" ? `${selectedDate} Time` : "Cumulative Time"}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 font-serif">
                {formatMinutesToDuration(totalMinutes)}
              </span>
            </div>
          </div>
          <div className="p-2.5 bg-amber-950/20 text-[#A9853B] rounded-xl border border-[#A9853B]/20 shadow-xs">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        {/* Sparkline & Intraday Trend */}
        <div className="mt-4 pt-3 border-t border-zinc-900/80 flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1 text-[11px] font-semibold font-mono">
              {diffPercent2 >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span className={diffPercent2 >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {diffPercent2 >= 0 ? "+" : ""}{diffPercent2.toFixed(1)}%
              </span>
            </div>
            <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">vs yesterday</span>
          </div>
          <div className="flex-1 flex justify-end">
            <Sparkline todayData={cumulativeTodayTrend} yesterdayData={cumulativeYesterdayTrend} color="#A9853B" />
          </div>
        </div>
      </div>

      {/* Card 3: Total FTE Metric */}
      <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl p-5 shadow-xl hover:border-[#D4AF37]/30 transition-all flex flex-col justify-between min-h-[145px]" id="stat-card-workforce-fte">
        <div className="flex items-start justify-between w-full">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-zinc-400 font-mono tracking-wider uppercase">
              Workforce FTE
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-[#D4AF37] font-serif">
                {calculatedFTE}
              </span>
              <span className="text-xs text-zinc-500 font-medium font-mono">units ({fteHoursStandard}h)</span>
            </div>
          </div>
          <div className="p-2.5 bg-amber-950/20 text-[#D4AF37] rounded-xl border border-[#A9853B]/20 shadow-xs">
            <Building className="w-4 h-4" />
          </div>
        </div>

        {/* Sparkline & Intraday Trend */}
        <div className="mt-4 pt-3 border-t border-zinc-900/80 flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1 text-[11px] font-semibold font-mono">
              {diffPercent3 >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span className={diffPercent3 >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {diffPercent3 >= 0 ? "+" : ""}{diffPercent3.toFixed(1)}%
              </span>
            </div>
            <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">vs yesterday</span>
          </div>
          <div className="flex-1 flex justify-end">
            <Sparkline todayData={fteTodayTrend} yesterdayData={fteYesterdayTrend} color="#D4AF37" />
          </div>
        </div>
      </div>

      {/* Card 4: Site-Specific Stats */}
      <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl p-5 shadow-xl hover:border-[#A9853B]/30 transition-all flex flex-col justify-between min-h-[145px]" id="stat-card-site-hub">
        <div className="flex items-start justify-between w-full">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-zinc-400 font-mono tracking-wider uppercase truncate max-w-[140px]">
              {activeLocation ? activeLocation.code : "Selected Site"}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-zinc-200 truncate max-w-[140px] inline-block font-serif">
                {locationLogCount} logs today
              </span>
            </div>
          </div>
          <div className="p-2.5 bg-amber-950/20 text-[#A9853B] rounded-xl border border-[#A9853B]/20 shadow-xs">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        {/* Sparkline & Intraday Trend */}
        <div className="mt-4 pt-3 border-t border-zinc-900/80 flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1 text-[11px] font-semibold font-mono">
              {diffPercent4 >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span className={diffPercent4 >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {diffPercent4 >= 0 ? "+" : ""}{diffPercent4.toFixed(1)}%
              </span>
            </div>
            <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">vs yesterday</span>
          </div>
          <div className="flex-1 flex justify-end">
            <Sparkline todayData={siteTodayTrend} yesterdayData={siteYesterdayTrend} color="#A9853B" />
          </div>
        </div>
      </div>
    </div>
  );
}
