import initSqlJs, { Database, SqlValue } from 'sql.js';
import { GenericRecord, DatasetProfile, ColumnType } from '../types';

export interface SqlQueryResult {
  columns: string[];
  values: any[][];
  rowCount: number;
  executionTimeMs: number;
  error?: string;
  query: string;
}

export interface SqlTableColumn {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
}

export interface SqliteState {
  isInitialized: boolean;
  db: Database | null;
  tableName: string;
  columnMap: Record<string, string>; // originalKey -> sqlColumnName
  reverseColumnMap: Record<string, string>; // sqlColumnName -> originalKey
  totalRows: number;
  lastQuery?: SqlQueryResult;
  error?: string;
}

let sqlJsPromise: Promise<any> | null = null;

async function getSqlJsInstance() {
  if (!sqlJsPromise) {
    const initFn =
      (typeof initSqlJs === 'function' ? initSqlJs : (initSqlJs as any)?.default) ||
      (typeof window !== 'undefined' ? (window as any).initSqlJs : null);

    if (typeof initFn !== 'function') {
      throw new Error('SQLite library (initSqlJs) could not be loaded.');
    }

    sqlJsPromise = (async () => {
      try {
        // Try local wasm first
        return await initFn({
          locateFile: (file: string) => {
            if (file.endsWith('.wasm')) {
              return '/sql-wasm.wasm';
            }
            return `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.14.2/${file}`;
          },
        });
      } catch (localErr) {
        console.warn('[SQLite] Local WASM init failed, attempting CDN fallback:', localErr);
        // Fallback to CDN if local wasm has any issue
        return await initFn({
          locateFile: (file: string) => {
            return `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.14.2/${file}`;
          },
        });
      }
    })().catch((err: any) => {
      // Reset promise if failed so next retry can attempt
      sqlJsPromise = null;
      throw err;
    });
  }
  return sqlJsPromise;
}

export function sanitizeSqlIdentifier(name: string): string {
  // Convert spaces and special characters to underscores, ensure start with letter/underscore
  let sanitized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^(\d)/, '_$1');
  
  if (['order', 'group', 'select', 'where', 'table', 'from', 'join', 'index', 'check', 'default', 'create', 'insert', 'update', 'delete', 'primary', 'key'].includes(sanitized)) {
    sanitized = `col_${sanitized}`;
  }
  return sanitized || 'col';
}

function mapTypeToSqlite(type: ColumnType): string {
  switch (type) {
    case 'numeric':
      return 'REAL';
    case 'boolean':
      return 'INTEGER';
    case 'date':
      return 'TEXT';
    case 'identifier':
      return 'TEXT';
    default:
      return 'TEXT';
  }
}

/**
 * Initialize SQLite Database with records and dataset profile
 */
