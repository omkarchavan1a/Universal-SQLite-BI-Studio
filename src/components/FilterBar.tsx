import React, { useState } from 'react';
import { 
  Search, 
  X, 
  Sliders, 
  ChevronDown, 
  ChevronUp, 
  Sparkles
} from 'lucide-react';
import { DatasetProfile, UniversalFilterState } from '../types';
import { formatMetricValue } from '../utils/universalParser';
import { ThemeConfig, getTheme } from '../themes';

interface FilterBarProps {
  profile: DatasetProfile;
  filters: UniversalFilterState;
  onFilterChange: (newFilters: UniversalFilterState) => void;
  totalCount: number;
  filteredCount: number;
  onApplyPreset: (presetName: string) => void;
  activePreset: string;
  theme?: ThemeConfig;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  profile,
  filters,
  onFilterChange,
  totalCount,
  filteredCount,
  onApplyPreset,
  activePreset,
  theme: propTheme,
}) => {
  const theme = propTheme || getTheme('berry_noir');
  const [isExpanded, setIsExpanded] = useState(false);

  const columns = profile?.columns || [];
  const categoricalCols = columns.filter((c) => c.type === 'categorical' && c.topCategories && c.topCategories.length > 0).slice(0, 3);
  const numericCols = columns.filter((c) => c.type === 'numeric' && c.max !== undefined && c.max > 0).slice(0, 2);

  const catFilters = filters?.categoricalFilters || {};
  const numRanges = filters?.numericRanges || {};
  const searchQuery = filters?.searchQuery || '';

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, searchQuery: e.target.value });
  };

  const handleCategoryToggle = (colKey: string, val: string) => {
    const currentList = catFilters[colKey] || [];
    const exists = currentList.includes(val);
    const updated = exists ? currentList.filter((v) => v !== val) : [...currentList, val];
    
    onFilterChange({
      ...filters,
      categoricalFilters: {
        ...catFilters,
        [colKey]: updated,
      },
    });
  };

  const handleNumericRangeChange = (colKey: string, minVal: number) => {
    const max = columns.find((c) => c.key === colKey)?.max || 100000;
    onFilterChange({
      ...filters,
      numericRanges: {
        ...numRanges,
        [colKey]: [minVal, max],
      },
    });
  };

  const handleResetFilters = () => {
    onFilterChange({
      searchQuery: '',
      categoricalFilters: {},
      numericRanges: {},
    });
    onApplyPreset('All Records');
  };

  const hasCategoricalFilter = Object.values(catFilters).some(
    (arr: any) => Array.isArray(arr) && arr.length > 0
  );
  const hasNumericFilter = Object.values(numRanges).some(
    (range: any) => Array.isArray(range) && range[0] > 0
  );
  const isFiltered = searchQuery !== '' || hasCategoricalFilter || hasNumericFilter;

  return (
    <div
      className="rounded-2xl p-4 border shadow-xs transition-colors duration-300"
      style={{
        backgroundColor: theme.bgCard,
        borderColor: theme.borderCard,
        color: theme.textPrimary,
      }}
    >
      {/* Top Row: Search & Dynamic Action Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Universal Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: theme.textMuted }} />
          <input
            id="search-input"
            type="text"
            placeholder={`Search across ${columns.length} columns & records...`}
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full rounded-xl pl-9.5 pr-8 py-2 text-xs sm:text-sm border focus:outline-none transition"
            style={{
              backgroundColor: theme.bgInput,
              borderColor: theme.borderSubtle,
              color: theme.textPrimary,
            }}
          />
          {searchQuery && (
            <button
              onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer opacity-70 hover:opacity-100"
              style={{ color: theme.textMuted }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Filter Presets & Filter Drawer Toggle */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold mr-1 flex items-center" style={{ color: theme.textSecondary }}>
            <Sparkles className="w-3.5 h-3.5 mr-1" style={{ color: theme.accentPrimary }} />
            Presets:
          </span>
          {[
            'All Records',
            'Top 25% High Value',
            'Above Average',
          ].map((preset) => {
            const isActive = activePreset === preset;
            return (
              <button
                key={preset}
                id={`preset-${preset.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                onClick={() => onApplyPreset(preset)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isActive ? 'shadow-xs text-white' : ''
                }`}
                style={{
                  background: isActive ? theme.accentGradient : theme.bgInput,
                  color: isActive ? '#FFFFFF' : theme.textSecondary,
                  border: `1px solid ${isActive ? 'transparent' : theme.borderSubtle}`,
                }}
              >
                {preset}
              </button>
            );
          })}

          {/* Toggle Expand Panel */}
          <button
            id="toggle-filter-panel-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer ml-auto md:ml-2"
            style={{
              backgroundColor: isExpanded || isFiltered ? theme.bgBadge : theme.bgInput,
              color: isExpanded || isFiltered ? theme.accentPrimary : theme.textSecondary,
              borderColor: isExpanded || isFiltered ? theme.accentPrimary : theme.borderSubtle,
            }}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Filters {isFiltered && `(${filteredCount}/${totalCount})`}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Multi-Filter Panel */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5" style={{ borderColor: theme.borderSubtle }}>
          {/* Dynamic Categorical Filters */}
          {categoricalCols.map((col) => {
            const selected = catFilters[col.key] || [];
            return (
              <div key={col.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold truncate max-w-[170px]" style={{ color: theme.textPrimary }} title={col.name}>
                    {col.name} ({selected.length ? `${selected.length} selected` : 'All'})
                  </label>
                  {selected.length > 0 && (
                    <button
                      onClick={() =>
                        onFilterChange({
                          ...filters,
                          categoricalFilters: {
                            ...catFilters,
                            [col.key]: [],
                          },
                        })
                      }
                      className="text-[11px] hover:underline cursor-pointer font-semibold"
                      style={{ color: theme.accentPrimary }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div
                  className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-2 rounded-xl border"
                  style={{ backgroundColor: theme.bgInput, borderColor: theme.borderSubtle }}
                >
                  {col.topCategories?.map((cat) => {
                    const isSelected = selected.includes(cat.value);
                    return (
                      <button
                        key={cat.value}
                        onClick={() => handleCategoryToggle(col.key, cat.value)}
                        className={`px-2 py-0.5 rounded-lg text-xs transition cursor-pointer ${
                          isSelected ? 'font-bold text-white shadow-xs' : ''
                        }`}
                        style={{
                          background: isSelected ? theme.accentGradient : theme.bgCard,
                          color: isSelected ? '#FFFFFF' : theme.textSecondary,
                          border: `1px solid ${isSelected ? 'transparent' : theme.borderSubtle}`,
                        }}
                      >
                        {cat.value || '(Empty)'} ({cat.count})
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Dynamic Numeric Range Sliders */}
          {numericCols.map((col) => {
            const currentRange = numRanges[col.key] || [0, col.max || 100];
            const maxVal = col.max || 100;
            return (
              <div key={col.key}>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold truncate max-w-[150px]" style={{ color: theme.textPrimary }} title={col.name}>
                    Min {col.name}
                  </label>
                  <span className="text-xs font-mono font-bold" style={{ color: theme.accentPrimary }}>
                    {formatMetricValue(currentRange[0], col.isCurrency, col.isPercentage)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={maxVal}
                  step={maxVal > 1000 ? Math.round(maxVal / 50) : 1}
                  value={currentRange[0]}
                  onChange={(e) => handleNumericRangeChange(col.key, Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: theme.accentPrimary, backgroundColor: theme.borderSubtle }}
                />
                <div className="flex justify-between text-[10px] mt-1 font-mono" style={{ color: theme.textMuted }}>
                  <span>0</span>
                  <span>Max: {formatMetricValue(maxVal, col.isCurrency, col.isPercentage)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active Filter Chips & Reset Row */}
      {isFiltered && (
        <div className="mt-3 pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-xs" style={{ borderColor: theme.borderSubtle }}>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium" style={{ color: theme.textMuted }}>Active filters:</span>
            {searchQuery && (
              <span className="px-2 py-0.5 rounded-full border text-[11px]" style={{ backgroundColor: theme.bgInput, borderColor: theme.borderSubtle, color: theme.textPrimary }}>
                Search: "{searchQuery}"
              </span>
            )}
            {Object.entries(catFilters).map(([k, vals]: [string, any]) => {
              if (!vals || !vals.length) return null;
              const colName = columns.find((c) => c.key === k)?.name || k;
              return (
                <span key={k} className="px-2 py-0.5 rounded-full border text-[11px]" style={{ backgroundColor: theme.bgInput, borderColor: theme.borderSubtle, color: theme.textPrimary }}>
                  {colName}: {vals.join(', ')}
                </span>
              );
            })}
            {Object.entries(numRanges).map(([k, range]: [string, any]) => {
              const min = range?.[0] ?? 0;
              if (min <= 0) return null;
              const col = columns.find((c) => c.key === k);
              return (
                <span key={k} className="px-2 py-0.5 rounded-full border text-[11px] font-mono" style={{ backgroundColor: theme.bgInput, borderColor: theme.borderSubtle, color: theme.textPrimary }}>
                  {col?.name || k} &ge; {formatMetricValue(min, col?.isCurrency, col?.isPercentage)}
                </span>
              );
            })}
          </div>

          <button
            id="clear-all-filters-btn"
            onClick={handleResetFilters}
            className="flex items-center space-x-1 transition cursor-pointer font-bold"
            style={{ color: '#EF4444' }}
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>
      )}
    </div>
  );
};
