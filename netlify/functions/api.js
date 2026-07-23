// Netlify Function - 原生实现，不依赖 serverless-http/express
const db = require('../../server/database/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production-2024';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

function parseBody(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch (e) {
    return {};
  }
}

function authMiddleware(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

function getIdFromPath(path) {
  const parts = path.split('/');
  return parseInt(parts[parts.length - 1]);
}

async function addActivityAndXP(userId, icon, text, xp) {
  try {
    await db.run('INSERT INTO activities (user_id, icon, text, xp, created_at) VALUES ($1, $2, $3, $4, $5)', [userId, icon, text, xp, new Date().toISOString()]);
    if (xp > 0) {
      const user = await db.get('SELECT xp, total_xp, level FROM users WHERE id = $1', [userId]);
      if (user) {
        let newXp = user.xp + xp;
        let newLevel = user.level;
        let newTotalXp = user.total_xp;
        while (newXp >= newTotalXp) {
          newXp -= newTotalXp;
          newLevel += 1;
          newTotalXp = newLevel * 100 + (newLevel - 1) * 50;
        }
        await db.run('UPDATE users SET xp = $1, level = $2, total_xp = $3 WHERE id = $4', [newXp, newLevel, newTotalXp, userId]);
      }
    }
  } catch (error) {
    console.error('添加活动失败:', error);
  }
}

// ========== Auth Routes ==========

async function handleRegister(event) {
  const { username, password } = parseBody(event);
  if (!username || !password) return jsonResponse(400, { success: false, error: '用户名和密码不能为空' });
  if (username.length < 2 || username.length > 20) return jsonResponse(400, { success: false, error: '用户名长度应为2-20个字符' });
  if (password.length < 6) return jsonResponse(400, { success: false, error: '密码长度至少为6个字符' });

  const existingUser = await db.get('SELECT id FROM users WHERE username = $1', [username]);
  if (existingUser) return jsonResponse(409, { success: false, error: '用户名已存在' });

  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = await db.insert(
    'INSERT INTO users (username, password, level, xp, total_xp) VALUES ($1, $2, 1, 0, 100) RETURNING id',
    [username, hashedPassword]
  );
  const userId = result.lastInsertRowid?.id || result.lastInsertRowid || 0;
  await addActivityAndXP(userId, '⭐', '注册账号', 10);
  const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '30d' });

  return jsonResponse(200, { success: true, data: { userId, name: username, level: 1, xp: 0, totalXp: 100, token } });
}

async function handleLogin(event) {
  const { username, password } = parseBody(event);
  if (!username || !password) return jsonResponse(400, { success: false, error: '用户名和密码不能为空' });

  const user = await db.get('SELECT * FROM users WHERE username = $1', [username]);
  if (!user) return jsonResponse(401, { success: false, error: '该账号尚未注册，请先注册', code: 'USER_NOT_FOUND' });
  if (!bcrypt.compareSync(password, user.password)) return jsonResponse(401, { success: false, error: '密码错误，请重试' });

  await db.run('INSERT INTO activities (user_id, icon, text, xp, created_at) VALUES ($1, $2, $3, $4, $5)', [user.id, '✅', '登录成功', 0, new Date().toISOString()]);
  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });

  return jsonResponse(200, {
    success: true,
    data: { userId: user.id, name: user.username, level: user.level, xp: user.xp, totalXp: user.total_xp, registerDate: user.register_date, token }
  });
}

async function handleGetProfile(event) {
  const decoded = authMiddleware(event);
  if (!decoded) return jsonResponse(401, { success: false, error: '未授权' });
  const user = await db.get('SELECT id, username, level, xp, total_xp, register_date FROM users WHERE id = $1', [decoded.userId]);
  if (!user) return jsonResponse(404, { success: false, error: '用户不存在' });
  return jsonResponse(200, {
    success: true,
    data: { userId: user.id, name: user.username, level: user.level, xp: user.xp, totalXp: user.total_xp, registerDate: user.register_date }
  });
}

// ========== Todo Routes ==========

