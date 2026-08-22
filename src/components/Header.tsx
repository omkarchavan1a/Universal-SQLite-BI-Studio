import React, { useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Activity, 
  FileText, 
  SlidersHorizontal, 
  RotateCcw,
  BarChart3,
  Database,
  Table as TableIcon,
  Palette,
  Terminal,
  Layers,
  Share2,
} from 'lucide-react';
import { ThemeConfig, ThemeId, THEME_LIST, getTheme } from '../themes';

interface HeaderProps {
  onUploadFile: (file: File) => void;
  onExportCSV: () => void;
  onResetData: () => void;
  isRealtimeActive: boolean;
  onToggleRealtime: () => void;
  refreshInterval: number;
  onChangeRefreshInterval: (seconds: number) => void;
  lastSyncTime: Date;
  updateCount: number;
  onOpenConverterModal: () => void;
  fileName: string;
  totalRecordsCount: number;
  activeView: 'schema' | 'dashboard' | 'table' | 'sqlite';
  onChangeView: (view: 'schema' | 'dashboard' | 'table' | 'sqlite') => void;
  columnCount: number;
  theme?: ThemeConfig;
  currentTheme?: ThemeConfig;
  currentThemeId?: ThemeId;
  onOpenThemeModal?: () => void;
  onOpenThemeSelector?: () => void;
  onSelectTheme?: (themeId: ThemeId) => void;
  onOpenShareModal?: () => void;
  sqliteInitialized?: boolean;
  isSharedMode?: boolean;
  onExitSharedMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onUploadFile,
  onExportCSV,
  onResetData,
  isRealtimeActive,
  onToggleRealtime,
  refreshInterval,
  onChangeRefreshInterval,
  lastSyncTime,
  updateCount,
  onOpenConverterModal,
  fileName,
  totalRecordsCount,
  activeView,
  onChangeView,
  columnCount,
  theme: propTheme,
  currentTheme: propCurrentTheme,
  currentThemeId,
  onOpenThemeModal,
  onOpenThemeSelector,
  onSelectTheme,
  onOpenShareModal,
  sqliteInitialized = true,
  isSharedMode = false,
  onExitSharedMode,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const theme: ThemeConfig = propTheme || propCurrentTheme || (currentThemeId ? getTheme(currentThemeId) : getTheme('berry_noir'));
  const handleOpenTheme = onOpenThemeModal || onOpenThemeSelector || (() => {});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
    }
  };

  return (
    <header
      className="border-b sticky top-0 z-30 transition-colors duration-300 shadow-sm"
      style={{
        backgroundColor: theme.bgCard,
        borderColor: theme.borderCard,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center shadow-xs transition-colors shrink-0"
              style={{
                background: theme.bgBadge,
                border: `1px solid ${theme.borderCard}`,
                color: theme.accentPrimary,
              }}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight" style={{ color: theme.textPrimary }}>
                  Universal SQLite & BI Studio
                </h1>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono"
                  style={{
                    backgroundColor: theme.bgBadge,
                    color: theme.accentPrimary,
                    border: `1px solid ${theme.borderCard}`,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full mr-1 animate-pulse" style={{ backgroundColor: theme.accentPrimary }} />
                  SQLite Active
                </span>
              </div>
              <p className="text-xs flex items-center space-x-2 mt-0.5" style={{ color: theme.textSecondary }}>
                <span>File: <strong style={{ color: theme.textPrimary }}>{fileName}</strong> ({totalRecordsCount.toLocaleString()} rows &bull; {columnCount} cols)</span>
                <span>&bull;</span>
                <span className="font-mono text-[11px] opacity-80">{lastSyncTime.toLocaleTimeString()}</span>
              </p>
            </div>
          </div>

          {/* Center: Primary View Mode Switcher */}
          {!isSharedMode ? (
            <div
              className="flex items-center p-1 rounded-xl border shadow-xs self-start lg:self-auto overflow-x-auto max-w-full"
              style={{
                backgroundColor: theme.bgInput,
                borderColor: theme.borderSubtle,
              }}
            >
              <button
                id="view-tab-dashboard"
                onClick={() => onChangeView('dashboard')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  activeView === 'dashboard' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: activeView === 'dashboard' ? theme.bgCard : 'transparent',
                  color: activeView === 'dashboard' ? theme.accentPrimary : theme.textSecondary,
                  border: activeView === 'dashboard' ? `1px solid ${theme.borderCard}` : '1px solid transparent',
                }}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>1. Visual Dashboard</span>
              </button>

              <button
                id="view-tab-sqlite"
                onClick={() => onChangeView('sqlite')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  activeView === 'sqlite' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: activeView === 'sqlite' ? theme.bgCard : 'transparent',
                  color: activeView === 'sqlite' ? theme.accentPrimary : theme.textSecondary,
                  border: activeView === 'sqlite' ? `1px solid ${theme.borderCard}` : '1px solid transparent',
                }}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>2. SQLite Console</span>
              </button>

              <button
                id="view-tab-schema"
                onClick={() => onChangeView('schema')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  activeView === 'schema' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: activeView === 'schema' ? theme.bgCard : 'transparent',
                  color: activeView === 'schema' ? theme.accentPrimary : theme.textSecondary,
                  border: activeView === 'schema' ? `1px solid ${theme.borderCard}` : '1px solid transparent',
                }}
              >
                <Database className="w-3.5 h-3.5" />
                <span>3. Schema & Types</span>
              </button>

              <button
                id="view-tab-table"
                onClick={() => onChangeView('table')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  activeView === 'table' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: activeView === 'table' ? theme.bgCard : 'transparent',
                  color: activeView === 'table' ? theme.accentPrimary : theme.textSecondary,
                  border: activeView === 'table' ? `1px solid ${theme.borderCard}` : '1px solid transparent',
                }}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>4. Data Table</span>
              </button>
            </div>
          ) : (
            <div
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-semibold"
              style={{
                backgroundColor: theme.bgBadge,
                borderColor: theme.borderSubtle,
                color: theme.accentPrimary,
              }}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Live Shared Executive View</span>
            </div>
          )}

          {/* Action Center & Theme Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Share Dashboard Button */}
            <button
              id="share-dashboard-btn"
              onClick={onOpenShareModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs text-white"
              style={{
                background: theme.accentGradient,
              }}
              title="Generate a shareable live dashboard link"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>

            {/* Theme Selector Showcase Button */}
            <button
              id="theme-selector-btn"
              onClick={handleOpenTheme}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
              style={{
                backgroundColor: theme.bgInput,
                color: theme.textPrimary,
                border: `1px solid ${theme.borderCard}`,
              }}
              title="Change Visual Theme (Berry Noir, Obsidian Gold, Cyber Neon HUD, etc.)"
            >
              <Palette className="w-3.5 h-3.5" style={{ color: theme.accentPrimary }} />
              <span className="font-semibold">{theme.name.split('&')[0]}</span>
            </button>

            {/* Real-time Stream Controller */}
            <div
              className="flex items-center rounded-xl p-0.5 text-xs border"
              style={{
                backgroundColor: theme.bgInput,
                borderColor: theme.borderSubtle,
              }}
            >
              <button
                id="toggle-realtime-btn"
                onClick={onToggleRealtime}
                className={`flex items-center space-x-1 px-2 py-1 rounded-lg font-medium transition cursor-pointer ${
                  isRealtimeActive ? 'shadow-xs text-white' : ''
                }`}
                style={{
                  background: isRealtimeActive ? theme.accentGradient : 'transparent',
                  color: isRealtimeActive ? '#FFFFFF' : theme.textSecondary,
                }}
                title={isRealtimeActive ? 'Real-time simulation active' : 'Real-time simulation paused'}
              >
                <Activity className={`w-3 h-3 ${isRealtimeActive ? 'animate-spin' : ''}`} />
                <span className="text-[11px]">{isRealtimeActive ? 'Live On' : 'Live Off'}</span>
              </button>

              {isRealtimeActive && (
                <div className="flex items-center border-l ml-1 pl-1 space-x-0.5" style={{ borderColor: theme.borderSubtle }}>
                  <select
                    id="refresh-frequency-select"
                    value={refreshInterval}
                    onChange={(e) => onChangeRefreshInterval(Number(e.target.value))}
                    className="rounded px-1 py-0.5 text-[10px] focus:outline-none"
                    style={{
                      backgroundColor: theme.bgCard,
                      color: theme.textPrimary,
                      border: `1px solid ${theme.borderSubtle}`,
                    }}
                  >
                    <option value={2}>2s</option>
                    <option value={4}>4s</option>
                    <option value={8}>8s</option>
                  </select>
                </div>
              )}
            </div>

            {/* If in shared mode, option to open full studio */}
            {isSharedMode && onExitSharedMode && (
              <button
                id="exit-shared-mode-btn"
                onClick={onExitSharedMode}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer"
                style={{
                  backgroundColor: theme.bgInput,
                  borderColor: theme.borderSubtle,
                  color: theme.textPrimary,
                }}
              >
                <span>Full Studio View</span>
              </button>
            )}

            {!isSharedMode ? (
              <>
                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,.xlsx,.xls,.tsv,.json,.sqlite,.db"
                  className="hidden"
                />

                {/* Upload File Button */}
                <button
                  id="upload-file-btn"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
                  style={{
                    backgroundColor: theme.bgInput,
                    color: theme.textPrimary,
                    border: `1px solid ${theme.borderCard}`,
                  }}
                  title="Upload CSV, XLSX, JSON, or SQLite DB"
                >
                  <Upload className="w-3.5 h-3.5" style={{ color: theme.accentPrimary }} />
                  <span className="hidden sm:inline">Import</span>
                </button>

                {/* Excel Builder Modal Button */}
                <button
                  id="open-converter-modal-btn"
                  onClick={onOpenConverterModal}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer"
                  style={{
                    backgroundColor: theme.bgInput,
                    color: theme.textSecondary,
                    border: `1px solid ${theme.borderSubtle}`,
                  }}
                  title="Open Excel Converter & Sheet Options"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Excel</span>
                </button>

                {/* Export CSV */}
                <button
                  id="export-csv-btn"
                  onClick={onExportCSV}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer"
                  style={{
                    backgroundColor: theme.bgInput,
                    color: theme.textSecondary,
                    border: `1px solid ${theme.borderSubtle}`,
                  }}
                  title="Export Current Filtered Dataset as CSV"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">CSV</span>
                </button>

                {/* Reset Data */}
                <button
                  id="reset-data-btn"
                  onClick={onResetData}
                  className="p-1.5 rounded-xl transition cursor-pointer"
                  style={{
                    backgroundColor: theme.bgInput,
                    color: theme.textMuted,
                    border: `1px solid ${theme.borderSubtle}`,
                  }}
                  title="Reset dataset to default sample values"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              /* Export CSV for shared view */
              <button
                id="export-csv-btn"
                onClick={onExportCSV}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer"
                style={{
                  backgroundColor: theme.bgInput,
                  color: theme.textSecondary,
                  border: `1px solid ${theme.borderSubtle}`,
                }}
                title="Export Current Filtered Dataset as CSV"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">CSV</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
