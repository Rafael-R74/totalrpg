import { Router } from 'express';
import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';
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

// Carregar todos os dados da campanha e fichas completas para o Escudo do Mestre
campaignsRouter.get('/:campaignId/dm-screen', async (req: AuthenticatedRequest, res) => {
  try {
    const { campaignId } = req.params;

    if (!campaignId || typeof campaignId !== 'string') {
      return res.status(400).json({ error: 'ID da campanha inválido.' });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        characters: {
          include: {
            owner: {
              select: { id: true, username: true },
            },
          },
          orderBy: { name: 'asc' },
        },
        invites: {
          where: { status: 'PENDING' },
          include: {
            user: { select: { id: true, username: true } },
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada.' });
    }

    if (campaign.dmId !== req.userId) {
      return res.status(403).json({ error: 'Acesso restrito ao Mestre desta aventura.' });
    }

    return res.json(campaign);
  } catch (error) {
    console.error('Erro ao carregar Escudo do Mestre:', error);
    return res.status(500).json({ error: 'Erro ao carregar dados do Escudo do Mestre.' });
  }
});

// Atualizar as Travas de Edição de Ficha da campanha
campaignsRouter.put('/:campaignId/permissions', async (req: AuthenticatedRequest, res) => {
  try {
    const { campaignId } = req.params;

    if (!campaignId || typeof campaignId !== 'string') {
      return res.status(400).json({ error: 'ID da campanha inválido.' });
    }

    const existing = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!existing || existing.dmId !== req.userId) {
      return res.status(403).json({ error: 'Apenas o Mestre pode alterar as travas da mesa.' });
    }

    const {
      lockAllSheets,
      allowEditVitals,
      allowEditInventory,
      allowEditAbilities,
      allowEditAttributes,
      allowTrade,
    } = req.body;

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        lockAllSheets: lockAllSheets ?? existing.lockAllSheets,
        allowEditVitals: allowEditVitals ?? existing.allowEditVitals,
        allowEditInventory: allowEditInventory ?? existing.allowEditInventory,
        allowEditAbilities: allowEditAbilities ?? existing.allowEditAbilities,
        allowEditAttributes: allowEditAttributes ?? existing.allowEditAttributes,
        allowTrade: allowTrade ?? existing.allowTrade,
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar travas da campanha:', error);
    return res.status(500).json({ error: 'Erro ao atualizar permissões da mesa.' });
  }
});

// Salvar dados dos blocos do Escudo do Mestre no banco SQLite (Etapa 4D)
campaignsRouter.put('/:campaignId/dm-data', async (req: AuthenticatedRequest, res) => {
  try {
    const { campaignId } = req.params;

    if (!campaignId || typeof campaignId !== 'string') {
      return res.status(400).json({ error: 'ID da campanha inválido.' });
    }

    const existing = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!existing || existing.dmId !== req.userId) {
      return res.status(403).json({ error: 'Apenas o Mestre pode salvar dados desta campanha.' });
    }

    const { dmNotes, combatState, threats, campaignItems, merchants, postIts } = req.body;

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        dmNotes: dmNotes !== undefined ? String(dmNotes) : existing.dmNotes,
        combatState:
          combatState !== undefined
            ? (combatState as Prisma.InputJsonValue)
            : (existing.combatState as Prisma.InputJsonValue),
        threats:
          threats !== undefined
            ? (threats as Prisma.InputJsonValue)
            : (existing.threats as Prisma.InputJsonValue),
        campaignItems:
          campaignItems !== undefined
            ? (campaignItems as Prisma.InputJsonValue)
            : (existing.campaignItems as Prisma.InputJsonValue),
        merchants:
          merchants !== undefined
            ? (merchants as Prisma.InputJsonValue)
            : (existing.merchants as Prisma.InputJsonValue),
        postIts:
          postIts !== undefined
            ? (postIts as Prisma.InputJsonValue)
            : (existing.postIts as Prisma.InputJsonValue),
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error('Erro ao salvar dados do Escudo do Mestre:', error);
    return res.status(500).json({ error: 'Erro ao salvar dados da campanha no banco.' });
  }
});

// 1. Listar aliados da mesma campanha disponíveis para receber itens (Etapa 4E)
campaignsRouter.get('/:campaignId/trade-targets', async (req: AuthenticatedRequest, res) => {
  try {
    const { campaignId } = req.params;

    if (!campaignId || typeof campaignId !== 'string') {
      return res.status(400).json({ error: 'ID da campanha inválido.' });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        characters: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            owner: { select: { username: true } },
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada.' });
    }

    return res.json({
      allowTrade: campaign.allowTrade && !campaign.lockAllSheets,
      characters: campaign.characters,
    });
  } catch (error) {
    console.error('Erro ao buscar aliados para troca:', error);
    return res.status(500).json({ error: 'Erro ao carregar aliados da mesa.' });
  }
});

