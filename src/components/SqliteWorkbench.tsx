import React, { useState, useEffect } from 'react';
import {
  Database,
  Play,
  RotateCcw,
  Download,
  FileCode,
  Sparkles,
  Table,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ChevronRight,
  Clock,
  Layers,
  Search,
} from 'lucide-react';
import { DatasetProfile, GenericRecord } from '../types';
import { ThemeConfig, getTheme } from '../themes';
import {
  SqliteState,
  SqlQueryResult,
  runSqliteQuery,
  exportSqliteBinary,
  exportSqlDump,
  getSuggestedSqlQueries,
  SuggestedSqlQuery,
} from '../utils/sqliteEngine';

interface SqliteWorkbenchProps {
  sqliteState: SqliteState | null;
  profile: DatasetProfile;
  records: GenericRecord[];
  theme?: ThemeConfig;
  onRefreshDatabase?: () => void;
}

export const SqliteWorkbench: React.FC<SqliteWorkbenchProps> = ({
  sqliteState,
  profile,
  records,
  theme: propTheme,
  onRefreshDatabase,
}) => {
  const theme = propTheme || getTheme('berry_noir');
  const columnMap = sqliteState?.columnMap || {};
  const suggestedQueries = getSuggestedSqlQueries(profile, columnMap);
  
  const [queryInput, setQueryInput] = useState<string>(
    suggestedQueries[0]?.query || `SELECT * FROM dataset_records LIMIT 20;`
  );
  const [queryResult, setQueryResult] = useState<SqlQueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(suggestedQueries[0]?.id || '');
  const [copiedQuery, setCopiedQuery] = useState(false);
  const [pageSize, setPageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterText, setFilterText] = useState('');

  // Run initial default query when database is ready
  useEffect(() => {
    if (sqliteState?.db && !queryResult) {
      handleRunQuery(queryInput);
    }
  }, [sqliteState?.db]);

  const handleRunQuery = (sqlToRun?: string) => {
    const q = sqlToRun !== undefined ? sqlToRun : queryInput;
    if (!sqliteState?.db) return;

    setIsExecuting(true);
    // Use requestAnimationFrame for smooth UI feedback
    setTimeout(() => {
      const res = runSqliteQuery(sqliteState.db, q);
      setQueryResult(res);
      setCurrentPage(1);
      setIsExecuting(false);
    }, 20);
  };

  const handleSelectTemplate = (template: SuggestedSqlQuery) => {
    setSelectedTemplateId(template.id);
    setQueryInput(template.query);
    handleRunQuery(template.query);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(queryInput);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 2000);
  };

  const handleDownloadSqliteFile = () => {
    if (!sqliteState?.db) return;
    const binary = exportSqliteBinary(sqliteState.db);
    if (!binary) return;
    const blob = new Blob([binary], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profile.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_sqlite.db`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSqlDump = () => {
    const dump = exportSqlDump(records, profile, columnMap);
    const blob = new Blob([dump], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profile.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_dump.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered rows for result display
  const resultRows = queryResult?.values || [];
  const filteredResultRows = filterText.trim() === ''
    ? resultRows
    : resultRows.filter((row) =>
        row.some((cell) => String(cell || '').toLowerCase().includes(filterText.toLowerCase()))
      );

  const totalPages = Math.ceil(filteredResultRows.length / pageSize) || 1;
  const paginatedRows = filteredResultRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div
      className="space-y-6 rounded-2xl p-4 sm:p-6 border transition-all duration-300 shadow-sm"
      style={{
        backgroundColor: theme.bgCard,
        borderColor: theme.borderCard,
        color: theme.textPrimary,
      }}
    >
      {/* Header & Connection Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: theme.borderSubtle }}>
        <div className="flex items-center space-x-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
            style={{
              background: theme.bgBadge,
              color: theme.accentPrimary,
              border: `1px solid ${theme.borderCard}`,
            }}
          >
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight" style={{ color: theme.textPrimary }}>
                SQLite Relational Engine & SQL Console
              </h2>
              <span
                className="px-2 py-0.5 text-[10px] font-semibold rounded-full flex items-center space-x-1"
                style={{
                  backgroundColor: sqliteState?.isInitialized ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: sqliteState?.isInitialized ? '#10B981' : '#EF4444',
                  border: `1px solid ${sqliteState?.isInitialized ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                }}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${sqliteState?.isInitialized ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                <span>{sqliteState?.isInitialized ? 'SQLite WASM Connected' : 'Initializing...'}</span>
              </span>
            </div>
            <p className="text-xs" style={{ color: theme.textSecondary }}>
              Table: <code className="px-1.5 py-0.5 rounded font-mono text-[11px]" style={{ backgroundColor: theme.bgInput, color: theme.accentPrimary }}>{sqliteState?.tableName || 'dataset_records'}</code> &bull; {(sqliteState?.totalRows ?? records.length).toLocaleString()} rows &bull; {profile.columns.length} indexed columns
            </p>
          </div>
        </div>

        {/* Database Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onRefreshDatabase}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer"
            style={{
              backgroundColor: theme.bgInput,
              color: theme.textSecondary,
              border: `1px solid ${theme.borderCard}`,
            }}
            title="Re-seed SQLite database from active dataset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Re-seed DB</span>
          </button>

          <button
            onClick={handleDownloadSqliteFile}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer"
            style={{
              backgroundColor: theme.bgInput,
              color: theme.textPrimary,
              border: `1px solid ${theme.borderCard}`,
            }}
            title="Download real SQLite .db binary file"
          >
            <Download className="w-3.5 h-3.5" style={{ color: theme.accentPrimary }} />
            <span>Export .sqlite (.db)</span>
          </button>

          <button
            onClick={handleDownloadSqlDump}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer"
            style={{
              backgroundColor: theme.bgInput,
              color: theme.textPrimary,
              border: `1px solid ${theme.borderCard}`,
            }}
            title="Download SQL Schema DDL & INSERT dump"
          >
            <FileCode className="w-3.5 h-3.5" style={{ color: theme.accentSecondary }} />
            <span>Export .sql Dump</span>
          </button>
        </div>
      </div>

      {/* Query Templates Carousel */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold flex items-center space-x-1.5" style={{ color: theme.textSecondary }}>
            <Sparkles className="w-3.5 h-3.5" style={{ color: theme.accentPrimary }} />
            <span>Interactive SQL Query Presets</span>
          </span>
          <span className="text-[11px]" style={{ color: theme.textMuted }}>Click to load & execute query</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {suggestedQueries.map((template) => {
            const isSelected = selectedTemplateId === template.id;
            return (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className={`text-left p-3 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between ${
                  isSelected ? 'ring-1' : ''
                }`}
                style={{
                  backgroundColor: isSelected ? theme.bgCardHover : theme.bgInput,
                  borderColor: isSelected ? theme.accentPrimary : theme.borderSubtle,
                  ringColor: theme.accentPrimary,
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold" style={{ color: isSelected ? theme.accentPrimary : theme.textPrimary }}>
                      {template.title}
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'translate-x-0.5' : 'group-hover:translate-x-0.5'}`} style={{ color: isSelected ? theme.accentPrimary : theme.textMuted }} />
                  </div>
                  <p className="text-[11px] line-clamp-2" style={{ color: theme.textSecondary }}>
                    {template.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SQL Code Editor & Controls */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider flex items-center space-x-1.5" style={{ color: theme.textSecondary }}>
            <FileCode className="w-3.5 h-3.5" style={{ color: theme.accentPrimary }} />
            <span>SQL Query Statement</span>
          </label>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopySql}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs transition cursor-pointer"
              style={{
                backgroundColor: theme.bgInput,
                color: theme.textSecondary,
                border: `1px solid ${theme.borderSubtle}`,
              }}
            >
              {copiedQuery ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedQuery ? 'Copied' : 'Copy SQL'}</span>
            </button>

            <button
              onClick={() => handleRunQuery()}
              disabled={isExecuting || !sqliteState.db}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm text-white"
              style={{
                background: theme.accentGradient,
                opacity: isExecuting ? 0.7 : 1,
              }}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isExecuting ? 'Executing...' : 'Run SQL Query'}</span>
            </button>
          </div>
        </div>

        <div className="relative">
          <textarea
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            rows={5}
            spellCheck={false}
            className="w-full font-mono text-xs sm:text-sm p-3.5 rounded-xl border focus:outline-none focus:ring-1 leading-relaxed resize-y transition"
            style={{
              backgroundColor: theme.bgInput,
              borderColor: theme.borderCard,
              color: theme.textPrimary,
            }}
            placeholder="SELECT * FROM dataset_records WHERE ..."
          />
        </div>
      </div>

      {/* Query Execution Result & Statistics */}
      {queryResult && (
        <div className="space-y-3 pt-2">
          {/* Result Status Bar */}
          <div
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border text-xs"
            style={{
              backgroundColor: queryResult.error ? 'rgba(239, 68, 68, 0.08)' : theme.bgInput,
              borderColor: queryResult.error ? 'rgba(239, 68, 68, 0.3)' : theme.borderSubtle,
            }}
          >
            <div className="flex items-center space-x-2">
              {queryResult.error ? (
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              )}
              <span className="font-medium" style={{ color: queryResult.error ? '#EF4444' : theme.textPrimary }}>
                {queryResult.error ? `SQL Syntax Error: ${queryResult.error}` : `Query executed successfully`}
              </span>
            </div>

            {!queryResult.error && (
              <div className="flex items-center space-x-4 text-xs font-mono" style={{ color: theme.textSecondary }}>
                <span className="flex items-center space-x-1">
                  <Table className="w-3.5 h-3.5" style={{ color: theme.accentPrimary }} />
                  <span>{queryResult.rowCount.toLocaleString()} rows</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Layers className="w-3.5 h-3.5" style={{ color: theme.accentSecondary }} />
                  <span>{queryResult.columns.length} columns</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5" style={{ color: theme.textMuted }} />
                  <span>{queryResult.executionTimeMs}ms</span>
                </span>
              </div>
            )}
          </div>

          {/* Results Table */}
          {!queryResult.error && queryResult.columns.length > 0 && (
            <div className="space-y-3">
              {/* Filter within query results */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="relative max-w-xs w-full">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }} />
                  <input
                    type="text"
                    value={filterText}
                    onChange={(e) => {
                      setFilterText(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Filter SQL result records..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border focus:outline-none"
                    style={{
                      backgroundColor: theme.bgInput,
                      borderColor: theme.borderSubtle,
                      color: theme.textPrimary,
                    }}
                  />
                </div>

                <div className="flex items-center space-x-2 text-xs" style={{ color: theme.textSecondary }}>
                  <span>Showing {paginatedRows.length} of {filteredResultRows.length} rows</span>
                </div>
              </div>

              {/* Table Grid */}
              <div className="overflow-x-auto rounded-xl border" style={{ borderColor: theme.borderSubtle }}>
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr style={{ backgroundColor: theme.bgInput, borderBottom: `1px solid ${theme.borderCard}` }}>
                      {queryResult.columns.map((col, idx) => (
                        <th
                          key={idx}
                          className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px] whitespace-nowrap"
                          style={{ color: theme.accentPrimary }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={queryResult.columns.length}
                          className="px-4 py-8 text-center"
                          style={{ color: theme.textMuted }}
                        >
                          No matching records returned from SQLite query.
                        </td>
                      </tr>
                    ) : (
                      paginatedRows.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className="border-t transition-colors"
                          style={{
                            borderColor: theme.borderSubtle,
                            backgroundColor: rIdx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                          }}
                        >
                          {row.map((cell: any, cIdx: number) => {
                            const isNum = typeof cell === 'number';
                            return (
                              <td
                                key={cIdx}
                                className={`px-3.5 py-2 whitespace-nowrap ${isNum ? 'text-right' : 'text-left'}`}
                                style={{
                                  color: cell === null ? theme.textMuted : theme.textPrimary,
                                }}
                              >
                                {cell === null ? (
                                  <span className="italic text-[10px]">NULL</span>
                                ) : isNum ? (
                                  cell.toLocaleString()
                                ) : (
                                  String(cell)
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 text-xs" style={{ color: theme.textSecondary }}>
                  <div>
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1 rounded-lg border disabled:opacity-30 cursor-pointer"
                      style={{ backgroundColor: theme.bgInput, borderColor: theme.borderSubtle }}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1 rounded-lg border disabled:opacity-30 cursor-pointer"
                      style={{ backgroundColor: theme.bgInput, borderColor: theme.borderSubtle }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
