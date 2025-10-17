import OpenAI from 'openai';
import { Mission } from '../types/MissionTypes.js';
import { CharacterCard } from '../types/CharacterTypes.js';

export class AIService {
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.AITUNNEL_API_KEY || 'sk-aitunnel-6nSOCdFD2jUgDD3fzNwfJtqFbtQl8BaL',
      baseURL: process.env.AITUNNEL_BASE_URL || 'https://api.aitunnel.ru/v1/',
    });
    this.model = process.env.AI_MODEL || 'gemini-2.5-flash-lite';
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
Ты - опытный рассказчик для игры в стиле "Jujutsu Kaisen". Твоя задача - создать захватывающий, атмосферный эпилог миссии, который справедливо оценивает результаты команды.

## ПРАВИЛА ИГРЫ

Это социальная дедукционная игра, где игроки - команда магов, отправленных на опасную миссию. Каждый раунд:
1. Игроки раскрывают одну характеристику своего персонажа (техники, сильные/слабые стороны, состояние)
2. Обсуждают, кто наименее полезен для миссии
3. Голосуют за исключение одного игрока (или пропускают голосование максимум 2 раза подряд)
4. Игра продолжается до тех пор, пока не останется минимальное количество игроков для миссии

Мастер Игры (ГМ) управляет процессом и в конце создаёт эпилог.

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
   - Проклятая техника: ${survivor.character.cursedTechnique.value.name}
   - Уровень энергии: ${survivor.character.cursedEnergyLevel.value}
   - Общие техники: ${survivor.character.generalTechniques.value.join(', ') || 'Нет'}
   - Инструменты: ${survivor.character.cursedTools.value.join(', ') || 'Нет'}
   - Сильные стороны: ${survivor.character.strengths.value.join(', ')}
   - Слабые стороны: ${survivor.character.weaknesses.value.join(', ')}
   - Особые черты: ${survivor.character.specialTraits.value.join(', ') || 'Нет'}
   - Состояние: ${survivor.character.currentState.value}
`).join('\n')}

## ЗАДАНИЕ

Создай захватывающий эпилог миссии (400-600 слов), который:

1. **Создаёт атмосферу** - опиши миссию как реальное событие в мире Jujutsu Kaisen
2. **Анализирует команду** - как их навыки и решения повлияли на исход
3. **Описывает ключевые моменты** - что происходило во время миссии
4. **Оценивает результат** - справилась ли команда с целями миссии
5. **Даёт справедливую оценку** - учитывай как сильные, так и слабые стороны
6. **Описывает роль каждого игрока** - для каждого шамана из команды опиши, как его конкретные способности помогли в миссии. Используй их реальные имена (ники)

**КРИТЕРИИ УСПЕХА:**
- Команда выполнила основные цели миссии
- Игроки обладают подходящими навыками для данной миссии
- Команда показала разумные решения в процессе отбора

**СТИЛЬ:**
- Пиши в стиле тёмного фэнтези/хоррора из вселенной Jujutsu Kaisen
- Используй конкретные детали из характеристик персонаж
- Создавай напряжение и атмосферу
- Будь справедливым, но не слишком критичным
- Отвечай НА РУССКОМ ЯЗЫКЕ


Начни эпилог со слов "Миссия завершена." и закончи однозначным вердиктом: "**УСПЕХ**" или "**ПРОВАЛ**".
`;
  }
}
