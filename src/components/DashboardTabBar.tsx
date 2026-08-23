import React from 'react';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  TrendingUp,
  PieChart as PieIcon,
  Activity,
  Layers,
  Plus,
  Edit2,
  Copy,
  Trash2,
  Sparkles,
  SlidersHorizontal,
  FileSpreadsheet,
  Gauge,
} from 'lucide-react';
import { DashboardConfig } from '../types';
import { ThemeConfig } from '../themes';

interface DashboardTabBarProps {
  dashboards: DashboardConfig[];
  activeDashboardId: string;
  onSelectDashboard: (id: string) => void;
  onOpenCreateModal: () => void;
  onOpenEditModal: (dashboard: DashboardConfig) => void;
  onDuplicateDashboard: (dashboard: DashboardConfig) => void;
  onDeleteDashboard: (id: string) => void;
  onOpenDataCheckModal: () => void;
  theme: ThemeConfig;
  isSharedMode?: boolean;
}

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  TrendingUp,
  PieChart: PieIcon,
  Activity,
  Layers,
};

export const DashboardTabBar: React.FC<DashboardTabBarProps> = ({
  dashboards,
  activeDashboardId,
  onSelectDashboard,
  onOpenCreateModal,
  onOpenEditModal,
  onDuplicateDashboard,
  onDeleteDashboard,
  onOpenDataCheckModal,
  theme,
  isSharedMode = false,
}) => {
  const activeDashboard = dashboards.find((d) => d.id === activeDashboardId) || dashboards[0];

  return (
    <div className="space-y-2">
      {/* Top Bar with Tabs and Actions */}
      <div
        id="dashboard-tab-bar"
        className="flex flex-wrap items-center justify-between gap-2 p-1.5 rounded-2xl border shadow-xs transition-colors"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.borderCard,
        }}
      >
        {/* Scrollable Tabs List */}
        <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5 max-w-full">
          {dashboards.map((dash) => {
            const isActive = dash.id === activeDashboardId;
            const IconComp = iconMap[dash.icon] || LayoutDashboard;

            return (
              <div
                key={dash.id}
                className="relative group flex items-center shrink-0"
              >
                <button
                  id={`dashboard-tab-${dash.id}`}
                  onClick={() => onSelectDashboard(dash.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    isActive ? 'shadow-xs' : 'hover:opacity-90'
                  }`}
                  style={{
                    background: isActive ? theme.accentGradient : theme.bgInput,
                    color: isActive ? '#FFFFFF' : theme.textPrimary,
                    borderColor: isActive ? 'transparent' : theme.borderSubtle,
                  }}
                  title={dash.description}
                >
                  <IconComp className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate max-w-[140px] sm:max-w-[180px]">{dash.title}</span>
                  {dash.type !== 'executive' && (
                    <span
                      className="text-[9px] uppercase px-1.5 py-0.5 rounded-md font-mono shrink-0"
                      style={{
                        backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : theme.bgCard,
                        color: isActive ? '#FFFFFF' : theme.textSecondary,
                      }}
                    >
                      {dash.type}
                    </span>
                  )}
                </button>

                {/* Inline Tab Controls (Edit / Duplicate / Delete) for active or hovered tab */}
                {!isSharedMode && (
                  <div
                    className={`ml-1 hidden group-hover:flex items-center space-x-0.5 px-1 py-0.5 rounded-lg border text-[10px] ${
                      isActive ? 'flex' : ''
                    }`}
                    style={{
                      backgroundColor: theme.bgInput,
                      borderColor: theme.borderSubtle,
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEditModal(dash);
                      }}
                      className="p-1 rounded hover:opacity-80 text-gray-500 hover:text-indigo-600 cursor-pointer"
                      title="Edit Dashboard Config"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateDashboard(dash);
                      }}
                      className="p-1 rounded hover:opacity-80 text-gray-500 hover:text-emerald-600 cursor-pointer"
                      title="Duplicate Dashboard"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    {dashboards.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDashboard(dash.id);
                        }}
                        className="p-1 rounded hover:opacity-80 text-gray-500 hover:text-rose-600 cursor-pointer"
                        title="Delete Dashboard"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add New Dashboard Button */}
          {!isSharedMode && (
            <button
              id="add-new-dashboard-btn"
              onClick={onOpenCreateModal}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer shrink-0 hover:opacity-85"
              style={{
                backgroundColor: theme.bgInput,
                borderColor: theme.borderSubtle,
                color: theme.accentPrimary,
              }}
              title="Create a new custom dashboard tab"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Dashboard</span>
            </button>
          )}
        </div>

        {/* Right Action Tools: Batch Creator & Health Check */}
        {!isSharedMode && (
          <div className="flex items-center space-x-2 shrink-0">
            <button
              id="open-data-check-modal-btn"
              onClick={onOpenDataCheckModal}
              className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition cursor-pointer shadow-2xs hover:opacity-90"
              style={{
                backgroundColor: theme.bgBadge,
                borderColor: theme.borderSubtle,
                color: theme.accentPrimary,
              }}
              title="Check uploaded data health and generate multiple dashboards at once"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multi-Dashboard Generator</span>
            </button>
          </div>
        )}
      </div>

      {/* Active Dashboard Subtitle & Focus Meta */}
      {activeDashboard && (
        <div
          className="px-4 py-2 rounded-xl border flex flex-wrap items-center justify-between text-xs gap-2"
          style={{
            backgroundColor: theme.bgInput,
            borderColor: theme.borderSubtle,
          }}
        >
          <div className="flex items-center space-x-2">
            <span className="font-bold" style={{ color: theme.textPrimary }}>
              {activeDashboard.title}
            </span>
            <span className="text-gray-400">&bull;</span>
            <span style={{ color: theme.textSecondary }}>{activeDashboard.description}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <span
              className="px-2 py-0.5 rounded-md border"
              style={{ backgroundColor: theme.bgCard, borderColor: theme.borderSubtle, color: theme.textSecondary }}
            >
              Dimension: <strong className="text-indigo-600">{activeDashboard.dimensionKey}</strong>
            </span>
            <span
              className="px-2 py-0.5 rounded-md border"
              style={{ backgroundColor: theme.bgCard, borderColor: theme.borderSubtle, color: theme.textSecondary }}
            >
              Metric: <strong className="text-emerald-600">{activeDashboard.metricKey1}</strong>
            </span>
            {activeDashboard.metricKey2 && activeDashboard.metricKey2 !== activeDashboard.metricKey1 && (
              <span
                className="px-2 py-0.5 rounded-md border"
                style={{ backgroundColor: theme.bgCard, borderColor: theme.borderSubtle, color: theme.textSecondary }}
              >
                Metric 2: <strong className="text-amber-600">{activeDashboard.metricKey2}</strong>
              </span>
            )}
            <span
              className="px-2 py-0.5 rounded-md border uppercase"
              style={{ backgroundColor: theme.bgCard, borderColor: theme.borderSubtle, color: theme.textSecondary }}
            >
              Layout: <strong>{activeDashboard.chartLayout}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
