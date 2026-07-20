const app = {
  currentPage: 'login',
  pages: ['login', 'home', 'todo', 'notes', 'mood', 'accounting', 'countdown', 'pomodoro', 'wishlist', 'achievements'],
  isLoginMode: true,

  async init() {
    loginPage.init()

    // Safety: clear "undefined" from username field if login.js is outdated
    var unameInput = document.getElementById('login-username')
    if (unameInput && unameInput.value === 'undefined') {
      unameInput.value = ''
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.slice(1)
      if (this.pages.includes(hash)) {
        this.navigate(hash, false)
      }
    })

    const token = api.getToken()
    if (token) {
      try {
        const result = await api.getProfile()
        if (result.success) {
          store.user = result.data
          await store.refreshFromServer()
          this.navigate('home', false)
          return
        }
      } catch (e) {
        console.warn('[App] 后端认证失败:', e.message)
      }
      api.removeToken()
    }

    this.navigate('login', false)
  },

  navigate(pageName, updateHash = true) {
    if (!this.pages.includes(pageName)) return

    if (pageName !== 'login' && !store.user) {
      pageName = 'login'
    }

    document.querySelectorAll('.page').forEach(page => {
      page.classList.add('hidden')
    })

    const targetPage = document.getElementById(`page-${pageName}`)
    if (targetPage) {
      targetPage.classList.remove('hidden')
    }

    this.currentPage = pageName

    if (updateHash) {
      window.location.hash = pageName
    }

    if (pageName === 'home') homePage.init()
    if (pageName === 'todo') todoPage.onShow()
    if (pageName === 'notes') notesPage.onShow()
    if (pageName === 'mood') moodPage.onShow()
    if (pageName === 'accounting') accountingPage.onShow()
    if (pageName === 'countdown') countdownPage.onShow()
    if (pageName === 'pomodoro') pomodoroPage.onShow()
    if (pageName === 'wishlist') wishlistPage.onShow()
    if (pageName === 'achievements') achievementsPage.onShow()

    window.scrollTo(0, 0)
  },

  toggleLoginMode(event) {
    event.preventDefault()
    this.switchLoginTab(!this.isLoginMode)
  },

  switchLoginTab(isLoginMode) {
    this.isLoginMode = isLoginMode

    const tabLogin = document.getElementById('tab-login')
    const tabRegister = document.getElementById('tab-register')
    const submitBtn = document.getElementById('submit-btn')
    const hintUsername = document.getElementById('hint-username')
    const hintPassword = document.getElementById('hint-password')

    if (isLoginMode) {
      tabLogin.classList.add('active')
      tabRegister.classList.remove('active')
      submitBtn.textContent = '登录'
      hintUsername.style.display = 'none'
      hintPassword.style.display = 'none'
    } else {
      tabLogin.classList.remove('active')
      tabRegister.classList.add('active')
      submitBtn.textContent = '注册'
      hintUsername.style.display = 'block'
      hintPassword.style.display = 'block'
    }
  },

  handleSubmit() {
    if (this.isLoginMode) {
      this.handleLogin()
    } else {
      this.handleRegister()
    }
  },

  async handleLogin() {
    const username = document.getElementById('login-username').value.trim()
    const password = document.getElementById('login-password').value

    if (!username) {
      this.showToast('请输入用户名', 'error')
      return
    }

    if (!password) {
      this.showToast('请输入密码', 'error')
      return
    }

    try {
      const result = await api.login(username, password)
      if (result.success) {
        api.setToken(result.data.token)
        store.user = result.data
        await store.refreshFromServer()
        this.navigate('home')
        this.showToast(`欢迎，${username}！`, 'success')
      } else {
        this.showToast(result.error || '登录失败', 'error')
        if (result.code === 'USER_NOT_FOUND') {
          setTimeout(() => this.switchLoginTab(false), 800)
        }
      }
    } catch (e) {
      const msg = e.message || ''
      if (msg.includes('密码错误') || msg.includes('尚未注册') || msg.includes('用户名已存在') || msg.includes('不能为空') || msg.includes('长度')) {
        this.showToast(msg, 'error')
      } else {
        this.showToast('无法连接服务器，请稍后重试', 'error')
      }
      console.error('[App] 登录错误:', e)
    }
  },

  async handleRegister() {
    const username = document.getElementById('login-username').value.trim()
    const password = document.getElementById('login-password').value

    if (!username) {
      this.showToast('请输入用户名', 'error')
      return
    }

    if (!password) {
      this.showToast('请输入密码', 'error')
      return
    }

    if (password.length < 6) {
      this.showToast('密码长度至少为6个字符', 'error')
      return
    }

    try {
      const result = await api.register(username, password)
      if (result.success) {
        api.setToken(result.data.token)
        store.user = result.data
        await store.refreshFromServer()
        this.navigate('home')
        this.showToast(`注册成功，欢迎 ${username}！`, 'success')
      } else {
        this.showToast(result.error || '注册失败', 'error')
      }
    } catch (e) {
      const msg = e.message || ''
      if (msg.includes('密码错误') || msg.includes('尚未注册') || msg.includes('用户名已存在') || msg.includes('不能为空') || msg.includes('长度')) {
        this.showToast(msg, 'error')
      } else {
        this.showToast('无法连接服务器，请稍后重试', 'error')
      }
      console.error('[App] 注册错误:', e)
    }
  },

  logout() {
    api.logout()
    store.logout()
    this.navigate('login')
    this.showToast('已退出登录', 'success')
  },

  // Custom dialog system
  _dialogResolve: null,

  _showDialog(title, message, buttons, showInput = false, defaultValue = '') {
    return new Promise((resolve) => {
      this._dialogResolve = resolve
      const overlay = document.getElementById('dialog-overlay')
      const titleEl = document.getElementById('dialog-title')
      const messageEl = document.getElementById('dialog-message')
      const inputWrap = document.getElementById('dialog-input-wrap')
      const inputEl = document.getElementById('dialog-input')
      const actionsEl = document.getElementById('dialog-actions')

      titleEl.textContent = title
      messageEl.textContent = message
      inputWrap.style.display = showInput ? 'block' : 'none'
      if (showInput) {
        inputEl.value = defaultValue
        setTimeout(() => inputEl.focus(), 100)
      }

      actionsEl.innerHTML = ''
      buttons.forEach(btn => {
        const el = document.createElement('button')
        el.className = `dialog-btn ${btn.class || 'dialog-btn-confirm'}`
        el.textContent = btn.text
        el.onclick = () => {
          overlay.classList.remove('show')
          if (btn.action) {
            btn.action()
          } else {
            resolve(showInput ? inputEl.value : true)
          }
        }
        actionsEl.appendChild(el)
      })

      overlay.classList.add('show')
    })
  },

  showAlert(title, message) {
    return this._showDialog(title, message, [
      { text: '确定', class: 'dialog-btn-confirm' }
    ])
  },

  showConfirm(title, message, danger = false) {
    return this._showDialog(title, message, [
      { text: '取消', class: 'dialog-btn-cancel', action: () => this._dialogResolve(false) },
      { text: '确定', class: danger ? 'dialog-btn-danger' : 'dialog-btn-confirm' }
    ])
  },

  showPrompt(title, message, defaultValue = '') {
    return this._showDialog(title, message, [
      { text: '取消', class: 'dialog-btn-cancel', action: () => this._dialogResolve(null) },
      { text: '确定', class: 'dialog-btn-confirm' }
    ], true, defaultValue)
  },

  showToast(message, type = 'default') {
    const toast = document.getElementById('toast')
    toast.textContent = message
    toast.className = 'toast show'

    if (type === 'success') {
      toast.classList.add('success')
    } else if (type === 'error') {
      toast.classList.add('error')
    }

    setTimeout(() => {
      toast.className = 'toast'
    }, 2000)
  }
}

document.addEventListener('DOMContentLoaded', () => {
  app.init()
})