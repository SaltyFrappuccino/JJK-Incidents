import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './database/init.js';
import { GameManager } from './services/GameManager.js';
import { MissionService } from './services/MissionService.js';
import { GameSocketHandler } from './sockets/gameSocket.js';
import { adminRouter } from './routes/adminRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const port = process.env['PORT'] || 4000;

// CORS configuration - разрешаем запросы с сервера и локально
const allowedOrigins = [
  'http://localhost:3000',
  'http://95.81.121.225',
  'http://95.81.121.225:3000',
  'http://95.81.121.225:4000',
  'https://jjk-incidents.vercel.app'
];

const corsOrigin = process.env['CORS_ORIGIN'] || allowedOrigins;
app.use(cors({
  origin: (origin, callback) => {
    // Разрешаем запросы без origin (например, мобильные приложения или Postman)
    if (!origin) return callback(null, true);
    
    if (Array.isArray(corsOrigin)) {
      if (corsOrigin.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      callback(null, origin === corsOrigin);
    }
  },
  credentials: true
}));

app.use(express.json());

// Admin routes
app.use('/api/admin', adminRouter);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Global service references
let missionService: MissionService;
let db: any;

// Initialize database and services
async function startServer() {
  try {
    const dbPath = process.env['DATABASE_PATH'] || './src/database/missions.db';
    db = await initializeDatabase(dbPath);

    // Initialize services
    missionService = new MissionService(db);
    const gameManager = new GameManager(missionService);

    // Initialize socket handler
    new GameSocketHandler(io, gameManager, missionService);

    console.log(`🚀 Jujutsu Incidents server running on port ${port}`);
    console.log(`📊 Database initialized at: ${dbPath}`);
    console.log(`🌐 CORS enabled for: ${corsOrigin}`);
    console.log(`🔌 Socket.io server ready for connections`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Basic health check endpoint
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API endpoints for missions (optional - mainly used by frontend)
app.get('/api/missions', async (_req, res) => {
  try {
    // Получаем все миссии (фильтрацию по игрокам можно добавить позже если нужно)
    const missions = await missionService.getAllMissions();
    
    res.json({ success: true, missions });
  } catch (error) {
    console.error('Error fetching missions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch missions' });
  }
});

app.get('/api/missions/:id', async (req, res) => {
  try {
    const mission = await missionService.getMissionById(req.params.id);
    if (!mission) {
      res.status(404).json({ success: false, error: 'Mission not found' });
      return;
    }
    
    res.json({ success: true, mission });
  } catch (error) {
    console.error('Error fetching mission:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch mission' });
  }
});

app.get('/api/missions/:id/briefing', async (req, res) => {
  try {
    const briefing = await missionService.getMissionBriefing(req.params.id);
    if (!briefing) {
      res.status(404).json({ success: false, error: 'Mission briefing not found' });
      return;
    }
    
    res.json({ success: true, briefing });
  } catch (error) {
    console.error('Error fetching mission briefing:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch mission briefing' });
  }
});

// Custom mission creation (optional)
app.post('/api/missions', async (req, res) => {
  try {
    const missionData = req.body;
    const mission = await missionService.createCustomMission(missionData);
    res.json({ success: true, mission });
  } catch (error) {
    console.error('Error creating mission:', error);
    res.status(500).json({ success: false, error: 'Failed to create mission' });
  }
});

// Error handling middleware
app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start server
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    db.close();
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    db.close();
    process.exit(0);
  });
});