// 2. Transferência de itens
campaignsRouter.post('/:campaignId/transfer-item', async (req: AuthenticatedRequest, res) => {
  try {
    const { campaignId } = req.params;
    const { fromCharacterId, toCharacterId, itemId, quantity } = req.body;

    if (
      !campaignId ||
      typeof campaignId !== 'string' ||
      !fromCharacterId ||
      typeof fromCharacterId !== 'string' ||
      !toCharacterId ||
      typeof toCharacterId !== 'string' ||
      !itemId ||
      typeof itemId !== 'string'
    ) {
      return res.status(400).json({ error: 'Dados incompletos para a transferência do item.' });
    }
    if (!campaignId || !fromCharacterId || !toCharacterId || !itemId) {
      return res.status(400).json({ error: 'Dados incompletos para a transferência do item.' });
    }

    if (fromCharacterId === toCharacterId) {
      return res.status(400).json({ error: 'Selecione um aliado diferente para receber o item.' });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada.' });
    }

    const isDM = campaign.dmId === req.userId;

    // Trava de Segurança no Servidor: Verifica se o Mestre liberou as trocas na mesa
    if (!isDM && (campaign.lockAllSheets || !campaign.allowTrade)) {
      return res.status(403).json({
        error: 'O Mestre bloqueou a passagem de itens entre jogadores neste momento.',
      });
    }

    const [senderChar, receiverChar] = await Promise.all([
      prisma.character.findUnique({ where: { id: fromCharacterId } }),
      prisma.character.findUnique({ where: { id: toCharacterId } }),
    ]);

    if (!senderChar || !receiverChar) {
      return res.status(404).json({ error: 'Personagem remetente ou destinatário não encontrado.' });
    }

    if (senderChar.campaignId !== campaignId || receiverChar.campaignId !== campaignId) {
      return res.status(400).json({ error: 'Ambos os personagens devem pertencer à mesma campanha.' });
    }

    if (!isDM && senderChar.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Você só pode passar itens da sua própria ficha.' });
    }

    const senderInventory = Array.isArray(senderChar.inventory) ? (senderChar.inventory as any[]) : [];
    const senderAttacks = Array.isArray(senderChar.attacks) ? (senderChar.attacks as any[]) : [];

    const itemToTransfer = senderInventory.find((i) => i.id === itemId);
    if (!itemToTransfer) {
      return res.status(404).json({ error: 'Item não encontrado na sua mochila.' });
    }

    const availableQty = Number(itemToTransfer.quantity) || 1;
    const transferQty = Math.max(1, Math.min(Number(quantity) || 1, availableQty));
    const remainingQty = availableQty - transferQty;

    // 1. Atualiza o inventário do Remetente (Subtrai da pilha ou remove o item se zerar)
    let nextSenderInventory: any[];
    if (remainingQty > 0) {
      nextSenderInventory = senderInventory.map((i) =>
        i.id === itemId ? { ...i, quantity: remainingQty } : i
      );
    } else {
      nextSenderInventory = senderInventory.filter((i) => i.id !== itemId);
    }

    // Verifica se este item tem um ataque de arma vinculado
    const matchingAttack = senderAttacks.find(
      (atk) => atk.name.toLowerCase().trim() === String(itemToTransfer.name).toLowerCase().trim()
    );

    // Só remove o ataque do remetente se ele entregou TODAS as unidades daquela arma
    const nextSenderAttacks =
      matchingAttack && remainingQty === 0
        ? senderAttacks.filter((atk) => atk.id !== matchingAttack.id)
        : senderAttacks;

    // 2. Monta o pacote que o Destinatário vai receber
    const transferredItemPayload = {
      ...itemToTransfer,
      id: Math.random().toString(36).substring(2, 9),
      quantity: transferQty,
      isEquipped: false,
    };

    const receiverInventory = Array.isArray(receiverChar.inventory)
      ? (receiverChar.inventory as any[])
      : [];
    const receiverAttacks = Array.isArray(receiverChar.attacks)
      ? (receiverChar.attacks as any[])
      : [];

    // Verifica se o destinatário já tem esse mesmo item para somar na pilha dele!
    const existingReceiverIdx = receiverInventory.findIndex(
      (i) =>
        String(i.name).toLowerCase().trim() === String(itemToTransfer.name).toLowerCase().trim() &&
        Number(i.slots) === Number(itemToTransfer.slots)
    );

    let nextReceiverInventory: any[];
    if (existingReceiverIdx >= 0) {
      nextReceiverInventory = receiverInventory.map((i, idx) =>
        idx === existingReceiverIdx
          ? { ...i, quantity: (Number(i.quantity) || 1) + transferQty }
          : i
      );
    } else {
      nextReceiverInventory = [...receiverInventory, transferredItemPayload];
    }

    // Se for uma arma e o destinatário ainda não tiver o botão de ataque dela, adiciona o ataque!
    const receiverAlreadyHasAttack =
      matchingAttack &&
      receiverAttacks.some(
        (a) => a.name.toLowerCase().trim() === String(matchingAttack.name).toLowerCase().trim()
      );

    const transferredAttackPayload = matchingAttack
      ? { ...matchingAttack, id: Math.random().toString(36).substring(2, 9) }
      : undefined;

    const nextReceiverAttacks =
      transferredAttackPayload && !receiverAlreadyHasAttack
        ? [...receiverAttacks, transferredAttackPayload]
        : receiverAttacks;

    // 3. Executa a gravação nos dois personagens em uma única transação atômica no SQLite
    const [updatedSender] = await prisma.$transaction([
      prisma.character.update({
        where: { id: senderChar.id },
        data: {
          inventory: nextSenderInventory as Prisma.InputJsonValue,
          attacks: nextSenderAttacks as Prisma.InputJsonValue,
        },
      }),
      prisma.character.update({
        where: { id: receiverChar.id },
        data: {
          inventory: nextReceiverInventory as Prisma.InputJsonValue,
          attacks: nextReceiverAttacks as Prisma.InputJsonValue,
        },
      }),
    ]);

    return res.json({
      message: `${transferQty}x ${itemToTransfer.name} entregue para ${receiverChar.name}!`,
      updatedSender,
      transferredItem: transferredItemPayload,
      transferredAttack: transferredAttackPayload,
    });
  } catch (error) {
    console.error('Erro na transferência de item:', error);
    return res.status(500).json({ error: 'Erro interno ao transferir item.' });
  }
});

