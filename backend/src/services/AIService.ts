import OpenAI from 'openai';
import { Mission } from '../types/MissionTypes.js';
import { CharacterCard } from '../types/CharacterTypes.js';

export class AIService {
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env['AITUNNEL_API_KEY'] || 'sk-aitunnel-6nSOCdFD2jUgDD3fzNwfJtqFbtQl8BaL',
      baseURL: process.env['AITUNNEL_BASE_URL'] || 'https://api.aitunnel.ru/v1/',
    });
    this.model = process.env['AI_MODEL'] || 'gemini-2.5-flash-lite';
  }

  async generateEpilogue(gameData: {
    mission: Mission;
    survivors: { playerName: string; character: CharacterCard }[];
    eliminated: { playerName: string; character: CharacterCard; round: number }[];
    totalRounds: number;
    consecutiveSkips: number;
  }): Promise<string> {
    try {
      const prompt = this.buildPrompt(gameData);
      
      console.log(`[AIService] Генерируем эпилог для миссии: ${gameData.mission.name}`);
      console.log(`[AIService] Выживших: ${gameData.survivors.length}, исключённых: ${gameData.eliminated.length}`);
      
      const chatResult = await this.client.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: this.model,
        max_tokens: 50000,
      });

      const epilogue = chatResult.choices[0]?.message?.content || 'Не удалось сгенерировать эпилог';
      console.log(`[AIService] Эпилог сгенерирован, длина: ${epilogue.length} символов`);
      
      return epilogue;
    } catch (error) {
      console.error('[AIService] Ошибка генерации эпилога:', error);
      throw new Error('Не удалось сгенерировать эпилог');
    }
  }

  private buildPrompt(gameData: {
    mission: Mission;
    survivors: { playerName: string; character: CharacterCard }[];
    eliminated: { playerName: string; character: CharacterCard; round: number }[];
    totalRounds: number;
    consecutiveSkips: number;
  }): string {
    return `
Ты - СТРОГИЙ и РЕАЛИСТИЧНЫЙ рассказчик для игры в стиле "Jujutsu Kaisen". Твоя задача - создать захватывающий эпилог миссии, который ЧЕСТНО оценивает шансы команды на выживание.

## ПРАВИЛА ИГРЫ

Это социальная дедукционная игра, где игроки - команда магов, отправленных на опасную миссию. Каждый раунд:
1. Игроки раскрывают одну характеристику своего персонажа (техники, сильные/слабые стороны, состояние)
2. Обсуждают, кто наименее полезен для миссии
3. Голосуют за исключение одного игрока (или пропускают голосование максимум 2 раза подряд)
4. Игра продолжается до тех пор, пока не останется минимальное количество игроков для миссии

Мастер Игры (ГМ) управляет процессом и в конце создаёт эпилог.

## СИСТЕМА РАНГОВ (от слабых к сильным)

**ВАЖНО:** Ранг определяет общую опытность, выживаемость и боевые навыки шамана.

- **Четвёртый**: Начинающий шаман, минимальный опыт. Легко погибает против серьёзных угроз.
- **Третий**: Опытный шаман, средний уровень. Может справиться с обычными проклятиями.
- **Полу-Второй**: Сильный шаман. Способен противостоять опасным проклятым духам.
- **Второй**: Очень сильный шаман. Высокие шансы выжить в опасных ситуациях.
- **Полу-Первый**: Элитный шаман. Редкая сила, может справиться с большинством угроз.
- **Первый**: Мастер высшего класса. Исключительная сила и опыт.
- **Первый Особый**: Легендарный мастер. Близок к абсолютной силе.
- **Особый**: Абсолютная сила, почти непобедимый. Махито, Дагон, Сукуна - это Особый ранг.

## МИССИЯ

**Название:** ${gameData.mission.name}
**Описание:** ${gameData.mission.description}
**Угроза:** ${gameData.mission.threat}
**Сложность:** ${gameData.mission.difficulty}

**Цели миссии:**
${gameData.mission.objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

**Факторы опасности:**
${gameData.mission.dangerFactors.map((df, i) => `${i + 1}. ${df}`).join('\n')}

## РЕЗУЛЬТАТЫ ИГРЫ

**Всего раундов:** ${gameData.totalRounds}
**Пропущенных голосований подряд:** ${gameData.consecutiveSkips}

**Команда, отправившаяся на миссию (${gameData.survivors.length} игроков):**
${gameData.survivors.map((survivor, i) => `
${i + 1}. Шаман ${survivor.playerName}
   - Ранг: ${survivor.character.rank.value}
   - Проклятая техника: ${survivor.character.cursedTechnique.value}${survivor.character.cursedTechnique.description ? ` (${survivor.character.cursedTechnique.description})` : ''}
   - Уровень энергии: ${survivor.character.cursedEnergyLevel.value}
   - Общие техники: ${survivor.character.generalTechniques.value.join(', ') || 'Нет'}${survivor.character.generalTechniques.descriptions && survivor.character.generalTechniques.descriptions.length > 0 ? ` (${survivor.character.generalTechniques.descriptions.join(', ')})` : ''}
   - Инструменты: ${survivor.character.cursedTools.value.join(', ') || 'Нет'}
   - Сильные стороны: ${survivor.character.strengths.value.join(', ')}
   - Слабые стороны: ${survivor.character.weaknesses.value.join(', ')}
   - Особые черты: ${survivor.character.specialTraits.value.join(', ') || 'Нет'}${survivor.character.specialTraits.descriptions && survivor.character.specialTraits.descriptions.length > 0 ? ` (${survivor.character.specialTraits.descriptions.join(', ')})` : ''}
   - Состояние: ${survivor.character.currentState.value}
`).join('\n')}

## ЗАДАНИЕ

Создай РЕАЛИСТИЧНЫЙ эпилог миссии (500-800 слов), который:

1. **Создаёт атмосферу** - опиши миссию как реальное событие в мире Jujutsu Kaisen
2. **АНАЛИЗИРУЕТ СИЛУ** - сопоставь ранги команды с угрозой миссии
3. **Описывает ход битвы** - кто как сражался, кто погиб и почему
4. **УКАЗЫВАЕТ ЖЕРТВЫ** - обязательно опиши, КТО выжил и КТО погиб
5. **Объясняет причины** - почему кто-то погиб (низкий ранг, критическая слабость, неудачный бой)

## КРИТЕРИИ УСПЕХА/ПРОВАЛА

**УСПЕХ возможен только если:**
- Команда имеет достаточно высокие ранги для данной угрозы
- Есть правильные техники для противодействия врагу
- Команда работает слаженно и дополняет друг друга
- Минимум 50% команды выжило

**ПРОВАЛ происходит если:**
- Низкие ранги против мощной угрозы = МАССОВАЯ ГИБЕЛЬ
- Отсутствие ключевых техник = ВЫСОКАЯ СМЕРТНОСТЬ
- Серьёзные слабости без компенсации = ПОТЕРИ
- Менее 50% команды выжило

## ПРАВИЛА СМЕРТНОСТИ

**БУДЬ РЕАЛИСТИЧЕН:**
- Особый ранг враг (Сукуна, Махито, Дагон) ЛЕГКО убивает Четвёртых/Третьих рангов
- Четвёртый ранг против Особого = почти ГАРАНТИРОВАННАЯ СМЕРТЬ
- Третий ранг против Особого = ОЧЕНЬ ВЫСОКИЙ риск смерти
- Полу-Второй/Второй против Особого = высокий риск, нужны идеальные техники
- Только Первый/Особый ранги могут реально противостоять Особому врагу

**ПРИМЕРЫ:**
- Сукуна (Особый) vs команда из Четвёртых = ВСЕ ПОГИБАЮТ
- Махито (Особый) vs команда из Третьих без подходящих техник = БОЛЬШИНСТВО ПОГИБАЕТ
- Дагон (Особый) vs смешанная команда = погибают слабейшие, выживают сильнейшие

## ФОРМАТ ОТВЕТА

В конце эпилога ОБЯЗАТЕЛЬНО укажи:

**ВЫЖИВШИЕ:**
- [Имя игрока] ([Ранг]) - краткая причина выживания

**ПОГИБШИЕ:**
- [Имя игрока] ([Ранг]) - подробная причина смерти

Затем вердикт: "**УСПЕХ**" (если выжило ≥50% и цели выполнены) или "**ПРОВАЛ**" (если погибло >50% или цели не выполнены).

**СТИЛЬ:**
- Пиши в стиле тёмного фэнтези/хоррора из вселенной Jujutsu Kaisen
- Используй конкретные детали из характеристик персонажей
- Создавай напряжение и атмосферу
- Будь СТРОГИМ и РЕАЛИСТИЧНЫМ - смерть это норма в опасных миссиях
- Отвечай НА РУССКОМ ЯЗЫКЕ

Начни эпилог со слов "Миссия завершена."
`;
  }
}
