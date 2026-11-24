import { useMemo, useState } from 'react';
import { ImageUploadField } from '../ImageUploadField';
import {
  SystemId,
  CampaignThreat,
  ThreatSkill,
  PreparedAttack,
  CompendiumEntryData,
  MonitorProjection,
  ORDEM_BESTIARY_THREATS,
  OrdemBestiaryGroup,
  OrdemBestiaryTemplate,
  ThreatActionType,
  ThreatSpecialAbility,
  instantiateCampaignThreatFromTemplate,
} from '@totalrpg/shared';

import { Icon } from '../ui/Icon';
interface BestiaryManagerProps {
  system: SystemId;
  threats: CampaignThreat[];
  compendiumEntries: CompendiumEntryData[];
  isSecretRoll: boolean;
  partyTotalNex?: number;
  activeProjectionId?: string | null;
  onUpdateThreats: (next: CampaignThreat[]) => void;
  onToggleProjection: (projection: MonitorProjection) => void;
  onRollDice: (
    characterName: string,
    system: SystemId,
    label: string,
    count: number,
    sides: number,
    modifier: number,
    isSecret?: boolean,
    isInitiativeRoll?: boolean,
    characterId?: string,
    extraDice?: Array<{ count: number; sides: number; label: string }>
  ) => void;
  onSendThreatToCombatManual: (threat: CampaignThreat, manualInitiative: number) => void;
  onSendThreatBatchToCombat: (
    threat: CampaignThreat,
    count: number,
    mode: 'roll' | 'manual',
    manualInit?: number
  ) => void;
}

function parseFormula(formula: string): { count: number; sides: number; modifier: number } {
  const clean = formula.toLowerCase().replace(/\s+/g, '');
  const match = clean.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) return { count: 1, sides: 6, modifier: 0 };
  return {
    count: parseInt(match[1], 10),
    sides: parseInt(match[2], 10),
    modifier: match[3] ? parseInt(match[3], 10) : 0,
  };
}

function formatD20Pool(diceCount: number, bonus: number): string {
  const modStr = bonus > 0 ? `+${bonus}` : bonus < 0 ? `${bonus}` : '';
  if (diceCount <= 0) {
    return `${2 + Math.abs(diceCount)}d20 (menor)${modStr}`;
  }
  return `${diceCount}d20${modStr}`;
}

const ELEMENT_BADGE_STYLES: Record<string, string> = {
  Sangue: 'bg-red-950/80 text-red-300 border-red-700/70',
  Morte: 'bg-zinc-900 text-zinc-200 border-zinc-600',
  Conhecimento: 'bg-amber-950/80 text-amber-300 border-amber-600/70',
  Energia: 'bg-purple-950/80 text-purple-300 border-purple-600/70',
  Medo: 'bg-cyan-950/80 text-cyan-200 border-cyan-600/70',
  Realidade: 'bg-slate-900 text-slate-300 border-slate-700',
};

const ACTION_BADGE_STYLES: Record<ThreatActionType, string> = {
  Passiva: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  Livre: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
  Movimento: 'bg-sky-950/80 text-sky-300 border-sky-700/60',
  Padrão: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
  Reação: 'bg-purple-950/80 text-purple-300 border-purple-700/60',
  Completa: 'bg-rose-950/80 text-rose-300 border-rose-700/60',
};

function getEncounterDifficultyBadge(
  vd: number | undefined,
  partyTotalNex: number | undefined
): { label: string; className: string } | null {
  if (!vd || !partyTotalNex || partyTotalNex <= 0) return null;
  const diff = vd - partyTotalNex;
  if (vd <= partyTotalNex * 0.65 || diff <= -30) {
    return {
      label: 'Encontro Fácil',
      className: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60',
    };
  }
  if (Math.abs(diff) <= 25) {
    return {
      label: 'Equilibrado',
      className: 'bg-sky-950/70 text-sky-300 border-sky-700/60',
    };
  }
  if (diff <= 80) {
    return {
      label: 'Difícil',
      className: 'bg-amber-950/70 text-amber-300 border-amber-700/60',
    };
  }
  return {
    label: 'Extremo / Chefe',
    className: 'bg-red-950/80 text-red-200 border-red-600/80',
  };
}

