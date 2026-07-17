const path = require('path');
const fs = require('fs');

let db = null;
let isPostgres = false;

async function initDatabase() {
  if (process.env.DATABASE_URL) {
    isPostgres = true;
    return initPostgres();
  } else {
    return initSqlite();
  }
}

async function initSqlite() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  
  const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'efficiency.db');
  
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log('SQLite 数据库加载成功:', DB_PATH);
  } else {
    db = new SQL.Database();
    console.log('SQLite 创建新数据库:', DB_PATH);
  }
  
  await createTables();
  
  return db;
}

async function initPostgres() {
  const { Client } = require('pg');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  await client.connect();
  db = client;
  
  console.log('PostgreSQL 数据库连接成功');
  
  await initPostgresTables();
  
  return client;
}

// 统一的建表函数（SQLite）
async function createTables() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      total_xp INTEGER DEFAULT 100,
      register_date TEXT DEFAULT (datetime('now', 'localtime')),
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      priority TEXT DEFAULT 'medium',
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      tags TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS moods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      mood TEXT NOT NULL,
      emoji TEXT NOT NULL,
      content TEXT,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      note TEXT,
      date TEXT DEFAULT (date('now')),
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS countdowns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      category TEXT DEFAULT 'other',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS pomodoros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      type TEXT DEFAULT 'focus',
      completed_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS wishlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      note TEXT,
      category TEXT DEFAULT 'other',
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      value TEXT,
      unlocked_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      icon TEXT,
      text TEXT NOT NULL,
      xp INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  ];

  for (const sql of tables) {
    try { db.run(sql); } catch (e) { console.error('建表失败:', e.message); }
  }

  // 创建索引
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_moods_user ON moods(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_moods_date ON moods(date)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_countdowns_user ON countdowns(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_pomodoros_user ON pomodoros(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id)'
  ];
  for (const sql of indexes) {
    try { db.run(sql); } catch (e) { /* 忽略 */ }
  }

  saveDatabase();
  console.log('数据库表初始化完成');
}

async function initPostgresTables() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      total_xp INTEGER DEFAULT 100,
      register_date TEXT DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')),
      created_at TEXT DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')),
      updated_at TEXT DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
    )`,
    `CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      priority TEXT DEFAULT 'medium',
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')),
      updated_at TEXT DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
    )`,
    `CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT,
      tags TEXT,
      created_at TEXT DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')),
      updated_at TEXT DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
    )`,
    `CREATE TABLE IF NOT EXISTS moods (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mood TEXT NOT NULL,
      emoji TEXT NOT NULL,
      content TEXT,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
    )`,
    `CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      note TEXT,
      date TEXT DEFAULT (to_char(CURRENT_DATE, 'YYYY-MM-DD')),
      created_at TEXT DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
    )`,
    `CREATE TABLE IF NOT EXISTS countdowns (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      category TEXT DEFAULT 'other',
      created_at TEXT DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
    )`,
    `CREATE TABLE IF NOT EXISTS pomodoros (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      duration INTEGER NOT NULL,
      type TEXT DEFAULT 'focus',
      completed_at TEXT DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
    )`,
    `CREATE TABLE IF NOT EXISTS wishlist (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      note TEXT,
      category TEXT DEFAULT 'other',
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
    )`,
    `CREATE TABLE IF NOT EXISTS achievements (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      value TEXT,
      unlocked_at TEXT DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
    )`,
    `CREATE TABLE IF NOT EXISTS activities (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      icon TEXT,
      text TEXT NOT NULL,
      xp INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
    )`
  ];
  
  for (const sql of tables) {
    try {
      await db.query(sql);
    } catch (e) {
      console.error('创建表失败:', e.message);
    }
  }
}

function saveDatabase() {
  if (!isPostgres && db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    
    const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'efficiency.db');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(DB_PATH, buffer);
  }
}

async function run(sql, params = []) {
  try {
    if (isPostgres) {
      await db.query(sql, params);
      return { changes: 1 };
    } else {
      const sqliteSql = sql.replace(/\$(\d+)/g, '?');
      db.run(sqliteSql, params);
      saveDatabase();
      return { changes: db.getRowsModified() };
    }
  } catch (error) {
    console.error('SQL 执行错误:', error);
    throw error;
  }
}

async function all(sql, params = []) {
  try {
    if (isPostgres) {
      const result = await db.query(sql, params);
      return result.rows;
    } else {
      const sqliteSql = sql.replace(/\$(\d+)/g, '?');
      const stmt = db.prepare(sqliteSql);
      stmt.bind(params);
      
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      
      return results;
    }
  } catch (error) {
    console.error('SQL 查询错误:', error);
    return [];
  }
}

async function get(sql, params = []) {
  try {
    if (isPostgres) {
      const result = await db.query(sql, params);
      return result.rows[0] || null;
    } else {
      const sqliteSql = sql.replace(/\$(\d+)/g, '?');
      const stmt = db.prepare(sqliteSql);
      stmt.bind(params);
      
      let result = null;
      if (stmt.step()) {
        result = stmt.getAsObject();
      }
      stmt.free();
      
      return result;
    }
  } catch (error) {
    console.error('SQL 查询错误:', error);
    return null;
  }
}

async function insert(sql, params = []) {
  try {
    if (isPostgres) {
      const result = await db.query(sql, params);
      return { lastInsertRowid: result.rows[0]?.id || result.rows[0] || 0 };
    } else {
      const sqliteSql = sql.replace(/\$(\d+)/g, '?').replace(/ RETURNING \w+/gi, '');
      db.run(sqliteSql, params);

      // 必须在 saveDatabase() (db.export()) 之前获取 id，因为 export 会重置 last_insert_rowid
      const result = await get("SELECT last_insert_rowid() as id");
      saveDatabase();
      return { lastInsertRowid: result ? result.id : 0 };
    }
  } catch (error) {
    console.error('SQL 插入错误:', error);
    throw error;
  }
}

module.exports = {
  initDatabase,
  run,
  all,
  get,
  insert,
  saveDatabase
};