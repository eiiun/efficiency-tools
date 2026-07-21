// Netlify Function 入口
// 用 serverless-http 把 Express 应用包装成 Netlify Functions handler

const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');

const db = require('../../server/database/db');
const { authMiddleware } = require('../../server/middleware/auth');
const authRoutes = require('../../server/routes/auth');
const dataRoutes = require('../../server/routes/data');
const exportRoutes = require('../../server/routes/export');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API 路由
app.post('/.netlify/functions/api/auth/register', authRoutes.register);
app.post('/.netlify/functions/api/auth/login', authRoutes.login);
app.get('/.netlify/functions/api/auth/profile', authMiddleware, authRoutes.getProfile);

app.get('/.netlify/functions/api/todos', authMiddleware, dataRoutes.getTodos);
app.post('/.netlify/functions/api/todos', authMiddleware, dataRoutes.addTodo);
app.put('/.netlify/functions/api/todos/:id', authMiddleware, dataRoutes.updateTodo);
app.delete('/.netlify/functions/api/todos/:id', authMiddleware, dataRoutes.deleteTodo);

app.get('/.netlify/functions/api/notes', authMiddleware, dataRoutes.getNotes);
app.post('/.netlify/functions/api/notes', authMiddleware, dataRoutes.addNote);
app.put('/.netlify/functions/api/notes/:id', authMiddleware, dataRoutes.updateNote);
app.delete('/.netlify/functions/api/notes/:id', authMiddleware, dataRoutes.deleteNote);

app.get('/.netlify/functions/api/moods', authMiddleware, dataRoutes.getMoods);
app.post('/.netlify/functions/api/moods', authMiddleware, dataRoutes.addMood);

app.get('/.netlify/functions/api/transactions', authMiddleware, dataRoutes.getTransactions);
app.post('/.netlify/functions/api/transactions', authMiddleware, dataRoutes.addTransaction);
app.delete('/.netlify/functions/api/transactions/:id', authMiddleware, dataRoutes.deleteTransaction);

app.get('/.netlify/functions/api/countdowns', authMiddleware, dataRoutes.getCountdowns);
app.post('/.netlify/functions/api/countdowns', authMiddleware, dataRoutes.addCountdown);
app.delete('/.netlify/functions/api/countdowns/:id', authMiddleware, dataRoutes.deleteCountdown);

app.get('/.netlify/functions/api/pomodoros', authMiddleware, dataRoutes.getPomodoros);
app.post('/.netlify/functions/api/pomodoros', authMiddleware, dataRoutes.addPomodoro);

app.get('/.netlify/functions/api/wishlist', authMiddleware, dataRoutes.getWishlist);
app.post('/.netlify/functions/api/wishlist', authMiddleware, dataRoutes.addWish);
app.put('/.netlify/functions/api/wishlist/:id', authMiddleware, dataRoutes.updateWish);
app.delete('/.netlify/functions/api/wishlist/:id', authMiddleware, dataRoutes.deleteWish);

app.get('/.netlify/functions/api/activities', authMiddleware, dataRoutes.getActivities);

app.get('/.netlify/functions/api/export', authMiddleware, exportRoutes.exportData);
app.post('/.netlify/functions/api/import', authMiddleware, exportRoutes.importData);

app.get('/.netlify/functions/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 初始化数据库
let dbInitialized = false;

async function initDb() {
  if (!dbInitialized) {
    await db.initDatabase();
    dbInitialized = true;
  }
}

// 导出 Netlify Function handler
exports.handler = async (event, context) => {
  await initDb();
  return serverless(app)(event, context);
};
