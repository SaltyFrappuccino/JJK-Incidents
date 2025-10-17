import { GameRoom, Player, GamePhase, GameState, RevealedCharacteristic, GameStats } from '../types/GameTypes.js';
import { CharacterCard } from '../types/CharacterTypes.js';
import { Mission } from '../types/MissionTypes.js';
import { CharacterGenerator } from './CharacterGenerator.js';
import { MissionService } from './MissionService.js';
import { AbilityService } from './AbilityService.js';
import { ActiveAbility, AbilityActivation } from '../types/AbilityTypes.js';

export class GameManager {
  private rooms: Map<string, GameRoom> = new Map();
  private characterGenerator: CharacterGenerator;
  private missionService: MissionService;
  private playerCharacters: Map<string, Map<string, CharacterCard>> = new Map(); // roomCode -> playerId -> CharacterCard
  private revealedCharacteristics: Map<string, RevealedCharacteristic[]> = new Map(); // roomCode -> RevealedCharacteristic[]

  // Game configuration
  private readonly MAX_ROOMS = 100;
  private readonly ROOM_CODE_LENGTH = 6;
  private readonly MAX_ROOM_CODE_ATTEMPTS = 100;
  private readonly PHASE_TIMERS = {
    reveal: 60 * 1000,      // 60 seconds
    discussion: 5 * 60 * 1000, // 5 minutes
    voting: 60 * 1000       // 60 seconds
  };

  constructor(missionService: MissionService) {
    this.characterGenerator = new CharacterGenerator();
    this.missionService = missionService;
    
    // Cleanup inactive rooms every 5 minutes
    setInterval(() => this.cleanupInactiveRooms(), 5 * 60 * 1000);
  }

  createRoom(hostName: string): { roomCode: string; playerId: string } {
    if (this.rooms.size >= this.MAX_ROOMS) {
      throw new Error('Достигнуто максимальное количество комнат');
    }

    const roomCode = this.generateUniqueRoomCode();
    const playerId = this.generatePlayerId();
    
    const host: Player = {
      id: playerId,
      name: hostName,
      role: 'host',
      isConnected: true,
      hasVoted: false,
      hasRevealed: false
    };

    const room: GameRoom = {
      code: roomCode,
      hostId: playerId,
      players: new Map([[playerId, host]]),
      gamePhase: 'lobby',
      currentRound: 0,
      gameStarted: false,
      gameEnded: false,
      eliminatedPlayers: [],
      strikeTeamSize: 0,
      targetSurvivors: 3,
      votes: new Map(),
      createdAt: Date.now(),
      consecutiveSkips: 0,
      roundHistory: [],
      aiGeneratedEpilogue: undefined,
      activeAbilities: new Map(),
      usedAbilities: [],
      blockedVotes: new Set(),
      reflectedVotes: new Map(),
      protectedPlayers: new Set(),
      doubleVoteDamage: new Map()
    };

    this.rooms.set(roomCode, room);
    this.playerCharacters.set(roomCode, new Map());
    this.revealedCharacteristics.set(roomCode, []);

    return { roomCode, playerId };
  }

