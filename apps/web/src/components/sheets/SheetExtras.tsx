import { useState, useEffect } from 'react';
import {
  SystemId,
  PreparedAttack,
  CharacterAbility,
  RPGItem,
  SceneEffect,
  CompendiumEntryData,
  ComputedBonuses,
  OrdemSheetData,
  ORDEM_ORIGINS,
  ORDEM_PATENTS,
  checkOrdemPowerRequirements,
  parseOrdemRitualForms,
  OrdemRitualCastForm,
  getOrdemPeLimit,
  getOrdemAtaqueEspecialMaxTier,
  boostCritMultiplier,
  boostCritRangeBySteps,
  AttackDamageRollPayload,
  ForcaOpressoraRollPayload,
  SegurarGatilhoPayload,
  CursePricePrompt,
  parseCritRange,
  classifyOrdemWeapon,
} from '@totalrpg/shared';
import { ImageUploadField } from '../ImageUploadField';

interface SheetExtrasProps {
  system: SystemId;
  ordemSheetData?: OrdemSheetData;
  bonuses: ComputedBonuses;
  compendiumEntries: CompendiumEntryData[];
  isEditMode: boolean;
  canEditInventory: boolean;
  canEditAbilities: boolean;
  canCreateCustom: boolean;
  canTrade?: boolean;
  attacks: PreparedAttack[];
  abilities: CharacterAbility[];
  inventory: RPGItem[];
  maxLoadSlots: number;
  onUpdateAttacks: (attacks: PreparedAttack[]) => void;
  onUpdateAbilities: (abilities: CharacterAbility[]) => void;
  onUpdateInventory: (inventory: RPGItem[]) => void;
  onAddItemAndAttack: (newItem: RPGItem, newAttack?: PreparedAttack) => void;
  onInitiateTradeItem?: (item: RPGItem) => void;
  onCheckResource?: (amount: number, powerLabel?: string) => boolean;
  onSpendResource: (amount: number, extraSceneEffect?: SceneEffect) => boolean;
  onHealPv?: (amount: number, reason?: string) => void;
  onTakePvDamage?: (amount: number, reason?: string) => void;
  onGrantTempPe?: (amount: number, reason?: string) => void;
  onLoseSanity?: (amount: number, reason: string) => void;
  onAddSceneEffect?: (effect: SceneEffect) => void;
  onRoll: (
    label: string,
    count: number,
    sides: number,
    modifier: number,
    isDamage?: boolean,
    attackDamagePayload?: AttackDamageRollPayload,
    forcaOpressoraPayload?: ForcaOpressoraRollPayload,
    extraRollOpts?: {
      explodingDieSide?: number;
      extraDice?: Array<{ count: number; sides: number; label: string }>;
      cursePricePrompt?: CursePricePrompt;
    }
  ) => void;
  onCastOrdemRitual?: (ritual: CharacterAbility, form: OrdemRitualCastForm) => void;
  onTriggerOriginSpecial?: (originId: string) => void;
  vislumbresSuccessPending?: boolean;
  onRollVislumbresPe?: () => void;
  hasActiveInitiativeOrder?: boolean;
  turnResetSignal?: number;
}

function parseDiceFormula(formula: string): { count: number; sides: number; modifier: number } {
  const clean = formula.toLowerCase().replace(/\s+/g, '');
  const match = clean.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) {
    return { count: 1, sides: 6, modifier: 0 };
  }
  return {
    count: parseInt(match[1], 10),
    sides: parseInt(match[2], 10),
    modifier: match[3] ? parseInt(match[3], 10) : 0,
  };
}

