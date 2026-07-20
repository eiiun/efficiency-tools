const countdownPage = {
  currentCategory: 'all',
  selectedCategory: 'other',
  categoryInfo: {
    holiday: { name: '节日', icon: '🎉', color: '#ff6b6b' },
    birthday: { name: '生日', icon: '🎂', color: '#ffa502' },
    exam: { name: '考试', icon: '📚', color: '#5352ed' },
    other: { name: '其他', icon: '📌', color: '#747d8c' }
  },

  init() {
    this.render()
  },

  onShow() {
    this.render()
  },

  filter(category) {
    this.currentCategory = category
    document.querySelectorAll('.countdown-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.category === category)
    })
    this.render()
  },

  selectCategory(category) {
    this.selectedCategory = category
    document.querySelectorAll('#countdown-modal .category-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.category === category)
    })
  },

  render() {
    const list = document.getElementById('countdown-list')
    const empty = document.getElementById('countdown-empty')

    let countdowns = [...store.countdowns]

    if (this.currentCategory !== 'all') {
      countdowns = countdowns.filter(c => c.category === this.currentCategory)
    }

    countdowns.sort((a, b) => {
      const daysA = this.getDaysLeft(a.date)
      const daysB = this.getDaysLeft(b.date)
      return daysA - daysB
    })

    if (countdowns.length === 0) {
      list.innerHTML = ''
      empty.style.display = 'flex'
      return
    }

    empty.style.display = 'none'
    list.innerHTML = countdowns.map(item => {
      const daysLeft = this.getDaysLeft(item.date)
      const catInfo = this.categoryInfo[item.category] || this.categoryInfo.other
      
      return `
        <div class="countdown-item" data-id="${item.id}">
          <div class="countdown-delete" onclick="countdownPage.deleteCountdown(${item.id})">✕</div>
          <div class="countdown-header">
            <div class="countdown-title">${item.title}</div>
            <div class="countdown-tag" style="background-color: ${catInfo.color}20; color: ${catInfo.color};">
              ${catInfo.icon} ${catInfo.name}
            </div>
          </div>
          <div class="countdown-days">
            <span class="countdown-number">${daysLeft >= 0 ? daysLeft : Math.abs(daysLeft)}</span>
            <span class="countdown-unit">${daysLeft >= 0 ? '天后' : '天前'}</span>
          </div>
          <div class="countdown-date">${this.formatDate(item.date)}</div>
        </div>
      `
    }).join('')
  },

  getDaysLeft(dateStr) {
    const target = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    target.setHours(0, 0, 0, 0)
    const diff = target.getTime() - today.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  },

  formatDate(dateStr) {
    const date = new Date(dateStr)
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  },

  showAddModal() {
    document.getElementById('countdown-modal').style.display = 'flex'
    document.getElementById('countdown-title').value = ''
    document.getElementById('countdown-date').value = ''
    this.selectedCategory = 'other'
    document.querySelectorAll('#countdown-modal .category-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.category === 'other')
    })
    setTimeout(() => document.getElementById('countdown-title').focus(), 100)
  },

  hideAddModal() {
    document.getElementById('countdown-modal').style.display = 'none'
  },

  async addCountdown() {
    const title = document.getElementById('countdown-title').value.trim()
    const date = document.getElementById('countdown-date').value

    if (!title) {
      app.showToast('请输入事件名称', 'error')
      return
    }

    if (!date) {
      app.showToast('请选择日期', 'error')
      return
    }

    try {
      await api.addCountdown(title, date, this.selectedCategory)
      await store.refreshFromServer()
      this.hideAddModal()
      this.render()
      app.showToast('添加成功', 'success')
    } catch (e) {
      app.showToast('添加失败', 'error')
    }
  },

  async deleteCountdown(id) {
    if (!await app.showConfirm('删除倒计时', '确定要删除这个倒计时吗？', true)) return

    try {
      await api.deleteCountdown(id)
      await store.refreshFromServer()
      this.render()
      app.showToast('删除成功', 'success')
    } catch (e) {
      app.showToast('删除失败', 'error')
    }
  }
}