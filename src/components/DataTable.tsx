import React, { useState, useMemo } from 'react';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Edit3, 
  Plus, 
  Trash2, 
  Check, 
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Table as TableIcon,
  Download
} from 'lucide-react';
import { DatasetProfile, GenericRecord } from '../types';
import { formatMetricValue, castValue } from '../utils/universalParser';
import { exportUniversalCSV } from '../utils/universalExcelEngine';
import { ThemeConfig, getTheme } from '../themes';

interface DataTableProps {
  profile: DatasetProfile;
  records?: GenericRecord[];
  onUpdateRecord: (updatedRecord: GenericRecord) => void;
  onAddRecord: (newRecord: GenericRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  recentlyUpdatedId: string | null;
  theme?: ThemeConfig;
}

export const DataTable: React.FC<DataTableProps> = ({
  profile,
  records = [],
  onUpdateRecord,
  onAddRecord,
  onDeleteRecord,
  recentlyUpdatedId,
  theme: propTheme,
}) => {
  const theme = propTheme || getTheme('berry_noir');
  const safeRecords = Array.isArray(records) ? records : [];
  const columns = profile?.columns || [];

  const [sortKey, setSortKey] = useState<string>(profile?.primaryMetricKey || columns[0]?.key || '');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRowData, setEditRowData] = useState<GenericRecord>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRowData, setNewRowData] = useState<GenericRecord>({});

  const idColKey = profile?.idKey || 'id';

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const sortedRecords = useMemo(() => {
    if (!sortKey) return safeRecords;
    const col = columns.find((c) => c.key === sortKey);
    const isNum = col?.type === 'numeric';

    return [...safeRecords].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (isNum) {
        const nA = Number(aVal) || 0;
        const nB = Number(bVal) || 0;
        return sortOrder === 'asc' ? nA - nB : nB - nA;
      }

      const strA = String(aVal || '').toLowerCase();
      const strB = String(bVal || '').toLowerCase();
      return sortOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [safeRecords, sortKey, sortOrder, columns]);

  const totalPages = Math.ceil(sortedRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  const startEdit = (record: GenericRecord) => {
    const recordId = String(record[idColKey] || record.id || record._id);
    setEditingId(recordId);
    setEditRowData({ ...record });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRowData({});
  };

  const saveEdit = (recordId: string) => {
    const original = records.find((r) => String(r[idColKey] || r.id || r._id) === recordId);
    if (!original) return;

    const updated: GenericRecord = { ...original };
    profile.columns.forEach((col) => {
      if (editRowData[col.key] !== undefined) {
        updated[col.key] = castValue(editRowData[col.key], col.type);
      }
    });

    onUpdateRecord(updated);
    setEditingId(null);
    setEditRowData({});
  };

  const handleAddNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: GenericRecord = { ...newRowData };
    if (!newRecord[idColKey] && !newRecord._id) {
      newRecord[idColKey] = `NEW-${Date.now().toString().slice(-4)}`;
    }
    profile.columns.forEach((col) => {
      newRecord[col.key] = castValue(newRecord[col.key] || '', col.type);
    });

    onAddRecord(newRecord);
    setIsAddModalOpen(false);
    setNewRowData({});
  };

  return (
    <div
      className="rounded-2xl border shadow-xs overflow-hidden transition-colors duration-300"
      style={{
        backgroundColor: theme.bgCard,
        borderColor: theme.borderCard,
      }}
    >
      {/* Table Header Controls */}
      <div
        className="p-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        style={{
          borderColor: theme.borderSubtle,
          backgroundColor: theme.bgCard,
        }}
      >
        <div className="flex items-center space-x-2.5">
          <div
            className="p-2 rounded-xl border shadow-xs"
            style={{
              backgroundColor: theme.bgBadge,
              color: theme.accentPrimary,
              borderColor: theme.borderSubtle,
            }}
          >
            <TableIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: theme.textPrimary }}>
              Itemized Master Records
            </h3>
            <p className="text-xs" style={{ color: theme.textSecondary }}>
              Interactive data table &bull; {safeRecords.length.toLocaleString()} records &bull; {columns.length} columns
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => exportUniversalCSV(safeRecords, profile)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer"
            style={{
              backgroundColor: theme.bgInput,
              borderColor: theme.borderSubtle,
              color: theme.textPrimary,
            }}
            title="Download current filtered data as CSV"
          >
            <Download className="w-3.5 h-3.5" style={{ color: theme.accentPrimary }} />
            <span>Export CSV</span>
          </button>

          <button
            id="add-new-record-btn"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-1.5 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
            style={{
              background: theme.accentGradient,
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>

          <div className="flex items-center space-x-1 text-xs" style={{ color: theme.textSecondary }}>
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-lg px-2 py-1 text-xs border focus:outline-none cursor-pointer"
              style={{
                backgroundColor: theme.bgInput,
                borderColor: theme.borderSubtle,
                color: theme.textPrimary,
              }}
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Dynamic Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead
            className="border-b font-semibold uppercase tracking-wider text-[11px]"
            style={{
              backgroundColor: theme.bgInput,
              borderColor: theme.borderSubtle,
              color: theme.textMuted,
            }}
          >
            <tr>
              {profile.columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-3 px-3.5 cursor-pointer transition hover:opacity-100 ${
                    col.type === 'numeric' ? 'text-right' : col.type === 'boolean' ? 'text-center' : 'text-left'
                  }`}
                  onClick={() => handleSort(col.key)}
                >
                  <div className={`inline-flex items-center space-x-1 ${col.type === 'numeric' ? 'justify-end' : ''}`}>
                    <span>{col.name}</span>
                    {sortKey === col.key ? (
                      sortOrder === 'asc' ? (
                        <ArrowUp className="w-3 h-3" style={{ color: theme.accentPrimary }} />
                      ) : (
                        <ArrowDown className="w-3 h-3" style={{ color: theme.accentPrimary }} />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
              ))}
              <th className="py-3 px-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: theme.borderSubtle, color: theme.textPrimary }}>
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={profile.columns.length + 1} className="py-8 text-center" style={{ color: theme.textMuted }}>
                  No records match current filter criteria.
                </td>
              </tr>
            ) : (
              paginatedRecords.map((r, rowIdx) => {
                const recordId = String(r[idColKey] || r.id || r._id || `ROW-${rowIdx}`);
                const isEditing = editingId === recordId;
                const isJustUpdated = recentlyUpdatedId === recordId;

                return (
                  <tr
                    key={recordId}
                    className="transition-colors duration-200"
                    style={{
                      backgroundColor: isJustUpdated ? theme.bgBadge : 'transparent',
                    }}
                  >
                    {profile.columns.map((col) => {
                      const val = r[col.key];

                      return (
                        <td
                          key={col.key}
                          className={`py-2.5 px-3.5 ${
                            col.type === 'numeric'
                              ? 'text-right font-mono'
                              : col.type === 'boolean'
                              ? 'text-center'
                              : 'text-left'
                          }`}
                        >
                          {isEditing ? (
                            col.type === 'numeric' ? (
                              <input
                                type="number"
                                value={editRowData[col.key] ?? val ?? ''}
                                onChange={(e) =>
                                  setEditRowData({ ...editRowData, [col.key]: e.target.value })
                                }
                                className="rounded px-1.5 py-0.5 text-xs w-24 text-right border"
                                style={{
                                  backgroundColor: theme.bgInput,
                                  borderColor: theme.borderSubtle,
                                  color: theme.textPrimary,
                                }}
                              />
                            ) : (
                              <input
                                type="text"
                                value={editRowData[col.key] ?? val ?? ''}
                                onChange={(e) =>
                                  setEditRowData({ ...editRowData, [col.key]: e.target.value })
                                }
                                className="rounded px-1.5 py-0.5 text-xs w-full max-w-[160px] border"
                                style={{
                                  backgroundColor: theme.bgInput,
                                  borderColor: theme.borderSubtle,
                                  color: theme.textPrimary,
                                }}
                              />
                            )
                          ) : col.type === 'numeric' ? (
                            <span className={col.key === profile.primaryMetricKey ? 'font-bold' : ''} style={{ color: col.key === profile.primaryMetricKey ? theme.accentPrimary : theme.textPrimary }}>
                              {formatMetricValue(val, col.isCurrency, col.isPercentage)}
                            </span>
                          ) : col.type === 'boolean' ? (
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                              style={{
                                backgroundColor: val ? theme.bgBadge : theme.bgInput,
                                color: val ? theme.accentPrimary : '#EF4444',
                              }}
                            >
                              {val ? 'TRUE' : 'FALSE'}
                            </span>
                          ) : col.type === 'identifier' ? (
                            <span className="font-mono font-semibold" style={{ color: theme.textSecondary }}>{String(val || '—')}</span>
                          ) : (
                            <span className="truncate max-w-[200px] block" title={String(val || '')} style={{ color: theme.textPrimary }}>
                              {String(val !== undefined && val !== null ? val : '—')}
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* Actions */}
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => saveEdit(recordId)}
                            className="p-1 rounded cursor-pointer"
                            style={{ backgroundColor: theme.bgBadge, color: theme.accentPrimary }}
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1 rounded cursor-pointer"
                            style={{ backgroundColor: theme.bgInput, color: '#EF4444' }}
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => startEdit(r)}
                            className="p-1 rounded transition cursor-pointer opacity-70 hover:opacity-100"
                            style={{ color: theme.accentPrimary }}
                            title="Edit row"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteRecord(recordId)}
                            className="p-1 rounded transition cursor-pointer opacity-70 hover:opacity-100"
                            style={{ color: '#EF4444' }}
                            title="Delete row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div
        className="p-3 border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-xs"
        style={{
          borderColor: theme.borderSubtle,
          backgroundColor: theme.bgCard,
          color: theme.textSecondary,
        }}
      >
        <div>
          Showing{' '}
          <strong style={{ color: theme.textPrimary }}>
            {safeRecords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
          </strong>{' '}
          to{' '}
          <strong style={{ color: theme.textPrimary }}>
            {Math.min(currentPage * pageSize, safeRecords.length)}
          </strong>{' '}
          of <strong style={{ color: theme.textPrimary }}>{safeRecords.length.toLocaleString()}</strong> entries
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            style={{
              backgroundColor: theme.bgInput,
              borderColor: theme.borderSubtle,
              color: theme.textPrimary,
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2.5 py-1 text-xs font-semibold" style={{ color: theme.textPrimary }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            style={{
              backgroundColor: theme.bgInput,
              borderColor: theme.borderSubtle,
              color: theme.textPrimary,
            }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add New Record Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div
            className="rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto border"
            style={{
              backgroundColor: theme.bgCard,
              borderColor: theme.borderCard,
              color: theme.textPrimary,
            }}
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b" style={{ borderColor: theme.borderSubtle }}>
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: theme.textPrimary }}>
                <Sparkles className="w-4 h-4" style={{ color: theme.accentPrimary }} />
                Add New Record
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="cursor-pointer opacity-70 hover:opacity-100"
                style={{ color: theme.textMuted }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profile.columns.map((col) => (
                  <div key={col.key}>
                    <label className="block font-semibold mb-1 truncate" style={{ color: theme.textSecondary }} title={col.name}>
                      {col.name} ({col.type})
                    </label>
                    <input
                      type={col.type === 'numeric' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                      placeholder={`Enter ${col.name}...`}
                      value={newRowData[col.key] ?? ''}
                      onChange={(e) => setNewRowData({ ...newRowData, [col.key]: e.target.value })}
                      className="w-full rounded-xl px-2.5 py-1.5 text-xs border focus:outline-none"
                      style={{
                        backgroundColor: theme.bgInput,
                        borderColor: theme.borderSubtle,
                        color: theme.textPrimary,
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-3 border-t flex items-center justify-end space-x-2" style={{ borderColor: theme.borderSubtle }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border cursor-pointer"
                  style={{
                    backgroundColor: theme.bgInput,
                    borderColor: theme.borderSubtle,
                    color: theme.textSecondary,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-1.5 rounded-xl text-white font-semibold shadow-xs cursor-pointer"
                  style={{
                    background: theme.accentGradient,
                  }}
                >
                  Add Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
