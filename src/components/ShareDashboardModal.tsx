import React, { useState, useMemo, useEffect } from 'react';
import { 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  X, 
  Sliders, 
  Palette, 
  Activity, 
  Eye,
  Sparkles,
  Link as LinkIcon,
  Filter,
  FileSpreadsheet,
  Layers,
  Database,
  ArrowRight,
  Download,
  Code,
  FolderKanban,
  CheckCircle2,
} from 'lucide-react';
import { ThemeConfig, ThemeId } from '../themes';
import { DatasetProfile, GenericRecord, UniversalFilterState, ManagedDataset } from '../types';
import { 
  encodeDatasetToCompressedString, 
  saveSharedDataset, 
  saveActiveCustomDataset,
  encodeDatasetWithDashboards,
  encodeMultiDatasetBundle
} from '../utils/datasetStorage';
import { exportUniversalCSV } from '../utils/universalExcelEngine';

interface ShareDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetName: string;
  fileName: string;
  records: GenericRecord[];
  profile: DatasetProfile;
  sampleId?: string;
  isCustomUpload?: boolean;
  themeId: ThemeId;
  theme: ThemeConfig;
  filters: UniversalFilterState;
  activePreset: string;
  isRealtimeActive: boolean;
  datasets?: ManagedDataset[];
  activeDatasetId?: string;
  initialTargetDatasetId?: string;
}

