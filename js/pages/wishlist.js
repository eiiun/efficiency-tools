const wishlistPage = {
  currentCategory: 'all',
  selectedCategory: 'other',
  isAdding: false,
  categoryInfo: {
    buy: { name: '想买', icon: '🛍️', bgColor: '#ffe0a0', textColor: '#8b6914' },
    do: { name: '想做', icon: '✅', bgColor: '#b5e8b5', textColor: '#2d7a2d' },
    go: { name: '想去', icon: '📍', bgColor: '#a8d8ff', textColor: '#1a6da8' },
    other: { name: '其他', icon: '📌', bgColor: '#d4b5ff', textColor: '#6b3fa0' }
  },

  init() {
    this.render()
  },

  onShow() {
    this.render()
  },

  filter(category) {
    this.currentCategory = category
    document.querySelectorAll('.wishlist-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.category === category)
    })
    this.render()
  },

  selectCategory(category) {
    this.selectedCategory = category
    document.querySelectorAll('#wishlist-modal .category-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.category === category)
    })
  },

  render() {
    const list = document.getElementById('wishlist-list')
    const empty = document.getElementById('wishlist-empty')

    let wishlist = [...store.wishlist]

    if (this.currentCategory !== 'all') {
      wishlist = wishlist.filter(w => w.category === this.currentCategory)
    }

    const pending = wishlist.filter(w => !w.completed)
    const completed = wishlist.filter(w => w.completed)

    const total = store.wishlist.length
    const completedCount = store.wishlist.filter(w => w.completed).length
    const pendingCount = total - completedCount

    document.getElementById('wishlist-total').textContent = total
    document.getElementById('wishlist-completed').textContent = completedCount
    document.getElementById('wishlist-pending').textContent = pendingCount

    if (wishlist.length === 0) {
      list.innerHTML = ''
      empty.style.display = 'flex'
      return
    }

    empty.style.display = 'none'

    let html = pending.map(wish => this.renderItem(wish)).join('')

    if (completed.length > 0) {
      html += `
        <div class="divider">
          <span class="divider-text">已完成</span>
          <div class="divider-line"></div>
        </div>
      `
      html += completed.map(wish => this.renderItem(wish)).join('')
    }

    list.innerHTML = html
  },

  renderItem(wish) {
    const catInfo = this.categoryInfo[wish.category] || this.categoryInfo.other
    return `
      <div class="wish-item ${wish.completed ? 'completed' : ''}" data-id="${wish.id}">
        <div class="wish-checkbox ${wish.completed ? 'checked' : ''}" onclick="wishlistPage.toggleComplete(${wish.id})"></div>
        <div class="wish-info">
          <span class="wish-title">${escapeHtml(wish.title)}</span>
          ${wish.note ? `<span class="wish-note">${escapeHtml(wish.note)}</span>` : ''}
        </div>
        <div class="wish-tag" style="background-color: ${catInfo.bgColor}; color: ${catInfo.textColor};">
          ${catInfo.icon} ${catInfo.name}
        </div>
        <div class="wish-delete" onclick="wishlistPage.deleteWish(${wish.id})">✕</div>
      </div>
    `
  },

  showAddModal() {
    document.getElementById('wishlist-modal').style.display = 'flex'
    document.getElementById('wishlist-title').value = ''
    document.getElementById('wishlist-note').value = ''
    this.selectedCategory = 'other'
    document.querySelectorAll('#wishlist-modal .category-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.category === 'other')
    })
    setTimeout(() => document.getElementById('wishlist-title').focus(), 100)
  },

  hideAddModal() {
    document.getElementById('wishlist-modal').style.display = 'none'
  },

  async addWish() {
    if (this.isAdding) return
    this.isAdding = true

    const title = document.getElementById('wishlist-title').value.trim()
    const note = document.getElementById('wishlist-note').value.trim()

    if (!title) {
      app.showToast('请输入愿望名称', 'error')
      this.isAdding = false
      return
    }

    try {
      const result = await api.addWish(title, note, this.selectedCategory)
      if (result.success && result.data) {
        const wish = store.mapWish(result.data)
        store.wishlist.unshift(wish)
        store.saveWishlist()
      }
      await store.refreshUserProfile()
      this.hideAddModal()
      this.render()
      app.showToast('添加成功', 'success')
    } catch (e) {
      app.showToast('添加失败', 'error')
    } finally {
      this.isAdding = false
    }
  },

  async toggleComplete(id) {
    const wish = store.wishlist.find(w => w.id === id)
    if (!wish) return

    const wasCompleted = wish.completed
    wish.completed = !wish.completed
    store.saveWishlist()
    this.render()

    try {
      await api.updateWish(id, wish.completed)
      if (!wasCompleted) {
        await store.refreshUserProfile()
        app.showToast('恭喜达成！', 'success')
      }
    } catch (e) {
      wish.completed = wasCompleted
      store.saveWishlist()
      this.render()
      app.showToast('操作失败', 'error')
    }
  },

  async deleteWish(id) {
    if (!await app.showConfirm('删除愿望', '确定要删除这个愿望吗？', true)) return

    const idx = store.wishlist.findIndex(w => w.id === id)
    if (idx === -1) return
    const removed = store.wishlist.splice(idx, 1)[0]
    store.saveWishlist()
    this.render()

    try {
      await api.deleteWish(id)
      app.showToast('删除成功', 'success')
    } catch (e) {
      store.wishlist.splice(idx, 0, removed)
      store.saveWishlist()
      this.render()
      app.showToast('删除失败', 'error')
    }
  }
}