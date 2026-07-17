# 效率工具 - 后端服务

一个基于 Node.js + Express + SQLite 的效率工具后端服务，支持用户认证、数据云同步和数据导入导出功能。

## 功能特性

- ✅ 用户注册与登录（JWT 认证）
- 📝 待办事项管理
- 📝 随手笔记
- 💗 心情日记
- 💰 简单记账
- ⏳ 倒计时
- 🍅 番茄钟
- ✨ 愿望清单
- 🏆 成就系统
- 💾 数据导入导出

## 技术栈

- **后端框架**: Express.js
- **数据库**: SQLite (better-sqlite3)
- **认证**: JWT (jsonwebtoken)
- **密码加密**: bcryptjs
- **环境变量**: dotenv

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

```bash
npm run init-db
```

这将在 `server/database/` 目录下创建 `efficiency.db` 数据库文件。

### 3. 配置环境变量（可选）

创建 `.env` 文件（已提供默认配置）：

```env
# 服务器配置
PORT=3000
NODE_ENV=development

# JWT 密钥（生产环境请更换）
JWT_SECRET=your-secret-key-change-in-production-2024

# 数据库路径
DB_PATH=./server/database/efficiency.db
```

### 4. 启动服务器

**开发模式（自动重启）:**
```bash
npm run dev
```

**生产模式:**
```bash
npm start
```

服务将在 http://localhost:3000 启动

### 5. 访问应用

打开浏览器访问 http://localhost:3000

### 6. 分享给他人使用

启动服务器后，终端会显示多种访问方式：

```
============================================================
效率工具后端服务已启动
环境: development
============================================================
访问地址:
  本地访问: http://localhost:3000
  本机访问: http://127.0.0.1:3000
  局域网访问: http://192.168.0.106:3000
============================================================
分享给他人:
  1. 确保所有设备连接在同一个 WiFi/局域网
  2. 将上面的"局域网访问"地址分享给朋友
  3. 朋友在浏览器中打开该地址即可使用
============================================================
```

**分享步骤：**

1. **确保在同一网络**：你的电脑和朋友的手机/电脑必须连接在同一个 WiFi 或局域网
2. **分享地址**：将终端显示的"局域网访问"地址（如 `http://192.168.0.106:3000`）分享给朋友
3. **打开使用**：朋友在浏览器中打开该地址，注册账号即可使用

**注意事项：**

- 分享功能仅适用于局域网内使用
- 如果需要外网访问，需要进行端口映射或部署到云服务器
- 每次重启服务器，IP 地址可能会变化，请重新查看终端获取最新地址

## 部署到 Railway

Railway 是一个免费的云平台，可以让您的应用在互联网上公开访问。

### 步骤 1：准备代码

确保项目已推送到 GitHub：
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/efficiency-tools.git
git push -u origin main
```

### 步骤 2：创建 Railway 项目

1. 访问 https://railway.app 并登录
2. 点击 "New Project" → "Deploy from GitHub repo"
3. 选择您的 GitHub 仓库

### 步骤 3：添加 PostgreSQL 数据库

1. 在 Railway 项目中点击 "Add Service" → "Database" → "PostgreSQL"
2. Railway 会自动创建数据库并设置 `DATABASE_URL` 环境变量

### 步骤 4：设置环境变量

添加以下环境变量到 Railway：

| 变量名 | 值 |
|--------|-----|
| `JWT_SECRET` | 生成一个随机字符串 |
| `NODE_ENV` | `production` |

### 步骤 5：部署

Railway 会自动检测并部署您的应用。部署完成后，您会获得一个公开的 URL（如 `https://efficiency-tools-xxx.up.railway.app`）。

### 步骤 6：分享

把 Railway 生成的 URL 发给朋友，他们就可以在任何地方访问使用了！

### 更新代码

```bash
git add .
git commit -m "Update"
git push
```

Railway 会自动检测并重新部署。

## API 接口文档

### 认证相关

#### 注册
```
POST /api/auth/register
Body: { "username": "用户名", "password": "密码" }
```

#### 登录
```
POST /api/auth/login
Body: { "username": "用户名", "password": "密码" }
```

#### 获取用户信息
```
GET /api/auth/profile
Headers: { "Authorization": "Bearer <token>" }
```

