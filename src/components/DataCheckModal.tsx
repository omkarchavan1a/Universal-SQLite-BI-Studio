import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  LayoutDashboard,
  TrendingUp,
  PieChart as PieIcon,
  Activity,
  Plus,
  ArrowRight,
  X,
  FileSpreadsheet,
  Gauge,
  Sparkles,
  Hash,
  Calendar,
  Tag,
  Check,
} from 'lucide-react';
import { DatasetProfile, GenericRecord, DashboardConfig, DatasetValidationReport } from '../types';
import { ThemeConfig } from '../themes';
import { validateAndProfileDataset } from '../utils/dashboardGenerator';

interface DataCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: DatasetProfile;
  records: GenericRecord[];
  fileName: string;
  onApplyDashboards: (dashboards: DashboardConfig[], activeId?: string) => void;
  theme: ThemeConfig;
}

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  TrendingUp,
  PieChart: PieIcon,
  Activity,
  Layers,
};

export const DataCheckModal: React.FC<DataCheckModalProps> = ({
  isOpen,
  onClose,
  profile,
  records,
  fileName,
  onApplyDashboards,
  theme,
}) => {
  const report: DatasetValidationReport = React.useMemo(() => {
    return validateAndProfileDataset(profile, records);
  }, [profile, records]);

  // Selected dashboards to batch-generate
  const [selectedDashboardIds, setSelectedDashboardIds] = useState<string[]>(() =>
    report.suggestedDashboards.map((d) => d.id)
  );

  // Update selection whenever report changes
  React.useEffect(() => {
    if (report.suggestedDashboards.length > 0) {
      setSelectedDashboardIds(report.suggestedDashboards.map((d) => d.id));
    }
  }, [report]);

  const toggleSelect = (id: string) => {
    setSelectedDashboardIds((prev) => {
      if (prev.includes(id)) {
        // Prevent deselecting all (keep at least one)
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const selectAll = () => {
    setSelectedDashboardIds(report.suggestedDashboards.map((d) => d.id));
  };

  const handleGenerate = () => {
    const chosen = report.suggestedDashboards.filter((d) => selectedDashboardIds.includes(d.id));
    if (chosen.length > 0) {
      onApplyDashboards(chosen, chosen[0].id);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="data-check-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          id="data-check-modal-container"
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border my-8 flex flex-col max-h-[90vh]"
          style={{
            backgroundColor: theme.bgCard,
            borderColor: theme.borderCard,
          }}
        >
          {/* Header */}
          <div
            className="px-6 py-5 border-b flex items-center justify-between"
            style={{
              borderColor: theme.borderSubtle,
              background: theme.bgInput,
            }}
          >
            <div className="flex items-center space-x-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs"
                style={{
                  background: theme.accentGradient,
                  color: '#FFFFFF',
                }}
              >
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-bold" style={{ color: theme.textPrimary }}>
                    Data Verification & Multi-Dashboard Generator
                  </h2>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border shadow-2xs"
                    style={{
                      backgroundColor: theme.bgBadge,
                      borderColor: '#10B981',
                      color: '#10B981',
                    }}
                  >
                    Grade {report.cleanlinessGrade} &bull; {report.healthScore}% Health
                  </span>
                </div>
                <p className="text-xs mt-0.5 flex items-center space-x-1.5" style={{ color: theme.textSecondary }}>
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>{fileName}</span>
                  <span>&bull;</span>
                  <span>{records.length.toLocaleString()} records analyzed</span>
                </p>
              </div>
            </div>

            <button
              id="close-data-check-modal-btn"
              onClick={onClose}
              className="p-2 rounded-xl transition cursor-pointer hover:opacity-80"
              style={{
                backgroundColor: theme.bgCard,
                color: theme.textSecondary,
              }}
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Health & Profile Metrics Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div
                className="p-3.5 rounded-xl border"
                style={{
                  backgroundColor: theme.bgInput,
                  borderColor: theme.borderSubtle,
                }}
              >
                <div className="flex items-center justify-between text-xs" style={{ color: theme.textSecondary }}>
                  <span className="font-semibold">Row Health</span>
                  <Gauge className="w-3.5 h-3.5" style={{ color: theme.accentPrimary }} />
                </div>
                <div className="text-lg font-bold font-mono mt-1" style={{ color: theme.textPrimary }}>
                  {report.rowCount.toLocaleString()}
                </div>
                <div className="text-[11px] mt-0.5 text-emerald-600 font-medium">
                  {report.nonNullCells.toLocaleString()} clean cells
                </div>
              </div>

              <div
                className="p-3.5 rounded-xl border"
                style={{
                  backgroundColor: theme.bgInput,
                  borderColor: theme.borderSubtle,
                }}
              >
                <div className="flex items-center justify-between text-xs" style={{ color: theme.textSecondary }}>
                  <span className="font-semibold">Numerical Metrics</span>
                  <Hash className="w-3.5 h-3.5" style={{ color: theme.accentPrimary }} />
                </div>
                <div className="text-lg font-bold font-mono mt-1" style={{ color: theme.textPrimary }}>
                  {report.numericColumns.length}
                </div>
                <div className="text-[11px] mt-0.5 truncate" style={{ color: theme.textSecondary }}>
                  {report.numericColumns.map((c) => c.name).join(', ') || 'None'}
                </div>
              </div>

              <div
                className="p-3.5 rounded-xl border"
                style={{
                  backgroundColor: theme.bgInput,
                  borderColor: theme.borderSubtle,
                }}
              >
                <div className="flex items-center justify-between text-xs" style={{ color: theme.textSecondary }}>
                  <span className="font-semibold">Categorical Segments</span>
                  <Tag className="w-3.5 h-3.5" style={{ color: theme.accentPrimary }} />
                </div>
                <div className="text-lg font-bold font-mono mt-1" style={{ color: theme.textPrimary }}>
                  {report.categoricalColumns.length}
                </div>
                <div className="text-[11px] mt-0.5 truncate" style={{ color: theme.textSecondary }}>
                  {report.categoricalColumns.map((c) => c.name).join(', ') || 'None'}
                </div>
              </div>

              <div
                className="p-3.5 rounded-xl border"
                style={{
                  backgroundColor: theme.bgInput,
                  borderColor: theme.borderSubtle,
                }}
              >
                <div className="flex items-center justify-between text-xs" style={{ color: theme.textSecondary }}>
                  <span className="font-semibold">Timeline & Series</span>
                  <Calendar className="w-3.5 h-3.5" style={{ color: theme.accentPrimary }} />
                </div>
                <div className="text-lg font-bold font-mono mt-1" style={{ color: theme.textPrimary }}>
                  {report.hasDateSeries ? 'Detected' : 'Standard'}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: theme.textSecondary }}>
                  {report.hasDateSeries ? `${report.dateColumns[0]?.name || 'Date'} series active` : 'Categorical index'}
                </div>
              </div>
            </div>

            {/* Quality Checklist Summary */}
            <div
              className="p-4 rounded-xl border space-y-2.5"
              style={{
                backgroundColor: theme.bgInput,
                borderColor: theme.borderSubtle,
              }}
            >
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.textSecondary }}>
                Data Integrity & Validation Checks
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {report.qualityChecks.map((chk, i) => (
                  <div key={i} className="flex items-start space-x-2 text-xs">
                    {chk.status === 'pass' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                    {chk.status === 'warn' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                    {chk.status === 'info' && <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />}
                    <div>
                      <span className="font-bold mr-1.5" style={{ color: theme.textPrimary }}>
                        {chk.title}:
                      </span>
                      <span style={{ color: theme.textSecondary }}>{chk.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Multiple Dashboards Batch Creator */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold flex items-center space-x-2" style={{ color: theme.textPrimary }}>
                    <Layers className="w-4 h-4" style={{ color: theme.accentPrimary }} />
                    <span>Create Multiple Dashboards at Once</span>
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: theme.textSecondary }}>
                    Select which purpose-built dashboards to generate simultaneously for this dataset.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={selectAll}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg border hover:opacity-80 transition cursor-pointer"
                    style={{
                      backgroundColor: theme.bgInput,
                      borderColor: theme.borderSubtle,
                      color: theme.accentPrimary,
                    }}
                  >
                    Select All ({report.suggestedDashboards.length})
                  </button>
                </div>
              </div>

              {/* Grid of Dashboard Presets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.suggestedDashboards.map((dash) => {
                  const isSelected = selectedDashboardIds.includes(dash.id);
                  const IconComp = iconMap[dash.icon] || LayoutDashboard;

                  return (
                    <div
                      key={dash.id}
                      onClick={() => toggleSelect(dash.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected ? 'ring-2 shadow-sm' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: isSelected ? theme.bgCard : theme.bgInput,
                        borderColor: isSelected ? theme.accentPrimary : theme.borderSubtle,
                        // @ts-ignore
                        '--tw-ring-color': theme.accentPrimary,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: theme.bgBadge,
                              color: theme.accentPrimary,
                            }}
                          >
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-bold" style={{ color: theme.textPrimary }}>
                                {dash.title}
                              </h4>
                              <span
                                className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border"
                                style={{
                                  backgroundColor: theme.bgInput,
                                  borderColor: theme.borderSubtle,
                                  color: theme.textSecondary,
                                }}
                              >
                                {dash.type}
                              </span>
                            </div>
                            <p className="text-xs mt-1 leading-relaxed" style={{ color: theme.textSecondary }}>
                              {dash.description}
                            </p>
                          </div>
                        </div>

                        {/* Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition shrink-0 mt-0.5 ${
                            isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>

                      {/* Pill Config Details */}
                      <div className="mt-3 pt-2.5 border-t flex flex-wrap items-center gap-1.5 text-[11px]" style={{ borderColor: theme.borderSubtle }}>
                        <span className="font-mono px-2 py-0.5 rounded-md" style={{ backgroundColor: theme.bgInput, color: theme.textSecondary }}>
                          Dim: <strong>{dash.dimensionKey}</strong>
                        </span>
                        <span className="font-mono px-2 py-0.5 rounded-md" style={{ backgroundColor: theme.bgInput, color: theme.textSecondary }}>
                          Metric: <strong>{dash.metricKey1}</strong>
                        </span>
                        <span className="font-mono px-2 py-0.5 rounded-md" style={{ backgroundColor: theme.bgInput, color: theme.textSecondary }}>
                          Focus: <strong>{dash.chartLayout.toUpperCase()}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div
            className="px-6 py-4 border-t flex flex-wrap items-center justify-between gap-3"
            style={{
              backgroundColor: theme.bgInput,
              borderColor: theme.borderSubtle,
            }}
          >
            <div className="text-xs font-medium" style={{ color: theme.textSecondary }}>
              <strong>{selectedDashboardIds.length}</strong> of {report.suggestedDashboards.length} dashboards selected to create
            </div>

            <div className="flex items-center space-x-3">
              <button
                id="cancel-data-check-btn"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer hover:opacity-80"
                style={{
                  backgroundColor: theme.bgCard,
                  borderColor: theme.borderSubtle,
                  color: theme.textSecondary,
                }}
              >
                Keep Existing Views
              </button>

              <button
                id="generate-dashboards-btn"
                onClick={handleGenerate}
                className="px-5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 text-white shadow-md transition cursor-pointer hover:opacity-95"
                style={{
                  background: theme.accentGradient,
                }}
              >
                <Sparkles className="w-4 h-4" />
                <span>Create Selected Dashboards ({selectedDashboardIds.length})</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
