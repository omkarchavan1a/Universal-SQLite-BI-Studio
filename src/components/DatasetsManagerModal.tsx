import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Database,
  Upload,
  Plus,
  Share2,
  Copy,
  Trash2,
  Edit2,
  Check,
  Sparkles,
  BarChart3,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  FolderKanban,
  Download,
  Activity,
  Users,
  ShoppingBag,
  Package,
  TrendingUp,
  ShieldCheck,
  Columns,
  Hash,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { ManagedDataset, GenericRecord, DatasetProfile } from '../types';
import { ThemeConfig } from '../themes';
import { SAMPLE_DATASETS } from '../data/sampleDatasets';
import { getSampleDataset } from '../data/sampleDatasets';
import { profileDataset, parseUniversalFile } from '../utils/universalParser';
import { getDefaultDashboards } from '../utils/dashboardGenerator';
import { exportUniversalCSV } from '../utils/universalExcelEngine';

interface DatasetsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasets: ManagedDataset[];
  activeDatasetId: string;
  onSelectDataset: (datasetId: string) => void;
  onAddDataset: (dataset: ManagedDataset) => void;
  onAddMultipleDatasets: (datasets: ManagedDataset[]) => void;
  onUpdateDataset: (dataset: ManagedDataset) => void;
  onDuplicateDataset: (dataset: ManagedDataset) => void;
  onDeleteDataset: (datasetId: string) => void;
  onOpenShareModalForDataset: (dataset: ManagedDataset) => void;
  theme: ThemeConfig;
}

const categoryIcons: Record<string, React.ElementType> = {
  'Human Resources': Users,
  'Retail & Commerce': ShoppingBag,
  'Cloud & Tech': Activity,
  'Operations': Package,
  'Finance': FileSpreadsheet,
  'General': Database,
};

