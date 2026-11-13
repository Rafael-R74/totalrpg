import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/authMiddleware';
import { createDefaultOrdemSheet, createDefaultT20Sheet, VitalBar } from '@totalrpg/shared';

export const charactersRouter = Router();

charactersRouter.use(authMiddleware as any);

// Listar todos os personagens do usuário logado
charactersRouter.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const characters = await prisma.character.findMany({
      where: { ownerId: req.userId },
      include: {
        campaign: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    return res.json(characters);
  } catch (error) {
    console.error('Erro ao listar personagens:', error);
    return res.status(500).json({ error: 'Erro ao listar personagens.' });
  }
});

// Buscar dados completos de um personagem específico
charactersRouter.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID do personagem inválido.' });
    }

    const character = await prisma.character.findUnique({
      where: { id },
      include: {
        campaign: true,
      },
    });

    if (!character) {
      return res.status(404).json({ error: 'Personagem não encontrado.' });
    }

    const isOwner = character.ownerId === req.userId;
    const isDM = character.campaign?.dmId === req.userId;
    let isCampaignMember = false;
    if (!isOwner && !isDM && character.campaignId) {
      const teammateCount = await prisma.character.count({
        where: { campaignId: character.campaignId, ownerId: req.userId },
      });
      isCampaignMember = teammateCount > 0;
    }

    if (!isOwner && !isDM && !isCampaignMember) {
      return res.status(403).json({ error: 'Sem permissão para visualizar esta ficha.' });
    }

    return res.json(character);
  } catch (error) {
    console.error('Erro ao buscar personagem:', error);
    return res.status(500).json({ error: 'Erro ao carregar dados do personagem.' });
  }
});

// Criar um novo personagem com a ficha inicial do sistema (ou vinda do Wizard)
charactersRouter.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const {
      name,
      system,
      portraitUrl,
      customVitals,
      customSheetData,
      initialInventory,
      initialAttacks,
    } = req.body;

    if (!name || !system) {
      return res.status(400).json({ error: 'Nome e sistema são obrigatórios.' });
    }

    let vitals: VitalBar[] = [];
    let sheetData: Record<string, any> = {};

    if (system === 'ordem-paranormal') {
      const generated = createDefaultOrdemSheet();
      vitals = generated.vitals;
      sheetData = generated.sheetData;
    } else if (system === 'tormenta20') {
      const generated = createDefaultT20Sheet();
      vitals = generated.vitals;
      sheetData = generated.sheetData;
    } else {
      vitals = [{ id: 'det', label: 'Determinação', current: 3, max: 3, color: '#d97706' }];
      sheetData = {};
    }

    if (Array.isArray(customVitals) && customVitals.length > 0) {
      vitals = customVitals;
    }
    if (customSheetData && typeof customSheetData === 'object') {
      sheetData = { ...sheetData, ...customSheetData };
    }

    const newCharacter = await prisma.character.create({
      data: {
        name,
        system,
        portraitUrl: portraitUrl || '',
        ownerId: req.userId!,
        campaignId: null,
        vitals: vitals as unknown as Prisma.InputJsonValue,
        sheetData: sheetData as unknown as Prisma.InputJsonValue,
        inventory: (Array.isArray(initialInventory) ? initialInventory : []) as unknown as Prisma.InputJsonValue,
        attacks: (Array.isArray(initialAttacks) ? initialAttacks : []) as unknown as Prisma.InputJsonValue,
      },
    });

    return res.status(201).json(newCharacter);
  } catch (error) {
    console.error('Erro ao criar personagem:', error);
    return res.status(500).json({ error: 'Erro ao criar personagem.' });
  }
});

// Atualizar dados da ficha do personagem (Vitais, Atributos, Perícias, Inventário)
charactersRouter.put('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { name, portraitUrl, vitals, sheetData, inventory, attacks } = req.body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID do personagem inválido.' });
    }

    const existingChar = await prisma.character.findUnique({
      where: { id },
      include: { campaign: true },
    });

    if (!existingChar) {
      return res.status(404).json({ error: 'Personagem não encontrado.' });
    }

    const isOwner = existingChar.ownerId === req.userId;
    const isDM = existingChar.campaign?.dmId === req.userId;

    if (!isOwner && !isDM) {
      return res.status(403).json({ error: 'Sem permissão para editar esta ficha.' });
    }

    // Se for o jogador editando, verifica se a Trava Mestra está ativa
    if (!isDM && existingChar.campaign?.lockAllSheets) {
      return res.status(403).json({ error: 'O Mestre bloqueou temporariamente a edição das fichas.' });
    }

    const updated = await prisma.character.update({
      where: { id },
      data: {
        name: name ?? existingChar.name,
        portraitUrl: portraitUrl !== undefined ? String(portraitUrl) : existingChar.portraitUrl,
        vitals: (vitals ?? existingChar.vitals) as Prisma.InputJsonValue,
        sheetData: (sheetData ?? existingChar.sheetData) as Prisma.InputJsonValue,
        inventory: (inventory ?? existingChar.inventory) as Prisma.InputJsonValue,
        attacks: (attacks ?? existingChar.attacks) as Prisma.InputJsonValue,
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar personagem:', error);
    return res.status(500).json({ error: 'Erro ao salvar alterações da ficha.' });
  }
});

// Excluir permanentemente um personagem (Apenas pelo próprio dono)
charactersRouter.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const characterId = req.params.id;
    if (!characterId || typeof characterId !== 'string') {
      return res.status(400).json({ error: 'ID do personagem inválido.' });
    }

    const existing = await prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Personagem não encontrado.' });
    }

    if (existing.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Apenas o dono pode excluir este personagem.' });
    }

    await prisma.character.delete({
      where: { id: characterId },
    });

    return res.json({ message: 'Personagem excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir personagem:', error);
    return res.status(500).json({ error: 'Erro ao excluir personagem.' });
  }
});