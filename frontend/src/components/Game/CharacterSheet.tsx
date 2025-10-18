import React, { useState } from 'react';
import { useGame, CharacterCard } from '../../contexts/GameContext';

interface CharacterSheetProps {
  onCharacteristicSelect: (categoryIndex: number) => void;
  selectedCategory?: number;
  canSelect: boolean;
}

export function CharacterSheet({ onCharacteristicSelect, selectedCategory, canSelect }: CharacterSheetProps) {
  const { myCharacter } = useGame();
  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null);
  const [localSelectedCategory, setLocalSelectedCategory] = useState<number | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleCategoryClick = (index: number) => {
    if (!canSelect) return;
    setLocalSelectedCategory(index);
  };

  const handleConfirm = async () => {
    if (localSelectedCategory === null || !onCharacteristicSelect) return;
    
    setIsConfirming(true);
    try {
      await onCharacteristicSelect(localSelectedCategory);
      setLocalSelectedCategory(null);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = () => {
    setLocalSelectedCategory(null);
  };

  if (!myCharacter) {
    return (
      <div className="character-sheet">
        <div className="card">
          <h3>Лист Персонажа</h3>
          <p>Загрузка вашего персонажа...</p>
        </div>
      </div>
    );
  }

  const categories = [
    { key: 'rank', name: 'Ранг', value: myCharacter.rank },
    { key: 'cursedTechnique', name: 'Проклятая Техника', value: myCharacter.cursedTechnique },
    { key: 'cursedEnergyLevel', name: 'Уровень Проклятой Энергии', value: myCharacter.cursedEnergyLevel },
    { key: 'generalTechniques', name: 'Общие Техники', value: myCharacter.generalTechniques },
    { key: 'cursedTools', name: 'Проклятые Инструменты', value: myCharacter.cursedTools },
    { key: 'strengths', name: 'Сильные Стороны', value: myCharacter.strengths },
    { key: 'weaknesses', name: 'Слабые Стороны', value: myCharacter.weaknesses },
    { key: 'specialTraits', name: 'Особые Черты', value: myCharacter.specialTraits },
    { key: 'currentState', name: 'Текущее Состояние', value: myCharacter.currentState }
  ];

  const formatValue = (value: any) => {
    if (Array.isArray(value.value)) {
      return value.value.length > 0 ? value.value.join(', ') : 'Ничего';
    }
    return value.value || 'Ничего';
  };

  const getCategoryIcon = (categoryName: string) => {
    const icons: Record<string, string> = {
      'Ранг': '⭐',
      'Проклятая Техника': '⚡',
      'Уровень Проклятой Энергии': '🔥',
      'Общие Техники': '🛡️',
      'Проклятые Инструменты': '🗡️',
      'Сильные Стороны': '💪',
      'Слабые Стороны': '⚠️',
      'Особые Черты': '✨',
      'Текущее Состояние': '🧠'
    };
    return icons[categoryName] || '📋';
  };

  return (
    <div className="character-sheet">
      <div className="card">
        <div className="card-header">
          <h3>Ваш Персонаж</h3>
          <p>Ваши секретные способности и черты</p>
        </div>

        <div className="character-grid">
          {categories.map((category, index) => {
            // Владелец видит все значения, но badge "Раскрыто" только для revealed
            const isRevealed = category.value.revealed;
            const isSelected = localSelectedCategory === index;
            const isHovered = hoveredCategory === index;
            const isClickable = canSelect && !category.value.revealed;

            return (
              <div
                key={category.key}
                className={`character-category ${isRevealed ? 'revealed' : ''} ${isSelected ? 'selected' : ''} ${isClickable ? 'clickable' : ''}`}
                onClick={() => isClickable && handleCategoryClick(index)}
                onMouseEnter={() => setHoveredCategory(index)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                <div className="category-header">
                  <span className="category-icon">{getCategoryIcon(category.name)}</span>
                  <span className="category-name">{category.name}</span>
                  {isRevealed && <span className="revealed-badge">Раскрыто</span>}
                </div>

                <div className="category-content">
                  <div className="value">{formatValue(category.value)}</div>
                  {!isRevealed && canSelect && (
                    <div className="not-revealed-hint">Нажмите для раскрытия</div>
                  )}
                  {isSelected && !isRevealed && (
                    <div className="selected-hint">Выбрано для раскрытия</div>
                  )}
                </div>

                {isSelected && (
                  <div className="selection-indicator">
                    ✓ Выбрано для этого раунда
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="character-notes">
          <p>
            <strong>Помните:</strong> Выбирайте свои раскрытия осторожно. Каждая характеристика, которую вы раскрываете, 
            будет видна всем игрокам и может повлиять на их решения при голосовании.
          </p>
        </div>
      </div>

      {/* Блок подтверждения */}
      {canSelect && localSelectedCategory !== null && (
        <div className="confirm-reveal">
          <div className="card">
            <h4>Подтверждение раскрытия</h4>
            <p>Вы уверены, что хотите раскрыть характеристику <strong>{categories[localSelectedCategory]?.name}</strong>?</p>
            <p className="warning-text">Эта информация будет видна всем игрокам и может повлиять на их решения при голосовании.</p>
            <div className="confirm-buttons">
              <button 
                className="btn btn-primary" 
                onClick={handleConfirm}
                disabled={isConfirming}
              >
                {isConfirming ? 'Раскрытие...' : 'Подтвердить выбор'}
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={handleCancel}
                disabled={isConfirming}
              >
                Отменить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
