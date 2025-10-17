export type AbilityEffect = 
  | 'heal_self'
  | 'heal_other'
  | 'block_technique'
  | 'block_vote'
  | 'reveal_info'
  | 'resurrect'
  | 'double_vote_damage'
  | 'protect_self'
  | 'reflect_vote';

export type AttributeCategory = 
  | 'generalTechniques'
  | 'cursedTools'
  | 'specialTraits';

export interface ActiveAbility {
  id: string;
  name: string;
  description: string;
  effect: AbilityEffect;
  requiredAttribute: string;
  attributeCategory: AttributeCategory;
  usesRemaining: number;
  maxUses: number;
  requiresTarget: boolean;
}

export interface AbilityActivation {
  abilityId: string;
  abilityName: string;
  playerId: string;
  playerName: string;
  targetId?: string;
  targetName?: string;
  round: number;
  timestamp: number;
}

export interface AbilityNotification {
  playerId: string;
  playerName: string;
  abilityName: string;
  targetId?: string;
  targetName?: string;
  message?: string;
  timestamp: number;
}

