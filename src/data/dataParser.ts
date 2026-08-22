import Papa from 'papaparse';
import { EmployeeRecord, PayrollKPIs } from '../types';
import { INITIAL_CSV_DATA } from './rawCsv';

export function parseCSV(csvString: string): EmployeeRecord[] {
  const result = Papa.parse(csvString.trim(), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  const records: EmployeeRecord[] = [];

  (result.data as Record<string, string>[]).forEach((row, index) => {
    // Handle potential column variations
    const department = (row['Department'] || row['department'] || row['Dept'] || 'OTHER').trim();
    const departmentName = (row['Department_Name'] || row['Department Name'] || row['departmentName'] || department).trim();
    const division = (row['Division'] || row['division'] || 'General').trim();
    const gender = (row['Gender'] || row['gender'] || 'U').trim().toUpperCase();
    
    const parseNumber = (val: any): number => {
      if (val === undefined || val === null || val === '') return 0;
      const clean = String(val).replace(/[$,\s]/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    };

    const baseSalary = parseNumber(row['Base_Salary'] || row['Base Salary'] || row['baseSalary'] || row['Salary']);
    const overtimePay = parseNumber(row['Overtime_Pay'] || row['Overtime Pay'] || row['overtimePay'] || row['Overtime']);
    const longevityPay = parseNumber(row['Longevity_Pay'] || row['Longevity Pay'] || row['longevityPay'] || row['Longevity']);
    const grade = (row['Grade'] || row['grade'] || 'N/A').trim();
    const totalCompensation = Number((baseSalary + overtimePay + longevityPay).toFixed(2));

    records.push({
      id: `REC-${String(index + 1).padStart(4, '0')}`,
      department,
      departmentName,
      division,
      gender: gender === 'M' || gender === 'F' ? gender : (gender ? gender : 'Other'),
      baseSalary: Number(baseSalary.toFixed(2)),
      overtimePay: Number(overtimePay.toFixed(2)),
      longevityPay: Number(longevityPay.toFixed(2)),
      grade: grade === 'NULL' || !grade ? 'Unassigned' : grade,
      totalCompensation,
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });
  });

  return records;
}

export function getInitialRecords(): EmployeeRecord[] {
  return parseCSV(INITIAL_CSV_DATA);
}

export function calculateKPIs(records: EmployeeRecord[]): PayrollKPIs {
  const totalHeadcount = records.length;
  if (totalHeadcount === 0) {
    return {
      totalHeadcount: 0,
      totalPayroll: 0,
      totalBaseSalary: 0,
      totalOvertimePay: 0,
      totalLongevityPay: 0,
      avgBaseSalary: 0,
      medianBaseSalary: 0,
      avgOvertimePay: 0,
      overtimePercentage: 0,
      maleCount: 0,
      femaleCount: 0,
      maleAvgSalary: 0,
      femaleAvgSalary: 0,
      genderPayRatio: 100,
      topDepartment: { name: 'None', totalPay: 0, count: 0 },
      topOvertimeDept: { name: 'None', overtime: 0 },
    };
  }

  let totalBaseSalary = 0;
  let totalOvertimePay = 0;
  let totalLongevityPay = 0;
  let totalPayroll = 0;

  let maleCount = 0;
  let maleBaseTotal = 0;
  let femaleCount = 0;
  let femaleBaseTotal = 0;

  const deptMap: Record<string, { totalPay: number; overtime: number; count: number; name: string }> = {};
  const baseSalaries: number[] = [];

  records.forEach((r) => {
    totalBaseSalary += r.baseSalary;
    totalOvertimePay += r.overtimePay;
    totalLongevityPay += r.longevityPay;
    totalPayroll += r.totalCompensation;

    baseSalaries.push(r.baseSalary);

    if (r.gender === 'M') {
      maleCount++;
      maleBaseTotal += r.baseSalary;
    } else if (r.gender === 'F') {
      femaleCount++;
      femaleBaseTotal += r.baseSalary;
    }

    const deptKey = r.departmentName || r.department;
    if (!deptMap[deptKey]) {
      deptMap[deptKey] = { totalPay: 0, overtime: 0, count: 0, name: deptKey };
    }
    deptMap[deptKey].totalPay += r.totalCompensation;
    deptMap[deptKey].overtime += r.overtimePay;
    deptMap[deptKey].count += 1;
  });

  // Calculate Median
  baseSalaries.sort((a, b) => a - b);
  const mid = Math.floor(baseSalaries.length / 2);
  const medianBaseSalary =
    baseSalaries.length % 2 !== 0
      ? baseSalaries[mid]
      : (baseSalaries[mid - 1] + baseSalaries[mid]) / 2;

  // Find Top Depts
  let topDepartment = { name: 'None', totalPay: 0, count: 0 };
  let topOvertimeDept = { name: 'None', overtime: 0 };

  Object.values(deptMap).forEach((d) => {
    if (d.totalPay > topDepartment.totalPay) {
      topDepartment = { name: d.name, totalPay: d.totalPay, count: d.count };
    }
    if (d.overtime > topOvertimeDept.overtime) {
      topOvertimeDept = { name: d.name, overtime: d.overtime };
    }
  });

  const avgBaseSalary = totalBaseSalary / totalHeadcount;
  const avgOvertimePay = totalOvertimePay / totalHeadcount;
  const overtimePercentage = totalPayroll > 0 ? (totalOvertimePay / totalPayroll) * 100 : 0;

  const maleAvgSalary = maleCount > 0 ? maleBaseTotal / maleCount : 0;
  const femaleAvgSalary = femaleCount > 0 ? femaleBaseTotal / femaleCount : 0;
  const genderPayRatio =
    maleAvgSalary > 0 && femaleAvgSalary > 0
      ? (femaleAvgSalary / maleAvgSalary) * 100
      : 100;

  return {
    totalHeadcount,
    totalPayroll: Math.round(totalPayroll),
    totalBaseSalary: Math.round(totalBaseSalary),
    totalOvertimePay: Math.round(totalOvertimePay),
    totalLongevityPay: Math.round(totalLongevityPay),
    avgBaseSalary: Math.round(avgBaseSalary),
    medianBaseSalary: Math.round(medianBaseSalary),
    avgOvertimePay: Math.round(avgOvertimePay),
    overtimePercentage: Number(overtimePercentage.toFixed(1)),
    maleCount,
    femaleCount,
    maleAvgSalary: Math.round(maleAvgSalary),
    femaleAvgSalary: Math.round(femaleAvgSalary),
    genderPayRatio: Number(genderPayRatio.toFixed(1)),
    topDepartment,
    topOvertimeDept,
  };
}

export function formatCurrency(val: number, compact = false): string {
  if (compact) {
    if (Math.abs(val) >= 1_000_000) {
      return `$${(val / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(val) >= 1_000) {
      return `$${(val / 1_000).toFixed(1)}k`;
    }
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val);
}
