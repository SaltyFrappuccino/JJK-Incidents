export type MissionDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Extreme';

export interface Mission {
  id: string;
  name: string;
  description: string;
  threat: string;
  objectives: string[];
  dangerFactors: string[];
  difficulty: MissionDifficulty;
  isCustom: boolean;
  createdAt?: Date;
  createdBy?: string;
}

export interface MissionBriefing {
  mission: Mission;
  briefingText: string;
  keyConsiderations: string[];
  successConditions: string[];
  failureConditions: string[];
}

export interface MissionResult {
  success: boolean;
  casualties: number;
  survivors: string[];
  epilogue: string;
  individualOutcomes: {
    playerId: string;
    outcome: 'survived' | 'injured' | 'died';
    notes?: string;
  }[];
}

export interface CustomMissionData {
  name: string;
  description: string;
  threat: string;
  objectives: string[];
  dangerFactors: string[];
  difficulty: MissionDifficulty;
  createdBy: string;
}

export interface MissionFilter {
  difficulty?: MissionDifficulty[];
  isCustom?: boolean;
}
