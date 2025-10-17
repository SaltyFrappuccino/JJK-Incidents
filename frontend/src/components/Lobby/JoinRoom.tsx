import React, { useState } from 'react';
import { useGame } from '../../contexts/GameContext';

interface JoinRoomProps {
  onRoomJoined: (roomCode: string, playerId: string) => void;
}

export function JoinRoom({ onRoomJoined }: JoinRoomProps) {
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const { joinRoom, error, clearError } = useGame();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomCode.trim() || !playerName.trim()) {
      return;
    }

    setIsJoining(true);
    clearError();

    try {
      const result = await joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
      
      if (result.success && result.playerId) {
        onRoomJoined(roomCode.trim().toUpperCase(), result.playerId);
      }
    } catch (err) {
      console.error('Failed to join room:', err);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="join-room">
      <div className="card">
        <div className="card-header">
          <h2>Присоединиться к Комнате</h2>
          <p>Введите код комнаты для присоединения к миссии</p>
        </div>
        
        <form onSubmit={handleSubmit} className="card-body">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="roomCode">Код Комнаты</label>
            <input
              id="roomCode"
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Введите 6-значный код комнаты..."
              maxLength={6}
              pattern="[A-Z0-9]{6}"
              required
              disabled={isJoining}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="playerName">Ваше Имя</label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Введите ваше имя..."
              maxLength={20}
              required
              disabled={isJoining}
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isJoining || !roomCode.trim() || !playerName.trim()}
          >
            {isJoining ? 'Присоединение...' : 'Присоединиться'}
          </button>
        </form>
      </div>
    </div>
  );
}