export async function createSqliteDatabase(
  records: GenericRecord[],
  profile: DatasetProfile
): Promise<SqliteState> {
  const startTime = performance.now();
  const columnMap: Record<string, string> = {};
  const reverseColumnMap: Record<string, string> = {};
  const usedNames = new Set<string>();

  const safeProfile: DatasetProfile = profile && typeof profile === 'object' && Array.isArray(profile.columns)
    ? profile
    : {
        name: 'Dataset',
        idKey: 'id',
        rowCount: records.length,
        columnCount: records.length > 0 ? Object.keys(records[0]).length : 0,
        columns: records.length > 0
          ? Object.keys(records[0]).map((key) => ({
              key,
              name: key,
              type: 'text' as const,
              nonNullCount: records.length,
              totalCount: records.length,
              uniqueCount: records.length,
              sampleValues: [],
            }))
          : [],
        primaryDimensionKey: records.length > 0 ? Object.keys(records[0])[0] : '',
        primaryMetricKey: '',
      };

  const columns = safeProfile.columns || [];

  // 1. Build column mappings
  columns.forEach((col) => {
    let sqlName = sanitizeSqlIdentifier(col.key);
    let counter = 1;
    while (usedNames.has(sqlName)) {
      sqlName = `${sanitizeSqlIdentifier(col.key)}_${counter++}`;
    }
    usedNames.add(sqlName);
    columnMap[col.key] = sqlName;
    reverseColumnMap[sqlName] = col.key;
  });

  const tableName = 'dataset_records';

  try {
    const SQL = await getSqlJsInstance();
    const db: Database = new SQL.Database();

    // 2. Build CREATE TABLE statement
    const colDefs = columns.map((col) => {
      const sqlCol = columnMap[col.key] || sanitizeSqlIdentifier(col.key);
      const sqlType = mapTypeToSqlite(col.type);
      return `"${sqlCol}" ${sqlType}`;
    });

    const createTableSql = `CREATE TABLE ${tableName} (
      _row_id INTEGER PRIMARY KEY AUTOINCREMENT${colDefs.length > 0 ? `,\n      ${colDefs.join(',\n      ')}` : ''}
    );`;

    db.run(createTableSql);

    // 3. Create indices on primary dimension, metric, and ID
    if (safeProfile.primaryDimensionKey && columnMap[safeProfile.primaryDimensionKey]) {
      const dimSql = columnMap[safeProfile.primaryDimensionKey];
      db.run(`CREATE INDEX IF NOT EXISTS idx_${dimSql} ON ${tableName} ("${dimSql}");`);
    }
    if (safeProfile.primaryMetricKey && columnMap[safeProfile.primaryMetricKey]) {
      const metricSql = columnMap[safeProfile.primaryMetricKey];
      db.run(`CREATE INDEX IF NOT EXISTS idx_${metricSql} ON ${tableName} ("${metricSql}");`);
    }

    // 4. Batch Insert records in transaction
    if (records.length > 0 && columns.length > 0) {
      db.run('BEGIN TRANSACTION;');

      const sqlCols = columns.map((c) => `"${columnMap[c.key]}"`).join(', ');
      const placeholders = columns.map(() => '?').join(', ');
      const insertSql = `INSERT INTO ${tableName} (${sqlCols}) VALUES (${placeholders});`;
      const stmt = db.prepare(insertSql);

      for (const record of records) {
        const values: SqlValue[] = columns.map((col) => {
          const val = record[col.key];
          if (val === undefined || val === null) return null;
          if (col.type === 'numeric') {
            const num = Number(val);
            return isNaN(num) ? null : num;
          }
          if (col.type === 'boolean') {
            return val === true || val === 'true' || val === 1 ? 1 : 0;
          }
          return String(val);
        });

        stmt.run(values);
      }

      stmt.free();
      db.run('COMMIT;');
    }

    const elapsed = Math.round(performance.now() - startTime);
    console.log(`[SQLite] Database instantiated with ${records.length} rows in ${elapsed}ms`);

    return {
      isInitialized: true,
      db,
      tableName,
      columnMap,
      reverseColumnMap,
      totalRows: records.length,
    };
  } catch (err: any) {
    console.error('[SQLite] Failed to instantiate SQLite database:', err);
    return {
      isInitialized: false,
      db: null,
      tableName,
      columnMap,
      reverseColumnMap,
      totalRows: 0,
      error: err?.message || 'Failed to initialize SQLite engine',
    };
  }
}

/**
 * Execute arbitrary SQL query against the SQLite database
 */
export function runSqliteQuery(
  db: Database | null,
  query: string
): SqlQueryResult {
  if (!db) {
    return {
      columns: [],
      values: [],
      rowCount: 0,
      executionTimeMs: 0,
      error: 'SQLite database is not initialized yet.',
      query,
    };
  }

  const startTime = performance.now();

  try {
    const trimmed = query.trim();
    if (!trimmed) {
      return {
        columns: [],
        values: [],
        rowCount: 0,
        executionTimeMs: 0,
        query,
      };
    }

    const results = db.exec(trimmed);
    const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

    if (!results || results.length === 0) {
      return {
        columns: ['Status'],
        values: [['Query executed successfully. (0 rows returned)']],
        rowCount: 0,
        executionTimeMs,
        query,
      };
    }

    const lastResult = results[results.length - 1];
    return {
      columns: lastResult.columns,
      values: lastResult.values,
      rowCount: lastResult.values.length,
      executionTimeMs,
      query,
    };
  } catch (err: any) {
    const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;
    return {
      columns: [],
      values: [],
      rowCount: 0,
      executionTimeMs,
      error: err?.message || 'SQL execution error',
      query,
    };
  }
}