async function handleGetTodos(event) {
  const decoded = authMiddleware(event);
  if (!decoded) return jsonResponse(401, { success: false, error: '未授权' });
  const todos = await db.all('SELECT * FROM todos WHERE user_id = $1 ORDER BY created_at DESC', [decoded.userId]);
  return jsonResponse(200, { success: true, data: todos });
}

async function handleAddTodo(event) {
  const decoded = authMiddleware(event);
  if (!decoded) return jsonResponse(401, { success: false, error: '未授权' });
  const { content, priority } = parseBody(event);
  const result = await db.insert(
    'INSERT INTO todos (user_id, content, priority) VALUES ($1, $2, $3) RETURNING id',
    [decoded.userId, content, priority || 'medium']
  );
  const todoId = result.lastInsertRowid?.id || result.lastInsertRowid || 0;
  await addActivityAndXP(decoded.userId, '✅', `添加待办: ${content}`, 5);
  const todo = await db.get('SELECT * FROM todos WHERE id = $1', [todoId]);
  return jsonResponse(201, { success: true, data: todo });
}

async function handleUpdateTodo(event) {
  const decoded = authMiddleware(event);
  if (!decoded) return jsonResponse(401, { success: false, error: '未授权' });
  const id = getIdFromPath(event.path);
  const { content, priority, completed } = parseBody(event);

  const todo = await db.get('SELECT * FROM todos WHERE id = $1 AND user_id = $2', [id, decoded.userId]);
  if (!todo) return jsonResponse(404, { success: false, error: '待办不存在' });

  if (completed && !todo.completed) {
    await addActivityAndXP(decoded.userId, '🎉', `完成待办: ${todo.content}`, 10);
  } else if (!completed && todo.completed) {
    // 取消完成：扣除 10 XP，最低为 0
    try {
      const user = await db.get('SELECT xp, level, total_xp FROM users WHERE id = $1', [decoded.userId]);
      if (user) {
        const newXp = Math.max(0, user.xp - 10);
        await db.run('UPDATE users SET xp = $1 WHERE id = $2', [newXp, decoded.userId]);
        await db.run('INSERT INTO activities (user_id, icon, text, xp, created_at) VALUES ($1, $2, $3, $4, $5)', [decoded.userId, '↩️', `取消完成待办: ${todo.content}`, -10, new Date().toISOString()]);
      }
    } catch (error) {
      console.error('扣除XP失败:', error);
    }
  }

  await db.run(
    'UPDATE todos SET content = COALESCE($1, content), priority = COALESCE($2, priority), completed = COALESCE($3, completed), updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND user_id = $5',
    [content, priority, completed !== undefined ? (completed ? 1 : 0) : null, id, decoded.userId]
  );
  const updated = await db.get('SELECT * FROM todos WHERE id = $1', [id]);
  return jsonResponse(200, { success: true, data: updated });
}

async function handleDeleteTodo(event) {
  const decoded = authMiddleware(event);
  if (!decoded) return jsonResponse(401, { success: false, error: '未授权' });
  const id = getIdFromPath(event.path);
  await db.run('DELETE FROM todos WHERE id = $1 AND user_id = $2', [id, decoded.userId]);
  return jsonResponse(200, { success: true });
}

// ========== Note Routes ==========

async function handleGetNotes(event) {
  const decoded = authMiddleware(event);
  if (!decoded) return jsonResponse(401, { success: false, error: '未授权' });
  const notes = await db.all('SELECT * FROM notes WHERE user_id = $1 ORDER BY created_at DESC', [decoded.userId]);
  return jsonResponse(200, { success: true, data: notes });
}

async function handleAddNote(event) {
  const decoded = authMiddleware(event);
  if (!decoded) return jsonResponse(401, { success: false, error: '未授权' });
  const { title, content, tags } = parseBody(event);
  const result = await db.insert(
    'INSERT INTO notes (user_id, title, content, tags) VALUES ($1, $2, $3, $4) RETURNING id',
    [decoded.userId, title, content, tags]
  );
  const noteId = result.lastInsertRowid?.id || result.lastInsertRowid || 0;
  await addActivityAndXP(decoded.userId, '📝', '创建笔记', 5);
  const note = await db.get('SELECT * FROM notes WHERE id = $1', [noteId]);
  return jsonResponse(201, { success: true, data: note });
}

