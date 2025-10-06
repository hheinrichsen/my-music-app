import { useEffect, useRef } from 'react';

/**
 * Audio player component.
 *
 * This component encapsulates the underlying <audio> element so that the parent
 * can control playback via props.  When the `track` or `isPlaying` props change
 * the audio source is updated and played/paused accordingly.  The `volume` prop
 * adjusts the volume, and the `onEnded` callback fires when a track finishes.
 */
export default function Player({ track, isPlaying, volume = 0.8, onEnded, audioRef }) {
  // When no ref is supplied, use an internal ref
  const internalRef = useRef(null);
  const ref = audioRef || internalRef;

  // Update volume whenever the volume prop changes
  useEffect(() => {
    const audio = ref.current;
    if (audio) {
      audio.volume = volume;
    }
  }, [volume, ref]);

  // Update source when track changes
  useEffect(() => {
    const audio = ref.current;
    if (audio && track) {
      audio.src = track.url;
      if (isPlaying) {
        audio
          .play()
          .catch(() => {
            /* ignore play errors */
          });
      }
    }
  }, [track, isPlaying, ref]);

  // Play/pause when isPlaying changes
  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying, ref]);

  return (
    <audio
      ref={ref}
      onEnded={onEnded}
      // Preload metadata so we can compute durations
      preload="metadata"
    />
  );
}
