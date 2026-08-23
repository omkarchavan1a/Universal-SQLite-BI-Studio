import React from 'react';
import { motion } from 'motion/react';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Layers,
  Award,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUp,
  ArrowDown,
  Clock,
  Sparkles,
  Zap
} from 'lucide-react';
import { DatasetProfile, GenericRecord, DashboardConfig } from '../types';
import { formatMetricValue } from '../utils/universalParser';
import { ThemeConfig, getTheme } from '../themes';

interface KPIGridProps {
  profile: DatasetProfile;
  records?: GenericRecord[];
  filteredRecords?: GenericRecord[];
  totalCount?: number;
  isRealtimeActive?: boolean;
  theme?: ThemeConfig;
  activeDashboard?: DashboardConfig;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 280,
      damping: 24,
    },
  },
};

export const KPIGrid: React.FC<KPIGridProps> = ({
  profile,
  records = [],
  filteredRecords,
  totalCount: explicitTotalCount,
  isRealtimeActive = false,
  theme: propTheme,
  activeDashboard,
}) => {
  const theme = propTheme || getTheme('berry_noir');
  const safeRecords = Array.isArray(records) ? records : [];
  const safeFilteredRecords = Array.isArray(filteredRecords) ? filteredRecords : safeRecords;
  const totalCount = explicitTotalCount ?? safeRecords.length;
  const filteredCount = safeFilteredRecords.length;

  const columns = profile?.columns || [];
  const primaryMetricKey = activeDashboard?.metricKey1 || profile?.primaryMetricKey;
  const secondaryMetricKey = activeDashboard?.metricKey2 || profile?.secondaryMetricKey;
  const primaryDimKey = activeDashboard?.dimensionKey || profile?.primaryDimensionKey;

  const primaryMetricCol = columns.find((c) => c.key === primaryMetricKey);
  const secondaryMetricCol = columns.find((c) => c.key === secondaryMetricKey);
  const primaryDimCol = columns.find((c) => c.key === primaryDimKey);

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

  const groupCount = Math.max(1, Object.keys(dimFrequency).length);
  const primaryAvg = filteredCount > 0 ? primarySum / filteredCount : 0;
  const secondaryAvg = filteredCount > 0 ? secondarySum / filteredCount : 0;

  // Compare averages against dataset baseline profile averages
  const primaryBaselineAvg = primaryMetricCol?.average ?? (safeRecords.length > 0 ? primarySum / safeRecords.length : primaryAvg);
  const primaryDiffPct = primaryBaselineAvg !== 0 
    ? ((primaryAvg - primaryBaselineAvg) / Math.abs(primaryBaselineAvg)) * 100 
    : 0;

  const secondaryBaselineAvg = secondaryMetricCol?.average ?? (safeRecords.length > 0 ? secondarySum / safeRecords.length : secondaryAvg);
  const secondaryDiffPct = secondaryBaselineAvg !== 0 
    ? ((secondaryAvg - secondaryBaselineAvg) / Math.abs(secondaryBaselineAvg)) * 100 
    : 0;

  // Record volume pacing compared to average records per group
  const currentRecordsPerGroup = filteredCount / groupCount;
  const baselineRecordsPerGroup = totalCount / Math.max(1, primaryDimCol?.uniqueCount || groupCount);
  const recordsDiffPct = baselineRecordsPerGroup > 0 
    ? ((currentRecordsPerGroup - baselineRecordsPerGroup) / baselineRecordsPerGroup) * 100 
    : (totalCount > 0 ? ((filteredCount - totalCount) / totalCount) * 100 : 0);

  // Find top category
  let topCategory = { name: '—', count: 0, metricSum: 0 };
  Object.entries(dimFrequency).forEach(([name, data]) => {
    if (data.metricSum > topCategory.metricSum || (topCategory.metricSum === 0 && data.count > topCategory.count)) {
      topCategory = { name, count: data.count, metricSum: data.metricSum };
    }
  });

  // Top category compared to average category volume
  const avgCategoryMetric = groupCount > 0 ? primarySum / groupCount : topCategory.metricSum;
  const avgCategoryCount = groupCount > 0 ? filteredCount / groupCount : topCategory.count;
  const topLeaderDiffPct = avgCategoryMetric > 0 
    ? ((topCategory.metricSum - avgCategoryMetric) / avgCategoryMetric) * 100 
    : (avgCategoryCount > 0 ? ((topCategory.count - avgCategoryCount) / avgCategoryCount) * 100 : 0);

  // Archetype-specific card styling
  const isCyber = theme.id === 'cyber_neon';
  const isGold = theme.id === 'obsidian_gold';
  const isMauve = theme.id === 'berry_noir';

  // Specific neon borders for Cyber Fleet
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

  // Helper renderer for trend badge next to KPI values
  const renderTrendBadge = (diffPct: number, baselineLabel = 'vs avg') => {
    const isUp = diffPct >= 0;
    const isNeutral = Math.abs(diffPct) < 0.05;
    const absVal = Math.abs(diffPct).toFixed(1);

    if (isNeutral) {
      return (
        <span
          className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono border"
          style={{
            backgroundColor: theme.bgBadge,
            color: theme.textSecondary,
            borderColor: theme.borderSubtle,
          }}
          title="Value is on par with baseline average"
        >
          <span>~0.0%</span>
        </span>
      );
    }

    return (
      <span
        className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono border transition-transform"
        style={{
          backgroundColor: isUp 
            ? (isCyber ? 'rgba(16, 185, 129, 0.16)' : 'rgba(16, 185, 129, 0.12)') 
            : (isCyber ? 'rgba(239, 68, 68, 0.16)' : 'rgba(244, 63, 94, 0.12)'),
          color: isUp ? '#10B981' : '#F43F5E',
          borderColor: isUp ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)',
        }}
        title={`${isUp ? 'Above' : 'Below'} average by ${absVal}% (${baselineLabel})`}
      >
        {isUp ? <ArrowUp className="w-2.5 h-2.5 shrink-0 stroke-[2.5]" /> : <ArrowDown className="w-2.5 h-2.5 shrink-0 stroke-[2.5]" />}
        <span>{isUp ? '+' : '-'}{absVal}%</span>
      </span>
    );
  };

  // Unique trigger key for entrance animations on dataset change or filter modification
  const animationKey = `${profile?.name || 'dataset'}-${filteredCount}-${totalCount}-${primarySum.toFixed(0)}`;

  return (
    <motion.div
      key={animationKey}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {/* 1. Total Volume / Records Card */}
      <motion.div 
        id="kpi-card-total-records"
        variants={cardVariants}
        whileHover={{ y: -3, transition: { duration: 0.2 } }}
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

          <div className="mt-2.5 flex items-baseline justify-between gap-1.5 flex-wrap">
            <div className="flex items-center space-x-1.5">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight font-mono" style={{ color: theme.textPrimary }}>
                {filteredCount.toLocaleString()}
              </span>
              {renderTrendBadge(recordsDiffPct, 'vs group avg')}
            </div>
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
          <span>Avg/Grp: <strong style={{ color: theme.textPrimary }}>{currentRecordsPerGroup.toFixed(0)} rows</strong></span>
          <span>Groups: <strong style={{ color: isCyber ? '#10B981' : theme.accentPrimary }}>{Object.keys(dimFrequency).length}</strong></span>
        </div>
      </motion.div>

      {/* 2. Primary Metric Aggregate Sum & Avg */}
      <motion.div 
        id="kpi-card-primary-metric"
        variants={cardVariants}
        whileHover={{ y: -3, transition: { duration: 0.2 } }}
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

          <div className="mt-2.5 flex items-baseline justify-between gap-1.5 flex-wrap">
            <div className="flex items-center space-x-1.5">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight font-mono" style={{ color: isCyber ? '#06B6D4' : theme.textPrimary }}>
                {primaryMetricCol ? formatMetricValue(primarySum, primaryMetricCol.isCurrency, primaryMetricCol.isPercentage) : '—'}
              </span>
              {primaryMetricCol && renderTrendBadge(primaryDiffPct, 'vs mean')}
            </div>
            {isRealtimeActive ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center" style={{ background: theme.bgBadge, color: theme.accentPrimary }}>
                <span className="w-1.5 h-1.5 rounded-full mr-1 animate-ping" style={{ backgroundColor: theme.accentPrimary }} />
                LIVE
              </span>
            ) : (
              <span 
                className="text-[11px] font-semibold flex items-center space-x-0.5" 
                style={{ color: primaryDiffPct >= 0 ? (isCyber ? '#06B6D4' : theme.accentPrimary) : '#F43F5E' }}
              >
                {primaryDiffPct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                <span>{primaryDiffPct >= 0 ? '+' : ''}{primaryDiffPct.toFixed(1)}%</span>
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
      </motion.div>

      {/* 3. Secondary Metric or Ratio Card */}
      <motion.div 
        id="kpi-card-secondary-metric"
        variants={cardVariants}
        whileHover={{ y: -3, transition: { duration: 0.2 } }}
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

          <div className="mt-2.5 flex items-baseline justify-between gap-1.5 flex-wrap">
            <div className="flex items-center space-x-1.5">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight font-mono" style={{ color: isCyber ? '#F59E0B' : theme.textPrimary }}>
                {secondaryMetricCol ? formatMetricValue(secondarySum, secondaryMetricCol.isCurrency, secondaryMetricCol.isPercentage) : '—'}
              </span>
              {secondaryMetricCol && renderTrendBadge(secondaryDiffPct, 'vs mean')}
            </div>
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
      </motion.div>

      {/* 4. Top Category Leader Card */}
      <motion.div 
        id="kpi-card-top-leader"
        variants={cardVariants}
        whileHover={{ y: -3, transition: { duration: 0.2 } }}
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

          <div className="mt-2.5 flex items-baseline justify-between gap-1.5 flex-wrap">
            <div className="flex items-center space-x-1.5">
              <span className="text-lg sm:text-xl font-bold tracking-tight truncate max-w-[160px]" style={{ color: theme.textPrimary }} title={topCategory.name}>
                {topCategory.name}
              </span>
              {renderTrendBadge(topLeaderDiffPct, 'vs category avg')}
            </div>
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
      </motion.div>
    </motion.div>
  );
};
