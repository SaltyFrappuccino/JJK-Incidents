import React, { useState } from 'react';
import { useGame } from '../../contexts/GameContext';
import { ActiveAbility } from '../../types/AbilityTypes';

export function AbilitiesPanel() {
  const { myAbilities, gameState, useAbility } = useGame();
  const [selectedAbility, setSelectedAbility] = useState<ActiveAbility | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!gameState || !['reveal', 'discussion', 'voting'].includes(gameState.phase)) {
    return null;
  }

  if (myAbilities.length === 0) {
    return null;
  }

  const handleUseAbility = (ability: ActiveAbility) => {
    if (ability.usesRemaining <= 0) return;

    if (ability.requiresTarget) {
      setSelectedAbility(ability);
      setSelectedTarget('');
      setIsConfirming(true);
      setError(null);
    } else {
      setSelectedAbility(ability);
      setIsConfirming(true);
      setError(null);
    }
  };

  const handleConfirmUse = async () => {
    if (!selectedAbility) return;

    if (selectedAbility.requiresTarget && !selectedTarget) {
      setError('Выберите цель для этой способности');
      return;
    }

    const result = await useAbility(
      selectedAbility.id,
      selectedAbility.requiresTarget ? selectedTarget : undefined
    );

    if (result.success) {
      setIsConfirming(false);
      setSelectedAbility(null);
      setSelectedTarget('');
      setError(null);
    } else {
      setError(result.error || 'Не удалось использовать способность');
    }
  };

  const handleCancel = () => {
    setIsConfirming(false);
    setSelectedAbility(null);
    setSelectedTarget('');
    setError(null);
  };

  const availablePlayers = gameState.players.filter(
    p => !gameState.eliminatedPlayers.includes(p.id)
  );

  return (
    <div className="abilities-panel">
      <h3>🔮 Активные Способности</h3>
      
      <div className="abilities-list">
        {myAbilities.map((ability) => (
          <div 
            key={ability.id} 
            className={`ability-card ${ability.usesRemaining <= 0 ? 'ability-used' : ''}`}
          >
            <div className="ability-header">
              <span className="ability-name">{ability.name}</span>
              <span className="ability-uses">
                {ability.usesRemaining}/{ability.maxUses}
              </span>
            </div>
            <p className="ability-description">{ability.description}</p>
            <button
              onClick={() => handleUseAbility(ability)}
              disabled={ability.usesRemaining <= 0}
              className="ability-button"
            >
              {ability.usesRemaining <= 0 ? 'Использовано' : 'Использовать'}
            </button>
          </div>
        ))}
      </div>

      {isConfirming && selectedAbility && (
        <div className="ability-modal-overlay" onClick={handleCancel}>
          <div className="ability-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Подтверждение использования</h3>
            <p className="ability-modal-name">{selectedAbility.name}</p>
            <p className="ability-modal-description">{selectedAbility.description}</p>

            {selectedAbility.requiresTarget && (
              <div className="ability-target-selection">
                <label htmlFor="target-select">Выберите цель:</label>
                <select
                  id="target-select"
                  value={selectedTarget}
                  onChange={(e) => setSelectedTarget(e.target.value)}
                  className="ability-target-select"
                >
                  <option value="">-- Выберите игрока --</option>
                  {availablePlayers.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && <p className="ability-error">{error}</p>}

            <div className="ability-modal-buttons">
              <button onClick={handleConfirmUse} className="ability-confirm-button">
                Подтвердить
              </button>
              <button onClick={handleCancel} className="ability-cancel-button">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

