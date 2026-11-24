import React, { useState } from 'react';
import { loginUser, registerUser, AuthResponse } from '../services/api';
import { BrandMark, D20Mark } from './BrandMark';
import { Icon } from './ui/Icon';

interface AuthScreenProps {
  initialMode?: 'login' | 'register';
  onBackToLanding?: () => void;
  onLoginSuccess: (authData: AuthResponse) => void;
}

export function AuthScreen({
  initialMode = 'login',
  onBackToLanding,
  onLoginSuccess,
}: AuthScreenProps) {
  const [isRegistering, setIsRegistering] = useState(initialMode === 'register');

  const [username, setUsername] = useState('');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const data = isRegistering
        ? await registerUser(username.trim(), email.trim(), password)
        : await loginUser(emailOrUsername.trim(), password);

      localStorage.setItem('totalrpg_token', data.token);
      localStorage.setItem('totalrpg_user', JSON.stringify(data.user));

      onLoginSuccess(data);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800/80">
        <div className="trpg-wrap h-16 flex items-center justify-between gap-4">
          <BrandMark size="md" />
          {onBackToLanding && (
            <button type="button" onClick={onBackToLanding} className="trpg-btn-quiet">
              <Icon name="arrow-left" size={16} /> Página inicial
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 grid place-items-center px-4 py-12">
        <div className="w-full max-w-sm">
          <D20Mark className="w-10 h-10 mb-6" />
          <h1 className="text-4xl leading-tight">{isRegistering ? 'Criar conta' : 'Entrar'}</h1>
          <p className="text-zinc-400 mt-2">
            {isRegistering
              ? 'Para montar personagens e abrir suas mesas.'
              : 'Suas fichas, mesas e escudo do mestre continuam de onde você parou.'}
          </p>

          {errorMessage && (
            <p role="alert" className="mt-6 rounded-lg border border-red-800/70 bg-red-950/40 px-3.5 py-2.5 text-sm text-red-200 flex gap-2">
              <Icon name="warning" size={16} className="mt-0.5 shrink-0" /> {errorMessage}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            {isRegistering ? (
              <>
                <div>
                  <label htmlFor="auth-username" className="trpg-label">
                    Nome de usuário
                  </label>
                  <input
                    id="auth-username"
                    type="text"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="trpg-input"
                  />
                </div>
                <div>
                  <label htmlFor="auth-email" className="trpg-label">
                    E-mail
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="trpg-input"
                  />
                </div>
              </>
            ) : (
              <div>
                <label htmlFor="auth-identifier" className="trpg-label">
                  Usuário ou e-mail
                </label>
                <input
                  id="auth-identifier"
                  type="text"
                  required
                  autoComplete="username"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  className="trpg-input"
                />
              </div>
            )}
            <div>
              <label htmlFor="auth-password" className="trpg-label">
                Senha
              </label>
              <input
                id="auth-password"
                type="password"
                required
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="trpg-input"
              />
            </div>
            <button type="submit" disabled={isLoading} className="trpg-btn-primary trpg-btn-lg w-full mt-2">
              {isLoading ? 'Entrando…' : isRegistering ? 'Criar conta' : 'Entrar'}
            </button>
          </form>

          <p className="mt-6 text-sm text-zinc-400">
            {isRegistering ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setErrorMessage('');
              }}
              className="font-semibold text-amber-400 hover:text-amber-300 underline-offset-4 hover:underline"
            >
              {isRegistering ? 'Entrar' : 'Criar conta'}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
