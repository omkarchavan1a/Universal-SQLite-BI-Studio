import LZString from 'lz-string';
import { DatasetProfile, GenericRecord, ManagedDataset, DashboardConfig } from '../types';
import { profileDataset, castValue } from './universalParser';

export interface SerializedDataset {
  id?: string;
  name: string;
  fileName: string;
  records: GenericRecord[];
  profile: DatasetProfile;
  dashboards?: DashboardConfig[];
  activeDashboardId?: string;
  timestamp?: number;
}

interface CompactDatasetRepresentation {
  id?: string;
  n: string; // name
  f: string; // fileName
  c: string[]; // column keys
  r: any[][]; // row arrays
  d?: DashboardConfig[]; // dashboards
  ad?: string; // active dashboard id
  p?: {
    dim?: string;
    dim2?: string;
    met?: string;
    met2?: string;
    date?: string;
    id?: string;
  };
}

interface CompactBundleRepresentation {
  v: number;
  aid: string;
  ds: CompactDatasetRepresentation[];
}

const ACTIVE_CUSTOM_DATASET_KEY = 'universal_studio_active_custom_dataset';
const MANAGED_DATASETS_REGISTRY_KEY = 'universal_studio_managed_datasets_registry';
const SHARED_DATASET_PREFIX = 'universal_studio_shared_ds_';

/**
 * Extracts clean compressed payload from hash, query string, or full URL
 */
