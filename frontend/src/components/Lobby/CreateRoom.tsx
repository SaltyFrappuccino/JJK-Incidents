import React, { useState } from 'react';
import { useGame } from '../../contexts/GameContext';

interface CreateRoomProps {
  onRoomCreated: (roomCode: string, playerId: string) => void;
}

export function CreateRoom({ onRoomCreated }: CreateRoomProps) {
  const [hostName, setHostName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { createRoom, error, clearError } = useGame();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hostName.trim()) {
      return;
    }

    setIsCreating(true);
    clearError();

    try {
      const result = await createRoom(hostName.trim());
      
      if (result.success && result.roomCode && result.playerId) {
        onRoomCreated(result.roomCode, result.playerId);
      }
    } catch (err) {
      console.error('Failed to create room:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="create-room">
      <div className="card">
        <div className="card-header">
          <h2>Создать Новую Комнату</h2>
          <p>Станьте Мастером Игры и начните новую миссию</p>
        </div>
        
        <form onSubmit={handleSubmit} className="card-body">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="hostName">Ваше Имя</label>
            <input
              id="hostName"
              type="text"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="Введите ваше имя..."
              maxLength={20}
              required
              disabled={isCreating}
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isCreating || !hostName.trim()}
          >
            {isCreating ? 'Создание...' : 'Создать Комнату'}
          </button>
        </form>
      </div>
    </div>
  );
}
