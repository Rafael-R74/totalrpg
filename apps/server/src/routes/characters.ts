import { Router } from 'express';
import { prisma } from '../prisma';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/authMiddleware';

export const charactersRouter = Router();

charactersRouter.use(authMiddleware as any);

// Listas todos os personagens
charactersRouter.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const characters = await prisma.character.findMany({
      where: { ownerId: req.userId },
      include: {
        campaign: { select: { id: true, name: true } } // Mostra se já está vinculado a alguma mesa
      },
      orderBy: { name: 'asc' }
    });

    return res.json(characters);
  } catch (error) {
    console.error('Erro ao listar personagens:', error);
    return res.status(500).json({ error: 'Erro ao listar personagens.' });
  }
});

// Criar um novo personagem isolado
charactersRouter.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, system, portraitUrl, campaignId } = req.body;

    if (!name || !system) {
      return res.status(400).json({ error: 'Nome e sistema são obrigatórios.' });
    }

    // Barras vitais padrão dependendo do sistema escolhido
    let defaultVitals: any[] = [];
    if (system === 'ordem-paranormal') {
      defaultVitals = [
        { id: 'pv', label: 'Pontos de Vida', current: 20, max: 20, color: '#dc2626' },
        { id: 'san', label: 'Sanidade', current: 20, max: 20, color: '#2563eb' },
        { id: 'pe', label: 'Pontos de Esforço', current: 5, max: 5, color: '#d97706' }
      ];
    } else if (system === 'tormenta20') {
      defaultVitals = [
        { id: 'pv', label: 'Pontos de Vida', current: 16, max: 16, color: '#dc2626' },
        { id: 'pm', label: 'Pontos de Mana', current: 4, max: 4, color: '#2563eb' }
      ];
    } else {
      defaultVitals = [
        { id: 'det', label: 'Determinação', current: 3, max: 3, color: '#d97706' }
      ];
    }

    const newCharacter = await prisma.character.create({
      data: {
        name,
        system,
        portraitUrl: portraitUrl || '',
        ownerId: req.userId!,
        campaignId: campaignId || null, 
        vitals: defaultVitals,
        sheetData: {},
        inventory: [],
        attacks: []
      }
    });

    return res.status(201).json(newCharacter);
  } catch (error) {
    console.error('Erro ao criar personagem:', error);
    return res.status(500).json({ error: 'Erro ao criar personagem.' });
  }
});