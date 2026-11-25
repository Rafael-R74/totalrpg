import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../prisma';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/authMiddleware';
import { getJwtSecret, getPacksDir, isConfiguredAdminIdentity } from '../config';
import {
  extractCleanIpFromRequest,
  recordAdminEvent,
  summarizeUserAgent,
  touchUserTelemetry,
} from '../adminTelemetryService';

export const authRouter = Router();

const JWT_SECRET = getJwtSecret();

function getUserPrefsFilePath(): string {
  return path.join(getPacksDir(), 'user-ui-preferences.local.json');
}

export function readAllUserPrefs(): Record<string, unknown> {
  try {
    const prefsFile = getUserPrefsFilePath();
    if (!fs.existsSync(prefsFile)) return {};
    return JSON.parse(fs.readFileSync(prefsFile, 'utf-8')) || {};
  } catch {
    return {};
  }
}

function writeAllUserPrefs(data: Record<string, unknown>) {
  const prefsFile = getUserPrefsFilePath();
  const dir = path.dirname(prefsFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(prefsFile, JSON.stringify(data, null, 2), 'utf-8');
}

// 1. Rota de cadastro
authRouter.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validação básica dos campos
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
    }

    // Verifica se já existe alguém com esse e-mail ou nome de usuário
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Nome de usuário ou e-mail já cadastrado.' });
    }

    // Criptografa a senha com bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Salva o usuário no banco SQLite usando o Prisma (promove automaticamente caso listado no .env)
    const shouldBeAdmin = isConfiguredAdminIdentity(email, username);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        isAdmin: shouldBeAdmin,
      }
    });

    // Gera o token JWT para o usuário já entrar logado
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' } 
    );

    const ip = extractCleanIpFromRequest(req);
    const device = summarizeUserAgent(req.headers['user-agent']);
    touchUserTelemetry(user.id, {
      lastLoginAt: Date.now(),
      incrementLogin: true,
      lastIp: ip,
      lastDevice: device,
    });
    recordAdminEvent({
      category: 'auth',
      userId: user.id,
      username: user.username,
      summary: `Nova conta criada: @${user.username} (${user.email})`,
      details: `${device} • IP ${ip}${user.isAdmin ? ' • Promovido a Admin' : ''}`,
      ip,
      device,
      tone: 'success',
    });

    return res.status(201).json({
      message: 'Usuário criado com sucesso!',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Erro no cadastro:', error);
    return res.status(500).json({ error: 'Erro interno ao criar conta.' });
  }
});

// 2. Rota de login
authRouter.post('/login', async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: 'Informe usuário/e-mail e senha.' });
    }

    const ip = extractCleanIpFromRequest(req);
    const device = summarizeUserAgent(req.headers['user-agent']);

    // Busca o usuário pelo e-mail OU pelo nome de usuário
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername },
          { username: emailOrUsername }
        ]
      }
    });

    if (!user) {
      recordAdminEvent({
        category: 'auth',
        summary: `Tentativa de login recusada para "${String(emailOrUsername).slice(0, 40)}"`,
        details: `${device} • IP ${ip}`,
        ip,
        device,
        tone: 'warning',
      });
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // Compara a senha digitada com o hash salvo no banco
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      recordAdminEvent({
        category: 'auth',
        userId: user.id,
        username: user.username,
        summary: `Senha incorreta no login de @${user.username}`,
        details: `${device} • IP ${ip}`,
        ip,
        device,
        tone: 'warning',
      });
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    let effectiveIsAdmin = user.isAdmin;
    if (!effectiveIsAdmin && isConfiguredAdminIdentity(user.email, user.username)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isAdmin: true },
      });
      effectiveIsAdmin = true;
    }

    touchUserTelemetry(user.id, {
      lastLoginAt: Date.now(),
      incrementLogin: true,
      lastIp: ip,
      lastDevice: device,
    });
    recordAdminEvent({
      category: 'auth',
      userId: user.id,
      username: user.username,
      summary: `Login realizado por @${user.username}`,
      details: `${device} • IP ${ip}`,
      ip,
      device,
      tone: 'info',
    });

    // Gera o token JWT de acesso
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Login realizado com sucesso!',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: effectiveIsAdmin,
      },
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ error: 'Erro interno ao realizar login.' });
  }
});

// 2.5. Sincronizar perfil e status de Admin da sessão atual
authRouter.get('/me', authMiddleware as any, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, username: true, email: true, isAdmin: true },
    });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    let effectiveIsAdmin = user.isAdmin;
    if (!effectiveIsAdmin && isConfiguredAdminIdentity(user.email, user.username)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isAdmin: true },
      });
      effectiveIsAdmin = true;
    }

    touchUserTelemetry(user.id, {
      lastIp: extractCleanIpFromRequest(req),
      lastDevice: summarizeUserAgent(req.headers['user-agent']),
    });

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: effectiveIsAdmin,
      },
    });
  } catch (error) {
    console.error('Erro em /auth/me:', error);
    return res.status(500).json({ error: 'Erro ao validar sessão.' });
  }
});

// 3. Preferências visuais do usuário (paleta, direção de arte e conforto visual)
authRouter.get('/preferences', authMiddleware as any, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }
    const all = readAllUserPrefs();
    return res.json({ preferences: all[req.userId] || null });
  } catch (error) {
    console.error('Erro ao ler preferências visuais:', error);
    return res.status(500).json({ error: 'Erro ao carregar preferências.' });
  }
});

authRouter.put('/preferences', authMiddleware as any, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }
    const { preferences } = req.body;
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ error: 'Objeto de preferências inválido.' });
    }
    const all = readAllUserPrefs();
    const prev = (all[req.userId] || {}) as Record<string, any>;
    all[req.userId] = preferences;
    writeAllUserPrefs(all);

    const nextPref = preferences as Record<string, any>;
    const changes: string[] = [];
    if (nextPref.palette && nextPref.palette !== prev.palette) {
      changes.push(`Paleta: ${nextPref.palette}`);
    }
    if (nextPref.artDirection && nextPref.artDirection !== prev.artDirection) {
      changes.push(`Direção: ${nextPref.artDirection}`);
    }
    if (nextPref.dice && nextPref.dice !== prev.dice) {
      changes.push(`Dados: ${nextPref.dice}`);
    }
    if (changes.length > 0) {
      recordAdminEvent({
        category: 'theme',
        userId: req.userId,
        username: req.username,
        summary: `@${req.username || 'usuário'} alterou aparência (${changes.join(' • ')})`,
        ip: extractCleanIpFromRequest(req),
        device: summarizeUserAgent(req.headers['user-agent']),
        tone: 'purple',
      });
    }

    return res.json({ message: 'Preferências salvas com sucesso.', preferences });
  } catch (error) {
    console.error('Erro ao salvar preferências visuais:', error);
    return res.status(500).json({ error: 'Erro ao salvar preferências.' });
  }
});