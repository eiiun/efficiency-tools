const homePage = {
  init() {
    this.updateUI()
  },

  updateUI() {
    if (!store.user) return

    const greeting = this.getGreeting()
    document.getElementById('home-greeting').textContent = greeting
    document.getElementById('home-name').textContent = store.user.name
    document.getElementById('home-avatar').textContent = store.user.name.charAt(0)
    document.getElementById('home-level').textContent = `Lv.${store.user.level}`

    const xpPercent = (store.user.xp / store.user.totalXp * 100).toFixed(1)
    document.getElementById('home-xp').textContent = `${store.user.xp} / ${store.user.totalXp} XP`
    document.getElementById('home-xp-bar').style.width = `${xpPercent}%`

    const todayTodos = store.todos.filter(t => !t.completed).length
    document.getElementById('overview-todo').textContent = todayTodos

    const today = new Date().toISOString().split('T')[0]
    const todayPomodoros = store.pomodoros.filter(p => p.date === today).length
    document.getElementById('overview-pomodoro').textContent = todayPomodoros

    const todayMood = store.moods.find(m => m.date === today)
    document.getElementById('overview-mood').textContent = todayMood ? todayMood.emoji : '-'

    // 更新底部状态栏
    const bar = document.getElementById('px-status-bar')
    if (bar) {
      bar.style.display = ''
      document.getElementById('bar-level').textContent = store.user.level
      document.getElementById('bar-xp').textContent = store.user.xp
      const streak = store.user.streak || 0
      document.getElementById('bar-streak').textContent = streak
    }
  },

  getGreeting() {
    const hour = new Date().getHours()
    if (hour < 6) return '夜深了'
    if (hour < 9) return '早上好'
    if (hour < 12) return '上午好'
    if (hour < 14) return '中午好'
    if (hour < 17) return '下午好'
    if (hour < 19) return '傍晚好'
    return '晚上好'
  }
}