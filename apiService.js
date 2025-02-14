// apiService.js
import API_BASE_URL from './config';

// Register a new user
export async function registerUser(email, password, name) {
  const response = await fetch(`${API_BASE_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password, name })
  });
  return response.json();
}

// Log in a user
export async function loginUser(email, password) {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  return response.json();
}

// Request a password reset
export async function requestPasswordReset(email) {
  const response = await fetch(`${API_BASE_URL}/request-password-reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email })
  });
  return response.json();
}

// Reset password using the token provided in the reset email
export async function resetPassword(token, newPassword) {
  const response = await fetch(`${API_BASE_URL}/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ token, newPassword })
  });
  return response.json();
}