export function extractDataPayload(input: string): string {
  if (!input || typeof input !== 'string') return '';
  const str = input.trim();

  // Check for data= in hash or search
  const regexMatch = str.match(/[#?&]data=([^&#]+)/i);
  if (regexMatch && regexMatch[1]) {
    return regexMatch[1];
  }

  if (str.startsWith('#data=')) {
    return str.substring('#data='.length).split('&')[0];
  }
  if (str.startsWith('data=')) {
    return str.substring('data='.length).split('&')[0];
  }

  // If the string starts with # without data=
  if (str.startsWith('#') && !str.includes('=')) {
    return str.substring(1);
  }

  return str;
}

/**
 * Compacts and encodes a dataset into an LZ-compressed URL-safe string
 */
export function encodeDatasetToCompressedString(
  records: GenericRecord[],
  profile: DatasetProfile,
  name: string,
  fileName: string
): string {
  if (!records || records.length === 0) return '';

  try {
    // Extract ordered list of column keys
    const columnKeys = profile.columns && profile.columns.length > 0
      ? profile.columns.map((c) => c.key)
      : Object.keys(records[0] || {}).filter((k) => !k.startsWith('_'));

    // Convert array of objects to compact 2D array
    const rows: any[][] = records.map((rec) => {
      return columnKeys.map((k) => {
        const val = rec[k];
        return val !== undefined ? val : null;
      });
    });

    const compact: CompactDatasetRepresentation = {
      n: name || 'Custom Dataset',
      f: fileName || 'dataset.csv',
      c: columnKeys,
      r: rows,
      p: {
        dim: profile.primaryDimensionKey,
        dim2: profile.secondaryDimensionKey,
        met: profile.primaryMetricKey,
        met2: profile.secondaryMetricKey,
        date: profile.dateKey,
        id: profile.idKey,
      },
    };

    const jsonString = JSON.stringify(compact);
    return LZString.compressToEncodedURIComponent(jsonString);
  } catch (err) {
    console.error('Failed to encode dataset to compressed string:', err);
    return '';
  }
}

/**
 * Decompresses and reconstructs a dataset from a compressed URL-safe string
 */
export function decodeDatasetFromCompressedString(
  compressedStr: string
): { records: GenericRecord[]; profile: DatasetProfile; datasetName: string; fileName: string } | null {
  if (!compressedStr || typeof compressedStr !== 'string') return null;

  try {
    let raw = extractDataPayload(compressedStr).trim();
    if (!raw) return null;

    let jsonString: string | null = null;

    // Strategy 1: Direct decompressFromEncodedURIComponent
    jsonString = LZString.decompressFromEncodedURIComponent(raw);

    // Strategy 2: If query params parsed '+' as space
    if (!jsonString && raw.includes(' ')) {
      jsonString = LZString.decompressFromEncodedURIComponent(raw.replace(/ /g, '+'));
    }

    // Strategy 3: Try decoding URI component first
    if (!jsonString) {
      try {
        const uriDecoded = decodeURIComponent(raw);
        jsonString = LZString.decompressFromEncodedURIComponent(uriDecoded);
        if (!jsonString && uriDecoded.includes(' ')) {
          jsonString = LZString.decompressFromEncodedURIComponent(uriDecoded.replace(/ /g, '+'));
        }
      } catch {
        // ignore URI decode errors
      }
    }

    // Strategy 4: Fallback to Base64 or standard decompression
    if (!jsonString) {
      jsonString = LZString.decompressFromBase64(raw) || LZString.decompress(raw);
    }

    // Strategy 5: Check if the string was already raw JSON
    if (!jsonString && raw.startsWith('{') && raw.endsWith('}')) {
      jsonString = raw;
    }

    if (!jsonString) return null;

    const compact: CompactDatasetRepresentation = JSON.parse(jsonString);
    if (!compact || !compact.c || !compact.r || !Array.isArray(compact.r)) {
      return null;
    }

    const columnKeys = compact.c;
    const records: GenericRecord[] = compact.r.map((rowArray, rowIndex) => {
      const record: GenericRecord = {};
      columnKeys.forEach((key, colIndex) => {
        record[key] = rowArray[colIndex] !== undefined ? rowArray[colIndex] : null;
      });

      // Ensure id exists
      if (!record.id && !record._id && !record.ID) {
        record._id = `ROW-${String(rowIndex + 1).padStart(4, '0')}`;
      }
      return record;
    });

    const datasetName = compact.n || 'Custom Dataset';
    const fileName = compact.f || 'dataset.csv';
    const baseProfile = profileDataset(records, datasetName);

    // Apply profile dimension/metric overrides if present
    if (compact.p) {
      if (compact.p.dim && baseProfile.columns.some((c) => c.key === compact.p?.dim)) {
        baseProfile.primaryDimensionKey = compact.p.dim;
      }
      if (compact.p.dim2 && baseProfile.columns.some((c) => c.key === compact.p?.dim2)) {
        baseProfile.secondaryDimensionKey = compact.p.dim2;
      }
      if (compact.p.met && baseProfile.columns.some((c) => c.key === compact.p?.met)) {
        baseProfile.primaryMetricKey = compact.p.met;
      }
      if (compact.p.met2 && baseProfile.columns.some((c) => c.key === compact.p?.met2)) {
        baseProfile.secondaryMetricKey = compact.p.met2;
      }
      if (compact.p.date && baseProfile.columns.some((c) => c.key === compact.p?.date)) {
        baseProfile.dateKey = compact.p.date;
      }
      if (compact.p.id && baseProfile.columns.some((c) => c.key === compact.p?.id)) {
        baseProfile.idKey = compact.p.id;
      }
    }

    // Cast values according to detected schema
    const typedRecords = records.map((r) => {
      const out: GenericRecord = { ...r };
      baseProfile.columns.forEach((col) => {
        out[col.key] = castValue(r[col.key], col.type);
      });
      return out;
    });

    return {
      records: typedRecords,
      profile: baseProfile,
      datasetName,
      fileName,
    };
  } catch (err) {
    console.error('Failed to decode dataset from compressed string:', err);
    return null;
  }
}

/**
 * Saves the active custom uploaded dataset into localStorage & sessionStorage
 */
export function saveActiveCustomDataset(
  records: GenericRecord[],
  profile: DatasetProfile,
  datasetName: string,
  fileName: string
): void {
  if (typeof window === 'undefined') return;

  try {
    const payload = {
      name: datasetName,
      fileName,
      records,
      profile,
      timestamp: Date.now(),
    };
    const serialized = JSON.stringify(payload);
    try {
      localStorage.setItem(ACTIVE_CUSTOM_DATASET_KEY, serialized);
    } catch {
      // quota or sandbox
    }
    try {
      sessionStorage.setItem(ACTIVE_CUSTOM_DATASET_KEY, serialized);
    } catch {
      // ignore
    }
  } catch (err) {
    console.warn('Could not save custom dataset:', err);
  }
}

/**
 * Saves a shared dataset by share ID (sid) into multi-tier storage
 */
export function saveSharedDataset(
  sid: string,
  records: GenericRecord[],
  profile: DatasetProfile,
  datasetName: string,
  fileName: string
): void {
  if (typeof window === 'undefined' || !sid) return;

  try {
    const payload = {
      id: sid,
      name: datasetName,
      fileName,
      records,
      profile,
      timestamp: Date.now(),
    };
    const serialized = JSON.stringify(payload);
    try {
      localStorage.setItem(SHARED_DATASET_PREFIX + sid, serialized);
    } catch {
      // ignore
    }
    try {
      sessionStorage.setItem(SHARED_DATASET_PREFIX + sid, serialized);
    } catch {
      // ignore
    }
    // Also save as active custom dataset
    saveActiveCustomDataset(records, profile, datasetName, fileName);
  } catch (err) {
    console.warn('Could not save shared dataset:', err);
  }
}

/**
 * Loads a shared dataset by share ID (sid)
 */
export function loadSharedDataset(
  sid: string
): { records: GenericRecord[]; profile: DatasetProfile; datasetName: string; fileName: string } | null {
  if (typeof window === 'undefined' || !sid) return null;

  try {
    let saved = null;
    try {
      saved = sessionStorage.getItem(SHARED_DATASET_PREFIX + sid) || localStorage.getItem(SHARED_DATASET_PREFIX + sid);
    } catch {
      // ignore
    }

    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.records) && parsed.records.length > 0 && parsed.profile) {
        return {
          records: parsed.records,
          profile: parsed.profile,
          datasetName: parsed.name || 'Custom Dataset',
          fileName: parsed.fileName || 'uploaded_data.csv',
        };
      }
    }
  } catch (err) {
    console.warn('Failed to parse shared dataset by sid:', err);
  }
  return null;
}

