import { T20SheetData, T20Attributes, T20Skill, createDefaultT20Sheet } from '@totalrpg/shared';

interface TormentaSheetProps {
  data: T20SheetData;
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
  isEditMode,
  canEditAttributes,
  canEditAbilities,
  onChange,
  onRoll,
}: TormentaSheetProps) {
  const fallback = createDefaultT20Sheet().sheetData;
  const safeData: T20SheetData = {
    ...fallback,
    ...data,
    attributes: { ...fallback.attributes, ...(data?.attributes || {}) },
    skills: data?.skills && data.skills.length > 0 ? data.skills : fallback.skills,
  };

  const allowAttrEdit = isEditMode && canEditAttributes;
  const allowSkillEdit = isEditMode && canEditAbilities;

  // Metade do nível arredondado para baixo, usado no cálculo de perícias
  const halfLevel = Math.floor(safeData.level / 2);

  // Bonus de pericia por nível
  const trainingBonusValue = safeData.level >= 15 ? 6 : safeData.level >= 7 ? 4 : 2;

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
      {/* Cabeçalho Biográfico: Raça, Classe, Nível, Origem e Divindade */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-zinc-900 p-4 rounded-xl border border-zinc-800">
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Raça</label>
          {allowAttrEdit ? (
            <input
              type="text"
              value={safeData.race}
              onChange={(e) => onChange({ ...safeData, race: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
            />
          ) : (
            <p className="text-sm font-semibold text-white">{safeData.race}</p>
          )}
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Classe</label>
          {allowAttrEdit ? (
            <input
              type="text"
              value={safeData.characterClass}
              onChange={(e) => onChange({ ...safeData, characterClass: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
            />
          ) : (
            <p className="text-sm font-semibold text-amber-400">{safeData.characterClass}</p>
          )}
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
              Nível {safeData.level} <span className="text-xs text-zinc-500">(+1/2 nv: +{halfLevel})</span>
            </p>
          )}
        </div>

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
      </div>

      {/* Atributos de Tormenta 20 */}
      <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-red-500">
            Atributos (Tormenta 20 - Jogo do Ano)
          </h3>
          <span className="text-xs text-zinc-500">
            {allowAttrEdit ? 'Modo Edição ativo' : 'Modo Jogo: clique no atributo para rolar 1d20 + Atributo'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          {(Object.keys(T20_ATTR_LABELS) as Array<keyof T20Attributes>).map((attrKey) => {
            const val = safeData.attributes[attrKey];
            const info = T20_ATTR_LABELS[attrKey];

            return (
              <div
                key={attrKey}
                onClick={() => {
                  if (!allowAttrEdit) {
                    onRoll(`Teste de ${info.full}`, 1, 20, val);
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
                    value={val}
                    onChange={(e) => handleAttributeChange(attrKey, Number(e.target.value))}
                    className="w-16 text-center bg-zinc-900 border border-zinc-700 rounded-lg py-1 mt-1 text-xl font-bold font-mono text-white"
                  />
                ) : (
                  <span className="text-2xl font-extrabold font-mono text-white mt-1">
                    {val >= 0 ? `+${val}` : val}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista de Perícias com Cálculo Automático de Nível e Treino */}
      <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-red-500">
            Perícias de Arton
          </h3>
          <span className="text-xs font-mono text-zinc-400">
            Bônus de Treino no Nível {safeData.level}: +{trainingBonusValue}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[460px] overflow-y-auto pr-1">
          {safeData.skills.map((skill) => {
            const attrValue = safeData.attributes[skill.attribute];
            const trainBonus = skill.isTrained ? trainingBonusValue : 0;
            const totalModifier = halfLevel + attrValue + trainBonus + skill.otherModifier;

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
                    <span className="text-[10px] uppercase font-mono text-zinc-500">
                      {T20_ATTR_LABELS[skill.attribute].short} ({attrValue >= 0 ? `+${attrValue}` : attrValue})
                    </span>
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
                      title="Outros Modificadores"
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