import { useState, useMemo, useRef, useEffect } from 'react';
import {
  SystemId,
  OrdemAttributes,
  T20Attributes,
  ORDEM_ORIGINS,
  ORDEM_CLASSES,
  ORDEM_PATENTS,
  ORDEM_NEX_PROGRESSION,
  ORDEM_TRAILS,
  ORDEM_SKILLS_METADATA,
  ORDEM_COMPENDIUM_ENTRIES,
  checkOrdemPowerRequirements,
  T20_RACES,
  T20_CLASSES,
  T20_ORIGINS,
  T20_DEITIES,
  buildOrdemCharacter,
  buildT20Character,
  calculateOrdemBaseVitals,
  createDefaultT20Sheet,
  isOrdemCompendiumItemParanormal,
  matchesContentSourceFilter,
  resolveEntrySourceId,
} from '@totalrpg/shared';
import { CharacterData, createCharacter } from '../services/api';
import { ImageUploadField } from './ImageUploadField';

import { Icon } from './ui/Icon';
import { ElementBadge, elementChoiceClasses } from './ui/ElementBadge';
import { ContentSourceFilterBar, SourceTagBadge } from './ui/ContentSourceFilterBar';
interface CharacterWizardModalProps {
  lockedSystem?: SystemId;
  lockedNex?: number | null;
  lockedPatent?: string | null;
  allowedSources?: string[] | null;
  onClose: () => void;
  onCreated: (created: CharacterData) => void;
}

const T20_POINT_COSTS: Record<number, number> = {
  [-1]: -1,
  0: 0,
  1: 1,
  2: 2,
  3: 4,
  4: 7,
};