export function BestiaryManager({
  system,
  threats,
  compendiumEntries,
  isSecretRoll,
  partyTotalNex = 0,
  activeProjectionId,
  onUpdateThreats,
  onToggleProjection,
  onRollDice,
  onSendThreatToCombatManual,
  onSendThreatBatchToCombat,
}: BestiaryManagerProps) {
  const isOrdem = system === 'ordem-paranormal';

  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'custom'>(
    isOrdem && threats.length === 0 ? 'catalog' : isOrdem ? 'catalog' : 'custom'
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingThreatId, setEditingThreatId] = useState<string | null>(null);

  // Filtros do Catálogo Oficial (Cap. 7)
  const [catalogSearch, setCatalogSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<'ALL' | OrdemBestiaryGroup>('ALL');
  const [realitySubFilter, setRealitySubFilter] = useState<string>('ALL');
  const [vdRangeFilter, setVdRangeFilter] = useState<
    'ALL' | '10-40' | '60-140' | '160-280' | '300-380' | '400+'
  >('ALL');
  const [catalogSort, setCatalogSort] = useState<'vd-asc' | 'vd-desc' | 'name-asc'>('vd-asc');
  const [expandedCatalogIds, setExpandedCatalogIds] = useState<Record<string, boolean>>({});
  const [catalogQtyById, setCatalogQtyById] = useState<Record<string, number>>({});
  const [savedFeedbackId, setSavedFeedbackId] = useState<string | null>(null);

  // Controles de Ameaças Salvas na Mesa
  const [manualInitInputs, setManualInitInputs] = useState<Record<string, number>>({});
  const [savedQtyById, setSavedQtyById] = useState<Record<string, number>>({});
  const [expandedSavedIds, setExpandedSavedIds] = useState<Record<string, boolean>>({});

  // Estado do Construtor / Editor de Criatura
  const defaultAttrs: Record<string, number> = isOrdem
    ? { agi: 2, for: 2, int: 1, pre: 1, vig: 2 }
    : { forca: 3, destreza: 2, constituicao: 3, inteligencia: 0, sabedoria: 1, carisma: 0 };

  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [vd, setVd] = useState<number>(40);
  const [element, setElement] = useState<string>('Sangue');
  const [creatureType, setCreatureType] = useState<string>('Criatura');
  const [size, setSize] = useState<string>('Médio');
  const [displacement, setDisplacement] = useState<string>('9m (6q)');
  const [senses, setSenses] = useState<string>('Percepção às cegas');
  const [resistances, setResistances] = useState<string>('');
  const [immunities, setImmunities] = useState<string>('');
  const [vulnerabilities, setVulnerabilities] = useState<string>('');
  const [enigmaOfFear, setEnigmaOfFear] = useState<string>('');
  const [hpMax, setHpMax] = useState(45);
  const [defense, setDefense] = useState(18);
  const [initDice, setInitDice] = useState(isOrdem ? 2 : 1);
  const [initBonus, setInitBonus] = useState(5);
  const [description, setDescription] = useState('');
  const [attributes, setAttributes] = useState<Record<string, number>>(defaultAttrs);
  const [skills, setSkills] = useState<ThreatSkill[]>([
    { id: 's1', name: 'Percepção', diceCount: 2, bonus: 5 },
    { id: 's2', name: 'Fortitude', diceCount: 2, bonus: 8 },
    { id: 's3', name: 'Reflexos', diceCount: 2, bonus: 5 },
    { id: 's4', name: 'Vontade', diceCount: 1, bonus: 5 },
  ]);
  const [attacks, setAttacks] = useState<PreparedAttack[]>([
    {
      id: 'a1',
      name: 'Mordida / Garra',
      diceCount: 2,
      attackBonus: 10,
      damageFormula: '2d6+4',
      critRange: '20/x2',
      damageType: 'Corte',
    },
  ]);
  const [specialAbilities, setSpecialAbilities] = useState<ThreatSpecialAbility[]>([]);

  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillDice, setNewSkillDice] = useState(2);
  const [newSkillBonus, setNewSkillBonus] = useState(5);

  const [newAtkName, setNewAtkName] = useState('');
  const [newAtkDice, setNewAtkDice] = useState(2);
  const [newAtkBonus, setNewAtkBonus] = useState(10);
  const [newAtkDmg, setNewAtkDmg] = useState('2d8+5');
  const [newAtkType, setNewAtkType] = useState('Corte');
  const [newAtkMulti, setNewAtkMulti] = useState('');

  const [newAbName, setNewAbName] = useState('');
  const [newAbType, setNewAbType] = useState<ThreatActionType>('Passiva');
  const [newAbDmg, setNewAbDmg] = useState('');
  const [newAbDesc, setNewAbDesc] = useState('');

  const filteredCatalog = useMemo(() => {
    if (!isOrdem) return [];
    const q = catalogSearch.trim().toLowerCase();

    return ORDEM_BESTIARY_THREATS.filter((tpl) => {
      if (groupFilter !== 'ALL' && tpl.group !== groupFilter) return false;
      if (groupFilter === 'realidade' && realitySubFilter !== 'ALL') {
        if (tpl.subGroup !== realitySubFilter) return false;
      }
      if (vdRangeFilter !== 'ALL') {
        if (vdRangeFilter === '10-40' && (tpl.vd < 10 || tpl.vd > 40)) return false;
        if (vdRangeFilter === '60-140' && (tpl.vd < 60 || tpl.vd > 140)) return false;
        if (vdRangeFilter === '160-280' && (tpl.vd < 160 || tpl.vd > 280)) return false;
        if (vdRangeFilter === '300-380' && (tpl.vd < 300 || tpl.vd > 380)) return false;
        if (vdRangeFilter === '400+' && tpl.vd < 400) return false;
      }
      if (q) {
        const haystack = [
          tpl.name,
          tpl.element,
          ...tpl.secondaryElements,
          tpl.subGroup,
          tpl.creatureType,
          tpl.size,
          tpl.resistances || '',
          tpl.immunities || '',
          tpl.vulnerabilities || '',
          ...tpl.attacks.map((a) => `${a.name} ${a.damageType || ''}`),
          ...tpl.specialAbilities.map((ab) => `${ab.name} ${ab.description}`),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (catalogSort === 'vd-asc') return a.vd - b.vd || a.name.localeCompare(b.name, 'pt-BR');
      if (catalogSort === 'vd-desc') return b.vd - a.vd || a.name.localeCompare(b.name, 'pt-BR');
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [isOrdem, catalogSearch, groupFilter, realitySubFilter, vdRangeFilter, catalogSort]);

  function handleOpenCreateNew() {
    setEditingThreatId(null);
    setName('');
    setImageUrl('');
    setVd(40);
    setElement('Sangue');
    setCreatureType('Criatura');
    setSize('Médio');
    setDisplacement('9m (6q)');
    setSenses('Percepção às cegas');
    setResistances('');
    setImmunities('');
    setVulnerabilities('');
    setEnigmaOfFear('');
    setHpMax(45);
    setDefense(18);
    setInitDice(isOrdem ? 2 : 1);
    setInitBonus(5);
    setDescription('');
    setAttributes(defaultAttrs);
    setSkills([
      { id: 's1', name: 'Percepção', diceCount: 2, bonus: 5 },
      { id: 's2', name: 'Fortitude', diceCount: 2, bonus: 8 },
      { id: 's3', name: 'Reflexos', diceCount: 2, bonus: 5 },
      { id: 's4', name: 'Vontade', diceCount: 1, bonus: 5 },
    ]);
    setAttacks([
      {
        id: 'a1',
        name: 'Mordida / Garra',
        diceCount: 2,
        attackBonus: 10,
        damageFormula: '2d6+4',
        critRange: '20/x2',
        damageType: 'Corte',
      },
    ]);
    setSpecialAbilities([]);
    setIsFormOpen(true);
  }

  function handleStartEditThreat(threat: CampaignThreat) {
    setEditingThreatId(threat.id);
    setName(threat.name);
    setImageUrl(threat.imageUrl || '');
    setVd(threat.vd ?? 20);
    setElement(threat.element || 'Sangue');
    setCreatureType(threat.creatureType || 'Criatura');
    setSize(threat.size || 'Médio');
    setDisplacement(threat.displacement || '9m (6q)');
    setSenses(threat.senses || '');
    setResistances(threat.resistances || '');
    setImmunities(threat.immunities || '');
    setVulnerabilities(threat.vulnerabilities || '');
    setEnigmaOfFear(threat.enigmaOfFear || '');
    setHpMax(threat.hpMax);
    setDefense(threat.defense);
    setInitDice(threat.initiativeDice);
    setInitBonus(threat.initiativeBonus);
    setDescription(threat.description);
    setAttributes({ ...threat.attributes });
    setSkills([...threat.skills]);
    setAttacks(
      threat.attacks.map((a) => ({
        ...a,
        extraDamage: a.extraDamage ? a.extraDamage.map((ed) => ({ ...ed })) : undefined,
      }))
    );
    setSpecialAbilities(
      threat.specialAbilities ? threat.specialAbilities.map((ab) => ({ ...ab })) : []
    );
    setActiveSubTab('custom');
    setIsFormOpen(true);
  }

  function handleSaveTemplateToCampaign(tpl: OrdemBestiaryTemplate) {
    const inst = instantiateCampaignThreatFromTemplate(tpl);
    onUpdateThreats([...threats, inst]);
    setSavedFeedbackId(tpl.id);
    setTimeout(() => {
      setSavedFeedbackId((prev) => (prev === tpl.id ? null : prev));
    }, 2200);
  }

  function handleSendTemplateToCombat(tpl: OrdemBestiaryTemplate) {
    const qty = Math.max(1, Math.min(5, catalogQtyById[tpl.id] || 1));
    const inst = instantiateCampaignThreatFromTemplate(tpl);
    onSendThreatBatchToCombat(inst, qty, 'roll');
  }

  function handleToggleEnigmaSolved(threatId: string) {
    onUpdateThreats(
      threats.map((t) =>
        t.id === threatId ? { ...t, enigmaSolved: !t.enigmaSolved } : t
      )
    );
  }

  function handleAddSkillToDraft() {
    if (!newSkillName.trim()) return;
    setSkills([
      ...skills,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: newSkillName.trim(),
        diceCount: Number(newSkillDice),
        bonus: Number(newSkillBonus) || 0,
      },
    ]);
    setNewSkillName('');
  }

  function handleAddAttackToDraft() {
    if (!newAtkName.trim()) return;
    setAttacks([
      ...attacks,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: newAtkName.trim(),
        diceCount: Number(newAtkDice) || 1,
        attackBonus: Number(newAtkBonus) || 0,
        damageFormula: newAtkDmg.trim() || '1d6',
        critRange: '20/x2',
        damageType: newAtkType.trim() || 'Físico',
        multiAttack: newAtkMulti.trim() || undefined,
      },
    ]);
    setNewAtkName('');
    setNewAtkMulti('');
  }

  function handleAddSpecialAbilityToDraft() {
    if (!newAbName.trim()) return;
    setSpecialAbilities([
      ...specialAbilities,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: newAbName.trim(),
        actionType: newAbType,
        damageFormula: newAbDmg.trim() || undefined,
        description: newAbDesc.trim() || 'Habilidade personalizada da ameaça.',
      },
    ]);
    setNewAbName('');
    setNewAbDmg('');
    setNewAbDesc('');
  }

  function handleSaveThreat(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const existing = editingThreatId ? threats.find((t) => t.id === editingThreatId) : undefined;

    const threatPayload: CampaignThreat = {
      id: editingThreatId || `threat-${Math.random().toString(36).substring(2, 9)}`,
      templateId: existing?.templateId,
      name: name.trim(),
      system,
      imageUrl: imageUrl.trim() || undefined,
      vd: isOrdem ? Math.max(0, Number(vd) || 0) : undefined,
      element: isOrdem ? element : undefined,
      secondaryElements: existing?.secondaryElements,
      subGroup: existing?.subGroup || (isOrdem ? 'Personalizada' : undefined),
      creatureType: isOrdem ? creatureType.trim() || 'Criatura' : undefined,
      size: isOrdem ? size.trim() || 'Médio' : undefined,
      senses: senses.trim() || undefined,
      displacement: displacement.trim() || undefined,
      resistances: resistances.trim() || undefined,
      immunities: immunities.trim() || undefined,
      vulnerabilities: vulnerabilities.trim() || undefined,
      enigmaOfFear: enigmaOfFear.trim() || undefined,
      enigmaSolved: existing?.enigmaSolved ?? false,
      specialAbilities,
      hpMax: Math.max(1, Number(hpMax)),
      defense: Number(defense),
      initiativeDice: Number(initDice),
      initiativeBonus: Number(initBonus),
      attributes,
      skills,
      attacks,
      description: description.trim(),
    };

    if (editingThreatId) {
      onUpdateThreats(threats.map((t) => (t.id === editingThreatId ? threatPayload : t)));
    } else {
      onUpdateThreats([...threats, threatPayload]);
    }

    setEditingThreatId(null);
    setIsFormOpen(false);
    setActiveSubTab('custom');
  }

  function handleImportAttackFromCompendium(entry: CompendiumEntryData) {
    if (!entry.metadata?.damageFormula) return;
    setAttacks([
      ...attacks,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: entry.name,
        diceCount: 2,
        attackBonus: 10,
        damageFormula: entry.metadata.damageFormula,
        critRange: entry.metadata.critRange || '20/x2',
        damageType: 'Especial',
      },
    ]);
  }

  function handleRollAttackDamage(actorName: string, atk: PreparedAttack) {
    const dmg = parseFormula(atk.damageFormula);
    const extraDice = atk.extraDamage?.map((ed) => ({
      count: ed.count,
      sides: ed.sides,
      label: ed.label,
    }));
    const extraSummary = atk.extraDamage?.length
      ? ` + ${atk.extraDamage.map((ed) => `${ed.formula} ${ed.label}`).join(' + ')}`
      : '';

    onRollDice(
      actorName,
      system,
      `Dano: ${atk.name}${atk.damageType ? ` (${atk.damageType})` : ''}${extraSummary}`,
      dmg.count,
      dmg.sides,
      dmg.modifier,
      isSecretRoll,
      false,
      undefined,
      extraDice
    );
  }

  function renderAttackRow(actorName: string, atk: PreparedAttack) {
    const extraLabel = atk.extraDamage?.length
      ? ` + ${atk.extraDamage.map((ed) => `${ed.formula} ${ed.label}`).join(' + ')}`
      : '';
    return (
      <div
        key={atk.id}
        className="bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-xl flex flex-wrap justify-between items-center gap-2"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-zinc-100">{atk.name}</span>
            {atk.multiAttack && (
              <span className="px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 text-[10px] font-mono font-bold">
                {atk.multiAttack}
              </span>
            )}
            {atk.range && (
              <span className="text-[10px] text-zinc-400 font-mono">• {atk.range}</span>
            )}
            {atk.critRange && atk.critRange !== '20/x2' && (
              <span className="text-[10px] text-amber-400/90 font-mono">
                • Crít {atk.critRange}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              onRollDice(
                actorName,
                system,
                `Acerto: ${atk.name}${atk.multiAttack ? ` (${atk.multiAttack})` : ''}`,
                atk.diceCount,
                20,
                atk.attackBonus,
                isSecretRoll
              )
            }
            className="px-2.5 py-1 bg-zinc-950 hover:bg-amber-600 text-amber-400 hover:text-white border border-zinc-700 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer"
          >
            <Icon name="target" /> {formatD20Pool(atk.diceCount, atk.attackBonus)}
          </button>
          <button
            type="button"
            onClick={() => handleRollAttackDamage(actorName, atk)}
            className="px-2.5 py-1 bg-zinc-950 hover:bg-red-700 text-red-400 hover:text-white border border-zinc-700 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer"
          >
            <Icon name="sangue" /> {atk.damageFormula}
            {atk.damageType ? ` ${atk.damageType}` : ''}
            {extraLabel}
          </button>
        </div>
      </div>
    );
  }

  function renderSpecialAbilityCard(actorName: string, ab: ThreatSpecialAbility) {
    const parsedDmg = ab.damageFormula ? parseFormula(ab.damageFormula) : null;
    return (
      <div
        key={ab.id}
        className="bg-zinc-900/70 border border-zinc-800/90 rounded-xl p-2.5 flex flex-col gap-1.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                ACTION_BADGE_STYLES[ab.actionType] || ACTION_BADGE_STYLES.Passiva
              }`}
            >
              {ab.actionType}
            </span>
            <strong className="text-xs font-bold text-white">{ab.name}</strong>
          </div>

          {ab.damageFormula && parsedDmg && (
            <button
              type="button"
              onClick={() =>
                onRollDice(
                  actorName,
                  system,
                  `${ab.name} (${actorName})`,
                  parsedDmg.count,
                  parsedDmg.sides,
                  parsedDmg.modifier,
                  isSecretRoll
                )
              }
              className="px-2 py-0.5 bg-zinc-950 hover:bg-red-700 text-red-300 hover:text-white border border-red-800/70 rounded text-[11px] font-mono font-bold transition cursor-pointer"
            >
              <Icon name="d20" /> Rolar {ab.damageFormula}
            </button>
          )}
        </div>
        <p className="text-[11px] text-zinc-300 leading-relaxed">{ab.description}</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-5 shadow-lg">
      {/* CABEÇALHO E SUB-ABAS */}
      <div className="flex flex-col gap-3 border-b border-zinc-800 pb-4">
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div>
            <h3 className="text-base font-semibold text-zinc-100">
              <Icon name="ghost" /> Bestiário Oficial & Ameaças da Mesa
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Consulte as criaturas e NPCs do Cap. 7, envie múltiplas instâncias em 1 clique para o combate ou customize suas próprias ameaças.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isOrdem && partyTotalNex > 0 && (
              <div
                className="px-3 py-1.5 bg-zinc-950 border border-amber-700/50 rounded-xl text-xs font-mono text-zinc-300"
                title="Soma do NEX de todos os personagens da campanha — compare com o VD das ameaças (Cap. 7)"
              >
                <Icon name="scroll" /> NEX Total do Grupo:{' '}
                <strong className="text-amber-400 font-extrabold">{partyTotalNex}</strong>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (isFormOpen) {
                  setIsFormOpen(false);
                  setEditingThreatId(null);
                } else {
                  handleOpenCreateNew();
                }
              }}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-xl text-xs font-extrabold transition cursor-pointer shadow"
            >
              {isFormOpen ? 'Cancelar Edição' : '+ Criar Ameaça Customizada'}
            </button>
          </div>
        </div>

        {isOrdem && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('catalog')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                activeSubTab === 'catalog'
                  ? 'bg-red-700 text-white border-red-500 shadow'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              <Icon name="book" /> Catálogo Oficial Cap. 7 ({ORDEM_BESTIARY_THREATS.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('custom')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                activeSubTab === 'custom'
                  ? 'bg-amber-600 text-white border-amber-400 shadow'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              <Icon name="ghost" /> Ameaças Salvas na Mesa ({threats.length})
            </button>
          </div>
        )}
      </div>

      {/* FORMULÁRIO DE CRIAÇÃO / EDIÇÃO DE AMEAÇA */}
      {isFormOpen && (
        <form
          onSubmit={handleSaveThreat}
          className="bg-zinc-950 border border-red-900/60 p-5 rounded-2xl flex flex-col gap-5"
        >
          <h4 className="text-sm font-semibold text-zinc-100">
            {editingThreatId
              ? `Editando Ameaça da Mesa: ${name}`
              : `Construtor Completo de Criatura / NPC (${system})`}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-4">
              <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">
                Nome da Criatura / NPC
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Enpap-X, Zumbi de Sangue..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="sm:col-span-3">
              <ImageUploadField
                label="Imagem / Token"
                value={imageUrl}
                onChange={setImageUrl}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">
                Pontos de Vida (PV)
              </label>
              <input
                type="number"
                min={1}
                value={hpMax}
                onChange={(e) => setHpMax(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-white"
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">
                Defesa
              </label>
              <input
                type="number"
                value={defense}
                onChange={(e) => setDefense(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">
                Iniciativa (d20 / +Bônus)
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  min={-3}
                  max={10}
                  value={initDice}
                  onChange={(e) => setInitDice(Number(e.target.value))}
                  className="w-1/2 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-xs font-mono text-center text-white"
                />
                <input
                  type="number"
                  value={initBonus}
                  onChange={(e) => setInitBonus(Number(e.target.value))}
                  className="w-1/2 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-xs font-mono text-center text-amber-400"
                />
              </div>
            </div>
          </div>

          {isOrdem && (
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              <div>
                <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">
                  VD
                </label>
                <input
                  type="number"
                  min={0}
                  value={vd}
                  onChange={(e) => setVd(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-amber-400"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">
                  Elemento / Origem
                </label>
                <select
                  value={element}
                  onChange={(e) => setElement(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="Sangue">Sangue</option>
                  <option value="Morte">Morte</option>
                  <option value="Conhecimento">Conhecimento</option>
                  <option value="Energia">Energia</option>
                  <option value="Medo">Medo</option>
                  <option value="Realidade">Realidade</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">
                  Tipo
                </label>
                <input
                  type="text"
                  value={creatureType}
                  onChange={(e) => setCreatureType(e.target.value)}
                  placeholder="Criatura, Pessoa, Animal..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">
                  Tamanho
                </label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="Minúsculo">Minúsculo</option>
                  <option value="Pequeno">Pequeno</option>
                  <option value="Médio">Médio</option>
                  <option value="Grande">Grande</option>
                  <option value="Enorme">Enorme</option>
                  <option value="Colossal">Colossal</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">
                  Deslocamento
                </label>
                <input
                  type="text"
                  value={displacement}
                  onChange={(e) => setDisplacement(e.target.value)}
                  placeholder="9m (6q)"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">
                  Sentidos Especiais
                </label>
                <input
                  type="text"
                  value={senses}
                  onChange={(e) => setSenses(e.target.value)}
                  placeholder="Percepção às cegas..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          )}

          {isOrdem && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">
                  <Icon name="shield" /> Resistências (RD)
                </label>
                <input
                  type="text"
                  value={resistances}
                  onChange={(e) => setResistances(e.target.value)}
                  placeholder="Ex: Corte, impacto e Sangue 10"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">
                  <Icon name="sparkles" /> Imunidades
                </label>
                <input
                  type="text"
                  value={immunities}
                  onChange={(e) => setImmunities(e.target.value)}
                  placeholder="Ex: Condições de medo, dano..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">
                  <Icon name="heart-crack" /> Vulnerabilidades
                </label>
                <input
                  type="text"
                  value={vulnerabilities}
                  onChange={(e) => setVulnerabilities(e.target.value)}
                  placeholder="Ex: Morte, Energia..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-2">
              Atributos da Criatura
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {Object.keys(attributes).map((attrKey) => (
                <div
                  key={attrKey}
                  className="bg-zinc-900 border border-zinc-800 p-2 rounded-lg flex flex-col items-center"
                >
                  <span className="text-[10px] font-bold uppercase text-zinc-400">
                    {attrKey.toUpperCase()}
                  </span>
                  <input
                    type="number"
                    value={attributes[attrKey]}
                    onChange={(e) =>
                      setAttributes({ ...attributes, [attrKey]: Number(e.target.value) })
                    }
                    className="w-14 bg-zinc-950 border border-zinc-700 rounded px-1.5 py-0.5 mt-1 text-center font-mono text-xs text-white"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* PERÍCIAS */}
          <div className="bg-zinc-900/70 border border-zinc-800 p-3.5 rounded-xl flex flex-col gap-3">
            <span className="text-xs font-bold text-amber-400">
              <Icon name="target" /> Perícias e Testes de Resistência ({skills.length})
            </span>

            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[140px]">
                <label className="block text-[10px] text-zinc-400 mb-1">Nome da Perícia</label>
                <input
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="Ex: Atletismo, Furtividade..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div className="w-20">
                <label className="block text-[10px] text-zinc-400 mb-1">Dados (d20)</label>
                <input
                  type="number"
                  min={-3}
                  value={newSkillDice}
                  onChange={(e) => setNewSkillDice(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-xs font-mono text-white"
                />
              </div>
              <div className="w-20">
                <label className="block text-[10px] text-zinc-400 mb-1">Bônus (+)</label>
                <input
                  type="number"
                  value={newSkillBonus}
                  onChange={(e) => setNewSkillBonus(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-xs font-mono text-white"
                />
              </div>
              <button
                type="button"
                onClick={handleAddSkillToDraft}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-amber-600 text-white rounded text-xs font-bold cursor-pointer"
              >
                + Perícia
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {skills.map((sk) => (
                <span
                  key={sk.id}
                  className="bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-lg text-xs font-mono text-zinc-200 flex items-center gap-1.5"
                >
                  <span>
                    {sk.name}: {formatD20Pool(sk.diceCount, sk.bonus)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSkills(skills.filter((s) => s.id !== sk.id))}
                    className="text-zinc-500 hover:text-red-400 cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* ATAQUES */}
          <div className="bg-zinc-900/70 border border-zinc-800 p-3.5 rounded-xl flex flex-col gap-3">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <span className="text-xs font-bold text-red-400">
                <Icon name="swords" /> Ataques e Ações Agressivas ({attacks.length})
              </span>

              <select
                onChange={(e) => {
                  const found = compendiumEntries.find((c) => c.id === e.target.value);
                  if (found) handleImportAttackFromCompendium(found);
                  e.target.value = '';
                }}
                defaultValue=""
                className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-[11px] text-amber-400"
              >
                <option value="" disabled>
                  Importar arma/magia com dano do Compêndio...
                </option>
                {compendiumEntries
                  .filter((c) => c.metadata?.damageFormula)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.metadata?.damageFormula})
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
              <div className="col-span-2">
                <label className="block text-[10px] text-zinc-400 mb-1">Nome do Ataque</label>
                <input
                  type="text"
                  value={newAtkName}
                  onChange={(e) => setNewAtkName(e.target.value)}
                  placeholder="Ex: Garra de Sangue..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Dados / Bônus</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    min={-2}
                    value={newAtkDice}
                    onChange={(e) => setNewAtkDice(Number(e.target.value))}
                    className="w-1/2 bg-zinc-950 border border-zinc-700 rounded px-1.5 py-1.5 text-xs font-mono text-white text-center"
                  />
                  <input
                    type="number"
                    value={newAtkBonus}
                    onChange={(e) => setNewAtkBonus(Number(e.target.value))}
                    className="w-1/2 bg-zinc-950 border border-zinc-700 rounded px-1.5 py-1.5 text-xs font-mono text-amber-400 text-center"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Dano</label>
                <input
                  type="text"
                  value={newAtkDmg}
                  onChange={(e) => setNewAtkDmg(e.target.value)}
                  placeholder="2d8+6"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Tipo</label>
                <input
                  type="text"
                  value={newAtkType}
                  onChange={(e) => setNewAtkType(e.target.value)}
                  placeholder="Sangue / Corte"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white"
                />
              </div>
              <div className="flex gap-1">
                <div className="flex-1">
                  <label className="block text-[10px] text-zinc-400 mb-1">Múltiplo</label>
                  <input
                    type="text"
                    value={newAtkMulti}
                    onChange={(e) => setNewAtkMulti(e.target.value)}
                    placeholder="x2"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-xs font-mono text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddAttackToDraft}
                  className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded text-xs font-bold cursor-pointer self-end"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {attacks.map((atk) => (
                <div
                  key={atk.id}
                  className="bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2"
                >
                  <strong className="text-white">
                    {atk.name}
                    {atk.multiAttack ? ` (${atk.multiAttack})` : ''}
                  </strong>
                  <span className="font-mono text-amber-400">
                    ({formatD20Pool(atk.diceCount, atk.attackBonus)} | {atk.damageFormula}{' '}
                    {atk.damageType || ''})
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttacks(attacks.filter((a) => a.id !== atk.id))}
                    className="text-zinc-500 hover:text-red-400 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* HABILIDADES ESPECIAIS E AÇÕES */}
          <div className="bg-zinc-900/70 border border-zinc-800 p-3.5 rounded-xl flex flex-col gap-3">
            <span className="text-xs font-bold text-purple-300">
              <Icon name="sparkles" /> Habilidades Passivas e Ações Especiais ({specialAbilities.length})
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
              <div className="sm:col-span-3">
                <label className="block text-[10px] text-zinc-400 mb-1">Nome da Habilidade</label>
                <input
                  type="text"
                  value={newAbName}
                  onChange={(e) => setNewAbName(e.target.value)}
                  placeholder="Ex: Agarrão, Cura Acelerada..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] text-zinc-400 mb-1">Tipo de Ação</label>
                <select
                  value={newAbType}
                  onChange={(e) => setNewAbType(e.target.value as ThreatActionType)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white"
                >
                  <option value="Passiva">Passiva</option>
                  <option value="Livre">Livre</option>
                  <option value="Movimento">Movimento</option>
                  <option value="Padrão">Padrão</option>
                  <option value="Reação">Reação</option>
                  <option value="Completa">Completa</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] text-zinc-400 mb-1">Dano Opcional</label>
                <input
                  type="text"
                  value={newAbDmg}
                  onChange={(e) => setNewAbDmg(e.target.value)}
                  placeholder="Ex: 6d6"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-xs font-mono text-white"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="block text-[10px] text-zinc-400 mb-1">Descrição / Efeito</label>
                <input
                  type="text"
                  value={newAbDesc}
                  onChange={(e) => setNewAbDesc(e.target.value)}
                  placeholder="Efeito mecânico ou DT de resistência..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div className="sm:col-span-1">
                <button
                  type="button"
                  onClick={handleAddSpecialAbilityToDraft}
                  className="w-full py-1.5 bg-purple-800 hover:bg-purple-700 text-white rounded text-xs font-bold cursor-pointer"
                >
                  + Add
                </button>
              </div>
            </div>

            {specialAbilities.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {specialAbilities.map((ab) => (
                  <div
                    key={ab.id}
                    className="bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-lg text-xs flex justify-between items-start gap-2"
                  >
                    <div>
                      <span className="font-mono text-[10px] uppercase text-purple-300 mr-2">
                        [{ab.actionType}]
                      </span>
                      <strong className="text-white">{ab.name}</strong>
                      {ab.damageFormula && (
                        <span className="text-red-400 font-mono ml-2">({ab.damageFormula})</span>
                      )}
                      <p className="text-[11px] text-zinc-400 mt-0.5">{ab.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSpecialAbilities(specialAbilities.filter((item) => item.id !== ab.id))
                      }
                      className="text-zinc-500 hover:text-red-400 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isOrdem && (
            <div>
              <label className="block text-[10px] uppercase text-cyan-300 font-bold mb-1">
                <Icon name="puzzle" /> Enigma de Medo (Opcional)
              </label>
              <textarea
                rows={2}
                value={enigmaOfFear}
                onChange={(e) => setEnigmaOfFear(e.target.value)}
                placeholder="Condição para resolver o Enigma de Medo e quais imunidades/habilidades a criatura perde..."
                className="w-full bg-zinc-900 border border-cyan-900/50 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">
              Descrição / Lore & Anotações da Criatura
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Aparência, comportamento tático, ganchos de cena..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-xl text-xs font-extrabold cursor-pointer shadow-lg"
          >
            {editingThreatId
              ? 'Salvar Alterações na Ameaça'
              : 'Salvar Nova Ameaça na Mesa'}
          </button>
        </form>
      )}

      {/* ABA 1: CATÁLOGO OFICIAL CAP. 7 (67 AMEAÇAS) */}
      {isOrdem && activeSubTab === 'catalog' && (
        <div className="flex flex-col gap-4">
          {/* BARRA DE BUSCA E FILTROS */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
              <div className="md:col-span-6">
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Buscar por nome, ataque, habilidade, resistência ou subgrupo..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  value={vdRangeFilter}
                  onChange={(e) => setVdRangeFilter(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-200"
                >
                  <option value="ALL">Todas as Faixas de VD</option>
                  <option value="10-40">VD 10 – 40 (Iniciantes)</option>
                  <option value="60-140">VD 60 – 140 (Agentes)</option>
                  <option value="160-280">VD 160 – 280 (Veteranos)</option>
                  <option value="300-380">VD 300 – 380 (Elite)</option>
                  <option value="400+">VD 400+ (Relíquias)</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <select
                  value={catalogSort}
                  onChange={(e) => setCatalogSort(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-200"
                >
                  <option value="vd-asc">VD do menor para o maior</option>
                  <option value="vd-desc">VD do maior para o menor</option>
                  <option value="name-asc">Ordem Alfabética (A → Z)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'ALL' as const, label: 'Todos (67)', icon: 'ghost', color: '' },
                { id: 'sangue' as const, label: 'Sangue (12)', icon: 'sangue', color: 'var(--trpg-el-sangue)' },
                { id: 'morte' as const, label: 'Morte (12)', icon: 'morte', color: 'var(--trpg-el-morte)' },
                { id: 'conhecimento' as const, label: 'Conhecimento (12)', icon: 'conhecimento', color: 'var(--trpg-el-conhecimento)' },
                { id: 'energia' as const, label: 'Energia (12)', icon: 'energia', color: 'var(--trpg-el-energia)' },
                { id: 'medo' as const, label: 'Medo (1)', icon: 'medo', color: 'var(--trpg-el-medo)' },
                { id: 'realidade' as const, label: 'Realidade (18)', icon: 'user', color: '' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => {
                    setGroupFilter(pill.id);
                    if (pill.id !== 'realidade') setRealitySubFilter('ALL');
                  }}
                  aria-pressed={groupFilter === pill.id}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5 ${
                    groupFilter === pill.id
                      ? 'bg-zinc-800 text-zinc-100 border-zinc-500'
                      : 'bg-transparent text-zinc-400 border-zinc-800 hover:text-zinc-100 hover:border-zinc-600'
                  }`}
                >
                  <Icon name={pill.icon} size={14} style={pill.color ? { color: pill.color } : undefined} />
                  {pill.label}
                </button>
              ))}
            </div>

            {groupFilter === 'realidade' && (
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-zinc-800/80">
                {[
                  { id: 'ALL', label: 'Todos da Realidade' },
                  { id: 'Criminosos & Mercenários', label: 'Criminosos & Mercenários (5)' },
                  { id: 'Cultistas', label: 'Cultistas (3)' },
                  { id: 'Forças da Lei', label: 'Forças da Lei (3)' },
                  { id: 'Animais', label: 'Animais (7)' },
                ].map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setRealitySubFilter(sub.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                      realitySubFilter === sub.id
                        ? 'bg-slate-700 text-white border-slate-500'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {filteredCatalog.length === 0 ? (
            <div className="bg-zinc-950/60 border border-dashed border-zinc-800 rounded-xl p-8 text-center">
              <p className="text-xs text-zinc-400">
                Nenhuma ameaça oficial encontrada para os filtros selecionados.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredCatalog.map((tpl) => {
                const isExpanded = Boolean(expandedCatalogIds[tpl.id]);
                const qty = catalogQtyById[tpl.id] || 1;
                const diffBadge = getEncounterDifficultyBadge(tpl.vd, partyTotalNex);
                const elStyle =
                  ELEMENT_BADGE_STYLES[tpl.element] || ELEMENT_BADGE_STYLES.Realidade;

                return (
                  <div
                    key={tpl.id}
                    className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 flex flex-col justify-between gap-3.5 transition"
                  >
                    <div className="flex flex-col gap-2.5">
                      {/* TOPO DO CARD */}
                      <div className="flex justify-between items-start gap-2 border-b border-zinc-800/80 pb-2.5">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="px-2 py-0.5 rounded-md bg-red-950 text-red-200 border border-red-700/80 font-mono text-[11px] font-extrabold">
                              VD {tpl.vd}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md border text-[10px] font-extrabold uppercase ${elStyle}`}
                            >
                              {tpl.element}
                            </span>
                            {tpl.secondaryElements.map((sec) => (
                              <span
                                key={sec}
                                className="px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-900 text-zinc-300 text-[10px] font-semibold"
                              >
                                +{sec}
                              </span>
                            ))}
                            {tpl.hasEnigmaOfFear && (
                              <span className="px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-700/70 text-[10px] font-bold">
                                <Icon name="puzzle" /> Enigma de Medo
                              </span>
                            )}
                            {diffBadge && (
                              <span
                                className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${diffBadge.className}`}
                              >
                                {diffBadge.label}
                              </span>
                            )}
                          </div>

                          <h4 className="text-xl trpg-display text-zinc-100 leading-tight">
                            {tpl.name}
                          </h4>
                          <span className="text-[11px] text-zinc-400">
                            {tpl.creatureType} • {tpl.size} • {tpl.subGroup}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCatalogIds((prev) => ({
                              ...prev,
                              [tpl.id]: !prev[tpl.id],
                            }))
                          }
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer shrink-0 ${
                            isExpanded
                              ? 'bg-amber-600 text-white border-amber-400'
                              : 'bg-zinc-900 hover:bg-zinc-800 text-amber-400 border-zinc-700'
                          }`}
                        >
                          {isExpanded ? 'Recolher' : 'Ver Ficha'}
                        </button>
                      </div>

                      {/* RESUMO TÁTICO */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono">
                        <span className="text-red-400 font-bold">
                          <Icon name="heart" /> PV: {tpl.hpMax}{' '}
                          <span className="text-zinc-500 font-normal">
                            (Mach. {tpl.machucadoHp})
                          </span>
                        </span>
                        <span className="text-amber-400 font-bold">
                          <Icon name="shield" /> DEF: {tpl.defense > 0 ? tpl.defense : '—'}
                        </span>
                        <span className="text-zinc-300">
                          <Icon name="zap" /> INI: {formatD20Pool(tpl.initiativeDice, tpl.initiativeBonus)}
                        </span>
                        <span className="text-zinc-400"><Icon name="footprints" /> {tpl.displacement}</span>
                      </div>

                      {/* DEFESAS PASSIVAS (RD / IMUNIDADES / VULNERABILIDADES) */}
                      {(tpl.resistances || tpl.immunities || tpl.vulnerabilities) && (
                        <div className="flex flex-col gap-1 bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-2.5 text-[11px]">
                          {tpl.resistances && (
                            <div className="text-zinc-300">
                              <strong className="text-amber-400"><Icon name="shield" /> RD:</strong> {tpl.resistances}
                            </div>
                          )}
                          {tpl.immunities && (
                            <div className="text-zinc-300">
                              <strong className="text-cyan-300"><Icon name="sparkles" /> Imunidades:</strong>{' '}
                              {tpl.immunities}
                            </div>
                          )}
                          {tpl.vulnerabilities && (
                            <div className="text-zinc-300">
                              <strong className="text-rose-400"><Icon name="heart-crack" /> Vulnerável:</strong>{' '}
                              {tpl.vulnerabilities}
                            </div>
                          )}
                        </div>
                      )}

                      {/* RESUMO COMPACTO DE ATAQUES QUANDO RECOLHIDO */}
                      {!isExpanded && tpl.attacks.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {tpl.attacks.slice(0, 3).map((atk) => (
                            <span
                              key={atk.id}
                              className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded-lg text-[11px] font-mono text-zinc-300"
                            >
                              <Icon name="swords" /> {atk.name}
                              {atk.multiAttack ? ` ${atk.multiAttack}` : ''} ({atk.damageFormula}{' '}
                              {atk.damageType || ''})
                            </span>
                          ))}
                        </div>
                      )}

                      {/* FICHA COMPLETA EXPANDIDA */}
                      {isExpanded && (
                        <div className="flex flex-col gap-3 pt-2 border-t border-zinc-800/80">
                          {tpl.senses && (
                            <div className="text-[11px] text-zinc-300">
                              <strong className="text-zinc-400 uppercase"><Icon name="conhecimento" /> Sentidos:</strong>{' '}
                              {tpl.senses}
                            </div>
                          )}

                          {/* ATRIBUTOS ROLÁVEIS */}
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(tpl.attributes).map(([k, val]) => (
                              <button
                                key={k}
                                type="button"
                                onClick={() =>
                                  onRollDice(
                                    tpl.name,
                                    system,
                                    `Atributo ${k.toUpperCase()}`,
                                    val,
                                    20,
                                    0,
                                    isSecretRoll
                                  )
                                }
                                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-mono text-zinc-200 cursor-pointer"
                              >
                                <strong className="text-amber-400 uppercase">{k}:</strong> {val}
                              </button>
                            ))}
                          </div>

                          {/* PERÍCIAS ROLÁVEIS */}
                          {tpl.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {tpl.skills.map((sk) => (
                                <button
                                  key={sk.id}
                                  type="button"
                                  onClick={() =>
                                    onRollDice(
                                      tpl.name,
                                      system,
                                      `Perícia: ${sk.name}`,
                                      sk.diceCount,
                                      20,
                                      sk.bonus,
                                      isSecretRoll
                                    )
                                  }
                                  className="px-2.5 py-1 bg-zinc-900 hover:bg-amber-600 text-amber-300 hover:text-white border border-zinc-700 rounded-lg text-xs font-mono font-bold transition cursor-pointer"
                                >
                                  <Icon name="d20" /> {sk.name} ({formatD20Pool(sk.diceCount, sk.bonus)})
                                </button>
                              ))}
                            </div>
                          )}

                          {/* ATAQUES ROLÁVEIS */}
                          {tpl.attacks.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-400">
                                <Icon name="swords" /> Ataques ({tpl.attacks.length})
                              </span>
                              {tpl.attacks.map((atk) => renderAttackRow(tpl.name, atk))}
                            </div>
                          )}

                          {/* HABILIDADES E AÇÕES ESPECIAIS */}
                          {tpl.specialAbilities.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-300">
                                <Icon name="sparkles" /> Habilidades & Ações ({tpl.specialAbilities.length})
                              </span>
                              {tpl.specialAbilities.map((ab) =>
                                renderSpecialAbilityCard(tpl.name, ab)
                              )}
                            </div>
                          )}

                          {/* ENIGMA DE MEDO */}
                          {tpl.enigmaOfFear && (
                            <div className="bg-cyan-950/25 border border-cyan-700/60 rounded-xl p-3">
                              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-cyan-300 mb-1">
                                <Icon name="puzzle" /> Enigma de Medo
                              </span>
                              <p className="text-[11px] text-cyan-100/90 leading-relaxed">
                                {tpl.enigmaOfFear}
                              </p>
                            </div>
                          )}

                          {/* DESCRIÇÃO / LORE */}
                          <p className="text-[11px] text-zinc-400 bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-800/70 leading-relaxed">
                            {tpl.description}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* RODAPÉ DE AÇÕES EM 1 CLIQUE */}
                    <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-zinc-800/80">
                      <select
                        value={qty}
                        onChange={(e) =>
                          setCatalogQtyById((prev) => ({
                            ...prev,
                            [tpl.id]: Number(e.target.value),
                          }))
                        }
                        className="bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-amber-400"
                        title="Quantidade de instâncias para enviar ao combate"
                      >
                        <option value={1}>1x</option>
                        <option value={2}>2x</option>
                        <option value={3}>3x</option>
                        <option value={4}>4x</option>
                        <option value={5}>5x</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleSendTemplateToCombat(tpl)}
                        className="flex-1 py-2 px-3 bg-red-700 hover:bg-red-600 text-white rounded-xl text-xs font-extrabold transition cursor-pointer shadow"
                      >
                        <Icon name="swords" /> Enviar {qty > 1 ? `${qty}x ` : ''}ao Combate
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveTemplateToCampaign(tpl)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          savedFeedbackId === tpl.id
                            ? 'bg-emerald-700 text-white border-emerald-500'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700'
                        }`}
                        title="Salvar cópia editável (com foto/token personalizado e controle de Enigma) nas Ameaças da Mesa"
                      >
                        {savedFeedbackId === tpl.id ? 'Salva!' : 'Salvar na Mesa'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA 2: AMEAÇAS SALVAS NA MESA */}
      {(!isOrdem || activeSubTab === 'custom') && (
        <>
          {threats.length === 0 ? (
            <div className="bg-zinc-950/60 border border-dashed border-zinc-800 rounded-xl p-8 text-center flex flex-col items-center gap-2">
              <p className="text-xs text-zinc-400">
                Nenhuma criatura personalizada salva nesta mesa ainda.
              </p>
              {isOrdem && (
                <button
                  type="button"
                  onClick={() => setActiveSubTab('catalog')}
                  className="px-3.5 py-1.5 bg-zinc-800 hover:bg-red-700 text-zinc-200 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <Icon name="book" /> Explorar Catálogo Oficial Cap. 7 (67 Ameaças)
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {threats.map((threat) => {
                const manualInitVal = manualInitInputs[threat.id] ?? 15;
                const qty = savedQtyById[threat.id] || 1;
                const isProjected = activeProjectionId === threat.id;
                const isExpanded = expandedSavedIds[threat.id] ?? true;
                const elStyle = threat.element
                  ? ELEMENT_BADGE_STYLES[threat.element] || ELEMENT_BADGE_STYLES.Realidade
                  : '';

                return (
                  <div
                    key={threat.id}
                    className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between gap-4"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-start gap-3 border-b border-zinc-800/80 pb-3">
                        <div className="flex items-center gap-3.5 min-w-0">
                          {threat.imageUrl ? (
                            <img
                              src={threat.imageUrl}
                              alt={threat.name}
                              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-red-700/80 shadow-xl shrink-0 bg-zinc-900"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-2xl bg-red-950/50 border border-red-800/70 flex items-center justify-center text-2xl shrink-0">
                              <Icon name="ghost" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              {threat.vd !== undefined && (
                                <span className="px-2 py-0.5 rounded bg-red-950 text-red-200 border border-red-700/80 font-mono text-[10px] font-extrabold">
                                  VD {threat.vd}
                                </span>
                              )}
                              {threat.element && (
                                <span
                                  className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${elStyle}`}
                                >
                                  {threat.element}
                                </span>
                              )}
                              {threat.size && (
                                <span className="text-[10px] text-zinc-400">
                                  {threat.creatureType || 'Criatura'} • {threat.size}
                                </span>
                              )}
                            </div>

                            <h4 className="text-base font-extrabold text-white truncate">
                              {threat.name}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2.5 mt-1 text-xs font-mono">
                              <span className="text-red-400 font-bold">
                                <Icon name="heart" /> PV: {threat.hpMax} (Mach. {Math.floor(threat.hpMax / 2)})
                              </span>
                              <span className="text-amber-400 font-bold">
                                <Icon name="shield" /> DEF: {threat.defense}
                              </span>
                              <span className="text-zinc-400">
                                <Icon name="zap" /> INI:{' '}
                                {formatD20Pool(threat.initiativeDice, threat.initiativeBonus)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              onToggleProjection({
                                type: 'threat',
                                id: threat.id,
                                title: threat.name,
                                subtitle: threat.element
                                  ? `Ameaça de ${threat.element}`
                                  : 'Ameaça / Criatura',
                                description: threat.description,
                                imageUrl: threat.imageUrl,
                              })
                            }
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                              isProjected
                                ? 'bg-amber-500 text-zinc-950 shadow'
                                : 'bg-zinc-900 hover:bg-amber-600 text-amber-400 hover:text-white border border-zinc-700'
                            }`}
                            title="Exibir ou ocultar destaque desta Ameaça no 2º Monitor"
                          >
                            {isProjected ? 'Na TV' : 'TV'}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSavedIds((prev) => ({
                                ...prev,
                                [threat.id]: !(prev[threat.id] ?? true),
                              }))
                            }
                            className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs border border-zinc-700 cursor-pointer"
                            title="Expandir ou recolher detalhes"
                          >
                            <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartEditThreat(threat)}
                            className="px-2 py-1 bg-zinc-800 hover:bg-amber-600 text-zinc-200 hover:text-white rounded-lg text-xs font-bold transition cursor-pointer"
                            title="Editar ameaça"
                          >
                            <Icon name="pencil" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateThreats(threats.filter((t) => t.id !== threat.id))
                            }
                            className="px-2 py-1 bg-zinc-900 hover:bg-red-950 text-zinc-500 hover:text-red-400 rounded-lg text-xs cursor-pointer"
                            title="Remover ameaça da mesa"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {(threat.resistances || threat.immunities || threat.vulnerabilities) && (
                        <div className="flex flex-col gap-1 bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-2.5 text-[11px]">
                          {threat.resistances && (
                            <div className="text-zinc-300">
                              <strong className="text-amber-400"><Icon name="shield" /> RD:</strong>{' '}
                              {threat.resistances}
                            </div>
                          )}
                          {threat.immunities && (
                            <div className="text-zinc-300">
                              <strong className="text-cyan-300"><Icon name="sparkles" /> Imunidades:</strong>{' '}
                              {threat.immunities}
                            </div>
                          )}
                          {threat.vulnerabilities && (
                            <div className="text-zinc-300">
                              <strong className="text-rose-400"><Icon name="heart-crack" /> Vulnerável:</strong>{' '}
                              {threat.vulnerabilities}
                            </div>
                          )}
                        </div>
                      )}

                      {isExpanded && (
                        <>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(threat.attributes).map(([k, val]) => (
                              <button
                                key={k}
                                type="button"
                                onClick={() =>
                                  onRollDice(
                                    threat.name,
                                    system,
                                    `Atributo ${k.toUpperCase()}`,
                                    isOrdem ? val : 1,
                                    20,
                                    isOrdem ? 0 : val,
                                    isSecretRoll
                                  )
                                }
                                className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-[11px] font-mono text-zinc-300 cursor-pointer"
                              >
                                <strong className="text-zinc-400 uppercase">{k}:</strong> {val}
                              </button>
                            ))}
                          </div>

                          {threat.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {threat.skills.map((sk) => (
                                <button
                                  key={sk.id}
                                  type="button"
                                  onClick={() =>
                                    onRollDice(
                                      threat.name,
                                      system,
                                      `Perícia: ${sk.name}`,
                                      sk.diceCount,
                                      20,
                                      sk.bonus,
                                      isSecretRoll
                                    )
                                  }
                                  className="px-2.5 py-1 bg-zinc-900 hover:bg-amber-600 text-amber-400 hover:text-white border border-zinc-700 rounded text-xs font-mono font-bold transition cursor-pointer"
                                >
                                  <Icon name="d20" /> {sk.name} ({formatD20Pool(sk.diceCount, sk.bonus)})
                                </button>
                              ))}
                            </div>
                          )}

                          {threat.attacks.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                              {threat.attacks.map((atk) => renderAttackRow(threat.name, atk))}
                            </div>
                          )}

                          {threat.specialAbilities && threat.specialAbilities.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                              {threat.specialAbilities.map((ab) =>
                                renderSpecialAbilityCard(threat.name, ab)
                              )}
                            </div>
                          )}

                          {threat.enigmaOfFear && (
                            <div
                              className={`rounded-xl p-3 border transition ${
                                threat.enigmaSolved
                                  ? 'bg-emerald-950/30 border-emerald-600/70'
                                  : 'bg-cyan-950/25 border-cyan-700/60'
                              }`}
                            >
                              <div className="flex flex-wrap justify-between items-center gap-2 mb-1">
                                <span
                                  className={`text-[10px] font-extrabold uppercase tracking-wider ${
                                    threat.enigmaSolved ? 'text-emerald-300' : 'text-cyan-300'
                                  }`}
                                >
                                  {threat.enigmaSolved
                                    ? 'Enigma de Medo Resolvido!'
                                    : 'Enigma de Medo Ativo'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleEnigmaSolved(threat.id)}
                                  className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold border cursor-pointer ${
                                    threat.enigmaSolved
                                      ? 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                                      : 'bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-500'
                                  }`}
                                >
                                  {threat.enigmaSolved
                                    ? 'Reativar Enigma'
                                    : 'Marcar Resolvido'}
                                </button>
                              </div>
                              <p className="text-[11px] text-zinc-200 leading-relaxed">
                                {threat.enigmaOfFear}
                              </p>
                            </div>
                          )}

                          {threat.description && (
                            <p className="text-[11px] text-zinc-400 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/60">
                              {threat.description}
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800/80">
                      <div className="flex gap-1.5">
                        <select
                          value={qty}
                          onChange={(e) =>
                            setSavedQtyById((prev) => ({
                              ...prev,
                              [threat.id]: Number(e.target.value),
                            }))
                          }
                          className="bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-amber-400"
                        >
                          <option value={1}>1x</option>
                          <option value={2}>2x</option>
                          <option value={3}>3x</option>
                          <option value={4}>4x</option>
                          <option value={5}>5x</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            if (qty === 1) {
                              onRollDice(
                                threat.name,
                                system,
                                `Iniciativa (${threat.name})`,
                                threat.initiativeDice,
                                20,
                                threat.initiativeBonus,
                                true,
                                true,
                                threat.id
                              );
                            } else {
                              onSendThreatBatchToCombat(threat, qty, 'roll');
                            }
                          }}
                          className="flex-1 py-2 bg-purple-800 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold transition cursor-pointer shadow"
                        >
                          <Icon name="conhecimento" /> Rolar Iniciativa & Enviar {qty > 1 ? `(${qty}x)` : ''}
                        </button>
                      </div>

                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          value={manualInitVal}
                          onChange={(e) =>
                            setManualInitInputs({
                              ...manualInitInputs,
                              [threat.id]: Number(e.target.value),
                            })
                          }
                          className="w-16 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-center font-mono text-xs text-amber-400"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (qty === 1) {
                              onSendThreatToCombatManual(threat, manualInitVal);
                            } else {
                              onSendThreatBatchToCombat(threat, qty, 'manual', manualInitVal);
                            }
                          }}
                          className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          <Icon name="package" /> Adicionar Manualmente {qty > 1 ? `(${qty}x)` : ''}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
