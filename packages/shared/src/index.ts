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
