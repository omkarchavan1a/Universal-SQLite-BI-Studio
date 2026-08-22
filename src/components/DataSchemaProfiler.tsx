import React, { useState } from 'react';
import { 
  Hash, 
  Tag, 
  Calendar, 
  ToggleLeft, 
  Key, 
  FileText, 
  Database, 
  Sliders, 
  Sparkles, 
  Layers, 
  ArrowRight,
  TrendingUp,
  BarChart2,
  PieChart,
  Upload,
  Info
} from 'lucide-react';
import { ColumnSchema, ColumnType, DatasetProfile } from '../types';
import { formatMetricValue } from '../utils/universalParser';
import { ThemeConfig, getTheme } from '../themes';

interface DataSchemaProfilerProps {
  profile: DatasetProfile;
  onUpdateColumnType?: (columnKey: string, newType: ColumnType) => void;
  onUpdateRoles?: (roles: {
    primaryDimensionKey?: string;
    secondaryDimensionKey?: string;
    primaryMetricKey?: string;
    secondaryMetricKey?: string;
    dateKey?: string;
  }) => void;
  onSwitchToDashboard?: () => void;
  onUploadFileClick?: () => void;
  onSelectSampleDataset?: (id: string) => void;
  activeSampleId?: string;
  onUpdateProfile?: (profile: DatasetProfile) => void;
  onLaunchDashboard?: () => void;
  theme?: ThemeConfig;
}

