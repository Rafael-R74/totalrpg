import { useState } from 'react';
import {
  OrdemSheetData,
  OrdemAttributes,
  OrdemSkill,
  CharacterAbility,
  SceneEffect,
  CursePricePrompt,
  createDefaultOrdemSheet,
  ComputedBonuses,
  SystemSkillDefinition,
  ORDEM_ORIGINS,
  ORDEM_TRAILS,
  ORDEM_PATENTS,
  ORDEM_SKILLS_METADATA,
  ORDEM_PROFICIENCY_OPTIONS,
  getOrdemPeLimit,
  getOrdemRitualPeLimit,
  getOrdemRitualDT,
  getOrdemEffectiveCredit,
} from '@totalrpg/shared';

interface OrdemSheetProps {
  data: OrdemSheetData;
  bonuses: ComputedBonuses;
  customSkills: SystemSkillDefinition[];
  abilities?: CharacterAbility[];
  isInCampaign?: boolean;
  isOverloaded?: boolean;
  isMachucado?: boolean;
  hasActiveInitiativeOrder?: boolean;
  isMyTurnInCombat?: boolean;
  currentRoundNumber?: number;
  peSpentThisTurn?: number;
  isEditMode: boolean;
  canEditAttributes: boolean;
  canEditAbilities: boolean;
  onChange: (updated: OrdemSheetData) => void;
  onSyncTrailAbilities?: (trailId: string, nex: number) => void;
  onOpenNexEvolution?: () => void;
  onCheckResource?: (amount: number, powerLabel?: string) => boolean;
  onSpendResource?: (amount: number, extraSceneEffect?: SceneEffect) => boolean;
  onLoseSanity?: (amount: number, reason: string) => void;
  onHealPv?: (amount: number, label?: string) => void;
  onRoll: (
    label: string,
    count: number,
    sides: number,
    modifier: number,
    cursePricePrompt?: CursePricePrompt
  ) => void;
}

const ATTRIBUTE_LABELS: Record<keyof OrdemAttributes, string> = {
  agi: 'Agilidade',
  for: 'Força',
  int: 'Intelecto',
  pre: 'Presença',
  vig: 'Vigor',
};

