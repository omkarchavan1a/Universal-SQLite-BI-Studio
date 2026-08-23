import React, { useRef } from 'react';
import { motion } from 'motion/react';
import {
  Database,
  Plus,
  Share2,
  Sparkles,
  Upload,
  FolderKanban,
  FileSpreadsheet,
  Check,
  ChevronDown,
  Layers,
  ExternalLink,
  Copy,
  Trash2,
  Eye,
  BarChart3,
  Users,
  ShoppingBag,
  Activity,
  Package,
} from 'lucide-react';
import { ManagedDataset } from '../types';
import { ThemeConfig } from '../themes';

interface DatasetSwitcherBarProps {
  datasets: ManagedDataset[];
  activeDatasetId: string;
  onSelectDataset: (datasetId: string) => void;
  onOpenDatasetsManager: () => void;
  onBatchUploadFiles: (files: FileList | File[]) => void;
  onShareDataset: (dataset: ManagedDataset) => void;
  onDuplicateDataset: (dataset: ManagedDataset) => void;
  onDeleteDataset: (datasetId: string) => void;
  theme: ThemeConfig;
  isSharedMode?: boolean;
}

const categoryIconMap: Record<string, React.ElementType> = {
  'Human Resources': Users,
  'Retail & Commerce': ShoppingBag,
  'Cloud & Tech': Activity,
  'Operations': Package,
  'Finance': FileSpreadsheet,
  'General': Database,
};

export const DatasetSwitcherBar: React.FC<DatasetSwitcherBarProps> = ({
  datasets,
  activeDatasetId,
  onSelectDataset,
  onOpenDatasetsManager,
  onBatchUploadFiles,
  onShareDataset,
  onDuplicateDataset,
  onDeleteDataset,
  theme,
  isSharedMode = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeDataset = datasets.find((d) => d.id === activeDatasetId) || datasets[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onBatchUploadFiles(e.target.files);
      e.target.value = '';
    }
  };

  if (!datasets || datasets.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Hidden Multi-file input for batch adding datasets */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv,.xlsx,.xls,.tsv,.json,.sqlite,.db"
        multiple
        className="hidden"
      />

      <div
        id="dataset-switcher-bar"
        className="flex flex-wrap items-center justify-between gap-2.5 p-2 rounded-2xl border shadow-xs transition-all"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.borderCard,
        }}
      >
        {/* Left Side: Datasets Label & Horizontal Scroll Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto py-0.5 max-w-full">
          <div
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold shrink-0"
            style={{
              backgroundColor: theme.bgBadge,
              color: theme.accentPrimary,
              border: `1px solid ${theme.borderSubtle}`,
            }}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Datasets</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {datasets.length}
            </span>
          </div>

          {/* Dataset Tabs */}
          <div className="flex items-center space-x-1.5">
            {datasets.map((ds) => {
              const isActive = ds.id === activeDatasetId;
              const IconComp = (ds.category && categoryIconMap[ds.category]) || Database;

              return (
                <div
                  key={ds.id}
                  className="relative group flex items-center shrink-0"
                >
                  <button
                    id={`dataset-tab-${ds.id}`}
                    onClick={() => onSelectDataset(ds.id)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      isActive ? 'shadow-xs' : 'hover:opacity-90'
                    }`}
                    style={{
                      background: isActive ? theme.accentGradient : theme.bgInput,
                      color: isActive ? '#FFFFFF' : theme.textPrimary,
                      borderColor: isActive ? 'transparent' : theme.borderSubtle,
                    }}
                    title={`${ds.name} (${ds.records.length} records, ${ds.dashboards?.length || 1} dashboards)`}
                  >
                    <IconComp className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate max-w-[120px] sm:max-w-[160px]">{ds.name}</span>
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded-md shrink-0"
                      style={{
                        backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : theme.bgCard,
                        color: isActive ? '#FFFFFF' : theme.textSecondary,
                      }}
                    >
                      {ds.records.length} rows
                    </span>
                  </button>

                  {/* Dataset Quick Actions (Share Separate Link / Duplicate / Delete) */}
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
                        onShareDataset(ds);
                      }}
                      className="p-1 rounded hover:opacity-80 text-gray-500 hover:text-indigo-600 cursor-pointer"
                      title="Share this specific dataset's dashboards separately"
                    >
                      <Share2 className="w-3 h-3" />
                    </button>
                    {!isSharedMode && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateDataset(ds);
                          }}
                          className="p-1 rounded hover:opacity-80 text-gray-500 hover:text-emerald-600 cursor-pointer"
                          title="Duplicate dataset and dashboards"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {datasets.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteDataset(ds.id);
                            }}
                            className="p-1 rounded hover:opacity-80 text-gray-500 hover:text-rose-600 cursor-pointer"
                            title="Remove dataset from workspace"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Add / Batch Import button */}
          {!isSharedMode && (
            <button
              id="batch-upload-dataset-btn"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer shrink-0 hover:opacity-85"
              style={{
                backgroundColor: theme.bgInput,
                borderColor: theme.borderSubtle,
                color: theme.accentPrimary,
              }}
              title="Batch upload multiple CSV, XLSX, or JSON files to create multiple datasets at once"
            >
              <Upload className="w-3 h-3" />
              <span>+ Add / Batch Upload</span>
            </button>
          )}
        </div>

        {/* Right Side Hub Action: Open Datasets & Dashboards Manager */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            id="open-datasets-manager-btn"
            onClick={onOpenDatasetsManager}
            className="flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer shadow-xs hover:opacity-90"
            style={{
              backgroundColor: theme.bgInput,
              borderColor: theme.borderCard,
              color: theme.textPrimary,
            }}
            title="Manage all datasets, create multiple dashboards, view side-by-side comparisons, and generate separate share links"
          >
            <FolderKanban className="w-3.5 h-3.5" style={{ color: theme.accentPrimary }} />
            <span>Manage All Datasets ({datasets.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
