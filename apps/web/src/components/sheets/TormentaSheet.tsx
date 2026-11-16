import {
  T20SheetData,
  T20Attributes,
  T20Skill,
  createDefaultT20Sheet,
  ComputedBonuses,
  SystemSkillDefinition,
} from '@totalrpg/shared';

interface TormentaSheetProps {
  data: T20SheetData;
  bonuses: ComputedBonuses;
  customSkills: SystemSkillDefinition[];
  isEditMode: boolean;
  canEditAttributes: boolean;
  canEditAbilities: boolean;
  onChange: (updated: T20SheetData) => void;
  onRoll: (label: string, count: number, sides: number, modifier: number) => void;
}

const T20_ATTR_LABELS: Record<keyof T20Attributes, { short: string; full: string }> = {
  forca: { short: 'FOR', full: 'Força' },
  destreza: { short: 'DES', full: 'Destreza' },
  constituicao: { short: 'CON', full: 'Constituição' },
  inteligencia: { short: 'INT', full: 'Inteligência' },
  sabedoria: { short: 'SAB', full: 'Sabedoria' },
  carisma: { short: 'CAR', full: 'Carisma' },
};

export function TormentaSheet({
  data,
  bonuses,
  customSkills,
  isEditMode,
  canEditAttributes,
  canEditAbilities,
  onChange,
  onRoll,
}: TormentaSheetProps) {
  const fallback = createDefaultT20Sheet().sheetData;
  const baseSkills = data?.skills && data.skills.length > 0 ? data.skills : fallback.skills;

  const mergedSkills: T20Skill[] = [...baseSkills];
  for (const cs of customSkills) {
    if (!mergedSkills.some((s) => s.id === cs.skillKey)) {
      mergedSkills.push({
        id: cs.skillKey,
        name: cs.name,
        attribute: (cs.defaultAttribute as keyof T20Attributes) || 'inteligencia',
        isTrained: false,
        otherModifier: 0,
      });
    }
  }

  const safeData: T20SheetData = {
    ...fallback,
    ...data,
    attributes: { ...fallback.attributes, ...(data?.attributes || {}) },
    skills: mergedSkills,
  };

  const allowAttrEdit = isEditMode && canEditAttributes;
  const allowSkillEdit = isEditMode && canEditAbilities;

  const halfLevel = Math.floor(safeData.level / 2);
  const trainingBonusValue = safeData.level >= 15 ? 6 : safeData.level >= 7 ? 4 : 2;

  const effectiveDes = safeData.attributes.destreza + (bonuses.attributes['destreza'] || 0);
  const totalDefense = 10 + effectiveDes + bonuses.defense;

  function handleAttributeChange(key: keyof T20Attributes, value: number) {
    onChange({
      ...safeData,
      attributes: {
        ...safeData.attributes,
        [key]: Math.max(-5, Math.min(20, value)),
      },
    });
  }

  function handleSkillChange(skillId: string, changes: Partial<T20Skill>) {
    const updatedSkills = safeData.skills.map((sk) =>
      sk.id === skillId ? { ...sk, ...changes } : sk
    );
    onChange({ ...safeData, skills: updatedSkills });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho Biográfico + Defesa Calculada */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 bg-zinc-900 p-4 rounded-xl border border-zinc-800">
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Raça</label>
          <p className="text-sm font-semibold text-white">{safeData.race}</p>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Classe</label>
          <p className="text-sm font-semibold text-amber-400">{safeData.characterClass}</p>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Nível</label>
          {allowAttrEdit ? (
            <input
              type="number"
              min={1}
              max={20}
              value={safeData.level}
              onChange={(e) =>
                onChange({ ...safeData, level: Math.max(1, Math.min(20, Number(e.target.value))) })
              }
              className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm text-white font-mono"
            />
          ) : (
            <p className="text-sm font-mono font-bold text-white">
              Nv {safeData.level} <span className="text-xs text-zinc-500">(+{halfLevel})</span>
            </p>
          )}
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Origem</label>
          <p className="text-sm font-semibold text-white">{safeData.origin}</p>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Divindade</label>
          {allowAttrEdit ? (
            <input
              type="text"
              value={safeData.deity}
              onChange={(e) => onChange({ ...safeData, deity: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
            />
          ) : (
            <p className="text-sm font-semibold text-red-400">{safeData.deity || 'Nenhuma'}</p>
          )}
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 flex flex-col justify-center items-center">
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">🛡️ Defesa</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-extrabold font-mono text-red-400">{totalDefense}</span>
            {bonuses.defense !== 0 && (
              <span className="text-[10px] font-mono text-emerald-400">
                ({bonuses.defense >= 0 ? `+${bonuses.defense}` : bonuses.defense})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Atributos de T20 com Modificadores */}
      <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-red-500">
            Atributos (Tormenta 20)
          </h3>
          <span className="text-xs text-zinc-500">
            {allowAttrEdit ? 'Modo Edição ativo' : 'Modo Jogo: clique para rolar 1d20 + Atributo'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          {(Object.keys(T20_ATTR_LABELS) as Array<keyof T20Attributes>).map((attrKey) => {
            const baseVal = safeData.attributes[attrKey];
            const modVal = bonuses.attributes[attrKey] || 0;
            const effectiveVal = baseVal + modVal;
            const info = T20_ATTR_LABELS[attrKey];

            return (
              <div
                key={attrKey}
                onClick={() => {
                  if (!allowAttrEdit) {
                    onRoll(`Teste de ${info.full}`, 1, 20, effectiveVal);
                  }
                }}
                className={`bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex flex-col items-center justify-center gap-1 transition ${
                  !allowAttrEdit ? 'hover:border-red-500 cursor-pointer group' : ''
                }`}
              >
                <span className="text-xs font-extrabold uppercase tracking-widest text-red-400">
                  {info.short}
                </span>
                <span className="text-[11px] text-zinc-500">{info.full}</span>

                {allowAttrEdit ? (
                  <input
                    type="number"
                    min={-5}
                    max={20}
                    value={baseVal}
                    onChange={(e) => handleAttributeChange(attrKey, Number(e.target.value))}
                    className="w-16 text-center bg-zinc-900 border border-zinc-700 rounded-lg py-1 mt-1 text-xl font-bold font-mono text-white"
                  />
                ) : (
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-extrabold font-mono text-white">
                      {effectiveVal >= 0 ? `+${effectiveVal}` : effectiveVal}
                    </span>
                    {modVal !== 0 && (
                      <span className={`text-xs font-mono ${modVal > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ({modVal > 0 ? `+${modVal}` : modVal})
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Perícias de T20 com Modificadores Automáticos */}
      <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-red-500">
            Perícias ({safeData.skills.length})
          </h3>
          <span className="text-xs font-mono text-zinc-400">
            Bônus de Treino no Nível {safeData.level}: +{trainingBonusValue}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[460px] overflow-y-auto pr-1">
          {safeData.skills.map((skill) => {
            const attrValue =
              safeData.attributes[skill.attribute] + (bonuses.attributes[skill.attribute] || 0);
            const trainBonus = skill.isTrained ? trainingBonusValue : 0;
            const autoBonus = bonuses.skillBonusAll + (bonuses.skillBonus[skill.id] || 0);
            const totalModifier = halfLevel + attrValue + trainBonus + skill.otherModifier + autoBonus;

            return (
              <div
                key={skill.id}
                className="bg-zinc-950 border border-zinc-800/80 rounded-lg px-3 py-2 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onRoll(`Perícia: ${skill.name}`, 1, 20, totalModifier)}
                    className="px-2.5 py-1 bg-zinc-900 hover:bg-red-700 text-red-400 hover:text-white border border-zinc-700 rounded text-xs font-mono font-bold transition cursor-pointer"
                  >
                    🎲 1d20{totalModifier >= 0 ? `+${totalModifier}` : totalModifier}
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">{skill.name}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-mono text-zinc-500">
                        {T20_ATTR_LABELS[skill.attribute]?.short || 'INT'} (
                        {attrValue >= 0 ? `+${attrValue}` : attrValue})
                      </span>
                      {autoBonus !== 0 && (
                        <span className="text-[10px] font-mono text-emerald-400">
                          [Efeito: {autoBonus > 0 ? `+${autoBonus}` : autoBonus}]
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {allowSkillEdit ? (
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={skill.isTrained}
                        onChange={(e) => handleSkillChange(skill.id, { isTrained: e.target.checked })}
                      />
                      Treinada
                    </label>
                    <input
                      type="number"
                      value={skill.otherModifier}
                      onChange={(e) =>
                        handleSkillChange(skill.id, { otherModifier: Number(e.target.value) })
                      }
                      className="w-12 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-xs text-center font-mono text-white"
                    />
                  </div>
                ) : (
                  <div>
                    {skill.isTrained && (
                      <span className="text-[10px] font-bold uppercase bg-red-950/60 text-red-400 border border-red-800/60 px-2 py-0.5 rounded">
                        Treinada (+{trainingBonusValue})
                      </span>
                    )}
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