/**
 * Loads the active custom uploaded dataset from localStorage or sessionStorage
 */
export function loadActiveCustomDataset(): {
  records: GenericRecord[];
  profile: DatasetProfile;
  datasetName: string;
  fileName: string;
} | null {
  if (typeof window === 'undefined') return null;

  try {
    let saved = null;
    try {
      saved = localStorage.getItem(ACTIVE_CUSTOM_DATASET_KEY) || sessionStorage.getItem(ACTIVE_CUSTOM_DATASET_KEY);
    } catch {
      // ignore
    }

    if (!saved) return null;

    const parsed = JSON.parse(saved);
    if (parsed && Array.isArray(parsed.records) && parsed.records.length > 0 && parsed.profile) {
      return {
        records: parsed.records,
        profile: parsed.profile,
        datasetName: parsed.name || 'Custom Dataset',
        fileName: parsed.fileName || 'uploaded_data.csv',
      };
    }
  } catch (err) {
    console.warn('Failed to parse active custom dataset from storage:', err);
  }
  return null;
}

/**
 * Clears the active custom dataset from storage (when switching back to demo datasets)
 */
export function clearActiveCustomDataset(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ACTIVE_CUSTOM_DATASET_KEY);
    sessionStorage.removeItem(ACTIVE_CUSTOM_DATASET_KEY);
  } catch (err) {
    // Ignore
  }
}

/**
 * Saves all managed datasets and active dataset ID into persistent multi-tier storage
 */
export function saveAllManagedDatasets(datasets: ManagedDataset[], activeDatasetId: string): void {
  if (typeof window === 'undefined' || !Array.isArray(datasets) || datasets.length === 0) return;

  try {
    const payload = {
      version: '2.0',
      activeDatasetId: activeDatasetId || datasets[0]?.id,
      datasets: datasets.map((d) => ({
        id: d.id,
        name: d.name,
        fileName: d.fileName,
        category: d.category,
        icon: d.icon,
        records: d.records,
        profile: d.profile,
        dashboards: d.dashboards,
        activeDashboardId: d.activeDashboardId,
        filters: d.filters,
        activePreset: d.activePreset,
        createdAt: d.createdAt || Date.now(),
        updatedAt: Date.now(),
        isCustomUpload: d.isCustomUpload,
        sampleId: d.sampleId,
        shareId: d.shareId,
      })),
      timestamp: Date.now(),
    };

    const serialized = JSON.stringify(payload);
    try {
      localStorage.setItem(MANAGED_DATASETS_REGISTRY_KEY, serialized);
    } catch {
      // quota or private mode
    }
    try {
      sessionStorage.setItem(MANAGED_DATASETS_REGISTRY_KEY, serialized);
    } catch {
      // ignore
    }

    // Also update active dataset fallback for backwards compatibility
    const active = datasets.find((d) => d.id === activeDatasetId) || datasets[0];
    if (active && active.records && active.profile) {
      saveActiveCustomDataset(active.records, active.profile, active.name, active.fileName);
    }
  } catch (err) {
    console.warn('Failed to save managed datasets registry:', err);
  }
}

/**
 * Loads all managed datasets from persistent storage
 */
