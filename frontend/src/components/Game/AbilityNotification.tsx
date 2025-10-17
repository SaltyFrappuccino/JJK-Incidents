import React from 'react';
import { useGame } from '../../contexts/GameContext';

export function AbilityNotification() {
  const { abilityNotifications } = useGame();

  if (abilityNotifications.length === 0) {
    return null;
  }

  return (
    <div className="ability-notifications">
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
    </div>
  );
}