  joinRoom(roomCode: string, playerName: string): { success: boolean; playerId?: string; gameState?: GameState; error?: string } {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'Комната не найдена' };
    }

    if (room.gameStarted) {
      return { success: false, error: 'Игра уже началась' };
    }

    if (room.players.size >= 16) {
      return { success: false, error: 'Комната заполнена' };
    }

    // Check if player name is already taken
    const existingPlayer = Array.from(room.players.values()).find(p => p.name === playerName);
    if (existingPlayer) {
      return { success: false, error: 'Имя игрока уже занято' };
    }

    const playerId = this.generatePlayerId();
    const player: Player = {
      id: playerId,
      name: playerName,
      role: 'participant',
      isConnected: true,
      hasVoted: false,
      hasRevealed: false
    };

    room.players.set(playerId, player);
    return { success: true, playerId, gameState: this.getGameState(room) };
  }

  leaveRoom(roomCode: string, playerId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return false;
    }

    const player = room.players.get(playerId);
    if (!player) {
      return false;
    }

    room.players.delete(playerId);

    // If host leaves, promote first participant to host or close room
    if (player.role === 'host') {
      const remainingPlayers = Array.from(room.players.values());
      if (remainingPlayers.length > 0) {
        const newHost = remainingPlayers[0];
        newHost.role = 'host';
        room.hostId = newHost.id;
      } else {
        this.deleteRoom(roomCode);
        return true;
      }
    }

    return true;
  }

  async selectMission(roomCode: string, missionId: string, playerId: string): Promise<{ success: boolean; error?: string }> {
    console.log(`[GameManager] Выбор миссии: комната=${roomCode}, игрок=${playerId}, миссия=${missionId}`);
    
    const room = this.rooms.get(roomCode);
    if (!room) {
      console.log(`[GameManager] Ошибка: комната ${roomCode} не найдена`);
      return { success: false, error: 'Комната не найдена' };
    }

    const player = room.players.get(playerId);
    if (!player || player.role !== 'host') {
      console.log(`[GameManager] Ошибка: игрок ${playerId} не хост`);
      return { success: false, error: 'Только хост может выбрать миссию' };
    }

    try {
      // Загружаем полную миссию из базы данных
      const mission = await this.missionService.getMissionById(missionId);
      if (!mission) {
        console.log(`[GameManager] Ошибка: миссия ${missionId} не найдена`);
        return { success: false, error: 'Миссия не найдена' };
      }

      room.selectedMission = mission;
      console.log(`[GameManager] Миссия выбрана: ${mission.name}`);
      
      return { success: true };
    } catch (error) {
      console.error(`[GameManager] Ошибка загрузки миссии:`, error);
      return { success: false, error: 'Не удалось загрузить миссию' };
    }
  }

  startGame(roomCode: string, playerId: string): { success: boolean; error?: string } {
    console.log(`[GameManager] Запуск игры: комната=${roomCode}, игрок=${playerId}`);
    
    const room = this.rooms.get(roomCode);
    if (!room) {
      console.log(`[GameManager] Ошибка: комната ${roomCode} не найдена`);
      return { success: false, error: 'Комната не найдена' };
    }

    const player = room.players.get(playerId);
    if (!player || player.role !== 'host') {
      console.log(`[GameManager] Ошибка: игрок ${playerId} не хост`);
      return { success: false, error: 'Только хост может запустить игру' };
    }

    if (room.players.size < 3) {
      console.log(`[GameManager] Ошибка: недостаточно игроков (${room.players.size}/3)`);
      return { success: false, error: 'Нужно минимум 3 игрока для начала' };
    }

    if (!room.selectedMission) {
      console.log(`[GameManager] Ошибка: миссия не выбрана`);
      return { success: false, error: 'Миссия не выбрана' };
    }

    console.log(`[GameManager] Генерация персонажей для ${room.players.size} игроков`);
    // Generate characters for all players
    const playerCharacters = this.playerCharacters.get(roomCode)!;
    for (const [id, player] of room.players) {
      const character = this.characterGenerator.generateCharacter();
      playerCharacters.set(id, character);
      console.log(`[GameManager] Персонаж создан для игрока ${player.name} (${id}):`, {
        rank: character.rank.value,
        cursedTechnique: character.cursedTechnique.value,
        cursedEnergyLevel: character.cursedEnergyLevel.value,
        strengths: character.strengths.value,
        weaknesses: character.weaknesses.value,
        currentState: character.currentState.value,
        allRevealed: false
      });

      // Detect and assign active abilities
      const abilities = AbilityService.detectPlayerAbilities(character);
      if (abilities.length > 0) {
        room.activeAbilities.set(id, abilities);
        console.log(`[GameManager] Обнаружено способностей для игрока ${player.name}: ${abilities.map(a => a.name).join(', ')}`);
      }
    }

    // Set strike team size based on target survivors
    room.strikeTeamSize = room.targetSurvivors;
    console.log(`[GameManager] Размер команды установлен: ${room.strikeTeamSize} (цель выживших: ${room.targetSurvivors})`);

    room.gameStarted = true;
    room.gamePhase = 'mission_briefing';
    room.currentRound = 1;

    console.log(`[GameManager] Игра запущена успешно: фаза=${room.gamePhase}, раунд=${room.currentRound}`);
    return { success: true };
  }

  revealCharacteristic(roomCode: string, playerId: string, categoryIndex: number): { success: boolean; error?: string; revealed?: RevealedCharacteristic } {
    console.log(`[GameManager] Раскрытие характеристики: комната=${roomCode}, игрок=${playerId}, категория=${categoryIndex}`);
    
    const room = this.rooms.get(roomCode);
    if (!room) {
      console.log(`[GameManager] Ошибка: комната ${roomCode} не найдена`);
      return { success: false, error: 'Комната не найдена' };
    }

    const player = room.players.get(playerId);
    if (!player) {
      console.log(`[GameManager] Ошибка: игрок ${playerId} не найден`);
      return { success: false, error: 'Игрок не найден' };
    }

    if (room.gamePhase !== 'reveal') {
      console.log(`[GameManager] Ошибка: не фаза раскрытия (текущая фаза: ${room.gamePhase})`);
      return { success: false, error: 'Не фаза раскрытия' };
    }

    if (player.hasRevealed) {
      console.log(`[GameManager] Ошибка: игрок ${playerId} уже раскрыл характеристику в этом раунде`);
      return { success: false, error: 'Игрок уже раскрыл характеристику в этом раунде' };
    }

    const playerCharacters = this.playerCharacters.get(roomCode);
    if (!playerCharacters) {
      return { success: false, error: 'Данные персонажа не найдены' };
    }

    const character = playerCharacters.get(playerId);
    if (!character) {
      return { success: false, error: 'Персонаж не найден' };
    }

    // Get the category name and value
    const categoryNames = [
      'Ранг', 'Проклятая Техника', 'Уровень Проклятой Энергии', 'Общие Техники',
      'Проклятые Инструменты', 'Сильные Стороны', 'Слабые Стороны', 'Особые Черты', 'Текущее Состояние'
    ];

    if (categoryIndex < 0 || categoryIndex >= categoryNames.length) {
      return { success: false, error: 'Неверный индекс категории' };
    }

    const categoryKeys = [
      'rank', 'cursedTechnique', 'cursedEnergyLevel', 'generalTechniques',
      'cursedTools', 'strengths', 'weaknesses', 'specialTraits', 'currentState'
    ] as const;

    const categoryKey = categoryKeys[categoryIndex];
    const category = character[categoryKey];

    if (category.revealed) {
      return { success: false, error: 'Категория уже раскрыта' };
    }

    // Mark as revealed
    category.revealed = true;
    player.hasRevealed = true;
    player.revealedCategory = categoryIndex;

    console.log(`[GameManager] Обновлён флаг revealed для игрока ${player.name} (${playerId}), роль=${player.role}, категория=${categoryNames[categoryIndex]}`);

    // Create revealed characteristic record
    const revealed: RevealedCharacteristic = {
      playerId,
      categoryIndex,
      categoryName: categoryNames[categoryIndex],
      value: this.formatCharacteristicValue(category),
      round: room.currentRound
    };

    // Add to revealed characteristics list
    const revealedList = this.revealedCharacteristics.get(roomCode) || [];
    revealedList.push(revealed);
    this.revealedCharacteristics.set(roomCode, revealedList);

    console.log(`[GameManager] Характеристика раскрыта: ${categoryNames[categoryIndex]} = ${revealed.value}`);
    console.log(`[GameManager] Всего раскрытий в комнате ${roomCode}: ${revealedList.length}`);

    // Check if all players have revealed
    this.checkAndAdvancePhase(roomCode);

    return { success: true, revealed };
  }

  useAbility(roomCode: string, playerId: string, abilityId: string, targetId?: string): { success: boolean; error?: string; message?: string; revealed?: RevealedCharacteristic } {
    console.log(`[GameManager] Использование способности: комната=${roomCode}, игрок=${playerId}, способность=${abilityId}, цель=${targetId}`);
    
    const room = this.rooms.get(roomCode);
    if (!room) {
      console.log(`[GameManager] Ошибка: комната ${roomCode} не найдена`);
      return { success: false, error: 'Комната не найдена' };
    }

    const player = room.players.get(playerId);
    if (!player) {
      console.log(`[GameManager] Ошибка: игрок ${playerId} не найден`);
      return { success: false, error: 'Игрок не найден' };
    }

    // Get player's abilities
    const playerAbilities = room.activeAbilities.get(playerId);
    if (!playerAbilities) {
      return { success: false, error: 'У вас нет активных способностей' };
    }

    const ability = playerAbilities.find(a => a.id === abilityId);
    if (!ability) {
      return { success: false, error: 'Способность не найдена' };
    }

    // Validate ability usage
    const validation = AbilityService.validateAbilityUsage(ability, playerId, targetId, room);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Apply ability effect
    const playerCharacters = this.playerCharacters.get(roomCode)!;
    const result = AbilityService.applyAbilityEffect(ability, playerId, targetId, room, playerCharacters);
    
    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Decrease uses remaining
    ability.usesRemaining--;

    // Record ability usage
    const activation: AbilityActivation = {
      abilityId: ability.id,
      abilityName: ability.name,
      playerId: playerId,
      playerName: player.name,
      targetId: targetId,
      targetName: targetId ? room.players.get(targetId)?.name : undefined,
      round: room.currentRound,
      timestamp: Date.now()
    };
    room.usedAbilities.push(activation);

    console.log(`[GameManager] Способность использована: ${ability.name}, осталось использований: ${ability.usesRemaining}`);

    // Special handling for reveal_info ability
    if (ability.effect === 'reveal_info' && targetId) {
      const targetCharacter = playerCharacters.get(targetId);
      if (targetCharacter) {
        // Find first unrevealed characteristic
        const categoryKeys = [
          'rank', 'cursedTechnique', 'cursedEnergyLevel', 'generalTechniques',
          'cursedTools', 'strengths', 'weaknesses', 'specialTraits', 'currentState'
        ] as const;
        const categoryNames = [
          'Ранг', 'Проклятая Техника', 'Уровень Проклятой Энергии', 'Общие Техники',
          'Проклятые Инструменты', 'Сильные Стороны', 'Слабые Стороны', 'Особые Черты', 'Текущее Состояние'
        ];

        for (let i = 0; i < categoryKeys.length; i++) {
          const category = targetCharacter[categoryKeys[i]];
          if (!category.revealed) {
            const revealed: RevealedCharacteristic = {
              playerId: targetId,
              categoryIndex: i,
              categoryName: categoryNames[i],
              value: this.formatCharacteristicValue(category),
              round: room.currentRound
            };
            return { success: true, message: result.message, revealed };
          }
        }
      }
    }

    return { success: true, message: result.message };
  }

  submitVote(roomCode: string, playerId: string, targetPlayerId: string | null): { success: boolean; error?: string } {
    console.log(`[GameManager] Запрос голосования: комната=${roomCode}, игрок=${playerId}, цель=${targetPlayerId}`);
    
    const room = this.rooms.get(roomCode);
    if (!room) {
      console.log(`[GameManager] Ошибка: комната ${roomCode} не найдена`);
      return { success: false, error: 'Комната не найдена' };
    }

    const player = room.players.get(playerId);
    if (!player) {
      console.log(`[GameManager] Ошибка: игрок ${playerId} не найден`);
      return { success: false, error: 'Игрок не найден' };
    }

    if (room.gamePhase !== 'voting') {
      console.log(`[GameManager] Ошибка: не фаза голосования, текущая фаза ${room.gamePhase}`);
      return { success: false, error: 'Не фаза голосования' };
    }

    if (player.hasVoted) {
      console.log(`[GameManager] Ошибка: игрок ${playerId} уже проголосовал`);
      return { success: false, error: 'Вы уже проголосовали' };
    }

    // Check if player is blocked from voting
    if (room.blockedVotes.has(playerId)) {
      console.log(`[GameManager] Ошибка: игрок ${playerId} заблокирован и не может голосовать`);
      return { success: false, error: 'Вы не можете голосовать в этом раунде (заблокированы способностью "Связывание")' };
    }

    // Если пропуск, но уже 2 раза подряд пропускали
    if (targetPlayerId === null && room.consecutiveSkips >= 2) {
      console.log(`[GameManager] Ошибка: нельзя пропустить голосование 3 раза подряд`);
      return { success: false, error: 'Нельзя пропустить голосование 3 раза подряд' };
    }

    // Если не пропуск, проверить валидность цели
    if (targetPlayerId !== null) {
      const targetPlayer = room.players.get(targetPlayerId);
      if (!targetPlayer) {
        console.log(`[GameManager] Ошибка: цель голосования ${targetPlayerId} не найдена`);
        return { success: false, error: 'Цель голосования не найдена' };
      }

      if (playerId === targetPlayerId) {
        console.log(`[GameManager] Ошибка: игрок ${playerId} не может голосовать за себя`);
        return { success: false, error: 'Нельзя голосовать за себя' };
      }

      if (room.eliminatedPlayers.includes(targetPlayerId)) {
        console.log(`[GameManager] Ошибка: цель ${targetPlayerId} уже исключена`);
        return { success: false, error: 'Цель уже исключена' };
      }
    }

    player.hasVoted = true;
    player.voteTarget = targetPlayerId;
    
    // Apply vote reflection if active
    let actualTarget = targetPlayerId;
    if (targetPlayerId && room.reflectedVotes.has(playerId)) {
      actualTarget = playerId; // Reflect vote back to self
      console.log(`[GameManager] Голос игрока ${player.name} отражён на него самого способностью "Отражение"`);
    }
    
    if (actualTarget === null) {
      room.votes.set(playerId, 'SKIP');
      console.log(`[GameManager] Голос засчитан: ${player.name} -> пропуск`);
    } else {
      room.votes.set(playerId, actualTarget);
      console.log(`[GameManager] Голос засчитан: ${player.name} -> ${room.players.get(actualTarget)?.name}`);
    }

    // Проверить если все проголосовали
    const allVoted = Array.from(room.players.values())
      .filter(p => !room.eliminatedPlayers.includes(p.id))
      .every(p => p.hasVoted);
    
    if (allVoted) {
      console.log(`[GameManager] Все проголосовали, подсчитываем голоса`);
      this.tallyVotes(roomCode);
    }

    return { success: true };
  }

  private tallyVotes(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    
    console.log(`[GameManager] Подсчёт голосов для комнаты ${roomCode}`);
    
    // Подсчёт голосов с учётом удвоенного урона
    const voteCounts = new Map<string, number>();
    room.votes.forEach((targetId) => {
      if (targetId !== 'SKIP') {
        let voteWeight = 1;
        // Check if target has double damage
        if (room.doubleVoteDamage.has(targetId)) {
          voteWeight = 2;
          console.log(`[GameManager] Голос против ${targetId} удвоен способностью "Критический Удар"`);
        }
        voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + voteWeight);
      }
    });
    
    // Подсчитать сколько проголосовало за пропуск
    const skipVotes = Array.from(room.votes.values()).filter(v => v === 'SKIP').length;
    const totalVotes = room.votes.size;
    
    console.log(`[GameManager] Голоса:`, Array.from(voteCounts.entries()));
    console.log(`[GameManager] Пропусков: ${skipVotes}/${totalVotes}`);
    
    // Найти игрока с максимальным количеством голосов
    let maxVotes = 0;
    let eliminatedId: string | null = null;
    const candidates: string[] = [];
    
    voteCounts.forEach((count, playerId) => {
      if (count > maxVotes) {
        maxVotes = count;
        eliminatedId = playerId;
        candidates.length = 0;
        candidates.push(playerId);
      } else if (count === maxVotes) {
        candidates.push(playerId);
      }
    });
    
    // Если большинство за пропуск ИЛИ ничья - никого не выгоняем
    if (skipVotes > totalVotes / 2) {
      console.log(`[GameManager] Большинство за пропуск, никто не исключён`);
      eliminatedId = null;
      room.consecutiveSkips++;
    } else if (candidates.length > 1) {
      console.log(`[GameManager] Ничья в голосовании, никто не исключён`);
      eliminatedId = null;
      room.consecutiveSkips++;
    } else if (eliminatedId) {
      // Check if player is protected
      if (room.protectedPlayers.has(eliminatedId)) {
        console.log(`[GameManager] Игрок ${eliminatedId} защищён способностью "Защитная Зона", исключение отменено`);
        eliminatedId = null;
        room.consecutiveSkips++;
      } else {
        console.log(`[GameManager] Исключён игрок ${eliminatedId}`);
        room.consecutiveSkips = 0;
      }
    }
    
    // Сохранить результат
    room.lastVoteResult = {
      eliminatedId,
      voteCounts: Array.from(voteCounts.entries()),
      tie: candidates.length > 1
    };
    
    console.log(`[GameManager] Результат голосования: исключён=${eliminatedId}, пропусков подряд=${room.consecutiveSkips}`);
    
    // Автоматически перейти к round_end через 2 секунды
    setTimeout(() => {
      console.log(`[GameManager] Переходим к round_end через 2 секунды после подсчёта голосов`);
      this.transitionToPhase(roomCode, 'round_end');
    }, 2000);
  }

  nextRound(roomCode: string, playerId: string): { success: boolean; error?: string; eliminatedPlayerId?: string; gameEnded?: boolean } {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'Комната не найдена' };
    }

    const player = room.players.get(playerId);
    if (!player || player.role !== 'host') {
      return { success: false, error: 'Только хост может переходить к следующему раунду' };
    }

    if (room.gamePhase !== 'round_end') {
      return { success: false, error: 'Не фаза окончания раунда' };
    }

    // Проверить результат голосования
    let eliminatedPlayerId: string | undefined;
    if (room.lastVoteResult?.eliminatedId) {
      eliminatedPlayerId = room.lastVoteResult.eliminatedId;
      
      // Check for resurrection ability
      const playerAbilities = room.activeAbilities.get(eliminatedPlayerId);
      const resurrectAbility = playerAbilities?.find(a => a.effect === 'resurrect' && a.usesRemaining > 0);
      
      if (resurrectAbility) {
        console.log(`[GameManager] Игрок ${eliminatedPlayerId} воскрешён способностью "Реинкарнация"`);
        resurrectAbility.usesRemaining--;
        
        // Heal player to full health
        const playerCharacters = this.playerCharacters.get(roomCode);
        const character = playerCharacters?.get(eliminatedPlayerId);
        if (character) {
          character.currentState.value = 'Здоров';
        }
        
        // Record ability usage
        const player = room.players.get(eliminatedPlayerId);
        if (player) {
          const activation: AbilityActivation = {
            abilityId: resurrectAbility.id,
            abilityName: resurrectAbility.name,
            playerId: eliminatedPlayerId,
            playerName: player.name,
            round: room.currentRound,
            timestamp: Date.now()
          };
          room.usedAbilities.push(activation);
        }
        
        eliminatedPlayerId = undefined; // Cancel elimination
      } else {
        room.eliminatedPlayers.push(eliminatedPlayerId);
        console.log(`[GameManager] Игрок ${eliminatedPlayerId} исключён из комнаты ${roomCode}`);
      }
    }

    // Проверить достигнута ли цель по выживших
    const remainingPlayers = room.players.size - room.eliminatedPlayers.length;
    const targetSurvivors = room.targetSurvivors || 3;
    
    if (remainingPlayers <= targetSurvivors) {
      console.log(`[GameManager] Достигнута цель выживших (${remainingPlayers}/${targetSurvivors}), завершаем миссию`);
      room.gameEnded = true;
      this.transitionToPhase(roomCode, 'mission_complete');
      // Автоматически раскрыть все характеристики всех игроков
      this.revealAllCharacteristics(roomCode);
      // Установить флаг для broadcast после перехода в mission_complete
      room.needsBroadcast = true;
      return { success: true, eliminatedPlayerId, gameEnded: true };
    }

    // Продолжаем игру - новый раунд
    room.currentRound++;
    room.lastVoteResult = undefined; // Очистить результаты прошлого голосования
    
    // Clear temporary ability effects
    this.clearTemporaryAbilityEffects(roomCode);
    
    console.log(`[GameManager] Начинаем раунд ${room.currentRound}`);
    this.transitionToPhase(roomCode, 'reveal');
    room.votes.clear();

    // Reset player states
    for (const [id, player] of room.players) {
      player.hasVoted = false;
      player.hasRevealed = false;
      player.voteTarget = undefined;
      player.revealedCategory = undefined;
      player.readyToVote = false; // Сбросить готовность к голосованию
    }

    return { success: true, eliminatedPlayerId, gameEnded: false };
  }

  getGameState(room: GameRoom): GameState {
    const players = Array.from(room.players.values());
    const phaseTimer = room.phaseTimer ? {
      ...room.phaseTimer,
      timeLeft: Math.max(0, room.phaseTimer.endTime - Date.now())
    } : undefined;

    return {
      roomCode: room.code,
      phase: room.gamePhase,
      round: room.currentRound,
      players,
      hostId: room.hostId,
      selectedMission: room.selectedMission,
      gameStarted: room.gameStarted,
      gameEnded: room.gameEnded,
      eliminatedPlayers: room.eliminatedPlayers,
      strikeTeamSize: room.strikeTeamSize,
      targetSurvivors: room.targetSurvivors,
      phaseTimer,
      revealedCharacteristics: this.getRevealedCharacteristics(room.code),
      consecutiveSkips: room.consecutiveSkips,
      lastVoteResult: room.lastVoteResult,
      aiGeneratedEpilogue: room.aiGeneratedEpilogue
    };
  }

  getGameStateByRoomCode(roomCode: string): GameState | null {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return null;
    }
    return this.getGameState(room);
  }

  getPlayerCharacter(roomCode: string, playerId: string): CharacterCard | null {
    const playerCharacters = this.playerCharacters.get(roomCode);
    if (!playerCharacters) {
      return null;
    }
    return playerCharacters.get(playerId) || null;
  }

  getRevealedCharacteristics(roomCode: string): RevealedCharacteristic[] {
    return this.revealedCharacteristics.get(roomCode) || [];
  }

  getRoom(roomCode: string): GameRoom | undefined {
    return this.rooms.get(roomCode);
  }

  getGameStats(roomCode: string): GameStats | null {
    const room = this.rooms.get(roomCode);
    if (!room || !room.gameEnded) {
      return null;
    }

    return {
      totalPlayers: room.eliminatedPlayers.length + room.players.size,
      eliminatedPlayers: room.eliminatedPlayers,
      strikeTeam: Array.from(room.players.keys()),
      missionResult: {
        success: true, // This would be determined by the GM
        casualties: room.eliminatedPlayers.length,
        epilogue: undefined
      }
    };
  }

  private generateUniqueRoomCode(): string {
    let attempts = 0;
    while (attempts < this.MAX_ROOM_CODE_ATTEMPTS) {
      const code = this.generateRoomCode();
      if (!this.rooms.has(code)) {
        return code;
      }
      attempts++;
    }
    throw new Error('Не удалось сгенерировать уникальный код комнаты');
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < this.ROOM_CODE_LENGTH; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generatePlayerId(): string {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  }

  private formatCharacteristicValue(category: any): string {
    if (Array.isArray(category.value)) {
      return category.value.join(', ');
    }
    return String(category.value);
  }

  private checkAndAdvancePhase(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    console.log(`[GameManager] Проверка готовности к переходу фазы: комната=${roomCode}, фаза=${room.gamePhase}`);

    if (room.gamePhase === 'reveal') {
      const allPlayersRevealed = Array.from(room.players.values()).every(player => player.hasRevealed);
      if (allPlayersRevealed) {
        console.log(`[GameManager] Все игроки раскрыли характеристики, переходим к обсуждению`);
        this.transitionToPhase(roomCode, 'discussion');
        // ВАЖНО: Пометить что нужно обновить состояние
        room.needsBroadcast = true;
      } else {
        const revealedCount = Array.from(room.players.values()).filter(p => p.hasRevealed).length;
        const notRevealedPlayers = Array.from(room.players.values())
          .filter(p => !p.hasRevealed)
          .map(p => `${p.name}(${p.role})`)
          .join(', ');
        console.log(`[GameManager] Раскрыто ${revealedCount}/${room.players.size} игроков. Не раскрыли: ${notRevealedPlayers}`);
      }
    }
  }

  advancePhase(roomCode: string, playerId: string): { success: boolean; error?: string } {
    console.log(`[GameManager] Запрос перехода фазы: комната=${roomCode}, игрок=${playerId}`);
    
    const room = this.rooms.get(roomCode);
    if (!room) {
      console.log(`[GameManager] Ошибка: комната ${roomCode} не найдена`);
      return { success: false, error: 'Комната не найдена' };
    }

    const player = room.players.get(playerId);
    if (!player || player.role !== 'host') {
      console.log(`[GameManager] Ошибка: игрок ${playerId} не хост`);
      return { success: false, error: 'Только хост может переходить фазы' };
    }

    const currentPhase = room.gamePhase;
    let nextPhase: GamePhase;

    switch (currentPhase) {
      case 'mission_briefing':
        nextPhase = 'reveal';
        break;
      case 'discussion':
        nextPhase = 'voting';
        break;
      case 'voting':
        nextPhase = 'round_end';
        break;
      case 'round_end':
        nextPhase = 'reveal'; // Начать новый раунд
        break;
      default:
        console.log(`[GameManager] Ошибка: неизвестная фаза ${currentPhase}`);
        return { success: false, error: 'Неизвестная фаза игры' };
    }

    console.log(`[GameManager] Переход фазы: ${currentPhase} -> ${nextPhase}`);
    this.transitionToPhase(roomCode, nextPhase);

    return { success: true };
  }

  togglePlayerReady(roomCode: string, playerId: string): { success: boolean; error?: string } {
    console.log(`[GameManager] Запрос переключения готовности: комната=${roomCode}, игрок=${playerId}`);
    
    const room = this.rooms.get(roomCode);
    if (!room) {
      console.log(`[GameManager] Ошибка: комната ${roomCode} не найдена`);
      return { success: false, error: 'Комната не найдена' };
    }

    const player = room.players.get(playerId);
    if (!player) {
      console.log(`[GameManager] Ошибка: игрок ${playerId} не найден`);
      return { success: false, error: 'Игрок не найден' };
    }

    player.readyToVote = !player.readyToVote;
    console.log(`[GameManager] Игрок ${player.name} готовность: ${player.readyToVote}`);
    
    // Проверить если все готовы
    const allReady = Array.from(room.players.values()).every(p => p.readyToVote);
    if (allReady && room.gamePhase === 'discussion') {
      console.log(`[GameManager] Все игроки готовы, переходим к голосованию`);
      this.transitionToPhase(roomCode, 'voting');
    }
    
    return { success: true };
  }

  setTargetSurvivors(roomCode: string, playerId: string, targetSurvivors: number): { success: boolean; error?: string } {
    console.log(`[GameManager] Установка цели выживших: комната=${roomCode}, игрок=${playerId}, цель=${targetSurvivors}`);
    
    const room = this.rooms.get(roomCode);
    if (!room) {
      console.log(`[GameManager] Ошибка: комната ${roomCode} не найдена`);
      return { success: false, error: 'Комната не найдена' };
    }

    const player = room.players.get(playerId);
    if (!player || player.role !== 'host') {
      console.log(`[GameManager] Ошибка: игрок ${playerId} не хост`);
      return { success: false, error: 'Только хост может изменять настройки' };
    }

    if (room.gameStarted) {
      console.log(`[GameManager] Ошибка: игра уже началась`);
      return { success: false, error: 'Нельзя изменить настройки после начала игры' };
    }

    if (targetSurvivors < 1) {
      return { success: false, error: 'Минимум 1 выживший' };
    }

    if (targetSurvivors >= room.players.size) {
      return { success: false, error: 'Количество выживших должно быть меньше текущего количества игроков' };
    }

    room.targetSurvivors = targetSurvivors;
    console.log(`[GameManager] Цель выживших установлена: ${targetSurvivors}`);
    
    return { success: true };
  }

  private revealAllCharacteristics(roomCode: string): void {
    console.log(`[GameManager] Автоматическое раскрытие всех характеристик для комнаты ${roomCode}`);
    
    const room = this.rooms.get(roomCode);
    if (!room) {
      console.log(`[GameManager] Ошибка: комната ${roomCode} не найдена`);
      return;
    }

    const categoryNames = [
      'Ранг', 'Проклятая Техника', 'Уровень Проклятой Энергии', 'Общие Техники',
      'Проклятые Инструменты', 'Сильные Стороны', 'Слабые Стороны', 'Особые Черты', 'Текущее Состояние'
    ];

    const categoryKeys = [
      'rank', 'cursedTechnique', 'cursedEnergyLevel', 'generalTechniques',
      'cursedTools', 'strengths', 'weaknesses', 'specialTraits', 'currentState'
    ] as const;

    // Пройти по всем игрокам в комнате
    for (const [playerId, player] of room.players) {
      const character = this.playerCharacters.get(roomCode)?.get(playerId);
      if (!character) {
        console.log(`[GameManager] Персонаж не найден для игрока ${playerId}`);
        continue;
      }

      console.log(`[GameManager] Раскрываем все характеристики для игрока ${player.name} (${playerId})`);

      // Раскрыть все характеристики для этого игрока
      for (let categoryIndex = 0; categoryIndex < categoryKeys.length; categoryIndex++) {
        const categoryKey = categoryKeys[categoryIndex];
        const category = character[categoryKey];

        // Если характеристика еще не раскрыта, раскрываем её
        if (!category.revealed) {
          category.revealed = true;
          console.log(`[GameManager] Раскрыта характеристика "${categoryNames[categoryIndex]}" для игрока ${player.name}`);

          // Создать запись о раскрытой характеристике
          const revealed: RevealedCharacteristic = {
            playerId,
            categoryIndex,
            categoryName: categoryNames[categoryIndex],
            value: this.formatCharacteristicValue(category),
            round: room.currentRound
          };

          // Добавить в список раскрытых характеристик
          const revealedList = this.revealedCharacteristics.get(roomCode) || [];
          revealedList.push(revealed);
          this.revealedCharacteristics.set(roomCode, revealedList);
        }
      }
    }

    console.log(`[GameManager] Все характеристики раскрыты для комнаты ${roomCode}`);
  }

  getPlayerAbilities(roomCode: string, playerId: string): { success: boolean; abilities?: ActiveAbility[]; error?: string } {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'Комната не найдена' };
    }

    const player = room.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Игрок не найден' };
    }

    const abilities = room.activeAbilities.get(playerId) || [];
    return { success: true, abilities };
  }

  private clearTemporaryAbilityEffects(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    console.log(`[GameManager] Очистка временных эффектов способностей для комнаты ${roomCode}`);
    
    // Clear blocked votes
    room.blockedVotes.clear();
    
    // Clear reflected votes
    room.reflectedVotes.clear();
    
    // Clear protected players
    room.protectedPlayers.clear();
    
    // Clear double vote damage
    room.doubleVoteDamage.clear();
    
    console.log(`[GameManager] Временные эффекты способностей очищены`);
  }

  private transitionToPhase(roomCode: string, phase: GamePhase): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    console.log(`[GameManager] Переход фазы: ${room.gamePhase} -> ${phase}`);
    room.gamePhase = phase;
    console.log(`[GameManager] Фаза изменена на ${phase}, состояние обновлено`);

    // Reset player states for new phase
    for (const player of room.players.values()) {
      if (phase === 'discussion') {
        // Discussion phase - keep revealed states
      } else if (phase === 'voting') {
        // Voting phase - reset vote states
        player.hasVoted = false;
        player.voteTarget = undefined;
      } else if (phase === 'reveal') {
        // New reveal phase - reset reveal states
        player.hasRevealed = false;
        player.revealedCategory = undefined;
        player.readyToVote = false; // Сбросить готовность к голосованию
      }
    }

    console.log(`[GameManager] Фаза изменена на ${phase}, состояние обновлено`);
    
    // Установить флаг для дополнительного broadcast
    room.needsBroadcast = true;
  }

  private cleanupInactiveRooms(): void {
    const now = Date.now();
    const inactiveRooms: string[] = [];

    for (const [roomCode, room] of this.rooms) {
      const hasActivePlayers = Array.from(room.players.values()).some(p => p.isConnected);
      if (!hasActivePlayers && now - room.createdAt > 30 * 60 * 1000) { // 30 minutes
        inactiveRooms.push(roomCode);
      }
    }

    for (const roomCode of inactiveRooms) {
      this.deleteRoom(roomCode);
    }
  }

  private deleteRoom(roomCode: string): void {
    this.rooms.delete(roomCode);
    this.playerCharacters.delete(roomCode);
    this.revealedCharacteristics.delete(roomCode);
  }
}
