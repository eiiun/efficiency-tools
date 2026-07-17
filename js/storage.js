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

  // 从服务器同步数据到本地
  async syncFromServer() {
    const data = await api.pull()
    if (!data) return false

    if (data.user) {
      this.user = data.user
      storage.set('user', this.user)
    }

    const keys = [
      'todos', 'notes', 'moods', 'transactions',
      'countdowns', 'pomodoros', 'wishlist',
      'achievements', 'activities'
    ]

    keys.forEach(key => {
      if (data[key] !== undefined) {
        this[key] = data[key]
        storage.set(key, this[key])
      }
    })

    return true
  },

  // 将本地数据同步到服务器（防抖，2秒内只发一次）
  syncToServer() {
    if (this._syncTimer) clearTimeout(this._syncTimer)
    this._syncTimer = setTimeout(() => {
      api.sync({
        user: this.user,
        todos: this.todos,
        notes: this.notes,
        moods: this.moods,
        transactions: this.transactions,
        countdowns: this.countdowns,
        pomodoros: this.pomodoros,
        wishlist: this.wishlist,
        achievements: this.achievements,
        activities: this.activities
      })
    }, 2000)
  },

  saveUser() {
    storage.set('user', this.user)
    this.syncToServer()
  },

  saveTodos() {
    storage.set('todos', this.todos)
    this.syncToServer()
  },

  saveNotes() {
    storage.set('notes', this.notes)
    this.syncToServer()
  },

  saveMoods() {
    storage.set('moods', this.moods)
    this.syncToServer()
  },

  saveTransactions() {
    storage.set('transactions', this.transactions)
    this.syncToServer()
  },

  saveCountdowns() {
    storage.set('countdowns', this.countdowns)
    this.syncToServer()
  },

  savePomodoros() {
    storage.set('pomodoros', this.pomodoros)
    this.syncToServer()
  },

  saveWishlist() {
    storage.set('wishlist', this.wishlist)
    this.syncToServer()
  },

  saveAchievements() {
    storage.set('achievements', this.achievements)
    this.syncToServer()
  },

  saveActivities() {
    storage.set('activities', this.activities)
    this.syncToServer()
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