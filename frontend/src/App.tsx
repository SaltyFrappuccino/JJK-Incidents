import React, { useState, useEffect } from 'react';
import { SocketProvider } from './contexts/SocketContext';
import { GameProvider, useGame } from './contexts/GameContext';
import { MusicProvider } from './contexts/MusicContext';
import { CreateRoom } from './components/Lobby/CreateRoom';
import { JoinRoom } from './components/Lobby/JoinRoom';
import { LobbyWaitingRoom } from './components/Lobby/LobbyWaitingRoom';
import { GameLoop } from './components/Game/GameLoop';
import { AdminPanel } from './admin/AdminPanel';
import { MusicPlayer } from './components/MusicPlayer/MusicPlayer';
import './index.css';

type AppState = 'home' | 'lobby' | 'game' | 'admin';

function AppContent() {
  const [appState, setAppState] = useState<AppState>('home');
  const [roomCode, setRoomCode] = useState<string>('');
  const [playerId, setPlayerId] = useState<string>('');
  const { gameState, setMissionCompleteCallback } = useGame();

  // Обработка hash-роутинга для админ-панели
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#admin') {
        setAppState('admin');
      } else if (hash === '#home' || hash === '') {
        setAppState('home');
      }
    };

    // Проверяем hash при загрузке
    handleHashChange();

    // Слушаем изменения hash
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Автоматический переход в игру когда gameStarted становится true
  useEffect(() => {
    if (gameState?.gameStarted && appState === 'lobby') {
      setAppState('game');
    }
  }, [gameState?.gameStarted, appState]);

  // Установить callback для перехода в эпилог
  useEffect(() => {
    setMissionCompleteCallback(() => setAppState('epilogue'));
  }, [setMissionCompleteCallback]);

  const handleRoomCreated = (code: string, id: string) => {
    setRoomCode(code);
    setPlayerId(id);
    setAppState('lobby');
  };

  const handleRoomJoined = (code: string, id: string) => {
    setRoomCode(code);
    setPlayerId(id);
    setAppState('lobby');
  };

  const handleBackToHome = () => {
    setAppState('home');
    setRoomCode('');
    setPlayerId('');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Инциденты Дзюдзюцу</h1>
      </header>

      <main className="app-main">
        {appState === 'home' && (
          <div className="home-screen">
            <div className="home-content">
              <div className="home-actions">
                <CreateRoom onRoomCreated={handleRoomCreated} />
                <div className="divider">или</div>
                <JoinRoom onRoomJoined={handleRoomJoined} />
              </div>
            </div>
          </div>
        )}

        {appState === 'lobby' && (
          <div className="lobby-screen">
            <LobbyWaitingRoom 
              roomCode={roomCode} 
              onGameStarted={() => {}} // Больше не нужно - переход автоматический
            />
            <button 
              className="btn btn-secondary back-btn"
              onClick={handleBackToHome}
            >
              Назад на Главную
            </button>
          </div>
        )}

        {appState === 'game' && (
          <div className="game-screen">
            <GameLoop onGameComplete={() => setAppState('home')} />
          </div>
        )}

        {appState === 'admin' && (
          <AdminPanel />
        )}

      </main>

      {/* Скрытая кнопка для входа в админ-панель */}
      <button 
        className="admin-link"
        onClick={() => {
          setAppState('admin');
          window.location.hash = '#admin';
        }}
        style={{ 
          position: 'fixed', 
          bottom: '10px', 
          left: '10px', 
          opacity: 0.3,
          background: 'transparent',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          zIndex: 1000
        }}
        title="Админ-панель"
      >
        ⚙️
      </button>

      {/* Music Player */}
      <MusicPlayer />

    </div>
  );
}

export function App() {
  return (
    <SocketProvider>
      <GameProvider>
        <MusicProvider>
          <AppContent />
        </MusicProvider>
      </GameProvider>
    </SocketProvider>
  );
}

export default App;
