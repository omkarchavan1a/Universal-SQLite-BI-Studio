import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { DataSchemaProfiler } from './components/DataSchemaProfiler';
import { KPIGrid } from './components/KPIGrid';
import { FilterBar } from './components/FilterBar';
import { ChartsSection } from './components/ChartsSection';
import { DataTable } from './components/DataTable';
import { SqliteWorkbench } from './components/SqliteWorkbench';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { WorkbookModal } from './components/WorkbookModal';
import { ActivityLogDrawer } from './components/ActivityLogDrawer';
import { ShareDashboardModal } from './components/ShareDashboardModal';
import { DashboardTabBar } from './components/DashboardTabBar';
import { DataCheckModal } from './components/DataCheckModal';
import { DashboardConfigModal } from './components/DashboardConfigModal';
import { 
  DatasetProfile, 
  GenericRecord, 
  UniversalFilterState, 
  UpdateEvent,
  DashboardConfig 
} from './types';
import { 
  profileDataset, 
  parseUploadedFile, 
  formatMetricValue 
} from './utils/universalParser';
import { getDefaultDashboards } from './utils/dashboardGenerator';
import { sampleDatasets } from './data/sampleDatasets';
import { exportUniversalCSV } from './utils/universalExcelEngine';
import { 
  createSqliteDatabase, 
  SqliteState, 
  executeSqlQuery 
} from './utils/sqliteEngine';
import { 
  ThemeId, 
  getTheme, 
  THEMES 
} from './themes';
import {
  encodeDatasetToCompressedString,
  decodeDatasetFromCompressedString,
  saveActiveCustomDataset,
  loadActiveCustomDataset,
  clearActiveCustomDataset,
  saveSharedDataset,
  loadSharedDataset,
  extractDataPayload
} from './utils/datasetStorage';
import { 
  Activity, 
  FileSpreadsheet, 
  CheckCircle2, 
  Database,
  ArrowUpRight,
  Sparkles,
  Layers,
  Palette,
  Terminal,
  Share2,
  ExternalLink,
  BarChart3,
} from 'lucide-react';

/**
 * Resolves the initial dataset state from URL compressed hash/params, share ID, or local storage
 */
function resolveInitialDataset(): {
  records: GenericRecord[];
  profile: DatasetProfile;
  datasetName: string;
  fileName: string;
  sampleIndex: number;
  isShared: boolean;
} {
  const defaultSample = sampleDatasets[0];

  if (typeof window === 'undefined') {
    return {
      records: defaultSample.records,
      profile: profileDataset(defaultSample.records, defaultSample.name),
      datasetName: defaultSample.name,
      fileName: defaultSample.fileName,
      sampleIndex: 0,
      isShared: false,
    };
  }

  const urlParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash || '';
  const fullHref = window.location.href || '';
  const isShared = 
    urlParams.get('shared') === 'true' || 
    urlParams.get('mode') === 'dashboard' || 
    urlParams.get('view') === 'dashboard' ||
    hash.includes('data=') ||
    fullHref.includes('data=') ||
    !!urlParams.get('sid');

  // 1. Check for URL Hash or Query compressed payload (#data=... or ?data=...)
  const rawPayload = extractDataPayload(hash) || extractDataPayload(urlParams.get('data') || '') || extractDataPayload(urlParams.get('payload') || '') || extractDataPayload(fullHref);
  if (rawPayload) {
    const decoded = decodeDatasetFromCompressedString(rawPayload);
    if (decoded && decoded.records && decoded.records.length > 0) {
      // Save locally so refreshes persist
      saveActiveCustomDataset(decoded.records, decoded.profile, decoded.datasetName, decoded.fileName);
      return {
        records: decoded.records,
        profile: decoded.profile,
        datasetName: decoded.datasetName,
        fileName: decoded.fileName,
        sampleIndex: -1,
        isShared: true,
      };
    }
  }

  // 2. Check for Shared Dataset ID (?sid=...) in shared storage cache
  const sidParam = urlParams.get('sid');
  if (sidParam) {
    const sharedData = loadSharedDataset(sidParam);
    if (sharedData && sharedData.records && sharedData.records.length > 0) {
      saveActiveCustomDataset(sharedData.records, sharedData.profile, sharedData.datasetName, sharedData.fileName);
      return {
        records: sharedData.records,
        profile: sharedData.profile,
        datasetName: sharedData.datasetName,
        fileName: sharedData.fileName,
        sampleIndex: -1,
        isShared: true,
      };
    }
  }

  // 3. If in Shared Mode or without sample param, check active custom uploaded dataset from storage
  const activeCustom = loadActiveCustomDataset();
  if (activeCustom && activeCustom.records && activeCustom.records.length > 0 && (isShared || !urlParams.get('sample'))) {
    return {
      records: activeCustom.records,
      profile: activeCustom.profile,
      datasetName: activeCustom.datasetName,
      fileName: activeCustom.fileName,
      sampleIndex: -1,
      isShared: isShared,
    };
  }

  // 4. Check for explicit ?sample=... param (by id, name, or index) ONLY if not in shared mode with custom data
  const sampleParam = urlParams.get('sample');
  if (sampleParam && !isShared) {
    const cleanParam = sampleParam.toLowerCase().trim();
    let idx = sampleDatasets.findIndex(
      (s) => 
        s.id.toLowerCase() === cleanParam || 
        s.name.toLowerCase() === cleanParam ||
        s.id.toLowerCase().replace(/_/g, '') === cleanParam.replace(/_/g, '')
    );
    if (idx === -1 && !isNaN(Number(sampleParam)) && sampleDatasets[Number(sampleParam)]) {
      idx = Number(sampleParam);
    }
    if (idx !== -1) {
      const sample = sampleDatasets[idx];
      return {
        records: sample.records,
        profile: profileDataset(sample.records, sample.name),
        datasetName: sample.name,
        fileName: sample.fileName,
        sampleIndex: idx,
        isShared,
      };
    }
  }

  // 5. Check if any active custom dataset is saved in standard mode
  if (activeCustom && activeCustom.records && activeCustom.records.length > 0) {
    return {
      records: activeCustom.records,
      profile: activeCustom.profile,
      datasetName: activeCustom.datasetName,
      fileName: activeCustom.fileName,
      sampleIndex: -1,
      isShared: false,
    };
  }

  // 6. Default fallback sample
  return {
    records: defaultSample.records,
    profile: profileDataset(defaultSample.records, defaultSample.name),
    datasetName: defaultSample.name,
    fileName: defaultSample.fileName,
    sampleIndex: 0,
    isShared,
  };
}

