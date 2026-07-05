/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from "react";
import { X, FileSpreadsheet, Printer, Download, Shield, Clock, TrendingUp, Users, CheckCircle } from "lucide-react";
import { Employee, AttendanceLog, OfficeLocation } from "../types";
import { getEmployeeAttendanceStats, generateCSV, triggerCSVDownload } from "../utils/exportUtils";
import { formatMinutesToDuration } from "../data/mockData";

interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  logs: AttendanceLog[];
  locations: OfficeLocation[];
  simulatedTime: string;
  fteHoursBaseline: number;
  selectedDate?: string;
}

export default function ReportExportModal({
  isOpen,
  onClose,
  employees,
  logs,
  locations,
  simulatedTime,
  fteHoursBaseline,
  selectedDate = "Today",
}: ReportExportModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Compute stats for summary card
  const fteMinutesStandard = fteHoursBaseline * 60;
  
  const totalMinutes = logs.reduce((sum, log) => {
    const logSum = log.intervals.reduce((lSum, interval) => {
      const enterM = parseInt(interval.enterTime.split(":")[0]) * 60 + parseInt(interval.enterTime.split(":")[1]);
      if (interval.exitTime) {
        const exitM = parseInt(interval.exitTime.split(":")[0]) * 60 + parseInt(interval.exitTime.split(":")[1]);
        return lSum + (exitM - enterM);
      } else {
        const simulatedM = parseInt(simulatedTime.split(":")[0]) * 60 + parseInt(simulatedTime.split(":")[1]);
        const diff = simulatedM - enterM;
        return lSum + (diff > 0 ? diff : 0);
      }
    }, 0);
    return sum + logSum;
  }, 0);

  const rawGlobalFTE = totalMinutes / fteMinutesStandard;
  const globalCalculatedFTE = Number(rawGlobalFTE.toFixed(2));

  const totalInside = employees.reduce((count, emp) => {
    const stats = getEmployeeAttendanceStats(emp, logs, locations, simulatedTime);
    return stats.isInside ? count + 1 : count;
  }, 0);

  // Trigger CSV export
  const handleCSVExport = () => {
    const csvContent = generateCSV(employees, logs, locations, simulatedTime, fteHoursBaseline);
    triggerCSVDownload(csvContent, `btc_attendance_report_fte_${fteHoursBaseline}h.csv`);
  };

  // Trigger browser print
  const handlePrint = () => {
    const printContent = printAreaRef.current?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to generate print-preview reports.");
      return;
    }

    // Write a beautiful, printer-friendly layout structure with BTC gold branding accents
    printWindow.document.write(`
      <html>
        <head>
          <title>Bullion Trading Center (BTC) - Attendance & FTE Daily Report</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #1a1a1a;
              background-color: #ffffff;
              padding: 40px;
              margin: 0;
            }
            .header-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
              border-bottom: 2px solid #A9853B;
              padding-bottom: 20px;
            }
            .title {
              font-family: 'Playfair Display', serif;
              font-size: 24px;
              font-weight: 700;
              color: #111111;
              margin: 0;
              letter-spacing: -0.01em;
            }
            .subtitle {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: #A9853B;
              font-weight: 700;
              margin-bottom: 4px;
            }
            .meta-grid {
              display: grid;
              grid-template-cols: repeat(4, 1fr);
              gap: 16px;
              margin-bottom: 30px;
            }
            .meta-card {
              background-color: #faf9f6;
              border: 1px solid #e5dfd5;
              border-radius: 8px;
              padding: 12px 16px;
            }
            .meta-label {
              font-size: 10px;
              font-weight: 600;
              color: #7f7564;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-bottom: 4px;
            }
            .meta-value {
              font-size: 16px;
              font-weight: 700;
              color: #111111;
            }
            .meta-value-highlight {
              color: #A9853B;
            }
            table.data-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
            }
            table.data-table th {
              background-color: #f7f5f0;
              border-bottom: 2px solid #e5dfd5;
              color: #5c5344;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              padding: 10px 12px;
              text-align: left;
            }
            table.data-table td {
              border-bottom: 1px solid #edeae4;
              padding: 12px;
              font-size: 12px;
              color: #2c271e;
            }
            table.data-table tr:nth-child(even) {
              background-color: #fdfdfc;
            }
            .badge {
              display: inline-block;
              padding: 2px 6px;
              font-size: 10px;
              font-weight: 650;
              border-radius: 4px;
              font-family: 'JetBrains Mono', monospace;
            }
            .badge-inside {
              background-color: #fcf6e8;
              color: #A9853B;
              border: 1px solid #f3e5c8;
            }
            .badge-outside {
              background-color: #f1f5f9;
              color: #475569;
            }
            .mono {
              font-family: 'JetBrains Mono', monospace;
              font-size: 11px;
            }
            .bold {
              font-weight: 600;
            }
            .footer-notes {
              margin-top: 50px;
              font-size: 11px;
              color: #7f7564;
              line-height: 1.6;
              border-top: 1px dashed #e5dfd5;
              padding-top: 20px;
            }
            .signature-container {
              display: grid;
              grid-template-cols: repeat(2, 1fr);
              gap: 80px;
              margin-top: 60px;
            }
            .signature-box {
              border-top: 1px solid #a89f8d;
              text-align: center;
              padding-top: 8px;
              font-size: 12px;
              font-weight: 500;
              color: #2c271e;
            }
            .signature-title {
              font-size: 10px;
              color: #7f7564;
              margin-top: 2px;
            }
            @media print {
              body {
                padding: 10px;
              }
              button {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto" id="export-modal-overlay">
      <div className="bg-[#121212] border border-zinc-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col my-8 max-h-[90vh] animate-in fade-in zoom-in duration-150">
        
        {/* Header toolbar */}
        <div className="p-5 bg-zinc-950 border-b border-zinc-850 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 px-2.5 rounded-lg bg-amber-950/40 border border-[#A9853B]/20 text-[#A9853B] font-bold uppercase text-[10px] tracking-wider font-mono">
              Compliance Hub
            </div>
            <h3 className="text-sm font-bold text-zinc-100 font-serif">
              Daily Attendance & Operations FTE Report
            </h3>
          </div>
          
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 transition-all text-xs font-bold bg-zinc-900 hover:bg-zinc-800 w-7 h-7 rounded-full flex items-center justify-center border border-zinc-800 cursor-pointer"
            id="close-export-modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Workspace */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-950">
          
          {/* Action Callouts */}
          <div className="mb-5 bg-gradient-to-r from-zinc-900 to-zinc-950 border border-[#A9853B]/30 rounded-2xl p-5 text-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div>
              <p className="text-[#A9853B] text-xs font-mono font-semibold uppercase tracking-wider">
                Verification Ready
              </p>
              <h4 className="text-base font-bold font-serif mt-0.5 text-zinc-100">
                Ready to Export Approved Daily Attendance Roster
              </h4>
              <p className="text-zinc-400 text-xs mt-1 max-w-xl">
                Generated from AIPix Core video analytics for date <strong>{selectedDate}</strong>. This report computes raw check-in durations and compliant FTE yields.
              </p>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleCSVExport}
                className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[#eae6dd] font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                id="export-csv-btn"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#A9853B]" /> Export CSV Sheet
              </button>
              
              <button
                onClick={handlePrint}
                className="bg-gradient-to-r from-[#D4AF37] to-[#A9853B] text-zinc-950 font-extrabold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer hover:brightness-115"
                id="export-pdf-print-btn"
              >
                <Printer className="w-4 h-4 text-zinc-950" /> Print / Save PDF
              </button>
            </div>
          </div>

          {/* Interactive Document Card Preview */}
          <div className="bg-[#121212] rounded-2xl border border-zinc-800 shadow-xl p-8 max-w-3xl mx-auto overflow-x-auto">
            
            {/* The printable block referenced by print function */}
            <div ref={printAreaRef} className="min-w-[650px] text-zinc-100 leading-normal font-sans">
              
              {/* Document Logo & Brand Header */}
              <div className="flex items-center justify-between border-b-2 border-[#A9853B] pb-5 mb-5">
                <div>
                  <div className="text-[10px] font-bold tracking-wider text-[#A9853B] uppercase font-mono mb-0.5">
                    Bullion Trading Center (BTC)
                  </div>
                  <h2 className="text-xl font-extrabold tracking-tight text-zinc-100 uppercase font-serif">
                    AIPix Attendance & Compliance Review
                  </h2>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">
                    Security Perimeter Live Tracking Log Summary Sheet
                  </p>
                </div>
                
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[#A9853B] bg-amber-950/40 border border-[#A9853B]/20 px-3 py-1 rounded-lg">
                    <Shield className="w-3.5 h-3.5" /> OFFICIAL DOCUMENT
                  </span>
                  <p className="text-[10px] text-zinc-500 font-mono mt-1.5">
                    DocRef: BTC-AIP-2026-16104
                  </p>
                </div>
              </div>

              {/* Compliance Dials Grid */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                  <div className="text-[9px] font-bold text-zinc-400 font-mono uppercase tracking-wider">
                    Reporting Day
                  </div>
                  <div className="text-sm font-extrabold text-zinc-200 font-mono mt-0.5">
                    {selectedDate}
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                  <div className="text-[9px] font-bold text-zinc-400 font-mono uppercase tracking-wider">
                    Total Inspected
                  </div>
                  <div className="text-sm font-extrabold text-zinc-200 font-mono mt-0.5">
                    {employees.length} Personnel
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                  <div className="text-[9px] font-bold text-zinc-400 font-mono uppercase tracking-wider">
                    Shift Baseline
                  </div>
                  <div className="text-sm font-extrabold text-zinc-200 font-mono mt-0.5">
                    {fteHoursBaseline} hrs/day
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                  <div className="text-[9px] font-bold text-zinc-400 font-mono uppercase tracking-wider">
                    Operations FTE
                  </div>
                  <div className="text-sm font-extrabold text-[#D4AF37] font-mono mt-0.5">
                    {globalCalculatedFTE} FTE
                  </div>
                </div>
              </div>

              {/* Attendance Sheet Table */}
              <div className="mb-6">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b-2 border-zinc-800 bg-zinc-900">
                      <th className="py-2.5 px-3 font-semibold text-zinc-300 uppercase font-mono text-[10px] tracking-wider">Subject</th>
                      <th className="py-2.5 px-3 font-semibold text-zinc-300 uppercase font-mono text-[10px] tracking-wider">Role & Department</th>
                      <th className="py-2.5 px-3 font-semibold text-zinc-300 uppercase font-mono text-[10px] tracking-wider">Perimeter Status</th>
                      <th className="py-2.5 px-3 font-semibold text-zinc-300 uppercase font-mono text-[10px] tracking-wider">Recorded Segments</th>
                      <th className="py-2.5 px-3 font-semibold text-zinc-300 uppercase font-mono text-[10px] tracking-wider text-right">Sum Time (FTE)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850">
                    {employees.map((emp) => {
                      const stats = getEmployeeAttendanceStats(emp, logs, locations, simulatedTime);
                      const individualFTE = (stats.cumulativeMinutes / fteMinutesStandard).toFixed(3);

                      return (
                        <tr key={emp.id} className="hover:bg-zinc-900/30">
                          <td className="py-3 px-3">
                            <span className="font-bold text-zinc-100 font-serif">{emp.name}</span>
                            <div className="text-[10px] text-zinc-550 text-zinc-500 font-mono font-medium mt-0.5">{emp.id}</div>
                          </td>
                          <td className="py-3 px-3 text-zinc-300">
                            <strong>{emp.role}</strong>
                            <div className="text-[10px] text-[#A9853B] font-medium mt-0.5">{emp.department}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              stats.isInside 
                                ? "bg-amber-950/40 text-[#D4AF37] border border-[#A9853B]/20" 
                                : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                            }`}>
                              {stats.isInside ? "Inside Core" : "Outside"}
                            </span>
                            <div className="text-[9px] text-zinc-400 font-mono mt-1 font-medium truncate max-w-[150px]">
                              {stats.isInside ? stats.currentLocName.replace("BTC ", "") : "Perimeter exit"}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-[10px] text-zinc-400 leading-relaxed">
                            {stats.intervals.length === 0 ? (
                              <span className="text-zinc-600 italic">No access logs today</span>
                            ) : (
                              stats.intervals.map((int, i) => (
                                <div key={int.id}>
                                  [{i + 1}] {int.enterTime} - {int.exitTime || "Inside (inc.)"}
                                </div>
                              ))
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="font-mono font-bold text-zinc-100">
                              {formatMinutesToDuration(stats.cumulativeMinutes)}
                            </span>
                            <div className="text-[10px] text-[#D4AF37] font-semibold font-mono mt-0.5">
                              {individualFTE} FTE
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Compliance & Standard Boilerplate details */}
              <div className="border-t border-zinc-800 pt-5 mt-6 text-[11px] text-zinc-400 leading-relaxed font-sans">
                <h4 className="font-bold text-zinc-300 text-xs flex items-center gap-1.5 mb-2.5 font-mono uppercase tracking-wide">
                  🛡️ System Validation & Compliance Disclaimer
                </h4>
                <p>
                  This attendance log sheet compiles continuous edge surveillance streams processed under the AIPix AI-Model algorithms at the Bullion Trading Center (BTC) secure networks. The Full Time Equivalent (FTE) calculations standardly map recorded vault and corp minutes against the declared shift index framework (<strong>{fteHoursBaseline} hours worked is standard 1.000 FTE</strong>). Manual checkpoints or adjustments added via console overrides are flagged inside the master database and logged under auditor security tokens for compliance tracking.
                </p>
                <p className="mt-1.5 font-mono text-[10px] text-zinc-500">
                  Data generated at: {selectedDate} {simulatedTime} (Cairo Time) | Compliance Code: BTC-AIP-SL-904 || Platform: AI Studio Build Ecosystem
                </p>
              </div>

              {/* Official Signature Lines */}
              <div className="grid grid-cols-2 gap-12 mt-12 pt-6">
                <div className="border-t border-zinc-800 text-center pt-2.5">
                  <div className="text-xs font-semibold text-zinc-200">BTC Operations Director</div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5">Chief Technology Officer & Tech Director</div>
                  <div className="text-[9px] text-zinc-500 mt-1">BTC HQ Technical Operations Lead</div>
                </div>
                
                <div className="border-t border-zinc-800 text-center pt-2.5">
                  <div className="text-xs font-semibold text-zinc-200">HQ Systems Auditor</div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5">Compliance Integrity Division</div>
                  <div className="text-[9px] text-zinc-500 mt-1">Bullion Trading Center (BTC) (SAE)</div>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Footer toolbar inside Modal wrapper */}
        <div className="p-5 border-t border-zinc-850 bg-zinc-950 flex items-center justify-between shrink-0 text-zinc-400">
          <p className="text-[11px] text-zinc-400 font-mono font-medium">
            Bullion Trading Center (BTC) &copy; 2026 System Log Reporting Engine
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-zinc-400 hover:text-zinc-100 font-bold text-xs rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleCSVExport}
              className="bg-zinc-900 border border-zinc-800 text-[#D4AF37] hover:bg-zinc-800 font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Download Spreadsheet
            </button>
            <button
              onClick={handlePrint}
              className="bg-gradient-to-r from-[#D4AF37] to-[#A9853B] text-zinc-950 font-extrabold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer hover:brightness-110 active:scale-95"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-950" /> Laser Print / Save PDF
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
