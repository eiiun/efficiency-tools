const accountingPage = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(),
  currentType: 'expense',
  modalType: 'expense',
  selectedCategory: '餐饮',
  expenseCategories: [
    { name: '餐饮', icon: '🍜', color: '#ff9966' },
    { name: '交通', icon: '🚗', color: '#66b3ff' },
    { name: '购物', icon: '🛍️', color: '#ff99cc' },
    { name: '娱乐', icon: '🎮', color: '#cc99ff' },
    { name: '居住', icon: '🏠', color: '#99cc99' },
    { name: '医疗', icon: '💊', color: '#ff6666' },
    { name: '教育', icon: '📚', color: '#ffcc66' },
    { name: '其他', icon: '📌', color: '#999999' }
  ],
  incomeCategories: [
    { name: '工资', icon: '💰', color: '#34a853' },
    { name: '奖金', icon: '🎁', color: '#ff9933' },
    { name: '理财', icon: '📈', color: '#6699ff' },
    { name: '兼职', icon: '💼', color: '#9966cc' },
    { name: '其他', icon: '📌', color: '#999999' }
  ],

  init() {
    this.renderCategoryOptions()
    this.render()
  },

  onShow() {
    this.render()
  },

  render() {
    this.updateBalance()
    this.renderCategoryStats()
    this.renderTransactions()
    this.updateMonthTitle()
  },

  updateMonthTitle() {
    document.getElementById('accounting-month').textContent = 
      `${this.currentYear}年${this.currentMonth + 1}月`
  },

  prevMonth() {
    this.currentMonth--
    if (this.currentMonth < 0) {
      this.currentMonth = 11
      this.currentYear--
    }
    this.render()
  },

  nextMonth() {
    this.currentMonth++
    if (this.currentMonth > 11) {
      this.currentMonth = 0
      this.currentYear++
    }
    this.render()
  },

  switchType(type) {
    this.currentType = type
    document.querySelectorAll('.type-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.type === type)
    })
    this.renderCategoryStats()
    this.renderTransactions()
  },

  updateBalance() {
    const transactions = store.transactions
    const year = this.currentYear
    const month = String(this.currentMonth + 1).padStart(2, '0')

    const monthTransactions = transactions.filter(t => {
      return t.date.startsWith(`${year}-${month}`)
    })

    let income = 0
    let expense = 0

    monthTransactions.forEach(t => {
      if (t.type === 'income') {
        income += parseFloat(t.amount) || 0
      } else {
        expense += parseFloat(t.amount) || 0
      }
    })

    const balance = income - expense

    document.getElementById('accounting-balance').textContent = `¥${balance.toFixed(2)}`
    document.getElementById('accounting-income').textContent = `¥${income.toFixed(2)}`
    document.getElementById('accounting-expense').textContent = `¥${expense.toFixed(2)}`
  },

  renderCategoryStats() {
    const container = document.getElementById('accounting-category-stats')
    const transactions = store.transactions
    const year = this.currentYear
    const month = String(this.currentMonth + 1).padStart(2, '0')

    const monthTransactions = transactions.filter(t => {
      return t.date.startsWith(`${year}-${month}`) && t.type === this.currentType
    })

    const categories = this.currentType === 'expense' ? this.expenseCategories : this.incomeCategories

    const categoryAmounts = {}
    monthTransactions.forEach(t => {
      categoryAmounts[t.category] = (categoryAmounts[t.category] || 0) + parseFloat(t.amount)
    })

    const total = monthTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0)

    const stats = categories.map(cat => ({
      ...cat,
      amount: categoryAmounts[cat.name] || 0,
      percent: total > 0 ? ((categoryAmounts[cat.name] || 0) / total * 100).toFixed(0) : 0
    })).sort((a, b) => b.amount - a.amount)

    container.innerHTML = stats.map(cat => `
      <div class="category-stat-item">
        <div class="category-icon" style="background-color: ${cat.color}20;">${cat.icon}</div>
        <div class="category-info">
          <div class="category-name">${cat.name}</div>
          <div class="category-bar-bg">
            <div class="category-bar" style="width: ${cat.percent}%; background-color: ${cat.color};"></div>
          </div>
        </div>
        <div style="text-align: right;">
          <div class="category-amount">¥${cat.amount.toFixed(2)}</div>
          <div class="category-percent">${cat.percent}%</div>
        </div>
      </div>
    `).join('')
  },

  renderTransactions() {
    const container = document.getElementById('accounting-transactions')
    let transactions = [...store.transactions]
    const year = this.currentYear
    const month = String(this.currentMonth + 1).padStart(2, '0')

    transactions = transactions.filter(t => {
      return t.date.startsWith(`${year}-${month}`) && t.type === this.currentType
    })

    transactions.sort((a, b) => new Date(b.date) - new Date(a.date))

    if (transactions.length === 0) {
      container.innerHTML = '<div class="empty-text" style="text-align:center;color:#999;padding:30px;">暂无记录</div>'
      return
    }

    const categories = this.currentType === 'expense' ? this.expenseCategories : this.incomeCategories
    const catMap = {}
    categories.forEach(c => catMap[c.name] = c)

    container.innerHTML = transactions.map(t => {
      const cat = catMap[t.category] || { icon: '📌', color: '#999999' }
      return `
        <div class="transaction-item">
          <div class="transaction-icon" style="background-color: ${cat.color}20;">${cat.icon}</div>
          <div class="transaction-info">
            <div class="transaction-category">${t.category}</div>
            <div class="transaction-note">${t.note || t.date}</div>
          </div>
          <div class="transaction-amount ${t.type}">
            ${t.type === 'income' ? '+' : '-'}¥${parseFloat(t.amount).toFixed(2)}
          </div>
        </div>
      `
    }).join('')
  },

  renderCategoryOptions() {
    const container = document.getElementById('accounting-category-options')
    const categories = this.modalType === 'expense' ? this.expenseCategories : this.incomeCategories
    
    container.innerHTML = categories.map(cat => `
      <div class="category-option ${cat.name === this.selectedCategory ? 'active' : ''}" 
           onclick="accountingPage.selectCategory('${cat.name}')">
        <span>${cat.icon}</span> ${cat.name}
      </div>
    `).join('')
  },

  selectModalType(type) {
    this.modalType = type
    this.selectedCategory = type === 'expense' ? '餐饮' : '工资'
    document.querySelectorAll('.type-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.type === type)
    })
    this.renderCategoryOptions()
  },

  selectCategory(category) {
    this.selectedCategory = category
    this.renderCategoryOptions()
  },

  showAddModal() {
    document.getElementById('accounting-modal').style.display = 'flex'
    document.getElementById('accounting-amount').value = ''
    document.getElementById('accounting-note').value = ''
    this.modalType = this.currentType
    this.selectedCategory = this.modalType === 'expense' ? '餐饮' : '工资'
    
    document.querySelectorAll('.type-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.type === this.modalType)
    })
    this.renderCategoryOptions()
    setTimeout(() => document.getElementById('accounting-amount').focus(), 100)
  },

  hideAddModal() {
    document.getElementById('accounting-modal').style.display = 'none'
  },

  async addTransaction() {
    const amount = parseFloat(document.getElementById('accounting-amount').value)
    const note = document.getElementById('accounting-note').value.trim()

    if (!amount || amount <= 0) {
      app.showToast('请输入有效金额', 'error')
      return
    }

    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    try {
      await api.addTransaction(this.modalType, amount, this.selectedCategory, note, dateStr)
      await store.refreshFromServer()
      this.hideAddModal()
      this.render()
      app.showToast('保存成功', 'success')
    } catch (e) {
      app.showToast('保存失败', 'error')
    }
  }
}