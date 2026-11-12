import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/authMiddleware';

export const compendiumRouter = Router();

compendiumRouter.use(authMiddleware as any);

// Listar entradas do compêndio e perícias de um sistema
compendiumRouter.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const system = typeof req.query.system === 'string' ? req.query.system : undefined;

    // Corrige automaticamente o Sangue de Ferro caso tenha sido criado com o valor antigo (+10 fixo)
    await prisma.compendiumEntry.updateMany({
      where: { name: 'Sangue de Ferro (Sangue)' },
      data: {
        modifiers: [
          { id: 'm2', targetType: 'vital_max', targetKey: 'pv', value: 2, scaleWithLevel: true },
        ] as unknown as Prisma.InputJsonValue,
      },
    });

    const [entries, skills, currentUser] = await Promise.all([
      prisma.compendiumEntry.findMany({
        where: system ? { system } : undefined,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      }),
      prisma.systemSkill.findMany({
        where: system ? { system } : undefined,
        orderBy: { name: 'asc' },
      }),
      prisma.user.findUnique({
        where: { id: req.userId },
        select: { isAdmin: true },
      }),
    ]);

    return res.json({ entries, skills, isAdmin: Boolean(currentUser?.isAdmin) });
  } catch (error) {
    console.error('Erro ao buscar compêndio:', error);
    return res.status(500).json({ error: 'Erro ao carregar compêndio do sistema.' });
  }
});

// Criar nova entrada no Compêndio (Apenas Admin)
compendiumRouter.post('/entry', async (req: AuthenticatedRequest, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!currentUser?.isAdmin) {
      return res.status(403).json({ error: 'Apenas administradores podem gerenciar o Compêndio.' });
    }

    const { system, category, name, description, cost, modifiers, metadata } = req.body;

    if (!system || !category || !name) {
      return res.status(400).json({ error: 'Sistema, categoria e nome são obrigatórios.' });
    }

    const entry = await prisma.compendiumEntry.create({
      data: {
        system,
        category,
        name,
        description: description || '',
        cost: Number(cost) || 0,
        modifiers: (modifiers || []) as unknown as Prisma.InputJsonValue,
        metadata: (metadata || {}) as unknown as Prisma.InputJsonValue,
      },
    });

    return res.status(201).json(entry);
  } catch (error) {
    console.error('Erro ao criar entrada no compêndio:', error);
    return res.status(500).json({ error: 'Erro ao salvar item no compêndio.' });
  }
});

// Excluir entrada do Compêndio (Apenas Admin)
compendiumRouter.delete('/entry/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!currentUser?.isAdmin) {
      return res.status(403).json({ error: 'Apenas administradores podem excluir itens do Compêndio.' });
    }

    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID inválido.' });
    }

    await prisma.compendiumEntry.delete({ where: { id } });
    return res.json({ message: 'Entrada removida com sucesso.' });
  } catch (error) {
    console.error('Erro ao remover entrada:', error);
    return res.status(500).json({ error: 'Erro ao remover entrada do compêndio.' });
  }
});

// Criar ou atualizar perícia customizada de um sistema (Apenas Admin)
compendiumRouter.post('/skill', async (req: AuthenticatedRequest, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!currentUser?.isAdmin) {
      return res.status(403).json({ error: 'Apenas administradores podem gerenciar perícias.' });
    }

    const { system, skillKey, name, defaultAttribute, trainedOnly, armorPenalty } = req.body;

    if (!system || !skillKey || !name || !defaultAttribute) {
      return res.status(400).json({ error: 'Preencha todos os campos da perícia.' });
    }

    const cleanKey = String(skillKey).toLowerCase().trim().replace(/\s+/g, '_');

    const skill = await prisma.systemSkill.upsert({
      where: {
        system_skillKey: {
          system,
          skillKey: cleanKey,
        },
      },
      update: {
        name,
        defaultAttribute,
        trainedOnly: Boolean(trainedOnly),
        armorPenalty: Boolean(armorPenalty),
      },
      create: {
        system,
        skillKey: cleanKey,
        name,
        defaultAttribute,
        trainedOnly: Boolean(trainedOnly),
        armorPenalty: Boolean(armorPenalty),
      },
    });

    return res.status(201).json(skill);
  } catch (error) {
    console.error('Erro ao salvar perícia do sistema:', error);
    return res.status(500).json({ error: 'Erro ao salvar perícia.' });
  }
});

