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

// Aceitar convite pendente vinculando um personagem do cofre
campaignsRouter.post('/invites/:inviteId/accept', async (req: AuthenticatedRequest, res) => {
  try {
    const { inviteId } = req.params;
    const { characterId } = req.body;

    if (!inviteId || typeof inviteId !== 'string') {
      return res.status(400).json({ error: 'ID do convite inválido.' });
    }

    if (!characterId || typeof characterId !== 'string') {
      return res.status(400).json({ error: 'Selecione um personagem para entrar na aventura.' });
    }

    const invite = await prisma.campaignInvite.findUnique({
      where: { id: inviteId },
      include: { campaign: true },
    });

    if (!invite || invite.userId !== req.userId) {
      return res.status(404).json({ error: 'Convite não encontrado.' });
    }

    const character = await prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!character || character.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Este personagem não pertence a você.' });
    }

    if (character.system !== invite.campaign.system) {
      return res.status(400).json({
        error: `Esta campanha exige um personagem do sistema ${invite.campaign.system}.`,
      });
    }

    // Executa o vínculo do personagem e a confirmação do convite em uma única transação
    await prisma.$transaction([
      prisma.character.update({
        where: { id: characterId },
        data: { campaignId: invite.campaignId },
      }),
      prisma.campaignInvite.update({
        where: { id: inviteId },
        data: { status: 'ACCEPTED' },
      }),
    ]);

    return res.json({ message: 'Você entrou na aventura com sucesso!' });
  } catch (error) {
    console.error('Erro ao aceitar convite:', error);
    return res.status(500).json({ error: 'Erro interno ao aceitar convite.' });
  }
});

// Entrar em uma campanha usando o código de convite
campaignsRouter.post('/join-code', async (req: AuthenticatedRequest, res) => {
  try {
    const { inviteCode, characterId } = req.body;

    if (!inviteCode || typeof inviteCode !== 'string' || !characterId || typeof characterId !== 'string') {
      return res.status(400).json({ error: 'Informe o código da campanha e selecione um personagem.' });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { inviteCode: inviteCode.trim().toUpperCase() },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Nenhuma campanha encontrada com este código.' });
    }

    if (campaign.dmId === req.userId) {
      return res.status(400).json({ error: 'Você já é o Mestre desta aventura.' });
    }

    const character = await prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!character || character.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Personagem inválido.' });
    }

    if (character.system !== campaign.system) {
      return res.status(400).json({
        error: `A campanha "${campaign.name}" usa o sistema ${campaign.system.toUpperCase()}, mas o personagem escolhido é de ${character.system.toUpperCase()}.`,
      });
    }

    await prisma.character.update({
      where: { id: characterId },
      data: { campaignId: campaign.id },
    });

    // Caso houvesse um convite pendente para esta mesma campanha, marca como aceito
    await prisma.campaignInvite.updateMany({
      where: { campaignId: campaign.id, userId: req.userId },
      data: { status: 'ACCEPTED' },
    });

    return res.json({ message: `Personagem vinculado à campanha ${campaign.name}!` });
  } catch (error) {
    console.error('Erro ao entrar por código:', error);
    return res.status(500).json({ error: 'Erro interno ao vincular personagem.' });
  }
});

// Recusar e remover um convite pendente
campaignsRouter.delete('/invites/:inviteId', async (req: AuthenticatedRequest, res) => {
  try {
    const { inviteId } = req.params;

    if (!inviteId || typeof inviteId !== 'string') {
      return res.status(400).json({ error: 'ID do convite inválido.' });
    }

    const invite = await prisma.campaignInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite || invite.userId !== req.userId) {
      return res.status(404).json({ error: 'Convite não encontrado.' });
    }

    await prisma.campaignInvite.delete({
      where: { id: inviteId },
    });

    return res.json({ message: 'Convite recusado.' });
  } catch (error) {
    console.error('Erro ao recusar convite:', error);
    return res.status(500).json({ error: 'Erro interno ao recusar convite.' });
  }
});