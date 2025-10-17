import React, { useState } from 'react';
import { useGame, RevealedCharacteristic } from '../../contexts/GameContext';

interface PlayerListProps {
  showVoteTargets?: boolean;
  onPlayerSelect?: (playerId: string) => void;
  selectedPlayerId?: string;
}

export function PlayerList({ showVoteTargets = false, onPlayerSelect, selectedPlayerId }: PlayerListProps) {
  const { gameState, revealedCharacteristics, myPlayer } = useGame();
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  if (!gameState) return null;

  const getPlayerRevealedCharacteristics = (playerId: string): RevealedCharacteristic[] => {
    return revealedCharacteristics.filter(rc => rc.playerId === playerId);
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

  const isClickable = showVoteTargets && onPlayerSelect;
  const isSelected = (playerId: string) => selectedPlayerId === playerId;

  const groupCharacteristics = (characteristics: RevealedCharacteristic[]) => {
    const combat = characteristics.filter(c => 
      ['Ранг', 'Проклятая Техника', 'Уровень Проклятой Энергии', 'Общие Техники', 'Проклятые Инструменты'].includes(c.categoryName)
    );
    const traits = characteristics.filter(c => 
      ['Сильные Стороны', 'Слабые Стороны', 'Особые Черты'].includes(c.categoryName)
    );
    const state = characteristics.filter(c => 
      ['Текущее Состояние'].includes(c.categoryName)
    );
    
    return { combat, traits, state };
  };

  const getPlayerInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase();
  };

  return (
    <div className="player-list">
      <h3>Члены Команды</h3>
      <div className="players-grid">
        {gameState.players.map((player) => {
          const playerCharacteristics = getPlayerRevealedCharacteristics(player.id);
          const isCurrentPlayer = player.id === myPlayer?.id;
          const canSelect = isClickable && player.id !== myPlayer?.id;
          const isExpanded = expandedPlayer === player.id;
          const groupedChars = groupCharacteristics(playerCharacteristics);

          return (
            <div
              key={player.id}
              className={`player-card enhanced ${isCurrentPlayer ? 'current-player' : ''} ${player.role === 'host' ? 'host' : ''} ${canSelect ? 'clickable' : ''} ${isSelected(player.id) ? 'selected' : ''} ${isExpanded ? 'expanded' : ''}`}
              onClick={() => {
                if (canSelect) {
                  onPlayerSelect?.(player.id);
                } else {
                  setExpandedPlayer(isExpanded ? null : player.id);
                }
              }}
            >
              <div className="player-header">
                <div className="player-avatar">
                  {getPlayerInitials(player.name)}
                </div>
                <div className="player-info">
                  <div className="player-name">{player.name}</div>
                  <div className="player-badges">
                    {player.role === 'host' && <span className="host-badge">МИ</span>}
                    {isCurrentPlayer && <span className="you-badge">Вы</span>}
                    {player.readyToVote && <span className="ready-badge">✓</span>}
                  </div>
                </div>
                <div className="player-status">
                  {player.isConnected ? (
                    <span className="status-online">● Онлайн</span>
                  ) : (
                    <span className="status-offline">● Офлайн</span>
                  )}
                </div>
              </div>

              <div className="characteristics-summary">
                <div className="category-icons">
                  {playerCharacteristics.map((char, index) => (
                    <span 
                      key={index} 
                      className="cat-icon" 
                      title={`${char.categoryName}: ${char.value}`}
                    >
                      {getCategoryIcon(char.categoryName)}
                    </span>
                  ))}
                </div>
                <span className="reveal-count">
                  {playerCharacteristics.length}/9
                </span>
              </div>

              {isExpanded && (
                <div className="characteristics-details">
                  {groupedChars.combat.length > 0 && (
                    <div className="char-group combat">
                      <h5>⚔️ Боевые</h5>
                      {groupedChars.combat.map((char, index) => (
                        <div key={index} className="char-item">
                          <span className="char-label">{char.categoryName}</span>
                          <span className="char-value">{char.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {groupedChars.traits.length > 0 && (
                    <div className="char-group traits">
                      <h5>✨ Черты</h5>
                      {groupedChars.traits.map((char, index) => (
                        <div key={index} className={`char-item ${char.categoryName.includes('Слабые') ? 'negative' : 'positive'}`}>
                          <span className="char-label">{char.categoryName}</span>
                          <span className="char-value">{char.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {groupedChars.state.length > 0 && (
                    <div className="char-group state">
                      <h5>🧠 Состояние</h5>
                      {groupedChars.state.map((char, index) => (
                        <div key={index} className="char-item">
                          <span className="char-label">{char.categoryName}</span>
                          <span className="char-value">{char.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {playerCharacteristics.length === 0 && (
                <div className="no-reveals">
                  <span>Характеристики еще не раскрыты</span>
                </div>
              )}

              {player.role === 'host' && (
                <div className="host-indicator">
                  Мастер Игры
                </div>
              )}

              {isCurrentPlayer && (
                <div className="current-player-indicator">
                  Ваш Персонаж
                </div>
              )}
            </div>
          );
        })}
      </div>

      {gameState.eliminatedPlayers.length > 0 && (
        <div className="eliminated-players">
          <h4>Исключенные Игроки</h4>
          <div className="eliminated-list">
            {gameState.eliminatedPlayers.map((playerId) => {
              const player = gameState.players.find(p => p.id === playerId);
              return player ? (
                <div key={playerId} className="eliminated-player">
                  <span className="eliminated-name">{player.name}</span>
                  <span className="eliminated-status">Исключен</span>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
