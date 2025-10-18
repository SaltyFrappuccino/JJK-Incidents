import React, { useState, useEffect } from 'react';
import { useGame, RevealedCharacteristic } from '../../contexts/GameContext';

interface DiscussionPhaseProps {
  onPhaseComplete: () => void;
}

export function DiscussionPhase({ onPhaseComplete }: DiscussionPhaseProps) {
  const { gameState, revealedCharacteristics, toggleReady, myPlayer } = useGame();
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes for discussion

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onPhaseComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onPhaseComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getPlayerName = (playerId: string) => {
    const player = gameState?.players.find(p => p.id === playerId);
    return player?.name || 'Неизвестный Игрок';
  };

  const getCategoryIcon = (categoryName: string) => {
    const icons: Record<string, string> = {
      'Ранг': '⭐',
      'Проклятая Техника': '⚡',
      'Уровень Проклятой Энергии': '🔥',
      'Общие Техники': '🛡️',
      'Проклятые Инструменты': '🗡️',
      'Сильные Стороны': '💪',
      'Слабые Стороны': '⚠️',
      'Особые Черты': '✨',
      'Текущее Состояние': '🧠'
    };
    return icons[categoryName] || '📋';
  };

  const roundCharacteristics = revealedCharacteristics.filter(rc => 
    rc.round === gameState?.round
  );

  const readyCount = gameState?.players.filter(p => p.readyToVote).length || 0;
  const totalPlayers = gameState?.players.length || 0;
  const isReady = myPlayer?.readyToVote || false;

  const handleToggleReady = async () => {
    try {
      await toggleReady();
    } catch (error) {
      console.error('Ошибка переключения готовности:', error);
    }
  };

  return (
    <div className="discussion-phase">
      <div className="phase-header">
        <h2>Фаза Обсуждения</h2>
        <div className="phase-timer">
          <span className="timer-label">Время обсуждения:</span>
          <span className={`timer-value ${timeLeft <= 60 ? 'warning' : ''}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      <div className="discussion-content">
        <div className="skip-vote-section">
          <div className="vote-status">
            <div className="ready-count">
              <span>Готовы к голосованию: {readyCount}/{totalPlayers}</span>
            </div>
            <button 
              className={`btn ${isReady ? 'btn-secondary' : 'btn-primary'}`}
              onClick={handleToggleReady}
            >
              {isReady ? 'Отменить готовность' : 'Готов к голосованию'}
            </button>
          </div>
          
          {readyCount > 0 && (
            <div className="ready-players">
              <h4>Готовы к голосованию:</h4>
              <div className="ready-list">
                {gameState?.players
                  .filter(p => p.readyToVote)
                  .map(player => (
                    <div key={player.id} className="ready-player">
                      {player.name}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className="revealed-info">
          <h3>Раскрыто в Этом Раунде</h3>
          {roundCharacteristics.length === 0 ? (
            <div className="no-reveals">
              <p>Характеристики еще не были раскрыты.</p>
            </div>
          ) : (
            <div className="characteristics-grid">
              {roundCharacteristics.map((characteristic, index) => (
                <div key={index} className="revealed-characteristic">
                  <div className="characteristic-header">
                    <span className="player-name">{getPlayerName(characteristic.playerId)}</span>
                    <span className="category-icon">
                      {getCategoryIcon(characteristic.categoryName)}
                    </span>
                    <span className="category-name">{characteristic.categoryName}</span>
                  </div>
                  <div className="characteristic-value">
                    {characteristic.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>


        <div className="discussion-progress">
          <div className="time-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${((300 - timeLeft) / 300) * 100}%` }}
              ></div>
            </div>
            <span className="time-remaining">
              {timeLeft > 60 ? `Осталось ${formatTimeRemaining(timeLeft)}` : `Осталось ${timeLeft}с`}
            </span>
          </div>

          {timeLeft <= 60 && (
            <div className="time-warning">
              ⚠️ Время обсуждения скоро закончится! Подготовьтесь к фазе голосования.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
