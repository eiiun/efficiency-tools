const db = require('../database/db');

async function getTodos(req, res) {
  try {
    const todos = await db.all('SELECT * FROM todos WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
    res.json({ success: true, data: todos });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
}

async function addTodo(req, res) {
  try {
    const { content, priority = 'medium' } = req.body;
    
    if (!content) {
      return res.status(400).json({ success: false, error: '内容不能为空' });
    }
    
    const result = await db.insert(
      'INSERT INTO todos (user_id, content, priority) VALUES ($1, $2, $3) RETURNING id',
      [req.userId, content, priority]
    );
    
    await addActivityAndXP(req.userId, '✅', `添加待办: ${content}`, 5);
    
    res.json({ success: true, data: { id: result.lastInsertRowid.id || result.lastInsertRowid, content, priority, completed: 0 } });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
}

async function updateTodo(req, res) {
  try {
    const { id } = req.params;
    const { content, priority, completed } = req.body;
    
    const todo = await db.get('SELECT * FROM todos WHERE id = $1 AND user_id = $2', [id, req.userId]);
    if (!todo) {
      return res.status(404).json({ success: false, error: '待办不存在' });
    }
    
    if (completed && !todo.completed) {
      await addActivityAndXP(req.userId, '🎉', `完成待办: ${todo.content}`, 10);
    }
    
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    await db.run(
      'UPDATE todos SET content = $1, priority = $2, completed = $3, updated_at = $4 WHERE id = $5 AND user_id = $6',
      [content || todo.content, priority || todo.priority, completed ? 1 : 0, now, id, req.userId]
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
}

async function deleteTodo(req, res) {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM todos WHERE id = $1 AND user_id = $2', [id, req.userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
}

async function getNotes(req, res) {
  try {
    const notes = await db.all('SELECT * FROM notes WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
    res.json({ success: true, data: notes });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
}

async function addNote(req, res) {
  try {
    const { title, content, tags } = req.body;
    
    if (!title) {
      return res.status(400).json({ success: false, error: '标题不能为空' });
    }
    
    const result = await db.insert(
      'INSERT INTO notes (user_id, title, content, tags) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.userId, title, content || '', tags || '']
    );
    
    await addActivityAndXP(req.userId, '📝', '创建笔记', 5);
    
    res.json({ success: true, data: { id: result.lastInsertRowid.id || result.lastInsertRowid, title, content, tags } });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
}

async function updateNote(req, res) {
  try {
    const { id } = req.params;
    const { title, content, tags } = req.body;
    
    const note = await db.get('SELECT * FROM notes WHERE id = $1 AND user_id = $2', [id, req.userId]);
    if (!note) {
      return res.status(404).json({ success: false, error: '笔记不存在' });
    }
    
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    await db.run(
      'UPDATE notes SET title = $1, content = $2, tags = $3, updated_at = $4 WHERE id = $5 AND user_id = $6',
      [title || note.title, content, tags, now, id, req.userId]
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
}

async function deleteNote(req, res) {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM notes WHERE id = $1 AND user_id = $2', [id, req.userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
}

async function getMoods(req, res) {
  try {
    const moods = await db.all('SELECT * FROM moods WHERE user_id = $1 ORDER BY date DESC', [req.userId]);
    res.json({ success: true, data: moods });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
}

async function addMood(req, res) {
  try {
    const { mood, emoji, content, date } = req.body;
    
    if (!mood || !emoji || !date) {
      return res.status(400).json({ success: false, error: '参数不完整' });
    }
    
    const existing = await db.get('SELECT * FROM moods WHERE user_id = $1 AND date = $2', [req.userId, date]);
    
    if (existing) {
      await db.run('UPDATE moods SET mood = $1, emoji = $2, content = $3 WHERE id = $4', [mood, emoji, content || '', existing.id]);
      res.json({ success: true, data: { id: existing.id } });
    } else {
      const result = await db.insert(
        'INSERT INTO moods (user_id, mood, emoji, content, date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [req.userId, mood, emoji, content || '', date]
      );
      
      await addActivityAndXP(req.userId, emoji, '记录心情', 5);
      res.json({ success: true, data: { id: result.lastInsertRowid.id || result.lastInsertRowid } });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
}

async function getTransactions(req, res) {
  try {
    const transactions = await db.all('SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC, created_at DESC', [req.userId]);
    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
}

async function addTransaction(req, res) {
  try {
    const { type, amount, category, note, date } = req.body;
    
    if (!type || !amount || !category) {
      return res.status(400).json({ success: false, error: '参数不完整' });
    }
    
    const result = await db.insert(
      'INSERT INTO transactions (user_id, type, amount, category, note, date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [req.userId, type, amount, category, note || '', date || new Date().toISOString().split('T')[0]]
    );
    
    const icon = type === 'income' ? '💰' : '💸';
    await addActivityAndXP(req.userId, icon, `${type === 'income' ? '收入' : '支出'}: ¥${amount}`, 2);
    
    res.json({ success: true, data: { id: result.lastInsertRowid.id || result.lastInsertRowid, type, amount, category, note, date } });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
}

async function deleteTransaction(req, res) {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [id, req.userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
}

async function getCountdowns(req, res) {
  try {
    const countdowns = await db.all('SELECT * FROM countdowns WHERE user_id = $1 ORDER BY date ASC', [req.userId]);
    res.json({ success: true, data: countdowns });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
}

async function addCountdown(req, res) {
  try {
    const { title, date, category } = req.body;
    
    if (!title || !date) {
      return res.status(400).json({ success: false, error: '参数不完整' });
    }
    
    const result = await db.insert(
      'INSERT INTO countdowns (user_id, title, date, category) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.userId, title, date, category || 'other']
    );
    
    await addActivityAndXP(req.userId, '⏳', `添加倒计时: ${title}`, 5);
    
    res.json({ success: true, data: { id: result.lastInsertRowid.id || result.lastInsertRowid, title, date, category } });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
}

async function deleteCountdown(req, res) {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM countdowns WHERE id = $1 AND user_id = $2', [id, req.userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
}

async function getPomodoros(req, res) {
  try {
    const pomodoros = await db.all('SELECT * FROM pomodoros WHERE user_id = $1 ORDER BY completed_at DESC', [req.userId]);
    res.json({ success: true, data: pomodoros });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
}

async function addPomodoro(req, res) {
  try {
    const { duration, type } = req.body;
    
    if (!duration) {
      return res.status(400).json({ success: false, error: '时长不能为空' });
    }
    
    const result = await db.insert(
      'INSERT INTO pomodoros (user_id, duration, type) VALUES ($1, $2, $3) RETURNING id',
      [req.userId, duration, type || 'focus']
    );
    
    await addActivityAndXP(req.userId, '🍅', `完成番茄钟 ${duration}分钟`, Math.floor(duration / 5) + 5);
    
    res.json({ success: true, data: { id: result.lastInsertRowid.id || result.lastInsertRowid, duration, type } });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
}

async function getWishlist(req, res) {
  try {
    const wishlist = await db.all('SELECT * FROM wishlist WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
    res.json({ success: true, data: wishlist });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
}

async function addWish(req, res) {
  try {
    const { title, note, category } = req.body;
    
    if (!title) {
      return res.status(400).json({ success: false, error: '标题不能为空' });
    }
    
    const result = await db.insert(
      'INSERT INTO wishlist (user_id, title, note, category) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.userId, title, note || '', category || 'other']
    );
    
    await addActivityAndXP(req.userId, '✨', `添加愿望: ${title}`, 3);
    
    res.json({ success: true, data: { id: result.lastInsertRowid.id || result.lastInsertRowid, title, note, category, completed: 0 } });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
}

async function updateWish(req, res) {
  try {
    const { id } = req.params;
    const { completed } = req.body;
    
    const wish = await db.get('SELECT * FROM wishlist WHERE id = $1 AND user_id = $2', [id, req.userId]);
    if (!wish) {
      return res.status(404).json({ success: false, error: '愿望不存在' });
    }
    
    await db.run('UPDATE wishlist SET completed = $1 WHERE id = $2', [completed ? 1 : 0, id]);
    
    if (completed && !wish.completed) {
      await addActivityAndXP(req.userId, '🌟', `实现愿望: ${wish.title}`, 20);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
}

async function deleteWish(req, res) {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM wishlist WHERE id = $1 AND user_id = $2', [id, req.userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
}

async function getActivities(req, res) {
  try {
    const activities = await db.all('SELECT * FROM activities WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [req.userId]);
    res.json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
}

async function addActivityAndXP(userId, icon, text, xp) {
  try {
    await db.run('INSERT INTO activities (user_id, icon, text, xp) VALUES ($1, $2, $3, $4)', [userId, icon, text, xp]);
    
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

module.exports = {
  getTodos, addTodo, updateTodo, deleteTodo,
  getNotes, addNote, updateNote, deleteNote,
  getMoods, addMood,
  getTransactions, addTransaction, deleteTransaction,
  getCountdowns, addCountdown, deleteCountdown,
  getPomodoros, addPomodoro,
  getWishlist, addWish, updateWish, deleteWish,
  getActivities
};