import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config';
import { getAdminSettings, getUserSuspension } from '../adminSettingsService';
import { prisma } from '../prisma';

const JWT_SECRET = getJwtSecret();

export interface AuthenticatedRequest extends Request {
  userId?: string;
  username?: string;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Formato do token inválido.' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };

    const suspension = getUserSuspension(decoded.userId);
    if (suspension) {
      return res.status(403).json({
        error: suspension.reason
          ? `Sua conta foi suspensa pelo administrador: ${suspension.reason}`
          : 'Sua conta foi suspensa pelo administrador.',
        forceLogout: true,
      });
    }

    const settings = getAdminSettings();
    if (settings.maintenanceMode) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { isAdmin: true },
      });
      if (!user?.isAdmin) {
        return res.status(503).json({
          error: settings.maintenanceMessage,
          maintenanceMode: true,
        });
      }
    }

    req.userId = decoded.userId;
    req.username = decoded.username;

    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token expirado ou inválido.' });
  }
}