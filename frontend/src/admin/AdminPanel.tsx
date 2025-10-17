import React, { useState } from 'react';
import { AdminLogin } from './AdminLogin';
import { MissionList } from './MissionList';
import { MissionEditor } from './MissionEditor';
import './admin.css';

type AdminView = 'missions' | 'settings';

export function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<AdminView>('missions');
  const [editingMission, setEditingMission] = useState<any | null>(null);

  if (!isAuthenticated) {
    return <AdminLogin onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="admin-panel">
      <aside className="admin-sidebar">
        <div className="admin-header">
          <h1>🎮 Админ-панель</h1>
          <p>Инциденты Дзюдзюцу</p>
        </div>
        
        <nav className="admin-nav">
          <button 
            className={currentView === 'missions' ? 'active' : ''}
            onClick={() => setCurrentView('missions')}
          >
            📋 Миссии
          </button>
          <button 
            className={currentView === 'settings' ? 'active' : ''}
            onClick={() => setCurrentView('settings')}
          >
            ⚙️ Настройки
          </button>
        </nav>
        
        <div className="admin-footer">
          <button 
            className="btn-logout"
            onClick={() => setIsAuthenticated(false)}
          >
            🚪 Выйти
          </button>
        </div>
      </aside>
      
      <main className="admin-content">
        {currentView === 'missions' && !editingMission && (
          <MissionList onEdit={setEditingMission} />
        )}
        
        {currentView === 'missions' && editingMission && (
          <MissionEditor 
            mission={editingMission}
            onSave={() => setEditingMission(null)}
            onCancel={() => setEditingMission(null)}
          />
        )}
        
        {currentView === 'settings' && (
          <div className="settings-placeholder">
            <h2>⚙️ Настройки</h2>
            <p>Раздел настроек будет добавлен в следующих версиях.</p>
          </div>
        )}
      </main>
    </div>
  );
}
