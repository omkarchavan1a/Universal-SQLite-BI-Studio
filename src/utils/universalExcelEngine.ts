import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { DatasetProfile, GenericRecord } from '../types';

/**
 * Generates and downloads a universal multi-tab Excel Workbook from ANY dataset
 */
export function generateUniversalExcel(
  records: GenericRecord[],
  profile: DatasetProfile,
  filename = 'Dataset_Analytics_Workbook.xlsx'
): void {
  const wb = XLSX.utils.book_new();

  // Tab 1: Master Itemized Raw Data
  const cleanMasterRows = records.map((r) => {
    const rowObj: Record<string, any> = {};
    profile.columns.forEach((col) => {
      rowObj[col.name] = r[col.key] !== undefined && r[col.key] !== null ? r[col.key] : '';
    });
    return rowObj;
  });

  const wsMaster = XLSX.utils.json_to_sheet(cleanMasterRows);
  // Auto-calculate column widths
  wsMaster['!cols'] = profile.columns.map((col) => ({
    wch: Math.max(12, Math.min(35, col.name.length + 4)),
  }));

  XLSX.utils.book_append_sheet(wb, wsMaster, 'Master_Data');

  // Tab 2: Aggregated Summary by Primary Dimension
  if (profile.primaryDimensionKey && profile.primaryMetricKey) {
    const dimKey = profile.primaryDimensionKey;
    const metricKey = profile.primaryMetricKey;
    const secMetricKey = profile.secondaryMetricKey;

    const dimName = profile.columns.find((c) => c.key === dimKey)?.name || dimKey;
    const metricName = profile.columns.find((c) => c.key === metricKey)?.name || metricKey;
    const secMetricName = secMetricKey ? profile.columns.find((c) => c.key === secMetricKey)?.name || secMetricKey : null;

    const agg: Record<string, { dimension: string; count: number; sumMetric: number; sumSecMetric: number }> = {};

    records.forEach((r) => {
      const dimVal = String(r[dimKey] || '(Unassigned)');
      if (!agg[dimVal]) {
        agg[dimVal] = { dimension: dimVal, count: 0, sumMetric: 0, sumSecMetric: 0 };
      }
      agg[dimVal].count += 1;
      const val1 = Number(r[metricKey]);
      if (!isNaN(val1)) agg[dimVal].sumMetric += val1;
      if (secMetricKey) {
        const val2 = Number(r[secMetricKey]);
        if (!isNaN(val2)) agg[dimVal].sumSecMetric += val2;
      }
    });

    const summaryRows = Object.values(agg)
      .sort((a, b) => b.sumMetric - a.sumMetric)
      .map((item) => {
        const row: Record<string, any> = {
          [dimName]: item.dimension,
          'Record Count': item.count,
          [`Total ${metricName}`]: Math.round(item.sumMetric * 100) / 100,
          [`Avg ${metricName}`]: Math.round((item.sumMetric / (item.count || 1)) * 100) / 100,
        };
        if (secMetricName && secMetricKey) {
          row[`Total ${secMetricName}`] = Math.round(item.sumSecMetric * 100) / 100;
          row[`Avg ${secMetricName}`] = Math.round((item.sumSecMetric / (item.count || 1)) * 100) / 100;
        }
        return row;
      });

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Dimension_Summary');
  }

  // Tab 3: Data Dictionary & Column Schema
  const schemaRows = profile.columns.map((col) => ({
    'Column Name': col.name,
    'Field Key': col.key,
    'Detected Type': col.type.toUpperCase(),
    'Non-Null Count': col.nonNullCount,
    'Distinct Values': col.uniqueCount,
    'Sample Values': col.sampleValues.join(', '),
    'Sum Metric': col.sum !== undefined ? col.sum : 'N/A',
    'Average Metric': col.avg !== undefined ? col.avg : 'N/A',
    'Min Value': col.min !== undefined ? col.min : col.minDate || 'N/A',
    'Max Value': col.max !== undefined ? col.max : col.maxDate || 'N/A',
  }));

  const wsSchema = XLSX.utils.json_to_sheet(schemaRows);
  wsSchema['!cols'] = [
    { wch: 22 },
    { wch: 20 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 30 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSchema, 'Data_Schema_Dictionary');

  // Trigger download
  XLSX.writeFile(wb, filename);
}

/**
 * Universal CSV exporter
 */
export function exportUniversalCSV(records: GenericRecord[], profile: DatasetProfile, filename = 'Dataset_Export.csv'): void {
  const cleanRows = records.map((r) => {
    const rowObj: Record<string, any> = {};
    profile.columns.forEach((col) => {
      rowObj[col.name] = r[col.key] !== undefined && r[col.key] !== null ? r[col.key] : '';
    });
    return rowObj;
  });

  const csv = Papa.unparse(cleanRows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
