import React, { useState } from 'react';
import { useGame } from '../../contexts/GameContext';

interface RoundEndProps {
  onPhaseComplete: () => void;
}

export function RoundEnd({ onPhaseComplete }: RoundEndProps) {
  const { gameState, myPlayer, nextRound } = useGame();
  const [isAdvancing, setIsAdvancing] = useState(false);
  
  if (!gameState) return <div>Загрузка...</div>;

  const isHost = myPlayer?.role === 'host';
  const eliminatedPlayer = gameState.lastVoteResult?.eliminatedId 
    ? gameState.players.find(p => p.id === gameState.lastVoteResult?.eliminatedId)
    : null;
  
  const remainingPlayers = gameState.players.length - gameState.eliminatedPlayers.length;
  const requiredPlayers = gameState.selectedMission?.requiredPlayers || 0;
  
  // Проверка: достигнут ли минимум игроков для миссии
  const missionCanContinue = remainingPlayers >= requiredPlayers;
  const shouldEndMission = !missionCanContinue;

  const handleNextRound = async () => {
    if (!isHost) return;
    
    setIsAdvancing(true);
    try {
      const result = await nextRound();
      if (result.success) {
        if (result.gameEnded) {
          // Игра закончилась - переход к epilogue
          onPhaseComplete();
        }
        // Иначе автоматически перейдёт к reveal
      }
    } catch (error) {
      console.error('Ошибка перехода к следующему раунду:', error);
    } finally {
      setIsAdvancing(false);
    }
  };

  return (
    <div className="round-end">
      <h2>Результаты Раунда {gameState.round}</h2>
      
      <div className="vote-results">
        {eliminatedPlayer ? (
          <div className="eliminated-announcement">
            <h3>Игрок исключён</h3>
            <p>{eliminatedPlayer.name} был исключён командой.</p>
          </div>
        ) : (
          <div className="no-elimination">
            <h3>Никто не исключён</h3>
            <p>Голосование не привело к исключению.</p>
            {gameState.consecutiveSkips > 0 && (
              <p className="skip-warning">
                Пропусков подряд: {gameState.consecutiveSkips}/2
                {gameState.consecutiveSkips >= 2 && ' ⚠️ Следующий раунд обязательно кого-то исключить!'}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mission-status">
        <h3>Статус миссии</h3>
        <p>Осталось игроков: {remainingPlayers}</p>
        <p>Требуется минимум: {requiredPlayers}</p>
        
        {shouldEndMission ? (
          <div className="mission-failed">
            <p className="error">❌ Недостаточно игроков для продолжения миссии!</p>
            <p>Миссия провалена.</p>
          </div>
        ) : (
          <div className="mission-continues">
            <p className="success">✅ Миссия продолжается</p>
            <p>Переход к следующему раунду раскрытия.</p>
          </div>
        )}
      </div>

      {isHost && (
        <div className="host-actions">
          <button
            className="btn btn-primary btn-large"
            onClick={handleNextRound}
            disabled={isAdvancing}
          >
            {isAdvancing ? 'Переход...' : shouldEndMission ? 'Завершить миссию' : 'Следующий раунд'}
          </button>
        </div>
      )}

      {!isHost && (
        <div className="waiting-for-host">
          <p>Ожидание решения Мастера Игры...</p>
        </div>
      )}
    </div>
  );
}
