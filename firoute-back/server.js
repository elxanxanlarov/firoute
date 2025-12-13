import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import radiusRouter from './routes/radiusRouter.js';
import authRouter from './routes/authRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import userRoutes from './routes/userRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import routerRoutes from './routes/routerRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import reservationRoutes from './routes/reservationRoutes.js';
import systemActivityRoutes from './routes/systemActivityRoutes.js';
import pendingCustomerRoutes from './routes/pendingCustomerRoutes.js';
import radiusUsersRoutes from './routes/radius/radiusUsersRoutes.js';
import { ensureCoreRoles } from './controllers/roleController.js';
import { ensureDefaultSuperadmin } from './controllers/userController.js';
import { createServer } from 'http';
import { pool } from './db.js';
import { initializeSocket } from './socket.js';
import dotenv from 'dotenv';
import os from 'os';
import { ensureDefaultRadiusUser } from './controllers/radius/radiusUsersController.js';
dotenv.config();
const app = express();
const httpServer = createServer(app);
const PORT = 3000;
// Socket.io server-ini başlat
initializeSocket(httpServer);

// Default user-i server startında və periodik yoxla/bərpa et
(async () => {
  await ensureDefaultRadiusUser();
  setInterval(() => ensureDefaultRadiusUser().catch(() => {}), 60_000);
})();

// CORS – obyekt kimi istifadə et
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
  res.send("Server is running");
});

// Health check endpoint - MySQL qoşulmasını yoxlayır
app.get('/health', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // MySQL qoşulmasını yoxla (timeout ilə)
    const connection = await Promise.race([
      pool.getConnection(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout after 5 seconds')), 5000)
      )
    ]);
    
    await Promise.race([
      connection.query('SELECT 1'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout after 3 seconds')), 3000)
      )
    ]);
    
    connection.release();
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      status: 'healthy',
      database: 'connected',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorCode = error.code || 'UNKNOWN';
    const errorMessage = error.message || 'Unknown error';
    
    // Error koduna görə daha detallı mesaj
    let detailedError = errorMessage;
    if (errorCode === 'ECONNREFUSED') {
      detailedError = `MySQL server-ə qoşula bilinmir. Server işləyir və network əlaqəsi mövcuddur? (${errorMessage})`;
    } else if (errorCode === 'ETIMEDOUT') {
      detailedError = `MySQL server-ə qoşulma timeout oldu. Server cavab vermir. (${errorMessage})`;
    } else if (errorCode === 'ER_ACCESS_DENIED_ERROR') {
      detailedError = `MySQL istifadəçi adı və ya parol səhvdir. (${errorMessage})`;
    } else if (errorCode === 'ENOTFOUND') {
      detailedError = `MySQL server host tapılmadı. (${errorMessage})`;
    }
    
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: detailedError,
      errorCode: errorCode,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      troubleshooting: {
        checkServer: 'MySQL server-in işlədiyini yoxlayın',
        checkNetwork: 'Network əlaqəsini yoxlayın',
        checkCredentials: 'İstifadəçi adı və parolun düzgün olduğunu yoxlayın',
        checkFirewall: 'Firewall MySQL portunu (3306) bloklamır?'
      }
    });
  }
});

app.use('/api/radius', radiusRouter);
app.use('/api/auth', authRouter);
app.use('/api/roles', roleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/routers', routerRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/system-activities', systemActivityRoutes);
app.use('/api/pending-customers', pendingCustomerRoutes);
app.use('/api/radius-users', radiusUsersRoutes);
// Serveri BİR DƏFƏ işə sal
(async () => {
  try {
    await ensureCoreRoles();
    await ensureDefaultSuperadmin();
  } catch (e) {
    console.error('Başlanğıc init xətası:', e);
  } finally {
    httpServer.listen(PORT, () => {
      console.log(`✅ Server ${PORT} portunda işləyir`);
    });
  }
})();
