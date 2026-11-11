const API_URL = 'http://localhost:3333/api';

export interface AuthResponse {
  message: string;
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

// Função para cadastro de usuário
export async function registerUser(username: string, email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', 
    },
    body: JSON.stringify({ username, email, password }), 
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Erro ao realizar cadastro.');
  }

  return data;
}

// Função para login de usuário
export async function loginUser(emailOrUsername: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ emailOrUsername, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Erro ao realizar login.');
  }

  return data;
}