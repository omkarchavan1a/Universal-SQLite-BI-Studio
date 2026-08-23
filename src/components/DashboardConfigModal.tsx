import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  LayoutDashboard,
  TrendingUp,
  PieChart as PieIcon,
  Activity,
  Layers,
  SlidersHorizontal,
  Sparkles,
  BarChart3,
  Check,
} from 'lucide-react';
import { DashboardConfig, DatasetProfile } from '../types';
import { ThemeConfig } from '../themes';

interface DashboardConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardToEdit: DashboardConfig | null;
  profile: DatasetProfile;
  onSaveDashboard: (dashboard: DashboardConfig) => void;
  theme: ThemeConfig;
}

export const DashboardConfigModal: React.FC<DashboardConfigModalProps> = ({
  isOpen,
  onClose,
  dashboardToEdit,
  profile,
  onSaveDashboard,
  theme,
}) => {
  const columns = profile?.columns || [];
  const numericColumns = columns.filter((c) => c.type === 'numeric');
  const categoricalColumns = columns.filter((c) => c.type === 'categorical' || c.type === 'text' || c.type === 'identifier');
  const dateColumns = columns.filter((c) => c.type === 'date');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<DashboardConfig['type']>('custom');
  const [icon, setIcon] = useState('LayoutDashboard');
  const [dimensionKey, setDimensionKey] = useState('');
  const [secondaryDimensionKey, setSecondaryDimensionKey] = useState('');
  const [metricKey1, setMetricKey1] = useState('');
  const [metricKey2, setMetricKey2] = useState('');
  const [chartLayout, setChartLayout] = useState<DashboardConfig['chartLayout']>('all');
  const [barMode, setBarMode] = useState<'grouped' | 'stacked'>('grouped');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (dashboardToEdit) {
      setTitle(dashboardToEdit.title);
      setDescription(dashboardToEdit.description);
      setType(dashboardToEdit.type);
      setIcon(dashboardToEdit.icon);
      setDimensionKey(dashboardToEdit.dimensionKey || profile.primaryDimensionKey || columns[0]?.key || '');
      setSecondaryDimensionKey(dashboardToEdit.secondaryDimensionKey || profile.secondaryDimensionKey || '');
      setMetricKey1(dashboardToEdit.metricKey1 || profile.primaryMetricKey || numericColumns[0]?.key || '');
      setMetricKey2(dashboardToEdit.metricKey2 || profile.secondaryMetricKey || '');
      setChartLayout(dashboardToEdit.chartLayout || 'all');
      setBarMode(dashboardToEdit.barMode || 'grouped');
      setNotes(dashboardToEdit.notes || '');
    } else {
      // New dashboard defaults
      setTitle(`Dashboard ${Date.now().toString().slice(-4)}`);
      setDescription('Custom analytics view tailored to specific dimensions and metrics');
      setType('custom');
      setIcon('LayoutDashboard');
      setDimensionKey(profile.primaryDimensionKey || columns[0]?.key || '');
      setSecondaryDimensionKey(profile.secondaryDimensionKey || '');
      setMetricKey1(profile.primaryMetricKey || numericColumns[0]?.key || '');
      setMetricKey2(profile.secondaryMetricKey || '');
      setChartLayout('all');
      setBarMode('grouped');
      setNotes('');
    }
  }, [dashboardToEdit, profile, isOpen]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const saved: DashboardConfig = {
      id: dashboardToEdit ? dashboardToEdit.id : `dash_${Date.now()}`,
      title: title.trim(),
      description: description.trim() || 'Custom analytical dashboard view',
      type,
      icon,
      dimensionKey: dimensionKey || profile.primaryDimensionKey || columns[0]?.key || '',
      secondaryDimensionKey: secondaryDimensionKey || undefined,
      metricKey1: metricKey1 || profile.primaryMetricKey || numericColumns[0]?.key || '',
      metricKey2: metricKey2 || undefined,
      chartLayout,
      barMode,
      notes: notes.trim() || undefined,
      createdAt: dashboardToEdit ? dashboardToEdit.createdAt : Date.now(),
    };

    onSaveDashboard(saved);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="dashboard-config-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          id="dashboard-config-modal-container"
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border my-8 flex flex-col"
          style={{
            backgroundColor: theme.bgCard,
            borderColor: theme.borderCard,
          }}
        >
          {/* Modal Header */}
          <div
            className="px-6 py-4 border-b flex items-center justify-between"
            style={{
              backgroundColor: theme.bgInput,
              borderColor: theme.borderSubtle,
            }}
          >
            <div className="flex items-center space-x-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs text-white"
                style={{ background: theme.accentGradient }}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: theme.textPrimary }}>
                  {dashboardToEdit ? 'Edit Dashboard Tab' : 'Create New Dashboard Tab'}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: theme.textSecondary }}>
                  Configure specific metrics, dimensions, and visualization focus for this dashboard.
                </p>
              </div>
            </div>

            <button
              id="close-dashboard-config-modal-btn"
              onClick={onClose}
              className="p-2 rounded-xl transition cursor-pointer hover:opacity-80"
              style={{
                backgroundColor: theme.bgCard,
                color: theme.textSecondary,
              }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Title & Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold mb-1" style={{ color: theme.textPrimary }}>
                  Dashboard Name *
                </label>
                <input
                  id="dashboard-title-input"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Regional Sales & Performance"
                  className="w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-hidden focus:ring-2"
                  style={{
                    backgroundColor: theme.bgInput,
                    borderColor: theme.borderSubtle,
                    color: theme.textPrimary,
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: theme.textPrimary }}>
                  Archetype Focus
                </label>
                <select
                  id="dashboard-type-select"
                  value={type}
                  onChange={(e) => {
                    const newType = e.target.value as DashboardConfig['type'];
                    setType(newType);
                    if (newType === 'breakdown') {
                      setIcon('PieChart');
                      setChartLayout('pie');
                    } else if (newType === 'trends') {
                      setIcon('Activity');
                      setChartLayout('line');
                    } else if (newType === 'metrics') {
                      setIcon('TrendingUp');
                      setChartLayout('bar');
                    } else if (newType === 'operations') {
                      setIcon('Layers');
                      setChartLayout('split');
                    } else {
                      setIcon('LayoutDashboard');
                      setChartLayout('all');
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer"
                  style={{
                    backgroundColor: theme.bgInput,
                    borderColor: theme.borderSubtle,
                    color: theme.textPrimary,
                  }}
                >
                  <option value="executive">Executive Overview</option>
                  <option value="metrics">Metrics & Financials</option>
                  <option value="breakdown">Category Breakdown</option>
                  <option value="trends">Trends & Timeline</option>
                  <option value="operations">Operational Data</option>
                  <option value="custom">Custom View</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: theme.textPrimary }}>
                Short Subtitle / Goal
              </label>
              <input
                id="dashboard-description-input"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Tracks quarter-over-quarter revenue and distribution across segments"
                className="w-full px-3.5 py-2 rounded-xl text-xs border"
                style={{
                  backgroundColor: theme.bgInput,
                  borderColor: theme.borderSubtle,
                  color: theme.textPrimary,
                }}
              />
            </div>

            {/* Dimension & Metrics Setup */}
            <div
              className="p-4 rounded-xl border space-y-3"
              style={{
                backgroundColor: theme.bgInput,
                borderColor: theme.borderSubtle,
              }}
            >
              <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.textSecondary }}>
                Data Mappings for this Dashboard
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: theme.textPrimary }}>
                    Primary Dimension (X-Axis / Slices)
                  </label>
                  <select
                    id="dashboard-dimension-select"
                    value={dimensionKey}
                    onChange={(e) => setDimensionKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border cursor-pointer"
                    style={{
                      backgroundColor: theme.bgCard,
                      borderColor: theme.borderSubtle,
                      color: theme.textPrimary,
                    }}
                  >
                    {columns.map((col) => (
                      <option key={col.key} value={col.key}>
                        {col.name} ({col.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: theme.textPrimary }}>
                    Primary Metric (Y-Axis / Volume)
                  </label>
                  <select
                    id="dashboard-metric1-select"
                    value={metricKey1}
                    onChange={(e) => setMetricKey1(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border cursor-pointer"
                    style={{
                      backgroundColor: theme.bgCard,
                      borderColor: theme.borderSubtle,
                      color: theme.textPrimary,
                    }}
                  >
                    {numericColumns.length > 0 ? (
                      numericColumns.map((col) => (
                        <option key={col.key} value={col.key}>
                          {col.name} (Numeric)
                        </option>
                      ))
                    ) : (
                      <option value="count">Record Count</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: theme.textPrimary }}>
                    Secondary Metric (Optional Drilldown)
                  </label>
                  <select
                    id="dashboard-metric2-select"
                    value={metricKey2}
                    onChange={(e) => setMetricKey2(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border cursor-pointer"
                    style={{
                      backgroundColor: theme.bgCard,
                      borderColor: theme.borderSubtle,
                      color: theme.textPrimary,
                    }}
                  >
                    <option value="">None</option>
                    {numericColumns.map((col) => (
                      <option key={col.key} value={col.key}>
                        {col.name} (Numeric)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: theme.textPrimary }}>
                    Chart Display Focus
                  </label>
                  <select
                    id="dashboard-layout-select"
                    value={chartLayout}
                    onChange={(e) => setChartLayout(e.target.value as DashboardConfig['chartLayout'])}
                    className="w-full px-3 py-2 rounded-xl text-xs border cursor-pointer uppercase font-semibold"
                    style={{
                      backgroundColor: theme.bgCard,
                      borderColor: theme.borderSubtle,
                      color: theme.textPrimary,
                    }}
                  >
                    <option value="all">All Visualizations</option>
                    <option value="bar">Bar & Ranking Charts</option>
                    <option value="pie">Donut & Share Slices</option>
                    <option value="line">Line & Chronological Trends</option>
                    <option value="scatter">Metric Correlation Matrix</option>
                    <option value="split">Split Dual Focus</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Custom Notes */}
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: theme.textPrimary }}>
                Executive Notes & Context (Optional)
              </label>
              <textarea
                id="dashboard-notes-textarea"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add contextual business rules, targets, or analysis notes for this dashboard view..."
                className="w-full px-3 py-2 rounded-xl text-xs border"
                style={{
                  backgroundColor: theme.bgInput,
                  borderColor: theme.borderSubtle,
                  color: theme.textPrimary,
                }}
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t flex items-center justify-end space-x-3" style={{ borderColor: theme.borderSubtle }}>
              <button
                type="button"
                id="cancel-dashboard-config-btn"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer hover:opacity-80"
                style={{
                  backgroundColor: theme.bgCard,
                  borderColor: theme.borderSubtle,
                  color: theme.textSecondary,
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                id="save-dashboard-config-btn"
                className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition cursor-pointer hover:opacity-95"
                style={{
                  background: theme.accentGradient,
                }}
              >
                {dashboardToEdit ? 'Update Dashboard' : 'Create Dashboard Tab'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
