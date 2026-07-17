const loginPage = {
  init() {
    const input = document.getElementById('login-username')
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          app.handleLogin()
        }
      })
      
      if (store.user) {
        input.value = store.user.name
      }
    }
  }
}