async function handleUpdateNote(event) {
  const decoded = authMiddleware(event);
  if (!decoded) return jsonResponse(401, { success: false, error: '未授权' });
  const id = getIdFromPath(event.path);
  const { title, content, tags } = parseBody(event);
  await db.run(
    'UPDATE notes SET title = COALESCE($1, title), content = COALESCE($2, content), tags = COALESCE($3, tags), updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND user_id = $5',
    [title, content, tags, id, decoded.userId]
  );
  const note = await db.get('SELECT * FROM notes WHERE id = $1', [id]);
  return jsonResponse(200, { success: true, data: note });
}

async function handleDeleteNote(event) {
  const decoded = authMiddleware(event);
  if (!decoded) return jsonResponse(401, { success: false, error: '未授权' });
  const id = getIdFromPath(event.path);
  await db.run('DELETE FROM notes WHERE id = $1 AND user_id = $2', [id, decoded.userId]);
  return jsonResponse(200, { success: true });
}

// ========== Mood Routes ==========

async function handleGetMoods(event) {
  const decoded = authMiddleware(event);
  if (!decoded) return jsonResponse(401, { success: false, error: '未授权' });
  const moods = await db.all('SELECT * FROM moods WHERE user_id = $1 ORDER BY date DESC', [decoded.userId]);
  return jsonResponse(200, { success: true, data: moods });
}

async function handleAddMood(event) {
  const decoded = authMiddleware(event);
  if (!decoded) return jsonResponse(401, { success: false, error: '未授权' });
  const { mood, emoji, content, date } = parseBody(event);
  const result = await db.insert(
    'INSERT INTO moods (user_id, mood, emoji, content, date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [decoded.userId, mood, emoji, content, date]
  );
  const moodId = result.lastInsertRowid?.id || result.lastInsertRowid || 0;
  await addActivityAndXP(decoded.userId, emoji, '记录心情', 5);
  const moodData = await db.get('SELECT * FROM moods WHERE id = $1', [moodId]);
  return jsonResponse(201, { success: true, data: moodData });
}

// ========== Transaction Routes ==========

async function handleGetTransactions(event) {
  const decoded = authMiddleware(event);
  if (!decoded) return jsonResponse(401, { success: false, error: '未授权' });
  const transactions = await db.all('SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC', [decoded.userId]);
  return jsonResponse(200, { success: true, data: transactions });
}

async function handleAddTransaction(event) {
  const decoded = authMiddleware(event);
  if (!decoded) return jsonResponse(401, { success: false, error: '未授权' });
  const { type, amount, category, note, date } = parseBody(event);
  const result = await db.insert(
    'INSERT INTO transactions (user_id, type, amount, category, note, date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [decoded.userId, type, parseFloat(amount), category, note, date]
  );
  const transactionId = result.lastInsertRowid?.id || result.lastInsertRowid || 0;
  const icon = type === 'income' ? '💰' : '💸';
  await addActivityAndXP(decoded.userId, icon, `${type === 'income' ? '收入' : '支出'}: ¥${amount}`, 2);
  const transaction = await db.get('SELECT * FROM transactions WHERE id = $1', [transactionId]);
  return jsonResponse(201, { success: true, data: transaction });
}

