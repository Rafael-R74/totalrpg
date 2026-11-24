export * from './ruleEngine';
export * from './defaults';
export * from './wizardData';
export * from './ordemEquipmentData';
export * from './ordemRituals';
export * from './ordemCompendiumData';
export * from './characterBuilder';
export * from './ordemBestiaryData';
export * from './contentPack';
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
  isDisparo?: boolean;
  isWorkTool?: boolean;  // Operário — Ferramenta de Trabalho (+1 ataque, +1 dano, +1 margem de ameaça)
  isAniquiladorFavorite?: boolean; // Aniquilador — A Favorita
  isUnarmed?: boolean;             // Artista Marcial — Ataque Desarmado
  linkedItemId?: string;           // ID do item correspondente no inventário (sincroniza modificações e maldições)
  multiAttack?: string;            // Ex: "x2", "x3" (Bestiário)
  range?: string;                  // Ex: "Corpo a corpo", "Curto", "Médio", "Extremo"
  extraDamage?: Array<{ count: number; sides: number; label: string; formula: string }>;
}

export type OrdemElement = 'Sangue' | 'Morte' | 'Conhecimento' | 'Energia' | 'Medo';

export type OrdemItemKind =
  | 'weapon_melee'
  | 'weapon_ranged'
  | 'weapon_firearm'
  | 'ammo'
  | 'protection_light'
  | 'protection_heavy'
  | 'shield'
  | 'accessory'
  | 'explosive'
  | 'operational'
  | 'paranormal'
  | 'cursed_special';

export interface OrdemAppliedAccessoryChoice {
  accessoryType?: 'utensilio' | 'vestimenta';
  primarySkill?: string;
  secondarySkill?: string;
  instrumentalSkill?: string;
  aprimoradoPrimary?: boolean;
  aprimoradoSecondary?: boolean;
}

export interface OrdemAppliedCurse {
  curseId: string;
  chosenElement?: OrdemElement;
  chosenRitualName?: string;
}

// Molde de itens
export interface RPGItem {
  id: string;
  name: string;
  slots: number;
  quantity: number;
  category?: number;
  baseCategory?: number;
  baseSlots?: number;
  price?: number;
  imageUrl?: string;
  description?: string;
  isEquipped?: boolean;
  isFavoriteTool?: boolean;        // Engenheiro — Ferramenta Favorita (-1 Categoria, exceto armas)
  isUtilityBackpackItem?: boolean; // Especialista — Mochila de Utilidades (-I Categoria e -1 Espaço)
  isParanormalTool?: boolean;      // Ocultista — Ferramentas Paranormais (-I Categoria em item paranormal)
  ignorePatentLimit?: boolean;     // Criminoso — O Crime Compensa (isento do limite de patente)
  isAniquiladorFavorite?: boolean; // Aniquilador — A Favorita (-I / -II / -III Categoria)
  isParanormal?: boolean;          // Separa equipamentos paranormais/amaldiçoados dos normais
  isCursedSpecial?: boolean;       // Item amaldiçoado especial (Cap. 6) — conta como 1 maldição p/ Preço da Maldição
  itemKind?: OrdemItemKind;
  element?: OrdemElement;
  modifications?: string[];        // IDs de modificações (Cap. 3)
  curses?: OrdemAppliedCurse[];    // Maldições aplicadas (Cap. 6)
  accessoryConfig?: OrdemAppliedAccessoryChoice;
  storedRitualName?: string;       // Selo Paranormal ou arma Ritualística
  storedRitualCircle?: number;     // Círculo do ritual no selo (1 a 4)
  storedRitualCost?: number;       // PE do ritual armazenado
  storedRitualElement?: string;
  storedRitualDescription?: string;
  storedBloodPv?: number;          // Frasco de Vitalidade (até 20 PV)
  storedPe?: number;               // Coletora (até 20 PE)
  dailyUses?: number;              // Contador diário para DT crescente (Crânio Espiral, Coração Pulsante, etc.)
  remainingCharges?: number;       // Cargas restantes (Spray de Pimenta, Taser, Pistola de Dardos/Sinalizadora)
  modifiers?: RuleModifier[];
}

// Perfis de usuários
export type UserRole = 'dm' | 'player' | 'spectator';

// Payload de Força Opressora (Guerreiro 65%) vinculado a uma rolagem de dano corpo a corpo
export interface ForcaOpressoraRollPayload {
  lutaDiceCount: number;
  lutaBonus: number;
  weaponName: string;
}

