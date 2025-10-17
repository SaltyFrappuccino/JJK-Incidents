export interface Track {
  id: string;
  title: string;
  artist: string;
  file: string;
}

export interface MusicPlayerState {
  currentTrack: Track | null;
  playlist: Track[];
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
}

export interface MusicPlayerActions {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  setVolume: (volume: number) => void;
  selectTrack: (trackId: string) => void;
  seek: (time: number) => void;
  loadPlaylist: () => Promise<void>;
}
