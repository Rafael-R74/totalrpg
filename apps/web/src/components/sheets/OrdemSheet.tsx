import { OrdemSheetData, OrdemAttributes, OrdemSkill, createDefaultOrdemSheet } from '@totalrpg/shared';

interface OrdemSheetProps {
  data: OrdemSheetData;
  isEditMode: boolean;
  canEditAttributes: boolean;
  canEditAbilities: boolean;
  onChange: (updated: OrdemSheetData) => void;
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
  isEditMode,
  canEditAttributes,
  canEditAbilities,
  onChange,
  onRoll,
}: OrdemSheetProps) {
  const fallback = createDefaultOrdemSheet().sheetData;
  const safeData: OrdemSheetData = {
    ...fallback,
    ...data,
    attributes: { ...fallback.attributes, ...(data?.attributes || {}) },
    skills: data?.skills && data.skills.length > 0 ? data.skills : fallback.skills,
  };

  const allowAttrEdit = isEditMode && canEditAttributes;
  const allowSkillEdit = isEditMode && canEditAbilities;

  // Atualiza um atributo específico
  function handleAttributeChange(key: keyof OrdemAttributes, value: number) {
    onChange({
      ...safeData,
      attributes: {
        ...safeData.attributes,
        [key]: Math.max(0, Math.min(10, value)),
      },
    });
  }

  // Atualiza uma perícia específica
  function handleSkillChange(skillId: string, changes: Partial<OrdemSkill>) {
    const updatedSkills = safeData.skills.map((sk) =>
      sk.id === skillId ? { ...sk, ...changes } : sk
    );
    onChange({ ...safeData, skills: updatedSkills });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho Biográfico: Origem, Classe, NEX e Patente */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-zinc-900 p-4 rounded-xl border border-zinc-800">
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Origem</label>
          {allowAttrEdit ? (
            <input
              type="text"
              value={safeData.origin}
              onChange={(e) => onChange({ ...safeData, origin: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
            />
          ) : (
            <p className="text-sm font-semibold text-white">{safeData.origin}</p>
          )}
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Classe</label>
          {allowAttrEdit ? (
            <select
              value={safeData.characterClass}
              onChange={(e) =>
                onChange({
                  ...safeData,
                  characterClass: e.target.value as OrdemSheetData['characterClass'],
                })
              }
              className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
            >
              <option value="combatente">Combatente</option>
              <option value="especialista">Especialista</option>
              <option value="ocultista">Ocultista</option>
              <option value="mundano">Mundano</option>
            </select>
          ) : (
            <p className="text-sm font-semibold text-amber-400 uppercase">{safeData.characterClass}</p>
          )}
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1">NEX (%)</label>
          {allowAttrEdit ? (
            <input
              type="number"
              min={0}
              max={99}
              step={5}
              value={safeData.nex}
              onChange={(e) => onChange({ ...safeData, nex: Number(e.target.value) })}
              className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm text-white font-mono"
            />
          ) : (
            <p className="text-sm font-mono font-bold text-white">{safeData.nex}%</p>
          )}
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Patente</label>
          {allowAttrEdit ? (
            <input
              type="text"
              value={safeData.patent}
              onChange={(e) => onChange({ ...safeData, patent: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
            />
          ) : (
            <p className="text-sm font-semibold text-white">{safeData.patent}</p>
          )}
        </div>
      </div>

      {/* Painel de atributos */}
      <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500">
            Pentágono de Atributos
          </h3>
          <span className="text-xs text-zinc-500">
            {allowAttrEdit ? 'Modo Edição: altere os valores base' : 'Modo Jogo: clique em um atributo para rolar d20'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(Object.keys(ATTRIBUTE_LABELS) as Array<keyof OrdemAttributes>).map((attrKey) => {
            const val = safeData.attributes[attrKey];
            return (
              <div
                key={attrKey}
                onClick={() => {
                  if (!allowAttrEdit) {
                    onRoll(`Teste de ${ATTRIBUTE_LABELS[attrKey]}`, Math.max(1, val), 20, 0);
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
                    value={val}
                    onChange={(e) => handleAttributeChange(attrKey, Number(e.target.value))}
                    className="w-16 text-center bg-zinc-900 border border-zinc-700 rounded-lg py-1 mt-1 text-xl font-bold font-mono text-white"
                  />
                ) : (
                  <span className="text-3xl font-extrabold font-mono text-white mt-1">{val}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabela de Perícias */}
      <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
        <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500 mb-4">
          Perícias ({safeData.skills.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[460px] overflow-y-auto pr-1">
          {safeData.skills.map((skill) => {
            const diceCount = Math.max(1, safeData.attributes[skill.attribute]);
            const totalBonus = skill.trainingDegree + skill.otherModifier;

            return (
              <div
                key={skill.id}
                className="bg-zinc-950 border border-zinc-800/80 rounded-lg px-3 py-2 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onRoll(`Perícia: ${skill.name}`, diceCount, 20, totalBonus)}
                    className="px-2.5 py-1 bg-zinc-900 hover:bg-amber-600 text-amber-400 hover:text-white border border-zinc-700 rounded text-xs font-mono font-bold transition cursor-pointer"
                    title="Rolar perícia"
                  >
                    🎲 {diceCount}d20{totalBonus >= 0 ? `+${totalBonus}` : totalBonus}
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">{skill.name}</p>
                    <span className="text-[10px] uppercase font-mono text-zinc-500">
                      Atributo: {skill.attribute.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Controles de Grau de Treinamento e Outros */}
                {allowSkillEdit ? (
                  <div className="flex items-center gap-1.5">
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
                      title="Outros Bônus"
                      className="w-12 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-xs text-center font-mono text-white"
                    />
                  </div>
                ) : (
                  <div className="text-right">
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