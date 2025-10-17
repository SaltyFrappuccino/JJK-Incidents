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

  const revealedCount = gameState.players.filter(p => p.hasRevealed).length;
  const totalPlayers = gameState.players.length;

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
