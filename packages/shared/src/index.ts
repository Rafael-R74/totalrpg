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