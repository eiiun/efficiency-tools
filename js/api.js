const API_BASE_URL = '/api';

const api = {
  getToken() {
    return localStorage.getItem('token');
  },

  setToken(token) {
    localStorage.setItem('token', token);
  },

  removeToken() {
    localStorage.removeItem('token');
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
      });
      
      const data = await response.json();
      
      // 业务错误（如密码错误、用户不存在）直接返回，让调用方处理
      if (!response.ok && !data.error) {
        throw new Error('请求失败');
      }
      
      return data;
    } catch (error) {
      // 网络错误才抛出
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('NETWORK_ERROR');
      }
      console.error('API 请求错误:', error);
      throw error;
    }
  },

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  async post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  async put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  async register(username, password) {
    return this.post('/auth/register', { username, password });
  },

  async login(username, password) {
    return this.post('/auth/login', { username, password });
  },

  async getProfile() {
    return this.get('/auth/profile');
  },

  logout() {
    this.removeToken();
  },

  async getTodos() {
    return this.get('/todos');
  },

  async addTodo(content, priority = 'medium') {
    return this.post('/todos', { content, priority });
  },

  async updateTodo(id, data) {
    return this.put(`/todos/${id}`, data);
  },

  async deleteTodo(id) {
    return this.delete(`/todos/${id}`);
  },

  async getNotes() {
    return this.get('/notes');
  },

  async addNote(title, content, tags) {
    return this.post('/notes', { title, content, tags });
  },

  async updateNote(id, data) {
    return this.put(`/notes/${id}`, data);
  },

  async deleteNote(id) {
    return this.delete(`/notes/${id}`);
  },

  async getMoods() {
    return this.get('/moods');
  },

  async addMood(mood, emoji, content, date) {
    return this.post('/moods', { mood, emoji, content, date });
  },

  async getTransactions() {
    return this.get('/transactions');
  },

  async addTransaction(type, amount, category, note, date) {
    return this.post('/transactions', { type, amount, category, note, date });
  },

  async deleteTransaction(id) {
    return this.delete(`/transactions/${id}`);
  },

  async getCountdowns() {
    return this.get('/countdowns');
  },

  async addCountdown(title, date, category) {
    return this.post('/countdowns', { title, date, category });
  },

  async deleteCountdown(id) {
    return this.delete(`/countdowns/${id}`);
  },

  async getPomodoros() {
    return this.get('/pomodoros');
  },

  async addPomodoro(duration, type = 'focus') {
    return this.post('/pomodoros', { duration, type });
  },

  async getWishlist() {
    return this.get('/wishlist');
  },

  async addWish(title, note, category) {
    return this.post('/wishlist', { title, note, category });
  },

  async updateWish(id, completed) {
    return this.put(`/wishlist/${id}`, { completed });
  },

  async deleteWish(id) {
    return this.delete(`/wishlist/${id}`);
  },

  async getActivities() {
    return this.get('/activities');
  },

  async exportData() {
    return this.get('/export');
  },

  async importData(data) {
    return this.post('/import', data);
  },

  async pull() {
    try {
      const result = await this.get('/export');
      if (result.success) {
        return result.data;
      }
      return null;
    } catch (e) {
      console.error('[API] 从服务器拉取数据失败:', e.message);
      return null;
    }
  },

  async sync(data) {
    try {
      await this.post('/import', data);
      return true;
    } catch (e) {
      console.error('[API] 同步数据到服务器失败:', e.message);
      return false;
    }
  }
};