export const DatasetsManagerModal: React.FC<DatasetsManagerModalProps> = ({
  isOpen,
  onClose,
  datasets,
  activeDatasetId,
  onSelectDataset,
  onAddDataset,
  onAddMultipleDatasets,
  onUpdateDataset,
  onDuplicateDataset,
  onDeleteDataset,
  onOpenShareModalForDataset,
  theme,
}) => {
  const [activeTab, setActiveTab] = useState<'datasets' | 'batch_upload' | 'samples' | 'comparison'>('datasets');
  const [editingDatasetId, setEditingDatasetId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [isProcessingFiles, setIsProcessingFiles] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle batch file uploading
  const handleProcessFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setIsProcessingFiles(true);
    setUploadStatus(`Parsing and generating dashboards for ${files.length} dataset(s)...`);

    const newDatasets: ManagedDataset[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        setUploadStatus(`Processing (${i + 1}/${files.length}): ${file.name}...`);
        const { records: parsedRecords, profile: parsedProfile } = await parseUniversalFile(file);
        const generatedDashboards = getDefaultDashboards(parsedProfile, parsedRecords);
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

        const managed: ManagedDataset = {
          id: `ds_upload_${Date.now()}_${i}`,
          name: cleanName,
          fileName: file.name,
          category: 'Uploaded Data',
          records: parsedRecords,
          profile: parsedProfile,
          dashboards: generatedDashboards,
          activeDashboardId: generatedDashboards[0]?.id || `dash_${Date.now()}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isCustomUpload: true,
        };
        newDatasets.push(managed);
      } catch (err: any) {
        console.error(`Error reading ${file.name}:`, err);
      }
    }

    setIsProcessingFiles(false);
    setUploadStatus('');

    if (newDatasets.length > 0) {
      onAddMultipleDatasets(newDatasets);
      setActiveTab('datasets');
    }
  };

  const handleAddSample = (sampleId: string) => {
    const sample = getSampleDataset(sampleId);
    if (!sample) return;

    const sampleProfile = profileDataset(sample.records, sample.name);
    const sampleDashboards = getDefaultDashboards(sampleProfile, sample.records);

    const managed: ManagedDataset = {
      id: `ds_sample_${sampleId}_${Date.now()}`,
      name: sample.name,
      fileName: sample.fileName,
      category: sample.category,
      records: sample.records,
      profile: sampleProfile,
      dashboards: sampleDashboards,
      activeDashboardId: sampleDashboards[0]?.id || `dash_${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sampleId,
    };

    onAddDataset(managed);
    setActiveTab('datasets');
  };

  const handleStartEdit = (ds: ManagedDataset) => {
    setEditingDatasetId(ds.id);
    setEditName(ds.name);
  };

  const handleSaveEdit = (ds: ManagedDataset) => {
    if (editName.trim()) {
      onUpdateDataset({
        ...ds,
        name: editName.trim(),
        updatedAt: Date.now(),
      });
    }
    setEditingDatasetId(null);
  };

  const handleExportDatasetCSV = (ds: ManagedDataset) => {
    exportUniversalCSV(ds.records, ds.profile, `${ds.name.replace(/\s+/g, '_')}_export.csv`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-5xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.borderCard,
        }}
      >
        {/* Modal Header */}
        <div
          className="p-5 sm:p-6 border-b flex items-center justify-between"
          style={{ borderColor: theme.borderSubtle }}
        >
          <div className="flex items-center space-x-3">
            <div
              className="p-2.5 rounded-2xl"
              style={{ backgroundColor: theme.bgBadge, color: theme.accentPrimary }}
            >
              <FolderKanban className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-bold" style={{ color: theme.textPrimary }}>
                  Datasets & Dashboards Manager Hub
                </h2>
                <span
                  className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold"
                  style={{ backgroundColor: theme.bgInput, color: theme.accentPrimary }}
                >
                  {datasets.length} Total Datasets
                </span>
              </div>
              <p className="text-xs sm:text-sm mt-0.5" style={{ color: theme.textSecondary }}>
                Create multiple dataset dashboards simultaneously, manage separate views, and generate independent share links.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl transition cursor-pointer hover:opacity-80"
            style={{ backgroundColor: theme.bgInput, color: theme.textSecondary }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          className="px-6 border-b flex items-center space-x-2 overflow-x-auto"
          style={{ borderColor: theme.borderSubtle, backgroundColor: theme.bgInput }}
        >
          <button
            onClick={() => setActiveTab('datasets')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'datasets' ? 'border-indigo-600' : 'border-transparent opacity-70 hover:opacity-100'
            }`}
            style={{
              color: activeTab === 'datasets' ? theme.accentPrimary : theme.textSecondary,
              borderColor: activeTab === 'datasets' ? theme.accentPrimary : 'transparent',
            }}
          >
            <Layers className="w-4 h-4" />
            <span>Active Datasets ({datasets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('batch_upload')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'batch_upload' ? 'border-indigo-600' : 'border-transparent opacity-70 hover:opacity-100'
            }`}
            style={{
              color: activeTab === 'batch_upload' ? theme.accentPrimary : theme.textSecondary,
              borderColor: activeTab === 'batch_upload' ? theme.accentPrimary : 'transparent',
            }}
          >
            <Upload className="w-4 h-4" />
            <span>+ Batch Upload Datasets</span>
          </button>

          <button
            onClick={() => setActiveTab('samples')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'samples' ? 'border-indigo-600' : 'border-transparent opacity-70 hover:opacity-100'
            }`}
            style={{
              color: activeTab === 'samples' ? theme.accentPrimary : theme.textSecondary,
              borderColor: activeTab === 'samples' ? theme.accentPrimary : 'transparent',
            }}
          >
            <Sparkles className="w-4 h-4" />
            <span>Sample Catalog</span>
          </button>

          <button
            onClick={() => setActiveTab('comparison')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'comparison' ? 'border-indigo-600' : 'border-transparent opacity-70 hover:opacity-100'
            }`}
            style={{
              color: activeTab === 'comparison' ? theme.accentPrimary : theme.textSecondary,
              borderColor: activeTab === 'comparison' ? theme.accentPrimary : 'transparent',
            }}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Cross-Dataset Comparison</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: ALL ACTIVE DATASETS */}
          {activeTab === 'datasets' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs sm:text-sm" style={{ color: theme.textSecondary }}>
                  Each dataset maintains its own dedicated dashboards, metrics, filters, and separate sharing link.
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setActiveTab('batch_upload')}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs text-white"
                    style={{ background: theme.accentGradient }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload More Datasets</span>
                  </button>
                </div>
              </div>

              {/* Grid of Dataset Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {datasets.map((ds) => {
                  const isActive = ds.id === activeDatasetId;
                  const IconComp = (ds.category && categoryIcons[ds.category]) || Database;
                  const isEditing = editingDatasetId === ds.id;

                  return (
                    <div
                      key={ds.id}
                      className="p-5 rounded-2xl border transition-all flex flex-col justify-between relative shadow-xs"
                      style={{
                        backgroundColor: isActive ? theme.bgCard : theme.bgInput,
                        borderColor: isActive ? theme.accentPrimary : theme.borderSubtle,
                        borderWidth: isActive ? 2 : 1,
                      }}
                    >
                      <div>
                        {/* Top Row: Icon, Title & Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-3">
                            <div
                              className="p-2.5 rounded-xl shrink-0"
                              style={{
                                backgroundColor: isActive ? theme.bgBadge : theme.bgCard,
                                color: theme.accentPrimary,
                              }}
                            >
                              <IconComp className="w-5 h-5" />
                            </div>
                            <div>
                              {isEditing ? (
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="px-2 py-1 text-sm rounded-lg border focus:outline-none"
                                    style={{
                                      backgroundColor: theme.bgCard,
                                      borderColor: theme.accentPrimary,
                                      color: theme.textPrimary,
                                    }}
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSaveEdit(ds)}
                                    className="p-1 rounded-lg bg-emerald-500 text-white"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <h3 className="text-sm font-bold truncate max-w-[180px] sm:max-w-[220px]" style={{ color: theme.textPrimary }}>
                                    {ds.name}
                                  </h3>
                                  <button
                                    onClick={() => handleStartEdit(ds)}
                                    className="p-1 text-gray-400 hover:text-gray-600 rounded transition cursor-pointer"
                                    title="Rename Dataset"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                              <p className="text-[11px] truncate max-w-[220px]" style={{ color: theme.textSecondary }}>
                                File: {ds.fileName}
                              </p>
                            </div>
                          </div>

                          {isActive ? (
                            <span
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
                              style={{
                                backgroundColor: theme.bgBadge,
                                color: theme.accentPrimary,
                                border: `1px solid ${theme.borderSubtle}`,
                              }}
                            >
                              <Check className="w-3 h-3" />
                              <span>Active Workspace</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                onSelectDataset(ds.id);
                                onClose();
                              }}
                              className="px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer border hover:opacity-90"
                              style={{
                                backgroundColor: theme.bgCard,
                                borderColor: theme.borderSubtle,
                                color: theme.textPrimary,
                              }}
                            >
                              Switch to this
                            </button>
                          )}
                        </div>

                        {/* Middle: Key Data Stats */}
                        <div className="grid grid-cols-3 gap-2 my-4">
                          <div
                            className="p-2.5 rounded-xl border text-center"
                            style={{ backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }}
                          >
                            <span className="text-[10px] uppercase font-mono block" style={{ color: theme.textSecondary }}>
                              Rows
                            </span>
                            <span className="text-sm font-bold font-mono" style={{ color: theme.textPrimary }}>
                              {ds.records.length.toLocaleString()}
                            </span>
                          </div>

                          <div
                            className="p-2.5 rounded-xl border text-center"
                            style={{ backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }}
                          >
                            <span className="text-[10px] uppercase font-mono block" style={{ color: theme.textSecondary }}>
                              Columns
                            </span>
                            <span className="text-sm font-bold font-mono" style={{ color: theme.textPrimary }}>
                              {ds.profile.columns.length}
                            </span>
                          </div>

                          <div
                            className="p-2.5 rounded-xl border text-center"
                            style={{ backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }}
                          >
                            <span className="text-[10px] uppercase font-mono block" style={{ color: theme.textSecondary }}>
                              Dashboards
                            </span>
                            <span className="text-sm font-bold font-mono" style={{ color: theme.accentPrimary }}>
                              {ds.dashboards?.length || 1} Tabs
                            </span>
                          </div>
                        </div>

                        {/* Dashboards Pills */}
                        <div className="space-y-1.5 mb-4">
                          <span className="text-[11px] font-semibold" style={{ color: theme.textSecondary }}>
                            Configured Dashboards:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {(ds.dashboards || []).map((dash) => (
                              <span
                                key={dash.id}
                                className="px-2 py-0.5 rounded-lg text-[10px] font-medium border"
                                style={{
                                  backgroundColor: theme.bgCard,
                                  borderColor: theme.borderSubtle,
                                  color: theme.textPrimary,
                                }}
                              >
                                {dash.title}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Actions Bar */}
                      <div
                        className="pt-3 border-t flex flex-wrap items-center justify-between gap-2"
                        style={{ borderColor: theme.borderSubtle }}
                      >
                        {/* Separate Share Button */}
                        <button
                          onClick={() => {
                            onOpenShareModalForDataset(ds);
                          }}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                          style={{
                            backgroundColor: theme.bgBadge,
                            color: theme.accentPrimary,
                            border: `1px solid ${theme.borderSubtle}`,
                          }}
                          title="Generate a separate standalone live share URL for this dataset only"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Share Separate Link</span>
                        </button>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleExportDatasetCSV(ds)}
                            className="p-1.5 rounded-lg border text-gray-500 hover:text-gray-800 transition cursor-pointer"
                            title="Export this dataset as CSV"
                            style={{ borderColor: theme.borderSubtle }}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onDuplicateDataset(ds)}
                            className="p-1.5 rounded-lg border text-gray-500 hover:text-emerald-600 transition cursor-pointer"
                            title="Duplicate this dataset and all its dashboards"
                            style={{ borderColor: theme.borderSubtle }}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {datasets.length > 1 && (
                            <button
                              onClick={() => onDeleteDataset(ds.id)}
                              className="p-1.5 rounded-lg border text-gray-500 hover:text-rose-600 transition cursor-pointer"
                              title="Delete dataset"
                              style={{ borderColor: theme.borderSubtle }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: BATCH UPLOAD MULTIPLE DATASETS */}
          {activeTab === 'batch_upload' && (
            <div className="space-y-6">
              {/* Hidden file input */}
              <input
                type="file"
                ref={batchFileInputRef}
                onChange={(e) => e.target.files && handleProcessFiles(e.target.files)}
                accept=".csv,.xlsx,.xls,.tsv,.json,.sqlite,.db"
                multiple
                className="hidden"
              />

              {/* Drag and Drop Zone */}
              <div
                onClick={() => batchFileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files) {
                    handleProcessFiles(e.dataTransfer.files);
                  }
                }}
                className="p-10 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all hover:opacity-90 flex flex-col items-center justify-center space-y-4"
                style={{
                  backgroundColor: theme.bgInput,
                  borderColor: theme.accentPrimary,
                }}
              >
                <div
                  className="p-4 rounded-2xl"
                  style={{ backgroundColor: theme.bgBadge, color: theme.accentPrimary }}
                >
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold" style={{ color: theme.textPrimary }}>
                    Drop Multiple CSV, XLSX, TSV, or JSON Files Here
                  </h3>
                  <p className="text-xs sm:text-sm mt-1" style={{ color: theme.textSecondary }}>
                    Select 1, 2, 5, or more files simultaneously. The engine will parse each file, verify schema health, and generate 5 tailored dashboards per dataset automatically!
                  </p>
                </div>

                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer transition"
                  style={{ background: theme.accentGradient }}
                >
                  Browse & Select Multiple Files
                </button>
              </div>

              {isProcessingFiles && (
                <div
                  className="p-4 rounded-2xl border flex items-center space-x-3"
                  style={{ backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }}
                >
                  <Activity className="w-5 h-5 animate-spin" style={{ color: theme.accentPrimary }} />
                  <span className="text-xs font-medium" style={{ color: theme.textPrimary }}>
                    {uploadStatus}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SAMPLE DATASET CATALOG */}
          {activeTab === 'samples' && (
            <div className="space-y-4">
              <p className="text-xs sm:text-sm" style={{ color: theme.textSecondary }}>
                Quickly add multi-industry realistic datasets to test multi-dataset dashboards, cross-analytics, and sharing:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SAMPLE_DATASETS.map((sample) => {
                  const IconComp = (sample.category && categoryIcons[sample.category]) || Database;
                  return (
                    <div
                      key={sample.id}
                      className="p-5 rounded-2xl border flex flex-col justify-between space-y-4"
                      style={{
                        backgroundColor: theme.bgInput,
                        borderColor: theme.borderSubtle,
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className="p-2.5 rounded-xl shrink-0"
                          style={{ backgroundColor: theme.bgBadge, color: theme.accentPrimary }}
                        >
                          <IconComp className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold" style={{ color: theme.textPrimary }}>
                            {sample.name}
                          </h4>
                          <span
                            className="inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded mt-0.5"
                            style={{ backgroundColor: theme.bgCard, color: theme.textSecondary }}
                          >
                            {sample.category} &bull; {sample.rowCount} records
                          </span>
                          <p className="text-xs mt-2" style={{ color: theme.textSecondary }}>
                            {sample.description}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddSample(sample.id)}
                        className="w-full flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-bold border transition cursor-pointer hover:opacity-90"
                        style={{
                          backgroundColor: theme.bgCard,
                          borderColor: theme.borderSubtle,
                          color: theme.accentPrimary,
                        }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add Dataset to Workspace</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: CROSS-DATASET COMPARISON TABLE */}
          {activeTab === 'comparison' && (
            <div className="space-y-4">
              <p className="text-xs sm:text-sm" style={{ color: theme.textSecondary }}>
                Side-by-side snapshot comparison across all active datasets in your workspace:
              </p>

              <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: theme.borderSubtle }}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: theme.bgInput }}>
                      <th className="p-3 font-bold" style={{ color: theme.textPrimary }}>Dataset Name</th>
                      <th className="p-3 font-bold" style={{ color: theme.textPrimary }}>Category</th>
                      <th className="p-3 font-bold text-right" style={{ color: theme.textPrimary }}>Total Rows</th>
                      <th className="p-3 font-bold text-right" style={{ color: theme.textPrimary }}>Columns</th>
                      <th className="p-3 font-bold" style={{ color: theme.textPrimary }}>Primary Dimension</th>
                      <th className="p-3 font-bold" style={{ color: theme.textPrimary }}>Primary Metric</th>
                      <th className="p-3 font-bold text-center" style={{ color: theme.textPrimary }}>Dashboards</th>
                      <th className="p-3 font-bold text-center" style={{ color: theme.textPrimary }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: theme.borderSubtle }}>
                    {datasets.map((ds) => {
                      const isActive = ds.id === activeDatasetId;
                      return (
                        <tr
                          key={ds.id}
                          style={{
                            backgroundColor: isActive ? theme.bgBadge : 'transparent',
                          }}
                        >
                          <td className="p-3 font-bold" style={{ color: theme.textPrimary }}>
                            <div className="flex items-center space-x-1.5">
                              {isActive && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                              <span>{ds.name}</span>
                            </div>
                          </td>
                          <td className="p-3 font-mono" style={{ color: theme.textSecondary }}>{ds.category || 'General'}</td>
                          <td className="p-3 font-mono text-right font-bold" style={{ color: theme.textPrimary }}>
                            {ds.records.length.toLocaleString()}
                          </td>
                          <td className="p-3 font-mono text-right" style={{ color: theme.textSecondary }}>
                            {ds.profile.columns.length}
                          </td>
                          <td className="p-3 font-mono font-medium text-indigo-600">
                            {ds.profile.primaryDimensionKey}
                          </td>
                          <td className="p-3 font-mono font-medium text-emerald-600">
                            {ds.profile.primaryMetricKey}
                          </td>
                          <td className="p-3 font-mono text-center font-bold" style={{ color: theme.accentPrimary }}>
                            {ds.dashboards?.length || 1}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => {
                                  onSelectDataset(ds.id);
                                  onClose();
                                }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer"
                                style={{
                                  backgroundColor: theme.bgCard,
                                  borderColor: theme.borderSubtle,
                                  color: theme.accentPrimary,
                                }}
                              >
                                View
                              </button>
                              <button
                                onClick={() => onOpenShareModalForDataset(ds)}
                                className="p-1 rounded-lg text-gray-500 hover:text-indigo-600 transition cursor-pointer"
                                title="Share separate dashboard"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="p-4 sm:p-5 border-t flex flex-wrap items-center justify-between gap-3"
          style={{ borderColor: theme.borderSubtle, backgroundColor: theme.bgInput }}
        >
          <div className="flex items-center space-x-2 text-xs" style={{ color: theme.textSecondary }}>
            <span>Managing <strong>{datasets.length}</strong> active dataset(s).</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer hover:opacity-85"
              style={{
                backgroundColor: theme.bgCard,
                borderColor: theme.borderSubtle,
                color: theme.textPrimary,
              }}
            >
              Close Hub
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
