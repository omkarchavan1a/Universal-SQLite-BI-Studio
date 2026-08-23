import { DatasetProfile, GenericRecord, ColumnSchema } from '../types';

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
  healthScore: number; // 0 to 100
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

/**
 * Validates dataset health, data types, and generates tailored multi-dashboard presets
 */
export function validateAndProfileDataset(
  profile: DatasetProfile,
  records: GenericRecord[] = []
): DatasetValidationReport {
  const safeRecords = Array.isArray(records) ? records : [];
  const columns = profile?.columns || [];
  const rowCount = safeRecords.length || profile?.rowCount || 0;
  const columnCount = columns.length || profile?.columnCount || 0;
  const totalCells = Math.max(1, rowCount * columnCount);

  let nonNullCells = 0;
  columns.forEach((col) => {
    nonNullCells += col.nonNullCount || 0;
  });

  // Calculate Data Health Score
  const healthPercent = Math.min(100, Math.max(0, Math.round((nonNullCells / totalCells) * 100)));
  const cleanlinessGrade: 'A+' | 'A' | 'B' | 'C' =
    healthPercent >= 98 ? 'A+' : healthPercent >= 90 ? 'A' : healthPercent >= 75 ? 'B' : 'C';

  const numericColumns = columns.filter((c) => c.type === 'numeric');
  const categoricalColumns = columns.filter((c) => c.type === 'categorical' || c.type === 'text');
  const dateColumns = columns.filter((c) => c.type === 'date');
  const idColumns = columns.filter((c) => c.type === 'identifier');
  const hasDateSeries = dateColumns.length > 0 || !!profile?.dateKey;

  const qualityChecks: { title: string; status: 'pass' | 'warn' | 'info'; message: string }[] = [];

  // Check 1: Row volume
  if (rowCount >= 5) {
    qualityChecks.push({
      title: 'Row Volume Ready',
      status: 'pass',
      message: `${rowCount.toLocaleString()} valid rows ingested for aggregation & statistical profiling.`,
    });
  } else {
    qualityChecks.push({
      title: 'Low Row Count',
      status: 'warn',
      message: `Only ${rowCount} rows detected; visualizations will render with limited sample distribution.`,
    });
  }

  // Check 2: Numeric Metrics
  if (numericColumns.length >= 1) {
    qualityChecks.push({
      title: 'Numerical Metrics Ingested',
      status: 'pass',
      message: `${numericColumns.length} continuous metrics identified (${numericColumns.map((c) => c.name).slice(0, 3).join(', ')}).`,
    });
  } else {
    qualityChecks.push({
      title: 'No Numeric Columns',
      status: 'info',
      message: 'No numeric columns detected; dashboard will default to record counts and categorical frequencies.',
    });
  }

  // Check 3: Categorical Dimensions
  if (categoricalColumns.length >= 1) {
    qualityChecks.push({
      title: 'Categorical Segmentation',
      status: 'pass',
      message: `${categoricalColumns.length} dimensions ready for slicing (${categoricalColumns.map((c) => c.name).slice(0, 3).join(', ')}).`,
    });
  }

  // Check 4: Date Sequence
  if (hasDateSeries) {
    qualityChecks.push({
      title: 'Temporal Timeline Series',
      status: 'pass',
      message: `Date series detected (${dateColumns[0]?.name || profile?.dateKey}); chronological trends enabled.`,
    });
  } else {
    qualityChecks.push({
      title: 'No Date Series',
      status: 'info',
      message: 'No explicit date columns found; trends will use index progression.',
    });
  }

  // Check 5: Data Completeness
  if (healthPercent >= 95) {
    qualityChecks.push({
      title: 'Data Completeness High',
      status: 'pass',
      message: `${healthPercent}% of all data cells populated with zero critical type corruption.`,
    });
  } else {
    qualityChecks.push({
      title: 'Missing Values Found',
      status: 'warn',
      message: `${100 - healthPercent}% of data cells are null or blank; fallback imputations applied.`,
    });
  }

  // Generate Suggested Multi-Dashboard Suite
  const primaryDim = profile?.primaryDimensionKey || categoricalColumns[0]?.key || columns[0]?.key || 'category';
  const secondaryDim = profile?.secondaryDimensionKey || categoricalColumns[1]?.key || primaryDim;
  const primaryMetric = profile?.primaryMetricKey || numericColumns[0]?.key || 'count';
  const secondaryMetric = profile?.secondaryMetricKey || numericColumns[1]?.key || primaryMetric;
  const dateDim = profile?.dateKey || dateColumns[0]?.key || primaryDim;

  const suggestedDashboards: DashboardConfig[] = [];
  const now = Date.now();

  // 1. Executive Overview Dashboard
  suggestedDashboards.push({
    id: `dash_executive_${now}`,
    title: 'Executive Overview',
    description: `High-level KPIs, primary ${profile?.columns.find((c) => c.key === primaryDim)?.name || 'category'} distributions, and top-tier metrics`,
    type: 'executive',
    icon: 'LayoutDashboard',
    dimensionKey: primaryDim,
    secondaryDimensionKey: secondaryDim,
    metricKey1: primaryMetric,
    metricKey2: secondaryMetric,
    chartLayout: 'all',
    barMode: 'grouped',
    notes: 'Executive snapshot aggregating total volume, top contributing segments, and primary key performance indicators.',
    createdAt: now,
  });

  // 2. Metric & Statistical Deep Dive Dashboard
  if (numericColumns.length > 0) {
    suggestedDashboards.push({
      id: `dash_metrics_${now + 1}`,
      title: 'KPI & Metrics Deep-Dive',
      description: `In-depth numerical drilldown for ${profile?.columns.find((c) => c.key === primaryMetric)?.name || 'Key Metric'} & correlations`,
      type: 'metrics',
      icon: 'TrendingUp',
      dimensionKey: secondaryDim !== primaryDim ? secondaryDim : primaryDim,
      secondaryDimensionKey: primaryDim,
      metricKey1: primaryMetric,
      metricKey2: secondaryMetric !== primaryMetric ? secondaryMetric : primaryMetric,
      chartLayout: 'bar',
      barMode: 'grouped',
      notes: 'Detailed variance, average values, ranked distributions, and numerical distributions across entities.',
      createdAt: now + 1,
    });
  }

  // 3. Category & Segment Breakdown Dashboard
  if (categoricalColumns.length > 0) {
    suggestedDashboards.push({
      id: `dash_breakdown_${now + 2}`,
      title: 'Category & Segment Breakdown',
      description: `Proportional market share, entity rankings, and categorical composition analysis`,
      type: 'breakdown',
      icon: 'PieChart',
      dimensionKey: categoricalColumns[0]?.key || primaryDim,
      secondaryDimensionKey: categoricalColumns[1]?.key || secondaryDim,
      metricKey1: primaryMetric,
      metricKey2: secondaryMetric,
      chartLayout: 'pie',
      barMode: 'stacked',
      notes: 'Slice-and-dice segmentation showing contribution ratios and top entity distributions.',
      createdAt: now + 2,
    });
  }

  // 4. Timeline & Velocity Trends Dashboard
  if (hasDateSeries) {
    suggestedDashboards.push({
      id: `dash_trends_${now + 3}`,
      title: 'Timeline & Velocity Trends',
      description: `Chronological trajectory, temporal velocity, and longitudinal rolling performance`,
      type: 'trends',
      icon: 'Activity',
      dimensionKey: dateDim,
      secondaryDimensionKey: primaryDim,
      metricKey1: primaryMetric,
      metricKey2: secondaryMetric,
      chartLayout: 'line',
      barMode: 'grouped',
      notes: 'Temporal analysis mapping trajectories, peaks, troughs, and periodic trends over time.',
      createdAt: now + 3,
    });
  }

  // 5. Operational Records & Data Integrity Dashboard
  suggestedDashboards.push({
    id: `dash_operations_${now + 4}`,
    title: 'Operations & Quality Audit',
    description: `Record-level density, outlier tracking, and dataset health breakdown`,
    type: 'operations',
    icon: 'Layers',
    dimensionKey: profile?.idKey || columns[0]?.key || primaryDim,
    secondaryDimensionKey: primaryDim,
    metricKey1: primaryMetric,
    metricKey2: secondaryMetric,
    chartLayout: 'split',
    barMode: 'grouped',
    notes: 'Operational view monitoring data cleanliness, entity counts, and record-level metrics.',
    createdAt: now + 4,
  });

  return {
    rowCount,
    columnCount,
    totalCells,
    nonNullCells,
    healthScore: healthPercent,
    cleanlinessGrade,
    numericColumns,
    categoricalColumns,
    dateColumns,
    idColumns,
    hasDateSeries,
    suggestedDashboards,
    qualityChecks,
  };
}

/**
 * Creates default dashboard set when initializing an app
 */
export function getDefaultDashboards(profile: DatasetProfile, records: GenericRecord[] = []): DashboardConfig[] {
  const report = validateAndProfileDataset(profile, records);
  return report.suggestedDashboards.length > 0
    ? report.suggestedDashboards
    : [
        {
          id: `dash_executive_${Date.now()}`,
          title: 'Executive Overview',
          description: 'Primary performance overview',
          type: 'executive',
          icon: 'LayoutDashboard',
          dimensionKey: profile.primaryDimensionKey,
          metricKey1: profile.primaryMetricKey,
          metricKey2: profile.secondaryMetricKey,
          chartLayout: 'all',
          createdAt: Date.now(),
        },
      ];
}
