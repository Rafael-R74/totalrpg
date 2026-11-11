import { OrdemSheetData, T20SheetData, VitalBar } from './index';

// Perícias Ordem Paranormal
export function createDefaultOrdemSheet(): { vitals: VitalBar[]; sheetData: OrdemSheetData } {
  const vitals: VitalBar[] = [
    { id: 'pv', label: 'Pontos de Vida', current: 20, max: 20, color: '#dc2626' },
    { id: 'san', label: 'Sanidade', current: 20, max: 20, color: '#2563eb' },
    { id: 'pe', label: 'Pontos de Esforço', current: 5, max: 5, color: '#d97706' },
  ];

  const sheetData: OrdemSheetData = {
    origin: 'Acadêmico',
    characterClass: 'combatente',
    nex: 5,
    patent: 'Recruta',
    displacement: 9,
    attributes: {
      agi: 1,
      for: 1,
      int: 1,
      pre: 1,
      vig: 1,
    },
    skills: [
      { id: 'acrobacia', name: 'Acrobacia', attribute: 'agi', trainingDegree: 0, otherModifier: 0 },
      { id: 'adestramento', name: 'Adestramento', attribute: 'pre', trainingDegree: 0, otherModifier: 0 },
      { id: 'artes', name: 'Artes', attribute: 'pre', trainingDegree: 0, otherModifier: 0 },
      { id: 'atletismo', name: 'Atletismo', attribute: 'for', trainingDegree: 0, otherModifier: 0 },
      { id: 'atualidades', name: 'Atualidades', attribute: 'int', trainingDegree: 0, otherModifier: 0 },
      { id: 'ciencias', name: 'Ciências', attribute: 'int', trainingDegree: 0, otherModifier: 0 },
      { id: 'crime', name: 'Crime', attribute: 'agi', trainingDegree: 0, otherModifier: 0 },
      { id: 'diplomacia', name: 'Diplomacia', attribute: 'pre', trainingDegree: 0, otherModifier: 0 },
      { id: 'enganacao', name: 'Enganação', attribute: 'pre', trainingDegree: 0, otherModifier: 0 },
      { id: 'fortitude', name: 'Fortitude', attribute: 'vig', trainingDegree: 0, otherModifier: 0 },
      { id: 'furtividade', name: 'Furtividade', attribute: 'agi', trainingDegree: 0, otherModifier: 0 },
      { id: 'iniciativa', name: 'Iniciativa', attribute: 'agi', trainingDegree: 0, otherModifier: 0 },
      { id: 'intimidacao', name: 'Intimidação', attribute: 'pre', trainingDegree: 0, otherModifier: 0 },
      { id: 'intuicao', name: 'Intuição', attribute: 'pre', trainingDegree: 0, otherModifier: 0 },
      { id: 'investigacao', name: 'Investigação', attribute: 'int', trainingDegree: 0, otherModifier: 0 },
      { id: 'luta', name: 'Luta', attribute: 'for', trainingDegree: 0, otherModifier: 0 },
      { id: 'medicina', name: 'Medicina', attribute: 'int', trainingDegree: 0, otherModifier: 0 },
      { id: 'ocultismo', name: 'Ocultismo', attribute: 'int', trainingDegree: 0, otherModifier: 0 },
      { id: 'percepcao', name: 'Percepção', attribute: 'pre', trainingDegree: 0, otherModifier: 0 },
      { id: 'pilotagem', name: 'Pilotagem', attribute: 'agi', trainingDegree: 0, otherModifier: 0 },
      { id: 'pontaria', name: 'Pontaria', attribute: 'agi', trainingDegree: 0, otherModifier: 0 },
      { id: 'profissao', name: 'Profissão', attribute: 'int', trainingDegree: 0, otherModifier: 0 },
      { id: 'reflexos', name: 'Reflexos', attribute: 'agi', trainingDegree: 0, otherModifier: 0 },
      { id: 'religiao', name: 'Religião', attribute: 'pre', trainingDegree: 0, otherModifier: 0 },
      { id: 'sobrevivencia', name: 'Sobrevivência', attribute: 'int', trainingDegree: 0, otherModifier: 0 },
      { id: 'tatica', name: 'Tática', attribute: 'int', trainingDegree: 0, otherModifier: 0 },
      { id: 'tecnologia', name: 'Tecnologia', attribute: 'int', trainingDegree: 0, otherModifier: 0 },
      { id: 'vontade', name: 'Vontade', attribute: 'pre', trainingDegree: 0, otherModifier: 0 },
    ],
  };

  return { vitals, sheetData };
}

