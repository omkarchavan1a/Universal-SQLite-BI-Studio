import React from 'react';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Layers,
  Award,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Sparkles,
  Zap
} from 'lucide-react';
import { DatasetProfile, GenericRecord } from '../types';
import { formatMetricValue } from '../utils/universalParser';
import { ThemeConfig, getTheme } from '../themes';

interface KPIGridProps {
  profile: DatasetProfile;
  records?: GenericRecord[];
  filteredRecords?: GenericRecord[];
  totalCount?: number;
  isRealtimeActive?: boolean;
  theme?: ThemeConfig;
}

export const KPIGrid: React.FC<KPIGridProps> = ({
  profile,
  records = [],
  filteredRecords,
  totalCount: explicitTotalCount,
  isRealtimeActive = false,
  theme: propTheme,
}) => {
  const theme = propTheme || getTheme('berry_noir');
  const safeRecords = Array.isArray(records) ? records : [];
  const safeFilteredRecords = Array.isArray(filteredRecords) ? filteredRecords : safeRecords;
  const totalCount = explicitTotalCount ?? safeRecords.length;
  const filteredCount = safeFilteredRecords.length;

  const columns = profile?.columns || [];
  const primaryMetricCol = columns.find((c) => c.key === profile?.primaryMetricKey);
  const secondaryMetricCol = columns.find((c) => c.key === profile?.secondaryMetricKey);
  const primaryDimCol = columns.find((c) => c.key === profile?.primaryDimensionKey);

  // Compute live aggregates from filtered records
  let primarySum = 0;
  let secondarySum = 0;
  const dimFrequency: Record<string, { count: number; metricSum: number }> = {};

  safeFilteredRecords.forEach((r) => {
    if (primaryMetricCol) {
      const val = Number(r[primaryMetricCol.key]);
      if (!isNaN(val)) primarySum += val;
    }
    if (secondaryMetricCol) {
      const val = Number(r[secondaryMetricCol.key]);
      if (!isNaN(val)) secondarySum += val;
    }
    if (primaryDimCol) {
      const dimVal = String(r[primaryDimCol.key] || '(Unassigned)');
      if (!dimFrequency[dimVal]) {
        dimFrequency[dimVal] = { count: 0, metricSum: 0 };
      }
      dimFrequency[dimVal].count += 1;
      const mVal = primaryMetricCol ? Number(r[primaryMetricCol.key]) : 0;
      if (!isNaN(mVal)) dimFrequency[dimVal].metricSum += mVal;
    }
  });

  const primaryAvg = filteredCount > 0 ? primarySum / filteredCount : 0;
  const secondaryAvg = filteredCount > 0 ? secondarySum / filteredCount : 0;

  // Find top category
  let topCategory = { name: '—', count: 0, metricSum: 0 };
  Object.entries(dimFrequency).forEach(([name, data]) => {
    if (data.metricSum > topCategory.metricSum || (topCategory.metricSum === 0 && data.count > topCategory.count)) {
      topCategory = { name, count: data.count, metricSum: data.metricSum };
    }
  });

  // Archetype-specific card styling
  const isCyber = theme.id === 'cyber_neon';
  const isGold = theme.id === 'obsidian_gold';
  const isMauve = theme.id === 'berry_noir';

  // Specific neon borders for Cyber Fleet (as in Image 3)
  const getCyberBorder = (index: number) => {
    if (!isCyber) return {};
    const borders = [
      { border: '1px solid #10B981', boxShadow: '0 0 16px -2px rgba(16, 185, 129, 0.25)' },
      { border: '1px solid #06B6D4', boxShadow: '0 0 16px -2px rgba(6, 182, 212, 0.25)' },
      { border: '1px solid #F59E0B', boxShadow: '0 0 16px -2px rgba(245, 158, 11, 0.25)' },
      { border: '1px solid #EF4444', boxShadow: '0 0 16px -2px rgba(239, 68, 68, 0.25)' },
    ];
    return borders[index % borders.length];
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Volume / Records Card */}
      <div 
        id="kpi-card-total-records"
        className="rounded-2xl p-4.5 border transition-all duration-300 relative overflow-hidden group shadow-sm flex flex-col justify-between"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: isCyber ? '#10B981' : theme.borderCard,
          ...getCyberBorder(0),
        }}
      >
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: theme.textMuted }}>
              TOTAL RECORDS
            </span>
            <div
              className="p-2 rounded-xl border shadow-xs"
              style={{
                background: theme.bgBadge,
                color: isCyber ? '#10B981' : theme.accentPrimary,
                borderColor: theme.borderCard,
              }}
            >
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight font-mono" style={{ color: theme.textPrimary }}>
              {filteredCount.toLocaleString()}
            </span>
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center space-x-0.5"
              style={{
                backgroundColor: theme.bgBadge,
                color: isCyber ? '#10B981' : theme.accentPrimary,
              }}
            >
              <ArrowUpRight className="w-3 h-3" />
              <span>{filteredCount === totalCount ? '100%' : `${((filteredCount/totalCount)*100).toFixed(0)}%`}</span>
            </span>
          </div>

          {/* Sparkline curve for Mauve/Gold */}
          {(isMauve || isGold) && (
            <div className="mt-3 h-6 w-full opacity-60">
              <svg className="w-full h-full" viewBox="0 0 100 24" preserveAspectRatio="none">
                <path
                  d="M0,18 Q15,6 30,14 T60,8 T85,16 T100,6"
                  fill="none"
                  stroke={theme.accentPrimary}
                  strokeWidth="2"
                />
              </svg>
            </div>
          )}
        </div>

        <div
          className="mt-3 pt-2.5 border-t flex items-center justify-between text-xs font-mono"
          style={{ borderColor: theme.borderSubtle, color: theme.textSecondary }}
        >
          <span>Attributes: <strong style={{ color: theme.textPrimary }}>{profile.columnCount} cols</strong></span>
          <span>Groups: <strong style={{ color: isCyber ? '#10B981' : theme.accentPrimary }}>{Object.keys(dimFrequency).length}</strong></span>
        </div>
      </div>

      {/* 2. Primary Metric Aggregate Sum & Avg */}
      <div 
        id="kpi-card-primary-metric"
        className="rounded-2xl p-4.5 border transition-all duration-300 relative overflow-hidden group shadow-sm flex flex-col justify-between"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: isCyber ? '#06B6D4' : theme.borderCard,
          ...getCyberBorder(1),
        }}
      >
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider truncate max-w-[170px]" style={{ color: theme.textMuted }} title={primaryMetricCol ? `Total ${primaryMetricCol.name}` : 'Primary Metric'}>
              {primaryMetricCol ? `TOTAL ${primaryMetricCol.name}` : 'PRIMARY METRIC'}
            </span>
            <div
              className="p-2 rounded-xl border shadow-xs"
              style={{
                background: theme.bgBadge,
                color: isCyber ? '#06B6D4' : theme.accentPrimary,
                borderColor: theme.borderCard,
              }}
            >
              {primaryMetricCol?.isCurrency ? <DollarSign className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
            </div>
          </div>

          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight font-mono" style={{ color: isCyber ? '#06B6D4' : theme.textPrimary }}>
              {primaryMetricCol ? formatMetricValue(primarySum, primaryMetricCol.isCurrency, primaryMetricCol.isPercentage) : '—'}
            </span>
            {isRealtimeActive ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center" style={{ background: theme.bgBadge, color: theme.accentPrimary }}>
                <span className="w-1.5 h-1.5 rounded-full mr-1 animate-ping" style={{ backgroundColor: theme.accentPrimary }} />
                LIVE
              </span>
            ) : (
              <span className="text-[11px] font-semibold flex items-center space-x-0.5" style={{ color: isCyber ? '#06B6D4' : theme.accentPrimary }}>
                <ArrowUpRight className="w-3 h-3" />
                <span>+12.5%</span>
              </span>
            )}
          </div>

          {/* Sparkline curve for Mauve/Gold */}
          {(isMauve || isGold) && (
            <div className="mt-3 h-6 w-full opacity-60">
              <svg className="w-full h-full" viewBox="0 0 100 24" preserveAspectRatio="none">
                <path
                  d="M0,14 Q20,20 40,8 T70,12 T100,4"
                  fill="none"
                  stroke={theme.accentPrimary}
                  strokeWidth="2"
                />
              </svg>
            </div>
          )}
        </div>

        <div
          className="mt-3 pt-2.5 border-t flex items-center justify-between text-xs font-mono"
          style={{ borderColor: theme.borderSubtle, color: theme.textSecondary }}
        >
          <span>Avg: <strong style={{ color: theme.textPrimary }}>{primaryMetricCol ? formatMetricValue(primaryAvg, primaryMetricCol.isCurrency, primaryMetricCol.isPercentage) : '—'}</strong></span>
          {primaryMetricCol?.median !== undefined && (
            <span>Med: <strong style={{ color: isCyber ? '#06B6D4' : theme.accentPrimary }}>{formatMetricValue(primaryMetricCol.median, primaryMetricCol.isCurrency, primaryMetricCol.isPercentage)}</strong></span>
          )}
        </div>
      </div>

      {/* 3. Secondary Metric or Ratio Card */}
      <div 
        id="kpi-card-secondary-metric"
        className="rounded-2xl p-4.5 border transition-all duration-300 relative overflow-hidden group shadow-sm flex flex-col justify-between"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: isCyber ? '#F59E0B' : theme.borderCard,
          ...getCyberBorder(2),
        }}
      >
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider truncate max-w-[170px]" style={{ color: theme.textMuted }} title={secondaryMetricCol ? `Total ${secondaryMetricCol.name}` : 'Secondary Metric'}>
              {secondaryMetricCol ? `TOTAL ${secondaryMetricCol.name}` : 'SECONDARY METRIC'}
            </span>
            <div
              className="p-2 rounded-xl border shadow-xs"
              style={{
                background: theme.bgBadge,
                color: isCyber ? '#F59E0B' : theme.accentSecondary,
                borderColor: theme.borderCard,
              }}
            >
              <Activity className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight font-mono" style={{ color: isCyber ? '#F59E0B' : theme.textPrimary }}>
              {secondaryMetricCol ? formatMetricValue(secondarySum, secondaryMetricCol.isCurrency, secondaryMetricCol.isPercentage) : '—'}
            </span>
            {secondaryMetricCol && primarySum > 0 && (
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full" style={{ background: theme.bgBadge, color: isCyber ? '#F59E0B' : theme.accentSecondary }}>
                {((secondarySum / primarySum) * 100).toFixed(1)}% of prim
              </span>
            )}
          </div>

          {/* Sparkline curve for Mauve/Gold */}
          {(isMauve || isGold) && (
            <div className="mt-3 h-6 w-full opacity-60">
              <svg className="w-full h-full" viewBox="0 0 100 24" preserveAspectRatio="none">
                <path
                  d="M0,10 Q25,2 50,16 T75,6 T100,12"
                  fill="none"
                  stroke={theme.accentSecondary}
                  strokeWidth="2"
                />
              </svg>
            </div>
          )}
        </div>

        <div
          className="mt-3 pt-2.5 border-t flex items-center justify-between text-xs font-mono"
          style={{ borderColor: theme.borderSubtle, color: theme.textSecondary }}
        >
          <span>Avg: <strong style={{ color: theme.textPrimary }}>{secondaryMetricCol ? formatMetricValue(secondaryAvg, secondaryMetricCol.isCurrency, secondaryMetricCol.isPercentage) : '—'}</strong></span>
          {secondaryMetricCol && (
            <span>Max: <strong style={{ color: isCyber ? '#F59E0B' : theme.accentSecondary }}>{formatMetricValue(secondaryMetricCol.max, secondaryMetricCol.isCurrency, secondaryMetricCol.isPercentage)}</strong></span>
          )}
        </div>
      </div>

      {/* 4. Top Category Leader Card */}
      <div 
        id="kpi-card-top-leader"
        className="rounded-2xl p-4.5 border transition-all duration-300 relative overflow-hidden group shadow-sm flex flex-col justify-between"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: isCyber ? '#EF4444' : theme.borderCard,
          ...getCyberBorder(3),
        }}
      >
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider truncate max-w-[170px]" style={{ color: theme.textMuted }}>
              TOP {primaryDimCol?.name.toUpperCase() || 'CATEGORY'}
            </span>
            <div
              className="p-2 rounded-xl border shadow-xs"
              style={{
                background: theme.bgBadge,
                color: isCyber ? '#EF4444' : theme.accentPrimary,
                borderColor: theme.borderCard,
              }}
            >
              <Award className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-lg sm:text-xl font-bold tracking-tight truncate max-w-[170px]" style={{ color: theme.textPrimary }} title={topCategory.name}>
              {topCategory.name}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold font-mono" style={{ background: theme.bgBadge, color: isCyber ? '#EF4444' : theme.accentPrimary }}>
              {topCategory.count} items
            </span>
          </div>

          {/* Sparkline curve for Mauve/Gold */}
          {(isMauve || isGold) && (
            <div className="mt-3 h-6 w-full opacity-60">
              <svg className="w-full h-full" viewBox="0 0 100 24" preserveAspectRatio="none">
                <path
                  d="M0,16 Q30,6 60,18 T100,4"
                  fill="none"
                  stroke={theme.accentPrimary}
                  strokeWidth="2"
                />
              </svg>
            </div>
          )}
        </div>

        <div
          className="mt-3 pt-2.5 border-t flex items-center justify-between text-xs font-mono"
          style={{ borderColor: theme.borderSubtle, color: theme.textSecondary }}
        >
          <span>Share: <strong style={{ color: isCyber ? '#EF4444' : theme.accentPrimary }}>{primarySum > 0 && topCategory.metricSum > 0 ? `${((topCategory.metricSum / primarySum) * 100).toFixed(0)}%` : '—'}</strong></span>
          <span>Vol: <strong style={{ color: theme.textPrimary }}>{topCategory.metricSum > 0 && primaryMetricCol ? formatMetricValue(topCategory.metricSum, primaryMetricCol.isCurrency, primaryMetricCol.isPercentage) : `${topCategory.count}`}</strong></span>
        </div>
      </div>
    </div>
  );
};
