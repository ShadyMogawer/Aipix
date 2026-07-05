import { Employee, AttendanceLog } from "../types";
import { timeToMinutes, isIntervalActiveAtTime } from "../data/mockData";

/**
 * Filter employees based on the selected department and predefined rules.
 */
export function filterEmployeesByDept(employees: Employee[], selectedDept: string): Employee[] {
  return employees.filter(emp => {
    if (selectedDept === "All") return true;
    const empDept = (emp.department || "").toLowerCase();
    const empRole = (emp.role || "").toLowerCase();
    
    if (selectedDept === "IT") {
      return (
        empDept.includes("it") ||
        empDept.includes("lab") ||
        empDept.includes("tech") ||
        empDept.includes("system") ||
        empDept.includes("innovation") ||
        empRole.includes("it") ||
        empRole.includes("tech") ||
        empRole.includes("vision") ||
        empRole.includes("engineer") ||
        empRole.includes("developer")
      );
    }
    if (selectedDept === "Operations") {
      return (
        empDept.includes("operations") ||
        empDept.includes("control") ||
        empDept.includes("supply") ||
        empDept.includes("chain") ||
        empDept.includes("logistics") ||
        empDept.includes("vault") ||
        empRole.includes("operations") ||
        empRole.includes("auditor") ||
        empRole.includes("coordinator") ||
        empRole.includes("logistics")
      );
    }
    if (selectedDept === "Executive") {
      return (
        empDept.includes("executive") ||
        empDept.includes("board") ||
        empDept.includes("management") ||
        empRole.includes("chief") ||
        empRole.includes("cto") ||
        empRole.includes("ceo") ||
        empRole.includes("executive") ||
        empRole.includes("director") ||
        empRole.includes("manager")
      );
    }
    return false;
  });
}

export interface EmployeeMetrics {
  totalRegistered: number;
  activeInside: number;
  filteredEmployees: Employee[];
  filteredLogs: AttendanceLog[];
}

/**
 * Derives consistent registered and active counts based on the department filter and simulated time.
 */
export function getEmployeeMetrics(
  employees: Employee[],
  logs: AttendanceLog[],
  selectedDept: string,
  simulatedTime: string
): EmployeeMetrics {
  const filteredEmployees = filterEmployeesByDept(employees, selectedDept);
  const allowedEmpIds = new Set(filteredEmployees.map(e => e.id));
  const filteredLogs = logs.filter(log => allowedEmpIds.has(log.employeeId));

  const activeInside = filteredLogs.reduce((count, log) => {
    const isInside = log.intervals.some((interval) => {
      return isIntervalActiveAtTime(interval.enterTime, interval.exitTime, simulatedTime);
    });
    return isInside ? count + 1 : count;
  }, 0);

  return {
    totalRegistered: filteredEmployees.length,
    activeInside,
    filteredEmployees,
    filteredLogs
  };
}
