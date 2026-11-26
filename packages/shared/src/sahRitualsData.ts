// Rituais do suplemento Sobrevivendo ao Horror v1.3 (p. 49-57).
// Apenas dados de jogo e resumos neutros: o texto completo vem do Content Pack local
// (data/packs/sobrevivendo-ao-horror-v1.3.local.json, chave "rituals").
import type { OrdemRitualDef } from './ordemRituals';

const SAH = 'sobrevivendo-ao-horror';
const DESC = 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa deste ritual.';
const form = (extraCost: number, requiredCircle: number, requiresAffinity: boolean, text: string) => ({
  extraCost,
  requiredCircle,
  requiresAffinity,
  text,
});

export const SAH_RITUALS_DATA: OrdemRitualDef[] = [
  // --- SANGUE ---
  {
    id: 'sah-rit-esfolar', name: 'Esfolar', circle: 1, element: 'Sangue', sourceId: SAH,
    execution: 'padrão', range: 'curto', targetLabel: 'Alvo', target: '1 ser', duration: 'instantânea',
    resistance: 'Reflexos parcial', description: DESC,
    discente: form(2, 2, false, 'Alcance médio, mais dano e explosão de 6m de raio.'),
    verdadeiro: form(5, 3, false, 'Alcance longo, dano muito maior e a resistência não evita o sangramento.'),
  },
  {
    id: 'sah-rit-sede-adrenalina', name: 'Sede de Adrenalina', circle: 2, element: 'Sangue', sourceId: SAH,
    execution: 'reação', range: 'pessoal', targetLabel: 'Alvo', target: 'você', duration: 'instantânea',
    description: DESC,
    discente: form(3, 2, false, 'Aumenta a redução de dano de impacto.'),
    verdadeiro: form(7, 4, true, 'Aumenta ainda mais a redução de dano de impacto.'),
  },
  {
    id: 'sah-rit-odor-cacada', name: 'Odor da Caçada', circle: 3, element: 'Sangue', sourceId: SAH,
    execution: 'padrão', range: 'pessoal', targetLabel: 'Alvo', target: 'você', duration: 'cena',
    description: DESC,
    discente: form(4, 3, false, 'Alcance toque, afeta 1 ser.'),
    verdadeiro: form(9, 3, true, 'Alcance curto, afeta até 5 seres.'),
  },
  {
    id: 'sah-rit-martirio-sangue', name: 'Martírio de Sangue', circle: 4, element: 'Sangue', sourceId: SAH,
    execution: 'padrão', range: 'pessoal', targetLabel: 'Alvo', target: 'você', duration: 'veja texto',
    description: DESC,
    discente: form(5, 4, true, 'Bônus e PV temporários maiores.'),
  },
  // --- MORTE ---
  {
    id: 'sah-rit-apagar-luzes', name: 'Apagar as Luzes', circle: 1, element: 'Morte', sourceId: SAH,
    execution: 'padrão', range: 'pessoal', targetLabel: 'Alvo', target: 'você', duration: 'instantânea',
    description: DESC,
    discente: form(2, 2, false, 'Afeta fontes de luz em alcance longo.'),
    verdadeiro: form(5, 3, false, 'Como Discente, e outros seres no alcance também enxergam no escuro.'),
  },
  {
    id: 'sah-rit-lingua-morta', name: 'Língua Morta', circle: 2, element: 'Morte', sourceId: SAH,
    execution: 'padrão', range: 'toque', targetLabel: 'Alvo', target: '1 cadáver', duration: 'sustentada',
    description: DESC,
    discente: form(3, 2, false, 'Uma rodada a mais de perguntas.'),
    verdadeiro: form(7, 4, true, 'Duas rodadas a mais de perguntas.'),
  },
  {
    id: 'sah-rit-fedor-putrido', name: 'Fedor Pútrido', circle: 3, element: 'Morte', sourceId: SAH,
    execution: 'padrão', range: 'pessoal', targetLabel: 'Alvo', target: 'você', duration: 'sustentada',
    description: DESC,
    discente: form(4, 3, false, 'Alcance toque, afeta 1 ser voluntário.'),
    verdadeiro: form(9, 3, true, 'Alcance curto, afeta até 5 seres voluntários.'),
  },
  {
    id: 'sah-rit-singularidade-temporal', name: 'Singularidade Temporal', circle: 4, element: 'Morte', sourceId: SAH,
    execution: 'padrão', range: 'curto', targetLabel: 'Alvo', target: '1 objeto não paranormal Médio', duration: 'instantânea',
    resistance: 'veja texto', description: DESC,
    discente: form(5, 4, false, 'Afeta objetos Grandes.'),
    verdadeiro: form(10, 4, false, 'Afeta objetos Enormes.'),
  },
  // --- CONHECIMENTO ---
  {
    id: 'sah-rit-desfazer-sinapses', name: 'Desfazer Sinapses', circle: 1, element: 'Conhecimento', sourceId: SAH,
    execution: 'padrão', range: 'curto', targetLabel: 'Alvo', target: '1 ser', duration: 'instantânea',
    resistance: 'Vontade parcial', description: DESC,
    discente: form(2, 2, false, 'Alcance longo, mais dano e até 5 alvos.'),
    verdadeiro: form(5, 3, false, 'Alcance extremo, dano muito maior e condição mais grave.'),
  },
  {
    id: 'sah-rit-aurora-verdade', name: 'Aurora da Verdade', circle: 2, element: 'Conhecimento', sourceId: SAH,
    execution: 'padrão', range: 'curto', targetLabel: 'Área', target: 'esfera com 3m de raio', duration: 'sustentada',
    resistance: 'Vontade parcial', description: DESC,
    discente: form(3, 2, false, 'Alcance e área maiores; o conjurador não é afetado.'),
    verdadeiro: form(7, 4, true, 'Como Discente, com alcance longo, duração cena e escuta à distância.'),
  },
  {
    id: 'sah-rit-relembrar-fragmento', name: 'Relembrar Fragmento', circle: 3, element: 'Conhecimento', sourceId: SAH,
    execution: 'padrão', range: 'toque', targetLabel: 'Alvo', target: '1 objeto', duration: 'instantânea',
    description: DESC,
    discente: form(4, 3, false, 'A restauração dura até o fim da missão.'),
    verdadeiro: form(9, 3, true, 'Altera o objeto conforme a vontade do conjurador até o fim da missão.'),
  },
  {
    id: 'sah-rit-pronunciar-sigilo', name: 'Pronunciar Sigilo', circle: 4, element: 'Conhecimento', sourceId: SAH,
    execution: 'padrão', range: 'curto', targetLabel: 'Alvo', target: '1 ser', duration: 'instantânea/veja texto',
    resistance: 'Vontade parcial', description: DESC,
    discente: form(5, 4, false, 'Alcance extremo.'),
    verdadeiro: form(10, 4, true, 'Até cinco alvos.'),
  },
  // --- ENERGIA ---
  {
    id: 'sah-rit-overclock', name: 'Overclock', circle: 1, element: 'Energia', sourceId: SAH,
    execution: 'reação', range: 'pessoal', targetLabel: 'Alvo', target: 'você', duration: 'instantânea',
    description: DESC,
    discente: form(2, 2, false, 'Tolera um erro no desafio.'),
    verdadeiro: form(5, 3, false, 'Tolera dois erros no desafio.'),
  },
  {
    id: 'sah-rit-tremeluzir', name: 'Tremeluzir', circle: 2, element: 'Energia', sourceId: SAH,
    execution: 'padrão', range: 'pessoal', targetLabel: 'Alvo', target: 'você', duration: 'sustentada',
    description: DESC,
    discente: form(3, 2, false, 'Alcance toque, afeta 1 ser voluntário.'),
    verdadeiro: form(7, 4, false, 'Alcance curto, afeta até 5 seres voluntários.'),
  },
  {
    id: 'sah-rit-mutar', name: 'Mutar', circle: 3, element: 'Energia', sourceId: SAH,
    execution: 'padrão', range: 'pessoal', targetLabel: 'Alvo', target: 'você', duration: 'cena',
    description: DESC,
    discente: form(4, 3, false, 'Alcance toque, afeta 1 ser.'),
    verdadeiro: form(9, 3, true, 'Alcance curto, afeta até 5 seres.'),
  },
  {
    id: 'sah-rit-milagre-ionizante', name: 'Milagre Ionizante', circle: 3, element: 'Energia', sourceId: SAH,
    execution: 'completa', range: 'toque', targetLabel: 'Alvo', target: '1 ser', duration: 'instantânea',
    description: DESC,
  },
];

