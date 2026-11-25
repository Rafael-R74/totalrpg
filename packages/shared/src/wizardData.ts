import { OrdemAttributes, T20Attributes, RuleModifier, CharacterAbility } from './index';

// ============================================================================
// 1. ORDEM PARANORMAL RPG v1.3 — METADADOS DAS 28 PERÍCIAS (TABELA 2.1, p. 41)
// ============================================================================
export interface OrdemSkillMeta {
  id: string;
  name: string;
  attribute: keyof OrdemAttributes;
  trainedOnly: boolean;
  armorPenalty: boolean;
  requiresKit: boolean;
  summary: string;
}

export const ORDEM_SKILLS_METADATA: OrdemSkillMeta[] = [
  { id: 'acrobacia', name: 'Acrobacia', attribute: 'agi', trainedOnly: false, armorPenalty: true, requiresKit: false, summary: 'Amortecer queda, equilíbrio, escapar de amarras, levantar-se rápido e passar por inimigo.' },
  { id: 'adestramento', name: 'Adestramento', attribute: 'pre', trainedOnly: true, armorPenalty: false, requiresKit: false, summary: 'Acalmar animal, cavalgar e manejar animais.' },
  { id: 'artes', name: 'Artes', attribute: 'pre', trainedOnly: true, armorPenalty: false, requiresKit: false, summary: 'Apresentação artística, música, atuação e expressão.' },
  { id: 'atletismo', name: 'Atletismo', attribute: 'for', trainedOnly: false, armorPenalty: false, requiresKit: false, summary: 'Corrida, escalar, natação e saltar.' },
  { id: 'atualidades', name: 'Atualidades', attribute: 'int', trainedOnly: false, armorPenalty: false, requiresKit: false, summary: 'Conhecimentos gerais, notícias, política, esportes e entretenimento.' },
  { id: 'ciencias', name: 'Ciências', attribute: 'int', trainedOnly: true, armorPenalty: false, requiresKit: false, summary: 'Física, química, biologia e ciências avançadas.' },
  { id: 'crime', name: 'Crime', attribute: 'agi', trainedOnly: true, armorPenalty: true, requiresKit: true, summary: 'Arrombar fechaduras, furto, ocultar objetos e sabotar dispositivos.' },
  { id: 'diplomacia', name: 'Diplomacia', attribute: 'pre', trainedOnly: false, armorPenalty: false, requiresKit: false, summary: 'Acalmar aliado enlouquecendo (DT 20), mudar atitude e persuasão.' },
  { id: 'enganacao', name: 'Enganação', attribute: 'pre', trainedOnly: false, armorPenalty: false, requiresKit: true, summary: 'Disfarce, falsificação, fintar em combate, insinuação e intriga.' },
  { id: 'fortitude', name: 'Fortitude', attribute: 'vig', trainedOnly: false, armorPenalty: false, requiresKit: false, summary: 'Resistência física a venenos, doenças, fadiga e manter fôlego.' },
  { id: 'furtividade', name: 'Furtividade', attribute: 'agi', trainedOnly: false, armorPenalty: true, requiresKit: false, summary: 'Esconder-se e seguir alvos sem ser notado.' },
  { id: 'iniciativa', name: 'Iniciativa', attribute: 'agi', trainedOnly: false, armorPenalty: false, requiresKit: false, summary: 'Velocidade de reação no início de cada cena de ação.' },
  { id: 'intimidacao', name: 'Intimidação', attribute: 'pre', trainedOnly: false, armorPenalty: false, requiresKit: false, summary: 'Assustar oponentes em combate e coagir pessoas.' },
  { id: 'intuicao', name: 'Intuição', attribute: 'pre', trainedOnly: false, armorPenalty: false, requiresKit: false, summary: 'Perceber mentiras, intenções ocultas e pressentimentos.' },
  { id: 'investigacao', name: 'Investigação', attribute: 'int', trainedOnly: false, armorPenalty: false, requiresKit: false, summary: 'Procurar pistas em cenas de investigação e interrogar.' },
  { id: 'luta', name: 'Luta', attribute: 'for', trainedOnly: false, armorPenalty: false, requiresKit: false, summary: 'Testes de ataque corpo a corpo e manobras de combate.' },
  { id: 'medicina', name: 'Medicina', attribute: 'int', trainedOnly: false, armorPenalty: false, requiresKit: true, summary: 'Primeiros socorros (DT 20), cuidados prolongados, necropsia e tratamento.' },
  { id: 'ocultismo', name: 'Ocultismo', attribute: 'int', trainedOnly: true, armorPenalty: false, requiresKit: false, summary: 'Identificar criaturas, rituais, itens amaldiçoados e pagar O Custo do Paranormal.' },
  { id: 'percepcao', name: 'Percepção', attribute: 'pre', trainedOnly: false, armorPenalty: false, requiresKit: false, summary: 'Observar detalhes, ouvir ruídos sutis e ler lábios.' },
  { id: 'pilotagem', name: 'Pilotagem', attribute: 'agi', trainedOnly: true, armorPenalty: false, requiresKit: false, summary: 'Conduzir veículos terrestres, aquáticos e aéreos.' },
  { id: 'pontaria', name: 'Pontaria', attribute: 'agi', trainedOnly: false, armorPenalty: false, requiresKit: false, summary: 'Testes de ataque à distância (arremesso, disparo e armas de fogo).' },
  { id: 'profissao', name: 'Profissão', attribute: 'int', trainedOnly: true, armorPenalty: false, requiresKit: false, summary: 'Exercer ofício específico (advogado, cozinheiro, engenheiro, etc.).' },
  { id: 'reflexos', name: 'Reflexos', attribute: 'agi', trainedOnly: false, armorPenalty: false, requiresKit: false, summary: 'Evitar explosões, armadilhas e fintas.' },
  { id: 'religiao', name: 'Religião', attribute: 'pre', trainedOnly: true, armorPenalty: false, requiresKit: false, summary: 'Acalmar aliado enlouquecendo (DT 20), ritos e teologia.' },
  { id: 'sobrevivencia', name: 'Sobrevivência', attribute: 'int', trainedOnly: false, armorPenalty: false, requiresKit: false, summary: 'Acampamento, orientar-se em ambientes selvagens e rastrear.' },
  { id: 'tatica', name: 'Tática', attribute: 'int', trainedOnly: true, armorPenalty: false, requiresKit: false, summary: 'Analisar terreno de combate e traçar plano de ação.' },
  { id: 'tecnologia', name: 'Tecnologia', attribute: 'int', trainedOnly: true, armorPenalty: false, requiresKit: true, summary: 'Hackear sistemas, operar eletrônicos avançados e falsificação digital.' },
  { id: 'vontade', name: 'Vontade', attribute: 'pre', trainedOnly: false, armorPenalty: false, requiresKit: false, summary: 'Resistência mental contra medo, rituais e presença perturbadora.' },
];