export const ShareDashboardModal: React.FC<ShareDashboardModalProps> = ({
  isOpen,
  onClose,
  datasetName,
  fileName,
  records,
  profile,
  sampleId,
  isCustomUpload = false,
  themeId,
  theme,
  filters,
  activePreset,
  isRealtimeActive,
  datasets = [],
  activeDatasetId,
  initialTargetDatasetId,
}) => {
  const [shareScope, setShareScope] = useState<'single' | 'bundle'>('single');
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(
    initialTargetDatasetId || activeDatasetId || datasets[0]?.id || ''
  );

  const [includeFilters, setIncludeFilters] = useState<boolean>(true);
  const [includeTheme, setIncludeTheme] = useState<boolean>(true);
  const [includeRealtime, setIncludeRealtime] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [copiedEmbed, setCopiedEmbed] = useState<boolean>(false);

  // Sync selectedDatasetId when modal opens or initial target changes
  useEffect(() => {
    if (initialTargetDatasetId) {
      setSelectedDatasetId(initialTargetDatasetId);
    } else if (activeDatasetId) {
      setSelectedDatasetId(activeDatasetId);
    }
  }, [initialTargetDatasetId, activeDatasetId, isOpen]);

  // Target dataset being shared
  const targetDataset: ManagedDataset = useMemo(() => {
    const found = datasets.find((d) => d.id === selectedDatasetId);
    if (found) return found;

    return {
      id: selectedDatasetId || `ds_${Date.now()}`,
      name: datasetName,
      fileName,
      records,
      profile,
      dashboards: [],
      activeDashboardId: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isCustomUpload,
      sampleId,
    };
  }, [datasets, selectedDatasetId, datasetName, fileName, records, profile, isCustomUpload, sampleId]);

  // Deterministic share ID based on dataset metadata
  const shareId = useMemo(() => {
    const ds = targetDataset;
    const cleanName = (ds.name || 'data').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const hash = Math.abs(
      (ds.name + ds.fileName + ds.records.length + (ds.profile.primaryMetricKey || '')).split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)
    ).toString(36);
    return `${cleanName}_${hash}`;
  }, [targetDataset]);

  // Persist dataset snapshot to shared cache whenever modal opens or data changes
  useEffect(() => {
    if (isOpen && targetDataset.records.length > 0 && targetDataset.profile) {
      saveSharedDataset(shareId, targetDataset.records, targetDataset.profile, targetDataset.name, targetDataset.fileName);
    }
  }, [isOpen, shareId, targetDataset]);

  // Compute shareable URL
  const generatedUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';

    try {
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.set('shared', 'true');
      url.searchParams.set('view', 'dashboard');

      if (shareScope === 'bundle' && datasets.length > 1) {
        // Multi-dataset bundle sharing
        url.searchParams.set('scope', 'bundle');
        const compressedBundle = encodeMultiDatasetBundle(datasets, selectedDatasetId || activeDatasetId || datasets[0].id);
        if (compressedBundle) {
          url.hash = `bundle=${compressedBundle}`;
          if (compressedBundle.length < 1800) {
            url.searchParams.set('bundle', compressedBundle);
          }
        }
      } else {
        // Single separate dataset sharing
        url.searchParams.set('sid', shareId);
        url.searchParams.set('ds', targetDataset.id);

        const compressed = encodeDatasetWithDashboards(targetDataset) || 
          encodeDatasetToCompressedString(targetDataset.records, targetDataset.profile, targetDataset.name, targetDataset.fileName);

        if (compressed) {
          url.hash = `data=${compressed}`;
          if (compressed.length < 1800) {
            url.searchParams.set('data', compressed);
          }
        }

        if (targetDataset.sampleId && !targetDataset.isCustomUpload) {
          url.searchParams.set('sample', targetDataset.sampleId);
        }
      }

      if (includeTheme && themeId) {
        url.searchParams.set('theme', themeId);
      }

      if (includeRealtime) {
        url.searchParams.set('live', isRealtimeActive ? '1' : '0');
      }

      if (includeFilters) {
        if (activePreset && activePreset !== 'All Records') {
          url.searchParams.set('preset', activePreset);
        }
        if (filters?.searchQuery?.trim()) {
          url.searchParams.set('q', filters.searchQuery.trim());
        }
        const hasCat = Object.keys(filters?.categoricalFilters || {}).some(
          (k) => filters.categoricalFilters[k] && filters.categoricalFilters[k].length > 0
        );
        const hasNum = Object.keys(filters?.numericRanges || {}).length > 0;
        if (hasCat || hasNum) {
          try {
            const filterPayload = JSON.stringify({
              c: filters.categoricalFilters,
              n: filters.numericRanges,
            });
            url.searchParams.set('fstate', encodeURIComponent(filterPayload));
          } catch {
            // Ignore serialization error
          }
        }
      }

      return url.toString();
    } catch {
      return typeof window !== 'undefined' ? window.location.href : '';
    }
  }, [
    shareScope,
    datasets,
    targetDataset,
    shareId,
    selectedDatasetId,
    activeDatasetId,
    themeId,
    includeTheme,
    includeRealtime,
    isRealtimeActive,
    includeFilters,
    activePreset,
    filters
  ]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!generatedUrl) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(generatedUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        return;
      }
    } catch {
      // Fallback
    }

    const input = document.getElementById('share-url-input') as HTMLInputElement;
    if (input) {
      input.select();
      input.setSelectionRange(0, 99999);
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleCopyEmbed = async () => {
    const embedCode = `<iframe src="${generatedUrl}" width="100%" height="800" frameborder="0" style="border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);"></iframe>`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(embedCode);
        setCopiedEmbed(true);
        setTimeout(() => setCopiedEmbed(false), 3000);
      }
    } catch (e) {
      console.warn('Could not copy embed code:', e);
    }
  };

  const handleCopyJson = async () => {
    try {
      const payload = {
        name: targetDataset.name,
        fileName: targetDataset.fileName,
        profile: targetDataset.profile,
        dashboards: targetDataset.dashboards,
        records: targetDataset.records,
      };
      const text = JSON.stringify(payload, null, 2);
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 3000);
    } catch (e) {
      console.warn('Could not copy JSON:', e);
    }
  };

  const handleDownloadCsv = () => {
    exportUniversalCSV(targetDataset.records, targetDataset.profile, `${targetDataset.name.toLowerCase().replace(/\s+/g, '_')}.csv`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden transition-all duration-300 flex flex-col max-h-[90vh]"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.borderCard,
          color: theme.textPrimary,
        }}
      >
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: theme.borderSubtle }}>
          <div className="flex items-center space-x-2.5">
            <div
              className="p-2 rounded-xl border"
              style={{
                backgroundColor: theme.bgBadge,
                color: theme.accentPrimary,
                borderColor: theme.borderSubtle,
              }}
            >
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: theme.textPrimary }}>
                Share Separate Dataset Dashboard
              </h3>
              <p className="text-xs" style={{ color: theme.textMuted }}>
                Generate distinct standalone URLs for individual datasets or bundle the whole workspace
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl transition cursor-pointer hover:opacity-75"
            style={{ backgroundColor: theme.bgInput, color: theme.textMuted }}
            aria-label="Close share dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Share Scope Selector (Single Dataset vs All Datasets Bundle) */}
          {datasets.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold" style={{ color: theme.textSecondary }}>
                Share Scope
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShareScope('single')}
                  className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                    shareScope === 'single' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: shareScope === 'single' ? theme.bgBadge : theme.bgInput,
                    borderColor: shareScope === 'single' ? theme.accentPrimary : theme.borderSubtle,
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4" style={{ color: theme.accentPrimary }} />
                    <span className="font-bold" style={{ color: theme.textPrimary }}>Single Dataset</span>
                  </div>
                  <p className="text-[11px] mt-1" style={{ color: theme.textSecondary }}>
                    Share standalone dashboards for one chosen dataset
                  </p>
                </button>

                <button
                  onClick={() => setShareScope('bundle')}
                  className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                    shareScope === 'bundle' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: shareScope === 'bundle' ? theme.bgBadge : theme.bgInput,
                    borderColor: shareScope === 'bundle' ? theme.accentPrimary : theme.borderSubtle,
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <FolderKanban className="w-4 h-4" style={{ color: theme.accentPrimary }} />
                    <span className="font-bold" style={{ color: theme.textPrimary }}>All Datasets ({datasets.length})</span>
                  </div>
                  <p className="text-[11px] mt-1" style={{ color: theme.textSecondary }}>
                    Share entire workspace with dataset switcher
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Dataset Dropdown / Target Selector */}
          {shareScope === 'single' && datasets.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold" style={{ color: theme.textSecondary }}>
                Select Dataset to Share Separately:
              </label>
              <select
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                className="w-full p-2.5 rounded-xl border text-xs font-semibold focus:outline-none cursor-pointer"
                style={{
                  backgroundColor: theme.bgInput,
                  borderColor: theme.borderSubtle,
                  color: theme.textPrimary,
                }}
              >
                {datasets.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name} ({ds.records.length} records &bull; {ds.dashboards?.length || 1} dashboards)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Active Dataset Overview Badge */}
          <div
            className="p-3 rounded-xl border flex items-center justify-between text-xs"
            style={{
              backgroundColor: theme.bgInput,
              borderColor: theme.borderSubtle,
            }}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div
                className="p-1.5 rounded-lg shrink-0"
                style={{
                  backgroundColor: theme.bgBadge,
                  color: theme.accentPrimary,
                }}
              >
                <Database className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-bold block truncate" style={{ color: theme.textPrimary }}>
                  {shareScope === 'bundle' ? `Full Workspace (${datasets.length} Datasets)` : targetDataset.name}
                </span>
                <span className="text-[11px] font-mono block truncate" style={{ color: theme.textSecondary }}>
                  {shareScope === 'bundle' 
                    ? `${datasets.reduce((acc, d) => acc + d.records.length, 0)} total records across ${datasets.length} datasets`
                    : `${targetDataset.fileName} • ${targetDataset.records.length} records • ${targetDataset.profile.columns.length} columns • ${targetDataset.dashboards?.length || 1} dashboards`
                  }
                </span>
              </div>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0"
              style={{
                backgroundColor: theme.bgBadge,
                color: theme.accentPrimary,
                borderColor: theme.borderSubtle,
              }}
            >
              {shareScope === 'bundle' ? 'Workspace Bundle' : 'Separate Dashboard'}
            </span>
          </div>

          {/* Share Link Preview Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold flex items-center justify-between" style={{ color: theme.textSecondary }}>
              <span className="flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5" style={{ color: theme.accentPrimary }} />
                Shareable Dashboard URL
              </span>
              <span className="text-[11px] font-mono font-normal" style={{ color: theme.accentSecondary }}>
                Separate Standalone Link
              </span>
            </label>
            <div
              className="flex items-center rounded-xl border p-1"
              style={{
                backgroundColor: theme.bgInput,
                borderColor: theme.borderSubtle,
              }}
            >
              <input
                id="share-url-input"
                type="text"
                readOnly
                value={generatedUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-transparent border-none focus:outline-none truncate cursor-text"
                style={{ color: theme.textPrimary }}
              />
              <button
                id="copy-share-url-btn"
                onClick={handleCopy}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition cursor-pointer shrink-0 shadow-xs hover:opacity-90 active:scale-95"
                style={{ background: theme.accentGradient }}
                title="Copy share link to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
            {copied && (
              <p className="text-[11px] font-semibold text-emerald-500 animate-fadeIn flex items-center gap-1">
                <Check className="w-3 h-3" /> Link copied to clipboard! Ready to send to stakeholders.
              </p>
            )}
          </div>

          {/* Configuration Toggles */}
          <div className="space-y-2 pt-2 border-t" style={{ borderColor: theme.borderSubtle }}>
            <span className="text-xs font-bold block" style={{ color: theme.textSecondary }}>
              Link Share Options
            </span>

            {/* Toggle 1: Include Filters */}
            <label
              className="flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition text-xs"
              style={{ backgroundColor: theme.bgInput, borderColor: theme.borderSubtle }}
            >
              <div className="flex items-center space-x-2">
                <Filter className="w-3.5 h-3.5" style={{ color: theme.accentPrimary }} />
                <div>
                  <span className="font-semibold block" style={{ color: theme.textPrimary }}>Preserve Active Filters & Search</span>
                  <span className="text-[11px]" style={{ color: theme.textMuted }}>
                    {activePreset !== 'All Records' ? `Preset: "${activePreset}"` : 'Default view state'}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeFilters}
                onChange={(e) => setIncludeFilters(e.target.checked)}
                className="rounded accent-emerald-500 cursor-pointer w-4 h-4"
              />
            </label>

            {/* Toggle 2: Include Theme */}
            <label
              className="flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition text-xs"
              style={{ backgroundColor: theme.bgInput, borderColor: theme.borderSubtle }}
            >
              <div className="flex items-center space-x-2">
                <Palette className="w-3.5 h-3.5" style={{ color: theme.accentPrimary }} />
                <div>
                  <span className="font-semibold block" style={{ color: theme.textPrimary }}>Preserve Theme Palette</span>
                  <span className="text-[11px]" style={{ color: theme.textMuted }}>
                    Loads in "{theme.name}" palette
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeTheme}
                onChange={(e) => setIncludeTheme(e.target.checked)}
                className="rounded accent-emerald-500 cursor-pointer w-4 h-4"
              />
            </label>

            {/* Toggle 3: Realtime Live Sync */}
            <label
              className="flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition text-xs"
              style={{ backgroundColor: theme.bgInput, borderColor: theme.borderSubtle }}
            >
              <div className="flex items-center space-x-2">
                <Activity className="w-3.5 h-3.5" style={{ color: theme.accentPrimary }} />
                <div>
                  <span className="font-semibold block" style={{ color: theme.textPrimary }}>Live Pulse Data Stream</span>
                  <span className="text-[11px]" style={{ color: theme.textMuted }}>
                    {isRealtimeActive ? 'Real-time simulation enabled' : 'Static snapshot'}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeRealtime}
                onChange={(e) => setIncludeRealtime(e.target.checked)}
                className="rounded accent-emerald-500 cursor-pointer w-4 h-4"
              />
            </label>
          </div>

          {/* Direct Snapshot Tools */}
          <div
            className="p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs"
            style={{
              backgroundColor: theme.bgInput,
              borderColor: theme.borderSubtle,
            }}
          >
            <div className="flex items-center space-x-2">
              <Code className="w-3.5 h-3.5" style={{ color: theme.accentPrimary }} />
              <span className="font-semibold" style={{ color: theme.textSecondary }}>
                Export & Embed:
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyEmbed}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer hover:opacity-80 flex items-center space-x-1"
                style={{
                  backgroundColor: theme.bgBadge,
                  borderColor: theme.borderSubtle,
                  color: theme.textPrimary,
                }}
                title="Copy iframe embed snippet"
              >
                {copiedEmbed ? <Check className="w-3 h-3 text-emerald-500" /> : <Code className="w-3 h-3" />}
                <span>{copiedEmbed ? 'Embed Copied!' : 'Embed iFrame'}</span>
              </button>
              <button
                onClick={handleCopyJson}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer hover:opacity-80 flex items-center space-x-1"
                style={{
                  backgroundColor: theme.bgBadge,
                  borderColor: theme.borderSubtle,
                  color: theme.textPrimary,
                }}
                title="Copy dataset structure as JSON"
              >
                {copiedJson ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedJson ? 'JSON Copied!' : 'Copy JSON'}</span>
              </button>
              <button
                onClick={handleDownloadCsv}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer hover:opacity-80 flex items-center space-x-1"
                style={{
                  backgroundColor: theme.bgBadge,
                  borderColor: theme.borderSubtle,
                  color: theme.textPrimary,
                }}
                title="Download records as CSV"
              >
                <Download className="w-3 h-3 text-emerald-500" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t flex flex-wrap items-center justify-between gap-2" style={{ borderColor: theme.borderSubtle }}>
          <div className="flex items-center space-x-2">
            <a
              id="test-share-link-tab"
              href={generatedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer hover:opacity-80 shadow-2xs"
              style={{
                backgroundColor: theme.bgInput,
                borderColor: theme.borderSubtle,
                color: theme.textPrimary,
              }}
              title="Open the share link in a new browser tab"
            >
              <ExternalLink className="w-3.5 h-3.5" style={{ color: theme.accentPrimary }} />
              <span>Open in New Tab</span>
            </a>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-white transition cursor-pointer hover:opacity-90 shadow-xs"
            style={{ background: theme.accentGradient }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
