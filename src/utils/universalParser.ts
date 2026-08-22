import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ColumnSchema, ColumnType, DatasetProfile, GenericRecord } from '../types';

/**
 * Clean and normalize column keys while keeping readable labels
 */
export function cleanKey(key: string): string {
  if (!key) return 'unnamed';
  return key.trim();
}

/**
 * Format numbers cleanly with compact or currency mode
 */
export function formatMetricValue(val: number | null | undefined, isCurrency = false, isPercentage = false): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  if (isPercentage) {
    return `${val.toFixed(1)}%`;
  }
  if (isCurrency) {
    if (Math.abs(val) >= 1_000_000) {
      return `$${(val / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(val) >= 1_000) {
      return `$${(val / 1_000).toFixed(1)}k`;
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  }
  if (Math.abs(val) >= 1_000_000) {
    return `${(val / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(val) >= 1_000) {
    return `${(val / 1_000).toFixed(1)}k`;
  }
  return Number.isInteger(val) ? val.toLocaleString() : val.toFixed(2);
}

/**
 * Determines the data type of a column based on its sample and full values
 */
export function detectColumnType(values: any[], keyName: string): { type: ColumnType; isCurrency: boolean; isPercentage: boolean } {
  const nonNull = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
  if (nonNull.length === 0) return { type: 'text', isCurrency: false, isPercentage: false };

  const lowerKey = keyName.toLowerCase();

  // Check currency cues in key or values
  const hasCurrencyCue = lowerKey.includes('salary') || lowerKey.includes('price') || lowerKey.includes('cost') ||
    lowerKey.includes('revenue') || lowerKey.includes('spend') || lowerKey.includes('pay') || lowerKey.includes('budget') ||
    lowerKey.includes('amount') || lowerKey.includes('profit') || lowerKey.includes('mrr') || lowerKey.includes('arr') ||
    lowerKey.includes('$');

  const hasPercentCue = lowerKey.includes('rate') || lowerKey.includes('percent') || lowerKey.includes('%') || lowerKey.includes('ratio');

  // 1. Check Date
  let dateMatches = 0;
  for (const v of nonNull) {
    const s = String(v).trim();
    // Common date patterns: YYYY-MM-DD, MM/DD/YYYY, DD-MM-YYYY, ISO strings
    if (s.length >= 8 && s.length <= 26 && !/^\d+$/.test(s)) {
      const parsed = Date.parse(s);
      if (!isNaN(parsed) && (s.includes('-') || s.includes('/') || s.includes('T'))) {
        dateMatches++;
      }
    }
  }
  if (dateMatches / nonNull.length >= 0.75 || lowerKey.includes('date') || lowerKey.includes('_at') || lowerKey.includes('time')) {
    if (dateMatches / nonNull.length >= 0.5) {
      return { type: 'date', isCurrency: false, isPercentage: false };
    }
  }

  // 2. Check Numeric
  let numericMatches = 0;
  let currencySymbolsFound = false;
  let percentSymbolsFound = false;

  for (const v of nonNull) {
    if (typeof v === 'number') {
      numericMatches++;
      continue;
    }
    const s = String(v).trim();
    if (s.includes('$') || s.includes('€') || s.includes('£')) currencySymbolsFound = true;
    if (s.includes('%')) percentSymbolsFound = true;

    const cleaned = s.replace(/[$,€£%\s]/g, '');
    const num = Number(cleaned);
    if (!isNaN(num) && cleaned !== '') {
      numericMatches++;
    }
  }

  const isNumeric = numericMatches / nonNull.length >= 0.8;
  if (isNumeric) {
    return {
      type: 'numeric',
      isCurrency: currencySymbolsFound || hasCurrencyCue,
      isPercentage: percentSymbolsFound || hasPercentCue,
    };
  }

  // 3. Check Boolean
  let boolMatches = 0;
  for (const v of nonNull) {
    const s = String(v).trim().toLowerCase();
    if (['true', 'false', 'yes', 'no', '1', '0', 'y', 'n'].includes(s) || typeof v === 'boolean') {
      boolMatches++;
    }
  }
  if (boolMatches / nonNull.length >= 0.9) {
    return { type: 'boolean', isCurrency: false, isPercentage: false };
  }

  // 4. Check Identifier (High cardinality, short IDs, or ID in column name)
  const uniqueSet = new Set(nonNull.map((v) => String(v).trim()));
  const uniqueRatio = uniqueSet.size / nonNull.length;
  if (
    (lowerKey === 'id' || lowerKey.endsWith('_id') || lowerKey.endsWith('id') || lowerKey.startsWith('id_') || lowerKey.includes('code') || lowerKey.includes('sku') || lowerKey.includes('uuid')) &&
    uniqueRatio > 0.6
  ) {
    return { type: 'identifier', isCurrency: false, isPercentage: false };
  }

  // 5. Categorical vs Text
  if (uniqueSet.size <= Math.max(30, nonNull.length * 0.4) || nonNull.every((v) => String(v).length <= 40)) {
    return { type: 'categorical', isCurrency: false, isPercentage: false };
  }

  return { type: 'text', isCurrency: false, isPercentage: false };
}

/**
 * Parses any raw object value into its clean typed form based on column schema
 */
export function castValue(val: any, type: ColumnType): any {
  if (val === null || val === undefined || val === '') return null;
  if (type === 'numeric') {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const clean = String(val).replace(/[$,€£%\s]/g, '');
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  }
  if (type === 'boolean') {
    if (typeof val === 'boolean') return val;
    const s = String(val).trim().toLowerCase();
    return ['true', 'yes', '1', 'y'].includes(s);
  }
  if (type === 'date') {
    const s = String(val).trim();
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toISOString().split('T')[0];
  }
  return String(val).trim();
}

/**
 * Profiles an entire dataset: extracts schema, statistics, distributions, and recommended roles
 */
export function profileDataset(records: GenericRecord[], datasetName = 'Dataset'): DatasetProfile {
  if (!records || records.length === 0) {
    return {
      name: datasetName,
      rowCount: 0,
      columnCount: 0,
      columns: [],
      primaryDimensionKey: '',
      primaryMetricKey: '',
      idKey: '_id',
    };
  }

  // Extract all unique keys across all records
  const keySet = new Set<string>();
  records.forEach((r) => {
    Object.keys(r).forEach((k) => {
      if (k && !k.startsWith('_')) keySet.add(k);
    });
  });

  const rawKeys = Array.from(keySet);
  const totalRows = records.length;
  const columns: ColumnSchema[] = [];

  rawKeys.forEach((key) => {
    const allValues = records.map((r) => r[key]);
    const nonNullValues = allValues.filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
    const { type, isCurrency, isPercentage } = detectColumnType(allValues, key);

    const schema: ColumnSchema = {
      key,
      name: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      type,
      sampleValues: nonNullValues.slice(0, 5),
      nonNullCount: nonNullValues.length,
      totalCount: totalRows,
      uniqueCount: new Set(nonNullValues.map((v) => String(v))).size,
      isCurrency,
      isPercentage,
    };

    if (type === 'numeric') {
      const numbers = nonNullValues
        .map((v) => {
          if (typeof v === 'number') return v;
          const clean = String(v).replace(/[$,€£%\s]/g, '');
          const n = parseFloat(clean);
          return isNaN(n) ? null : n;
        })
        .filter((n): n is number => n !== null);

      if (numbers.length > 0) {
        const sum = numbers.reduce((a, b) => a + b, 0);
        const min = Math.min(...numbers);
        const max = Math.max(...numbers);
        const avg = sum / numbers.length;
        numbers.sort((a, b) => a - b);
        const mid = Math.floor(numbers.length / 2);
        const median = numbers.length % 2 !== 0 ? numbers[mid] : (numbers[mid - 1] + numbers[mid]) / 2;

        schema.sum = Number(sum.toFixed(2));
        schema.min = Number(min.toFixed(2));
        schema.max = Number(max.toFixed(2));
        schema.avg = Number(avg.toFixed(2));
        schema.median = Number(median.toFixed(2));
      }
    } else if (type === 'categorical' || type === 'boolean') {
      const freqMap: Record<string, number> = {};
      nonNullValues.forEach((v) => {
        const str = String(v).trim();
        freqMap[str] = (freqMap[str] || 0) + 1;
      });

      const sortedFreq = Object.entries(freqMap)
        .map(([value, count]) => ({
          value,
          count,
          percentage: Number(((count / (nonNullValues.length || 1)) * 100).toFixed(1)),
        }))
        .sort((a, b) => b.count - a.count);

      schema.topCategories = sortedFreq.slice(0, 10);
    } else if (type === 'date') {
      const dates = nonNullValues
        .map((v) => new Date(String(v)))
        .filter((d) => !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());

      if (dates.length > 0) {
        schema.minDate = dates[0].toISOString().split('T')[0];
        schema.maxDate = dates[dates.length - 1].toISOString().split('T')[0];
      }
    }

    columns.push(schema);
  });

  // Automatically find best candidate for Primary Dimension (Categorical column with 2-25 unique values)
  const categoricalCols = columns.filter((c) => c.type === 'categorical');
  categoricalCols.sort((a, b) => {
    // Prefer columns with 3 to 20 categories
    const aScore = a.uniqueCount >= 2 && a.uniqueCount <= 20 ? 100 - Math.abs(a.uniqueCount - 7) : 10;
    const bScore = b.uniqueCount >= 2 && b.uniqueCount <= 20 ? 100 - Math.abs(b.uniqueCount - 7) : 10;
    return bScore - aScore;
  });

  const primaryDimensionKey = categoricalCols[0]?.key || columns.find((c) => c.type !== 'numeric')?.key || columns[0]?.key || '';
  const secondaryDimensionKey = categoricalCols[1]?.key || undefined;

  // Find best candidate for Primary Metric (Numeric column with highest variance or totals)
  const numericCols = columns.filter((c) => c.type === 'numeric');
  numericCols.sort((a, b) => {
    // Prefer currency/cost/revenue/salary or larger sum
    const aWeight = (a.isCurrency ? 1000 : 0) + (a.sum || 0) / 10000;
    const bWeight = (b.isCurrency ? 1000 : 0) + (b.sum || 0) / 10000;
    return bWeight - aWeight;
  });

  const primaryMetricKey = numericCols[0]?.key || '';
  const secondaryMetricKey = numericCols[1]?.key || undefined;

  // Find date column
  const dateCol = columns.find((c) => c.type === 'date');
  const dateKey = dateCol?.key || undefined;

  // Find or generate ID key
  const idCol = columns.find((c) => c.type === 'identifier' || c.key.toLowerCase() === 'id' || c.key.toLowerCase().endsWith('_id'));
  const idKey = idCol?.key || '_id';

  return {
    name: datasetName,
    rowCount: totalRows,
    columnCount: columns.length,
    columns,
    primaryDimensionKey,
    secondaryDimensionKey,
    primaryMetricKey,
    secondaryMetricKey,
    dateKey,
    idKey,
  };
}

/**
 * Universal file reader supporting CSV, TSV, XLSX, XLS, and JSON
 */
export async function parseUploadedFile(file: File): Promise<{
  records: GenericRecord[];
  profile: DatasetProfile;
  filename: string;
}> {
  const filename = file.name;
  const isExcel = filename.endsWith('.xlsx') || filename.endsWith('.xls');
  const isJson = filename.endsWith('.json');

  let rawRecords: GenericRecord[] = [];

  if (isExcel) {
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheetName];
    rawRecords = XLSX.utils.sheet_to_json(ws, { defval: '' });
  } else if (isJson) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    rawRecords = Array.isArray(parsed) ? parsed : [parsed];
  } else {
    // CSV / TSV / Text
    const text = await file.text();
    const result = Papa.parse(text.trim(), {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });
    rawRecords = result.data as GenericRecord[];
  }

  // Ensure each record has an ID key
  const recordsWithId = rawRecords.map((r, i) => {
    const formatted: GenericRecord = { ...r };
    if (!formatted.id && !formatted._id && !formatted.ID) {
      formatted._id = `ROW-${String(i + 1).padStart(4, '0')}`;
    }
    return formatted;
  });

  const profile = profileDataset(recordsWithId, filename.replace(/\.[^/.]+$/, ''));

  // Cast values cleanly
  const typedRecords = recordsWithId.map((r) => {
    const out: GenericRecord = { ...r };
    profile.columns.forEach((col) => {
      out[col.key] = castValue(r[col.key], col.type);
    });
    return out;
  });

  return {
    records: typedRecords,
    profile,
    filename,
  };
}