// Perícias Tormenta 20 Edição Jogo do Ano
export function createDefaultT20Sheet(): { vitals: VitalBar[]; sheetData: T20SheetData } {
  const vitals: VitalBar[] = [
    { id: 'pv', label: 'Pontos de Vida', current: 16, max: 16, color: '#dc2626' },
    { id: 'pm', label: 'Pontos de Mana', current: 4, max: 4, color: '#2563eb' },
  ];

  const sheetData: T20SheetData = {
    race: 'Humano',
    characterClass: 'Guerreiro',
    level: 1,
    deity: 'Valkaria',
    origin: 'Plebeu',
    attributes: {
      forca: 1,
      destreza: 1,
      constituicao: 1,
      inteligencia: 1,
      sabedoria: 1,
      carisma: 1,
    },
    skills: [
      { id: 'acrobacia', name: 'Acrobacia', attribute: 'destreza', isTrained: false, otherModifier: 0 },
      { id: 'adestramento', name: 'Adestramento', attribute: 'carisma', isTrained: false, otherModifier: 0 },
      { id: 'atletismo', name: 'Atletismo', attribute: 'forca', isTrained: false, otherModifier: 0 },
      { id: 'atuacao', name: 'Atuação', attribute: 'carisma', isTrained: false, otherModifier: 0 },
      { id: 'cavalgar', name: 'Cavalgar', attribute: 'destreza', isTrained: false, otherModifier: 0 },
      { id: 'conhecimento', name: 'Conhecimento', attribute: 'inteligencia', isTrained: false, otherModifier: 0 },
      { id: 'cura', name: 'Cura', attribute: 'sabedoria', isTrained: false, otherModifier: 0 },
      { id: 'diplomacia', name: 'Diplomacia', attribute: 'carisma', isTrained: false, otherModifier: 0 },
      { id: 'enganacao', name: 'Enganação', attribute: 'carisma', isTrained: false, otherModifier: 0 },
      { id: 'fortitude', name: 'Fortitude', attribute: 'constituicao', isTrained: false, otherModifier: 0 },
      { id: 'furtividade', name: 'Furtividade', attribute: 'destreza', isTrained: false, otherModifier: 0 },
      { id: 'guerra', name: 'Guerra', attribute: 'inteligencia', isTrained: false, otherModifier: 0 },
      { id: 'iniciativa', name: 'Iniciativa', attribute: 'destreza', isTrained: false, otherModifier: 0 },
      { id: 'intimidacao', name: 'Intimidação', attribute: 'carisma', isTrained: false, otherModifier: 0 },
      { id: 'intuicao', name: 'Intuição', attribute: 'sabedoria', isTrained: false, otherModifier: 0 },
      { id: 'investigacao', name: 'Investigação', attribute: 'inteligencia', isTrained: false, otherModifier: 0 },
      { id: 'jogatina', name: 'Jogatina', attribute: 'carisma', isTrained: false, otherModifier: 0 },
      { id: 'ladinagem', name: 'Ladinagem', attribute: 'destreza', isTrained: false, otherModifier: 0 },
      { id: 'luta', name: 'Luta', attribute: 'forca', isTrained: false, otherModifier: 0 },
      { id: 'misticismo', name: 'Misticismo', attribute: 'inteligencia', isTrained: false, otherModifier: 0 },
      { id: 'nobreza', name: 'Nobreza', attribute: 'inteligencia', isTrained: false, otherModifier: 0 },
      { id: 'oficio', name: 'Ofício', attribute: 'inteligencia', isTrained: false, otherModifier: 0 },
      { id: 'percepcao', name: 'Percepção', attribute: 'sabedoria', isTrained: false, otherModifier: 0 },
      { id: 'pilotagem', name: 'Pilotagem', attribute: 'destreza', isTrained: false, otherModifier: 0 },
      { id: 'pontaria', name: 'Pontaria', attribute: 'destreza', isTrained: false, otherModifier: 0 },
      { id: 'reflexos', name: 'Reflexos', attribute: 'destreza', isTrained: false, otherModifier: 0 },
      { id: 'religiao', name: 'Religião', attribute: 'sabedoria', isTrained: false, otherModifier: 0 },
      { id: 'sobrevivencia', name: 'Sobrevivência', attribute: 'sabedoria', isTrained: false, otherModifier: 0 },
      { id: 'vontade', name: 'Vontade', attribute: 'sabedoria', isTrained: false, otherModifier: 0 },
    ],
  };

  return { vitals, sheetData };
}