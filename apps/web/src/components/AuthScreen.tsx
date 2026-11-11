import React, { useState } from 'react';
import { loginUser, registerUser, AuthResponse } from '../services/api';

interface AuthScreenProps {
  onLoginSuccess: (authData: AuthResponse) => void;
}

export function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);

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
      let data: AuthResponse;

      if (isRegistering) {
        data = await registerUser(username, email, password);
      } else {
        data = await loginUser(emailOrUsername, password);
      }

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
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        {/* Cabeçalho */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-amber-500 tracking-wider">🎲 TotalRPG</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {isRegistering ? 'Crie sua conta para mestrar ou jogar' : 'Entre para acessar suas mesas e personagens'}
          </p>
        </div>

        {/* Login/Cadastro */}
        <div className="flex bg-zinc-950 p-1 rounded-xl mb-6 border border-zinc-800">
          <button
            type="button"
            onClick={() => { setIsRegistering(false); setErrorMessage(''); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
              !isRegistering ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => { setIsRegistering(true); setErrorMessage(''); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
              isRegistering ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Criar Conta
          </button>
        </div>

        {/* Mensagem de Erro */}
        {errorMessage && (
          <div className="bg-red-950/60 border border-red-800 text-red-200 text-sm px-4 py-3 rounded-lg mb-4">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isRegistering ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Nome de Usuário</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: mestre_dos_magos"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Usuário ou E-mail</label>
              <input
                type="text"
                required
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="Seu usuário ou e-mail"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold rounded-lg transition cursor-pointer shadow-lg shadow-amber-900/30"
          >
            {isLoading ? 'Aguarde...' : isRegistering ? 'Cadastrar e Entrar' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}