import { CharacterCard, CharacterPools, CharacterGenerationOptions, Rank, CursedEnergyLevel, PlayerState, WeightedValue, WeightedName } from '../types/CharacterTypes.js';

// Import JSON data files
import ranksData from '../data/ranks.json';
import cursedTechniquesData from '../data/cursedTechniques.json';
import generalTechniquesData from '../data/generalTechniques.json';
import cursedToolsData from '../data/cursedTools.json';
import strengthsData from '../data/strengths.json';
import weaknessesData from '../data/weaknesses.json';
import specialTraitsData from '../data/specialTraits.json';
import statesData from '../data/states.json';
import cursedEnergyLevelsData from '../data/cursedEnergyLevels.json';

export class CharacterGenerator {
  private pools: CharacterPools;

  constructor() {
    this.pools = this.initializePools();
  }

  private initializePools(): CharacterPools {
    return {
      ranks: ranksData as WeightedValue<Rank>[],
      cursedTechniques: cursedTechniquesData as WeightedName[],
      generalTechniques: generalTechniquesData as WeightedName[],
      cursedTools: cursedToolsData as WeightedName[],
      strengths: strengthsData as WeightedName[],
      weaknesses: weaknessesData as WeightedName[],
      specialTraits: specialTraitsData as WeightedName[],
      states: statesData as WeightedName[],
      cursedEnergyLevels: cursedEnergyLevelsData as WeightedValue<CursedEnergyLevel>[]
    };
  }

  generateCharacter(options: CharacterGenerationOptions = {}): CharacterCard {
    const rank = this.selectWeightedRandom(this.pools.ranks);
    const cursedTechnique = this.selectWeightedRandomName(this.pools.cursedTechniques);
    const cursedEnergyLevel = this.selectWeightedRandom(this.pools.cursedEnergyLevels);
    const generalTechniques = this.selectMultipleWeighted(this.pools.generalTechniques, 0, 3);
    const cursedTools = Math.random() < (options.cursedToolChance || 0.4) 
      ? this.selectMultipleWeighted(this.pools.cursedTools, 1, 2) 
      : [];
    const strengths = this.selectMultipleWeighted(this.pools.strengths, 1, 2);
    const weaknesses = this.selectMultipleWeighted(this.pools.weaknesses, 1, 2);
    const specialTraits = Math.random() < (options.specialTraitChance || 0.15)
      ? this.selectSpecialTraits()
      : [];
    const currentState = this.selectWeightedRandomName(this.pools.states) as PlayerState;

    return {
      rank: {
        revealed: false,
        value: rank
      },
      cursedTechnique: {
        revealed: false,
        value: cursedTechnique
      },
      cursedEnergyLevel: {
        revealed: false,
        value: cursedEnergyLevel
      },
      generalTechniques: {
        revealed: false,
        value: generalTechniques
      },
      cursedTools: {
        revealed: false,
        value: cursedTools
      },
      strengths: {
        revealed: false,
        value: strengths
      },
      weaknesses: {
        revealed: false,
        value: weaknesses
      },
      specialTraits: {
        revealed: false,
        value: specialTraits
      },
      currentState: {
        revealed: false,
        value: currentState
      }
    };
  }

  private selectWeightedRandom<T>(items: { value: T; weight: number }[]): T {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of items) {
      random -= item.weight;
      if (random <= 0) {
        return item.value;
      }
    }
    
    return items[items.length - 1].value;
  }

  private selectWeightedRandomName(items: WeightedName[]): string {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of items) {
      random -= item.weight;
      if (random <= 0) {
        return item.name;
      }
    }
    
    return items[items.length - 1].name;
  }

  private selectRandom<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }

  private selectMultiple<T>(items: T[], min: number, max: number): T[] {
    const count = Math.floor(Math.random() * (max - min + 1)) + min;
    const shuffled = [...items].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  private selectMultipleWeighted(items: WeightedName[], min: number, max: number): string[] {
    const count = Math.floor(Math.random() * (max - min + 1)) + min;
    const selected: string[] = [];
    const availableItems = [...items];
    
    for (let i = 0; i < count && availableItems.length > 0; i++) {
      const selectedItem = this.selectWeightedRandomName(availableItems);
      selected.push(selectedItem);
      // Remove selected item to avoid duplicates
      const index = availableItems.findIndex(item => item.name === selectedItem);
      if (index !== -1) {
        availableItems.splice(index, 1);
      }
    }
    
    return selected;
  }

  private selectSpecialTraits(): string[] {
    const traits = this.pools.specialTraits;
    const selectedTraits: string[] = [];
    
    // Use weighted selection for special traits
    // Roll for special traits (15% chance)
    if (Math.random() < 0.15 && traits.length > 0) {
      selectedTraits.push(this.selectWeightedRandomName(traits));
    }
    
    return selectedTraits;
  }

}
