const API_BASE_URL = '/api';
const RETRY_QUEUE_KEY = 'api_retry_queue';

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
      // 网络错误 → 写操作存入重试队列
      if (error.name === 'TypeError' || (error.message && error.message.includes('fetch'))) {
        if (options.method && options.method !== 'GET') {
          try {
            const queue = JSON.parse(localStorage.getItem(RETRY_QUEUE_KEY) || '[]');
            queue.push({ endpoint, options, timestamp: Date.now() });
            if (queue.length > 50) queue.shift();
            localStorage.setItem(RETRY_QUEUE_KEY, JSON.stringify(queue));
          } catch (e) { /* localStorage 不可用时忽略 */ }
        }
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
  },

  async retryPending() {
    let queue;
    try {
      queue = JSON.parse(localStorage.getItem(RETRY_QUEUE_KEY) || '[]');
    } catch (e) { return; }
    if (queue.length === 0) return;

    console.log(`[API] 重试 ${queue.length} 个挂起操作`);
    const remaining = [];
    for (const item of queue) {
      // 超过 24 小时的丢弃
      if (Date.now() - item.timestamp > 86400000) continue;
      try {
        const token = this.getToken();
        const headers = { 'Content-Type': 'application/json', ...item.options.headers };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${API_BASE_URL}${item.endpoint}`, { ...item.options, headers });
        if (!res.ok) remaining.push(item);
      } catch (e) {
        remaining.push(item);
      }
    }
    localStorage.setItem(RETRY_QUEUE_KEY, JSON.stringify(remaining));
    if (remaining.length === 0) {
      console.log('[API] 所有挂起操作已重试成功');
    } else {
      console.log(`[API] 仍有 ${remaining.length} 个操作待重试`);
    }
  }
};