export const DataSchemaProfiler: React.FC<DataSchemaProfilerProps> = ({
  profile,
  onUpdateColumnType,
  onUpdateRoles,
  onSwitchToDashboard,
  onUploadFileClick,
  onSelectSampleDataset,
  activeSampleId,
  onUpdateProfile,
  onLaunchDashboard,
  theme: propTheme,
}) => {
  const theme = propTheme || getTheme('berry_noir');
  const columns = profile?.columns || [];
  const [selectedColumnKey, setSelectedColumnKey] = useState<string | null>(
    columns[0]?.key || null
  );

  const selectedColumn = columns.find((c) => c.key === selectedColumnKey);

  const handleLaunch = () => {
    if (onSwitchToDashboard) onSwitchToDashboard();
    else if (onLaunchDashboard) onLaunchDashboard();
  };

  const handleTypeChange = (colKey: string, newType: ColumnType) => {
    if (onUpdateColumnType) {
      onUpdateColumnType(colKey, newType);
    } else if (onUpdateProfile) {
      const updatedCols = columns.map((col) =>
        col.key === colKey ? { ...col, type: newType } : col
      );
      onUpdateProfile({ ...profile, columns: updatedCols });
    }
  };

  const handleRolesChange = (roles: {
    primaryDimensionKey?: string;
    secondaryDimensionKey?: string;
    primaryMetricKey?: string;
    secondaryMetricKey?: string;
    dateKey?: string;
  }) => {
    if (onUpdateRoles) {
      onUpdateRoles(roles);
    } else if (onUpdateProfile) {
      onUpdateProfile({
        ...profile,
        primaryDimensionKey: roles.primaryDimensionKey ?? profile.primaryDimensionKey,
        secondaryDimensionKey: roles.secondaryDimensionKey !== undefined ? roles.secondaryDimensionKey : profile.secondaryDimensionKey,
        primaryMetricKey: roles.primaryMetricKey ?? profile.primaryMetricKey,
        secondaryMetricKey: roles.secondaryMetricKey !== undefined ? roles.secondaryMetricKey : profile.secondaryMetricKey,
        dateKey: roles.dateKey !== undefined ? roles.dateKey : profile.dateKey,
      });
    }
  };

  const getTypeIcon = (type: ColumnType) => {
    switch (type) {
      case 'numeric':
        return <Hash className="w-3.5 h-3.5" />;
      case 'categorical':
        return <Tag className="w-3.5 h-3.5" />;
      case 'date':
        return <Calendar className="w-3.5 h-3.5" />;
      case 'boolean':
        return <ToggleLeft className="w-3.5 h-3.5" />;
      case 'identifier':
        return <Key className="w-3.5 h-3.5" />;
      default:
        return <FileText className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* 1. Header Hero Banner: Schema & File Profiler */}
      <div
        className="rounded-2xl p-5 sm:p-6 border shadow-xs transition-colors duration-300"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.borderCard,
          color: theme.textPrimary,
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <span
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border"
                style={{
                  backgroundColor: theme.bgBadge,
                  color: theme.accentPrimary,
                  borderColor: theme.borderSubtle,
                }}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Data Schema & Type Inspector</span>
              </span>
              <span className="text-xs font-mono" style={{ color: theme.textMuted }}>
                {profile.rowCount.toLocaleString()} Rows &bull; {profile.columnCount} Attributes
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: theme.textPrimary }}>
              {profile.name}
            </h2>
            <p className="text-xs sm:text-sm max-w-2xl" style={{ color: theme.textSecondary }}>
              Auto-profiled attributes, statistical distributions, and field types. Ready to render in chosen theme or explore via SQLite.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onUploadFileClick ? onUploadFileClick() : document.getElementById('upload-file-btn')?.click()}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer"
              style={{
                backgroundColor: theme.bgInput,
                borderColor: theme.borderSubtle,
                color: theme.textPrimary,
              }}
            >
              <Upload className="w-3.5 h-3.5" style={{ color: theme.accentPrimary }} />
              <span>Load Another File</span>
            </button>

            <button
              id="proceed-to-dashboard-btn"
              onClick={handleLaunch}
              className="flex items-center space-x-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white shadow-xs transition cursor-pointer"
              style={{
                background: theme.accentGradient,
              }}
            >
              <span>Launch Visual Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Sample Dataset Selector Pills */}
        <div className="mt-5 pt-4 border-t flex flex-wrap items-center gap-2" style={{ borderColor: theme.borderSubtle }}>
          <span className="text-xs font-semibold flex items-center mr-1" style={{ color: theme.textSecondary }}>
            <Sparkles className="w-3.5 h-3.5 mr-1" style={{ color: theme.accentPrimary }} />
            Test with Pre-loaded Domains:
          </span>
          {[
            { id: 'payroll_hr', label: 'HR & Payroll' },
            { id: 'ecommerce_sales', label: 'E-Commerce Sales' },
            { id: 'saas_metrics', label: 'SaaS Telemetry' },
            { id: 'supply_chain', label: 'Inventory Logistics' },
          ].map((sample) => {
            const isActive = activeSampleId === sample.id;
            return (
              <button
                key={sample.id}
                onClick={() => onSelectSampleDataset && onSelectSampleDataset(sample.id)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  isActive ? 'text-white shadow-xs' : ''
                }`}
                style={{
                  background: isActive ? theme.accentGradient : theme.bgInput,
                  color: isActive ? '#FFFFFF' : theme.textSecondary,
                  borderColor: isActive ? 'transparent' : theme.borderSubtle,
                }}
              >
                {sample.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Dashboard Role Configuration Card */}
      <div
        className="rounded-2xl p-4.5 border shadow-xs transition-colors duration-300"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.borderCard,
        }}
      >
        <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b" style={{ borderColor: theme.borderSubtle }}>
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4" style={{ color: theme.accentPrimary }} />
            <h3 className="text-sm font-bold" style={{ color: theme.textPrimary }}>
              Target Chart Dimension & Metric Mapping
            </h3>
          </div>
          <span className="text-[11px]" style={{ color: theme.textMuted }}>
            Auto-assigned from data types (modifiable)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
          {/* Primary Dimension */}
          <div>
            <label className="block font-semibold mb-1 flex items-center gap-1.5" style={{ color: theme.textSecondary }}>
              <BarChart2 className="w-3.5 h-3.5" style={{ color: theme.accentPrimary }} />
              Primary Dimension (X-Axis)
            </label>
            <select
              value={profile.primaryDimensionKey}
              onChange={(e) => handleRolesChange({ primaryDimensionKey: e.target.value })}
              className="w-full rounded-xl px-2.5 py-1.5 text-xs font-semibold border focus:outline-none cursor-pointer"
              style={{
                backgroundColor: theme.bgInput,
                borderColor: theme.borderSubtle,
                color: theme.textPrimary,
              }}
            >
              {profile.columns.map((c) => (
                <option key={c.key} value={c.key} style={{ backgroundColor: theme.bgCard, color: theme.textPrimary }}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          {/* Secondary Dimension */}
          <div>
            <label className="block font-semibold mb-1 flex items-center gap-1.5" style={{ color: theme.textSecondary }}>
              <PieChart className="w-3.5 h-3.5" style={{ color: theme.accentSecondary }} />
              Secondary Dimension (Donut/Grouping)
            </label>
            <select
              value={profile.secondaryDimensionKey || ''}
              onChange={(e) => handleRolesChange({ secondaryDimensionKey: e.target.value || undefined })}
              className="w-full rounded-xl px-2.5 py-1.5 text-xs font-semibold border focus:outline-none cursor-pointer"
              style={{
                backgroundColor: theme.bgInput,
                borderColor: theme.borderSubtle,
                color: theme.textPrimary,
              }}
            >
              <option value="" style={{ backgroundColor: theme.bgCard, color: theme.textPrimary }}>-- None / Auto --</option>
              {profile.columns.map((c) => (
                <option key={c.key} value={c.key} style={{ backgroundColor: theme.bgCard, color: theme.textPrimary }}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          {/* Primary Metric */}
          <div>
            <label className="block font-semibold mb-1 flex items-center gap-1.5" style={{ color: theme.textSecondary }}>
              <TrendingUp className="w-3.5 h-3.5" style={{ color: theme.accentPrimary }} />
              Primary Numeric Metric (Y-Axis)
            </label>
            <select
              value={profile.primaryMetricKey}
              onChange={(e) => handleRolesChange({ primaryMetricKey: e.target.value })}
              className="w-full rounded-xl px-2.5 py-1.5 text-xs font-semibold border focus:outline-none cursor-pointer"
              style={{
                backgroundColor: theme.bgInput,
                borderColor: theme.borderSubtle,
                color: theme.textPrimary,
              }}
            >
              {profile.columns
                .filter((c) => c.type === 'numeric')
                .map((c) => (
                  <option key={c.key} value={c.key} style={{ backgroundColor: theme.bgCard, color: theme.textPrimary }}>
                    {c.name} {c.isCurrency ? '($)' : ''}
                  </option>
                ))}
            </select>
          </div>

          {/* Secondary Metric */}
          <div>
            <label className="block font-semibold mb-1 flex items-center gap-1.5" style={{ color: theme.textSecondary }}>
              <TrendingUp className="w-3.5 h-3.5" style={{ color: theme.accentSecondary }} />
              Secondary Numeric Metric (Scatter/Trend)
            </label>
            <select
              value={profile.secondaryMetricKey || ''}
              onChange={(e) => handleRolesChange({ secondaryMetricKey: e.target.value || undefined })}
              className="w-full rounded-xl px-2.5 py-1.5 text-xs font-semibold border focus:outline-none cursor-pointer"
              style={{
                backgroundColor: theme.bgInput,
                borderColor: theme.borderSubtle,
                color: theme.textPrimary,
              }}
            >
              <option value="" style={{ backgroundColor: theme.bgCard, color: theme.textPrimary }}>-- None / Auto --</option>
              {profile.columns
                .filter((c) => c.type === 'numeric')
                .map((c) => (
                  <option key={c.key} value={c.key} style={{ backgroundColor: theme.bgCard, color: theme.textPrimary }}>
                    {c.name} {c.isCurrency ? '($)' : ''}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Detailed Column Schema & Type Inspection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Columns List & Overview Table */}
        <div
          className="lg:col-span-2 rounded-2xl border shadow-xs overflow-hidden transition-colors duration-300"
          style={{
            backgroundColor: theme.bgCard,
            borderColor: theme.borderCard,
          }}
        >
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: theme.borderSubtle }}>
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: theme.textPrimary }}>
              <Layers className="w-4 h-4" style={{ color: theme.accentPrimary }} />
              Detected Columns & Field Types ({profile.columns.length})
            </h3>
            <span className="text-xs" style={{ color: theme.textMuted }}>
              Click any column to view statistics
            </span>
          </div>

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
                  <th className="py-2.5 px-3.5">Column Name</th>
                  <th className="py-2.5 px-3">Data Type</th>
                  <th className="py-2.5 px-3 text-center">Completeness</th>
                  <th className="py-2.5 px-3 text-center">Distinct</th>
                  <th className="py-2.5 px-3.5 text-right">Summary Stat</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: theme.borderSubtle, color: theme.textPrimary }}>
                {profile.columns.map((col) => {
                  const isSelected = selectedColumnKey === col.key;
                  const fillRate = ((col.nonNullCount / col.totalCount) * 100).toFixed(0);

                  return (
                    <tr
                      key={col.key}
                      onClick={() => setSelectedColumnKey(col.key)}
                      className="cursor-pointer transition-colors"
                      style={{
                        backgroundColor: isSelected ? theme.bgBadge : 'transparent',
                      }}
                    >
                      {/* Name & Key */}
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold" style={{ color: theme.textPrimary }}>{col.name}</span>
                          {col.key === profile.primaryDimensionKey && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono border" style={{ backgroundColor: theme.bgInput, color: theme.accentPrimary, borderColor: theme.borderSubtle }}>
                              Primary Dim
                            </span>
                          )}
                          {col.key === profile.primaryMetricKey && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono border" style={{ backgroundColor: theme.bgInput, color: theme.accentSecondary, borderColor: theme.borderSubtle }}>
                              Primary Metric
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono" style={{ color: theme.textMuted }}>{col.key}</span>
                      </td>

                      {/* Data Type & Override */}
                      <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center space-x-1.5">
                          <span
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold border"
                            style={{
                              backgroundColor: theme.bgInput,
                              color: theme.accentPrimary,
                              borderColor: theme.borderSubtle,
                            }}
                          >
                            {getTypeIcon(col.type)}
                            <span className="capitalize">{col.type}</span>
                          </span>
                          <select
                            value={col.type}
                            onChange={(e) => handleTypeChange(col.key, e.target.value as ColumnType)}
                            className="text-[10px] rounded px-1.5 py-0.5 border cursor-pointer"
                            style={{
                              backgroundColor: theme.bgInput,
                              borderColor: theme.borderSubtle,
                              color: theme.textPrimary,
                            }}
                            title="Change detected type"
                          >
                            <option value="numeric">Numeric</option>
                            <option value="categorical">Categorical</option>
                            <option value="date">Date</option>
                            <option value="boolean">Boolean</option>
                            <option value="identifier">ID / Key</option>
                            <option value="text">Text</option>
                          </select>
                        </div>
                      </td>

                      {/* Completeness Bar */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex items-center space-x-1.5">
                          <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.borderSubtle }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${fillRate}%`, backgroundColor: theme.accentPrimary }}
                            />
                          </div>
                          <span className="text-[11px] font-mono" style={{ color: theme.textSecondary }}>{fillRate}%</span>
                        </div>
                      </td>

                      {/* Unique Count */}
                      <td className="py-2.5 px-3 text-center font-mono" style={{ color: theme.textSecondary }}>
                        {col.uniqueCount.toLocaleString()}
                      </td>

                      {/* Summary Stat */}
                      <td className="py-2.5 px-3.5 text-right font-mono">
                        {col.type === 'numeric' ? (
                          <span className="font-bold" style={{ color: theme.accentPrimary }}>
                            Sum: {formatMetricValue(col.sum, col.isCurrency, col.isPercentage)}
                          </span>
                        ) : col.type === 'categorical' ? (
                          <span style={{ color: theme.textSecondary }}>
                            Top: {col.topCategories?.[0]?.value || '—'}
                          </span>
                        ) : col.type === 'date' ? (
                          <span style={{ color: theme.accentSecondary }}>
                            {col.minDate || '—'} &rarr; {col.maxDate || '—'}
                          </span>
                        ) : (
                          <span style={{ color: theme.textMuted }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Column Detail Card (Selected Column Deep Dive) */}
        <div
          className="rounded-2xl p-4.5 border shadow-xs flex flex-col justify-between transition-colors duration-300"
          style={{
            backgroundColor: theme.bgCard,
            borderColor: theme.borderCard,
          }}
        >
          {selectedColumn ? (
            <div className="space-y-4">
              <div className="pb-3 border-b" style={{ borderColor: theme.borderSubtle }}>
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold border"
                    style={{
                      backgroundColor: theme.bgBadge,
                      color: theme.accentPrimary,
                      borderColor: theme.borderSubtle,
                    }}
                  >
                    {getTypeIcon(selectedColumn.type)}
                    <span className="capitalize">{selectedColumn.type} Field</span>
                  </span>
                  <span className="text-xs font-mono" style={{ color: theme.textMuted }}>
                    {selectedColumn.nonNullCount} of {selectedColumn.totalCount} non-null
                  </span>
                </div>
                <h4 className="text-base font-bold mt-2" style={{ color: theme.textPrimary }}>
                  {selectedColumn.name}
                </h4>
                <p className="text-xs font-mono" style={{ color: theme.textMuted }}>{selectedColumn.key}</p>
              </div>

              {/* Numeric In-depth Stats */}
              {selectedColumn.type === 'numeric' && (
                <div className="space-y-2.5">
                  <span className="text-xs font-bold block" style={{ color: theme.textSecondary }}>
                    Calculated Summary Metrics
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl border" style={{ backgroundColor: theme.bgInput, borderColor: theme.borderSubtle }}>
                      <span className="text-[10px] block font-semibold" style={{ color: theme.textMuted }}>AVERAGE</span>
                      <span className="font-mono font-bold" style={{ color: theme.textPrimary }}>
                        {formatMetricValue(selectedColumn.avg, selectedColumn.isCurrency, selectedColumn.isPercentage)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl border" style={{ backgroundColor: theme.bgInput, borderColor: theme.borderSubtle }}>
                      <span className="text-[10px] block font-semibold" style={{ color: theme.textMuted }}>MEDIAN</span>
                      <span className="font-mono font-bold" style={{ color: theme.textPrimary }}>
                        {formatMetricValue(selectedColumn.median, selectedColumn.isCurrency, selectedColumn.isPercentage)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl border" style={{ backgroundColor: theme.bgInput, borderColor: theme.borderSubtle }}>
                      <span className="text-[10px] block font-semibold" style={{ color: theme.textMuted }}>MINIMUM</span>
                      <span className="font-mono font-bold" style={{ color: theme.textPrimary }}>
                        {formatMetricValue(selectedColumn.min, selectedColumn.isCurrency, selectedColumn.isPercentage)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl border" style={{ backgroundColor: theme.bgInput, borderColor: theme.borderSubtle }}>
                      <span className="text-[10px] block font-semibold" style={{ color: theme.textMuted }}>MAXIMUM</span>
                      <span className="font-mono font-bold" style={{ color: theme.textPrimary }}>
                        {formatMetricValue(selectedColumn.max, selectedColumn.isCurrency, selectedColumn.isPercentage)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border" style={{ backgroundColor: theme.bgBadge, borderColor: theme.borderSubtle }}>
                    <span className="text-[11px] block font-bold" style={{ color: theme.accentPrimary }}>Total Aggregate Sum</span>
                    <span className="text-lg font-mono font-bold" style={{ color: theme.textPrimary }}>
                      {formatMetricValue(selectedColumn.sum, selectedColumn.isCurrency, selectedColumn.isPercentage)}
                    </span>
                  </div>
                </div>
              )}

              {/* Categorical Distribution Breakdown */}
              {selectedColumn.type === 'categorical' && selectedColumn.topCategories && (
                <div className="space-y-2">
                  <span className="text-xs font-bold block" style={{ color: theme.textSecondary }}>
                    Top Values & Frequency Share
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {selectedColumn.topCategories.map((cat, idx) => (
                      <div key={idx} className="p-2 rounded-xl border text-xs" style={{ backgroundColor: theme.bgInput, borderColor: theme.borderSubtle }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium truncate max-w-[160px]" style={{ color: theme.textPrimary }}>
                            {cat.value || '(Empty)'}
                          </span>
                          <span className="font-mono font-bold" style={{ color: theme.accentPrimary }}>
                            {cat.count} ({cat.percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: theme.borderSubtle }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${cat.percentage}%`, backgroundColor: theme.accentPrimary }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample Data Values */}
              <div>
                <span className="text-xs font-bold mb-1.5 block" style={{ color: theme.textSecondary }}>
                  Sample Data Values
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedColumn.sampleValues.map((val, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-lg border text-[11px] font-mono max-w-[180px] truncate"
                      style={{
                        backgroundColor: theme.bgInput,
                        borderColor: theme.borderSubtle,
                        color: theme.textPrimary,
                      }}
                    >
                      {String(val)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs" style={{ color: theme.textMuted }}>
              <Info className="w-6 h-6 mx-auto mb-2 opacity-50" style={{ color: theme.accentPrimary }} />
              <p>Select any column on the left table to inspect details.</p>
            </div>
          )}

          {/* Action button at bottom of card */}
          <div className="mt-4 pt-3 border-t" style={{ borderColor: theme.borderSubtle }}>
            <button
              onClick={handleLaunch}
              className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl text-white text-xs font-bold transition cursor-pointer shadow-xs"
              style={{
                background: theme.accentGradient,
              }}
            >
              <span>Build Dashboard for this Dataset</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
