import React from 'react';
import { Mission } from '../../contexts/GameContext';

interface MissionContextProps {
  mission?: Mission;
}

export function MissionContext({ mission }: MissionContextProps) {
  if (!mission) {
    return (
      <div className="mission-context-sidebar">
        <h4>Миссия</h4>
        <p>Миссия не выбрана</p>
      </div>
    );
  }

  return (
    <div className="mission-context-sidebar">
      <h4>Миссия</h4>
      <div className="mission-compact">
        <div className="mission-name">{mission.name}</div>
        <div className="mission-meta">
          <span className="difficulty-badge">{mission.difficulty}</span>
          <span className="players-badge">{mission.requiredPlayers} игроков</span>
        </div>
        
        <div className="mission-threat">
          <strong>Угроза:</strong> {mission.threat}
        </div>
        
        <details className="mission-details">
          <summary>Цели ({mission.objectives?.length || 0})</summary>
          <ul>
            {mission.objectives?.map((objective, index) => (
              <li key={index}>{objective}</li>
            )) || <li>Цели не определены</li>}
          </ul>
        </details>
        
        <details className="mission-details">
          <summary>Опасности ({mission.dangerFactors?.length || 0})</summary>
          <ul>
            {mission.dangerFactors?.map((danger, index) => (
              <li key={index}>{danger}</li>
            )) || <li>Факторы опасности не определены</li>}
          </ul>
        </details>
      </div>
    </div>
  );
}
