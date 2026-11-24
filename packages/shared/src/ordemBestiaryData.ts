// Catálogo Mecânico do Bestiário de Ordem Paranormal RPG v1.3 (Cap. 7 — 67 Ameaças)
// Arquitetura BYOC: descrições completas, Enigmas de Medo e textos de habilidades são hidratados em runtime via Content Pack local.
import type {
  CampaignThreat,
  PreparedAttack,
  ThreatSkill,
  ThreatSpecialAbility,
} from './index';

export type OrdemBestiaryGroup =
  | 'sangue'
  | 'morte'
  | 'conhecimento'
  | 'energia'
  | 'medo'
  | 'realidade';

export interface OrdemBestiaryTemplate {
  id: string;
  name: string;
  vd: number;
  group: OrdemBestiaryGroup;
  subGroup: string;
  element: string;
  secondaryElements: string[];
  creatureType: string;
  size: string;
  hpMax: number;
  machucadoHp: number;
  defense: number;
  initiativeDice: number;
  initiativeBonus: number;
  displacement: string;
  senses?: string;
  resistances?: string;
  immunities?: string;
  vulnerabilities?: string;
  attributes: {
    agi: number;
    for: number;
    int: number;
    pre: number;
    vig: number;
  };
  skills: ThreatSkill[];
  attacks: PreparedAttack[];
  hasEnigmaOfFear: boolean;
  enigmaOfFear?: string;
  specialAbilities: ThreatSpecialAbility[];
  description: string;
}

