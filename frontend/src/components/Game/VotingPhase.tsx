import React, { useState, useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';

interface VotingPhaseProps {
  onPhaseComplete: () => void;
}

export function VotingPhase({ onPhaseComplete }: VotingPhaseProps) {
  const { gameState, submitVote, myPlayer } = useGame();
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds to vote
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  const activePlayers = gameState?.players.filter(p => !gameState.eliminatedPlayers.includes(p.id)) || [];
  const eligiblePlayers = activePlayers.filter(p => p.id !== myPlayer?.id);
  const consecutiveSkips = gameState?.consecutiveSkips || 0;

  useEffect(() => {
    // Check if player has already voted
    if (myPlayer?.hasVoted) {
      setHasVoted(true);
      setSelectedPlayer(myPlayer.voteTarget || null);
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Auto-vote if player hasn't chosen
          if (selectedPlayer && !hasVoted) {
            handleVote();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedPlayer, hasVoted, myPlayer]);

  const handlePlayerSelect = (playerId: string) => {
    if (hasVoted || isVoting) return;
    setSelectedPlayer(playerId);
  };

  const handleVote = async () => {
    if (hasVoted || isVoting) return;

    setIsVoting(true);
    try {
      const result = await submitVote(selectedPlayer); // selectedPlayer может быть null для пропуска
      if (result.success) {
        setHasVoted(true);
      } else {
        console.error('Failed to submit vote:', result.error);
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
    } finally {
      setIsVoting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playersWhoHaveVoted = activePlayers.filter(p => p.hasVoted).length;
  const totalPlayers = activePlayers.length;

  return (
    <div className="voting-phase">
      <div className="phase-header">
        <h2>Фаза Голосования</h2>
        <div className="phase-timer">
          <span className="timer-label">Время голосования:</span>
          <span className={`timer-value ${timeLeft <= 10 ? 'warning' : ''}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      <div className="voting-content">
        <div className="voting-instructions">
          <div className="instruction-card">
            <h3>Голосование за Исключение</h3>
            <p>
              Голосуйте за игрока, которого считаете НАИМЕНЕЕ ценным для миссии. 
              Учитывайте всю раскрытую информацию и выбирайте стратегически.
            </p>

            <div className="voting-progress">
              <div className="progress-stats">
                <span>Игроки, которые проголосовали: {playersWhoHaveVoted}/{totalPlayers}</span>
              </div>
              
              {hasVoted && (
                <div className="voted-confirmation">
                  ✓ Вы подали свой голос
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="voting-options">
          <h3>Выберите Игрока для Исключения</h3>
          <div className="players-grid">
            {/* Опция пропуска */}
            <div
              className={`player-vote-card skip-option ${selectedPlayer === null ? 'selected' : ''} ${consecutiveSkips >= 2 ? 'disabled' : ''}`}
              onClick={() => consecutiveSkips < 2 && setSelectedPlayer(null)}
            >
              <div className="player-info">
                <div className="player-name">Никого не исключать</div>
                <div className="player-status">
                  {consecutiveSkips >= 2 ? '⚠️ Нельзя пропустить 3 раза!' : 'Пропустить голосование'}
                </div>
              </div>
              {selectedPlayer === null && consecutiveSkips < 2 && (
                <div className="vote-indicator">
                  <span className="checkmark">✓</span>
                  <span>Выбрано для пропуска</span>
                </div>
              )}
            </div>

            {eligiblePlayers.map((player) => {
              const isSelected = selectedPlayer === player.id;
              const isClickable = !hasVoted && !isVoting;

              return (
                <div
                  key={player.id}
                  className={`player-vote-card ${isSelected ? 'selected' : ''} ${isClickable ? 'clickable' : ''}`}
                  onClick={() => isClickable && handlePlayerSelect(player.id)}
                >
                  <div className="player-info">
                    <div className="player-name">{player.name}</div>
                    <div className="player-role">
                      {player.role === 'host' && <span className="host-badge">МИ</span>}
                    </div>
                  </div>

                  <div className="vote-indicator">
                    {isSelected && (
                      <div className="selected-indicator">
                        ✓ Выбрано для исключения
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="voting-actions">
          {selectedPlayer !== undefined && !hasVoted && (
            <button
              className="btn btn-primary btn-large"
              onClick={handleVote}
              disabled={isVoting}
            >
              {isVoting ? 'Подача голоса...' : 'Подать Голос'}
            </button>
          )}

          {hasVoted && (
            <div className="waiting-for-others">
              <div className="spinner"></div>
              <span>Ожидание других игроков для голосования...</span>
            </div>
          )}

          {timeLeft <= 10 && !hasVoted && selectedPlayer && (
            <div className="time-warning">
              ⚠️ Время голосования истекает! Ваш голос будет подан автоматически.
            </div>
          )}
        </div>

        <div className="voting-reminder">
          <div className="reminder-card">
            <h4>Помните</h4>
            <ul>
              <li>Голосуйте за игрока, которого считаете наименее ценным для миссии</li>
              <li>Учитывайте все раскрытые способности и их соответствие требованиям миссии</li>
              <li>Думайте о составе команды и синергии</li>
              <li>Ваш голос секретен до подсчета всех голосов</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
