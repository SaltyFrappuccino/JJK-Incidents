import { CharacterCard } from '../types/CharacterTypes.js';
import { ActiveAbility, AbilityEffect, AttributeCategory, AbilityUsageResult } from '../types/AbilityTypes.js';
import { GameRoom } from '../types/GameTypes.js';

interface AbilityDefinition {
  name: string;
  description: string;
  effect: AbilityEffect;
  requiredAttribute: string;
  attributeCategory: AttributeCategory;
  requiresTarget: boolean;
  maxUses: number;
}

export class AbilityService {
  private static abilityDefinitions: AbilityDefinition[] = [
    {
      name: 'Исцеление',
      description: 'Сменить состояние любого игрока на "Здоров"',
      effect: 'heal_other',
      requiredAttribute: 'Выброс Обратной Проклятой Техники',
      attributeCategory: 'generalTechniques',
      requiresTarget: true,
      maxUses: 1
    },
    {
      name: 'Самовосстановление',
      description: 'Сменить своё состояние на "Здоров"',
      effect: 'heal_self',
      requiredAttribute: 'Обратная Проклята Техника (только на себя)',
      attributeCategory: 'generalTechniques',
      requiresTarget: false,
      maxUses: 1
    },
    {
      name: 'Подавление Техники',
      description: 'Обнулить Проклятую Технику у любого игрока',
      effect: 'block_technique',
      requiredAttribute: 'Перевёрнутое Копьё Небес',
      attributeCategory: 'cursedTools',
      requiresTarget: true,
      maxUses: 1
    },
    {
      name: 'Связывание',
      description: 'Заблокировать возможность голосовать одному игроку',
      effect: 'block_vote',
      requiredAttribute: 'Цепь Тысячи Миль',
      attributeCategory: 'cursedTools',
      requiresTarget: true,
      maxUses: 1
    },
    {
      name: 'Всевидящий Взгляд',
      description: 'Открыть одну скрытую характеристику любого игрока (только для себя)',
      effect: 'reveal_info',
      requiredAttribute: 'Шесть Глаз',
      attributeCategory: 'specialTraits',
      requiresTarget: true,
      maxUses: 1
    },
    {
      name: 'Реинкарнация',
      description: 'Воскреснуть после исключения (с полным здоровьем)',
      effect: 'resurrect',
      requiredAttribute: 'Перерождённый Шаман',
      attributeCategory: 'specialTraits',
      requiresTarget: false,
      maxUses: 1
    },
    {
      name: 'Критический Удар',
      description: 'Удвоить урон от голосования против выбранного игрока',
      effect: 'double_vote_damage',
      requiredAttribute: 'Чёрная Вспышка',
      attributeCategory: 'generalTechniques',
      requiresTarget: true,
      maxUses: 1
    },
    {
      name: 'Защитная Зона',
      description: 'Защитить себя от исключения',
      effect: 'protect_self',
      requiredAttribute: 'Растяжение Территории',
      attributeCategory: 'generalTechniques',
      requiresTarget: false,
      maxUses: 1
    },
    {
      name: 'Отражение',
      description: 'Отразить голос выбранного игрока на него самого',
      effect: 'reflect_vote',
      requiredAttribute: 'Драконья Кость',
      attributeCategory: 'cursedTools',
      requiresTarget: true,
      maxUses: 1
    }
  ];

  static detectPlayerAbilities(character: CharacterCard): ActiveAbility[] {
    const abilities: ActiveAbility[] = [];

    for (const definition of this.abilityDefinitions) {
      const category = character[definition.attributeCategory];
      
      if (Array.isArray(category.value)) {
        if (category.value.includes(definition.requiredAttribute)) {
          abilities.push({
            id: `${definition.effect}_${Date.now()}_${Math.random()}`,
            name: definition.name,
            description: definition.description,
            effect: definition.effect,
            requiredAttribute: definition.requiredAttribute,
            attributeCategory: definition.attributeCategory,
            usesRemaining: definition.maxUses,
            maxUses: definition.maxUses,
            requiresTarget: definition.requiresTarget
          });
        }
      }
    }

    return abilities;
  }

