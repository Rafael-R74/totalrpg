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
  description: string;
  skills: string[];           // IDs das 2 perícias treinadas (vazio para Amnésico)
  freeSkillChoices?: number;  // 2 para Amnésico
  powerName: string;
  powerDescription: string;
  powerCost: number;
  modifiers: RuleModifier[];
  requiresManualActivation?: boolean; // Poderes de custo 0 que só ativam quando o jogador aciona (ex: Magnum Opus, Vislumbres do Passado)
  oncePerScene?: boolean;             // Poderes limitados a 1x por cena (ex: Faro para Pistas, Impostor, Posição de Combate)
  halvesInitialSanity?: boolean;      // Cultista Arrependido
  grantsParanormalPower?: boolean;    // Cultista Arrependido
  extraPeOddNex?: boolean;            // Universitário (+1 PE inicial e em cada NEX ímpar)
  extraPeLimit?: number;              // Universitário (+1 no Limite de PE por turno, sem afetar DT)
}

export const ORDEM_ORIGINS: OrdemOriginDefinition[] = [
  {
    id: 'academico',
    name: 'Acadêmico',
    description: 'Pesquisador ou professor universitário cujos estudos tocaram em assuntos misteriosos e chamaram a atenção da Ordo Realitas.',
    skills: ['ciencias', 'investigacao'],
    powerName: 'Saber é Poder',
    powerDescription: 'Quando faz um teste usando Intelecto, você pode gastar 2 PE para receber +5 nesse teste.',
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
    description: 'Profissional da saúde (enfermeiro, farmacêutico, médico, psicólogo ou socorrista) treinado no atendimento e cuidado de pessoas.',
    skills: ['intuicao', 'medicina'],
    powerName: 'Técnica Medicinal',
    powerDescription: 'Sempre que cura um personagem, você adiciona seu Intelecto no total de PV curados.',
    powerCost: 0,
    modifiers: [],
  },
  {
    id: 'amnesico',
    name: 'Amnésico',
    description: 'Você perdeu a maior parte da memória após um trauma paranormal ou ritual. A Ordem é a única família que conhece hoje.',
    skills: [],
    freeSkillChoices: 2,
    powerName: 'Vislumbres do Passado',
    powerDescription: 'Uma vez por sessão, você pode fazer um teste de Intelecto (DT 10) para reconhecer pessoas ou lugares familiares, que tenha encontrado antes de perder a memória. Se passar, recebe 1d4 PE temporários e, a critério do mestre, uma informação útil.',
    powerCost: 0,
    requiresManualActivation: true,
    modifiers: [],
  },
  {
    id: 'artista',
    name: 'Artista',
    description: 'Ator, músico, escritor, dançarino ou influenciador cuja obra foi inspirada por uma experiência paranormal.',
    skills: ['artes', 'enganacao'],
    powerName: 'Magnum Opus',
    powerDescription: 'Você é famoso por uma de suas obras. Uma vez por missão, pode determinar que uma pessoa envolvida em uma cena de interação o reconheça. Você recebe +5 em testes de Presença e de perícias baseadas em Presença contra aquela pessoa.',
    powerCost: 0,
    modifiers: [],
  },
  {
    id: 'atleta',
    name: 'Atleta',
    description: 'Competidor de esporte individual ou coletivo que se envolveu com o Outro Lado.',
    skills: ['acrobacia', 'atletismo'],
    powerName: '110%',
    powerDescription: 'Quando faz um teste de perícia usando Força ou Agilidade (exceto Luta e Pontaria) você pode gastar 2 PE para receber +5 nesse teste.',
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
    description: 'Cozinheiro amador ou profissional cujos pratos reconfortam a equipe nos momentos mais sombrios.',
    skills: ['fortitude', 'profissao'],
    powerName: 'Ingrediente Secreto',
    powerDescription: 'Em cenas de interlúdio, você pode fazer a ação alimentar-se para cozinhar um prato especial. Você, e todos os membros do grupo que fizeram a ação alimentar-se, recebem o benefício de dois pratos (caso o mesmo benefício seja escolhido duas vezes, seus efeitos se acumulam).',
    powerCost: 0,
    modifiers: [],
  },
  {
    id: 'criminoso',
    name: 'Criminoso',
    description: 'Vivia fora da lei até esbarrar em um assunto da Ordem, que preferiu recrutar seus talentos.',
    skills: ['crime', 'furtividade'],
    powerName: 'O Crime Compensa',
    powerDescription: 'No final de uma missão, escolha um item encontrado na missão. Em sua próxima missão, você pode incluir esse item em seu inventário sem que ele conte em seu limite de itens por patente.',
    powerCost: 0,
    modifiers: [],
  },
  {
    id: 'cultista_arrependido',
    name: 'Cultista Arrependido',
    description: 'Fez parte de um culto paranormal, mas abriu os olhos e hoje luta pelo lado certo, carregando cicatrizes do Outro Lado.',
    skills: ['ocultismo', 'religiao'],
    powerName: 'Traços do Outro Lado',
    powerDescription: 'Você possui um poder paranormal à sua escolha. Porém, começa o jogo com metade da Sanidade normal para sua classe.',
    powerCost: 0,
    modifiers: [],
    halvesInitialSanity: true,
    grantsParanormalPower: true,
  },
  {
    id: 'desgarrado',
    name: 'Desgarrado',
    description: 'Vivia fora das normas da sociedade; a vida sem os confortos modernos o deixou mais resistente.',
    skills: ['fortitude', 'sobrevivencia'],
    powerName: 'Calejado',
    powerDescription: 'Você recebe +1 PV para cada 5% de NEX.',
    powerCost: 0,
    modifiers: [{ id: 'orig-desg', targetType: 'vital_max', targetKey: 'pv', value: 1, scaleWithLevel: true }],
  },
  {
    id: 'engenheiro',
    name: 'Engenheiro',
    description: 'Engenheiro profissional ou inventor de garagem que coloca a mão na massa.',
    skills: ['profissao', 'tecnologia'],
    powerName: 'Ferramenta Favorita',
    powerDescription: 'Um item a sua escolha (exceto armas) conta como uma categoria abaixo (por exemplo, um item de categoria II conta como categoria I para você).',
    powerCost: 0,
    modifiers: [],
  },
  {
    id: 'executivo',
    name: 'Executivo',
    description: 'Trabalhava em escritório, banco ou corporação lidando com administração e burocracia.',
    skills: ['diplomacia', 'profissao'],
    powerName: 'Processo Otimizado',
    powerDescription: 'Sempre que faz um teste de perícia durante um teste estendido, ou uma ação para revisar documentos (físicos ou digitais), pode pagar 2 PE para receber +5 nesse teste.',
    powerCost: 2,
    modifiers: [{ id: 'orig-exec-all', targetType: 'skill_bonus', targetKey: 'all', value: 5 }],
  },
  {
    id: 'investigador',
    name: 'Investigador',
    description: 'Perito forense, policial federal ou detetive particular focado na resolução de mistérios.',
    skills: ['investigacao', 'percepcao'],
    powerName: 'Faro para Pistas',
    powerDescription: 'Uma vez por cena, quando fizer um teste para procurar pistas, você pode gastar 1 PE para receber +5 nesse teste.',
    powerCost: 1,
    oncePerScene: true,
    modifiers: [{ id: 'orig-inv-all', targetType: 'skill_bonus', targetKey: 'all', value: 5 }],
  },
  {
    id: 'lutador',
    name: 'Lutador',
    description: 'Praticante de arte marcial, esporte de combate ou briga de rua.',
    skills: ['luta', 'reflexos'],
    powerName: 'Mão Pesada',
    powerDescription: 'Você recebe +2 em rolagens de dano com ataques corpo a corpo.',
    powerCost: 0,
    modifiers: [{ id: 'orig-lut-melee', targetType: 'damage_bonus', targetKey: 'melee', value: 2 }],
  },
  {
    id: 'magnata',
    name: 'Magnata',
    description: 'Possui muito dinheiro ou patrimônio e decidiu usar sua riqueza para financiar a luta contra o paranormal.',
    skills: ['diplomacia', 'pilotagem'],
    powerName: 'Patrocinador da Ordem',
    powerDescription: 'Seu limite de crédito é sempre considerado um acima do atual.',
    powerCost: 0,
    modifiers: [],
  },
  {
    id: 'mercenario',
    name: 'Mercenário',
    description: 'Soldado de aluguel acostumado a escoltas e missões táticas de alto risco.',
    skills: ['iniciativa', 'intimidacao'],
    powerName: 'Posição de Combate',
    powerDescription: 'No primeiro turno de cada cena de ação, você pode gastar 2 PE para receber uma ação de movimento adicional.',
    powerCost: 0,
    modifiers: [],
  },
  {
    id: 'militar',
    name: 'Militar',
    description: 'Serviu em uma força militar (exército, marinha ou aeronáutica), tornando-se perito em armas de fogo.',
    skills: ['pontaria', 'tatica'],
    powerName: 'Para Bellum',
    powerDescription: 'Você recebe +2 em rolagens de dano com armas de fogo.',
    powerCost: 0,
    modifiers: [{ id: 'orig-mil-firearm', targetType: 'damage_bonus', targetKey: 'firearm', value: 2 }],
  },
  {
    id: 'operario',
    name: 'Operário',
    description: 'Pedreiro, industriário ou operador de máquinas com visão pragmática do mundo.',
    skills: ['fortitude', 'profissao'],
    powerName: 'Ferramenta de Trabalho',
    powerDescription: 'Escolha uma arma simples ou tática que, a critério do mestre, poderia ser usada como ferramenta em sua profissão (como uma marreta para um pedreiro). Você sabe usar a arma escolhida e recebe +1 em testes de ataque, rolagens de dano e margem de ameaça com ela.',
    powerCost: 0,
    modifiers: [],
  },
  {
    id: 'policial',
    name: 'Policial',
    description: 'Fez parte de uma força de segurança pública, civil ou militar, e sobreviveu a um chamado paranormal.',
    skills: ['percepcao', 'pontaria'],
    powerName: 'Patrulha',
    powerDescription: 'Você recebe +2 em Defesa.',
    powerCost: 0,
    modifiers: [{ id: 'orig-pol', targetType: 'defense', targetKey: 'defense', value: 2 }],
  },
  {
    id: 'religioso',
    name: 'Religioso',
    description: 'Devoto ou sacerdote dedicado a auxiliar pessoas com problemas espirituais.',
    skills: ['religiao', 'vontade'],
    powerName: 'Acalentar',
    powerDescription: 'Você recebe +5 em testes de Religião para acalmar. Além disso, quando acalma uma pessoa, ela recebe um número de pontos de Sanidade igual a 1d6 + a sua Presença.',
    powerCost: 0,
    modifiers: [{ id: 'orig-rel', targetType: 'skill_bonus', targetKey: 'religiao', value: 5 }],
  },
  {
    id: 'servidor_publico',
    name: 'Servidor Público',
    description: 'Possuía carreira em um órgão governamental até descobrir corrupção ligada a cultos e rituais.',
    skills: ['intuicao', 'vontade'],
    powerName: 'Espírito Cívico',
    powerDescription: 'Sempre que faz um teste para ajudar, você pode gastar 1 PE para aumentar o bônus concedido em +2.',
    powerCost: 0,
    modifiers: [],
  },
  {
    id: 'teorico_conspiracao',
    name: 'Teórico da Conspiração',
    description: 'Investigou a fundo conspirações ocultas até esbarrar na verdade sobre o Outro Lado.',
    skills: ['investigacao', 'ocultismo'],
    powerName: 'Eu Já Sabia',
    powerDescription: 'Você não se abala tanto com entidades ou anomalias. Afinal, sempre soube que isso tudo existia. Você recebe resistência a dano mental igual ao seu Intelecto.',
    powerCost: 0,
    modifiers: [],
  },
  {
    id: 'ti',
    name: 'T.I.',
    description: 'Programador, engenheiro de software ou especialista em sistemas informatizados.',
    skills: ['investigacao', 'tecnologia'],
    powerName: 'Motor de Busca',
    powerDescription: 'A critério do mestre, sempre que tiver acesso a internet, você pode gastar 2 PE para substituir um teste de perícia qualquer por um teste de Tecnologia.',
    powerCost: 2,
    modifiers: [],
  },
  {
    id: 'trabalhador_rural',
    name: 'Trabalhador Rural',
    description: 'Trabalhava no campo ou áreas isoladas (fazendeiro, pescador, biólogo, veterinário).',
    skills: ['adestramento', 'sobrevivencia'],
    powerName: 'Desbravador',
    powerDescription: 'Quando faz um teste de Adestramento ou Sobrevivência, você pode gastar 2 PE para receber +5 nesse teste. Além disso, você não sofre penalidade em deslocamento por terreno difícil.',
    powerCost: 2,
    modifiers: [
      { id: 'orig-tr-ade', targetType: 'skill_bonus', targetKey: 'adestramento', value: 5 },
      { id: 'orig-tr-sob', targetType: 'skill_bonus', targetKey: 'sobrevivencia', value: 5 },
    ],
  },
  {
    id: 'trambiqueiro',
    name: 'Trambiqueiro',
    description: 'Vivia de pequenos golpes, jogatina e lábia até enganar a pessoa errada e acabar servindo à Ordem.',
    skills: ['crime', 'enganacao'],
    powerName: 'Impostor',
    powerDescription: 'Uma vez por cena, você pode gastar 2 PE para substituir um teste de perícia qualquer por um teste de Enganação.',
    powerCost: 2,
    oncePerScene: true,
    modifiers: [],
  },
  {
    id: 'universitario',
    name: 'Universitário',
    description: 'Aluno de uma faculdade que descobriu algo proibido em seus estudos.',
    skills: ['atualidades', 'investigacao'],
    powerName: 'Dedicação',
    powerDescription: 'Você recebe +1 PE, e mais 1 PE adicional a cada NEX ímpar (15%, 25%...). Além disso, seu limite de PE por turno aumenta em 1 (em NEX 5% seu limite é 2, em NEX 10% é 3 e assim por diante; isso não afeta a DT de seus efeitos).',
    powerCost: 0,
    modifiers: [],
    extraPeOddNex: true,
    extraPeLimit: 1,
  },
  {
    id: 'vitima',
    name: 'Vítima',
    description: 'Encontrou o paranormal no passado e sobreviveu a uma experiência traumática, decidindo lutar para proteger inocentes.',
    skills: ['reflexos', 'vontade'],
    powerName: 'Cicatrizes Psicológicas',
    powerDescription: 'Você recebe +1 de Sanidade para cada 5% de NEX.',
    powerCost: 0,
    modifiers: [{ id: 'orig-vit', targetType: 'vital_max', targetKey: 'san', value: 1, scaleWithLevel: true }],
  },
];

