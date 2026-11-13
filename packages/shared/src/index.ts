export * from './ruleEngine';
export * from './defaults';
export * from './wizardData';
export * from './ordemCompendiumData';
export * from './characterBuilder';
// Sistemas de RPG suportados
export type SystemId = 'tormenta20' | 'ordem-paranormal' | 'duna';

// Estados dos jogadores
export type PortraitState = 'normal' | 'ferido' | 'morrendo' | 'enlouquecendo';

// Molde de barras vitais
export interface VitalBar {
    id: string;
    label: string; 
    current: number;
    max: number;
    color: string;
}

// Rolagens prontas para ataques
export interface PreparedAttack {
  id: string;
  name: string;
  attackBonus: number;
  diceCount: number;
  damageFormula: string; // Ex: "1d10+4" ou "2d6"
  critRange: string;     // Ex: "19/x2"
  damageType: string;    // Ex: "Corte", "Balístico", "Sangue"
  isMelee?: boolean;
  isFirearm?: boolean;
  isWorkTool?: boolean;  // Operário — Ferramenta de Trabalho (+1 ataque, +1 dano, +1 margem de ameaça)
}

// Molde de itens
export interface RPGItem {
  id: string;
  name: string;
  slots: number;
  quantity: number;
  category?: number;
  price?: number;
  imageUrl?: string;
  description?: string;
  isEquipped?: boolean;
  isFavoriteTool?: boolean;    // Engenheiro — Ferramenta Favorita (-1 Categoria, exceto armas)
  ignorePatentLimit?: boolean; // Criminoso — O Crime Compensa (isento do limite de patente)
  modifiers?: RuleModifier[];
}

// Perfis de usuários
export type UserRole = 'dm' | 'player' | 'spectator';

// Rolagem de dados
export interface DiceRollResult {
  id: string;
  rollerUserId?: string;
  characterId?: string;
  isInitiativeRoll?: boolean;
  characterName: string;
  label: string;
  formula: string;
  rolls: number[];
  sides?: number;
  modifier: number;
  total: number;
  system: SystemId;
  timestamp: string;
  isSecret?: boolean;
  rerolledAfortunado?: boolean;
}
// Eventos enviados pelo servidor para o cliente
export interface ServerToClientEvents {
  'vital:updated': (data: VitalBar) => void;
  'dice:rolled': (result: DiceRollResult) => void;
  'character:updated': (payload: { characterId: string }) => void;
  'campaign:permissionsUpdated': (permissions: SheetPermissions) => void;
  'combat:initiativeRequested': (payload: { campaignId: string }) => void;
  'combat:initiativeSubmitted': (payload: {
    characterId: string;
    characterName: string;
    initiative: number;
  }) => void;
  'postit:received': (payload: { postIt: StickyPostIt; action: 'show' | 'hide' }) => void;
  'postit:dismissed': (payload: { postItId: string; characterId: string }) => void;
  'item:received': (payload: {
    targetCharacterId: string;
    item: RPGItem;
    attack?: PreparedAttack;
  }) => void;
  'scene:ended': (payload: { campaignId: string; timestamp: number }) => void;
  'monitor:updated': (payload: {
    director: MonitorDirectorState;
    combatState: {
      combatants: any[];
      currentTurnIndex: number;
      roundNumber: number;
    };
    merchants?: CampaignMerchant[];
    postIts?: StickyPostIt[];
  }) => void;
}

// Eventos que o cliente envia para o servidor
export interface ClientToServerEvents {
  'session:join': (payload: { campaignId: string; role: 'dm' | 'player' | 'monitor' }) => void;
  'vital:change': (payload: { campaignId: string; bar: VitalBar }) => void;
  'dice:roll': (payload: {
    campaignId: string;
    rollerUserId?: string;
    characterId?: string;
    isInitiativeRoll?: boolean;
    characterName: string;
    label: string;
    count: number;
    sides: number;
    modifier: number;
    system: SystemId;
    isSecret?: boolean;
    fixedRolls?: number[];
  }) => void;
  'character:sync': (payload: { campaignId: string; characterId: string }) => void;
  'campaign:syncPermissions': (payload: { campaignId: string; permissions: SheetPermissions }) => void;
  'combat:requestInitiative': (payload: { campaignId: string }) => void;
  'postit:share': (payload: {
    campaignId: string;
    postIt: StickyPostIt;
    action: 'show' | 'hide';
  }) => void;
  'postit:dismiss': (payload: {
    campaignId: string;
    postItId: string;
    characterId: string;
  }) => void;
  'item:giveNotify': (payload: {
    campaignId: string;
    targetCharacterId: string;
    item: RPGItem;
    attack?: PreparedAttack;
  }) => void;
  'dice:rerollOne': (payload: {
    campaignId: string;
    rollResult: DiceRollResult;
    dieIndex?: number;
  }) => void;
  'scene:end': (payload: { campaignId: string }) => void;
  'monitor:sync': (payload: {
    campaignId: string;
    director: MonitorDirectorState;
    combatState: {
      combatants: any[];
      currentTurnIndex: number;
      roundNumber: number;
    };
    merchants?: CampaignMerchant[];
    postIts?: StickyPostIt[];
  }) => void;
}

