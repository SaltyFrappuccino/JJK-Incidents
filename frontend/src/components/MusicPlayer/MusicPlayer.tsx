import React, { useState, useRef, useEffect } from 'react';
import { useMusic } from '../../contexts/MusicContext';
import { Playlist } from './Playlist';

export function MusicPlayer() {
  const {
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    duration,
    isLoading,
    error,
    togglePlay,
    nextTrack,
    previousTrack,
    setVolume,
    seek,
  } = useMusic();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);

  // Format time helper
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle click outside to close playlist
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (playerRef.current && !playerRef.current.contains(event.target as Node)) {
        setShowPlaylist(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show loading state if no current track
  if (!currentTrack) {
    return (
      <div className="music-player collapsed">
        {error && (
          <div className="music-player-error">
            {error}
          </div>
        )}
        <div className="music-player-content">
          <div className="track-info">
            <div className="track-title">{error ? 'Ошибка загрузки' : 'Загрузка...'}</div>
          </div>
          <div className="player-controls">
            <button className="control-btn play-btn loading" disabled>
              ⏳
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={playerRef}
      className={`music-player ${isExpanded ? 'expanded' : 'collapsed'}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {error && (
        <div className={`music-player-error ${error.includes('заблокировано') ? 'autoplay-blocked' : ''}`}>
          {error}
          {error.includes('заблокировано') && (
            <div className="autoplay-hint">
              💡 Кликните в любом месте экрана для запуска музыки
            </div>
          )}
        </div>
      )}

      <div className="music-player-content">
        {/* Track Info */}
        <div className="track-info">
          <div className="track-title">{currentTrack.title}</div>
          {isExpanded && (
            <div className="track-artist">{currentTrack.artist}</div>
          )}
        </div>

        {/* Controls */}
        <div className="player-controls">
          <button 
            className="control-btn prev-btn"
            onClick={previousTrack}
            title="Previous track"
          >
            ⏮
          </button>
          
          <button 
            className={`control-btn play-btn ${isLoading ? 'loading' : ''}`}
            onClick={togglePlay}
            disabled={isLoading}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? '⏳' : (isPlaying ? '⏸' : '▶')}
          </button>
          
          <button 
            className="control-btn next-btn"
            onClick={nextTrack}
            title="Next track"
          >
            ⏭
          </button>
        </div>

        {/* Expanded Controls */}
        {isExpanded && (
          <>
            {/* Progress Bar */}
            <div className="progress-container">
              <span className="time-display">{formatTime(currentTime)}</span>
              <input
                type="range"
                className="progress-bar"
                min="0"
                max={duration || 0}
                value={currentTime || 0}
                onChange={(e) => {
                  const newTime = parseFloat(e.target.value);
                  if (!isNaN(newTime) && duration > 0) {
                    seek(newTime);
                  }
                }}
                disabled={!duration || duration === 0}
              />
              <span className="time-display">{formatTime(duration)}</span>
            </div>

            {/* Volume Control */}
            <div className="volume-container">
              <span className="volume-icon">🔊</span>
              <input
                type="range"
                className="volume-slider"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
              />
              <span className="volume-display">{Math.round(volume * 100)}%</span>
            </div>

            {/* Playlist Button */}
            <button 
              className="control-btn playlist-btn"
              onClick={() => setShowPlaylist(!showPlaylist)}
              title="Playlist"
            >
              📋
            </button>
          </>
        )}
      </div>

      {/* Playlist Dropdown */}
      {showPlaylist && (
        <Playlist onClose={() => setShowPlaylist(false)} />
      )}
    </div>
  );
}
