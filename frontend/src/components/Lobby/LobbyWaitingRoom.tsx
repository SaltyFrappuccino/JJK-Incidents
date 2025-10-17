import React, { useState, useEffect } from 'react';
import { useGame, Mission } from '../../contexts/GameContext';

interface LobbyWaitingRoomProps {
  roomCode: string;
  onGameStarted: () => void;
}

export function LobbyWaitingRoom({ roomCode, onGameStarted }: LobbyWaitingRoomProps) {
  const [selectedMission, setSelectedMission] = useState<string>('');
  const [isStarting, setIsStarting] = useState(false);
  const [targetSurvivors, setTargetSurvivorsState] = useState<number>(3);
  const { 
    myPlayer, 
    gameState, 
    missions, 
    selectMission, 
    startGame, 
    fetchMissions, 
    error, 
    clearError,
    setTargetSurvivors
  } = useGame();

  const isHost = myPlayer?.role === 'host';
  const playerCount = gameState?.players?.length || 0;
  const canStart = playerCount >= 3 && selectedMission && isHost;

  useEffect(() => {
    // Fetch available missions
    fetchMissions();
  }, [fetchMissions]);

  useEffect(() => {
    // Update targetSurvivors from gameState only if value actually changed
    if (gameState?.targetSurvivors && gameState.targetSurvivors !== targetSurvivors) {
      setTargetSurvivorsState(gameState.targetSurvivors);
    }
  }, [gameState?.targetSurvivors, targetSurvivors]);

  const handleMissionSelect = async (missionId: string) => {
    if (!isHost) return;
    
    setSelectedMission(missionId);
    clearError();
    
    try {
      const result = await selectMission(missionId);
      if (!result.success) {
        setSelectedMission('');
      }
    } catch (err) {
      console.error('Failed to select mission:', err);
      setSelectedMission('');
    }
  };

  const handleTargetSurvivorsChange = async (newValue: number) => {
    if (!isHost) return;
    if (newValue < 1 || newValue >= playerCount) return;
    
    setTargetSurvivorsState(newValue);
    
    try {
      const result = await setTargetSurvivors(newValue);
      if (!result.success) {
        console.error('Failed to set target survivors:', result.error);
        // Revert on error
        if (gameState?.targetSurvivors) {
          setTargetSurvivorsState(gameState.targetSurvivors);
        }
      }
    } catch (err) {
      console.error('Error setting target survivors:', err);
      if (gameState?.targetSurvivors) {
        setTargetSurvivorsState(gameState.targetSurvivors);
      }
    }
  };

  const handleStartGame = async () => {
    if (!canStart) return;
    
    setIsStarting(true);
    clearError();
    
    try {
      await startGame();
      // Переход в игру теперь автоматический через App.tsx при получении game_started event
    } catch (err) {
      console.error('Failed to start game:', err);
    } finally {
      setIsStarting(false);
    }
  };

  const selectedMissionData = missions.find(m => m.id === selectedMission);

  return (
    <div className="lobby-waiting-room">
      <div className="room-header">
        <h2>Комната: {roomCode}</h2>
        <div className="player-count">
          Игроки: {playerCount}/16
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="lobby-content">
        <div className="players-section">
          <h3>Игроки в Комнате</h3>
          <div className="players-list">
            {gameState?.players?.map((player) => (
              <div 
                key={player.id} 
                className={`player-item ${player.role === 'host' ? 'host' : ''} ${player.id === myPlayer?.id ? 'current-player' : ''}`}
              >
                <span className="player-name">{player.name}</span>
                {player.role === 'host' && <span className="host-badge">ХОЗЯИН</span>}
                {player.id === myPlayer?.id && <span className="you-badge">ВЫ</span>}
              </div>
            )) || <div className="no-players">Нет игроков в комнате</div>}
          </div>
        </div>

        {isHost && (
          <div className="mission-section">
            <h3>Настройки Игры</h3>
            <div className="game-settings">
              <div className="setting-item">
                <label htmlFor="target-survivors">
                  Количество выживших для завершения:
                </label>
                <input 
                  type="number"
                  id="target-survivors"
                  min="1"
                  max={Math.max(1, playerCount - 1)}
                  value={targetSurvivors}
                  onChange={(e) => handleTargetSurvivorsChange(Number(e.target.value))}
                  disabled={gameState?.gameStarted || false}
                />
                <span className="setting-hint">
                  Игра закончится когда останется {targetSurvivors} или меньше игроков
                </span>
              </div>
            </div>

            <h3>Выберите Миссию</h3>
            <div className="missions-list">
              {missions.map((mission) => (
                <div 
                  key={mission.id} 
                  className={`mission-card ${selectedMission === mission.id ? 'selected' : ''}`}
                  onClick={() => handleMissionSelect(mission.id)}
                >
                  <div className="mission-header">
                    <h4>{mission.name}</h4>
                    <div className="mission-meta">
                      <span className="difficulty">{mission.difficulty}</span>
                    </div>
                  </div>
                  <p className="mission-description">{mission.description}</p>
                  <div className="mission-threat">
                    <strong>Угроза:</strong> {mission.threat}
                  </div>
                </div>
              ))}
            </div>

            {selectedMissionData && (
              <div className="selected-mission-details">
                <h4>Выбранная Миссия: {selectedMissionData.name}</h4>
                <div className="mission-objectives">
                  <strong>Цели:</strong>
                  <ul>
                    {selectedMissionData.objectives?.map((objective, index) => (
                      <li key={index}>{objective}</li>
                    )) || <li>Цели не определены</li>}
                  </ul>
                </div>
                <div className="mission-dangers">
                  <strong>Факторы Опасности:</strong>
                  <ul>
                    {selectedMissionData.dangerFactors?.map((danger, index) => (
                      <li key={index}>{danger}</li>
                    )) || <li>Факторы опасности не определены</li>}
                  </ul>
                </div>
              </div>
            )}

            <div className="start-game-section">
              <button 
                className="btn btn-primary btn-large"
                onClick={handleStartGame}
                disabled={!canStart || isStarting}
              >
                {isStarting ? 'Запуск...' : 'Начать Миссию'}
              </button>
              {!canStart && (
                <div className="start-requirements">
                  {playerCount < 3 && <p>Нужно минимум 3 игрока для начала</p>}
                  {!selectedMission && <p>Пожалуйста, выберите миссию</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {!isHost && (
          <div className="waiting-section">
            <h3>Ожидание Мастера Игры</h3>
            <p>Мастер Игры выберет миссию и запустит игру.</p>
            <div className="waiting-indicator">
              <div className="spinner"></div>
              <span>Ожидание...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
