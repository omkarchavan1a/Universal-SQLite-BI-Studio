import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { EmployeeRecord, PayrollKPIs } from '../types';
import { calculateKPIs } from '../data/dataParser';

/**
 * Generates and downloads a rich, multi-tab Excel Workbook from Employee Records
 */
export function generateAndDownloadExcel(
  records: EmployeeRecord[],
  filename = 'Live_Payroll_Analytics.xlsx',
  kpis?: PayrollKPIs
): void {
  const effectiveKpis = kpis || calculateKPIs(records);
  const wb = XLSX.utils.book_new();

  // Tab 1: Detailed Employee Master Data
  const masterDataRows = records.map((r) => ({
    'Record ID': r.id,
    'Department Code': r.department,
    'Department Name': r.departmentName,
    'Division': r.division,
    'Gender': r.gender,
    'Base Salary ($)': r.baseSalary,
    'Overtime Pay ($)': r.overtimePay,
    'Longevity Pay ($)': r.longevityPay,
    'Total Compensation ($)': r.totalCompensation,
    'Pay Grade': r.grade,
    'Last Synchronized': r.lastUpdated || 'Current',
  }));

  const wsMaster = XLSX.utils.json_to_sheet(masterDataRows);

  // Set column widths for readability
  wsMaster['!cols'] = [
    { wch: 12 }, // ID
    { wch: 16 }, // Dept Code
    { wch: 36 }, // Dept Name
    { wch: 38 }, // Division
    { wch: 8 },  // Gender
    { wch: 16 }, // Base Salary
    { wch: 16 }, // OT Pay
    { wch: 16 }, // Longevity
    { wch: 22 }, // Total Comp
    { wch: 12 }, // Grade
    { wch: 18 }, // Sync
  ];

  XLSX.utils.book_append_sheet(wb, wsMaster, 'Payroll_Master');

  // Tab 2: Department Summary (Aggregated Pivot)
  const deptAgg: Record<
    string,
    {
      deptCode: string;
      deptName: string;
      headcount: number;
      baseSum: number;
      otSum: number;
      longSum: number;
      totalCompSum: number;
      mCount: number;
      fCount: number;
    }
  > = {};

  records.forEach((r) => {
    const key = r.departmentName || r.department;
    if (!deptAgg[key]) {
      deptAgg[key] = {
        deptCode: r.department,
        deptName: key,
        headcount: 0,
        baseSum: 0,
        otSum: 0,
        longSum: 0,
        totalCompSum: 0,
        mCount: 0,
        fCount: 0,
      };
    }
    deptAgg[key].headcount += 1;
    deptAgg[key].baseSum += r.baseSalary;
    deptAgg[key].otSum += r.overtimePay;
    deptAgg[key].longSum += r.longevityPay;
    deptAgg[key].totalCompSum += r.totalCompensation;
    if (r.gender === 'M') deptAgg[key].mCount += 1;
    if (r.gender === 'F') deptAgg[key].fCount += 1;
  });

  const deptSummaryRows = Object.values(deptAgg)
    .sort((a, b) => b.totalCompSum - a.totalCompSum)
    .map((d) => ({
      'Department Code': d.deptCode,
      'Department Name': d.deptName,
      'Headcount': d.headcount,
      'Total Base Salary ($)': Math.round(d.baseSum),
      'Total Overtime ($)': Math.round(d.otSum),
      'Total Longevity ($)': Math.round(d.longSum),
      'Total Compensation ($)': Math.round(d.totalCompSum),
      'Avg Base Salary ($)': Math.round(d.baseSum / d.headcount),
      'Overtime Ratio (%)': Number(((d.otSum / (d.totalCompSum || 1)) * 100).toFixed(1)),
      'Male Staff': d.mCount,
      'Female Staff': d.fCount,
    }));

  const wsDept = XLSX.utils.json_to_sheet(deptSummaryRows);
  wsDept['!cols'] = [
    { wch: 15 },
    { wch: 36 },
    { wch: 12 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 18 },
    { wch: 16 },
    { wch: 12 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDept, 'Dept_KPI_Summary');

  // Tab 3: Executive Summary KPI Card Sheet
  const kpiRows = [
    { Metric: 'Total Workforce Headcount', Value: effectiveKpis.totalHeadcount, Unit: 'Employees' },
    { Metric: 'Total Gross Payroll', Value: effectiveKpis.totalPayroll, Unit: 'USD ($)' },
    { Metric: 'Total Base Salary Expenditure', Value: effectiveKpis.totalBaseSalary, Unit: 'USD ($)' },
    { Metric: 'Total Overtime Paid', Value: effectiveKpis.totalOvertimePay, Unit: 'USD ($)' },
    { Metric: 'Total Longevity Bonus Paid', Value: effectiveKpis.totalLongevityPay, Unit: 'USD ($)' },
    { Metric: 'Average Employee Base Salary', Value: effectiveKpis.avgBaseSalary, Unit: 'USD ($)' },
    { Metric: 'Median Employee Base Salary', Value: effectiveKpis.medianBaseSalary, Unit: 'USD ($)' },
    { Metric: 'Average Overtime per Employee', Value: effectiveKpis.avgOvertimePay, Unit: 'USD ($)' },
    { Metric: 'Overtime Spend Percentage', Value: `${effectiveKpis.overtimePercentage}%`, Unit: 'Percentage' },
    { Metric: 'Male Headcount', Value: effectiveKpis.maleCount, Unit: 'Employees' },
    { Metric: 'Female Headcount', Value: effectiveKpis.femaleCount, Unit: 'Employees' },
    { Metric: 'Male Average Base Salary', Value: effectiveKpis.maleAvgSalary, Unit: 'USD ($)' },
    { Metric: 'Female Average Base Salary', Value: effectiveKpis.femaleAvgSalary, Unit: 'USD ($)' },
    { Metric: 'Gender Pay Parity Index', Value: `${effectiveKpis.genderPayRatio}%`, Unit: 'Female/Male' },
    { Metric: 'Largest Department by Budget', Value: effectiveKpis.topDepartment.name, Unit: `$${effectiveKpis.topDepartment.totalPay.toLocaleString()}` },
    { Metric: 'Highest Overtime Department', Value: effectiveKpis.topOvertimeDept.name, Unit: `$${effectiveKpis.topOvertimeDept.overtime.toLocaleString()}` },
  ];

  const wsKPI = XLSX.utils.json_to_sheet(kpiRows);
  wsKPI['!cols'] = [{ wch: 34 }, { wch: 28 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsKPI, 'Executive_KPIs');

  // Tab 4: Pay Grade Distribution
  const gradeAgg: Record<string, { grade: string; count: number; avgBase: number; totalBase: number; totalOT: number }> = {};
  records.forEach((r) => {
    const g = r.grade || 'Unassigned';
    if (!gradeAgg[g]) {
      gradeAgg[g] = { grade: g, count: 0, avgBase: 0, totalBase: 0, totalOT: 0 };
    }
    gradeAgg[g].count++;
    gradeAgg[g].totalBase += r.baseSalary;
    gradeAgg[g].totalOT += r.overtimePay;
  });

  const gradeRows = Object.values(gradeAgg)
    .sort((a, b) => b.count - a.count)
    .map((g) => ({
      'Pay Grade': g.grade,
      'Headcount': g.count,
      'Total Base Salary ($)': Math.round(g.totalBase),
      'Average Base Salary ($)': Math.round(g.totalBase / g.count),
      'Total Overtime ($)': Math.round(g.totalOT),
      'Average Overtime ($)': Math.round(g.totalOT / g.count),
    }));

  const wsGrade = XLSX.utils.json_to_sheet(gradeRows);
  wsGrade['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsGrade, 'Pay_Grade_Analysis');

  // Trigger browser download
  XLSX.writeFile(wb, filename);
}

/**
 * Exports records to a pure standard CSV file
 */
export function exportToCSV(records: EmployeeRecord[], filename = 'Payroll_Export.csv'): void {
  const data = records.map((r) => ({
    Department: r.department,
    Department_Name: r.departmentName,
    Division: r.division,
    Gender: r.gender,
    Base_Salary: r.baseSalary,
    Overtime_Pay: r.overtimePay,
    Longevity_Pay: r.longevityPay,
    Grade: r.grade,
    Total_Compensation: r.totalCompensation,
  }));

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Reads any uploaded Excel (.xlsx, .xls) or CSV/TSV file and parses it into EmployeeRecord[]
 */
export async function readUploadedFile(file: File): Promise<{ records: EmployeeRecord[]; filename: string }> {
  const filename = file.name;
  const isExcel = filename.endsWith('.xlsx') || filename.endsWith('.xls');

  if (isExcel) {
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheetName];
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

    const records: EmployeeRecord[] = [];
    rawRows.forEach((row, index) => {
      const parseNum = (v: any) => {
        if (v === undefined || v === null || v === '') return 0;
        const clean = String(v).replace(/[$,\s]/g, '');
        const n = parseFloat(clean);
        return isNaN(n) ? 0 : n;
      };

      const department = String(row['Department'] || row['Department Code'] || row['dept'] || 'OTHER').trim();
      const departmentName = String(row['Department_Name'] || row['Department Name'] || row['departmentName'] || department).trim();
      const division = String(row['Division'] || row['division'] || 'General').trim();
      const gender = String(row['Gender'] || row['gender'] || 'U').trim().toUpperCase();

      const baseSalary = parseNum(row['Base_Salary'] || row['Base Salary'] || row['Base Salary ($)'] || row['baseSalary']);
      const overtimePay = parseNum(row['Overtime_Pay'] || row['Overtime Pay'] || row['Overtime Pay ($)'] || row['overtimePay']);
      const longevityPay = parseNum(row['Longevity_Pay'] || row['Longevity Pay'] || row['Longevity Pay ($)'] || row['longevityPay']);
      const grade = String(row['Grade'] || row['Pay Grade'] || row['grade'] || 'N/A').trim();
      const totalCompensation = Number((baseSalary + overtimePay + longevityPay).toFixed(2));

      records.push({
        id: `REC-${String(index + 1).padStart(4, '0')}`,
        department,
        departmentName,
        division,
        gender: gender === 'M' || gender === 'F' ? gender : 'Other',
        baseSalary,
        overtimePay,
        longevityPay,
        grade: grade === 'NULL' || !grade ? 'Unassigned' : grade,
        totalCompensation,
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
    });

    return { records, filename };
  } else {
    // CSV or text
    const text = await file.text();
    const result = Papa.parse(text.trim(), {
      header: true,
      skipEmptyLines: true,
    });

    const records: EmployeeRecord[] = [];
    (result.data as Record<string, string>[]).forEach((row, index) => {
      const parseNum = (v: any) => {
        if (v === undefined || v === null || v === '') return 0;
        const clean = String(v).replace(/[$,\s]/g, '');
        const n = parseFloat(clean);
        return isNaN(n) ? 0 : n;
      };

      const department = String(row['Department'] || row['Department Code'] || row['dept'] || 'OTHER').trim();
      const departmentName = String(row['Department_Name'] || row['Department Name'] || row['departmentName'] || department).trim();
      const division = String(row['Division'] || row['division'] || 'General').trim();
      const gender = String(row['Gender'] || row['gender'] || 'U').trim().toUpperCase();

      const baseSalary = parseNum(row['Base_Salary'] || row['Base Salary'] || row['Base Salary ($)'] || row['baseSalary']);
      const overtimePay = parseNum(row['Overtime_Pay'] || row['Overtime Pay'] || row['Overtime Pay ($)'] || row['overtimePay']);
      const longevityPay = parseNum(row['Longevity_Pay'] || row['Longevity Pay'] || row['Longevity Pay ($)'] || row['longevityPay']);
      const grade = String(row['Grade'] || row['Pay Grade'] || row['grade'] || 'N/A').trim();
      const totalCompensation = Number((baseSalary + overtimePay + longevityPay).toFixed(2));

      records.push({
        id: `REC-${String(index + 1).padStart(4, '0')}`,
        department,
        departmentName,
        division,
        gender: gender === 'M' || gender === 'F' ? gender : 'Other',
        baseSalary,
        overtimePay,
        longevityPay,
        grade: grade === 'NULL' || !grade ? 'Unassigned' : grade,
        totalCompensation,
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
    });

    return { records, filename };
  }
}
