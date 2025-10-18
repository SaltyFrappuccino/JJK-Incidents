import { Mission } from './MissionTypes.js';
import { ActiveAbility, AbilityActivation } from './AbilityTypes.js';

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

export interface GameRoom {
  code: string;
  hostId: string;
  players: Map<string, Player>;
  gamePhase: GamePhase;
  currentRound: number;
  selectedMission?: Mission;
  gameStarted: boolean;
  gameEnded: boolean;
  eliminatedPlayers: string[];
  strikeTeamSize: number;
  targetSurvivors: number;
  votes: Map<string, string>; // playerId -> targetPlayerId
  phaseTimer?: {
    endTime: number;
    phase: GamePhase;
  };
  createdAt: number;
  consecutiveSkips: number; // Счётчик пропущенных голосований
  lastVoteResult?: {
    eliminatedId: string | null;
    voteCounts: [string, number][];
    tie: boolean;
  };
  needsBroadcast?: boolean;
  roundHistory: RoundHistory[];
  aiGeneratedEpilogue?: string;
  isGeneratingEpilogue?: boolean;
  activeAbilities: Map<string, ActiveAbility[]>; // playerId -> abilities
  usedAbilities: AbilityActivation[];
  blockedVotes: Set<string>; // playerIds who can't vote
  reflectedVotes: Map<string, string>; // playerId -> reflector's playerId
  protectedPlayers: Set<string>; // playerIds protected from elimination
  doubleVoteDamage: Map<string, string>; // targetId -> attackerId (Критический Удар)
}

export interface RoundHistory {
  round: number;
  eliminatedPlayerId: string | null;
  revealedCharacteristics: RevealedCharacteristic[];
  skipped: boolean;
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
  revealedCharacteristics: RevealedCharacteristic[];
  phaseTimer?: {
    endTime: number;
    phase: GamePhase;
    timeLeft: number;
  };
  consecutiveSkips: number;
  lastVoteResult?: {
    eliminatedId: string | null;
    voteCounts: [string, number][];
    tie: boolean;
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

export interface GameStats {
  totalPlayers: number;
  eliminatedPlayers: string[];
  strikeTeam: string[];
  missionResult: {
    success: boolean;
    casualties: number;
    epilogue?: string;
  };
}
