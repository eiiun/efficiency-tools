const pomodoroPage = {
  currentMode: 'focus',
  focusMinutes: 25,
  restMinutes: 5,
  remainingSeconds: 25 * 60,
  isRunning: false,
  timerInterval: null,
  circumference: 2 * Math.PI * 90,

  init() {
    this.updateDisplay()
    this.updateProgress()
    this.renderHistory()
    this.updateStats()
  },

  onShow() {
    this.updateStats()
    this.renderHistory()
  },

  async switchMode(mode) {
    if (this.isRunning) {
      if (!await app.showConfirm('切换模式', '当前计时将被重置，确定切换吗？')) return
      this.stopTimer()
    }

    this.currentMode = mode
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === mode)
    })

    this.remainingSeconds = mode === 'focus' 
      ? this.focusMinutes * 60 
      : this.restMinutes * 60

    document.getElementById('pomodoro-mode-label').textContent = 
      mode === 'focus' ? '专注中' : '休息中'

    this.updateDisplay()
    this.updateProgress()
  },

  adjustFocus(delta) {
    const newVal = this.focusMinutes + delta
    if (newVal < 5 || newVal > 60) return
    
    this.focusMinutes = newVal
    document.getElementById('pomodoro-focus-min').textContent = this.focusMinutes
    
    if (this.currentMode === 'focus' && !this.isRunning) {
      this.remainingSeconds = this.focusMinutes * 60
      this.updateDisplay()
      this.updateProgress()
    }
  },

  adjustRest(delta) {
    const newVal = this.restMinutes + delta
    if (newVal < 1 || newVal > 30) return
    
    this.restMinutes = newVal
    document.getElementById('pomodoro-rest-min').textContent = this.restMinutes
    
    if (this.currentMode === 'rest' && !this.isRunning) {
      this.remainingSeconds = this.restMinutes * 60
      this.updateDisplay()
      this.updateProgress()
    }
  },

  toggleTimer() {
    if (this.isRunning) {
      this.pauseTimer()
    } else {
      this.startTimer()
    }
  },

  startTimer() {
    this.isRunning = true
    document.getElementById('pomodoro-start-btn').textContent = '暂停'

    this.timerInterval = setInterval(() => {
      if (this.remainingSeconds > 0) {
        this.remainingSeconds--
        this.updateDisplay()
        this.updateProgress()
      } else {
        this.completeSession()
      }
    }, 1000)
  },

  pauseTimer() {
    this.isRunning = false
    document.getElementById('pomodoro-start-btn').textContent = '继续'
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
  },

  resetTimer() {
    if (this.isRunning) {
      this.stopTimer()
    }

    this.remainingSeconds = this.currentMode === 'focus' 
      ? this.focusMinutes * 60 
      : this.restMinutes * 60

    document.getElementById('pomodoro-start-btn').textContent = '开始'
    this.updateDisplay()
    this.updateProgress()
  },

  stopTimer() {
    this.isRunning = false
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
  },

  async completeSession() {
    this.stopTimer()

    const duration = this.currentMode === 'focus' ? this.focusMinutes : this.restMinutes

    try {
      await api.addPomodoro(duration, this.currentMode)
      await store.refreshFromServer()

      this.updateStats()
      this.renderHistory()
      this.resetTimer()

      if (this.currentMode === 'focus') {
        app.showToast('番茄完成！休息一下吧', 'success')
      } else {
        app.showToast('休息结束！继续加油', 'success')
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('番茄钟', {
          body: this.currentMode === 'focus' ? '专注完成！休息一下吧' : '休息结束！继续加油'
        })
      }
    } catch (e) {
      app.showToast('保存失败', 'error')
    }
  },

  updateDisplay() {
    const minutes = Math.floor(this.remainingSeconds / 60)
    const seconds = this.remainingSeconds % 60
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    document.getElementById('pomodoro-time').textContent = timeStr
    document.title = `${timeStr} - ${this.currentMode === 'focus' ? '专注' : '休息'}`
  },

  updateProgress() {
    const totalSeconds = this.currentMode === 'focus' 
      ? this.focusMinutes * 60 
      : this.restMinutes * 60
    
    const progress = this.remainingSeconds / totalSeconds
    const offset = this.circumference * (1 - progress)

    const progressCircle = document.getElementById('pomodoro-progress')
    progressCircle.style.strokeDasharray = this.circumference
    progressCircle.style.strokeDashoffset = offset
  },

  updateStats() {
    const today = new Date().toISOString().split('T')[0]
    const todayPomodoros = store.pomodoros.filter(p => p.date === today && p.mode === 'focus')
    const totalMinutes = todayPomodoros.reduce((sum, p) => sum + p.duration, 0)

    document.getElementById('pomodoro-today-count').textContent = todayPomodoros.length
    document.getElementById('pomodoro-today-time').textContent = `累计 ${totalMinutes} 分钟`
  },

  renderHistory() {
    const container = document.getElementById('pomodoro-history')
    const history = [...store.pomodoros]
      .sort((a, b) => b.id - a.id)
      .slice(0, 10)

    if (history.length === 0) {
      container.innerHTML = '<div class="empty-text" style="text-align:center;color:#999;padding:20px;">暂无记录</div>'
      return
    }

    container.innerHTML = history.map(item => `
      <div class="history-item">
        <div class="history-mode">${item.mode === 'focus' ? '🍅 专注' : '☕ 休息'}</div>
        <div class="history-duration">${item.duration} 分钟</div>
        <div class="history-time">${item.date} ${item.time}</div>
      </div>
    `).join('')
  }
}