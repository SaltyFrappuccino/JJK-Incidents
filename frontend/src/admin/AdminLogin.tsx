import React, { useState } from 'react';
import { API_URL } from '../config';

interface AdminLoginProps {
  onLogin: () => void;
}

export function AdminLogin({ onLogin }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/admin/missions`, {
        headers: { 'x-admin-password': password }
      });

      if (response.ok) {
        localStorage.setItem('adminPassword', password);
        onLogin();
      } else {
        setError('Неверный пароль');
      }
    } catch (err) {
      setError('Ошибка подключения к серверу');
    }
  };

  return (
    <div className="admin-login">
      <div className="login-container">
        <div className="login-header">
          <h1>🎮 Админ-панель</h1>
          <p>Инциденты Дзюдзюцу</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="password">Пароль администратора</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              required
              autoFocus
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" className="btn btn-primary btn-large">
            🔐 Войти
          </button>
        </form>
        
        <div className="login-footer">
          <p>По умолчанию пароль: <code>admin123</code></p>
        </div>
      </div>
    </div>
  );
}
