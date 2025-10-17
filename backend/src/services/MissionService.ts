import sqlite3 from 'sqlite3';
import { Mission, CustomMissionData, MissionFilter, MissionBriefing } from '../types/MissionTypes.js';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class MissionService {
  private db: sqlite3.Database;
  private defaultMissions: Mission[] = [];

  constructor(db: sqlite3.Database) {
    this.db = db;
    this.loadDefaultMissions();
  }

  private async loadDefaultMissions(): Promise<void> {
    try {
      const missionsPath = join(__dirname, '../data/missions.json');
      const missionsData = await readFile(missionsPath, 'utf-8');
      this.defaultMissions = JSON.parse(missionsData);
      console.log(`[MissionService] Загружено ${this.defaultMissions.length} миссий из JSON`);
    } catch (error) {
      console.error('[MissionService] Ошибка загрузки миссий из JSON:', error);
      this.defaultMissions = [];
    }
  }

  async getAllMissions(filter?: MissionFilter): Promise<Mission[]> {
    // Получить custom миссии из БД
    const customMissions = await this.getCustomMissionsFromDB(filter);
    
    // Объединить с миссиями из JSON
    let allMissions = [...this.defaultMissions, ...customMissions];
    
    // Применить фильтры к миссиям из JSON
    if (filter) {
      allMissions = allMissions.filter(mission => {
        if (filter.difficulty && filter.difficulty.length > 0) {
          if (!filter.difficulty.includes(mission.difficulty)) {
            return false;
          }
        }
        
        if (filter.isCustom !== undefined && mission.isCustom !== filter.isCustom) {
          return false;
        }
        
        return true;
      });
    }
    
    // Сортировка: сначала default, потом custom; затем по сложности и имени
    allMissions.sort((a, b) => {
      if (a.isCustom !== b.isCustom) {
        return a.isCustom ? 1 : -1;
      }
      
      const difficultyOrder = ['Легкая', 'Средняя', 'Сложная', 'Экстремальная'];
      const diffA = difficultyOrder.indexOf(a.difficulty);
      const diffB = difficultyOrder.indexOf(b.difficulty);
      
      if (diffA !== diffB) {
        return diffA - diffB;
      }
      
      return a.name.localeCompare(b.name);
    });
    
    return allMissions;
  }

  private async getCustomMissionsFromDB(filter?: MissionFilter): Promise<Mission[]> {
    let query = `
      SELECT id, name, description, threat, objectives, danger_factors, 
             difficulty, is_custom, created_at, created_by
      FROM missions
      WHERE is_custom = 1
    `;
    
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter) {
      if (filter.difficulty && filter.difficulty.length > 0) {
        const placeholders = filter.difficulty.map(() => '?').join(',');
        conditions.push(`difficulty IN (${placeholders})`);
        params.push(...filter.difficulty);
      }
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows.map(row => this.mapRowToMission(row)));
      });
    });
  }

  async getMissionById(id: string): Promise<Mission | null> {
    // Сначала ищем в миссиях из JSON
    const defaultMission = this.defaultMissions.find(m => m.id === id);
    if (defaultMission) {
      return defaultMission;
    }
    
    // Если не найдено, ищем в custom миссиях из БД
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM missions WHERE id = ?',
        [id],
        (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row ? this.mapRowToMission(row) : null);
        }
      );
    });
  }

  async getAllMissionsSimple(): Promise<Mission[]> {
    // Получить custom миссии из БД
    const customMissions = await new Promise<Mission[]>((resolve, reject) => {
      this.db.all(
        'SELECT * FROM missions WHERE is_custom = 1',
        [],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows.map(row => this.mapRowToMission(row)));
        }
      );
    });
    
    // Объединить с миссиями из JSON
    const allMissions = [...this.defaultMissions, ...customMissions];
    
    // Отсортировать
    allMissions.sort((a, b) => {
      if (a.isCustom !== b.isCustom) {
        return a.isCustom ? 1 : -1;
      }
      
      const difficultyOrder = ['Легкая', 'Средняя', 'Сложная', 'Экстремальная'];
      const diffA = difficultyOrder.indexOf(a.difficulty);
      const diffB = difficultyOrder.indexOf(b.difficulty);
      
      if (diffA !== diffB) {
        return diffA - diffB;
      }
      
      return a.name.localeCompare(b.name);
    });
    
    return allMissions;
  }

  async createCustomMission(data: CustomMissionData): Promise<Mission> {
    const id = this.generateMissionId();
    
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO missions (id, name, description, threat, objectives, danger_factors, 
                             difficulty, is_custom, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
      `);

      const objectivesJson = JSON.stringify(data.objectives);
      const dangerFactorsJson = JSON.stringify(data.dangerFactors);

      stmt.run([
        id,
        data.name,
        data.description,
        data.threat,
        objectivesJson,
        dangerFactorsJson,
        data.difficulty,
        data.createdBy
      ], function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        // Get the created mission
        this.db.get('SELECT * FROM missions WHERE id = ?', [id], (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.mapRowToMission(row));
        });
      }.bind(this));
    });
  }

  async deleteCustomMission(id: string, createdBy: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM missions WHERE id = ? AND is_custom = 1 AND created_by = ?',
        [id, createdBy],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.changes > 0);
        }
      );
    });
  }

  // CRUD методы для админ-панели
  async createMission(missionData: Omit<Mission, 'id'>): Promise<Mission> {
    const id = this.generateMissionId();
    
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO missions (id, name, description, threat, objectives, danger_factors, 
                             difficulty, is_custom, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const objectivesJson = JSON.stringify(missionData.objectives);
      const dangerFactorsJson = JSON.stringify(missionData.dangerFactors);

      stmt.run([
        id,
        missionData.name,
        missionData.description,
        missionData.threat,
        objectivesJson,
        dangerFactorsJson,
        missionData.difficulty,
        missionData.isCustom ? 1 : 0,
        missionData.createdBy || 'admin'
      ], function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        // Get the created mission
        this.db.get('SELECT * FROM missions WHERE id = ?', [id], (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.mapRowToMission(row));
        });
      }.bind(this));
    });
  }

  async updateMission(id: string, missionData: Partial<Mission>): Promise<Mission> {
    return new Promise((resolve, reject) => {
      const updateFields = [];
      const values = [];

      if (missionData.name !== undefined) {
        updateFields.push('name = ?');
        values.push(missionData.name);
      }
      if (missionData.description !== undefined) {
        updateFields.push('description = ?');
        values.push(missionData.description);
      }
      if (missionData.threat !== undefined) {
        updateFields.push('threat = ?');
        values.push(missionData.threat);
      }
      if (missionData.objectives !== undefined) {
        updateFields.push('objectives = ?');
        values.push(JSON.stringify(missionData.objectives));
      }
      if (missionData.dangerFactors !== undefined) {
        updateFields.push('danger_factors = ?');
        values.push(JSON.stringify(missionData.dangerFactors));
      }
      if (missionData.difficulty !== undefined) {
        updateFields.push('difficulty = ?');
        values.push(missionData.difficulty);
      }

      if (updateFields.length === 0) {
        this.db.get('SELECT * FROM missions WHERE id = ?', [id], (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          if (!row) {
            reject(new Error('Миссия не найдена'));
            return;
          }
          resolve(this.mapRowToMission(row));
        });
        return;
      }

      values.push(id);
      const query = `UPDATE missions SET ${updateFields.join(', ')} WHERE id = ?`;

      this.db.run(query, values, function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        // Get the updated mission
        this.db.get('SELECT * FROM missions WHERE id = ?', [id], (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          if (!row) {
            reject(new Error('Миссия не найдена после обновления'));
            return;
          }
          resolve(this.mapRowToMission(row));
        });
      }.bind(this));
    });
  }

  async deleteMission(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM missions WHERE id = ?', [id], function(err) {
        if (err) {
          reject(err);
          return;
        }
        if (this.changes === 0) {
          reject(new Error('Миссия не найдена'));
          return;
        }
        resolve();
      });
    });
  }

  async getMissionBriefing(missionId: string): Promise<MissionBriefing | null> {
    const mission = await this.getMissionById(missionId);
    if (!mission) {
      return null;
    }

    const briefingText = this.generateBriefingText(mission);
    const keyConsiderations = this.getKeyConsiderations(mission);
    const successConditions = this.getSuccessConditions(mission);
    const failureConditions = this.getFailureConditions(mission);

    return {
      mission,
      briefingText,
      keyConsiderations,
      successConditions,
      failureConditions
    };
  }

  private mapRowToMission(row: any): Mission {
    console.log(`[MissionService] Загружаем миссию: ${row.name} (${row.id})`);
    console.log(`[MissionService] objectives JSON: ${row.objectives}`);
    console.log(`[MissionService] danger_factors JSON: ${row.danger_factors}`);
    
    const objectives = JSON.parse(row.objectives);
    const dangerFactors = JSON.parse(row.danger_factors);
    
    console.log(`[MissionService] Парсинг objectives:`, objectives);
    console.log(`[MissionService] Парсинг dangerFactors:`, dangerFactors);
    
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      threat: row.threat,
      objectives,
      dangerFactors,
      difficulty: row.difficulty,
      isCustom: Boolean(row.is_custom),
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
      createdBy: row.created_by
    };
  }

  private generateMissionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `custom_${timestamp}_${random}`;
  }

  private generateBriefingText(mission: Mission): string {
    return `
**MISSION BRIEFING: ${mission.name}**

**THREAT ASSESSMENT:**
${mission.threat}

**MISSION OBJECTIVES:**
${mission.objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

**DANGER FACTORS:**
${mission.dangerFactors.map((factor, i) => `${i + 1}. ${factor}`).join('\n')}

**MISSION PARAMETERS:**
- Difficulty: ${mission.difficulty}
- Environment: High-risk area with multiple unknown variables

**BRIEFING NOTES:**
This mission requires careful coordination and strategic thinking. Each team member's unique abilities will be crucial for success. The threat level is ${mission.difficulty.toLowerCase()}, which means ${this.getDifficultyDescription(mission.difficulty)}.

Remember: Your goal is not just to survive, but to complete the mission successfully while minimizing casualties. Every decision matters.
    `.trim();
  }

  private getKeyConsiderations(mission: Mission): string[] {
    const considerations = [
      'Team composition and ability synergy',
      'Risk assessment and mitigation strategies',
      'Civilian safety and evacuation procedures',
      'Resource management and energy conservation',
      'Communication and coordination protocols'
    ];

    if (mission.difficulty === 'Hard' || mission.difficulty === 'Extreme') {
      considerations.push('Potential for unexpected complications');
      considerations.push('Need for backup plans and contingencies');
    }

    return considerations;
  }

  private getSuccessConditions(mission: Mission): string[] {
    return [
      'All primary objectives completed',
      'Team members survive or casualties minimized',
      'Threat neutralized or contained',
      'Civilian casualties prevented or minimized',
      'Mission completed within acceptable time frame'
    ];
  }

  private getFailureConditions(mission: Mission): string[] {
    return [
      'Critical objectives not achieved',
      'Excessive team casualties',
      'Threat escapes or spreads',
      'Unacceptable civilian casualties',
      'Mission timeout or abandonment'
    ];
  }

  private getDifficultyDescription(difficulty: string): string {
    const descriptions = {
      'Easy': 'the threat is manageable with basic coordination',
      'Medium': 'the threat requires careful planning and teamwork',
      'Hard': 'the threat is extremely dangerous and requires expert coordination',
      'Extreme': 'the threat is potentially catastrophic and requires perfect execution'
    };
    return descriptions[difficulty as keyof typeof descriptions] || 'the threat level is unknown';
  }
}