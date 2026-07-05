/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import { 
  Building, 
  MapPin, 
  Users, 
  Award, 
  TrendingUp, 
  Monitor,
  Wifi,
  WifiOff,
  Cpu,
  Thermometer,
  RefreshCw,
  Power,
  Terminal,
  X,
  AlertCircle,
  Play,
  CheckCircle2,
  Eye,
  ShieldAlert,
  ArrowLeft,
  Flame
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { OfficeLocation, AttendanceLog, Employee, CameraDetection } from "../types";
import { formatMinutesToDuration, timeToMinutes } from "../data/mockData";

interface LocationSummaryProps {
  locations: OfficeLocation[];
  logs: AttendanceLog[];
  employees: Employee[];
  allEmployees?: Employee[];
  selectedLocationId: string;
  onLocationSelect: (id: string) => void;
  simulatedTime: string;
  detections: CameraDetection[];
  onSimulateCameraScan?: (cameraName: string) => void;
}

export default function LocationSummary({
  locations,
  logs,
  employees,
  allEmployees,
  selectedLocationId,
  onLocationSelect,
  simulatedTime,
  detections,
  onSimulateCameraScan,
}: LocationSummaryProps) {
  const systemEmployees = allEmployees || employees;

  // Find currently active location data
  const activeLocation = useMemo(() => {
    return locations.find((loc) => loc.id === selectedLocationId) || locations[0];
  }, [locations, selectedLocationId]);

  // Cameras for the active location
  const SITE_CAMERAS: Record<string, string[]> = {
    "LOC-001": [
      "Vault Main Entry CAM-02",
      "Vault Corridor CAM-04",
      "Vault Outer Gate CAM-01",
      "Vault Safe Deposit CAM-03"
    ],
    "LOC-002": [
      "Trading Floor Entrance CAM-01",
      "Executive Suite CAM-02",
      "Lobby Desk CAM-03",
      "Server Room Main CAM-04"
    ],
    "LOC-003": [
      "Logistics Gate B Departure CAM-01",
      "Loading Dock A Entry CAM-02",
      "Logistics Sort Area CAM-03",
      "Dispatch Corridor CAM-04"
    ]
  };

  // Local states for advanced camera monitoring
  const [offlineCameras, setOfflineCameras] = useState<string[]>([]);
  const [cameraStreamModes, setCameraStreamModes] = useState<Record<string, "analytics" | "thermal" | "night" | "raw">>({});
  const [inspectedCamera, setInspectedCamera] = useState<string | null>(null);
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
  const [streamTicks, setStreamTicks] = useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setStreamTicks((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Discover and list cameras: ONLY return those returned or present in the AIPix API event logs (detections) for the selected location!
  const camerasForLocation = useMemo(() => {
    // Scan current detections on the system to see if there are cameras active
    const discovered = Array.from(
      new Set(
        detections
          .filter((det) => det.locationId === selectedLocationId)
          .map((det) => det.cameraName)
      )
    );
    
    return discovered;
  }, [selectedLocationId, detections]);

  // Comprehensive Camera Status checker
  const checkCameraStatus = (cameraName: string) => {
    if (offlineCameras.some(c => c.toLowerCase() === cameraName.toLowerCase())) {
      return {
        state: "offline" as const,
        text: "OFFLINE / DISCONNECTED",
        colorClass: "bg-rose-500",
        textColorClass: "text-rose-400",
        isOnline: false,
      };
    }
    
    const simMins = timeToMinutes(simulatedTime);
    
    // Find detections matching this camera
    const cameraDets = detections.filter((det) => {
      if (det.locationId !== selectedLocationId) return false;
      const detCam = det.cameraName.toLowerCase();
      const targetCam = cameraName.toLowerCase();
      return detCam.includes(targetCam) || targetCam.includes(detCam);
    });
    
    if (cameraDets.length === 0) {
      return {
        state: "standby" as const,
        text: "ONLINE - STANDBY",
        colorClass: "bg-emerald-500",
        textColorClass: "text-emerald-400",
        isOnline: true,
      };
    }
    
    // Sort to get latest detection
    const sorted = [...cameraDets].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const latestDet = sorted[0];
    const parts = latestDet.timestamp.split(":");
    const detMins = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    const diff = simMins - detMins;
    
    // If a scan occurred within the last 30 minutes of simulated time, show as transmitting!
    if (diff >= 0 && diff <= 30) {
      return {
        state: "transmitting" as const,
        text: "ONLINE - TRANSMITTING",
        colorClass: "bg-amber-500",
        textColorClass: "text-amber-400",
        isOnline: true,
      };
    }
    
    return {
      state: "standby" as const,
      text: "ONLINE - STANDBY",
      colorClass: "bg-emerald-500",
      textColorClass: "text-emerald-400",
      isOnline: true,
    };
  };

  // Run mock diagnosis script
  const handleRunDiagnostics = (cameraName: string) => {
    setIsDiagnosticRunning(true);
    setDiagnosticLogs([`> Initiating diagnostic handshake with ${cameraName}...`]);
    
    const steps = [
      `> Connecting to edge IP core sensor... [OK]`,
      `> Verifying CMOS 4K optical sensor module... [PASS: 100% Signal]`,
      `> Calibrating localized AIPix edge-AI model... [PASS: 6.8ms inference latency]`,
      `> Measuring PoE+ power intake (12.4W / Temp: 42°C)... [PASS]`,
      `> Checking 10G fiber route sync & jitter... [PASS: Loss 0.00%]`,
      `> ALL TELEMETRY CORRELATED - HARDWARE INTEGRITY 100% COMPLIANT`
    ];
    
    steps.forEach((step, index) => {
      setTimeout(() => {
        setDiagnosticLogs((prev) => [...prev, step]);
        if (index === steps.length - 1) {
          setIsDiagnosticRunning(false);
        }
      }, (index + 1) * 350);
    });
  };

  // Get the most recent detection timestamp for this camera
  const getCameraLastActivity = (cameraName: string) => {
    const sorted = [...detections]
      .filter((det) => {
        if (det.locationId !== selectedLocationId) return false;
        const detCam = det.cameraName.toLowerCase();
        const targetCam = cameraName.toLowerCase();
        return detCam.includes(targetCam) || targetCam.includes(detCam);
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    if (sorted.length > 0) {
      const parts = sorted[0].timestamp.split(":");
      return parts.slice(0, 2).join(":");
    }
    return "Never";
  };

  // Compute stats per location
  const locationStats = useMemo(() => {
    return locations.map((loc) => {
      const locLogs = logs.filter((log) => log.locationId === loc.id);

      // Compute total minutes inside for this site
      const totalMins = locLogs.reduce((sum, log) => {
        return (
          sum +
          log.intervals.reduce((intSum, interval) => {
            const enter = timeToMinutes(interval.enterTime);
            const exit = interval.exitTime
              ? timeToMinutes(interval.exitTime)
              : timeToMinutes(simulatedTime);
            const diff = exit - enter;
            return intSum + (diff > 0 ? diff : 0);
          }, 0)
        );
      }, 0);

      // Active personnel there right now based on simulated time
      const currentActiveCount = locLogs.reduce((count, log) => {
        const simMins = timeToMinutes(simulatedTime);
        const isInside = log.intervals.some((interval) => {
          const enterMins = timeToMinutes(interval.enterTime);
          if (enterMins > simMins) return false;
          if (interval.exitTime === null) return true;
          return timeToMinutes(interval.exitTime) > simMins;
        });
        return isInside ? count + 1 : count;
      }, 0);

      // Compute FTE contribution of this location (standard 8 hour day)
      const locFTE = Number((totalMins / 480).toFixed(2));

      return {
        id: loc.id,
        name: loc.name,
        code: loc.code,
        city: loc.city,
        totalMinutes: totalMins,
        activeCount: currentActiveCount,
        fte: locFTE,
      };
    });
  }, [locations, logs, simulatedTime]);

  const activeStats = useMemo(() => {
    return locationStats.find((s) => s.id === selectedLocationId) || locationStats[0];
  }, [locationStats, selectedLocationId]);

  // Generate dynamic hourly headcount for Recharts visualization
  const hourlyHeadcountData = useMemo(() => {
    const hours = [
      "08:00",
      "09:00",
      "10:00",
      "11:00",
      "12:00",
      "13:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
      "18:00",
    ];

    return hours.map((hourStr) => {
      const targetMins = timeToMinutes(hourStr);
      const locLogs = logs.filter((log) => log.locationId === selectedLocationId);

      // Count many employees were inside during this general hour block
      // Active if there's any interval where enterTime <= hourStr and exitTime >= hourStr (or exitTime === null)
      const occupantsCount = locLogs.reduce((count, log) => {
        const isPresentAtHour = log.intervals.some((interval) => {
          const enter = timeToMinutes(interval.enterTime);
          const exit = interval.exitTime
            ? timeToMinutes(interval.exitTime)
            : timeToMinutes(simulatedTime);

          // If the interval envelopes or touches the hour
          return enter <= targetMins && exit >= targetMins;
        });

        return isPresentAtHour ? count + 1 : count;
      }, 0);

      return {
        hour: hourStr,
        headcount: occupantsCount,
      };
    });
  }, [logs, selectedLocationId, simulatedTime]);

  // Determine the trend or peak occupancy time
  const peakOccupancy = useMemo(() => {
    if (hourlyHeadcountData.length === 0) return { hour: "N/A", count: 0 };
    let max = -1;
    let peakHour = "N/A";
    hourlyHeadcountData.forEach((d) => {
      if (d.headcount > max) {
        max = d.headcount;
        peakHour = d.hour;
      }
    });
    return { hour: peakHour, count: max };
  }, [hourlyHeadcountData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="location-analytics-section">
      <style>{`
        @keyframes borderPulse {
          0% {
            border-color: rgba(249, 115, 22, 0.4);
            box-shadow: 0 0 6px rgba(249, 115, 22, 0.2);
          }
          50% {
            border-color: rgba(239, 68, 68, 0.95);
            box-shadow: 0 0 16px rgba(239, 68, 68, 0.55);
          }
          100% {
            border-color: rgba(249, 115, 22, 0.4);
            box-shadow: 0 0 6px rgba(249, 115, 22, 0.2);
          }
        }
        .animate-border-pulse {
          animation: borderPulse 1.8s infinite ease-in-out;
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .animate-scanline {
          animation: scanline 4s linear infinite;
        }
        @keyframes staticNoise {
          0%, 100% { opacity: 0.04; }
          50% { opacity: 0.12; }
        }
        .animate-static-noise {
          animation: staticNoise 0.15s steps(4) infinite;
        }
        @keyframes trackingBracket {
          0%, 100% { transform: scale(1.0); opacity: 0.85; }
          50% { transform: scale(1.03); opacity: 1; }
        }
        .animate-tracking-bracket {
          animation: trackingBracket 1.5s infinite ease-in-out;
        }
        @keyframes thermalPulse {
          0%, 100% { transform: scale(0.9) translate(-50%, -50%); opacity: 0.4; }
          50% { transform: scale(1.1) translate(-45%, -45%); opacity: 0.75; }
        }
        .animate-thermal-pulse {
          animation: thermalPulse 3s infinite ease-in-out;
        }
      `}</style>
      {/* Site Selector Card Deck (1 Column width on desktop) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Building className="w-4 h-4 text-[#A9853B]" />
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider font-mono">
            BTC Secure Vault Sites
          </h3>
        </div>

        {locationStats.map((stat) => {
          const isSelected = stat.id === selectedLocationId;
          const fullLocation = locations.find((l) => l.id === stat.id)!;
          const isOverCapacity = stat.activeCount > fullLocation.targetFewerThanMaxCapacity;

          return (
            <button
              key={stat.id}
              onClick={() => onLocationSelect(stat.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                isOverCapacity
                  ? "bg-zinc-900/95 border-orange-500/80 shadow-lg animate-border-pulse"
                  : isSelected
                  ? "bg-zinc-900 border-[#A9853B]/50 shadow-lg shadow-[#A9853B]/5 hover:border-[#A9853B]"
                  : "bg-[#121212] border-zinc-800 hover:bg-zinc-900/50 hover:border-zinc-700"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-sm text-zinc-100 flex items-center gap-1.5 font-serif">
                    {stat.name}
                  </h4>
                  <p className="text-xs text-zinc-400 font-mono flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-[#A9853B]" /> {stat.city}
                  </p>
                  {isOverCapacity && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-orange-400 font-mono mt-1.5 bg-orange-950/40 border border-orange-500/30 px-2 py-0.5 rounded-md animate-pulse">
                      <AlertCircle className="w-3 h-3 text-orange-400 shrink-0" />
                      CAPACITY EXCEEDED
                    </span>
                  )}
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                    isOverCapacity
                      ? "bg-orange-950/50 text-orange-400 border border-orange-500/50 animate-pulse"
                      : isSelected
                      ? "bg-amber-950/40 text-[#A9853B] border border-[#A9853B]/30"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                  }`}
                >
                  {stat.code}
                </span>
              </div>

              {/* Mini stats inline bar */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-zinc-800/80">
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase font-mono">Headcount</p>
                  <p className={`text-xs font-bold mt-0.5 flex items-center gap-1 ${isOverCapacity ? 'text-orange-400' : 'text-zinc-200'}`}>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOverCapacity 
                          ? 'bg-orange-500 animate-pulse' 
                          : stat.activeCount > 0 
                          ? 'bg-emerald-400 animate-pulse' 
                          : 'bg-zinc-600'
                      }`}
                      style={{ 
                        backgroundColor: isOverCapacity 
                          ? '#f97316' 
                          : stat.activeCount > 0 
                          ? '#10b981' 
                          : '#4b5563' 
                      }}
                    />
                    {stat.activeCount}
                    <span className="text-[9px] text-zinc-500 font-normal">/{systemEmployees.length}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase font-mono">Site Hours</p>
                  <p className="text-xs font-bold text-zinc-200 mt-0.5">
                    {formatMinutesToDuration(stat.totalMinutes)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase font-mono">Location FTE</p>
                  <p className="text-xs font-bold text-[#D4AF37] mt-0.5">
                    {stat.fte} <span className="text-[9px] text-zinc-500">unit</span>
                  </p>
                </div>
              </div>

              {/* Camera indicators */}
              <div className="flex justify-between items-center mt-3 text-[9px] text-zinc-500 font-mono">
                {(() => {
                  const actualCamsCount = Array.from(
                    new Set(
                      detections
                        .filter((det) => det.locationId === stat.id)
                        .map((det) => det.cameraName)
                    )
                  ).length;
                  return (
                    <span>⚡ AIPix Cameras: {actualCamsCount} {actualCamsCount === 1 ? 'unit' : 'units'}</span>
                  );
                })()}
                <span className="flex items-center gap-1">
                  <Monitor className="w-2.5 h-2.5 text-[#A9853B]" /> Feed Online
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Hourly occupancy chart (2 Column width) */}
      <div className="lg:col-span-2 bg-[#121212] border border-zinc-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800 mb-5">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2 font-serif">
                <Users className="w-4 h-4 text-[#A9853B]" />
                Hourly Headcount Distribution & Traffic Peaks
              </h3>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Current site analysis for {activeLocation.name}
              </p>
            </div>

            <div className="flex items-center gap-2 font-mono bg-zinc-900 p-2 rounded-xl border border-zinc-800">
              <Award className="w-4 h-4 text-[#D4AF37]" />
              <div className="text-[11px] text-zinc-300">
                Peak Hours: <span className="text-[#D4AF37] font-bold">{peakOccupancy.hour}</span> ({peakOccupancy.count} personnel)
              </div>
            </div>
          </div>

          {/* Area headcount chart */}
          <div className="h-60 w-full font-mono text-[11px] mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={hourlyHeadcountData}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorHeadcount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A9853B" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#A9853B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(169, 133, 59, 0.06)" />
                <XAxis dataKey="hour" stroke="#71717a" />
                <YAxis stroke="#71717a" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#121212",
                    borderColor: "#A9853B",
                    borderRadius: "12px",
                    color: "#eae6dd",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.4)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="headcount"
                  name="Personnel Inside"
                  stroke="#A9853B"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorHeadcount)"
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* AIPix Camera Network Status */}
          <div className="mt-5 pt-5 border-t border-zinc-850 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider font-mono flex items-center gap-1.5 text-zinc-300">
                <Monitor className="w-3.5 h-3.5 text-[#A9853B]" />
                Live AIPix Camera Hardware Status
              </h4>
              <span className="text-[10px] font-mono text-[#A9853B] bg-amber-950/20 px-2 py-0.5 rounded border border-[#A9853B]/20">
                10G Fiber Uplink OK
              </span>
            </div>

            {camerasForLocation.length === 0 ? (
              <div className="py-8 px-4 text-center border border-dashed border-zinc-800/85 rounded-xl bg-zinc-950/25 font-mono text-zinc-500 text-xs flex flex-col items-center justify-center gap-2">
                <WifiOff className="w-5 h-5 text-[#A9853B]/50 animate-pulse" />
                <p className="font-bold text-zinc-400">No active AIPix camera feeds found for this location.</p>
                <p className="text-[10px] text-zinc-500 max-w-md">The AIPix secure gateway will automatically register and link camera feeds here upon detecting live-stream computer vision telemetry.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {camerasForLocation.map((cameraName) => {
                  const status = checkCameraStatus(cameraName);
                  const lastActivity = getCameraLastActivity(cameraName);
                  const camIdx = camerasForLocation.indexOf(cameraName) + 1;
                  const baseIP = activeLocation.ipAddress || "192.168.10.100";
                  const ipParts = baseIP.split(".");
                  const cameraIP = ipParts.length === 4 ? `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.${100 + camIdx}` : baseIP;
                  
                  const totalScans = detections.filter(d => {
                    if (d.locationId !== selectedLocationId) return false;
                    const detCam = d.cameraName.toLowerCase();
                    const targetCam = cameraName.toLowerCase();
                    return detCam.includes(targetCam) || targetCam.includes(detCam);
                  }).length;

                  return (
                    <div
                      key={cameraName}
                      onClick={() => setInspectedCamera(cameraName)}
                      className="bg-zinc-900/30 border border-zinc-850 rounded-xl p-3.5 flex flex-col justify-between hover:border-[#A9853B]/40 transition-all hover:bg-zinc-900/60 cursor-pointer group select-none relative overflow-hidden"
                    >
                      {/* Status beacon shine */}
                      <div className={`absolute top-0 left-0 w-full h-[1px] ${
                        status.state === "offline" ? "bg-rose-500/20" :
                        status.state === "transmitting" ? "bg-amber-500/40" : "bg-emerald-500/20"
                      }`}></div>

                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <p className="text-[11px] font-bold text-zinc-200 line-clamp-1 group-hover:text-white transition-colors font-mono uppercase tracking-tight">
                              {cameraName}
                            </p>
                            <p className="text-[9px] text-zinc-400 font-mono">
                              {cameraIP}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!status.isOnline) return;
                                  const currentMode = cameraStreamModes[cameraName] || "analytics";
                                  const modes: ("analytics" | "thermal" | "night" | "raw" | "vms")[] = ["analytics", "thermal", "night", "raw", "vms"];
                                  const nextMode = modes[(modes.indexOf(currentMode) + 1) % modes.length];
                                  setCameraStreamModes((prev) => ({ ...prev, [cameraName]: nextMode }));
                                }}
                                className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold transition-all border ${
                                  !status.isOnline
                                    ? "bg-zinc-950 text-zinc-600 border-zinc-900 cursor-not-allowed"
                                    : "bg-zinc-850 hover:bg-[#A9853B]/20 text-[#A9853B] border-zinc-800 hover:border-[#A9853B]/40 cursor-pointer"
                                }`}
                                title={status.isOnline ? "Click to cycle streaming modes" : "Camera offline"}
                              >
                                {((cameraStreamModes[cameraName] || "analytics") === "analytics" ? "AI ANALYTICS" :
                                  (cameraStreamModes[cameraName] || "analytics") === "thermal" ? "FLIR THERMAL" :
                                  (cameraStreamModes[cameraName] || "analytics") === "night" ? "IR NIGHT" :
                                  (cameraStreamModes[cameraName] || "analytics") === "vms" ? "VMS LIVE" : "RAW FEED")}
                              </span>
                            </div>
                          </div>
                          
                          {/* Blinking indicator dot */}
                          <div className="flex h-2.5 w-2.5 relative mt-0.5 shrink-0">
                            {status.state === "offline" ? (
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600 animate-pulse"></span>
                            ) : status.state === "transmitting" ? (
                              <>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                              </>
                            ) : (
                              <>
                                <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Mini spec line */}
                        <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500">
                          <span>Model: Starvis-M{camIdx}</span>
                          <span className="text-zinc-400">{status.text}</span>
                        </div>

                        <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500 border-t border-zinc-850/50 pt-1.5 mt-1">
                          <span>Scans parsed: <strong className="text-zinc-300">{totalScans}</strong></span>
                          <span className="text-[#A9853B] font-semibold flex items-center gap-1 group-hover:underline">
                            <Eye className="w-2.5 h-2.5" /> View Feed
                          </span>
                        </div>
                      </div>

                      <div className="mt-3.5 flex items-center justify-between gap-1 border-t border-zinc-850/30 pt-2 text-[9px] font-mono text-zinc-500">
                        <span>Last: <strong className="text-zinc-400">{lastActivity}</strong></span>
                        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              const isOffline = offlineCameras.includes(cameraName);
                              if (isOffline) {
                                setOfflineCameras(prev => prev.filter(c => c !== cameraName));
                              } else {
                                setOfflineCameras(prev => [...prev, cameraName]);
                              }
                            }}
                            className={`hover:bg-zinc-800 p-1 rounded-md transition-colors ${
                              status.state === "offline" ? "text-emerald-400 hover:text-emerald-300" : "text-rose-400 hover:text-rose-300"
                            }`}
                            title={status.state === "offline" ? "Power On Camera" : "Disconnect Camera Power"}
                          >
                            <Power className="w-3 h-3" />
                          </button>

                          {status.isOnline && onSimulateCameraScan && (
                            <button
                              onClick={() => onSimulateCameraScan(cameraName)}
                              className="text-[#A9853B] hover:text-[#D4AF37] font-semibold uppercase hover:underline text-[8px] tracking-wider"
                              title="Simulate walk-by trigger"
                            >
                              Ping Scan
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic insights footer */}
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 flex items-center justify-between text-xs text-zinc-300">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#A9853B]" />
            <span>
              Average site presence load:{" "}
              <span className="text-zinc-100 font-bold">
                {(
                  hourlyHeadcountData.reduce((s, d) => s + d.headcount, 0) /
                  hourlyHeadcountData.length
                ).toFixed(1)}
              </span>{" "}
              people/hr
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">
            IP CAMERA SYNC OK
          </span>
        </div>
      </div>

      {/* AIPix Live Surveillance Feed & Diagnostic Inspector Modal */}
      {inspectedCamera && (() => {
        const cameraName = inspectedCamera;
        const status = checkCameraStatus(cameraName);
        const camIdx = camerasForLocation.indexOf(cameraName) + 1;
        const baseIP = activeLocation.ipAddress || "192.168.10.100";
        const ipParts = baseIP.split(".");
        const cameraIP = ipParts.length === 4 ? `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.${100 + camIdx}` : baseIP;
        
        // Find latest subject detected
        const camDets = detections.filter((det) => {
          if (det.locationId !== selectedLocationId) return false;
          const detCam = det.cameraName.toLowerCase();
          const targetCam = cameraName.toLowerCase();
          return detCam.includes(targetCam) || targetCam.includes(detCam);
        });
        const latestDet = camDets.length > 0 
          ? [...camDets].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0] 
          : null;
        
        const matchedEmployee = latestDet ? employees.find(e => e.id === latestDet.employeeId) : null;
        
        const totalScans = camDets.length;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md overflow-y-auto">
            <div className="bg-[#121212] border border-zinc-800 rounded-2xl w-full max-w-4xl p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Radial gradient background */}
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#A9853B]/5 rounded-full blur-[100px] pointer-events-none"></div>

              {/* Header with clear back button and title */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
                <div className="flex items-start md:items-center gap-3">
                  <button
                    onClick={() => {
                      setInspectedCamera(null);
                      setDiagnosticLogs([]);
                      setIsDiagnosticRunning(false);
                    }}
                    className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-400 hover:text-zinc-100 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-750 px-3.5 py-2 rounded-xl transition-all cursor-pointer group"
                  >
                    <ArrowLeft className="w-4 h-4 text-zinc-400 group-hover:text-[#A9853B] transition-colors" />
                    <span>BACK TO DASHBOARD</span>
                  </button>

                  <div className="h-6 w-[1px] bg-zinc-800 hidden md:block"></div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <Monitor className="w-4 h-4 text-[#A9853B]" />
                      <h3 className="text-md font-bold font-serif text-zinc-100">{cameraName}</h3>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                        status.state === "offline" ? "bg-rose-950/40 text-rose-400 border border-rose-900/40" :
                        status.state === "transmitting" ? "bg-amber-950/40 text-amber-400 border border-amber-900/40 animate-pulse" :
                        "bg-emerald-950/40 text-emerald-400 border border-emerald-900/40"
                      }`}>
                        {status.text}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-zinc-400 font-mono">
                      Device IP: <span className="text-zinc-200 font-bold">{cameraIP}:8000</span> | Model: <span className="text-zinc-200">AIPix Starvis II Dome PRO-X{camIdx}</span>
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setInspectedCamera(null);
                    setDiagnosticLogs([]);
                    setIsDiagnosticRunning(false);
                  }}
                  className="p-1.5 self-end md:self-auto bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono px-3 py-1.5"
                  title="Close Camera Stream"
                >
                  <X className="w-4 h-4" />
                  <span>CLOSE</span>
                </button>
              </div>

              {/* Grid Body */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Side: Live Feed Screen (8 Columns on desktop) */}
                <div className="lg:col-span-7 flex flex-col space-y-4">
                  {/* Header info with stream selector tabs */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/80">
                    <span className="text-xs font-mono text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${status.isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                      Live Stream Feed
                    </span>
                    
                    {status.isOnline && (
                      <div className="flex items-center gap-1 p-1 bg-zinc-950 rounded-xl border border-zinc-850">
                        {(["analytics", "thermal", "night", "raw"] as const).map((mode) => {
                          const activeMode = cameraStreamModes[cameraName] || "analytics";
                          const isSelected = activeMode === mode;
                          const labels: Record<string, string> = {
                            analytics: "AI Analytics",
                            thermal: "FLIR Thermal",
                            night: "IR Night",
                            raw: "Raw Feed"
                          };
                          
                          return (
                            <button
                              key={mode}
                              onClick={() => setCameraStreamModes(prev => ({ ...prev, [cameraName]: mode }))}
                              className={`px-3 py-1 rounded-lg text-[10px] font-semibold font-mono tracking-wide transition-all duration-200 cursor-pointer ${
                                isSelected
                                  ? "bg-gradient-to-r from-[#D4AF37] to-[#A9853B] text-zinc-950 font-bold shadow-md"
                                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                              }`}
                            >
                              {labels[mode]}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    
                    <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline">
                      RESOLVED: {activeLocation.code === "HQ-VAULT" ? "3840x2160 @ 60 FPS" : "1920x1080 @ 120 FPS"}
                    </span>
                  </div>
 
                  {/* Video Canvas Box */}
                  <div className={`relative aspect-video rounded-xl border overflow-hidden shadow-inner flex flex-col items-center justify-center group transition-all duration-350 ${
                    !status.isOnline ? "bg-[#090909] border-zinc-800" :
                    (cameraStreamModes[cameraName] || "analytics") === "thermal" ? "bg-[#05001a] border-purple-900/50" :
                    (cameraStreamModes[cameraName] || "analytics") === "night" ? "bg-[#021003] border-emerald-950/80" :
                    "bg-[#090909] border-zinc-800"
                  }`}>
                    {/* Simulated scanning lines effect */}
                    <div className={`absolute inset-0 pointer-events-none opacity-40 bg-linear-to-b from-transparent via-zinc-950/10 to-transparent bg-[size:100%_4px] ${
                      (cameraStreamModes[cameraName] || "analytics") === "night" ? "opacity-60 bg-[size:100%_3px]" : ""
                    }`}></div>
                    
                    {/* Corner high-tech target markings */}
                    <div className={`absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 pointer-events-none transition-colors ${
                      !status.isOnline ? "border-zinc-700" :
                      (cameraStreamModes[cameraName] || "analytics") === "thermal" ? "border-purple-500/40" :
                      (cameraStreamModes[cameraName] || "analytics") === "night" ? "border-emerald-500/40" : "border-zinc-700"
                    }`}></div>
                    <div className={`absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 pointer-events-none transition-colors ${
                      !status.isOnline ? "border-zinc-700" :
                      (cameraStreamModes[cameraName] || "analytics") === "thermal" ? "border-purple-500/40" :
                      (cameraStreamModes[cameraName] || "analytics") === "night" ? "border-emerald-500/40" : "border-zinc-700"
                    }`}></div>
                    <div className={`absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 pointer-events-none transition-colors ${
                      !status.isOnline ? "border-zinc-700" :
                      (cameraStreamModes[cameraName] || "analytics") === "thermal" ? "border-purple-500/40" :
                      (cameraStreamModes[cameraName] || "analytics") === "night" ? "border-emerald-500/40" : "border-zinc-700"
                    }`}></div>
                    <div className={`absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 pointer-events-none transition-colors ${
                      !status.isOnline ? "border-zinc-700" :
                      (cameraStreamModes[cameraName] || "analytics") === "thermal" ? "border-purple-500/40" :
                      (cameraStreamModes[cameraName] || "analytics") === "night" ? "border-emerald-500/40" : "border-zinc-700"
                    }`}></div>                    {status.isOnline ? (
                      (cameraStreamModes[cameraName] || "analytics") === "vms" ? (
                        <iframe
                          src="https://aipix.gsd-me.com/cam"
                          className="w-full h-full border-none bg-[#111]"
                          title="AIPix Live VMS Portal"
                          allow="autoplay; encrypted-media"
                        />
                      ) : (
                        <>
                          {/* Live crosshairs */}
                          {((cameraStreamModes[cameraName] || "analytics") !== "raw") && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                              <div className={`w-12 h-12 border border-dashed rounded-full animate-spin duration-10000 ${
                                (cameraStreamModes[cameraName] || "analytics") === "thermal" ? "border-purple-400" :
                                (cameraStreamModes[cameraName] || "analytics") === "night" ? "border-emerald-400" : "border-[#A9853B]"
                              }`}></div>
                              <div className={`absolute w-20 h-0.5 ${
                                (cameraStreamModes[cameraName] || "analytics") === "thermal" ? "bg-purple-500" :
                                (cameraStreamModes[cameraName] || "analytics") === "night" ? "bg-emerald-500" : "bg-[#A9853B]"
                              }`}></div>
                              <div className={`absolute h-20 w-0.5 ${
                                (cameraStreamModes[cameraName] || "analytics") === "thermal" ? "bg-purple-500" :
                                (cameraStreamModes[cameraName] || "analytics") === "night" ? "bg-emerald-500" : "bg-[#A9853B]"
                              }`}></div>
                            </div>
                          )}

                          {/* Custom thermal heatmap pulsing nodes */}
                          {(cameraStreamModes[cameraName] || "analytics") === "thermal" && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="absolute w-56 h-56 rounded-full bg-red-600/35 blur-2xl animate-pulse"></div>
                              <div className="absolute w-24 h-24 rounded-full bg-yellow-400/40 blur-xl animate-ping duration-3000"></div>
                              <div className="absolute w-12 h-12 rounded-full bg-white/50 blur-md"></div>
                            </div>
                          )}

                          {/* Night vision grain/noise overlay */}
                          {(cameraStreamModes[cameraName] || "analytics") === "night" && (
                            <div className="absolute inset-0 pointer-events-none opacity-[0.07] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                          )}

                          {/* Camera OSD */}
                          <div className={`absolute top-4 left-6 text-[9px] font-mono uppercase space-y-1 bg-zinc-950/80 p-2.5 rounded-lg border select-none ${
                            (cameraStreamModes[cameraName] || "analytics") === "thermal" ? "text-purple-400 border-purple-900/50" :
                            (cameraStreamModes[cameraName] || "analytics") === "night" ? "text-emerald-400 border-emerald-950/60" :
                            "text-emerald-400/80 border-zinc-800/40"
                          }`}>
                            <p>
                              STREAM: {
                                (cameraStreamModes[cameraName] || "analytics") === "thermal" ? "FLIR_THERMAL_OK" :
                                (cameraStreamModes[cameraName] || "analytics") === "night" ? "IR_NIGHT_VISION_ON" :
                                (cameraStreamModes[cameraName] || "analytics") === "raw" ? "RAW_LOW_LATENCY" : "AI_ANALYTICS_OK"
                              }
                            </p>
                            <p>
                              TIME: {simulatedTime}:{String(streamTicks % 60).padStart(2, "0")}
                            </p>
                            <p>
                              BITRATE: {
                                (cameraStreamModes[cameraName] || "analytics") === "raw" ? "0.8 Mbps" :
                                (cameraStreamModes[cameraName] || "analytics") === "thermal" ? "8.4 Mbps" :
                                status.state === "transmitting" ? "12.4 Mbps" : "2.1 Mbps"
                              }
                            </p>
                            <p>
                              LATENCY: {
                                (cameraStreamModes[cameraName] || "analytics") === "raw" ? "1.2ms" :
                                (cameraStreamModes[cameraName] || "analytics") === "thermal" ? "14.2ms" : "4.8ms"
                              }
                            </p>
                          </div>
                          
                          <div className={`absolute bottom-4 left-6 text-[9px] font-mono uppercase bg-zinc-950/80 p-2.5 rounded-lg border select-none ${
                            (cameraStreamModes[cameraName] || "analytics") === "thermal" ? "text-purple-450 border-purple-900/50" :
                            (cameraStreamModes[cameraName] || "analytics") === "night" ? "text-emerald-450 border-emerald-950/60" :
                            "text-emerald-400/80 border-zinc-800/40"
                          }`}>
                            <p>{activeLocation.code} / {cameraName.toUpperCase()}</p>
                          </div>

                          {status.state === "transmitting" && latestDet && matchedEmployee ? (
                            /* Subject Detected Overlay Box */
                            <div className="absolute inset-x-12 inset-y-8 flex flex-col items-center justify-center">
                              {/* Scanning overlay bracket */}
                              <div className={`relative border p-4 rounded-xl flex items-center gap-4 animate-in zoom-in duration-300 shadow-xl border-dashed animate-tracking-bracket ${
                                (cameraStreamModes[cameraName] || "analytics") === "thermal" ? "bg-[#05001a]/95 border-purple-500" :
                                (cameraStreamModes[cameraName] || "analytics") === "night" ? "bg-[#021003]/95 border-emerald-500" :
                                "bg-zinc-950/90 border-amber-500/50"
                              }`}>
                                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded tracking-widest font-mono ${
                                  (cameraStreamModes[cameraName] || "analytics") === "thermal" ? "bg-purple-600 text-white" :
                                  (cameraStreamModes[cameraName] || "analytics") === "night" ? "bg-emerald-600 text-white" :
                                  "bg-amber-500 text-zinc-950"
                                }`}>
                                  {((cameraStreamModes[cameraName] || "analytics") === "thermal" ? "THERMAL TARGET" : "SUBJECT IDENTIFIED")}
                                </div>

                                {matchedEmployee.picture ? (
                                  <img
                                    src={matchedEmployee.picture}
                                    alt={matchedEmployee.name}
                                    className={`w-12 h-12 rounded-lg object-cover border ${
                                      (cameraStreamModes[cameraName] || "analytics") === "thermal" ? "border-purple-500/50 filter saturate-150 contrast-125" :
                                      (cameraStreamModes[cameraName] || "analytics") === "night" ? "border-emerald-500/50 filter grayscale contrast-150 brightness-75 text-emerald-500" :
                                      "border-amber-500/50"
                                    }`}
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${matchedEmployee.avatarColor} text-white font-extrabold flex items-center justify-center text-sm border ${
                                    (cameraStreamModes[cameraName] || "analytics") === "thermal" ? "border-purple-500/50" :
                                    (cameraStreamModes[cameraName] || "analytics") === "night" ? "border-emerald-500/50" :
                                    "border-amber-500/50"
                                  }`}>
                                    {matchedEmployee.avatar}
                                  </div>
                                )}

                                <div className="text-left font-mono space-y-0.5">
                                  <p className="text-xs font-bold text-zinc-100">{matchedEmployee.name}</p>
                                  <p className="text-[10px] text-zinc-400">{matchedEmployee.role}</p>
                                  <p className="text-[9px] text-[#D4AF37]">DEPT: {matchedEmployee.department}</p>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className={`text-[8px] px-1 py-0.2 rounded font-bold border ${
                                      (cameraStreamModes[cameraName] || "analytics") === "thermal" ? "bg-purple-950/60 text-purple-400 border-purple-800/30" :
                                      (cameraStreamModes[cameraName] || "analytics") === "night" ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/30" :
                                      "bg-emerald-950/60 text-emerald-400 px-1 py-0.2 rounded font-bold border border-emerald-800/30"
                                    }`}>
                                      MATCH: {latestDet.confidence}%
                                    </span>
                                    <span className={`text-[8px] px-1 py-0.2 rounded font-bold border ${
                                      (cameraStreamModes[cameraName] || "analytics") === "thermal" ? "bg-purple-950/60 text-purple-400 border-purple-800/30" :
                                      (cameraStreamModes[cameraName] || "analytics") === "night" ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/30" :
                                      "bg-amber-950/60 text-amber-400 px-1 py-0.2 rounded font-bold border border-amber-800/30"
                                    }`}>
                                      DIR: {latestDet.direction === "In" ? "ENTRANCE" : "EXIT"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* Idle Scan screen */
                            <div className="text-center space-y-2 pointer-events-none">
                              <div className={`w-12 h-12 flex items-center justify-center rounded-full mx-auto animate-pulse border ${
                                (cameraStreamModes[cameraName] || "analytics") === "thermal" ? "bg-purple-950/30 border-purple-500/30 text-purple-400" :
                                (cameraStreamModes[cameraName] || "analytics") === "night" ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-400" :
                                "bg-emerald-950/30 border-emerald-500/30 text-emerald-500"
                              }`}>
                                {((cameraStreamModes[cameraName] || "analytics") === "thermal" ? (
                                  <Flame className="w-6 h-6" />
                                ) : (
                                  <Eye className="w-6 h-6" />
                                ))}
                              </div>
                              <p className={`text-xs font-mono uppercase tracking-widest font-semibold ${
                                (cameraStreamModes[cameraName] || "analytics") === "thermal" ? "text-purple-400" :
                                (cameraStreamModes[cameraName] || "analytics") === "night" ? "text-emerald-400" :
                                "text-emerald-500"
                              }`}>
                                FEED ACTIVE / STANDBY
                              </p>
                              <p className="text-[10px] font-mono text-zinc-500">
                                {
                                  (cameraStreamModes[cameraName] || "analytics") === "thermal" ? "Thermal edge-sensors operating. Ambient thermals stable." :
                                  (cameraStreamModes[cameraName] || "analytics") === "night" ? "Infrared illuminators fully active. Spectral clarity calibrated." :
                                  "Scanning parameters. Face detection module ready."
                                }
                              </p>
                            </div>
                          )}
                        </>
                      )
                    ) : (
                      /* Offline Screen */
                      <div className="text-center space-y-3 z-10 px-6">
                        <div className="w-12 h-12 bg-rose-950/30 border border-rose-500/30 text-rose-500 flex items-center justify-center rounded-full mx-auto animate-bounce">
                          <WifiOff className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-mono text-rose-500 uppercase tracking-widest font-bold">
                          [SIGNAL LOSS - VIDEO CONNECTION TERMINATED]
                        </p>
                        <p className="text-[10px] font-mono text-zinc-500 max-w-sm mx-auto leading-relaxed">
                          The computer vision stream has been disconnected. AIPix automatic logging triggers are offline for this hardware gate.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Manual controls inside feed */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950 p-3.5 rounded-xl border border-zinc-850">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const isAlreadyOffline = offlineCameras.includes(cameraName);
                          if (isAlreadyOffline) {
                            setOfflineCameras(prev => prev.filter(c => c !== cameraName));
                          } else {
                            setOfflineCameras(prev => [...prev, cameraName]);
                          }
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                          status.state === "offline"
                            ? "bg-emerald-950/20 hover:bg-emerald-900/30 border-emerald-500/20 text-emerald-400"
                            : "bg-rose-950/20 hover:bg-rose-900/30 border-rose-500/20 text-rose-400"
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{status.state === "offline" ? "Enable Feed" : "Disable Feed"}</span>
                      </button>

                      {status.isOnline && onSimulateCameraScan && (
                        <button
                          onClick={() => onSimulateCameraScan(cameraName)}
                          className="flex items-center gap-2 bg-[#A9853B]/10 hover:bg-[#A9853B]/20 border border-[#A9853B]/30 text-[#D4AF37] px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Trigger Manual Ping Scan</span>
                        </button>
                      )}
                    </div>

                    <span className="text-[10px] font-mono text-zinc-500">
                      IP Port: <strong className="text-zinc-400">{8000 + camIdx}</strong>
                    </span>
                  </div>
                </div>

                {/* Right Side: Diagnostics & Telemetry (5 Columns on desktop) */}
                <div className="lg:col-span-5 flex flex-col space-y-4">
                  <span className="text-xs font-mono text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-[#A9853B]" />
                    Hardware Telemetry
                  </span>

                  {/* Telemetry stats cards */}
                  <div className="grid grid-cols-2 gap-3 font-mono">
                    <div className="bg-zinc-900/40 border border-zinc-850 p-3 rounded-xl">
                      <p className="text-[9px] uppercase text-zinc-500 font-bold">PoE+ Power Intake</p>
                      <p className="text-sm font-bold text-zinc-100 mt-1">
                        {status.isOnline ? (status.state === "transmitting" ? "13.8 Watts" : "7.4 Watts") : "0.0 Watts"}
                      </p>
                    </div>
                    <div className="bg-zinc-900/40 border border-zinc-850 p-3 rounded-xl">
                      <p className="text-[9px] uppercase text-zinc-500 font-bold">Core CPU Temp</p>
                      <p className="text-sm font-bold text-zinc-100 mt-1 flex items-center gap-1">
                        <Thermometer className="w-3.5 h-3.5 text-[#A9853B]" />
                        {status.isOnline ? (status.state === "transmitting" ? "46.2 °C" : "38.5 °C") : "23.8 °C"}
                      </p>
                    </div>
                    <div className="bg-zinc-900/40 border border-zinc-850 p-3 rounded-xl">
                      <p className="text-[9px] uppercase text-zinc-500 font-bold">Fiber Packet Delivery</p>
                      <p className="text-sm font-bold text-zinc-100 mt-1">
                        {status.isOnline ? "99.998% OK" : "0.000% LOSS"}
                      </p>
                    </div>
                    <div className="bg-zinc-900/40 border border-zinc-850 p-3 rounded-xl">
                      <p className="text-[9px] uppercase text-zinc-500 font-bold">Scans Today</p>
                      <p className="text-sm font-bold text-[#D4AF37] mt-1">{totalScans} parsed</p>
                    </div>
                  </div>

                  {/* Diagnostic console terminal block */}
                  <div className="flex-1 flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-[#A9853B]" />
                        Diagnostic System Test
                      </span>
                      {status.isOnline && (
                        <button
                          onClick={() => handleRunDiagnostics(cameraName)}
                          disabled={isDiagnosticRunning}
                          className="text-[9px] font-bold font-mono text-[#A9853B] hover:text-[#D4AF37] bg-[#A9853B]/5 hover:bg-[#A9853B]/10 border border-[#A9853B]/20 rounded-lg px-2.5 py-1 flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3 h-3 ${isDiagnosticRunning ? 'animate-spin' : ''}`} />
                          Run Calibration
                        </button>
                      )}
                    </div>

                    <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3.5 h-44 overflow-y-auto font-mono text-[9px] text-emerald-400/90 space-y-1.5 custom-scrollbar select-all">
                      {diagnosticLogs.length === 0 ? (
                        <p className="text-zinc-600 italic">Console ready. Click "Run Calibration" to start diagnostics sequence.</p>
                      ) : (
                        diagnosticLogs.map((log, lIdx) => (
                          <div key={lIdx} className="leading-normal border-l border-emerald-950 pl-2">
                            {log}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
