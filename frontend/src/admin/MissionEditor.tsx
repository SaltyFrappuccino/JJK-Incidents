import React, { useState } from 'react';

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

interface MissionEditorProps {
  mission: Mission;
  onSave: () => void;
  onCancel: () => void;
}

export function MissionEditor({ mission, onSave, onCancel }: MissionEditorProps) {
  const [formData, setFormData] = useState(mission);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const password = localStorage.getItem('adminPassword');
      const url = formData.id 
        ? `/api/admin/missions/${formData.id}`
        : '/api/admin/missions';
      
      const method = formData.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password || ''
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        onSave();
      } else {
        alert('Ошибка сохранения миссии');
      }
    } catch (error) {
      console.error('Ошибка сохранения миссии:', error);
      alert('Ошибка сохранения миссии');
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="mission-editor">
      <div className="editor-header">
        <h2>{formData.id ? '✏️ Редактирование миссии' : '➕ Новая миссия'}</h2>
        <button className="btn btn-secondary" onClick={onCancel}>
          ❌ Отмена
        </button>
      </div>

      <form onSubmit={handleSubmit} className="editor-form">
        <div className="form-section">
          <h3>📝 Основная информация</h3>
          
          <div className="form-group">
            <label>Название миссии *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => updateFormData('name', e.target.value)}
              placeholder="Название миссии"
            />
          </div>

          <div className="form-group">
            <label>Описание *</label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              placeholder="Краткое описание миссии"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Сложность *</label>
              <select
                value={formData.difficulty}
                onChange={(e) => updateFormData('difficulty', e.target.value)}
              >
                <option value="Легкая">Легкая</option>
                <option value="Средняя">Средняя</option>
                <option value="Сложная">Сложная</option>
                <option value="Экстремальная">Экстремальная</option>
              </select>
            </div>

            <div className="form-group">
              <label>Минимум игроков *</label>
              <input
                type="number"
                min="1"
                max="10"
                required
                value={formData.requiredPlayers}
                onChange={(e) => updateFormData('requiredPlayers', parseInt(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>Длительность (минуты)</label>
              <input
                type="number"
                min="5"
                max="120"
                value={formData.estimatedDuration}
                onChange={(e) => updateFormData('estimatedDuration', parseInt(e.target.value))}
                placeholder="30"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>⚠️ Угрозы и опасности</h3>
          
          <div className="form-group">
            <label>Описание угрозы *</label>
            <textarea
              required
              rows={3}
              value={formData.threat}
              onChange={(e) => updateFormData('threat', e.target.value)}
              placeholder="Основная угроза миссии"
            />
          </div>

          <div className="form-group">
            <label>Факторы опасности (каждый с новой строки)</label>
            <textarea
              rows={5}
              value={formData.dangerFactors?.join('\n') || ''}
              onChange={(e) => updateFormData('dangerFactors', e.target.value.split('\n').filter(l => l.trim()))}
              placeholder="Фактор 1&#10;Фактор 2&#10;Фактор 3"
            />
          </div>
        </div>

        <div className="form-section">
          <h3>🎯 Цели миссии</h3>
          
          <div className="form-group">
            <label>Список целей (каждая с новой строки)</label>
            <textarea
              rows={5}
              value={formData.objectives?.join('\n') || ''}
              onChange={(e) => updateFormData('objectives', e.target.value.split('\n').filter(l => l.trim()))}
              placeholder="Цель 1&#10;Цель 2&#10;Цель 3"
            />
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="submit" 
            className="btn btn-primary btn-large"
            disabled={saving}
          >
            {saving ? '💾 Сохранение...' : '💾 Сохранить миссию'}
          </button>
          <button 
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
          >
            ❌ Отмена
          </button>
        </div>
      </form>
    </div>
  );
}
