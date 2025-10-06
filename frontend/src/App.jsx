import { useState, useEffect, useRef } from 'react';
import Player from './components/Player.jsx';
import TrackList from './components/TrackList.jsx';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Upload as UploadIcon,
} from 'lucide-react';

// Base URL for the back‑end API.  Leave blank ("") to use client‑only mode.
const API_BASE = "";

/**
 * Main application component.
 *
 * Manages the state of the music library, current track, playback controls,
 * shuffle and repeat modes, and interaction with the optional server.  The UI
 * is organised into an upload area, track list and control bar.
 */
export default function App() {
  // State for the loaded tracks
  const [tracks, setTracks] = useState([]);
  // Index of the currently playing track in `tracks`
  const [currentIndex, setCurrentIndex] = useState(null);
  // Whether audio is currently playing
  const [isPlaying, setIsPlaying] = useState(false);
  // Shuffle on/off
  const [shuffle, setShuffle] = useState(false);
  // Repeat mode: 'off', 'one', or 'all'
  const [repeatMode, setRepeatMode] = useState('off');
  // Volume between 0 and 1
  const [volume, setVolume] = useState(0.8);
  // Current time and duration for progress bar
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Audio element reference passed to the Player component
  const audioRef = useRef(null);

  /**
   * Load the initial library from the server (if API is configured)
   */
  useEffect(() => {
    if (!API_BASE) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/tracks`);
        const data = await res.json();
        setTracks(data);
        if (data.length > 0) {
          setCurrentIndex(0);
        }
      } catch (err) {
        console.error('Failed to load tracks', err);
      }
    })();
  }, []);

  /**
   * Attach event listeners for progress updates
   */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const update = () => {
      setCurrentTime(audio.currentTime);
      setDuration(isNaN(audio.duration) ? 0 : audio.duration);
    };
    audio.addEventListener('timeupdate', update);
    audio.addEventListener('loadedmetadata', update);
    return () => {
      audio.removeEventListener('timeupdate', update);
      audio.removeEventListener('loadedmetadata', update);
    };
  }, []);

  /**
   * Helper to format seconds as MM:SS
   */
  const formatTime = (sec) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, '0');
    return `${m}:${s}`;
  };

  /**
   * Handle file uploads from the input element.  Files are either kept locally
   * (client‑only mode) or sent to the back‑end (server mode).  After uploading
   * the library is updated and playback will start if nothing is playing.
   */
  const handleUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    if (!API_BASE) {
      // Client‑only mode: create object URLs
      const newTracks = files.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: file.name.replace(/\.[^.]+$/, ''),
        url: URL.createObjectURL(file),
      }));
      setTracks((prev) => [...prev, ...newTracks]);
      if (currentIndex === null) {
        setCurrentIndex(0);
      }
    } else {
      // Server mode: send multipart/form-data
      const form = new FormData();
      files.forEach((file) => form.append('file', file));
      try {
        const res = await fetch(`${API_BASE}/api/upload`, {
          method: 'POST',
          body: form,
        });
        const added = await res.json();
        setTracks((prev) => [...prev, ...added]);
        if (currentIndex === null && added.length > 0) {
          setCurrentIndex(0);
        }
      } catch (err) {
        console.error('Upload failed', err);
      }
    }
    // reset the input so the same file can be selected again later
    event.target.value = '';
  };

  /**
   * Remove a track from the library.  In server mode this will also delete the
   * file on disk via a DELETE request.
   */
  const handleRemove = async (index) => {
    const track = tracks[index];
    if (!track) return;
    if (!API_BASE) {
      setTracks((prev) => prev.filter((_, i) => i !== index));
      // Adjust current index if necessary
      if (currentIndex !== null) {
        if (index < currentIndex) setCurrentIndex((i) => i - 1);
        else if (index === currentIndex) {
          // stop playback if the current track is removed
          setIsPlaying(false);
          setCurrentIndex(null);
        }
      }
    } else {
      try {
        await fetch(`${API_BASE}/api/tracks/${track.id}`, {
          method: 'DELETE',
        });
        setTracks((prev) => prev.filter((_, i) => i !== index));
        if (index < currentIndex) setCurrentIndex((i) => i - 1);
        else if (index === currentIndex) {
          setIsPlaying(false);
          setCurrentIndex(null);
        }
      } catch (err) {
        console.error('Failed to delete track', err);
      }
    }
  };

  /**
   * Select a track for playback.  Sets the current index and starts playing.
   */
  const handleSelect = (index) => {
    if (index < 0 || index >= tracks.length) return;
    setCurrentIndex(index);
    setIsPlaying(true);
  };

  /**
   * Toggle play/pause
   */
  const handlePlayPause = () => {
    if (currentIndex === null) {
      // nothing selected: start with first track if available
      if (tracks.length > 0) {
        setCurrentIndex(0);
        setIsPlaying(true);
      }
    } else {
      setIsPlaying((p) => !p);
    }
  };

  /**
   * Move to the next track, respecting shuffle and repeat modes
   */
  const handleNext = () => {
    if (tracks.length === 0) return;
    if (shuffle) {
      let next = Math.floor(Math.random() * tracks.length);
      if (tracks.length > 1 && next === currentIndex) {
        next = (next + 1) % tracks.length;
      }
      setCurrentIndex(next);
      setIsPlaying(true);
      return;
    }
    if (currentIndex === null) return;
    let nextIndex = currentIndex + 1;
    if (nextIndex >= tracks.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        setIsPlaying(false);
        return;
      }
    }
    setCurrentIndex(nextIndex);
    setIsPlaying(true);
  };

  /**
   * Move to the previous track.  If the current time is greater than 5s, restart
   * the current track instead.
   */
  const handlePrev = () => {
    if (tracks.length === 0) return;
    const audio = audioRef.current;
    if (audio && audio.currentTime > 5) {
      audio.currentTime = 0;
      return;
    }
    if (shuffle) {
      let prev = Math.floor(Math.random() * tracks.length);
      if (tracks.length > 1 && prev === currentIndex) {
        prev = (prev + tracks.length - 1) % tracks.length;
      }
      setCurrentIndex(prev);
      setIsPlaying(true);
      return;
    }
    if (currentIndex === null) return;
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      if (repeatMode === 'all') {
        prevIndex = tracks.length - 1;
      } else {
        setIsPlaying(false);
        return;
      }
    }
    setCurrentIndex(prevIndex);
    setIsPlaying(true);
  };

  /**
   * Handle track end.  Respect repeat modes and shuffle.
   */
  const handleEnded = () => {
    if (repeatMode === 'one') {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
      return;
    }
    handleNext();
  };

  /**
   * Seek to a fractional position within the current track
   */
  const handleSeek = (fraction) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = fraction * duration;
  };

  /**
   * Cycle between repeat modes: off → all → one → off
   */
  const toggleRepeatMode = () => {
    setRepeatMode((mode) => {
      if (mode === 'off') return 'all';
      if (mode === 'all') return 'one';
      return 'off';
    });
  };

  /**
   * Toggle shuffle on/off
   */
  const toggleShuffle = () => setShuffle((s) => !s);

  /**
   * Render the UI
   */
  return (
    <div className="min-h-screen flex flex-col p-4 gap-4" data-testid="app">
      {/* Upload area */}
      <div className="flex items-center space-x-4">
        <label
          htmlFor="upload"
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-500 transition-colors"
        >
          <UploadIcon className="mr-2" /> Upload
        </label>
        <input
          id="upload"
          type="file"
          accept="audio/*"
          multiple
          onChange={handleUpload}
          className="hidden"
        />
        {API_BASE && (
          <span className="text-sm text-zinc-400">Connected to server</span>
        )}
      </div>

      {/* Main content: playlist and player */}
      <div className="flex flex-1 overflow-hidden gap-4">
        {/* Playlist */}
        <div className="w-1/3 min-w-[200px] bg-zinc-900 border border-zinc-700 rounded-xl p-3 overflow-hidden flex flex-col">
          <h2 className="text-lg font-semibold mb-2">Library</h2>
          <TrackList
            tracks={tracks}
            currentIndex={currentIndex}
            onSelect={handleSelect}
            onRemove={handleRemove}
          />
        </div>
        {/* Player & controls */}
        <div className="flex-1 flex flex-col justify-between bg-zinc-900 border border-zinc-700 rounded-xl p-4">
          {/* Current track title */}
          <div className="flex-1 flex items-center justify-center text-center text-xl font-medium">
            {currentIndex !== null ? tracks[currentIndex]?.title : 'No track selected'}
          </div>
          {/* Progress bar */}
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-xs w-10 text-right">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={duration ? currentTime / duration : 0}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="flex-1"
            />
            <span className="text-xs w-10">{formatTime(duration)}</span>
          </div>
          {/* Controls */}
          <div className="flex items-center justify-between">
            {/* Left controls: shuffle and repeat */}
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleShuffle}
                className={`p-2 rounded-full transition-colors ${shuffle ? 'text-indigo-500' : 'text-zinc-300 hover:text-indigo-400'}`}
                title="Shuffle"
              >
                <Shuffle />
              </button>
              <button
                onClick={toggleRepeatMode}
                className={`p-2 rounded-full transition-colors ${repeatMode !== 'off' ? 'text-indigo-500' : 'text-zinc-300 hover:text-indigo-400'}`}
                title={`Repeat mode: ${repeatMode}`}
              >
                <Repeat />
              </button>
            </div>
            {/* Playback controls */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handlePrev}
                className="p-2 text-zinc-300 hover:text-indigo-400"
                title="Previous"
              >
                <SkipBack />
              </button>
              <button
                onClick={handlePlayPause}
                className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 w-10 h-10 flex items-center justify-center"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause /> : <Play />}
              </button>
              <button
                onClick={handleNext}
                className="p-2 text-zinc-300 hover:text-indigo-400"
                title="Next"
              >
                <SkipForward />
              </button>
            </div>
            {/* Volume control */}
            <div className="flex items-center space-x-2 w-32">
              <button
                onClick={() => setVolume((v) => (v > 0 ? 0 : 0.8))}
                className="p-1 text-zinc-300 hover:text-indigo-400"
                title={volume > 0 ? 'Mute' : 'Unmute'}
              >
                {volume > 0 ? <Volume2 /> : <VolumeX />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Hidden audio element */}
      <Player
        track={currentIndex !== null ? tracks[currentIndex] : null}
        isPlaying={isPlaying}
        volume={volume}
        onEnded={handleEnded}
        audioRef={audioRef}
      />
    </div>
  );
}
