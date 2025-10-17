import React, { useState, useEffect } from 'react';

interface Mission {
  id: number;
  name: string;
  description: string;
  difficulty: string;
  requiredPlayers: number;
  threat: string;
  objectives: string[];
  dangerFactors: string[];
  estimatedDuration: number;
  isCustom: boolean;
}

interface MissionListProps {
  onEdit: (mission: Mission) => void;
}

export function MissionList({ onEdit }: MissionListProps) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadMissions();
  }, []);

  const loadMissions = async () => {
    try {
      const password = localStorage.getItem('adminPassword');
      const response = await fetch('/api/admin/missions', {
        headers: { 'x-admin-password': password || '' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMissions(data);
      } else {
        console.error('Ошибка загрузки миссий');
      }
    } catch (error) {
      console.error('Ошибка загрузки миссий:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteMission = async (id: number) => {
    if (!confirm('Удалить эту миссию?')) return;
    
    try {
      const password = localStorage.getItem('adminPassword');
      const response = await fetch(`/api/admin/missions/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': password || '' }
      });
      
      if (response.ok) {
        loadMissions();
      } else {
        alert('Ошибка удаления миссии');
      }
    } catch (error) {
      console.error('Ошибка удаления миссии:', error);
      alert('Ошибка удаления миссии');
    }
  };

  const filteredMissions = missions.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">Загрузка миссий...</div>
      </div>
    );
  }

  return (
    <div className="mission-list">
      <div className="list-header">
        <h2>📋 Управление миссиями</h2>
        <button 
          className="btn btn-primary"
          onClick={() => onEdit({ 
            id: 0, 
            name: '', 
            description: '', 
            difficulty: 'Легкая', 
            requiredPlayers: 3, 
            threat: '',
            objectives: [],
            dangerFactors: [],
            estimatedDuration: 30,
            isCustom: false
          })}
        >
          ➕ Создать миссию
        </button>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍 Поиск миссий..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="missions-grid">
        {filteredMissions.map(mission => (
          <div key={mission.id} className="mission-card">
            <div className="mission-card-header">
              <h3>{mission.name}</h3>
              <div className="mission-badges">
                <span className={`difficulty-badge ${mission.difficulty.toLowerCase()}`}>
                  {mission.difficulty}
                </span>
                {mission.isCustom && (
                  <span className="custom-badge">Пользовательская</span>
                )}
              </div>
            </div>
            
            <p className="mission-description">{mission.description}</p>
            
            <div className="mission-meta">
              <span>👥 Игроков: {mission.requiredPlayers}</span>
              <span>⏱️ {mission.estimatedDuration} мин</span>
              <span>⚠️ {mission.threat}</span>
            </div>
            
            <div className="mission-objectives">
              <strong>Цели:</strong>
              <ul>
                {mission.objectives.slice(0, 2).map((obj, i) => (
                  <li key={i}>{obj}</li>
                ))}
                {mission.objectives.length > 2 && (
                  <li>... и еще {mission.objectives.length - 2}</li>
                )}
              </ul>
            </div>
            
            <div className="mission-actions">
              <button 
                className="btn btn-edit"
                onClick={() => onEdit(mission)}
              >
                ✏️ Редактировать
              </button>
              <button 
                className="btn btn-delete"
                onClick={() => deleteMission(mission.id)}
              >
                🗑️ Удалить
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {filteredMissions.length === 0 && !loading && (
        <div className="empty-state">
          <p>Миссии не найдены</p>
        </div>
      )}
    </div>
  );
}