// ============================================================================
// 2. ORDEM PARANORMAL RPG v1.3 — AS 26 ORIGENS OFICIAIS (TABELA 1.1, p. 16-21)
// ============================================================================
export interface OrdemOriginDefinition {
  id: string;
  name: string;
  sourceId?: string;          // 'ordem-base' (padrão) ou 'sobrevivendo-ao-horror'
  description: string;
  skills: string[];           // IDs das 2 perícias treinadas (vazio para Amnésico)
  freeSkillChoices?: number;  // 2 para Amnésico, 1 para Profetizado
  powerName: string;
  powerDescription: string;
  powerCost: number;
  modifiers: RuleModifier[];
  requiresManualActivation?: boolean; // Poderes de custo 0 que só ativam quando o jogador aciona (ex: Magnum Opus, Vislumbres do Passado, Cosplayer)
  oncePerScene?: boolean;             // Poderes limitados a 1x por cena (ex: Faro para Pistas, Impostor, Posição de Combate)
  halvesInitialSanity?: boolean;      // Cultista Arrependido
  grantsParanormalPower?: boolean;    // Cultista Arrependido
  extraPeOddNex?: boolean;            // Universitário (+1 PE inicial e em cada NEX ímpar)
  extraPeLimit?: number;              // Universitário (+1 no Limite de PE por turno, sem afetar DT)
  requiresOriginSkillBonusChoice?: 'any' | 'physical'; // Amigo dos Animais ('any') / Experimento ('physical')
  grantsParanormalInvention?: boolean; // Inventor Paranormal (escolhe 1 ritual de 1º círculo -> cria Invento Paranormal Cat 0)
}