// Rota de Inicialização Rápida: Torna o usuário atual Admin e popula exemplos iniciais
compendiumRouter.post('/seed', async (req: AuthenticatedRequest, res) => {
  try {
    await prisma.user.update({
      where: { id: req.userId },
      data: { isAdmin: true },
    });

    const existingCount = await prisma.compendiumEntry.count();
    if (existingCount > 0) {
      return res.json({ message: 'Sua conta agora é Admin! O Compêndio já possui dados iniciais.' });
    }

    const initialEntries = [
      {
        system: 'ordem-paranormal',
        category: 'power',
        name: 'Ataque Especial (Combatente)',
        description: 'Quando faz um ataque, você pode gastar 2 PE para receber +5 no teste de ataque ou na rolagem de dano.',
        cost: 2,
        modifiers: [{ id: 'm1', targetType: 'attack_bonus', targetKey: 'all', value: 5 }],
        metadata: { requirements: 'NEX 5%, Combatente' },
      },
      {
        system: 'ordem-paranormal',
        category: 'power',
        name: 'Sangue de Ferro (Sangue)',
        description: 'O sangue paranormal corre em suas veias. Você recebe +2 Pontos de Vida máximos por grau de exposição (NEX).',
        cost: 0,
        modifiers: [
          { id: 'm2', targetType: 'vital_max', targetKey: 'pv', value: 2, scaleWithLevel: true },
        ],
        metadata: { element: 'Sangue', requirements: 'Poder Paranormal' },
      },
      {
        system: 'ordem-paranormal',
        category: 'spell',
        name: 'Decadência (1º Círculo - Morte)',
        description: 'Espirais de trevas envolvem sua mão e apodrecem o alvo, causando 2d8+2 de dano de Morte.',
        cost: 1,
        modifiers: [],
        metadata: { circle: 1, element: 'Morte', execution: 'Padrão', range: 'Toque', damageFormula: '2d8+2' },
      },
      {
        system: 'ordem-paranormal',
        category: 'item',
        name: 'Katana',
        description: 'Espada longa oriental curva. Arma tática corpo a corpo.',
        cost: 0,
        modifiers: [],
        metadata: { damageFormula: '1d10', critRange: '19/x2', slots: 2 },
      },
      {
        system: 'ordem-paranormal',
        category: 'item',
        name: 'Proteção Leve (Colete Kevlar)',
        description: 'Colete balístico que fornece +5 na Defesa.',
        cost: 0,
        modifiers: [{ id: 'm3', targetType: 'defense', targetKey: 'defense', value: 5 }],
        metadata: { slots: 2 },
      },
      {
        system: 'ordem-paranormal',
        category: 'condition',
        name: 'Abalado',
        description: 'O personagem sofre -1d20 em todos os testes de perícia. Se ficar abalado novamente, fica Apavorado.',
        cost: 0,
        modifiers: [{ id: 'm4', targetType: 'skill_dice', targetKey: 'all', value: -1 }],
        metadata: {},
      },
      {
        system: 'tormenta20',
        category: 'power',
        name: 'Vitalidade',
        description: 'Você possui mais vigor físico. Recebe +1 PV por nível e +2 em Fortitude.',
        cost: 0,
        modifiers: [
          { id: 't1', targetType: 'vital_max', targetKey: 'pv', value: 1, scaleWithLevel: true },
          { id: 't2', targetType: 'skill_bonus', targetKey: 'fortitude', value: 2 },
        ],
        metadata: { requirements: 'CON 1' },
      },
      {
        system: 'tormenta20',
        category: 'power',
        name: 'Estilo de Uma Arma',
        description: 'Se estiver usando uma arma corpo a corpo em uma mão e nada na outra, você recebe +2 na Defesa e +2 nos testes de ataque.',
        cost: 0,
        modifiers: [
          { id: 't3', targetType: 'defense', targetKey: 'defense', value: 2 },
          { id: 't4', targetType: 'attack_bonus', targetKey: 'all', value: 2 },
        ],
        metadata: { requirements: 'Treinado em Luta' },
      },
      {
        system: 'tormenta20',
        category: 'spell',
        name: 'Bola de Fogo (2º Círculo - Evocação)',
        description: 'Cria uma poderosa explosão que causa 6d6 pontos de dano de fogo em todas as criaturas na área.',
        cost: 3,
        modifiers: [],
        metadata: { circle: 2, element: 'Arcana / Evocação', execution: 'Padrão', range: 'Médio', damageFormula: '6d6' },
      },
      {
        system: 'tormenta20',
        category: 'item',
        name: 'Espada Bastarda',
        description: 'Arma exótica versátil e pesada.',
        cost: 0,
        modifiers: [],
        metadata: { damageFormula: '1d10', critRange: '19/x2', slots: 1 },
      },
      {
        system: 'tormenta20',
        category: 'condition',
        name: 'Frustrado / Abalado',
        description: 'O personagem sofre -2 em todos os testes de perícia.',
        cost: 0,
        modifiers: [{ id: 't5', targetType: 'skill_bonus', targetKey: 'all', value: -2 }],
        metadata: {},
      },
    ];

    for (const item of initialEntries) {
      await prisma.compendiumEntry.create({
        data: {
          system: item.system,
          category: item.category,
          name: item.name,
          description: item.description,
          cost: item.cost,
          modifiers: item.modifiers as unknown as Prisma.InputJsonValue,
          metadata: item.metadata as unknown as Prisma.InputJsonValue,
        },
      });
    }

    return res.json({ message: 'Conta promovida a Admin e Compêndio populado com sucesso!' });
  } catch (error) {
    console.error('Erro no seed do compêndio:', error);
    return res.status(500).json({ error: 'Erro ao inicializar Compêndio.' });
  }
});