export function OrdemSheet({
  data,
  bonuses,
  customSkills,
  abilities = [],
  isInCampaign = false,
  isOverloaded = false,
  isMachucado = false,
  hasActiveInitiativeOrder = false,
  isMyTurnInCombat = false,
  currentRoundNumber = 1,
  peSpentThisTurn = 0,
  isEditMode,
  canEditAttributes,
  canEditAbilities,
  onChange,
  onSyncTrailAbilities,
  onOpenNexEvolution,
  onCheckResource,
  onSpendResource,
  onLoseSanity,
  onHealPv,
  onRoll,
}: OrdemSheetProps) {
  const [armOriginBoost, setArmOriginBoost] = useState(false);
  // Controle por perícia para ignorar a penalidade -5 de Kit (caso o uso específico não exija kit)
  const [ignoreMissingKitBySkill, setIgnoreMissingKitBySkill] = useState<Record<string, boolean>>({});
  const [customProfInput, setCustomProfInput] = useState('');

  const fallback = createDefaultOrdemSheet().sheetData;
  const baseSkills = data?.skills && data.skills.length > 0 ? data.skills : fallback.skills;

  // Mescla as perícias da ficha com novas perícias criadas pelo Admin
  const mergedSkills: OrdemSkill[] = [...baseSkills];
  for (const cs of customSkills) {
    if (!mergedSkills.some((s) => s.id === cs.skillKey)) {
      mergedSkills.push({
        id: cs.skillKey,
        name: cs.name,
        attribute: (cs.defaultAttribute as keyof OrdemAttributes) || 'int',
        trainingDegree: 0,
        otherModifier: 0,
      });
    }
  }

  const safeData: OrdemSheetData = {
    ...fallback,
    ...data,
    attributes: { ...fallback.attributes, ...(data?.attributes || {}) },
    skills: mergedSkills,
  };

  const allowAttrEdit = isEditMode && canEditAttributes;
  const allowSkillEdit = isEditMode && canEditAbilities;

  const effectiveFor = safeData.attributes.for + (bonuses.attributes['for'] || 0);
  const effectiveAgi = safeData.attributes.agi + (bonuses.attributes['agi'] || 0);
  const effectiveInt = safeData.attributes.int + (bonuses.attributes['int'] || 0);
  const effectivePre = safeData.attributes.pre + (bonuses.attributes['pre'] || 0);
  const effectiveVig = safeData.attributes.vig + (bonuses.attributes['vig'] || 0);

  const normOrigin = (safeData.origin || '').trim().toLowerCase();
  const originObj = ORDEM_ORIGINS.find(
    (o) => o.id === normOrigin || o.name.toLowerCase() === normOrigin
  );
  const originId = originObj?.id || '';

  const effectiveCredit = getOrdemEffectiveCredit(safeData.patent, safeData.origin);
  const isTeoricoConspiracao = originId === 'teorico_conspiracao';
  const mentalResistance = isTeoricoConspiracao ? Math.max(0, effectiveInt) : 0;
  const isTrabalhadorRural = originId === 'trabalhador_rural';

  const sceneEffects = safeData.sceneEffects || [];
  const faroPistasUsedInScene = Boolean(
    isInCampaign && sceneEffects.some((e) => e.id === 'orig-scene-faro-pistas')
  );
  const impostorUsedInScene = Boolean(
    isInCampaign && sceneEffects.some((e) => e.id === 'orig-scene-impostor')
  );

  // Poderes de Tropa de Choque para indicadores e automação
  const hasCascaGrossa = abilities.some(
    (a) =>
      a.id === 'trail-tropa_choque-10' ||
      a.name.toLowerCase().includes('casca grossa')
  );
  const hasCaiDentro = abilities.some(
    (a) =>
      a.id === 'trail-tropa_choque-40' ||
      a.name.toLowerCase().includes('cai dentro')
  );
  const hasInquebravel = abilities.some(
    (a) =>
      a.id === 'trail-tropa_choque-99' ||
      a.name.toLowerCase().includes('inquebrável') ||
      a.name.toLowerCase().includes('inquebravel')
  );

  // Habilidades e Poderes de Especialista
  const isEspecialista = safeData.characterClass === 'especialista';
  const hasEcletico =
    isEspecialista ||
    abilities.some(
      (a) =>
        a.name.toLowerCase().includes('eclético') ||
        a.name.toLowerCase().includes('ecletico')
    );
  const hasPerito =
    isEspecialista ||
    abilities.some((a) => a.name.toLowerCase().includes('perito'));
  const hasConhecimentoAplicado = abilities.some(
    (a) =>
      a.id === 'ord-pwr-esp-conhecimento-aplicado' ||
      a.name.toLowerCase().includes('conhecimento aplicado')
  );
  const hasPeritoExplosivos = abilities.some(
    (a) =>
      a.id === 'ord-pwr-esp-perito-explosivos' ||
      a.name.toLowerCase().includes('perito em explosivos')
  );
  const hasPrimeiraImpressao = abilities.some(
    (a) =>
      a.id === 'ord-pwr-esp-primeira-impressao' ||
      a.name.toLowerCase().includes('primeira impressão') ||
      a.name.toLowerCase().includes('primeira impressao')
  );
  const hasAssassinar = abilities.some(
    (a) =>
      a.id === 'trail-infiltrador-65' ||
      a.name.toLowerCase().includes('assassinar')
  );
  const primeiraImpressaoUsedInScene = Boolean(
    isInCampaign && sceneEffects.some((e) => e.id === 'pwr-scene-primeira-impressao')
  );

  // Habilidades e Poderes de Ocultista & Poderes Paranormais
  const hasIntuicaoParanormal = abilities.some(
    (a) =>
      a.isActive !== false &&
      (a.id.includes('intuicao-paranormal') ||
        a.name.toLowerCase().includes('intuição paranormal') ||
        a.name.toLowerCase().includes('intuicao paranormal'))
  );
  const hasIdentificacaoParanormal = abilities.some(
    (a) =>
      a.isActive !== false &&
      (a.id.includes('identificacao-paranormal') ||
        a.name.toLowerCase().includes('identificação paranormal') ||
        a.name.toLowerCase().includes('identificacao paranormal'))
  );
  const hasInabalavel =
    (safeData.trail === 'intuitivo' && safeData.nex >= 65) ||
    abilities.some(
      (a) =>
        a.id === 'trail-intuitivo-65' ||
        a.name.toLowerCase().includes('inabalável') ||
        a.name.toLowerCase().includes('inabalavel')
    );
  const resistirPowers = abilities.filter(
    (a) =>
      a.isActive !== false &&
      a.name.toLowerCase().includes('resistir a ')
  );
  const sangueFerventeAb = abilities.find(
    (a) =>
      a.isActive !== false &&
      (a.id.includes('sangue-fervente') ||
        a.name.toLowerCase().includes('sangue fervente'))
  );
  const sangueVivoAb = abilities.find(
    (a) =>
      a.isActive !== false &&
      (a.id.includes('sangue-vivo') ||
        a.name.toLowerCase().includes('sangue vivo'))
  );
  const campoProtetorAb = abilities.find(
    (a) =>
      a.isActive !== false &&
      (a.id.includes('campo-protetor') ||
        a.name.toLowerCase().includes('campo protetor'))
  );
  const hasCampoProtetor = Boolean(campoProtetorAb);
  const hasCampoProtetorAffinity = Boolean(
    campoProtetorAb &&
      (campoProtetorAb.hasAffinityUpgrade ||
        campoProtetorAb.name.toLowerCase().includes('afinidade'))
  );

  const interludePhysical = Math.max(0, Number(safeData.interludeBonusDice?.physical || 0));
  const interludeMental = Math.max(0, Number(safeData.interludeBonusDice?.mental || 0));
  const [armInterludePhysical, setArmInterludePhysical] = useState(false);
  const [armInterludeMental, setArmInterludeMental] = useState(false);

  function adjustInterludeDice(kind: 'physical' | 'mental', delta: number) {
    const nextPhys =
      kind === 'physical' ? Math.max(0, interludePhysical + delta) : interludePhysical;
    const nextMent =
      kind === 'mental' ? Math.max(0, interludeMental + delta) : interludeMental;
    onChange({
      ...safeData,
      interludeBonusDice: { physical: nextPhys, mental: nextMent },
    });
  }
  const [armIntuicaoParanormal, setArmIntuicaoParanormal] = useState(false);

  const [armedEcleticoDegree, setArmedEcleticoDegree] = useState<0 | 5 | 10 | 15>(0);
  const maxPeritoTierDice: 6 | 8 | 10 | 12 =
    safeData.nex >= 85 ? 12 : safeData.nex >= 55 ? 10 : safeData.nex >= 25 ? 8 : 6;
  const [selectedPeritoTierDice, setSelectedPeritoTierDice] = useState<6 | 8 | 10 | 12>(
    maxPeritoTierDice
  );
  const [armPerito, setArmPerito] = useState(false);
  const [armConhecimentoAplicado, setArmConhecimentoAplicado] = useState(false);

  const peritoTierList: Array<{ dice: 6 | 8 | 10 | 12; cost: number; minNex: number }> = [
    { dice: 6, cost: 2, minNex: 5 },
    { dice: 8, cost: 3, minNex: 25 },
    { dice: 10, cost: 4, minNex: 55 },
    { dice: 12, cost: 5, minNex: 85 },
  ];
  const activePeritoDice: 6 | 8 | 10 | 12 =
    selectedPeritoTierDice <= maxPeritoTierDice ? selectedPeritoTierDice : maxPeritoTierDice;
  const peritoCost =
    peritoTierList.find((t) => t.dice === activePeritoDice)?.cost ?? 2;
  const ecleticoCost =
    armedEcleticoDegree === 15
      ? 6
      : armedEcleticoDegree === 10
      ? 4
      : armedEcleticoDegree === 5
      ? 2
      : 0;

  // Defesa em Ordem Paranormal: 10 + AGI + Bônus (+5 Inquebrável se Machucado) - 5 se sobrecarregado
  const overloadPenalty = isOverloaded ? -5 : 0;
  const inquebravelDefenseBonus = hasInquebravel && isMachucado ? 5 : 0;
  const totalDefense = 10 + effectiveAgi + bonuses.defense + inquebravelDefenseBonus + overloadPenalty;

  // Cálculos de Ações Especiais de Defesa (Reação • 1x/Rodada, Cap. 4 p. 88)
  function getDefenseSkillInfo(skillId: string): { trained: boolean; total: number } {
    const sk = mergedSkills.find((s) => s.id === skillId);
    const meta = ORDEM_SKILLS_METADATA.find((m) => m.id === skillId);
    const ignoresLoad = bonuses.ignoresLoadPenaltySkills.includes(skillId);
    const loadPen = meta?.armorPenalty && isOverloaded && !ignoresLoad ? -5 : 0;
    const affinityExtra = skillId === 'reflexos' && hasCampoProtetorAffinity ? 5 : 0;
    const total =
      (sk?.trainingDegree || 0) +
      (sk?.otherModifier || 0) +
      bonuses.skillBonusAll +
      (bonuses.skillBonus[skillId] || 0) +
      loadPen +
      affinityExtra;
    return {
      trained: (sk?.trainingDegree || 0) >= 5,
      total,
    };
  }
  const reflexosInfo = getDefenseSkillInfo('reflexos');
  const fortitudeInfo = getDefenseSkillInfo('fortitude');
  const esquivaTotal = totalDefense + reflexosInfo.total;
  const esquivaCampoProtetor = esquivaTotal + 5;
  const cascaGrossaRd = hasCascaGrossa ? Math.max(0, effectiveVig) : 0;
  const blockBaseRd = fortitudeInfo.total + cascaGrossaRd;
  const passivePhysicalRd =
    bonuses.damageResistances
      .filter((rd) => {
        const t = rd.type.toLowerCase();
        return (
          t.includes('físic') ||
          t.includes('fisic') ||
          t.includes('geral') ||
          t.includes('todo') ||
          t.includes('dano')
        );
      })
      .reduce((acc, rd) => acc + rd.value, 0) +
    (hasInquebravel && isMachucado ? 5 : 0);
  const blockTotalRd = blockBaseRd + passivePhysicalRd;
  const otherSpecificRds = bonuses.damageResistances.filter((rd) => {
    const t = rd.type.toLowerCase();
    return !(
      t.includes('físic') ||
      t.includes('fisic') ||
      t.includes('geral') ||
      t.includes('todo') ||
      t.includes('dano')
    );
  });

  // Limite de PE/turno e DT de Rituais automáticos (v1.3)
  const peLimitPerTurn = getOrdemPeLimit(safeData.nex, safeData.origin, abilities);
  const ritualPeLimit = getOrdemRitualPeLimit(
    safeData.nex,
    safeData.origin,
    abilities,
    effectivePre,
    safeData.trail
  );
  const ritualDT =
    getOrdemRitualDT(
      safeData.nex,
      effectivePre,
      safeData.trail,
      abilities,
      safeData.origin,
      undefined,
      safeData.sceneEffects
    ) + (bonuses.ritualDtBonus || 0);
  const effectiveDisplacement = Math.max(
    0,
    (safeData.displacement || 9) + (bonuses.displacementBonus || 0) - (isOverloaded ? 3 : 0)
  );

  const buildCursePricePromptForAttr = (
    attrKey: keyof OrdemAttributes
  ): CursePricePrompt | undefined => {
    const info = bonuses.cursePriceByAttr?.[attrKey];
    if (!info || info.curseCount <= 0) return undefined;
    return {
      element: info.element,
      attributeLabel: info.attrLabel,
      curseCount: info.curseCount,
      sanLossOnFail: info.sanLoss,
    };
  };

  const classTrails = ORDEM_TRAILS.filter(
    (t) => t.classId === safeData.characterClass
  );
  const activeTrailObj = ORDEM_TRAILS.find((t) => t.id === safeData.trail);

  function handleAttributeChange(key: keyof OrdemAttributes, value: number) {
    onChange({
      ...safeData,
      attributes: {
        ...safeData.attributes,
        [key]: Math.max(0, Math.min(10, value)),
      },
    });
  }

  function handleSkillChange(skillId: string, changes: Partial<OrdemSkill>) {
    const updatedSkills = safeData.skills.map((sk) =>
      sk.id === skillId ? { ...sk, ...changes } : sk
    );
    onChange({ ...safeData, skills: updatedSkills });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho Biográfico & Progressão de Ordem Paranormal v1.3 */}
      <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {/* Origem (Fixa após a criação do personagem) */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1">
              Origem
            </label>
            <p className="text-sm font-semibold text-white">{safeData.origin}</p>
          </div>

          {/* Classe (Fixa após a criação do personagem) */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1">
              Classe
            </label>
            <p className="text-sm font-semibold text-amber-400 uppercase">
              {safeData.characterClass}
            </p>
          </div>

          {/* Trilha (10%+ — Fixa após ser escolhida) */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1">
              Trilha (NEX 10%+)
            </label>
            <p className="text-sm font-semibold text-amber-300">
              {activeTrailObj
                ? activeTrailObj.name
                : safeData.nex >= 10
                ? 'Não escolhida'
                : 'Bloqueada (<10%)'}
            </p>
          </div>

          {/* NEX (%) + Botão Evoluir NEX */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1">
              Exposição (NEX)
            </label>
            <div className="flex items-center gap-1.5">
              {allowAttrEdit ? (
                <select
                  value={safeData.nex}
                  onChange={(e) => onChange({ ...safeData, nex: Number(e.target.value) })}
                  className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white font-mono"
                >
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 99].map(
                    (n) => (
                      <option key={n} value={n}>
                        NEX {n}%
                      </option>
                    )
                  )}
                </select>
              ) : (
                <span className="text-base font-mono font-black text-white">
                  {safeData.nex}%
                </span>
              )}

              {canEditAttributes && safeData.nex < 99 && onOpenNexEvolution && (
                <button
                  type="button"
                  onClick={onOpenNexEvolution}
                  title="Abrir Assistente Guiado de Evolução de NEX"
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-black transition cursor-pointer shadow whitespace-nowrap"
                >
                  ⬆️ Evoluir NEX
                </button>
              )}
            </div>
          </div>

          {/* Patente, Prestígio & Limite de Crédito */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1">
              Patente & Crédito
            </label>
            {allowAttrEdit ? (
              <div className="flex gap-1">
                <select
                  value={safeData.patent}
                  onChange={(e) => onChange({ ...safeData, patent: e.target.value })}
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white"
                >
                  {ORDEM_PATENTS.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                  <option value="Mundano">Mundano</option>
                </select>
                <input
                  type="number"
                  value={safeData.prestigePoints ?? 0}
                  onChange={(e) => {
                    const pp = Math.max(0, Number(e.target.value));
                    const autoPatent =
                      [...ORDEM_PATENTS].reverse().find((p) => pp >= p.minPrestige)?.name ||
                      safeData.patent;
                    onChange({ ...safeData, prestigePoints: pp, patent: autoPatent });
                  }}
                  title="Pontos de Prestígio (PP)"
                  className="w-14 bg-zinc-950 border border-zinc-700 rounded px-1.5 py-1 text-xs font-mono text-center text-amber-300"
                />
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-white">
                  {safeData.patent}{' '}
                  <span className="text-xs font-mono text-zinc-400">
                    ({safeData.prestigePoints ?? 0} PP)
                  </span>
                </p>
                <span className="inline-block text-[10px] font-mono text-emerald-400">
                  💰 Crédito: <strong>{effectiveCredit}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Afinidade Elemental (50%+) */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1">
              Afinidade (50%+)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {safeData.affinity ? (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700">
                  {safeData.affinity}
                </span>
              ) : (
                <span className="text-xs text-zinc-500 font-semibold">
                  {safeData.nex >= 50 ? 'Não escolhida' : 'Bloqueada (<50%)'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Barra de Indicadores Automáticos de Mesa (Defesa, Limite de PE, DT de Rituais, Deslocamento) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-zinc-800/80">
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 flex items-center justify-between">
            <div>
              <span className="block text-[10px] uppercase font-bold text-zinc-400">
                🛡️ Defesa Total
              </span>
              <span className="text-[10px] text-zinc-500">
                10 + AGI ({effectiveAgi}) {bonuses.defense ? `+ ${bonuses.defense}` : ''}
                {inquebravelDefenseBonus ? ' + 5 (Inquebrável)' : ''}
                {isOverloaded ? ' - 5 (Carga)' : ''}
              </span>
            </div>
            <span
              className={`text-xl font-black font-mono ${
                isOverloaded ? 'text-red-400' : 'text-amber-400'
              }`}
            >
              {totalDefense}
            </span>
          </div>

          <div
            className={`bg-zinc-950 border rounded-lg px-3 py-2 flex items-center justify-between ${
              hasActiveInitiativeOrder && isMyTurnInCombat
                ? 'border-amber-500 ring-1 ring-amber-500/40'
                : 'border-zinc-800'
            }`}
          >
            <div>
              <span className="block text-[10px] uppercase font-bold text-amber-400">
                ⚡ Limite de PE / Turno
                {hasActiveInitiativeOrder && isMyTurnInCombat ? ` • ⚔️ SEU TURNO (Rod. ${currentRoundNumber})` : ''}
              </span>
              <span className="text-[10px] text-zinc-500">
                {hasActiveInitiativeOrder
                  ? `Gasto neste turno: ${peSpentThisTurn} / ${peLimitPerTurn} PE`
                  : ritualPeLimit > peLimitPerTurn
                  ? `Rituais: ${ritualPeLimit} PE (Presença Poderosa)`
                  : 'Máx. de PE gasto por rodada'}
              </span>
            </div>
            <span className="text-xl font-black font-mono text-amber-300">
              {ritualPeLimit > peLimitPerTurn
                ? `${peLimitPerTurn}/${ritualPeLimit} PE`
                : `${peLimitPerTurn} PE`}
            </span>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 flex items-center justify-between">
            <div>
              <span className="block text-[10px] uppercase font-bold text-purple-400">
                🔮 DT de Rituais / Poderes
              </span>
              <span className="text-[10px] text-zinc-500">
                10 + Limite Base + PRE ({effectivePre})
                {bonuses.ritualDtBonus > 0 ? ` + ${bonuses.ritualDtBonus} (Potência)` : ''}
              </span>
            </div>
            <span className="text-xl font-black font-mono text-purple-300">
              DT {ritualDT}
            </span>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 flex items-center justify-between">
            <div>
              <span className="block text-[10px] uppercase font-bold text-emerald-400">
                🏃 Deslocamento
              </span>
              <span className="text-[10px] text-zinc-500">
                {isOverloaded
                  ? '⚠️ Reduzido (-3m sobrecarga)'
                  : isTrabalhadorRural
                  ? '🌿 Ignora Terreno Difícil'
                  : 'Padrão da cena'}
              </span>
            </div>
            <span
              className={`text-xl font-black font-mono ${
                isOverloaded ? 'text-red-400' : 'text-emerald-300'
              }`}
            >
              {effectiveDisplacement}m
            </span>
          </div>
        </div>

        {/* Painel Visual de Ações Especiais de Defesa (Reação • 1x/Rodada, Cap. 4 p. 88) */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] uppercase font-black tracking-wider text-sky-400">
              🛡️ Ações Especiais de Defesa (Reação • 1x/Rodada)
            </span>
            <span className="text-[10px] text-zinc-500">
              Valores calculados automaticamente
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Esquivar */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-extrabold text-white block">🏃 Se Esquivar</span>
                  <span className="text-[10px] text-zinc-400">
                    Defesa ({totalDefense}) + Reflexos ({reflexosInfo.total >= 0 ? `+${reflexosInfo.total}` : reflexosInfo.total})
                  </span>
                </div>
                <span className="text-lg font-black font-mono text-sky-300">
                  Def {esquivaTotal}
                </span>
              </div>

              {hasCampoProtetor && (
                <span className="text-[11px] font-bold text-cyan-200 bg-cyan-950/50 border border-cyan-800/60 rounded px-2 py-0.5">
                  ⚡ Com Campo Protetor (-1 PE): Def {esquivaCampoProtetor}
                </span>
              )}

              {hasCampoProtetorAffinity && (
                <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/50 border border-cyan-800/60 rounded px-2 py-0.5">
                  ⚡ Afinidade: +5 Reflexos & Evasão
                </span>
              )}

              {!reflexosInfo.trained && (
                <span className="text-[10px] text-amber-300/90 font-semibold">
                  ⚠️ Requer treinamento em Reflexos (p. 88)
                </span>
              )}
            </div>

            {/* Bloquear */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-extrabold text-white block">🛡️ Se Bloquear</span>
                  <span className="text-[10px] text-zinc-400">
                    Fortitude ({fortitudeInfo.total})
                    {cascaGrossaRd > 0 ? ` + ${cascaGrossaRd} VIG (Casca Grossa)` : ''}
                    {passivePhysicalRd > 0 ? ` + ${passivePhysicalRd} RD passiva` : ''}
                  </span>
                </div>
                <span className="text-lg font-black font-mono text-amber-300">
                  RD {passivePhysicalRd > 0 ? blockTotalRd : blockBaseRd}
                </span>
              </div>

              {otherSpecificRds.length > 0 && (
                <span className="text-[10px] text-cyan-300">
                  + Outras RDs:{' '}
                  {otherSpecificRds.map((rd) => `${rd.type} ${rd.value}`).join(', ')}
                </span>
              )}

              {!fortitudeInfo.trained && (
                <span className="text-[10px] text-amber-300/90 font-semibold">
                  ⚠️ Requer treinamento em Fortitude (p. 88)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Resistências a Dano (RD), Proficiências & Alerta de O Preço da Maldição */}
        <div className="flex flex-col gap-2 pt-1">
          {/* Painel de Proficiências (Armas e Proteções, p. 54 e p. 62) */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase font-black tracking-wider text-amber-400 mr-1">
                  🎖️ Proficiências:
                </span>
                {bonuses.effectiveProficiencies.map((prof) => {
                  const isManualEditable = allowAttrEdit || allowSkillEdit;
                  return (
                    <span
                      key={prof}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-200 border border-zinc-700"
                    >
                      <span>{prof}</span>
                      {isManualEditable &&
                        Array.isArray(safeData.proficiencies) &&
                        safeData.proficiencies.some(
                          (p) => p.trim().toLowerCase() === prof.trim().toLowerCase()
                        ) && (
                          <button
                            type="button"
                            onClick={() => {
                              const nextList = bonuses.effectiveProficiencies.filter(
                                (p) => p.trim().toLowerCase() !== prof.trim().toLowerCase()
                              );
                              onChange({ ...safeData, proficiencies: nextList });
                            }}
                            className="text-zinc-500 hover:text-red-400 text-[10px] font-bold cursor-pointer ml-0.5"
                            title="Remover proficiência"
                          >
                            ✕
                          </button>
                        )}
                    </span>
                  );
                })}
              </div>
              {!(allowAttrEdit || allowSkillEdit) && (
                <span className="text-[10px] text-zinc-500">
                  Armas/proteções sem proficiência sofrem -2d20
                </span>
              )}
            </div>

            {(allowAttrEdit || allowSkillEdit) && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-zinc-800/80">
                <span className="text-[10px] font-bold text-zinc-400 mr-1">
                  Alternar:
                </span>
                {ORDEM_PROFICIENCY_OPTIONS.map((opt) => {
                  const hasProf = bonuses.effectiveProficiencies.some(
                    (p) =>
                      p.trim().toLowerCase() === opt.label.toLowerCase() ||
                      (opt.id === 'protecoes_pesadas' &&
                        (p.toLowerCase().includes('proteções pesadas') ||
                          p.toLowerCase().includes('protecoes pesadas')))
                  );
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        const baseList =
                          Array.isArray(safeData.proficiencies) && safeData.proficiencies.length > 0
                            ? [...safeData.proficiencies]
                            : [...bonuses.effectiveProficiencies];
                        const matchFn = (p: string) =>
                          p.trim().toLowerCase() === opt.label.toLowerCase() ||
                          (opt.id === 'protecoes_pesadas' &&
                            (p.toLowerCase().includes('proteções pesadas') ||
                              p.toLowerCase().includes('protecoes pesadas')));
                        const nextList = hasProf
                          ? baseList.filter((p) => !matchFn(p))
                          : [...baseList, opt.label];
                        onChange({ ...safeData, proficiencies: nextList });
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                        hasProf
                          ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      {hasProf ? '✓ ' : '+ '}
                      {opt.label}
                    </button>
                  );
                })}
                <div className="flex items-center gap-1 ml-auto">
                  <input
                    type="text"
                    value={customProfInput}
                    onChange={(e) => setCustomProfInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customProfInput.trim()) {
                        e.preventDefault();
                        const baseList =
                          Array.isArray(safeData.proficiencies) && safeData.proficiencies.length > 0
                            ? [...safeData.proficiencies]
                            : [...bonuses.effectiveProficiencies];
                        onChange({
                          ...safeData,
                          proficiencies: [...baseList, customProfInput.trim()],
                        });
                        setCustomProfInput('');
                      }
                    }}
                    placeholder="Proficiência extra (ex.: Katana)..."
                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 text-[10px] text-white w-40"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!customProfInput.trim()) return;
                      const baseList =
                        Array.isArray(safeData.proficiencies) && safeData.proficiencies.length > 0
                          ? [...safeData.proficiencies]
                          : [...bonuses.effectiveProficiencies];
                      onChange({
                        ...safeData,
                        proficiencies: [...baseList, customProfInput.trim()],
                      });
                      setCustomProfInput('');
                    }}
                    className="px-2 py-0.5 bg-amber-700 hover:bg-amber-600 text-white rounded text-[10px] font-bold cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              </div>
            )}
          </div>

          {bonuses.hasProtectionProficiencyPenalty && (
            <div className="bg-red-950/55 border border-red-600/80 rounded-lg px-3 py-2 text-[11px] text-red-200 font-semibold">
              ⚠️ <strong>Penalidade por Não Proficiência em Proteção (p. 62):</strong> Você está equipando{' '}
              <strong>
                {bonuses.nonProficientProtections.map((np) => np.itemName).join(', ')}
              </strong>{' '}
              sem proficiência — sofrendo automaticamente <strong>-2d20</strong> em todos os testes baseados em <strong>Força e Agilidade</strong>!
            </div>
          )}

          {bonuses.damageResistances.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-cyan-400 mr-1">
                🛡️ Resistências a Dano (RD):
              </span>
              {bonuses.damageResistances.map((rd) => (
                <span
                  key={rd.type}
                  title={rd.source}
                  className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-200 border border-cyan-700/60"
                >
                  {rd.type} {rd.value}
                </span>
              ))}
            </div>
          )}

          {bonuses.vestimentaLimitExceeded && (
            <div className="bg-amber-950/50 border border-amber-600/70 rounded-lg px-3 py-1.5 text-[11px] text-amber-200 font-semibold">
              🧥 <strong>Limite de Vestimentas (p. 63):</strong> Você tem mais de 2 vestimentas equipadas. Apenas as 2 primeiras concedem bônus simultaneamente.
            </div>
          )}

          {bonuses.totalCursesCarried > 0 && (
            <div className="bg-purple-950/40 border border-purple-700/70 rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-purple-200">
                <span className="font-black uppercase tracking-wider text-purple-300">
                  👁️ O Preço da Maldição ({bonuses.totalCursesCarried}):
                </span>
                {(['int', 'agi', 'pre', 'for'] as const).map((ak) => {
                  const info = bonuses.cursePriceByAttr[ak];
                  if (!info) return null;
                  const attrLabel = ak === 'for' ? 'FOR/VIG' : ak.toUpperCase();
                  return (
                    <span
                      key={ak}
                      className="inline-flex items-center gap-1 bg-zinc-950 border border-purple-700/60 rounded px-2 py-0.5 text-[10px] font-mono font-bold"
                    >
                      <span className="text-purple-300">
                        {info.element} ({info.curseCount}): falha em {attrLabel} → -{info.sanLoss} SAN
                      </span>
                      {onLoseSanity && (
                        <button
                          type="button"
                          onClick={() =>
                            onLoseSanity(
                              info.sanLoss,
                              `O Preço da Maldição (${info.element} • falha em ${attrLabel})`
                            )
                          }
                          className="ml-1 px-1.5 py-0.5 rounded bg-red-950 hover:bg-red-700 text-red-200 border border-red-700 text-[9px] font-extrabold cursor-pointer"
                          title={`Descontar -${info.sanLoss} SAN agora`}
                        >
                          -{info.sanLoss} SAN
                        </button>
                      )}
                    </span>
                  );
                })}
                {bonuses.hasFearCurse && (
                  <span className="bg-zinc-950 border border-zinc-700 rounded px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                    Medo: preço definido pelo Mestre
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Indicadores Passivos Especiais (Origem / Tropa de Choque / Especialista / Ocultista / Paranormal) */}
        {(isTeoricoConspiracao ||
          hasCascaGrossa ||
          hasCaiDentro ||
          hasInquebravel ||
          hasPeritoExplosivos ||
          hasAssassinar ||
          hasInabalavel ||
          resistirPowers.length > 0 ||
          Boolean(sangueFerventeAb) ||
          Boolean(sangueVivoAb)) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {isTeoricoConspiracao && (
              <span className="px-2.5 py-1 rounded-lg bg-cyan-950/70 border border-cyan-700/70 text-cyan-200 text-xs font-bold">
                🧠 Eu Já Sabia (Teórico da Conspiração): Resistência a Dano Mental = {mentalResistance} (Intelecto)
              </span>
            )}
            {hasInabalavel && (
              <span className="px-2.5 py-1 rounded-lg bg-purple-950/70 border border-purple-700/70 text-purple-200 text-xs font-bold">
                🛡️ Inabalável: RD Mental 10 & Paranormal 10 (Vontade metade = 0 dano)
              </span>
            )}
            {resistirPowers.map((rp) => {
              const isAff =
                Boolean(rp.hasAffinityUpgrade) ||
                rp.name.toLowerCase().includes('afinidade');
              const elLabel =
                rp.name.replace(/^Resistir a\s+/i, '').replace(/\s*\(.*\)$/g, '').trim() ||
                rp.element ||
                'Elemento';
              return (
                <span
                  key={rp.id}
                  className="px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-700/60 text-purple-200 text-xs font-bold"
                >
                  🛡️ RD {elLabel}: {isAff ? '20 (Afinidade)' : '10'}
                </span>
              );
            })}
            {sangueFerventeAb && (() => {
              const isAff =
                Boolean(sangueFerventeAb.hasAffinityUpgrade) ||
                sangueFerventeAb.name.toLowerCase().includes('afinidade');
              const bonusVal = isAff ? 2 : 1;
              const currentAttr = safeData.sangueFerventeAttr === 'agi' ? 'agi' : 'for';
              return (
                <div
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${
                    isMachucado
                      ? 'bg-red-950/80 border-red-500 text-red-200 animate-pulse'
                      : 'bg-zinc-950 border-red-900/60 text-zinc-400'
                  }`}
                >
                  <span>
                    🩸 Sangue Fervente ({isMachucado ? `ATIVO: +${bonusVal}` : `quando Machucado: +${bonusVal}`}):
                  </span>
                  <button
                    type="button"
                    onClick={() => onChange({ ...safeData, sangueFerventeAttr: 'for' })}
                    className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer border ${
                      currentAttr === 'for'
                        ? 'bg-red-700 text-white border-red-400'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    FOR
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({ ...safeData, sangueFerventeAttr: 'agi' })}
                    className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer border ${
                      currentAttr === 'agi'
                        ? 'bg-red-700 text-white border-red-400'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    AGI
                  </button>
                </div>
              );
            })()}
            {sangueVivoAb && isMachucado && onHealPv && (() => {
              const isAff =
                Boolean(sangueVivoAb.hasAffinityUpgrade) ||
                sangueVivoAb.name.toLowerCase().includes('afinidade');
              const healVal = isAff ? 5 : 2;
              return (
                <button
                  type="button"
                  onClick={() => onHealPv(healVal, 'Sangue Vivo (Cura Acelerada)')}
                  className="px-2.5 py-1 rounded-lg bg-red-950/80 hover:bg-red-700 border border-red-500 text-red-100 text-xs font-extrabold transition cursor-pointer shadow"
                  title="Cura Acelerada até a metade dos PV máximos enquanto Machucado"
                >
                  🩸 Cura Acelerada Sangue Vivo (+{healVal} PV)
                </button>
              );
            })()}
            {hasCascaGrossa && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-700/70 text-amber-200 text-xs font-bold">
                🛡️ Casca Grossa: Soma +{effectiveVig} (VIG) na RD ao Bloquear
              </span>
            )}
            {hasCaiDentro && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-700/70 text-amber-200 text-xs font-bold">
                🛡️ DT Cai Dentro (Vontade): {10 + peLimitPerTurn + effectiveVig}
              </span>
            )}
            {hasPeritoExplosivos && (
              <span className="px-2.5 py-1 rounded-lg bg-orange-950/70 border border-orange-700/70 text-orange-200 text-xs font-bold">
                💣 DT Explosivos (Perito em Explosivos): {10 + peLimitPerTurn + effectiveAgi + effectiveInt} (Exclui até {Math.max(0, effectiveInt)} alvo(s))
              </span>
            )}
            {hasAssassinar && (
              <span className="px-2.5 py-1 rounded-lg bg-red-950/70 border border-red-700/70 text-red-200 text-xs font-bold">
                🗡️ DT Assassinar (Fortitude): {10 + peLimitPerTurn + effectiveAgi}
              </span>
            )}
            {hasInquebravel && isMachucado && (
              <span className="px-2.5 py-1 rounded-lg bg-red-950/80 border border-red-600/80 text-red-200 text-xs font-bold animate-pulse">
                🩸 Inquebrável Ativo (Machucado): +5 na Defesa e RD 5 (Não fica indefeso se Morrendo)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Pentágono de Atributos com Bônus Ativos e Regra de 0 Dados (2d20 menor) */}
      <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500">
            Pentágono de Atributos
          </h3>
          <span className="text-xs text-zinc-500">
            {allowAttrEdit
              ? 'Modo Edição: altere os valores base'
              : 'Modo Jogo: clique para rolar d20 (Atributo 0 rola 2d20 e pega o menor)'}
          </span>
        </div>

        {(interludePhysical > 0 || interludeMental > 0 || allowAttrEdit) && (
          <div className="mb-4 p-3 rounded-xl bg-indigo-950/30 border border-indigo-700/50 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-300">
              🌙 Dados Bônus de Interlúdio (Em Estoque)
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  disabled={interludePhysical <= 0}
                  onClick={() => setArmInterludePhysical((v) => !v)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                    interludePhysical <= 0
                      ? 'bg-zinc-900 text-zinc-500 border-zinc-800 cursor-not-allowed'
                      : armInterludePhysical
                      ? 'bg-emerald-600 text-white border-emerald-400 cursor-pointer shadow'
                      : 'bg-zinc-950 hover:bg-zinc-800 text-emerald-300 border-emerald-700/70 cursor-pointer'
                  }`}
                >
                  🏋️ Exercitar-se ({interludePhysical}): +1d20 FOR/AGI/VIG
                  {armInterludePhysical ? ' ✓ ARMADO' : ''}
                </button>
                {allowAttrEdit && (
                  <>
                    <button
                      type="button"
                      onClick={() => adjustInterludeDice('physical', -1)}
                      className="px-1.5 py-1 rounded bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 cursor-pointer"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustInterludeDice('physical', 1)}
                      className="px-1.5 py-1 rounded bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 cursor-pointer"
                    >
                      +
                    </button>
                  </>
                )}
              </div>

              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  disabled={interludeMental <= 0}
                  onClick={() => setArmInterludeMental((v) => !v)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                    interludeMental <= 0
                      ? 'bg-zinc-900 text-zinc-500 border-zinc-800 cursor-not-allowed'
                      : armInterludeMental
                      ? 'bg-purple-600 text-white border-purple-400 cursor-pointer shadow'
                      : 'bg-zinc-950 hover:bg-zinc-800 text-purple-300 border-purple-700/70 cursor-pointer'
                  }`}
                >
                  📚 Ler ({interludeMental}): +1d20 INT/PRE
                  {armInterludeMental ? ' ✓ ARMADO' : ''}
                </button>
                {allowAttrEdit && (
                  <>
                    <button
                      type="button"
                      onClick={() => adjustInterludeDice('mental', -1)}
                      className="px-1.5 py-1 rounded bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 cursor-pointer"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustInterludeDice('mental', 1)}
                      className="px-1.5 py-1 rounded bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 cursor-pointer"
                    >
                      +
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(Object.keys(ATTRIBUTE_LABELS) as Array<keyof OrdemAttributes>).map((attrKey) => {
            const baseVal = safeData.attributes[attrKey];
            const modVal = bonuses.attributes[attrKey] || 0;
            const effectiveVal = baseVal + modVal;
            const extraDice = bonuses.skillDiceAll + (bonuses.skillDice[attrKey] || 0);
            const isInterludePhysAttr =
              armInterludePhysical &&
              interludePhysical > 0 &&
              ['for', 'agi', 'vig'].includes(attrKey);
            const isInterludeMentAttr =
              armInterludeMental &&
              interludeMental > 0 &&
              ['int', 'pre'].includes(attrKey);
            const rawTotalDice =
              effectiveVal + extraDice + (isInterludePhysAttr || isInterludeMentAttr ? 1 : 0);

            return (
              <div
                key={attrKey}
                onClick={() => {
                  if (!allowAttrEdit) {
                    let attrMod = 0;
                    let labelSuffix = '';
                    // Acadêmico — Saber é Poder (+5 em testes usando Intelecto por 2 PE)
                    if (armOriginBoost && originId === 'academico' && attrKey === 'int') {
                      if (onSpendResource && !onSpendResource(2)) return;
                      attrMod += 5;
                      labelSuffix += ' [Saber é Poder +5]';
                      setArmOriginBoost(false);
                    }
                    if (isInterludePhysAttr) {
                      labelSuffix += ' [🏋️ Exercitar-se +1d20]';
                      adjustInterludeDice('physical', -1);
                      setArmInterludePhysical(false);
                    } else if (isInterludeMentAttr) {
                      labelSuffix += ' [📚 Ler +1d20]';
                      adjustInterludeDice('mental', -1);
                      setArmInterludeMental(false);
                    }
                    onRoll(
                      `Teste de ${ATTRIBUTE_LABELS[attrKey]}${labelSuffix}`,
                      rawTotalDice,
                      20,
                      attrMod,
                      buildCursePricePromptForAttr(attrKey)
                    );
                  }
                }}
                className={`bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center gap-1 transition ${
                  !allowAttrEdit ? 'hover:border-amber-500 cursor-pointer group' : ''
                }`}
              >
                <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-amber-400">
                  {attrKey.toUpperCase()}
                </span>
                <span className="text-xs text-zinc-500">{ATTRIBUTE_LABELS[attrKey]}</span>

                {allowAttrEdit ? (
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={baseVal}
                    onChange={(e) => handleAttributeChange(attrKey, Number(e.target.value))}
                    className="w-16 text-center bg-zinc-900 border border-zinc-700 rounded-lg py-1 mt-1 text-xl font-bold font-mono text-white"
                  />
                ) : (
                  <>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-extrabold font-mono text-white">
                        {effectiveVal}
                      </span>
                      {modVal !== 0 && (
                        <span
                          className={`text-xs font-mono ${
                            modVal > 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          ({modVal > 0 ? `+${modVal}` : modVal})
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {rawTotalDice <= 0 ? '🎲 2d20 (menor)' : `🎲 ${rawTotalDice}d20`}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Perícias (Tabela 2.1 Oficial v1.3: Somente Treinada, Penalidade de Carga, Kit, 0d20) */}
      <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500">
            Perícias ({safeData.skills.length})
          </h3>
          <div className="flex flex-wrap gap-2 text-[10px] text-zinc-400">
            <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">
              🔒 <strong>TREINADA:</strong> exige treinamento
            </span>
            <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">
              🏋️ <strong>CARGA:</strong> sofre -5 em sobrecarga
            </span>
            <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">
              🧰 <strong>KIT:</strong> certas ações exigem kit
            </span>
          </div>
        </div>

        {/* Barra de Automação Rápida do Poder de Origem para Testes de Perícia */}
        {['academico', 'atleta', 'executivo', 'investigador', 'trabalhador_rural', 'ti', 'trambiqueiro'].includes(
          originId
        ) && (
          <div className="mb-3 p-3 rounded-xl bg-amber-950/20 border border-amber-700/40 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-amber-200">
              <strong className="text-amber-400">
                ✨ {originObj?.powerName} (Poder de {originObj?.name}):
              </strong>{' '}
              <span className="text-zinc-300">{originObj?.powerDescription}</span>
            </div>

            {originId === 'ti' ? (
              <button
                type="button"
                onClick={() => {
                  if (onSpendResource && !onSpendResource(2)) return;
                  const tecSk = safeData.skills.find((s) => s.id === 'tecnologia');
                  const tecDice =
                    effectiveInt + bonuses.skillDiceAll + (bonuses.skillDice['tecnologia'] || 0);
                  const tecMod =
                    (tecSk?.trainingDegree || 0) +
                    (tecSk?.otherModifier || 0) +
                    bonuses.skillBonusAll +
                    (bonuses.skillBonus['tecnologia'] || 0);
                  onRoll('Motor de Busca (Substituído por Tecnologia)', tecDice, 20, tecMod);
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer shrink-0 shadow"
              >
                💻 Usar Motor de Busca (-2 PE → Rolar Tecnologia)
              </button>
            ) : originId === 'trambiqueiro' ? (
              <button
                type="button"
                disabled={impostorUsedInScene}
                onClick={() => {
                  if (impostorUsedInScene) return;
                  if (
                    onSpendResource &&
                    !onSpendResource(
                      2,
                      isInCampaign
                        ? {
                            id: 'orig-scene-impostor',
                            name: 'Impostor (Poder de Trambiqueiro)',
                            source: '1x/Cena',
                            description: 'Teste de perícia substituído por Enganação nesta cena',
                          }
                        : undefined
                    )
                  ) {
                    return;
                  }
                  const engSk = safeData.skills.find((s) => s.id === 'enganacao');
                  const engDice =
                    effectivePre + bonuses.skillDiceAll + (bonuses.skillDice['enganacao'] || 0);
                  const engMod =
                    (engSk?.trainingDegree || 0) +
                    (engSk?.otherModifier || 0) +
                    bonuses.skillBonusAll +
                    (bonuses.skillBonus['enganacao'] || 0);
                  onRoll('Impostor (Substituído por Enganação — 1x/Cena)', engDice, 20, engMod);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 ${
                  impostorUsedInScene
                    ? 'bg-zinc-900 border border-zinc-700 text-zinc-500 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer shadow'
                }`}
              >
                {impostorUsedInScene
                  ? '✓ Impostor já usado nesta cena'
                  : '🎭 Usar Impostor (-2 PE → Rolar Enganação, 1x/Cena)'}
              </button>
            ) : originId === 'investigador' && faroPistasUsedInScene ? (
              <span className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-500 text-xs font-bold shrink-0">
                ✓ Faro para Pistas já usado nesta cena
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!armOriginBoost) {
                    if (
                      onCheckResource &&
                      !onCheckResource(originObj?.powerCost || 0, originObj?.powerName)
                    ) {
                      return;
                    }
                  }
                  setArmOriginBoost((prev) => !prev);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer shrink-0 ${
                  armOriginBoost
                    ? 'bg-amber-500 text-zinc-950 border-amber-300 shadow-lg'
                    : 'bg-zinc-900 hover:bg-amber-950 text-amber-300 border-amber-600/60'
                }`}
              >
                {armOriginBoost
                  ? `⚡ ${originObj?.powerName} (Poder de ${originObj?.name}) ARMADO (+5 no próximo teste, -${originObj?.powerCost} PE)`
                  : `✨ Armar ${originObj?.powerName} (Poder de ${originObj?.name}) (+5 no próximo teste, -${originObj?.powerCost} PE)`}
              </button>
            )}
          </div>
        )}

        {/* Barra de Automação do Ocultista na Seção de Perícias (Intuição Paranormal) */}
        {hasIntuicaoParanormal && (
          <div className="mb-3 p-3 rounded-xl bg-purple-950/20 border border-purple-800/40 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-purple-200">
              <strong className="text-purple-300">👁️ Intuição Paranormal:</strong> Ao facilitar investigação, soma seu Intelecto ({effectiveInt}) ou Presença ({effectivePre}) no teste.
            </span>
            <button
              type="button"
              onClick={() => setArmIntuicaoParanormal((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer shrink-0 ${
                armIntuicaoParanormal
                  ? 'bg-purple-500 text-white border-purple-300 shadow'
                  : 'bg-zinc-900 hover:bg-purple-950 text-purple-200 border-purple-700/60'
              }`}
            >
              {armIntuicaoParanormal
                ? `👁️ Intuição ARMADA (+${Math.max(effectiveInt, effectivePre)} no próx. teste)`
                : `👁️ Armar Intuição Paranormal (+${Math.max(effectiveInt, effectivePre)} Facilitar Investigação)`}
            </button>
          </div>
        )}

        {/* Painel de Automação do Especialista na Seção de Perícias (Eclético, Perito e Conhecimento Aplicado) */}
        {(hasEcletico || hasPerito || hasConhecimentoAplicado) && (
          <div className="mb-3 p-3.5 rounded-xl bg-blue-950/20 border border-blue-800/40 flex flex-col gap-3">
            {/* A. Eclético + Engenhosidade & Conhecimento Aplicado */}
            {(hasEcletico || hasConhecimentoAplicado) && (
              <div className="flex flex-wrap items-center gap-2">
                {hasEcletico && (
                  <>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-300 mr-1">
                      ⚡ Eclético{safeData.nex >= 40 ? ' / Engenhosidade' : ''}:
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setArmedEcleticoDegree((prev) => (prev === 5 ? 0 : 5))
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        armedEcleticoDegree === 5
                          ? 'bg-blue-600 text-white border-blue-300 shadow'
                          : 'bg-zinc-900 hover:bg-blue-950 text-blue-200 border-blue-800/70'
                      }`}
                    >
                      Treinado (+5 • -2 PE)
                    </button>
                    {safeData.nex >= 40 && (
                      <button
                        type="button"
                        onClick={() =>
                          setArmedEcleticoDegree((prev) => (prev === 10 ? 0 : 10))
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          armedEcleticoDegree === 10
                            ? 'bg-blue-600 text-white border-blue-300 shadow'
                            : 'bg-zinc-900 hover:bg-blue-950 text-blue-200 border-blue-800/70'
                        }`}
                      >
                        Veterano (+10 • -4 PE)
                      </button>
                    )}
                    {safeData.nex >= 75 && (
                      <button
                        type="button"
                        onClick={() =>
                          setArmedEcleticoDegree((prev) => (prev === 15 ? 0 : 15))
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          armedEcleticoDegree === 15
                            ? 'bg-blue-600 text-white border-blue-300 shadow'
                            : 'bg-zinc-900 hover:bg-blue-950 text-blue-200 border-blue-800/70'
                        }`}
                      >
                        Expert (+15 • -6 PE)
                      </button>
                    )}
                  </>
                )}

                {hasConhecimentoAplicado && (
                  <button
                    type="button"
                    onClick={() => setArmConhecimentoAplicado((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      armConhecimentoAplicado
                        ? 'bg-cyan-600 text-white border-cyan-300 shadow'
                        : 'bg-zinc-900 hover:bg-cyan-950 text-cyan-200 border-cyan-800/70'
                    }`}
                    title="Muda o atributo-base da próxima perícia (exceto Luta e Pontaria) para Intelecto por 2 PE"
                  >
                    🧠 Conhecimento Aplicado (-2 PE → Usar INT [{effectiveInt}d20])
                  </button>
                )}
              </div>
            )}

            {/* B. Perito (Seleção das 2 Perícias + Dado Extra) */}
            {hasPerito && (() => {
              const currentPeritoIds = safeData.peritoSkills || [];
              const canEditPerito = currentPeritoIds.length < 2 || allowSkillEdit;
              const eligiblePeritoSkills = safeData.skills.filter(
                (s) => s.trainingDegree > 0 && s.id !== 'luta' && s.id !== 'pontaria'
              );
              const availableTiers = peritoTierList.filter((t) => safeData.nex >= t.minNex);

              return (
                <div className="flex flex-col gap-2 pt-2 border-t border-blue-900/40">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-300">
                        🎓 Perito ({currentPeritoIds.length}/2):
                      </span>
                      {availableTiers.map((t) => (
                        <button
                          key={t.dice}
                          type="button"
                          onClick={() => setSelectedPeritoTierDice(t.dice)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border transition cursor-pointer ${
                            activePeritoDice === t.dice
                              ? 'bg-blue-700 text-white border-blue-400'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white'
                          }`}
                        >
                          +1d{t.dice} (-{t.cost} PE)
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setArmPerito((prev) => !prev)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        armPerito
                          ? 'bg-amber-500 text-zinc-950 border-amber-300 shadow'
                          : 'bg-zinc-900 hover:bg-blue-950 text-blue-200 border-blue-800/70'
                      }`}
                    >
                      {armPerito
                        ? `🎓 Perito ARMADO (+1d${activePeritoDice} • -${peritoCost} PE)`
                        : `🎓 Armar Perito (+1d${activePeritoDice} • -${peritoCost} PE)`}
                    </button>
                  </div>

                  {canEditPerito ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-zinc-400 mr-1">
                        Escolha até 2 perícias treinadas (exceto Luta/Pontaria):
                      </span>
                      {eligiblePeritoSkills.length === 0 ? (
                        <span className="text-[10px] text-amber-400">
                          Nenhuma perícia treinada elegível encontrada.
                        </span>
                      ) : (
                        eligiblePeritoSkills.map((sk) => {
                          const selected = currentPeritoIds.includes(sk.id);
                          const disabled = !selected && currentPeritoIds.length >= 2;
                          return (
                            <button
                              key={sk.id}
                              type="button"
                              disabled={disabled}
                              onClick={() => {
                                const nextList = selected
                                  ? currentPeritoIds.filter((id) => id !== sk.id)
                                  : [...currentPeritoIds, sk.id];
                                onChange({ ...safeData, peritoSkills: nextList });
                              }}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold border transition cursor-pointer ${
                                selected
                                  ? 'bg-blue-600 text-white border-blue-300'
                                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-blue-700 disabled:opacity-35 disabled:cursor-not-allowed'
                              }`}
                            >
                              {selected ? '✓ ' : '+ '}
                              {sk.name}
                            </button>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
                      <span>Perícias escolhidas:</span>
                      {currentPeritoIds.map((pid) => {
                        const sk = safeData.skills.find((s) => s.id === pid);
                        return (
                          <span
                            key={pid}
                            className="px-2 py-0.5 rounded bg-blue-950/70 text-blue-200 border border-blue-800 font-bold"
                          >
                            🎓 {sk?.name || pid}
                          </span>
                        );
                      })}
                      <span className="text-[10px] text-zinc-500">
                        (Ative o Modo Edição para trocar)
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[500px] overflow-y-auto pr-1">
          {safeData.skills.map((skill) => {
            const meta = ORDEM_SKILLS_METADATA.find((m) => m.id === skill.id);
            const canUseConhecimentoAplicadoHere =
              armConhecimentoAplicado && skill.id !== 'luta' && skill.id !== 'pontaria';
            const attrForSkill = canUseConhecimentoAplicadoHere ? 'int' : skill.attribute;
            const baseAttr =
              safeData.attributes[attrForSkill] +
              (bonuses.attributes[attrForSkill] || 0);
            const extraDice = bonuses.skillDiceAll + (bonuses.skillDice[skill.id] || 0);
            const isPrimeiraImpressaoEligible =
              hasPrimeiraImpressao &&
              !primeiraImpressaoUsedInScene &&
              ['diplomacia', 'enganacao', 'intimidacao', 'intuicao'].includes(skill.id);
            const isInterludePhysSkill =
              armInterludePhysical &&
              interludePhysical > 0 &&
              ['for', 'agi', 'vig'].includes(attrForSkill);
            const isInterludeMentSkill =
              armInterludeMental &&
              interludeMental > 0 &&
              ['int', 'pre'].includes(attrForSkill);
            const rawDiceCount =
              baseAttr +
              extraDice +
              (isPrimeiraImpressaoEligible ? 2 : 0) +
              (isInterludePhysSkill || isInterludeMentSkill ? 1 : 0);

            const campoProtetorSkillBonus =
              hasCampoProtetorAffinity && skill.id === 'reflexos' ? 5 : 0;
            const autoBonus =
              bonuses.skillBonusAll +
              (bonuses.skillBonus[skill.id] || 0) +
              campoProtetorSkillBonus;
            const ignoresLoadPenalty = bonuses.ignoresLoadPenaltySkills.includes(skill.id);
            const loadSkillPenalty =
              meta?.armorPenalty && isOverloaded && !ignoresLoadPenalty ? -5 : 0;
            const isMissingKit = bonuses.missingSkillKits.some((k) => k.skillId === skill.id);
            const applyMissingKitPenalty = isMissingKit && !ignoreMissingKitBySkill[skill.id];
            const missingKitPenalty = applyMissingKitPenalty ? -5 : 0;
            const effectiveTraining =
              armedEcleticoDegree > 0 && skill.trainingDegree < armedEcleticoDegree
                ? armedEcleticoDegree
                : skill.trainingDegree;
            const totalBonus =
              effectiveTraining +
              skill.otherModifier +
              autoBonus +
              loadSkillPenalty +
              missingKitPenalty;

            const isUntrainedLocked =
              Boolean(meta?.trainedOnly) && effectiveTraining === 0;
            const isPeritoSkill = (safeData.peritoSkills || []).includes(skill.id);

            function handleExecuteSkillRoll(opts?: {
              forcePerito?: boolean;
              forceMaosRapidas?: boolean;
              forceIdentificacaoParanormal?: boolean;
            }) {
              if (
                isUntrainedLocked &&
                safeData.characterClass !== 'especialista' &&
                !window.confirm(
                  `A perícia "${skill.name}" é Somente Treinada (p. 41) e você é Destreinado nela. Deseja rolar mesmo assim?`
                )
              ) {
                return;
              }

              let rollMod = totalBonus;
              let peToSpend = 0;
              const suffixParts: string[] = [];
              let sceneEffectToAdd: SceneEffect | undefined = undefined;

              // 1. Eclético / Engenhosidade
              const usedEcletico =
                armedEcleticoDegree > 0 && skill.trainingDegree < armedEcleticoDegree;
              if (usedEcletico) {
                peToSpend += ecleticoCost;
                suffixParts.push(`⚡ Eclético +${armedEcleticoDegree}`);
              }

              // 2. Conhecimento Aplicado
              if (canUseConhecimentoAplicadoHere) {
                peToSpend += 2;
                suffixParts.push('🧠 Conhecimento Aplicado (INT)');
              }

              // 2b. Intuição Paranormal (Ocultista)
              if (armIntuicaoParanormal) {
                const intuicaoBonus = Math.max(effectiveInt, effectivePre);
                rollMod += intuicaoBonus;
                suffixParts.push(`👁️ Intuição Paranormal +${intuicaoBonus}`);
              }

              // 2c. Identificação Paranormal (Ocultista — Ocultismo)
              if (opts?.forceIdentificacaoParanormal && skill.id === 'ocultismo') {
                rollMod += 10;
                suffixParts.push('🔍 Identificação Paranormal +10');
              }

              // 3. Perito
              const usedPerito = Boolean((armPerito || opts?.forcePerito) && isPeritoSkill);
              if (usedPerito) {
                const peritoDieResult = Math.floor(Math.random() * activePeritoDice) + 1;
                rollMod += peritoDieResult;
                peToSpend += peritoCost;
                suffixParts.push(`🎓 Perito +1d${activePeritoDice}: +${peritoDieResult}`);
              }

              // 4. Primeira Impressão (+2d20 na 1ª vez da cena)
              if (isPrimeiraImpressaoEligible) {
                suffixParts.push('✨ Primeira Impressão +2d20');
                if (isInCampaign) {
                  sceneEffectToAdd = {
                    id: 'pwr-scene-primeira-impressao',
                    name: 'Primeira Impressão (Especialista)',
                    source: '1x/Cena',
                    description: '+2d20 usado no 1º teste social/intuição desta cena',
                  };
                }
              }

              // 5. Poder de Origem Armado
              if (armOriginBoost && originObj) {
                const isEligible =
                  (originId === 'academico' && skill.attribute === 'int') ||
                  (originId === 'atleta' &&
                    (skill.attribute === 'for' || skill.attribute === 'agi') &&
                    skill.id !== 'luta' &&
                    skill.id !== 'pontaria') ||
                  originId === 'executivo' ||
                  (originId === 'investigador' && (!faroPistasUsedInScene || !isInCampaign)) ||
                  (originId === 'trabalhador_rural' &&
                    (skill.id === 'adestramento' || skill.id === 'sobrevivencia'));

                if (isEligible) {
                  if (originId === 'investigador' && isInCampaign) {
                    sceneEffectToAdd = {
                      id: 'orig-scene-faro-pistas',
                      name: 'Faro para Pistas (Poder de Investigador)',
                      source: '1x/Cena',
                      description: '+5 usado em teste para procurar pistas nesta cena',
                    };
                  }
                  peToSpend += originObj.powerCost;
                  const originAbActive = abilities.some(
                    (a) => a.id === `orig-${originId}` && a.isActive !== false
                  );
                  if (!originAbActive) {
                    rollMod += 5;
                  }
                  suffixParts.push(`${originObj.powerName} (Poder de ${originObj.name}) +5`);
                }
              }

              if ((peToSpend > 0 || sceneEffectToAdd) && onSpendResource) {
                if (!onSpendResource(peToSpend, sceneEffectToAdd)) {
                  setArmOriginBoost(false);
                  return;
                }
              }

              if (usedEcletico) setArmedEcleticoDegree(0);
              if (canUseConhecimentoAplicadoHere) setArmConhecimentoAplicado(false);
              if (armIntuicaoParanormal) setArmIntuicaoParanormal(false);
              if (usedPerito) setArmPerito(false);
              if (armOriginBoost) setArmOriginBoost(false);

              if (applyMissingKitPenalty) {
                suffixParts.push('Sem Kit -5');
              }
              if (isInterludePhysSkill) {
                suffixParts.push('🏋️ Exercitar-se +1d20');
                adjustInterludeDice('physical', -1);
                setArmInterludePhysical(false);
              } else if (isInterludeMentSkill) {
                suffixParts.push('📚 Ler +1d20');
                adjustInterludeDice('mental', -1);
                setArmInterludeMental(false);
              }

              const rollSuffix =
                suffixParts.length > 0 ? ` [${suffixParts.join(' • ')}]` : '';
              onRoll(
                `Perícia: ${skill.name}${rollSuffix}`,
                rawDiceCount,
                20,
                rollMod,
                buildCursePricePromptForAttr(skill.attribute)
              );
            }

            return (
              <div
                key={skill.id}
                title={meta?.summary || skill.name}
                className="bg-zinc-950 border border-zinc-800/80 rounded-lg px-3 py-2 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleExecuteSkillRoll()}
                    className={`px-2.5 py-1 border rounded text-xs font-mono font-bold transition cursor-pointer shrink-0 ${
                      isUntrainedLocked
                        ? 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:border-amber-600 hover:text-amber-300'
                        : 'bg-zinc-900 hover:bg-amber-600 text-amber-400 hover:text-white border-zinc-700'
                    }`}
                  >
                    🎲 {rawDiceCount <= 0 ? '2d20(menor)' : `${rawDiceCount}d20`}
                    {totalBonus >= 0 ? `+${totalBonus}` : totalBonus}
                  </button>

                  {isPeritoSkill && hasPerito && (
                    <button
                      type="button"
                      onClick={() => handleExecuteSkillRoll({ forcePerito: true })}
                      title={`Rolar ${skill.name} somando Perito +1d${activePeritoDice} (-${peritoCost} PE)`}
                      className="px-2 py-1 bg-blue-950/70 hover:bg-blue-600 text-blue-200 hover:text-white border border-blue-700/70 rounded text-[10px] font-mono font-bold transition cursor-pointer shrink-0"
                    >
                      🎓 +1d{activePeritoDice} (-{peritoCost} PE)
                    </button>
                  )}

                  {skill.id === 'ocultismo' && hasIdentificacaoParanormal && (
                    <button
                      type="button"
                      onClick={() =>
                        handleExecuteSkillRoll({ forceIdentificacaoParanormal: true })
                      }
                      title="Identificação Paranormal: +10 em Ocultismo para identificar criaturas, objetos ou rituais"
                      className="px-2 py-1 bg-purple-950/70 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-700/70 rounded text-[10px] font-mono font-bold transition cursor-pointer shrink-0"
                    >
                      🔍 Identificar (+10)
                    </button>
                  )}

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1">
                      <p className="text-sm font-semibold text-zinc-200 truncate">
                        {skill.name}
                      </p>
                      {meta?.trainedOnly && (
                        <span
                          className="text-[9px] font-bold px-1 rounded bg-zinc-900 text-zinc-400 border border-zinc-800"
                          title="Somente Treinada"
                        >
                          🔒
                        </span>
                      )}
                      {meta?.armorPenalty && (
                        <span
                          className={`text-[9px] font-bold px-1 rounded border ${
                            isOverloaded
                              ? 'bg-red-950 text-red-300 border-red-800'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          }`}
                          title="Penalidade de Carga (-5 se sobrecarregado)"
                        >
                          🏋️{isOverloaded ? ' -5' : ''}
                        </span>
                      )}
                      {meta?.requiresKit && (
                        isMissingKit ? (
                          <button
                            type="button"
                            onClick={() =>
                              setIgnoreMissingKitBySkill((prev) => ({
                                ...prev,
                                [skill.id]: !prev[skill.id],
                              }))
                            }
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border cursor-pointer transition ${
                              applyMissingKitPenalty
                                ? 'bg-red-950 text-red-300 border-red-700 hover:bg-red-900'
                                : 'bg-zinc-900 text-amber-300 border-amber-700/60 hover:bg-zinc-800'
                            }`}
                            title={
                              applyMissingKitPenalty
                                ? 'Sem Kit na mochila (-5 aplicado). Clique para dispensar o -5 se esta ação específica não exigir kit.'
                                : 'Sem Kit na mochila (-5 dispensado manualmente para esta ação). Clique para reativar -5.'
                            }
                          >
                            {applyMissingKitPenalty ? '🧰 Sem Kit (-5)' : '🧰 Sem Kit (0)'}
                          </button>
                        ) : (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/70"
                            title="Kit de Perícia ou Acessório Instrumental presente na mochila!"
                          >
                            🧰 Kit OK
                          </span>
                        )
                      )}
                      {isPeritoSkill && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                          🎓 Perito
                        </span>
                      )}
                      {isPrimeiraImpressaoEligible && (
                        <span
                          className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700"
                          title="Primeira Impressão: +2d20 no primeiro teste social/intuição da cena"
                        >
                          ✨ 1ª Impressão (+2d20)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-mono text-zinc-500">
                        {attrForSkill.toUpperCase()}
                      </span>
                      {(autoBonus !== 0 || extraDice !== 0) && (
                        <span className="text-[10px] font-mono text-emerald-400">
                          [Efeito: {extraDice !== 0 ? `${extraDice > 0 ? '+' : ''}${extraDice}d20 ` : ''}
                          {autoBonus !== 0 ? `${autoBonus > 0 ? '+' : ''}${autoBonus}` : ''}]
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {allowSkillEdit ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <select
                      value={skill.trainingDegree}
                      onChange={(e) =>
                        handleSkillChange(skill.id, {
                          trainingDegree: Number(e.target.value) as 0 | 5 | 10 | 15,
                        })
                      }
                      className="bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-xs text-white"
                    >
                      <option value={0}>Destreinado (+0)</option>
                      <option value={5}>Treinado (+5)</option>
                      <option value={10}>Veterano (+10)</option>
                      <option value={15}>Expert (+15)</option>
                    </select>
                    <input
                      type="number"
                      value={skill.otherModifier}
                      onChange={(e) =>
                        handleSkillChange(skill.id, { otherModifier: Number(e.target.value) })
                      }
                      title="Outros Bônus Manuais"
                      className="w-12 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-xs text-center font-mono text-white"
                    />
                  </div>
                ) : (
                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded ${
                        skill.trainingDegree > 0
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
                          : 'text-zinc-500'
                      }`}
                    >
                      {skill.trainingDegree === 15
                        ? 'Expert (+15)'
                        : skill.trainingDegree === 10
                        ? 'Veterano (+10)'
                        : skill.trainingDegree === 5
                        ? 'Treinado (+5)'
                        : 'Destreinado'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
