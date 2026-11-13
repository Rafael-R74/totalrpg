import {
  OrdemSheetData,
  OrdemAttributes,
  OrdemSkill,
  CharacterAbility,
  createDefaultOrdemSheet,
  ComputedBonuses,
  SystemSkillDefinition,
  ORDEM_ORIGINS,
  ORDEM_TRAILS,
  ORDEM_PATENTS,
  ORDEM_SKILLS_METADATA,
  getOrdemPeLimit,
  getOrdemRitualDT,
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
  onRoll,
}: OrdemSheetProps) {
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
  const effectivePre = safeData.attributes.pre + (bonuses.attributes['pre'] || 0);

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
          {/* Origem */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1">
              Origem
            </label>
            {allowAttrEdit ? (
              <select
                value={safeData.origin}
                onChange={(e) => onChange({ ...safeData, origin: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white"
              >
                {ORDEM_ORIGINS.map((o) => (
                  <option key={o.id} value={o.name}>
                    {o.name} ({o.powerName})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm font-semibold text-white">{safeData.origin}</p>
            )}
          </div>

          {/* Classe */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1">
              Classe
            </label>
            {allowAttrEdit ? (
              <select
                value={safeData.characterClass}
                onChange={(e) =>
                  onChange({
                    ...safeData,
                    characterClass: e.target.value as OrdemSheetData['characterClass'],
                    trail: undefined,
                  })
                }
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white"
              >
                <option value="combatente">Combatente</option>
                <option value="especialista">Especialista</option>
                <option value="ocultista">Ocultista</option>
                <option value="mundano">Mundano (0%)</option>
              </select>
            ) : (
              <p className="text-sm font-semibold text-amber-400 uppercase">
                {safeData.characterClass}
              </p>
            )}
          </div>

          {/* Trilha (10%+) */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1">
              Trilha (NEX 10%+)
            </label>
            {allowAttrEdit && safeData.characterClass !== 'mundano' ? (
              <div className="flex gap-1">
                <select
                  value={safeData.trail || ''}
                  onChange={(e) => {
                    const nextTrail = e.target.value || undefined;
                    onChange({ ...safeData, trail: nextTrail });
                    if (nextTrail && onSyncTrailAbilities) {
                      onSyncTrailAbilities(nextTrail, safeData.nex);
                    }
                  }}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white"
                >
                  <option value="">-- Sem Trilha --</option>
                  {classTrails.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-sm font-semibold text-amber-300">
                {activeTrailObj ? activeTrailObj.name : safeData.nex >= 10 ? 'Não escolhida' : 'Bloqueada (<10%)'}
              </p>
            )}
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

          {/* Patente & Prestígio */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1">
              Patente & Prestígio
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
              <p className="text-sm font-semibold text-white">
                {safeData.patent}{' '}
                <span className="text-xs font-mono text-zinc-400">
                  ({safeData.prestigePoints ?? 0} PP)
                </span>
              </p>
            )}
          </div>

          {/* Afinidade Elemental (50%+) ou Cena de Interlúdio */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1">
              {safeData.nex >= 50 ? 'Afinidade (50%+)' : 'Descanso / Interlúdio'}
            </label>
            {safeData.nex >= 50 && allowAttrEdit ? (
              <select
                value={safeData.affinity || ''}
                onChange={(e) =>
                  onChange({ ...safeData, affinity: e.target.value || undefined })
                }
                className="w-full bg-zinc-950 border border-purple-500/50 rounded px-2 py-1.5 text-xs text-purple-200"
              >
                <option value="">-- Sem Afinidade --</option>
                <option value="Sangue">🩸 Sangue</option>
                <option value="Morte">💀 Morte</option>
                <option value="Conhecimento">👁️ Conhecimento</option>
                <option value="Energia">⚡ Energia</option>
              </select>
            ) : (
              <div className="flex items-center gap-2">
                {safeData.affinity && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700">
                    {safeData.affinity}
                  </span>
                )}
                {onOpenInterlude && (
                  <button
                    type="button"
                    onClick={onOpenInterlude}
                    className="px-2.5 py-1 bg-indigo-950/80 hover:bg-indigo-800 text-indigo-200 border border-indigo-700 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    🌙 Cena de Interlúdio
                  </button>
                )}
              </div>
            )}
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
                10 + Limite PE ({peLimitPerTurn}) + PRE ({effectivePre})
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
                {isOverloaded ? '⚠️ Reduzido (-3m sobrecarga)' : 'Padrão da cena'}
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
                    onRoll(`Teste de ${ATTRIBUTE_LABELS[attrKey]}`, rawTotalDice, 20, 0);
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
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
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
                      onRoll(`Perícia: ${skill.name}`, rawDiceCount, 20, totalBonus);
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