/** Efeitos à escolha do Pronunciar Sigilo (resumo para a escolha na conjuração). */
export const SAH_PRONUNCIAR_SIGILO_OPTIONS = [
  { id: 'esquecer', label: 'Esquecer', summary: 'Atordoado por 1d4+1 rodadas (1x/cena); se passar ou repetir, desprevenido por 1d4 rodadas.' },
  { id: 'cegar', label: 'Cegar', summary: 'Cego; se passar, ofuscado por 1d4 rodadas.' },
  { id: 'inexistir', label: 'Inexistir', summary: 'Deixa de existir por 1d4+1 rodadas (1 rodada se passar); 1x/cena por ser.' },
] as const;

/** Condições que o Milagre Ionizante pode curar (para a escolha na conjuração). */
export const SAH_MILAGRE_IONIZANTE_CONDITIONS = [
  'Abalado', 'Apavorado', 'Alquebrado', 'Atordoado', 'Cego', 'Confuso', 'Debilitado', 'Enjoado', 'Envenenado',
  'Esmorecido', 'Exausto', 'Fascinado', 'Fatigado', 'Fraco', 'Frustrado', 'Lento', 'Ofuscado', 'Paralisado',
  'Pasmo', 'Surdo',
];

const d4 = () => Math.floor(Math.random() * 4) + 1;