// ============================================================================
// 3. ORDEM PARANORMAL RPG v1.3 — AS 4 CLASSES OFICIAIS (p. 24-35, 171-172)
// ============================================================================
export interface OrdemClassDefinition {
  id: 'combatente' | 'especialista' | 'ocultista' | 'mundano';
  name: string;
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
    description: 'Treinado para lutar com todo tipo de armas, e com a força e a coragem para encarar os perigos de frente.',
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
        description: 'Quando faz um ataque, você pode gastar 2 PE para receber +5 no teste de ataque ou na rolagem de dano. Aumenta para +10 (3 PE) em NEX 25%, +15 (4 PE) em 55% e +20 (5 PE) em 85%.',
        isActive: false,
        modifiers: [{ id: 'cls-comb-atk', targetType: 'attack_bonus', targetKey: 'all', value: 5 }],
      },
    ],
  },
  {
    id: 'especialista',
    name: 'Especialista',
    subtitle: 'Perícia técnica, investigação e versatilidade',
    description: 'Um agente que confia mais em esperteza do que em força bruta, valendo-se de conhecimento técnico, raciocínio rápido ou lábia.',
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
        cost: 2,
        description: 'Quando faz um teste de uma perícia, você pode gastar 2 PE para receber os benefícios de ser treinado nesta perícia (em NEX 40% pode gastar +2 PE para veterano; em 75%, +4 PE para expert).',
        isActive: false,
        modifiers: [],
      },
      {
        name: 'Perito',
        category: 'classe',
        cost: 2,
        description: 'Escolha duas perícias nas quais você é treinado (exceto Luta e Pontaria). Quando faz um teste de uma delas, pode gastar 2 PE para somar +1d6 no resultado (+1d8 por 3 PE em 25%, +1d10 por 4 PE em 55%, +1d12 por 5 PE em 85%).',
        isActive: false,
        modifiers: [],
      },
    ],
  },
  {
    id: 'ocultista',
    name: 'Ocultista',
    subtitle: 'Estudioso do Outro Lado e conjurador de rituais',
    description: 'Um estudioso do paranormal que busca compreender e dominar os mistérios dos elementos e usá-los para combater o próprio Outro Lado.',
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
        description: 'Você pode lançar rituais de 1º círculo (2º em NEX 25%, 3º em 55% e 4º em 85%). Começa com 3 rituais de 1º círculo e aprende +1 ritual a cada novo NEX.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'mundano',
    name: 'Mundano (NEX 0%)',
    subtitle: 'Civil sobrevivente antes do treinamento da Ordem',
    description: 'Uma pessoa comum, com uma ocupação regular e uma vida normal que acabou de esbarrar nos mistérios do Outro Lado (Regra Opcional p. 171).',
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
        description: 'Quando faz um teste de perícia, você pode gastar 1 PE para receber +2 nesse teste.',
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
  modifiers: RuleModifier[];
}

