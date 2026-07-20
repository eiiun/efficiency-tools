const loginPage = {
  init() {
    const usernameInput = document.getElementById('login-username')
    const passwordInput = document.getElementById('login-password')

    if (usernameInput) {
      usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          passwordInput?.focus()
        }
      })

      if (store.user && store.user.name) {
        usernameInput.value = store.user.name
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