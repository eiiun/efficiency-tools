const notesPage = {
  currentTag: '全部',
  tags: ['全部', '工作', '生活', '学习', '灵感', '其他'],
  selectedTag: '其他',
  searchKeyword: '',
  isAdding: false,

  init() {
    this.renderTags()
    this.renderTagOptions()
    this.render()
  },

  onShow() {
    this.render()
  },

  renderTags() {
    const tagList = document.getElementById('notes-tags')
    tagList.innerHTML = this.tags.map(tag => `
      <div class="tag-item ${tag === this.currentTag ? 'active' : ''}" onclick="notesPage.selectTag('${tag}')">${tag}</div>
    `).join('')
  },

  renderTagOptions() {
    const options = document.getElementById('notes-tag-options')
    const tagList = this.tags.filter(t => t !== '全部')
    options.innerHTML = tagList.map(tag => `
      <div class="tag-option ${tag === this.selectedTag ? 'active' : ''}" onclick="notesPage.selectNewTag('${tag}')">${tag}</div>
    `).join('')
  },

  selectTag(tag) {
    this.currentTag = tag
    this.renderTags()
    this.render()
  },

  selectNewTag(tag) {
    this.selectedTag = tag
    this.renderTagOptions()
  },

  search(keyword) {
    this.searchKeyword = keyword
    this.render()
  },

  render() {
    const list = document.getElementById('notes-list')
    const empty = document.getElementById('notes-empty')

    let notes = [...store.notes]

    if (this.currentTag !== '全部') {
      notes = notes.filter(n => n.tag === this.currentTag)
    }

    if (this.searchKeyword) {
      const keyword = this.searchKeyword.toLowerCase()
      notes = notes.filter(n => 
        n.title.toLowerCase().includes(keyword) || 
        n.content.toLowerCase().includes(keyword)
      )
    }

    notes.sort((a, b) => b.updatedAt - a.updatedAt)

    if (notes.length === 0) {
      list.innerHTML = ''
      empty.style.display = 'flex'
      return
    }

    empty.style.display = 'none'
    list.innerHTML = notes.map(note => `
      <div class="note-card" onclick="notesPage.viewNote(${note.id})">
        <div class="note-title">${escapeHtml(note.title)}</div>
        <div class="note-preview">${escapeHtml(note.content)}</div>
        <div class="note-footer">
          <span class="note-tag">${note.tag}</span>
          <span class="note-time">${this.formatDate(note.updatedAt)}</span>
        </div>
      </div>
    `).join('')
  },

  formatDate(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`
    return `${date.getMonth() + 1}/${date.getDate()}`
  },

  showAddModal() {
    document.getElementById('notes-modal').style.display = 'flex'
    document.getElementById('notes-title').value = ''
    document.getElementById('notes-content').value = ''
    this.selectedTag = '其他'
    this.renderTagOptions()
    setTimeout(() => document.getElementById('notes-title').focus(), 100)
  },

  hideAddModal() {
    document.getElementById('notes-modal').style.display = 'none'
  },

  async addNote() {
    if (this.isAdding) return
    this.isAdding = true

    const title = document.getElementById('notes-title').value.trim()
    const content = document.getElementById('notes-content').value.trim()

    if (!title) {
      app.showToast('请输入标题', 'error')
      this.isAdding = false
      return
    }

    try {
      const result = await api.addNote(title, content, this.selectedTag)
      if (result.success && result.data) {
        const note = store.mapNote(result.data)
        store.notes.unshift(note)
        store.saveNotes()
      }
      await store.refreshUserProfile()
      this.hideAddModal()
      this.render()
      app.showToast('保存成功', 'success')
    } catch (e) {
      app.showToast('保存失败', 'error')
    } finally {
      this.isAdding = false
    }
  },

  async viewNote(id) {
    const note = store.notes.find(n => n.id === id)
    if (!note) return

    const newContent = await app.showPrompt('编辑笔记', '修改笔记内容', note.content)
    if (newContent !== null && newContent !== note.content) {
      // 乐观更新
      const oldContent = note.content
      note.content = newContent
      note.updatedAt = Date.now()
      store.saveNotes()
      this.render()

      try {
        await api.updateNote(id, { content: newContent })
        await store.refreshUserProfile()
        app.showToast('已更新', 'success')
      } catch (e) {
        note.content = oldContent
        store.saveNotes()
        this.render()
        app.showToast('更新失败', 'error')
      }
    }
  }
}