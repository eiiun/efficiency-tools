require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const db = require('./database/db');
const { authMiddleware } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, '../')));

// API 路由
// 认证相关（不需要 token）
app.post('/api/auth/register', authRoutes.register);
app.post('/api/auth/login', authRoutes.login);

// 用户信息（需要 token）
app.get('/api/auth/profile', authMiddleware, authRoutes.getProfile);

// 数据同步相关（需要 token）
app.get('/api/todos', authMiddleware, dataRoutes.getTodos);
app.post('/api/todos', authMiddleware, dataRoutes.addTodo);
app.put('/api/todos/:id', authMiddleware, dataRoutes.updateTodo);
app.delete('/api/todos/:id', authMiddleware, dataRoutes.deleteTodo);

app.get('/api/notes', authMiddleware, dataRoutes.getNotes);
app.post('/api/notes', authMiddleware, dataRoutes.addNote);
app.put('/api/notes/:id', authMiddleware, dataRoutes.updateNote);
app.delete('/api/notes/:id', authMiddleware, dataRoutes.deleteNote);

app.get('/api/moods', authMiddleware, dataRoutes.getMoods);
app.post('/api/moods', authMiddleware, dataRoutes.addMood);

app.get('/api/transactions', authMiddleware, dataRoutes.getTransactions);
app.post('/api/transactions', authMiddleware, dataRoutes.addTransaction);
app.delete('/api/transactions/:id', authMiddleware, dataRoutes.deleteTransaction);

app.get('/api/countdowns', authMiddleware, dataRoutes.getCountdowns);
app.post('/api/countdowns', authMiddleware, dataRoutes.addCountdown);
app.delete('/api/countdowns/:id', authMiddleware, dataRoutes.deleteCountdown);

app.get('/api/pomodoros', authMiddleware, dataRoutes.getPomodoros);
app.post('/api/pomodoros', authMiddleware, dataRoutes.addPomodoro);

app.get('/api/wishlist', authMiddleware, dataRoutes.getWishlist);
app.post('/api/wishlist', authMiddleware, dataRoutes.addWish);
app.put('/api/wishlist/:id', authMiddleware, dataRoutes.updateWish);
app.delete('/api/wishlist/:id', authMiddleware, dataRoutes.deleteWish);

app.get('/api/activities', authMiddleware, dataRoutes.getActivities);

// 数据导入导出
app.get('/api/export', authMiddleware, exportRoutes.exportData);
app.post('/api/import', authMiddleware, exportRoutes.importData);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 主页路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ success: false, error: '接口不存在' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ success: false, error: '服务器内部错误' });
});

function getLocalIP() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  const ipAddresses = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ipAddresses.push(iface.address);
      }
    }
  }
  
  return ipAddresses;
}

async function startServer() {
  try {
    await db.initDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
      const localIPs = getLocalIP();
      
      console.log('='.repeat(60));
      console.log('效率工具后端服务已启动');
      console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
      console.log('='.repeat(60));
      console.log('访问地址:');
      console.log(`  本地访问: http://localhost:${PORT}`);
      console.log(`  本机访问: http://127.0.0.1:${PORT}`);
      
      if (localIPs.length > 0) {
        for (let i = 0; i < localIPs.length; i++) {
          console.log(`  局域网访问: http://${localIPs[i]}:${PORT}`);
        }
      } else {
        console.log('  局域网访问: 未检测到网络连接');
      }
      
      console.log('='.repeat(60));
      console.log('分享给他人:');
      console.log('  1. 确保所有设备连接在同一个 WiFi/局域网');
      console.log('  2. 将上面的"局域网访问"地址分享给朋友');
      console.log('  3. 朋友在浏览器中打开该地址即可使用');
      console.log('='.repeat(60));
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;