async function handleDeleteTransaction(event) {
  const decoded = authMiddleware(event);
  if (!decoded) return jsonResponse(401, { success: false, error: '未授权' });
  const id = getIdFromPath(event.path);
  await db.run('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [id, decoded.userId]);
  return jsonResponse(200, { success: true });
}

// ========== Countdown Routes ==========

async function handleGetCountdowns(event) {
  const decoded = authMiddleware(event);
  if (!decoded) return jsonResponse(401, { success: false, error: '未授权' });
  const countdowns = await db.all('SELECT * FROM countdowns WHERE user_id = $1 ORDER BY created_at DESC', [decoded.userId]);
  return jsonResponse(200, { success: true, data: countdowns });
}

async function handleAddCountdown(event) {
  const decoded = authMiddleware(event);
  if (!decoded) return jsonResponse(401, { success: false, error: '未授权' });
  const { title, date, category } = parseBody(event);
  const result = await db.insert(
    'INSERT INTO countdowns (user_id, title, date, category) VALUES ($1, $2, $3, $4) RETURNING id',
    [decoded.userId, title, date, category || 'other']
  );
  const countdownId = result.lastInsertRowid?.id || result.lastInsertRowid || 0;
  await addActivityAndXP(decoded.userId, '', `添加倒计时: ${title}`, 5);
  const countdown = await db.get('SELECT * FROM countdowns WHERE id = $1', [countdownId]);
  return jsonResponse(201, { success: true, data: countdown });
}

async function handleDeleteCountdown(event) {
  const decoded = authMiddleware(event);
  if (!decoded) return jsonResponse(401, { success: false, error: '未授权' });
  const id = getIdFromPath(event.path);
  await db.run('DELETE FROM countdowns WHERE id = $1 AND user_id = $2', [id, decoded.userId]);
  return jsonResponse(200, { success: true });
}

// ========== Pomodoro Routes ==========

async function handleGetPomodoros(event) {
  const decoded = authMiddleware(event);
  if (!decoded) return jsonResponse(401, { success: false, error: '未授权' });
  const pomodoros = await db.all('SELECT * FROM pomodoros WHERE user_id = $1 ORDER BY completed_at DESC', [decoded.userId]);
  return jsonResponse(200, { success: true, data: pomodoros });
}

async function handleAddPomodoro(event) {
  const decoded = authMiddleware(event);
  if (!decoded) return jsonResponse(401, { success: false, error: '未授权' });
  const { duration, type } = parseBody(event);
  const result = await db.insert(
    'INSERT INTO pomodoros (user_id, duration, type) VALUES ($1, $2, $3) RETURNING id',
    [decoded.userId, parseInt(duration), type || 'focus']
  );
  const pomodoroId = result.lastInsertRowid?.id || result.lastInsertRowid || 0;
  await addActivityAndXP(decoded.userId, '', `完成番茄钟 ${duration}分钟`, Math.floor(duration / 5) + 5);
  const pomodoro = await db.get('SELECT * FROM pomodoros WHERE id = $1', [pomodoroId]);
  return jsonResponse(201, { success: true, data: pomodoro });
}

// ========== Wishlist Routes ==========

async function handleGetWishlist(event) {
  const decoded = authMiddleware(event);
  if (!decoded) return jsonResponse(401, { success: false, error: '未授权' });
  const wishlist = await db.all('SELECT * FROM wishlist WHERE user_id = $1 ORDER BY created_at DESC', [decoded.userId]);
  return jsonResponse(200, { success: true, data: wishlist });
}

async function handleAddWish(event) {
  const decoded = authMiddleware(event);
  if (!decoded) return jsonResponse(401, { success: false, error: '未授权' });
  const { title, note, category } = parseBody(event);
  const result = await db.insert(
    'INSERT INTO wishlist (user_id, title, note, category) VALUES ($1, $2, $3, $4) RETURNING id',
    [decoded.userId, title, note, category || 'other']
  );
  const wishId = result.lastInsertRowid?.id || result.lastInsertRowid || 0;
  await addActivityAndXP(decoded.userId, '✨', `添加愿望: ${title}`, 3);
  const wish = await db.get('SELECT * FROM wishlist WHERE id = $1', [wishId]);
  return jsonResponse(201, { success: true, data: wish });
}

async function handleUpdateWish(event) {
  const decoded = authMiddleware(event);
  if (!decoded) return jsonResponse(401, { success: false, error: '未授权' });
  const id = getIdFromPath(event.path);
  const { title, note, category, completed } = parseBody(event);

  const wish = await db.get('SELECT * FROM wishlist WHERE id = $1 AND user_id = $2', [id, decoded.userId]);
  if (!wish) return jsonResponse(404, { success: false, error: '愿望不存在' });

  await db.run(
    'UPDATE wishlist SET title = COALESCE($1, title), note = COALESCE($2, note), category = COALESCE($3, category), completed = COALESCE($4, completed) WHERE id = $5 AND user_id = $6',
    [title, note, category, completed !== undefined ? (completed ? 1 : 0) : null, id, decoded.userId]
  );

  if (completed && !wish.completed) {
    await addActivityAndXP(decoded.userId, '🌟', `实现愿望: ${wish.title}`, 20);
  }

  const updated = await db.get('SELECT * FROM wishlist WHERE id = $1', [id]);
  return jsonResponse(200, { success: true, data: updated });
}

async function handleDeleteWish(event) {
  const decoded = authMiddleware(event);
  if (!decoded) return jsonResponse(401, { success: false, error: '未授权' });
  const id = getIdFromPath(event.path);
  await db.run('DELETE FROM wishlist WHERE id = $1 AND user_id = $2', [id, decoded.userId]);
  return jsonResponse(200, { success: true });
}

// ========== Activity Routes ==========

async function handleGetActivities(event) {
  const decoded = authMiddleware(event);
  if (!decoded) return jsonResponse(401, { success: false, error: '未授权' });
  const activities = await db.all('SELECT * FROM activities WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [decoded.userId]);
  return jsonResponse(200, { success: true, data: activities });
}

// ========== Export/Import Routes ==========

async function handleExportData(event) {
  const decoded = authMiddleware(event);
  if (!decoded) return jsonResponse(401, { success: false, error: '未授权' });

  const todos = await db.all('SELECT * FROM todos WHERE user_id = $1', [decoded.userId]);
  const notes = await db.all('SELECT * FROM notes WHERE user_id = $1', [decoded.userId]);
  const moods = await db.all('SELECT * FROM moods WHERE user_id = $1', [decoded.userId]);
  const transactions = await db.all('SELECT * FROM transactions WHERE user_id = $1', [decoded.userId]);
  const countdowns = await db.all('SELECT * FROM countdowns WHERE user_id = $1', [decoded.userId]);
  const pomodoros = await db.all('SELECT * FROM pomodoros WHERE user_id = $1', [decoded.userId]);
  const wishlist = await db.all('SELECT * FROM wishlist WHERE user_id = $1', [decoded.userId]);
  const activities = await db.all('SELECT * FROM activities WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [decoded.userId]);

  return jsonResponse(200, {
    success: true,
    data: { todos, notes, moods, transactions, countdowns, pomodoros, wishlist, activities }
  });
}

async function handleImportData(event) {
  const decoded = authMiddleware(event);
  if (!decoded) return jsonResponse(401, { success: false, error: '未授权' });
  const { todos, notes, moods, transactions, countdowns, pomodoros, wishlist } = parseBody(event);

  // 先清除旧数据（全量同步）
  const tables = ['todos', 'notes', 'moods', 'transactions', 'countdowns', 'pomodoros', 'wishlist', 'activities'];
  for (const table of tables) {
    try { await db.run(`DELETE FROM ${table} WHERE user_id = $1`, [decoded.userId]); } catch (e) { /* 忽略不存在的表 */ }
  }

  if (todos) for (const t of todos) await db.run('INSERT INTO todos (user_id, content, priority, completed) VALUES ($1, $2, $3, $4)', [decoded.userId, t.content, t.priority, t.completed]);
  if (notes) for (const n of notes) await db.run('INSERT INTO notes (user_id, title, content, tags) VALUES ($1, $2, $3, $4)', [decoded.userId, n.title, n.content, n.tags]);
  if (moods) for (const m of moods) await db.run('INSERT INTO moods (user_id, mood, emoji, content, date) VALUES ($1, $2, $3, $4, $5)', [decoded.userId, m.mood, m.emoji, m.content, m.date]);
  if (transactions) for (const t of transactions) await db.run('INSERT INTO transactions (user_id, type, amount, category, note, date) VALUES ($1, $2, $3, $4, $5, $6)', [decoded.userId, t.type, t.amount, t.category, t.note, t.date]);
  if (countdowns) for (const c of countdowns) await db.run('INSERT INTO countdowns (user_id, title, date, category) VALUES ($1, $2, $3, $4)', [decoded.userId, c.title, c.date, c.category]);
  if (pomodoros) for (const p of pomodoros) await db.run('INSERT INTO pomodoros (user_id, duration, type) VALUES ($1, $2, $3)', [decoded.userId, p.duration, p.type]);
  if (wishlist) for (const w of wishlist) await db.run('INSERT INTO wishlist (user_id, title, note, category, completed) VALUES ($1, $2, $3, $4, $5)', [decoded.userId, w.title, w.note, w.category, w.completed]);

  return jsonResponse(200, { success: true });
}

// ========== Router ==========

let dbInitialized = false;
async function initDb() {
  if (!dbInitialized) {
    await db.initDatabase();
    dbInitialized = true;
  }
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  await initDb();

  // Handle both redirect paths: /api/xxx (from netlify.toml redirect) and /.netlify/functions/api/xxx (direct)
  let path = event.path;
  path = path.replace(/^\/\.netlify\/functions\/api/, '');
  path = path.replace(/^\/api/, '');
  path = path || '/health';

  try {
    if (path === '/health' || path === '/') {
      return jsonResponse(200, { status: 'ok', timestamp: new Date().toISOString() });
    }

    // Auth
    if (path === '/auth/register' && event.httpMethod === 'POST') return await handleRegister(event);
    if (path === '/auth/login' && event.httpMethod === 'POST') return await handleLogin(event);
    if (path === '/auth/profile' && event.httpMethod === 'GET') return await handleGetProfile(event);

    // Todos
    if (path === '/todos' && event.httpMethod === 'GET') return await handleGetTodos(event);
    if (path === '/todos' && event.httpMethod === 'POST') return await handleAddTodo(event);
    if (/^\/todos\/\d+/.test(path) && event.httpMethod === 'PUT') return await handleUpdateTodo(event);
    if (/^\/todos\/\d+/.test(path) && event.httpMethod === 'DELETE') return await handleDeleteTodo(event);

    // Notes
    if (path === '/notes' && event.httpMethod === 'GET') return await handleGetNotes(event);
    if (path === '/notes' && event.httpMethod === 'POST') return await handleAddNote(event);
    if (/^\/notes\/\d+/.test(path) && event.httpMethod === 'PUT') return await handleUpdateNote(event);
    if (/^\/notes\/\d+/.test(path) && event.httpMethod === 'DELETE') return await handleDeleteNote(event);

    // Moods
    if (path === '/moods' && event.httpMethod === 'GET') return await handleGetMoods(event);
    if (path === '/moods' && event.httpMethod === 'POST') return await handleAddMood(event);

    // Transactions
    if (path === '/transactions' && event.httpMethod === 'GET') return await handleGetTransactions(event);
    if (path === '/transactions' && event.httpMethod === 'POST') return await handleAddTransaction(event);
    if (/^\/transactions\/\d+/.test(path) && event.httpMethod === 'DELETE') return await handleDeleteTransaction(event);

    // Countdowns
    if (path === '/countdowns' && event.httpMethod === 'GET') return await handleGetCountdowns(event);
    if (path === '/countdowns' && event.httpMethod === 'POST') return await handleAddCountdown(event);
    if (/^\/countdowns\/\d+/.test(path) && event.httpMethod === 'DELETE') return await handleDeleteCountdown(event);

    // Pomodoros
    if (path === '/pomodoros' && event.httpMethod === 'GET') return await handleGetPomodoros(event);
    if (path === '/pomodoros' && event.httpMethod === 'POST') return await handleAddPomodoro(event);

    // Wishlist
    if (path === '/wishlist' && event.httpMethod === 'GET') return await handleGetWishlist(event);
    if (path === '/wishlist' && event.httpMethod === 'POST') return await handleAddWish(event);
    if (/^\/wishlist\/\d+/.test(path) && event.httpMethod === 'PUT') return await handleUpdateWish(event);
    if (/^\/wishlist\/\d+/.test(path) && event.httpMethod === 'DELETE') return await handleDeleteWish(event);

    // Activities
    if (path === '/activities' && event.httpMethod === 'GET') return await handleGetActivities(event);

    // Export/Import
    if (path === '/export' && event.httpMethod === 'GET') return await handleExportData(event);
    if (path === '/import' && event.httpMethod === 'POST') return await handleImportData(event);

    return jsonResponse(404, { success: false, error: 'Not found' });
  } catch (error) {
    console.error('Handler error:', error);
    return jsonResponse(500, { success: false, error: '服务器错误: ' + error.message });
  }
};
