import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useSocket } from './SocketContext';
import { ActiveAbility, AbilityNotification } from '../types/AbilityTypes';

// Types (simplified versions of backend types)
export type GamePhase = 
  | 'lobby'
  | 'mission_briefing'
  | 'reveal'
  | 'discussion'
  | 'voting'
  | 'round_end'
  | 'mission_complete';

export type PlayerRole = 'host' | 'participant';

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  isConnected: boolean;
  hasVoted: boolean;
  voteTarget?: string;
  hasRevealed: boolean;
  revealedCategory?: number;
  readyToVote?: boolean;
  revealedCount: number; // Количество раскрытых характеристик в текущем раунде
}

export interface Mission {
  id: string;
  name: string;
  description: string;
  threat: string;
  objectives: string[];
  dangerFactors: string[];
  difficulty: string;
  isCustom: boolean;
}

export interface GameState {
  roomCode: string;
  phase: GamePhase;
  round: number;
  players: Player[];
  hostId: string;
  selectedMission?: Mission;
  gameStarted: boolean;
  gameEnded: boolean;
  eliminatedPlayers: string[];
  strikeTeamSize: number;
  targetSurvivors: number;
  phaseTimer?: {
    endTime: number;
    phase: GamePhase;
    timeLeft: number;
  };
  aiGeneratedEpilogue?: string;
}

export interface RevealedCharacteristic {
  playerId: string;
  categoryIndex: number;
  categoryName: string;
  value: string;
  round: number;
}

export interface CharacterCard {
  rank: { revealed: boolean; value: string; description?: string };
  cursedTechnique: { revealed: boolean; value: string; description?: string };
  cursedEnergyLevel: { revealed: boolean; value: string };
  generalTechniques: { revealed: boolean; value: string[]; descriptions?: string[] };
  cursedTools: { revealed: boolean; value: string[]; descriptions?: string[] };
  strengths: { revealed: boolean; value: string[] };
  weaknesses: { revealed: boolean; value: string[] };
  specialTraits: { revealed: boolean; value: string[]; descriptions?: string[] };
  currentState: { revealed: boolean; value: string };
}

interface GameContextType {
  // State
  currentRoom: string | null;
  myPlayer: Player | null;
  gameState: GameState | null;
  myCharacter: CharacterCard | null;
  revealedCharacteristics: RevealedCharacteristic[];
  missions: Mission[];
  myAbilities: ActiveAbility[];
  abilityNotifications: AbilityNotification[];
  isLoading: boolean;
  error: string | null;