export const ORDEM_BESTIARY_THREATS: OrdemBestiaryTemplate[] = [
  {
    "id": "ord-thr-aberracao-de-carne",
    "name": "Aberração de Carne",
    "vd": 40,
    "group": "sangue",
    "subGroup": "Criatura Paranormal",
    "element": "Sangue",
    "secondaryElements": [],
    "creatureType": "Criatura",
    "size": "Grande",
    "hpMax": 70,
    "machucadoHp": 35,
    "defense": 19,
    "initiativeDice": 1,
    "initiativeBonus": 0,
    "displacement": "9m / 6q",
    "senses": "Percepção às cegas",
    "resistances": "Balístico, impacto, perfuração 5, Sangue 10",
    "vulnerabilities": "Morte",
    "attributes": {
      "agi": 1,
      "for": 3,
      "int": 0,
      "pre": 1,
      "vig": 3
    },
    "skills": [
      {
        "id": "ord-thr-aberracao-de-carne-percepcao",
        "name": "Percepção",
        "diceCount": 1,
        "bonus": 5
      },
      {
        "id": "ord-thr-aberracao-de-carne-fortitude",
        "name": "Fortitude",
        "diceCount": 3,
        "bonus": 10
      },
      {
        "id": "ord-thr-aberracao-de-carne-reflexos",
        "name": "Reflexos",
        "diceCount": 1,
        "bonus": 0
      },
      {
        "id": "ord-thr-aberracao-de-carne-vontade",
        "name": "Vontade",
        "diceCount": 1,
        "bonus": 0
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-aberracao-de-carne-atk-1",
        "name": "Pancada",
        "diceCount": 3,
        "attackBonus": 10,
        "damageFormula": "2d6+6",
        "critRange": "20/x2",
        "damageType": "Impacto",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-aberracao-de-carne-ab-1",
        "name": "Agarrão",
        "actionType": "Reação",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-aberracao-de-carne-ab-2",
        "name": "Abocanhar",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "3d6"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-aniquilacao",
    "name": "Aniquilação",
    "vd": 380,
    "group": "sangue",
    "subGroup": "Criatura Paranormal",
    "element": "Sangue",
    "secondaryElements": [
      "Medo"
    ],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 1200,
    "machucadoHp": 600,
    "defense": 58,
    "initiativeDice": 4,
    "initiativeBonus": 20,
    "displacement": "15m / 10q",
    "senses": "Percepção às cegas",
    "resistances": "Dano 50",
    "vulnerabilities": "Morte",
    "attributes": {
      "agi": 4,
      "for": 5,
      "int": 3,
      "pre": 4,
      "vig": 5
    },
    "skills": [
      {
        "id": "ord-thr-aniquilacao-percepcao",
        "name": "Percepção",
        "diceCount": 4,
        "bonus": 20
      },
      {
        "id": "ord-thr-aniquilacao-fortitude",
        "name": "Fortitude",
        "diceCount": 5,
        "bonus": 30
      },
      {
        "id": "ord-thr-aniquilacao-reflexos",
        "name": "Reflexos",
        "diceCount": 4,
        "bonus": 25
      },
      {
        "id": "ord-thr-aniquilacao-vontade",
        "name": "Vontade",
        "diceCount": 4,
        "bonus": 20
      },
      {
        "id": "ord-thr-aniquilacao-atletismo",
        "name": "Atletismo",
        "diceCount": 5,
        "bonus": 20
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-aniquilacao-atk-1",
        "name": "Garras",
        "diceCount": 5,
        "attackBonus": 40,
        "damageFormula": "4d10+30",
        "critRange": "20/x2",
        "damageType": "Sangue",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      },
      {
        "id": "ord-thr-aniquilacao-atk-2",
        "name": "Tentáculos Espinhentos",
        "diceCount": 5,
        "attackBonus": 40,
        "damageFormula": "2d12+30",
        "critRange": "20/x2",
        "damageType": "Sangue",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      },
      {
        "id": "ord-thr-aniquilacao-atk-3",
        "name": "Disparo De Espinhos",
        "diceCount": 4,
        "attackBonus": 40,
        "damageFormula": "2d10+20",
        "critRange": "20/x2",
        "damageType": "Sangue",
        "isMelee": false,
        "range": "Distância (Médio)",
        "multiAttack": "x3"
      }
    ],
    "hasEnigmaOfFear": true,
    "enigmaOfFear": "Enigma de Medo — consulte o Livro de Regras v1.3 para a condição de resolução.",
    "specialAbilities": [
      {
        "id": "ord-thr-aniquilacao-ab-1",
        "name": "Agarrão",
        "actionType": "Reação",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-aniquilacao-ab-2",
        "name": "Instinto Aniquilador",
        "actionType": "Reação",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-aniquilacao-ab-3",
        "name": "Apertar E Destruir",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-aniquilacao-ab-4",
        "name": "Bater As Asas",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "8d6"
      },
      {
        "id": "ord-thr-aniquilacao-ab-5",
        "name": "Estrangulamento Final",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-aniquilacao-ab-6",
        "name": "Tempestade De Espinhos",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "20d6+20"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-carente",
    "name": "Carente",
    "vd": 300,
    "group": "sangue",
    "subGroup": "Criatura Paranormal",
    "element": "Sangue",
    "secondaryElements": [
      "Morte",
      "Medo"
    ],
    "creatureType": "Criatura",
    "size": "Grande",
    "hpMax": 700,
    "machucadoHp": 350,
    "defense": 40,
    "initiativeDice": 4,
    "initiativeBonus": 15,
    "displacement": "12m / 8q",
    "senses": "Percepção às cegas",
    "resistances": "Balístico, impacto, perfuração e Sangue 20",
    "vulnerabilities": "Morte",
    "attributes": {
      "agi": 4,
      "for": 4,
      "int": 2,
      "pre": 3,
      "vig": 4
    },
    "skills": [
      {
        "id": "ord-thr-carente-percepcao",
        "name": "Percepção",
        "diceCount": 3,
        "bonus": 10
      },
      {
        "id": "ord-thr-carente-fortitude",
        "name": "Fortitude",
        "diceCount": 4,
        "bonus": 25
      },
      {
        "id": "ord-thr-carente-reflexos",
        "name": "Reflexos",
        "diceCount": 4,
        "bonus": 25
      },
      {
        "id": "ord-thr-carente-vontade",
        "name": "Vontade",
        "diceCount": 3,
        "bonus": 15
      },
      {
        "id": "ord-thr-carente-enganacao",
        "name": "Enganação",
        "diceCount": 4,
        "bonus": 20
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-carente-atk-1",
        "name": "Garras De Sangue",
        "diceCount": 4,
        "attackBonus": 35,
        "damageFormula": "2d8+20",
        "critRange": "20/x2",
        "damageType": "Sangue",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      },
      {
        "id": "ord-thr-carente-atk-2",
        "name": "Ferrão De Sangue",
        "diceCount": 4,
        "attackBonus": 35,
        "damageFormula": "2d12+20",
        "critRange": "20/x2",
        "damageType": "Sangue",
        "isMelee": true,
        "range": "Corpo a corpo"
      },
      {
        "id": "ord-thr-carente-atk-3",
        "name": "Tentáculo",
        "diceCount": 4,
        "attackBonus": 35,
        "damageFormula": "2d8+20",
        "critRange": "20/x2",
        "damageType": "Sangue",
        "isMelee": true,
        "range": "Corpo a corpo"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-carente-ab-1",
        "name": "Carência",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-carente-ab-2",
        "name": "Regeneração De Sangue",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-carente-ab-3",
        "name": "Forma Infantil",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-carente-ab-4",
        "name": "Rasteira De Tentáculo",
        "actionType": "Reação",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-carente-ab-5",
        "name": "Sugada Mortal",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-carente-ab-6",
        "name": "Você É Minha Mamãe?",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-dama-de-sangue",
    "name": "Dama de Sangue",
    "vd": 60,
    "group": "sangue",
    "subGroup": "Criatura Paranormal",
    "element": "Sangue",
    "secondaryElements": [
      "Morte",
      "Medo"
    ],
    "creatureType": "Criatura",
    "size": "Enorme",
    "hpMax": 105,
    "machucadoHp": 52,
    "defense": 20,
    "initiativeDice": 2,
    "initiativeBonus": 0,
    "displacement": "12m / 8q",
    "senses": "Percepção às cegas",
    "resistances": "Balístico, impacto e perfuração 10, Sangue 20",
    "vulnerabilities": "Morte",
    "attributes": {
      "agi": 2,
      "for": 3,
      "int": 1,
      "pre": 2,
      "vig": 2
    },
    "skills": [
      {
        "id": "ord-thr-dama-de-sangue-percepcao",
        "name": "Percepção",
        "diceCount": 2,
        "bonus": 10
      },
      {
        "id": "ord-thr-dama-de-sangue-fortitude",
        "name": "Fortitude",
        "diceCount": 2,
        "bonus": 10
      },
      {
        "id": "ord-thr-dama-de-sangue-reflexos",
        "name": "Reflexos",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-dama-de-sangue-vontade",
        "name": "Vontade",
        "diceCount": 2,
        "bonus": 0
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-dama-de-sangue-atk-1",
        "name": "Tentáculo",
        "diceCount": 3,
        "attackBonus": 10,
        "damageFormula": "2d6+5",
        "critRange": "20/x2",
        "damageType": "Impacto",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": true,
    "enigmaOfFear": "Enigma de Medo — consulte o Livro de Regras v1.3 para a condição de resolução.",
    "specialAbilities": [
      {
        "id": "ord-thr-dama-de-sangue-ab-1",
        "name": "Consumir",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-dama-de-sangue-ab-2",
        "name": "ARREMESSAR (Flor Rosa)",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "2d6"
      },
      {
        "id": "ord-thr-dama-de-sangue-ab-3",
        "name": "CHUVA DE ÁCIDO (Flor Vermelha)",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "4d4"
      },
      {
        "id": "ord-thr-dama-de-sangue-ab-4",
        "name": "ESPINHOS (Flor Amarela)",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "2d8"
      },
      {
        "id": "ord-thr-dama-de-sangue-ab-5",
        "name": "GRITO DEVASTADOR (Flor Roxa)",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-dama-de-sangue-ab-6",
        "name": "MIASMA FÉTIDO (Flor Azul)",
        "actionType": "Padrão",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "1d4+1"
      },
      {
        "id": "ord-thr-dama-de-sangue-ab-7",
        "name": "PRISÃO DE TENTÁCULOS (Flor Verde)",
        "actionType": "Padrão",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-dama-de-sangue-ab-8",
        "name": "VISÃO MACABRA (Flor Laranja)",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "1d6"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-enpap-x",
    "name": "Enpap-X",
    "vd": 180,
    "group": "sangue",
    "subGroup": "Criatura Paranormal",
    "element": "Sangue",
    "secondaryElements": [
      "Conhecimento"
    ],
    "creatureType": "Criatura",
    "size": "Grande",
    "hpMax": 360,
    "machucadoHp": 180,
    "defense": 36,
    "initiativeDice": 2,
    "initiativeBonus": 10,
    "displacement": "12m / 8q",
    "senses": "Percepção às cegas",
    "resistances": "Balístico, impacto e perfuração 10, Sangue 20",
    "vulnerabilities": "Morte",
    "attributes": {
      "agi": 2,
      "for": 4,
      "int": 1,
      "pre": 2,
      "vig": 3
    },
    "skills": [
      {
        "id": "ord-thr-enpap-x-percepcao",
        "name": "Percepção",
        "diceCount": 2,
        "bonus": 10
      },
      {
        "id": "ord-thr-enpap-x-fortitude",
        "name": "Fortitude",
        "diceCount": 3,
        "bonus": 15
      },
      {
        "id": "ord-thr-enpap-x-reflexos",
        "name": "Reflexos",
        "diceCount": 2,
        "bonus": 15
      },
      {
        "id": "ord-thr-enpap-x-vontade",
        "name": "Vontade",
        "diceCount": 2,
        "bonus": 10
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-enpap-x-atk-1",
        "name": "Socão",
        "diceCount": 4,
        "attackBonus": 20,
        "damageFormula": "2d10+10",
        "critRange": "20/x2",
        "damageType": "Impacto",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x4"
      },
      {
        "id": "ord-thr-enpap-x-atk-2",
        "name": "Correntes",
        "diceCount": 2,
        "attackBonus": 15,
        "damageFormula": "2d8+10",
        "critRange": "20/x2",
        "damageType": "Impacto",
        "isMelee": false,
        "range": "Distância (Curto)",
        "multiAttack": "x3"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-enpap-x-ab-1",
        "name": "Transformação",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-enpap-x-ab-2",
        "name": "Acorrentar",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-enpap-x-ab-3",
        "name": "Forma Desencadeada",
        "actionType": "Reação",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-enpap-x-ab-4",
        "name": "Crescer",
        "actionType": "Reação",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "1d6"
      },
      {
        "id": "ord-thr-enpap-x-ab-5",
        "name": "Marcas Do Terror",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "4d6"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-kerberos",
    "name": "Kerberos",
    "vd": 340,
    "group": "sangue",
    "subGroup": "Criatura Paranormal",
    "element": "Sangue",
    "secondaryElements": [],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 1150,
    "machucadoHp": 575,
    "defense": 46,
    "initiativeDice": 4,
    "initiativeBonus": 15,
    "displacement": "18m / 12q",
    "senses": "Percepção às cegas",
    "resistances": "Balístico, impacto, perfuração e Sangue 20",
    "vulnerabilities": "Morte",
    "attributes": {
      "agi": 4,
      "for": 5,
      "int": 0,
      "pre": 3,
      "vig": 5
    },
    "skills": [
      {
        "id": "ord-thr-kerberos-percepcao",
        "name": "Percepção",
        "diceCount": 3,
        "bonus": 20
      },
      {
        "id": "ord-thr-kerberos-fortitude",
        "name": "Fortitude",
        "diceCount": 5,
        "bonus": 25
      },
      {
        "id": "ord-thr-kerberos-reflexos",
        "name": "Reflexos",
        "diceCount": 4,
        "bonus": 20
      },
      {
        "id": "ord-thr-kerberos-vontade",
        "name": "Vontade",
        "diceCount": 3,
        "bonus": 15
      },
      {
        "id": "ord-thr-kerberos-atletismo",
        "name": "Atletismo",
        "diceCount": 5,
        "bonus": 25
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-kerberos-atk-1",
        "name": "Mordida",
        "diceCount": 5,
        "attackBonus": 40,
        "damageFormula": "4d12+30",
        "critRange": "20/x2",
        "damageType": "Sangue",
        "isMelee": true,
        "range": "Corpo a corpo"
      },
      {
        "id": "ord-thr-kerberos-atk-2",
        "name": "Disparo De Espinhos",
        "diceCount": 4,
        "attackBonus": 35,
        "damageFormula": "4d8+20",
        "critRange": "20/x2",
        "damageType": "Sangue",
        "isMelee": false,
        "range": "Distância (Médio)"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-kerberos-ab-1",
        "name": "Devorar",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-kerberos-ab-2",
        "name": "Derrubar E Devorar",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-kerberos-ab-3",
        "name": "Ataque Flexível",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-minotauro",
    "name": "Minotauro",
    "vd": 280,
    "group": "sangue",
    "subGroup": "Criatura Paranormal",
    "element": "Sangue",
    "secondaryElements": [],
    "creatureType": "Criatura",
    "size": "Grande",
    "hpMax": 750,
    "machucadoHp": 375,
    "defense": 44,
    "initiativeDice": 4,
    "initiativeBonus": 15,
    "displacement": "12m / 8q",
    "senses": "Percepção às cegas",
    "resistances": "Balístico, impacto, perfuração e Sangue 20",
    "vulnerabilities": "Morte",
    "attributes": {
      "agi": 4,
      "for": 5,
      "int": 1,
      "pre": 3,
      "vig": 5
    },
    "skills": [
      {
        "id": "ord-thr-minotauro-percepcao",
        "name": "Percepção",
        "diceCount": 3,
        "bonus": 20
      },
      {
        "id": "ord-thr-minotauro-fortitude",
        "name": "Fortitude",
        "diceCount": 5,
        "bonus": 20
      },
      {
        "id": "ord-thr-minotauro-reflexos",
        "name": "Reflexos",
        "diceCount": 4,
        "bonus": 15
      },
      {
        "id": "ord-thr-minotauro-vontade",
        "name": "Vontade",
        "diceCount": 3,
        "bonus": 10
      },
      {
        "id": "ord-thr-minotauro-atletismo",
        "name": "Atletismo",
        "diceCount": 5,
        "bonus": 20
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-minotauro-atk-1",
        "name": "Chifres",
        "diceCount": 5,
        "attackBonus": 30,
        "damageFormula": "6d12+20",
        "critRange": "20/x2",
        "damageType": "Perfuração",
        "isMelee": true,
        "range": "Corpo a corpo"
      },
      {
        "id": "ord-thr-minotauro-atk-2",
        "name": "Machado",
        "diceCount": 5,
        "attackBonus": 32,
        "damageFormula": "4d12+20",
        "critRange": "20/x2",
        "damageType": "Corte",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-minotauro-ab-1",
        "name": "Cravar Chifres",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "4d12+20"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-mulher-afogada",
    "name": "Mulher Afogada",
    "vd": 140,
    "group": "sangue",
    "subGroup": "Criatura Paranormal",
    "element": "Sangue",
    "secondaryElements": [
      "Energia",
      "Medo"
    ],
    "creatureType": "Criatura",
    "size": "Grande",
    "hpMax": 240,
    "machucadoHp": 120,
    "defense": 28,
    "initiativeDice": 4,
    "initiativeBonus": 10,
    "displacement": "9m 6q",
    "senses": "Percepção às cegas",
    "resistances": "Balístico, Energia, impacto e perfuração 10, Sangue 20",
    "vulnerabilities": "Morte",
    "attributes": {
      "agi": 4,
      "for": 3,
      "int": 2,
      "pre": 2,
      "vig": 3
    },
    "skills": [
      {
        "id": "ord-thr-mulher-afogada-percepcao",
        "name": "Percepção",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-mulher-afogada-fortitude",
        "name": "Fortitude",
        "diceCount": 3,
        "bonus": 10
      },
      {
        "id": "ord-thr-mulher-afogada-reflexos",
        "name": "Reflexos",
        "diceCount": 4,
        "bonus": 10
      },
      {
        "id": "ord-thr-mulher-afogada-vontade",
        "name": "Vontade",
        "diceCount": 2,
        "bonus": 5
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-mulher-afogada-atk-1",
        "name": "Mordida",
        "diceCount": 3,
        "attackBonus": 15,
        "damageFormula": "4d8+8",
        "critRange": "20/x2",
        "damageType": "Perfuração",
        "isMelee": true,
        "range": "Corpo a corpo"
      },
      {
        "id": "ord-thr-mulher-afogada-atk-2",
        "name": "Garras",
        "diceCount": 3,
        "attackBonus": 15,
        "damageFormula": "4d6+6",
        "critRange": "20/x2",
        "damageType": "Corte",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      },
      {
        "id": "ord-thr-mulher-afogada-atk-3",
        "name": "Jato De Sangue",
        "diceCount": 4,
        "attackBonus": 10,
        "damageFormula": "4d8+8",
        "critRange": "20/x2",
        "damageType": "Sangue",
        "isMelee": false,
        "range": "Distância (Curto)"
      }
    ],
    "hasEnigmaOfFear": true,
    "enigmaOfFear": "Enigma de Medo — consulte o Livro de Regras v1.3 para a condição de resolução.",
    "specialAbilities": [
      {
        "id": "ord-thr-mulher-afogada-ab-1",
        "name": "Forma De Sangue",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-mulher-afogada-ab-2",
        "name": "Sugar Sangue",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-mulher-afogada-ab-3",
        "name": "Afogar Em Sangue",
        "actionType": "Padrão",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-mulher-afogada-ab-4",
        "name": "Arrancar Sangue",
        "actionType": "Reação",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "6d6"
      },
      {
        "id": "ord-thr-mulher-afogada-ab-5",
        "name": "Invadir Órgãos",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "6d6"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-tita-de-sangue",
    "name": "Titã de Sangue",
    "vd": 220,
    "group": "sangue",
    "subGroup": "Criatura Paranormal",
    "element": "Sangue",
    "secondaryElements": [],
    "creatureType": "Criatura",
    "size": "Enorme",
    "hpMax": 550,
    "machucadoHp": 275,
    "defense": 35,
    "initiativeDice": 2,
    "initiativeBonus": 10,
    "displacement": "12m / 8q",
    "senses": "Percepção às cegas",
    "resistances": "Balístico, impacto, perfuração e Sangue 20",
    "vulnerabilities": "Morte",
    "attributes": {
      "agi": 2,
      "for": 5,
      "int": 1,
      "pre": 1,
      "vig": 4
    },
    "skills": [
      {
        "id": "ord-thr-tita-de-sangue-percepcao",
        "name": "Percepção",
        "diceCount": 1,
        "bonus": 15
      },
      {
        "id": "ord-thr-tita-de-sangue-fortitude",
        "name": "Fortitude",
        "diceCount": 4,
        "bonus": 15
      },
      {
        "id": "ord-thr-tita-de-sangue-reflexos",
        "name": "Reflexos",
        "diceCount": 2,
        "bonus": 10
      },
      {
        "id": "ord-thr-tita-de-sangue-vontade",
        "name": "Vontade",
        "diceCount": 1,
        "bonus": 10
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-tita-de-sangue-atk-1",
        "name": "Mordida",
        "diceCount": 5,
        "attackBonus": 25,
        "damageFormula": "4d12+10",
        "critRange": "20/x2",
        "damageType": "Perfuração",
        "isMelee": true,
        "range": "Corpo a corpo"
      },
      {
        "id": "ord-thr-tita-de-sangue-atk-2",
        "name": "Garras",
        "diceCount": 5,
        "attackBonus": 25,
        "damageFormula": "4d8+10",
        "critRange": "20/x2",
        "damageType": "Corte",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-tita-de-sangue-ab-1",
        "name": "Sede De Sangue",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "4d6"
      },
      {
        "id": "ord-thr-tita-de-sangue-ab-2",
        "name": "Estraçalhar",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "4d12+10"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-zumbi-de-sangue",
    "name": "Zumbi de Sangue",
    "vd": 20,
    "group": "sangue",
    "subGroup": "Criatura Paranormal",
    "element": "Sangue",
    "secondaryElements": [],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 45,
    "machucadoHp": 22,
    "defense": 17,
    "initiativeDice": 2,
    "initiativeBonus": 5,
    "displacement": "9m / 6q",
    "senses": "Percepção às cegas",
    "resistances": "Balístico, impacto e perfuração 5, Sangue 10",
    "vulnerabilities": "Morte",
    "attributes": {
      "agi": 2,
      "for": 2,
      "int": 0,
      "pre": 1,
      "vig": 2
    },
    "skills": [
      {
        "id": "ord-thr-zumbi-de-sangue-percepcao",
        "name": "Percepção",
        "diceCount": 1,
        "bonus": 10
      },
      {
        "id": "ord-thr-zumbi-de-sangue-fortitude",
        "name": "Fortitude",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-zumbi-de-sangue-reflexos",
        "name": "Reflexos",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-zumbi-de-sangue-vontade",
        "name": "Vontade",
        "diceCount": 1,
        "bonus": 5
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-zumbi-de-sangue-atk-1",
        "name": "Garras",
        "diceCount": 2,
        "attackBonus": 5,
        "damageFormula": "1d6+5",
        "critRange": "20/x2",
        "damageType": "Corte",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-zumbi-de-sangue-bestial",
    "name": "Zumbi de Sangue Bestial",
    "vd": 100,
    "group": "sangue",
    "subGroup": "Criatura Paranormal",
    "element": "Sangue",
    "secondaryElements": [],
    "creatureType": "Criatura",
    "size": "Grande",
    "hpMax": 200,
    "machucadoHp": 100,
    "defense": 23,
    "initiativeDice": 2,
    "initiativeBonus": 15,
    "displacement": "12m / 8q",
    "senses": "Percepção às cegas",
    "resistances": "Balístico, impacto e perfuração 5, Sangue 10",
    "vulnerabilities": "Morte",
    "attributes": {
      "agi": 2,
      "for": 3,
      "int": 0,
      "pre": 2,
      "vig": 3
    },
    "skills": [
      {
        "id": "ord-thr-zumbi-de-sangue-bestial-percepcao",
        "name": "Percepção",
        "diceCount": 2,
        "bonus": 10
      },
      {
        "id": "ord-thr-zumbi-de-sangue-bestial-fortitude",
        "name": "Fortitude",
        "diceCount": 3,
        "bonus": 10
      },
      {
        "id": "ord-thr-zumbi-de-sangue-bestial-reflexos",
        "name": "Reflexos",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-zumbi-de-sangue-bestial-vontade",
        "name": "Vontade",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-zumbi-de-sangue-bestial-furtividade",
        "name": "Furtividade",
        "diceCount": 2,
        "bonus": 13
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-zumbi-de-sangue-bestial-atk-1",
        "name": "Mordida De Sangue",
        "diceCount": 3,
        "attackBonus": 15,
        "damageFormula": "2d10+5",
        "critRange": "20/x2",
        "damageType": "Perfuração",
        "isMelee": true,
        "range": "Corpo a corpo"
      },
      {
        "id": "ord-thr-zumbi-de-sangue-bestial-atk-2",
        "name": "Garras De Sangue",
        "diceCount": 3,
        "attackBonus": 15,
        "damageFormula": "2d6+5",
        "critRange": "20/x2",
        "damageType": "Corte",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-zumbi-de-sangue-bestial-ab-1",
        "name": "Furtivo E Letal",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-zumbi-de-sangue-bestial-ab-2",
        "name": "Instinto Predatório",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-o-diabo",
    "name": "O Diabo",
    "vd": 400,
    "group": "sangue",
    "subGroup": "Relíquia",
    "element": "Sangue",
    "secondaryElements": [
      "Conhecimento",
      "Medo"
    ],
    "creatureType": "Relíquia",
    "size": "Médio",
    "hpMax": 1666,
    "machucadoHp": 833,
    "defense": 66,
    "initiativeDice": 6,
    "initiativeBonus": 35,
    "displacement": "18m / 12q",
    "senses": "Percepção às cegas",
    "resistances": "Balístico, impacto e perfuração 20",
    "immunities": "Atordoado, condições de paralisia, dano, dano e efeitos de Sangue",
    "vulnerabilities": "Morte",
    "attributes": {
      "agi": 6,
      "for": 6,
      "int": 6,
      "pre": 6,
      "vig": 6
    },
    "skills": [
      {
        "id": "ord-thr-o-diabo-percepcao",
        "name": "Percepção",
        "diceCount": 6,
        "bonus": 25
      },
      {
        "id": "ord-thr-o-diabo-fortitude",
        "name": "Fortitude",
        "diceCount": 6,
        "bonus": 35
      },
      {
        "id": "ord-thr-o-diabo-reflexos",
        "name": "Reflexos",
        "diceCount": 6,
        "bonus": 35
      },
      {
        "id": "ord-thr-o-diabo-vontade",
        "name": "Vontade",
        "diceCount": 6,
        "bonus": 35
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-o-diabo-atk-1",
        "name": "Arma Sangrenta",
        "diceCount": 6,
        "attackBonus": 45,
        "damageFormula": "2d10+50",
        "critRange": "20/x3",
        "damageType": "Sangue",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      },
      {
        "id": "ord-thr-o-diabo-atk-2",
        "name": "Chifre Do Diabo",
        "diceCount": 6,
        "attackBonus": 45,
        "damageFormula": "2d8+50",
        "critRange": "20/x3",
        "damageType": "Sangue",
        "isMelee": true,
        "range": "Corpo a corpo"
      },
      {
        "id": "ord-thr-o-diabo-atk-3",
        "name": "Arma Sangrenta",
        "diceCount": 6,
        "attackBonus": 45,
        "damageFormula": "2d10+50",
        "critRange": "20/x3",
        "damageType": "Sangue",
        "isMelee": false,
        "range": "Distância (Médio)",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": true,
    "enigmaOfFear": "Enigma de Medo — consulte o Livro de Regras v1.3 para a condição de resolução.",
    "specialAbilities": [
      {
        "id": "ord-thr-o-diabo-ab-1",
        "name": "Explodir Em Sangue",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "10d6"
      },
      {
        "id": "ord-thr-o-diabo-ab-2",
        "name": "Sangrar",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "8d8"
      },
      {
        "id": "ord-thr-o-diabo-ab-3",
        "name": "Transportar Pelo Sangue",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-o-diabo-ab-4",
        "name": "Ardiloso",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-o-diabo-ab-5",
        "name": "Decepar Máscara",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-o-diabo-ab-6",
        "name": "Potência De Sangue",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-o-diabo-ab-7",
        "name": "Senhor Do Sangue",
        "actionType": "Padrão",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-o-diabo-ab-8",
        "name": "Pacto",
        "actionType": "Padrão",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "10d6"
      },
      {
        "id": "ord-thr-o-diabo-ab-9",
        "name": "Desejos De Sangue",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-aracnasita",
    "name": "Aracnasita",
    "vd": 80,
    "group": "morte",
    "subGroup": "Criatura Paranormal",
    "element": "Morte",
    "secondaryElements": [
      "Medo"
    ],
    "creatureType": "Criatura",
    "size": "Grande",
    "hpMax": 140,
    "machucadoHp": 70,
    "defense": 23,
    "initiativeDice": 3,
    "initiativeBonus": 10,
    "displacement": "12m / 8q",
    "senses": "Percepção às cegas",
    "immunities": "Dano (exceto fogo)",
    "vulnerabilities": "Energia",
    "attributes": {
      "agi": 3,
      "for": 2,
      "int": 1,
      "pre": 1,
      "vig": 2
    },
    "skills": [
      {
        "id": "ord-thr-aracnasita-percepcao",
        "name": "Percepção",
        "diceCount": 1,
        "bonus": 10
      },
      {
        "id": "ord-thr-aracnasita-fortitude",
        "name": "Fortitude",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-aracnasita-reflexos",
        "name": "Reflexos",
        "diceCount": 3,
        "bonus": 10
      },
      {
        "id": "ord-thr-aracnasita-vontade",
        "name": "Vontade",
        "diceCount": 1,
        "bonus": 5
      },
      {
        "id": "ord-thr-aracnasita-furtividade",
        "name": "Furtividade",
        "diceCount": 3,
        "bonus": 8
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-aracnasita-atk-1",
        "name": "Mordida",
        "diceCount": 2,
        "attackBonus": 15,
        "damageFormula": "2d10+10",
        "critRange": "20/x2",
        "damageType": "Perfuração",
        "isMelee": true,
        "range": "Corpo a corpo"
      }
    ],
    "hasEnigmaOfFear": true,
    "enigmaOfFear": "Enigma de Medo — consulte o Livro de Regras v1.3 para a condição de resolução.",
    "specialAbilities": [
      {
        "id": "ord-thr-aracnasita-ab-1",
        "name": "Percepção Tátil",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-aracnasita-ab-2",
        "name": "Estacar",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "1d10"
      },
      {
        "id": "ord-thr-aracnasita-ab-3",
        "name": "Desovar Aranhas",
        "actionType": "Reação",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "2d6"
      },
      {
        "id": "ord-thr-aracnasita-ab-4",
        "name": "Disparar Teia",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "2d8+10"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-carnical-preto-da-morte",
    "name": "Carniçal Preto da Morte",
    "vd": 200,
    "group": "morte",
    "subGroup": "Criatura Paranormal",
    "element": "Morte",
    "secondaryElements": [
      "Conhecimento"
    ],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 400,
    "machucadoHp": 200,
    "defense": 38,
    "initiativeDice": 4,
    "initiativeBonus": 15,
    "displacement": "12m / 8q",
    "senses": "Percepção às cegas",
    "resistances": "Corte, impacto e perfuração 10, Morte 20",
    "immunities": "Dano balístico",
    "vulnerabilities": "Energia",
    "attributes": {
      "agi": 4,
      "for": 4,
      "int": 3,
      "pre": 3,
      "vig": 3
    },
    "skills": [
      {
        "id": "ord-thr-carnical-preto-da-morte-percepcao",
        "name": "Percepção",
        "diceCount": 3,
        "bonus": 15
      },
      {
        "id": "ord-thr-carnical-preto-da-morte-fortitude",
        "name": "Fortitude",
        "diceCount": 3,
        "bonus": 15
      },
      {
        "id": "ord-thr-carnical-preto-da-morte-reflexos",
        "name": "Reflexos",
        "diceCount": 4,
        "bonus": 15
      },
      {
        "id": "ord-thr-carnical-preto-da-morte-vontade",
        "name": "Vontade",
        "diceCount": 3,
        "bonus": 15
      },
      {
        "id": "ord-thr-carnical-preto-da-morte-atletismo",
        "name": "Atletismo",
        "diceCount": 4,
        "bonus": 15
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-carnical-preto-da-morte-atk-1",
        "name": "Garra Da Morte",
        "diceCount": 4,
        "attackBonus": 25,
        "damageFormula": "4d10+20",
        "critRange": "20/x2",
        "damageType": "Morte",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-carnical-preto-da-morte-ab-1",
        "name": "Pancada Poderosa",
        "actionType": "Reação",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "4d6"
      },
      {
        "id": "ord-thr-carnical-preto-da-morte-ab-2",
        "name": "Comando",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-carnical-preto-da-morte-ab-3",
        "name": "Hipnose",
        "actionType": "Padrão",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-carnical-preto-da-morte-ab-4",
        "name": "Reanimar Corpos",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "2d4+2"
      },
      {
        "id": "ord-thr-carnical-preto-da-morte-ab-5",
        "name": "Físico Paranormal",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-carnical-preto-da-morte-ab-6",
        "name": "Instinto Mortal",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-carnical-preto-da-morte-ab-7",
        "name": "Corpo Fechado",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-ceifador-espiral",
    "name": "Ceifador Espiral",
    "vd": 380,
    "group": "morte",
    "subGroup": "Criatura Paranormal",
    "element": "Morte",
    "secondaryElements": [
      "Medo"
    ],
    "creatureType": "Criatura",
    "size": "Grande",
    "hpMax": 999,
    "machucadoHp": 499,
    "defense": 58,
    "initiativeDice": 5,
    "initiativeBonus": 20,
    "displacement": "15m / 10q",
    "senses": "Percepção às cegas",
    "resistances": "Dano 50",
    "immunities": "Condições de paralisia, efeitos e dano de Morte",
    "vulnerabilities": "Energia",
    "attributes": {
      "agi": 5,
      "for": 5,
      "int": 5,
      "pre": 5,
      "vig": 5
    },
    "skills": [
      {
        "id": "ord-thr-ceifador-espiral-percepcao",
        "name": "Percepção",
        "diceCount": 5,
        "bonus": 20
      },
      {
        "id": "ord-thr-ceifador-espiral-fortitude",
        "name": "Fortitude",
        "diceCount": 5,
        "bonus": 25
      },
      {
        "id": "ord-thr-ceifador-espiral-reflexos",
        "name": "Reflexos",
        "diceCount": 5,
        "bonus": 25
      },
      {
        "id": "ord-thr-ceifador-espiral-vontade",
        "name": "Vontade",
        "diceCount": 5,
        "bonus": 25
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-ceifador-espiral-atk-1",
        "name": "Foice Da Morte",
        "diceCount": 5,
        "attackBonus": 40,
        "damageFormula": "5d10+20",
        "critRange": "20/x2",
        "damageType": "Morte",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": true,
    "enigmaOfFear": "Enigma de Medo — consulte o Livro de Regras v1.3 para a condição de resolução.",
    "specialAbilities": [
      {
        "id": "ord-thr-ceifador-espiral-ab-1",
        "name": "Decepar",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "1d10"
      },
      {
        "id": "ord-thr-ceifador-espiral-ab-2",
        "name": "Transporte Pelo Pó",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-ceifador-espiral-ab-3",
        "name": "Contemplar A Espiral",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "10d10+30"
      },
      {
        "id": "ord-thr-ceifador-espiral-ab-4",
        "name": "Cinzas Das Terras Desoladas",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "10d10+20"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-enraizado",
    "name": "Enraizado",
    "vd": 120,
    "group": "morte",
    "subGroup": "Criatura Paranormal",
    "element": "Morte",
    "secondaryElements": [],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 140,
    "machucadoHp": 70,
    "defense": 28,
    "initiativeDice": 3,
    "initiativeBonus": 10,
    "displacement": "9m / 6q",
    "senses": "Percepção às cegas",
    "resistances": "Corte, impacto e perfuração 10, Morte 20",
    "vulnerabilities": "Energia",
    "attributes": {
      "agi": 3,
      "for": 3,
      "int": 1,
      "pre": 1,
      "vig": 3
    },
    "skills": [
      {
        "id": "ord-thr-enraizado-percepcao",
        "name": "Percepção",
        "diceCount": 1,
        "bonus": 10
      },
      {
        "id": "ord-thr-enraizado-fortitude",
        "name": "Fortitude",
        "diceCount": 3,
        "bonus": 10
      },
      {
        "id": "ord-thr-enraizado-reflexos",
        "name": "Reflexos",
        "diceCount": 3,
        "bonus": 10
      },
      {
        "id": "ord-thr-enraizado-vontade",
        "name": "Vontade",
        "diceCount": 1,
        "bonus": 5
      },
      {
        "id": "ord-thr-enraizado-atletismo",
        "name": "Atletismo",
        "diceCount": 3,
        "bonus": 10
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-enraizado-atk-1",
        "name": "Punho Espinhento",
        "diceCount": 3,
        "attackBonus": 15,
        "damageFormula": "2d8+8",
        "critRange": "20/x2",
        "damageType": "Impacto",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2",
        "extraDamage": [
          {
            "count": 2,
            "sides": 12,
            "label": "Morte",
            "formula": "2d12"
          }
        ]
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-enraizado-ab-1",
        "name": "Imortalidade",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "1d2"
      },
      {
        "id": "ord-thr-enraizado-ab-2",
        "name": "Veneno Pútrido",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "4d12"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-escutado",
    "name": "Escutado",
    "vd": 160,
    "group": "morte",
    "subGroup": "Criatura Paranormal",
    "element": "Morte",
    "secondaryElements": [
      "Energia",
      "Medo"
    ],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 290,
    "machucadoHp": 145,
    "defense": 29,
    "initiativeDice": 4,
    "initiativeBonus": 10,
    "displacement": "12m / 8q",
    "senses": "Percepção às cegas",
    "immunities": "Dano",
    "attributes": {
      "agi": 4,
      "for": 3,
      "int": 1,
      "pre": 2,
      "vig": 3
    },
    "skills": [
      {
        "id": "ord-thr-escutado-percepcao",
        "name": "Percepção",
        "diceCount": 2,
        "bonus": 10
      },
      {
        "id": "ord-thr-escutado-fortitude",
        "name": "Fortitude",
        "diceCount": 3,
        "bonus": 10
      },
      {
        "id": "ord-thr-escutado-reflexos",
        "name": "Reflexos",
        "diceCount": 4,
        "bonus": 10
      },
      {
        "id": "ord-thr-escutado-vontade",
        "name": "Vontade",
        "diceCount": 2,
        "bonus": 5
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-escutado-atk-1",
        "name": "Mordida",
        "diceCount": 3,
        "attackBonus": 20,
        "damageFormula": "3d6+10",
        "critRange": "20/x2",
        "damageType": "Perfuração",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      },
      {
        "id": "ord-thr-escutado-atk-2",
        "name": "Cabeça Arremessada",
        "diceCount": 4,
        "attackBonus": 15,
        "damageFormula": "1d10+10",
        "critRange": "20/x2",
        "damageType": "Impacto",
        "isMelee": false,
        "range": "Distância (Curto)",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": true,
    "enigmaOfFear": "Enigma de Medo — consulte o Livro de Regras v1.3 para a condição de resolução.",
    "specialAbilities": [
      {
        "id": "ord-thr-escutado-ab-1",
        "name": "Multiplicação Melódica",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-escutado-ab-2",
        "name": "Vomitar Lodo",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "4d10+10"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-esqueleto-de-lodo",
    "name": "Esqueleto de Lodo",
    "vd": 20,
    "group": "morte",
    "subGroup": "Criatura Paranormal",
    "element": "Morte",
    "secondaryElements": [],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 40,
    "machucadoHp": 20,
    "defense": 14,
    "initiativeDice": 2,
    "initiativeBonus": 0,
    "displacement": "6m / 4q",
    "senses": "Percepção às cegas",
    "resistances": "Corte, impacto e perfuração 5, Morte 10",
    "vulnerabilities": "Energia",
    "attributes": {
      "agi": 2,
      "for": 2,
      "int": 0,
      "pre": 1,
      "vig": 1
    },
    "skills": [
      {
        "id": "ord-thr-esqueleto-de-lodo-percepcao",
        "name": "Percepção",
        "diceCount": 1,
        "bonus": 0
      },
      {
        "id": "ord-thr-esqueleto-de-lodo-fortitude",
        "name": "Fortitude",
        "diceCount": 1,
        "bonus": 0
      },
      {
        "id": "ord-thr-esqueleto-de-lodo-reflexos",
        "name": "Reflexos",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-esqueleto-de-lodo-vontade",
        "name": "Vontade",
        "diceCount": 1,
        "bonus": 0
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-esqueleto-de-lodo-atk-1",
        "name": "Garras",
        "diceCount": 2,
        "attackBonus": 5,
        "damageFormula": "2d6+2",
        "critRange": "20/x2",
        "damageType": "Corte",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-esqueleto-de-lodo-ab-1",
        "name": "Imortalidade",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "1d3"
      },
      {
        "id": "ord-thr-esqueleto-de-lodo-ab-2",
        "name": "Espiral De Lodo",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "2d10"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-marionete",
    "name": "Marionete",
    "vd": 280,
    "group": "morte",
    "subGroup": "Criatura Paranormal",
    "element": "Morte",
    "secondaryElements": [
      "Energia"
    ],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 700,
    "machucadoHp": 350,
    "defense": 40,
    "initiativeDice": 3,
    "initiativeBonus": 15,
    "displacement": "6m / 4q",
    "senses": "Percepção às cegas",
    "resistances": "Corte, impacto, perfuração e Morte 20",
    "vulnerabilities": "Energia",
    "attributes": {
      "agi": 3,
      "for": 5,
      "int": 1,
      "pre": 5,
      "vig": 2
    },
    "skills": [
      {
        "id": "ord-thr-marionete-percepcao",
        "name": "Percepção",
        "diceCount": 5,
        "bonus": 15
      },
      {
        "id": "ord-thr-marionete-fortitude",
        "name": "Fortitude",
        "diceCount": 2,
        "bonus": 10
      },
      {
        "id": "ord-thr-marionete-reflexos",
        "name": "Reflexos",
        "diceCount": 3,
        "bonus": 15
      },
      {
        "id": "ord-thr-marionete-vontade",
        "name": "Vontade",
        "diceCount": 5,
        "bonus": 20
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-marionete-atk-1",
        "name": "Foice Óssea",
        "diceCount": 5,
        "attackBonus": 30,
        "damageFormula": "10d8+10",
        "critRange": "20/x2",
        "damageType": "Morte",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-marionete-ab-1",
        "name": "Momento Passivo",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-marionete-ab-2",
        "name": "Reflexos Guiados Por Corda",
        "actionType": "Reação",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-marionete-ab-3",
        "name": "Ironia Do Destino",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-mumia-xipofaga",
    "name": "Múmia Xipófaga",
    "vd": 240,
    "group": "morte",
    "subGroup": "Criatura Paranormal",
    "element": "Morte",
    "secondaryElements": [],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 400,
    "machucadoHp": 200,
    "defense": 35,
    "initiativeDice": 5,
    "initiativeBonus": 15,
    "displacement": "9m / 6q",
    "senses": "Percepção às cegas",
    "resistances": "Corte, impacto e perfuração 10, Morte 20",
    "vulnerabilities": "Energia, fogo",
    "attributes": {
      "agi": 5,
      "for": 4,
      "int": 2,
      "pre": 3,
      "vig": 4
    },
    "skills": [
      {
        "id": "ord-thr-mumia-xipofaga-percepcao",
        "name": "Percepção",
        "diceCount": 3,
        "bonus": 10
      },
      {
        "id": "ord-thr-mumia-xipofaga-fortitude",
        "name": "Fortitude",
        "diceCount": 4,
        "bonus": 15
      },
      {
        "id": "ord-thr-mumia-xipofaga-reflexos",
        "name": "Reflexos",
        "diceCount": 5,
        "bonus": 15
      },
      {
        "id": "ord-thr-mumia-xipofaga-vontade",
        "name": "Vontade",
        "diceCount": 3,
        "bonus": 10
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-mumia-xipofaga-atk-1",
        "name": "Garra Enfaixada",
        "diceCount": 4,
        "attackBonus": 30,
        "damageFormula": "4d8+30",
        "critRange": "20/x2",
        "damageType": "Corte",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      },
      {
        "id": "ord-thr-mumia-xipofaga-atk-2",
        "name": "Vomitar Lodo",
        "diceCount": 5,
        "attackBonus": 25,
        "damageFormula": "3d6+30",
        "critRange": "20/x2",
        "damageType": "Morte",
        "isMelee": false,
        "range": "Distância (Curto)",
        "multiAttack": "x2",
        "extraDamage": [
          {
            "count": 3,
            "sides": 8,
            "label": "Extra",
            "formula": "3d8"
          }
        ]
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-mumia-xipofaga-ab-1",
        "name": "Faixas Da Permanência",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-mumia-xipofaga-ab-2",
        "name": "Agarrada Mumificadora",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-mumia-xipofaga-ab-3",
        "name": "Amalgamar",
        "actionType": "Padrão",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-nidere",
    "name": "Nidere",
    "vd": 320,
    "group": "morte",
    "subGroup": "Criatura Paranormal",
    "element": "Morte",
    "secondaryElements": [
      "Sangue"
    ],
    "creatureType": "Criatura",
    "size": "Grande",
    "hpMax": 800,
    "machucadoHp": 400,
    "defense": 50,
    "initiativeDice": 5,
    "initiativeBonus": 25,
    "displacement": "24m / 18q",
    "senses": "Faro",
    "resistances": "Corte, impacto, perfuração e Morte 20",
    "vulnerabilities": "Energia",
    "attributes": {
      "agi": 5,
      "for": 5,
      "int": 3,
      "pre": 4,
      "vig": 5
    },
    "skills": [
      {
        "id": "ord-thr-nidere-percepcao",
        "name": "Percepção",
        "diceCount": 6,
        "bonus": 25
      },
      {
        "id": "ord-thr-nidere-fortitude",
        "name": "Fortitude",
        "diceCount": 5,
        "bonus": 25
      },
      {
        "id": "ord-thr-nidere-reflexos",
        "name": "Reflexos",
        "diceCount": 5,
        "bonus": 25
      },
      {
        "id": "ord-thr-nidere-vontade",
        "name": "Vontade",
        "diceCount": 4,
        "bonus": 15
      },
      {
        "id": "ord-thr-nidere-sobrevivencia",
        "name": "Sobrevivência",
        "diceCount": 5,
        "bonus": 23
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-nidere-atk-1",
        "name": "Garra Invertida",
        "diceCount": 5,
        "attackBonus": 35,
        "damageFormula": "4d10+40",
        "critRange": "20/x2",
        "damageType": "Morte",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      },
      {
        "id": "ord-thr-nidere-atk-2",
        "name": "Mordida Invertida",
        "diceCount": 5,
        "attackBonus": 35,
        "damageFormula": "4d12+40",
        "critRange": "20/x2",
        "damageType": "Morte",
        "isMelee": true,
        "range": "Corpo a corpo"
      }
    ],
    "hasEnigmaOfFear": true,
    "enigmaOfFear": "Enigma de Medo — consulte o Livro de Regras v1.3 para a condição de resolução.",
    "specialAbilities": [
      {
        "id": "ord-thr-nidere-ab-1",
        "name": "Caçador Veloz",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-nidere-ab-2",
        "name": "Regeneração Acelerada",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-nidere-ab-3",
        "name": "Senso De Direção Perfeito",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-nidere-ab-4",
        "name": "Reverter",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-nidere-ab-5",
        "name": "Rastrear E Abater",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "6d6"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-sempiternal",
    "name": "Sempiternal",
    "vd": 360,
    "group": "morte",
    "subGroup": "Criatura Paranormal",
    "element": "Morte",
    "secondaryElements": [
      "Medo"
    ],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 990,
    "machucadoHp": 495,
    "defense": 53,
    "initiativeDice": 5,
    "initiativeBonus": 25,
    "displacement": "12m / 8q",
    "senses": "Percepção às cegas",
    "resistances": "Corte, impacto e perfuração 20",
    "immunities": "Condições de paralisia, e dano e efeitos de Morte",
    "vulnerabilities": "Energia",
    "attributes": {
      "agi": 5,
      "for": 5,
      "int": 4,
      "pre": 5,
      "vig": 4
    },
    "skills": [
      {
        "id": "ord-thr-sempiternal-percepcao",
        "name": "Percepção",
        "diceCount": 5,
        "bonus": 20
      },
      {
        "id": "ord-thr-sempiternal-fortitude",
        "name": "Fortitude",
        "diceCount": 4,
        "bonus": 20
      },
      {
        "id": "ord-thr-sempiternal-reflexos",
        "name": "Reflexos",
        "diceCount": 5,
        "bonus": 30
      },
      {
        "id": "ord-thr-sempiternal-vontade",
        "name": "Vontade",
        "diceCount": 5,
        "bonus": 25
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-sempiternal-atk-1",
        "name": "Dedos Alongados",
        "diceCount": 5,
        "attackBonus": 40,
        "damageFormula": "4d10",
        "critRange": "20/x2",
        "damageType": "Morte",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x4"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-sempiternal-ab-1",
        "name": "Toque Acelerador",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "1d10"
      },
      {
        "id": "ord-thr-sempiternal-ab-2",
        "name": "Correntes De Lodo",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "20d6"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-succ",
    "name": "Succ",
    "vd": 40,
    "group": "morte",
    "subGroup": "Criatura Paranormal",
    "element": "Morte",
    "secondaryElements": [
      "Energia"
    ],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 65,
    "machucadoHp": 32,
    "defense": 20,
    "initiativeDice": 4,
    "initiativeBonus": 5,
    "displacement": "12m / 8q",
    "senses": "Percepção às cegas",
    "resistances": "Corte, impacto e perfuração 5, Morte 10",
    "vulnerabilities": "Energia",
    "attributes": {
      "agi": 4,
      "for": 2,
      "int": 0,
      "pre": 1,
      "vig": 1
    },
    "skills": [
      {
        "id": "ord-thr-succ-percepcao",
        "name": "Percepção",
        "diceCount": 1,
        "bonus": 5
      },
      {
        "id": "ord-thr-succ-fortitude",
        "name": "Fortitude",
        "diceCount": 1,
        "bonus": 0
      },
      {
        "id": "ord-thr-succ-reflexos",
        "name": "Reflexos",
        "diceCount": 4,
        "bonus": 10
      },
      {
        "id": "ord-thr-succ-vontade",
        "name": "Vontade",
        "diceCount": 1,
        "bonus": 5
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-succ-atk-1",
        "name": "Mordida",
        "diceCount": 4,
        "attackBonus": 10,
        "damageFormula": "2d8+2",
        "critRange": "20/x2",
        "damageType": "Perfuração",
        "isMelee": true,
        "range": "Corpo a corpo"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-succ-ab-1",
        "name": "Sucção",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-o-deus-da-morte",
    "name": "O Deus da Morte",
    "vd": 400,
    "group": "morte",
    "subGroup": "Relíquia",
    "element": "Morte",
    "secondaryElements": [
      "Conhecimento",
      "Medo"
    ],
    "creatureType": "Relíquia",
    "size": "Grande",
    "hpMax": 2000,
    "machucadoHp": 1000,
    "defense": 60,
    "initiativeDice": 6,
    "initiativeBonus": 30,
    "displacement": "15m / 10q",
    "senses": "Percepção às cegas",
    "resistances": "Corte, impacto e perfuração 20",
    "immunities": "Atordoado, condições de paralisia, dano e efeitos de Morte",
    "vulnerabilities": "Energia",
    "attributes": {
      "agi": 6,
      "for": 6,
      "int": 5,
      "pre": 5,
      "vig": 7
    },
    "skills": [
      {
        "id": "ord-thr-o-deus-da-morte-percepcao",
        "name": "Percepção",
        "diceCount": 5,
        "bonus": 30
      },
      {
        "id": "ord-thr-o-deus-da-morte-fortitude",
        "name": "Fortitude",
        "diceCount": 7,
        "bonus": 35
      },
      {
        "id": "ord-thr-o-deus-da-morte-reflexos",
        "name": "Reflexos",
        "diceCount": 6,
        "bonus": 35
      },
      {
        "id": "ord-thr-o-deus-da-morte-vontade",
        "name": "Vontade",
        "diceCount": 5,
        "bonus": 35
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-o-deus-da-morte-atk-1",
        "name": "Soco Espiral",
        "diceCount": 6,
        "attackBonus": 45,
        "damageFormula": "5d10+50",
        "critRange": "20/x2",
        "damageType": "Morte",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": true,
    "specialAbilities": [
      {
        "id": "ord-thr-o-deus-da-morte-ab-1",
        "name": "Ciclo Infinito",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-o-deus-da-morte-ab-2",
        "name": "Destruir O Diabo",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-o-deus-da-morte-ab-3",
        "name": "Potência De Morte",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-o-deus-da-morte-ab-4",
        "name": "Senhor Do Tempo",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-o-deus-da-morte-ab-5",
        "name": "Agarrão",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-o-deus-da-morte-ab-6",
        "name": "Controlar Relógio Interno",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-o-deus-da-morte-ab-7",
        "name": "Controlar Mortos",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-o-deus-da-morte-ab-8",
        "name": "Espiral Descendente",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-o-deus-da-morte-ab-9",
        "name": "Espiral Destrutiva",
        "actionType": "Padrão",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "10d10+50"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa.",
    "enigmaOfFear": "Enigma de Medo — consulte o Livro de Regras v1.3 para a condição de resolução."
  },
  {
    "id": "ord-thr-anjo",
    "name": "Anjo",
    "vd": 380,
    "group": "conhecimento",
    "subGroup": "Criatura Paranormal",
    "element": "Conhecimento",
    "secondaryElements": [
      "Medo"
    ],
    "creatureType": "Criatura",
    "size": "Enorme",
    "hpMax": 1111,
    "machucadoHp": 555,
    "defense": 57,
    "initiativeDice": 4,
    "initiativeBonus": 25,
    "displacement": "Voo 24m / 16q",
    "senses": "Percepção às cegas",
    "resistances": "Dano 50",
    "immunities": "Condições de paralisia, dano e efeitos de Conhecimento",
    "vulnerabilities": "Sangue",
    "attributes": {
      "agi": 4,
      "for": 5,
      "int": 5,
      "pre": 5,
      "vig": 5
    },
    "skills": [
      {
        "id": "ord-thr-anjo-percepcao",
        "name": "Percepção",
        "diceCount": 5,
        "bonus": 25
      },
      {
        "id": "ord-thr-anjo-fortitude",
        "name": "Fortitude",
        "diceCount": 5,
        "bonus": 25
      },
      {
        "id": "ord-thr-anjo-reflexos",
        "name": "Reflexos",
        "diceCount": 4,
        "bonus": 25
      },
      {
        "id": "ord-thr-anjo-vontade",
        "name": "Vontade",
        "diceCount": 5,
        "bonus": 30
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-anjo-atk-1",
        "name": "Asas Do Conhecimento",
        "diceCount": 5,
        "attackBonus": 40,
        "damageFormula": "4d10+40",
        "critRange": "20/x2",
        "damageType": "Conhecimento",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      },
      {
        "id": "ord-thr-anjo-atk-2",
        "name": "Olhares Do Saber",
        "diceCount": 4,
        "attackBonus": 40,
        "damageFormula": "6d8+20",
        "critRange": "20/x2",
        "damageType": "Conhecimento",
        "isMelee": false,
        "range": "Distância (Longo)",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": true,
    "enigmaOfFear": "Enigma de Medo — consulte o Livro de Regras v1.3 para a condição de resolução.",
    "specialAbilities": [
      {
        "id": "ord-thr-anjo-ab-1",
        "name": "Julgamento",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-anjo-ab-2",
        "name": "Faixas Detentoras",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-anjo-ab-3",
        "name": "Chamas Reveladoras",
        "actionType": "Padrão",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "10d8"
      },
      {
        "id": "ord-thr-anjo-ab-4",
        "name": "Raio Dourado",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "15d8+50"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-bicho-papao",
    "name": "Bicho-Papão",
    "vd": 300,
    "group": "conhecimento",
    "subGroup": "Criatura Paranormal",
    "element": "Conhecimento",
    "secondaryElements": [
      "Medo"
    ],
    "creatureType": "Criatura",
    "size": "Grande",
    "hpMax": 750,
    "machucadoHp": 375,
    "defense": 41,
    "initiativeDice": 5,
    "initiativeBonus": 20,
    "displacement": "15m / 10q",
    "senses": "Percepção às cegas",
    "resistances": "Balístico, corte, impacto e Conhecimento 20",
    "vulnerabilities": "Sangue",
    "attributes": {
      "agi": 5,
      "for": 4,
      "int": 3,
      "pre": 5,
      "vig": 4
    },
    "skills": [
      {
        "id": "ord-thr-bicho-papao-percepcao",
        "name": "Percepção",
        "diceCount": 5,
        "bonus": 20
      },
      {
        "id": "ord-thr-bicho-papao-fortitude",
        "name": "Fortitude",
        "diceCount": 4,
        "bonus": 15
      },
      {
        "id": "ord-thr-bicho-papao-reflexos",
        "name": "Reflexos",
        "diceCount": 5,
        "bonus": 25
      },
      {
        "id": "ord-thr-bicho-papao-vontade",
        "name": "Vontade",
        "diceCount": 5,
        "bonus": 20
      },
      {
        "id": "ord-thr-bicho-papao-furtividade",
        "name": "Furtividade",
        "diceCount": 4,
        "bonus": 15
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-bicho-papao-atk-1",
        "name": "Garras Atormentadoras",
        "diceCount": 5,
        "attackBonus": 35,
        "damageFormula": "4d10+10",
        "critRange": "20/x2",
        "damageType": "Conhecimento",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x3"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-bicho-papao-ab-1",
        "name": "Tamanho Adaptável",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-bicho-papao-ab-2",
        "name": "Tormento Infantil",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-bicho-papao-ab-3",
        "name": "Destruir Mente",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "1d8"
      },
      {
        "id": "ord-thr-bicho-papao-ab-4",
        "name": "Atormentar",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "3d8"
      },
      {
        "id": "ord-thr-bicho-papao-ab-5",
        "name": "Saltar E Assustar",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "10d8"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-espreitador",
    "name": "Espreitador",
    "vd": 220,
    "group": "conhecimento",
    "subGroup": "Criatura Paranormal",
    "element": "Conhecimento",
    "secondaryElements": [
      "Medo"
    ],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 500,
    "machucadoHp": 250,
    "defense": 34,
    "initiativeDice": 4,
    "initiativeBonus": 15,
    "displacement": "12m / 8q",
    "senses": "Percepção às cegas",
    "immunities": "Dano",
    "vulnerabilities": "Sangue",
    "attributes": {
      "agi": 4,
      "for": 2,
      "int": 3,
      "pre": 3,
      "vig": 2
    },
    "skills": [
      {
        "id": "ord-thr-espreitador-percepcao",
        "name": "Percepção",
        "diceCount": 3,
        "bonus": 15
      },
      {
        "id": "ord-thr-espreitador-fortitude",
        "name": "Fortitude",
        "diceCount": 2,
        "bonus": 10
      },
      {
        "id": "ord-thr-espreitador-reflexos",
        "name": "Reflexos",
        "diceCount": 4,
        "bonus": 15
      },
      {
        "id": "ord-thr-espreitador-vontade",
        "name": "Vontade",
        "diceCount": 3,
        "bonus": 15
      },
      {
        "id": "ord-thr-espreitador-furtividade",
        "name": "Furtividade",
        "diceCount": 4,
        "bonus": 20
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-espreitador-atk-1",
        "name": "Pancada",
        "diceCount": 2,
        "attackBonus": 10,
        "damageFormula": "1d6+2",
        "critRange": "20/x2",
        "damageType": "Impacto",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": true,
    "enigmaOfFear": "Enigma de Medo — consulte o Livro de Regras v1.3 para a condição de resolução.",
    "specialAbilities": [
      {
        "id": "ord-thr-espreitador-ab-1",
        "name": "Correr Pelas Frestas",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-espreitador-ab-2",
        "name": "Espreitar",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "10d6"
      },
      {
        "id": "ord-thr-espreitador-ab-3",
        "name": "Cópia Observada",
        "actionType": "Padrão",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-estrangeiro",
    "name": "Estrangeiro",
    "vd": 340,
    "group": "conhecimento",
    "subGroup": "Criatura Paranormal",
    "element": "Conhecimento",
    "secondaryElements": [
      "Energia",
      "Medo"
    ],
    "creatureType": "Criatura",
    "size": "Grande",
    "hpMax": 750,
    "machucadoHp": 375,
    "defense": 50,
    "initiativeDice": 3,
    "initiativeBonus": 20,
    "displacement": "Voo 15m / 10q",
    "senses": "Percepção às cegas",
    "immunities": "Dano",
    "vulnerabilities": "Sangue",
    "attributes": {
      "agi": 3,
      "for": 5,
      "int": 5,
      "pre": 5,
      "vig": 3
    },
    "skills": [
      {
        "id": "ord-thr-estrangeiro-percepcao",
        "name": "Percepção",
        "diceCount": 5,
        "bonus": 25
      },
      {
        "id": "ord-thr-estrangeiro-fortitude",
        "name": "Fortitude",
        "diceCount": 3,
        "bonus": 15
      },
      {
        "id": "ord-thr-estrangeiro-reflexos",
        "name": "Reflexos",
        "diceCount": 3,
        "bonus": 20
      },
      {
        "id": "ord-thr-estrangeiro-vontade",
        "name": "Vontade",
        "diceCount": 5,
        "bonus": 25
      },
      {
        "id": "ord-thr-estrangeiro-ciencia",
        "name": "Ciência",
        "diceCount": 1,
        "bonus": 0
      },
      {
        "id": "ord-thr-estrangeiro-furtividade",
        "name": "Furtividade",
        "diceCount": 5,
        "bonus": 20
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-estrangeiro-atk-1",
        "name": "Toque Sutil",
        "diceCount": 5,
        "attackBonus": 35,
        "damageFormula": "4d8+10",
        "critRange": "20/x2",
        "damageType": "Conhecimento",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x3"
      },
      {
        "id": "ord-thr-estrangeiro-atk-2",
        "name": "Rajada Psíquica",
        "diceCount": 5,
        "attackBonus": 35,
        "damageFormula": "4d10+20",
        "critRange": "20/x2",
        "damageType": "Conhecimento",
        "isMelee": false,
        "range": "Distância (Extremo)",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": true,
    "enigmaOfFear": "Enigma de Medo — consulte o Livro de Regras v1.3 para a condição de resolução.",
    "specialAbilities": [
      {
        "id": "ord-thr-estrangeiro-ab-1",
        "name": "Comandar",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-estrangeiro-ab-2",
        "name": "Apagar Memória",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "1d4"
      },
      {
        "id": "ord-thr-estrangeiro-ab-3",
        "name": "Oblívio",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-estrangeiro-ab-4",
        "name": "Incubar",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "1d6"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-existido",
    "name": "Existido",
    "vd": 20,
    "group": "conhecimento",
    "subGroup": "Criatura Paranormal",
    "element": "Conhecimento",
    "secondaryElements": [],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 36,
    "machucadoHp": 18,
    "defense": 13,
    "initiativeDice": 1,
    "initiativeBonus": 5,
    "displacement": "9m / 6q",
    "senses": "Percepção às cegas",
    "resistances": "Balístico, corte e impacto 5, Conhecimento 10",
    "vulnerabilities": "Sangue",
    "attributes": {
      "agi": 1,
      "for": 1,
      "int": 4,
      "pre": 2,
      "vig": 2
    },
    "skills": [
      {
        "id": "ord-thr-existido-percepcao",
        "name": "Percepção",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-existido-fortitude",
        "name": "Fortitude",
        "diceCount": 2,
        "bonus": 0
      },
      {
        "id": "ord-thr-existido-reflexos",
        "name": "Reflexos",
        "diceCount": 1,
        "bonus": 0
      },
      {
        "id": "ord-thr-existido-vontade",
        "name": "Vontade",
        "diceCount": 2,
        "bonus": 10
      },
      {
        "id": "ord-thr-existido-ciencias",
        "name": "Ciências",
        "diceCount": 1,
        "bonus": 0
      },
      {
        "id": "ord-thr-existido-cultismo",
        "name": "Cultismo",
        "diceCount": 4,
        "bonus": 10
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-existido-atk-1",
        "name": "Pancada",
        "diceCount": 1,
        "attackBonus": 5,
        "damageFormula": "1d4+1",
        "critRange": "20/x2",
        "damageType": "Impacto",
        "isMelee": true,
        "range": "Corpo a corpo"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-existido-ab-1",
        "name": "Brilho Enlouquecedor",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "1d6"
      },
      {
        "id": "ord-thr-existido-ab-2",
        "name": "Fortalecimento Paranormal",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-existido-ab-3",
        "name": "Existido",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-lembrado",
    "name": "Lembrado",
    "vd": 100,
    "group": "conhecimento",
    "subGroup": "Criatura Paranormal",
    "element": "Conhecimento",
    "secondaryElements": [],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 180,
    "machucadoHp": 90,
    "defense": 22,
    "initiativeDice": 2,
    "initiativeBonus": 10,
    "displacement": "9m / 6q",
    "senses": "Percepção às cegas",
    "resistances": "Balístico, corte e impacto 10, Conhecimento 20",
    "vulnerabilities": "Sangue",
    "attributes": {
      "agi": 2,
      "for": 2,
      "int": 4,
      "pre": 2,
      "vig": 2
    },
    "skills": [
      {
        "id": "ord-thr-lembrado-percepcao",
        "name": "Percepção",
        "diceCount": 2,
        "bonus": 10
      },
      {
        "id": "ord-thr-lembrado-fortitude",
        "name": "Fortitude",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-lembrado-reflexos",
        "name": "Reflexos",
        "diceCount": 2,
        "bonus": 0
      },
      {
        "id": "ord-thr-lembrado-vontade",
        "name": "Vontade",
        "diceCount": 2,
        "bonus": 10
      },
      {
        "id": "ord-thr-lembrado-ciencias",
        "name": "Ciências",
        "diceCount": 4,
        "bonus": 10
      },
      {
        "id": "ord-thr-lembrado-ocultismo",
        "name": "Ocultismo",
        "diceCount": 4,
        "bonus": 10
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-lembrado-atk-1",
        "name": "Pancada",
        "diceCount": 2,
        "attackBonus": 5,
        "damageFormula": "2d4+7",
        "critRange": "20/x2",
        "damageType": "Impacto",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-lembrado-ab-1",
        "name": "Aura Manifestada",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-lembrado-ab-2",
        "name": "Expandir Aura",
        "actionType": "Padrão",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "6d6"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-ocioso",
    "name": "Ocioso",
    "vd": 260,
    "group": "conhecimento",
    "subGroup": "Criatura Paranormal",
    "element": "Conhecimento",
    "secondaryElements": [
      "Medo"
    ],
    "creatureType": "Criatura",
    "size": "Grande",
    "hpMax": 390,
    "machucadoHp": 195,
    "defense": 37,
    "initiativeDice": 1,
    "initiativeBonus": 0,
    "displacement": "Voo 0m / 0q",
    "senses": "Percepção às cegas",
    "resistances": "Balístico, corte, impacto e Conhecimento 20",
    "vulnerabilities": "Sangue",
    "attributes": {
      "agi": 1,
      "for": 5,
      "int": 1,
      "pre": 5,
      "vig": 3
    },
    "skills": [
      {
        "id": "ord-thr-ocioso-percepcao",
        "name": "Percepção",
        "diceCount": 5,
        "bonus": 15
      },
      {
        "id": "ord-thr-ocioso-fortitude",
        "name": "Fortitude",
        "diceCount": 3,
        "bonus": 15
      },
      {
        "id": "ord-thr-ocioso-reflexos",
        "name": "Reflexos",
        "diceCount": 1,
        "bonus": 0
      },
      {
        "id": "ord-thr-ocioso-vontade",
        "name": "Vontade",
        "diceCount": 5,
        "bonus": 20
      }
    ],
    "attacks": [],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-ocioso-ab-1",
        "name": "Sempre Presente",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-ocioso-ab-2",
        "name": "Retaliação",
        "actionType": "Reação",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-ocioso-ab-3",
        "name": "Permanecer Próximo",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-ocioso-ab-4",
        "name": "Aterrorizar",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "4d10+10"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-parasita-de-culpa",
    "name": "Parasita de Culpa",
    "vd": 60,
    "group": "conhecimento",
    "subGroup": "Criatura Paranormal",
    "element": "Conhecimento",
    "secondaryElements": [
      "Sangue",
      "Morte",
      "Medo"
    ],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 90,
    "machucadoHp": 45,
    "defense": 15,
    "initiativeDice": 2,
    "initiativeBonus": 0,
    "displacement": "6m / 4q",
    "senses": "Percepção às cegas",
    "immunities": "Dano (exceto causado pelo hospedeiro)",
    "attributes": {
      "agi": 2,
      "for": 0,
      "int": 4,
      "pre": 4,
      "vig": 1
    },
    "skills": [
      {
        "id": "ord-thr-parasita-de-culpa-percepcao",
        "name": "Percepção",
        "diceCount": 4,
        "bonus": 0
      },
      {
        "id": "ord-thr-parasita-de-culpa-fortitude",
        "name": "Fortitude",
        "diceCount": 1,
        "bonus": 10
      },
      {
        "id": "ord-thr-parasita-de-culpa-reflexos",
        "name": "Reflexos",
        "diceCount": 2,
        "bonus": 10
      },
      {
        "id": "ord-thr-parasita-de-culpa-vontade",
        "name": "Vontade",
        "diceCount": 4,
        "bonus": 10
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-parasita-de-culpa-atk-1",
        "name": "Pancada",
        "diceCount": 1,
        "attackBonus": 0,
        "damageFormula": "1d4",
        "critRange": "20/x2",
        "damageType": "Impacto",
        "isMelee": true,
        "range": "Corpo a corpo"
      }
    ],
    "hasEnigmaOfFear": true,
    "enigmaOfFear": "Enigma de Medo — consulte o Livro de Regras v1.3 para a condição de resolução.",
    "specialAbilities": [
      {
        "id": "ord-thr-parasita-de-culpa-ab-1",
        "name": "Devorar Culpa",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-parasita-de-culpa-ab-2",
        "name": "Fixar",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-parasita-de-culpa-ab-3",
        "name": "Atormentar",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "2d6"
      },
      {
        "id": "ord-thr-parasita-de-culpa-ab-4",
        "name": "Cópias Do Hospedeiro",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-rastejador-sombrio",
    "name": "Rastejador Sombrio",
    "vd": 180,
    "group": "conhecimento",
    "subGroup": "Criatura Paranormal",
    "element": "Conhecimento",
    "secondaryElements": [
      "Sangue"
    ],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 330,
    "machucadoHp": 165,
    "defense": 41,
    "initiativeDice": 4,
    "initiativeBonus": 15,
    "displacement": "12m / 8q",
    "senses": "Percepção às cegas",
    "resistances": "Balístico, corte e impacto 10, Conhecimento 20",
    "vulnerabilities": "Sangue",
    "attributes": {
      "agi": 4,
      "for": 3,
      "int": 3,
      "pre": 3,
      "vig": 3
    },
    "skills": [
      {
        "id": "ord-thr-rastejador-sombrio-percepcao",
        "name": "Percepção",
        "diceCount": 3,
        "bonus": 15
      },
      {
        "id": "ord-thr-rastejador-sombrio-fortitude",
        "name": "Fortitude",
        "diceCount": 3,
        "bonus": 15
      },
      {
        "id": "ord-thr-rastejador-sombrio-reflexos",
        "name": "Reflexos",
        "diceCount": 4,
        "bonus": 15
      },
      {
        "id": "ord-thr-rastejador-sombrio-vontade",
        "name": "Vontade",
        "diceCount": 3,
        "bonus": 10
      },
      {
        "id": "ord-thr-rastejador-sombrio-furtividade",
        "name": "Furtividade",
        "diceCount": 1,
        "bonus": 0
      },
      {
        "id": "ord-thr-rastejador-sombrio-cultismo",
        "name": "Cultismo",
        "diceCount": 4,
        "bonus": 15
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-rastejador-sombrio-atk-1",
        "name": "Toque Da Dor",
        "diceCount": 4,
        "attackBonus": 20,
        "damageFormula": "4d8+5",
        "critRange": "20/x2",
        "damageType": "Conhecimento",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x3"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-rastejador-sombrio-ab-1",
        "name": "Vulnerabilidade A Luz",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-rastejador-sombrio-ab-2",
        "name": "Desespero",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-rastejador-sombrio-ab-3",
        "name": "Rastejar",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-rastejador-sombrio-ab-4",
        "name": "Tentáculos Das Sombras",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "4d6"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-silhueta",
    "name": "Silhueta",
    "vd": 360,
    "group": "conhecimento",
    "subGroup": "Criatura Paranormal",
    "element": "Conhecimento",
    "secondaryElements": [
      "Medo"
    ],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 500,
    "machucadoHp": 250,
    "defense": 55,
    "initiativeDice": 4,
    "initiativeBonus": 20,
    "displacement": "12m / 8q",
    "senses": "Percepção às cegas",
    "resistances": "Dano 30",
    "immunities": "Condições de paralisia, efeitos e dano de Conhecimento",
    "vulnerabilities": "Sangue",
    "attributes": {
      "agi": 4,
      "for": 4,
      "int": 5,
      "pre": 5,
      "vig": 4
    },
    "skills": [
      {
        "id": "ord-thr-silhueta-percepcao",
        "name": "Percepção",
        "diceCount": 5,
        "bonus": 25
      },
      {
        "id": "ord-thr-silhueta-fortitude",
        "name": "Fortitude",
        "diceCount": 4,
        "bonus": 20
      },
      {
        "id": "ord-thr-silhueta-reflexos",
        "name": "Reflexos",
        "diceCount": 4,
        "bonus": 20
      },
      {
        "id": "ord-thr-silhueta-vontade",
        "name": "Vontade",
        "diceCount": 5,
        "bonus": 25
      }
    ],
    "attacks": [],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-silhueta-ab-1",
        "name": "Aura Tangível",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "20d12"
      },
      {
        "id": "ord-thr-silhueta-ab-2",
        "name": "Conhecimento Verdadeiro",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-silhueta-ab-3",
        "name": "Reescrever A Realidade",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-silhueta-ab-4",
        "name": "Toque Devastador",
        "actionType": "Padrão",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-vulto",
    "name": "Vulto",
    "vd": 40,
    "group": "conhecimento",
    "subGroup": "Criatura Paranormal",
    "element": "Conhecimento",
    "secondaryElements": [],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 60,
    "machucadoHp": 30,
    "defense": 19,
    "initiativeDice": 4,
    "initiativeBonus": 5,
    "displacement": "12m / 8q",
    "senses": "Percepção às cegas",
    "resistances": "Balístico, corte e perfuração 5, Conhecimento 10",
    "vulnerabilities": "Sangue",
    "attributes": {
      "agi": 4,
      "for": 2,
      "int": 2,
      "pre": 2,
      "vig": 1
    },
    "skills": [
      {
        "id": "ord-thr-vulto-percepcao",
        "name": "Percepção",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-vulto-fortitude",
        "name": "Fortitude",
        "diceCount": 1,
        "bonus": 0
      },
      {
        "id": "ord-thr-vulto-reflexos",
        "name": "Reflexos",
        "diceCount": 4,
        "bonus": 5
      },
      {
        "id": "ord-thr-vulto-vontade",
        "name": "Vontade",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-vulto-furtividade",
        "name": "Furtividade",
        "diceCount": 4,
        "bonus": 10
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-vulto-atk-1",
        "name": "Toque Macabro",
        "diceCount": 4,
        "attackBonus": 10,
        "damageFormula": "2d6",
        "critRange": "20/x2",
        "damageType": "Conhecimento",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-vulto-ab-1",
        "name": "Aura Tangível",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "2d6"
      },
      {
        "id": "ord-thr-vulto-ab-2",
        "name": "Plantar Paranoia",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-vulto-ab-3",
        "name": "Áscara Do Desespero",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-mascara-do-desespero",
    "name": "Máscara do Desespero",
    "vd": 400,
    "group": "conhecimento",
    "subGroup": "Relíquia",
    "element": "Conhecimento",
    "secondaryElements": [
      "Medo"
    ],
    "creatureType": "Relíquia",
    "size": "Minúsculo",
    "hpMax": 1200,
    "machucadoHp": 600,
    "defense": 55,
    "initiativeDice": 4,
    "initiativeBonus": 25,
    "displacement": "Voo 12m / 8q",
    "senses": "Percepção às cegas",
    "immunities": "Condições, dano",
    "vulnerabilities": "Sangue",
    "attributes": {
      "agi": 4,
      "for": 4,
      "int": 6,
      "pre": 6,
      "vig": 5
    },
    "skills": [
      {
        "id": "ord-thr-mascara-do-desespero-percepcao",
        "name": "Percepção",
        "diceCount": 6,
        "bonus": 35
      },
      {
        "id": "ord-thr-mascara-do-desespero-fortitude",
        "name": "Fortitude",
        "diceCount": 5,
        "bonus": 35
      },
      {
        "id": "ord-thr-mascara-do-desespero-reflexos",
        "name": "Reflexos",
        "diceCount": 4,
        "bonus": 25
      },
      {
        "id": "ord-thr-mascara-do-desespero-vontade",
        "name": "Vontade",
        "diceCount": 6,
        "bonus": 35
      },
      {
        "id": "ord-thr-mascara-do-desespero-ciencia",
        "name": "Ciência",
        "diceCount": 1,
        "bonus": 0
      },
      {
        "id": "ord-thr-mascara-do-desespero-religiao",
        "name": "Religião",
        "diceCount": 6,
        "bonus": 35
      }
    ],
    "attacks": [],
    "hasEnigmaOfFear": true,
    "enigmaOfFear": "Enigma de Medo — consulte o Livro de Regras v1.3 para a condição de resolução.",
    "specialAbilities": [
      {
        "id": "ord-thr-mascara-do-desespero-ab-1",
        "name": "Destronar O Anfitrião",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-mascara-do-desespero-ab-2",
        "name": "Potência Do Conhecimento",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-mascara-do-desespero-ab-3",
        "name": "Conjuração Verdadeira",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-mascara-do-desespero-ab-4",
        "name": "Onipresença",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-mascara-do-desespero-ab-5",
        "name": "Reescrever Realidade",
        "actionType": "Padrão",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "10d6"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-anarquico",
    "name": "Anárquico",
    "vd": 20,
    "group": "energia",
    "subGroup": "Criatura Paranormal",
    "element": "Energia",
    "secondaryElements": [],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 30,
    "machucadoHp": 15,
    "defense": 21,
    "initiativeDice": 3,
    "initiativeBonus": 5,
    "displacement": "9m / 6q",
    "senses": "Visão no escuro",
    "resistances": "Energia 5",
    "vulnerabilities": "Conhecimento",
    "attributes": {
      "agi": 3,
      "for": 2,
      "int": 0,
      "pre": 0,
      "vig": 1
    },
    "skills": [
      {
        "id": "ord-thr-anarquico-percepcao",
        "name": "Percepção",
        "diceCount": -2,
        "bonus": 0
      },
      {
        "id": "ord-thr-anarquico-fortitude",
        "name": "Fortitude",
        "diceCount": 1,
        "bonus": 0
      },
      {
        "id": "ord-thr-anarquico-reflexos",
        "name": "Reflexos",
        "diceCount": 3,
        "bonus": 10
      },
      {
        "id": "ord-thr-anarquico-vontade",
        "name": "Vontade",
        "diceCount": -2,
        "bonus": 0
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-anarquico-atk-1",
        "name": "Pancada Errática",
        "diceCount": 2,
        "attackBonus": 5,
        "damageFormula": "2d12",
        "critRange": "20/x2",
        "damageType": "Impacto",
        "isMelee": true,
        "range": "Corpo a corpo"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-anarquico-ab-1",
        "name": "Comportamento Errático",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "1d6"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-anarquico-descontrolado",
    "name": "Anárquico Descontrolado",
    "vd": 120,
    "group": "energia",
    "subGroup": "Criatura Paranormal",
    "element": "Energia",
    "secondaryElements": [],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 120,
    "machucadoHp": 60,
    "defense": 28,
    "initiativeDice": 4,
    "initiativeBonus": 10,
    "displacement": "12m / 8q",
    "senses": "Visão no escuro",
    "resistances": "Balístico, corte e perfuração 10, Energia 20",
    "vulnerabilities": "Conhecimento",
    "attributes": {
      "agi": 4,
      "for": 3,
      "int": 2,
      "pre": 2,
      "vig": 3
    },
    "skills": [
      {
        "id": "ord-thr-anarquico-descontrolado-percepcao",
        "name": "Percepção",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-anarquico-descontrolado-fortitude",
        "name": "Fortitude",
        "diceCount": 3,
        "bonus": 10
      },
      {
        "id": "ord-thr-anarquico-descontrolado-reflexos",
        "name": "Reflexos",
        "diceCount": 4,
        "bonus": 10
      },
      {
        "id": "ord-thr-anarquico-descontrolado-vontade",
        "name": "Vontade",
        "diceCount": 2,
        "bonus": 5
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-anarquico-descontrolado-atk-1",
        "name": "Pancada Energética",
        "diceCount": 4,
        "attackBonus": 15,
        "damageFormula": "4d12",
        "critRange": "20/x2",
        "damageType": "Impacto",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-anarquico-descontrolado-ab-1",
        "name": "Aceleração",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "4d12"
      },
      {
        "id": "ord-thr-anarquico-descontrolado-ab-2",
        "name": "Autodestruição",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "8d12"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-anomalia",
    "name": "Anomalia",
    "vd": 380,
    "group": "energia",
    "subGroup": "Criatura Paranormal",
    "element": "Energia",
    "secondaryElements": [
      "Conhecimento",
      "Medo"
    ],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 1000,
    "machucadoHp": 500,
    "defense": 0,
    "initiativeDice": 1,
    "initiativeBonus": 0,
    "displacement": "0m / 0q",
    "senses": "Visão no escuro",
    "immunities": "Dano e todas as condições",
    "vulnerabilities": "Conhecimento",
    "attributes": {
      "agi": 1,
      "for": 1,
      "int": 1,
      "pre": 1,
      "vig": 1
    },
    "skills": [
      {
        "id": "ord-thr-anomalia-fortitude",
        "name": "Fortitude",
        "diceCount": 5,
        "bonus": 15
      },
      {
        "id": "ord-thr-anomalia-reflexos",
        "name": "Reflexos",
        "diceCount": 5,
        "bonus": 15
      },
      {
        "id": "ord-thr-anomalia-vontade",
        "name": "Vontade",
        "diceCount": 5,
        "bonus": 15
      }
    ],
    "attacks": [],
    "hasEnigmaOfFear": true,
    "enigmaOfFear": "Enigma de Medo — consulte o Livro de Regras v1.3 para a condição de resolução.",
    "specialAbilities": [
      {
        "id": "ord-thr-anomalia-ab-1",
        "name": "Imaterial",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-anomalia-ab-2",
        "name": "Existência Impossível",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-anomalia-ab-3",
        "name": "Romper Consciência",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "10d6"
      },
      {
        "id": "ord-thr-anomalia-ab-4",
        "name": "Manipular Ondas Da Existência",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "2d12"
      },
      {
        "id": "ord-thr-anomalia-ab-5",
        "name": "Manifestar O Impossível",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-anomiatico",
    "name": "Anomiático",
    "vd": 240,
    "group": "energia",
    "subGroup": "Criatura Paranormal",
    "element": "Energia",
    "secondaryElements": [],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 600,
    "machucadoHp": 300,
    "defense": 41,
    "initiativeDice": 5,
    "initiativeBonus": 15,
    "displacement": "18m / 12q",
    "senses": "Visão no escuro",
    "resistances": "Balístico, corte e perfuração 10, Energia 20",
    "vulnerabilities": "Conhecimento",
    "attributes": {
      "agi": 5,
      "for": 3,
      "int": 1,
      "pre": 4,
      "vig": 3
    },
    "skills": [
      {
        "id": "ord-thr-anomiatico-percepcao",
        "name": "Percepção",
        "diceCount": 4,
        "bonus": 10
      },
      {
        "id": "ord-thr-anomiatico-fortitude",
        "name": "Fortitude",
        "diceCount": 3,
        "bonus": 10
      },
      {
        "id": "ord-thr-anomiatico-reflexos",
        "name": "Reflexos",
        "diceCount": 5,
        "bonus": 20
      },
      {
        "id": "ord-thr-anomiatico-vontade",
        "name": "Vontade",
        "diceCount": 4,
        "bonus": 15
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-anomiatico-atk-1",
        "name": "Garra Desintegradora",
        "diceCount": 5,
        "attackBonus": 30,
        "damageFormula": "4d12+20",
        "critRange": "20/x2",
        "damageType": "Energia",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-anomiatico-ab-1",
        "name": "Comportamento Errático",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "1d6"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-ciborgue",
    "name": "Ciborgue",
    "vd": 80,
    "group": "energia",
    "subGroup": "Criatura Paranormal",
    "element": "Energia",
    "secondaryElements": [
      "Sangue"
    ],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 160,
    "machucadoHp": 80,
    "defense": 25,
    "initiativeDice": 3,
    "initiativeBonus": 10,
    "displacement": "9m / 6q",
    "senses": "Visão no escuro",
    "resistances": "Balístico, corte e perfuração 10, Energia 20",
    "immunities": "Condições de paralisia",
    "vulnerabilities": "Conhecimento",
    "attributes": {
      "agi": 3,
      "for": 3,
      "int": 2,
      "pre": 2,
      "vig": 3
    },
    "skills": [
      {
        "id": "ord-thr-ciborgue-percepcao",
        "name": "Percepção",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-ciborgue-fortitude",
        "name": "Fortitude",
        "diceCount": 3,
        "bonus": 10
      },
      {
        "id": "ord-thr-ciborgue-reflexos",
        "name": "Reflexos",
        "diceCount": 3,
        "bonus": 5
      },
      {
        "id": "ord-thr-ciborgue-vontade",
        "name": "Vontade",
        "diceCount": 2,
        "bonus": 0
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-ciborgue-atk-1",
        "name": "Braço Laminado",
        "diceCount": 3,
        "attackBonus": 10,
        "damageFormula": "1d12+10",
        "critRange": "18/x2",
        "damageType": "Corte",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      },
      {
        "id": "ord-thr-ciborgue-atk-2",
        "name": "Estado BETA PADRÃO  AGREDIR PUNHO ENERGIZADO",
        "diceCount": 3,
        "attackBonus": 10,
        "damageFormula": "2d8+10",
        "critRange": "20/x2",
        "damageType": "Impacto",
        "isMelee": true,
        "range": "Corpo a corpo"
      },
      {
        "id": "ord-thr-ciborgue-atk-3",
        "name": "Canhão",
        "diceCount": 3,
        "attackBonus": 10,
        "damageFormula": "4d12+5",
        "critRange": "20/x2",
        "damageType": "Energia",
        "isMelee": false,
        "range": "Distância (Longo)"
      },
      {
        "id": "ord-thr-ciborgue-atk-4",
        "name": "Estado DELTA PADRÃO  AGREDIR RAIO ENERGÉTICO",
        "diceCount": 3,
        "attackBonus": 10,
        "damageFormula": "1d12+5",
        "critRange": "20/x2",
        "damageType": "Energia",
        "isMelee": false,
        "range": "Distância (Médio)"
      }
    ],
    "hasEnigmaOfFear": true,
    "enigmaOfFear": "Enigma de Medo — consulte o Livro de Regras v1.3 para a condição de resolução.",
    "specialAbilities": [
      {
        "id": "ord-thr-ciborgue-ab-1",
        "name": "Estado De Combate",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-ciborgue-ab-2",
        "name": "Regeneração Energética",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-ciborgue-ab-3",
        "name": "Investida Energética",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-ciborgue-ab-4",
        "name": "Criar Barreira",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-ciborgue-ab-5",
        "name": "Reiniciar",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-ciborgue-ab-6",
        "name": "Desorientar",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-infecticidio",
    "name": "Infecticídio",
    "vd": 280,
    "group": "energia",
    "subGroup": "Criatura Paranormal",
    "element": "Energia",
    "secondaryElements": [
      "Sangue"
    ],
    "creatureType": "Criatura",
    "size": "Enorme",
    "hpMax": 600,
    "machucadoHp": 300,
    "defense": 25,
    "initiativeDice": 3,
    "initiativeBonus": 15,
    "displacement": "9m / 6q",
    "senses": "Visão no escuro",
    "resistances": "Balístico, corte, perfuração e Energia 20",
    "vulnerabilities": "Conhecimento",
    "attributes": {
      "agi": 3,
      "for": 5,
      "int": 1,
      "pre": 1,
      "vig": 5
    },
    "skills": [
      {
        "id": "ord-thr-infecticidio-percepcao",
        "name": "Percepção",
        "diceCount": 1,
        "bonus": 10
      },
      {
        "id": "ord-thr-infecticidio-fortitude",
        "name": "Fortitude",
        "diceCount": 5,
        "bonus": 20
      },
      {
        "id": "ord-thr-infecticidio-reflexos",
        "name": "Reflexos",
        "diceCount": 3,
        "bonus": 15
      },
      {
        "id": "ord-thr-infecticidio-vontade",
        "name": "Vontade",
        "diceCount": 1,
        "bonus": 15
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-infecticidio-atk-1",
        "name": "Pancadas Infectadas",
        "diceCount": 5,
        "attackBonus": 30,
        "damageFormula": "4d12+20",
        "critRange": "20/x2",
        "damageType": "Energia",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x3"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-infecticidio-ab-1",
        "name": "Infecção",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-infecticidio-ab-2",
        "name": "Consumação Insidiosa",
        "actionType": "Reação",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-infecticidio-ab-3",
        "name": "Atropelar",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-perturbado-de-energia",
    "name": "Perturbado de Energia",
    "vd": 40,
    "group": "energia",
    "subGroup": "Criatura Paranormal",
    "element": "Energia",
    "secondaryElements": [],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 60,
    "machucadoHp": 30,
    "defense": 19,
    "initiativeDice": 4,
    "initiativeBonus": 10,
    "displacement": "9m / 6q",
    "senses": "Visão no escuro",
    "resistances": "Balístico, corte e perfuração 5, Energia 10",
    "vulnerabilities": "Conhecimento",
    "attributes": {
      "agi": 4,
      "for": 1,
      "int": 0,
      "pre": 0,
      "vig": 0
    },
    "skills": [
      {
        "id": "ord-thr-perturbado-de-energia-percepcao",
        "name": "Percepção",
        "diceCount": -2,
        "bonus": 0
      },
      {
        "id": "ord-thr-perturbado-de-energia-fortitude",
        "name": "Fortitude",
        "diceCount": -2,
        "bonus": 0
      },
      {
        "id": "ord-thr-perturbado-de-energia-reflexos",
        "name": "Reflexos",
        "diceCount": 4,
        "bonus": 10
      },
      {
        "id": "ord-thr-perturbado-de-energia-vontade",
        "name": "Vontade",
        "diceCount": -2,
        "bonus": 0
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-perturbado-de-energia-atk-1",
        "name": "Toque Plasmático",
        "diceCount": 4,
        "attackBonus": 10,
        "damageFormula": "2d12",
        "critRange": "20/x2",
        "damageType": "Energia",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-perturbado-de-energia-ab-1",
        "name": "Implantar Confusão",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "2d8"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-sukkalgir",
    "name": "Sukkalgir",
    "vd": 160,
    "group": "energia",
    "subGroup": "Criatura Paranormal",
    "element": "Energia",
    "secondaryElements": [
      "Conhecimento"
    ],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 220,
    "machucadoHp": 110,
    "defense": 34,
    "initiativeDice": 3,
    "initiativeBonus": 10,
    "displacement": "Voo 18m / 12q",
    "senses": "Visão no escuro",
    "resistances": "Impacto e Energia 10",
    "immunities": "Dano balístico, de corte e de perfuração",
    "vulnerabilities": "Conhecimento",
    "attributes": {
      "agi": 3,
      "for": 2,
      "int": 3,
      "pre": 3,
      "vig": 2
    },
    "skills": [
      {
        "id": "ord-thr-sukkalgir-percepcao",
        "name": "Percepção",
        "diceCount": 3,
        "bonus": 10
      },
      {
        "id": "ord-thr-sukkalgir-fortitude",
        "name": "Fortitude",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-sukkalgir-reflexos",
        "name": "Reflexos",
        "diceCount": 3,
        "bonus": 10
      },
      {
        "id": "ord-thr-sukkalgir-vontade",
        "name": "Vontade",
        "diceCount": 3,
        "bonus": 15
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-sukkalgir-atk-1",
        "name": "Mordida Do Outro Lado",
        "diceCount": 3,
        "attackBonus": 15,
        "damageFormula": "2d12",
        "critRange": "20/x2",
        "damageType": "Mental",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-sukkalgir-ab-1",
        "name": "Aura Desesperada",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "2d12"
      },
      {
        "id": "ord-thr-sukkalgir-ab-2",
        "name": "Espírito Plasmático",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-sukkalgir-ab-3",
        "name": "Agarrão",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-sukkalgir-ab-4",
        "name": "Grito De Desespero",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "3d12"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-telopsia",
    "name": "Telopsia",
    "vd": 340,
    "group": "energia",
    "subGroup": "Criatura Paranormal",
    "element": "Energia",
    "secondaryElements": [
      "Morte",
      "Medo"
    ],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 560,
    "machucadoHp": 280,
    "defense": 48,
    "initiativeDice": 4,
    "initiativeBonus": 20,
    "displacement": "12m / 8q",
    "senses": "Visão no escuro",
    "resistances": "Balístico, corte, perfuração e Energia 20",
    "immunities": "Condições de paralisia",
    "vulnerabilities": "Conhecimento",
    "attributes": {
      "agi": 4,
      "for": 2,
      "int": 3,
      "pre": 5,
      "vig": 2
    },
    "skills": [
      {
        "id": "ord-thr-telopsia-percepcao",
        "name": "Percepção",
        "diceCount": 5,
        "bonus": 25
      },
      {
        "id": "ord-thr-telopsia-fortitude",
        "name": "Fortitude",
        "diceCount": 2,
        "bonus": 15
      },
      {
        "id": "ord-thr-telopsia-reflexos",
        "name": "Reflexos",
        "diceCount": 4,
        "bonus": 20
      },
      {
        "id": "ord-thr-telopsia-vontade",
        "name": "Vontade",
        "diceCount": 5,
        "bonus": 25
      },
      {
        "id": "ord-thr-telopsia-furtividade",
        "name": "Furtividade",
        "diceCount": 4,
        "bonus": 20
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-telopsia-atk-1",
        "name": "Toque Desintegrador",
        "diceCount": 4,
        "attackBonus": 35,
        "damageFormula": "6d12+30",
        "critRange": "20/x2",
        "damageType": "Energia",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x3"
      }
    ],
    "hasEnigmaOfFear": true,
    "enigmaOfFear": "Enigma de Medo — consulte o Livro de Regras v1.3 para a condição de resolução.",
    "specialAbilities": [
      {
        "id": "ord-thr-telopsia-ab-1",
        "name": "Viajar Pela Tela",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-telopsia-ab-2",
        "name": "Tela Zumbificadora",
        "actionType": "Padrão",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "6d6"
      },
      {
        "id": "ord-thr-telopsia-ab-3",
        "name": "Prender Na Tela",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "2d12"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-tempestuoso",
    "name": "Tempestuoso",
    "vd": 360,
    "group": "energia",
    "subGroup": "Criatura Paranormal",
    "element": "Energia",
    "secondaryElements": [
      "Medo"
    ],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 950,
    "machucadoHp": 475,
    "defense": 56,
    "initiativeDice": 5,
    "initiativeBonus": 25,
    "displacement": "24m / 12q",
    "senses": "Visão no escuro",
    "resistances": "Balístico, corte, perfuração e Energia 20",
    "immunities": "Condições de paralisia",
    "vulnerabilities": "Conhecimento",
    "attributes": {
      "agi": 5,
      "for": 4,
      "int": 2,
      "pre": 5,
      "vig": 4
    },
    "skills": [
      {
        "id": "ord-thr-tempestuoso-percepcao",
        "name": "Percepção",
        "diceCount": 5,
        "bonus": 20
      },
      {
        "id": "ord-thr-tempestuoso-fortitude",
        "name": "Fortitude",
        "diceCount": 4,
        "bonus": 20
      },
      {
        "id": "ord-thr-tempestuoso-reflexos",
        "name": "Reflexos",
        "diceCount": 5,
        "bonus": 30
      },
      {
        "id": "ord-thr-tempestuoso-vontade",
        "name": "Vontade",
        "diceCount": 5,
        "bonus": 25
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-tempestuoso-atk-1",
        "name": "Garras Radioativas  *",
        "diceCount": 5,
        "attackBonus": 40,
        "damageFormula": "4d20+20",
        "critRange": "20/x2",
        "damageType": "Energia",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-tempestuoso-ab-1",
        "name": "Aura Radioativa",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-tempestuoso-ab-2",
        "name": "Espectro Radioativo",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-tempestuoso-ab-3",
        "name": "Raio De Energia Radioativa",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-tempestuoso-ab-4",
        "name": "Expandir Em Radiação",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-viajante",
    "name": "Viajante",
    "vd": 200,
    "group": "energia",
    "subGroup": "Criatura Paranormal",
    "element": "Energia",
    "secondaryElements": [
      "Conhecimento",
      "Medo"
    ],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 360,
    "machucadoHp": 180,
    "defense": 34,
    "initiativeDice": 4,
    "initiativeBonus": 15,
    "displacement": "9m 6q",
    "senses": "Visão no escuro",
    "resistances": "Balístico, corte e perfuração 10, Energia 20",
    "vulnerabilities": "Conhecimento",
    "attributes": {
      "agi": 4,
      "for": 2,
      "int": 3,
      "pre": 4,
      "vig": 2
    },
    "skills": [
      {
        "id": "ord-thr-viajante-percepcao",
        "name": "Percepção",
        "diceCount": 4,
        "bonus": 15
      },
      {
        "id": "ord-thr-viajante-fortitude",
        "name": "Fortitude",
        "diceCount": 2,
        "bonus": 10
      },
      {
        "id": "ord-thr-viajante-reflexos",
        "name": "Reflexos",
        "diceCount": 4,
        "bonus": 15
      },
      {
        "id": "ord-thr-viajante-vontade",
        "name": "Vontade",
        "diceCount": 4,
        "bonus": 15
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-viajante-atk-1",
        "name": "Pancada",
        "diceCount": 4,
        "attackBonus": 15,
        "damageFormula": "2d12+10",
        "critRange": "20/x2",
        "damageType": "Impacto",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": true,
    "enigmaOfFear": "Enigma de Medo — consulte o Livro de Regras v1.3 para a condição de resolução.",
    "specialAbilities": [
      {
        "id": "ord-thr-viajante-ab-1",
        "name": "Invisibilidade Permanente",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-viajante-ab-2",
        "name": "Agarrão",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-viajante-ab-3",
        "name": "Devorar Memória",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "4d12"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-anfitriao",
    "name": "Anfitrião",
    "vd": 413,
    "group": "energia",
    "subGroup": "Relíquia",
    "element": "Energia",
    "secondaryElements": [
      "Conhecimento",
      "Medo"
    ],
    "creatureType": "Relíquia",
    "size": "Médio",
    "hpMax": 1413,
    "machucadoHp": 706,
    "defense": 59,
    "initiativeDice": 7,
    "initiativeBonus": 35,
    "displacement": "12m / 8q",
    "senses": "Visão no escuro",
    "immunities": "Condições de paralisia, dano, dano e efeitos de Energia",
    "vulnerabilities": "Conhecimento",
    "attributes": {
      "agi": 7,
      "for": 5,
      "int": 6,
      "pre": 6,
      "vig": 5
    },
    "skills": [
      {
        "id": "ord-thr-anfitriao-percepcao",
        "name": "Percepção",
        "diceCount": 6,
        "bonus": 25
      },
      {
        "id": "ord-thr-anfitriao-fortitude",
        "name": "Fortitude",
        "diceCount": 5,
        "bonus": 25
      },
      {
        "id": "ord-thr-anfitriao-reflexos",
        "name": "Reflexos",
        "diceCount": 7,
        "bonus": 35
      },
      {
        "id": "ord-thr-anfitriao-vontade",
        "name": "Vontade",
        "diceCount": 6,
        "bonus": 25
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-anfitriao-atk-1",
        "name": "Corte Caótico",
        "diceCount": 7,
        "attackBonus": 45,
        "damageFormula": "3d12+20",
        "critRange": "20/x2",
        "damageType": "Energia",
        "isMelee": true,
        "range": "Corpo a corpo"
      },
      {
        "id": "ord-thr-anfitriao-atk-2",
        "name": "Lança E Adaga",
        "diceCount": 7,
        "attackBonus": 45,
        "damageFormula": "2d12+20",
        "critRange": "20/x2",
        "damageType": "Energia",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      },
      {
        "id": "ord-thr-anfitriao-atk-3",
        "name": "Corte De Água",
        "diceCount": 7,
        "attackBonus": 45,
        "damageFormula": "5d12+20",
        "critRange": "20/x2",
        "damageType": "Energia",
        "isMelee": true,
        "range": "Corpo a corpo"
      }
    ],
    "hasEnigmaOfFear": true,
    "enigmaOfFear": "Enigma de Medo — consulte o Livro de Regras v1.3 para a condição de resolução.",
    "specialAbilities": [
      {
        "id": "ord-thr-anfitriao-ab-1",
        "name": "Transformar A Morte",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-anfitriao-ab-2",
        "name": "Potência De Energia",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-anfitriao-ab-3",
        "name": "Ato 1",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-anfitriao-ab-4",
        "name": "Ato 2",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-anfitriao-ab-5",
        "name": "Trilha Sonora (Ato 2)",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "2d10"
      },
      {
        "id": "ord-thr-anfitriao-ab-6",
        "name": "Roleta Maluca (Ato 2)",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "1d6"
      },
      {
        "id": "ord-thr-anfitriao-ab-7",
        "name": "TEATRO (Amphitruo)",
        "actionType": "Padrão",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "10d6"
      },
      {
        "id": "ord-thr-anfitriao-ab-8",
        "name": "QUEIMAR (Aeneas)",
        "actionType": "Padrão",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "10d6+20"
      },
      {
        "id": "ord-thr-anfitriao-ab-9",
        "name": "ROMANCE FORÇADO (Liber)",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-anfitriao-ab-10",
        "name": "EU SOU O CAOS (Plautus)",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "4d12"
      },
      {
        "id": "ord-thr-anfitriao-ab-11",
        "name": "AFOGAMENTO (Silenus)",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-anfitriao-ab-12",
        "name": "Teletransporte",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-degolificada",
    "name": "Degolificada",
    "vd": 320,
    "group": "medo",
    "subGroup": "Criatura de Medo",
    "element": "Medo",
    "secondaryElements": [
      "Sangue",
      "Morte",
      "Conhecimento",
      "Energia"
    ],
    "creatureType": "Criatura",
    "size": "Médio",
    "hpMax": 850,
    "machucadoHp": 425,
    "defense": 45,
    "initiativeDice": 3,
    "initiativeBonus": 0,
    "displacement": "6m / 4q",
    "senses": "Percepção às cegas",
    "immunities": "Dano",
    "attributes": {
      "agi": 3,
      "for": 5,
      "int": 3,
      "pre": 4,
      "vig": 4
    },
    "skills": [
      {
        "id": "ord-thr-degolificada-percepcao",
        "name": "Percepção",
        "diceCount": 4,
        "bonus": 15
      },
      {
        "id": "ord-thr-degolificada-fortitude",
        "name": "Fortitude",
        "diceCount": 4,
        "bonus": 20
      },
      {
        "id": "ord-thr-degolificada-reflexos",
        "name": "Reflexos",
        "diceCount": 3,
        "bonus": 15
      },
      {
        "id": "ord-thr-degolificada-vontade",
        "name": "Vontade",
        "diceCount": 4,
        "bonus": 25
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-degolificada-atk-1",
        "name": "Pancada",
        "diceCount": 5,
        "attackBonus": 35,
        "damageFormula": "8d8+20",
        "critRange": "20/x2",
        "damageType": "Impacto",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": true,
    "enigmaOfFear": "Enigma de Medo — consulte o Livro de Regras v1.3 para a condição de resolução.",
    "specialAbilities": [
      {
        "id": "ord-thr-degolificada-ab-1",
        "name": "Agarrar E Estrangular",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-degolificada-ab-2",
        "name": "Grito Rasgado",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "4d10+10"
      },
      {
        "id": "ord-thr-degolificada-ab-3",
        "name": "Desfiguramento Capilar",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "10d6+20"
      },
      {
        "id": "ord-thr-degolificada-ab-4",
        "name": "Mecânica Especial: Metamorfose Da Degolificada",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-bandido",
    "name": "Bandido",
    "vd": 10,
    "group": "realidade",
    "subGroup": "Criminosos & Mercenários",
    "element": "Realidade",
    "secondaryElements": [],
    "creatureType": "Pessoa",
    "size": "Médio",
    "hpMax": 8,
    "machucadoHp": 4,
    "defense": 14,
    "initiativeDice": 2,
    "initiativeBonus": 5,
    "displacement": "9m / 6q",
    "attributes": {
      "agi": 2,
      "for": 2,
      "int": 1,
      "pre": 1,
      "vig": 1
    },
    "skills": [
      {
        "id": "ord-thr-bandido-percepcao",
        "name": "Percepção",
        "diceCount": 1,
        "bonus": 0
      },
      {
        "id": "ord-thr-bandido-fortitude",
        "name": "Fortitude",
        "diceCount": 1,
        "bonus": 0
      },
      {
        "id": "ord-thr-bandido-reflexos",
        "name": "Reflexos",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-bandido-vontade",
        "name": "Vontade",
        "diceCount": 1,
        "bonus": 0
      },
      {
        "id": "ord-thr-bandido-crime",
        "name": "Crime",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-bandido-furtividade",
        "name": "Furtividade",
        "diceCount": 2,
        "bonus": 5
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-bandido-atk-1",
        "name": "Faca",
        "diceCount": 2,
        "attackBonus": 5,
        "damageFormula": "1d4+2",
        "critRange": "20/x2",
        "damageType": "Perfuração",
        "isMelee": true,
        "range": "Corpo a corpo"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-bandido-ab-1",
        "name": "Ataque Furtivo",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "1d6"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-capanga",
    "name": "Capanga",
    "vd": 20,
    "group": "realidade",
    "subGroup": "Criminosos & Mercenários",
    "element": "Realidade",
    "secondaryElements": [],
    "creatureType": "Pessoa",
    "size": "Médio",
    "hpMax": 17,
    "machucadoHp": 8,
    "defense": 13,
    "initiativeDice": 1,
    "initiativeBonus": 5,
    "displacement": "9m / 6q",
    "attributes": {
      "agi": 1,
      "for": 2,
      "int": 1,
      "pre": 1,
      "vig": 2
    },
    "skills": [
      {
        "id": "ord-thr-capanga-percepcao",
        "name": "Percepção",
        "diceCount": 1,
        "bonus": 5
      },
      {
        "id": "ord-thr-capanga-fortitude",
        "name": "Fortitude",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-capanga-reflexos",
        "name": "Reflexos",
        "diceCount": 1,
        "bonus": 5
      },
      {
        "id": "ord-thr-capanga-vontade",
        "name": "Vontade",
        "diceCount": 1,
        "bonus": 0
      },
      {
        "id": "ord-thr-capanga-intimidacao",
        "name": "Intimidação",
        "diceCount": 1,
        "bonus": 5
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-capanga-atk-1",
        "name": "Bastão",
        "diceCount": 2,
        "attackBonus": 5,
        "damageFormula": "1d8+7",
        "critRange": "20/x2",
        "damageType": "Impacto",
        "isMelee": true,
        "range": "Corpo a corpo"
      },
      {
        "id": "ord-thr-capanga-atk-2",
        "name": "Revólver",
        "diceCount": 1,
        "attackBonus": 5,
        "damageFormula": "2d6+5",
        "critRange": "19/x3",
        "damageType": "Balístico",
        "isMelee": false,
        "range": "Distância (Curto)"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-capanga-ab-1",
        "name": "Ataque Furtivo",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "2d6"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-soldado-de-aluguel",
    "name": "Soldado de Aluguel",
    "vd": 40,
    "group": "realidade",
    "subGroup": "Criminosos & Mercenários",
    "element": "Realidade",
    "secondaryElements": [],
    "creatureType": "Pessoa",
    "size": "Médio",
    "hpMax": 25,
    "machucadoHp": 12,
    "defense": 18,
    "initiativeDice": 2,
    "initiativeBonus": 10,
    "displacement": "9m / 6q",
    "attributes": {
      "agi": 2,
      "for": 2,
      "int": 1,
      "pre": 1,
      "vig": 2
    },
    "skills": [
      {
        "id": "ord-thr-soldado-de-aluguel-percepcao",
        "name": "Percepção",
        "diceCount": 1,
        "bonus": 5
      },
      {
        "id": "ord-thr-soldado-de-aluguel-fortitude",
        "name": "Fortitude",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-soldado-de-aluguel-reflexos",
        "name": "Reflexos",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-soldado-de-aluguel-vontade",
        "name": "Vontade",
        "diceCount": 1,
        "bonus": 0
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-soldado-de-aluguel-atk-1",
        "name": "Machete",
        "diceCount": 2,
        "attackBonus": 10,
        "damageFormula": "1d6+9",
        "critRange": "19/x2",
        "damageType": "Corte",
        "isMelee": true,
        "range": "Corpo a corpo"
      },
      {
        "id": "ord-thr-soldado-de-aluguel-atk-2",
        "name": "Fuzil De Assalto",
        "diceCount": 2,
        "attackBonus": 10,
        "damageFormula": "2d8+9",
        "critRange": "19/x3",
        "damageType": "Balístico",
        "isMelee": false,
        "range": "Distância (Médio)"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-soldado-de-aluguel-ab-1",
        "name": "Ataque Em Movimento",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-assassino",
    "name": "Assassino",
    "vd": 80,
    "group": "realidade",
    "subGroup": "Criminosos & Mercenários",
    "element": "Realidade",
    "secondaryElements": [],
    "creatureType": "Pessoa",
    "size": "Médio",
    "hpMax": 90,
    "machucadoHp": 45,
    "defense": 26,
    "initiativeDice": 4,
    "initiativeBonus": 15,
    "displacement": "9m / 6q",
    "attributes": {
      "agi": 4,
      "for": 2,
      "int": 3,
      "pre": 3,
      "vig": 2
    },
    "skills": [
      {
        "id": "ord-thr-assassino-percepcao",
        "name": "Percepção",
        "diceCount": 3,
        "bonus": 10
      },
      {
        "id": "ord-thr-assassino-fortitude",
        "name": "Fortitude",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-assassino-reflexos",
        "name": "Reflexos",
        "diceCount": 4,
        "bonus": 10
      },
      {
        "id": "ord-thr-assassino-vontade",
        "name": "Vontade",
        "diceCount": 3,
        "bonus": 10
      },
      {
        "id": "ord-thr-assassino-crime",
        "name": "Crime",
        "diceCount": 4,
        "bonus": 10
      },
      {
        "id": "ord-thr-assassino-enganacao",
        "name": "Enganação",
        "diceCount": 3,
        "bonus": 10
      },
      {
        "id": "ord-thr-assassino-furtividade",
        "name": "Furtividade",
        "diceCount": 4,
        "bonus": 10
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-assassino-atk-1",
        "name": "Faca",
        "diceCount": 4,
        "attackBonus": 17,
        "damageFormula": "1d4+11",
        "critRange": "19/x2",
        "damageType": "Corte",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      },
      {
        "id": "ord-thr-assassino-atk-2",
        "name": "Pistola",
        "diceCount": 4,
        "attackBonus": 15,
        "damageFormula": "1d12+14",
        "critRange": "16/x4",
        "damageType": "Balístico",
        "isMelee": false,
        "range": "Distância (Curto)",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-assassino-ab-1",
        "name": "Evasão",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-assassino-ab-2",
        "name": "Ataque Furtivo",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "4d6"
      },
      {
        "id": "ord-thr-assassino-ab-3",
        "name": "Mão Na Boca",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-assassino-ab-4",
        "name": "Assassinar",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-comandante-mercenario",
    "name": "Comandante Mercenário",
    "vd": 120,
    "group": "realidade",
    "subGroup": "Criminosos & Mercenários",
    "element": "Realidade",
    "secondaryElements": [],
    "creatureType": "Pessoa",
    "size": "Médio",
    "hpMax": 145,
    "machucadoHp": 72,
    "defense": 29,
    "initiativeDice": 3,
    "initiativeBonus": 15,
    "displacement": "6m / 4q",
    "resistances": "balístico, corte, impacto e perfuração 5",
    "attributes": {
      "agi": 3,
      "for": 3,
      "int": 2,
      "pre": 2,
      "vig": 3
    },
    "skills": [
      {
        "id": "ord-thr-comandante-mercenario-percepcao",
        "name": "Percepção",
        "diceCount": 2,
        "bonus": 10
      },
      {
        "id": "ord-thr-comandante-mercenario-fortitude",
        "name": "Fortitude",
        "diceCount": 3,
        "bonus": 10
      },
      {
        "id": "ord-thr-comandante-mercenario-reflexos",
        "name": "Reflexos",
        "diceCount": 3,
        "bonus": 10
      },
      {
        "id": "ord-thr-comandante-mercenario-vontade",
        "name": "Vontade",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-comandante-mercenario-intimidacao",
        "name": "Intimidação",
        "diceCount": 2,
        "bonus": 10
      },
      {
        "id": "ord-thr-comandante-mercenario-tatica",
        "name": "Tática",
        "diceCount": 2,
        "bonus": 10
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-comandante-mercenario-atk-1",
        "name": "Machete",
        "diceCount": 3,
        "attackBonus": 17,
        "damageFormula": "1d6+15",
        "critRange": "19/x2",
        "damageType": "Corte",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      },
      {
        "id": "ord-thr-comandante-mercenario-atk-2",
        "name": "Metralhadora",
        "diceCount": 2,
        "attackBonus": 17,
        "damageFormula": "3d12+15",
        "critRange": "19/x3",
        "damageType": "Balístico",
        "isMelee": false,
        "range": "Distância (Médio)",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-comandante-mercenario-ab-1",
        "name": "Sadismo",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-comandante-mercenario-ab-2",
        "name": "Ataque Em Movimento",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-comandante-mercenario-ab-3",
        "name": "Ordens",
        "actionType": "Movimento",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-iniciado",
    "name": "Iniciado",
    "vd": 20,
    "group": "realidade",
    "subGroup": "Cultistas",
    "element": "Realidade",
    "secondaryElements": [],
    "creatureType": "Pessoa",
    "size": "Médio",
    "hpMax": 15,
    "machucadoHp": 7,
    "defense": 16,
    "initiativeDice": 1,
    "initiativeBonus": 0,
    "displacement": "9m / 6q",
    "attributes": {
      "agi": 1,
      "for": 1,
      "int": 2,
      "pre": 2,
      "vig": 1
    },
    "skills": [
      {
        "id": "ord-thr-iniciado-percepcao",
        "name": "Percepção",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-iniciado-fortitude",
        "name": "Fortitude",
        "diceCount": 1,
        "bonus": 0
      },
      {
        "id": "ord-thr-iniciado-reflexos",
        "name": "Reflexos",
        "diceCount": 1,
        "bonus": 0
      },
      {
        "id": "ord-thr-iniciado-vontade",
        "name": "Vontade",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-iniciado-enganacao",
        "name": "Enganação",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-iniciado-ocultismo",
        "name": "Ocultismo",
        "diceCount": 2,
        "bonus": 5
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-iniciado-atk-1",
        "name": "Faca",
        "diceCount": 1,
        "attackBonus": 0,
        "damageFormula": "1d4+1",
        "critRange": "19/x2",
        "damageType": "Corte",
        "isMelee": true,
        "range": "Corpo a corpo"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-iniciado-ab-1",
        "name": "Conjurador",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-investido",
    "name": "Investido",
    "vd": 40,
    "group": "realidade",
    "subGroup": "Cultistas",
    "element": "Realidade",
    "secondaryElements": [],
    "creatureType": "Pessoa",
    "size": "Médio",
    "hpMax": 35,
    "machucadoHp": 17,
    "defense": 17,
    "initiativeDice": 2,
    "initiativeBonus": 5,
    "displacement": "9m / 6q",
    "attributes": {
      "agi": 2,
      "for": 1,
      "int": 2,
      "pre": 2,
      "vig": 1
    },
    "skills": [
      {
        "id": "ord-thr-investido-percepcao",
        "name": "Percepção",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-investido-fortitude",
        "name": "Fortitude",
        "diceCount": 1,
        "bonus": 0
      },
      {
        "id": "ord-thr-investido-reflexos",
        "name": "Reflexos",
        "diceCount": 2,
        "bonus": 0
      },
      {
        "id": "ord-thr-investido-vontade",
        "name": "Vontade",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-investido-enganacao",
        "name": "Enganação",
        "diceCount": 2,
        "bonus": 10
      },
      {
        "id": "ord-thr-investido-ocultismo",
        "name": "Ocultismo",
        "diceCount": 2,
        "bonus": 10
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-investido-atk-1",
        "name": "Faca",
        "diceCount": 2,
        "attackBonus": 5,
        "damageFormula": "1d4+1",
        "critRange": "19/x2",
        "damageType": "Corte",
        "isMelee": true,
        "range": "Corpo a corpo"
      },
      {
        "id": "ord-thr-investido-atk-2",
        "name": "Revólver",
        "diceCount": 2,
        "attackBonus": 0,
        "damageFormula": "2d6",
        "critRange": "19/x3",
        "damageType": "Balístico",
        "isMelee": false,
        "range": "Distância (Curto)"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-investido-ab-1",
        "name": "Conjurador",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-lider-de-culto",
    "name": "Líder de Culto",
    "vd": 140,
    "group": "realidade",
    "subGroup": "Cultistas",
    "element": "Realidade",
    "secondaryElements": [],
    "creatureType": "Pessoa",
    "size": "Médio",
    "hpMax": 150,
    "machucadoHp": 75,
    "defense": 27,
    "initiativeDice": 2,
    "initiativeBonus": 10,
    "displacement": "9m / 6q",
    "attributes": {
      "agi": 2,
      "for": 1,
      "int": 3,
      "pre": 3,
      "vig": 2
    },
    "skills": [
      {
        "id": "ord-thr-lider-de-culto-percepcao",
        "name": "Percepção",
        "diceCount": 3,
        "bonus": 10
      },
      {
        "id": "ord-thr-lider-de-culto-fortitude",
        "name": "Fortitude",
        "diceCount": 2,
        "bonus": 10
      },
      {
        "id": "ord-thr-lider-de-culto-reflexos",
        "name": "Reflexos",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-lider-de-culto-vontade",
        "name": "Vontade",
        "diceCount": 3,
        "bonus": 15
      },
      {
        "id": "ord-thr-lider-de-culto-enganacao",
        "name": "Enganação",
        "diceCount": 3,
        "bonus": 15
      },
      {
        "id": "ord-thr-lider-de-culto-ocultismo",
        "name": "Ocultismo",
        "diceCount": 3,
        "bonus": 15
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-lider-de-culto-atk-1",
        "name": "Faca",
        "diceCount": 2,
        "attackBonus": 10,
        "damageFormula": "1d4+1",
        "critRange": "19/x2",
        "damageType": "Corte",
        "isMelee": true,
        "range": "Corpo a corpo"
      },
      {
        "id": "ord-thr-lider-de-culto-atk-2",
        "name": "Revólver",
        "diceCount": 2,
        "attackBonus": 5,
        "damageFormula": "2d6",
        "critRange": "19/x3",
        "damageType": "Balístico",
        "isMelee": false,
        "range": "Distância (Curto)"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-lider-de-culto-ab-1",
        "name": "Conjurador",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-policial",
    "name": "Policial",
    "vd": 20,
    "group": "realidade",
    "subGroup": "Forças da Lei",
    "element": "Realidade",
    "secondaryElements": [],
    "creatureType": "Pessoa",
    "size": "Médio",
    "hpMax": 15,
    "machucadoHp": 7,
    "defense": 19,
    "initiativeDice": 2,
    "initiativeBonus": 5,
    "displacement": "9m / 6q",
    "attributes": {
      "agi": 2,
      "for": 2,
      "int": 1,
      "pre": 1,
      "vig": 2
    },
    "skills": [
      {
        "id": "ord-thr-policial-percepcao",
        "name": "Percepção",
        "diceCount": 1,
        "bonus": 5
      },
      {
        "id": "ord-thr-policial-fortitude",
        "name": "Fortitude",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-policial-reflexos",
        "name": "Reflexos",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-policial-vontade",
        "name": "Vontade",
        "diceCount": 1,
        "bonus": 0
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-policial-atk-1",
        "name": "Bastão",
        "diceCount": 2,
        "attackBonus": 5,
        "damageFormula": "1d8+7",
        "critRange": "20/x2",
        "damageType": "Impacto",
        "isMelee": true,
        "range": "Corpo a corpo"
      },
      {
        "id": "ord-thr-policial-atk-2",
        "name": "Pistola",
        "diceCount": 2,
        "attackBonus": 5,
        "damageFormula": "1d12+5",
        "critRange": "18/x2",
        "damageType": "Balístico",
        "isMelee": false,
        "range": "Distância (Curto)"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-policial-de-elite",
    "name": "Policial de Elite",
    "vd": 60,
    "group": "realidade",
    "subGroup": "Forças da Lei",
    "element": "Realidade",
    "secondaryElements": [],
    "creatureType": "Pessoa",
    "size": "Médio",
    "hpMax": 40,
    "machucadoHp": 20,
    "defense": 27,
    "initiativeDice": 3,
    "initiativeBonus": 15,
    "displacement": "6m / 4q",
    "resistances": "balístico, corte, impacto e perfuração 5",
    "attributes": {
      "agi": 3,
      "for": 3,
      "int": 1,
      "pre": 1,
      "vig": 3
    },
    "skills": [
      {
        "id": "ord-thr-policial-de-elite-percepcao",
        "name": "Percepção",
        "diceCount": 1,
        "bonus": 10
      },
      {
        "id": "ord-thr-policial-de-elite-fortitude",
        "name": "Fortitude",
        "diceCount": 3,
        "bonus": 10
      },
      {
        "id": "ord-thr-policial-de-elite-reflexos",
        "name": "Reflexos",
        "diceCount": 3,
        "bonus": 10
      },
      {
        "id": "ord-thr-policial-de-elite-vontade",
        "name": "Vontade",
        "diceCount": 1,
        "bonus": 10
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-policial-de-elite-atk-1",
        "name": "Bastão",
        "diceCount": 3,
        "attackBonus": 10,
        "damageFormula": "1d8+13",
        "critRange": "20/x2",
        "damageType": "Impacto",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      },
      {
        "id": "ord-thr-policial-de-elite-atk-2",
        "name": "Fuzil De Assalto",
        "diceCount": 3,
        "attackBonus": 10,
        "damageFormula": "2d8+13",
        "critRange": "17/x3",
        "damageType": "Balístico",
        "isMelee": false,
        "range": "Distância (Médio)"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-policial-de-elite-ab-1",
        "name": "Fortificação",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-policial-de-elite-ab-2",
        "name": "Lança-Granadas",
        "actionType": "Padrão",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "8d6"
      },
      {
        "id": "ord-thr-policial-de-elite-ab-3",
        "name": "Empurrar E Atirar",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-chefe-de-policia",
    "name": "Chefe de Polícia",
    "vd": 100,
    "group": "realidade",
    "subGroup": "Forças da Lei",
    "element": "Realidade",
    "secondaryElements": [],
    "creatureType": "Pessoa",
    "size": "Médio",
    "hpMax": 105,
    "machucadoHp": 52,
    "defense": 25,
    "initiativeDice": 2,
    "initiativeBonus": 10,
    "displacement": "9m / 6q",
    "attributes": {
      "agi": 2,
      "for": 3,
      "int": 2,
      "pre": 3,
      "vig": 3
    },
    "skills": [
      {
        "id": "ord-thr-chefe-de-policia-percepcao",
        "name": "Percepção",
        "diceCount": 3,
        "bonus": 15
      },
      {
        "id": "ord-thr-chefe-de-policia-fortitude",
        "name": "Fortitude",
        "diceCount": 3,
        "bonus": 10
      },
      {
        "id": "ord-thr-chefe-de-policia-reflexos",
        "name": "Reflexos",
        "diceCount": 2,
        "bonus": 10
      },
      {
        "id": "ord-thr-chefe-de-policia-vontade",
        "name": "Vontade",
        "diceCount": 3,
        "bonus": 15
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-chefe-de-policia-atk-1",
        "name": "Bastão",
        "diceCount": 3,
        "attackBonus": 15,
        "damageFormula": "1d8+8",
        "critRange": "20/x2",
        "damageType": "Impacto",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      },
      {
        "id": "ord-thr-chefe-de-policia-atk-2",
        "name": "Espingarda",
        "diceCount": 2,
        "attackBonus": 17,
        "damageFormula": "4d6+12",
        "critRange": "20/x3",
        "damageType": "Físico",
        "isMelee": false,
        "range": "Distância (Curto)",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-chefe-de-policia-ab-1",
        "name": "Teimoso",
        "actionType": "Reação",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-cao-de-guarda",
    "name": "Cão de Guarda",
    "vd": 10,
    "group": "realidade",
    "subGroup": "Animais",
    "element": "Realidade",
    "secondaryElements": [],
    "creatureType": "Animal",
    "size": "Médio",
    "hpMax": 12,
    "machucadoHp": 6,
    "defense": 14,
    "initiativeDice": 2,
    "initiativeBonus": 5,
    "displacement": "12m / 8q",
    "senses": "Faro, visão na penumbra",
    "attributes": {
      "agi": 2,
      "for": 2,
      "int": 0,
      "pre": 1,
      "vig": 2
    },
    "skills": [
      {
        "id": "ord-thr-cao-de-guarda-percepcao",
        "name": "Percepção",
        "diceCount": 1,
        "bonus": 10
      },
      {
        "id": "ord-thr-cao-de-guarda-fortitude",
        "name": "Fortitude",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-cao-de-guarda-reflexos",
        "name": "Reflexos",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-cao-de-guarda-vontade",
        "name": "Vontade",
        "diceCount": 1,
        "bonus": 0
      },
      {
        "id": "ord-thr-cao-de-guarda-sobrevivencia",
        "name": "Sobrevivência",
        "diceCount": 1,
        "bonus": 10
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-cao-de-guarda-atk-1",
        "name": "Mordida",
        "diceCount": 2,
        "attackBonus": 5,
        "damageFormula": "1d6+2",
        "critRange": "20/x2",
        "damageType": "Corte",
        "isMelee": true,
        "range": "Corpo a corpo"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-cao-de-guarda-ab-1",
        "name": "Derrubar",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-enxame-de-abelhas",
    "name": "Enxame de Abelhas",
    "vd": 10,
    "group": "realidade",
    "subGroup": "Animais",
    "element": "Realidade",
    "secondaryElements": [],
    "creatureType": "Animal",
    "size": "Médio",
    "hpMax": 10,
    "machucadoHp": 5,
    "defense": 15,
    "initiativeDice": 1,
    "initiativeBonus": 5,
    "displacement": "3m / 2q, voo 9m / 6q",
    "senses": "Visão na penumbra",
    "attributes": {
      "agi": 1,
      "for": 0,
      "int": 0,
      "pre": 1,
      "vig": 0
    },
    "skills": [
      {
        "id": "ord-thr-enxame-de-abelhas-percepcao",
        "name": "Percepção",
        "diceCount": 1,
        "bonus": 5
      },
      {
        "id": "ord-thr-enxame-de-abelhas-fortitude",
        "name": "Fortitude",
        "diceCount": -2,
        "bonus": 0
      },
      {
        "id": "ord-thr-enxame-de-abelhas-reflexos",
        "name": "Reflexos",
        "diceCount": 1,
        "bonus": 5
      },
      {
        "id": "ord-thr-enxame-de-abelhas-vontade",
        "name": "Vontade",
        "diceCount": 1,
        "bonus": 0
      }
    ],
    "attacks": [],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-enxame-de-abelhas-ab-1",
        "name": "Enxame",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "2d6"
      },
      {
        "id": "ord-thr-enxame-de-abelhas-ab-2",
        "name": "Zumbido Nauseante",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-enxame-de-ratos",
    "name": "Enxame de Ratos",
    "vd": 10,
    "group": "realidade",
    "subGroup": "Animais",
    "element": "Realidade",
    "secondaryElements": [],
    "creatureType": "Animal",
    "size": "Médio",
    "hpMax": 15,
    "machucadoHp": 7,
    "defense": 13,
    "initiativeDice": 1,
    "initiativeBonus": 5,
    "displacement": "9m / 6q, escalar/nadar 6m / 4q",
    "senses": "Faro, visão na penumbra",
    "attributes": {
      "agi": 1,
      "for": 0,
      "int": 0,
      "pre": 1,
      "vig": 1
    },
    "skills": [
      {
        "id": "ord-thr-enxame-de-ratos-percepcao",
        "name": "Percepção",
        "diceCount": 1,
        "bonus": 5
      },
      {
        "id": "ord-thr-enxame-de-ratos-fortitude",
        "name": "Fortitude",
        "diceCount": 1,
        "bonus": 5
      },
      {
        "id": "ord-thr-enxame-de-ratos-reflexos",
        "name": "Reflexos",
        "diceCount": 1,
        "bonus": 5
      },
      {
        "id": "ord-thr-enxame-de-ratos-vontade",
        "name": "Vontade",
        "diceCount": 1,
        "bonus": 0
      }
    ],
    "attacks": [],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-enxame-de-ratos-ab-1",
        "name": "Enxame",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "2d6"
      },
      {
        "id": "ord-thr-enxame-de-ratos-ab-2",
        "name": "Doença",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-jacare",
    "name": "Jacaré",
    "vd": 40,
    "group": "realidade",
    "subGroup": "Animais",
    "element": "Realidade",
    "secondaryElements": [],
    "creatureType": "Animal",
    "size": "Grande",
    "hpMax": 40,
    "machucadoHp": 20,
    "defense": 16,
    "initiativeDice": 1,
    "initiativeBonus": 5,
    "displacement": "6m / 4q, nadar 9m / 6q",
    "senses": "Visão na penumbra",
    "attributes": {
      "agi": 1,
      "for": 3,
      "int": 0,
      "pre": 1,
      "vig": 2
    },
    "skills": [
      {
        "id": "ord-thr-jacare-percepcao",
        "name": "Percepção",
        "diceCount": 1,
        "bonus": 5
      },
      {
        "id": "ord-thr-jacare-fortitude",
        "name": "Fortitude",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-jacare-reflexos",
        "name": "Reflexos",
        "diceCount": 1,
        "bonus": 5
      },
      {
        "id": "ord-thr-jacare-vontade",
        "name": "Vontade",
        "diceCount": 1,
        "bonus": 0
      },
      {
        "id": "ord-thr-jacare-furtividade",
        "name": "Furtividade",
        "diceCount": 1,
        "bonus": 8
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-jacare-atk-1",
        "name": "Mordida",
        "diceCount": 3,
        "attackBonus": 5,
        "damageFormula": "1d8+8",
        "critRange": "20/x2",
        "damageType": "Corte",
        "isMelee": true,
        "range": "Corpo a corpo"
      },
      {
        "id": "ord-thr-jacare-atk-2",
        "name": "Cauda",
        "diceCount": 3,
        "attackBonus": 5,
        "damageFormula": "1d12",
        "critRange": "20/x2",
        "damageType": "Impacto",
        "isMelee": true,
        "range": "Corpo a corpo"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-jacare-ab-1",
        "name": "Giro Da Morte",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "2d8"
      },
      {
        "id": "ord-thr-jacare-ab-2",
        "name": "Agarrão",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-javaporco",
    "name": "Javaporco",
    "vd": 20,
    "group": "realidade",
    "subGroup": "Animais",
    "element": "Realidade",
    "secondaryElements": [],
    "creatureType": "Animal",
    "size": "Médio",
    "hpMax": 35,
    "machucadoHp": 17,
    "defense": 14,
    "initiativeDice": 1,
    "initiativeBonus": 5,
    "displacement": "12m / 8q",
    "senses": "Faro, visão na penumbra",
    "attributes": {
      "agi": 1,
      "for": 2,
      "int": 0,
      "pre": 1,
      "vig": 3
    },
    "skills": [
      {
        "id": "ord-thr-javaporco-percepcao",
        "name": "Percepção",
        "diceCount": 1,
        "bonus": 5
      },
      {
        "id": "ord-thr-javaporco-fortitude",
        "name": "Fortitude",
        "diceCount": 3,
        "bonus": 5
      },
      {
        "id": "ord-thr-javaporco-reflexos",
        "name": "Reflexos",
        "diceCount": 1,
        "bonus": 5
      },
      {
        "id": "ord-thr-javaporco-vontade",
        "name": "Vontade",
        "diceCount": 1,
        "bonus": 0
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-javaporco-atk-1",
        "name": "Mordida",
        "diceCount": 2,
        "attackBonus": 5,
        "damageFormula": "1d8+4",
        "critRange": "20/x2",
        "damageType": "Corte",
        "isMelee": true,
        "range": "Corpo a corpo"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-javaporco-ab-1",
        "name": "Ferocidade",
        "actionType": "Passiva",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-javaporco-ab-2",
        "name": "Mordida Final",
        "actionType": "Reação",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-onca-pintada",
    "name": "Onça-Pintada",
    "vd": 40,
    "group": "realidade",
    "subGroup": "Animais",
    "element": "Realidade",
    "secondaryElements": [],
    "creatureType": "Animal",
    "size": "Grande",
    "hpMax": 55,
    "machucadoHp": 27,
    "defense": 16,
    "initiativeDice": 3,
    "initiativeBonus": 10,
    "displacement": "12m / 8q, escalar/nadar 6m / 4q",
    "senses": "Faro, visão na penumbra",
    "attributes": {
      "agi": 3,
      "for": 3,
      "int": 0,
      "pre": 1,
      "vig": 2
    },
    "skills": [
      {
        "id": "ord-thr-onca-pintada-percepcao",
        "name": "Percepção",
        "diceCount": 1,
        "bonus": 10
      },
      {
        "id": "ord-thr-onca-pintada-fortitude",
        "name": "Fortitude",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-onca-pintada-reflexos",
        "name": "Reflexos",
        "diceCount": 3,
        "bonus": 5
      },
      {
        "id": "ord-thr-onca-pintada-vontade",
        "name": "Vontade",
        "diceCount": 1,
        "bonus": 5
      },
      {
        "id": "ord-thr-onca-pintada-furtividade",
        "name": "Furtividade",
        "diceCount": 3,
        "bonus": 13
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-onca-pintada-atk-1",
        "name": "Mordida",
        "diceCount": 3,
        "attackBonus": 10,
        "damageFormula": "1d8+5",
        "critRange": "20/x2",
        "damageType": "Corte",
        "isMelee": true,
        "range": "Corpo a corpo"
      },
      {
        "id": "ord-thr-onca-pintada-atk-2",
        "name": "Garras",
        "diceCount": 3,
        "attackBonus": 10,
        "damageFormula": "1d6+5",
        "critRange": "19/x2",
        "damageType": "Corte",
        "isMelee": true,
        "range": "Corpo a corpo",
        "multiAttack": "x2"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-onca-pintada-ab-1",
        "name": "Agarrão",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-onca-pintada-ab-2",
        "name": "Bote",
        "actionType": "Completa",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  },
  {
    "id": "ord-thr-sucuri",
    "name": "Sucuri",
    "vd": 40,
    "group": "realidade",
    "subGroup": "Animais",
    "element": "Realidade",
    "secondaryElements": [],
    "creatureType": "Animal",
    "size": "Grande",
    "hpMax": 68,
    "machucadoHp": 34,
    "defense": 16,
    "initiativeDice": 2,
    "initiativeBonus": 5,
    "displacement": "6m / 4q, escalar/nadar 9m / 6q",
    "senses": "Faro, visão na penumbra",
    "attributes": {
      "agi": 2,
      "for": 3,
      "int": 0,
      "pre": 1,
      "vig": 3
    },
    "skills": [
      {
        "id": "ord-thr-sucuri-percepcao",
        "name": "Percepção",
        "diceCount": 1,
        "bonus": 5
      },
      {
        "id": "ord-thr-sucuri-fortitude",
        "name": "Fortitude",
        "diceCount": 3,
        "bonus": 5
      },
      {
        "id": "ord-thr-sucuri-reflexos",
        "name": "Reflexos",
        "diceCount": 2,
        "bonus": 5
      },
      {
        "id": "ord-thr-sucuri-vontade",
        "name": "Vontade",
        "diceCount": 1,
        "bonus": 0
      },
      {
        "id": "ord-thr-sucuri-furtividade",
        "name": "Furtividade",
        "diceCount": 2,
        "bonus": 8
      }
    ],
    "attacks": [
      {
        "id": "ord-thr-sucuri-atk-1",
        "name": "Mordida",
        "diceCount": 3,
        "attackBonus": 10,
        "damageFormula": "1d6+8",
        "critRange": "20/x2",
        "damageType": "Corte",
        "isMelee": true,
        "range": "Corpo a corpo"
      }
    ],
    "hasEnigmaOfFear": false,
    "specialAbilities": [
      {
        "id": "ord-thr-sucuri-ab-1",
        "name": "Agarrão",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo."
      },
      {
        "id": "ord-thr-sucuri-ab-2",
        "name": "Constrição",
        "actionType": "Livre",
        "description": "Consulte o Livro de Regras v1.3 para o efeito completo.",
        "damageFormula": "2d6+8"
      }
    ],
    "description": "Consulte o Livro de Regras v1.3 (Cap. 7 — Ameaças) para a descrição completa."
  }
];

export function instantiateCampaignThreatFromTemplate(
  template: OrdemBestiaryTemplate,
  instanceNumber?: number
): CampaignThreat {
  const suffix =
    typeof instanceNumber === 'number' && instanceNumber > 0
      ? ` #${instanceNumber}`
      : '';
  const uniqueSuffix = Math.random().toString(36).slice(2, 8);
  return {
    id: `threat-${template.id}-${uniqueSuffix}`,
    templateId: template.id,
    name: `${template.name}${suffix}`,
    system: 'ordem-paranormal',
    vd: template.vd,
    element: template.element,
    secondaryElements: [...template.secondaryElements],
    subGroup: template.subGroup,
    creatureType: template.creatureType,
    size: template.size,
    senses: template.senses,
    displacement: template.displacement,
    resistances: template.resistances,
    immunities: template.immunities,
    vulnerabilities: template.vulnerabilities,
    enigmaOfFear: template.enigmaOfFear,
    enigmaSolved: false,
    specialAbilities: template.specialAbilities.map((ab) => ({ ...ab })),
    hpMax: template.hpMax,
    defense: template.defense,
    initiativeDice: template.initiativeDice,
    initiativeBonus: template.initiativeBonus,
    attributes: { ...template.attributes },
    skills: template.skills.map((s) => ({ ...s })),
    attacks: template.attacks.map((a) => ({
      ...a,
      extraDamage: a.extraDamage ? a.extraDamage.map((ed) => ({ ...ed })) : undefined,
    })),
    description: template.description,
  };
}