export function SheetExtras({
  system,
  ordemSheetData,
  bonuses,
  compendiumEntries,
  isEditMode,
  canEditInventory,
  canEditAbilities,
  canCreateCustom,
  canTrade,
  attacks,
  abilities,
  inventory,
  maxLoadSlots,
  onUpdateAttacks,
  onUpdateAbilities,
  onUpdateInventory,
  onAddItemAndAttack,
  onInitiateTradeItem,
  onCheckResource,
  onSpendResource,
  onRoll,
  onCastOrdemRitual,
  onTriggerOriginSpecial,
  vislumbresSuccessPending,
  onRollVislumbresPe,
  hasActiveInitiativeOrder,
  turnResetSignal,
}: SheetExtrasProps) {
  const [activeSubTab, setActiveSubTab] = useState<'combat' | 'powers' | 'spells' | 'inventory'>('combat');

  const normOrigin = (ordemSheetData?.origin || '').trim().toLowerCase();
  const originObj = ORDEM_ORIGINS.find(
    (o) => o.id === normOrigin || o.name.toLowerCase() === normOrigin
  );
  const originId = originObj?.id || '';
  const hasMochilaUtilidades = abilities.some((ab) =>
    ab.name.toLowerCase().includes('mochila de utilidades')
  );

  // Detecção de Habilidades, Poderes e Trilhas de Combatente (Livro v1.3, p. 24-27)
  const isOrdemSystem = system === 'ordem-paranormal' && Boolean(ordemSheetData);
  const ordemNex = ordemSheetData?.nex ?? 5;
  const effFor = isOrdemSystem
    ? (ordemSheetData!.attributes.for || 0) + (bonuses.attributes['for'] || 0)
    : 0;
  const effAgi = isOrdemSystem
    ? (ordemSheetData!.attributes.agi || 0) + (bonuses.attributes['agi'] || 0)
    : 0;
  const peTurnLimit = isOrdemSystem
    ? getOrdemPeLimit(ordemNex, ordemSheetData!.origin, abilities)
    : 20;

  const hasAtaqueEspecial =
    isOrdemSystem &&
    (ordemSheetData!.characterClass === 'combatente' ||
      abilities.some((a) => a.name.toLowerCase().includes('ataque especial')));
  const maxAeTotalBonus = isOrdemSystem
    ? getOrdemAtaqueEspecialMaxTier(ordemNex).totalBonus
    : 5;

  const combateDefensivoAb = abilities.find(
    (a) =>
      a.id === 'ord-pwr-comb-defensivo' ||
      a.name.toLowerCase().includes('combate defensivo')
  );
  const duasArmasAb = abilities.find(
    (a) =>
      a.id === 'ord-pwr-comb-duas-armas' ||
      a.name.toLowerCase().includes('combater com duas armas')
  );
  const hasGolpeDemolidor = abilities.some(
    (a) =>
      a.id === 'ord-pwr-comb-golpe-demolidor' ||
      a.name.toLowerCase().includes('golpe demolidor')
  );
  const hasGolpePesado = abilities.some(
    (a) =>
      a.isActive !== false &&
      (a.id === 'ord-pwr-comb-golpe-pesado' ||
        a.name.toLowerCase().includes('golpe pesado'))
  );
  const hasArtistaMarcial = abilities.some(
    (a) =>
      a.id === 'ord-pwr-comb-artista-marcial' ||
      a.name.toLowerCase().includes('artista marcial')
  );
  const hasTiroCerteiro = abilities.some(
    (a) =>
      a.isActive !== false &&
      (a.id === 'ord-pwr-comb-tiro-certeiro' ||
        a.name.toLowerCase().includes('tiro certeiro'))
  );
  const hasSegurarGatilho = abilities.some(
    (a) =>
      a.id === 'ord-pwr-comb-segurar-gatilho' ||
      a.name.toLowerCase().includes('segurar o gatilho') ||
      a.name.toLowerCase().includes('segurar gatilho')
  );

  // Trilhas de Combatente
  const hasAFavorita = abilities.some(
    (a) =>
      a.id === 'trail-aniquilador-10' ||
      a.name.toLowerCase().includes('a favorita')
  );
  const hasChosenAniquiladorFavorite =
    attacks.some((a) => Boolean(a.isAniquiladorFavorite)) ||
    inventory.some((it) => Boolean(it.isAniquiladorFavorite));
  const canChangeAniquiladorFavorite =
    !hasChosenAniquiladorFavorite || (isEditMode && canEditInventory);

  const hasTecnicaSecreta = abilities.some(
    (a) =>
      a.id === 'trail-aniquilador-40' ||
      a.name.toLowerCase().includes('técnica secreta') ||
      a.name.toLowerCase().includes('tecnica secreta')
  );
  const hasTecnicaSublime = abilities.some(
    (a) =>
      a.id === 'trail-aniquilador-65' ||
      a.name.toLowerCase().includes('técnica sublime') ||
      a.name.toLowerCase().includes('tecnica sublime')
  );
  const hasMaquinaMatar = abilities.some(
    (a) =>
      a.id === 'trail-aniquilador-99' ||
      a.name.toLowerCase().includes('máquina de matar') ||
      a.name.toLowerCase().includes('maquina de matar')
  );
  const aniquiladorCatReduction = hasMaquinaMatar
    ? 3
    : hasTecnicaSecreta
    ? 2
    : hasAFavorita
    ? 1
    : 0;

  const hasTecnicaLetal = abilities.some(
    (a) =>
      a.id === 'trail-guerreiro-10' ||
      a.name.toLowerCase().includes('técnica letal') ||
      a.name.toLowerCase().includes('tecnica letal')
  );
  const hasForcaOpressora = abilities.some(
    (a) =>
      a.id === 'trail-guerreiro-65' ||
      a.name.toLowerCase().includes('força opressora') ||
      a.name.toLowerCase().includes('forca opressora')
  );
  const hasPotenciaMaxima = abilities.some(
    (a) =>
      a.id === 'trail-guerreiro-99' ||
      a.name.toLowerCase().includes('potência máxima') ||
      a.name.toLowerCase().includes('potencia maxima')
  );

  function hasDedicatedControlElsewhere(ab: CharacterAbility): boolean {
    const lowerId = (ab.id || '').toLowerCase();
    const lowerName = (ab.name || '').toLowerCase();

    // Poderes de Origem com botão dedicado na seção de Perícias (OrdemSheet.tsx)
    if (
      [
        'orig-academico',
        'orig-atleta',
        'orig-executivo',
        'orig-investigador',
        'orig-trabalhador_rural',
        'orig-ti',
        'orig-trambiqueiro',
      ].includes(lowerId) ||
      lowerName.includes('saber é poder') ||
      lowerName.includes('saber e poder') ||
      lowerName.includes('110%') ||
      lowerName.includes('processo otimizado') ||
      lowerName.includes('faro para pistas') ||
      lowerName.includes('desbravador') ||
      lowerName.includes('motor de busca') ||
      lowerName.includes('impostor')
    ) {
      return true;
    }

    // Habilidades, Poderes e Trilhas de Combatente com interface/botão dedicado na aba Ataques ou no Modal de Rolagem
    if (
      lowerName.includes('ataque especial') ||
      lowerId === 'ord-pwr-comb-golpe-demolidor' ||
      lowerName.includes('golpe demolidor') ||
      lowerId === 'ord-pwr-comb-segurar-gatilho' ||
      lowerName.includes('segurar o gatilho') ||
      lowerId === 'ord-pwr-comb-artista-marcial' ||
      lowerName.includes('artista marcial') ||
      lowerId === 'ord-pwr-comb-defensivo' ||
      lowerName.includes('combate defensivo') ||
      lowerId === 'ord-pwr-comb-duas-armas' ||
      lowerName.includes('combater com duas armas') ||
      lowerId === 'trail-aniquilador-40' ||
      lowerName.includes('técnica secreta') ||
      lowerName.includes('tecnica secreta') ||
      lowerId === 'trail-aniquilador-65' ||
      lowerName.includes('técnica sublime') ||
      lowerName.includes('tecnica sublime') ||
      lowerId === 'trail-guerreiro-65' ||
      lowerName.includes('força opressora') ||
      lowerName.includes('forca opressora')
    ) {
      return true;
    }

    return false;
  }

  function clampAeConfig(rawAtk: number, rawDmg: number, maxBonus: number): { atk: number; dmg: number } {
    let atk = Math.max(0, Math.floor(rawAtk / 5) * 5);
    let dmg = Math.max(0, Math.floor(rawDmg / 5) * 5);
    if (atk + dmg > maxBonus) {
      const excess = atk + dmg - maxBonus;
      const dmgDrop = Math.min(dmg, excess);
      dmg -= dmgDrop;
      const remExcess = excess - dmgDrop;
      if (remExcess > 0) {
        atk = Math.max(0, atk - remExcess);
      }
    }
    if (atk + dmg === 0) {
      return { atk: Math.min(5, maxBonus), dmg: 0 };
    }
    return { atk, dmg };
  }

  function loadSavedAeConfig(maxBonus: number): { atk: number; dmg: number } {
    try {
      const raw = localStorage.getItem('totalrpg_last_ae_config');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.atk === 'number' && typeof parsed?.dmg === 'number') {
          return clampAeConfig(parsed.atk, parsed.dmg, maxBonus);
        }
      }
    } catch {
      // ignora erro de localStorage
    }
    return { atk: 5, dmg: 0 };
  }

  // Estados táticos interativos de combate (Interface Contextual Ataque Especial, Golpe Demolidor, Técnica Secreta, Segurar o Gatilho)
  const [activeAeAttackId, setActiveAeAttackId] = useState<string | null>(null);
  const [aeAtkInvest, setAeAtkInvest] = useState<number>(() => loadSavedAeConfig(maxAeTotalBonus).atk);
  const [aeDmgInvest, setAeDmgInvest] = useState<number>(() => loadSavedAeConfig(maxAeTotalBonus).dmg);

  function updateAeInvestment(nextAtk: number, nextDmg: number) {
    setAeAtkInvest(nextAtk);
    setAeDmgInvest(nextDmg);
    try {
      if (nextAtk + nextDmg > 0) {
        localStorage.setItem(
          'totalrpg_last_ae_config',
          JSON.stringify({ atk: nextAtk, dmg: nextDmg })
        );
      }
    } catch {
      // ignora erro de localStorage
    }
  }
  const [pendingSpecialDamageBonus, setPendingSpecialDamageBonus] = useState<{
    attackId: string;
    dmgBonus: number;
  } | null>(null);
  const [armedGolpeDemolidor, setArmedGolpeDemolidor] = useState<boolean>(false);
  const [segurarGatilhoStep, setSegurarGatilhoStep] = useState<number>(1);
  const [aimingByAttackId, setAimingByAttackId] = useState<Record<string, boolean>>({});
  const [secAmplo, setSecAmplo] = useState<boolean>(false);
  const [secDestruidor, setSecDestruidor] = useState<boolean>(false);
  const [secLetal, setSecLetal] = useState<0 | 1 | 2>(0);
  const [secPerfurante, setSecPerfurante] = useState<boolean>(false);
  const [combatTabFeedback, setCombatTabFeedback] = useState<string>('');

  // Sincroniza passo de Segurar o Gatilho usado dentro do modal de lote
  useEffect(() => {
    function handleSgStepEvent(e: Event) {
      const custom = e as CustomEvent<{ step?: number }>;
      if (typeof custom.detail?.step === 'number') {
        setSegurarGatilhoStep(custom.detail.step);
      }
    }
    window.addEventListener('totalrpg:sg-step', handleSgStepEvent);
    return () => window.removeEventListener('totalrpg:sg-step', handleSgStepEvent);
  }, []);

  // Quando o turno do personagem chega na ordem de iniciativa da mesa, reseta o passo de Segurar o Gatilho e bônus residuais
  useEffect(() => {
    if (turnResetSignal && turnResetSignal > 0) {
      setSegurarGatilhoStep(1);
      setActiveAeAttackId(null);
      setPendingSpecialDamageBonus(null);
    }
  }, [turnResetSignal]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'compendium' | 'custom'>('compendium');
  const [searchQuery, setSearchQuery] = useState('');
  const [compendiumPowerTypeFilter, setCompendiumPowerTypeFilter] = useState<'ALL' | 'power' | 'paranormal_power'>('ALL');
  const [compendiumElementFilter, setCompendiumElementFilter] = useState<string>('ALL');
  const [compendiumCircleFilter, setCompendiumCircleFilter] = useState<number | 'ALL'>('ALL');
  const [abilityUseFeedback, setAbilityUseFeedback] = useState<string>('');

  const [atkName, setAtkName] = useState('');
  const [atkDice, setAtkDice] = useState(1);
  const [atkBonus, setAtkBonus] = useState(5);
  const [atkDamage, setAtkDamage] = useState('1d8+2');
  const [atkCrit, setAtkCrit] = useState('19/x2');

  const [abName, setAbName] = useState('');
  const [abCost, setAbCost] = useState(0);
  const [abDamage, setAbDamage] = useState('');
  const [abDesc, setAbDesc] = useState('');

  const [itemName, setItemName] = useState('');
  const [itemSlots, setItemSlots] = useState(1);
  const [itemQty, setItemQty] = useState(1);
  const [itemImageUrl, setItemImageUrl] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [zoomedItemImage, setZoomedItemImage] = useState<{ name: string; url: string } | null>(null);

  const resourceLabel = system === 'ordem-paranormal' ? 'PE' : 'PM';
  const spellLabel = system === 'ordem-paranormal' ? 'Ritual' : 'Magia';
  const spellPluralLabel = system === 'ordem-paranormal' ? 'Rituais' : 'Magias';

  const allowInv = isEditMode && canEditInventory;
  const allowAb = isEditMode && canEditAbilities;

  const effectiveMaxSlots = maxLoadSlots + bonuses.loadLimit;
  const currentLoad = inventory.reduce((acc, item) => acc + item.slots * (item.quantity || 1), 0);
  const isOverloaded = currentLoad > effectiveMaxSlots;

  const powerList = abilities.filter((ab) => ab.category !== 'ritual' && ab.category !== 'magia');
  const spellList = abilities.filter((ab) => ab.category === 'ritual' || ab.category === 'magia');

  function openAddModal() {
    setSearchQuery('');
    setCompendiumPowerTypeFilter('ALL');
    setCompendiumElementFilter('ALL');
    setCompendiumCircleFilter('ALL');
    setModalMode(activeSubTab === 'combat' ? 'custom' : 'compendium');
    setIsAddModalOpen(true);
  }

  function handleSelectFromCompendium(entry: CompendiumEntryData, chosenElement?: string) {
    const newId = Math.random().toString(36).substring(2, 9);

    if (
      entry.category === 'power' ||
      entry.category === 'paranormal_power' ||
      entry.category === 'spell' ||
      entry.category === 'origin'
    ) {
      const isAmaldicoar =
        entry.id === 'ord-rit-amaldicoar-arma' ||
        entry.name.toLowerCase().includes('amaldiçoar arma');
      const requiresManualToggle =
        entry.id === 'ord-pwr-comb-defensivo' ||
        entry.id === 'ord-pwr-comb-duas-armas';
      const isPassive =
        entry.cost === 0 && !entry.metadata?.damageFormula && !requiresManualToggle;
      const finalName = chosenElement
        ? `Amaldiçoar Arma — ${chosenElement} (1º Círculo)`
        : entry.name;
      const finalDesc = chosenElement
        ? `[Elemento: ${chosenElement}] ${entry.description}`
        : entry.description;

      const newAb: CharacterAbility = {
        id: newId,
        name: finalName,
        category:
          entry.category === 'spell'
            ? system === 'ordem-paranormal'
              ? 'ritual'
              : 'magia'
            : entry.category === 'paranormal_power'
            ? 'poder_paranormal'
            : 'poder',
        cost: entry.cost,
        element: chosenElement || entry.metadata?.element,
        description: finalDesc,
        damageFormula: isAmaldicoar ? undefined : entry.metadata?.damageFormula,
        isActive: isPassive ? true : false,
        modifiers: entry.modifiers || [],
      };
      onUpdateAbilities([...abilities, newAb]);
      setIsAddModalOpen(false);
    } else if (entry.category === 'item') {
      const catLevel = entry.metadata?.categoryLevel ?? entry.cost ?? 0;
      const newItem: RPGItem = {
        id: newId,
        name: entry.name,
        slots: entry.metadata?.slots ?? 1,
        quantity: 1,
        category: catLevel,
        isEquipped: true,
        description: entry.description,
        modifiers: entry.modifiers || [],
      };

      let newAtk: PreparedAttack | undefined = undefined;
      if (entry.metadata?.damageFormula) {
        const classif = classifyOrdemWeapon(
          entry.name,
          entry.description,
          undefined,
          entry.metadata?.element
        );
        const pontariaSk =
          system === 'ordem-paranormal' && ordemSheetData
            ? ordemSheetData.skills.find((s) => s.id === 'pontaria')
            : undefined;
        const lutaSk =
          system === 'ordem-paranormal' && ordemSheetData
            ? ordemSheetData.skills.find((s) => s.id === 'luta')
            : undefined;
        const activeSkill = classif.isRanged ? pontariaSk : lutaSk;
        const skillBonus = activeSkill
          ? (activeSkill.trainingDegree || 0) + (activeSkill.otherModifier || 0)
          : 0;
        const attrVal =
          system === 'ordem-paranormal' && ordemSheetData
            ? classif.isRanged
              ? ordemSheetData.attributes.agi
              : classif.isAgile
              ? Math.max(ordemSheetData.attributes.for, ordemSheetData.attributes.agi)
              : ordemSheetData.attributes.for
            : 1;

        newAtk = {
          id: Math.random().toString(36).substring(2, 9),
          name: entry.name,
          diceCount: Math.max(1, attrVal),
          attackBonus: skillBonus,
          damageFormula: entry.metadata.damageFormula,
          critRange: entry.metadata.critRange || '20/x2',
          damageType:
            entry.metadata.element ||
            (classif.isFirearm ? 'Balístico' : classif.isDisparo ? 'Perfuração' : 'Impacto'),
          isMelee: classif.isMelee,
          isFirearm: classif.isFirearm,
          isDisparo: classif.isDisparo,
        };
      }

      onAddItemAndAttack(newItem, newAtk);
      setIsAddModalOpen(false);
    }
  }

  function handleAddAttack(e: React.FormEvent) {
    e.preventDefault();
    if (!atkName.trim()) return;
    const classif = classifyOrdemWeapon(atkName.trim());
    onUpdateAttacks([
      ...attacks,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: atkName.trim(),
        diceCount: atkDice,
        attackBonus: atkBonus,
        damageFormula: atkDamage.trim() || '1d6',
        critRange: atkCrit.trim() || '20/x2',
        damageType: classif.isFirearm ? 'Balístico' : classif.isDisparo ? 'Perfuração' : 'Impacto',
        isMelee: classif.isMelee,
        isFirearm: classif.isFirearm,
        isDisparo: classif.isDisparo,
      },
    ]);
    setAtkName('');
    setIsAddModalOpen(false);
  }

  function handleAddCustomAbility(e: React.FormEvent) {
    e.preventDefault();
    if (!abName.trim()) return;
    const isSpellTab = activeSubTab === 'spells';
    onUpdateAbilities([
      ...abilities,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: abName.trim(),
        category: isSpellTab ? (system === 'ordem-paranormal' ? 'ritual' : 'magia') : 'poder',
        cost: Math.max(0, abCost),
        description: abDesc.trim(),
        damageFormula: abDamage.trim() || undefined,
        isActive: abCost === 0 && !abDamage.trim(),
        modifiers: [],
      },
    ]);
    setAbName('');
    setAbDesc('');
    setAbDamage('');
    setAbCost(0);
    setIsAddModalOpen(false);
  }

  function handleAddCustomItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemName.trim()) return;
    onUpdateInventory([
      ...inventory,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: itemName.trim(),
        slots: Math.max(0, itemSlots),
        quantity: Math.max(1, itemQty),
        imageUrl: itemImageUrl.trim() || undefined,
        description: itemDesc.trim() || undefined,
        isEquipped: true,
        modifiers: [],
      },
    ]);
    setItemName('');
    setItemSlots(1);
    setItemQty(1);
    setItemImageUrl('');
    setItemDesc('');
    setIsAddModalOpen(false);
  }

  function handleUseAbility(ab: CharacterAbility) {
    if (ab.cost > 0) {
      const ok = onSpendResource(ab.cost);
      if (!ok) return;
    }
    if (ab.damageFormula) {
      const parsed = parseDiceFormula(ab.damageFormula);
      onRoll(`${ab.name} (Efeito)`, parsed.count, parsed.sides, parsed.modifier, true);
    } else {
      // Poderes sem fórmula de dano (ex.: Ampliar Ritual, Ataque Especial, Perito) apenas descontam PE e ativam bônus se houver
      if (ab.modifiers && ab.modifiers.length > 0 && ab.isActive === false) {
        onUpdateAbilities(
          abilities.map((item) => (item.id === ab.id ? { ...item, isActive: true } : item))
        );
      }
      setAbilityUseFeedback(
        `✨ ${ab.name} ativado${ab.cost > 0 ? ` (-${ab.cost} ${resourceLabel} descontado)` : ''}!`
      );
      setTimeout(() => setAbilityUseFeedback(''), 4000);
    }
  }

  function toggleAbilityActive(id: string) {
    onUpdateAbilities(
      abilities.map((ab) => (ab.id === id ? { ...ab, isActive: ab.isActive === false ? true : false } : ab))
    );
  }

  function toggleItemEquipped(id: string) {
    onUpdateInventory(
      inventory.map((it) => (it.id === id ? { ...it, isEquipped: !it.isEquipped } : it))
    );
  }

  const modalCompendiumList = compendiumEntries
    .filter((entry) => {
      const lowerEntryName = entry.name.trim().toLowerCase();
      if (
        lowerEntryName === 'ataque especial (combatente)' ||
        lowerEntryName === 'resistir a <elemento> (poder paranormal)'
      ) {
        return false;
      }

      const matchesSearch =
        entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.metadata?.element || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (activeSubTab === 'powers') {
        const isPowerCat =
          entry.category === 'power' ||
          entry.category === 'paranormal_power' ||
          entry.category === 'origin';
        if (!isPowerCat) return false;
        if (compendiumPowerTypeFilter !== 'ALL' && entry.category !== compendiumPowerTypeFilter) {
          return false;
        }
        if (
          compendiumElementFilter !== 'ALL' &&
          (entry.metadata?.element || '').toLowerCase() !== compendiumElementFilter.toLowerCase()
        ) {
          return false;
        }
        return true;
      }
      if (activeSubTab === 'spells') {
        if (entry.category !== 'spell') return false;
        if (
          compendiumCircleFilter !== 'ALL' &&
          (entry.metadata?.circle || 1) !== compendiumCircleFilter
        ) {
          return false;
        }
        if (
          compendiumElementFilter !== 'ALL' &&
          (entry.metadata?.element || '').toLowerCase() !== compendiumElementFilter.toLowerCase()
        ) {
          return false;
        }
        return true;
      }
      if (activeSubTab === 'inventory') return entry.category === 'item';
      return false;
    })
    .sort((a, b) => {
      if (
        activeSubTab === 'powers' &&
        system === 'ordem-paranormal' &&
        ordemSheetData
      ) {
        const getPriority = (entry: CompendiumEntryData): number => {
          const owned = abilities.some(
            (ab) => ab.name.trim().toLowerCase() === entry.name.trim().toLowerCase()
          );
          if (owned) return 2;
          const met =
            entry.category === 'power' || entry.category === 'paranormal_power'
              ? checkOrdemPowerRequirements(entry, ordemSheetData, abilities).met
              : true;
          return met ? 0 : 1;
        };
        const pA = getPriority(a);
        const pB = getPriority(b);
        if (pA !== pB) return pA - pB;
      }
      return a.name.localeCompare(b.name, 'pt-BR');
    });

  let addButtonLabel = '';
  let canShowAddButton = false;

  if (activeSubTab === 'combat' && allowInv && canCreateCustom) {
    addButtonLabel = '+ Novo Ataque';
    canShowAddButton = true;
  } else if (activeSubTab === 'powers' && allowAb) {
    addButtonLabel = '+ Adicionar Poder';
    canShowAddButton = true;
  } else if (activeSubTab === 'spells' && allowAb) {
    addButtonLabel = `+ Adicionar ${spellLabel}`;
    canShowAddButton = true;
  } else if (activeSubTab === 'inventory' && allowInv) {
    addButtonLabel = '+ Adicionar Item';
    canShowAddButton = true;
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-5">
      {/* MODAL DE ADIÇÃO E PESQUISA NO COMPÊNDIO */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh]">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-amber-500">
                  {activeSubTab === 'powers' && '📚 Adicionar Poder à Ficha'}
                  {activeSubTab === 'spells' && `🔮 Adicionar ${spellLabel} à Ficha`}
                  {activeSubTab === 'inventory' && '🎒 Adicionar Item ou Arma'}
                  {activeSubTab === 'combat' && '⚔️ Criar Ataque Personalizado'}
                </h3>
                <p className="text-xs text-zinc-400">
                  {modalMode === 'compendium'
                    ? 'Pesquise no catálogo oficial do sistema para importar com os cálculos automáticos.'
                    : 'Criação manual exclusiva de Mestre / Admin.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-white text-sm font-bold px-2.5 py-1 bg-zinc-800 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {canCreateCustom && activeSubTab !== 'combat' && (
              <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalMode('compendium')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    modalMode === 'compendium' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  📚 Catálogo do Compêndio
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode('custom')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    modalMode === 'custom' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  🛠️ Criar Personalizado (Mestre/Admin)
                </button>
              </div>
            )}

            {modalMode === 'compendium' && activeSubTab !== 'combat' ? (
              <div className="flex flex-col gap-3 overflow-hidden">
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Digite o nome, elemento ou efeito para filtrar..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />

                {activeSubTab === 'powers' && system === 'ordem-paranormal' && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'ALL', label: 'Todos' },
                        { id: 'power', label: '⚔️ Poderes de Classe' },
                        { id: 'paranormal_power', label: '👁️ Poderes Paranormais' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setCompendiumPowerTypeFilter(tab.id as any)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                            compendiumPowerTypeFilter === tab.id
                              ? 'bg-amber-600 border-amber-500 text-white'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {compendiumPowerTypeFilter === 'paranormal_power' && (
                      <div className="flex flex-wrap gap-1">
                        {['ALL', 'Sangue', 'Morte', 'Conhecimento', 'Energia'].map((el) => (
                          <button
                            key={el}
                            type="button"
                            onClick={() => setCompendiumElementFilter(el)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                              compendiumElementFilter === el
                                ? 'bg-purple-700 border-purple-500 text-white'
                                : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                            }`}
                          >
                            {el === 'ALL' ? 'Todos Elem.' : el}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeSubTab === 'spells' && system === 'ordem-paranormal' && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1">
                      {(['ALL', 1, 2, 3, 4] as const).map((circ) => (
                        <button
                          key={String(circ)}
                          type="button"
                          onClick={() => setCompendiumCircleFilter(circ)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                            compendiumCircleFilter === circ
                              ? 'bg-purple-700 border-purple-500 text-white'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          {circ === 'ALL' ? 'Todos Círculos' : `${circ}º Círculo`}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {['ALL', 'Sangue', 'Morte', 'Conhecimento', 'Energia', 'Medo'].map((el) => (
                        <button
                          key={el}
                          type="button"
                          onClick={() => setCompendiumElementFilter(el)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                            compendiumElementFilter === el
                              ? 'bg-amber-600 border-amber-500 text-white'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          {el === 'ALL' ? 'Todos Elem.' : el}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2 overflow-y-auto pr-1 max-h-[420px]">
                  {modalCompendiumList.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 text-xs">
                      Nenhum registro encontrado no Compêndio para esta categoria.
                    </div>
                  ) : (
                    modalCompendiumList.map((entry) => {
                      const reqCheck =
                        system === 'ordem-paranormal' &&
                        ordemSheetData &&
                        (entry.category === 'power' || entry.category === 'paranormal_power')
                          ? checkOrdemPowerRequirements(entry, ordemSheetData, abilities)
                          : { met: true, missing: [] };

                      const alreadyOwned =
                        entry.category !== 'item' &&
                        abilities.some(
                          (ab) => ab.name.trim().toLowerCase() === entry.name.trim().toLowerCase()
                        );

                      return (
                        <div
                          key={entry.id}
                          className={`bg-zinc-950 border p-3.5 rounded-xl flex justify-between items-center gap-4 transition ${
                            alreadyOwned
                              ? 'border-zinc-800/60 opacity-60'
                              : 'border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-white">{entry.name}</span>
                              {entry.category === 'paranormal_power' && (
                                <span className="text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded">
                                  👁️ Paranormal {entry.metadata?.element ? `• ${entry.metadata.element}` : ''}
                                </span>
                              )}
                              {entry.category === 'spell' && entry.metadata?.circle && (
                                <span className="text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded">
                                  {entry.metadata.circle}º Círculo • {entry.metadata.element || 'Paranormal'}
                                </span>
                              )}
                              {entry.cost > 0 && entry.category !== 'item' && (
                                <span className="text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded">
                                  {entry.cost} {resourceLabel}
                                </span>
                              )}
                              {entry.metadata?.damageFormula && (
                                <span className="text-[10px] font-mono bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded">
                                  🎲 {entry.metadata.damageFormula}
                                </span>
                              )}
                              {entry.category === 'item' && (
                                <span className="text-[10px] font-mono text-amber-400">
                                  Cat. {entry.metadata?.categoryLevel ?? entry.cost ?? 0} • {entry.metadata?.slots ?? 1} esp.
                                </span>
                              )}
                              {entry.metadata?.requirements && (
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                    reqCheck.met
                                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                                      : 'bg-amber-950/60 text-amber-300 border-amber-800'
                                  }`}
                                >
                                  {reqCheck.met
                                    ? `✓ Req: ${entry.metadata.requirements}`
                                    : `🔒 Faltam: ${reqCheck.missing.join(', ')}`}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-400">{entry.description}</p>
                          </div>

                          {entry.id === 'ord-rit-amaldicoar-arma' ||
                          entry.name.toLowerCase().includes('amaldiçoar arma') ? (
                            <div className="flex flex-col gap-1 shrink-0">
                              <span className="text-[10px] font-bold text-amber-400 text-right">
                                Escolha o elemento:
                              </span>
                              <div className="grid grid-cols-2 gap-1">
                                {(['Sangue', 'Morte', 'Conhecimento', 'Energia'] as const).map((el) => {
                                  const hasThisEl = abilities.some((ab) =>
                                    ab.name.toLowerCase().includes(`amaldiçoar arma — ${el.toLowerCase()}`)
                                  );
                                  return (
                                    <button
                                      key={el}
                                      type="button"
                                      disabled={hasThisEl}
                                      onClick={() => handleSelectFromCompendium(entry, el)}
                                      className={`px-2 py-1 rounded text-[10px] font-bold border ${
                                        hasThisEl
                                          ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'
                                          : 'bg-purple-800 hover:bg-purple-600 border-purple-500 text-white cursor-pointer'
                                      }`}
                                    >
                                      {hasThisEl ? `✓ ${el}` : `+ ${el}`}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={alreadyOwned || (!reqCheck.met && !canCreateCustom)}
                              onClick={() => handleSelectFromCompendium(entry)}
                              className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap shadow ${
                                alreadyOwned || (!reqCheck.met && !canCreateCustom)
                                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                  : 'bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer'
                              }`}
                            >
                              {alreadyOwned
                                ? '✓ Já possui'
                                : !reqCheck.met && !canCreateCustom
                                ? '🔒 Requisito'
                                : '+ Adicionar'}
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="pt-2">
                {activeSubTab === 'combat' && (
                  <form onSubmit={handleAddAttack} className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs text-zinc-400 mb-1">Nome da Arma / Ataque</label>
                        <input
                          type="text"
                          required
                          value={atkName}
                          onChange={(e) => setAtkName(e.target.value)}
                          placeholder="Ex: Katana, Garra..."
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Dados de Ataque (d20)</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={atkDice}
                          onChange={(e) => setAtkDice(Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Bônus de Acerto</label>
                        <input
                          type="number"
                          value={atkBonus}
                          onChange={(e) => setAtkBonus(Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Fórmula de Dano</label>
                        <input
                          type="text"
                          value={atkDamage}
                          onChange={(e) => setAtkDamage(e.target.value)}
                          placeholder="1d10+4"
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Margem de Crítico</label>
                        <input
                          type="text"
                          value={atkCrit}
                          onChange={(e) => setAtkCrit(e.target.value)}
                          placeholder="19/x2"
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold cursor-pointer mt-2"
                    >
                      Salvar Ataque na Ficha
                    </button>
                  </form>
                )}

                {(activeSubTab === 'powers' || activeSubTab === 'spells') && (
                  <form onSubmit={handleAddCustomAbility} className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs text-zinc-400 mb-1">Nome</label>
                        <input
                          type="text"
                          required
                          value={abName}
                          onChange={(e) => setAbName(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Custo ({resourceLabel})</label>
                        <input
                          type="number"
                          min={0}
                          value={abCost}
                          onChange={(e) => setAbCost(Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Fórmula de Dados (Opcional - deixe vazio se for passivo)</label>
                      <input
                        type="text"
                        value={abDamage}
                        onChange={(e) => setAbDamage(e.target.value)}
                        placeholder="Ex: 2d8+2"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Descrição</label>
                      <textarea
                        rows={3}
                        value={abDesc}
                        onChange={(e) => setAbDesc(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Salvar na Ficha
                    </button>
                  </form>
                )}

                {activeSubTab === 'inventory' && (
                  <form onSubmit={handleAddCustomItem} className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-zinc-400 mb-1">Nome do Item</label>
                        <input
                          type="text"
                          required
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Espaços</label>
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={itemSlots}
                          onChange={(e) => setItemSlots(Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Quantidade</label>
                        <input
                          type="number"
                          min={1}
                          value={itemQty}
                          onChange={(e) => setItemQty(Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <ImageUploadField
                        label="Imagem do Item (Opcional)"
                        value={itemImageUrl}
                        onChange={setItemImageUrl}
                      />
                      <div>
                        <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">
                          Descrição (Opcional)
                        </label>
                        <input
                          type="text"
                          value={itemDesc}
                          onChange={(e) => setItemDesc(e.target.value)}
                          placeholder="Detalhes ou efeito do item..."
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Guardar na Mochila
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BARRA DE SUB-ABAS COM BOTÃO DE ADICIONAR NA EXTREMA DIREITA */}
      <div className="flex flex-wrap justify-between items-center border-b border-zinc-800 gap-4 pb-2">
        <div className="flex flex-wrap gap-6">
          <button
            type="button"
            onClick={() => setActiveSubTab('combat')}
            className={`pb-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer border-b-2 ${
              activeSubTab === 'combat'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ⚔️ Ataques ({attacks.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('powers')}
            className={`pb-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer border-b-2 ${
              activeSubTab === 'powers'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ✨ Poderes ({powerList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('spells')}
            className={`pb-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer border-b-2 ${
              activeSubTab === 'spells'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            🔮 {spellPluralLabel} ({spellList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('inventory')}
            className={`pb-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer border-b-2 ${
              activeSubTab === 'inventory'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            🎒 Inventário ({currentLoad}/{effectiveMaxSlots})
          </button>
        </div>

        {canShowAddButton && (
          <button
            type="button"
            onClick={openAddModal}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow"
          >
            {addButtonLabel}
          </button>
        )}
      </div>

      {/* CONTEÚDO DA ABA 1: ATAQUES */}
      {activeSubTab === 'combat' && (
        <div className="flex flex-col gap-4">
          {combatTabFeedback && (
            <div className="bg-amber-950/70 border border-amber-500/70 text-amber-100 px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-between">
              <span>{combatTabFeedback}</span>
              <button
                type="button"
                onClick={() => setCombatTabFeedback('')}
                className="text-amber-300 hover:text-white ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* PAINEL TÁTICO DE COMBATENTE (Posturas e Ações de Combate) */}
          {isOrdemSystem &&
            (() => {
              const unarmedDieSides = ordemNex >= 70 ? 10 : ordemNex >= 35 ? 8 : 6;
              const hasUnarmedAttack = attacks.some(
                (a) => a.isUnarmed || a.name.toLowerCase().includes('desarmado')
              );
              const showTacticalBar =
                Boolean(combateDefensivoAb) ||
                Boolean(duasArmasAb) ||
                hasGolpeDemolidor ||
                (hasArtistaMarcial && !hasUnarmedAttack);
              if (!showTacticalBar) return null;

              return (
                <div className="bg-zinc-950 border border-red-900/50 rounded-xl p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {combateDefensivoAb && (
                      <button
                        type="button"
                        onClick={() => toggleAbilityActive(combateDefensivoAb.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          combateDefensivoAb.isActive !== false
                            ? 'bg-cyan-600 text-white border-cyan-300 shadow'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-cyan-300 border-cyan-800/70'
                        }`}
                        title="Quando ativo: +5 na Defesa e -1d20 nos ataques (dura até o seu próximo turno)"
                      >
                        {combateDefensivoAb.isActive !== false
                          ? '🛡️ Combate Defensivo ATIVO (+5 Def, -1d20 Atq)'
                          : '🛡️ Ativar Combate Defensivo (+5 Def, -1d20 Atq)'}
                      </button>
                    )}

                    {duasArmasAb && (
                      <button
                        type="button"
                        onClick={() => toggleAbilityActive(duasArmasAb.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          duasArmasAb.isActive !== false
                            ? 'bg-amber-600 text-white border-amber-300 shadow'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-amber-300 border-amber-800/70'
                        }`}
                        title="Quando ativo: faz 2 ataques sofrendo -1d20 nos testes de ataque"
                      >
                        {duasArmasAb.isActive !== false
                          ? '⚔️ Combater c/ Duas Armas ATIVO (-1d20 Atq)'
                          : '⚔️ Ativar Combater c/ Duas Armas (-1d20 Atq)'}
                      </button>
                    )}

                    {hasGolpeDemolidor && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!armedGolpeDemolidor && onCheckResource && !onCheckResource(1, 'Golpe Demolidor')) {
                            return;
                          }
                          setArmedGolpeDemolidor((prev) => !prev);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          armedGolpeDemolidor
                            ? 'bg-orange-600 text-white border-orange-300 shadow animate-pulse'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-orange-300 border-orange-800/70'
                        }`}
                        title="Quebrar / atacar objeto: gasta 1 PE para somar +2 dados de dano extra na próxima rolagem de dano"
                      >
                        {armedGolpeDemolidor
                          ? '🔨 Golpe Demolidor ARMADO (-1 PE → +2 dados no próx. dano)'
                          : '🔨 Armar Golpe Demolidor (-1 PE → +2 dados vs Objeto)'}
                      </button>
                    )}

                    {hasArtistaMarcial && !hasUnarmedAttack && (
                      <button
                        type="button"
                        onClick={() => {
                          const lutaSk = ordemSheetData?.skills.find((s) => s.id === 'luta');
                          onUpdateAttacks([
                            ...attacks,
                            {
                              id: `atk-unarmed-${Math.random().toString(36).slice(2, 7)}`,
                              name: 'Ataque Desarmado (Artista Marcial)',
                              diceCount: Math.max(1, Math.max(effFor, effAgi)),
                              attackBonus:
                                (lutaSk?.trainingDegree || 0) +
                                (lutaSk?.otherModifier || 0),
                              damageFormula: `1d${unarmedDieSides}`,
                              critRange: '20/x2',
                              damageType: 'Impacto',
                              isMelee: true,
                              isFirearm: false,
                              isUnarmed: true,
                            },
                          ]);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border bg-emerald-950/70 hover:bg-emerald-800 text-emerald-200 border-emerald-700 transition cursor-pointer"
                      >
                        🥋 + Adicionar Ataque Desarmado (1d{unarmedDieSides})
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

          {attacks.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-4">
              Nenhum ataque preparado. Adicione uma arma na aba &quot;🎒 Inventário&quot; para gerar seu ataque automaticamente!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {attacks.map((atk) => {
                // Classificação de arma (corpo a corpo, arremesso, disparo, arma de fogo, ágil, desarmado)
                const lowerAtkName = atk.name.toLowerCase();
                const invMatch = inventory.find(
                  (it) =>
                    it.name.toLowerCase() === lowerAtkName ||
                    lowerAtkName.includes(it.name.toLowerCase()) ||
                    it.name.toLowerCase().includes(lowerAtkName)
                );
                const compMatch = compendiumEntries.find(
                  (ce) =>
                    ce.category === 'item' &&
                    (ce.name.toLowerCase() === lowerAtkName ||
                      lowerAtkName.includes(ce.name.toLowerCase()) ||
                      ce.name.toLowerCase().includes(lowerAtkName))
                );
                const descLower = (invMatch?.description || compMatch?.description || '').toLowerCase();
                const isUnarmed = Boolean(atk.isUnarmed || lowerAtkName.includes('desarmado'));

                const weaponClass = classifyOrdemWeapon(
                  atk.name,
                  descLower,
                  atk.isFirearm,
                  atk.damageType,
                  isUnarmed
                );

                const isFirearm = weaponClass.isFirearm;
                const isDisparo = weaponClass.isDisparo;
                const isRanged = weaponClass.isRanged;
                const isMelee = weaponClass.isMelee;
                const isThrown = weaponClass.isThrown;
                const isAgile = weaponClass.isAgile || (isUnarmed && hasArtistaMarcial);
                const isArcoComposto = weaponClass.isArcoComposto;

                const isAniqFav =
                  hasAFavorita &&
                  Boolean(
                    atk.isAniquiladorFavorite ||
                      invMatch?.isAniquiladorFavorite
                  );

                // Base do dano (atualiza dado do Artista Marcial conforme NEX: 1d6 -> 1d8 -> 1d10)
                const rawDmgParsed = parseDiceFormula(atk.damageFormula);
                const artMarcialSides = ordemNex >= 70 ? 10 : ordemNex >= 35 ? 8 : 6;
                const effectiveDamageSides =
                  isUnarmed && hasArtistaMarcial ? artMarcialSides : rawDmgParsed.sides;

                // Dados de Dano extras: Golpe Pesado (+1 dado arma corpo a corpo) e Máquina de Matar (+1 dado A Favorita)
                const golpePesadoExtraDice =
                  hasGolpePesado && isMelee && !isUnarmed ? 1 : 0;
                const maquinaMatarExtraDice =
                  isAniqFav && hasMaquinaMatar ? 1 : 0;
                const baseDamageDiceCount =
                  rawDmgParsed.count + golpePesadoExtraDice + maquinaMatarExtraDice;

                // Perícias de Ataque em Ordem Paranormal: Pontaria para fogo/disparo, Luta para corpo a corpo
                const pontariaSk = ordemSheetData?.skills.find((s) => s.id === 'pontaria');
                const lutaSk = ordemSheetData?.skills.find((s) => s.id === 'luta');

                const pontariaSkillBonus =
                  (pontariaSk?.trainingDegree || 0) +
                  (pontariaSk?.otherModifier || 0) +
                  bonuses.skillBonusAll +
                  (bonuses.skillBonus['pontaria'] || 0);

                const lutaSkillBonus =
                  (lutaSk?.trainingDegree || 0) +
                  (lutaSk?.otherModifier || 0) +
                  bonuses.skillBonusAll +
                  (bonuses.skillBonus['luta'] || 0);

                const meleeBaseAttr = isAgile ? Math.max(effFor, effAgi) : effFor;

                // Dados de Ataque (d20):
                // - Armas de fogo e de disparo usam Agilidade (effAgi) + bônus de dados de Pontaria
                // - Armas corpo a corpo usam Força (ou Agilidade se ágil) + bônus de dados de Luta
                const rawAttackDice = isOrdemSystem
                  ? isRanged
                    ? effAgi + bonuses.skillDiceAll + (bonuses.skillDice['pontaria'] || 0)
                    : meleeBaseAttr + bonuses.skillDiceAll + (bonuses.skillDice['luta'] || 0)
                  : atk.diceCount || 1;
                const finalAttackDice = rawAttackDice + bonuses.attackDiceBonus;

                // Bônus de Ataque (+X):
                // - Armas de fogo e de disparo usam o teste de Pontaria
                // - Armas corpo a corpo usam o teste de Luta
                const workToolAtkBonus = atk.isWorkTool || invMatch?.isFavoriteTool ? 1 : 0;
                const combatSkillBonus = isRanged ? pontariaSkillBonus : lutaSkillBonus;
                const finalAttackBonus = isOrdemSystem
                  ? combatSkillBonus + bonuses.attackBonus + workToolAtkBonus
                  : atk.attackBonus + bonuses.attackBonus + workToolAtkBonus;

                // Modificador de Dano:
                // Em Ordem Paranormal:
                // - Armas corpo a corpo somam FOR (ou AGI se ágil).
                // - Armas de arremesso somam FOR.
                // - Arco Composto soma FOR.
                // - Armas de fogo e outras armas de disparo (arco simples, besta, balestra) NÃO somam força ao dano!
                const specificTypeDamageBonus =
                  (isMelee ? bonuses.meleeDamageBonus : 0) +
                  (isFirearm ? bonuses.firearmDamageBonus : 0);
                const tiroCerteiroBonus =
                  hasTiroCerteiro && (isDisparo || isThrown) ? effAgi : 0;
                const workToolDmgBonus = atk.isWorkTool || invMatch?.isFavoriteTool ? 1 : 0;

                const addsAttrToDamage = isOrdemSystem && (isMelee || isThrown || isArcoComposto);
                const attrDamageMod =
                  addsAttrToDamage && rawDmgParsed.modifier === 0
                    ? isAgile && isMelee
                      ? Math.max(effFor, effAgi)
                      : effFor
                    : 0;

                const finalDamageMod =
                  rawDmgParsed.modifier +
                  attrDamageMod +
                  bonuses.damageBonus +
                  specificTypeDamageBonus +
                  tiroCerteiroBonus +
                  workToolDmgBonus;

                const isFuzilPrecisao =
                  lowerAtkName.includes('fuzil de precisão') ||
                  lowerAtkName.includes('fuzil de precisao') ||
                  lowerAtkName.includes('sniper') ||
                  descLower.includes('veterano em pontaria ao mirar');
                const isAimingFuzil = Boolean(isFuzilPrecisao && aimingByAttackId[atk.id]);

                // Margem e Multiplicador Crítico: Técnica Letal (+2), Máquina de Matar (+2), Técnica Secreta, Mirar (+5)
                let critThreatSteps = 0;
                if (hasTecnicaLetal && isMelee) critThreatSteps += 2;
                if (isAniqFav && hasMaquinaMatar) critThreatSteps += 2;
                if (isAniqFav && hasTecnicaSublime) {
                  if (secLetal === 1) critThreatSteps += 2;
                  if (secLetal === 2) critThreatSteps += 5;
                }
                if (isAimingFuzil) critThreatSteps += 5;
                let effectiveCritRange = boostCritRangeBySteps(atk.critRange, critThreatSteps);
                if (isAniqFav && hasTecnicaSecreta && secDestruidor) {
                  effectiveCritRange = boostCritMultiplier(effectiveCritRange, 1);
                }
                const critParsed = parseCritRange(effectiveCritRange);
                const critBaseDamageDiceCount = baseDamageDiceCount * critParsed.multiplier;

                const previewPendingDmg =
                  pendingSpecialDamageBonus && pendingSpecialDamageBonus.attackId === atk.id
                    ? pendingSpecialDamageBonus.dmgBonus
                    : 0;
                const previewGolpeDemolidorDice = armedGolpeDemolidor ? 2 : 0;

                const displayedDmgDice = baseDamageDiceCount + previewGolpeDemolidorDice;
                const displayedCritDmgDice = critBaseDamageDiceCount + previewGolpeDemolidorDice;
                const displayedDmgMod = finalDamageMod + previewPendingDmg;

                // Técnica Secreta PE total para esta arma favorita
                const tecnicaSecretaCost = isAniqFav && hasTecnicaSecreta
                  ? (secAmplo ? 2 : 0) +
                    (secDestruidor ? 2 : 0) +
                    (hasTecnicaSublime ? secLetal * 2 + (secPerfurante ? 2 : 0) : 0)
                  : 0;

                const isAeOpen = hasAtaqueEspecial && activeAeAttackId === atk.id;
                const aeTotalInvested = aeAtkInvest + aeDmgInvest;
                const aeSteps = aeTotalInvested / 5;
                const aePeCostCalculated = aeSteps > 0 ? 1 + aeSteps : 0;
                const aeMult = hasPotenciaMaxima && isMelee ? 2 : 1;
                const appliedAeAtk = aeAtkInvest * aeMult;
                const appliedAeDmg = aeDmgInvest * aeMult;
                const totalAeConfirmPe = aePeCostCalculated + tecnicaSecretaCost;

                const foPayload: ForcaOpressoraRollPayload | undefined =
                  isOrdemSystem && hasForcaOpressora && isMelee
                    ? {
                        weaponName: atk.name,
                        lutaDiceCount:
                          effFor + bonuses.skillDiceAll + (bonuses.skillDice['luta'] || 0),
                        lutaBonus:
                          (lutaSk?.trainingDegree || 0) +
                          (lutaSk?.otherModifier || 0) +
                          bonuses.skillBonusAll +
                          (bonuses.skillBonus['luta'] || 0),
                      }
                    : undefined;

                function buildTecnicaSecretaLabels(dmgSuffixTarget: string[]) {
                  if (tecnicaSecretaCost <= 0) return '';
                  const effectsNames: string[] = [];
                  if (secAmplo) effectsNames.push('Amplo');
                  if (secDestruidor) effectsNames.push('Destruidor +1x');
                  if (hasTecnicaSublime && secLetal === 1) effectsNames.push('Letal +2');
                  if (hasTecnicaSublime && secLetal === 2) effectsNames.push('Letal 2x +5');
                  if (hasTecnicaSublime && secPerfurante) {
                    effectsNames.push('Perfurante (Ignora 5 RD)');
                    dmgSuffixTarget.push('Perfurante: Ignora 5 RD');
                  }
                  return `Técnica Secreta: ${effectsNames.join(', ')}`;
                }

                function buildSegurarGatilhoPayload(batchId: string): SegurarGatilhoPayload | undefined {
                  if (!isOrdemSystem || !hasSegurarGatilho || !isFirearm) return undefined;
                  return {
                    enabled: true,
                    batchId,
                    shotIndex: 1,
                    nextExtraShotStep: segurarGatilhoStep,
                    weaponName: atk.name,
                    baseAttackDice: finalAttackDice,
                    baseAttackBonus: finalAttackBonus,
                    baseDamageModifier: finalDamageMod,
                    critThreatMin: critParsed.threatMin,
                    critMultiplier: critParsed.multiplier,
                    normalDiceCount: baseDamageDiceCount,
                    critDiceCount: critBaseDamageDiceCount,
                    dieSides: effectiveDamageSides,
                    hasAtaqueEspecial,
                    maxAeTotalBonus,
                    aeMult,
                    peTurnLimit,
                    tecnicaSecretaCost,
                    tecnicaSecretaAttackSuffix: buildTecnicaSecretaLabels([]),
                    tecnicaSecretaDamageSuffix:
                      isAniqFav && hasTecnicaSublime && secPerfurante
                        ? 'Perfurante: Ignora 5 RD'
                        : undefined,
                  };
                }

                function handleRollDamage(isCrit: boolean) {
                  let dmgDiceToUse = isCrit ? critBaseDamageDiceCount : baseDamageDiceCount;
                  let dmgModToUse = finalDamageMod;
                  const suffixParts: string[] = isCrit ? [`x${critParsed.multiplier}`] : [];

                  if (
                    pendingSpecialDamageBonus &&
                    pendingSpecialDamageBonus.attackId === atk.id
                  ) {
                    dmgModToUse += pendingSpecialDamageBonus.dmgBonus;
                    suffixParts.push(
                      `Ataque Especial +${pendingSpecialDamageBonus.dmgBonus} Dano`
                    );
                    setPendingSpecialDamageBonus(null);
                  }

                  if (armedGolpeDemolidor) {
                    if (!onSpendResource(1)) return;
                    dmgDiceToUse += 2;
                    suffixParts.push('Golpe Demolidor +2 dados');
                    setArmedGolpeDemolidor(false);
                  }

                  if (isAniqFav && hasTecnicaSublime && secPerfurante) {
                    suffixParts.push('Perfurante: Ignora 5 RD');
                  }

                  const labelSuffix =
                    suffixParts.length > 0 ? ` [${suffixParts.join(' • ')}]` : '';
                  onRoll(
                    `${isCrit ? '💥 Dano Crítico' : 'Dano'}: ${atk.name}${labelSuffix}`,
                    dmgDiceToUse,
                    effectiveDamageSides,
                    dmgModToUse,
                    true,
                    undefined,
                    foPayload
                  );
                }

                return (
                  <div
                    key={atk.id}
                    className={`bg-zinc-950 border p-3.5 rounded-xl flex flex-col gap-2.5 ${
                      isAniqFav ? 'border-red-600/80' : 'border-zinc-800'
                    }`}
                  >
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="font-bold text-sm text-white">{atk.name}</h4>
                          {isAniqFav && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-700">
                              🗡️ A Favorita
                            </span>
                          )}
                          {golpePesadoExtraDice > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700">
                              💪 Golpe Pesado (+1 dado)
                            </span>
                          )}
                          {hasTecnicaLetal && isMelee && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-amber-300 border border-amber-700/60">
                              ⚔️ Técnica Letal (+2 Crít)
                            </span>
                          )}
                          {tiroCerteiroBonus !== 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                              🏹 Tiro Certeiro (+{tiroCerteiroBonus})
                            </span>
                          )}
                          {hasSegurarGatilho && isFirearm && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-700/70">
                              🔥 Segurar o Gatilho
                            </span>
                          )}
                          {isAimingFuzil && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600">
                              🎯 Mirando (+5 Crít)
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-zinc-500">
                          Crítico: {effectiveCritRange}
                          {effectiveCritRange !== atk.critRange ? ` (base ${atk.critRange})` : ''}
                        </span>

                        {hasAFavorita && !isAniqFav && canChangeAniquiladorFavorite && (
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateAttacks(
                                attacks.map((a) => ({
                                  ...a,
                                  isAniquiladorFavorite: a.id === atk.id,
                                }))
                              );
                              onUpdateInventory(
                                inventory.map((it) => ({
                                  ...it,
                                  isAniquiladorFavorite:
                                    it.name.toLowerCase() === atk.name.toLowerCase(),
                                }))
                              );
                            }}
                            className="block mt-1 text-[10px] font-bold text-red-400 hover:underline cursor-pointer"
                          >
                            🗡️ Definir como A Favorita (Aniquilador)
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {isFuzilPrecisao && (
                          <button
                            type="button"
                            onClick={() =>
                              setAimingByAttackId((prev) => ({
                                ...prev,
                                [atk.id]: !prev[atk.id],
                              }))
                            }
                            className={`px-2.5 py-1.5 rounded text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                              isAimingFuzil
                                ? 'bg-emerald-600 text-white border-emerald-400 shadow'
                                : 'bg-zinc-900 hover:bg-zinc-800 text-emerald-300 border-emerald-800/70'
                            }`}
                            title="Ação de movimento para Mirar com Fuzil de Precisão: concede +5 na margem de ameaça"
                          >
                            <input
                              type="checkbox"
                              checked={isAimingFuzil}
                              readOnly
                              className="pointer-events-none accent-emerald-300 w-3.5 h-3.5"
                            />
                            🎯 Mirar (+5 Crít)
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            const suffixParts: string[] = [];
                            const dmgSuffixParts: string[] = [];

                            if (isAimingFuzil) {
                              suffixParts.push('🎯 Mirando (+5 Crít)');
                            }

                            if (tecnicaSecretaCost > 0) {
                              if (isOrdemSystem && tecnicaSecretaCost > peTurnLimit) {
                                setCombatTabFeedback(
                                  `⚠️ Custo da Técnica Secreta (${tecnicaSecretaCost} PE) excede seu limite de ${peTurnLimit} PE/turno!`
                                );
                                return;
                              }
                              if (!onSpendResource(tecnicaSecretaCost)) return;
                              const tsLabel = buildTecnicaSecretaLabels(dmgSuffixParts);
                              if (tsLabel) suffixParts.push(tsLabel);
                            }

                            setPendingSpecialDamageBonus(null);

                            const batchId = `sg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                            const labelSuffix =
                              suffixParts.length > 0 ? ` [${suffixParts.join(' • ')}]` : '';
                            onRoll(
                              `Acerto: ${atk.name}${labelSuffix}`,
                              finalAttackDice,
                              20,
                              finalAttackBonus,
                              false,
                              {
                                weaponName: atk.name,
                                critThreatMin: critParsed.threatMin,
                                critMultiplier: critParsed.multiplier,
                                normalDiceCount: baseDamageDiceCount,
                                critDiceCount: critBaseDamageDiceCount,
                                dieSides: effectiveDamageSides,
                                damageModifier: finalDamageMod,
                                damageLabelSuffix:
                                  dmgSuffixParts.length > 0
                                    ? ` [${dmgSuffixParts.join(' • ')}]`
                                    : undefined,
                                forcaOpressoraPayload: foPayload,
                                segurarGatilhoPayload: buildSegurarGatilhoPayload(batchId),
                              }
                            );
                          }}
                          className="px-2.5 py-1.5 bg-zinc-900 hover:bg-amber-600 text-amber-400 hover:text-white border border-zinc-700 rounded text-xs font-mono font-bold transition cursor-pointer"
                          title="Rolar Teste de Acerto"
                        >
                          🎯{' '}
                          {finalAttackDice <= 0
                            ? '2d20(menor)'
                            : `${finalAttackDice}d20`}
                          {finalAttackBonus >= 0 ? `+${finalAttackBonus}` : finalAttackBonus}
                        </button>

                        {hasAtaqueEspecial && (
                          <button
                            type="button"
                            onClick={() => {
                              if (isAeOpen) {
                                setActiveAeAttackId(null);
                              } else {
                                const valid = clampAeConfig(
                                  aeAtkInvest,
                                  aeDmgInvest,
                                  maxAeTotalBonus
                                );
                                setAeAtkInvest(valid.atk);
                                setAeDmgInvest(valid.dmg);
                                setActiveAeAttackId(atk.id);
                              }
                            }}
                            className={`px-2.5 py-1.5 rounded text-xs font-bold border transition cursor-pointer ${
                              isAeOpen
                                ? 'bg-red-600 text-white border-red-400 shadow'
                                : 'bg-red-950/60 hover:bg-red-700 text-red-300 hover:text-white border-red-800/70'
                            }`}
                            title="Abrir controles de Ataque Especial para este ataque"
                          >
                            ⚡ Ataque Especial
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRollDamage(false)}
                          className="px-2.5 py-1.5 bg-zinc-900 hover:bg-red-700 text-red-400 hover:text-white border border-zinc-700 rounded text-xs font-mono font-bold transition cursor-pointer"
                          title="Rolar Dano Normal"
                        >
                          🩸 {displayedDmgDice}d{effectiveDamageSides}
                          {displayedDmgMod !== 0
                            ? displayedDmgMod > 0
                              ? `+${displayedDmgMod}`
                              : displayedDmgMod
                            : ''}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRollDamage(true)}
                          className="px-2 py-1.5 bg-amber-950/70 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-700/70 rounded text-xs font-mono font-bold transition cursor-pointer"
                          title={`Rolar Dano Crítico (${effectiveCritRange})`}
                        >
                          💥 {displayedCritDmgDice}d{effectiveDamageSides}
                          {displayedDmgMod !== 0
                            ? displayedDmgMod > 0
                              ? `+${displayedDmgMod}`
                              : displayedDmgMod
                            : ''}
                        </button>

                        {allowInv && (
                          <button
                            type="button"
                            onClick={() => onUpdateAttacks(attacks.filter((a) => a.id !== atk.id))}
                            className="text-xs text-zinc-600 hover:text-red-400 px-1 cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Interface Contextual Dinâmica de Ataque Especial */}
                    {isAeOpen && (
                      <div className="bg-zinc-900/95 border border-red-700/60 rounded-xl p-3 flex flex-col gap-2.5 shadow-inner">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-black uppercase tracking-wider text-red-400">
                              ⚡ Ataque Especial
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400">
                              (Máx. +{maxAeTotalBonus} • Distribuído: +{aeTotalInvested})
                            </span>
                            {aeMult > 1 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700">
                                💥 Potência Máxima 2x
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono font-extrabold text-amber-300 bg-zinc-950 border border-amber-700/50 px-2 py-0.5 rounded">
                            ⚡ Custo: {totalAeConfirmPe} PE
                            {tecnicaSecretaCost > 0
                              ? ` (${aePeCostCalculated} AE + ${tecnicaSecretaCost} Téc.)`
                              : ''}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-amber-300">🎯 Acerto</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={aeAtkInvest <= 0}
                                onClick={() =>
                                  updateAeInvestment(Math.max(0, aeAtkInvest - 5), aeDmgInvest)
                                }
                                className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-35 disabled:cursor-not-allowed text-zinc-200 border border-zinc-700 rounded text-xs font-mono font-bold cursor-pointer"
                              >
                                -5
                              </button>
                              <span className="text-xs font-mono font-extrabold text-white min-w-[3.5rem] text-center">
                                +{aeAtkInvest}
                                {aeMult > 1 && aeAtkInvest > 0 ? ` (${appliedAeAtk})` : ''}
                              </span>
                              <button
                                type="button"
                                disabled={aeTotalInvested + 5 > maxAeTotalBonus}
                                onClick={() => updateAeInvestment(aeAtkInvest + 5, aeDmgInvest)}
                                className="px-2 py-0.5 bg-zinc-900 hover:bg-amber-700 disabled:opacity-35 disabled:cursor-not-allowed text-amber-300 hover:text-white border border-zinc-700 rounded text-xs font-mono font-bold cursor-pointer"
                              >
                                +5
                              </button>
                            </div>
                          </div>

                          <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-red-300">🩸 Dano</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={aeDmgInvest <= 0}
                                onClick={() =>
                                  updateAeInvestment(aeAtkInvest, Math.max(0, aeDmgInvest - 5))
                                }
                                className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-35 disabled:cursor-not-allowed text-zinc-200 border border-zinc-700 rounded text-xs font-mono font-bold cursor-pointer"
                              >
                                -5
                              </button>
                              <span className="text-xs font-mono font-extrabold text-white min-w-[3.5rem] text-center">
                                +{aeDmgInvest}
                                {aeMult > 1 && aeDmgInvest > 0 ? ` (${appliedAeDmg})` : ''}
                              </span>
                              <button
                                type="button"
                                disabled={aeTotalInvested + 5 > maxAeTotalBonus}
                                onClick={() => updateAeInvestment(aeAtkInvest, aeDmgInvest + 5)}
                                className="px-2 py-0.5 bg-zinc-900 hover:bg-red-700 disabled:opacity-35 disabled:cursor-not-allowed text-red-300 hover:text-white border border-zinc-700 rounded text-xs font-mono font-bold cursor-pointer"
                              >
                                +5
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] font-mono text-zinc-400">
                            {aeTotalInvested <= 0
                              ? '⚠️ Escolha ao menos +5 em Acerto ou Dano.'
                              : `Resultado: ${finalAttackDice <= 0 ? '2d20(menor)' : `${finalAttackDice}d20`}${
                                  finalAttackBonus + appliedAeAtk >= 0
                                    ? `+${finalAttackBonus + appliedAeAtk}`
                                    : finalAttackBonus + appliedAeAtk
                                } no acerto${appliedAeDmg > 0 ? ` e +${appliedAeDmg} no dano` : ''}`}
                          </span>
                          <div className="flex items-center gap-1.5 ml-auto">
                            <button
                              type="button"
                              onClick={() => setActiveAeAttackId(null)}
                              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              disabled={aeTotalInvested <= 0}
                              onClick={() => {
                                if (aeTotalInvested <= 0) return;
                                if (!onSpendResource(totalAeConfirmPe)) return;
                                updateAeInvestment(aeAtkInvest, aeDmgInvest);

                                const aeBonusDesc = [
                                  appliedAeAtk > 0 ? `+${appliedAeAtk} Atq` : '',
                                  appliedAeDmg > 0 ? `+${appliedAeDmg} Dano` : '',
                                ]
                                  .filter(Boolean)
                                  .join(' / ');
                                const suffixParts: string[] = [
                                  `Ataque Especial${aeMult > 1 ? ' [Potência Máxima 2x]' : ''} (${aeBonusDesc})`,
                                ];
                                if (isAimingFuzil) {
                                  suffixParts.push('🎯 Mirando (+5 Crít)');
                                }
                                const dmgSuffixParts: string[] = [];

                                if (appliedAeDmg > 0) {
                                  dmgSuffixParts.push(
                                    `Ataque Especial${aeMult > 1 ? ' 2x' : ''} +${appliedAeDmg} Dano`
                                  );
                                  setPendingSpecialDamageBonus({
                                    attackId: atk.id,
                                    dmgBonus: appliedAeDmg,
                                  });
                                } else {
                                  setPendingSpecialDamageBonus(null);
                                }

                                const tsLabel = buildTecnicaSecretaLabels(dmgSuffixParts);
                                if (tsLabel) suffixParts.push(tsLabel);

                                const batchId = `sg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                                const labelSuffix = ` [${suffixParts.join(' • ')}]`;
                                setActiveAeAttackId(null);
                                onRoll(
                                  `Acerto: ${atk.name}${labelSuffix}`,
                                  finalAttackDice,
                                  20,
                                  finalAttackBonus + appliedAeAtk,
                                  false,
                                  {
                                    weaponName: atk.name,
                                    critThreatMin: critParsed.threatMin,
                                    critMultiplier: critParsed.multiplier,
                                    normalDiceCount: baseDamageDiceCount,
                                    critDiceCount: critBaseDamageDiceCount,
                                    dieSides: effectiveDamageSides,
                                    damageModifier: finalDamageMod + appliedAeDmg,
                                    damageLabelSuffix:
                                      dmgSuffixParts.length > 0
                                        ? ` [${dmgSuffixParts.join(' • ')}]`
                                        : undefined,
                                    forcaOpressoraPayload: foPayload,
                                    segurarGatilhoPayload: buildSegurarGatilhoPayload(batchId),
                                  }
                                );
                              }}
                              className="px-3 py-1 bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white rounded-lg text-xs font-extrabold cursor-pointer shadow"
                            >
                              ⚡ Confirmar Ataque (-{totalAeConfirmPe} PE)
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Barra Aniquilador: Técnica Secreta (40%+) e Técnica Sublime (65%+) */}
                    {isAniqFav && hasTecnicaSecreta && (
                      <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="font-bold text-red-400">
                          🗡️ Técnica Secreta (-2 PE/efeito):
                        </span>
                        <label className="flex items-center gap-1 text-zinc-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={secDestruidor}
                            onChange={(e) => setSecDestruidor(e.target.checked)}
                          />
                          Destruidor (+1x Crít)
                        </label>
                        <label className="flex items-center gap-1 text-zinc-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={secAmplo}
                            onChange={(e) => setSecAmplo(e.target.checked)}
                          />
                          Amplo (Alvo adj.)
                        </label>
                        {hasTecnicaSublime && (
                          <>
                            <select
                              value={secLetal}
                              onChange={(e) => setSecLetal(Number(e.target.value) as 0 | 1 | 2)}
                              className="bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] text-amber-300 font-bold"
                            >
                              <option value={0}>Letal: Não</option>
                              <option value={1}>Letal 1x (+2 Margem, -2 PE)</option>
                              <option value={2}>Letal 2x (+5 Margem, -4 PE)</option>
                            </select>
                            <label className="flex items-center gap-1 text-zinc-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={secPerfurante}
                                onChange={(e) => setSecPerfurante(e.target.checked)}
                              />
                              Perfurante (Ignora 5 RD)
                            </label>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CONTEÚDO DA ABA 2 (PODERES) E ABA 3 (RITUAIS / MAGIAS) */}
      {(activeSubTab === 'powers' || activeSubTab === 'spells') && (
        <div className="flex flex-col gap-3">
          {abilityUseFeedback && (
            <div className="bg-emerald-950/80 border border-emerald-600 text-emerald-200 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between">
              <span>{abilityUseFeedback}</span>
              <button
                type="button"
                onClick={() => setAbilityUseFeedback('')}
                className="text-emerald-400 hover:text-white ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {activeSubTab === 'spells' && system === 'ordem-paranormal' && (
            <div className="bg-purple-950/30 border border-purple-800/50 px-3.5 py-2 rounded-xl text-[11px] text-purple-200 flex flex-wrap items-center justify-between gap-2">
              <span>
                👁️ <strong>O Custo do Paranormal:</strong> Conjurar um ritual desconta o PE, aplica bônus/PV temporários da cena e rola automaticamente seu <strong>Teste de Ocultismo (DT 20 + PE gasto)</strong>.
              </span>
              {ordemSheetData && (
                <span className="font-mono font-bold text-purple-300">
                  Limite de PE/Turno: {getOrdemPeLimit(ordemSheetData.nex, ordemSheetData.origin, abilities)} PE
                </span>
              )}
            </div>
          )}

          {(activeSubTab === 'powers' ? powerList : spellList).length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-4">
              Nenhum {activeSubTab === 'powers' ? 'poder' : spellLabel.toLowerCase()} adicionado na ficha.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {(activeSubTab === 'powers' ? powerList : spellList).map((ab) => {
                const isPassive = ab.cost === 0 && !ab.damageFormula;
                const isOrdemRitual =
                  activeSubTab === 'spells' &&
                  system === 'ordem-paranormal' &&
                  (ab.category === 'ritual' || ab.category === 'magia');

                const ritualForms = isOrdemRitual
                  ? parseOrdemRitualForms(ab.name, ab.description, ab.cost || 1, ab.damageFormula)
                  : [];

                const prog =
                  system === 'ordem-paranormal' && ordemSheetData
                    ? {
                        maxCircle:
                          ordemSheetData.nex >= 85
                            ? 4
                            : ordemSheetData.nex >= 55
                            ? 3
                            : ordemSheetData.nex >= 25
                            ? 2
                            : 1,
                        peTurnLimit: getOrdemPeLimit(
                          ordemSheetData.nex,
                          ordemSheetData.origin,
                          abilities
                        ),
                      }
                    : { maxCircle: 4, peTurnLimit: 20 };

                return (
                  <div
                    key={ab.id}
                    className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl flex flex-col md:flex-row md:justify-between md:items-center gap-3"
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-sm text-white">{ab.name}</h4>
                        {ab.category === 'poder_paranormal' && (
                          <span className="text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded">
                            👁️ Paranormal
                          </span>
                        )}
                        {ab.cost > 0 ? (
                          <span className="text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded">
                            {ab.cost} {resourceLabel}
                          </span>
                        ) : (
                          !ab.damageFormula && (
                            <span className="text-[10px] font-mono uppercase bg-zinc-900 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded">
                              Passivo
                            </span>
                          )
                        )}
                        {ab.modifiers &&
                          ab.modifiers.length > 0 &&
                          !hasDedicatedControlElsewhere(ab) && (
                          <label className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 cursor-pointer ml-1">
                            <input
                              type="checkbox"
                              checked={ab.isActive !== false}
                              onChange={() => toggleAbilityActive(ab.id)}
                            />
                            Bônus Ativo na Ficha
                          </label>
                        )}
                      </div>
                      {ab.description && <p className="text-xs text-zinc-400 mt-1">{ab.description}</p>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {isOrdemRitual && onCastOrdemRitual ? (
                        ritualForms.map((f) => {
                          const circleOk = !f.requiredCircle || prog.maxCircle >= f.requiredCircle;
                          const affinityOk =
                            !f.requiresAffinity ||
                            (ordemSheetData &&
                              ordemSheetData.nex >= 50 &&
                              !!ordemSheetData.affinity &&
                              ordemSheetData.affinity !== 'Nenhuma');
                          const peLimitOk = f.totalCost <= prog.peTurnLimit;
                          const canCastForm = circleOk && affinityOk && peLimitOk;

                          // Se o personagem não cumpre os requisitos para Discente ou Verdadeiro (Círculo, Afinidade ou Limite de PE), o botão não deve nem aparecer!
                          if (f.mode !== 'normal' && !canCastForm) {
                            return null;
                          }

                          return (
                            <button
                              key={f.mode}
                              type="button"
                              onClick={() => onCastOrdemRitual(ab, f)}
                              title={f.description}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition whitespace-nowrap cursor-pointer ${
                                f.mode === 'normal'
                                  ? 'bg-purple-950/60 hover:bg-purple-700 text-purple-200 hover:text-white border-purple-700/60'
                                  : f.mode === 'discente'
                                  ? 'bg-amber-950/60 hover:bg-amber-600 text-amber-300 hover:text-white border-amber-700/60'
                                  : 'bg-red-950/60 hover:bg-red-700 text-red-300 hover:text-white border-red-700/60'
                              }`}
                            >
                              {f.mode === 'normal' && `🔮 Normal (-${f.totalCost} PE)`}
                              {f.mode === 'discente' &&
                                `🔥 Discente (-${f.totalCost} PE)${
                                  f.requiredCircle > 1 ? ` [${f.requiredCircle}ºC]` : ''
                                }${f.requiresAffinity ? ' [Afin.]' : ''}`}
                              {f.mode === 'verdadeiro' &&
                                `👁️ Verdadeiro (-${f.totalCost} PE)${
                                  f.requiredCircle > 1 ? ` [${f.requiredCircle}ºC]` : ''
                                }${f.requiresAffinity ? ' [Afin.]' : ''}`}
                            </button>
                          );
                        })
                      ) : (
                        <>
                          {ab.id === 'orig-amnesico' && onTriggerOriginSpecial && (
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onTriggerOriginSpecial('amnesico')}
                                className="px-3 py-1.5 bg-cyan-950/70 hover:bg-cyan-700 text-cyan-200 hover:text-white border border-cyan-700 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap"
                              >
                                🧠 Testar Vislumbres (Intelecto DT 10)
                              </button>
                              {vislumbresSuccessPending && onRollVislumbresPe && (
                                <button
                                  type="button"
                                  onClick={onRollVislumbresPe}
                                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white border border-amber-400 rounded-lg text-xs font-extrabold transition cursor-pointer whitespace-nowrap shadow-lg animate-pulse"
                                >
                                  🎲 Girar 1d4 PE Temporários
                                </button>
                              )}
                            </div>
                          )}
                          {ab.id === 'orig-religioso' && ordemSheetData && (
                            <button
                              type="button"
                              onClick={() => {
                                const effPre =
                                  ordemSheetData.attributes.pre +
                                  (bonuses.attributes['pre'] || 0);
                                onRoll(
                                  `Acalentar (Sanidade Recuperada: 1d6 + ${effPre} PRE)`,
                                  1,
                                  6,
                                  effPre,
                                  true
                                );
                              }}
                              className="px-3 py-1.5 bg-blue-950/70 hover:bg-blue-700 text-blue-200 hover:text-white border border-blue-700 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap"
                            >
                              🙏 Acalentar (1d6 + PRE SAN)
                            </button>
                          )}
                          {(ab.id === 'ord-pwr-comb-sentido-tatico' ||
                            ab.name.toLowerCase().includes('sentido tático') ||
                            ab.name.toLowerCase().includes('sentido tatico')) &&
                            onTriggerOriginSpecial && (
                              <button
                                type="button"
                                onClick={() => onTriggerOriginSpecial('sentido_tatico')}
                                className="px-3 py-1.5 bg-cyan-950/70 hover:bg-cyan-700 text-cyan-200 hover:text-white border border-cyan-700 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap"
                              >
                                🧠 Analisar Ambiente (-2 PE → +INT Def/Resist na Cena)
                              </button>
                            )}
                          {!isPassive &&
                            !hasDedicatedControlElsewhere(ab) &&
                            !(
                              ab.id === 'ord-pwr-comb-sentido-tatico' ||
                              ab.name.toLowerCase().includes('sentido tático') ||
                              ab.name.toLowerCase().includes('sentido tatico')
                            ) && (
                            <button
                              type="button"
                              onClick={() => handleUseAbility(ab)}
                              className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white border border-amber-700/50 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap"
                            >
                              ✨ Usar {ab.cost > 0 ? `(-${ab.cost} ${resourceLabel})` : ''}
                            </button>
                          )}
                        </>
                      )}
                      {allowAb && (
                        <button
                          type="button"
                          onClick={() => onUpdateAbilities(abilities.filter((a) => a.id !== ab.id))}
                          className="text-xs text-zinc-600 hover:text-red-400 px-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE ZOOM DE IMAGEM DE ITEM */}
      {zoomedItemImage && (
        <div
          onClick={() => setZoomedItemImage(null)}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6 backdrop-blur-md cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border-2 border-amber-500/80 rounded-3xl p-4 max-w-xl w-full flex flex-col items-center gap-3 shadow-2xl"
          >
            <img
              src={zoomedItemImage.url}
              alt={zoomedItemImage.name}
              className="max-h-[70vh] w-auto object-contain rounded-2xl"
            />
            <div className="flex justify-between items-center w-full px-2">
              <span className="text-base font-extrabold text-white">{zoomedItemImage.name}</span>
              <button
                type="button"
                onClick={() => setZoomedItemImage(null)}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 4: INVENTÁRIO (Com Imagens em Destaque, Quantidades xN e Troca entre Aliados) */}
      {activeSubTab === 'inventory' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap justify-between items-center bg-zinc-950 border border-zinc-800 px-4 py-2.5 rounded-xl gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-400">Capacidade de Carga:</span>
              {canTrade && (
                <span className="text-[10px] font-mono font-bold bg-blue-950/80 text-blue-300 border border-blue-700 px-2 py-0.5 rounded-full">
                  🤝 Trocas entre Jogadores Liberadas
                </span>
              )}
              {system === 'ordem-paranormal' && ordemSheetData && (() => {
                const patentObj =
                  ORDEM_PATENTS.find((p) => p.name === ordemSheetData.patent) ||
                  ORDEM_PATENTS[0];
                const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
                for (const it of inventory) {
                  const rawCat = it.category || 0;
                  const qty = it.quantity || 1;
                  const reduction = it.isFavoriteTool
                    ? 1
                    : it.isAniquiladorFavorite && aniquiladorCatReduction > 0
                    ? aniquiladorCatReduction
                    : 0;
                  if (reduction > 0) {
                    const reducedCat = Math.max(0, rawCat - reduction);
                    if (reducedCat >= 1 && reducedCat <= 4) {
                      counts[reducedCat as 1 | 2 | 3 | 4] += 1;
                    }
                    if (qty > 1 && rawCat >= 1 && rawCat <= 4) {
                      counts[rawCat as 1 | 2 | 3 | 4] += qty - 1;
                    }
                  } else if (rawCat >= 1 && rawCat <= 4) {
                    counts[rawCat as 1 | 2 | 3 | 4] += qty;
                  }
                }
                return (
                  <div className="flex flex-wrap items-center gap-1.5 ml-2">
                    {([1, 2, 3, 4] as const).map((cat) => {
                      const lim = patentObj.categoryLimits[cat];
                      const used = counts[cat];
                      const over = used > lim;
                      return (
                        <span
                          key={cat}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            over
                              ? 'bg-red-950 text-red-300 border-red-700 font-bold'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          }`}
                        >
                          Cat. {cat === 1 ? 'I' : cat === 2 ? 'II' : cat === 3 ? 'III' : 'IV'}: {used}/{lim}
                        </span>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            <span className={`text-xs font-mono font-bold ${isOverloaded ? 'text-red-400' : 'text-emerald-400'}`}>
              {currentLoad} / {effectiveMaxSlots} Espaços {isOverloaded && '⚠️ SOBRECARGA (-5 Defesa, -3m Desl.)!'}
            </span>
          </div>

          {inventory.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-4">Mochila vazia.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {inventory.map((item) => (
                <div
                  key={item.id}
                  className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex justify-between items-center gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {item.imageUrl ? (
                      <div
                        onClick={() => setZoomedItemImage({ name: item.name, url: item.imageUrl! })}
                        title="Clique para ampliar a imagem do item"
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-amber-500/60 shadow-lg shrink-0 bg-zinc-900 cursor-zoom-in group relative"
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-3xl shrink-0">
                        🎒
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-extrabold bg-amber-950/70 text-amber-400 border border-amber-800/60 px-1.5 py-0.5 rounded">
                          {item.quantity || 1}x
                        </span>
                        <p className="text-base font-bold text-white truncate">{item.name}</p>
                        <span className="text-[11px] font-mono text-zinc-500">
                          ({item.slots * (item.quantity || 1)} esp.)
                        </span>
                        {system === 'ordem-paranormal' && (
                          allowInv ? (
                            <select
                              value={item.category ?? 0}
                              onChange={(e) =>
                                onUpdateInventory(
                                  inventory.map((i) =>
                                    i.id === item.id
                                      ? { ...i, category: Number(e.target.value) }
                                      : i
                                  )
                                )
                              }
                              className="bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] font-mono text-amber-300"
                              title="Categoria do Item (Patente)"
                            >
                              <option value={0}>Cat. 0</option>
                              <option value={1}>Cat. I</option>
                              <option value={2}>Cat. II</option>
                              <option value={3}>Cat. III</option>
                              <option value={4}>Cat. IV</option>
                            </select>
                          ) : (
                            <span className="text-[10px] font-mono bg-zinc-900 text-amber-300 border border-zinc-800 px-1.5 py-0.5 rounded">
                              Cat. {item.category ? ['0', 'I', 'II', 'III', 'IV'][item.category] || item.category : '0'}
                            </span>
                          )
                        )}
                        {item.isFavoriteTool && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                            🔧 Ferramenta Favorita (-1 Cat.)
                          </span>
                        )}
                        {item.isAniquiladorFavorite && aniquiladorCatReduction > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-700">
                            🗡️ A Favorita (-{aniquiladorCatReduction} Cat.)
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{item.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <label className="flex items-center gap-1.5 text-[11px] text-emerald-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(item.isEquipped)}
                            onChange={() => toggleItemEquipped(item.id)}
                          />
                          Equipado / Em mãos
                        </label>

                        {(originId === 'engenheiro' || hasMochilaUtilidades) &&
                          !attacks.some(
                            (a) => a.name.toLowerCase() === item.name.toLowerCase()
                          ) && (
                            <label className="flex items-center gap-1.5 text-[11px] text-amber-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(item.isFavoriteTool)}
                                onChange={() =>
                                  onUpdateInventory(
                                    inventory.map((i) => ({
                                      ...i,
                                      isFavoriteTool:
                                        i.id === item.id ? !i.isFavoriteTool : false,
                                    }))
                                  )
                                }
                              />
                              🔧 Ferramenta Favorita (-1 Cat.)
                            </label>
                          )}

                        {hasAFavorita &&
                          canChangeAniquiladorFavorite &&
                          attacks.some(
                            (a) => a.name.toLowerCase() === item.name.toLowerCase()
                          ) && (
                            <label className="flex items-center gap-1.5 text-[11px] text-red-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(item.isAniquiladorFavorite)}
                                onChange={() => {
                                  const nextChecked = !item.isAniquiladorFavorite;
                                  onUpdateInventory(
                                    inventory.map((i) => ({
                                      ...i,
                                      isAniquiladorFavorite:
                                        i.id === item.id ? nextChecked : false,
                                    }))
                                  );
                                  onUpdateAttacks(
                                    attacks.map((a) => ({
                                      ...a,
                                      isAniquiladorFavorite:
                                        a.name.toLowerCase() === item.name.toLowerCase()
                                          ? nextChecked
                                          : false,
                                    }))
                                  );
                                }}
                              />
                              🗡️ A Favorita (-{aniquiladorCatReduction} Cat.)
                            </label>
                          )}

                        {allowInv && (
                          <ImageUploadField
                            compact
                            value={item.imageUrl || ''}
                            onChange={(newUrl) =>
                              onUpdateInventory(
                                inventory.map((i) =>
                                  i.id === item.id ? { ...i, imageUrl: newUrl || undefined } : i
                                )
                              )
                            }
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
                    {canTrade && onInitiateTradeItem && (
                      <button
                        type="button"
                        onClick={() => onInitiateTradeItem(item)}
                        className="px-2.5 py-1.5 bg-blue-900/60 hover:bg-blue-700 text-blue-200 hover:text-white border border-blue-700/60 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap"
                        title="Entregar este item para outro jogador da mesa"
                      >
                        🤝 Passar p/ Aliado
                      </button>
                    )}

                    {allowInv && (
                      <div className="flex items-center gap-1">
                        {item.quantity > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateInventory(
                                inventory.map((i) =>
                                  i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i
                                )
                              )
                            }
                            className="px-1.5 py-0.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded text-[10px] font-mono font-bold cursor-pointer"
                            title="Consumir / Reduzir 1 unidade"
                          >
                            -1
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onUpdateInventory(inventory.filter((i) => i.id !== item.id))}
                          className="text-xs text-zinc-600 hover:text-red-400 px-1.5 cursor-pointer"
                        >
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}