/**
 * Resumo do efeito ao conjurar um ritual do SaH (vai para o resumo da conjuração).
 * `choice`: escolha feita no diálogo (Pronunciar Sigilo / Milagre Ionizante).
 */
export function describeSahRitualCast(ritualId: string, mode: string, choice?: string): string | undefined {
  switch (ritualId) {
    case 'sah-rit-esfolar':
      return mode === 'verdadeiro'
        ? 'Esfolar: os alvos ficam sangrando (passar na resistência só reduz o dano à metade).'
        : 'Esfolar: o alvo fica sangrando (Reflexos: metade do dano e evita a condição).';
    case 'sah-rit-sede-adrenalina': {
      const red = mode === 'verdadeiro' ? 70 : mode === 'discente' ? 40 : 20;
      return `Sede de Adrenalina: repita o teste de Acrobacia/Atletismo usando Presença, ou reduza o dano de impacto em ${red} (e fique atordoado por 1 rodada). 1x/rodada.`;
    }
    case 'sah-rit-odor-cacada':
      return 'Odor da Caçada: faro; em perseguição, +5 em Atletismo e sem perder PV pelo esforço extra. Na próxima cena: fome e sede.';
    case 'sah-rit-martirio-sangue':
      return 'Martírio de Sangue: sem rituais a partir de agora; ao fim da cena o personagem se torna uma criatura de Sangue.';
    case 'sah-rit-apagar-luzes':
      return mode === 'verdadeiro'
        ? 'Apagar as Luzes: luzes em alcance longo se apagam; você e até 5 seres recebem visão no escuro até o fim da cena.'
        : 'Apagar as Luzes: as luzes no alcance se apagam e você recebe visão no escuro até o fim da cena.';
    case 'sah-rit-lingua-morta': {
      const rounds = mode === 'verdadeiro' ? 5 : mode === 'discente' ? 4 : 3;
      return `Língua Morta: o cadáver responde 1 pergunta por rodada sustentada (até ${rounds}).`;
    }
    case 'sah-rit-fedor-putrido':
      return 'Fedor Pútrido: +5 em Furtividade, +10 em Enganação para se fingir de morto, -3d20 em Diplomacia; 1d4 de dano de Morte por rodada.';
    case 'sah-rit-desfazer-sinapses':
      return mode === 'verdadeiro'
        ? 'Desfazer Sinapses: o alvo fica esmorecido (frustrado se passar na resistência).'
        : 'Desfazer Sinapses: o alvo fica frustrado por 1 rodada (Vontade: metade do dano e evita).';
    case 'sah-rit-aurora-verdade':
      return 'Aurora da Verdade: quem está na área só fala a verdade (Vontade permite mentir) e não consegue se esconder.';
    case 'sah-rit-pronunciar-sigilo': {
      const r = d4();
      if (choice === 'esquecer')
        return `Sigilo — Esquecer: atordoado por ${r + 1} rodadas (1d4+1); se passar, ou se já foi atordoado por este ritual, desprevenido por ${d4()} rodadas.`;
      if (choice === 'cegar') return `Sigilo — Cegar: o alvo fica cego; se passar, fica ofuscado por ${r} rodadas (1d4).`;
      if (choice === 'inexistir')
        return `Sigilo — Inexistir: o alvo deixa de existir por ${r + 1} rodadas (1d4+1), ou 1 rodada se passar. 1x/cena por ser.`;
      return undefined;
    }
    case 'sah-rit-tremeluzir':
      return 'Tremeluzir: atravesse um objeto sólido por ação de movimento (25% de falhar); 1d4 de dano de Energia por rodada.';
    case 'sah-rit-mutar':
      return 'Mutar: +10 em Furtividade; você não emite nem ouve sons. Só fale na mesa com permissão do mestre.';
    case 'sah-rit-milagre-ionizante':
      return choice
        ? `Milagre Ionizante: cura ${choice.toLowerCase()}. O alvo faz Fortitude DT 30; se falhar, é incubado pelo infecticídio.`
        : undefined;
    default:
      return undefined;
  }
}