// Travas do mestre
export interface SheetPermissions {
  lockAllSheets: boolean;
  allowEditVitals: boolean;
  allowEditInventory: boolean;
  allowEditAbilities: boolean;
  allowEditAttributes: boolean;
  allowTrade: boolean;
}

// Estrutura específica de ficha: Ordem Paranormal
export interface OrdemAttributes {
  agi: number;
  for: number;
  int: number;
  pre: number;
  vig: number;
}

export interface OrdemSkill {
  id: string;
  name: string;
  attribute: keyof OrdemAttributes;
  trainingDegree: 0 | 5 | 10 | 15;
  otherModifier: number;
}

export interface SceneEffect {
  id: string;
  name: string;
  source?: string;
  description: string;
  sourceAbilityId?: string;
  tempHpGranted?: number;
  tempPeGranted?: number;
  modifiers?: RuleModifier[];
}

export interface OrdemSheetData {
  origin: string;
  characterClass: 'combatente' | 'especialista' | 'ocultista' | 'mundano';
  nex: number;
  patent: string;
  trail?: string;
  prestigePoints?: number;
  affinity?: string;
  peritoSkills?: string[];
  proficiencies?: string[];
  transcendedCount?: number;
  workToolWeaponName?: string;
  tempHp?: number;
  tempPe?: number;
  sceneEffects?: SceneEffect[];
  displacement: number;
  attributes: OrdemAttributes;
  skills: OrdemSkill[];
  abilities?: CharacterAbility[];
  activeConditions?: ActiveCondition[];
}

// Estrutura Específica de Ficha: Tormenta 20
export interface T20Attributes {
  forca: number;
  destreza: number;
  constituicao: number;
  inteligencia: number;
  sabedoria: number;
  carisma: number;
}

export interface T20Skill {
  id: string;
  name: string;
  attribute: keyof T20Attributes;
  isTrained: boolean;
  otherModifier: number;
}

export interface T20SheetData {
  race: string;
  characterClass: string;
  level: number;
  deity: string;
  origin: string;
  tempHp?: number;
  sceneEffects?: SceneEffect[];
  attributes: T20Attributes;
  skills: T20Skill[];
  abilities?: CharacterAbility[];
  activeConditions?: ActiveCondition[];
}

// Modelo unificado de personagem com dados completos
export interface FullCharacterPayload {
  id: string;
  name: string;
  portraitUrl?: string;
  system: SystemId;
  ownerId: string;
  campaignId?: string | null;
  vitals: VitalBar[];
  sheetData: OrdemSheetData | T20SheetData | Record<string, any>;
  inventory: RPGItem[];
  attacks: PreparedAttack[];
}

export interface CharacterAbility {
  id: string;
  name: string;
  category: 'poder' | 'poder_paranormal' | 'magia' | 'ritual' | 'origem' | 'classe';
  cost: number;
  description: string;
  damageFormula?: string;
  element?: string;
  hasAffinityUpgrade?: boolean;
  isActive?: boolean;        // Se true, aplica os modificadores passivos/sustentados na ficha
  modifiers?: RuleModifier[]; // Modificadores herdados do Compêndio
}

// Motor de Regras Dinâmico & Compêndio do Admin
export type CompendiumCategory = 'power' | 'paranormal_power' | 'spell' | 'item' | 'origin' | 'condition';