  // Actions
  createRoom: (hostName: string) => Promise<{ success: boolean; roomCode?: string; playerId?: string; error?: string }>;
  joinRoom: (roomCode: string, playerName: string) => Promise<{ success: boolean; playerId?: string; error?: string }>;
  leaveRoom: () => void;
  selectMission: (missionId: string) => Promise<{ success: boolean; error?: string }>;
  startGame: () => Promise<{ success: boolean; error?: string }>;
  revealCharacteristic: (categoryIndex: number) => Promise<{ success: boolean; error?: string }>;
  submitVote: (targetPlayerId: string) => Promise<{ success: boolean; error?: string }>;
  nextRound: () => Promise<{ success: boolean; error?: string }>;
  endMission: (epilogue: string) => Promise<{ success: boolean; error?: string }>;
  fetchMissions: (playerCount?: number) => Promise<void>;
  fetchMyCharacter: () => Promise<{ success: boolean; error?: string }>;
  fetchMyAbilities: () => Promise<{ success: boolean; error?: string }>;
  useAbility: (abilityId: string, targetId?: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  advancePhase: () => Promise<{ success: boolean; error?: string }>;
  toggleReady: () => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
  onMissionComplete?: () => void;
  setMissionCompleteCallback: (callback: (() => void) | undefined) => void;
  generateAIEpilogue: () => Promise<{ success: boolean; epilogue?: string; error?: string }>;
  setTargetSurvivors: (targetSurvivors: number) => Promise<{ success: boolean; error?: string }>;
}

type GameAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_CURRENT_ROOM'; payload: string | null }
  | { type: 'SET_MY_PLAYER'; payload: Player | null }
  | { type: 'SET_GAME_STATE'; payload: GameState | null }
  | { type: 'SET_MY_CHARACTER'; payload: CharacterCard | null }
  | { type: 'SET_REVEALED_CHARACTERISTICS'; payload: RevealedCharacteristic[] }
  | { type: 'ADD_REVEALED_CHARACTERISTIC'; payload: RevealedCharacteristic }
  | { type: 'SET_MISSIONS'; payload: Mission[] }
  | { type: 'SET_MY_ABILITIES'; payload: ActiveAbility[] }
  | { type: 'ADD_ABILITY_NOTIFICATION'; payload: AbilityNotification }
  | { type: 'CLEAR_OLD_ABILITY_NOTIFICATIONS' }
  | { type: 'SET_MISSION_COMPLETE_CALLBACK'; payload: (() => void) | undefined }
  | { type: 'RESET_GAME' };

interface GameStateInternal {
  currentRoom: string | null;
  myPlayer: Player | null;
  gameState: GameState | null;
  myCharacter: CharacterCard | null;
  revealedCharacteristics: RevealedCharacteristic[];
  missions: Mission[];
  myAbilities: ActiveAbility[];
  abilityNotifications: AbilityNotification[];
  isLoading: boolean;
  error: string | null;
  onMissionComplete?: () => void;
}

const initialState: GameStateInternal = {
  currentRoom: null,
  myPlayer: null,
  gameState: null,
  myCharacter: null,
  revealedCharacteristics: [],
  missions: [],
  myAbilities: [],
  abilityNotifications: [],
  isLoading: false,
  error: null,
  onMissionComplete: undefined
};

function gameReducer(state: GameStateInternal, action: GameAction): GameStateInternal {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_CURRENT_ROOM':
      return { ...state, currentRoom: action.payload };
    case 'SET_MY_PLAYER':
      return { ...state, myPlayer: action.payload };
    case 'SET_GAME_STATE':
      return { ...state, gameState: action.payload };
    case 'SET_MY_CHARACTER':
      return { ...state, myCharacter: action.payload };
    case 'SET_REVEALED_CHARACTERISTICS':
      return { ...state, revealedCharacteristics: action.payload };
    case 'ADD_REVEALED_CHARACTERISTIC':
      return { 
        ...state, 
        revealedCharacteristics: [...state.revealedCharacteristics, action.payload] 
      };
    case 'SET_MISSIONS':
      return { ...state, missions: action.payload };
    case 'SET_MY_ABILITIES':
      return { ...state, myAbilities: action.payload };
    case 'ADD_ABILITY_NOTIFICATION':
      return {
        ...state,
        abilityNotifications: [...state.abilityNotifications, action.payload]
      };
    case 'CLEAR_OLD_ABILITY_NOTIFICATIONS':
      const now = Date.now();
      return {
        ...state,
        abilityNotifications: state.abilityNotifications.filter(n => now - n.timestamp < 10000) // Keep last 10 seconds
      };
    case 'SET_MISSION_COMPLETE_CALLBACK':
      return { ...state, onMissionComplete: action.payload };
    case 'RESET_GAME':
      return initialState;
    default:
      return state;
  }
}

const GameContext = createContext<GameContextType | undefined>(undefined);

interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { socket, isConnected } = useSocket();

  // Use ref to avoid stale closures in socket event handlers
  const currentRoomRef = useRef<string | null>(state.currentRoom);
  const onMissionCompleteRef = useRef<(() => void) | undefined>(state.onMissionComplete);

  // Sync refs with state
  useEffect(() => {
    currentRoomRef.current = state.currentRoom;
  }, [state.currentRoom]);

  useEffect(() => {
    onMissionCompleteRef.current = state.onMissionComplete;
  }, [state.onMissionComplete]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleGameUpdated = (gameState: GameState) => {
      console.log('[GameContext] Получено обновление gameState:', gameState);
      console.log('[GameContext] Фаза игры:', gameState.phase);
      dispatch({ type: 'SET_GAME_STATE', payload: gameState });
      // Обновляем revealedCharacteristics из gameState
      if (gameState.revealedCharacteristics) {
        dispatch({ type: 'SET_REVEALED_CHARACTERISTICS', payload: gameState.revealedCharacteristics });
      }
    };

    const handleGameStarted = (data: { round: number; phase: string }) => {
      console.log('Game started:', data);
    };

    const handleCharacteristicRevealed = (revealed: RevealedCharacteristic) => {
      console.log('[GameContext] Получено событие characteristic_revealed:', revealed);
      console.log('[GameContext] Детали раскрытия:', {
        playerId: revealed.playerId,
        categoryName: revealed.categoryName,
        value: revealed.value,
        round: revealed.round
      });
      dispatch({ type: 'ADD_REVEALED_CHARACTERISTIC', payload: revealed });
    };

    const handleRoundEnded = (data: { eliminatedPlayerId: string; remainingPlayers: string[] }) => {
      console.log('Round ended:', data);
    };

    const handleMissionCompleted = (data: { strikeTeam: string[]; epilogue: string }) => {
      console.log('[GameContext] Mission completed событие получено:', data);
      // Перейти в эпилог
      if (onMissionCompleteRef.current) {
        console.log('[GameContext] Вызываем onMissionComplete callback');
        onMissionCompleteRef.current();
      }
    };

    const handlePlayerJoined = (data: { playerId: string; playerName: string }) => {
      console.log('Игрок присоединился:', data);
      // Request updated game state when player joins
      if (currentRoomRef.current) {
        socket.emit('get_game_state', { roomCode: currentRoomRef.current }, (response) => {
          if (response.success && response.gameState) {
            dispatch({ type: 'SET_GAME_STATE', payload: response.gameState });
          }
        });
      }
    };

    const handlePlayerLeft = (data: { playerId: string; playerName: string }) => {
      console.log('Игрок покинул комнату:', data);
      // Request updated game state when player leaves
      if (currentRoomRef.current) {
        socket.emit('get_game_state', { roomCode: currentRoomRef.current }, (response) => {
          if (response.success && response.gameState) {
            dispatch({ type: 'SET_GAME_STATE', payload: response.gameState });
          }
        });
      }
    };

    const handleError = (error: { message: string; code?: string }) => {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    };

    const handleRoomDeleted = (data: { roomCode: string }) => {
      console.log('Room deleted:', data);
      dispatch({ type: 'RESET_GAME' });
    };

    const handleAbilityUsed = (data: { playerId: string; playerName: string; abilityName: string; targetId?: string; targetName?: string; message?: string }) => {
      console.log('[GameContext] Способность использована:', data);
      const notification: AbilityNotification = {
        playerId: data.playerId,
        playerName: data.playerName,
        abilityName: data.abilityName,
        targetId: data.targetId,
        targetName: data.targetName,
        message: data.message,
        timestamp: Date.now()
      };
      dispatch({ type: 'ADD_ABILITY_NOTIFICATION', payload: notification });
    };

    // Register event listeners
    socket.on('game_updated', handleGameUpdated);
    socket.on('game_started', handleGameStarted);
    socket.on('characteristic_revealed', handleCharacteristicRevealed);
    socket.on('round_ended', handleRoundEnded);
    socket.on('mission_completed', handleMissionCompleted);
    socket.on('player_joined', handlePlayerJoined);
    socket.on('player_left', handlePlayerLeft);
    socket.on('error', handleError);
    socket.on('room_deleted', handleRoomDeleted);
    socket.on('ability_used', handleAbilityUsed);

    return () => {
      socket.off('game_updated', handleGameUpdated);
      socket.off('game_started', handleGameStarted);
      socket.off('characteristic_revealed', handleCharacteristicRevealed);
      socket.off('round_ended', handleRoundEnded);
      socket.off('mission_completed', handleMissionCompleted);
      socket.off('player_joined', handlePlayerJoined);
      socket.off('player_left', handlePlayerLeft);
      socket.off('error', handleError);
      socket.off('room_deleted', handleRoomDeleted);
      socket.off('ability_used', handleAbilityUsed);
    };
  }, [socket]);

  // Action functions
  const createRoom = useCallback(async (hostName: string): Promise<{ success: boolean; roomCode?: string; playerId?: string; error?: string }> => {
    if (!socket) {
      return { success: false, error: 'Not connected to server' };
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    return new Promise((resolve) => {
      socket.emit('create_room', { hostName }, (response) => {
        dispatch({ type: 'SET_LOADING', payload: false });
        
        if (response.roomCode && response.playerId) {
          dispatch({ type: 'SET_CURRENT_ROOM', payload: response.roomCode });
          dispatch({ type: 'SET_MY_PLAYER', payload: { 
            id: response.playerId, 
            name: hostName, 
            role: 'host',
            isConnected: true,
            hasVoted: false,
            hasRevealed: false
          } as Player });
          resolve({ success: true, roomCode: response.roomCode, playerId: response.playerId });
        } else {
          resolve({ success: false, error: 'Failed to create room' });
        }
      });
    });
  }, [socket]);

  const joinRoom = useCallback(async (roomCode: string, playerName: string): Promise<{ success: boolean; playerId?: string; error?: string }> => {
    if (!socket) {
      return { success: false, error: 'Not connected to server' };
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    return new Promise((resolve) => {
      socket.emit('join_room', { roomCode, playerName }, (response) => {
        dispatch({ type: 'SET_LOADING', payload: false });
        
        if (response.success && response.playerId) {
          dispatch({ type: 'SET_CURRENT_ROOM', payload: roomCode });
          dispatch({ type: 'SET_MY_PLAYER', payload: { 
            id: response.playerId, 
            name: playerName, 
            role: 'participant',
            isConnected: true,
            hasVoted: false,
            hasRevealed: false
          } as Player });
          dispatch({ type: 'SET_GAME_STATE', payload: response.gameState || null });
          resolve({ success: true, playerId: response.playerId });
        } else {
          resolve({ success: false, error: response.error || 'Failed to join room' });
        }
      });
    });
  }, [socket]);

  const leaveRoom = useCallback(() => {
    if (socket && state.currentRoom && state.myPlayer) {
      socket.emit('leave_room', { 
        roomCode: state.currentRoom, 
        playerId: state.myPlayer.id 
      });
    }
    dispatch({ type: 'RESET_GAME' });
  }, [socket, state.currentRoom, state.myPlayer]);

  const selectMission = useCallback(async (missionId: string): Promise<{ success: boolean; error?: string }> => {
    if (!socket || !state.currentRoom || !state.myPlayer) {
      return { success: false, error: 'Not in a room or not connected' };
    }

    return new Promise((resolve) => {
      socket.emit('select_mission', { 
        roomCode: state.currentRoom, 
        missionId, 
        playerId: state.myPlayer.id 
      }, (response) => {
        resolve(response);
      });
    });
  }, [socket, state.currentRoom, state.myPlayer]);

  const startGame = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!socket || !state.currentRoom || !state.myPlayer) {
      return { success: false, error: 'Not in a room or not connected' };
    }

    return new Promise((resolve) => {
      socket.emit('start_game', { 
        roomCode: state.currentRoom, 
        playerId: state.myPlayer.id 
      }, (response) => {
        resolve(response);
      });
    });
  }, [socket, state.currentRoom, state.myPlayer]);

  const revealCharacteristic = useCallback(async (categoryIndex: number): Promise<{ success: boolean; error?: string }> => {
    if (!socket || !state.currentRoom || !state.myPlayer) {
      return { success: false, error: 'Not in a room or not connected' };
    }

    return new Promise((resolve) => {
      socket.emit('reveal_characteristic', { 
        roomCode: state.currentRoom, 
        playerId: state.myPlayer.id, 
        categoryIndex 
      }, (response) => {
        resolve(response);
      });
    });
  }, [socket, state.currentRoom, state.myPlayer]);

  const submitVote = useCallback(async (targetPlayerId: string): Promise<{ success: boolean; error?: string }> => {
    if (!socket || !state.currentRoom || !state.myPlayer) {
      return { success: false, error: 'Not in a room or not connected' };
    }

    return new Promise((resolve) => {
      socket.emit('submit_vote', { 
        roomCode: state.currentRoom, 
        playerId: state.myPlayer.id, 
        targetPlayerId 
      }, (response) => {
        resolve(response);
      });
    });
  }, [socket, state.currentRoom, state.myPlayer]);

  const nextRound = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!socket || !state.currentRoom || !state.myPlayer) {
      return { success: false, error: 'Not in a room or not connected' };
    }

    return new Promise((resolve) => {
      socket.emit('next_round', { 
        roomCode: state.currentRoom, 
        playerId: state.myPlayer.id 
      }, (response) => {
        resolve(response);
      });
    });
  }, [socket, state.currentRoom, state.myPlayer]);

  const endMission = useCallback(async (epilogue: string): Promise<{ success: boolean; error?: string }> => {
    if (!socket || !state.currentRoom || !state.myPlayer) {
      return { success: false, error: 'Not in a room or not connected' };
    }

    return new Promise((resolve) => {
      socket.emit('end_mission', { 
        roomCode: state.currentRoom, 
        playerId: state.myPlayer.id, 
        epilogue 
      }, (response) => {
        resolve(response);
      });
    });
  }, [socket, state.currentRoom, state.myPlayer]);

  const fetchMissions = useCallback(async (playerCount?: number): Promise<void> => {
    if (!socket) return;

    dispatch({ type: 'SET_LOADING', payload: true });

    return new Promise((resolve) => {
      socket.emit('get_missions', { playerCount }, (response) => {
        dispatch({ type: 'SET_LOADING', payload: false });
        
        if (response.success && response.missions) {
          dispatch({ type: 'SET_MISSIONS', payload: response.missions });
        }
        resolve();
      });
    });
  }, [socket]);

  const fetchMyCharacter = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!socket || !state.currentRoom || !state.myPlayer) {
      return { success: false, error: 'Not in a room or not connected' };
    }

    return new Promise((resolve) => {
      socket.emit('get_my_character', {
        roomCode: state.currentRoom,
        playerId: state.myPlayer.id
      }, (response) => {
        if (response.success && response.character) {
          dispatch({ type: 'SET_MY_CHARACTER', payload: response.character });
          resolve({ success: true });
        } else {
          resolve({ success: false, error: response.error || 'Не удалось загрузить персонаж' });
        }
      });
    });
  }, [socket, state.currentRoom, state.myPlayer]);

  const advancePhase = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!socket || !state.currentRoom || !state.myPlayer) {
      return { success: false, error: 'Not in a room or not connected' };
    }

    return new Promise((resolve) => {
      socket.emit('advance_phase', {
        roomCode: state.currentRoom,
        playerId: state.myPlayer.id
      }, (response) => {
        if (response.success) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: response.error || 'Не удалось перейти к следующей фазе' });
        }
      });
    });
  }, [socket, state.currentRoom, state.myPlayer]);

  const toggleReady = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!socket || !state.currentRoom || !state.myPlayer) {
      return { success: false, error: 'Not in a room or not connected' };
    }

    return new Promise((resolve) => {
      socket.emit('toggle_ready', {
        roomCode: state.currentRoom,
        playerId: state.myPlayer.id
      }, (response) => {
        if (response.success) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: response.error || 'Не удалось переключить готовность' });
        }
      });
    });
  }, [socket, state.currentRoom, state.myPlayer]);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const setMissionCompleteCallback = useCallback((callback: (() => void) | undefined) => {
    dispatch({ type: 'SET_MISSION_COMPLETE_CALLBACK', payload: callback });
  }, []);

  const generateAIEpilogue = useCallback(async (): Promise<{ success: boolean; epilogue?: string; error?: string }> => {
    if (!socket || !state.currentRoom || !state.myPlayer) {
      return { success: false, error: 'Не в комнате или не подключен' };
    }

    return new Promise((resolve) => {
      socket.emit('generate_epilogue', {
        roomCode: state.currentRoom,
        playerId: state.myPlayer.id
      }, (response) => {
        if (response.success && response.epilogue) {
          resolve({ success: true, epilogue: response.epilogue });
        } else {
          resolve({ success: false, error: response.error || 'Не удалось сгенерировать эпилог' });
        }
      });
    });
  }, [socket, state.currentRoom, state.myPlayer]);

  const setTargetSurvivors = useCallback(async (targetSurvivors: number): Promise<{ success: boolean; error?: string }> => {
    if (!socket || !state.currentRoom || !state.myPlayer) {
      return { success: false, error: 'Не в комнате или не подключен' };
    }

    return new Promise((resolve) => {
      socket.emit('set_target_survivors', {
        roomCode: state.currentRoom,
        playerId: state.myPlayer.id,
        targetSurvivors
      }, (response) => {
        resolve(response);
      });
    });
  }, [socket, state.currentRoom, state.myPlayer]);

  const fetchMyAbilities = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!socket || !state.currentRoom || !state.myPlayer) {
      return { success: false, error: 'Не в комнате или не подключен' };
    }

    return new Promise((resolve) => {
      socket.emit('get_abilities', {
        roomCode: state.currentRoom,
        playerId: state.myPlayer.id
      }, (response) => {
        if (response.success && response.abilities) {
          dispatch({ type: 'SET_MY_ABILITIES', payload: response.abilities });
          resolve({ success: true });
        } else {
          resolve({ success: false, error: response.error || 'Не удалось получить способности' });
        }
      });
    });
  }, [socket, state.currentRoom, state.myPlayer]);

  const useAbility = useCallback(async (abilityId: string, targetId?: string): Promise<{ success: boolean; error?: string; message?: string }> => {
    if (!socket || !state.currentRoom || !state.myPlayer) {
      return { success: false, error: 'Не в комнате или не подключен' };
    }

    return new Promise((resolve) => {
      socket.emit('use_ability', {
        roomCode: state.currentRoom,
        playerId: state.myPlayer.id,
        abilityId,
        targetId
      }, (response) => {
        if (response.success) {
          // Refresh abilities to update uses remaining
          fetchMyAbilities();
          resolve({ success: true, message: response.message });
        } else {
          resolve({ success: false, error: response.error || 'Не удалось использовать способность' });
        }
      });
    });
  }, [socket, state.currentRoom, state.myPlayer, fetchMyAbilities]);

  // Clear old notifications periodically
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'CLEAR_OLD_ABILITY_NOTIFICATIONS' });
    }, 5000); // Every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const value: GameContextType = {
    // State
    currentRoom: state.currentRoom,
    myPlayer: state.myPlayer,
    gameState: state.gameState,
    myCharacter: state.myCharacter,
    revealedCharacteristics: state.revealedCharacteristics,
    missions: state.missions,
    myAbilities: state.myAbilities,
    abilityNotifications: state.abilityNotifications,
    isLoading: state.isLoading,
    error: state.error,

    // Actions
    createRoom,
    joinRoom,
    leaveRoom,
    selectMission,
    startGame,
    revealCharacteristic,
    submitVote,
    nextRound,
    endMission,
    fetchMissions,
    fetchMyCharacter,
    fetchMyAbilities,
    useAbility,
    advancePhase,
    toggleReady,
    clearError,
    onMissionComplete: state.onMissionComplete,
    setMissionCompleteCallback,
    generateAIEpilogue,
    setTargetSurvivors
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextType {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