export interface OrdemTrailDefinition {
  id: string;
  classId: 'combatente' | 'especialista' | 'ocultista';
  name: string;
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
    description: 'Treinado para abater alvos com eficiência e velocidade, tratando sua arma favorita como sua melhor amiga.',
    powers: [
      {
        nex: 10,
        name: 'A Favorita (Aniquilador 10%)',
        cost: 0,
        description: 'Escolha uma arma para ser sua favorita. A categoria da arma escolhida é reduzida em I.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Técnica Secreta (Aniquilador 40%)',
        cost: 2,
        description: 'A categoria da arma favorita é reduzida em II. Ao atacar com ela, pode gastar 2 PE por efeito: Amplo (atinge alvo adjacente) ou Destruidor (+1 multiplicador de crítico).',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Técnica Sublime (Aniquilador 65%)',
        cost: 2,
        description: 'Adiciona à Técnica Secreta: Letal (+2 margem de ameaça, ou +5 se escolhido 2x) e Perfurante (ignora 5 RD).',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Máquina de Matar (Aniquilador 99%)',
        cost: 0,
        description: 'A categoria da arma favorita é reduzida em III, ela recebe +2 na margem de ameaça e seu dano aumenta em +1 dado do mesmo tipo.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'comandante_campo',
    classId: 'combatente',
    name: 'Comandante de Campo',
    description: 'Oficial tático treinado para coordenar e auxiliar seus companheiros em combate.',
    powers: [
      {
        nex: 10,
        name: 'Inspirar Confiança (Comandante 10%)',
        cost: 2,
        description: 'Gaste uma reação e 2 PE para fazer um aliado em alcance curto rolar novamente um teste recém realizado.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Estrategista (Comandante 40%)',
        cost: 1,
        description: 'Gaste uma ação padrão e 1 PE por aliado em alcance curto (limitado por INT). No próximo turno deles, ganham +1 ação de movimento.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Brecha na Guarda (Comandante 65%)',
        cost: 2,
        description: '1x/rodada, quando um aliado causar dano a um inimigo em alcance curto, gaste reação e 2 PE para que você ou outro aliado faça um ataque adicional contra o inimigo. Alcance de Inspirar Confiança e Estrategista sobe para médio.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Oficial Comandante (Comandante 99%)',
        cost: 5,
        description: 'Gaste uma ação padrão e 5 PE para que cada aliado que possa ver em alcance médio receba +1 ação padrão no próximo turno dele.',
        isActive: false,
        modifiers: [],
      },
    ],
  },
  {
    id: 'guerreiro',
    classId: 'combatente',
    name: 'Guerreiro',
    description: 'Transformou seu corpo e golpes corpo a corpo em armas letais.',
    powers: [
      {
        nex: 10,
        name: 'Técnica Letal (Guerreiro 10%)',
        cost: 0,
        description: 'Você recebe um aumento de +2 na margem de ameaça com todos os seus ataques corpo a corpo.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Revidar (Guerreiro 40%)',
        cost: 2,
        description: 'Sempre que bloquear um ataque, você pode gastar uma reação e 2 PE para fazer um ataque corpo a corpo no inimigo que o atacou.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Força Opressora (Guerreiro 65%)',
        cost: 1,
        description: 'Ao acertar um ataque corpo a corpo, pode gastar 1 PE para realizar derrubar ou empurrar como ação livre.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Potência Máxima (Guerreiro 99%)',
        cost: 0,
        description: 'Quando usa seu Ataque Especial com armas corpo a corpo, todos os bônus numéricos são dobrados.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'operacoes_especiais',
    classId: 'combatente',
    name: 'Operações Especiais',
    description: 'Combatente eficaz de ações calculadas e otimizadas no campo de batalha.',
    powers: [
      {
        nex: 10,
        name: 'Iniciativa Aprimorada (Op. Especiais 10%)',
        cost: 0,
        description: 'Você recebe +5 em Iniciativa e uma ação de movimento adicional na primeira rodada.',
        isActive: true,
        modifiers: [{ id: 'tr-opesp-10', targetType: 'skill_bonus', targetKey: 'iniciativa', value: 5 }],
      },
      {
        nex: 40,
        name: 'Ataque Extra (Op. Especiais 40%)',
        cost: 2,
        description: 'Uma vez por rodada, quando faz um ataque, você pode gastar 2 PE para fazer um ataque adicional.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Surto de Adrenalina (Op. Especiais 65%)',
        cost: 5,
        description: 'Uma vez por rodada, você pode gastar 5 PE para realizar uma ação padrão ou de movimento adicional.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Sempre Alerta (Op. Especiais 99%)',
        cost: 0,
        description: 'Você recebe uma ação padrão adicional no início de cada cena de combate.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'tropa_choque',
    classId: 'combatente',
    name: 'Tropa de Choque',
    description: 'Duro na queda, treinou seu corpo para resistir a traumas físicos e proteger seus aliados.',
    powers: [
      {
        nex: 10,
        name: 'Casca Grossa (Tropa de Choque 10%)',
        cost: 0,
        description: 'Você recebe +1 PV para cada 5% de NEX e, quando faz um bloqueio, soma seu Vigor na resistência a dano recebida.',
        isActive: true,
        modifiers: [{ id: 'tr-choq-10', targetType: 'vital_max', targetKey: 'pv', value: 1, scaleWithLevel: true }],
      },
      {
        nex: 40,
        name: 'Cai Dentro (Tropa de Choque 40%)',
        cost: 1,
        description: 'Sempre que um oponente em alcance curto ataca um aliado, gaste reação e 1 PE para forçá-lo a testar Vontade (DT Vig); se falhar, deve atacar você.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Duro de Matar (Tropa de Choque 65%)',
        cost: 2,
        description: 'Ao sofrer dano não paranormal (ou paranormal a partir de NEX 85%), gaste reação e 2 PE para reduzir esse dano à metade.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Inquebrável (Tropa de Choque 99%)',
        cost: 0,
        description: 'Enquanto estiver machucado, você recebe +5 na Defesa e RD 5. Enquanto estiver morrendo, não fica indefeso e ainda pode realizar ações.',
        isActive: false,
        modifiers: [{ id: 'tr-choq-99', targetType: 'defense', targetKey: 'defense', value: 5 }],
      },
    ],
  },

  // --- ESPECIALISTA (5 Trilhas) ---
  {
    id: 'atirador_elite',
    classId: 'especialista',
    name: 'Atirador de Elite',
    description: 'Um tiro, uma morte. Perito em neutralizar ameaças à distância com precisão cirúrgica.',
    powers: [
      {
        nex: 10,
        name: 'Mira de Elite (Atirador de Elite 10%)',
        cost: 0,
        description: 'Você recebe proficiência com armas de fogo que usam balas longas e soma seu Intelecto em rolagens de dano com essas armas.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Disparo Letal (Atirador de Elite 40%)',
        cost: 1,
        description: 'Quando faz a ação mirar, pode gastar 1 PE para aumentar em +2 a margem de ameaça do próximo ataque.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Disparo Impactante (Atirador de Elite 65%)',
        cost: 2,
        description: 'Ao atacar com arma de fogo, pode gastar 2 PE para realizar derrubar, desarmar, empurrar ou quebrar à distância.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Atirar para Matar (Atirador de Elite 99%)',
        cost: 0,
        description: 'Quando faz um acerto crítico com uma arma de fogo, você causa dano máximo, sem precisar rolar dados.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'infiltrador',
    classId: 'especialista',
    name: 'Infiltrador',
    description: 'Perito em infiltração e em neutralizar alvos desprevenidos sem causar alarde.',
    powers: [
      {
        nex: 10,
        name: 'Ataque Furtivo (Infiltrador 10%)',
        cost: 1,
        description: '1x/rodada, ao atingir alvo desprevenido ou flanqueado (corpo a corpo ou alcance curto), gaste 1 PE para causar +1d6 de dano (+2d6 em 40%, +3d6 em 65%, +4d6 em 99%).',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Gatuno (Infiltrador 40%)',
        cost: 0,
        description: 'Você recebe +5 em Atletismo e Crime e pode percorrer seu deslocamento normal quando se esconder sem penalidade.',
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
        description: 'Gaste ação de movimento e 3 PE para analisar um alvo em alcance curto: dobra os dados extras do próximo Ataque Furtivo e exige Fortitude (DT Agi) para não ficar inconsciente/morrendo.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Sombra Fugaz (Infiltrador 99%)',
        cost: 3,
        description: 'Ao fazer Furtividade após atacar ou agir chamativamente, pode gastar 3 PE para ignorar a penalidade de -3d20.',
        isActive: false,
        modifiers: [],
      },
    ],
  },
  {
    id: 'medico_campo',
    classId: 'especialista',
    name: 'Médico de Campo',
    description: 'Treinado em primeiros socorros e tratamento de emergência no calor da batalha.',
    requirementText: 'Treinado em Medicina (requer Kit de Medicina)',
    requiredSkill: 'medicina',
    powers: [
      {
        nex: 10,
        name: 'Paramédico (Médico de Campo 10%)',
        cost: 2,
        description: 'Gaste uma ação padrão e 2 PE para curar 2d10 PV de si mesmo ou aliado adjacente (+1d10 em 40%, 65% e 99% por +1 PE por dado).',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Equipe de Trauma (Médico de Campo 40%)',
        cost: 2,
        description: 'Gaste uma ação padrão e 2 PE para remover uma condição negativa (exceto morrendo) de um aliado adjacente.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Resgate (Médico de Campo 65%)',
        cost: 0,
        description: '1x/rodada, pode se aproximar de aliado machucado/morrendo em alcance curto como ação livre. Ao curar PV ou remover condição, você e o aliado recebem +5 na Defesa por 1 rodada.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Reanimação (Médico de Campo 99%)',
        cost: 10,
        description: 'Uma vez por cena, gaste uma ação completa e 10 PE para trazer de volta à vida um personagem que tenha morrido na mesma cena.',
        isActive: false,
        modifiers: [],
      },
    ],
  },
  {
    id: 'negociador',
    classId: 'especialista',
    name: 'Negociador',
    description: 'Diplomata habilidoso capaz de influenciar pessoas por lábia ou intimidação.',
    powers: [
      {
        nex: 10,
        name: 'Eloquência (Negociador 10%)',
        cost: 1,
        description: 'Gaste ação completa e 1 PE por alvo em alcance curto. Teste Diplomacia, Enganação ou Intimidação contra Vontade para deixá-los fascinados enquanto se concentrar.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Discurso Motivador (Negociador 40%)',
        cost: 4,
        description: 'Gaste ação padrão e 4 PE para conceder +1d20 em testes de perícia para você e aliados em alcance curto até o fim da cena (+2d20 por 8 PE em 65%).',
        isActive: false,
        modifiers: [{ id: 'tr-neg-40', targetType: 'skill_dice', targetKey: 'all', value: 1 }],
      },
      {
        nex: 65,
        name: 'Eu Conheço um Cara (Negociador 65%)',
        cost: 0,
        description: 'Uma vez por missão, ative sua rede de contatos para pedir um favor (trocar equipamento do grupo, conseguir local de descanso ou resgate).',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Truque de Mestre (Negociador 99%)',
        cost: 5,
        description: 'Gaste 5 PE para simular o efeito de qualquer habilidade que tenha visto um aliado usar durante a cena.',
        isActive: false,
        modifiers: [],
      },
    ],
  },
  {
    id: 'tecnico',
    classId: 'especialista',
    name: 'Técnico',
    description: 'Especialista na manutenção, improvisação e otimização do equipamento da equipe.',
    powers: [
      {
        nex: 10,
        name: 'Inventário Otimizado (Técnico 10%)',
        cost: 0,
        description: 'Você soma seu Intelecto à sua Força para calcular sua capacidade de carga (+5 espaços por ponto de Intelecto).',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Remendão (Técnico 40%)',
        cost: 1,
        description: 'Gaste ação completa e 1 PE para remover a condição quebrado de um equipamento adjacente. Além disso, qualquer equipamento geral tem sua categoria reduzida em I para você.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Improvisar (Técnico 65%)',
        cost: 2,
        description: 'Gaste ação completa e 2 PE (+2 PE por categoria) para criar uma versão funcional de qualquer equipamento geral até o fim da cena.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Preparado para Tudo (Técnico 99%)',
        cost: 3,
        description: 'Gaste ação de movimento e 3 PE por categoria para puxar da bolsa qualquer item (exceto armas) na hora em que precisar.',
        isActive: false,
        modifiers: [],
      },
    ],
  },

  // --- OCULTISTA (5 Trilhas) ---
  {
    id: 'conduite',
    classId: 'ocultista',
    name: 'Conduíte',
    description: 'Domina os aspectos fundamentais da conjuração, ampliando alcance, velocidade e anulando rituais.',
    powers: [
      {
        nex: 10,
        name: 'Ampliar Ritual (Conduíte 10%)',
        cost: 2,
        description: 'Ao lançar um ritual, pode gastar +2 PE para aumentar seu alcance em um passo ou dobrar sua área de efeito.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Acelerar Ritual (Conduíte 40%)',
        cost: 4,
        description: 'Uma vez por rodada, pode aumentar o custo de um ritual em +4 PE para conjurá-lo como uma ação livre.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Anular Ritual (Conduíte 65%)',
        cost: 1,
        description: 'Quando for alvo de um ritual, pode gastar PE igual ao custo pago e fazer um teste oposto de Ocultismo para anulá-lo.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Canalizar o Medo (Conduíte 99%)',
        cost: 0,
        description: 'Você aprende o ritual de 4º círculo Canalizar o Medo.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'flagelador',
    classId: 'ocultista',
    name: 'Flagelador',
    description: 'Transforma a própria dor e o sofrimento de seus inimigos em combustível paranormal.',
    powers: [
      {
        nex: 10,
        name: 'Poder do Flagelo (Flagelador 10%)',
        cost: 0,
        description: 'Ao conjurar um ritual, você pode gastar seus próprios PV para pagar o custo em PE, à taxa de 2 PV por 1 PE pago.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Abraçar a Dor (Flagelador 40%)',
        cost: 2,
        description: 'Sempre que sofrer dano não paranormal, pode gastar uma reação e 2 PE para reduzir esse dano à metade.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Absorver Agonia (Flagelador 65%)',
        cost: 0,
        description: 'Sempre que reduz um ou mais inimigos a 0 PV com um ritual, recebe PE temporários iguais ao círculo do ritual utilizado.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Medo Tangível (Flagelador 99%)',
        cost: 0,
        description: 'Você aprende o ritual de 4º círculo Medo Tangível.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'graduado',
    classId: 'ocultista',
    name: 'Graduado',
    description: 'Foca seus estudos em conhecer mais rituais e torná-los mais difíceis de serem resistidos.',
    powers: [
      {
        nex: 10,
        name: 'Saber Ampliado (Graduado 10%)',
        cost: 0,
        description: 'Você aprende +1 ritual de 1º círculo e, toda vez que ganha acesso a um novo círculo, aprende +1 ritual adicional daquele círculo.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Grimório Ritualístico (Graduado 40%)',
        cost: 0,
        description: 'Cria um grimório especial (1 espaço) que armazena rituais adicionais de 1º ou 2º círculo igual ao seu Intelecto (+1 a cada novo círculo).',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Rituais Eficientes (Graduado 65%)',
        cost: 0,
        description: 'A DT para resistir a todos os seus rituais aumenta em +5.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Conhecendo o Medo (Graduado 99%)',
        cost: 0,
        description: 'Você aprende o ritual de 4º círculo Conhecendo o Medo.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'intuitivo',
    classId: 'ocultista',
    name: 'Intuitivo',
    description: 'Preparou sua mente para resistir aos efeitos devastadores do Outro Lado.',
    powers: [
      {
        nex: 10,
        name: 'Mente Sã (Intuitivo 10%)',
        cost: 0,
        description: 'Você recebe resistência paranormal +5 (+5 em testes de resistência contra efeitos paranormais).',
        isActive: true,
        modifiers: [{ id: 'tr-int-10', targetType: 'skill_bonus', targetKey: 'vontade', value: 5 }],
      },
      {
        nex: 40,
        name: 'Presença Poderosa (Intuitivo 40%)',
        cost: 0,
        description: 'Você adiciona sua Presença ao seu limite de PE por turno, mas apenas para conjurar rituais (não afeta a DT).',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Inabalável (Intuitivo 65%)',
        cost: 0,
        description: 'Você recebe resistência a dano mental e paranormal 10. Além disso, quando passa em Vontade para reduzir dano paranormal à metade, não sofre dano algum.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Presença do Medo (Intuitivo 99%)',
        cost: 0,
        description: 'Você aprende o ritual de 4º círculo Presença do Medo.',
        isActive: true,
        modifiers: [],
      },
    ],
  },
  {
    id: 'lamina_paranormal',
    classId: 'ocultista',
    name: 'Lâmina Paranormal',
    description: 'Mescla técnicas de combate armado com conjuração ocultista.',
    powers: [
      {
        nex: 10,
        name: 'Lâmina Maldita (Lâmina Paranormal 10%)',
        cost: 0,
        description: 'Você aprende o ritual Amaldiçoar Arma (ou reduz sua execução para movimento por +1 PE). Quando o conjura, pode usar Ocultismo em vez de Luta ou Pontaria para testes de ataque com a arma amaldiçoada.',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 40,
        name: 'Gladiador Paranormal (Lâmina Paranormal 40%)',
        cost: 0,
        description: 'Sempre que acerta um ataque corpo a corpo em um inimigo, recebe 2 PE temporários (máximo por cena igual ao seu limite de PE).',
        isActive: true,
        modifiers: [],
      },
      {
        nex: 65,
        name: 'Conjuração Marcial (Lâmina Paranormal 65%)',
        cost: 2,
        description: '1x/rodada, quando lança um ritual com execução de ação padrão, pode gastar 2 PE para fazer um ataque corpo a corpo como ação livre.',
        isActive: false,
        modifiers: [],
      },
      {
        nex: 99,
        name: 'Lâmina do Medo (Lâmina Paranormal 99%)',
        cost: 0,
        description: 'Você aprende o ritual de 4º círculo Lâmina do Medo.',
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
  '1. Você busca dor. Seja sentir dor ou causar dor.',
  '2. Quando olha o rosto de uma pessoa, vê sua imagem distorcida, com pedaços de animais ou monstros mesclados à face dela.',
  '3. Todas as vozes ficam deturpadas, como se fossem faladas por um monstro.',
  '4. Você fica escutando uma voz na sua cabeça, que repete constantemente que você está mentindo.',
  '5. O seu sangue parece estar quente, como se quisesse sair de dentro do seu corpo.',
  '6. Você vê rostos humanos e monstruosos nas sombras, sempre encarando você.',
  '7. Uma fome constante domina seu corpo, como se você não pudesse ser saciado.',
  '8. Um gosto permanente de ferro domina seu paladar, como se sua boca estivesse tomada por sangue.',
  '9. A luz incomoda seus olhos a ponto de precisar escondê-los o tempo todo, como se queimassem.',
  '10. Falar é praticamente impossível. É como se algo externo estivesse controlando o que você fala.',
  '11. Seus olhos coçam violentamente, e só parece que vão parar quando forem arrancados de sua cabeça.',
  '12. Sua memória começa a falhar lentamente. Qualquer evento ocorrido há mais de uma hora fica nebuloso.',
  '13. As emoções começam a se tornar confusas. Algo feliz desperta raiva e algo dolorido desperta felicidade.',
  '14. Você sente a necessidade constante de descrever todas as ações da maneira mais grotesca possível.',
  '15. Existem vermes dentro de seu corpo, correndo por suas veias e órgãos. Você sente debaixo da pele.',
  '16. Você acha que está sob efeito constante de um ritual que o deixa mais poderoso.',
  '17. Suas mãos estão furadas e as coisas caem de seus bolsos.',
  '18. Você acredita puramente que tudo é fruto da sorte, deixando suas decisões para o acaso.',
  '19. As coisas estão fervendo, mas você gosta da dor.',
  '20. Apenas o fim das coisas deve ser celebrado. E você precisa dar fim.',
];

export interface OrdemInterludeDish {
  id: 'favorito' | 'nutritivo' | 'energetico' | 'rapido';
  name: string;
  description: string;
}

export const ORDEM_INTERLUDE_DISHES: OrdemInterludeDish[] = [
  { id: 'favorito', name: '🍲 Prato Favorito', description: 'Se realizar a ação Relaxar neste interlúdio, recupera +2 pontos de Sanidade adicionais.' },
  { id: 'nutritivo', name: '🥩 Prato Nutritivo', description: 'Se realizar a ação Dormir neste interlúdio, aumenta sua recuperação de PV em +1x o Limite de PE.' },
  { id: 'energetico', name: '☕ Prato Energético', description: 'Se realizar a ação Dormir neste interlúdio, aumenta sua recuperação de PE em +1x o Limite de PE.' },
  { id: 'rapido', name: '🥪 Prato Rápido', description: 'Se realizar a ação Revisar Caso neste interlúdio, recebe +5 no teste de perícia.' },
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

