import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useGame } from '../../contexts/GameContext';
import { MissionBriefing } from './MissionBriefing';
import { RevealPhase } from './RevealPhase';
import { DiscussionPhase } from './DiscussionPhase';
import { VotingPhase } from './VotingPhase';
import { RoundEnd } from './RoundEnd';
import { PlayerList } from './PlayerList';
import { MissionContext } from './MissionContext';
import { TeamTable } from './TeamTable';
import { CharacterSheet } from './CharacterSheet';
import { AbilitiesPanel } from './AbilitiesPanel';
import { AbilityNotification } from './AbilityNotification';

type GameLoopPhase = 'mission_briefing' | 'reveal' | 'discussion' | 'voting' | 'round_end' | 'mission_complete';

interface GameLoopProps {
  onGameComplete: () => void;
}

export function GameLoop({ onGameComplete }: GameLoopProps) {
  const { gameState, myPlayer, myCharacter, nextRound, fetchMyCharacter, fetchMyAbilities, advancePhase, revealCharacteristic, generateAIEpilogue } = useGame();
  const [isGenerating, setIsGenerating] = useState(false);
  const [eliminatedPlayerId, setEliminatedPlayerId] = useState<string | null>(null);
  const [isAdvancingRound, setIsAdvancingRound] = useState(false);
  const generationAttemptedRef = useRef(false);

  // Используем gameState.phase напрямую, без local state
  const currentPhase = gameState?.phase as GameLoopPhase || 'mission_briefing';
  
  console.log('[GameLoop] Текущая фаза:', currentPhase);
  console.log('[GameLoop] gameState:', gameState);

  // Загрузить персонажа и способности при входе в игру
  useEffect(() => {
    if (gameState?.gameStarted && !myCharacter) {
      console.log('[GameLoop] Загружаем персонажа при входе в игру');
      fetchMyCharacter();
      fetchMyAbilities();
    }
  }, [gameState?.gameStarted, myCharacter, fetchMyCharacter, fetchMyAbilities]);

  // Обработчик генерации AI эпилога
  const handleGenerateAIEpilogue = useCallback(async () => {
    setIsGenerating(true);
    try {
      console.log('[GameLoop] Генерируем AI эпилог...');
      const result = await generateAIEpilogue();
      if (result.success && result.epilogue) {
        console.log('[GameLoop] AI эпилог сгенерирован');
        // Эпилог теперь сохраняется в gameState через generateAIEpilogue
      } else {
        console.error('[GameLoop] Ошибка генерации AI эпилога:', result.error);
        alert(`Ошибка генерации эпилога: ${result.error}`);
      }
    } catch (error) {
      console.error('[GameLoop] Ошибка при генерации AI эпилога:', error);
      alert('Ошибка при генерации эпилога');
    } finally {
      setIsGenerating(false);
    }
  }, [generateAIEpilogue]);

  // Обработчик раскрытия характеристики
  const handleReveal = async (categoryIndex: number) => {
    try {
      console.log('[GameLoop] Раскрываем характеристику:', categoryIndex);
      const result = await revealCharacteristic(categoryIndex);
      if (result.success) {
        console.log('[GameLoop] Характеристика успешно раскрыта');
      } else {
        console.error('[GameLoop] Ошибка раскрытия характеристики:', result.error);
      }
    } catch (error) {
      console.error('[GameLoop] Ошибка при раскрытии характеристики:', error);
    }
  };

  // Автоматически генерировать эпилог при переходе в mission_complete
  useEffect(() => {
    console.log('[GameLoop] useEffect для генерации эпилога:', {
      phase: gameState?.phase,
      isHost: myPlayer?.role === 'host',
      hasEpilogue: !!gameState?.aiGeneratedEpilogue,
      isGenerating,
      generationAttempted: generationAttemptedRef.current
    });
    
    if (
      gameState?.phase === 'mission_complete' && 
      myPlayer?.role === 'host' && 
      !gameState?.aiGeneratedEpilogue && 
      !isGenerating &&
      !generationAttemptedRef.current
    ) {
      console.log('[GameLoop] Автоматически генерируем эпилог для ГМ');
      generationAttemptedRef.current = true;
      handleGenerateAIEpilogue();
    }
  }, [gameState?.phase, myPlayer?.role, gameState?.aiGeneratedEpilogue, isGenerating]);

  // Сбросить флаг генерации при выходе из фазы mission_complete
  useEffect(() => {
    if (gameState?.phase !== 'mission_complete') {
      generationAttemptedRef.current = false;
    }
  }, [gameState?.phase]);

  const handleSaveEpilogue = (epilogue: string) => {
    // Сохраняем эпилог и завершаем игру
    console.log('[GameLoop] Сохраняем эпилог:', epilogue);
    // Здесь можно добавить отправку эпилога на сервер
    onGameComplete();
  };


  const handleBriefingComplete = async () => {
    console.log('[GameLoop] Брифинг завершен, переходим к фазе reveal');
    try {
      const result = await advancePhase();
      if (result.success) {
        console.log('[GameLoop] Фаза успешно изменена на reveal');
      } else {
        console.error('[GameLoop] Ошибка перехода фазы:', result.error);
      }
    } catch (error) {
      console.error('[GameLoop] Ошибка при завершении брифинга:', error);
    }
  };

  const handleRevealComplete = () => {
    // Фазы теперь управляются backend автоматически
    console.log('[GameLoop] Раскрытие завершено, ждем перехода фазы от backend');
  };

  const handleDiscussionComplete = () => {
    // Фазы теперь управляются backend автоматически
    console.log('[GameLoop] Обсуждение завершено, ждем перехода фазы от backend');
  };

  const handleVotingComplete = async () => {
    if (!myPlayer || myPlayer.role !== 'host') return;

    setIsAdvancingRound(true);
    try {
      const result = await nextRound();
      if (result.success) {
        if (result.gameEnded) {
          // Фаза mission_complete будет установлена backend
        } else {
          setEliminatedPlayerId(result.eliminatedPlayerId || null);
          // Фаза round_end будет установлена backend
        }
      }
    } catch (error) {
      console.error('Error advancing round:', error);
    } finally {
      setIsAdvancingRound(false);
    }
  };

  const handleRoundEndComplete = () => {
    // Переход к эпилогу или следующему раунду управляется RoundEnd
    console.log('[GameLoop] Переход к эпилогу');
  };

  const handleMissionComplete = () => {
    onGameComplete();
  };

  const renderCurrentPhase = () => {
    console.log('[GameLoop] renderCurrentPhase вызвана с фазой:', currentPhase);
    console.log('[GameLoop] gameState в renderCurrentPhase:', gameState);
    
    if (!gameState) {
      console.log('[GameLoop] gameState отсутствует в renderCurrentPhase');
      return (
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Загрузка игры...</p>
        </div>
      );
    }
    
    switch (currentPhase) {
      case 'mission_briefing':
        return <MissionBriefing onBriefingComplete={handleBriefingComplete} />;
      
      case 'reveal':
        return <RevealPhase onPhaseComplete={handleRevealComplete} />;
      
      case 'discussion':
        return <DiscussionPhase onPhaseComplete={handleDiscussionComplete} />;
      
      case 'voting':
        return <VotingPhase onPhaseComplete={handleVotingComplete} />;
      
      case 'round_end':
        return (
          <RoundEnd 
            onPhaseComplete={handleRoundEndComplete} 
          />
        );
      
      case 'mission_complete':
        console.log('[GameLoop] Рендерим mission_complete фазу');
        console.log('[GameLoop] myPlayer:', myPlayer);
        console.log('[GameLoop] myPlayer.role:', myPlayer?.role);
        console.log('[GameLoop] isHost:', myPlayer?.role === 'host');
        console.log('[GameLoop] gameState:', gameState);
        console.log('[GameLoop] aiGeneratedEpilogue:', gameState?.aiGeneratedEpilogue);
        console.log('[GameLoop] isGenerating:', isGenerating);
        
        return (
          <div className="mission-complete">
            <h2>Миссия Завершена</h2>
            
            {!gameState?.aiGeneratedEpilogue ? (
              myPlayer?.role === 'host' ? (
                <div className="epilogue-generating">
                  <div className="spinner"></div>
                  <p>🤖 AI генерирует эпилог на основе результатов игры...</p>
                  <button 
                    className="btn btn-secondary"
                    onClick={handleGenerateAIEpilogue}
                    disabled={isGenerating}
                  >
                    {isGenerating ? 'Генерация...' : 'Генерировать вручную'}
                  </button>
                </div>
              ) : (
                <div className="waiting-for-epilogue">
                  <div className="spinner"></div>
                  <span>Ожидание эпилога от Мастера Игры...</span>
                </div>
              )
            ) : (
              <div className="generated-epilogue-preview">
                <h3>Эпилог миссии:</h3>
                <div className="epilogue-text">
                  <ReactMarkdown>{gameState.aiGeneratedEpilogue}</ReactMarkdown>
                </div>
                {myPlayer?.role === 'host' && (
                  <div className="epilogue-actions">
                    <button 
                      className="btn btn-primary btn-large"
                      onClick={() => handleSaveEpilogue(gameState.aiGeneratedEpilogue)}
                    >
                      ✅ Завершить миссию
                    </button>
                    <button 
                      className="btn btn-secondary"
                      onClick={handleGenerateAIEpilogue}
                      disabled={isGenerating}
                    >
                      🔄 Сгенерировать заново
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      
      default:
        return (
          <div className="unknown-phase">
            <h2>Неизвестная Фаза</h2>
            <p>Текущая фаза: {currentPhase}</p>
          </div>
        );
    }
  };

  const getPhaseTitle = () => {
    const titles: Record<GameLoopPhase, string> = {
      'mission_briefing': 'Брифинг Миссии',
      'reveal': 'Фаза Раскрытия',
      'discussion': 'Фаза Обсуждения',
      'voting': 'Фаза Голосования',
      'round_end': 'Результаты Раунда',
      'mission_complete': 'Миссия Завершена'
    };
    return titles[currentPhase] || 'Игровая Фаза';
  };

  const getPhaseDescription = () => {
    const descriptions: Record<GameLoopPhase, string> = {
      'mission_briefing': 'Изучите детали миссии и подготовьтесь к вызову',
      'reveal': 'Выберите, какую характеристику раскрыть команде',
      'discussion': 'Обсудите и оцените способности членов команды',
      'voting': 'Голосуйте за игрока, которого считаете наименее ценным',
      'round_end': 'Просмотрите результаты исключения и статус команды',
      'mission_complete': 'Миссия завершена - просмотрите финальные результаты'
    };
    return descriptions[currentPhase] || '';
  };

  return (
    <div className="game-loop">
      <div className="game-header">
        <div className="game-info">
          <h1>{getPhaseTitle()}</h1>
          <p className="phase-description">{getPhaseDescription()}</p>
        </div>
        
        <div className="game-status">
          <div className="room-info">
            <span className="room-code">Комната: {gameState?.roomCode}</span>
            <span className="round-number">Раунд {gameState?.round}</span>
          </div>
          
          <div className="team-status">
            <span>Команда: {gameState?.players.length || 0}</span>
            <span>Требуется: {gameState?.strikeTeamSize || 0}</span>
          </div>
        </div>
      </div>

      {/* Вверху - ваш персонаж */}
      {myCharacter && (
        <div className="my-character-section">
          <CharacterSheet 
            character={myCharacter}
            isOwner={true}
            onCharacteristicSelect={handleReveal}
            canSelect={currentPhase === 'reveal' && !myPlayer?.hasRevealed}
          />
        </div>
      )}

      {/* По центру - текущая фаза */}
      <div className="main-phase-content">
        {renderCurrentPhase()}
      </div>

      {/* Панель активных способностей */}
      <AbilitiesPanel />

      {/* Уведомления о способностях */}
      <AbilityNotification />

      {/* Внизу - таблица команды */}
      <TeamTable />
    </div>
  );
}

