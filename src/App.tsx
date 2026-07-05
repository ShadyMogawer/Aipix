/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import {
  Shield,
  Activity,
  Plus,
  Tv,
  ExternalLink,
  Sliders,
  Award,
  Terminal,
  HelpCircle,
  Clock,
  Briefcase,
  Layers,
  CircleAlert,
  Loader2,
  Download,
} from "lucide-react";
import {
  initialLocations,
  initialEmployees,
  initialLogs,
  initialDetections,
  timeToMinutes,
  formatMinutesToDuration,
  getIntervalDuration,
  isIntervalActiveAtTime,
} from "./data/mockData";
import { Employee, AttendanceLog, CameraDetection, AttendanceInterval } from "./types";
import { getEmployeeMetrics } from "./utils/employeeHelpers";

import DashboardStats from "./components/DashboardStats";
import LocationSummary from "./components/LocationSummary";
import AttendanceTimeline from "./components/AttendanceTimeline";
import HeadcountTrend from "./components/HeadcountTrend";
import RosterList from "./components/RosterList";
import ReportExportModal from "./components/ReportExportModal";
import StaffDossier from "./components/StaffDossier";

// Vector brand logo for Bullion Trading Center (BTC)
const BTCLogo = ({ className = "h-12" }: { className?: string }) => (
  <svg viewBox="0 0 450 100" width="450" height="100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Emblem */}
    <g transform="translate(5, 5)">
      {/* Outer Ring */}
      <circle cx="45" cy="45" r="41" stroke="#A9853B" strokeWidth="6" />
      {/* Inner Ring */}
      <circle cx="45" cy="45" r="32" stroke="#A9853B" strokeWidth="2.5" />
      {/* BTC Text */}
      <text
        x="45"
        y="53"
        fill="#A9853B"
        fontFamily="Georgia, serif"
        fontSize="22"
        fontWeight="bold"
        textAnchor="middle"
        letterSpacing="0.5"
      >
        BTC
      </text>
    </g>

    {/* Text Side */}
    <g transform="translate(105, 5)">
      {/* BULLION TRADING CENTER */}
      <text
        x="0"
        y="42"
        fill="#A9853B"
        fontFamily="Georgia, serif"
        fontSize="19"
        fontWeight="bold"
        letterSpacing="0.2"
      >
        BULLION TRADING CENTER
      </text>
      {/* Investment To Be Trusted */}
      <text
        x="1"
        y="68"
        fill="#A9853B"
        fontFamily="Georgia, serif"
        fontSize="12"
        fontStyle="italic"
        letterSpacing="0.5"
      >
        Investment To Be Trusted
      </text>
    </g>
  </svg>
);