export type ModifierTargetType =
  | 'attribute'      // Afeta um atributo base (ex: for, agi, forca, destreza)
  | 'skill_bonus'    // Soma bônus numérico em uma perícia (ex: luta, pontaria, ou 'all')
  | 'skill_dice'     // Soma ou subtrai dados d20 na rolagem (ex: +1d20 ou -1d20)
  | 'vital_max'      // Altera o máximo de uma barra vital (pv, pm, pe, san)
  | 'defense'        // Altera a Defesa do personagem
  | 'attack_bonus'   // Soma no acerto de ataques
  | 'damage_bonus'   // Soma no dano de ataques
  | 'load_limit';    // Altera espaços máximos da mochila

export interface RuleModifier {
  id: string;
  targetType: ModifierTargetType;
  targetKey: string; // Ex: 'luta', 'pv', 'for', 'all', 'defense'
  value: number;     // Ex: +2, -2, +5
  scaleWithLevel?: boolean; // Se true, multiplica o valor pelo Nível (T20) ou escalona por NEX (Ordem)
}

export interface CompendiumEntryData {
  id: string;
  system: SystemId;
  category: CompendiumCategory;
  name: string;
  description: string;
  cost: number; // Custo em PM ou PE (0 se for passivo/item)
  modifiers: RuleModifier[];
  metadata?: {
    circle?: number;        // Para magias/rituais (1º ao 5º círculo)
    element?: string;       // Sangue, Morte, Conhecimento, Energia, Evocação...
    execution?: string;     // Padrão, Movimento, Reação, Completa
    range?: string;         // Curto, Médio, Pessoal, Toque
    duration?: string;      // Cena, Instantânea, Sustentada
    damageFormula?: string; // Ex: "2d8+4" ou "6d6"
    critRange?: string;     // Ex: "19/x2"
    slots?: number;         // Espaços ocupados no inventário
    categoryLevel?: number; // Categoria de item em Ordem Paranormal (0, 1, 2, 3, 4)
    requirements?: string;  // Pré-requisitos em texto
  };
}

export interface SystemSkillDefinition {
  id: string;
  system: SystemId;
  skillKey: string;         // Ex: 'luta', 'ocultismo'
  name: string;             // Ex: 'Luta', 'Ocultismo'
  defaultAttribute: string; // Ex: 'for', 'int', 'forca'
  trainedOnly: boolean;     // Se true, só pode rolar se for treinado
  armorPenalty: boolean;    // Se true, sofre penalidade de carga/armadura
}

export interface ActiveCondition {
  id: string;
  name: string;
  description: string;
  modifiers: RuleModifier[];
}

// 16. Estruturas de Ameaças da Mesa, Mercadores e Post-its Flutuantes
export interface ThreatSkill {
  id: string;
  name: string;
  diceCount: number;
  bonus: number;
}

export interface CampaignThreat {
  id: string;
  name: string;
  system: SystemId;
  imageUrl?: string;
  hpMax: number;
  defense: number;
  initiativeDice: number;
  initiativeBonus: number;
  attributes: Record<string, number>;
  skills: ThreatSkill[];
  attacks: PreparedAttack[];
  description: string;
}

export interface MerchantStockItem {
  id: string;
  item: RPGItem;
  attack?: PreparedAttack;
  price: number;
  currency?: string;
  stockQty: number;
}

export interface CampaignMerchant {
  id: string;
  name: string;
  description: string;
  stock: MerchantStockItem[];
}

export interface StickyPostIt {
  id: string;
  title: string;
  textContent: string;
  drawingDataUrl?: string;
  color: 'amber' | 'red' | 'blue' | 'emerald' | 'purple';
  x: number;
  y: number;
  width: number;
  height: number;
  isPinned: boolean;
  sharedWithCharacterIds?: string[];
  sharedOnMonitor?: boolean; // Se true, aparece destacado no 2º Monitor!
}

// 17. Projeção Universal e Diretor do 2º Monitor
export interface MonitorProjection {
  type: 'item' | 'threat' | 'postit' | 'handout';
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
}

export interface MonitorDirectorState {
  showCombatTracker: boolean;
  enemyHpVisibility: 'narrative' | 'exact' | 'hidden';
  activeMerchantId?: string | null; // Exibe a loja do Mercador no lado DIREITO da tela
  activeProjection?: MonitorProjection | null; // Projeta Item, Ameaça, Post-it ou Pista em destaque
  sceneTitle?: string;
  sceneSubtitle?: string;
  backgroundUrl?: string;
  handoutTitle?: string;
  handoutImageUrl?: string;
  handoutText?: string;
}