// 1. Remover ou desvincular um personagem da campanha (Devolve a ficha intacta para o Cofre do jogador)
campaignsRouter.put('/:campaignId/remove-character/:characterId', async (req: AuthenticatedRequest, res) => {
  try {
    const { campaignId, characterId } = req.params;

    if (
      !campaignId ||
      typeof campaignId !== 'string' ||
      !characterId ||
      typeof characterId !== 'string'
    ) {
      return res.status(400).json({ error: 'Parâmetros inválidos.' });
    }

    const [campaign, character] = await Promise.all([
      prisma.campaign.findUnique({ where: { id: campaignId } }),
      prisma.character.findUnique({ where: { id: characterId } }),
    ]);

    if (!campaign || !character) {
      return res.status(404).json({ error: 'Campanha ou personagem não encontrado.' });
    }

    const isDM = campaign.dmId === req.userId;
    const isOwner = character.ownerId === req.userId;

    if (!isDM && !isOwner) {
      return res.status(403).json({ error: 'Sem permissão para remover este personagem da mesa.' });
    }

    await prisma.character.update({
      where: { id: characterId },
      data: { campaignId: null },
    });

    return res.json({ message: 'Personagem devolvido ao Cofre com sucesso.' });
  } catch (error) {
    console.error('Erro ao remover personagem da campanha:', error);
    return res.status(500).json({ error: 'Erro ao desvincular personagem da mesa.' });
  }
});

// 2. Excluir uma campanha inteira (Desvinculando os personagens antes para preservá-los no Cofre!)
campaignsRouter.delete('/:campaignId', async (req: AuthenticatedRequest, res) => {
  try {
    const { campaignId } = req.params;

    if (!campaignId || typeof campaignId !== 'string') {
      return res.status(400).json({ error: 'ID da campanha inválido.' });
    }

    const existing = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Campanha não encontrada.' });
    }

    if (existing.dmId !== req.userId) {
      return res.status(403).json({ error: 'Apenas o Mestre pode excluir esta campanha.' });
    }

    await prisma.$transaction([
      prisma.character.updateMany({
        where: { campaignId },
        data: { campaignId: null },
      }),
      prisma.campaignInvite.deleteMany({
        where: { campaignId },
      }),
      prisma.campaign.delete({
        where: { id: campaignId },
      }),
    ]);

    return res.json({ message: 'Campanha encerrada e excluída com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir campanha:', error);
    return res.status(500).json({ error: 'Erro interno ao excluir campanha.' });
  }
});