import { Server, Socket } from 'socket.io';
import { GameManager } from '../services/GameManager.js';
import { MissionService } from '../services/MissionService.js';
import { GameState, RevealedCharacteristic } from '../types/GameTypes.js';

interface ClientToServerEvents {
  create_room: (data: { hostName: string }, callback: (response: { roomCode: string; playerId: string }) => void) => void;
  join_room: (data: { roomCode: string; playerName: string }, callback: (response: { success: boolean; playerId?: string; gameState?: GameState; error?: string }) => void) => void;
  leave_room: (data: { roomCode: string; playerId: string }) => void;
  select_mission: (data: { roomCode: string; missionId: string; playerId: string }, callback: (response: { success: boolean; error?: string }) => void) => void;
  start_game: (data: { roomCode: string; playerId: string }, callback: (response: { success: boolean; error?: string }) => void) => void;
  reveal_characteristic: (data: { roomCode: string; playerId: string; categoryIndex: number }, callback: (response: { success: boolean; error?: string; revealed?: RevealedCharacteristic }) => void) => void;
  submit_vote: (data: { roomCode: string; playerId: string; targetPlayerId: string | null }, callback: (response: { success: boolean; error?: string }) => void) => void;
  next_round: (data: { roomCode: string; playerId: string }, callback: (response: { success: boolean; error?: string; eliminatedPlayerId?: string; gameEnded?: boolean }) => void) => void;
  end_mission: (data: { roomCode: string; playerId: string; epilogue: string }, callback: (response: { success: boolean; error?: string }) => void) => void;
  get_game_state: (data: { roomCode: string }, callback: (response: { success: boolean; gameState?: GameState; error?: string }) => void) => void;
  get_missions: (data: { playerCount?: number }, callback: (response: { success: boolean; missions?: any[]; error?: string }) => void) => void;
  get_my_character: (data: { roomCode: string; playerId: string }, callback: (response: { success: boolean; character?: any; error?: string }) => void) => void;
  advance_phase: (data: { roomCode: string; playerId: string }, callback: (response: { success: boolean; error?: string }) => void) => void;
  toggle_ready: (data: { roomCode: string; playerId: string }, callback: (response: { success: boolean; error?: string }) => void) => void;
  generate_epilogue: (data: { roomCode: string; playerId: string }, callback: (response: { success: boolean; epilogue?: string; error?: string }) => void) => void;
  set_target_survivors: (data: { roomCode: string; playerId: string; targetSurvivors: number }, callback: (response: { success: boolean; error?: string }) => void) => void;
}

interface ServerToClientEvents {
  game_updated: (gameState: GameState) => void;
  game_started: (data: { round: number; phase: string }) => void;
  characteristic_revealed: (revealed: RevealedCharacteristic) => void;
  round_ended: (data: { eliminatedPlayerId: string; remainingPlayers: string[] }) => void;
  mission_completed: (data: { strikeTeam: string[]; epilogue: string }) => void;
  player_joined: (data: { playerId: string; playerName: string }) => void;
  player_left: (data: { playerId: string; playerName: string }) => void;
  error: (error: { message: string; code?: string }) => void;
  room_deleted: (data: { roomCode: string }) => void;
}

export class GameSocketHandler {
  private io: Server<ClientToServerEvents, ServerToClientEvents>;
  private gameManager: GameManager;
  private missionService: MissionService;
  private connectedPlayers: Map<string, { socketId: string; roomCode: string; playerId: string }> = new Map();

