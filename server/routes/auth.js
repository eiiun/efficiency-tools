const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { generateToken } = require('../middleware/auth');

async function register(req, res) {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, error: '用户名和密码不能为空' });
    }
    
    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ success: false, error: '用户名长度应为2-20个字符' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: '密码长度至少为6个字符' });
    }
    
    const existingUser = await db.get('SELECT id FROM users WHERE username = $1', [username]);
    
    if (existingUser) {
      return res.status(409).json({ success: false, error: '用户名已存在' });
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const result = await db.insert(
      'INSERT INTO users (username, password, level, xp, total_xp) VALUES ($1, $2, 1, 0, 100) RETURNING id',
      [username, hashedPassword]
    );
    
    const userId = result.lastInsertRowid.id || result.lastInsertRowid;
    
    await db.run(
      'INSERT INTO activities (user_id, icon, text, xp) VALUES ($1, $2, $3, $4)',
      [userId, '⭐', '注册账号', 10]
    );
    
    const token = generateToken(userId, username);
    
    res.json({
      success: true,
      data: { userId, name: username, level: 1, xp: 0, totalXp: 100, token }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, error: '用户名和密码不能为空' });
    }
    
    const user = await db.get('SELECT * FROM users WHERE username = $1', [username]);
    
    if (!user) {
      return res.status(401).json({ success: false, error: '用户名或密码错误' });
    }
    
    const isValidPassword = bcrypt.compareSync(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: '用户名或密码错误' });
    }
    
    await db.run(
      'INSERT INTO activities (user_id, icon, text, xp) VALUES ($1, $2, $3, $4)',
      [user.id, '✅', '登录成功', 0]
    );
    
    const token = generateToken(user.id, user.username);
    
    res.json({
      success: true,
      data: {
        userId: user.id,
        name: user.username,
        level: user.level,
        xp: user.xp,
        totalXp: user.total_xp,
        registerDate: user.register_date,
        token
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
}

async function getProfile(req, res) {
  try {
    const user = await db.get(
      'SELECT id, username, level, xp, total_xp, register_date FROM users WHERE id = $1',
      [req.userId]
    );
    
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }
    
    res.json({
      success: true,
      data: {
        userId: user.id,
        name: user.username,
        level: user.level,
        xp: user.xp,
        totalXp: user.total_xp,
        registerDate: user.register_date
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
}

module.exports = { register, login, getProfile };