export default function App() {
  const initialResolved = useMemo(() => resolveInitialDataset(), []);

  // 0. URL parameters detection for Shared Dashboard View
  const [isSharedMode, setIsSharedMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('shared') === 'true' || params.get('mode') === 'dashboard' || initialResolved.isShared;
  });
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // 1. Dataset State
  const [currentSampleIndex, setCurrentSampleIndex] = useState<number>(initialResolved.sampleIndex);
  const [records, setRecords] = useState<GenericRecord[]>(initialResolved.records);
  const [datasetName, setDatasetName] = useState<string>(initialResolved.datasetName);
  const [fileName, setFileName] = useState<string>(initialResolved.fileName);
  
  // Profile state for the active dataset
  const [profile, setProfile] = useState<DatasetProfile>(initialResolved.profile);

  // Active Main View ('schema' | 'dashboard' | 'table' | 'sqlite')
  const [activeView, setActiveView] = useState<'schema' | 'dashboard' | 'table' | 'sqlite'>('dashboard');

  // Theming State
  const [currentThemeId, setCurrentThemeId] = useState<ThemeId>(() => {
    if (typeof window === 'undefined') return 'berry_noir';
    const params = new URLSearchParams(window.location.search);
    const themeParam = params.get('theme') as ThemeId;
    if (themeParam && THEMES[themeParam]) return themeParam;
    
    try {
      const savedTheme = localStorage.getItem('universal_studio_theme') as ThemeId;
      if (savedTheme && THEMES[savedTheme]) return savedTheme;
    } catch {
      // Ignore localStorage access errors
    }
    return 'berry_noir';
  });
  const [isThemeModalOpen, setIsThemeModalOpen] = useState<boolean>(false);
  const theme = useMemo(() => getTheme(currentThemeId), [currentThemeId]);

  // Persist theme changes across refreshes via localStorage & URL sync
  useEffect(() => {
    try {
      localStorage.setItem('universal_studio_theme', currentThemeId);
    } catch {
      // Ignore storage errors in sandboxed iframes
    }

    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.get('theme') !== currentThemeId) {
        currentUrl.searchParams.set('theme', currentThemeId);
        window.history.replaceState({}, '', currentUrl.toString());
      }
    }
  }, [currentThemeId]);

  // SQLite Database State
  const [sqliteState, setSqliteState] = useState<SqliteState | null>(null);
  const [isSqliteInitializing, setIsSqliteInitializing] = useState<boolean>(false);

  // Real-time synchronization state
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const params = new URLSearchParams(window.location.search);
    const liveParam = params.get('live');
    if (liveParam === '0' || liveParam === 'false') return false;
    return true;
  });
  const [refreshInterval, setRefreshInterval] = useState<number>(4); // seconds
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [updateCount, setUpdateCount] = useState<number>(0);
  const [events, setEvents] = useState<UpdateEvent[]>([]);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState<string | null>(null);

  // Modals & Drawers
  const [isWorkbookModalOpen, setIsWorkbookModalOpen] = useState<boolean>(false);
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Multi-Dashboard Management State
  const [dashboards, setDashboards] = useState<DashboardConfig[]>(() =>
    getDefaultDashboards(initialResolved.profile, initialResolved.records)
  );
  const [activeDashboardId, setActiveDashboardId] = useState<string>(() =>
    dashboards[0]?.id || `dash_exec_${Date.now()}`
  );
  const [isDataCheckModalOpen, setIsDataCheckModalOpen] = useState<boolean>(false);
  const [isDashboardConfigModalOpen, setIsDashboardConfigModalOpen] = useState<boolean>(false);
  const [dashboardToEdit, setDashboardToEdit] = useState<DashboardConfig | null>(null);

  const activeDashboard = useMemo(() => {
    return dashboards.find((d) => d.id === activeDashboardId) || dashboards[0];
  }, [dashboards, activeDashboardId]);

  // Universal Filters
  const [filters, setFilters] = useState<UniversalFilterState>(() => {
    if (typeof window === 'undefined') {
      return { searchQuery: '', categoricalFilters: {}, numericRanges: {} };
    }
    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get('q') || '';
    let catFilters: Record<string, string[]> = {};
    let numFilters: Record<string, [number, number]> = {};
    const fstate = params.get('fstate');
    if (fstate) {
      try {
        const decoded = JSON.parse(decodeURIComponent(fstate));
        if (decoded?.c) catFilters = decoded.c;
        if (decoded?.n) numFilters = decoded.n;
      } catch {
        // ignore
      }
    }
    return {
      searchQuery: initialQuery,
      categoricalFilters: catFilters,
      numericRanges: numFilters,
    };
  });
  const [activePreset, setActivePreset] = useState<string>(() => {
    if (typeof window === 'undefined') return 'All Records';
    return new URLSearchParams(window.location.search).get('preset') || 'All Records';
  });

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // SQLite Database Synchronization Effect
  useEffect(() => {
    let isCancelled = false;
    const syncSqlite = async () => {
      if (records.length === 0) return;
      setIsSqliteInitializing(true);
      try {
        const state = await createSqliteDatabase(records, profile);
        if (!isCancelled) {
          setSqliteState(state);
        }
      } catch (err) {
        console.error('Failed to initialize SQLite database:', err);
      } finally {
        if (!isCancelled) {
          setIsSqliteInitializing(false);
        }
      }
    };

    syncSqlite();

    return () => {
      isCancelled = true;
    };
  }, [records, profile]);

  // Switch to a preloaded sample dataset
  const handleSelectSample = (index: number) => {
    const sample = sampleDatasets[index];
    if (!sample) return;
    clearActiveCustomDataset();
    setCurrentSampleIndex(index);
    setRecords(sample.records);
    setDatasetName(sample.name);
    setFileName(sample.fileName);
    const newProfile = profileDataset(sample.records, sample.name);
    setProfile(newProfile);
    const newDashboards = getDefaultDashboards(newProfile, sample.records);
    setDashboards(newDashboards);
    setActiveDashboardId(newDashboards[0]?.id || `dash_exec_${Date.now()}`);
    setFilters({ searchQuery: '', categoricalFilters: {}, numericRanges: {} });
    setActivePreset('All Records');
    setLastSyncTime(new Date());
    setUpdateCount(0);

    // Clear data hash if present
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState({}, '', window.location.pathname + window.location.search);
    }

    showNotification(`Switched to "${sample.name}" dataset (${sample.records.length} records)`);
  };

  // Handle uploaded custom file (CSV, XLSX, TSV, JSON)
  const handleUploadFile = async (file: File) => {
    try {
      const { records: parsedRecords, profile: parsedProfile, filename } = await parseUploadedFile(file);
      setRecords(parsedRecords);
      setProfile(parsedProfile);
      setDatasetName(parsedProfile.name);
      setFileName(filename);
      setCurrentSampleIndex(-1); // Custom file loaded
      setFilters({ searchQuery: '', categoricalFilters: {}, numericRanges: {} });
      setActivePreset('All Records');
      setLastSyncTime(new Date());
      setUpdateCount(0);

      // Auto-generate multiple tailored dashboards for this uploaded file
      const generatedDashboards = getDefaultDashboards(parsedProfile, parsedRecords);
      setDashboards(generatedDashboards);
      setActiveDashboardId(generatedDashboards[0]?.id || `dash_exec_${Date.now()}`);

      // Save to persistent storage so refreshes don't lose the file
      saveActiveCustomDataset(parsedRecords, parsedProfile, parsedProfile.name, filename);

      // Generate deterministic share ID and persist in shared cache
      const cleanName = (parsedProfile.name || 'data').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const hash = Math.abs(
        (parsedProfile.name + filename + parsedRecords.length + (parsedProfile.primaryMetricKey || '')).split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)
      ).toString(36);
      const generatedShareId = `${cleanName}_${hash}`;
      saveSharedDataset(generatedShareId, parsedRecords, parsedProfile, parsedProfile.name, filename);

      // Update URL without old sample parameter and set new data payload
      if (typeof window !== 'undefined') {
        try {
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.delete('sample');
          currentUrl.searchParams.set('view', 'dashboard');
          currentUrl.searchParams.set('sid', generatedShareId);
          const compressed = encodeDatasetToCompressedString(parsedRecords, parsedProfile, parsedProfile.name, filename);
          if (compressed) {
            currentUrl.hash = `data=${compressed}`;
            if (compressed.length < 1800) {
              currentUrl.searchParams.set('data', compressed);
            }
          }
          window.history.replaceState({}, '', currentUrl.toString());
        } catch {
          // Ignore history state updates if blocked
        }
      }

      // Log event
      const newEvent: UpdateEvent = {
        id: `EVT-${Date.now()}`,
        timestamp: new Date(),
        type: 'file_upload',
        recordId: 'FILE_UPLOAD',
        description: `Imported "${filename}" (${parsedRecords.length} rows, ${parsedProfile.columns.length} columns detected). Generated ${generatedDashboards.length} dashboards.`,
      };
      setEvents((prev) => [newEvent, ...prev]);

      // Switch to dashboard view and trigger Data Check & Multi-Dashboard creation modal
      setActiveView('dashboard');
      setIsDataCheckModalOpen(true);
      showNotification(`File analyzed: ${parsedProfile.columns.length} columns & ${generatedDashboards.length} dashboards ready!`);
    } catch (err: any) {
      alert(`Error reading file: ${err.message || err}`);
    }
  };

  // Multi-Dashboard Management Functions
  const handleSelectDashboard = (id: string) => {
    setActiveDashboardId(id);
  };

  const handleOpenCreateDashboard = () => {
    setDashboardToEdit(null);
    setIsDashboardConfigModalOpen(true);
  };

  const handleOpenEditDashboard = (dash: DashboardConfig) => {
    setDashboardToEdit(dash);
    setIsDashboardConfigModalOpen(true);
  };

  const handleSaveDashboard = (savedDash: DashboardConfig) => {
    setDashboards((prev) => {
      const existsIndex = prev.findIndex((d) => d.id === savedDash.id);
      if (existsIndex !== -1) {
        const next = [...prev];
        next[existsIndex] = savedDash;
        return next;
      }
      return [...prev, savedDash];
    });
    setActiveDashboardId(savedDash.id);
    showNotification(`Dashboard "${savedDash.title}" saved.`);
  };

  const handleDuplicateDashboard = (dash: DashboardConfig) => {
    const duplicated: DashboardConfig = {
      ...dash,
      id: `dash_copy_${Date.now()}`,
      title: `${dash.title} (Copy)`,
      createdAt: Date.now(),
    };
    setDashboards((prev) => [...prev, duplicated]);
    setActiveDashboardId(duplicated.id);
    showNotification(`Duplicated dashboard to "${duplicated.title}".`);
  };

  const handleDeleteDashboard = (id: string) => {
    if (dashboards.length <= 1) {
      showNotification('Cannot delete the only remaining dashboard.');
      return;
    }
    setDashboards((prev) => prev.filter((d) => d.id !== id));
    if (activeDashboardId === id) {
      const remaining = dashboards.filter((d) => d.id !== id);
      if (remaining.length > 0) {
        setActiveDashboardId(remaining[0].id);
      }
    }
    showNotification('Dashboard tab removed.');
  };

  const handleApplyDashboards = (chosenDashboards: DashboardConfig[], activeId?: string) => {
    if (chosenDashboards && chosenDashboards.length > 0) {
      setDashboards(chosenDashboards);
      if (activeId) {
        setActiveDashboardId(activeId);
      } else {
        setActiveDashboardId(chosenDashboards[0].id);
      }
      showNotification(`Activated ${chosenDashboards.length} dashboards.`);
    }
  };

  // Update profile configuration (e.g. override primary dimension, metrics, column types)
  const handleUpdateProfile = (updatedProfile: DatasetProfile) => {
    setProfile(updatedProfile);
    if (currentSampleIndex === -1) {
      saveActiveCustomDataset(records, updatedProfile, datasetName, fileName);
    }
    showNotification('Dataset schema and chart dimension mappings updated.');
  };

  // Filtered records calculation
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Universal Search Query across all fields
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchesAny = Object.values(r).some((val) =>
          String(val || '').toLowerCase().includes(query)
        );
        if (!matchesAny) return false;
      }

      // 2. Categorical multi-select filters
      const catFilters = (filters.categoricalFilters || {}) as Record<string, string[]>;
      for (const [colKey, selectedValues] of Object.entries(catFilters)) {
        if (Array.isArray(selectedValues) && selectedValues.length > 0) {
          const rowVal = String(r[colKey] || '');
          if (!selectedValues.includes(rowVal)) {
            return false;
          }
        }
      }

      // 3. Numeric minimum range filters
      const numRanges = (filters.numericRanges || {}) as Record<string, [number, number]>;
      for (const [colKey, range] of Object.entries(numRanges)) {
        const minVal = range?.[0];
        if (minVal !== undefined && minVal > 0) {
          const numVal = Number(r[colKey]) || 0;
          if (numVal < minVal) {
            return false;
          }
        }
      }

      return true;
    });
  }, [records, filters]);

  // Real-time Mutation Engine (adapts to whatever dataset is active)
  useEffect(() => {
    if (!isRealtimeActive || records.length === 0) return;

    const intervalId = setInterval(() => {
      setRecords((prevRecords) => {
        if (prevRecords.length === 0) return prevRecords;

        const numCols = profile.columns.filter((c) => c.type === 'numeric');
        if (numCols.length === 0) return prevRecords;

        const randomIndex = Math.floor(Math.random() * prevRecords.length);
        const target = prevRecords[randomIndex];
        const randomCol = numCols[Math.floor(Math.random() * numCols.length)];

        const currentVal = Number(target[randomCol.key]) || 0;
        const deltaPercent = (Math.random() * 0.16 - 0.06);
        let newVal = Math.max(0, currentVal * (1 + deltaPercent));
        if (currentVal > 100) {
          newVal = Math.round(newVal);
        } else {
          newVal = Number(newVal.toFixed(2));
        }

        const idColKey = profile.idKey;
        const targetId = String(target[idColKey] || target.id || target._id || `ROW-${randomIndex}`);

        const updatedRecord = {
          ...target,
          [randomCol.key]: newVal,
          _lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };

        const newEvent: UpdateEvent = {
          id: `EVT-${Date.now()}`,
          timestamp: new Date(),
          type: 'auto_sync',
          recordId: targetId,
          description: `Live cloud update on ${randomCol.name}: ${formatMetricValue(currentVal, randomCol.isCurrency)} → ${formatMetricValue(newVal, randomCol.isCurrency)}`,
          details: {
            field: randomCol.name,
            oldValue: formatMetricValue(currentVal, randomCol.isCurrency),
            newValue: formatMetricValue(newVal, randomCol.isCurrency),
          },
        };

        setEvents((prev) => [newEvent, ...prev.slice(0, 49)]);
        setRecentlyUpdatedId(targetId);
        setLastSyncTime(new Date());
        setUpdateCount((c) => c + 1);

        const newRecords = [...prevRecords];
        newRecords[randomIndex] = updatedRecord;
        return newRecords;
      });
    }, refreshInterval * 1000);

    return () => clearInterval(intervalId);
  }, [isRealtimeActive, refreshInterval, records.length, profile]);

  // Clear highlight after a short delay
  useEffect(() => {
    if (recentlyUpdatedId) {
      const timer = setTimeout(() => {
        setRecentlyUpdatedId(null);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [recentlyUpdatedId]);

  // Presets handler
  const handleApplyPreset = (presetName: string) => {
    setActivePreset(presetName);
    const metricCol = profile.columns.find((c) => c.key === profile.primaryMetricKey);

    if (presetName === 'All Records') {
      setFilters({ searchQuery: '', categoricalFilters: {}, numericRanges: {} });
    } else if (presetName === 'Top 25% High Value' && metricCol && metricCol.max) {
      const threshold = metricCol.max * 0.65;
      setFilters((prev) => ({
        ...prev,
        numericRanges: {
          ...prev.numericRanges,
          [metricCol.key]: [threshold, metricCol.max!],
        },
      }));
    } else if (presetName === 'Above Average' && metricCol && metricCol.mean) {
      setFilters((prev) => ({
        ...prev,
        numericRanges: {
          ...prev.numericRanges,
          [metricCol.key]: [metricCol.mean!, metricCol.max || 100000],
        },
      }));
    }
  };

  // Record mutations (Add / Edit / Delete)
  const handleUpdateRecord = useCallback((updated: GenericRecord) => {
    const idKey = profile.idKey;
    const targetId = String(updated[idKey] || updated.id || updated._id);

    setRecords((prev) =>
      prev.map((r) => (String(r[idKey] || r.id || r._id) === targetId ? updated : r))
    );
    setRecentlyUpdatedId(targetId);
    setLastSyncTime(new Date());

    const newEvent: UpdateEvent = {
      id: `EVT-${Date.now()}`,
      timestamp: new Date(),
      type: 'edit',
      recordId: targetId,
      description: `Manual edit applied to record ${targetId}`,
    };
    setEvents((prev) => [newEvent, ...prev.slice(0, 49)]);
    showNotification(`Record ${targetId} saved.`);
  }, [profile.idKey]);

  const handleAddRecord = useCallback((newRec: GenericRecord) => {
    const idKey = profile.idKey;
    const recId = String(newRec[idKey] || `REC-${Date.now().toString().slice(-4)}`);
    const complete = { ...newRec, [idKey]: recId };

    setRecords((prev) => [complete, ...prev]);
    setRecentlyUpdatedId(recId);
    setLastSyncTime(new Date());

    const newEvent: UpdateEvent = {
      id: `EVT-${Date.now()}`,
      timestamp: new Date(),
      type: 'add',
      recordId: recId,
      description: `Created new itemized record ${recId}`,
    };
    setEvents((prev) => [newEvent, ...prev.slice(0, 49)]);
    showNotification(`New record ${recId} added.`);
  }, [profile.idKey]);

  const handleDeleteRecord = useCallback((recordId: string) => {
    const idKey = profile.idKey;
    setRecords((prev) =>
      prev.filter((r) => String(r[idKey] || r.id || r._id) !== recordId)
    );
    setLastSyncTime(new Date());

    const newEvent: UpdateEvent = {
      id: `EVT-${Date.now()}`,
      timestamp: new Date(),
      type: 'delete',
      recordId: recordId,
      description: `Removed record ${recordId} from active dataset.`,
    };
    setEvents((prev) => [newEvent, ...prev.slice(0, 49)]);
    showNotification(`Record ${recordId} removed.`);
  }, [profile.idKey]);

  // Apply shared view from URL
  const handleApplySharedView = (shareUrl: string) => {
    try {
      const urlObj = new URL(shareUrl);
      const urlParams = urlObj.searchParams;
      const hash = urlObj.hash || '';

      // Check for compressed data payload
      const rawPayload = extractDataPayload(hash) || extractDataPayload(urlParams.get('data') || '') || extractDataPayload(shareUrl);
      let datasetLoaded = false;

      if (rawPayload) {
        const decoded = decodeDatasetFromCompressedString(rawPayload);
        if (decoded && decoded.records && decoded.records.length > 0) {
          setRecords(decoded.records);
          setProfile(decoded.profile);
          setDatasetName(decoded.datasetName);
          setFileName(decoded.fileName);
          setCurrentSampleIndex(-1);
          datasetLoaded = true;
        }
      }

      if (!datasetLoaded) {
        const sidParam = urlParams.get('sid');
        if (sidParam) {
          const sharedData = loadSharedDataset(sidParam);
          if (sharedData && sharedData.records && sharedData.records.length > 0) {
            setRecords(sharedData.records);
            setProfile(sharedData.profile);
            setDatasetName(sharedData.datasetName);
            setFileName(sharedData.fileName);
            setCurrentSampleIndex(-1);
            datasetLoaded = true;
          }
        }
      }

      if (!datasetLoaded) {
        const sampleParam = urlParams.get('sample');
        if (sampleParam) {
          const cleanParam = sampleParam.toLowerCase().trim();
          let idx = sampleDatasets.findIndex(
            (s) => 
              s.id.toLowerCase() === cleanParam || 
              s.name.toLowerCase() === cleanParam ||
              s.id.toLowerCase().replace(/_/g, '') === cleanParam.replace(/_/g, '')
          );
          if (idx === -1 && !isNaN(Number(sampleParam)) && sampleDatasets[Number(sampleParam)]) {
            idx = Number(sampleParam);
          }
          if (idx !== -1) {
            const sample = sampleDatasets[idx];
            setCurrentSampleIndex(idx);
            setRecords(sample.records);
            setProfile(profileDataset(sample.records, sample.name));
            setDatasetName(sample.name);
            setFileName(sample.fileName);
            datasetLoaded = true;
          }
        }
      }

      if (!datasetLoaded) {
        const activeCustom = loadActiveCustomDataset();
        if (activeCustom && activeCustom.records && activeCustom.records.length > 0) {
          setRecords(activeCustom.records);
          setProfile(activeCustom.profile);
          setDatasetName(activeCustom.datasetName);
          setFileName(activeCustom.fileName);
          setCurrentSampleIndex(-1);
        }
      }

      const themeParam = urlParams.get('theme') as ThemeId;
      if (themeParam && THEMES[themeParam]) {
        setCurrentThemeId(themeParam);
      }

      const liveParam = urlParams.get('live');
      if (liveParam !== null) {
        setIsRealtimeActive(liveParam === '1' || liveParam === 'true');
      }

      const presetParam = urlParams.get('preset');
      const qParam = urlParams.get('q') || '';
      const fstateParam = urlParams.get('fstate');
      let catFilters: Record<string, string[]> = {};
      let numFilters: Record<string, [number, number]> = {};
      if (fstateParam) {
        try {
          const decodedF = JSON.parse(decodeURIComponent(fstateParam));
          if (decodedF?.c) catFilters = decodedF.c;
          if (decodedF?.n) numFilters = decodedF.n;
        } catch {
          // ignore
        }
      }
      if (presetParam) {
        handleApplyPreset(presetParam);
      }
      setFilters((prev) => ({
        ...prev,
        searchQuery: qParam,
        categoricalFilters: catFilters,
        numericRanges: numFilters,
      }));

      setIsSharedMode(true);
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', shareUrl);
      }
      showNotification('Loaded shared live dashboard view successfully!');
    } catch (e) {
      console.error('Failed to apply shared view:', e);
    }
  };

  // Listen for browser back/forward or hash change to sync dataset state dynamically
  useEffect(() => {
    const handleUrlStateChange = () => {
      const resolved = resolveInitialDataset();
      if (resolved) {
        setRecords(resolved.records);
        setProfile(resolved.profile);
        setDatasetName(resolved.datasetName);
        setFileName(resolved.fileName);
        setCurrentSampleIndex(resolved.sampleIndex);
        if (resolved.isShared) {
          setIsSharedMode(true);
        }
      }
    };

    window.addEventListener('hashchange', handleUrlStateChange);
    window.addEventListener('popstate', handleUrlStateChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlStateChange);
      window.removeEventListener('popstate', handleUrlStateChange);
    };
  }, []);

  const handleResetData = () => {
    handleSelectSample(0);
  };

  return (
    <div
      className="min-h-screen font-sans antialiased transition-colors duration-500 flex flex-col justify-between"
      style={{
        backgroundColor: theme.bgApp,
        color: theme.textPrimary,
      }}
    >
      {/* Top Section */}
      <div>
        {/* Toast Notification */}
        {notification && (
          <div className="fixed bottom-5 right-5 z-50 animate-bounce">
            <div
              className="rounded-2xl px-4 py-3 shadow-2xl flex items-center space-x-3 text-xs border"
              style={{
                backgroundColor: theme.bgCard,
                borderColor: theme.accentPrimary,
                color: theme.textPrimary,
              }}
            >
              <CheckCircle2 className="w-4 h-4" style={{ color: theme.accentPrimary }} />
              <span className="font-semibold">{notification.message}</span>
            </div>
          </div>
        )}

        {/* Main Header */}
        <Header
          onUploadFile={handleUploadFile}
          onExportCSV={() => exportUniversalCSV(filteredRecords, profile)}
          onResetData={handleResetData}
          isRealtimeActive={isRealtimeActive}
          onToggleRealtime={() => setIsRealtimeActive(!isRealtimeActive)}
          refreshInterval={refreshInterval}
          onChangeRefreshInterval={setRefreshInterval}
          lastSyncTime={lastSyncTime}
          updateCount={updateCount}
          onOpenConverterModal={() => setIsWorkbookModalOpen(true)}
          fileName={fileName}
          datasetName={datasetName}
          totalRecordsCount={records.length}
          activeView={activeView}
          onChangeView={setActiveView}
          columnCount={profile.columns.length}
          theme={theme}
          currentThemeId={currentThemeId}
          onOpenThemeModal={() => setIsThemeModalOpen(true)}
          onSelectTheme={setCurrentThemeId}
          onOpenShareModal={() => setIsShareModalOpen(true)}
          isSharedMode={isSharedMode}
        />

        {/* Sub-Header: Demo Dataset Quick Selectors + Live Feed & SQLite Status */}
        <div
          className="border-b py-2.5 px-4 sm:px-6 lg:px-8 shadow-2xs transition-colors"
          style={{
            backgroundColor: theme.bgCard,
            borderColor: theme.borderSubtle,
          }}
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between text-xs gap-2">
            {!isSharedMode ? (
              /* Standard Studio Sub-header */
              <>
                {/* Quick Dataset Switcher Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold mr-1 flex items-center" style={{ color: theme.textSecondary }}>
                    <Layers className="w-3.5 h-3.5 mr-1" style={{ color: theme.accentPrimary }} />
                    Demo Datasets:
                  </span>
                  {sampleDatasets.map((sample, idx) => {
                    const isActive = currentSampleIndex === idx;
                    return (
                      <button
                        key={sample.id}
                        onClick={() => handleSelectSample(idx)}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                          isActive ? 'text-white shadow-xs' : ''
                        }`}
                        style={{
                          background: isActive ? theme.accentGradient : theme.bgInput,
                          color: isActive ? '#FFFFFF' : theme.textSecondary,
                          borderColor: isActive ? 'transparent' : theme.borderSubtle,
                        }}
                        title={`Load ${sample.name} (${sample.records.length} rows)`}
                      >
                        {sample.name}
                      </button>
                    );
                  })}

                  {/* Active Custom Upload Indicator Badge */}
                  {currentSampleIndex === -1 && (
                    <span
                      className="px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center space-x-1.5 shadow-2xs"
                      style={{
                        backgroundColor: theme.bgBadge,
                        borderColor: '#10B981',
                        color: '#10B981',
                      }}
                      title={`Active uploaded custom dataset: ${fileName}`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>{fileName}</span>
                    </span>
                  )}
                </div>

                {/* Sync status, SQLite status & changelog button */}
                <div className="flex items-center space-x-2.5">
                  {/* Multi-Dashboard Generator trigger */}
                  <button
                    id="sub-header-multi-dashboard-btn"
                    onClick={() => setIsDataCheckModalOpen(true)}
                    className="inline-flex items-center space-x-1.5 text-xs font-bold px-3 py-1 rounded-full border transition cursor-pointer shadow-xs hover:opacity-90"
                    style={{
                      backgroundColor: theme.bgBadge,
                      borderColor: theme.borderSubtle,
                      color: theme.accentPrimary,
                    }}
                    title="Verify dataset health and generate multiple dashboards at once"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Multi-Dashboards ({dashboards.length})</span>
                  </button>

                  {/* Share button quick access */}
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="inline-flex items-center space-x-1.5 text-xs font-bold px-3 py-1 rounded-full border transition cursor-pointer shadow-xs"
                    style={{
                      backgroundColor: theme.bgInput,
                      borderColor: theme.borderSubtle,
                      color: theme.textSecondary,
                    }}
                    title="Generate shareable live dashboard link"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Link</span>
                  </button>

                  {/* SQLite DB pill badge */}
                  <button
                    onClick={() => setActiveView('sqlite')}
                    className="inline-flex items-center space-x-1 text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border transition cursor-pointer"
                    style={{
                      backgroundColor: theme.bgInput,
                      borderColor: theme.borderSubtle,
                      color: theme.textSecondary,
                    }}
                    title="Open in-memory SQLite console"
                  >
                    <Database className="w-3 h-3" style={{ color: theme.accentPrimary }} />
                    <span>SQLite: {sqliteState ? `${sqliteState.tableName} (${sqliteState.rowCount} rows)` : 'Ready'}</span>
                  </button>

                  {/* Real-time status */}
                  <span
                    className="inline-flex items-center text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border"
                    style={{
                      backgroundColor: theme.bgInput,
                      borderColor: theme.borderSubtle,
                      color: theme.textSecondary,
                    }}
                  >
                    {isRealtimeActive ? `Live (${refreshInterval}s pulse)` : 'Paused'}
                  </span>

                  {/* Changelog Drawer Trigger */}
                  <button
                    onClick={() => setIsLogDrawerOpen(true)}
                    className="flex items-center space-x-1 font-semibold hover:opacity-80 cursor-pointer"
                    style={{ color: theme.accentPrimary }}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Logs ({events.length})</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </>
            ) : (
              /* Executive Shared Presentation Mode Banner */
              <div className="w-full flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                    style={{
                      background: theme.accentGradient,
                      color: '#FFFFFF',
                    }}
                  >
                    Live Shared View
                  </span>
                  <span className="font-bold text-sm" style={{ color: theme.textPrimary }}>
                    {datasetName}
                  </span>
                  <span className="text-xs opacity-75 font-mono" style={{ color: theme.textSecondary }}>
                    ({filteredRecords.length.toLocaleString()} matching records &bull; {profile.columns.length} columns)
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Share button in shared mode */}
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="inline-flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer hover:opacity-80 shadow-2xs"
                    style={{
                      backgroundColor: theme.bgInput,
                      borderColor: theme.borderSubtle,
                      color: theme.accentPrimary,
                    }}
                    title="Share this configured view"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Link</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Workspace Body */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* If in Shared Mode, always render the focused Dashboard & Filters */}
          {isSharedMode ? (
            <div className="space-y-6">
              {/* Multi-Dashboard Navigation Bar */}
              <DashboardTabBar
                dashboards={dashboards}
                activeDashboardId={activeDashboardId}
                onSelectDashboard={handleSelectDashboard}
                onOpenCreateModal={handleOpenCreateDashboard}
                onOpenEditModal={handleOpenEditDashboard}
                onDuplicateDashboard={handleDuplicateDashboard}
                onDeleteDashboard={handleDeleteDashboard}
                onOpenDataCheckModal={() => setIsDataCheckModalOpen(true)}
                theme={theme}
                isSharedMode={isSharedMode}
              />

              {/* KPI Cards Grid */}
              <section aria-label="Executive Key Performance Indicators">
                <KPIGrid
                  profile={profile}
                  records={records}
                  filteredRecords={filteredRecords}
                  totalCount={records.length}
                  isRealtimeActive={isRealtimeActive}
                  theme={theme}
                  activeDashboard={activeDashboard}
                />
              </section>

              {/* Universal Filter Bar */}
              <section aria-label="Universal Dataset Filters">
                <FilterBar
                  profile={profile}
                  filters={filters}
                  onFilterChange={setFilters}
                  totalCount={records.length}
                  filteredCount={filteredRecords.length}
                  onApplyPreset={handleApplyPreset}
                  activePreset={activePreset}
                  theme={theme}
                />
              </section>

              {/* Dynamic Charts Section */}
              <section aria-label="Analytical Visualizations">
                <ChartsSection
                  profile={profile}
                  records={filteredRecords}
                  theme={theme}
                  activeDashboard={activeDashboard}
                />
              </section>
            </div>
          ) : (
            <>
              {/* VIEW 1: DATA SCHEMA & TYPE PROFILER */}
              {activeView === 'schema' && (
                <section aria-label="Dataset Schema Profiler">
                  <DataSchemaProfiler
                    profile={profile}
                    onUpdateProfile={handleUpdateProfile}
                    onLaunchDashboard={() => setActiveView('dashboard')}
                    onSwitchToDashboard={() => setActiveView('dashboard')}
                    onSelectSampleDataset={(id) => {
                      const idx = sampleDatasets.findIndex((s) => s.id === id);
                      if (idx !== -1) handleSelectSample(idx);
                    }}
                    activeSampleId={sampleDatasets[currentSampleIndex]?.id}
                    onUploadFileClick={() => document.getElementById('upload-file-btn')?.click()}
                    theme={theme}
                  />
                </section>
              )}

              {/* VIEW 2: VISUAL DASHBOARD */}
              {activeView === 'dashboard' && (
                <div className="space-y-6">
                  {/* Multi-Dashboard Navigation Bar */}
                  <DashboardTabBar
                    dashboards={dashboards}
                    activeDashboardId={activeDashboardId}
                    onSelectDashboard={handleSelectDashboard}
                    onOpenCreateModal={handleOpenCreateDashboard}
                    onOpenEditModal={handleOpenEditDashboard}
                    onDuplicateDashboard={handleDuplicateDashboard}
                    onDeleteDashboard={handleDeleteDashboard}
                    onOpenDataCheckModal={() => setIsDataCheckModalOpen(true)}
                    theme={theme}
                    isSharedMode={isSharedMode}
                  />

                  {/* KPI Cards Grid */}
                  <section aria-label="Executive Key Performance Indicators">
                    <KPIGrid
                      profile={profile}
                      records={records}
                      filteredRecords={filteredRecords}
                      totalCount={records.length}
                      isRealtimeActive={isRealtimeActive}
                      theme={theme}
                      activeDashboard={activeDashboard}
                    />
                  </section>

                  {/* Universal Filter Bar */}
                  <section aria-label="Universal Dataset Filters">
                    <FilterBar
                      profile={profile}
                      filters={filters}
                      onFilterChange={setFilters}
                      totalCount={records.length}
                      filteredCount={filteredRecords.length}
                      onApplyPreset={handleApplyPreset}
                      activePreset={activePreset}
                      theme={theme}
                    />
                  </section>

                  {/* Dynamic Charts Section */}
                  <section aria-label="Analytical Visualizations">
                    <ChartsSection
                      profile={profile}
                      records={filteredRecords}
                      theme={theme}
                      activeDashboard={activeDashboard}
                    />
                  </section>
                </div>
              )}

              {/* VIEW 3: DATA TABLE */}
              {activeView === 'table' && (
                <section aria-label="Master Records Table">
                  <DataTable
                    profile={profile}
                    records={filteredRecords}
                    onUpdateRecord={handleUpdateRecord}
                    onAddRecord={handleAddRecord}
                    onDeleteRecord={handleDeleteRecord}
                    recentlyUpdatedId={recentlyUpdatedId}
                    theme={theme}
                  />
                </section>
              )}

              {/* VIEW 4: SQLITE WORKBENCH & QUERY CONSOLE */}
              {activeView === 'sqlite' && (
                <section aria-label="SQLite Database & Query Console">
                  <SqliteWorkbench
                    sqliteState={sqliteState}
                    profile={profile}
                    records={records}
                    theme={theme}
                  />
                </section>
              )}
            </>
          )}
        </main>
      </div>

      {/* Upload Data Verification & Multi-Dashboard Batch Generator Modal */}
      <DataCheckModal
        isOpen={isDataCheckModalOpen}
        onClose={() => setIsDataCheckModalOpen(false)}
        profile={profile}
        records={records}
        fileName={fileName}
        onApplyDashboards={handleApplyDashboards}
        theme={theme}
      />

      {/* Custom Dashboard Config / Creator Modal */}
      <DashboardConfigModal
        isOpen={isDashboardConfigModalOpen}
        onClose={() => {
          setIsDashboardConfigModalOpen(false);
          setDashboardToEdit(null);
        }}
        dashboardToEdit={dashboardToEdit}
        profile={profile}
        onSaveDashboard={handleSaveDashboard}
        theme={theme}
      />

      {/* Share Live Dashboard Modal */}
      <ShareDashboardModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        datasetName={datasetName}
        fileName={fileName}
        records={records}
        profile={profile}
        sampleId={currentSampleIndex >= 0 ? sampleDatasets[currentSampleIndex]?.id : undefined}
        isCustomUpload={currentSampleIndex === -1}
        themeId={currentThemeId}
        theme={theme}
        filters={filters}
        activePreset={activePreset}
        isRealtimeActive={isRealtimeActive}
      />

      {/* Theme Showcase Modal */}
      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        currentThemeId={currentThemeId}
        onSelectTheme={(themeId) => {
          setCurrentThemeId(themeId);
          showNotification(`Switched theme to "${THEMES[themeId].name}"`);
        }}
      />

      {/* Multi-Tab Excel Workbook Generator Modal (Only in Studio Mode) */}
      {!isSharedMode && (
        <WorkbookModal
          isOpen={isWorkbookModalOpen}
          onClose={() => setIsWorkbookModalOpen(false)}
          records={filteredRecords}
          profile={profile}
        />
      )}

      {/* Real-time Activity Changelog Drawer (Only in Studio Mode) */}
      {!isSharedMode && (
        <ActivityLogDrawer
          isOpen={isLogDrawerOpen}
          onClose={() => setIsLogDrawerOpen(false)}
          events={events}
          onClearLogs={() => setEvents([])}
        />
      )}

      {/* Footer */}
      <footer
        className="mt-12 border-t py-6 text-center text-xs transition-colors"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.borderSubtle,
          color: theme.textSecondary,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div
              className="p-1.5 rounded-xl border"
              style={{
                backgroundColor: theme.bgBadge,
                color: theme.accentPrimary,
                borderColor: theme.borderSubtle,
              }}
            >
              {isSharedMode ? <BarChart3 className="w-3.5 h-3.5" /> : <Database className="w-3.5 h-3.5" />}
            </div>
            <span className="font-bold" style={{ color: theme.textPrimary }}>
              {isSharedMode ? `${datasetName} • Live Interactive Analytics Dashboard` : 'SQLite Engine • Multi-Theme Universal Dashboard Showcase'}
            </span>
          </div>
          <p style={{ color: theme.textMuted }}>
            {isSharedMode ? 'Dynamic KPI Aggregations • Universal Interactive Filters • High-Resolution Visualizations' : 'WASM SQLite SQL Console • 6 Curated Visual Themes • Real-time Excel Synchronization • Universal File Ingestion'}
          </p>
        </div>
      </footer>
    </div>
  );
}