  constructor(io: Server, gameManager: GameManager, missionService: MissionService) {
    this.io = io;
    this.gameManager = gameManager;
    this.missionService = missionService;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log('Client connected:', socket.id);

      // Create room
      socket.on('create_room', async (data, callback) => {
        try {
          const { hostName } = data;
          if (!hostName || hostName.trim().length === 0) {
            callback({ roomCode: '', playerId: '' });
            socket.emit('error', { message: 'Имя хоста обязательно' });
            return;
          }

          const result = this.gameManager.createRoom(hostName.trim());
          
          // Track connected player
          this.connectedPlayers.set(socket.id, {
            socketId: socket.id,
            roomCode: result.roomCode,
            playerId: result.playerId
          });

          // Join socket room
          socket.join(result.roomCode);

          // Send initial game state to the host
          this.broadcastGameState(result.roomCode);

          callback({ roomCode: result.roomCode, playerId: result.playerId });
          console.log(`Комната создана: ${result.roomCode} пользователем ${hostName}`);
        } catch (error) {
          console.error('Ошибка создания комнаты:', error);
          callback({ roomCode: '', playerId: '' });
          socket.emit('error', { message: 'Не удалось создать комнату' });
        }
      });

      // Join room
      socket.on('join_room', async (data, callback) => {
        try {
          const { roomCode, playerName } = data;
          if (!roomCode || !playerName || playerName.trim().length === 0) {
            callback({ success: false, error: 'Код комнаты и имя игрока обязательны' });
            return;
          }

          const result = this.gameManager.joinRoom(roomCode, playerName.trim());
          
          if (result.success && result.playerId) {
            // Track connected player
            this.connectedPlayers.set(socket.id, {
              socketId: socket.id,
              roomCode: roomCode,
              playerId: result.playerId
            });

            // Join socket room
            socket.join(roomCode);

            // Notify other players
            socket.to(roomCode).emit('player_joined', {
              playerId: result.playerId,
              playerName: playerName.trim()
            });

            // Broadcast updated game state to all players in room
            this.broadcastGameState(roomCode);
          }

          callback(result);
        } catch (error) {
          console.error('Ошибка присоединения к комнате:', error);
          callback({ success: false, error: 'Не удалось присоединиться к комнате' });
        }
      });

      // Leave room
      socket.on('leave_room', (data) => {
        try {
          const { roomCode, playerId } = data;
          const playerInfo = this.connectedPlayers.get(socket.id);
          
          if (playerInfo && playerInfo.roomCode === roomCode) {
            const success = this.gameManager.leaveRoom(roomCode, playerId);
            
            if (success) {
              // Notify other players
              socket.to(roomCode).emit('player_left', {
                playerId: playerId,
                playerName: 'Unknown' // We'd need to store this info
              });

              // Broadcast updated game state
              this.broadcastGameState(roomCode);
            }

            // Remove from tracking
            this.connectedPlayers.delete(socket.id);
            socket.leave(roomCode);
          }
        } catch (error) {
          console.error('Ошибка выхода из комнаты:', error);
        }
      });

      // Select mission
      socket.on('select_mission', async (data, callback) => {
        try {
          const { roomCode, missionId, playerId } = data;
          console.log(`[Socket] Запрос выбора миссии: комната=${roomCode}, игрок=${playerId}, миссия=${missionId}`);
          
          const result = await this.gameManager.selectMission(roomCode, missionId, playerId);
          
          if (result.success) {
            console.log(`[Socket] Миссия выбрана успешно, рассылаем состояние всем в комнате ${roomCode}`);
            this.broadcastGameState(roomCode);
          } else {
            console.log(`[Socket] Ошибка выбора миссии: ${result.error}`);
          }
          
          callback(result);
        } catch (error) {
          console.error('[Socket] Критическая ошибка при выборе миссии:', error);
          callback({ success: false, error: 'Не удалось выбрать миссию' });
        }
      });

      // Start game
      socket.on('start_game', async (data, callback) => {
        try {
          const { roomCode, playerId } = data;
          console.log(`[Socket] Запрос на запуск игры: комната=${roomCode}, игрок=${playerId}`);
          
          const result = this.gameManager.startGame(roomCode, playerId);
          
          if (result.success) {
            console.log(`[Socket] Игра успешно запущена, рассылаем состояние всем игрокам в комнате ${roomCode}`);
            this.broadcastGameState(roomCode);
            
            // Emit game started event
            console.log(`[Socket] Отправляем событие game_started в комнату ${roomCode}`);
            this.io.to(roomCode).emit('game_started', {
              round: 1,
              phase: 'mission_briefing'
            });
          } else {
            console.log(`[Socket] Ошибка запуска игры: ${result.error}`);
          }
          
          callback(result);
        } catch (error) {
          console.error('[Socket] Критическая ошибка при запуске игры:', error);
          callback({ success: false, error: 'Не удалось запустить игру' });
        }
      });

      // Reveal characteristic
      socket.on('reveal_characteristic', async (data, callback) => {
        try {
          const { roomCode, playerId, categoryIndex } = data;
          console.log(`[Socket] Запрос на раскрытие характеристики: комната=${roomCode}, игрок=${playerId}, категория=${categoryIndex}`);
          
          const result = this.gameManager.revealCharacteristic(roomCode, playerId, categoryIndex);
          
          if (result.success && result.revealed) {
            console.log(`[Socket] Характеристика раскрыта успешно, рассылаем всем в комнате ${roomCode}`);
            // Broadcast to all players in room
            this.io.to(roomCode).emit('characteristic_revealed', result.revealed);
            this.broadcastGameState(roomCode);
            
            // Проверить нужно ли дополнительное обновление после смены фазы
            const room = this.gameManager.getRoom(roomCode);
            if (room?.needsBroadcast) {
              console.log(`[Socket] Дополнительное обновление после смены фазы для ${roomCode}`);
              setTimeout(() => {
                this.broadcastGameState(roomCode);
                room.needsBroadcast = false;
              }, 100);
            }
          } else {
            console.log(`[Socket] Ошибка раскрытия характеристики: ${result.error}`);
          }
          
          callback(result);
        } catch (error) {
          console.error('[Socket] Критическая ошибка при раскрытии характеристики:', error);
          callback({ success: false, error: 'Не удалось раскрыть характеристику' });
        }
      });

      // Submit vote
      socket.on('submit_vote', async (data, callback) => {
        try {
          const { roomCode, playerId, targetPlayerId } = data;
          console.log(`[Socket] Запрос голосования: комната=${roomCode}, игрок=${playerId}, цель=${targetPlayerId}`);
          
          const result = this.gameManager.submitVote(roomCode, playerId, targetPlayerId);
          
          if (result.success) {
            console.log(`[Socket] Голос засчитан, рассылаем состояние всем в комнате ${roomCode}`);
            this.broadcastGameState(roomCode);
            
            // ВАЖНО: Также рассылать через 2.5 секунды для обновления после tallyVotes
            setTimeout(() => {
              console.log(`[Socket] Отложенное обновление после подсчёта голосов для ${roomCode}`);
              this.broadcastGameState(roomCode);
            }, 2500);
          } else {
            console.log(`[Socket] Ошибка голосования: ${result.error}`);
          }
          
          callback(result);
        } catch (error) {
          console.error('[Socket] Критическая ошибка при голосовании:', error);
          callback({ success: false, error: 'Не удалось проголосовать' });
        }
      });

      // Next round
      socket.on('next_round', async (data, callback) => {
        try {
          const { roomCode, playerId } = data;
          const result = this.gameManager.nextRound(roomCode, playerId);
          
          if (result.success) {
            if (result.gameEnded) {
              // Game ended - переход в mission_complete фазу для AI эпилога
              console.log(`[Socket] Игра завершена, переходим в mission_complete фазу для ${roomCode}`);
              // НЕ отправляем mission_completed событие, только broadcastGameState
            } else {
              // Round ended, emit round ended event
              this.io.to(roomCode).emit('round_ended', {
                eliminatedPlayerId: result.eliminatedPlayerId || '',
                remainingPlayers: [] // We'd need to get this from game state
              });
            }
            
            this.broadcastGameState(roomCode);
            
            // Проверить нужно ли дополнительное обновление после смены фазы
            const room = this.gameManager.getRoom(roomCode);
            if (room?.needsBroadcast) {
              console.log(`[Socket] Дополнительное обновление после смены фазы для ${roomCode}`);
              setTimeout(() => {
                this.broadcastGameState(roomCode);
                room.needsBroadcast = false;
              }, 100);
            }
          }
          
          callback(result);
        } catch (error) {
          console.error('Ошибка перехода к следующему раунду:', error);
          callback({ success: false, error: 'Не удалось перейти к следующему раунду' });
        }
      });

      // End mission
      socket.on('end_mission', async (data, callback) => {
        try {
          const { roomCode, playerId, epilogue } = data;
          // This would typically update the mission result in the database
          // For now, we'll just broadcast the completion
          
          const gameStats = this.gameManager.getGameStats(roomCode);
          this.io.to(roomCode).emit('mission_completed', {
            strikeTeam: gameStats?.strikeTeam || [],
            epilogue: epilogue
          });
          
          callback({ success: true });
        } catch (error) {
          console.error('Ошибка завершения миссии:', error);
          callback({ success: false, error: 'Не удалось завершить миссию' });
        }
      });

      // Get game state
      socket.on('get_game_state', async (data, callback) => {
        try {
          const { roomCode } = data;
          const gameState = this.gameManager.getGameStateByRoomCode(roomCode);
          if (gameState) {
            callback({ success: true, gameState });
          } else {
            callback({ success: false, error: 'Комната не найдена' });
          }
        } catch (error) {
          console.error('Ошибка получения состояния игры:', error);
          callback({ success: false, error: 'Не удалось получить состояние игры' });
        }
      });

      // Get missions
      socket.on('get_missions', async (data, callback) => {
        try {
          const { playerCount } = data;
          let missions;
          
          if (playerCount) {
            missions = await this.missionService.getMissionsForPlayerCount(playerCount);
          } else {
            missions = await this.missionService.getAllMissions();
          }
          
          callback({ success: true, missions });
        } catch (error) {
          console.error('Ошибка получения миссий:', error);
          callback({ success: false, error: 'Не удалось получить миссии' });
        }
      });

      // Get my character
      socket.on('get_my_character', async (data, callback) => {
        try {
          const { roomCode, playerId } = data;
          console.log(`[Socket] Запрос персонажа: комната=${roomCode}, игрок=${playerId}`);
          
          const character = this.gameManager.getPlayerCharacter(roomCode, playerId);
          if (character) {
            console.log(`[Socket] Персонаж найден для игрока ${playerId}`);
            callback({ success: true, character });
          } else {
            console.log(`[Socket] Персонаж не найден для игрока ${playerId}`);
            callback({ success: false, error: 'Персонаж не найден' });
          }
        } catch (error) {
          console.error('[Socket] Ошибка получения персонажа:', error);
          callback({ success: false, error: 'Не удалось получить персонаж' });
        }
      });

      // Advance phase (host only)
      socket.on('advance_phase', async (data, callback) => {
        try {
          const { roomCode, playerId } = data;
          console.log(`[Socket] Запрос перехода фазы: комната=${roomCode}, игрок=${playerId}`);
          
          const result = this.gameManager.advancePhase(roomCode, playerId);
          
          if (result.success) {
            console.log(`[Socket] Фаза изменена успешно, рассылаем состояние всем в комнате ${roomCode}`);
            this.broadcastGameState(roomCode);
          } else {
            console.log(`[Socket] Ошибка перехода фазы: ${result.error}`);
          }
          
          callback(result);
        } catch (error) {
          console.error('[Socket] Критическая ошибка при переходе фазы:', error);
          callback({ success: false, error: 'Не удалось перейти к следующей фазе' });
        }
      });

      // Toggle ready to vote
      socket.on('toggle_ready', async (data, callback) => {
        try {
          const { roomCode, playerId } = data;
          console.log(`[Socket] Запрос переключения готовности: комната=${roomCode}, игрок=${playerId}`);
          
          const result = this.gameManager.togglePlayerReady(roomCode, playerId);
          
          if (result.success) {
            console.log(`[Socket] Готовность переключена, рассылаем состояние всем в комнате ${roomCode}`);
            this.broadcastGameState(roomCode);
          } else {
            console.log(`[Socket] Ошибка переключения готовности: ${result.error}`);
          }
          
          callback(result);
        } catch (error) {
          console.error('[Socket] Критическая ошибка при переключении готовности:', error);
          callback({ success: false, error: 'Не удалось переключить готовность' });
        }
      });

      // Set target survivors
      socket.on('set_target_survivors', async (data, callback) => {
        try {
          const { roomCode, playerId, targetSurvivors } = data;
          console.log(`[Socket] Запрос установки цели выживших: комната=${roomCode}, игрок=${playerId}, цель=${targetSurvivors}`);
          
          const result = this.gameManager.setTargetSurvivors(roomCode, playerId, targetSurvivors);
          
          if (result.success) {
            console.log(`[Socket] Цель выживших установлена, рассылаем состояние всем в комнате ${roomCode}`);
            this.broadcastGameState(roomCode);
          } else {
            console.log(`[Socket] Ошибка установки цели выживших: ${result.error}`);
          }
          
          callback(result);
        } catch (error) {
          console.error('[Socket] Критическая ошибка при установке цели выживших:', error);
          callback({ success: false, error: 'Не удалось установить цель выживших' });
        }
      });

      // Generate AI epilogue
      socket.on('generate_epilogue', async (data, callback) => {
        try {
          const { roomCode, playerId } = data;
          console.log(`[Socket] Запрос генерации эпилога: комната=${roomCode}, игрок=${playerId}`);
          
          // Проверить что игрок - хост
          const room = this.gameManager.getRoom(roomCode);
          if (!room) {
            return callback({ success: false, error: 'Комната не найдена' });
          }
          
          const player = room.players.get(playerId);
          if (!player || player.role !== 'host') {
            return callback({ success: false, error: 'Только ГМ может генерировать эпилог' });
          }

          if (room.gamePhase !== 'mission_complete') {
            return callback({ success: false, error: 'Эпилог можно генерировать только после завершения миссии' });
          }

          // Проверить кэш - если эпилог уже сгенерирован, вернуть его
          if (room.aiGeneratedEpilogue) {
            console.log(`[Socket] Возвращаем существующий эпилог для ${roomCode}`);
            return callback({ success: true, epilogue: room.aiGeneratedEpilogue });
          }

          // Проверить что не генерируется уже
          if (room.isGeneratingEpilogue) {
            console.log(`[Socket] Эпилог уже генерируется для ${roomCode}`);
            return callback({ success: false, error: 'Эпилог уже генерируется' });
          }

          // Установить флаг генерации
          room.isGeneratingEpilogue = true;

          // Собрать данные о выживших и исключённых
          const survivors: { playerName: string; character: CharacterCard }[] = [];
          const eliminated: { playerName: string; character: CharacterCard; round: number }[] = [];
          
          for (const [pid, player] of room.players) {
            const character = this.gameManager.getPlayerCharacter(roomCode, pid);
            if (character) {
              if (room.eliminatedPlayers.includes(pid)) {
                // Найти раунд исключения из истории
                const round = this.findEliminationRound(room, pid);
                eliminated.push({ playerName: player.name, character, round });
              } else {
                survivors.push({ playerName: player.name, character });
              }
            }
          }

          console.log(`[Socket] Собираем данные для AI: выживших=${survivors.length}, исключённых=${eliminated.length}`);

          // Генерировать эпилог
          const { AIService } = await import('../services/AIService.js');
          const aiService = new AIService();
          const epilogue = await aiService.generateEpilogue({
            mission: room.selectedMission!,
            survivors,
            eliminated,
            totalRounds: room.currentRound,
            consecutiveSkips: room.consecutiveSkips
          });

          // Сохранить эпилог
          room.aiGeneratedEpilogue = epilogue;
          room.isGeneratingEpilogue = false;

          console.log(`[Socket] Эпилог сгенерирован для ${roomCode}, длина: ${epilogue.length} символов`);
          
          // Разослать обновлённое состояние всем игрокам
          this.broadcastGameState(roomCode);
          
          callback({ success: true, epilogue });
        } catch (error) {
          console.error('[Socket] Ошибка генерации эпилога:', error);
          
          // Сбросить флаг генерации при ошибке
          const room = this.gameManager.getRoom(roomCode);
          if (room) {
            room.isGeneratingEpilogue = false;
          }
          
          callback({ success: false, error: 'Не удалось сгенерировать эпилог' });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log('Клиент отключился:', socket.id);
        
        const playerInfo = this.connectedPlayers.get(socket.id);
        if (playerInfo) {
          // Handle player disconnect
          const success = this.gameManager.leaveRoom(playerInfo.roomCode, playerInfo.playerId);
          
          if (success) {
            // Notify other players
            socket.to(playerInfo.roomCode).emit('player_left', {
              playerId: playerInfo.playerId,
              playerName: 'Unknown' // We'd need to store this info
            });

            // Broadcast updated game state
            this.broadcastGameState(playerInfo.roomCode);
          }

          // Remove from tracking
          this.connectedPlayers.delete(socket.id);
        }
      });
    });
  }

  private broadcastGameState(roomCode: string): void {
    try {
      const gameState = this.gameManager.getGameStateByRoomCode(roomCode);
      if (gameState) {
        this.io.to(roomCode).emit('game_updated', gameState);
      }
    } catch (error) {
      console.error('Ошибка при рассылке состояния игры:', error);
    }
  }

  private findEliminationRound(room: GameRoom, playerId: string): number {
    // Ищем в истории раундов
    for (const round of room.roundHistory) {
      if (round.eliminatedPlayerId === playerId) {
        return round.round;
      }
    }
    
    // Если не найдено в истории, возвращаем текущий раунд
    return room.currentRound;
  }
}