export const ORDEM_ORIGINS: OrdemOriginDefinition[] = [
  {
    id: 'academico',
    name: 'Acadêmico',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skills: ['ciencias', 'investigacao'],
    powerName: 'Saber é Poder',
    powerDescription: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powerCost: 2,
    modifiers: [
      { id: 'orig-acad-atu', targetType: 'skill_bonus', targetKey: 'atualidades', value: 5 },
      { id: 'orig-acad-cie', targetType: 'skill_bonus', targetKey: 'ciencias', value: 5 },
      { id: 'orig-acad-inv', targetType: 'skill_bonus', targetKey: 'investigacao', value: 5 },
      { id: 'orig-acad-med', targetType: 'skill_bonus', targetKey: 'medicina', value: 5 },
      { id: 'orig-acad-ocu', targetType: 'skill_bonus', targetKey: 'ocultismo', value: 5 },
      { id: 'orig-acad-pro', targetType: 'skill_bonus', targetKey: 'profissao', value: 5 },
      { id: 'orig-acad-sob', targetType: 'skill_bonus', targetKey: 'sobrevivencia', value: 5 },
      { id: 'orig-acad-tat', targetType: 'skill_bonus', targetKey: 'tatica', value: 5 },
      { id: 'orig-acad-tec', targetType: 'skill_bonus', targetKey: 'tecnologia', value: 5 },
    ],
  },
  {
    id: 'agente_saude',
    name: 'Agente de Saúde',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skills: ['intuicao', 'medicina'],
    powerName: 'Técnica Medicinal',
    powerDescription: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powerCost: 0,
    modifiers: [],
  },
  {
    id: 'amnesico',
    name: 'Amnésico',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skills: [],
    freeSkillChoices: 2,
    powerName: 'Vislumbres do Passado',
    powerDescription: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powerCost: 0,
    requiresManualActivation: true,
    modifiers: [],
  },
  {
    id: 'artista',
    name: 'Artista',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skills: ['artes', 'enganacao'],
    powerName: 'Magnum Opus',
    powerDescription: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powerCost: 0,
    modifiers: [],
  },
  {
    id: 'atleta',
    name: 'Atleta',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skills: ['acrobacia', 'atletismo'],
    powerName: '110%',
    powerDescription: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powerCost: 2,
    modifiers: [
      { id: 'orig-atl-acr', targetType: 'skill_bonus', targetKey: 'acrobacia', value: 5 },
      { id: 'orig-atl-atl', targetType: 'skill_bonus', targetKey: 'atletismo', value: 5 },
      { id: 'orig-atl-cri', targetType: 'skill_bonus', targetKey: 'crime', value: 5 },
      { id: 'orig-atl-fur', targetType: 'skill_bonus', targetKey: 'furtividade', value: 5 },
      { id: 'orig-atl-ini', targetType: 'skill_bonus', targetKey: 'iniciativa', value: 5 },
      { id: 'orig-atl-pil', targetType: 'skill_bonus', targetKey: 'pilotagem', value: 5 },
      { id: 'orig-atl-ref', targetType: 'skill_bonus', targetKey: 'reflexos', value: 5 },
    ],
  },
  {
    id: 'chef',
    name: 'Chef',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skills: ['fortitude', 'profissao'],
    powerName: 'Ingrediente Secreto',
    powerDescription: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powerCost: 0,
    modifiers: [],
  },
  {
    id: 'criminoso',
    name: 'Criminoso',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skills: ['crime', 'furtividade'],
    powerName: 'O Crime Compensa',
    powerDescription: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powerCost: 0,
    modifiers: [],
  },
  {
    id: 'cultista_arrependido',
    name: 'Cultista Arrependido',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skills: ['ocultismo', 'religiao'],
    powerName: 'Traços do Outro Lado',
    powerDescription: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powerCost: 0,
    modifiers: [],
    halvesInitialSanity: true,
    grantsParanormalPower: true,
  },
  {
    id: 'desgarrado',
    name: 'Desgarrado',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skills: ['fortitude', 'sobrevivencia'],
    powerName: 'Calejado',
    powerDescription: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powerCost: 0,
    modifiers: [{ id: 'orig-desg', targetType: 'vital_max', targetKey: 'pv', value: 1, scaleWithLevel: true }],
  },
  {
    id: 'engenheiro',
    name: 'Engenheiro',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skills: ['profissao', 'tecnologia'],
    powerName: 'Ferramenta Favorita',
    powerDescription: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powerCost: 0,
    modifiers: [],
  },
  {
    id: 'executivo',
    name: 'Executivo',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skills: ['diplomacia', 'profissao'],
    powerName: 'Processo Otimizado',
    powerDescription: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powerCost: 2,
    modifiers: [{ id: 'orig-exec-all', targetType: 'skill_bonus', targetKey: 'all', value: 5 }],
  },
  {
    id: 'investigador',
    name: 'Investigador',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skills: ['investigacao', 'percepcao'],
    powerName: 'Faro para Pistas',
    powerDescription: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powerCost: 1,
    oncePerScene: true,
    modifiers: [{ id: 'orig-inv-all', targetType: 'skill_bonus', targetKey: 'all', value: 5 }],
  },
  {
    id: 'lutador',
    name: 'Lutador',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skills: ['luta', 'reflexos'],
    powerName: 'Mão Pesada',
    powerDescription: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powerCost: 0,
    modifiers: [{ id: 'orig-lut-melee', targetType: 'damage_bonus', targetKey: 'melee', value: 2 }],
  },
  {
    id: 'magnata',
    name: 'Magnata',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skills: ['diplomacia', 'pilotagem'],
    powerName: 'Patrocinador da Ordem',
    powerDescription: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powerCost: 0,
    modifiers: [],
  },
  {
    id: 'mercenario',
    name: 'Mercenário',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skills: ['iniciativa', 'intimidacao'],
    powerName: 'Posição de Combate',
    powerDescription: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powerCost: 0,
    modifiers: [],
  },
  {
    id: 'militar',
    name: 'Militar',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skills: ['pontaria', 'tatica'],
    powerName: 'Para Bellum',
    powerDescription: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powerCost: 0,
    modifiers: [{ id: 'orig-mil-firearm', targetType: 'damage_bonus', targetKey: 'firearm', value: 2 }],
  },
  {
    id: 'operario',
    name: 'Operário',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skills: ['fortitude', 'profissao'],
    powerName: 'Ferramenta de Trabalho',
    powerDescription: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powerCost: 0,
    modifiers: [],
  },
  {
    id: 'policial',
    name: 'Policial',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skills: ['percepcao', 'pontaria'],
    powerName: 'Patrulha',
    powerDescription: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powerCost: 0,
    modifiers: [{ id: 'orig-pol', targetType: 'defense', targetKey: 'defense', value: 2 }],
  },
  {
    id: 'religioso',
    name: 'Religioso',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skills: ['religiao', 'vontade'],
    powerName: 'Acalentar',
    powerDescription: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powerCost: 0,
    modifiers: [{ id: 'orig-rel', targetType: 'skill_bonus', targetKey: 'religiao', value: 5 }],
  },
  {
    id: 'servidor_publico',
    name: 'Servidor Público',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skills: ['intuicao', 'vontade'],
    powerName: 'Espírito Cívico',
    powerDescription: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powerCost: 0,
    modifiers: [],
  },
  {
    id: 'teorico_conspiracao',
    name: 'Teórico da Conspiração',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skills: ['investigacao', 'ocultismo'],
    powerName: 'Eu Já Sabia',
    powerDescription: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powerCost: 0,
    modifiers: [],
  },
  {
    id: 'ti',
    name: 'T.I.',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skills: ['investigacao', 'tecnologia'],
    powerName: 'Motor de Busca',
    powerDescription: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powerCost: 2,
    modifiers: [],
  },
  {
    id: 'trabalhador_rural',
    name: 'Trabalhador Rural',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skills: ['adestramento', 'sobrevivencia'],
    powerName: 'Desbravador',
    powerDescription: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powerCost: 2,
    modifiers: [
      { id: 'orig-tr-ade', targetType: 'skill_bonus', targetKey: 'adestramento', value: 5 },
      { id: 'orig-tr-sob', targetType: 'skill_bonus', targetKey: 'sobrevivencia', value: 5 },
    ],
  },
  {
    id: 'trambiqueiro',
    name: 'Trambiqueiro',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skills: ['crime', 'enganacao'],
    powerName: 'Impostor',
    powerDescription: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powerCost: 2,
    oncePerScene: true,
    modifiers: [],
  },
  {
    id: 'universitario',
    name: 'Universitário',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skills: ['atualidades', 'investigacao'],
    powerName: 'Dedicação',
    powerDescription: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powerCost: 0,
    modifiers: [],
    extraPeOddNex: true,
    extraPeLimit: 1,
  },
  {
    id: 'vitima',
    name: 'Vítima',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skills: ['reflexos', 'vontade'],
    powerName: 'Cicatrizes Psicológicas',
    powerDescription: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powerCost: 0,
    modifiers: [{ id: 'orig-vit', targetType: 'vital_max', targetKey: 'san', value: 1, scaleWithLevel: true }],
  },
  // --- SUPLEMENTO: SOBREVIVENDO AO HORROR v1.3 (20 Novas Origens, p. 8-14) ---
  {
    id: 'amigo_animais',
    name: 'Amigo dos Animais',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    skills: ['adestramento', 'percepcao'],
    powerName: 'Companheiro Animal',
    powerDescription: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    powerCost: 0,
    requiresOriginSkillBonusChoice: 'any',
    modifiers: [],
  },
  {
    id: 'astronauta',
    name: 'Astronauta',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    skills: ['ciencias', 'fortitude'],
    powerName: 'Acostumado ao Extremo',
    powerDescription: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    powerCost: 1,
    requiresManualActivation: true,
    modifiers: [],
  },
  {
    id: 'chef_outro_lado',
    name: 'Chef do Outro Lado',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    skills: ['ocultismo', 'profissao'],
    powerName: 'Fome do Outro Lado',
    powerDescription: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    powerCost: 0,
    modifiers: [],
  },
  {
    id: 'colegial',
    name: 'Colegial',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    skills: ['atualidades', 'tecnologia'],
    powerName: 'Poder da Amizade',
    powerDescription: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    powerCost: 0,
    modifiers: [{ id: 'orig-colegial-all', targetType: 'skill_bonus', targetKey: 'all', value: 2 }],
  },
  {
    id: 'cosplayer',
    name: 'Cosplayer',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    skills: ['artes', 'vontade'],
    powerName: 'Não É Fantasia, É Cosplay!',
    powerDescription: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    powerCost: 0,
    requiresManualActivation: true,
    modifiers: [{ id: 'orig-cosplayer-all', targetType: 'skill_bonus', targetKey: 'all', value: 2 }],
  },
  {
    id: 'diplomata',
    name: 'Diplomata',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    skills: ['atualidades', 'diplomacia'],
    powerName: 'Conexões',
    powerDescription: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    powerCost: 0,
    modifiers: [{ id: 'orig-diplomata-dip', targetType: 'skill_bonus', targetKey: 'diplomacia', value: 2 }],
  },
  {
    id: 'explorador',
    name: 'Explorador',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    skills: ['fortitude', 'sobrevivencia'],
    powerName: 'Manual do Sobrevivente',
    powerDescription: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    powerCost: 2,
    modifiers: [
      { id: 'orig-exp-for', targetType: 'skill_bonus', targetKey: 'fortitude', value: 5 },
      { id: 'orig-exp-ref', targetType: 'skill_bonus', targetKey: 'reflexos', value: 5 },
      { id: 'orig-exp-von', targetType: 'skill_bonus', targetKey: 'vontade', value: 5 },
    ],
  },
  {
    id: 'experimento',
    name: 'Experimento',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    skills: ['atletismo', 'fortitude'],
    powerName: 'Mutação',
    powerDescription: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    powerCost: 0,
    requiresOriginSkillBonusChoice: 'physical',
    modifiers: [{ id: 'orig-experimento-dip-pen', targetType: 'skill_dice', targetKey: 'diplomacia', value: -1 }],
  },
  {
    id: 'fanatico_criaturas',
    name: 'Fanático por Criaturas',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    skills: ['investigacao', 'ocultismo'],
    powerName: 'Conhecimento Oculto',
    powerDescription: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    powerCost: 0,
    modifiers: [],
  },
  {
    id: 'fotografo',
    name: 'Fotógrafo',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    skills: ['artes', 'percepcao'],
    powerName: 'Através da Lente',
    powerDescription: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    powerCost: 2,
    modifiers: [
      { id: 'orig-foto-inv', targetType: 'skill_bonus', targetKey: 'investigacao', value: 5 },
      { id: 'orig-foto-per', targetType: 'skill_bonus', targetKey: 'percepcao', value: 5 },
    ],
  },
  {
    id: 'inventor_paranormal',
    name: 'Inventor Paranormal',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    skills: ['profissao', 'vontade'],
    powerName: 'Invenção Paranormal',
    powerDescription: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    powerCost: 0,
    grantsParanormalInvention: true,
    modifiers: [],
  },
  {
    id: 'jovem_mistico',
    name: 'Jovem Místico',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    skills: ['ocultismo', 'religiao'],
    powerName: 'A Culpa é das Estrelas',
    powerDescription: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    powerCost: 1,
    oncePerScene: true,
    requiresManualActivation: true,
    modifiers: [],
  },
  {
    id: 'legista_noturno',
    name: 'Legista do Turno da Noite',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    skills: ['ciencias', 'medicina'],
    powerName: 'Luto Habitual',
    powerDescription: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    powerCost: 2,
    modifiers: [{ id: 'orig-legista-med', targetType: 'skill_bonus', targetKey: 'medicina', value: 5 }],
  },
  {
    id: 'mateiro',
    name: 'Mateiro',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    skills: ['percepcao', 'sobrevivencia'],
    powerName: 'Mapa Celeste',
    powerDescription: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    powerCost: 2,
    requiresManualActivation: true,
    modifiers: [],
  },
  {
    id: 'mergulhador',
    name: 'Mergulhador',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    skills: ['atletismo', 'fortitude'],
    powerName: 'Fôlego de Nadador',
    powerDescription: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    powerCost: 0,
    modifiers: [{ id: 'orig-mergulhador-pv', targetType: 'vital_max', targetKey: 'pv', value: 5 }],
  },
  {
    id: 'motorista',
    name: 'Motorista',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    skills: ['pilotagem', 'reflexos'],
    powerName: 'Mãos no Volante',
    powerDescription: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    powerCost: 2,
    modifiers: [
      { id: 'orig-mot-pil', targetType: 'skill_bonus', targetKey: 'pilotagem', value: 5 },
      { id: 'orig-mot-for', targetType: 'skill_bonus', targetKey: 'fortitude', value: 5 },
      { id: 'orig-mot-ref', targetType: 'skill_bonus', targetKey: 'reflexos', value: 5 },
      { id: 'orig-mot-von', targetType: 'skill_bonus', targetKey: 'vontade', value: 5 },
    ],
  },
  {
    id: 'nerd_entusiasta',
    name: 'Nerd Entusiasta',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    skills: ['ciencias', 'tecnologia'],
    powerName: 'O Inteligentão',
    powerDescription: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    powerCost: 0,
    modifiers: [],
  },
  {
    id: 'profetizado',
    name: 'Profetizado',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    skills: ['vontade'],
    freeSkillChoices: 1,
    powerName: 'Luta ou Fuga',
    powerDescription: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    powerCost: 0,
    modifiers: [{ id: 'orig-profetizado-von', targetType: 'skill_bonus', targetKey: 'vontade', value: 2 }],
  },
  {
    id: 'psicologo',
    name: 'Psicólogo',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    skills: ['intuicao', 'profissao'],
    powerName: 'Terapia',
    powerDescription: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    powerCost: 2,
    requiresManualActivation: true,
    modifiers: [],
  },
  {
    id: 'reporter_investigativo',
    name: 'Repórter Investigativo',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    skills: ['atualidades', 'investigacao'],
    powerName: 'Encontrar a Verdade',
    powerDescription: 'Consulte o suplemento Sobrevivendo ao Horror para a descrição completa.',
    powerCost: 2,
    modifiers: [{ id: 'orig-rep-inv', targetType: 'skill_bonus', targetKey: 'investigacao', value: 5 }],
  },
];

