import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../prisma';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/authMiddleware';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const USER_PREFS_FILE = path.resolve(
  __dirname,
  '../../../../data/packs/user-ui-preferences.local.json'
);

function readAllUserPrefs(): Record<string, unknown> {
  try {
    if (!fs.existsSync(USER_PREFS_FILE)) return {};
    return JSON.parse(fs.readFileSync(USER_PREFS_FILE, 'utf-8')) || {};
  } catch {
    return {};
  }
}

function writeAllUserPrefs(data: Record<string, unknown>) {
  const dir = path.dirname(USER_PREFS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(USER_PREFS_FILE, JSON.stringify(data, null, 2), 'utf-8');
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

    // Salva o usuário no banco SQLite usando o Prisma
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword
      }
    });

    // Gera o token JWT para o usuário já entrar logado
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' } 
    );

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
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // Compara a senha digitada com o hash salvo no banco
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

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
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ error: 'Erro interno ao realizar login.' });
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
    all[req.userId] = preferences;
    writeAllUserPrefs(all);
    return res.json({ message: 'Preferências salvas com sucesso.', preferences });
  } catch (error) {
    console.error('Erro ao salvar preferências visuais:', error);
    return res.status(500).json({ error: 'Erro ao salvar preferências.' });
  }
});