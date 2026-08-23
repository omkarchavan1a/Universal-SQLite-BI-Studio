import React, { useState, useEffect } from 'react';
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
  Database
} from 'lucide-react';
import { ThemeConfig, ThemeId } from '../themes';
import { DatasetProfile, GenericRecord, UniversalFilterState } from '../types';
import { encodeDatasetToCompressedString } from '../utils/datasetStorage';

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
}) => {
  const [includeFilters, setIncludeFilters] = useState<boolean>(true);
  const [includeTheme, setIncludeTheme] = useState<boolean>(true);
  const [includeRealtime, setIncludeRealtime] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [generatedUrl, setGeneratedUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    setIsGenerating(true);

    try {
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.set('shared', 'true');
      url.searchParams.set('view', 'dashboard');

      if (isCustomUpload || !sampleId) {
        // Encode custom uploaded CSV/Excel records into compressed URL hash payload
        const compressed = encodeDatasetToCompressedString(records, profile, datasetName, fileName);
        if (compressed) {
          url.hash = `data=${compressed}`;
        }
      } else {
        url.searchParams.set('sample', sampleId);
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
        if (filters.searchQuery?.trim()) {
          url.searchParams.set('q', filters.searchQuery.trim());
        }
      }

      setGeneratedUrl(url.toString());
    } catch (e) {
      setGeneratedUrl(window.location.href);
    } finally {
      setIsGenerating(false);
    }
  }, [
    isOpen, 
    sampleId, 
    isCustomUpload, 
    records, 
    profile, 
    datasetName, 
    fileName, 
    themeId, 
    includeTheme, 
    includeRealtime, 
    isRealtimeActive, 
    includeFilters, 
    activePreset, 
    filters.searchQuery
  ]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      const input = document.getElementById('share-url-input') as HTMLInputElement;
      if (input) {
        input.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    }
  };

  const handleOpenLink = () => {
    window.open(generatedUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all duration-300"
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
                Share Live Dashboard
              </h3>
              <p className="text-xs" style={{ color: theme.textMuted }}>
                Recipients view the exact interactive dashboard, charts & filters
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
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
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
                  color: isCustomUpload ? '#10B981' : theme.accentPrimary,
                }}
              >
                {isCustomUpload ? <FileSpreadsheet className="w-4 h-4" /> : <Database className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <span className="font-bold block truncate" style={{ color: theme.textPrimary }}>
                  {datasetName}
                </span>
                <span className="text-[11px] font-mono block truncate" style={{ color: theme.textSecondary }}>
                  {fileName} • {records.length} records • {profile.columns.length} columns
                </span>
              </div>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0"
              style={{
                backgroundColor: theme.bgBadge,
                color: isCustomUpload ? '#10B981' : theme.accentPrimary,
                borderColor: theme.borderSubtle,
              }}
            >
              {isCustomUpload ? 'Custom Upload' : 'Preloaded Sample'}
            </span>
          </div>

          {/* Share Link Preview Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold flex items-center justify-between" style={{ color: theme.textSecondary }}>
              <span className="flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5" style={{ color: theme.accentPrimary }} />
                Shareable Dashboard Link
              </span>
              <span className="text-[11px] font-normal" style={{ color: theme.accentSecondary }}>
                {isCustomUpload ? 'Self-Contained Data Snapshot' : 'Live & Filter-Enabled'}
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
                value={isGenerating ? 'Generating share link...' : generatedUrl}
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-transparent border-none focus:outline-none truncate"
                style={{ color: theme.textPrimary }}
              />
              <button
                onClick={handleCopy}
                disabled={isGenerating}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition cursor-pointer shrink-0 shadow-xs hover:opacity-90 disabled:opacity-50"
                style={{ background: theme.accentGradient }}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
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
                  <span className="font-semibold block" style={{ color: theme.textPrimary }}>Preserve Theme Styling</span>
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

          {/* Recipient Experience info card */}
          <div
            className="p-3 rounded-xl border flex items-start space-x-2.5 text-xs"
            style={{
              backgroundColor: theme.bgBadge,
              borderColor: theme.borderSubtle,
            }}
          >
            <Eye className="w-4 h-4 shrink-0 mt-0.5" style={{ color: theme.accentPrimary }} />
            <div>
              <span className="font-bold block" style={{ color: theme.textPrimary }}>
                {isCustomUpload ? 'Full Custom Data Included' : 'Live Dashboard Experience'}
              </span>
              <p className="text-[11px] mt-0.5" style={{ color: theme.textSecondary }}>
                {isCustomUpload 
                  ? 'Recipients receive your uploaded file schema, calculated metrics, KPIs, and all visual charts with full interactivity.'
                  : 'Recipients get a clean, presentation-ready live dashboard showcasing Executive KPIs, dynamic categorical & numeric filters, and responsive charts.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: theme.borderSubtle }}>
          <button
            onClick={handleOpenLink}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer hover:opacity-80"
            style={{
              backgroundColor: theme.bgInput,
              borderColor: theme.borderSubtle,
              color: theme.textPrimary,
            }}
          >
            <ExternalLink className="w-3.5 h-3.5" style={{ color: theme.accentPrimary }} />
            <span>Test Link in New Tab</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-white transition cursor-pointer hover:opacity-90"
            style={{ background: theme.accentGradient }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

