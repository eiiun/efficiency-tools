const loginPage = {
  init() {
    const usernameInput = document.getElementById('login-username')
    const passwordInput = document.getElementById('login-password')
    const tabLogin = document.getElementById('tab-login')
    const tabRegister = document.getElementById('tab-register')

    // Tab click events
    if (tabLogin) {
      tabLogin.addEventListener('click', () => app.switchLoginTab(true))
    }
    if (tabRegister) {
      tabRegister.addEventListener('click', () => app.switchLoginTab(false))
    }

    if (usernameInput) {
      usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          passwordInput?.focus()
        }
      })

      // Only prefill if user name actually exists
      if (store.user && store.user.name && store.user.name !== 'undefined') {
        usernameInput.value = store.user.name
      } else {
        usernameInput.value = ''
      }
    }

    if (passwordInput) {
      passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          app.handleSubmit()
        }
      })
    }

    // Ensure initial state is login mode with hints hidden
    app.switchLoginTab(true)
  }
}