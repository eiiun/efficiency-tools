const db = require('../database/db');

async function exportData(req, res) {
  try {
    const userId = req.userId;
    
    const data = {
      user: await db.get('SELECT id, username, level, xp, total_xp, register_date FROM users WHERE id = $1', [userId]),
      todos: await db.all('SELECT * FROM todos WHERE user_id = $1', [userId]),
      notes: await db.all('SELECT * FROM notes WHERE user_id = $1', [userId]),
      moods: await db.all('SELECT * FROM moods WHERE user_id = $1', [userId]),
      transactions: await db.all('SELECT * FROM transactions WHERE user_id = $1', [userId]),
      countdowns: await db.all('SELECT * FROM countdowns WHERE user_id = $1', [userId]),
      pomodoros: await db.all('SELECT * FROM pomodoros WHERE user_id = $1', [userId]),
      wishlist: await db.all('SELECT * FROM wishlist WHERE user_id = $1', [userId]),
      activities: await db.all('SELECT * FROM activities WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100', [userId])
    };
    
    res.json({ success: true, data, exportDate: new Date().toISOString() });
  } catch (error) {
    console.error('导出数据错误:', error);
    res.status(500).json({ success: false, error: '导出失败' });
  }
}

async function importData(req, res) {
  try {
    const userId = req.userId;
    const data = req.body;
    
    if (!data) {
      return res.status(400).json({ success: false, error: '没有数据' });
    }
    
    // 先清除该用户的所有旧数据，再重新插入（全量同步）
    const tables = ['todos', 'notes', 'moods', 'transactions', 'countdowns', 'pomodoros', 'wishlist', 'achievements', 'activities'];
    for (const table of tables) {
      try { await db.run(`DELETE FROM ${table} WHERE user_id = $1`, [userId]); } catch (e) { /* 忽略 */ }
    }
    
    const results = { todos: 0, notes: 0, moods: 0, transactions: 0, countdowns: 0, pomodoros: 0, wishlist: 0 };
    
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    if (data.todos && Array.isArray(data.todos)) {
      for (const item of data.todos) {
        try {
          await db.run('INSERT INTO todos (user_id, content, priority, completed, created_at) VALUES ($1, $2, $3, $4, $5)', [userId, item.content, item.priority, item.completed ? 1 : 0, item.created_at || now]);
          results.todos++;
        } catch (e) {
          console.error('导入待办失败:', e);
        }
      }
    }

    if (data.notes && Array.isArray(data.notes)) {
      for (const item of data.notes) {
        try {
          await db.run('INSERT INTO notes (user_id, title, content, tags, created_at) VALUES ($1, $2, $3, $4, $5)', [userId, item.title, item.content, item.tags, item.created_at || now]);
          results.notes++;
        } catch (e) {
          console.error('导入笔记失败:', e);
        }
      }
    }

    if (data.moods && Array.isArray(data.moods)) {
      for (const item of data.moods) {
        try {
          await db.run('INSERT INTO moods (user_id, mood, emoji, content, date, created_at) VALUES ($1, $2, $3, $4, $5, $6)', [userId, item.mood, item.emoji, item.content, item.date, item.created_at || now]);
          results.moods++;
        } catch (e) {
          console.error('导入心情失败:', e);
        }
      }
    }

    if (data.transactions && Array.isArray(data.transactions)) {
      for (const item of data.transactions) {
        try {
          await db.run('INSERT INTO transactions (user_id, type, amount, category, note, date, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)', [userId, item.type, item.amount, item.category, item.note, item.date, item.created_at || now]);
          results.transactions++;
        } catch (e) {
          console.error('导入交易失败:', e);
        }
      }
    }

    if (data.countdowns && Array.isArray(data.countdowns)) {
      for (const item of data.countdowns) {
        try {
          await db.run('INSERT INTO countdowns (user_id, title, date, category, created_at) VALUES ($1, $2, $3, $4, $5)', [userId, item.title, item.date, item.category, item.created_at || now]);
          results.countdowns++;
        } catch (e) {
          console.error('导入倒计时失败:', e);
        }
      }
    }

    if (data.pomodoros && Array.isArray(data.pomodoros)) {
      for (const item of data.pomodoros) {
        try {
          await db.run('INSERT INTO pomodoros (user_id, duration, type, completed_at) VALUES ($1, $2, $3, $4)', [userId, item.duration, item.type, item.completed_at || now]);
          results.pomodoros++;
        } catch (e) {
          console.error('导入番茄钟失败:', e);
        }
      }
    }

    if (data.wishlist && Array.isArray(data.wishlist)) {
      for (const item of data.wishlist) {
        try {
          await db.run('INSERT INTO wishlist (user_id, title, note, category, completed, created_at) VALUES ($1, $2, $3, $4, $5, $6)', [userId, item.title, item.note, item.category, item.completed ? 1 : 0, item.created_at || now]);
          results.wishlist++;
        } catch (e) {
          console.error('导入愿望失败:', e);
        }
      }
    }
    
    res.json({ success: true, message: '数据导入成功', results });
  } catch (error) {
    console.error('导入数据错误:', error);
    res.status(500).json({ success: false, error: '导入失败' });
  }
}

module.exports = { exportData, importData };