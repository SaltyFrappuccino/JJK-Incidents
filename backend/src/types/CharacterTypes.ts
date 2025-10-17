export type Rank = 'Четвёртый' | 'Третий' | 'Полу-Второй' | 'Второй' | 'Полу-Первый' | 'Первый' | 'Первый Особый' | 'Особый';
export type CursedEnergyLevel = 'Очень низкий' | 'Низкий' | 'Средний' | 'Выше среднего' | 'Высокий' | 'Огромный' | 'Уровень Оккотсу' | 'Уровень Сукуны';
export type PlayerState = 
  | 'Здоров'
  | 'Ранен'
  | 'Тяжело ранен'
  | 'Критически ранен'
  | 'Эмоционально Нестабилен'
  | 'Истощён'
  | 'Проклят'
  | 'Решителен'
  | 'Смущён'
  | 'В панике'
  | 'В ярости'
  | 'Сосредоточен'
  | 'Устал'
  | 'Напряжён'
  | 'Расслаблен'
  | 'Подозрителен'
  | 'Доверчив'
  | 'Осторожен'
  | 'Безрассуден'
  | 'Мотивирован';

// Weighted data interfaces
export interface WeightedValue<T = string> {
  value: T;
  weight: number;
}

export interface WeightedName {
  name: string;
  weight: number;
}


export interface Characteristic {
  revealed: boolean;
  value: string | string[];
}

export interface CharacterCard {
  // 1. Rank
  rank: Characteristic & { value: Rank };
  
  // 2. Cursed Technique (innate ability)
  cursedTechnique: Characteristic & {
    value: string;
  };
  
  // 3. Cursed Energy Level
  cursedEnergyLevel: Characteristic & { value: CursedEnergyLevel };
  
  // 4. General Techniques (can be empty)
  generalTechniques: {
    revealed: boolean;
    value: string[];
  };
  
  // 5. Cursed Tools (40% chance to have)
  cursedTools: {
    revealed: boolean;
    value: string[];
  };
  
  // 6. Strengths
  strengths: {
    revealed: boolean;
    value: string[];
  };
  
  // 7. Weaknesses
  weaknesses: {
    revealed: boolean;
    value: string[];
  };
  
  // 8. Special Traits (rare)
  specialTraits: {
    revealed: boolean;
    value: string[];
  };
  
  // 9. Current State
  currentState: Characteristic & {
    value: PlayerState;
  };
}

export interface PublicCharacterInfo {
  playerId: string;
  playerName: string;
  revealedCharacteristics: {
    categoryIndex: number;
    categoryName: string;
    value: string;
    round: number;
  }[];
}

// Character generation pools
export interface CharacterPools {
  ranks: WeightedValue<Rank>[];
  cursedTechniques: WeightedName[];
  generalTechniques: WeightedName[];
  cursedTools: WeightedName[];
  strengths: WeightedName[];
  weaknesses: WeightedName[];
  specialTraits: WeightedName[];
  states: WeightedName[];
  cursedEnergyLevels: WeightedValue<CursedEnergyLevel>[];
}

export interface CharacterGenerationOptions {
  rankWeights?: Partial<Record<Rank, number>>;
  specialTraitChance?: number;
  cursedToolChance?: number;
}