/**
 * Export the SQLite database as binary Uint8Array (.sqlite / .db)
 */
export function exportSqliteBinary(db: Database | null): Uint8Array | null {
  if (!db) return null;
  try {
    return db.export();
  } catch (err) {
    console.error('[SQLite] Export binary failed:', err);
    return null;
  }
}

/**
 * Generate full SQL Dump (DDL + DML INSERTS)
 */
export function exportSqlDump(
  records: GenericRecord[],
  profile: DatasetProfile,
  columnMap: Record<string, string>
): string {
  const tableName = 'dataset_records';
  const lines: string[] = [];
  const cols = profile?.columns || [];

  lines.push(`-- ============================================================`);
  lines.push(`-- Universal SQLite Data Dump: ${profile?.name || 'Dataset'}`);
  lines.push(`-- Exported on ${new Date().toISOString()}`);
  lines.push(`-- Total Records: ${records.length} | Columns: ${cols.length}`);
  lines.push(`-- ============================================================\n`);

  lines.push(`DROP TABLE IF EXISTS ${tableName};`);
  
  const colDefs = cols.map((col) => {
    const sqlCol = columnMap[col.key] || sanitizeSqlIdentifier(col.key);
    const sqlType = mapTypeToSqlite(col.type);
    return `  "${sqlCol}" ${sqlType}`;
  });

  lines.push(`CREATE TABLE ${tableName} (\n  _row_id INTEGER PRIMARY KEY AUTOINCREMENT${colDefs.length > 0 ? `,\n${colDefs.join(',\n')}` : ''}\n);\n`);

  if (records.length > 0 && cols.length > 0) {
    lines.push(`BEGIN TRANSACTION;`);
    const sqlCols = cols.map((c) => `"${columnMap[c.key] || sanitizeSqlIdentifier(c.key)}"`).join(', ');

    for (const record of records) {
      const vals = cols.map((col) => {
        const val = record[col.key];
        if (val === undefined || val === null) return 'NULL';
        if (col.type === 'numeric') {
          const n = Number(val);
          return isNaN(n) ? 'NULL' : String(n);
        }
        if (col.type === 'boolean') {
          return val === true || val === 'true' || val === 1 ? '1' : '0';
        }
        const str = String(val).replace(/'/g, "''");
        return `'${str}'`;
      });
      lines.push(`INSERT INTO ${tableName} (${sqlCols}) VALUES (${vals.join(', ')});`);
    }

    lines.push(`COMMIT;\n`);
  }

  return lines.join('\n');
}

/**
 * Generate context-aware suggested SQL queries for the user
 */
export interface SuggestedSqlQuery {
  id: string;
  title: string;
  description: string;
  query: string;
}

export function getSuggestedSqlQueries(
  profile: DatasetProfile,
  columnMap: Record<string, string>
): SuggestedSqlQuery[] {
  const tableName = 'dataset_records';
  const cols = profile?.columns || [];
  const dimKey = profile?.primaryDimensionKey || (cols[0]?.key || 'category');
  const metricKey = profile?.primaryMetricKey || (cols.find((c) => c.type === 'numeric')?.key || 'metric');
  const dimCol = columnMap[dimKey] || dimKey;
  const metricCol = columnMap[metricKey] || metricKey;
  const secMetricCol = profile?.secondaryMetricKey ? columnMap[profile.secondaryMetricKey] : null;
  const dateCol = profile?.dateKey ? columnMap[profile.dateKey] : null;

  const queries: SuggestedSqlQuery[] = [
    {
      id: 'agg_summary',
      title: 'Dimensional Aggregation & Summary',
      description: `Group by ${profile.primaryDimensionKey} to calculate count, sum, average, min, and max.`,
      query: `SELECT 
  "${dimCol}" AS Dimension,
  COUNT(*) AS Record_Count,
  ROUND(SUM("${metricCol}"), 2) AS Total_${sanitizeSqlIdentifier(profile.primaryMetricKey)},
  ROUND(AVG("${metricCol}"), 2) AS Avg_${sanitizeSqlIdentifier(profile.primaryMetricKey)},
  MIN("${metricCol}") AS Min_Value,
  MAX("${metricCol}") AS Max_Value
FROM ${tableName}
GROUP BY "${dimCol}"
ORDER BY Total_${sanitizeSqlIdentifier(profile.primaryMetricKey)} DESC;`,
    },
    {
      id: 'pareto_top10',
      title: 'Top 10 Contributors with Share %',
      description: `Compute percentage contribution to total ${profile.primaryMetricKey}.`,
      query: `WITH Totals AS (
  SELECT SUM("${metricCol}") AS grand_total FROM ${tableName}
)
SELECT 
  "${dimCol}" AS Dimension,
  ROUND(SUM("${metricCol}"), 2) AS Total_Metric,
  ROUND((SUM("${metricCol}") * 100.0) / (SELECT grand_total FROM Totals), 2) AS Share_Percentage
FROM ${tableName}
GROUP BY "${dimCol}"
ORDER BY Total_Metric DESC
LIMIT 10;`,
    },
    {
      id: 'outlier_detection',
      title: 'Statistical Outliers (> 1.5x Mean)',
      description: `Identify high-value outlier records exceeding 1.5x the dataset average.`,
      query: `WITH Stats AS (
  SELECT AVG("${metricCol}") AS mean_val FROM ${tableName}
)
SELECT 
  * 
FROM ${tableName}
WHERE "${metricCol}" > (SELECT mean_val * 1.5 FROM Stats)
ORDER BY "${metricCol}" DESC
LIMIT 25;`,
    },
  ];

  if (secMetricCol) {
    queries.push({
      id: 'dual_metric_corr',
      title: `Cross-Metric Comparison (${profile.primaryMetricKey} vs ${profile.secondaryMetricKey})`,
      description: 'Compare primary vs secondary metrics across dimensional segments.',
      query: `SELECT 
  "${dimCol}" AS Dimension,
  COUNT(*) AS Total_Count,
  ROUND(SUM("${metricCol}"), 2) AS Total_${sanitizeSqlIdentifier(profile.primaryMetricKey)},
  ROUND(SUM("${secMetricCol}"), 2) AS Total_${sanitizeSqlIdentifier(profile.secondaryMetricKey || 'sec')},
  ROUND(AVG("${metricCol}"), 2) AS Avg_${sanitizeSqlIdentifier(profile.primaryMetricKey)},
  ROUND(AVG("${secMetricCol}"), 2) AS Avg_${sanitizeSqlIdentifier(profile.secondaryMetricKey || 'sec')}
FROM ${tableName}
GROUP BY "${dimCol}"
ORDER BY Total_${sanitizeSqlIdentifier(profile.primaryMetricKey)} DESC;`,
    });
  }

  if (dateCol) {
    queries.push({
      id: 'time_series_growth',
      title: 'Time-Series Breakdown by Date',
      description: `Chronological trends and sums grouped by ${profile.dateKey}.`,
      query: `SELECT 
  SUBSTR("${dateCol}", 1, 10) AS Time_Period,
  COUNT(*) AS Transactions,
  ROUND(SUM("${metricCol}"), 2) AS Daily_Total,
  ROUND(AVG("${metricCol}"), 2) AS Daily_Average
FROM ${tableName}
WHERE "${dateCol}" IS NOT NULL AND "${dateCol}" != ''
GROUP BY Time_Period
ORDER BY Time_Period ASC;`,
    });
  }

  queries.push({
    id: 'sqlite_master_schema',
    title: 'SQLite Schema & PRAGMA Metadata',
    description: 'Inspect underlying SQLite column definitions and indexing.',
    query: `PRAGMA table_info(${tableName});`,
  });

  return queries;
}

export const executeSqlQuery = runSqliteQuery;
