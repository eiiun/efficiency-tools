const achievementsPage = {
  badges: [
    { id: 1, name: '初次登录', icon: '⭐', bgColor: '#f0f8ff', description: '', check: () => true },
    { id: 2, name: '任务新手', icon: '✅', bgColor: '#e8f8e8', description: '完成第一个任务', check: () => store.todos.some(t => t.completed) },
    { id: 3, name: '任务达人', icon: '📋', bgColor: '#e8f8e8', description: '完成10个任务', check: () => store.todos.filter(t => t.completed).length >= 10 },
    { id: 4, name: '记录者', icon: '✏️', bgColor: '#f0f8ff', description: '写第一篇笔记', check: () => store.notes.length > 0 },
    { id: 5, name: '笔记达人', icon: '📝', bgColor: '#f0f8ff', description: '写10篇笔记', check: () => store.notes.length >= 10 },
    { id: 6, name: '心情记录者', icon: '💗', bgColor: '#ffd6e0', description: '记录一次心情', check: () => store.moods.length > 0 },
    { id: 7, name: '连续7天', icon: '🔥', bgColor: '#ffe0a0', description: '连续记录7天', check: () => false },
    { id: 8, name: '番茄新手', icon: '🍅', bgColor: '#ff9f9f', description: '完成第一个番茄钟', check: () => store.pomodoros.some(p => p.mode === 'focus') },
    { id: 9, name: '番茄达人', icon: '🏆', bgColor: '#ff9f9f', description: '累计完成10个番茄钟', check: () => store.pomodoros.filter(p => p.mode === 'focus').length >= 10 },
    { id: 10, name: '记账新手', icon: '💰', bgColor: '#b5e8b5', description: '记第一笔账', check: () => store.transactions.length > 0 },
    { id: 11, name: '愿望实现', icon: '🎉', bgColor: '#ffd6a0', description: '完成一个愿望', check: () => store.wishlist.some(w => w.completed) },
    { id: 12, name: '等级5', icon: '👑', bgColor: '#ffd700', description: '达到等级5', check: () => store.user && store.user.level >= 5 }
  ],

  init() {
    this.render()
  },

  onShow() {
    this.render()
  },

  render() {
    if (!store.user) return

    document.getElementById('achievement-level').textContent = `Lv.${store.user.level}`
    
    const xpPercent = (store.user.xp / store.user.totalXp * 100).toFixed(1)
    const remaining = store.user.totalXp - store.user.xp
    
    document.getElementById('achievement-xp').textContent = `${store.user.xp} / ${store.user.totalXp} XP`
    document.getElementById('achievement-xp-bar').style.width = `${xpPercent}%`
    document.getElementById('achievement-xp-remaining').textContent = `距下一级还需 ${remaining} XP`

    const pomodoroCount = store.pomodoros.filter(p => p.mode === 'focus').length
    const todoCount = store.todos.filter(t => t.completed).length
    const moodCount = store.moods.length

    document.getElementById('achievement-pomodoros').textContent = pomodoroCount
    document.getElementById('achievement-todos').textContent = todoCount
    document.getElementById('achievement-moods').textContent = moodCount

    this.renderBadges()
    this.renderActivities()
  },

  renderBadges() {
    const container = document.getElementById('achievements-badges')
    
    container.innerHTML = this.badges.map(badge => {
      const unlocked = badge.check()
      return `
        <div class="badge-item ${unlocked ? '' : 'locked'}" 
             style="background-color: ${unlocked ? badge.bgColor : '#f0f0f0'};"
             onclick="achievementsPage.showBadge(${badge.id})">
          <div class="badge-icon">${unlocked ? badge.icon : '🔒'}</div>
          <div class="badge-name">${badge.name}</div>
          ${!unlocked ? `<div class="badge-desc">${badge.description}</div>` : ''}
        </div>
      `
    }).join('')
  },

  renderActivities() {
    const container = document.getElementById('achievements-activities')
    const activities = store.activities.slice(0, 10)

    if (activities.length === 0) {
      container.innerHTML = '<div class="activity-item"><div class="activity-text" style="color:#999;text-align:center;">暂无动态</div></div>'
      return
    }

    container.innerHTML = activities.map(activity => `
      <div class="activity-item">
        <div class="activity-icon">${activity.icon}</div>
        <div class="activity-text">${activity.text}</div>
        ${activity.xp > 0 ? `<div class="activity-xp">+${activity.xp} XP</div>` : ''}
        <div class="activity-time">${this.formatTime(activity.timestamp)}</div>
      </div>
    `).join('')
  },

  formatTime(timestamp) {
    if (!timestamp) return '刚刚'
    
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 2) return '昨天'
    return `${days}天前`
  },

  showBadge(id) {
    const badge = this.badges.find(b => b.id === id)
    if (!badge) return

    const unlocked = badge.check()
    app.showAlert(`${badge.icon} ${badge.name}`, unlocked ? '恭喜获得此成就！' : badge.description)
  }
}