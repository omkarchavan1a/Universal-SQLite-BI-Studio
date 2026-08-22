import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  X, 
  CheckSquare, 
  Square,
  FileCheck
} from 'lucide-react';
import { DatasetProfile, GenericRecord } from '../types';
import { generateUniversalExcel, exportUniversalCSV } from '../utils/universalExcelEngine';

interface WorkbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: GenericRecord[];
  profile: DatasetProfile;
}

export const WorkbookModal: React.FC<WorkbookModalProps> = ({
  isOpen,
  onClose,
  records,
  profile,
}) => {
  const [filename, setFilename] = useState(`${profile.name.replace(/\s+/g, '_')}_Analytics.xlsx`);
  const [includeMasterSheet, setIncludeMasterSheet] = useState(true);
  const [includeSummarySheet, setIncludeSummarySheet] = useState(true);
  const [includeSchemaSheet, setIncludeSchemaSheet] = useState(true);

  if (!isOpen) return null;

  const handleExport = () => {
    generateUniversalExcel(records, profile, filename);
    onClose();
  };

  const handleCsvExport = () => {
    exportUniversalCSV(records, profile, filename.replace('.xlsx', '.csv'));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-[#FFFFFF] border border-[#E2DFD7] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#EAE7DF] bg-[#FCFCFA] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-[#EAF0E6] text-[#4B5E40] border border-[#CDD9C7]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1C201D]">
                Multi-Tab Excel Workbook Generator
              </h3>
              <p className="text-xs text-[#687067]">
                Generate formatted multi-sheet .xlsx workbook for this dataset
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#828880] hover:text-[#222623] hover:bg-[#F3F1EC] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs text-[#2D312E]">
          {/* File Name input */}
          <div>
            <label className="block font-semibold text-[#2D312E] mb-1.5">Workbook Filename</label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full bg-[#F7F6F2] border border-[#DDD9CE] rounded-lg px-3 py-2 text-sm text-[#2D312E] focus:outline-none focus:ring-1 focus:ring-[#4B5E40]"
            />
          </div>

          {/* Included Sheets Checklist */}
          <div>
            <label className="block font-semibold text-[#2D312E] mb-2">
              Multi-Tab Sheets Included:
            </label>
            <div className="space-y-2 bg-[#F7F6F2] p-3 rounded-xl border border-[#DDD9CE]">
              <div 
                onClick={() => setIncludeMasterSheet(!includeMasterSheet)}
                className="flex items-center justify-between p-2 rounded-lg bg-[#FFFFFF] border border-[#E2DFD7] cursor-pointer hover:border-[#CDC8BC]"
              >
                <div className="flex items-center space-x-2.5">
                  {includeMasterSheet ? (
                    <CheckSquare className="w-4 h-4 text-[#4B5E40]" />
                  ) : (
                    <Square className="w-4 h-4 text-[#828880]" />
                  )}
                  <div>
                    <span className="font-semibold text-[#1C201D]">1. Master_Data</span>
                    <p className="text-[11px] text-[#687067]">Full itemized records ({records.length} rows &bull; {profile.columns.length} columns)</p>
                  </div>
                </div>
                <span className="text-[10px] bg-[#EAF0E6] text-[#3D4C34] px-2 py-0.5 rounded font-mono font-medium">Sheet 1</span>
              </div>

              <div 
                onClick={() => setIncludeSummarySheet(!includeSummarySheet)}
                className="flex items-center justify-between p-2 rounded-lg bg-[#FFFFFF] border border-[#E2DFD7] cursor-pointer hover:border-[#CDC8BC]"
              >
                <div className="flex items-center space-x-2.5">
                  {includeSummarySheet ? (
                    <CheckSquare className="w-4 h-4 text-[#4B5E40]" />
                  ) : (
                    <Square className="w-4 h-4 text-[#828880]" />
                  )}
                  <div>
                    <span className="font-semibold text-[#1C201D]">2. Dimension_Summary</span>
                    <p className="text-[11px] text-[#687067]">Aggregated metrics grouped by {profile.primaryDimensionKey || 'Category'}</p>
                  </div>
                </div>
                <span className="text-[10px] bg-[#EAF0E6] text-[#3D4C34] px-2 py-0.5 rounded font-mono font-medium">Sheet 2</span>
              </div>

              <div 
                onClick={() => setIncludeSchemaSheet(!includeSchemaSheet)}
                className="flex items-center justify-between p-2 rounded-lg bg-[#FFFFFF] border border-[#E2DFD7] cursor-pointer hover:border-[#CDC8BC]"
              >
                <div className="flex items-center space-x-2.5">
                  {includeSchemaSheet ? (
                    <CheckSquare className="w-4 h-4 text-[#4B5E40]" />
                  ) : (
                    <Square className="w-4 h-4 text-[#828880]" />
                  )}
                  <div>
                    <span className="font-semibold text-[#1C201D]">3. Data_Schema_Dictionary</span>
                    <p className="text-[11px] text-[#687067]">Column types, statistical distributions, uniqueness, and completeness</p>
                  </div>
                </div>
                <span className="text-[10px] bg-[#EAF0E6] text-[#3D4C34] px-2 py-0.5 rounded font-mono font-medium">Sheet 3</span>
              </div>
            </div>
          </div>

          {/* Scope Indicator */}
          <div className="p-3 bg-[#FCFCFA] border border-[#E2DFD7] rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileCheck className="w-4 h-4 text-[#4B5E40]" />
              <span className="font-medium text-[#2D312E]">Scope: Current Active Records</span>
            </div>
            <span className="font-mono font-bold text-[#4B5E40]">{records.length.toLocaleString()} records</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#EAE7DF] bg-[#FCFCFA] flex items-center justify-between">
          <button
            onClick={handleCsvExport}
            className="px-3 py-2 rounded-lg border border-[#DDD9CE] bg-[#FFFFFF] text-[#2D312E] hover:bg-[#F3F1EC] font-semibold text-xs transition cursor-pointer"
          >
            Export as CSV
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg text-[#687067] hover:text-[#222623] hover:bg-[#F3F1EC] text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="confirm-generate-excel-btn"
              onClick={handleExport}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#4B5E40] hover:bg-[#3D4C34] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
