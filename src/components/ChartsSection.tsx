import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  Scatter,
} from 'recharts';
import {
  BarChart3,
  PieChart as PieIcon,
  LineChart as LineIcon,
  Layers,
  TrendingUp,
  Award,
  Sparkles,
  Gauge,
  Zap,
} from 'lucide-react';
import { DatasetProfile, GenericRecord, DashboardConfig } from '../types';
import { formatMetricValue } from '../utils/universalParser';
import { ThemeConfig, getTheme } from '../themes';

interface ChartsSectionProps {
  profile: DatasetProfile;
  records?: GenericRecord[];
  theme?: ThemeConfig;
  activeDashboard?: DashboardConfig;
}

const chartsContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const chartCardVariants = {
  hidden: { opacity: 0, y: 22, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 24,
    },
  },
};

export const ChartsSection: React.FC<ChartsSectionProps> = ({
  profile,
  records = [],
  theme: propTheme,
  activeDashboard,
}) => {
  const theme = propTheme || getTheme('berry_noir');
  const [activeTab, setActiveTab] = useState<'all' | 'bar' | 'pie' | 'line' | 'scatter'>('all');
  const [barMode, setBarMode] = useState<'stacked' | 'grouped'>('grouped');

  const safeRecords = Array.isArray(records) ? records : [];
  const columns = profile?.columns || [];

  // Chart Interactive Dimension & Metric Selectors
  const [selectedDimension, setSelectedDimension] = useState<string>(
    activeDashboard?.dimensionKey || profile?.primaryDimensionKey || columns[0]?.key || ''
  );
  const [selectedMetric1, setSelectedMetric1] = useState<string>(
    activeDashboard?.metricKey1 || profile?.primaryMetricKey || columns.find((c) => c.type === 'numeric')?.key || ''
  );
  const [selectedMetric2, setSelectedMetric2] = useState<string>(
    activeDashboard?.metricKey2 || profile?.secondaryMetricKey || columns.filter((c) => c.type === 'numeric')[1]?.key || ''
  );

  // Sync state when activeDashboard or profile changes
  useEffect(() => {
    if (activeDashboard) {
      if (activeDashboard.dimensionKey) setSelectedDimension(activeDashboard.dimensionKey);
      if (activeDashboard.metricKey1) setSelectedMetric1(activeDashboard.metricKey1);
      if (activeDashboard.metricKey2 !== undefined) setSelectedMetric2(activeDashboard.metricKey2);
      if (activeDashboard.chartLayout && ['all', 'bar', 'pie', 'line', 'scatter'].includes(activeDashboard.chartLayout)) {
        setActiveTab(activeDashboard.chartLayout as any);
      }
      if (activeDashboard.barMode) setBarMode(activeDashboard.barMode);
    } else if (profile) {
      const cols = profile.columns || [];
      setSelectedDimension(profile.primaryDimensionKey || cols[0]?.key || '');
      setSelectedMetric1(profile.primaryMetricKey || cols.find((c) => c.type === 'numeric')?.key || '');
      setSelectedMetric2(profile.secondaryMetricKey || cols.filter((c) => c.type === 'numeric')[1]?.key || '');
    }
  }, [activeDashboard, profile]);

  const dimensionCol = columns.find((c) => c.key === selectedDimension);
  const metric1Col = columns.find((c) => c.key === selectedMetric1);
  const metric2Col = columns.find((c) => c.key === selectedMetric2);
  const secDimensionCol = columns.find((c) => c.key === profile?.secondaryDimensionKey);

  // 1. Aggregation Data for Bar Chart
  const barChartData = useMemo(() => {
    if (!selectedDimension) return [];

    const aggMap: Record<string, { label: string; count: number; val1: number; val2: number }> = {};

    safeRecords.forEach((r) => {
      const dimRaw = r[selectedDimension];
      const dimLabel = dimRaw !== null && dimRaw !== undefined && String(dimRaw).trim() !== '' ? String(dimRaw).trim() : '(Unassigned)';

      if (!aggMap[dimLabel]) {
        aggMap[dimLabel] = { label: dimLabel, count: 0, val1: 0, val2: 0 };
      }
      aggMap[dimLabel].count += 1;

      if (selectedMetric1) {
        const v1 = Number(r[selectedMetric1]);
        if (!isNaN(v1)) aggMap[dimLabel].val1 += v1;
      }
      if (selectedMetric2) {
        const v2 = Number(r[selectedMetric2]);
        if (!isNaN(v2)) aggMap[dimLabel].val2 += v2;
      }
    });

    const list = Object.values(aggMap).sort((a, b) => {
      if (selectedMetric1) return b.val1 - a.val1;
      return b.count - a.count;
    });

    return list.slice(0, 12).map((item) => ({
      ...item,
      avgVal1: Math.round((item.val1 / (item.count || 1)) * 100) / 100,
      avgVal2: Math.round((item.val2 / (item.count || 1)) * 100) / 100,
    }));
  }, [safeRecords, selectedDimension, selectedMetric1, selectedMetric2]);

  // Grand Total for Donut Center
  const totalMetricSum = useMemo(() => {
    return barChartData.reduce((acc, curr) => acc + (selectedMetric1 ? curr.val1 : curr.count), 0);
  }, [barChartData, selectedMetric1]);

  // 2. Primary Dimension Breakdown (Pie Chart)
  const pieChartData = useMemo(() => {
    return barChartData.map((d) => ({
      name: d.label,
      value: selectedMetric1 ? d.val1 : d.count,
      count: d.count,
    }));
  }, [barChartData, selectedMetric1]);

  // 3. Secondary Dimension Breakdown (Pie Chart 2)
  const secPieChartData = useMemo(() => {
    const secKey = secDimensionCol?.key;
    if (!secKey) return [];

    const map: Record<string, { label: string; count: number; val: number }> = {};
    safeRecords.forEach((r) => {
      const raw = r[secKey];
      const label = raw !== null && raw !== undefined && String(raw).trim() !== '' ? String(raw).trim() : '(Unassigned)';
      if (!map[label]) map[label] = { label, count: 0, val: 0 };
      map[label].count += 1;
      if (selectedMetric1) {
        const v = Number(r[selectedMetric1]);
        if (!isNaN(v)) map[label].val += v;
      }
    });

    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((item) => ({
        name: item.label,
        value: selectedMetric1 ? item.val : item.count,
        count: item.count,
      }));
  }, [safeRecords, secDimensionCol, selectedMetric1]);

  // 4. Line / Area Trend Series Data
  const lineChartData = useMemo(() => {
    const dateCol = columns.find((c) => c.type === 'date' || c.key === profile?.dateKey);

    if (dateCol && safeRecords.length > 0) {
      const dateMap: Record<string, { date: string; sumVal1: number; sumVal2: number; count: number }> = {};

      safeRecords.forEach((r) => {
        const rawDate = r[dateCol.key];
        if (!rawDate) return;
        const dStr = String(rawDate).slice(0, 10);
        if (!dateMap[dStr]) {
          dateMap[dStr] = { date: dStr, sumVal1: 0, sumVal2: 0, count: 0 };
        }
        dateMap[dStr].count += 1;
        if (selectedMetric1) {
          const v1 = Number(r[selectedMetric1]);
          if (!isNaN(v1)) dateMap[dStr].sumVal1 += v1;
        }
        if (selectedMetric2) {
          const v2 = Number(r[selectedMetric2]);
          if (!isNaN(v2)) dateMap[dStr].sumVal2 += v2;
        }
      });

      return Object.values(dateMap)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 30)
        .map((d) => ({
          xLabel: d.date,
          val1: Number(d.sumVal1.toFixed(2)),
          val2: Number(d.sumVal2.toFixed(2)),
          count: d.count,
        }));
    }

    return barChartData.map((d) => ({
      xLabel: d.label,
      val1: d.val1,
      val2: d.val2,
      count: d.count,
      avgVal1: d.avgVal1,
    }));
  }, [safeRecords, columns, profile, selectedMetric1, selectedMetric2, barChartData]);

  // 5. Scatter / Correlation Data (Metric 1 vs Metric 2)
  const scatterData = useMemo(() => {
    if (!selectedMetric1 || safeRecords.length === 0) return [];
    const step = Math.max(1, Math.floor(safeRecords.length / 100));

    return safeRecords
      .filter((_, idx) => idx % step === 0)
      .map((r) => {
        const m1 = Number(r[selectedMetric1]) || 0;
        const m2 = selectedMetric2 ? Number(r[selectedMetric2]) || 0 : (r[profile.idKey] ? 1 : 0);
        const dimVal = selectedDimension ? String(r[selectedDimension] || '') : '';
        return {
          m1,
          m2,
          dimVal,
          id: String(r[profile.idKey] || ''),
        };
      });
  }, [safeRecords, selectedMetric1, selectedMetric2, selectedDimension, profile]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="p-3 rounded-xl border text-xs shadow-lg"
          style={{
            backgroundColor: theme.tooltipBg,
            borderColor: theme.tooltipBorder,
            color: theme.tooltipText,
          }}
        >
          <p className="font-bold mb-1" style={{ color: theme.textPrimary }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-3 py-0.5">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-mono font-bold" style={{ color: theme.textPrimary }}>
                {typeof entry.value === 'number'
                  ? formatMetricValue(
                      entry.value,
                      metric1Col?.isCurrency,
                      metric1Col?.isPercentage
                    )
                  : String(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const palette = theme.chartPalette;
  const isCyber = theme.id === 'cyber_neon';
  const isGold = theme.id === 'obsidian_gold';
  const isMauve = theme.id === 'berry_noir';

  return (
    <div className="space-y-4">
      {/* Chart Navigation Tabs & Metric Selectors */}
      <div
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 rounded-2xl border shadow-xs transition-colors"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.borderCard,
          color: theme.textPrimary,
        }}
      >
        {/* Left: View Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto">
          {[
            { id: 'all', label: 'All Visualizations', icon: Layers },
            { id: 'line', label: 'Timeline & Curves (Area)', icon: LineIcon },
            { id: 'pie', label: 'Proportions (Donut)', icon: PieIcon },
            { id: 'bar', label: 'Category Volume (Bar)', icon: BarChart3 },
            { id: 'scatter', label: 'Cross Correlation', icon: TrendingUp },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`chart-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  isActive ? 'shadow-xs text-white' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  background: isActive ? theme.accentGradient : 'transparent',
                  color: isActive ? '#FFFFFF' : theme.textSecondary,
                  border: isActive ? '1px solid transparent' : `1px solid ${theme.borderSubtle}`,
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Quick Dimension & Metric Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div
            className="flex items-center space-x-1 px-2.5 py-1 rounded-xl border"
            style={{
              backgroundColor: theme.bgInput,
              borderColor: theme.borderSubtle,
            }}
          >
            <span className="text-[11px] font-bold" style={{ color: theme.textMuted }}>DIMENSION:</span>
            <select
              value={selectedDimension}
              onChange={(e) => setSelectedDimension(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
              style={{ color: theme.textPrimary }}
            >
              {profile.columns.map((c) => (
                <option key={c.key} value={c.key} style={{ backgroundColor: theme.bgCard, color: theme.textPrimary }}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div
            className="flex items-center space-x-1 px-2.5 py-1 rounded-xl border"
            style={{
              backgroundColor: theme.bgInput,
              borderColor: theme.borderSubtle,
            }}
          >
            <span className="text-[11px] font-bold" style={{ color: theme.textMuted }}>METRIC:</span>
            <select
              value={selectedMetric1}
              onChange={(e) => setSelectedMetric1(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
              style={{ color: theme.textPrimary }}
            >
              {profile.columns
                .filter((c) => c.type === 'numeric')
                .map((c) => (
                  <option key={c.key} value={c.key} style={{ backgroundColor: theme.bgCard, color: theme.textPrimary }}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          {(activeTab === 'all' || activeTab === 'bar') && (
            <div
              className="flex items-center p-0.5 rounded-xl border"
              style={{
                backgroundColor: theme.bgInput,
                borderColor: theme.borderSubtle,
              }}
            >
              <button
                onClick={() => setBarMode('grouped')}
                className="px-2 py-0.5 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                style={{
                  backgroundColor: barMode === 'grouped' ? theme.bgCard : 'transparent',
                  color: barMode === 'grouped' ? theme.accentPrimary : theme.textMuted,
                }}
              >
                Grouped
              </button>
              <button
                onClick={() => setBarMode('stacked')}
                className="px-2 py-0.5 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                style={{
                  backgroundColor: barMode === 'stacked' ? theme.bgCard : 'transparent',
                  color: barMode === 'stacked' ? theme.accentPrimary : theme.textMuted,
                }}
              >
                Stacked
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Visualizations Grid */}
      <motion.div
        key={`${profile?.name || 'dataset'}-${safeRecords.length}-${activeTab}-${selectedDimension}-${selectedMetric1}`}
        variants={chartsContainerVariants}
        initial="hidden"
        animate="visible"
        className={`grid gap-4 ${activeTab === 'all' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}
      >
        
        {/* 1. Curve / Area Timeline Trend */}
        {(activeTab === 'all' || activeTab === 'line') && (
          <motion.div
            id="chart-container-line"
            variants={chartCardVariants}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="rounded-2xl p-4.5 border transition-all duration-300 shadow-sm"
            style={{
              backgroundColor: theme.bgCard,
              borderColor: theme.borderCard,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: theme.textPrimary }}>
                  <LineIcon className="w-4 h-4" style={{ color: theme.accentPrimary }} />
                  {profile.dateKey ? 'Timeline & Dynamic Revenue Trajectory' : `${metric1Col?.name || 'Metric'} Progression`}
                </h3>
                <p className="text-xs" style={{ color: theme.textSecondary }}>
                  Continuous curve & area volume representation
                </p>
              </div>
              <span
                className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full"
                style={{ background: theme.bgBadge, color: theme.accentPrimary }}
              >
                {lineChartData.length} Points
              </span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lineChartData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                  <defs>
                    <linearGradient id="primaryAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.accentPrimary} stopOpacity={0.5} />
                      <stop offset="95%" stopColor={theme.accentPrimary} stopOpacity={0.0} />
                    </linearGradient>
                    {selectedMetric2 && (
                      <linearGradient id="secAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.accentSecondary} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={theme.accentSecondary} stopOpacity={0.0} />
                      </linearGradient>
                    )}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.gridLineColor} opacity={0.6} />
                  <XAxis
                    dataKey="xLabel"
                    stroke={theme.textMuted}
                    tick={{ fontSize: 10, fill: theme.textSecondary }}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke={theme.textMuted}
                    tick={{ fontSize: 11, fill: theme.textSecondary }}
                    tickFormatter={(v) => formatMetricValue(v, metric1Col?.isCurrency, metric1Col?.isPercentage)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px', color: theme.textSecondary }} />
                  <Area
                    type="monotone"
                    dataKey="val1"
                    name={metric1Col?.name || 'Primary Metric'}
                    stroke={theme.accentPrimary}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#primaryAreaGradient)"
                  />
                  {selectedMetric2 && (
                    <Area
                      type="monotone"
                      dataKey="val2"
                      name={metric2Col?.name || 'Secondary Metric'}
                      stroke={theme.accentSecondary}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#secAreaGradient)"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* 2. Donut & Proportion Breakdown */}
        {(activeTab === 'all' || activeTab === 'pie') && (
          <motion.div
            id="chart-container-pie"
            variants={chartCardVariants}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="rounded-2xl p-4.5 border transition-all duration-300 shadow-sm flex flex-col justify-between"
            style={{
              backgroundColor: theme.bgCard,
              borderColor: theme.borderCard,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: theme.textPrimary }}>
                  <PieIcon className="w-4 h-4" style={{ color: theme.accentSecondary }} />
                  Channel & Category Share
                </h3>
                <p className="text-xs" style={{ color: theme.textSecondary }}>
                  Proportions across top detected categories
                </p>
              </div>
              {isGold && (
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <span className="text-[10px] block font-mono" style={{ color: theme.textMuted }}>P&L RATIO</span>
                    <span className="text-xs font-bold font-mono" style={{ color: theme.accentPrimary }}>62%</span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center py-2">
              {/* Donut Chart with Centered Total */}
              <div className="sm:col-span-6 relative h-60 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any, item: any) => [
                        `${formatMetricValue(val, metric1Col?.isCurrency, metric1Col?.isPercentage)} (${item.payload.count} items)`,
                        name,
                      ]}
                      contentStyle={{
                        backgroundColor: theme.tooltipBg,
                        borderColor: theme.tooltipBorder,
                        borderRadius: '12px',
                        fontSize: '11px',
                        color: theme.tooltipText,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Donut Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs font-bold font-mono" style={{ color: theme.textPrimary }}>
                    {formatMetricValue(totalMetricSum, metric1Col?.isCurrency, metric1Col?.isPercentage)}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.textMuted }}>
                    TOTAL
                  </span>
                </div>
              </div>

              {/* Legend with percentages */}
              <div className="sm:col-span-6 space-y-2 max-h-56 overflow-y-auto pr-1">
                {pieChartData.slice(0, 6).map((item, idx) => {
                  const share = totalMetricSum > 0 ? ((item.value / totalMetricSum) * 100).toFixed(1) : '0';
                  const color = palette[idx % palette.length];
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs p-1.5 rounded-lg transition"
                      style={{ backgroundColor: theme.bgInput }}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="truncate font-medium" style={{ color: theme.textPrimary }}>
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 font-mono shrink-0">
                        <span style={{ color: theme.textMuted }}>{share}%</span>
                        <span className="font-bold" style={{ color: theme.accentPrimary }}>
                          {formatMetricValue(item.value, metric1Col?.isCurrency, metric1Col?.isPercentage)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* 3. Bar Chart (Rankings & Volumes) */}
        {(activeTab === 'all' || activeTab === 'bar') && (
          <motion.div
            id="chart-container-bar"
            variants={chartCardVariants}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="rounded-2xl p-4.5 border transition-all duration-300 shadow-sm"
            style={{
              backgroundColor: theme.bgCard,
              borderColor: theme.borderCard,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: theme.textPrimary }}>
                  <BarChart3 className="w-4 h-4" style={{ color: theme.accentPrimary }} />
                  {dimensionCol?.name || 'Category'} Volume & Comparison
                </h3>
                <p className="text-xs" style={{ color: theme.textSecondary }}>
                  {metric1Col ? `Aggregated ${metric1Col.name}` : 'Record Count'} by {dimensionCol?.name || 'Dimension'}
                </p>
              </div>
              <span
                className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full"
                style={{ background: theme.bgBadge, color: theme.accentPrimary }}
              >
                Top {barChartData.length} Items
              </span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.gridLineColor} opacity={0.6} />
                  <XAxis
                    dataKey="label"
                    stroke={theme.textMuted}
                    tick={{ fontSize: 10, fill: theme.textSecondary }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke={theme.textMuted}
                    tick={{ fontSize: 11, fill: theme.textSecondary }}
                    tickFormatter={(v) => formatMetricValue(v, metric1Col?.isCurrency, metric1Col?.isPercentage)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px', color: theme.textSecondary }} />
                  <Bar
                    dataKey="val1"
                    name={metric1Col?.name || 'Primary Metric'}
                    fill={theme.accentPrimary}
                    stackId={barMode === 'stacked' ? 'a' : undefined}
                    radius={barMode === 'stacked' ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                  />
                  {selectedMetric2 && (
                    <Bar
                      dataKey="val2"
                      name={metric2Col?.name || 'Secondary Metric'}
                      fill={theme.accentSecondary}
                      stackId={barMode === 'stacked' ? 'a' : undefined}
                      radius={[6, 6, 0, 0]}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* 4. Cross-Variable Correlation / Scatter Chart */}
        {(activeTab === 'all' || activeTab === 'scatter') && (
          <motion.div
            id="chart-container-composed"
            variants={chartCardVariants}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="rounded-2xl p-4.5 border transition-all duration-300 shadow-sm"
            style={{
              backgroundColor: theme.bgCard,
              borderColor: theme.borderCard,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: theme.textPrimary }}>
                  <TrendingUp className="w-4 h-4" style={{ color: theme.accentSecondary }} />
                  Cross-Variable Correlation & Scatter
                </h3>
                <p className="text-xs" style={{ color: theme.textSecondary }}>
                  {metric1Col?.name} vs {metric2Col ? metric2Col.name : 'Distribution index'}
                </p>
              </div>
              <span
                className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full"
                style={{ background: theme.bgBadge, color: theme.accentSecondary }}
              >
                Scatter Plot
              </span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={scatterData} margin={{ top: 10, right: 15, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.gridLineColor} opacity={0.6} />
                  <XAxis
                    dataKey="m1"
                    name={metric1Col?.name || 'Metric 1'}
                    stroke={theme.textMuted}
                    tick={{ fontSize: 11, fill: theme.textSecondary }}
                    tickFormatter={(v) => formatMetricValue(v, metric1Col?.isCurrency, metric1Col?.isPercentage)}
                    label={{ value: metric1Col?.name || 'Metric 1', position: 'insideBottom', offset: -10, fill: theme.textMuted, fontSize: 11 }}
                  />
                  <YAxis
                    dataKey="m2"
                    name={metric2Col?.name || 'Metric 2'}
                    stroke={theme.textMuted}
                    tick={{ fontSize: 11, fill: theme.textSecondary }}
                    tickFormatter={(v) => formatMetricValue(v, metric2Col?.isCurrency, metric2Col?.isPercentage)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div
                            className="p-3 rounded-xl border text-xs shadow-lg"
                            style={{
                              backgroundColor: theme.tooltipBg,
                              borderColor: theme.tooltipBorder,
                              color: theme.tooltipText,
                            }}
                          >
                            <p className="font-bold mb-1" style={{ color: theme.accentPrimary }}>{d.dimVal || d.id}</p>
                            <p>{metric1Col?.name}: <strong className="font-mono" style={{ color: theme.textPrimary }}>{formatMetricValue(d.m1, metric1Col?.isCurrency, metric1Col?.isPercentage)}</strong></p>
                            {metric2Col && (
                              <p>{metric2Col?.name}: <strong className="font-mono" style={{ color: theme.accentSecondary }}>{formatMetricValue(d.m2, metric2Col?.isCurrency, metric2Col?.isPercentage)}</strong></p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter name="Data Points" dataKey="m2" fill={theme.accentPrimary} opacity={0.8} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