### 数据同步

所有数据接口都需要在请求头中携带 JWT Token：
```
Authorization: Bearer <token>
```

#### 待办事项
- `GET /api/todos` - 获取所有待办
- `POST /api/todos` - 添加待办
- `PUT /api/todos/:id` - 更新待办
- `DELETE /api/todos/:id` - 删除待办

#### 笔记
- `GET /api/notes` - 获取所有笔记
- `POST /api/notes` - 添加笔记
- `PUT /api/notes/:id` - 更新笔记
- `DELETE /api/notes/:id` - 删除笔记

#### 心情日记
- `GET /api/moods` - 获取所有心情记录
- `POST /api/moods` - 添加心情记录

#### 记账
- `GET /api/transactions` - 获取所有交易记录
- `POST /api/transactions` - 添加交易记录
- `DELETE /api/transactions/:id` - 删除交易记录

#### 倒计时
- `GET /api/countdowns` - 获取所有倒计时
- `POST /api/countdowns` - 添加倒计时
- `DELETE /api/countdowns/:id` - 删除倒计时

#### 番茄钟
- `GET /api/pomodoros` - 获取所有番茄钟记录
- `POST /api/pomodoros` - 添加番茄钟记录

#### 愿望清单
- `GET /api/wishlist` - 获取所有愿望
- `POST /api/wishlist` - 添加愿望
- `PUT /api/wishlist/:id` - 更新愿望状态
- `DELETE /api/wishlist/:id` - 删除愿望

#### 活动记录
- `GET /api/activities` - 获取最近活动

### 数据导入导出

#### 导出数据
```
GET /api/export
Headers: { "Authorization": "Bearer <token>" }
```

#### 导入数据
```
POST /api/import
Headers: { "Authorization": "Bearer <token>" }
Body: { 导出的数据对象 }
```

## 项目结构

```
效率工具网页版/
├── server/                 # 后端代码
│   ├── index.js           # 服务器入口
│   ├── database/          # 数据库相关
│   │   ├── db.js          # 数据库连接
│   │   └── init.js        # 数据库初始化
│   ├── middleware/        # 中间件
│   │   └── auth.js        # 认证中间件
│   └── routes/            # 路由
│       ├── auth.js        # 认证路由
│       ├── data.js        # 数据路由
│       └── export.js      # 导入导出路由
├── js/                    # 前端代码
│   ├── api.js             # API 封装
│   ├── app.js             # 应用主逻辑
│   ├── storage.js         # 本地存储
│   └── pages/             # 各页面逻辑
├── css/                   # 样式文件
│   └── style.css
├── index.html             # 主页面
├── package.json           # 项目配置
├── .env                   # 环境变量
└── .gitignore             # Git 忽略文件
```

## 数据库结构

数据库包含以下表：

- `users` - 用户表
- `todos` - 待办事项表
- `notes` - 笔记表
- `moods` - 心情日记表
- `transactions` - 交易记录表
- `countdowns` - 倒计时表
- `pomodoros` - 番茄钟记录表
- `wishlist` - 愿望清单表
- `achievements` - 成就表
- `activities` - 活动记录表

## 经验值系统

用户在完成以下操作时会获得经验值：

- 注册账号: +10 XP
- 添加待办: +5 XP
- 完成待办: +10 XP
- 创建笔记: +5 XP
- 记录心情: +5 XP
- 记账: +2 XP
- 添加倒计时: +5 XP
- 完成番茄钟: +5 XP (每5分钟额外+1 XP)
- 添加愿望: +3 XP
- 实现愿望: +20 XP

升级所需经验值: `当前等级 × 100 + (当前等级 - 1) × 50`

## 开发说明

### 修改前端 API 地址

如需修改后端地址，编辑 [js/api.js](js/api.js:2)：

```javascript
const API_BASE_URL = 'http://your-server:port/api';
```

### 生产环境注意事项

1. 修改 `.env` 中的 `JWT_SECRET` 为安全的随机字符串
2. 设置 `NODE_ENV=production`
3. 使用 HTTPS
4. 配置反向代理（如 Nginx）
5. 定期备份数据库文件

## 许可证

MIT License