export function CharacterWizardModal({
  lockedSystem,
  lockedNex,
  lockedPatent,
  allowedSources,
  onClose,
  onCreated,
}: CharacterWizardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  // Ao trocar de etapa, a área rolável do assistente volta ao topo.
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [step]);
  const [name, setName] = useState('');
  const [portraitUrl, setPortraitUrl] = useState('');
  const [system, setSystem] = useState<SystemId>(lockedSystem || 'ordem-paranormal');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // --- Estados Ordem Paranormal v1.3 ---
  const initialLockedNex = typeof lockedNex === 'number' ? lockedNex : 5;
  const [ordemNex, setOrdemNex] = useState<number>(initialLockedNex);
  const [ordemPatent, setOrdemPatent] = useState<string>(
    lockedPatent || (initialLockedNex === 0 ? 'Mundano' : 'Recruta')
  );
  const [originSearch, setOriginSearch] = useState('');
  const [originSourceFilter, setOriginSourceFilter] = useState<string[]>([]);
  const [powerSourceFilter, setPowerSourceFilter] = useState<string[]>([]);
  const [trailSourceFilter, setTrailSourceFilter] = useState<string[]>([]);
  const [ritualSourceFilter, setRitualSourceFilter] = useState<string[]>([]);
  const [itemSourceFilter, setItemSourceFilter] = useState<string[]>([]);

  const [ordemOriginId, setOrdemOriginId] = useState<string>('academico');
  const [amnesicoSkills, setAmnesicoSkills] = useState<string[]>(['percepcao', 'vontade']);
  const [profetizadoSkillId, setProfetizadoSkillId] = useState<string>('percepcao');
  const [amigoAnimaisSkillId, setAmigoAnimaisSkillId] = useState<string>('percepcao');
  const [amigoAnimaisName, setAmigoAnimaisName] = useState<string>('');
  const [experimentoSkillId, setExperimentoSkillId] = useState<string>('atletismo');
  const [inventorRitualId, setInventorRitualId] = useState<string>('ord-rit-amaldicoar-tecnologia');
  const [luckyNumber, setLuckyNumber] = useState<number>(6);
  const [bestFriendName, setBestFriendName] = useState<string>('');
  const [cultistaPowerId, setCultistaPowerId] = useState<string>('ord-para-sang-sangue-ferro');
  const [engenheiroFavItemId, setEngenheiroFavItemId] = useState<string>('ord-item-kit-pericia');

  const [ordemClassId, setOrdemClassId] = useState<
    'combatente' | 'especialista' | 'ocultista' | 'mundano'
  >(initialLockedNex === 0 ? 'mundano' : 'combatente');
  const [ordemTrailId, setOrdemTrailId] = useState<string>('');
  const [ordemAffinity, setOrdemAffinity] = useState<string>('Sangue');
  const [versatilityMode, setVersatilityMode] = useState<'class_power' | 'trail_10'>('class_power');
  const [versatilityTrailId, setVersatilityTrailId] = useState<string>('');
  const [chosenClassPowerIds, setChosenClassPowerIds] = useState<string[]>([]);
  const [classPowerSearch, setClassPowerSearch] = useState<string>('');
  const [ordemAttrs, setOrdemAttrs] = useState<OrdemAttributes>({
    agi: 1,
    for: 1,
    int: 1,
    pre: 1,
    vig: 1,
  });

  // Escolhas de classe Ordem
  const [combatAttackSkill, setCombatAttackSkill] = useState<'luta' | 'pontaria'>('luta');
  const [combatDefenseSkill, setCombatDefenseSkill] = useState<'fortitude' | 'reflexos'>('fortitude');
  const [ordemFreeSkills, setOrdemFreeSkills] = useState<string[]>([]);
  const [upgradedSkillDegrees, setUpgradedSkillDegrees] = useState<Record<string, 10 | 15>>({});
  // Se o NEX baixar depois das promoções: Expert exige NEX 70%, qualquer grau exige NEX 35%.
  useEffect(() => {
    setUpgradedSkillDegrees((prev) => {
      if (ordemNex >= 70) return prev;
      if (ordemNex < 35) return Object.keys(prev).length ? {} : prev;
      if (!Object.values(prev).includes(15)) return prev;
      const next: Record<string, 10 | 15> = {};
      for (const [k, v] of Object.entries(prev)) next[k] = 10;
      return next;
    });
  }, [ordemNex]);
  const [peritoSkills, setPeritoSkills] = useState<string[]>([]);
  const [chosenRitualIds, setChosenRitualIds] = useState<string[]>([]);
  const [ritualSearch, setRitualSearch] = useState<string>('');
  const [ritualElementFilter, setRitualElementFilter] = useState<string>('ALL');
  const [ritualCircleFilter, setRitualCircleFilter] = useState<'ALL' | 1 | 2 | 3 | 4>('ALL');
  const [showAmaldicoarElementPrompt, setShowAmaldicoarElementPrompt] = useState<boolean>(false);

  const [itemSearch, setItemSearch] = useState<string>('');
  const [itemCategoryFilter, setItemCategoryFilter] = useState<'ALL' | 0 | 1 | 2 | 3 | 4>('ALL');
  const [itemRealmTab, setItemRealmTab] = useState<'normal' | 'paranormal'>('normal');
  const [chosenItemQuantities, setChosenItemQuantities] = useState<Record<string, number>>({});

  // --- Estados Tormenta 20 ---
  const [t20Level, setT20Level] = useState<number>(1);
  const [t20RaceId, setT20RaceId] = useState<string>('humano');
  const [t20ClassId, setT20ClassId] = useState<string>('Guerreiro');
  const [t20Origin, setT20Origin] = useState<string>('Plebeu');
  const [t20Deity, setT20Deity] = useState<string>('Valkaria');
  const [t20BaseAttrs, setT20BaseAttrs] = useState<T20Attributes>({
    forca: 0,
    destreza: 0,
    constituicao: 0,
    inteligencia: 0,
    sabedoria: 0,
    carisma: 0,
  });
  const [t20FreeRaceAttrs, setT20FreeRaceAttrs] = useState<Array<keyof T20Attributes>>([
    'forca',
    'destreza',
    'constituicao',
  ]);
  const [t20FreeSkills, setT20FreeSkills] = useState<string[]>([]);

  // --- Memos Ordem Paranormal ---
  const selectedOrdemOrigin = useMemo(
    () => ORDEM_ORIGINS.find((o) => o.id === ordemOriginId) || ORDEM_ORIGINS[0],
    [ordemOriginId]
  );

  const selectedOrdemClass = useMemo(
    () => ORDEM_CLASSES.find((c) => c.id === ordemClassId) || ORDEM_CLASSES[0],
    [ordemClassId]
  );

  const originSkillIds = useMemo(() => {
    if (selectedOrdemOrigin.id === 'amnesico') {
      return amnesicoSkills.slice(0, 2);
    }
    if (selectedOrdemOrigin.id === 'profetizado') {
      return Array.from(new Set(['vontade', profetizadoSkillId]));
    }
    return selectedOrdemOrigin.skills;
  }, [selectedOrdemOrigin, amnesicoSkills, profetizadoSkillId]);

  // Pontos de atributo Ordem: começa tudo em 1 (soma 5) + pontos iniciais da classe + aumentos de atributo por NEX (20%, 50%, 80%, 95%)
  const bonusNexAttrPoints =
    ordemClassId === 'mundano'
      ? 0
      : [20, 50, 80, 95].filter((n) => ordemNex >= n).length;
  const maxOrdemAttrCap =
    bonusNexAttrPoints > 0 ? Math.min(5, 3 + bonusNexAttrPoints) : 3;
  const targetOrdemAttrSum =
    5 + selectedOrdemClass.attributePoints + bonusNexAttrPoints;
  const currentOrdemAttrSum =
    ordemAttrs.agi +
    ordemAttrs.for +
    ordemAttrs.int +
    ordemAttrs.pre +
    ordemAttrs.vig;
  const remainingOrdemAttrPoints = targetOrdemAttrSum - currentOrdemAttrSum;
  const zeroAttrsCount = Object.values(ordemAttrs).filter((v) => v === 0).length;

  // Trilhas, Poderes de Classe / Transcender & Rituais desbloqueados pelo NEX
  const availableClassTrails = useMemo(
    () =>
      ORDEM_TRAILS.filter(
        (t) =>
          t.classId === ordemClassId &&
          matchesContentSourceFilter(
            t.sourceId,
            trailSourceFilter,
            allowedSources,
            'ordem-paranormal'
          )
      ),
    [ordemClassId, trailSourceFilter, allowedSources]
  );
  const effectiveTrailId = useMemo(() => {
    if (ordemNex < 10 || ordemClassId === 'mundano') return '';
    if (availableClassTrails.some((t) => t.id === ordemTrailId)) return ordemTrailId;
    return availableClassTrails[0]?.id || '';
  }, [ordemNex, ordemClassId, availableClassTrails, ordemTrailId]);
  const selectedTrailObj = useMemo(
    () => availableClassTrails.find((t) => t.id === effectiveTrailId),
    [availableClassTrails, effectiveTrailId]
  );

  const classPowerMilestoneCount =
    ordemClassId === 'mundano'
      ? 0
      : [15, 30, 45, 60, 75, 90].filter((n) => ordemNex >= n).length;
  const totalClassPowerSlots =
    classPowerMilestoneCount +
    (ordemClassId !== 'mundano' && ordemNex >= 50 && versatilityMode === 'class_power'
      ? 1
      : 0);

  const transcendedCountPreview = useMemo(
    () =>
      chosenClassPowerIds.slice(0, totalClassPowerSlots).filter(
        (id) =>
          ORDEM_COMPENDIUM_ENTRIES.find((e) => e.id === id)?.category ===
          'paranormal_power'
      ).length,
    [chosenClassPowerIds, totalClassPowerSlots]
  );

  const maxRitualCircle: 1 | 2 | 3 | 4 =
    ordemNex >= 85 ? 4 : ordemNex >= 55 ? 3 : ordemNex >= 25 ? 2 : 1;
  const maxInitialRituals =
    3 + Math.max(0, (ordemNex === 99 ? 20 : Math.floor(ordemNex / 5)) - 1);

  // Perícias obrigatórias da classe Ordem e cálculo de colisão com a Origem (p. 22)
  const classMandatorySkillIds = useMemo(() => {
    if (ordemClassId === 'combatente') {
      return [combatAttackSkill, combatDefenseSkill];
    }
    if (ordemClassId === 'ocultista') {
      return ['ocultismo', 'vontade'];
    }
    return [];
  }, [ordemClassId, combatAttackSkill, combatDefenseSkill]);

  const classOriginCollisionBonusSlots = useMemo(() => {
    let collisions = 0;
    for (const skId of classMandatorySkillIds) {
      if (originSkillIds.includes(skId)) {
        collisions += 1;
      }
    }
    return collisions;
  }, [classMandatorySkillIds, originSkillIds]);

  const totalOrdemFreeSkillSlots = Math.max(
    1,
    selectedOrdemClass.freeSkillsBase +
      Math.max(0, ordemAttrs.int) +
      classOriginCollisionBonusSlots
  );

  const lockedOrdemSkillIds = useMemo(
    () => new Set<string>([...originSkillIds, ...classMandatorySkillIds]),
    [originSkillIds, classMandatorySkillIds]
  );

  const allOrdemTrainedList = useMemo(() => {
    const validFree = ordemFreeSkills
      .filter((id) => !lockedOrdemSkillIds.has(id))
      .slice(0, totalOrdemFreeSkillSlots);
    return Array.from(new Set([...originSkillIds, ...classMandatorySkillIds, ...validFree]));
  }, [originSkillIds, classMandatorySkillIds, ordemFreeSkills, lockedOrdemSkillIds, totalOrdemFreeSkillSlots]);

  const ordemVitalsPreview = useMemo(() => {
    const base = calculateOrdemBaseVitals({
      characterClass: ordemClassId,
      attributes: ordemAttrs,
      nex: ordemNex,
      originIdOrName: selectedOrdemOrigin.id,
      transcendedCount: transcendedCountPreview,
    });
    const nexMult = ordemNex === 99 ? 20 : Math.max(1, Math.floor(ordemNex / 5));
    const extraPv =
      selectedOrdemOrigin.id === 'desgarrado'
        ? nexMult
        : selectedOrdemOrigin.id === 'mergulhador'
        ? 5
        : 0;
    const extraSan = selectedOrdemOrigin.id === 'vitima' ? nexMult : 0;
    return {
      pv: base.pvMax + extraPv,
      pe: base.peMax,
      san: base.sanMax + extraSan,
      defense: 10 + ordemAttrs.agi,
      maxSlots: ordemAttrs.for <= 0 ? 2 : ordemAttrs.for * 5,
    };
  }, [ordemClassId, ordemAttrs, ordemNex, selectedOrdemOrigin, transcendedCountPreview]);

  // Listas do Compêndio para o Wizard (respeitando suplementos permitidos na mesa)
  const availableRituals = useMemo(
    () =>
      ORDEM_COMPENDIUM_ENTRIES.filter(
        (e) =>
          e.category === 'spell' &&
          (e.metadata?.circle || 1) <= maxRitualCircle &&
          matchesContentSourceFilter(
            resolveEntrySourceId(e, 'ordem-paranormal'),
            [],
            allowedSources,
            'ordem-paranormal'
          )
      ).sort(
        (a, b) =>
          (a.metadata?.circle || 1) - (b.metadata?.circle || 1) ||
          a.name.localeCompare(b.name, 'pt-BR')
      ),
    [maxRitualCircle, allowedSources]
  );

  const firstCircleRitualsForInventor = useMemo(
    () =>
      ORDEM_COMPENDIUM_ENTRIES.filter(
        (e) =>
          e.category === 'spell' &&
          (e.metadata?.circle || 1) === 1 &&
          matchesContentSourceFilter(
            resolveEntrySourceId(e, 'ordem-paranormal'),
            [],
            allowedSources,
            'ordem-paranormal'
          )
      ).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [allowedSources]
  );

  const selectableClassAndParanormalPowers = useMemo(
    () =>
      ORDEM_COMPENDIUM_ENTRIES.filter((e) => {
        if (
          !matchesContentSourceFilter(
            resolveEntrySourceId(e, 'ordem-paranormal'),
            powerSourceFilter,
            allowedSources,
            'ordem-paranormal'
          )
        ) {
          return false;
        }
        if (e.category === 'paranormal_power') return true;
        if (e.category !== 'power') return false;
        const req = (e.metadata?.requirements || '').toLowerCase();
        if (ordemClassId === 'combatente') {
          return (
            e.id.startsWith('ord-pwr-comb') ||
            req.includes('combatente') ||
            (!req.includes('especialista') && !req.includes('ocultista'))
          );
        }
        if (ordemClassId === 'especialista') {
          return e.id.startsWith('ord-pwr-esp') || req.includes('especialista');
        }
        if (ordemClassId === 'ocultista') {
          return e.id.startsWith('ord-pwr-ocu') || req.includes('ocultista');
        }
        return false;
      }).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [ordemClassId, powerSourceFilter, allowedSources]
  );

  const initialParanormalPowers = useMemo(
    () =>
      ORDEM_COMPENDIUM_ENTRIES.filter(
        (e) =>
          e.category === 'paranormal_power' &&
          !e.metadata?.requirements?.match(/\b(Sangue|Morte|Conhecimento|Energia)\s*[12]/i) &&
          matchesContentSourceFilter(
            resolveEntrySourceId(e, 'ordem-paranormal'),
            powerSourceFilter,
            allowedSources,
            'ordem-paranormal'
          )
      ).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [powerSourceFilter, allowedSources]
  );

  const engenheiroEligibleItems = useMemo(
    () =>
      ORDEM_COMPENDIUM_ENTRIES.filter(
        (e) =>
          e.category === 'item' &&
          !e.metadata?.damageFormula &&
          (e.metadata?.categoryLevel ?? e.cost ?? 0) >= 1 &&
          (e.metadata?.categoryLevel ?? e.cost ?? 0) <= 2
      ).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    []
  );

  const selectedPatentDef = useMemo(
    () =>
      ORDEM_PATENTS.find(
        (p) => p.name.toLowerCase() === ordemPatent.toLowerCase()
      ) || ORDEM_PATENTS[0],
    [ordemPatent]
  );

  const patentCategoryLimits = useMemo<Record<1 | 2 | 3 | 4, number>>(
    () =>
      ordemPatent.toLowerCase() === 'mundano'
        ? { 1: 1, 2: 0, 3: 0, 4: 0 }
        : selectedPatentDef.categoryLimits,
    [ordemPatent, selectedPatentDef]
  );

  const allowsCursedSpecial = useMemo(
    () =>
      ['agente_especial', 'oficial_operacoes', 'agente_elite'].includes(
        selectedPatentDef.id
      ) && ordemPatent.toLowerCase() !== 'mundano',
    [selectedPatentDef, ordemPatent]
  );

  const maxAllowedItemCategory = useMemo(
    () =>
      ([4, 3, 2, 1] as const).find((c) => patentCategoryLimits[c] > 0) || 0,
    [patentCategoryLimits]
  );

  const getEffectiveRecruitItemCat = (entry: (typeof ORDEM_COMPENDIUM_ENTRIES)[number]) => {
    const rawCat = entry.metadata?.categoryLevel ?? entry.cost ?? 0;
    if (
      selectedOrdemOrigin.id === 'engenheiro' &&
      !entry.metadata?.damageFormula &&
      entry.id === engenheiroFavItemId
    ) {
      return Math.max(0, rawCat - 1);
    }
    return rawCat;
  };

  const recruitItems = useMemo(
    () =>
      ORDEM_COMPENDIUM_ENTRIES.filter((e) => {
        if (e.category !== 'item') return false;
        if (
          !matchesContentSourceFilter(
            resolveEntrySourceId(e, 'ordem-paranormal'),
            [],
            allowedSources,
            'ordem-paranormal'
          )
        ) {
          return false;
        }
        if (e.metadata?.isCursedSpecial && !allowsCursedSpecial) return false;
        const effCat = getEffectiveRecruitItemCat(e);
        return effCat <= maxAllowedItemCategory;
      }).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [selectedOrdemOrigin.id, engenheiroFavItemId, allowsCursedSpecial, maxAllowedItemCategory, allowedSources]
  );

  const selectedCatCounts = useMemo(() => {
    const counts: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const [id, qty] of Object.entries(chosenItemQuantities)) {
      if (qty <= 0) continue;
      const entry = recruitItems.find((e) => e.id === id);
      if (!entry) continue;
      const rawCat = entry.metadata?.categoryLevel ?? entry.cost ?? 0;
      const isFavTool =
        selectedOrdemOrigin.id === 'engenheiro' &&
        !entry.metadata?.damageFormula &&
        entry.id === engenheiroFavItemId;
      if (isFavTool) {
        const firstUnitCat = Math.max(0, rawCat - 1);
        if (firstUnitCat >= 1 && firstUnitCat <= 4) {
          counts[firstUnitCat as 1 | 2 | 3 | 4] += 1;
        }
        if (qty > 1 && rawCat >= 1 && rawCat <= 4) {
          counts[rawCat as 1 | 2 | 3 | 4] += qty - 1;
        }
      } else if (rawCat >= 1 && rawCat <= 4) {
        counts[rawCat as 1 | 2 | 3 | 4] += qty;
      }
    }
    return counts;
  }, [chosenItemQuantities, recruitItems, selectedOrdemOrigin.id, engenheiroFavItemId]);

  const filteredRecruitItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    return recruitItems.filter((item) => {
      if (
        !matchesContentSourceFilter(
          resolveEntrySourceId(item, 'ordem-paranormal'),
          itemSourceFilter,
          allowedSources,
          'ordem-paranormal'
        )
      ) {
        return false;
      }
      const isPara = isOrdemCompendiumItemParanormal(item);
      if (itemRealmTab === 'normal' && isPara) return false;
      if (itemRealmTab === 'paranormal' && !isPara) return false;
      const cat = getEffectiveRecruitItemCat(item);
      if (itemCategoryFilter !== 'ALL' && cat !== itemCategoryFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });
  }, [recruitItems, itemSearch, itemCategoryFilter, itemRealmTab, itemSourceFilter, allowedSources, selectedOrdemOrigin.id, engenheiroFavItemId]);

  // --- Memos Tormenta 20 ---
  const selectedT20Race = useMemo(
    () => T20_RACES.find((r) => r.id === t20RaceId) || T20_RACES[0],
    [t20RaceId]
  );
  const selectedT20Class = useMemo(
    () => T20_CLASSES.find((c) => c.id === t20ClassId) || T20_CLASSES[0],
    [t20ClassId]
  );
  const t20SpentPoints = useMemo(() => {
    return Object.values(t20BaseAttrs).reduce(
      (sum, val) => sum + (T20_POINT_COSTS[val] ?? 0),
      0
    );
  }, [t20BaseAttrs]);
  const t20RemainingPoints = 10 - t20SpentPoints;

  // --- Handlers Ordem ---
  const handleOrdemAttrChange = (key: keyof OrdemAttributes, delta: number) => {
    setOrdemAttrs((prev) => {
      const nextVal = prev[key] + delta;
      if (nextVal < 0) return prev;
      // Diminuir é sempre permitido (mesmo acima do teto atual); aumentar respeita o teto.
      if (delta > 0 && nextVal > maxOrdemAttrCap) return prev;
      if (nextVal === 0 && prev[key] !== 0 && zeroAttrsCount >= 1) return prev;
      if (delta > 0 && remainingOrdemAttrPoints <= 0) return prev;
      return { ...prev, [key]: nextVal };
    });
  };

  const toggleOrdemFreeSkill = (skillId: string) => {
    if (lockedOrdemSkillIds.has(skillId)) return;
    setOrdemFreeSkills((prev) => {
      const clean = prev.filter((id) => !lockedOrdemSkillIds.has(id));
      if (clean.includes(skillId)) {
        return clean.filter((id) => id !== skillId);
      }
      if (clean.length >= totalOrdemFreeSkillSlots) return clean;
      return [...clean, skillId];
    });
  };

  const togglePeritoSkill = (skillId: string) => {
    if (skillId === 'luta' || skillId === 'pontaria') return;
    setPeritoSkills((prev) => {
      if (prev.includes(skillId)) return prev.filter((s) => s !== skillId);
      if (prev.length >= 2) return [prev[1], skillId];
      return [...prev, skillId];
    });
  };

  // Aviso flutuante (fica visível mesmo com a lista rolada)
  const [wizardNotice, setWizardNotice] = useState('');
  const noticeTimer = useRef<number>();
  function showWizardNotice(msg: string) {
    setWizardNotice(msg);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setWizardNotice(''), 3200);
  }
  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  const ritualLimitMessage = () =>
    `Você já escolheu o máximo de ${maxInitialRituals} rituais. Tire um da seleção para escolher outro.`;

  const toggleRitualChoice = (ritualId: string) => {
    if (ritualId === 'ord-rit-amaldicoar-arma') {
      setShowAmaldicoarElementPrompt((prev) => !prev);
      return;
    }
    // No limite: avisa em vez de trocar o primeiro ritual escolhido
    if (!chosenRitualIds.includes(ritualId) && chosenRitualIds.length >= maxInitialRituals) {
      showWizardNotice(ritualLimitMessage());
      return;
    }
    setChosenRitualIds((prev) =>
      prev.includes(ritualId) ? prev.filter((id) => id !== ritualId) : [...prev, ritualId]
    );
  };

  const selectAmaldicoarArmaWithElement = (element: 'Sangue' | 'Morte' | 'Conhecimento' | 'Energia') => {
    const compositeId = `ord-rit-amaldicoar-arma:${element}`;
    if (!chosenRitualIds.includes(compositeId) && chosenRitualIds.length >= maxInitialRituals) {
      showWizardNotice(ritualLimitMessage());
      setShowAmaldicoarElementPrompt(false);
      return;
    }
    setChosenRitualIds((prev) =>
      prev.includes(compositeId) ? prev.filter((id) => id !== compositeId) : [...prev, compositeId]
    );
    setShowAmaldicoarElementPrompt(false);
  };

  const changeRecruitItemQty = (itemId: string, delta: number) => {
    const entry = recruitItems.find((e) => e.id === itemId);
    if (!entry) return;
    const rawCat = entry.metadata?.categoryLevel ?? entry.cost ?? 0;
    const isFavTool =
      selectedOrdemOrigin.id === 'engenheiro' &&
      !entry.metadata?.damageFormula &&
      entry.id === engenheiroFavItemId;

    setChosenItemQuantities((prev) => {
      const currentQty = prev[itemId] || 0;
      const nextQty = Math.max(0, currentQty + delta);
      if (delta > 0) {
        const addedUnitCat =
          isFavTool && currentQty === 0 ? Math.max(0, rawCat - 1) : rawCat;
        if (addedUnitCat >= 1 && addedUnitCat <= 4) {
          const catKey = addedUnitCat as 1 | 2 | 3 | 4;
          if (selectedCatCounts[catKey] >= patentCategoryLimits[catKey]) {
            return prev;
          }
        }
      }
      const next = { ...prev };
      if (nextQty === 0) {
        delete next[itemId];
      } else {
        next[itemId] = nextQty;
      }
      return next;
    });
  };

  // --- Finalizar Criação ---
  const handleFinish = async () => {
    if (!name.trim()) {
      setErrorMsg('Informe o nome do personagem.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      if (system === 'ordem-paranormal') {
        const validFree = ordemFreeSkills
          .filter((id) => !lockedOrdemSkillIds.has(id))
          .slice(0, totalOrdemFreeSkillSlots);
        const trainedIds = Array.from(
          new Set([...originSkillIds, ...classMandatorySkillIds, ...validFree])
        );

        const chosenItemsArray = Object.entries(chosenItemQuantities)
          .filter(([, qty]) => qty > 0)
          .map(([id, quantity]) => ({ id, quantity }));

        const built = buildOrdemCharacter({
          originId: selectedOrdemOrigin.id,
          characterClass: ordemClassId,
          attributes: ordemAttrs,
          trainedSkillIds: trainedIds,
          peritoSkillIds: ordemClassId === 'especialista' ? peritoSkills : [],
          chosenRitualIds: ordemClassId === 'ocultista' ? chosenRitualIds : [],
          chosenParanormalPowerId: selectedOrdemOrigin.grantsParanormalPower
            ? cultistaPowerId
            : undefined,
          chosenItems: chosenItemsArray,
          favoriteToolItemId:
            selectedOrdemOrigin.id === 'engenheiro' ? engenheiroFavItemId : undefined,
          nex: ordemNex,
          patent: ordemPatent,
          trailId: effectiveTrailId || undefined,
          affinity: ordemNex >= 50 ? ordemAffinity : undefined,
          chosenClassPowerIds: chosenClassPowerIds.slice(0, totalClassPowerSlots),
          versatilityTrailId:
            ordemNex >= 50 && versatilityMode === 'trail_10'
              ? versatilityTrailId || undefined
              : undefined,
          skillTrainingDegrees: upgradedSkillDegrees,
          originMeta: {
            ...(selectedOrdemOrigin.id === 'profetizado' ? { profetizadoSkillId } : {}),
            ...(selectedOrdemOrigin.id === 'amigo_animais'
              ? {
                  amigoAnimaisSkillId,
                  amigoAnimaisName: amigoAnimaisName.trim() || undefined,
                }
              : {}),
            ...(selectedOrdemOrigin.id === 'experimento' ? { experimentoSkillId } : {}),
            ...(selectedOrdemOrigin.id === 'inventor_paranormal'
              ? { inventorRitualId }
              : {}),
            ...(selectedOrdemOrigin.id === 'jovem_mistico'
              ? { luckyNumber, extraLuckyNumbers: [] }
              : {}),
            ...(selectedOrdemOrigin.id === 'colegial'
              ? { bestFriendName: bestFriendName.trim() || undefined }
              : {}),
          },
        });

        const created = await createCharacter(name.trim(), system, {
          portraitUrl,
          customVitals: built.vitals,
          customSheetData: built.sheetData,
          initialInventory: built.inventory,
          initialAttacks: built.attacks,
        });
        onCreated(created);
      } else if (system === 'tormenta20') {
        const built = buildT20Character({
          raceId: t20RaceId,
          classId: t20ClassId,
          originId: t20Origin,
          deity: t20Deity,
          level: t20Level,
          baseAttributes: t20BaseAttrs,
          freeChosenAttrs: selectedT20Race.freeAttributeChoices
            ? t20FreeRaceAttrs
            : [],
          trainedSkillIds: t20FreeSkills,
        });

        const created = await createCharacter(name.trim(), system, {
          portraitUrl,
          customVitals: built.vitals,
          customSheetData: built.sheetData,
          initialInventory: built.inventory,
          initialAttacks: built.attacks,
        });
        onCreated(created);
      } else {
        const created = await createCharacter(name.trim(), system, portraitUrl);
        onCreated(created);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao criar personagem.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredOrigins = useMemo(() => {
    const q = originSearch.trim().toLowerCase();
    return ORDEM_ORIGINS.filter((o) => {
      if (
        !matchesContentSourceFilter(
          o.sourceId,
          originSourceFilter,
          allowedSources,
          'ordem-paranormal'
        )
      ) {
        return false;
      }
      if (!q) return true;
      return (
        o.name.toLowerCase().includes(q) ||
        o.powerName.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q)
      );
    });
  }, [originSearch, originSourceFilter, allowedSources]);

  const filteredRituals = useMemo(() => {
    const q = ritualSearch.trim().toLowerCase();
    return availableRituals.filter((r) => {
      if (
        !matchesContentSourceFilter(
          resolveEntrySourceId(r, 'ordem-paranormal'),
          ritualSourceFilter,
          allowedSources,
          'ordem-paranormal'
        )
      ) {
        return false;
      }
      const el = (r.metadata?.element || '').toLowerCase();
      if (
        ritualElementFilter !== 'ALL' &&
        !el.includes(ritualElementFilter.toLowerCase())
      ) {
        return false;
      }
      if (
        ritualCircleFilter !== 'ALL' &&
        (r.metadata?.circle || 1) !== ritualCircleFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
      );
    });
  }, [availableRituals, ritualSourceFilter, allowedSources, ritualElementFilter, ritualCircleFilter, ritualSearch]);

  return (
    <div className="trpg-dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="wizard-title">
      <div className="trpg-dialog sm:max-w-5xl h-[calc(100dvh-0.75rem)] sm:h-auto sm:max-h-[92vh] overflow-hidden">
        {/* Cabeçalho do assistente */}
        <div className="px-5 sm:px-6 pt-4 pb-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-zinc-400">Novo personagem, passo {step} de 4</p>
            <h2 id="wizard-title" className="text-2xl sm:text-3xl leading-tight">
              {step === 1 && 'Quem é você'}
              {step === 2 && 'Atributos'}
              {step === 3 && 'Classe e recursos'}
              {step === 4 && 'Perícias e equipamento'}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="trpg-icon-btn -mr-2" aria-label="Fechar o assistente">
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Etapas */}
        <ol className="grid grid-cols-4 gap-1.5 px-5 sm:px-6 pb-4 border-b border-zinc-800">
          {[
            { n: 1, label: 'Origem' },
            { n: 2, label: 'Atributos' },
            { n: 3, label: 'Classe' },
            { n: 4, label: 'Perícias' },
          ].map((item) => {
            const state = step === item.n ? 'current' : step > item.n ? 'done' : 'todo';
            return (
              <li key={item.n}>
                <button
                  type="button"
                  onClick={() => setStep(item.n as 1 | 2 | 3 | 4)}
                  aria-current={state === 'current' ? 'step' : undefined}
                  className="w-full text-left group"
                >
                  <span
                    className={`block h-1 rounded-full transition-colors ${
                      state === 'current' ? 'bg-amber-500' : state === 'done' ? 'bg-zinc-400' : 'bg-zinc-800 group-hover:bg-zinc-700'
                    }`}
                  />
                  <span
                    className={`mt-2 flex items-center gap-1.5 text-xs sm:text-sm ${
                      state === 'current' ? 'text-zinc-100 font-semibold' : state === 'done' ? 'text-zinc-300' : 'text-zinc-500'
                    }`}
                  >
                    <span className="trpg-num hidden sm:inline">{item.n}.</span>
                    {item.label}
                    {state === 'done' && <Icon name="check" size={13} className="text-zinc-400" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* Corpo Rolável */}
        <div ref={bodyRef} className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-6">
          {errorMsg && (
            <div role="alert" className="p-3 rounded-lg bg-red-950/50 border border-red-800/80 text-red-200 text-sm flex gap-2">
              <Icon name="warning" size={16} className="mt-0.5 shrink-0" /> {errorMsg}
            </div>
          )}

          {/* ============================================================== */}
          {/* PASSO 1: IDENTIDADE E ORIGEM                                   */}
          {/* ============================================================== */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                    Nome do Personagem *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Arthur Cervero, Kaiser, Elizabeth..."
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                    Sistema de Regras
                  </label>
                  <select
                    value={system}
                    disabled={Boolean(lockedSystem)}
                    onChange={(e) => setSystem(e.target.value as SystemId)}
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm disabled:opacity-60"
                  >
                    <option value="ordem-paranormal">Ordem Paranormal RPG (v1.3)</option>
                    <option value="tormenta20">Tormenta 20 (Jogo do Ano)</option>
                    <option value="duna">Duna (2d20)</option>
                  </select>
                </div>

                <div>
                  <ImageUploadField
                    label="Retrato do Personagem (Opcional)"
                    value={portraitUrl}
                    onChange={setPortraitUrl}
                  />
                </div>
              </div>

              {system === 'ordem-paranormal' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-950/60 p-4 rounded-xl border border-indigo-500/30">
                  <div>
                    <label className="block text-xs font-bold uppercase text-indigo-300 mb-1">
                      <Icon name="zap" /> NEX Inicial {typeof lockedNex === 'number' ? '(Definido pelo Mestre)' : ''}
                    </label>
                    <select
                      value={ordemNex}
                      disabled={typeof lockedNex === 'number'}
                      onChange={(e) => {
                        const nextN = Number(e.target.value);
                        if (nextN !== ordemNex) {
                          // Pontos e teto de atributo dependem do NEX: recomeça a distribuição.
                          setOrdemAttrs({ agi: 1, for: 1, int: 1, pre: 1, vig: 1 });
                        }
                        setOrdemNex(nextN);
                        if (nextN === 0) {
                          setOrdemClassId('mundano');
                          if (!lockedPatent) setOrdemPatent('Mundano');
                        } else if (ordemClassId === 'mundano') {
                          setOrdemClassId('combatente');
                          if (!lockedPatent && ordemPatent === 'Mundano') setOrdemPatent('Recruta');
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm disabled:opacity-60"
                    >
                      {ORDEM_NEX_PROGRESSION.map((m) => (
                        <option key={m.nex} value={m.nex}>
                          NEX {m.nex}% — {m.summary}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-emerald-300 mb-1">
                      <Icon name="award" /> Patente Inicial {lockedPatent ? '(Definida pelo Mestre)' : ''}
                    </label>
                    <select
                      value={ordemPatent}
                      disabled={Boolean(lockedPatent)}
                      onChange={(e) => {
                        setOrdemPatent(e.target.value);
                        setChosenItemQuantities({});
                        setItemCategoryFilter('ALL');
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm disabled:opacity-60"
                    >
                      <option value="Mundano">Mundano (1 item Cat. I)</option>
                      {ORDEM_PATENTS.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name} (Cat I:{p.categoryLimits[1]} II:{p.categoryLimits[2]} III:{p.categoryLimits[3]} IV:{p.categoryLimits[4]} • Créd. {p.creditLimit})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {system === 'tormenta20' && (
                <div className="bg-zinc-950/60 p-4 rounded-xl border border-amber-500/30 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase text-amber-400 block">
                      <Icon name="swords" /> Nível Inicial (Tormenta 20)
                    </span>
                    <span className="text-xs text-zinc-400">
                      PV e PM iniciais serão escalonados automaticamente para o nível escolhido.
                    </span>
                  </div>
                  <select
                    value={t20Level}
                    onChange={(e) => setT20Level(Number(e.target.value))}
                    className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm font-mono font-bold"
                  >
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((lvl) => (
                      <option key={lvl} value={lvl}>
                        Nível {lvl}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {system === 'ordem-paranormal' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-zinc-100">
                        <Icon name="scroll" /> Escolha sua Origem ({filteredOrigins.length} disponíveis)
                      </h3>
                      <p className="text-xs text-zinc-400">
                        O que seu personagem fazia antes de conhecer a Ordo Realitas? Concede 2 perícias treinadas e 1 poder exclusivo.
                      </p>
                    </div>
                    <input
                      type="text"
                      value={originSearch}
                      onChange={(e) => setOriginSearch(e.target.value)}
                      placeholder="Filtrar origem ou poder..."
                      className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white"
                    />
                  </div>

                  <ContentSourceFilterBar
                    system="ordem-paranormal"
                    allowedSources={allowedSources}
                    selectedSources={originSourceFilter}
                    onChange={setOriginSourceFilter}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                    {filteredOrigins.map((orig) => {
                      const isSelected = orig.id === ordemOriginId;
                      return (
                        <button
                          key={orig.id}
                          type="button"
                          onClick={() => setOrdemOriginId(orig.id)}
                          className={`text-left p-3.5 rounded-xl border transition-all ${
                            isSelected
                              ? 'bg-amber-600/15 border-amber-500 shadow-lg'
                              : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-600'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5 mb-1">
                            <span className="font-black text-white text-sm">{orig.name}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-amber-300 shrink-0">
                              <Icon name="sparkles" /> {orig.powerName}
                            </span>
                          </div>
                          {orig.sourceId && orig.sourceId !== 'ordem-base' && (
                            <div className="mb-1.5">
                              <SourceTagBadge sourceId={orig.sourceId} system="ordem-paranormal" />
                            </div>
                          )}
                          <p className="text-[11px] text-zinc-400 line-clamp-2 mb-2">
                            {orig.description}
                          </p>
                          <div className="text-[10px] font-bold text-emerald-400">
                            <Icon name="target" /> Perícias:{' '}
                            {orig.id === 'profetizado'
                              ? 'Vontade + 1 à sua escolha'
                              : orig.skills.length > 0
                              ? orig.skills
                                  .map(
                                    (sId) =>
                                      ORDEM_SKILLS_METADATA.find((m) => m.id === sId)
                                        ?.name || sId
                                  )
                                  .join(' + ')
                              : '2 à sua escolha (Amnésico)'}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Detalhe da Origem Selecionada */}
                  <div className="p-4 rounded-xl bg-zinc-950 border border-amber-500/40 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                          Origem Selecionada
                        </span>
                        <h4 className="text-base font-black text-white">
                          {selectedOrdemOrigin.name} — Poder: {selectedOrdemOrigin.powerName}
                        </h4>
                      </div>
                      {selectedOrdemOrigin.powerCost > 0 && (
                        <span className="px-2.5 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                          Custo: {selectedOrdemOrigin.powerCost} PE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {selectedOrdemOrigin.powerDescription}
                    </p>

                    {/* Se for Amnésico: Escolher 2 perícias */}
                    {selectedOrdemOrigin.id === 'amnesico' && (
                      <div className="pt-2 border-t border-zinc-800">
                        <p className="text-xs font-bold text-amber-300 mb-2">
                          <Icon name="brain" /> Amnésico: Escolha as 2 perícias treinadas pelo seu passado ({amnesicoSkills.length}/2):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {ORDEM_SKILLS_METADATA.map((sk) => {
                            const active = amnesicoSkills.includes(sk.id);
                            return (
                              <button
                                key={sk.id}
                                type="button"
                                onClick={() => {
                                  setAmnesicoSkills((prev) => {
                                    if (prev.includes(sk.id))
                                      return prev.filter((i) => i !== sk.id);
                                    if (prev.length >= 2) return [prev[1], sk.id];
                                    return [...prev, sk.id];
                                  });
                                }}
                                className={`px-2 py-1 rounded text-[11px] font-bold border ${
                                  active
                                    ? 'bg-amber-600 text-white border-amber-400'
                                    : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                                }`}
                              >
                                {sk.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Se for Cultista Arrependido: Escolher 1 Poder Paranormal inicial */}
                    {selectedOrdemOrigin.grantsParanormalPower && (
                      <div className="pt-2 border-t border-zinc-800 space-y-2">
                        <p className="text-xs font-bold text-purple-300">
                          <Icon name="conhecimento" /> Traços do Outro Lado: Escolha seu 1º Poder Paranormal gratuito (você começa com metade da Sanidade normal da classe):
                        </p>
                        <ContentSourceFilterBar
                          system="ordem-paranormal"
                          allowedSources={allowedSources}
                          selectedSources={powerSourceFilter}
                          onChange={setPowerSourceFilter}
                          compact
                        />
                        <select
                          value={cultistaPowerId}
                          onChange={(e) => setCultistaPowerId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-purple-500/50 text-white text-xs"
                        >
                          {initialParanormalPowers.map((pw) => (
                            <option key={pw.id} value={pw.id}>
                              {pw.name} — {pw.description.slice(0, 95)}...
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Se for Engenheiro: Escolher o Item (Ferramenta Favorita) */}
                    {selectedOrdemOrigin.id === 'engenheiro' && (
                      <div className="pt-2 border-t border-zinc-800 space-y-2">
                        <p className="text-xs font-bold text-emerald-300">
                          <Icon name="wrench" /> Ferramenta Favorita (Engenheiro): Escolha um item (exceto armas) para contar como uma Categoria abaixo para você:
                        </p>
                        <select
                          value={engenheiroFavItemId}
                          onChange={(e) => setEngenheiroFavItemId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-emerald-500/50 text-white text-xs"
                        >
                          {engenheiroEligibleItems.map((it) => {
                            const rawCat = it.metadata?.categoryLevel ?? it.cost ?? 1;
                            return (
                              <option key={it.id} value={it.id}>
                                {it.name} (Cat. {rawCat === 2 ? 'II → I' : 'I → 0'}) — {it.description.slice(0, 75)}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}

                    {/* Se for Profetizado: Escolher 1 perícia relacionada à premonição */}
                    {selectedOrdemOrigin.id === 'profetizado' && (
                      <div className="pt-2 border-t border-zinc-800 space-y-2">
                        <p className="text-xs font-bold text-amber-300">
                          <Icon name="eye" /> Profetizado: Além de Vontade, escolha 1 perícia treinada ligada à sua premonição:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {ORDEM_SKILLS_METADATA.filter((sk) => sk.id !== 'vontade').map((sk) => {
                            const active = profetizadoSkillId === sk.id;
                            return (
                              <button
                                key={sk.id}
                                type="button"
                                onClick={() => setProfetizadoSkillId(sk.id)}
                                className={`px-2 py-1 rounded text-[11px] font-bold border cursor-pointer ${
                                  active
                                    ? 'bg-amber-600 text-white border-amber-400'
                                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                                }`}
                              >
                                {sk.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Se for Amigo dos Animais: Escolher perícia +2 do companheiro + nome opcional */}
                    {selectedOrdemOrigin.id === 'amigo_animais' && (
                      <div className="pt-2 border-t border-zinc-800 space-y-2.5">
                        <p className="text-xs font-bold text-emerald-300">
                          <Icon name="heart" /> Companheiro Animal: Escolha a perícia em que seu parceiro animal fornece +2 (aprovada pelo mestre):
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <select
                            value={amigoAnimaisSkillId}
                            onChange={(e) => setAmigoAnimaisSkillId(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-emerald-500/50 text-white text-xs"
                          >
                            {ORDEM_SKILLS_METADATA.map((sk) => (
                              <option key={sk.id} value={sk.id}>
                                +2 em {sk.name} ({sk.attribute.toUpperCase()})
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={amigoAnimaisName}
                            onChange={(e) => setAmigoAnimaisName(e.target.value)}
                            placeholder="Nome / espécie do animal (opcional)"
                            className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {/* Se for Experimento: Escolher perícia física (FOR, AGI ou VIG) para +2 */}
                    {selectedOrdemOrigin.id === 'experimento' && (
                      <div className="pt-2 border-t border-zinc-800 space-y-2">
                        <p className="text-xs font-bold text-red-300">
                          <Icon name="zap" /> Mutação (Experimento): Escolha 1 perícia originalmente baseada em FOR, AGI ou VIG para receber +2 (além de RD 2 e -1d20 em Diplomacia):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {ORDEM_SKILLS_METADATA.filter((sk) =>
                            ['for', 'agi', 'vig'].includes(sk.attribute)
                          ).map((sk) => {
                            const active = experimentoSkillId === sk.id;
                            return (
                              <button
                                key={sk.id}
                                type="button"
                                onClick={() => setExperimentoSkillId(sk.id)}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold border cursor-pointer ${
                                  active
                                    ? 'bg-red-700 text-white border-red-400'
                                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                                }`}
                              >
                                {sk.name} ({sk.attribute.toUpperCase()})
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Se for Inventor Paranormal: Escolher 1 ritual de 1º círculo */}
                    {selectedOrdemOrigin.id === 'inventor_paranormal' && (
                      <div className="pt-2 border-t border-zinc-800 space-y-2">
                        <p className="text-xs font-bold text-purple-300">
                          <Icon name="wrench" /> Invenção Paranormal: Escolha o ritual de 1º círculo contido no seu Invento Paranormal inicial (Cat. 0, 1 espaço):
                        </p>
                        <select
                          value={inventorRitualId}
                          onChange={(e) => setInventorRitualId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-purple-500/50 text-white text-xs"
                        >
                          {firstCircleRitualsForInventor.flatMap((rit) =>
                            rit.id === 'ord-rit-amaldicoar-arma'
                              ? (['Sangue', 'Morte', 'Conhecimento', 'Energia'] as const).map(
                                  (el) => (
                                    <option key={`${rit.id}:${el}`} value={`${rit.id}:${el}`}>
                                      Amaldiçoar Arma — {el} (1º Círculo)
                                    </option>
                                  )
                                )
                              : [
                                  <option key={rit.id} value={rit.id}>
                                    {rit.name} ({rit.metadata?.element || 'Paranormal'})
                                  </option>,
                                ]
                          )}
                        </select>
                      </div>
                    )}

                    {/* Se for Jovem Místico: Escolher Número da Sorte (1 a 6) */}
                    {selectedOrdemOrigin.id === 'jovem_mistico' && (
                      <div className="pt-2 border-t border-zinc-800 space-y-2">
                        <p className="text-xs font-bold text-indigo-300">
                          <Icon name="sparkles" /> A Culpa é das Estrelas: Escolha seu Número da Sorte fixo (1 a 6):
                        </p>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5, 6].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setLuckyNumber(num)}
                              className={`w-9 h-9 rounded-lg font-mono font-black text-sm border cursor-pointer ${
                                luckyNumber === num
                                  ? 'bg-indigo-600 text-white border-indigo-400 shadow'
                                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Se for Colegial: Nome do Melhor Amigo */}
                    {selectedOrdemOrigin.id === 'colegial' && (
                      <div className="pt-2 border-t border-zinc-800 space-y-2">
                        <p className="text-xs font-bold text-amber-300">
                          <Icon name="users" /> Poder da Amizade (Colegial): Quem é o seu melhor amigo na equipe?
                        </p>
                        <input
                          type="text"
                          value={bestFriendName}
                          onChange={(e) => setBestFriendName(e.target.value)}
                          placeholder="Nome do personagem melhor amigo (editável na ficha)"
                          className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {system === 'tormenta20' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                    <label className="block text-xs font-bold uppercase text-amber-400">
                      Raça (Tormenta 20)
                    </label>
                    <select
                      value={t20RaceId}
                      onChange={(e) => setT20RaceId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm"
                    >
                      {T20_RACES.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-zinc-400">{selectedT20Race.description}</p>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                    <label className="block text-xs font-bold uppercase text-amber-400">
                      Origem
                    </label>
                    <select
                      value={t20Origin}
                      onChange={(e) => setT20Origin(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm"
                    >
                      {T20_ORIGINS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                    <label className="block text-xs font-bold uppercase text-amber-400">
                      Divindade Devota
                    </label>
                    <select
                      value={t20Deity}
                      onChange={(e) => setT20Deity(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm"
                    >
                      {T20_DEITIES.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* PASSO 2: DISTRIBUIÇÃO DE ATRIBUTOS                             */}
          {/* ============================================================== */}
          {step === 2 && system === 'ordem-paranormal' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <div>
                  <h3 className="text-base font-semibold text-zinc-100">
                    <Icon name="zap" /> Distribuição de Atributos (Ordem Paranormal v1.3, p. 15)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Todos os atributos começam em <strong>1</strong>. Você recebe{' '}
                    <strong>+{selectedOrdemClass.attributePoints} pontos base</strong>
                    {bonusNexAttrPoints > 0 && (
                      <span className="text-indigo-300 font-bold">
                        {' '}
                        + {bonusNexAttrPoints} aumento(s) por NEX {ordemNex}%
                      </span>
                    )}{' '}
                    para distribuir (máximo por atributo: <strong>{maxOrdemAttrCap}</strong>). Você pode reduzir no máximo 1 atributo para 0 para receber +1 ponto extra.
                  </p>
                </div>
                <div className="px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-center">
                  <span className="block text-[10px] uppercase font-bold text-amber-300">
                    Pontos Restantes
                  </span>
                  <span className="text-2xl font-black text-white">
                    {remainingOrdemAttrPoints}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {(
                  [
                    { key: 'agi', code: 'AGI', name: 'Agilidade', desc: 'Pontaria, Reflexos, Iniciativa, Furtividade, Defesa' },
                    { key: 'for', code: 'FOR', name: 'Força', desc: 'Luta, Atletismo, Capacidade de Carga (5x FOR)' },
                    { key: 'int', code: 'INT', name: 'Intelecto', desc: 'Ocultismo, Investigação, Medicina, +Perícias Treinadas' },
                    { key: 'pre', code: 'PRE', name: 'Presença', desc: 'Vontade, Diplomacia, DT de Rituais e +PE por NEX' },
                    { key: 'vig', code: 'VIG', name: 'Vigor', desc: 'Fortitude, Resistência Física e +PV por NEX' },
                  ] as const
                ).map((attr) => {
                  const val = ordemAttrs[attr.key];
                  return (
                    <div
                      key={attr.key}
                      className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col items-center text-center space-y-2"
                    >
                      <span className="text-xs font-black tracking-widest text-amber-400">
                        {attr.code}
                      </span>
                      <span className="text-sm font-bold text-white">{attr.name}</span>
                      <p className="text-[10px] text-zinc-500 min-h-[28px]">{attr.desc}</p>
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => handleOrdemAttrChange(attr.key, -1)}
                          className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-black"
                        >
                          -
                        </button>
                        <span className="text-2xl font-black text-white w-8">{val}</span>
                        <button
                          type="button"
                          onClick={() => handleOrdemAttrChange(attr.key, 1)}
                          className="w-8 h-8 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-black"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-semibold">
                        {val <= 0 ? '2d20 (menor)' : `${val}d20 (maior)`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && system === 'tormenta20' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <div>
                  <h3 className="text-base font-semibold text-zinc-100">
                    Compra de Atributos (10 Pontos — Tormenta 20)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Custos: -1 (-1 pt), 0 (0 pt), 1 (1 pt), 2 (2 pts), 3 (4 pts), 4 (7 pts).
                  </p>
                </div>
                <div className="px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-center">
                  <span className="block text-[10px] uppercase font-bold text-amber-300">
                    Saldo de Pontos
                  </span>
                  <span className="text-2xl font-black text-white">
                    {t20RemainingPoints}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {(
                  [
                    { key: 'forca', label: 'Força' },
                    { key: 'destreza', label: 'Destreza' },
                    { key: 'constituicao', label: 'Constituição' },
                    { key: 'inteligencia', label: 'Inteligência' },
                    { key: 'sabedoria', label: 'Sabedoria' },
                    { key: 'carisma', label: 'Carisma' },
                  ] as const
                ).map((attr) => {
                  const baseVal = t20BaseAttrs[attr.key];
                  const racial = selectedT20Race.attributeBonuses[attr.key] || 0;
                  const freeBonus =
                    selectedT20Race.freeAttributeChoices &&
                    t20FreeRaceAttrs.includes(attr.key)
                      ? 1
                      : 0;
                  return (
                    <div
                      key={attr.key}
                      className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-center space-y-2"
                    >
                      <span className="text-xs font-black uppercase text-amber-400">
                        {attr.label}
                      </span>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setT20BaseAttrs((p) => ({
                              ...p,
                              [attr.key]: Math.max(-1, p[attr.key] - 1),
                            }))
                          }
                          className="w-7 h-7 rounded bg-zinc-800 text-white font-bold"
                        >
                          -
                        </button>
                        <span className="text-xl font-black text-white w-8">
                          {baseVal + racial + freeBonus}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setT20BaseAttrs((p) => ({
                              ...p,
                              [attr.key]: Math.min(4, p[attr.key] + 1),
                            }))
                          }
                          className="w-7 h-7 rounded bg-amber-600 text-white font-bold"
                        >
                          +
                        </button>
                      </div>
                      <span className="block text-[10px] text-zinc-500">
                        Base {baseVal} | Raça {racial + freeBonus >= 0 ? `+${racial + freeBonus}` : racial + freeBonus}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* PASSO 3: CLASSE, BARRAS VITAIS E HABILIDADES INICIAIS          */}
          {/* ============================================================== */}
          {step === 3 && system === 'ordem-paranormal' && (
            <div className="space-y-6">
              {ordemNex === 0 && (
                <p className="rounded-lg border border-zinc-700 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-300 flex gap-2">
                  <Icon name="info" size={16} className="mt-0.5 shrink-0 text-zinc-400" />
                  Com NEX 0% o personagem é um mundano: ainda não entrou na Ordem e não tem classe. Para escolher Combatente,
                  Especialista ou Ocultista, volte à etapa 1 e suba o NEX.
                </p>
              )}
              <div className={`grid grid-cols-1 gap-3 ${ordemNex === 0 ? 'md:grid-cols-1 max-w-md' : 'md:grid-cols-3'}`}>
                {/* NEX 0% = Mundano automaticamente; com NEX > 0% só as três classes da Ordem */}
                {ORDEM_CLASSES.filter((cls) => (ordemNex === 0 ? cls.id === 'mundano' : cls.id !== 'mundano')).map((cls) => {
                  const active = cls.id === ordemClassId;
                  const disabledByLockedNex = false;
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      disabled={disabledByLockedNex || cls.id === 'mundano'}
                      onClick={() => {
                        setOrdemClassId(cls.id);
                        setOrdemTrailId('');
                        setChosenClassPowerIds([]);
                      }}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        disabledByLockedNex
                          ? 'bg-zinc-950 border-zinc-800/50 opacity-40 cursor-not-allowed'
                          : active
                          ? 'bg-amber-600/15 border-amber-500 shadow-lg cursor-pointer'
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-black text-white text-base">
                          {cls.name}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-amber-300">
                          {cls.id === 'mundano' ? 'NEX 0%' : `NEX ${ordemNex}%`}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-200/80 font-semibold mb-2">
                        {cls.subtitle}
                      </p>
                      <p className="text-xs text-zinc-400 mb-3">{cls.description}</p>
                      <div className="text-[10px] text-zinc-300 space-y-0.5 border-t border-zinc-800 pt-2">
                        <div><Icon name="heart" /> PV Base: {cls.basePv} + VIG (+{cls.pvPerNex}/NEX)</div>
                        <div><Icon name="zap" /> PE Base: {cls.basePe} + PRE (+{cls.pePerNex}/NEX)</div>
                        <div><Icon name="brain" /> SAN Base: {cls.baseSan} (+{cls.sanPerNex}/NEX)</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Resumo Matemático Calculado em Tempo Real (Escalonado por NEX) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <div className="text-center">
                  <span className="text-[10px] font-bold uppercase text-red-400">
                    <Icon name="heart" /> PV (NEX {ordemNex}%)
                  </span>
                  <div className="text-2xl font-black text-white">
                    {ordemVitalsPreview.pv}
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-bold uppercase text-amber-400">
                    <Icon name="zap" /> PE (NEX {ordemNex}%)
                  </span>
                  <div className="text-2xl font-black text-white">
                    {ordemVitalsPreview.pe}
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-bold uppercase text-blue-400">
                    <Icon name="brain" /> SAN (NEX {ordemNex}%)
                  </span>
                  <div className="text-2xl font-black text-white">
                    {ordemVitalsPreview.san}
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-bold uppercase text-emerald-400">
                    <Icon name="shield" /> Defesa Base
                  </span>
                  <div className="text-2xl font-black text-white">
                    {ordemVitalsPreview.defense}
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-bold uppercase text-zinc-400">
                    <Icon name="backpack" /> Carga Máxima
                  </span>
                  <div className="text-2xl font-black text-white">
                    {ordemVitalsPreview.maxSlots} esp.
                  </div>
                </div>
              </div>

              {/* Habilidades Iniciais da Classe */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <h4 className="text-sm font-semibold text-zinc-100">
                  <Icon name="sparkles" /> Habilidades Iniciais de {selectedOrdemClass.name} & Proficiências
                </h4>
                <p className="text-xs text-zinc-400">
                  <strong>Proficiências:</strong> {selectedOrdemClass.proficiencies.join(', ')}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {selectedOrdemClass.initialAbilities.map((ab) => (
                    <div
                      key={ab.name}
                      className="p-3 rounded-lg bg-zinc-900 border border-zinc-800"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white text-xs">{ab.name}</span>
                        {ab.cost > 0 && (
                          <span className="text-[10px] font-bold text-amber-400">
                            {ab.cost} PE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400">{ab.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trilha de Classe (Desbloqueada em NEX >= 10%) */}
              {ordemNex >= 10 && ordemClassId !== 'mundano' && availableClassTrails.length > 0 && (
                <div className="p-4 rounded-xl bg-zinc-950 border border-indigo-500/40 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-100">
                        <Icon name="route" /> Trilha de Classe (NEX {ordemNex}%)
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        Escolha sua trilha; todos os poderes desbloqueados até {ordemNex}% NEX serão adicionados automaticamente.
                      </p>
                    </div>
                    <select
                      value={effectiveTrailId}
                      onChange={(e) => setOrdemTrailId(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-indigo-600/60 text-xs font-bold text-white"
                    >
                      {availableClassTrails.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <ContentSourceFilterBar
                    system="ordem-paranormal"
                    allowedSources={allowedSources}
                    selectedSources={trailSourceFilter}
                    onChange={setTrailSourceFilter}
                    compact
                  />
                  {selectedTrailObj && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {selectedTrailObj.powers
                        .filter((tp) => ordemNex >= tp.nex)
                        .map((tp) => (
                          <div
                            key={tp.nex}
                            className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-indigo-200">
                                ({tp.nex}%) {tp.name}
                              </span>
                              {tp.cost > 0 && (
                                <span className="text-[10px] font-bold text-amber-400">
                                  {tp.cost} PE
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-1">{tp.description}</p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Afinidade Elemental & Versatilidade (NEX >= 50%) */}
              {ordemNex >= 50 && ordemClassId !== 'mundano' && (
                <div className="p-4 rounded-xl bg-zinc-950 border border-purple-500/40 space-y-3">
                  <h4 className="text-sm font-semibold text-zinc-100">
                    <Icon name="conhecimento" /> Marcos de NEX 50%: Afinidade Elemental & Versatilidade
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                        Elemento de Afinidade Elemental
                      </label>
                      <div role="radiogroup" aria-label="Elemento de afinidade" className="grid grid-cols-2 gap-1.5">
                        {['Sangue', 'Morte', 'Conhecimento', 'Energia'].map((el) => (
                          <button
                            key={el}
                            type="button"
                            role="radio"
                            aria-checked={ordemAffinity === el}
                            onClick={() => setOrdemAffinity(el)}
                            className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 ${elementChoiceClasses(el, ordemAffinity === el)}`}
                          >
                            <Icon name={el.toLowerCase()} size={15} /> {el}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                        Versatilidade (50% NEX)
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setVersatilityMode('class_power');
                            setVersatilityTrailId('');
                          }}
                          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold border cursor-pointer ${
                            versatilityMode === 'class_power'
                              ? 'bg-purple-600 text-white border-purple-400'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          }`}
                        >
                          +1 Poder de Classe
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setVersatilityMode('trail_10');
                            const other = availableClassTrails.find((t) => t.id !== effectiveTrailId);
                            setVersatilityTrailId(other?.id || '');
                          }}
                          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold border cursor-pointer ${
                            versatilityMode === 'trail_10'
                              ? 'bg-purple-600 text-white border-purple-400'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          }`}
                        >
                          Poder 10% Outra Trilha
                        </button>
                      </div>
                      {versatilityMode === 'trail_10' && (
                        <select
                          value={versatilityTrailId}
                          onChange={(e) => setVersatilityTrailId(e.target.value)}
                          className="w-full mt-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
                        >
                          {availableClassTrails
                            .filter((t) => t.id !== effectiveTrailId)
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}: {t.powers.find((p) => p.nex === 10)?.name}
                              </option>
                            ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Poderes de Classe & Transcender Acumulados (NEX >= 15%) */}
              {totalClassPowerSlots > 0 && (
                <div className="p-4 rounded-xl bg-zinc-950 border border-amber-500/40 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-100">
                        <Icon name="zap" /> Poderes de Classe & Transcender Acumulados ({chosenClassPowerIds.length} / {totalClassPowerSlots})
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        Marcos 15%, 30%, 45%, 60%, 75%, 90%{ordemNex >= 50 && versatilityMode === 'class_power' ? ' + Versatilidade 50%' : ''}. Poderes Paranormais descontam SAN por Transcender ({transcendedCountPreview} selecionado(s)).
                      </p>
                    </div>
                    <input
                      type="text"
                      value={classPowerSearch}
                      onChange={(e) => setClassPowerSearch(e.target.value)}
                      placeholder="Filtrar poder..."
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
                    />
                  </div>

                  <ContentSourceFilterBar
                    system="ordem-paranormal"
                    allowedSources={allowedSources}
                    selectedSources={powerSourceFilter}
                    onChange={setPowerSourceFilter}
                    compact
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                    {selectableClassAndParanormalPowers
                      .filter((pw) => {
                        const q = classPowerSearch.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          pw.name.toLowerCase().includes(q) ||
                          pw.description.toLowerCase().includes(q)
                        );
                      })
                      .map((pw) => {
                        const isPicked = chosenClassPowerIds.includes(pw.id);
                        const reqCheck = checkOrdemPowerRequirements(
                          pw,
                          {
                            origin: selectedOrdemOrigin.name,
                            characterClass: ordemClassId,
                            nex: ordemNex,
                            patent: ordemPatent,
                            displacement: 9,
                            attributes: ordemAttrs,
                            skills: [],
                          },
                          []
                        );
                        return (
                          <button
                            key={pw.id}
                            type="button"
                            onClick={() => {
                              setChosenClassPowerIds((prev) => {
                                if (prev.includes(pw.id)) return prev.filter((id) => id !== pw.id);
                                if (prev.length >= totalClassPowerSlots) return prev;
                                return [...prev, pw.id];
                              });
                            }}
                            className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                              isPicked
                                ? 'bg-amber-600/20 border-amber-500'
                                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-white">{pw.name}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                {pw.category === 'paranormal_power' && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700">
                                    Transcender
                                  </span>
                                )}
                                {!reqCheck.met && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-950 text-red-300">
                                    Req: {reqCheck.missing[0]}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                              {pw.description}
                            </p>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Se for Ocultista: Escolher os Rituais Iniciais até o Círculo desbloqueado */}
              {ordemClassId === 'ocultista' && (
                <div className="p-4 rounded-xl bg-zinc-950 border-2 border-purple-500/60 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-100">
                        <Icon name="sigil" /> Escolhido pelo Outro Lado: Selecione seus Rituais ({chosenRitualIds.length}/{maxInitialRituals} máx • mín. 3 • até {maxRitualCircle}º Círculo)
                      </h4>
                      <p className="text-xs text-zinc-400">
                        Em NEX {ordemNex}%, você pode escolher até {maxInitialRituals} rituais até o {maxRitualCircle}º Círculo.
                      </p>
                    </div>
                    <input
                      type="text"
                      value={ritualSearch}
                      onChange={(e) => setRitualSearch(e.target.value)}
                      placeholder="Pesquisar ritual por nome ou efeito..."
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
                    />
                  </div>

                  <ContentSourceFilterBar
                    system="ordem-paranormal"
                    allowedSources={allowedSources}
                    selectedSources={ritualSourceFilter}
                    onChange={setRitualSourceFilter}
                    compact
                  />

                  {/* Barra Visual dos Rituais Selecionados */}
                  <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-700/60 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black uppercase text-purple-300">
                      Rituais Escolhidos ({chosenRitualIds.length}/{maxInitialRituals}):
                    </span>
                    {chosenRitualIds.length === 0 ? (
                      <span className="text-xs text-zinc-400 italic">
                        Nenhum ritual selecionado ainda. Clique nos cards abaixo para escolher seus rituais!
                      </span>
                    ) : (
                      chosenRitualIds.map((rawId, idx) => {
                        const [baseId, chosenEl] = rawId.split(':');
                        const rObj = availableRituals.find((r) => r.id === baseId);
                        if (!rObj) return null;
                        const displayName = chosenEl
                          ? `Amaldiçoar Arma — ${chosenEl} (1º Círculo)`
                          : rObj.name;
                        return (
                          <span
                            key={rawId}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-extrabold shadow"
                          >
                            <span>
                              {idx + 1}. {displayName}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setChosenRitualIds((prev) => prev.filter((id) => id !== rawId))
                              }
                              className="text-purple-200 hover:text-white font-black cursor-pointer"
                              title="Remover ritual"
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })
                    )}
                  </div>

                  {showAmaldicoarElementPrompt && (
                    <div className="p-4 rounded-xl bg-amber-950/40 border-2 border-amber-500 flex flex-col gap-3 animate-pulse">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase text-amber-400">
                            <Icon name="sigil" /> Escolha Obrigatória do Ritual
                          </span>
                          <h5 className="text-sm font-black text-white">
                            De qual elemento você quer aprender &quot;Amaldiçoar Arma&quot;?
                          </h5>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAmaldicoarElementPrompt(false)}
                          className="text-xs text-zinc-400 hover:text-white px-2 py-1"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(
                          [
                            { el: 'Sangue', icon: 'sangue' },
                            { el: 'Morte', icon: 'morte' },
                            { el: 'Conhecimento', icon: 'conhecimento' },
                            { el: 'Energia', icon: 'energia' },
                          ] as const
                        ).map((opt) => {
                          const alreadyPicked = chosenRitualIds.includes(
                            `ord-rit-amaldicoar-arma:${opt.el}`
                          );
                          return (
                            <button
                              key={opt.el}
                              type="button"
                              onClick={() => selectAmaldicoarArmaWithElement(opt.el)}
                              className={`py-2.5 px-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 ${elementChoiceClasses(opt.el, alreadyPicked)}`}
                            >
                              <Icon name={opt.icon} size={16} />
                              <span>{opt.el}</span>
                              {alreadyPicked && <span>(✓)</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {['ALL', 'Sangue', 'Morte', 'Conhecimento', 'Energia'].map((el) => (
                        <button
                          key={el}
                          type="button"
                          onClick={() => setRitualElementFilter(el)}
                          aria-pressed={ritualElementFilter === el}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            el === 'ALL'
                              ? ritualElementFilter === el
                                ? 'border bg-zinc-800 border-zinc-500 text-zinc-100'
                                : 'border bg-transparent border-zinc-800 text-zinc-400 hover:text-zinc-200'
                              : elementChoiceClasses(el, ritualElementFilter === el)
                          }`}
                        >
                          {el === 'ALL' ? 'Todos os elementos' : el}
                        </button>
                      ))}
                    </div>

                    {maxRitualCircle > 1 && (
                      <div className="flex flex-wrap gap-1">
                        {(['ALL', 1, 2, 3, 4] as const)
                          .filter((c) => c === 'ALL' || c <= maxRitualCircle)
                          .map((c) => (
                            <button
                              key={String(c)}
                              type="button"
                              onClick={() => setRitualCircleFilter(c)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition ${
                                ritualCircleFilter === c
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                              }`}
                            >
                              {c === 'ALL' ? 'Todos Círc.' : `${c}ºC`}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                    {filteredRituals.map((rit) => {
                      const matchingIds = chosenRitualIds.filter(
                        (id) => id === rit.id || id.startsWith(`${rit.id}:`)
                      );
                      const picked = matchingIds.length > 0;
                      const pickedElements = matchingIds
                        .map((id) => id.split(':')[1])
                        .filter(Boolean);
                      const pickedIndex = picked
                        ? chosenRitualIds.indexOf(matchingIds[0])
                        : -1;
                      return (
                        <button
                          key={rit.id}
                          type="button"
                          onClick={() => toggleRitualChoice(rit.id)}
                          className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                            picked
                              ? 'bg-purple-600/25 border-emerald-400 shadow-lg shadow-purple-950/50'
                              : 'bg-zinc-900/80 border-zinc-800 hover:border-purple-500/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="font-extrabold text-white text-xs">
                              {rit.name}
                              {pickedElements.length > 0 && ` (${pickedElements.join(', ')})`}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-xs text-zinc-400 trpg-num">{rit.metadata?.circle || 1}º círculo</span>
                              <ElementBadge element={rit.metadata?.element} />
                              {picked && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500 text-zinc-950">
                                  ✓ #{pickedIndex + 1} ESCOLHIDO
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-[10px] font-mono text-purple-300/90 mb-1">
                            Execução: {rit.metadata?.execution || 'Padrão'} • Alcance: {rit.metadata?.range || 'Curto'} • Duração: {rit.metadata?.duration || 'Instantânea'}
                          </div>
                          <p className="text-[11px] text-zinc-300 leading-relaxed">
                            {rit.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && system === 'tormenta20' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {T20_CLASSES.map((cls) => (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => setT20ClassId(cls.id)}
                  className={`p-4 rounded-xl border text-left ${
                    t20ClassId === cls.id
                      ? 'bg-amber-600/15 border-amber-500'
                      : 'bg-zinc-950 border-zinc-800'
                  }`}
                >
                  <div className="font-black text-white text-sm">{cls.name}</div>
                  <p className="text-xs text-zinc-400 mt-1">{cls.description}</p>
                  <div className="text-[11px] text-amber-300 mt-2">
                    PV Inicial: {cls.basePv} + CON | PM: {cls.pmPerLevel}/nível
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ============================================================== */}
          {/* PASSO 4: PERÍCIAS TREINADAS E EQUIPAMENTO DE RECRUTA           */}
          {/* ============================================================== */}
          {step === 4 && system === 'ordem-paranormal' && (
            <div className="space-y-6">
              {/* Escolhas de Classe (Combatente) */}
              {ordemClassId === 'combatente' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <div>
                    <label className="block text-xs font-bold uppercase text-amber-400 mb-2">
                      <Icon name="swords" /> Perícia de Combate (Escolha 1)
                    </label>
                    <div className="flex gap-2">
                      {(['luta', 'pontaria'] as const).map((sk) => (
                        <button
                          key={sk}
                          type="button"
                          onClick={() => setCombatAttackSkill(sk)}
                          className={`flex-1 py-2 rounded-lg font-bold text-xs border ${
                            combatAttackSkill === sk
                              ? 'bg-amber-600 text-white border-amber-400'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {sk === 'luta' ? 'Luta (FOR)' : 'Pontaria (AGI)'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-amber-400 mb-2">
                      <Icon name="shield" /> Perícia de Resistência (Escolha 1)
                    </label>
                    <div className="flex gap-2">
                      {(['fortitude', 'reflexos'] as const).map((sk) => (
                        <button
                          key={sk}
                          type="button"
                          onClick={() => setCombatDefenseSkill(sk)}
                          className={`flex-1 py-2 rounded-lg font-bold text-xs border ${
                            combatDefenseSkill === sk
                              ? 'bg-amber-600 text-white border-amber-400'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {sk === 'fortitude' ? 'Fortitude (VIG)' : 'Reflexos (AGI)'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Seleção de Perícias Livres */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-100">
                      <Icon name="target" /> Perícias Livres da Classe + Intelecto (
                      {
                        ordemFreeSkills.filter((id) => !lockedOrdemSkillIds.has(id))
                          .length
                      }{' '}
                      / {totalOrdemFreeSkillSlots})
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Perícias em verde já são garantidas pela sua Origem ou Classe.
                      {classOriginCollisionBonusSlots > 0 && (
                        <span className="text-amber-300 font-bold ml-1">
                          (+{classOriginCollisionBonusSlots} perícia livre extra por colisão com a Origem!)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ORDEM_SKILLS_METADATA.map((sk) => {
                    const isLocked = lockedOrdemSkillIds.has(sk.id);
                    const isPicked = ordemFreeSkills.includes(sk.id);
                    return (
                      <button
                        key={sk.id}
                        type="button"
                        disabled={isLocked}
                        onClick={() => toggleOrdemFreeSkill(sk.id)}
                        className={`p-2 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
                          isLocked
                            ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300 cursor-default'
                            : isPicked
                            ? 'bg-amber-600/25 border-amber-500 text-white font-bold'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <span>
                          {sk.name}{' '}
                          <span className="text-[10px] opacity-70 uppercase">
                            ({sk.attribute})
                          </span>
                        </span>
                        {isLocked && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-800/60 text-emerald-200">
                            Fixa
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Se for Especialista: Escolher as 2 perícias de Perito */}
              {ordemClassId === 'especialista' && (
                <div className="bg-zinc-950 p-4 rounded-xl border border-blue-500/40 space-y-2">
                  <h4 className="text-sm font-semibold text-zinc-100">
                    <Icon name="graduation" /> Habilidade Perito (Especialista): Escolha 2 perícias treinadas (exceto Luta e Pontaria) ({peritoSkills.length}/2)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {allOrdemTrainedList
                      .filter((id) => id !== 'luta' && id !== 'pontaria')
                      .map((id) => {
                        const meta = ORDEM_SKILLS_METADATA.find((m) => m.id === id);
                        const active = peritoSkills.includes(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => togglePeritoSkill(id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                              active
                                ? 'bg-blue-600 text-white border-blue-400'
                                : 'bg-zinc-900 text-zinc-300 border-zinc-700'
                            }`}
                          >
                            {meta?.name || id}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Graus de Treinamento Avançados (NEX >= 35% Veterano +10 / NEX >= 70% Expert +15) */}
              {ordemNex >= 35 && ordemClassId !== 'mundano' && (
                <div className="bg-zinc-950 p-4 rounded-xl border border-indigo-500/40 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-100">
                        <Icon name="award" /> Graus de Treinamento (Veterano +10{ordemNex >= 70 ? ' / Expert +15' : ''})
                      </h4>
                      <p className="text-xs text-zinc-400 max-w-[60ch]">
                        {(() => {
                          const per = selectedOrdemClass.trainingUpgradeBase + Math.max(0, ordemAttrs.int);
                          return ordemNex >= 70
                            ? `Em NEX 35% e de novo em NEX 70%, ${per} perícias treinadas sobem um grau. Cada degrau conta como uma promoção: de +5 para +10 é uma, de +10 para +15 é outra. Até ${per} perícias podem chegar a Expert.`
                            : `Em NEX 35%, ${per} perícias treinadas sobem de Treinado (+5) para Veterano (+10).`;
                        })()}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-indigo-200 trpg-num">
                      Promoções:{' '}
                      {allOrdemTrainedList.reduce(
                        (acc, skId) => acc + (((upgradedSkillDegrees[skId] as 5 | 10 | 15 | undefined) ?? 5) - 5) / 5,
                        0
                      )}{' '}
                      / {(selectedOrdemClass.trainingUpgradeBase + Math.max(0, ordemAttrs.int)) * (ordemNex >= 70 ? 2 : 1)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allOrdemTrainedList.map((id) => {
                      const meta = ORDEM_SKILLS_METADATA.find((m) => m.id === id);
                      const deg: 5 | 10 | 15 =
                        (upgradedSkillDegrees[id] as 5 | 10 | 15 | undefined) ?? 5;
                      // Grau de Treinamento: (base da classe + INT) perícias sobem UM grau em NEX 35% e de novo em NEX 70%.
                      const perMilestone = selectedOrdemClass.trainingUpgradeBase + Math.max(0, ordemAttrs.int);
                      const totalPromotions = perMilestone * (ordemNex >= 70 ? 2 : 1);
                      const degOf = (skId: string) =>
                        ((upgradedSkillDegrees[skId] as 5 | 10 | 15 | undefined) ?? 5);
                      const usedPromotions = allOrdemTrainedList.reduce((acc, skId) => acc + (degOf(skId) - 5) / 5, 0);
                      const expertCount = allOrdemTrainedList.filter((skId) => degOf(skId) === 15).length;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            const curr = deg;
                            const nextDeg: 5 | 10 | 15 =
                              curr === 5 ? 10 : curr === 10 && ordemNex >= 70 ? 15 : 5;
                            const isPromotion = nextDeg > curr;
                            if (isPromotion && usedPromotions + 1 > totalPromotions) {
                              showWizardNotice(
                                `Você já usou as ${totalPromotions} promoções de grau. Clique numa perícia promovida para desfazer e redistribuir.`
                              );
                              return;
                            }
                            if (nextDeg === 15 && expertCount + 1 > perMilestone) {
                              showWizardNotice(
                                `No máximo ${perMilestone} perícias podem chegar a Expert (+15): cada marco de NEX sobe uma perícia só um grau.`
                              );
                              return;
                            }
                            setUpgradedSkillDegrees((prev) => {
                              const copy = { ...prev };
                              if (nextDeg === 5) delete copy[id];
                              else copy[id] = nextDeg;
                              return copy;
                            });
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
                            deg === 15
                              ? 'bg-purple-600 text-white border-purple-400'
                              : deg === 10
                              ? 'bg-indigo-600 text-white border-indigo-400'
                              : 'bg-zinc-900 text-zinc-300 border-zinc-700'
                          }`}
                        >
                          {meta?.name || id} (+{deg})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Arsenal & Equipamento Inicial conforme Patente Selecionada */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-100">
                      <Icon name="backpack" /> Arsenal & Equipamento Inicial (Patente {ordemPatent} — Ordem Alfabética)
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Limites da patente <strong>{ordemPatent}</strong>: itens de{' '}
                      <strong>Categoria 0</strong> são livres.
                      {allowsCursedSpecial && (
                        <span className="text-purple-300 font-semibold ml-1">
                          Itens Amaldiçoados Especiais (Cat. II+) desbloqueados!
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {([1, 2, 3, 4] as const)
                      .filter((c) => patentCategoryLimits[c] > 0)
                      .map((c) => {
                        const roman = ['', 'I', 'II', 'III', 'IV'][c];
                        const used = selectedCatCounts[c];
                        const lim = patentCategoryLimits[c];
                        return (
                          <span
                            key={c}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
                              used >= lim
                                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                                : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                            }`}
                          >
                            Cat. {roman}: {used}/{lim}
                          </span>
                        );
                      })}
                  </div>
                </div>

                {/* Separação em 2 Abas: Equipamentos Normais vs Paranormais */}
                <ContentSourceFilterBar
                  system="ordem-paranormal"
                  allowedSources={allowedSources}
                  selectedSources={itemSourceFilter}
                  onChange={setItemSourceFilter}
                />
                <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 gap-1">
                  <button
                    type="button"
                    onClick={() => setItemRealmTab('normal')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                      itemRealmTab === 'normal'
                        ? 'bg-amber-600 text-white shadow'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Icon name="backpack" /> Equipamentos Normais
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemRealmTab('paranormal')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                      itemRealmTab === 'paranormal'
                        ? 'bg-purple-700 text-white shadow'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Icon name="conhecimento" /> Equipamentos Paranormais
                  </button>
                </div>

                {itemRealmTab === 'paranormal' && !allowsCursedSpecial && (
                  <p className="text-[11px] text-purple-300/90 bg-purple-950/30 border border-purple-800/50 rounded-lg px-3 py-1.5">
                    <Icon name="conhecimento" /> Na patente <strong>{ordemPatent}</strong>, itens amaldiçoados especiais (Cat. II+) só são liberados a partir de <strong>Agente Especial</strong> (p. 144).
                  </p>
                )}

                {/* Barra de Pesquisa e Filtro de Categoria */}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="Pesquisar arma, proteção, munição ou equipamento..."
                    className="flex-1 min-w-[220px] px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1">
                    {[
                      { val: 'ALL' as const, label: 'Todos' },
                      { val: 0 as const, label: 'Cat. 0 (Livre)' },
                      ...(
                        [
                          { val: 1 as const, label: 'Cat. I' },
                          { val: 2 as const, label: 'Cat. II' },
                          { val: 3 as const, label: 'Cat. III' },
                          { val: 4 as const, label: 'Cat. IV' },
                        ] as const
                      ).filter((c) => c.val <= maxAllowedItemCategory),
                    ].map((f) => (
                      <button
                        key={String(f.val)}
                        type="button"
                        onClick={() => setItemCategoryFilter(f.val)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                          itemCategoryFilter === f.val
                            ? 'bg-amber-600 text-white'
                            : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {filteredRecruitItems.map((item) => {
                    const rawCat = item.metadata?.categoryLevel ?? item.cost ?? 0;
                    const cat = getEffectiveRecruitItemCat(item);
                    const isEngFav =
                      selectedOrdemOrigin.id === 'engenheiro' &&
                      !item.metadata?.damageFormula &&
                      item.id === engenheiroFavItemId;
                    const qty = chosenItemQuantities[item.id] || 0;
                    const picked = qty > 0;
                    const nextUnitCat =
                      isEngFav && qty === 0 ? Math.max(0, rawCat - 1) : rawCat;
                    const canAddMore =
                      nextUnitCat === 0 ||
                      (nextUnitCat >= 1 &&
                        nextUnitCat <= 4 &&
                        selectedCatCounts[nextUnitCat as 1 | 2 | 3 | 4] <
                          patentCategoryLimits[nextUnitCat as 1 | 2 | 3 | 4]);
                    const catRoman = ['0', 'I', 'II', 'III', 'IV'];

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                          picked
                            ? 'bg-amber-600/15 border-amber-500 shadow'
                            : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold text-white text-xs flex items-center gap-1.5 flex-wrap">
                              {item.name}
                              <SourceTagBadge
                                sourceId={resolveEntrySourceId(item, 'ordem-paranormal')}
                                system="ordem-paranormal"
                              />
                            </span>
                            <span
                              className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ${
                                cat === 0
                                  ? 'bg-emerald-950 text-emerald-300'
                                  : 'bg-amber-950 text-amber-300'
                              }`}
                            >
                              Cat. {catRoman[cat] || cat}
                              {isEngFav ? ` (era ${catRoman[rawCat] || rawCat})` : ''} • {item.metadata?.slots ?? 1} esp.
                            </span>
                          </div>
                          {isEngFav && (
                            <span className="inline-block mb-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                              <Icon name="wrench" /> Ferramenta Favorita (-1 Cat.)
                            </span>
                          )}
                          <p className="text-[11px] text-zinc-400 line-clamp-2">
                            {item.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                          <span className="text-[10px] font-mono text-zinc-400">
                            {qty > 0 ? `Na mochila: ${qty}x` : 'Não selecionado'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={qty <= 0}
                              onClick={() => changeRecruitItemQty(item.id, -1)}
                              className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-white font-black text-xs cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-mono text-xs font-extrabold text-amber-400">
                              {qty}
                            </span>
                            <button
                              type="button"
                              disabled={!canAddMore}
                              onClick={() => changeRecruitItemQty(item.id, 1)}
                              className="w-7 h-7 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-white font-black text-xs cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 4 && system === 'tormenta20' && (
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
              <h4 className="text-sm font-semibold text-zinc-100">
                Perícias Treinadas (Tormenta 20)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {createDefaultT20Sheet().sheetData.skills.map((sk) => {
                  const isFixed = selectedT20Class.fixedSkills.includes(sk.id);
                  const isPicked = t20FreeSkills.includes(sk.id);
                  return (
                    <button
                      key={sk.id}
                      type="button"
                      disabled={isFixed}
                      onClick={() =>
                        setT20FreeSkills((prev) =>
                          prev.includes(sk.id)
                            ? prev.filter((i) => i !== sk.id)
                            : [...prev, sk.id]
                        )
                      }
                      className={`p-2 rounded-lg border text-left text-xs ${
                        isFixed
                          ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300'
                          : isPicked
                          ? 'bg-amber-600/25 border-amber-500 text-white font-bold'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      {sk.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {wizardNotice && (
          <div className="relative">
            <div
              role="status"
              aria-live="polite"
              className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[min(92%,30rem)] rounded-lg border border-orange-700 bg-zinc-900 px-4 py-3 text-sm text-orange-100 shadow-2xl flex items-start gap-2"
            >
              <Icon name="warning" size={16} className="mt-0.5 shrink-0 text-orange-300" />
              {wizardNotice}
            </div>
          </div>
        )}

        {/* Rodapé de Navegação */}
        <div className="px-5 sm:px-6 py-3 bg-zinc-950/40 border-t border-zinc-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => (step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3 | 4) : onClose())}
            className="trpg-btn-quiet"
          >
            {step > 1 && <Icon name="arrow-left" size={16} />}
            {step > 1 ? 'Voltar' : 'Cancelar'}
          </button>

          <div className="flex items-center gap-3">
            {step < 4 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && !name.trim()) {
                    setErrorMsg('Preencha o nome do personagem antes de avançar.');
                    return;
                  }
                  if (
                    step === 3 &&
                    system === 'ordem-paranormal' &&
                    ordemClassId === 'ocultista' &&
                    chosenRitualIds.length < 3
                  ) {
                    setErrorMsg(
                      `Como Ocultista, selecione seus 3 Rituais iniciais de 1º Círculo antes de avançar (${chosenRitualIds.length}/3 selecionados).`
                    );
                    return;
                  }
                  setErrorMsg('');
                  setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
                }}
                className="trpg-btn-primary"
              >
                Continuar
                <Icon name="arrow-left" size={16} className="rotate-180" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleFinish}
                className="trpg-btn-primary"
              >
                <Icon name="check" size={16} />
                {isSaving ? 'Criando…' : 'Criar personagem'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