export function loadAllManagedDatasets(): { datasets: ManagedDataset[]; activeDatasetId: string } | null {
  if (typeof window === 'undefined') return null;

  try {
    let saved = null;
    try {
      saved = localStorage.getItem(MANAGED_DATASETS_REGISTRY_KEY) || sessionStorage.getItem(MANAGED_DATASETS_REGISTRY_KEY);
    } catch {
      // ignore
    }

    if (!saved) return null;

    const parsed = JSON.parse(saved);
    if (parsed && Array.isArray(parsed.datasets) && parsed.datasets.length > 0) {
      const datasets: ManagedDataset[] = parsed.datasets
        .filter((d: any) => d && Array.isArray(d.records) && d.records.length > 0 && d.profile)
        .map((d: any, idx: number) => ({
          id: d.id || `ds_${Date.now()}_${idx}`,
          name: d.name || `Dataset ${idx + 1}`,
          fileName: d.fileName || 'data.csv',
          category: d.category || 'General',
          icon: d.icon || 'Database',
          records: d.records,
          profile: d.profile,
          dashboards: Array.isArray(d.dashboards) ? d.dashboards : [],
          activeDashboardId: d.activeDashboardId || d.dashboards?.[0]?.id || '',
          filters: d.filters,
          activePreset: d.activePreset || 'All Records',
          createdAt: d.createdAt || Date.now(),
          updatedAt: d.updatedAt || Date.now(),
          isCustomUpload: !!d.isCustomUpload,
          sampleId: d.sampleId,
          shareId: d.shareId,
        }));

      if (datasets.length > 0) {
        const activeId = parsed.activeDatasetId && datasets.some((d) => d.id === parsed.activeDatasetId)
          ? parsed.activeDatasetId
          : datasets[0].id;
        return { datasets, activeDatasetId: activeId };
      }
    }
  } catch (err) {
    console.warn('Failed to load managed datasets from registry:', err);
  }
  return null;
}

/**
 * Compacts and encodes a single dataset along with its custom dashboards
 */
export function encodeDatasetWithDashboards(
  dataset: ManagedDataset
): string {
  if (!dataset || !dataset.records || dataset.records.length === 0) return '';

  try {
    const columnKeys = dataset.profile.columns && dataset.profile.columns.length > 0
      ? dataset.profile.columns.map((c) => c.key)
      : Object.keys(dataset.records[0] || {}).filter((k) => !k.startsWith('_'));

    const rows: any[][] = dataset.records.map((rec) => {
      return columnKeys.map((k) => {
        const val = rec[k];
        return val !== undefined ? val : null;
      });
    });

    const compact: CompactDatasetRepresentation = {
      id: dataset.id,
      n: dataset.name || 'Custom Dataset',
      f: dataset.fileName || 'dataset.csv',
      c: columnKeys,
      r: rows,
      d: dataset.dashboards,
      ad: dataset.activeDashboardId,
      p: {
        dim: dataset.profile.primaryDimensionKey,
        dim2: dataset.profile.secondaryDimensionKey,
        met: dataset.profile.primaryMetricKey,
        met2: dataset.profile.secondaryMetricKey,
        date: dataset.profile.dateKey,
        id: dataset.profile.idKey,
      },
    };

    const jsonString = JSON.stringify(compact);
    return LZString.compressToEncodedURIComponent(jsonString);
  } catch (err) {
    console.error('Failed to encode dataset with dashboards:', err);
    return '';
  }
}

/**
 * Encodes an entire multi-dataset workspace bundle into a compressed string
 */
export function encodeMultiDatasetBundle(
  datasets: ManagedDataset[],
  activeDatasetId: string
): string {
  if (!datasets || datasets.length === 0) return '';

  try {
    const compactList: CompactDatasetRepresentation[] = datasets.map((ds) => {
      const columnKeys = ds.profile.columns && ds.profile.columns.length > 0
        ? ds.profile.columns.map((c) => c.key)
        : Object.keys(ds.records[0] || {}).filter((k) => !k.startsWith('_'));

      const rows: any[][] = ds.records.map((rec) => {
        return columnKeys.map((k) => {
          const val = rec[k];
          return val !== undefined ? val : null;
        });
      });

      return {
        id: ds.id,
        n: ds.name,
        f: ds.fileName,
        c: columnKeys,
        r: rows,
        d: ds.dashboards,
        ad: ds.activeDashboardId,
        p: {
          dim: ds.profile.primaryDimensionKey,
          dim2: ds.profile.secondaryDimensionKey,
          met: ds.profile.primaryMetricKey,
          met2: ds.profile.secondaryMetricKey,
          date: ds.profile.dateKey,
          id: ds.profile.idKey,
        },
      };
    });

    const bundle: CompactBundleRepresentation = {
      v: 2,
      aid: activeDatasetId || datasets[0]?.id,
      ds: compactList,
    };

    return LZString.compressToEncodedURIComponent(JSON.stringify(bundle));
  } catch (err) {
    console.error('Failed to encode multi dataset bundle:', err);
    return '';
  }
}