// ============================================================================
// 3. ORDEM PARANORMAL RPG v1.3 — AS 4 CLASSES OFICIAIS (p. 24-35, 171-172)
// ============================================================================
export interface OrdemClassDefinition {
  id: 'combatente' | 'especialista' | 'ocultista' | 'mundano';
  name: string;
  sourceId?: string;
  subtitle: string;
  description: string;
  initialNex: number;
  attributePoints: number;
  basePv: number;
  pvPerNex: number;
  basePe: number;
  pePerNex: number;
  baseSan: number;
  sanPerNex: number;
  fixedSkills: string[];
  choiceSkillGroups: string[][];
  freeSkillsBase: number;
  trainingUpgradeBase: number; // Em NEX 35% e 70%, sobe grau de (base + INT) perícias
  proficiencies: string[];
  initialAbilities: Omit<CharacterAbility, 'id'>[];
}

export const ORDEM_CLASSES: OrdemClassDefinition[] = [
  {
    id: 'combatente',
    name: 'Combatente',
    subtitle: 'Linha de frente e domínio de armamento tático',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    initialNex: 5,
    attributePoints: 4,
    basePv: 20,
    pvPerNex: 4,
    basePe: 2,
    pePerNex: 2,
    baseSan: 12,
    sanPerNex: 3,
    fixedSkills: [],
    choiceSkillGroups: [
      ['luta', 'pontaria'],
      ['fortitude', 'reflexos'],
    ],
    freeSkillsBase: 1,
    trainingUpgradeBase: 2,
    proficiencies: ['Armas simples', 'Armas táticas', 'Proteções leves'],
    initialAbilities: [
      {
        name: 'Ataque Especial',
        category: 'classe',
        cost: 2,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: false,
        modifiers: [],
      },
    ],
  },
  {
    id: 'especialista',
    name: 'Especialista',
    subtitle: 'Perícia técnica, investigação e versatilidade',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    initialNex: 5,
    attributePoints: 4,
    basePv: 16,
    pvPerNex: 3,
    basePe: 3,
    pePerNex: 3,
    baseSan: 16,
    sanPerNex: 4,
    fixedSkills: [],
    choiceSkillGroups: [],
    freeSkillsBase: 7,
    trainingUpgradeBase: 5,
    proficiencies: ['Armas simples', 'Proteções leves'],
    initialAbilities: [
      {
        name: 'Eclético',
        category: 'classe',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        name: 'Perito',
        category: 'classe',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'ocultista',
    name: 'Ocultista',
    subtitle: 'Estudioso do Outro Lado e conjurador de rituais',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    initialNex: 5,
    attributePoints: 4,
    basePv: 12,
    pvPerNex: 2,
    basePe: 4,
    pePerNex: 4,
    baseSan: 20,
    sanPerNex: 5,
    fixedSkills: ['ocultismo', 'vontade'],
    choiceSkillGroups: [],
    freeSkillsBase: 3,
    trainingUpgradeBase: 3,
    proficiencies: ['Armas simples'],
    initialAbilities: [
      {
        name: 'Escolhido pelo Outro Lado (1º Círculo)',
        category: 'classe',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'mundano',
    name: 'Mundano (NEX 0%)',
    subtitle: 'Civil sobrevivente antes do treinamento da Ordem',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    initialNex: 0,
    attributePoints: 3,
    basePv: 8,
    pvPerNex: 0,
    basePe: 1,
    pePerNex: 0,
    baseSan: 8,
    sanPerNex: 0,
    fixedSkills: [],
    choiceSkillGroups: [],
    freeSkillsBase: 1,
    trainingUpgradeBase: 0,
    proficiencies: ['Armas simples'],
    initialAbilities: [
      {
        name: 'Empenho',
        category: 'classe',
        cost: 1,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: false,
        modifiers: [{ id: 'cls-mund-emp', targetType: 'skill_bonus', targetKey: 'all', value: 2 }],
      },
    ],
  },
];

// ============================================================================
// 4. ORDEM PARANORMAL RPG v1.3 — AS 15 TRILHAS DE CLASSE (p. 26-35)
// ============================================================================
export interface OrdemTrailPower {
  nex: 10 | 40 | 65 | 99;
  name: string;
  cost: number;
  description: string;
  isActive?: boolean;
  /** Treina a perícia ou dá +2 se já for treinado (aplicado com applyGeneralPowerSkillGrants) */
  grantsSkillTraining?: string;
  /** Bônus quando a perícia já é treinada (padrão 2; 0 = nenhum) */
  trainingBonus?: number;
  modifiers: RuleModifier[];
}

export interface OrdemTrailDefinition {
  id: string;
  classId: 'combatente' | 'especialista' | 'ocultista';
  name: string;
  sourceId?: string;
  description: string;
  requirementText?: string;
  requiredSkill?: string;
  powers: OrdemTrailPower[];
}

export const ORDEM_TRAILS: OrdemTrailDefinition[] = [
  // --- COMBATENTE (5 Trilhas) ---
  {
    id: 'aniquilador',
    classId: 'combatente',
    name: 'Aniquilador',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powers: [
      {
        nex: 10,
        name: 'A Favorita (Aniquilador 10%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Técnica Secreta (Aniquilador 40%)',
        cost: 2,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Técnica Sublime (Aniquilador 65%)',
        cost: 2,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Máquina de Matar (Aniquilador 99%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'comandante_campo',
    classId: 'combatente',
    name: 'Comandante de Campo',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powers: [
      {
        nex: 10,
        name: 'Inspirar Confiança (Comandante 10%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Estrategista (Comandante 40%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Brecha na Guarda (Comandante 65%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Oficial Comandante (Comandante 99%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'guerreiro',
    classId: 'combatente',
    name: 'Guerreiro',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powers: [
      {
        nex: 10,
        name: 'Técnica Letal (Guerreiro 10%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Revidar (Guerreiro 40%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Força Opressora (Guerreiro 65%)',
        cost: 1,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Potência Máxima (Guerreiro 99%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'operacoes_especiais',
    classId: 'combatente',
    name: 'Operações Especiais',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powers: [
      {
        nex: 10,
        name: 'Iniciativa Aprimorada (Op. Especiais 10%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [{ id: 'tr-opesp-10', targetType: 'skill_bonus', targetKey: 'iniciativa', value: 5 }],
      },
      {
        nex: 40,
        name: 'Ataque Extra (Op. Especiais 40%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Surto de Adrenalina (Op. Especiais 65%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Sempre Alerta (Op. Especiais 99%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'tropa_choque',
    classId: 'combatente',
    name: 'Tropa de Choque',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powers: [
      {
        nex: 10,
        name: 'Casca Grossa (Tropa de Choque 10%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [{ id: 'tr-choq-10', targetType: 'vital_max', targetKey: 'pv', value: 1, scaleWithLevel: true }],
      },
      {
        nex: 40,
        name: 'Cai Dentro (Tropa de Choque 40%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Duro de Matar (Tropa de Choque 65%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Inquebrável (Tropa de Choque 99%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: false,
        modifiers: [],
      },
    ],
  },

  // --- ESPECIALISTA (5 Trilhas) ---
  {
    id: 'atirador_elite',
    classId: 'especialista',
    name: 'Atirador de Elite',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powers: [
      {
        nex: 10,
        name: 'Mira de Elite (Atirador de Elite 10%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Disparo Letal (Atirador de Elite 40%)',
        cost: 1,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Disparo Impactante (Atirador de Elite 65%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Atirar para Matar (Atirador de Elite 99%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'infiltrador',
    classId: 'especialista',
    name: 'Infiltrador',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powers: [
      {
        nex: 10,
        name: 'Ataque Furtivo (Infiltrador 10%)',
        cost: 1,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Gatuno (Infiltrador 40%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [
          { id: 'tr-inf-40a', targetType: 'skill_bonus', targetKey: 'atletismo', value: 5 },
          { id: 'tr-inf-40b', targetType: 'skill_bonus', targetKey: 'crime', value: 5 },
        ],
      },
      {
        nex: 65,
        name: 'Assassinar (Infiltrador 65%)',
        cost: 3,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Sombra Fugaz (Infiltrador 99%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'medico_campo',
    classId: 'especialista',
    name: 'Médico de Campo',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    requirementText: 'Treinado em Medicina (requer Kit de Medicina)',
    requiredSkill: 'medicina',
    powers: [
      {
        nex: 10,
        name: 'Paramédico (Médico de Campo 10%)',
        cost: 2,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Equipe de Trauma (Médico de Campo 40%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Resgate (Médico de Campo 65%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Reanimação (Médico de Campo 99%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'negociador',
    classId: 'especialista',
    name: 'Negociador',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powers: [
      {
        nex: 10,
        name: 'Eloquência (Negociador 10%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Discurso Motivador (Negociador 40%)',
        cost: 4,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: false,
        modifiers: [{ id: 'tr-neg-40', targetType: 'skill_dice', targetKey: 'all', value: 1 }],
      },
      {
        nex: 65,
        name: 'Eu Conheço um Cara (Negociador 65%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Truque de Mestre (Negociador 99%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'tecnico',
    classId: 'especialista',
    name: 'Técnico',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powers: [
      {
        nex: 10,
        name: 'Inventário Otimizado (Técnico 10%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Remendão (Técnico 40%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Improvisar (Técnico 65%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Preparado para Tudo (Técnico 99%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
    ],
  },

  // --- OCULTISTA (5 Trilhas) ---
  {
    id: 'conduite',
    classId: 'ocultista',
    name: 'Conduíte',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powers: [
      {
        nex: 10,
        name: 'Ampliar Ritual (Conduíte 10%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Acelerar Ritual (Conduíte 40%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Anular Ritual (Conduíte 65%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Canalizar o Medo (Conduíte 99%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'flagelador',
    classId: 'ocultista',
    name: 'Flagelador',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powers: [
      {
        nex: 10,
        name: 'Poder do Flagelo (Flagelador 10%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Abraçar a Dor (Flagelador 40%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Absorver Agonia (Flagelador 65%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Medo Tangível (Flagelador 99%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'graduado',
    classId: 'ocultista',
    name: 'Graduado',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powers: [
      {
        nex: 10,
        name: 'Saber Ampliado (Graduado 10%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Grimório Ritualístico (Graduado 40%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Rituais Eficientes (Graduado 65%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Conhecendo o Medo (Graduado 99%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'intuitivo',
    classId: 'ocultista',
    name: 'Intuitivo',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powers: [
      {
        nex: 10,
        name: 'Mente Sã (Intuitivo 10%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [
          { id: 'tr-int-10-fort', targetType: 'skill_bonus', targetKey: 'fortitude', value: 5 },
          { id: 'tr-int-10-ref', targetType: 'skill_bonus', targetKey: 'reflexos', value: 5 },
          { id: 'tr-int-10-von', targetType: 'skill_bonus', targetKey: 'vontade', value: 5 },
        ],
      },
      {
        nex: 40,
        name: 'Presença Poderosa (Intuitivo 40%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Inabalável (Intuitivo 65%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Presença do Medo (Intuitivo 99%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'lamina_paranormal',
    classId: 'ocultista',
    name: 'Lâmina Paranormal',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    powers: [
      {
        nex: 10,
        name: 'Lâmina Maldita (Lâmina Paranormal 10%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Gladiador Paranormal (Lâmina Paranormal 40%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Conjuração Marcial (Lâmina Paranormal 65%)',
        cost: 2,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Lâmina do Medo (Lâmina Paranormal 99%)',
        cost: 0,
        description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  // --- SOBREVIVENDO AO HORROR v1.3: 9 novas trilhas (p. 15-28) ---
  {
    id: 'agente_secreto',
    classId: 'combatente',
    name: 'Agente Secreto',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
    powers: [
      {
        nex: 10,
        name: 'Carteirada (Agente Secreto 10%)',
        cost: 0,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'O Sorriso (Agente Secreto 40%)',
        cost: 2,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [
          { id: 'tr-agsec-40-dip', targetType: 'skill_bonus', targetKey: 'diplomacia', value: 2 },
          { id: 'tr-agsec-40-eng', targetType: 'skill_bonus', targetKey: 'enganacao', value: 2 },
        ],
      },
      {
        nex: 65,
        name: 'Método Investigativo (Agente Secreto 65%)',
        cost: 2,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Multifacetado (Agente Secreto 99%)',
        cost: 0,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'cacador',
    classId: 'combatente',
    name: 'Caçador',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
    powers: [
      {
        nex: 10,
        name: 'Rastrear o Paranormal (Caçador 10%)',
        cost: 0,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        grantsSkillTraining: 'sobrevivencia',
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Estudar Fraquezas (Caçador 40%)',
        cost: 0,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Atacar das Sombras (Caçador 65%)',
        cost: 0,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Estudar a Presa (Caçador 99%)',
        cost: 0,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'monstruoso',
    classId: 'combatente',
    name: 'Monstruoso',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
    powers: [
      {
        nex: 10,
        name: 'Ser Amaldiçoado (Monstruoso 10%)',
        cost: 0,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        grantsSkillTraining: 'ocultismo',
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Ser Macabro (Monstruoso 40%)',
        cost: 0,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Ser Assustador (Monstruoso 65%)',
        cost: 0,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        // Presença reduzida permanentemente em 1
        modifiers: [{ id: 'tr-monstro-65-pre', targetType: 'attribute', targetKey: 'pre', value: -1 }],
      },
      {
        nex: 99,
        name: 'Ser Aterrorizante (Monstruoso 99%)',
        cost: 0,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'bibliotecario',
    classId: 'especialista',
    name: 'Bibliotecário',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
    powers: [
      {
        nex: 10,
        name: 'Conhecimento Prático (Bibliotecário 10%)',
        cost: 2,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Leitor Contumaz (Bibliotecário 40%)',
        cost: 0,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Rato de Biblioteca (Bibliotecário 65%)',
        cost: 0,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'A Força do Saber (Bibliotecário 99%)',
        cost: 0,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [
          { id: 'tr-biblio-99-int', targetType: 'attribute', targetKey: 'int', value: 1 },
        ],
      },
    ],
  },
  {
    id: 'perseverante',
    classId: 'especialista',
    name: 'Perseverante',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
    powers: [
      {
        nex: 10,
        name: 'Soluções Improvisadas (Perseverante 10%)',
        cost: 2,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Fuga Obstinada (Perseverante 40%)',
        cost: 0,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Determinação Inquestionável (Perseverante 65%)',
        cost: 5,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Só Mais um Passo... (Perseverante 99%)',
        cost: 5,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'muambeiro',
    classId: 'especialista',
    name: 'Muambeiro',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
    powers: [
      {
        nex: 10,
        name: 'Mascate (Muambeiro 10%)',
        cost: 0,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        grantsSkillTraining: 'profissao',
        trainingBonus: 0,
        modifiers: [
          { id: 'tr-muamb-10-carga', targetType: 'load_limit', targetKey: 'load', value: 5 },
        ],
      },
      {
        nex: 40,
        name: 'Fabricação Própria (Muambeiro 40%)',
        cost: 0,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Laboratório de Campo (Muambeiro 65%)',
        cost: 0,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        grantsSkillTraining: 'profissao',
        trainingBonus: 5,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Achado Conveniente (Muambeiro 99%)',
        cost: 5,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'exorcista',
    classId: 'ocultista',
    name: 'Exorcista',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
    powers: [
      {
        nex: 10,
        name: 'Revelação do Mal (Exorcista 10%)',
        cost: 0,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        grantsSkillTraining: 'religiao',
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Poder da Fé (Exorcista 40%)',
        cost: 2,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Parareligiosidade (Exorcista 65%)',
        cost: 2,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Chagas da Resistência (Exorcista 99%)',
        cost: 0,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'possuido',
    classId: 'ocultista',
    name: 'Possuído',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
    powers: [
      {
        nex: 10,
        name: 'Poder Não Desejado (Possuído 10%)',
        cost: 0,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'As Sombras Dentro de Mim (Possuído 40%)',
        cost: 2,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Ele Me Ensina (Possuído 65%)',
        cost: 0,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Tornamo-nos Um (Possuído 99%)',
        cost: 6,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'parapsicologo',
    classId: 'ocultista',
    name: 'Parapsicólogo',
    sourceId: 'sobrevivendo-ao-horror',
    description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
    requirementText: 'Treinado em Profissão (psicólogo)',
    requiredSkill: 'profissao',
    powers: [
      {
        nex: 10,
        name: 'Terapia (Parapsicólogo 10%)',
        cost: 2,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Palavras-chave (Parapsicólogo 40%)',
        cost: 0,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Reprogramação Mental (Parapsicólogo 65%)',
        cost: 5,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'A Sanidade Está Lá Fora (Parapsicólogo 99%)',
        cost: 5,
        description: 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
];

// ============================================================================
// 5. ORDEM PARANORMAL RPG v1.3 — TABELA DE PATENTES (TABELA 3.1, p. 52)
// ============================================================================
export interface OrdemPatentDefinition {
  id: string;
  name: string;
  minPrestige: number;
  creditLimit: 'Baixo' | 'Médio' | 'Alto' | 'Ilimitado';
  categoryLimits: {
    1: number;
    2: number;
    3: number;
    4: number;
  };
}

export const ORDEM_PATENTS: OrdemPatentDefinition[] = [
  { id: 'recruta', name: 'Recruta', minPrestige: 0, creditLimit: 'Baixo', categoryLimits: { 1: 2, 2: 0, 3: 0, 4: 0 } },
  { id: 'operador', name: 'Operador', minPrestige: 20, creditLimit: 'Médio', categoryLimits: { 1: 3, 2: 1, 3: 0, 4: 0 } },
  { id: 'agente_especial', name: 'Agente Especial', minPrestige: 50, creditLimit: 'Médio', categoryLimits: { 1: 3, 2: 2, 3: 1, 4: 0 } },
  { id: 'oficial_operacoes', name: 'Oficial de Operações', minPrestige: 100, creditLimit: 'Alto', categoryLimits: { 1: 3, 2: 3, 3: 2, 4: 1 } },
  { id: 'agente_elite', name: 'Agente de Elite', minPrestige: 200, creditLimit: 'Ilimitado', categoryLimits: { 1: 3, 2: 3, 3: 3, 4: 2 } },
];

// ============================================================================
// 6. TABELA DE PROGRESSÃO DE NEX E MARCOS (TABELAS 1.2, 1.3, 1.4, 1.5)
// ============================================================================
export interface OrdemNexMilestone {
  nex: number;
  peLimit: number;
  grantsTrailChoice?: boolean;      // 10%
  grantsTrailPower?: 10 | 40 | 65 | 99;
  grantsClassPower?: boolean;       // 15, 30, 45, 60, 75, 90
  grantsAttributeIncrease?: boolean; // 20, 50, 80, 95
  grantsTrainingUpgrade?: boolean;  // 35, 70
  grantsVersatility?: boolean;      // 50
  grantsAffinity?: boolean;         // 50
  unlocksCircle?: 1 | 2 | 3 | 4;    // 5->1, 25->2, 55->3, 85->4
  summary: string;
}

export const ORDEM_NEX_PROGRESSION: OrdemNexMilestone[] = [
  { nex: 0, peLimit: 1, summary: 'Mundano (Civil sem exposição paranormal)' },
  { nex: 5, peLimit: 1, unlocksCircle: 1, summary: 'Recruta da Ordem · Habilidades iniciais da classe' },
  { nex: 10, peLimit: 2, grantsTrailChoice: true, grantsTrailPower: 10, summary: 'Escolha de Trilha + 1º Poder da Trilha (10%)' },
  { nex: 15, peLimit: 3, grantsClassPower: true, summary: 'Poder de Classe (ou Transcender)' },
  { nex: 20, peLimit: 4, grantsAttributeIncrease: true, summary: 'Aumento de Atributo (+1, máx 5)' },
  { nex: 25, peLimit: 5, unlocksCircle: 2, summary: 'Ataque Especial (3 PE, +10) / Perito (3 PE, +1d8) / 2º Círculo de Rituais' },
  { nex: 30, peLimit: 6, grantsClassPower: true, summary: 'Poder de Classe (ou Transcender)' },
  { nex: 35, peLimit: 7, grantsTrainingUpgrade: true, summary: 'Grau de Treinamento (Veterano +10 em Perícias)' },
  { nex: 40, peLimit: 8, grantsTrailPower: 40, summary: '2º Poder da Trilha (40%) + Engenhosidade (Especialista)' },
  { nex: 45, peLimit: 9, grantsClassPower: true, summary: 'Poder de Classe (ou Transcender)' },
  { nex: 50, peLimit: 10, grantsAttributeIncrease: true, grantsVersatility: true, grantsAffinity: true, summary: 'Aumento de Atributo (+1) + Versatilidade + Afinidade Elemental' },
  { nex: 55, peLimit: 11, unlocksCircle: 3, summary: 'Ataque Especial (4 PE, +15) / Perito (4 PE, +1d10) / 3º Círculo de Rituais' },
  { nex: 60, peLimit: 12, grantsClassPower: true, summary: 'Poder de Classe (ou Transcender)' },
  { nex: 65, peLimit: 13, grantsTrailPower: 65, summary: '3º Poder da Trilha (65%)' },
  { nex: 70, peLimit: 14, grantsTrainingUpgrade: true, summary: 'Grau de Treinamento (Expert +15 em Perícias)' },
  { nex: 75, peLimit: 15, grantsClassPower: true, summary: 'Poder de Classe (ou Transcender) + Engenhosidade Expert (Especialista)' },
  { nex: 80, peLimit: 16, grantsAttributeIncrease: true, summary: 'Aumento de Atributo (+1, máx 5)' },
  { nex: 85, peLimit: 17, unlocksCircle: 4, summary: 'Ataque Especial (5 PE, +20) / Perito (5 PE, +1d12) / 4º Círculo de Rituais' },
  { nex: 90, peLimit: 18, grantsClassPower: true, summary: 'Poder de Classe (ou Transcender)' },
  { nex: 95, peLimit: 19, grantsAttributeIncrease: true, summary: 'Aumento de Atributo (+1, máx 5)' },
  { nex: 99, peLimit: 20, grantsTrailPower: 99, summary: '4º Poder Supremo da Trilha (99%)' },
];

// ============================================================================
// 7. TABELA 5.1: EFEITOS DE INSANIDADE (1d20, p. 113) & INTERLÚDIO (p. 92-93)
// ============================================================================
export const ORDEM_INSANITY_EFFECTS: string[] = [
  '1. Efeito de Insanidade #1 — consulte a Tabela 5.1 do Livro de Regras v1.3.',
  '2. Efeito de Insanidade #2 — consulte a Tabela 5.1 do Livro de Regras v1.3.',
  '3. Efeito de Insanidade #3 — consulte a Tabela 5.1 do Livro de Regras v1.3.',
  '4. Efeito de Insanidade #4 — consulte a Tabela 5.1 do Livro de Regras v1.3.',
  '5. Efeito de Insanidade #5 — consulte a Tabela 5.1 do Livro de Regras v1.3.',
  '6. Efeito de Insanidade #6 — consulte a Tabela 5.1 do Livro de Regras v1.3.',
  '7. Efeito de Insanidade #7 — consulte a Tabela 5.1 do Livro de Regras v1.3.',
  '8. Efeito de Insanidade #8 — consulte a Tabela 5.1 do Livro de Regras v1.3.',
  '9. Efeito de Insanidade #9 — consulte a Tabela 5.1 do Livro de Regras v1.3.',
  '10. Efeito de Insanidade #10 — consulte a Tabela 5.1 do Livro de Regras v1.3.',
  '11. Efeito de Insanidade #11 — consulte a Tabela 5.1 do Livro de Regras v1.3.',
  '12. Efeito de Insanidade #12 — consulte a Tabela 5.1 do Livro de Regras v1.3.',
  '13. Efeito de Insanidade #13 — consulte a Tabela 5.1 do Livro de Regras v1.3.',
  '14. Efeito de Insanidade #14 — consulte a Tabela 5.1 do Livro de Regras v1.3.',
  '15. Efeito de Insanidade #15 — consulte a Tabela 5.1 do Livro de Regras v1.3.',
  '16. Efeito de Insanidade #16 — consulte a Tabela 5.1 do Livro de Regras v1.3.',
  '17. Efeito de Insanidade #17 — consulte a Tabela 5.1 do Livro de Regras v1.3.',
  '18. Efeito de Insanidade #18 — consulte a Tabela 5.1 do Livro de Regras v1.3.',
  '19. Efeito de Insanidade #19 — consulte a Tabela 5.1 do Livro de Regras v1.3.',
  '20. Efeito de Insanidade #20 — consulte a Tabela 5.1 do Livro de Regras v1.3.',
];

export interface OrdemInterludeDish {
  id: 'favorito' | 'nutritivo' | 'energetico' | 'rapido';
  name: string;
  description: string;
}

export const ORDEM_INTERLUDE_DISHES: OrdemInterludeDish[] = [
  { id: 'favorito', name: '🍲 Prato Favorito', description: 'Consulte o Livro de Regras v1.3 (Cena de Interlúdio) para o efeito completo.' },
  { id: 'nutritivo', name: '🥩 Prato Nutritivo', description: 'Consulte o Livro de Regras v1.3 (Cena de Interlúdio) para o efeito completo.' },
  { id: 'energetico', name: '☕ Prato Energético', description: 'Consulte o Livro de Regras v1.3 (Cena de Interlúdio) para o efeito completo.' },
  { id: 'rapido', name: '🥪 Prato Rápido', description: 'Consulte o Livro de Regras v1.3 (Cena de Interlúdio) para o efeito completo.' },
];

// ============================================================================
// 8. TORMENTA 20 (EDIÇÃO JOGO DO ANO) — DADOS BASE PARA O WIZARD
// ============================================================================
export interface T20RaceDefinition {
  id: string;
  name: string;
  description: string;
  attributeBonuses: Partial<T20Attributes>;
  freeAttributeChoices?: number; // Humano/Lefou/Osteon (+1 em 3 atributos diferentes)
}

export const T20_RACES: T20RaceDefinition[] = [
  { id: 'humano', name: 'Humano', description: 'Versáteis e determinados (+1 em três atributos diferentes).', attributeBonuses: {}, freeAttributeChoices: 3 },
  { id: 'anao', name: 'Anão', description: 'Resilientes e tradicionais (+2 CON, +1 SAB, -1 DES).', attributeBonuses: { constituicao: 2, sabedoria: 1, destreza: -1 } },
  { id: 'dahllan', name: 'Dahllan', description: 'Meio-dríades ligadas à natureza (+2 SAB, +1 DES, -1 INT).', attributeBonuses: { sabedoria: 2, destreza: 1, inteligencia: -1 } },
  { id: 'elfo', name: 'Elfo', description: 'Graciosos e mágicos (+2 INT, +1 DES, -1 CON).', attributeBonuses: { inteligencia: 2, destreza: 1, constituicao: -1 } },
  { id: 'goblin', name: 'Goblin', description: 'Engenhosos e esguios (+2 DES, +1 INT, -1 CAR).', attributeBonuses: { destreza: 2, inteligencia: 1, carisma: -1 } },
  { id: 'lefou', name: 'Lefou', description: 'Tocados pela Tormenta (+1 em três atributos, -1 CAR).', attributeBonuses: { carisma: -1 }, freeAttributeChoices: 3 },
  { id: 'minotauro', name: 'Minotauro', description: 'Guerreiros fortes e honrados (+2 FOR, +1 CON, -1 SAB).', attributeBonuses: { forca: 2, constituicao: 1, sabedoria: -1 } },
  { id: 'qareen', name: 'Qareen', description: 'Meio-gênios carismáticos e místicos (+2 CAR, +1 INT, -1 SAB).', attributeBonuses: { carisma: 2, inteligencia: 1, sabedoria: -1 } },
  { id: 'golem', name: 'Golem', description: 'Construtos vivos despertos (+2 FOR, +1 CON, -1 CAR).', attributeBonuses: { forca: 2, constituicao: 1, carisma: -1 } },
  { id: 'hynne', name: 'Hynne', description: 'Pequenos, ágeis e sortudos (+2 DES, +1 CAR, -1 FOR).', attributeBonuses: { destreza: 2, carisma: 1, forca: -1 } },
  { id: 'kliren', name: 'Kliren', description: 'Inventores brilhantes (+2 INT, +1 CAR, -1 FOR).', attributeBonuses: { inteligencia: 2, carisma: 1, forca: -1 } },
  { id: 'medusa', name: 'Medusa', description: 'Olhar petrificante e veneno (+2 DES, +1 CAR).', attributeBonuses: { destreza: 2, carisma: 1 } },
  { id: 'osteon', name: 'Osteon', description: 'Esqueletos sencientes (+1 em três atributos, -1 CON).', attributeBonuses: { constituicao: -1 }, freeAttributeChoices: 3 },
  { id: 'sereia', name: 'Sereia / Tritão', description: 'Habitantes dos mares (+1 em três atributos).', attributeBonuses: {}, freeAttributeChoices: 3 },
  { id: 'silfide', name: 'Sílfide', description: 'Fadas minúsculas e encantadoras (+2 CAR, +1 DES, -2 FOR).', attributeBonuses: { carisma: 2, destreza: 1, forca: -2 } },
  { id: 'suraggel', name: 'Suraggel', description: 'Herança planar celestial ou abissal (+2 SAB ou DES, +1 CAR ou INT).', attributeBonuses: { sabedoria: 2, carisma: 1 } },
  { id: 'trog', name: 'Trog', description: 'Homens-lagarto selvagens (+2 CON, +1 FOR, -1 INT).', attributeBonuses: { constituicao: 2, forca: 1, inteligencia: -1 } },
];

export interface T20ClassDefinition {
  id: string;
  name: string;
  basePv: number;
  pvPerLevel: number;
  pmPerLevel: number;
  fixedSkills: string[];
  freeSkillsBase: number;
  description: string;
}

export const T20_CLASSES: T20ClassDefinition[] = [
  { id: 'Arcanista', name: 'Arcanista', basePv: 8, pvPerLevel: 2, pmPerLevel: 6, fixedSkills: ['misticismo', 'vontade'], freeSkillsBase: 2, description: 'Mestre das artes arcanas.' },
  { id: 'Bárbaro', name: 'Bárbaro', basePv: 24, pvPerLevel: 6, pmPerLevel: 3, fixedSkills: ['fortitude', 'luta'], freeSkillsBase: 4, description: 'Combatente movido pela fúria.' },
  { id: 'Bardo', name: 'Bardo', basePv: 12, pvPerLevel: 3, pmPerLevel: 4, fixedSkills: ['atuacao', 'reflexos'], freeSkillsBase: 6, description: 'Artista versátil e inspirador.' },
  { id: 'Bucaneiro', name: 'Bucaneiro', basePv: 16, pvPerLevel: 4, pmPerLevel: 3, fixedSkills: ['luta', 'reflexos'], freeSkillsBase: 4, description: 'Aventureiro audacioso e duelista.' },
  { id: 'Caçador', name: 'Caçador', basePv: 16, pvPerLevel: 4, pmPerLevel: 4, fixedSkills: ['luta', 'sobrevivencia'], freeSkillsBase: 6, description: 'Rastreador e predador implacável.' },
  { id: 'Cavaleiro', name: 'Cavaleiro', basePv: 20, pvPerLevel: 5, pmPerLevel: 3, fixedSkills: ['fortitude', 'luta'], freeSkillsBase: 2, description: 'Baluarte de honra e defesa pesada.' },
  { id: 'Clérigo', name: 'Clérigo', basePv: 16, pvPerLevel: 4, pmPerLevel: 5, fixedSkills: ['religiao', 'vontade'], freeSkillsBase: 2, description: 'Canalizador do poder divino.' },
  { id: 'Druida', name: 'Druida', basePv: 16, pvPerLevel: 4, pmPerLevel: 4, fixedSkills: ['sobrevivencia', 'vontade'], freeSkillsBase: 4, description: 'Guardião da natureza e formas selvagens.' },
  { id: 'Guerreiro', name: 'Guerreiro', basePv: 20, pvPerLevel: 5, pmPerLevel: 3, fixedSkills: ['luta', 'fortitude'], freeSkillsBase: 2, description: 'Mestre em técnicas de combate e armas.' },
  { id: 'Inventor', name: 'Inventor', basePv: 12, pvPerLevel: 3, pmPerLevel: 4, fixedSkills: ['oficio', 'vontade'], freeSkillsBase: 4, description: 'Gênio criador de engenhocas e alquimia.' },
  { id: 'Ladino', name: 'Ladino', basePv: 12, pvPerLevel: 3, pmPerLevel: 4, fixedSkills: ['ladinagem', 'reflexos'], freeSkillsBase: 8, description: 'Especialista furtivo e letal.' },
  { id: 'Lutador', name: 'Lutador', basePv: 20, pvPerLevel: 5, pmPerLevel: 3, fixedSkills: ['fortitude', 'luta'], freeSkillsBase: 4, description: 'Combatente desarmado implacável.' },
  { id: 'Nobre', name: 'Nobre', basePv: 16, pvPerLevel: 4, pmPerLevel: 4, fixedSkills: ['diplomacia', 'vontade'], freeSkillsBase: 4, description: 'Líder estrategista e influente.' },
  { id: 'Paladino', name: 'Paladino', basePv: 20, pvPerLevel: 5, pmPerLevel: 3, fixedSkills: ['luta', 'vontade'], freeSkillsBase: 2, description: 'Campeão sagrado do bem.' },
];

export const T20_ORIGINS: string[] = [
  'Acólito', 'Amigo dos Animais', 'Amnésico', 'Aristocrata', 'Artesão', 'Artista',
  'Assistente de Laboratório', 'Batedor', 'Capanga', 'Charlatão', 'Circense', 'Criminoso',
  'Curandeiro', 'Eremita', 'Escravo', 'Estudioso', 'Fazendeiro', 'Forasteiro', 'Gladiador',
  'Guarda', 'Herdeiro', 'Herói Camponês', 'Marujo', 'Mateiro', 'Membro de Guilda', 'Mercador',
  'Minerador', 'Nômade', 'Pivete', 'Plebeu', 'Refugiado', 'Seguidor', 'Selvagem', 'Soldado',
  'Taverneiro', 'Trabalhador',
];

export const T20_DEITIES: string[] = [
  'Nenhuma (Ateu / Panteão)', 'Aharadak', 'Allihanna', 'Arsenal', 'Azgher', 'Hyninn',
  'Kallyadranoch', 'Khalmyr', 'Lena', 'Lin-Wu', 'Marah', 'Megalokk', 'Nimb', 'Oceano',
  'Sszzaas', 'Tanna-Toh', 'Tenebra', 'Thwor', 'Thyatis', 'Valkaria', 'Wynna',
];

