import LZString from 'lz-string';
import { DatasetProfile, GenericRecord } from '../types';
import { profileDataset, castValue } from './universalParser';

export interface SerializedDataset {
  id?: string;
  name: string;
  fileName: string;
  records: GenericRecord[];
  profile: DatasetProfile;
  timestamp?: number;
}

interface CompactDatasetRepresentation {
  n: string; // name
  f: string; // fileName
  c: string[]; // column keys
  r: any[][]; // row arrays
  p?: {
    dim?: string;
    dim2?: string;
    met?: string;
    met2?: string;
    date?: string;
    id?: string;
  };
}

const ACTIVE_CUSTOM_DATASET_KEY = 'universal_studio_active_custom_dataset';
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

