import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/authMiddleware';

const uploadsRouter = Router();

uploadsRouter.use(authMiddleware);

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

// Recebe uma imagem do computador do usuário, salva em apps/server/uploads e retorna a URL servida
uploadsRouter.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { fileName, mimeType, base64Data } = req.body;

    if (!base64Data || typeof base64Data !== 'string' || !mimeType || typeof mimeType !== 'string') {
      return res.status(400).json({ error: 'Arquivo de imagem inválido.' });
    }

    const extension = ALLOWED_MIME_TYPES[mimeType.toLowerCase()];
    if (!extension) {
      return res.status(400).json({
        error: 'Formato não suportado. Envie imagens PNG, JPG, WEBP ou GIF.',
      });
    }

    // Remove o cabeçalho "data:image/...;base64," caso esteja presente
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const fileBuffer = Buffer.from(cleanBase64, 'base64');

    // Limite de segurança de 15MB por imagem
    if (fileBuffer.byteLength > 15 * 1024 * 1024) {
      return res.status(400).json({ error: 'A imagem deve ter no máximo 15MB.' });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const safeBaseName = String(fileName || 'imagem')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 32);

    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${safeBaseName}${extension}`;
    const filePath = path.join(uploadsDir, uniqueFileName);

    await fs.writeFile(filePath, fileBuffer);

    const host = req.get('host') || 'localhost:3333';
    const protocol = req.protocol || 'http';
    const fileUrl = `${protocol}://${host}/uploads/${uniqueFileName}`;

    return res.status(201).json({ url: fileUrl });
  } catch (error) {
    console.error('Erro ao salvar upload de imagem:', error);
    return res.status(500).json({ error: 'Erro interno ao processar upload da imagem.' });
  }
});

export default uploadsRouter;