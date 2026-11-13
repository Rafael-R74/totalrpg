import { useState, useMemo } from 'react';
import {
  SystemId,
  OrdemAttributes,
  T20Attributes,
  ORDEM_ORIGINS,
  ORDEM_CLASSES,
  ORDEM_SKILLS_METADATA,
  ORDEM_COMPENDIUM_ENTRIES,
  T20_RACES,
  T20_CLASSES,
  T20_ORIGINS,
  T20_DEITIES,
  buildOrdemCharacter,
  buildT20Character,
  calculateOrdemBaseVitals,
  createDefaultT20Sheet,
} from '@totalrpg/shared';
import { CharacterData, createCharacter } from '../services/api';
import { ImageUploadField } from './ImageUploadField';

interface CharacterWizardModalProps {
  lockedSystem?: SystemId;
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
  onClose,
  onCreated,
}: CharacterWizardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [name, setName] = useState('');
  const [portraitUrl, setPortraitUrl] = useState('');
  const [system, setSystem] = useState<SystemId>(lockedSystem || 'ordem-paranormal');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // --- Estados Ordem Paranormal v1.3 ---
  const [originSearch, setOriginSearch] = useState('');
  const [ordemOriginId, setOrdemOriginId] = useState<string>('academico');
  const [amnesicoSkills, setAmnesicoSkills] = useState<string[]>(['percepcao', 'vontade']);
  const [cultistaPowerId, setCultistaPowerId] = useState<string>('ord-para-sang-sangue-ferro');

  const [ordemClassId, setOrdemClassId] = useState<
    'combatente' | 'especialista' | 'ocultista' | 'mundano'
  >('combatente');
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
  const [peritoSkills, setPeritoSkills] = useState<string[]>([]);
  const [chosenRitualIds, setChosenRitualIds] = useState<string[]>([]);
  const [ritualSearch, setRitualSearch] = useState<string>('');
  const [ritualElementFilter, setRitualElementFilter] = useState<string>('ALL');

  const [itemSearch, setItemSearch] = useState<string>('');
  const [itemCategoryFilter, setItemCategoryFilter] = useState<'ALL' | 0 | 1>('ALL');
  const [chosenItemQuantities, setChosenItemQuantities] = useState<Record<string, number>>({});

  // --- Estados Tormenta 20 ---
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
    return selectedOrdemOrigin.skills;
  }, [selectedOrdemOrigin, amnesicoSkills]);

  // Pontos de atributo Ordem: começa tudo em 1 (soma 5). +4 pontos (total 9) ou +3 para Mundano (total 8)
  const targetOrdemAttrSum = 5 + selectedOrdemClass.attributePoints;
  const currentOrdemAttrSum =
    ordemAttrs.agi +
    ordemAttrs.for +
    ordemAttrs.int +
    ordemAttrs.pre +
    ordemAttrs.vig;
  const remainingOrdemAttrPoints = targetOrdemAttrSum - currentOrdemAttrSum;
  const zeroAttrsCount = Object.values(ordemAttrs).filter((v) => v === 0).length;

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
      nex: selectedOrdemClass.initialNex,
      originIdOrName: selectedOrdemOrigin.id,
      transcendedCount: 0,
    });
    const extraPv = selectedOrdemOrigin.id === 'desgarrado' ? 1 : 0;
    const extraSan = selectedOrdemOrigin.id === 'vitima' ? 1 : 0;
    return {
      pv: base.pvMax + extraPv,
      pe: base.peMax,
      san: base.sanMax + extraSan,
      defense: 10 + ordemAttrs.agi,
      maxSlots: ordemAttrs.for <= 0 ? 2 : ordemAttrs.for * 5,
    };
  }, [ordemClassId, ordemAttrs, selectedOrdemClass, selectedOrdemOrigin]);

  // Listas do Compêndio para o Wizard
  const firstCircleRituals = useMemo(
    () =>
      ORDEM_COMPENDIUM_ENTRIES.filter(
        (e) => e.category === 'spell' && (e.metadata?.circle || 1) === 1
      ).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    []
  );

  const initialParanormalPowers = useMemo(
    () =>
      ORDEM_COMPENDIUM_ENTRIES.filter(
        (e) =>
          e.category === 'paranormal_power' &&
          !e.metadata?.requirements?.match(/\b(Sangue|Morte|Conhecimento|Energia)\s*[12]/i)
      ).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    []
  );

  const recruitItems = useMemo(
    () =>
      ORDEM_COMPENDIUM_ENTRIES.filter(
        (e) =>
          e.category === 'item' &&
          (e.metadata?.categoryLevel ?? e.cost ?? 0) <= 1
      ).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    []
  );

  const selectedCat1Count = useMemo(() => {
    return Object.entries(chosenItemQuantities).reduce((acc, [id, qty]) => {
      if (qty <= 0) return acc;
      const entry = recruitItems.find((e) => e.id === id);
      const cat = entry?.metadata?.categoryLevel ?? entry?.cost ?? 0;
      return cat === 1 ? acc + qty : acc;
    }, 0);
  }, [chosenItemQuantities, recruitItems]);

  const filteredRecruitItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    return recruitItems.filter((item) => {
      const cat = item.metadata?.categoryLevel ?? item.cost ?? 0;
      if (itemCategoryFilter !== 'ALL' && cat !== itemCategoryFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });
  }, [recruitItems, itemSearch, itemCategoryFilter]);

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
      if (nextVal < 0 || nextVal > 3) return prev;
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

  const toggleRitualChoice = (ritualId: string) => {
    setChosenRitualIds((prev) => {
      if (prev.includes(ritualId)) return prev.filter((id) => id !== ritualId);
      if (prev.length >= 3) {
        return [...prev.slice(1), ritualId];
      }
      return [...prev, ritualId];
    });
  };

  const changeRecruitItemQty = (itemId: string, delta: number) => {
    const entry = recruitItems.find((e) => e.id === itemId);
    if (!entry) return;
    const cat = entry.metadata?.categoryLevel ?? entry.cost ?? 0;

    setChosenItemQuantities((prev) => {
      const currentQty = prev[itemId] || 0;
      const nextQty = Math.max(0, currentQty + delta);
      if (delta > 0 && cat === 1 && selectedCat1Count >= 2) {
        return prev;
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
    if (!q) return ORDEM_ORIGINS;
    return ORDEM_ORIGINS.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.powerName.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q)
    );
  }, [originSearch]);

  const filteredRituals = useMemo(() => {
    const q = ritualSearch.trim().toLowerCase();
    return firstCircleRituals.filter((r) => {
      const el = (r.metadata?.element || '').toLowerCase();
      if (
        ritualElementFilter !== 'ALL' &&
        !el.includes(ritualElementFilter.toLowerCase())
      ) {
        return false;
      }
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
      );
    });
  }, [firstCircleRituals, ritualElementFilter, ritualSearch]);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Cabeçalho do Assistente */}
        <div className="px-6 py-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
              🎲 Assistente Guiado de Criação • Passo {step} de 4
            </span>
            <h2 className="text-xl font-black text-white">
              {step === 1 && '1. Identidade & Origem'}
              {step === 2 && '2. Distribuição de Atributos'}
              {step === 3 && '3. Classe, PV/PE/SAN & Rituais Iniciais'}
              {step === 4 && '4. Treinamento de Perícias & Equipamento de Recruta'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-sm font-bold px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700"
          >
            ✕ Fechar
          </button>
        </div>

        {/* Barra de Progresso */}
        <div className="grid grid-cols-4 bg-zinc-950/60 border-b border-zinc-800 text-xs font-bold">
          {[
            { n: 1, label: '1. Origem & Conceito' },
            { n: 2, label: '2. Atributos' },
            { n: 3, label: '3. Classe & Poderes' },
            { n: 4, label: '4. Perícias & Arsenal' },
          ].map((item) => (
            <button
              key={item.n}
              type="button"
              onClick={() => setStep(item.n as 1 | 2 | 3 | 4)}
              className={`py-2.5 text-center border-b-2 transition-colors ${
                step === item.n
                  ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                  : step > item.n
                  ? 'border-emerald-600 text-emerald-400'
                  : 'border-transparent text-zinc-500'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Corpo Rolável */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-700 text-red-200 text-xs font-bold">
              ⚠️ {errorMsg}
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
                    <option value="ordem-paranormal">🔍 Ordem Paranormal RPG (v1.3)</option>
                    <option value="tormenta20">⚔️ Tormenta 20 (Jogo do Ano)</option>
                    <option value="duna">🏜️ Duna (2d20)</option>
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
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-amber-400">
                        📜 Escolha sua Origem (26 Origens Oficiais v1.3)
                      </h3>
                      <p className="text-xs text-zinc-400">
                        O que seu personagem fazia antes de conhecer a Ordo Realitas? Concede 2 perícias treinadas e 1 poder exclusivo.
                      </p>
                    </div>
                    <input
                      type="text"
                      value={originSearch}
                      onChange={(e) => setOriginSearch(e.target.value)}
                      placeholder="🔎 Filtrar origem ou poder..."
                      className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white"
                    />
                  </div>

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
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-black text-white text-sm">
                              {orig.name}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-amber-300">
                              ✨ {orig.powerName}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 line-clamp-2 mb-2">
                            {orig.description}
                          </p>
                          <div className="text-[10px] font-bold text-emerald-400">
                            🎯 Perícias:{' '}
                            {orig.skills.length > 0
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
                          🧠 Amnésico: Escolha as 2 perícias treinadas pelo seu passado ({amnesicoSkills.length}/2):
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
                          👁️ Vestígios do Outro Lado: Escolha seu 1º Poder Paranormal gratuito (você começa com metade da Sanidade normal da classe):
                        </p>
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
                  <h3 className="text-sm font-black uppercase text-amber-400">
                    ⚡ Distribuição de Atributos (Ordem Paranormal v1.3, p. 15)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Todos os atributos começam em <strong>1</strong>. Você recebe{' '}
                    <strong>+{selectedOrdemClass.attributePoints} pontos</strong> para distribuir (valor máximo inicial <strong>3</strong>). Você pode reduzir no máximo 1 atributo para 0 para receber +1 ponto extra.
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
                        {val <= 0 ? '🎲 2d20 (menor)' : `🎲 ${val}d20 (maior)`}
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
                  <h3 className="text-sm font-black uppercase text-amber-400">
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {ORDEM_CLASSES.map((cls) => {
                  const active = cls.id === ordemClassId;
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => setOrdemClassId(cls.id)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        active
                          ? 'bg-amber-600/15 border-amber-500 shadow-lg'
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-black text-white text-base">
                          {cls.name}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-amber-300">
                          NEX {cls.initialNex}%
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-200/80 font-semibold mb-2">
                        {cls.subtitle}
                      </p>
                      <p className="text-xs text-zinc-400 mb-3">{cls.description}</p>
                      <div className="text-[10px] text-zinc-300 space-y-0.5 border-t border-zinc-800 pt-2">
                        <div>❤️ PV Inicial: {cls.basePv} + VIG (+{cls.pvPerNex}/NEX)</div>
                        <div>⚡ PE Inicial: {cls.basePe} + PRE (+{cls.pePerNex}/NEX)</div>
                        <div>🧠 SAN Inicial: {cls.baseSan} (+{cls.sanPerNex}/NEX)</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Resumo Matemático Calculado em Tempo Real */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <div className="text-center">
                  <span className="text-[10px] font-bold uppercase text-red-400">
                    ❤️ PV Inicial
                  </span>
                  <div className="text-2xl font-black text-white">
                    {ordemVitalsPreview.pv}
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-bold uppercase text-amber-400">
                    ⚡ PE Inicial
                  </span>
                  <div className="text-2xl font-black text-white">
                    {ordemVitalsPreview.pe}
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-bold uppercase text-blue-400">
                    🧠 SAN Inicial
                  </span>
                  <div className="text-2xl font-black text-white">
                    {ordemVitalsPreview.san}
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-bold uppercase text-emerald-400">
                    🛡️ Defesa Base
                  </span>
                  <div className="text-2xl font-black text-white">
                    {ordemVitalsPreview.defense}
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-bold uppercase text-zinc-400">
                    🎒 Carga Máxima
                  </span>
                  <div className="text-2xl font-black text-white">
                    {ordemVitalsPreview.maxSlots} esp.
                  </div>
                </div>
              </div>

              {/* Habilidades Iniciais da Classe */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <h4 className="text-xs font-black uppercase text-amber-400">
                  ✨ Habilidades Iniciais de {selectedOrdemClass.name} & Proficiências
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

              {/* Se for Ocultista: Escolher os 3 Rituais de 1º Círculo Iniciais */}
              {ordemClassId === 'ocultista' && (
                <div className="p-4 rounded-xl bg-zinc-950 border-2 border-purple-500/60 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black uppercase text-purple-300">
                        🔮 Escolhido pelo Outro Lado: Selecione seus 3 Rituais de 1º Círculo ({chosenRitualIds.length}/3)
                      </h4>
                      <p className="text-xs text-zinc-400">
                        Clique em até 3 rituais abaixo. Os rituais selecionados aparecem destacados em roxo/verde e no painel de escolhidos!
                      </p>
                    </div>
                    <input
                      type="text"
                      value={ritualSearch}
                      onChange={(e) => setRitualSearch(e.target.value)}
                      placeholder="🔎 Pesquisar ritual por nome ou efeito..."
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
                    />
                  </div>

                  {/* Barra Visual dos Rituais Selecionados */}
                  <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-700/60 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black uppercase text-purple-300">
                      Rituais Escolhidos ({chosenRitualIds.length}/3):
                    </span>
                    {chosenRitualIds.length === 0 ? (
                      <span className="text-xs text-zinc-400 italic">
                        Nenhum ritual selecionado ainda. Clique nos cards abaixo para escolher 3 rituais!
                      </span>
                    ) : (
                      chosenRitualIds.map((rId, idx) => {
                        const rObj = firstCircleRituals.find((r) => r.id === rId);
                        if (!rObj) return null;
                        return (
                          <span
                            key={rId}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-extrabold shadow"
                          >
                            <span>
                              {idx + 1}. {rObj.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleRitualChoice(rId)}
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

                  <div className="flex flex-wrap gap-1.5">
                    {['ALL', 'Sangue', 'Morte', 'Conhecimento', 'Energia'].map((el) => (
                      <button
                        key={el}
                        type="button"
                        onClick={() => setRitualElementFilter(el)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition ${
                          ritualElementFilter === el
                            ? 'bg-purple-600 text-white shadow'
                            : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                      >
                        {el === 'ALL' ? 'Todos os Elementos' : el}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                    {filteredRituals.map((rit) => {
                      const picked = chosenRitualIds.includes(rit.id);
                      const pickedIndex = chosenRitualIds.indexOf(rit.id);
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
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-purple-300">
                                {rit.metadata?.element}
                              </span>
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
                      ⚔️ Perícia de Combate (Escolha 1)
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
                          {sk === 'luta' ? '🥊 Luta (FOR)' : '🎯 Pontaria (AGI)'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-amber-400 mb-2">
                      🛡️ Perícia de Resistência (Escolha 1)
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
                          {sk === 'fortitude' ? '💪 Fortitude (VIG)' : '⚡ Reflexos (AGI)'}
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
                    <h4 className="text-sm font-black uppercase text-amber-400">
                      🎯 Perícias Livres da Classe + Intelecto (
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
                  <h4 className="text-xs font-black uppercase text-blue-400">
                    🎓 Habilidade Perito (Especialista): Escolha 2 perícias treinadas (exceto Luta e Pontaria) ({peritoSkills.length}/2)
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

              {/* Equipamento Inicial de Recruta (Patente Recruta: 2 itens Cat I, Cat 0 livre, Ordem Alfabética, Busca e Quantidade) */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-black uppercase text-amber-400">
                      🎒 Arsenal & Equipamento Inicial (Patente Recruta — Ordem Alfabética)
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Como <strong>Recruta</strong>, você tem direito a até <strong>2 itens de Categoria I</strong> e itens de <strong>Categoria 0</strong> à vontade (inclusive múltiplas unidades do mesmo item, como munições!).
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-black border ${
                      selectedCat1Count >= 2
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                    }`}
                  >
                    Categoria I usada: {selectedCat1Count} / 2
                  </span>
                </div>

                {/* Barra de Pesquisa e Filtro de Categoria */}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="🔎 Pesquisar arma, proteção, munição ou equipamento..."
                    className="flex-1 min-w-[220px] px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                  <div className="flex gap-1">
                    {[
                      { val: 'ALL' as const, label: 'Todos' },
                      { val: 0 as const, label: 'Cat. 0 (Livre)' },
                      { val: 1 as const, label: 'Cat. I (Máx. 2)' },
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
                    const cat = item.metadata?.categoryLevel ?? item.cost ?? 0;
                    const qty = chosenItemQuantities[item.id] || 0;
                    const picked = qty > 0;
                    const canAddMore = cat === 0 || selectedCat1Count < 2;

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
                            <span className="font-bold text-white text-xs">
                              {item.name}
                            </span>
                            <span
                              className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ${
                                cat === 0
                                  ? 'bg-emerald-950 text-emerald-300'
                                  : 'bg-amber-950 text-amber-300'
                              }`}
                            >
                              Cat. {cat === 0 ? '0' : 'I'} • {item.metadata?.slots ?? 1} esp.
                            </span>
                          </div>
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
              <h4 className="text-sm font-black uppercase text-amber-400">
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

        {/* Rodapé de Navegação */}
        <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => (step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3 | 4) : onClose())}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold"
          >
            {step > 1 ? '← Voltar' : 'Cancelar'}
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
                className="px-6 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-black uppercase tracking-wider"
              >
                Avançar para o Passo {step + 1} →
              </button>
            ) : (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleFinish}
                className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider shadow-lg"
              >
                {isSaving ? 'Criando Agente...' : '✅ Concluir e Criar Personagem'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

