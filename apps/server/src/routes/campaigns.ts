import { Router } from 'express';
import { prisma } from '../prisma';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/authMiddleware';

export const campaignsRouter = Router();

campaignsRouter.use(authMiddleware as any);

// ABA DM: LISTAR MINHAS AVENTURAS COMO MESTRE
campaignsRouter.get('/dm', async (req: AuthenticatedRequest, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { dmId: req.userId },
      include: {
       
        characters: {
          select: { id: true, name: true, portraitUrl: true, owner: { select: { username: true } } }
        },
        invites: {
          include: { user: { select: { id: true, username: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(campaigns);
  } catch (error) {
    console.error('Erro ao buscar campanhas de DM:', error);
    return res.status(500).json({ error: 'Erro ao buscar campanhas.' });
  }
});

// ABA DM: CRIAR UMA NOVA AVENTURA
campaignsRouter.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, description, system } = req.body;

    if (!name || !system) {
      return res.status(400).json({ error: 'Nome e sistema são obrigatórios.' });
    }

   
    const inviteCode = `TR-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const newCampaign = await prisma.campaign.create({
      data: {
        name,
        description: description || '',
        system,
        inviteCode,
        dmId: req.userId!
      }
    });

    return res.status(201).json(newCampaign);
  } catch (error) {
    console.error('Erro ao criar campanha:', error);
    return res.status(500).json({ error: 'Erro ao criar campanha.' });
  }
});

// ABA JOGADOR: LISTAR AVENTURAS EM QUE PARTICIPO COMO JOGADOR
campaignsRouter.get('/player', async (req: AuthenticatedRequest, res) => {
  try {
   
    const campaigns = await prisma.campaign.findMany({
      where: {
        characters: {
          some: { ownerId: req.userId }
        }
      },
      include: {
        dm: { select: { username: true } },
        characters: {
          where: { ownerId: req.userId } 
        }
      }
    });

    return res.json(campaigns);
  } catch (error) {
    console.error('Erro ao buscar campanhas do jogador:', error);
    return res.status(500).json({ error: 'Erro ao buscar campanhas.' });
  }
});

// ABA JOGADOR: LISTAR CONVITES PENDENTES RECEBIDOS
campaignsRouter.get('/invites', async (req: AuthenticatedRequest, res) => {
  try {
    const invites = await prisma.campaignInvite.findMany({
      where: {
        userId: req.userId,
        status: 'PENDING'
      },
      include: {
        campaign: {
          include: { dm: { select: { username: true } } }
        }
      }
    });

    return res.json(invites);
  } catch (error) {
    console.error('Erro ao buscar convites:', error);
    return res.status(500).json({ error: 'Erro ao buscar convites.' });
  }
});

// Convidar jogador para uma campanha
campaignsRouter.post('/:campaignId/invite', async (req: AuthenticatedRequest, res) => {
  try {
    const { campaignId } = req.params;
    const { targetUsername } = req.body;

    if (!campaignId || typeof campaignId !== 'string') {
      return res.status(400).json({ error: 'ID da campanha inválido.' });
    }

    if (!targetUsername || typeof targetUsername !== 'string') {
      return res.status(400).json({ error: 'Nome de usuário inválido.' });
    }

    const campaign = await prisma.campaign.findUnique({ 
      where: { id: campaignId } 
    });

    if (!campaign || campaign.dmId !== req.userId) {
      return res.status(403).json({ error: 'Apenas o Mestre pode convidar jogadores.' });
    }

    const targetUser = await prisma.user.findUnique({ 
      where: { username: targetUsername } 
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Jogador não encontrado.' });
    }

    const invite = await prisma.campaignInvite.create({
      data: {
        campaignId,
        userId: targetUser.id,
        status: 'PENDING'
      }
    });

    return res.status(201).json({ message: 'Convite enviado com sucesso!', invite });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Este jogador já foi convidado para esta aventura.' });
    }
    return res.status(500).json({ error: 'Erro ao enviar convite.' });
  }
});