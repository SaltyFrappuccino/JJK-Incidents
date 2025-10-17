import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { Track, MusicPlayerState, MusicPlayerActions } from '../types/MusicTypes';

interface MusicContextType extends MusicPlayerState, MusicPlayerActions {}

type MusicAction =
  | { type: 'SET_PLAYLIST'; payload: Track[] }
  | { type: 'SET_CURRENT_TRACK'; payload: Track | null }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_CURRENT_TIME'; payload: number }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

const initialState: MusicPlayerState = {
  currentTrack: null,
  playlist: [],
  isPlaying: false,
  volume: 0.7,
  currentTime: 0,
  duration: 0,
  isLoading: false,
  error: null,
};

function musicReducer(state: MusicPlayerState, action: MusicAction): MusicPlayerState {
  switch (action.type) {
    case 'SET_PLAYLIST':
      return { ...state, playlist: action.payload };
    case 'SET_CURRENT_TRACK':
      return { ...state, currentTrack: action.payload };
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };
    case 'SET_VOLUME':
      return { ...state, volume: action.payload };
    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload };
    case 'SET_DURATION':
      return { ...state, duration: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(musicReducer, initialState);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef(state);
  
  // Keep stateRef in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.preload = 'metadata';
    
    // Load saved volume
    const savedVolume = localStorage.getItem('music-player-volume');
    if (savedVolume) {
      const volume = parseFloat(savedVolume);
      dispatch({ type: 'SET_VOLUME', payload: volume });
      audioRef.current.volume = volume;
    }

    // Audio event listeners
    const audio = audioRef.current;
    
    const handleLoadedMetadata = () => {
      dispatch({ type: 'SET_DURATION', payload: audio.duration });
      dispatch({ type: 'SET_LOADING', payload: false });
    };

    const handleTimeUpdate = () => {
      dispatch({ type: 'SET_CURRENT_TIME', payload: audio.currentTime });
    };

    const handleEnded = () => {
      dispatch({ type: 'SET_PLAYING', payload: false });
      nextTrack();
    };

    const handleError = () => {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load audio' });
      dispatch({ type: 'SET_LOADING', payload: false });
    };

    const handleCanPlay = () => {
      dispatch({ type: 'SET_LOADING', payload: false });
    };

    const handleLoadStart = () => {
      dispatch({ type: 'SET_LOADING', payload: true });
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadstart', handleLoadStart);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadstart', handleLoadStart);
    };
  }, []);

  // Load playlist on mount
  const loadPlaylist = useCallback(async () => {
    try {
      console.log('Loading playlist from /music/playlist.json');
      const response = await fetch('/music/playlist.json');
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        throw new Error(`Failed to load playlist: ${response.status}`);
      }
      
      const responseText = await response.text();
      console.log('Response text length:', responseText.length);
      console.log('Response text preview:', responseText.substring(0, 200));
      
      if (!responseText.trim()) {
        throw new Error('Empty response received');
      }
      
      const playlist: Track[] = JSON.parse(responseText);
      console.log('Parsed playlist:', playlist);
      dispatch({ type: 'SET_PLAYLIST', payload: playlist });
      
      // Auto-play first track if available
      if (playlist.length > 0 && !stateRef.current.currentTrack) {
        console.log('Auto-playing first track:', playlist[0]);
        selectTrack(playlist[0].id);
      }
    } catch (error) {
      console.error('Error loading playlist:', error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to load playlist: ${error}` });
    }
  }, []);

  useEffect(() => {
    // Load playlist only once on mount
    let isMounted = true;
    
    const loadInitialPlaylist = async () => {
      try {
        console.log('Loading playlist from /music/playlist.json');
        const response = await fetch('/music/playlist.json');
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (!response.ok) {
          throw new Error(`Failed to load playlist: ${response.status}`);
        }
        
        const responseText = await response.text();
        console.log('Response text length:', responseText.length);
        console.log('Response text preview:', responseText.substring(0, 200));
        
        if (!responseText.trim()) {
          throw new Error('Empty response received');
        }
        
        const playlist: Track[] = JSON.parse(responseText);
        console.log('Parsed playlist:', playlist);
        
        if (!isMounted) return;
        
        dispatch({ type: 'SET_PLAYLIST', payload: playlist });
        
        // Auto-select first track
        if (playlist.length > 0) {
          console.log('Auto-selecting first track:', playlist[0]);
          const track = playlist[0];
          dispatch({ type: 'SET_CURRENT_TRACK', payload: track });
          dispatch({ type: 'SET_ERROR', payload: null });
          if (audioRef.current) {
            console.log('Setting audio src to:', track.file);
            audioRef.current.src = track.file;
            audioRef.current.load();
          }
        }
      } catch (error) {
        console.error('Error loading playlist:', error);
        if (isMounted) {
          dispatch({ type: 'SET_ERROR', payload: `Failed to load playlist: ${error}` });
        }
      }
    };
    
    loadInitialPlaylist();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const play = useCallback(() => {
    if (audioRef.current && state.currentTrack) {
      audioRef.current.play().catch(() => {
        dispatch({ type: 'SET_ERROR', payload: 'Autoplay blocked. Click play to start music.' });
      });
      dispatch({ type: 'SET_PLAYING', payload: true });
    }
  }, [state.currentTrack]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      dispatch({ type: 'SET_PLAYING', payload: false });
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const selectTrack = useCallback((trackId: string) => {
    // Get current playlist from stateRef
    const currentPlaylist = stateRef.current.playlist;
    const track = currentPlaylist.find(t => t.id === trackId);
    console.log('Selecting track:', trackId, track);
    if (track && audioRef.current) {
      dispatch({ type: 'SET_CURRENT_TRACK', payload: track });
      dispatch({ type: 'SET_ERROR', payload: null });
      console.log('Setting audio src to:', track.file);
      audioRef.current.src = track.file;
      audioRef.current.load();
    } else {
      console.error('Track not found or audio not available:', trackId, track);
    }
  }, []);

  const nextTrack = useCallback(() => {
    if (state.currentTrack) {
      const currentIndex = state.playlist.findIndex(t => t.id === state.currentTrack!.id);
      const nextIndex = (currentIndex + 1) % state.playlist.length;
      selectTrack(state.playlist[nextIndex].id);
    }
  }, [state.currentTrack, state.playlist, selectTrack]);

  const previousTrack = useCallback(() => {
    if (state.currentTrack) {
      const currentIndex = state.playlist.findIndex(t => t.id === state.currentTrack!.id);
      const prevIndex = currentIndex === 0 ? state.playlist.length - 1 : currentIndex - 1;
      selectTrack(state.playlist[prevIndex].id);
    }
  }, [state.currentTrack, state.playlist, selectTrack]);

  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      dispatch({ type: 'SET_VOLUME', payload: volume });
      localStorage.setItem('music-player-volume', volume.toString());
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current && !isNaN(time) && isFinite(time)) {
      // Ensure time is within valid range
      const clampedTime = Math.max(0, Math.min(time, audioRef.current.duration || 0));
      audioRef.current.currentTime = clampedTime;
      dispatch({ type: 'SET_CURRENT_TIME', payload: clampedTime });
    }
  }, []);

  const value: MusicContextType = {
    ...state,
    play,
    pause,
    togglePlay,
    nextTrack,
    previousTrack,
    setVolume,
    selectTrack,
    seek,
    loadPlaylist,
  };

  return (
    <MusicContext.Provider value={value}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
}
