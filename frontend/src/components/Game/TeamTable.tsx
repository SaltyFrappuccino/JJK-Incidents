import React from 'react';
import { useGame } from '../../contexts/GameContext';
import type { RevealedCharacteristic } from '../../contexts/GameContext';

interface PlayerCharacteristics {
  rank?: { value: string };
  cursedTechnique?: { value: string };
  cursedEnergyLevel?: { value: string };
  generalTechniques?: { value: string };
  cursedTools?: { value: string };
  strengths?: { value: string };
  weaknesses?: { value: string };
  specialTraits?: { value: string };
  currentState?: { value: string };
}

export function TeamTable() {
  const { gameState, revealedCharacteristics, myPlayer } = useGame();

  if (!gameState) return null;

  const getPlayerCharacteristics = (playerId: string): PlayerCharacteristics => {
    const playerRevealed = revealedCharacteristics.filter(rc => rc.playerId === playerId);
    const characteristics: PlayerCharacteristics = {};
    
    playerRevealed.forEach(rc => {
      // Преобразуем значение в строку для корректного отображения
      const valueString = Array.isArray(rc.value) ? rc.value.join(', ') : rc.value;
      
      switch (rc.categoryName) {
        case 'Ранг':
          characteristics.rank = { value: valueString };
          break;
        case 'Проклятая Техника':
          characteristics.cursedTechnique = { value: valueString };
          break;
        case 'Уровень Проклятой Энергии':
          characteristics.cursedEnergyLevel = { value: valueString };
          break;
        case 'Общие Техники':
          characteristics.generalTechniques = { value: valueString };
          break;
        case 'Проклятые Инструменты':
          characteristics.cursedTools = { value: valueString };
          break;
        case 'Сильные Стороны':
          characteristics.strengths = { value: valueString };
          break;
        case 'Слабые Стороны':
          characteristics.weaknesses = { value: valueString };
          break;
        case 'Особые Черты':
          characteristics.specialTraits = { value: valueString };
          break;
        case 'Текущее Состояние':
          characteristics.currentState = { value: valueString };
          break;
      }
    });
    
    return characteristics;
  };

  const getCategoryIcon = (categoryName: string): string => {
    const icons: Record<string, string> = {
      'Ранг': '⭐',
      'Проклятая Техника': '⚡',
      'Уровень Проклятой Энергии': '💥',
      'Общие Техники': '🥋',
      'Проклятые Инструменты': '🔧',
      'Сильные Стороны': '💪',
      'Слабые Стороны': '⚠️',
      'Особые Черты': '✨',
      'Текущее Состояние': '🧠'
    };
    return icons[categoryName] || '📋';
  };

  return (
    <div className="team-table-container">
      <h3>Команда</h3>
      <div className="table-wrapper">
        <table className="team-table">
          <thead>
            <tr>
              <th className="player-col">Игрок</th>
              <th className="category-col">
                <span className="category-header">⭐ Ранг</span>
              </th>
              <th className="category-col">
                <span className="category-header">⚡ Проклятая Техника</span>
              </th>
              <th className="category-col">
                <span className="category-header">💥 Уровень Энергии</span>
              </th>
              <th className="category-col">
                <span className="category-header">🥋 Общие Техники</span>
              </th>
              <th className="category-col">
                <span className="category-header">🔧 Проклятые Инструменты</span>
              </th>
              <th className="category-col">
                <span className="category-header">💪 Сильные Стороны</span>
              </th>
              <th className="category-col">
                <span className="category-header">⚠️ Слабые Стороны</span>
              </th>
              <th className="category-col">
                <span className="category-header">✨ Особые Черты</span>
              </th>
              <th className="category-col">
                <span className="category-header">🧠 Состояние</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {gameState.players.map((player) => {
              const characteristics = getPlayerCharacteristics(player.id);
              const isMyPlayer = player.id === myPlayer?.id;
              const isEliminated = gameState.eliminatedPlayers.includes(player.id);
              const revealedCount = revealedCharacteristics.filter(rc => rc.playerId === player.id).length;

              return (
                <tr 
                  key={player.id} 
                  className={`player-row ${isMyPlayer ? 'my-player' : ''} ${player.role === 'host' ? 'host-player' : ''}`}
                >
                  <td className="player-cell">
                    <div className="player-info">
                      <div className={`player-name ${isEliminated ? 'eliminated-name' : ''}`}>
                        {player.name}
                        {player.role === 'host' && <span className="badge host-badge">МИ</span>}
                        {isMyPlayer && <span className="badge you-badge">ВЫ</span>}
                      </div>
                      <div className="player-status">
                        {player.isConnected ? (
                          <span className="status-online">● Онлайн</span>
                        ) : (
                          <span className="status-offline">● Офлайн</span>
                        )}
                      </div>
                      <div className="reveal-progress">
                        Раскрыто: {revealedCount}/9
                      </div>
                    </div>
                  </td>
                  <td className="characteristic-cell">
                    <div className="characteristic-value">
                      {characteristics.rank ? (characteristics.rank.value || 'Ничего') : '—'}
                    </div>
                  </td>
                  <td className="characteristic-cell">
                    <div className="characteristic-value">
                      {characteristics.cursedTechnique ? (characteristics.cursedTechnique.value || 'Ничего') : '—'}
                    </div>
                  </td>
                  <td className="characteristic-cell">
                    <div className="characteristic-value">
                      {characteristics.cursedEnergyLevel ? (characteristics.cursedEnergyLevel.value || 'Ничего') : '—'}
                    </div>
                  </td>
                  <td className="characteristic-cell">
                    <div className="characteristic-value">
                      {characteristics.generalTechniques ? (characteristics.generalTechniques.value || 'Ничего') : '—'}
                    </div>
                  </td>
                  <td className="characteristic-cell">
                    <div className="characteristic-value">
                      {characteristics.cursedTools ? (characteristics.cursedTools.value || 'Ничего') : '—'}
                    </div>
                  </td>
                  <td className="characteristic-cell">
                    <div className="characteristic-value">
                      {characteristics.strengths ? (characteristics.strengths.value || 'Ничего') : '—'}
                    </div>
                  </td>
                  <td className="characteristic-cell">
                    <div className="characteristic-value">
                      {characteristics.weaknesses ? (characteristics.weaknesses.value || 'Ничего') : '—'}
                    </div>
                  </td>
                  <td className="characteristic-cell">
                    <div className="characteristic-value">
                      {characteristics.specialTraits ? (characteristics.specialTraits.value || 'Ничего') : '—'}
                    </div>
                  </td>
                  <td className="characteristic-cell">
                    <div className="characteristic-value">
                      {characteristics.currentState ? (characteristics.currentState.value || 'Ничего') : '—'}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
