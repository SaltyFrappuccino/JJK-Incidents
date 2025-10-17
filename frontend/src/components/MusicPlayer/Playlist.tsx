import React from 'react';
import { useMusic } from '../../contexts/MusicContext';

interface PlaylistProps {
  onClose: () => void;
}

export function Playlist({ onClose }: PlaylistProps) {
  const { playlist, currentTrack, selectTrack } = useMusic();

  return (
    <div className="playlist-dropdown">
      <div className="playlist-header">
        <h3>Playlist</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="playlist-tracks">
        {playlist.length === 0 ? (
          <div className="no-tracks">No tracks available</div>
        ) : (
          playlist.map((track) => (
            <div
              key={track.id}
              className={`playlist-track ${currentTrack?.id === track.id ? 'active' : ''}`}
              onClick={() => {
                selectTrack(track.id);
                onClose();
              }}
            >
              <div className="track-info">
                <div className="track-title">{track.title}</div>
                <div className="track-artist">{track.artist}</div>
              </div>
              {currentTrack?.id === track.id && (
                <div className="active-indicator">♪</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
