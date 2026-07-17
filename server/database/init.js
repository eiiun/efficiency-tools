const db = require('./db');

async function initTables() {
  try {
    await db.initDatabase();
    console.log('数据库初始化完成！');
    process.exit(0);
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

initTables();