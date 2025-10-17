import React, { useEffect, useState } from 'react';
import { useGame } from '../../contexts/GameContext';

interface MissionBriefingProps {
  onBriefingComplete: () => void;
}

export function MissionBriefing({ onBriefingComplete }: MissionBriefingProps) {
  const { gameState, myPlayer } = useGame();

  const mission = gameState?.selectedMission;
  const isHost = myPlayer?.role === 'host';

  if (!mission) {
    return (
      <div className="mission-briefing">
        <div className="card">
          <h2>Брифинг Миссии</h2>
          <p>Загрузка деталей миссии...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="mission-briefing">
      <div className="card briefing-card">
        <div className="briefing-header">
          <h2>Брифинг Миссии</h2>
        </div>

        <div className="briefing-content">
          <div className="mission-title">
            <h3>{mission.name}</h3>
            <div className="mission-meta">
              <span className="difficulty-badge">{mission.difficulty}</span>
              <span className="duration-badge">{mission.estimatedDuration} min</span>
              <span className="players-badge">{mission.requiredPlayers} игроков</span>
            </div>
          </div>

          <div className="mission-description">
            <h4>Обзор Миссии</h4>
            <p>{mission.description}</p>
          </div>

          <div className="mission-threat">
            <h4>Основная Угроза</h4>
            <div className="threat-content">
              <p>{mission.threat}</p>
            </div>
          </div>

          <div className="mission-objectives">
            <h4>Цели Миссии</h4>
            <ul>
              {mission.objectives?.map((objective, index) => (
                <li key={index}>{objective}</li>
              )) || <li>Цели не определены</li>}
            </ul>
          </div>

          <div className="mission-dangers">
            <h4>Факторы Опасности</h4>
            <ul>
              {mission.dangerFactors?.map((danger, index) => (
                <li key={index}>{danger}</li>
              )) || <li>Факторы опасности не определены</li>}
            </ul>
          </div>
        </div>

        <div className="briefing-actions">
          {isHost && (
            <button 
              className="btn btn-primary btn-large"
              onClick={onBriefingComplete}
            >
              Продолжить
            </button>
          )}
          
          {!isHost && (
            <div className="waiting-for-host">
              <div className="spinner"></div>
              <span>Ожидание Мастера Игры для запуска миссии...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
