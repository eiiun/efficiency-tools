const moodPage = {
  selectedMood: null,
  selectedEmoji: null,
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(),
  moodColors: {
    happy: '#ffe066',
    calm: '#99e699',
    tired: '#cccccc',
    sad: '#99ccff',
    angry: '#ff9999'
  },
  moodLabels: {
    happy: '开心',
    calm: '平静',
    tired: '疲惫',
    sad: '难过',
    angry: '生气'
  },

  init() {
    this.generateCalendar()
    this.calculateStats()
    this.renderRecent()
  },

  onShow() {
    this.generateCalendar()
    this.calculateStats()
    this.renderRecent()
  },

  selectMood(mood, emoji) {
    this.selectedMood = mood
    this.selectedEmoji = emoji

    document.querySelectorAll('.mood-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.mood === mood)
    })
  },

  async saveMood() {
    if (!this.selectedMood) {
      app.showToast('请选择心情', 'error')
      return
    }

    const content = document.getElementById('mood-content').value.trim()
    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    try {
      await api.addMood(this.selectedMood, this.selectedEmoji, content, dateStr)
      await store.refreshFromServer()

      document.getElementById('mood-content').value = ''
      this.selectedMood = null
      this.selectedEmoji = null
      document.querySelectorAll('.mood-option').forEach(opt => {
        opt.classList.remove('selected')
      })

      this.generateCalendar()
      this.calculateStats()
      this.renderRecent()

      app.showToast('保存成功', 'success')
    } catch (e) {
      app.showToast('保存失败', 'error')
    }
  },

  generateCalendar() {
    const calendar = document.getElementById('mood-calendar')
    const title = document.getElementById('mood-calendar-title')
    
    const year = this.currentYear
    const month = this.currentMonth

    title.textContent = `${year}年${month + 1}月`

    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    const moodMap = {}
    store.moods.forEach(m => {
      moodMap[m.date] = m
    })

    const weekdays = ['日', '一', '二', '三', '四', '五', '六']
    let html = '<div class="calendar-weekdays">'
    weekdays.forEach(d => {
      html += `<div class="calendar-weekday">${d}</div>`
    })
    html += '</div><div class="calendar-days">'

    for (let i = 0; i < firstDay; i++) {
      html += '<div class="calendar-day empty"></div>'
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const isToday = dateStr === todayStr
      const mood = moodMap[dateStr]

      html += `<div class="calendar-day ${isToday ? 'today' : ''}">`
      if (mood) {
        html += `<span class="mood-emoji-small">${mood.emoji}</span>`
      } else {
        html += `<span>${day}</span>`
      }
      html += '</div>'
    }

    html += '</div>'
    calendar.innerHTML = html
  },

  prevMonth() {
    this.currentMonth--
    if (this.currentMonth < 0) {
      this.currentMonth = 11
      this.currentYear--
    }
    this.generateCalendar()
  },

  nextMonth() {
    this.currentMonth++
    if (this.currentMonth > 11) {
      this.currentMonth = 0
      this.currentYear++
    }
    this.generateCalendar()
  },

  calculateStats() {
    const stats = document.getElementById('mood-stats')
    const moods = store.moods

    const counts = {}
    const moodTypes = ['happy', 'calm', 'tired', 'sad', 'angry']
    moodTypes.forEach(m => counts[m] = 0)

    moods.forEach(m => {
      if (counts[m.mood] !== undefined) {
      counts[m.mood]++
    }
    })

    const emojis = { happy: '😊', calm: '😌', tired: '😴', sad: '😢', angry: '😠' }
    const labels = { happy: '开心', calm: '平静', tired: '疲惫', sad: '难过', angry: '生气' }

    stats.innerHTML = moodTypes.map(mood => `
      <div class="mood-stat-item">
        <div class="mood-stat-emoji">${emojis[mood]}</div>
        <div class="mood-stat-count">${counts[mood]}</div>
        <div class="mood-stat-label">${labels[mood]}</div>
      </div>
    `).join('')
  },

  renderRecent() {
    const list = document.getElementById('mood-recent')
    const moods = [...store.moods].sort((a, b) => b.timestamp - a.timestamp).slice(0, 3)

    if (moods.length === 0) {
      list.innerHTML = '<div class="empty-text" style="text-align:center;color:#999;padding:20px;">暂无记录</div>'
      return
    }

    list.innerHTML = moods.map(mood => `
      <div class="recent-item">
        <div class="recent-emoji">${mood.emoji}</div>
        <div class="recent-content">
          <div class="recent-date">${mood.dateStr}</div>
          <div class="recent-text">${mood.content || '无内容'}</div>
        </div>
      </div>
    `).join('')
  }
}