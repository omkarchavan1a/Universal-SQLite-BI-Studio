export type ColumnType = 'numeric' | 'categorical' | 'date' | 'boolean' | 'identifier' | 'text';

export interface ColumnSchema {
  key: string;
  name: string;
  type: ColumnType;
  sampleValues: any[];
  nonNullCount: number;
  totalCount: number;
  uniqueCount: number;
  // Numeric stats
  min?: number;
  max?: number;
  sum?: number;
  avg?: number;
  median?: number;
  mean?: number;
  isCurrency?: boolean;
  isPercentage?: boolean;
  // Categorical stats
  topCategories?: { value: string; count: number; percentage: number }[];
  // Date stats
  minDate?: string;
  maxDate?: string;
  // User role in dashboard
  role?: 'dimension' | 'metric' | 'date' | 'id' | 'ignore';
}

export interface DatasetProfile {
  name: string;
  rowCount: number;
  columnCount: number;
  columns: ColumnSchema[];
  primaryDimensionKey: string;
  secondaryDimensionKey?: string;
  primaryMetricKey: string;
  secondaryMetricKey?: string;
  dateKey?: string;
  idKey: string;
}

export type GenericRecord = Record<string, any>;

export interface UniversalKPI {
  id: string;
  label: string;
  value: string | number;
  subValue?: string;
  type: 'count' | 'sum' | 'avg' | 'category' | 'date' | 'ratio';
  icon?: string;
  color?: string;
}

export interface UniversalFilterState {
  searchQuery: string;
  categoricalFilters: Record<string, string[]>;
  numericRanges: Record<string, [number, number]>;
  dateRange?: [string, string];
}

export interface DashboardConfig {
  id: string;
  title: string;
  description: string;
  type: 'executive' | 'breakdown' | 'trends' | 'metrics' | 'operations' | 'custom';
  icon: string;
  dimensionKey: string;
  secondaryDimensionKey?: string;
  metricKey1: string;
  metricKey2?: string;
  chartLayout: 'all' | 'bar' | 'pie' | 'line' | 'scatter' | 'split';
  barMode?: 'grouped' | 'stacked';
  visibleKpis?: string[];
  notes?: string;
  createdAt: number;
}

export interface DatasetValidationReport {
  rowCount: number;
  columnCount: number;
  totalCells: number;
  nonNullCells: number;
  healthScore: number;
  cleanlinessGrade: 'A+' | 'A' | 'B' | 'C';
  numericColumns: ColumnSchema[];
  categoricalColumns: ColumnSchema[];
  dateColumns: ColumnSchema[];
  idColumns: ColumnSchema[];
  hasDateSeries: boolean;
  suggestedDashboards: DashboardConfig[];
  qualityChecks: {
    title: string;
    status: 'pass' | 'warn' | 'info';
    message: string;
  }[];
}

export interface UpdateEvent {
  id: string;
  timestamp: Date;
  type: 'edit' | 'add' | 'delete' | 'auto_sync' | 'file_upload' | 'schema_change';
  recordId: string;
  description: string;
  details?: {
    field?: string;
    oldValue?: string | number;
    newValue?: string | number;
  };
}

export interface SampleDatasetInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  rowCount: number;
}

// Legacy payroll interfaces for backward compatibility
export interface EmployeeRecord {
  id: string;
  department: string;
  departmentName: string;
  division: string;
  gender: 'M' | 'F' | string;
  baseSalary: number;
  overtimePay: number;
  longevityPay: number;
  totalCompensation: number;
  grade: string;
  lastUpdated?: string;
}

export interface PayrollKPIs {
  totalHeadcount: number;
  totalPayroll: number;
  totalBaseSalary: number;
  totalOvertimePay: number;
  totalLongevityPay: number;
  avgBaseSalary: number;
  medianBaseSalary: number;
  avgOvertimePay: number;
  overtimePercentage: number;
  maleCount: number;
  femaleCount: number;
  maleAvgSalary: number;
  femaleAvgSalary: number;
  genderPayRatio: number;
  topDepartment: { name: string; totalPay: number; count: number };
  topOvertimeDept: { name: string; overtime: number };
}

export interface FilterState {
  searchQuery: string;
  departments: string[];
  divisions: string[];
  genders: string[];
  grades: string[];
  salaryRange: [number, number];
  overtimeRange: [number, number];
  minTotalCompensation: number;
}
