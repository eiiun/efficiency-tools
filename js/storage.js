const storage = {
  get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key)
      if (value === null) return defaultValue
      return JSON.parse(value)
    } catch (e) {
      return defaultValue
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (e) {
      console.error('Storage set error:', e)
      return false
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key)
      return true
    } catch (e) {
      return false
    }
  }
}

const store = {
  user: null,
  todos: [],
  notes: [],
  moods: [],
  transactions: [],
  countdowns: [],
  pomodoros: [],
  wishlist: [],
  achievements: [],
  activities: [],
  _syncTimer: null,

  init() {
    this.user = storage.get('user', null)
    this.todos = storage.get('todos', [])
    this.notes = storage.get('notes', [])
    this.moods = storage.get('moods', [])
    this.transactions = storage.get('transactions', [])
    this.countdowns = storage.get('countdowns', [])
    this.pomodoros = storage.get('pomodoros', [])
    this.wishlist = storage.get('wishlist', [])
    this.achievements = storage.get('achievements', [])
    this.activities = storage.get('activities', [])
  },

  // 从服务器拉取所有数据，转换成前端格式，更新 store 和 localStorage
  async refreshFromServer() {
    try {
      const result = await api.get('/export')
      if (!result.success) return false
      const data = result.data

      // 更新用户信息
      if (data.user) {
        this.user = {
          name: data.user.username,
          level: data.user.level,
          xp: data.user.xp,
          totalXp: data.user.total_xp,
          registerDate: data.user.register_date
        }
        storage.set('user', this.user)
      }

      // 待办：content→title, completed 0/1→布尔, created_at→createdAt
      if (data.todos) {
        this.todos = data.todos.map(t => ({
          id: t.id,
          title: t.content,
          priority: t.priority || 'medium',
          completed: !!t.completed,
          createdAt: new Date(t.created_at).getTime(),
          completedAt: t.completed_at ? new Date(t.completed_at).getTime() : null
        }))
        storage.set('todos', this.todos)
      }

      // 笔记：tags→tag, created_at→createdAt, updated_at→updatedAt
      if (data.notes) {
        this.notes = data.notes.map(n => ({
          id: n.id,
          title: n.title,
          content: n.content || '',
          tag: n.tags || '其他',
          createdAt: new Date(n.created_at).getTime(),
          updatedAt: new Date(n.updated_at || n.created_at).getTime()
        }))
        storage.set('notes', this.notes)
      }

      // 心情：添加 dateStr 和 timestamp
      if (data.moods) {
        this.moods = data.moods.map(m => {
          const d = new Date(m.date)
          return {
            id: m.id,
            date: m.date,
            dateStr: `${d.getMonth() + 1}月${d.getDate()}日`,
            mood: m.mood,
            emoji: m.emoji,
            content: m.content || '',
            timestamp: new Date(m.created_at).getTime()
          }
        })
        storage.set('moods', this.moods)
      }

      // 记账
      if (data.transactions) {
        this.transactions = data.transactions.map(t => ({
          id: t.id,
          type: t.type,
          amount: String(t.amount),
          category: t.category,
          note: t.note || '',
          date: t.date,
          timestamp: new Date(t.created_at).getTime()
        }))
        storage.set('transactions', this.transactions)
      }

      // 倒计时
      if (data.countdowns) {
        this.countdowns = data.countdowns.map(c => ({
          id: c.id,
          title: c.title,
          date: c.date,
          category: c.category || 'other',
          createdAt: new Date(c.created_at).getTime()
        }))
        storage.set('countdowns', this.countdowns)
      }

      // 番茄钟：type→mode, completed_at→date+time
      if (data.pomodoros) {
        this.pomodoros = data.pomodoros.map(p => {
          const dt = new Date(p.completed_at)
          return {
            id: p.id,
            mode: p.type || 'focus',
            duration: p.duration,
            date: dt.toISOString().split('T')[0],
            time: `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
          }
        })
        storage.set('pomodoros', this.pomodoros)
      }

      // 愿望清单：completed 0/1→布尔
      if (data.wishlist) {
        this.wishlist = data.wishlist.map(w => ({
          id: w.id,
          title: w.title,
          note: w.note || '',
          category: w.category || 'other',
          completed: !!w.completed,
          createdAt: new Date(w.created_at).getTime()
        }))
        storage.set('wishlist', this.wishlist)
      }

      // 动态：created_at→timestamp
      if (data.activities) {
        this.activities = data.activities.map(a => ({
          id: a.id,
          icon: a.icon || '📌',
          text: a.text,
          xp: a.xp || 0,
          timestamp: new Date(a.created_at).getTime()
        }))
        storage.set('activities', this.activities)
      }

      return true
    } catch (e) {
      console.error('[Store] 从服务器同步失败:', e.message)
      return false
    }
  },

  // 仅刷新用户信息（XP/等级），不拉取全量数据
  async refreshUserProfile() {
    try {
      const result = await api.getProfile()
      if (result.success && result.data) {
        const d = result.data
        this.user = {
          name: d.name,
          level: d.level,
          xp: d.xp,
          totalXp: d.totalXp,
          registerDate: d.registerDate
        }
        this.saveUser()
        // 同步刷新底部状态栏 XP 显示（所有页面通用）
        if (typeof app !== 'undefined' && app.updateStatusBar) {
          app.updateStatusBar()
        }
      }
    } catch (e) {
      console.warn('[Store] 刷新用户信息失败:', e.message)
    }
  },

  // 服务端数据格式 → 前端格式 转换工具
  mapTodo(t) {
    return { id: t.id, title: t.content, priority: t.priority || 'medium', completed: !!t.completed, createdAt: t.created_at ? new Date(t.created_at).getTime() : Date.now(), completedAt: t.completed_at ? new Date(t.completed_at).getTime() : null }
  },
  mapNote(n) {
    return { id: n.id, title: n.title, content: n.content || '', tag: n.tags || '其他', createdAt: n.created_at ? new Date(n.created_at).getTime() : Date.now(), updatedAt: n.updated_at ? new Date(n.updated_at).getTime() : Date.now() }
  },
  mapTransaction(t) {
    return { id: t.id, type: t.type, amount: String(t.amount), category: t.category, note: t.note || '', date: t.date, timestamp: t.created_at ? new Date(t.created_at).getTime() : Date.now() }
  },
  mapCountdown(c) {
    return { id: c.id, title: c.title, date: c.date, category: c.category || 'other', createdAt: c.created_at ? new Date(c.created_at).getTime() : Date.now() }
  },
  mapPomodoro(p) {
    const dt = p.completed_at ? new Date(p.completed_at) : new Date()
    return { id: p.id, mode: p.type || 'focus', duration: p.duration, date: dt.toISOString().split('T')[0], time: `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}` }
  },
  mapWish(w) {
    return { id: w.id, title: w.title, note: w.note || '', category: w.category || 'other', completed: !!w.completed, createdAt: w.created_at ? new Date(w.created_at).getTime() : Date.now() }
  },

  saveUser() {
    storage.set('user', this.user)
  },

  saveTodos() {
    storage.set('todos', this.todos)
  },

  saveNotes() {
    storage.set('notes', this.notes)
  },

  saveMoods() {
    storage.set('moods', this.moods)
  },

  saveTransactions() {
    storage.set('transactions', this.transactions)
  },

  saveCountdowns() {
    storage.set('countdowns', this.countdowns)
  },

  savePomodoros() {
    storage.set('pomodoros', this.pomodoros)
  },

  saveWishlist() {
    storage.set('wishlist', this.wishlist)
  },

  saveAchievements() {
    storage.set('achievements', this.achievements)
  },

  saveActivities() {
    storage.set('activities', this.activities)
  },

  addXP(amount) {
    if (!this.user) return

    this.user.xp += amount

    while (this.user.xp >= this.user.totalXp) {
      this.user.xp -= this.user.totalXp
      this.user.level += 1
      this.user.totalXp = this.user.level * 100 + (this.user.level - 1) * 50

      this.addActivity('🏆', `升级到 Lv.${this.user.level}`, 0)
    }

    this.saveUser()
  },

  addActivity(icon, text, xp) {
    const activity = {
      id: Date.now() + Math.random(),
      icon,
      text,
      xp,
      timestamp: Date.now()
    }

    this.activities.unshift(activity)

    if (this.activities.length > 50) {
      this.activities = this.activities.slice(0, 50)
    }

    this.saveActivities()

    if (xp > 0) {
      this.addXP(xp)
    }
  },

  // 旧登录方法（纯本地，作为降级方案保留）
  loginLocal(username) {
    let user = this.user

    if (!user || user.name !== username) {
      user = {
        name: username,
        level: 1,
        xp: 0,
        totalXp: 100,
        registerDate: new Date().toISOString()
      }
      this.user = user
      this.saveUser()

      this.addActivity('⭐', '初次登录', 10)
    }

    return user
  },

  logout() {
    this.user = null
    storage.set('user', null)
    api.logout()
  }
}

store.init()