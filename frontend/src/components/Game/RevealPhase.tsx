import React from 'react';
import { useGame } from '../../contexts/GameContext';

interface RevealPhaseProps {
  onPhaseComplete: () => void;
}

export function RevealPhase({ onPhaseComplete }: RevealPhaseProps) {
  const { gameState } = useGame();
  
  if (!gameState) {
    return <div>Загрузка...</div>;
  }

  const activePlayers = gameState.players.filter(p => !gameState.eliminatedPlayers.includes(p.id));
  const requiredReveals = gameState.round === 1 ? 2 : 1;
  const playersWithRequiredReveals = activePlayers.filter(p => p.revealedCount >= requiredReveals).length;
  const totalPlayers = activePlayers.length;

  return (
    <div className="reveal-phase-info">
      <h2>Фаза Раскрытия</h2>
      <p>
        {gameState.round === 1 
          ? "Выберите 2 характеристики для раскрытия в вашем листе персонажа выше."
          : "Выберите характеристику для раскрытия в вашем листе персонажа выше."
        }
      </p>
      <div className="reveal-status">
        <span>
          {gameState.round === 1 
            ? `Завершили раскрытие 2 характеристик: ${playersWithRequiredReveals}/${totalPlayers}`
            : `Раскрыли: ${playersWithRequiredReveals}/${totalPlayers}`
          }
        </span>
      </div>
    </div>
  );
}
