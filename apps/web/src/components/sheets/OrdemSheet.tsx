import { useState } from 'react';
import {
  OrdemSheetData,
  OrdemAttributes,
  OrdemSkill,
  CharacterAbility,
  SceneEffect,
  createDefaultOrdemSheet,
  ComputedBonuses,
  SystemSkillDefinition,
  ORDEM_ORIGINS,
  ORDEM_TRAILS,
  ORDEM_PATENTS,
  ORDEM_SKILLS_METADATA,
  getOrdemPeLimit,
  getOrdemRitualDT,
  getOrdemEffectiveCredit,
} from '@totalrpg/shared';

interface OrdemSheetProps {
  data: OrdemSheetData;
  bonuses: ComputedBonuses;
  customSkills: SystemSkillDefinition[];
  abilities?: CharacterAbility[];
  isOverloaded?: boolean;
  isEditMode: boolean;
  canEditAttributes: boolean;
  canEditAbilities: boolean;
  onChange: (updated: OrdemSheetData) => void;
  onSyncTrailAbilities?: (trailId: string, nex: number) => void;
  onOpenNexEvolution?: () => void;
  onOpenInterlude?: () => void;
  onCheckResource?: (amount: number, powerLabel?: string) => boolean;
  onSpendResource?: (amount: number, extraSceneEffect?: SceneEffect) => boolean;
  onRoll: (label: string, count: number, sides: number, modifier: number) => void;
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
  isOverloaded = false,
  isEditMode,
  canEditAttributes,
  canEditAbilities,
  onChange,
  onSyncTrailAbilities,
  onOpenNexEvolution,
  onOpenInterlude,
  onCheckResource,
  onSpendResource,
  onRoll,
}: OrdemSheetProps) {
  const [armOriginBoost, setArmOriginBoost] = useState(false);

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

  const effectiveAgi = safeData.attributes.agi + (bonuses.attributes['agi'] || 0);
  const effectiveInt = safeData.attributes.int + (bonuses.attributes['int'] || 0);
  const effectivePre = safeData.attributes.pre + (bonuses.attributes['pre'] || 0);

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
  const faroPistasUsedInScene = sceneEffects.some((e) => e.id === 'orig-scene-faro-pistas');
  const impostorUsedInScene = sceneEffects.some((e) => e.id === 'orig-scene-impostor');

  // Defesa em Ordem Paranormal: 10 + AGI + Bônus - 5 se sobrecarregado
  const overloadPenalty = isOverloaded ? -5 : 0;
  const totalDefense = 10 + effectiveAgi + bonuses.defense + overloadPenalty;

  // Limite de PE/turno e DT de Rituais automáticos (v1.3)
  const peLimitPerTurn = getOrdemPeLimit(safeData.nex, safeData.origin, abilities);
  const ritualDT = getOrdemRitualDT(
    safeData.nex,
    effectivePre,
    safeData.trail,
    abilities,
    safeData.origin
  );
  const effectiveDisplacement = Math.max(
    0,
    (safeData.displacement || 9) - (isOverloaded ? 3 : 0)
  );

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

          {/* Afinidade Elemental (50%+) e Cena de Interlúdio (Exclusivo do Mestre) */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1">
              {onOpenInterlude ? 'Afinidade / Interlúdio' : 'Afinidade (50%+)'}
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
              {onOpenInterlude && (
                <button
                  type="button"
                  onClick={onOpenInterlude}
                  className="px-2.5 py-1 bg-indigo-950/80 hover:bg-indigo-800 text-indigo-200 border border-indigo-700 rounded-lg text-xs font-bold transition cursor-pointer"
                  title="Exclusivo do Mestre: Aplicar recuperação de Cena de Interlúdio"
                >
                  🌙 Cena de Interlúdio
                </button>
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

          <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 flex items-center justify-between">
            <div>
              <span className="block text-[10px] uppercase font-bold text-amber-400">
                ⚡ Limite de PE / Turno
              </span>
              <span className="text-[10px] text-zinc-500">
                Máx. de PE gasto por rodada
              </span>
            </div>
            <span className="text-xl font-black font-mono text-amber-300">
              {peLimitPerTurn} PE
            </span>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 flex items-center justify-between">
            <div>
              <span className="block text-[10px] uppercase font-bold text-purple-400">
                🔮 DT de Rituais / Poderes
              </span>
              <span className="text-[10px] text-zinc-500">
                10 + Limite Base + PRE ({effectivePre})
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

        {/* Indicadores Passivos Especiais da Origem (Teórico da Conspiração, etc.) */}
        {isTeoricoConspiracao && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="px-2.5 py-1 rounded-lg bg-cyan-950/70 border border-cyan-700/70 text-cyan-200 text-xs font-bold">
              🧠 Eu Já Sabia (Teórico da Conspiração): Resistência a Dano Mental = {mentalResistance} (Intelecto)
            </span>
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

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(Object.keys(ATTRIBUTE_LABELS) as Array<keyof OrdemAttributes>).map((attrKey) => {
            const baseVal = safeData.attributes[attrKey];
            const modVal = bonuses.attributes[attrKey] || 0;
            const effectiveVal = baseVal + modVal;
            const extraDice = bonuses.skillDiceAll + (bonuses.skillDice[attrKey] || 0);
            const rawTotalDice = effectiveVal + extraDice;

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
                      labelSuffix = ' [Saber é Poder +5]';
                      setArmOriginBoost(false);
                    }
                    onRoll(
                      `Teste de ${ATTRIBUTE_LABELS[attrKey]}${labelSuffix}`,
                      rawTotalDice,
                      20,
                      attrMod
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
                    !onSpendResource(2, {
                      id: 'orig-scene-impostor',
                      name: 'Impostor (Poder de Trambiqueiro)',
                      source: '1x/Cena',
                      description: 'Teste de perícia substituído por Enganação nesta cena',
                    })
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[500px] overflow-y-auto pr-1">
          {safeData.skills.map((skill) => {
            const meta = ORDEM_SKILLS_METADATA.find((m) => m.id === skill.id);
            const baseAttr =
              safeData.attributes[skill.attribute] +
              (bonuses.attributes[skill.attribute] || 0);
            const extraDice = bonuses.skillDiceAll + (bonuses.skillDice[skill.id] || 0);
            const rawDiceCount = baseAttr + extraDice;

            const autoBonus = bonuses.skillBonusAll + (bonuses.skillBonus[skill.id] || 0);
            const loadSkillPenalty = meta?.armorPenalty && isOverloaded ? -5 : 0;
            const totalBonus =
              skill.trainingDegree + skill.otherModifier + autoBonus + loadSkillPenalty;

            const isUntrainedLocked =
              Boolean(meta?.trainedOnly) && skill.trainingDegree === 0;
            const isPeritoSkill = (safeData.peritoSkills || []).includes(skill.id);

            return (
              <div
                key={skill.id}
                title={meta?.summary || skill.name}
                className="bg-zinc-950 border border-zinc-800/80 rounded-lg px-3 py-2 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => {
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
                      let rollSuffix = '';

                      if (armOriginBoost && originObj) {
                        const isEligible =
                          (originId === 'academico' && skill.attribute === 'int') ||
                          (originId === 'atleta' &&
                            (skill.attribute === 'for' || skill.attribute === 'agi') &&
                            skill.id !== 'luta' &&
                            skill.id !== 'pontaria') ||
                          originId === 'executivo' ||
                          (originId === 'investigador' && !faroPistasUsedInScene) ||
                          (originId === 'trabalhador_rural' &&
                            (skill.id === 'adestramento' || skill.id === 'sobrevivencia'));

                        if (isEligible) {
                          const extraSceneEffect: SceneEffect | undefined =
                            originId === 'investigador'
                              ? {
                                  id: 'orig-scene-faro-pistas',
                                  name: 'Faro para Pistas (Poder de Investigador)',
                                  source: '1x/Cena',
                                  description: '+5 usado em teste para procurar pistas nesta cena',
                                }
                              : undefined;

                          if (
                            onSpendResource &&
                            !onSpendResource(originObj.powerCost, extraSceneEffect)
                          ) {
                            setArmOriginBoost(false);
                            return;
                          }
                          const originAbActive = abilities.some(
                            (a) => a.id === `orig-${originId}` && a.isActive !== false
                          );
                          if (!originAbActive) {
                            rollMod += 5;
                          }
                          rollSuffix = ` [${originObj.powerName} (Poder de ${originObj.name}) +5]`;
                          setArmOriginBoost(false);
                        }
                      }

                      onRoll(`Perícia: ${skill.name}${rollSuffix}`, rawDiceCount, 20, rollMod);
                    }}
                    className={`px-2.5 py-1 border rounded text-xs font-mono font-bold transition cursor-pointer shrink-0 ${
                      isUntrainedLocked
                        ? 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:border-amber-600 hover:text-amber-300'
                        : 'bg-zinc-900 hover:bg-amber-600 text-amber-400 hover:text-white border-zinc-700'
                    }`}
                  >
                    🎲 {rawDiceCount <= 0 ? '2d20(menor)' : `${rawDiceCount}d20`}
                    {totalBonus >= 0 ? `+${totalBonus}` : totalBonus}
                  </button>

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
                        <span
                          className="text-[9px] font-bold px-1 rounded bg-zinc-900 text-zinc-400 border border-zinc-800"
                          title="Requer Kit de Perícia para certas ações (sem kit: -5)"
                        >
                          🧰
                        </span>
                      )}
                      {isPeritoSkill && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                          🎓 Perito
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-mono text-zinc-500">
                        {skill.attribute.toUpperCase()}
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