  static validateAbilityUsage(
    ability: ActiveAbility,
    playerId: string,
    targetId: string | undefined,
    room: GameRoom
  ): { valid: boolean; error?: string } {
    // Проверка: игрок существует
    const player = room.players.get(playerId);
    if (!player) {
      return { valid: false, error: 'Игрок не найден' };
    }

    // Проверка: игрок не исключён
    if (room.eliminatedPlayers.includes(playerId)) {
      return { valid: false, error: 'Исключённый игрок не может использовать способности' };
    }

    // Проверка: способность доступна
    const playerAbilities = room.activeAbilities.get(playerId) || [];
    const foundAbility = playerAbilities.find(a => a.id === ability.id);
    
    if (!foundAbility) {
      return { valid: false, error: 'Способность не найдена' };
    }

    // Проверка: есть использования
    if (foundAbility.usesRemaining <= 0) {
      return { valid: false, error: 'Способность уже использована' };
    }

    // Проверка: требуется цель
    if (ability.requiresTarget && !targetId) {
      return { valid: false, error: 'Для этой способности требуется цель' };
    }

    // Проверка: цель существует
    if (targetId) {
      const target = room.players.get(targetId);
      if (!target) {
        return { valid: false, error: 'Цель не найдена' };
      }

      // Для большинства способностей цель не должна быть исключена
      if (ability.effect !== 'resurrect' && room.eliminatedPlayers.includes(targetId)) {
        return { valid: false, error: 'Нельзя использовать способность на исключённого игрока' };
      }
    }

    // Проверка: фаза игры
    if (!['reveal', 'discussion', 'voting'].includes(room.gamePhase)) {
      return { valid: false, error: 'Способности можно использовать только в фазах раскрытия, обсуждения или голосования' };
    }

    return { valid: true };
  }

  static applyAbilityEffect(
    ability: ActiveAbility,
    playerId: string,
    targetId: string | undefined,
    room: GameRoom,
    playerCharacters: Map<string, any>
  ): AbilityUsageResult {
    const player = room.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Игрок не найден' };
    }

    switch (ability.effect) {
      case 'heal_self':
        return this.applyHealSelf(playerId, playerCharacters);

      case 'heal_other':
        if (!targetId) {
          return { success: false, error: 'Требуется цель' };
        }
        return this.applyHealOther(targetId, playerCharacters);

      case 'block_technique':
        if (!targetId) {
          return { success: false, error: 'Требуется цель' };
        }
        return this.applyBlockTechnique(targetId, playerCharacters);

      case 'block_vote':
        if (!targetId) {
          return { success: false, error: 'Требуется цель' };
        }
        room.blockedVotes.add(targetId);
        return { 
          success: true, 
          message: `Игрок ${room.players.get(targetId)?.name} не сможет голосовать в этом раунде` 
        };

      case 'reveal_info':
        // Это будет обработано отдельно на фронтенде
        return { 
          success: true, 
          message: 'Информация о характеристике будет отправлена игроку' 
        };

      case 'resurrect':
        // Будет обработано при исключении игрока
        return { 
          success: true, 
          message: 'Реинкарнация будет активирована при исключении' 
        };

      case 'double_vote_damage':
        if (!targetId) {
          return { success: false, error: 'Требуется цель' };
        }
        room.doubleVoteDamage.set(targetId, playerId);
        return { 
          success: true, 
          message: `Урон от голосов против ${room.players.get(targetId)?.name} будет удвоен` 
        };

      case 'protect_self':
        room.protectedPlayers.add(playerId);
        return { 
          success: true, 
          message: `${player.name} защищён от исключения в этом раунде` 
        };

      case 'reflect_vote':
        if (!targetId) {
          return { success: false, error: 'Требуется цель' };
        }
        room.reflectedVotes.set(targetId, playerId);
        return { 
          success: true, 
          message: `Голос игрока ${room.players.get(targetId)?.name} будет отражён` 
        };

      default:
        return { success: false, error: 'Неизвестный эффект способности' };
    }
  }

  private static applyHealSelf(playerId: string, playerCharacters: Map<string, any>): AbilityUsageResult {
    const character = playerCharacters.get(playerId);
    if (!character) {
      return { success: false, error: 'Персонаж не найден' };
    }

    character.currentState.value = 'Здоров';
    return { success: true, message: 'Состояние восстановлено до "Здоров"' };
  }

  private static applyHealOther(targetId: string, playerCharacters: Map<string, any>): AbilityUsageResult {
    const character = playerCharacters.get(targetId);
    if (!character) {
      return { success: false, error: 'Персонаж цели не найден' };
    }

    character.currentState.value = 'Здоров';
    return { success: true, message: 'Состояние цели восстановлено до "Здоров"' };
  }

  private static applyBlockTechnique(targetId: string, playerCharacters: Map<string, any>): AbilityUsageResult {
    const character = playerCharacters.get(targetId);
    if (!character) {
      return { success: false, error: 'Персонаж цели не найден' };
    }

    character.cursedTechnique.value = 'Нет (Подавлена)';
    return { success: true, message: 'Проклятая техника цели подавлена' };
  }
}

