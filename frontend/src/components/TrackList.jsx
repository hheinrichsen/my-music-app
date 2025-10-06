import { Trash2 } from 'lucide-react';

/**
 * TrackList renders a scrollable list of tracks.  The currently playing track
 * is highlighted.  Clicking on a track selects it for playback, and clicking
 * the trash icon removes it from the library.
 */
export default function TrackList({ tracks, currentIndex, onSelect, onRemove }) {
  return (
    <div className="overflow-y-auto space-y-1">
      {tracks.map((t, idx) => (
        <div
          key={t.id}
          onClick={() => onSelect(idx)}
          className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
            idx === currentIndex
              ? 'bg-indigo-600 text-white'
              : 'bg-zinc-800 hover:bg-zinc-700'
          }`}
        >
          <span className="flex-1 truncate mr-2">{t.title}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(idx);
            }}
            className="text-zinc-400 hover:text-red-400"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}