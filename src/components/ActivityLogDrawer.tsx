import React from 'react';
import { 
  Activity, 
  Clock, 
  ChevronRight, 
  X,
  RotateCw,
  PlusCircle,
  Edit,
  Trash
} from 'lucide-react';
import { UpdateEvent } from '../types';

interface ActivityLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  events: UpdateEvent[];
  onClearLogs: () => void;
}

export const ActivityLogDrawer: React.FC<ActivityLogDrawerProps> = ({
  isOpen,
  onClose,
  events,
  onClearLogs,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-end z-50 animate-fadeIn">
      <div className="bg-[#FFFFFF] border-l border-[#E2DFD7] w-full max-w-md h-full shadow-2xl flex flex-col justify-between">
        {/* Header */}
        <div className="p-4.5 border-b border-[#EAE7DF] bg-[#FCFCFA] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#EAF0E6] text-[#4B5E40] border border-[#CDD9C7]">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1C201D]">
                Real-Time Excel Sync Changelog
              </h3>
              <p className="text-xs text-[#687067]">
                Live cloud audit trail & mutation feed ({events.length} events)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={onClearLogs}
              className="text-xs text-[#828880] hover:text-[#222623] px-2 py-1 rounded hover:bg-[#F3F1EC] transition cursor-pointer"
            >
              Clear
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#828880] hover:text-[#222623] hover:bg-[#F3F1EC] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Event List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-[#F0ECE3]">
          {events.length === 0 ? (
            <div className="text-center py-16 text-[#828880] text-xs">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#4B5E40]" />
              <p>No mutation events logged yet.</p>
              <p className="text-[11px] text-[#A0A69D] mt-1">
                Real-time updates will automatically appear here as they sync.
              </p>
            </div>
          ) : (
            events.map((evt) => {
              const Icon =
                evt.type === 'add'
                  ? PlusCircle
                  : evt.type === 'delete'
                  ? Trash
                  : evt.type === 'auto_sync'
                  ? RotateCw
                  : Edit;

              const badgeColor =
                evt.type === 'auto_sync'
                  ? 'bg-[#EAF0E6] text-[#4B5E40] border-[#CDD9C7]'
                  : evt.type === 'add'
                  ? 'bg-[#E7EDF2] text-[#4D6275] border-[#C5D3DF]'
                  : evt.type === 'delete'
                  ? 'bg-[#F7EBEB] text-[#A25B5B] border-[#E8C4C4]'
                  : 'bg-[#F5EDE2] text-[#967B48] border-[#E2D4BF]';

              return (
                <div key={evt.id} className="pt-2.5 first:pt-0">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2.5">
                      <div className={`p-1.5 rounded-lg border mt-0.5 ${badgeColor}`}>
                        <Icon className="w-3 h-3" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-xs text-[#1C201D]">
                            {evt.recordId}
                          </span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-[#F3F1EC] text-[#687067] border border-[#DDD9CE]">
                            {evt.type.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-[#4A5048] mt-0.5 leading-snug">
                          {evt.description}
                        </p>
                        {evt.details && (
                          <div className="mt-1 text-[11px] font-mono bg-[#F7F6F2] p-1.5 rounded border border-[#EAE7DF] text-[#5C635B]">
                            {evt.details.field}:{' '}
                            <span className="line-through text-[#A25B5B]">
                              {evt.details.oldValue}
                            </span>{' '}
                            &rarr;{' '}
                            <span className="text-[#4B5E40] font-bold">
                              {evt.details.newValue}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-[#828880] font-mono whitespace-nowrap ml-2">
                      {evt.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#EAE7DF] bg-[#FCFCFA] text-center text-xs text-[#687067]">
          Live stream engine continuously validates cell formulas and aggregate KPIs.
        </div>
      </div>
    </div>
  );
};
