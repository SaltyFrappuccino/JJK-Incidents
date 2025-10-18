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
  const revealedCount = activePlayers.filter(p => p.hasRevealed).length;
  const totalPlayers = activePlayers.length;

  return (
    <div className="reveal-phase-info">
      <h2>Фаза Раскрытия</h2>
      <p>Выберите характеристику для раскрытия в вашем листе персонажа выше.</p>
      <div className="reveal-status">
        <span>Раскрыли: {revealedCount}/{totalPlayers}</span>
      </div>
    </div>
  );
}
