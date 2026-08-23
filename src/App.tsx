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
import { DatasetSwitcherBar } from './components/DatasetSwitcherBar';
import { DatasetsManagerModal } from './components/DatasetsManagerModal';
import { 
  DatasetProfile, 
  GenericRecord, 
  UniversalFilterState, 
  UpdateEvent,
  DashboardConfig,
  ManagedDataset,
} from './types';
import { 
  profileDataset, 
  parseUploadedFile, 
  parseUniversalFile,
  formatMetricValue 
} from './utils/universalParser';
import { getDefaultDashboards } from './utils/dashboardGenerator';
import { sampleDatasets, SAMPLE_DATASETS, getSampleDataset } from './data/sampleDatasets';
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
  extractDataPayload,
  saveAllManagedDatasets,
  loadAllManagedDatasets,
  decodeMultiDatasetBundle,
  encodeDatasetWithDashboards,
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
  FolderKanban,
} from 'lucide-react';

/**
 * Initializes the list of managed datasets from URL payload, registry, or built-in samples
 */
function resolveInitialWorkspace(): {
  datasets: ManagedDataset[];
  activeDatasetId: string;
  isShared: boolean;
} {
  const defaultSample = sampleDatasets[0];
  const defaultProfile = profileDataset(defaultSample.records, defaultSample.name);
  const defaultDashboards = getDefaultDashboards(defaultProfile, defaultSample.records);

  const fallbackManaged: ManagedDataset = {
    id: `ds_sample_${defaultSample.id}`,
    name: defaultSample.name,
    fileName: defaultSample.fileName,
    category: defaultSample.category,
    records: defaultSample.records,
    profile: defaultProfile,
    dashboards: defaultDashboards,
    activeDashboardId: defaultDashboards[0]?.id || `dash_${Date.now()}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sampleId: defaultSample.id,
  };

  if (typeof window === 'undefined') {
    return {
      datasets: [fallbackManaged],
      activeDatasetId: fallbackManaged.id,
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
    hash.includes('bundle=') ||
    hash.includes('data=') ||
    fullHref.includes('data=') ||
    !!urlParams.get('sid');

  // 1. Check for Multi-dataset bundle in hash or query
  const rawBundle = extractDataPayload(hash) || extractDataPayload(urlParams.get('bundle') || '');
  if (rawBundle && (hash.includes('bundle=') || urlParams.get('bundle') || urlParams.get('scope') === 'bundle')) {
    const decodedBundle = decodeMultiDatasetBundle(rawBundle);
    if (decodedBundle && decodedBundle.datasets && decodedBundle.datasets.length > 0) {
      saveAllManagedDatasets(decodedBundle.datasets, decodedBundle.activeDatasetId);
      return {
        datasets: decodedBundle.datasets,
        activeDatasetId: decodedBundle.activeDatasetId,
        isShared: true,
      };
    }
  }

  // 2. Check for Single Dataset in hash/query data
  const rawPayload = extractDataPayload(hash) || extractDataPayload(urlParams.get('data') || '') || extractDataPayload(urlParams.get('payload') || '') || extractDataPayload(fullHref);
  if (rawPayload) {
    const decodedBundle = decodeMultiDatasetBundle(rawPayload);
    if (decodedBundle && decodedBundle.datasets && decodedBundle.datasets.length > 0) {
      saveAllManagedDatasets(decodedBundle.datasets, decodedBundle.activeDatasetId);
      return {
        datasets: decodedBundle.datasets,
        activeDatasetId: decodedBundle.activeDatasetId,
        isShared: true,
      };
    }

    const decoded = decodeDatasetFromCompressedString(rawPayload);
    if (decoded && decoded.records && decoded.records.length > 0) {
      const singleDashboards = getDefaultDashboards(decoded.profile, decoded.records);
      const singleManaged: ManagedDataset = {
        id: `ds_shared_${Date.now()}`,
        name: decoded.datasetName,
        fileName: decoded.fileName,
        records: decoded.records,
        profile: decoded.profile,
        dashboards: singleDashboards,
        activeDashboardId: singleDashboards[0]?.id || `dash_${Date.now()}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isCustomUpload: true,
      };
      saveAllManagedDatasets([singleManaged], singleManaged.id);
      return {
        datasets: [singleManaged],
        activeDatasetId: singleManaged.id,
        isShared: true,
      };
    }
  }

  // 3. Check for Shared Dataset ID (?sid=...)
  const sidParam = urlParams.get('sid');
  if (sidParam) {
    const sharedData = loadSharedDataset(sidParam);
    if (sharedData && sharedData.records && sharedData.records.length > 0) {
      const singleDashboards = getDefaultDashboards(sharedData.profile, sharedData.records);
      const singleManaged: ManagedDataset = {
        id: `ds_sid_${sidParam}`,
        name: sharedData.datasetName,
        fileName: sharedData.fileName,
        records: sharedData.records,
        profile: sharedData.profile,
        dashboards: singleDashboards,
        activeDashboardId: singleDashboards[0]?.id || `dash_${Date.now()}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isCustomUpload: true,
        shareId: sidParam,
      };
      saveAllManagedDatasets([singleManaged], singleManaged.id);
      return {
        datasets: [singleManaged],
        activeDatasetId: singleManaged.id,
        isShared: true,
      };
    }
  }

  // 4. Check for saved workspace in localStorage
  const savedWorkspace = loadAllManagedDatasets();
  if (savedWorkspace && savedWorkspace.datasets && savedWorkspace.datasets.length > 0 && !urlParams.get('sample')) {
    return {
      datasets: savedWorkspace.datasets,
      activeDatasetId: savedWorkspace.activeDatasetId,
      isShared: isShared,
    };
  }

  // 5. Check for explicit ?sample=... param
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
      const sProfile = profileDataset(sample.records, sample.name);
      const sDashboards = getDefaultDashboards(sProfile, sample.records);
      const sManaged: ManagedDataset = {
        id: `ds_sample_${sample.id}`,
        name: sample.name,
        fileName: sample.fileName,
        category: sample.category,
        records: sample.records,
        profile: sProfile,
        dashboards: sDashboards,
        activeDashboardId: sDashboards[0]?.id || `dash_${Date.now()}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        sampleId: sample.id,
      };
      return {
        datasets: [sManaged],
        activeDatasetId: sManaged.id,
        isShared: false,
      };
    }
  }

  // 6. Default: Pre-populate with initial curated datasets (E-Commerce + SaaS + Logistics)
  const initialDatasets: ManagedDataset[] = sampleDatasets.slice(0, 3).map((sample) => {
    const sProf = profileDataset(sample.records, sample.name);
    const sDash = getDefaultDashboards(sProf, sample.records);
    return {
      id: `ds_sample_${sample.id}`,
      name: sample.name,
      fileName: sample.fileName,
      category: sample.category,
      records: sample.records,
      profile: sProf,
      dashboards: sDash,
      activeDashboardId: sDash[0]?.id || `dash_${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sampleId: sample.id,
    };
  });

  return {
    datasets: initialDatasets,
    activeDatasetId: initialDatasets[0].id,
    isShared: false,
  };
}

export default function App() {
  const initialResolved = useMemo(() => resolveInitialWorkspace(), []);

  // 0. URL parameters detection for Shared Dashboard View
  const [isSharedMode, setIsSharedMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('shared') === 'true' || params.get('mode') === 'dashboard' || initialResolved.isShared;
  });
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [targetShareDatasetId, setTargetShareDatasetId] = useState<string | undefined>(undefined);

  // Multi-Dataset Workspace State
  const [datasets, setDatasets] = useState<ManagedDataset[]>(initialResolved.datasets);
  const [activeDatasetId, setActiveDatasetId] = useState<string>(initialResolved.activeDatasetId);
  const [isDatasetsManagerOpen, setIsDatasetsManagerOpen] = useState<boolean>(false);

  // Active dataset reference
  const currentDataset = useMemo(() => {
    return datasets.find((d) => d.id === activeDatasetId) || datasets[0];
  }, [datasets, activeDatasetId]);

  // Derived current dataset active states
  const records = currentDataset.records;
  const profile = currentDataset.profile;
  const datasetName = currentDataset.name;
  const fileName = currentDataset.fileName;
  const dashboards = currentDataset.dashboards || [];
  const activeDashboardId = currentDataset.activeDashboardId || dashboards[0]?.id || '';

  const activeDashboard = useMemo(() => {
    return dashboards.find((d) => d.id === activeDashboardId) || dashboards[0];
  }, [dashboards, activeDashboardId]);

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
      // Ignore
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
      // Ignore
    }

    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.get('theme') !== currentThemeId) {
        currentUrl.searchParams.set('theme', currentThemeId);
        window.history.replaceState({}, '', currentUrl.toString());
      }
    }
  }, [currentThemeId]);

  // Save workspace changes to local/session registry
  useEffect(() => {
    if (datasets.length > 0) {
      saveAllManagedDatasets(datasets, activeDatasetId);
    }
  }, [datasets, activeDatasetId]);

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

  // Modal configs
  const [isDataCheckModalOpen, setIsDataCheckModalOpen] = useState<boolean>(false);
  const [isDashboardConfigModalOpen, setIsDashboardConfigModalOpen] = useState<boolean>(false);
  const [dashboardToEdit, setDashboardToEdit] = useState<DashboardConfig | null>(null);

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

  // Dataset switching handler
  const handleSelectDataset = (datasetId: string) => {
    const target = datasets.find((d) => d.id === datasetId);
    if (!target) return;

    setActiveDatasetId(datasetId);
    setFilters({ searchQuery: '', categoricalFilters: {}, numericRanges: {} });
    setActivePreset('All Records');
    setLastSyncTime(new Date());
    setUpdateCount(0);
    showNotification(`Switched active dataset to "${target.name}" (${target.records.length} records).`);
  };

  // Switch to a preloaded sample dataset
  const handleSelectSample = (index: number) => {
    const sample = sampleDatasets[index];
    if (!sample) return;

    const sProf = profileDataset(sample.records, sample.name);
    const sDash = getDefaultDashboards(sProf, sample.records);
    const sampleDatasetId = `ds_sample_${sample.id}`;

    setDatasets((prev) => {
      const existsIndex = prev.findIndex((d) => d.id === sampleDatasetId || d.sampleId === sample.id);
      if (existsIndex !== -1) {
        return prev;
      }
      const newDataset: ManagedDataset = {
        id: sampleDatasetId,
        name: sample.name,
        fileName: sample.fileName,
        category: sample.category,
        records: sample.records,
        profile: sProf,
        dashboards: sDash,
        activeDashboardId: sDash[0]?.id || `dash_${Date.now()}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        sampleId: sample.id,
      };
      return [newDataset, ...prev];
    });

    setActiveDatasetId(sampleDatasetId);
    setFilters({ searchQuery: '', categoricalFilters: {}, numericRanges: {} });
    setActivePreset('All Records');
    showNotification(`Loaded "${sample.name}" dataset with ${sDash.length} dashboards.`);
  };

  // Handle uploaded single custom file
  const handleUploadFile = async (file: File) => {
    try {
      const { records: parsedRecords, profile: parsedProfile, filename } = await parseUploadedFile(file);
      const generatedDashboards = getDefaultDashboards(parsedProfile, parsedRecords);
      const cleanName = filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

      const newDataset: ManagedDataset = {
        id: `ds_upload_${Date.now()}`,
        name: cleanName,
        fileName: filename,
        category: 'Uploaded Data',
        records: parsedRecords,
        profile: parsedProfile,
        dashboards: generatedDashboards,
        activeDashboardId: generatedDashboards[0]?.id || `dash_${Date.now()}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isCustomUpload: true,
      };

      setDatasets((prev) => [newDataset, ...prev]);
      setActiveDatasetId(newDataset.id);
      setFilters({ searchQuery: '', categoricalFilters: {}, numericRanges: {} });
      setActivePreset('All Records');
      setLastSyncTime(new Date());
      setUpdateCount(0);

      // Log event
      const newEvent: UpdateEvent = {
        id: `EVT-${Date.now()}`,
        timestamp: new Date(),
        type: 'file_upload',
        recordId: 'FILE_UPLOAD',
        description: `Imported "${filename}" (${parsedRecords.length} rows, ${parsedProfile.columns.length} columns). Created ${generatedDashboards.length} dashboards.`,
      };
      setEvents((prev) => [newEvent, ...prev]);

      setActiveView('dashboard');
      setIsDataCheckModalOpen(true);
      showNotification(`File analyzed: ${parsedProfile.columns.length} columns & ${generatedDashboards.length} dashboards ready!`);
    } catch (err: any) {
      alert(`Error reading file: ${err.message || err}`);
    }
  };

  // Batch upload multiple files simultaneously
  const handleBatchUploadFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const newDatasets: ManagedDataset[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const { records: parsedRecords, profile: parsedProfile } = await parseUniversalFile(file);
        const generatedDashboards = getDefaultDashboards(parsedProfile, parsedRecords);
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

        const managed: ManagedDataset = {
          id: `ds_batch_${Date.now()}_${i}`,
          name: cleanName,
          fileName: file.name,
          category: 'Batch Upload',
          records: parsedRecords,
          profile: parsedProfile,
          dashboards: generatedDashboards,
          activeDashboardId: generatedDashboards[0]?.id || `dash_${Date.now()}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isCustomUpload: true,
        };
        newDatasets.push(managed);
      } catch (err) {
        console.error(`Error parsing ${file.name}:`, err);
      }
    }

    if (newDatasets.length > 0) {
      setDatasets((prev) => [...newDatasets, ...prev]);
      setActiveDatasetId(newDatasets[0].id);
      showNotification(`Successfully created ${newDatasets.length} datasets and all their dashboards!`);
    }
  };

  // Add multiple datasets (from Manager Modal)
  const handleAddMultipleDatasets = (newDatasets: ManagedDataset[]) => {
    if (newDatasets.length > 0) {
      setDatasets((prev) => [...newDatasets, ...prev]);
      setActiveDatasetId(newDatasets[0].id);
      showNotification(`Added ${newDatasets.length} dataset(s) to workspace.`);
    }
  };

  // Add single dataset (from Sample Catalog in Manager Modal)
  const handleAddDataset = (newDataset: ManagedDataset) => {
    setDatasets((prev) => [newDataset, ...prev]);
    setActiveDatasetId(newDataset.id);
    showNotification(`Dataset "${newDataset.name}" added to workspace.`);
  };

  // Update existing dataset details
  const handleUpdateDataset = (updated: ManagedDataset) => {
    setDatasets((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    showNotification(`Dataset "${updated.name}" updated.`);
  };

  // Duplicate dataset
  const handleDuplicateDataset = (ds: ManagedDataset) => {
    const copyId = `ds_copy_${Date.now()}`;
    const duplicated: ManagedDataset = {
      ...ds,
      id: copyId,
      name: `${ds.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setDatasets((prev) => [duplicated, ...prev]);
    setActiveDatasetId(copyId);
    showNotification(`Duplicated "${ds.name}" and all its dashboards.`);
  };

  // Delete dataset
  const handleDeleteDataset = (datasetId: string) => {
    if (datasets.length <= 1) {
      showNotification('Cannot delete the only dataset in the workspace.');
      return;
    }
    const remaining = datasets.filter((d) => d.id !== datasetId);
    setDatasets(remaining);
    if (activeDatasetId === datasetId) {
      setActiveDatasetId(remaining[0].id);
    }
    showNotification('Dataset removed from workspace.');
  };

  // Trigger separate share modal for a specific dataset
  const handleOpenShareModalForDataset = (ds: ManagedDataset) => {
    setTargetShareDatasetId(ds.id);
    setIsShareModalOpen(true);
  };

  // Dashboard Management for the active dataset
  const handleSelectDashboard = (id: string) => {
    setDatasets((prev) =>
      prev.map((d) => (d.id === activeDatasetId ? { ...d, activeDashboardId: id } : d))
    );
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
    setDatasets((prev) =>
      prev.map((d) => {
        if (d.id !== activeDatasetId) return d;
        const currentDashboards = d.dashboards || [];
        const existsIndex = currentDashboards.findIndex((dash) => dash.id === savedDash.id);
        let nextDashboards = [...currentDashboards];
        if (existsIndex !== -1) {
          nextDashboards[existsIndex] = savedDash;
        } else {
          nextDashboards = [...nextDashboards, savedDash];
        }
        return {
          ...d,
          dashboards: nextDashboards,
          activeDashboardId: savedDash.id,
          updatedAt: Date.now(),
        };
      })
    );
    showNotification(`Dashboard "${savedDash.title}" saved.`);
  };

  const handleDuplicateDashboard = (dash: DashboardConfig) => {
    const duplicated: DashboardConfig = {
      ...dash,
      id: `dash_copy_${Date.now()}`,
      title: `${dash.title} (Copy)`,
      createdAt: Date.now(),
    };
    setDatasets((prev) =>
      prev.map((d) => {
        if (d.id !== activeDatasetId) return d;
        return {
          ...d,
          dashboards: [...(d.dashboards || []), duplicated],
          activeDashboardId: duplicated.id,
          updatedAt: Date.now(),
        };
      })
    );
    showNotification(`Duplicated dashboard to "${duplicated.title}".`);
  };

  const handleDeleteDashboard = (id: string) => {
    if (dashboards.length <= 1) {
      showNotification('Cannot delete the only remaining dashboard.');
      return;
    }
    setDatasets((prev) =>
      prev.map((d) => {
        if (d.id !== activeDatasetId) return d;
        const remaining = (d.dashboards || []).filter((dash) => dash.id !== id);
        return {
          ...d,
          dashboards: remaining,
          activeDashboardId: d.activeDashboardId === id ? remaining[0]?.id || '' : d.activeDashboardId,
          updatedAt: Date.now(),
        };
      })
    );
    showNotification('Dashboard tab removed.');
  };

  const handleApplyDashboards = (chosenDashboards: DashboardConfig[], activeId?: string) => {
    if (chosenDashboards && chosenDashboards.length > 0) {
      setDatasets((prev) =>
        prev.map((d) => {
          if (d.id !== activeDatasetId) return d;
          return {
            ...d,
            dashboards: chosenDashboards,
            activeDashboardId: activeId || chosenDashboards[0].id,
            updatedAt: Date.now(),
          };
        })
      );
      showNotification(`Activated ${chosenDashboards.length} dashboards.`);
    }
  };

  // Update profile configuration
  const handleUpdateProfile = (updatedProfile: DatasetProfile) => {
    setDatasets((prev) =>
      prev.map((d) => (d.id === activeDatasetId ? { ...d, profile: updatedProfile, updatedAt: Date.now() } : d))
    );
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

  // Real-time Mutation Engine (adapts to active dataset)
  useEffect(() => {
    if (!isRealtimeActive || records.length === 0) return;

    const intervalId = setInterval(() => {
      setDatasets((prevDatasets) => {
        return prevDatasets.map((ds) => {
          if (ds.id !== activeDatasetId) return ds;
          if (ds.records.length === 0) return ds;

          const numCols = ds.profile.columns.filter((c) => c.type === 'numeric');
          if (numCols.length === 0) return ds;

          const randomIndex = Math.floor(Math.random() * ds.records.length);
          const target = ds.records[randomIndex];
          const randomCol = numCols[Math.floor(Math.random() * numCols.length)];

          const currentVal = Number(target[randomCol.key]) || 0;
          const deltaPercent = (Math.random() * 0.16 - 0.06);
          let newVal = Math.max(0, currentVal * (1 + deltaPercent));
          if (currentVal > 100) {
            newVal = Math.round(newVal);
          } else {
            newVal = Number(newVal.toFixed(2));
          }

          const idColKey = ds.profile.idKey;
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
            description: `[${ds.name}] Live cloud update on ${randomCol.name}: ${formatMetricValue(currentVal, randomCol.isCurrency)} → ${formatMetricValue(newVal, randomCol.isCurrency)}`,
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

          const newRecords = [...ds.records];
          newRecords[randomIndex] = updatedRecord;

          return {
            ...ds,
            records: newRecords,
            updatedAt: Date.now(),
          };
        });
      });
    }, refreshInterval * 1000);

    return () => clearInterval(intervalId);
  }, [isRealtimeActive, refreshInterval, activeDatasetId, records.length, profile]);

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

    setDatasets((prev) =>
      prev.map((d) => {
        if (d.id !== activeDatasetId) return d;
        const nextRecords = d.records.map((r) =>
          String(r[idKey] || r.id || r._id) === targetId ? updated : r
        );
        return { ...d, records: nextRecords, updatedAt: Date.now() };
      })
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
  }, [profile.idKey, activeDatasetId]);

  const handleAddRecord = useCallback((newRec: GenericRecord) => {
    const idKey = profile.idKey;
    const recId = String(newRec[idKey] || `REC-${Date.now().toString().slice(-4)}`);
    const complete = { ...newRec, [idKey]: recId };

    setDatasets((prev) =>
      prev.map((d) => {
        if (d.id !== activeDatasetId) return d;
        return { ...d, records: [complete, ...d.records], updatedAt: Date.now() };
      })
    );
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
  }, [profile.idKey, activeDatasetId]);

  const handleDeleteRecord = useCallback((recordId: string) => {
    const idKey = profile.idKey;
    setDatasets((prev) =>
      prev.map((d) => {
        if (d.id !== activeDatasetId) return d;
        const nextRecords = d.records.filter((r) => String(r[idKey] || r.id || r._id) !== recordId);
        return { ...d, records: nextRecords, updatedAt: Date.now() };
      })
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
  }, [profile.idKey, activeDatasetId]);

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
          onOpenShareModal={() => {
            setTargetShareDatasetId(activeDatasetId);
            setIsShareModalOpen(true);
          }}
          isSharedMode={isSharedMode}
        />

        {/* Sub-Header: Multi-Dataset Quick Hub & SQLite Status */}
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
                    <FolderKanban className="w-3.5 h-3.5 mr-1" style={{ color: theme.accentPrimary }} />
                    Workspace Datasets ({datasets.length}):
                  </span>
                  {datasets.map((ds) => {
                    const isActive = ds.id === activeDatasetId;
                    return (
                      <button
                        key={ds.id}
                        id={`header-ds-btn-${ds.id}`}
                        onClick={() => handleSelectDataset(ds.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                          isActive ? 'text-white shadow-xs' : ''
                        }`}
                        style={{
                          background: isActive ? theme.accentGradient : theme.bgInput,
                          color: isActive ? '#FFFFFF' : theme.textSecondary,
                          borderColor: isActive ? 'transparent' : theme.borderSubtle,
                        }}
                        title={`Switch to ${ds.name} (${ds.records.length} rows, ${ds.dashboards?.length || 1} dashboards)`}
                      >
                        {ds.name}
                      </button>
                    );
                  })}

                  {/* Add Dataset Button */}
                  <button
                    onClick={() => setIsDatasetsManagerOpen(true)}
                    className="px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center space-x-1 transition cursor-pointer hover:opacity-85"
                    style={{
                      backgroundColor: theme.bgInput,
                      borderColor: theme.borderSubtle,
                      color: theme.accentPrimary,
                    }}
                    title="Open Datasets Manager to add more datasets or upload batch files"
                  >
                    <span>+ Manage / Add</span>
                  </button>
                </div>

                {/* Sync status, SQLite status & actions */}
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
                    onClick={() => {
                      setTargetShareDatasetId(activeDatasetId);
                      setIsShareModalOpen(true);
                    }}
                    className="inline-flex items-center space-x-1.5 text-xs font-bold px-3 py-1 rounded-full border transition cursor-pointer shadow-xs"
                    style={{
                      backgroundColor: theme.bgInput,
                      borderColor: theme.borderSubtle,
                      color: theme.textSecondary,
                    }}
                    title="Generate shareable live dashboard link"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Separate Link</span>
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
                  <button
                    onClick={() => {
                      setTargetShareDatasetId(activeDatasetId);
                      setIsShareModalOpen(true);
                    }}
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
          {/* Dataset Switcher Bar (Always accessible for fast multi-dataset jumping and management) */}
          <DatasetSwitcherBar
            datasets={datasets}
            activeDatasetId={activeDatasetId}
            onSelectDataset={handleSelectDataset}
            onOpenDatasetsManager={() => setIsDatasetsManagerOpen(true)}
            onBatchUploadFiles={handleBatchUploadFiles}
            onShareDataset={handleOpenShareModalForDataset}
            onDuplicateDataset={handleDuplicateDataset}
            onDeleteDataset={handleDeleteDataset}
            theme={theme}
            isSharedMode={isSharedMode}
          />

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
                    activeSampleId={currentDataset.sampleId}
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

      {/* Datasets & Dashboards Manager Hub Modal */}
      <DatasetsManagerModal
        isOpen={isDatasetsManagerOpen}
        onClose={() => setIsDatasetsManagerOpen(false)}
        datasets={datasets}
        activeDatasetId={activeDatasetId}
        onSelectDataset={handleSelectDataset}
        onAddDataset={handleAddDataset}
        onAddMultipleDatasets={handleAddMultipleDatasets}
        onUpdateDataset={handleUpdateDataset}
        onDuplicateDataset={handleDuplicateDataset}
        onDeleteDataset={handleDeleteDataset}
        onOpenShareModalForDataset={handleOpenShareModalForDataset}
        theme={theme}
      />

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
        onClose={() => {
          setIsShareModalOpen(false);
          setTargetShareDatasetId(undefined);
        }}
        datasetName={datasetName}
        fileName={fileName}
        records={records}
        profile={profile}
        sampleId={currentDataset.sampleId}
        isCustomUpload={currentDataset.isCustomUpload}
        themeId={currentThemeId}
        theme={theme}
        filters={filters}
        activePreset={activePreset}
        isRealtimeActive={isRealtimeActive}
        datasets={datasets}
        activeDatasetId={activeDatasetId}
        initialTargetDatasetId={targetShareDatasetId}
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
              {isSharedMode ? `${datasetName} • Live Interactive Analytics Dashboard` : 'SQLite Engine • Multi-Dataset & Multi-Dashboard Showcase'}
            </span>
          </div>
          <p style={{ color: theme.textMuted }}>
            {isSharedMode ? 'Dynamic KPI Aggregations • Universal Interactive Filters • High-Resolution Visualizations' : 'Multiple Dataset Dashboards • WASM SQLite Engine • 6 Curated Themes • Separate Share Links • Batch File Uploads'}
          </p>
        </div>
      </footer>
    </div>
  );
}