/**
 * Decodes a multi-dataset bundle from a compressed string
 */
export function decodeMultiDatasetBundle(
  compressedStr: string
): { datasets: ManagedDataset[]; activeDatasetId: string } | null {
  if (!compressedStr || typeof compressedStr !== 'string') return null;

  try {
    const raw = extractDataPayload(compressedStr).trim();
    if (!raw) return null;

    let jsonString = LZString.decompressFromEncodedURIComponent(raw);
    if (!jsonString && raw.includes(' ')) {
      jsonString = LZString.decompressFromEncodedURIComponent(raw.replace(/ /g, '+'));
    }
    if (!jsonString) {
      jsonString = LZString.decompressFromBase64(raw) || LZString.decompress(raw);
    }
    if (!jsonString && raw.startsWith('{') && raw.endsWith('}')) {
      jsonString = raw;
    }

    if (!jsonString) return null;

    const parsed = JSON.parse(jsonString);

    // Check if it is a multi-dataset bundle
    if (parsed && parsed.v && Array.isArray(parsed.ds) && parsed.ds.length > 0) {
      const datasets: ManagedDataset[] = parsed.ds.map((compact: CompactDatasetRepresentation, idx: number) => {
        const columnKeys = compact.c;
        const records: GenericRecord[] = compact.r.map((rowArray, rowIndex) => {
          const record: GenericRecord = {};
          columnKeys.forEach((key, colIndex) => {
            record[key] = rowArray[colIndex] !== undefined ? rowArray[colIndex] : null;
          });
          if (!record.id && !record._id && !record.ID) {
            record._id = `ROW-${String(rowIndex + 1).padStart(4, '0')}`;
          }
          return record;
        });

        const datasetName = compact.n || `Dataset ${idx + 1}`;
        const fileName = compact.f || 'data.csv';
        const baseProfile = profileDataset(records, datasetName);

        if (compact.p) {
          if (compact.p.dim && baseProfile.columns.some((c) => c.key === compact.p?.dim)) baseProfile.primaryDimensionKey = compact.p.dim;
          if (compact.p.dim2 && baseProfile.columns.some((c) => c.key === compact.p?.dim2)) baseProfile.secondaryDimensionKey = compact.p.dim2;
          if (compact.p.met && baseProfile.columns.some((c) => c.key === compact.p?.met)) baseProfile.primaryMetricKey = compact.p.met;
          if (compact.p.met2 && baseProfile.columns.some((c) => c.key === compact.p?.met2)) baseProfile.secondaryMetricKey = compact.p.met2;
          if (compact.p.date && baseProfile.columns.some((c) => c.key === compact.p?.date)) baseProfile.dateKey = compact.p.date;
          if (compact.p.id && baseProfile.columns.some((c) => c.key === compact.p?.id)) baseProfile.idKey = compact.p.id;
        }

        const typedRecords = records.map((r) => {
          const out: GenericRecord = { ...r };
          baseProfile.columns.forEach((col) => {
            out[col.key] = castValue(r[col.key], col.type);
          });
          return out;
        });

        return {
          id: compact.id || `ds_${Date.now()}_${idx}`,
          name: datasetName,
          fileName,
          records: typedRecords,
          profile: baseProfile,
          dashboards: compact.d || [],
          activeDashboardId: compact.ad || compact.d?.[0]?.id || '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      });

      if (datasets.length > 0) {
        return {
          datasets,
          activeDatasetId: parsed.aid || datasets[0].id,
        };
      }
    }

    // Otherwise check if single dataset with dashboards
    if (parsed && parsed.c && parsed.r && Array.isArray(parsed.r)) {
      const singleDecoded = decodeDatasetFromCompressedString(compressedStr);
      if (singleDecoded) {
        const dataset: ManagedDataset = {
          id: parsed.id || `ds_single_${Date.now()}`,
          name: singleDecoded.datasetName,
          fileName: singleDecoded.fileName,
          records: singleDecoded.records,
          profile: singleDecoded.profile,
          dashboards: parsed.d || [],
          activeDashboardId: parsed.ad || parsed.d?.[0]?.id || '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        return {
          datasets: [dataset],
          activeDatasetId: dataset.id,
        };
      }
    }
  } catch (err) {
    console.error('Failed to decode multi dataset bundle:', err);
  }
  return null;
}


