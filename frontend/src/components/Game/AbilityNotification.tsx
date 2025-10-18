import React, { useState } from 'react';
import { useGame } from '../../contexts/GameContext';

export function AbilityNotification() {
  const { abilityNotifications } = useGame();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (abilityNotifications.length === 0) {
    return null;
  }

  return (
    <div className={`ability-notifications ${isCollapsed ? 'collapsed' : ''}`}>
      <button 
        className="collapse-toggle" 
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? "Показать уведомления" : "Скрыть уведомления"}
      >
        {isCollapsed ? '▼' : '▲'}
      </button>
      {!isCollapsed && (
        <>
          {abilityNotifications.map((notification, index) => (
            <div key={`${notification.timestamp}-${index}`} className="ability-notification">
              🔮 <strong>{notification.playerName}</strong> использовал <strong>{notification.abilityName}</strong>
              {notification.targetName && (
                <> на <strong>{notification.targetName}</strong></>
              )}
              {notification.message && (
                <div className="ability-notification-message">{notification.message}</div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

