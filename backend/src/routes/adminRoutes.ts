import { Router } from 'express';
import { MissionService } from '../services/MissionService.js';

export const adminRouter = Router();
const missionService = new MissionService();

// Middleware для проверки пароля
const authMiddleware = (req: any, res: any, next: any) => {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const providedPassword = req.headers['x-admin-password'];
  
  if (providedPassword === adminPassword) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// GET все миссии
adminRouter.get('/missions', authMiddleware, async (req, res) => {
  try {
    const missions = await missionService.getAllMissions();
    res.json(missions);
  } catch (error) {
    console.error('Ошибка получения миссий:', error);
    res.status(500).json({ error: 'Ошибка получения миссий' });
  }
});

// GET одна миссия
adminRouter.get('/missions/:id', authMiddleware, async (req, res) => {
  try {
    const mission = await missionService.getMissionById(req.params.id);
    if (!mission) {
      return res.status(404).json({ error: 'Миссия не найдена' });
    }
    res.json(mission);
  } catch (error) {
    console.error('Ошибка получения миссии:', error);
    res.status(500).json({ error: 'Ошибка получения миссии' });
  }
});

// POST создать миссию
adminRouter.post('/missions', authMiddleware, async (req, res) => {
  try {
    const mission = await missionService.createMission(req.body);
    res.json(mission);
  } catch (error) {
    console.error('Ошибка создания миссии:', error);
    res.status(500).json({ error: 'Ошибка создания миссии' });
  }
});

// PUT обновить миссию
adminRouter.put('/missions/:id', authMiddleware, async (req, res) => {
  try {
    const mission = await missionService.updateMission(req.params.id, req.body);
    res.json(mission);
  } catch (error) {
    console.error('Ошибка обновления миссии:', error);
    res.status(500).json({ error: 'Ошибка обновления миссии' });
  }
});

// DELETE удалить миссию
adminRouter.delete('/missions/:id', authMiddleware, async (req, res) => {
  try {
    await missionService.deleteMission(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления миссии:', error);
    res.status(500).json({ error: 'Ошибка удаления миссии' });
  }
});