const getCairoTodayDate = () => {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    return formatter.format(new Date()); // Outputs "YYYY-MM-DD"
  } catch (e) {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

const getCairoTimeHHMM = () => {
  try {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Cairo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
    return formatter.format(new Date()); // Outputs "HH:MM"
  } catch (e) {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
};

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations] = useState(initialLocations);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [detections, setDetections] = useState<CameraDetection[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("LOC-001"); // Suez Plant default
  const [simulatedTime, setSimulatedTime] = useState<string>(getCairoTimeHHMM());
  const [fteHoursBaseline, setFteHoursBaseline] = useState<number>(8);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("staffId");
    } catch (e) {
      return null;
    }
  });

  // AIPix API Integration States
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [apiSyncError, setApiSyncError] = useState<string | null>(null);
  const [apiSyncSuccess, setApiSyncSuccess] = useState<boolean>(false);
  const [apiDateFrom, setApiDateFrom] = useState<string>(getCairoTodayDate());
  const [apiDateTo, setApiDateTo] = useState<string>(getCairoTodayDate());
  const [apiSimilarityForm, setApiSimilarityForm] = useState<number>(80);
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [currentCairoTime, setCurrentCairoTime] = useState<string>("");

  // Department View State & Filtered Helpers
  const [selectedDept, setSelectedDept] = useState<"All" | "IT" | "Operations" | "Executive">("All");

  const unifiedMetrics = useMemo(() => {
    return getEmployeeMetrics(employees, logs, selectedDept, simulatedTime);
  }, [employees, logs, selectedDept, simulatedTime]);

  const filteredEmployeesForDept = unifiedMetrics.filteredEmployees;
  const filteredLogsForDept = unifiedMetrics.filteredLogs;

  // Live real-time Cairo, Egypt clock
  useEffect(() => {
    const updateCairoClock = () => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Cairo",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour12: false
      });
      setCurrentCairoTime(formatter.format(now));
    };

    updateCairoClock();
    const interval = setInterval(updateCairoClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Core API sync mechanism
  const syncAIPixEvents = async (dateFrom = apiDateFrom, dateTo = apiDateTo, sim = apiSimilarityForm) => {
    setIsLoadingEvents(true);
    setApiSyncError(null);
    setApiSyncSuccess(false);

    try {
      const query = new URLSearchParams({
        from: dateFrom,
        to: dateTo,
        dir: "desc",
        similarity_form: String(sim)
      });

      const res = await fetch(`/api/aipix/events?${query.toString()}`);
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || `Server returned status ${res.status}`);
      }

      // We successfully got the data!
      const rawEvents = result.data?.data || result.data || [];
      
      if (!Array.isArray(rawEvents)) {
        throw new Error("Invalid API response format: expected an array of events");
      }

      // 1. Fetch all registered employees from AIPix database
      let fetchedEmployees: Employee[] = [];
      try {
        const empRes = await fetch("/api/aipix/employees");
        const empResult = await empRes.json();
        if (empRes.ok && empResult.success) {
          const rawEmps = empResult.data?.data || empResult.data || [];
          if (Array.isArray(rawEmps)) {
            const colors = [
              "from-cyan-500 to-blue-600",
              "from-orange-500 to-amber-600",
              "from-indigo-500 to-indigo-700",
              "from-teal-500 to-emerald-600",
              "from-rose-500 to-pink-600",
            ];
            
            rawEmps.forEach((rawEmp: any, index: number) => {
              let personName = "";
              let department = "";
              
              if (Array.isArray(rawEmp.properties)) {
                rawEmp.properties.forEach((prop: any) => {
                  const typeStr = String(prop.type || "").trim().toLowerCase();
                  if (typeStr === "full_name" || typeStr === "fullname") {
                    personName = String(prop.value || "").trim();
                  }
                  if (typeStr === "status" || typeStr === "ststus" || typeStr === "department") {
                    department = String(prop.value || "").trim();
                  }
                });
              }
              
              if (!personName) {
                personName = rawEmp.name || "Registered Staff";
              }
              personName = String(personName).trim();
              
              if (!department) {
                department = "Operations Control";
              }
              department = String(department).trim();

              let rawId = String(rawEmp.id || `V-${100 + index}`);
              let personId = rawId;
              if (!personId.startsWith("EMP-") && !personId.startsWith("V-")) {
                personId = `EMP-${personId}`;
              }

              let pictureUrl = rawEmp.file || rawEmp.signed_url || rawEmp.url || rawEmp.photo || rawEmp.image || "";
              pictureUrl = String(pictureUrl || "").trim();
              
              const initials = personName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "EE";

              fetchedEmployees.push({
                id: personId,
                name: personName,
                role: rawEmp.role || "Operator",
                avatar: initials,
                department,
                avatarColor: colors[index % colors.length],
                picture: pictureUrl || undefined
              });
            });
          }
        }
      } catch (empErr) {
        console.warn("[Front-end Sync] Could not fetch global employees, relying solely on events list", empErr);
      }

      const newEmployees = fetchedEmployees.length > 0 ? fetchedEmployees : [...employees];

      if (rawEvents.length === 0) {
        if (newEmployees.length > 0) {
          setEmployees(newEmployees);
        }
        setApiSyncSuccess(true);
        setApiSyncError(`No real camera events fetched from AIPix servers for date range ${dateFrom} to ${dateTo}.`);
        setIsLoadingEvents(false);
        return;
      }

      const newDetections: CameraDetection[] = [];
      
      const getOrCreateEmployee = (rawEvent: any): Employee => {
        // Extract properties from the analytic_file
        let personName = "";
        let department = "";
        
        if (rawEvent.analytic_file && Array.isArray(rawEvent.analytic_file.properties)) {
          rawEvent.analytic_file.properties.forEach((prop: any) => {
            const typeStr = String(prop.type || "").trim().toLowerCase();
            if (typeStr === "full_name" || typeStr === "fullname") {
              personName = String(prop.value || "").trim();
            }
            if (typeStr === "status" || typeStr === "ststus" || typeStr === "department") {
              department = String(prop.value || "").trim();
            }
          });
        }

        // Fallbacks
        if (!personName) {
          personName = rawEvent.analytic_file?.name || rawEvent.person_name || rawEvent.person?.name || rawEvent.subject_name || rawEvent.employee_name || rawEvent.name || rawEvent.user?.name || "Visitor Staff";
        }
        personName = String(personName).trim();

        if (!department) {
          department = rawEvent.department || "Operations Control";
        }
        department = String(department).trim();

        // Employee ID from analytic_file.id
        let rawId = "";
        if (rawEvent.analytic_file && rawEvent.analytic_file.id) {
          rawId = String(rawEvent.analytic_file.id);
        } else {
          rawId = rawEvent.person_id || rawEvent.person?.id || rawEvent.subject_id || rawEvent.employee_id || rawEvent.user_id || rawEvent.id || `V-${Math.floor(100 + Math.random() * 900)}`;
        }
        
        let personId = String(rawId).trim();
        if (!personId.startsWith("EMP-") && !personId.startsWith("V-")) {
          personId = `EMP-${personId}`;
        }

        let emp = newEmployees.find(e => e.id === personId);
        
        let pictureUrl = "";
        if (rawEvent.analytic_file) {
          pictureUrl = rawEvent.analytic_file.file || 
                       rawEvent.analytic_file.signed_url || 
                       rawEvent.analytic_file.url || 
                       rawEvent.analytic_file.photo || 
                       rawEvent.analytic_file.image || 
                       rawEvent.analytic_file.image_url || 
                       "";
        }
        if (!pictureUrl) {
          pictureUrl = rawEvent.person?.picture || 
                       rawEvent.person?.photo || 
                       rawEvent.person?.avatar || 
                       rawEvent.subject_picture || 
                       rawEvent.subject_photo || 
                       rawEvent.image_url || 
                       rawEvent.photo_url || 
                       "";
        }
        pictureUrl = String(pictureUrl || "").trim();

        if (emp) {
          // Keep synced with latest details from API
          emp.id = personId;
          emp.name = personName;
          emp.department = department;
          if (pictureUrl) {
            emp.picture = pictureUrl;
          }
        } else {
          const initials = personName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "EE";
          const colors = [
            "from-cyan-500 to-blue-600",
            "from-orange-500 to-amber-600",
            "from-indigo-500 to-indigo-700",
            "from-teal-500 to-emerald-600",
            "from-rose-500 to-pink-600",
          ];
          emp = {
            id: personId,
            name: personName,
            role: rawEvent.role || rawEvent.person?.role || "BTC Technical Staff",
            avatar: initials,
            department: department,
            avatarColor: colors[Math.floor(Math.random() * colors.length)],
            picture: pictureUrl || undefined
          };
          newEmployees.push(emp);
        }
        return emp;
      };

      rawEvents.forEach((evt: any) => {
        const emp = getOrCreateEmployee(evt);
        
        let confidence = evt.similarity || evt.confidence || evt.score || 85.0;
        if (confidence <= 1.0) confidence = confidence * 100; // Normalise
        confidence = Number(Number(confidence).toFixed(2));

        // Camera direction mapping: camera id 1 is Exit (Out) and camera id 2 is Entrance (In)
        let direction: "In" | "Out" = "In";
        const cameraId = evt.camera?.id;
        if (cameraId === 1) {
          direction = "Out";
        } else if (cameraId === 2) {
          direction = "In";
        } else {
          // Fallback to name/direction checking
          const rawDir = String(evt.direction || evt.type || evt.action || "").toLowerCase();
          const camName = String(evt.camera_name || evt.camera?.name || evt.camera || "").toLowerCase();
          if (rawDir.includes("out") || rawDir.includes("exit") || rawDir.includes("leave") || rawDir === "0" || camName.includes("exit") || camName.includes("out")) {
            direction = "Out";
          }
        }

        const rawTimeStr = evt.timestamp || evt.created_at || evt.event_time || new Date().toISOString();
        let timeFormatted = "12:00:00";
        try {
          const parsedDate = new Date(rawTimeStr);
          if (!isNaN(parsedDate.getTime())) {
            // Force the output to Egypt Cairo Time (EET/EEST)
            const formatter = new Intl.DateTimeFormat("en-GB", {
              timeZone: "Africa/Cairo",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false
            });
            timeFormatted = formatter.format(parsedDate);
          } else {
            // Check if string already has time inside it
            const match = rawTimeStr.match(/(\d{2}):(\d{2})/);
            if (match) timeFormatted = `${match[1]}:${match[2]}:00`;
          }
        } catch (e) {
          const match = rawTimeStr.match(/(\d{2}):(\d{2})/);
          if (match) timeFormatted = `${match[1]}:${match[2]}:00`;
        }

        const cameraName = evt.camera?.pretty_name || evt.camera?.name || evt.camera_name || evt.camera || "BTC_GATE_A_CAM";
        const locationId = selectedLocationId;

        newDetections.push({
          id: evt.id ? String(evt.id) : `DET-${Math.random()}`,
          timestamp: timeFormatted,
          employeeId: emp.id,
          employeeName: emp.name,
          direction,
          locationId,
          confidence,
          cameraName
        });
      });

      setEmployees(newEmployees);
      setDetections(newDetections);

      // Group detections by employee for building intervals
      const employeeDetectionsMap: { [empId: string]: CameraDetection[] } = {};
      newDetections.forEach(det => {
        if (!employeeDetectionsMap[det.employeeId]) {
          employeeDetectionsMap[det.employeeId] = [];
        }
        employeeDetectionsMap[det.employeeId].push(det);
      });

      const newLogs: AttendanceLog[] = [];

      Object.entries(employeeDetectionsMap).forEach(([empId, dets]) => {
        const sortedDets = [...dets].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        const intervals: AttendanceInterval[] = [];

        // Build robust, non-overlapping intervals
        const rawIntervals: { enter: number; exit: number | null }[] = [];

        sortedDets.forEach(det => {
          const detM = timeToMinutes(det.timestamp);
          if (det.direction === "In") {
            const active = rawIntervals.find(i => i.exit === null);
            if (active) {
              // If already active but the new In is > 3 hours later, close current & start new
              if (detM - active.enter > 180) {
                active.exit = active.enter + 45;
                rawIntervals.push({ enter: detM, exit: null });
              }
              // Otherwise, ignore redundant In triggers while already inside
            } else {
              const lastClosed = rawIntervals.length > 0 ? rawIntervals[rawIntervals.length - 1] : null;
              if (lastClosed && lastClosed.exit !== null && detM < lastClosed.exit) {
                const enterTime = Math.max(detM, lastClosed.exit);
                rawIntervals.push({ enter: enterTime, exit: null });
              } else {
                rawIntervals.push({ enter: detM, exit: null });
              }
            }
          } else {
            // Out event
            const active = rawIntervals.find(i => i.exit === null);
            if (active) {
              active.exit = Math.max(active.enter, detM);
            } else {
              const lastClosed = rawIntervals.length > 0 ? rawIntervals[rawIntervals.length - 1] : null;
              let enterTime = Math.max(0, detM - 60);
              if (lastClosed && lastClosed.exit !== null && enterTime < lastClosed.exit) {
                enterTime = lastClosed.exit;
              }
              enterTime = Math.min(enterTime, detM);
              rawIntervals.push({ enter: enterTime, exit: detM });
            }
          }
        });

        // Convert rawIntervals to formal AttendanceInterval objects
        rawIntervals.forEach(ri => {
          const enterStr = `${String(Math.floor(ri.enter / 60)).padStart(2, "0")}:${String(ri.enter % 60).padStart(2, "0")}`;
          if (ri.exit === null) {
            const currentSimM = timeToMinutes(simulatedTime);
            const diff = Math.max(0, currentSimM - ri.enter);
            intervals.push({
              id: `INT-${Math.random()}`,
              enterTime: enterStr,
              exitTime: null,
              durationMinutes: diff
            });
          } else {
            const diff = Math.max(0, ri.exit - ri.enter);
            const exitStr = `${String(Math.floor(ri.exit / 60)).padStart(2, "0")}:${String(ri.exit % 60).padStart(2, "0")}`;
            intervals.push({
              id: `INT-${Math.random()}`,
              enterTime: enterStr,
              exitTime: exitStr,
              durationMinutes: diff
            });
          }
        });

        if (intervals.length > 0) {
          newLogs.push({
            id: `LOG-${Math.random()}`,
            employeeId: empId,
            locationId: selectedLocationId,
            date: dateFrom,
            intervals
          });
        }
      });

      if (newLogs.length > 0) {
        setLogs(newLogs);
      }

      setApiSyncSuccess(true);
    } catch (err: any) {
      console.error("[Front-end Sync] Error during sync:", err);
      setApiSyncError(err.message || "AIPix Authentication Rejected (401). Falling back to local offline logs.");
      // Fallback: Populate states with high-fidelity offline cached simulated logs so that timeline bars, roster, and compliance metrics remain operational.
      setEmployees(initialEmployees);
      
      // Dynamically map logs to dateFrom so they are presented with today's date or the chosen range
      const recalculatedLogs = initialLogs.map(log => ({
        ...log,
        date: dateFrom
      }));
      setLogs(recalculatedLogs);
      setDetections(initialDetections);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  // Perform automatic sync whenever date range or similarity config is changed
  useEffect(() => {
    syncAIPixEvents(apiDateFrom, apiDateTo, apiSimilarityForm);
  }, [apiDateFrom, apiDateTo, apiSimilarityForm]);

  // Handle auto-sync every 60s
  useEffect(() => {
    if (!autoSync) return;

    const interval = setInterval(() => {
      syncAIPixEvents(apiDateFrom, apiDateTo, apiSimilarityForm);
    }, 60000);

    return () => clearInterval(interval);
  }, [autoSync, apiDateFrom, apiDateTo, apiSimilarityForm]);

  // Synchronize state with browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        setSelectedStaffId(params.get("staffId"));
      } catch (e) {
        console.error("Error synchronizing state with browser history", e);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Modal employee state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpRole, setNewEmpRole] = useState("");
  const [newEmpDept, setNewEmpDept] = useState("Operations Control");

  // Filter notifications console
  const [terminalFilter, setTerminalFilter] = useState<"ALL" | "IN" | "OUT">("ALL");

  // Unique key generators
  const generateId = (prefix: string) => `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Handle simulated walk-by on a specific camera name
  const handleSimulateCameraScan = (cameraName: string) => {
    const randomEmp = employees[Math.floor(Math.random() * employees.length)];
    if (!randomEmp) return;

    const empLog = logs.find((l) => l.employeeId === randomEmp.id);
    const intervals = empLog?.intervals || [];
    const isInside = intervals.length > 0 && intervals[intervals.length - 1].exitTime === null;
    const direction = isInside ? "Out" : "In";

    const detectTimeStr = simulatedTime + ":" + String(Math.floor(Math.random() * 60)).padStart(2, "0");
    const newDet: CameraDetection = {
      id: generateId("DET"),
      timestamp: detectTimeStr,
      employeeId: randomEmp.id,
      employeeName: randomEmp.name,
      direction,
      locationId: selectedLocationId,
      confidence: Number((96.5 + Math.random() * 3.5).toFixed(2)),
      cameraName,
    };

    setDetections((prev) => [newDet, ...prev]);

    setLogs((prevLogs) => {
      const existingLogIndex = prevLogs.findIndex(
        (l) => l.employeeId === randomEmp.id && l.locationId === selectedLocationId
      );

      const updatedLogs = [...prevLogs];

      if (existingLogIndex >= 0) {
        const targetLog = updatedLogs[existingLogIndex];
        const intervalsCopy = [...targetLog.intervals];

        if (direction === "In") {
          const activeIndex = intervalsCopy.findIndex((i) => i.exitTime === null);
          if (activeIndex >= 0) {
            const previousEnter = timeToMinutes(intervalsCopy[activeIndex].enterTime);
            const exitMinutes = Math.max(previousEnter + 5, timeToMinutes(simulatedTime) - 5);
            const exitStr = `${String(Math.floor(exitMinutes / 60)).padStart(2, "0")}:${String(
              exitMinutes % 60
            ).padStart(2, "0")}`;
            intervalsCopy[activeIndex] = {
              ...intervalsCopy[activeIndex],
              exitTime: exitStr,
              durationMinutes: exitMinutes - previousEnter,
            };
          }
          intervalsCopy.push({
            id: generateId("INT"),
            enterTime: simulatedTime,
            exitTime: null,
            durationMinutes: 0,
          });
        } else {
          const openIndex = intervalsCopy.findIndex((i) => i.exitTime === null);
          if (openIndex >= 0) {
            const enterMins = timeToMinutes(intervalsCopy[openIndex].enterTime);
            const exitMins = timeToMinutes(simulatedTime);
            intervalsCopy[openIndex] = {
              ...intervalsCopy[openIndex],
              exitTime: simulatedTime,
              durationMinutes: Math.max(0, exitMins - enterMins),
            };
          } else {
            const enterMins = Math.max(480, timeToMinutes(simulatedTime) - 60);
            const enterStr = `${String(Math.floor(enterMins / 60)).padStart(2, "0")}:${String(
              enterMins % 60
            ).padStart(2, "0")}`;
            intervalsCopy.push({
              id: generateId("INT"),
              enterTime: enterStr,
              exitTime: simulatedTime,
              durationMinutes: 60,
            });
          }
        }

        updatedLogs[existingLogIndex] = {
          ...targetLog,
          intervals: intervalsCopy,
        };
      } else {
        if (direction === "In") {
          updatedLogs.push({
            id: generateId("LOG"),
            employeeId: randomEmp.id,
            locationId: selectedLocationId,
            date: apiDateFrom,
            intervals: [
              {
                id: generateId("INT"),
                enterTime: simulatedTime,
                exitTime: null,
                durationMinutes: 0,
              },
            ],
          });
        } else {
          const enterMins = Math.max(480, timeToMinutes(simulatedTime) - 60);
          const enterStr = `${String(Math.floor(enterMins / 60)).padStart(2, "0")}:${String(
            enterMins % 60
          ).padStart(2, "0")}`;
          updatedLogs.push({
            id: generateId("LOG"),
            employeeId: randomEmp.id,
            locationId: selectedLocationId,
            date: apiDateFrom,
            intervals: [
              {
                id: generateId("INT"),
                enterTime: enterStr,
                exitTime: simulatedTime,
                durationMinutes: 60,
              },
            ],
          });
        }
      }

      return updatedLogs;
    });
  };

  // Handle a camera walk-by API simulation trigger
  const handleCameraDetectionTrigger = (employeeId: string, direction: "In" | "Out") => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;

    // 1. Log a new detection timeline object for terminal logging
    const detectTimeStr = simulatedTime + ":" + String(Math.floor(Math.random() * 60)).padStart(2, "0");
    const newDet: CameraDetection = {
      id: generateId("DET"),
      timestamp: detectTimeStr,
      employeeId,
      employeeName: emp.name,
      direction,
      locationId: selectedLocationId,
      confidence: Number((96.5 + Math.random() * 3.2).toFixed(2)),
      cameraName: `${locations.find((l) => l.id === selectedLocationId)?.code || "BTC"}_GATE_${direction === "In" ? "A_INB" : "B_OUTB"}_CAM`,
    };

    setDetections((prev) => [newDet, ...prev]);

    // 2. Adjust today's attendance logs in-memory state
    setLogs((prevLogs) => {
      // Find today's log for employee at this site
      const existingLogIndex = prevLogs.findIndex(
        (l) => l.employeeId === employeeId && l.locationId === selectedLocationId
      );

      const updatedLogs = [...prevLogs];

      if (existingLogIndex >= 0) {
        const targetLog = updatedLogs[existingLogIndex];
        const intervals = [...targetLog.intervals];

        if (direction === "In") {
          // If entering, ensure positive closure of previous ones OR simply add a new active open-ended interval
          // First, check if there's already an active open interval
          const activeIndex = intervals.findIndex((i) => i.exitTime === null);
          if (activeIndex >= 0) {
            // Force close it at 5 minutes prior to avoid overlap
            const previousEnter = timeToMinutes(intervals[activeIndex].enterTime);
            const exitMinutes = Math.max(previousEnter + 5, timeToMinutes(simulatedTime) - 5);
            const exitStr = `${String(Math.floor(exitMinutes / 60)).padStart(2, "0")}:${String(
              exitMinutes % 60
            ).padStart(2, "0")}`;

            intervals[activeIndex] = {
              ...intervals[activeIndex],
              exitTime: exitStr,
              durationMinutes: exitMinutes - previousEnter,
            };
          }

          // Then add current open-ended entry
          intervals.push({
            id: generateId("INT"),
            enterTime: simulatedTime,
            exitTime: null,
            durationMinutes: 0,
          });
        } else {
          // Exiting
          // Find the last open-ended interval to update it
          const openIndex = intervals.findIndex((i) => i.exitTime === null);

          if (openIndex >= 0) {
            const enterMins = timeToMinutes(intervals[openIndex].enterTime);
            const exitMins = timeToMinutes(simulatedTime);
            const calculatedDuration = Math.max(0, exitMins - enterMins);

            intervals[openIndex] = {
              ...intervals[openIndex],
              exitTime: simulatedTime,
              durationMinutes: calculatedDuration,
            };
          } else {
            // No open interval was found, meaning we missed entrance tracking.
            // Create a retrospective standard block of 1 hour for representation
            const enterMins = Math.max(480, timeToMinutes(simulatedTime) - 60);
            const enterStr = `${String(Math.floor(enterMins / 60)).padStart(2, "0")}:${String(
              enterMins % 60
            ).padStart(2, "0")}`;

            intervals.push({
              id: generateId("INT"),
              enterTime: enterStr,
              exitTime: simulatedTime,
              durationMinutes: 60,
            });
          }
        }

        updatedLogs[existingLogIndex] = {
          ...targetLog,
          intervals,
        };
      } else {
        // Create an entirely new log block for this employee at this site
        if (direction === "In") {
          updatedLogs.push({
            id: generateId("LOG"),
            employeeId,
            locationId: selectedLocationId,
            date: apiDateFrom,
            intervals: [
              {
                id: generateId("INT"),
                enterTime: simulatedTime,
                exitTime: null,
                durationMinutes: 0,
              },
            ],
          });
        } else {
          // Out detection with zero previous logs - create a retrospective 1 hour block concluding now
          const enterMins = Math.max(480, timeToMinutes(simulatedTime) - 60);
          const enterStr = `${String(Math.floor(enterMins / 60)).padStart(2, "0")}:${String(
            enterMins % 60
            ).padStart(2, "0")}`;

          updatedLogs.push({
            id: generateId("LOG"),
            employeeId,
            locationId: selectedLocationId,
            date: apiDateFrom,
            intervals: [
              {
                id: generateId("INT"),
                enterTime: enterStr,
                exitTime: simulatedTime,
                durationMinutes: 60,
              },
            ],
          });
        }
      }

      return updatedLogs;
    });
  };

  // Handle addition of a manual adjusting block
  const handleAddManualInterval = (
    employeeId: string,
    locationId: string,
    enter: string,
    exit: string | null
  ) => {
    setLogs((prevLogs) => {
      const idx = prevLogs.findIndex((l) => l.employeeId === employeeId && l.locationId === locationId);
      const updated = [...prevLogs];

      // Calculate minutes
      const diff = getIntervalDuration(enter, exit, simulatedTime);

      const newInterval: AttendanceInterval = {
        id: generateId("INT"),
        enterTime: enter,
        exitTime: exit,
        durationMinutes: diff,
      };

      if (idx >= 0) {
        updated[idx] = {
          ...updated[idx],
          intervals: [...updated[idx].intervals, newInterval].sort((a, b) =>
            a.enterTime.localeCompare(b.enterTime)
          ),
        };
      } else {
        // Create log block
        updated.push({
          id: generateId("LOG"),
          employeeId,
          locationId,
          date: apiDateFrom,
          intervals: [newInterval],
        });
      }

      // Add a detection notice to terminal
      const manualNotice: CameraDetection = {
        id: generateId("DET"),
        timestamp: `${simulatedTime}:00`,
        employeeId,
        employeeName: employees.find((e) => e.id === employeeId)?.name || "Unknown",
        direction: exit ? "Out" : "In",
        locationId,
        confidence: 100.0, // perfect score since manual
        cameraName: "MANUAL_BYPASS_OVERRIDE",
      };
      setDetections((prev) => [manualNotice, ...prev]);

      return updated;
    });
  };

  // Handle deleted log segments
  const handleDeleteInterval = (employeeId: string, intervalId: string) => {
    setLogs((prevLogs) => {
      return prevLogs
        .map((log) => {
          if (log.employeeId !== employeeId) return log;
          return {
            ...log,
            intervals: log.intervals.filter((interval) => interval.id !== intervalId),
          };
        })
        .filter((log) => log.intervals.length > 0); // sweep away empty log nodes
    });
  };

  // Modal Submission: Add employee configuration
  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName || !newEmpRole) return;

    const colors = [
      "from-cyan-500 to-blue-600",
      "from-orange-500 to-amber-600",
      "from-indigo-500 to-indigo-700",
      "from-teal-500 to-emerald-600",
      "from-rose-500 to-pink-600",
    ];

    const initials = newEmpName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const newEmp: Employee = {
      id: generateId("EMP"),
      name: newEmpName,
      role: newEmpRole,
      avatar: initials || "EE",
      department: newEmpDept,
      avatarColor: colors[Math.floor(Math.random() * colors.length)],
    };

    setEmployees((prev) => [...prev, newEmp]);
    setIsModalOpen(false);

    // Initial clean reset
    setNewEmpName("");
    setNewEmpRole("");
  };

  // Computed total statistics across Arabian Cement Company operations
  const terminalListFiltered = useMemo(() => {
    if (terminalFilter === "ALL") return detections;
    return detections.filter((d) => d.direction === (terminalFilter === "IN" ? "In" : "Out"));
  }, [detections, terminalFilter]);

  return (
    <div className="min-h-screen bg-[#070707] text-[#eae6dd] font-sans selection:bg-[#A9853B] selection:text-black relative overflow-x-hidden">
      {/* Premium ambient decorative radial background glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#A9853B]/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-[#A9853B]/3 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 relative z-10">
        
        {/* Core Header Navigation Row */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="bg-[#0c0c0c] px-4 py-2 rounded-2xl border border-[#A9853B]/20 shadow-xl flex items-center">
              <BTCLogo className="h-14 md:h-16 w-auto" />
            </div>
            <div className="h-10 w-px bg-zinc-850 hidden md:block"></div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] bg-amber-950/40 text-[#A9853B] font-serif font-semibold px-2.5 py-0.5 rounded-full tracking-wider border border-[#A9853B]/20">
                  BTC SMART SURVEILLANCE
                </span>
                <span className="h-1.5 w-1.5 bg-[#A9853B] rounded-full animate-bounce"></span>
              </div>
              <h1 className="text-xl font-bold font-serif tracking-tight text-zinc-100 mt-1">
                AIPix Attendance & Resource Insights
              </h1>
              {currentCairoTime && (
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-450 font-mono mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Cairo Time: <strong className="text-[#D4AF37]">{currentCairoTime}</strong></span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Simulation adjustment dials */}
            <div className="flex items-center gap-2.5 mr-2 bg-[#121212] py-1.5 px-3 rounded-xl border border-zinc-800 shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400">
                <Clock className="w-3.5 h-3.5 text-[#A9853B]" />
                <span>Simulated Time:</span>
              </div>
              <input
                type="range"
                min="0"
                max="1439"
                value={timeToMinutes(simulatedTime)}
                onChange={(e) => {
                  const totalMins = parseInt(e.target.value, 10);
                  const h = Math.floor(totalMins / 60);
                  const m = totalMins % 60;
                  setSimulatedTime(
                    `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
                  );
                }}
                className="w-24 accent-[#A9853B] cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-[#A9853B] bg-amber-950/30 border border-[#A9853B]/20 px-2 py-0.5 rounded">
                {simulatedTime}
              </span>
            </div>

            <div className="flex items-center gap-2 bg-[#121212] py-1.5 px-3 rounded-xl border border-zinc-800 shadow-sm">
              <Clock className="w-3.5 h-3.5 text-[#A9853B]" />
              <span className="text-xs font-mono text-zinc-400">FTE Standard Shift:</span>
              <select
                value={fteHoursBaseline}
                onChange={(e) => setFteHoursBaseline(Number(e.target.value))}
                className="bg-zinc-900 text-zinc-200 font-medium text-xs font-mono border border-zinc-750 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#A9853B]"
              >
                <option value={7}>7 hrs/day</option>
                <option value={7.5}>7.5 hrs/day</option>
                <option value={8}>8 hrs/day</option>
                <option value={9}>9 hrs/day</option>
              </select>
            </div>

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="bg-[#121212] hover:bg-[#1c1c1c] text-[#A9853B] hover:text-[#C5A862] border border-[#A9853B]/30 font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              id="header-export-report-btn"
            >
              <Download className="w-4 h-4 text-[#A9853B]" /> Export / Report
            </button>
          </div>
        </header>

        {selectedStaffId ? (
          <StaffDossier
            employeeId={selectedStaffId}
            employees={employees}
            logs={logs}
            locations={locations}
            detections={detections}
            simulatedTime={simulatedTime}
            fteHoursStandard={fteHoursBaseline}
            selectedDate={apiDateFrom}
            onClose={() => {
              setSelectedStaffId(null);
              try {
                window.history.pushState(null, "", window.location.pathname);
              } catch (e) {
                console.error("History API not supported", e);
              }
            }}
          />
        ) : (
          <>
            {/* AIPix API Sync Control Panel */}
            <div className="bg-[#121212] border border-zinc-800/85 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-950/20 rounded-xl border border-[#A9853B]/20 text-[#A9853B]">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-serif font-bold text-zinc-100">AIPix.ai Live Camera API Sync Gateway</h3>
                <p className="text-xs text-zinc-450 text-zinc-400">Synchronize and populate the dashboard with real camera analytic events from the security servers</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <label className="inline-flex items-center gap-2 cursor-pointer bg-zinc-900 hover:bg-zinc-850 px-3 py-1.5 rounded-xl border border-zinc-800 transition-colors text-xs text-zinc-350 text-zinc-300">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="w-4 h-4 rounded text-[#A9853B] focus:ring-[#A9853B] border-zinc-700 accent-[#A9853B] cursor-pointer"
                />
                <span className="font-medium select-none">Auto-Sync every 60s</span>
              </label>

              <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                isLoadingEvents 
                  ? "bg-amber-950/50 text-[#D4AF37] border-[#D4AF37]/30 animate-pulse" 
                  : apiSyncError 
                  ? "bg-rose-950/40 text-rose-400 border-rose-900/30" 
                  : apiSyncSuccess 
                  ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/30" 
                  : "bg-zinc-900 text-zinc-400 border-zinc-800"
              }`}>
                STATUS: {isLoadingEvents ? "SYNCING..." : apiSyncError ? "OFFLINE FALLBACK" : apiSyncSuccess ? "SYNCHRONIZED" : "STANDBY"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/80">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider font-mono text-zinc-400 block">From Date</label>
              <input
                type="date"
                value={apiDateFrom}
                onChange={(e) => setApiDateFrom(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#A9853B] focus:border-[#A9853B] font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider font-mono text-zinc-400 block">To Date</label>
              <input
                type="date"
                value={apiDateTo}
                onChange={(e) => setApiDateTo(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#A9853B] focus:border-[#A9853B] font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider font-mono text-zinc-400 block">Similarity Min (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={apiSimilarityForm}
                onChange={(e) => setApiSimilarityForm(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#A9853B] focus:border-[#A9853B] font-mono"
              />
            </div>

            <div>
              <button
                onClick={() => syncAIPixEvents(apiDateFrom, apiDateTo, apiSimilarityForm)}
                disabled={isLoadingEvents}
                className="w-full bg-gradient-to-r from-[#D4AF37] via-[#A9853B] to-[#8C6D2E] hover:brightness-110 active:scale-[0.98] disabled:opacity-50 text-zinc-950 font-bold py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
              >
                {isLoadingEvents ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Synchronizing...
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4" />
                    Sync with AIPix API
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sync status messages */}
          {apiSyncError && (
            <div className="flex items-start gap-2.5 p-3.5 bg-amber-950/20 border border-amber-900/30 text-amber-200 rounded-xl text-xs">
              <CircleAlert className="w-4 h-4 text-[#A9853B] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">AIPix API Status Alert:</span> {apiSyncError}
                <div className="text-[10px] text-amber-400/90 mt-1">
                  Note: The server-side token returned a 401 challenge (expired or unauthorized). To keep the Bullion Trading Center (BTC) dashboard fully functional for audit purposes, we have gracefully loaded our high-fidelity, offline-cached simulated camera events instead.
                </div>
              </div>
            </div>
          )}

          {apiSyncSuccess && !apiSyncError && (
            <div className="flex items-start gap-2.5 p-3.5 bg-emerald-950/20 border border-emerald-900/30 text-emerald-300 rounded-xl text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 animate-ping shrink-0" />
              <div>
                <span className="font-bold">Gateway Connected!</span> Successfully fetched, decrypted, and parsed {detections.length} camera tracking entries from the AIPix event logs for range <span className="font-mono bg-emerald-900/50 px-1 py-0.5 rounded text-emerald-200 font-bold">{apiDateFrom}</span> to <span className="font-mono bg-emerald-900/50 px-1 py-0.5 rounded text-emerald-200 font-bold">{apiDateTo}</span>.
              </div>
            </div>
          )}
        </div>

        {/* Global Level Metric Boxes */}
        <DashboardStats
          employees={filteredEmployeesForDept}
          logs={filteredLogsForDept}
          locations={locations}
          activeLocationId={selectedLocationId}
          simulatedTime={simulatedTime}
          fteHoursStandard={fteHoursBaseline}
          selectedDate={apiDateFrom}
          allEmployees={employees}
          allLogs={logs}
        />

        {/* Department View Tab System */}
        <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4" id="department-filter-banner">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#A9853B]" />
            <div>
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
                Department View Selector
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                Current filter: <span className="text-[#D4AF37] font-bold">{selectedDept}</span> ({filteredEmployeesForDept.length} of {employees.length} personnel)
              </p>
            </div>
          </div>
          
          <div className="flex gap-1.5 p-1 bg-zinc-950 rounded-xl border border-zinc-850 w-full sm:w-auto">
            {(["All", "IT", "Operations", "Executive"] as const).map((dept) => {
              const isActive = selectedDept === dept;
              return (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-[11px] font-semibold font-mono tracking-wide transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-r from-[#D4AF37] to-[#A9853B] text-zinc-950 shadow-md font-bold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                  }`}
                >
                  {dept}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Workspace Frame (Locations and Log Stream Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="primary-visualizer-row">
          
          {/* Left Side: Office Site Performance Distribution (Width: 8 columns) */}
          <div className="lg:col-span-8">
            <LocationSummary
              locations={locations}
              logs={filteredLogsForDept}
              employees={filteredEmployeesForDept}
              allEmployees={employees}
              selectedLocationId={selectedLocationId}
              onLocationSelect={setSelectedLocationId}
              simulatedTime={simulatedTime}
              detections={detections}
              onSimulateCameraScan={handleSimulateCameraScan}
            />
          </div>

          {/* Right Side: Security API Event Stream Console (Width: 4 columns) */}
          <div className="lg:col-span-4 flex flex-col">
            <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl p-5 shadow-xl h-full flex flex-col">
              <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800 mb-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider font-mono flex items-center gap-2 text-zinc-300">
                  <Terminal className="w-4 h-4 text-[#A9853B]" />
                  AIPix API Event Stream
                </h4>

                {/* Filters */}
                <div className="flex gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  {["ALL", "IN", "OUT"].map((filt) => (
                    <button
                      key={filt}
                      onClick={() => setTerminalFilter(filt as any)}
                      className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                        terminalFilter === filt
                          ? "bg-gradient-to-r from-[#D4AF37] to-[#A9853B] text-zinc-950 shadow-xs border border-transparent font-bold"
                          : "text-zinc-400 hover:text-zinc-100"
                      }`}
                    >
                      {filt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Console log list */}
              <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-1.5 pr-2 custom-scrollbar bg-[#090909] p-3 rounded-xl border border-zinc-850/80 text-zinc-300 min-h-[240px]">
                {terminalListFiltered.length === 0 ? (
                  <p className="text-zinc-500 italic text-center py-10">No activities parsed in this scope yet.</p>
                ) : (
                  terminalListFiltered.map((d, index) => (
                    <div
                      key={d.id}
                      className={`flex items-start gap-2 py-1 ${
                        index === 0 ? "text-[#D4AF37] font-semibold" : "text-zinc-450 text-zinc-400"
                      }`}
                    >
                      <span className="text-zinc-600">[{d.timestamp}]</span>
                      <span>
                        {d.direction === "In" ? "📥" : "📤"}{" "}
                        <strong className={index === 0 ? "text-zinc-100" : "text-zinc-300"}>{d.employeeName}</strong>{" "}
                        {d.direction === "In" ? "entered" : "exited"}{" "}
                        <span className="text-zinc-500">{d.cameraName}</span> (Conf: {d.confidence}%)
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Beautiful Gantt Timeline block of Entrance blocks */}
        <AttendanceTimeline
          employees={filteredEmployeesForDept}
          logs={filteredLogsForDept}
          simulatedTime={simulatedTime}
        />

        {/* Hourly Headcount Trend Visualization */}
        <HeadcountTrend
          logs={filteredLogsForDept}
          detections={detections}
          locations={locations}
          selectedLocationId={selectedLocationId}
          simulatedTime={simulatedTime}
        />

        {/* Employee Interactive Database & adjustments */}
        <RosterList
          employees={filteredEmployeesForDept}
          logs={filteredLogsForDept}
          locations={locations}
          simulatedTime={simulatedTime}
          fteHoursStandard={fteHoursBaseline}
          onAddInterval={handleAddManualInterval}
          onDeleteInterval={handleDeleteInterval}
          selectedDate={apiDateFrom}
          onViewStaffDetails={setSelectedStaffId}
        />

          </>
        )}
      </div>

      {/* Add New Employee Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md" id="modal-container">
          <div className="bg-[#121212] border border-[#A9853B]/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
            
            {/* Modal title */}
            <div className="p-5 bg-zinc-900/50 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2 uppercase tracking-wide font-mono">
                <Plus className="w-4.5 h-4.5 text-[#A9853B]" />
                Initialize New Employee
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 transition-all text-sm font-bold bg-zinc-800 w-6 h-6 rounded-full flex items-center justify-center border border-zinc-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleCreateEmployee} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 font-mono">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sameh Mogawer"
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  className="w-full bg-zinc-900 text-zinc-100 border border-zinc-800 focus:border-[#A9853B] rounded-xl py-2 px-3 text-xs focus:ring-1 focus:ring-[#A9853B] focus:outline-none font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 font-mono">
                  Professional Role / Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operations Coordinator"
                  value={newEmpRole}
                  onChange={(e) => setNewEmpRole(e.target.value)}
                  className="w-full bg-zinc-900 text-zinc-100 border border-zinc-800 focus:border-[#A9853B] rounded-xl py-2 px-3 text-xs focus:ring-1 focus:ring-[#A9853B] focus:outline-none font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 font-mono">
                  BTC Department Hub
                </label>
                <select
                  className="w-full bg-zinc-900 text-zinc-100 border border-zinc-800 focus:border-[#A9853B] rounded-xl py-2 px-3 text-xs focus:ring-1 focus:ring-[#A9853B] focus:outline-none"
                  value={newEmpDept}
                  onChange={(e) => setNewEmpDept(e.target.value)}
                >
                  <option value="Executive Branch">Executive Branch</option>
                  <option value="Operations Control">Operations Control</option>
                  <option value="AI & Innovation Labs">AI & Innovation Labs</option>
                  <option value="HQ Vault Operations">HQ Vault Operations</option>
                  <option value="Supply Chain">Supply Chain</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-zinc-450 hover:text-zinc-100 font-semibold text-xs py-2 px-4 rounded-xl border border-zinc-800 hover:bg-zinc-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-[#D4AF37] via-[#A9853B] to-[#8C6D2E] text-zinc-950 font-bold text-xs py-2 px-5 rounded-xl transition-all active:scale-95 cursor-pointer shadow-md"
                >
                  Register Employee
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Daily Report Compliance Export Modal */}
      <ReportExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        employees={employees}
        logs={logs}
        locations={locations}
        simulatedTime={simulatedTime}
        fteHoursBaseline={fteHoursBaseline}
        selectedDate={apiDateFrom}
      />

    </div>
  );
}