// Payload de sequência de disparos da habilidade Segurar o Gatilho
export interface SegurarGatilhoPayload {
  enabled: boolean;
  batchId: string;
  shotIndex: number;
  nextExtraShotStep: number; // 1 => 2 PE, 2 => 4 PE, 3 => 6 PE...
  weaponName: string;
  baseAttackDice: number;
  baseAttackBonus: number;
  baseDamageModifier: number;
  critThreatMin: number;
  critMultiplier: number;
  normalDiceCount: number;
  critDiceCount: number;
  dieSides: number;
  hasAtaqueEspecial: boolean;
  maxAeTotalBonus: number;
  aeMult: number;
  peTurnLimit: number;
  maximizeCritDamage?: boolean;
  tecnicaSecretaCost?: number;
  tecnicaSecretaAttackSuffix?: string;
  tecnicaSecretaDamageSuffix?: string;
}

// Payload de efeito vinculado à rolagem de O Custo do Paranormal (Ocultismo) de um Ritual
export interface RitualEffectRollPayload {
  ritualId: string;
  ritualName: string;
  formLabel: string;
  peSpent: number;
  pvSpent?: number;
  custoParanormalDt: number;
  effectType?: 'damage' | 'healing' | 'temp_hp' | 'utility';
  effectFormula?: string;
  effectLabel?: string;
  maximizeEffect?: boolean;
  appliedSceneSummary?: string;
}

// Payload de dano vinculado a uma rolagem de acerto de arma (para botão direto de Dano / Dano Crítico no modal)
export interface AttackDamageRollPayload {
  weaponName: string;
  critThreatMin: number;
  critMultiplier: number;
  normalDiceCount: number;
  critDiceCount: number;
  dieSides: number;
  damageModifier: number;
  maximizeCritDamage?: boolean;
  damageLabelSuffix?: string;
  explodingDieSide?: number;           // Motosserra: sempre que cair 6 no d6, rola +1d6 extra
  extraDiceNormal?: { count: number; sides: number; label: string }[]; // Lancinante, Erosiva, Explosiva, Antielemento
  extraDiceCrit?: { count: number; sides: number; label: string }[];   // Lancinante multiplica no crítico!
  sanguinariaCritTempHp?: boolean;     // Sanguinária: crítico dá 2d10 PV temporários
  ritualisticaStoredName?: string;     // Ritualística: lembrar/descarregar ritual no acerto
  forcaOpressoraPayload?: ForcaOpressoraRollPayload;
  segurarGatilhoPayload?: SegurarGatilhoPayload;
}

export interface CursePricePrompt {
  element: OrdemElement;
  attributeLabel: string;
  curseCount: number;
  sanLossOnFail: number; // 2 * curseCount
}

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
  explodedRolls?: number[];
  extraDiceResults?: Array<{ label: string; formula: string; rolls: number[]; subtotal: number }>;
  sides?: number;
  modifier: number;
  total: number;
  system: SystemId;
  timestamp: string;
  isSecret?: boolean;
  hasAfortunado?: boolean;
  hasAfortunadoAffinity?: boolean;
  rerolledAfortunado?: boolean;
  attackDamagePayload?: AttackDamageRollPayload;
  forcaOpressoraPayload?: ForcaOpressoraRollPayload;
  cursePricePrompt?: CursePricePrompt;
  ritualEffectPayload?: RitualEffectRollPayload;
  batchId?: string;
  batchRole?: 'segurar_gatilho_attack' | 'segurar_gatilho_damage';
  batchShotNumber?: number;
  batchIsCrit?: boolean;
}

export type SessionActivityCategory =
  | 'ability'
  | 'inventory'
  | 'consumable'
  | 'transfer'
  | 'vital'
  | 'condition'
  | 'interlude'
  | 'progression'
  | 'system';

export interface SessionActivityLogEntry {
  id: string;
  campaignId: string;
  timestamp: string;
  createdAt: number;
  category: SessionActivityCategory;
  characterId?: string;
  characterName: string;
  actorLabel?: string;
  summary: string;
  details?: string;
  costText?: string;
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'purple';
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
  'activity:logged': (entry: SessionActivityLogEntry) => void;
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
    explodingDieSide?: number;
    extraDice?: Array<{ count: number; sides: number; label: string }>;
    hasAfortunado?: boolean;
    hasAfortunadoAffinity?: boolean;
    attackDamagePayload?: AttackDamageRollPayload;
    forcaOpressoraPayload?: ForcaOpressoraRollPayload;
    cursePricePrompt?: CursePricePrompt;
    ritualEffectPayload?: RitualEffectRollPayload;
    batchId?: string;
    batchRole?: 'segurar_gatilho_attack' | 'segurar_gatilho_damage';
    batchShotNumber?: number;
    batchIsCrit?: boolean;
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
  'activity:log': (
    payload: Omit<SessionActivityLogEntry, 'id' | 'timestamp' | 'createdAt'> & {
      id?: string;
      timestamp?: string;
      createdAt?: number;
    }
  ) => void;
  'activity:clear': (payload: { campaignId: string }) => void;
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
  recurringFormula?: string;
  recurringLabel?: string;
  recurringAction?: string;
  isSustainedRitual?: boolean;
  ritualId?: string;
  usesOcultismoManeuver?: boolean;
}

