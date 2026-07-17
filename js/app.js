const app = {
  currentPage: 'login',
  pages: ['login', 'home', 'todo', 'notes', 'mood', 'accounting', 'countdown', 'pomodoro', 'wishlist', 'achievements'],
  isLoginMode: true,

  async init() {
    loginPage.init()

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
          await store.syncFromServer()
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
    this.isLoginMode = !this.isLoginMode

    const loginBtn = document.getElementById('login-btn')
    const registerBtn = document.getElementById('register-btn')
    const modeText = document.getElementById('login-mode-text')
    const modeLink = document.getElementById('login-mode-link')

    if (this.isLoginMode) {
      loginBtn.style.display = 'block'
      registerBtn.style.display = 'none'
      modeText.textContent = '还没有账号？'
      modeLink.textContent = '注册'
    } else {
      loginBtn.style.display = 'none'
      registerBtn.style.display = 'block'
      modeText.textContent = '已有账号？'
      modeLink.textContent = '登录'
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
        store.user = result.data
        await store.syncFromServer()
        this.navigate('home')
        this.showToast(`欢迎，${username}！`, 'success')
      } else {
        this.showToast(result.error || '登录失败', 'error')
      }
    } catch (e) {
      this.showToast('登录失败，请检查服务器是否运行', 'error')
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
        store.user = result.data
        this.navigate('home')
        this.showToast(`注册成功，欢迎 ${username}！`, 'success')
      } else {
        this.showToast(result.error || '注册失败', 'error')
      }
    } catch (e) {
      this.showToast('注册失败，请检查服务器是否运行', 'error')
      console.error('[App] 注册错误:', e)
    }
  },

  logout() {
    api.logout()
    store.logout()
    this.navigate('login')
    this.showToast('已退出登录', 'success')
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