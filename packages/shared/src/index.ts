export * from './defaults';
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
    hitFormula: string;
    damageFormula: string;
    critRange?: string;
    costText?: string;
}

// Molde de itens
export interface RPGItem {
    id: string;
    name: string;
    description: string;
    imageUrl?: string;
    price: number;
    isEquipable: boolean;
    isEquipped: boolean;
    attackData?: PreparedAttack;
    systemData: Record<string, unknown>;
}

// Perfis de usuários
export type UserRole = 'dm' | 'player' | 'spectator';

// Molde de resultados de rolagens
export interface DiceRollResult {
    id: string;
    characterName: string;
    label: string;
    formula: string;
    rolls: number[];
    total: number;
    timestamp: string;
    system: SystemId;
}

// Eventos enviados pelo servidor para o cliente
export interface ServerToClientEvents {
    'vital:updated': (bar: VitalBar) => void;
    'dice:rolled': (roll: DiceRollResult) => void;
}

// Eventos que o cliente envia para o servidor
export interface ClientToServerEvents {
    'session:join': (data: { campaignId: string; role: UserRole }) => void;
    'vital:change': (data: { campaignId: string; bar: VitalBar }) => void;
    'dice:roll': (data: {
        campaignId: string;
        characterName: string;
        label: string;
        sides: number;
        count: number;
        modifier: number;
        system: SystemId;
  }) => void;
}

// 10. Permissões de edição da campanha (travas do mestre)
export interface SheetPermissions {
  lockAllSheets: boolean;
  allowEditVitals: boolean;
  allowEditInventory: boolean;
  allowEditAbilities: boolean;
  allowEditAttributes: boolean;
  allowTrade: boolean;
}

// 11. Estrutura específica de ficha: Ordem Paranormal
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

export interface OrdemSheetData {
  origin: string;
  characterClass: 'combatente' | 'especialista' | 'ocultista' | 'mundano';
  nex: number;
  patent: string;
  displacement: number;
  attributes: OrdemAttributes;
  skills: OrdemSkill[];
}

// 12. Estrutura Específica de Ficha: Tormenta 20
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
  attributes: T20Attributes;
  skills: T20Skill[];
}

// 13. Modelo unificado de personagem com dados completos
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