export interface CharacterPersonalProfile {
  age?: string;
  pronouns?: string;
  height?: string;
  weight?: string;
  birthplace?: string;
  occupation?: string;
  appearance?: string;
  personality?: string;
  backstory?: string;
  goals?: string;
  bonds?: string;
  personalNotes?: string;
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
  sangueFerventeAttr?: 'for' | 'agi';
  tempHp?: number;
  tempPe?: number;
  sceneEffects?: SceneEffect[];
  displacement: number;
  attributes: OrdemAttributes;
  skills: OrdemSkill[];
  abilities?: CharacterAbility[];
  activeConditions?: ActiveCondition[];
  personalProfile?: CharacterPersonalProfile;
  interludeBonusDice?: {
    physical: number; // Exercitar-se (+1d20 em testes de FOR, AGI ou VIG)
    mental: number;   // Ler (+1d20 em testes de INT ou PRE)
  };
  pendingInterlude?: {
    id: string;
    comfort: 0.5 | 1 | 2 | 3;
    grantedAt: number;
  } | null;
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
  proficiencies?: string[];
  tempHp?: number;
  sceneEffects?: SceneEffect[];
  attributes: T20Attributes;
  skills: T20Skill[];
  abilities?: CharacterAbility[];
  activeConditions?: ActiveCondition[];
  personalProfile?: CharacterPersonalProfile;
  interludeBonusDice?: {
    physical: number; // Exercitar-se (+1d20 em testes de FOR, AGI ou VIG)
    mental: number;   // Ler (+1d20 em testes de INT ou PRE)
  };
  pendingInterlude?: {
    id: string;
    comfort: 0.5 | 1 | 2 | 3;
    grantedAt: number;
  } | null;
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
  chosenElement?: string;
  hasAffinityUpgrade?: boolean;
  isFavoriteRitual?: boolean; // Ocultista — Ritual Predileto (-1 PE)
  isGrimoireRitual?: boolean; // Graduado — Grimório Ritualístico
  isSustainedActive?: boolean; // Ritual sustentado ativo no turno
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
    target?: string;        // Alvo ou Área do ritual
    resistance?: string;    // Resistência (Vontade anula, Fortitude reduz à metade...)
    requiresTrail?: string; // Para rituais de 4º círculo de Medo exclusivos de trilha
    damageFormula?: string; // Ex: "2d8+4" ou "6d6"
    critRange?: string;     // Ex: "19/x2"
    slots?: number;         // Espaços ocupados no inventário
    categoryLevel?: number; // Categoria de item em Ordem Paranormal (0, 1, 2, 3, 4)
    requirements?: string;  // Pré-requisitos em texto
    isParanormal?: boolean; // Equipamento Paranormal / Item Amaldiçoado Especial
    isCursedSpecial?: boolean;
    itemSubtype?: OrdemItemKind;
    isWeapon?: boolean;     // Diferencia armas de consumíveis/granadas que também têm damageFormula
    uses?: number;          // Cargas padrão (Spray de Pimenta = 2, Taser = 2, etc.)
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

export type ThreatActionType =
  | 'Passiva'
  | 'Livre'
  | 'Movimento'
  | 'Padrão'
  | 'Reação'
  | 'Completa';

export interface ThreatSpecialAbility {
  id: string;
  name: string;
  actionType: ThreatActionType;
  description: string;
  damageFormula?: string;
}

export interface CampaignThreat {
  id: string;
  templateId?: string;
  name: string;
  system: SystemId;
  vd?: number;
  element?: string;
  secondaryElements?: string[];
  subGroup?: string;
  creatureType?: string;
  size?: string;
  senses?: string;
  displacement?: string;
  resistances?: string;
  immunities?: string;
  vulnerabilities?: string;
  enigmaOfFear?: string;
  enigmaSolved?: boolean;
  specialAbilities?: ThreatSpecialAbility[];
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