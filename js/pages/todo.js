const todoPage = {
  currentFilter: 'all',
  currentPriority: 'medium',

  init() {
    this.render()
  },

  onShow() {
    this.render()
  },

  filter(type) {
    this.currentFilter = type
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.filter === type)
    })
    this.render()
  },

  selectPriority(priority) {
    this.currentPriority = priority
    document.querySelectorAll('.priority-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.priority === priority)
    })
  },

  render() {
    const list = document.getElementById('todo-list')
    const empty = document.getElementById('todo-empty')

    let todos = [...store.todos]
    
    if (this.currentFilter === 'pending') {
      todos = todos.filter(t => !t.completed)
    } else if (this.currentFilter === 'completed') {
      todos = todos.filter(t => t.completed)
    }

    todos.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      return b.createdAt - a.createdAt
    })

    const total = store.todos.length
    const completed = store.todos.filter(t => t.completed).length
    const pending = total - completed

    document.getElementById('todo-total').textContent = total
    document.getElementById('todo-completed').textContent = completed
    document.getElementById('todo-pending').textContent = pending

    if (todos.length === 0) {
      list.innerHTML = ''
      empty.style.display = 'flex'
      return
    }

    empty.style.display = 'none'
    list.innerHTML = todos.map(todo => `
      <div class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
        <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" onclick="todoPage.toggle(${todo.id})"></div>
        <div class="todo-content">
          <span class="todo-title">${todo.title}</span>
          <span class="todo-time">${this.formatDate(todo.createdAt)}</span>
        </div>
        <div class="todo-priority priority-${todo.priority}">${this.getPriorityLabel(todo.priority)}</div>
        <div class="todo-delete" onclick="todoPage.deleteTodo(${todo.id})">✕</div>
      </div>
    `).join('')
  },

  getPriorityLabel(priority) {
    const labels = { high: '高', medium: '中', low: '低' }
    return labels[priority] || '中'
  },

  formatDate(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`
    return `${date.getMonth() + 1}月${date.getDate()}日`
  },

  showAddModal() {
    document.getElementById('todo-modal').style.display = 'flex'
    document.getElementById('todo-input').value = ''
    this.currentPriority = 'medium'
    document.querySelectorAll('.priority-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.priority === 'medium')
    })
    setTimeout(() => document.getElementById('todo-input').focus(), 100)
  },

  hideAddModal() {
    document.getElementById('todo-modal').style.display = 'none'
  },

  async addTodo() {
    const input = document.getElementById('todo-input')
    const title = input.value.trim()

    if (!title) {
      app.showToast('请输入任务内容', 'error')
      return
    }

    try {
      await api.addTodo(title, this.currentPriority)
      await store.refreshFromServer()
      this.hideAddModal()
      this.render()
      app.showToast('添加成功', 'success')
    } catch (e) {
      app.showToast('添加失败', 'error')
    }
  },

  async toggle(id) {
    const todo = store.todos.find(t => t.id === id)
    if (!todo) return

    const wasCompleted = todo.completed
    try {
      await api.updateTodo(id, { completed: !todo.completed })
      await store.refreshFromServer()
      this.render()
      if (!wasCompleted) {
        app.showXpFloat(10)
      }
    } catch (e) {
      app.showToast('操作失败', 'error')
    }
  },

  async deleteTodo(id) {
    if (!await app.showConfirm('删除任务', '确定要删除这个任务吗？', true)) return

    try {
      await api.deleteTodo(id)
      await store.refreshFromServer()
      this.render()
      app.showToast('删除成功', 'success')
    } catch (e) {
      app.showToast('删除失败', 'error')
    }
  }
}