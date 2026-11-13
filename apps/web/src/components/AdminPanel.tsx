import { useState, useEffect } from 'react';
import {
  SystemId,
  CompendiumCategory,
  CompendiumEntryData,
  SystemSkillDefinition,
  RuleModifier,
  ModifierTargetType,
} from '@totalrpg/shared';
import {
  fetchCompendium,
  seedCompendium,
  createCompendiumEntry,
  deleteCompendiumEntry,
  upsertSystemSkill,
} from '../services/api';

const CATEGORY_LABELS: Record<CompendiumCategory, string> = {
  power: '✨ Poderes de Classe / Gerais',
  paranormal_power: '👁️ Poderes Paranormais',
  spell: '🔮 Rituais & Magias',
  item: '⚔️ Armas & Equipamentos',
  origin: '📜 Origens',
  condition: '🩸 Condições (Buff/Debuff)',
};

const TARGET_TYPE_LABELS: Record<ModifierTargetType, string> = {
  attribute: 'Atributo Base',
  skill_bonus: 'Bônus em Perícia (+)',
  skill_dice: 'Dados em Perícia (+/- d20)',
  vital_max: 'Barra Vital Máxima (PV/PM/PE/SAN)',
  defense: 'Defesa Total',
  attack_bonus: 'Bônus de Acerto em Ataques',
  damage_bonus: 'Bônus em Rolagem de Dano',
  load_limit: 'Capacidade de Carga (Espaços)',
};

export function AdminPanel() {
  const [selectedSystem, setSelectedSystem] = useState<SystemId>('ordem-paranormal');
  const [activeSection, setActiveSection] = useState<CompendiumCategory | 'skills'>('power');

  const [entries, setEntries] = useState<CompendiumEntryData[]>([]);
  const [skills, setSkills] = useState<SystemSkillDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Estados do Formulário de Entrada do Compêndio
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState(0);
  const [damageFormula, setDamageFormula] = useState('');
  const [critRange, setCritRange] = useState('20/x2');
  const [slots, setSlots] = useState(1);
  const [circle, setCircle] = useState(1);
  const [element, setElement] = useState('');
  const [requirements, setRequirements] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [modifiers, setModifiers] = useState<RuleModifier[]>([]);

  // Estados do Formulário de Nova Perícia
  const [skillName, setSkillName] = useState('');
  const [skillKey, setSkillKey] = useState('');
  const [skillAttr, setSkillAttr] = useState('agi');
  const [trainedOnly, setTrainedOnly] = useState(false);
  const [armorPenalty, setArmorPenalty] = useState(false);

  async function loadCompendium() {
    setIsLoading(true);
    try {
      const data = await fetchCompendium(selectedSystem);
      setEntries(data.entries);
      setSkills(data.skills);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCompendium();
    setSkillAttr(selectedSystem === 'ordem-paranormal' ? 'agi' : 'forca');
  }, [selectedSystem]);

  async function handleSeed() {
    try {
      const res = await seedCompendium();
      alert(res.message);
      loadCompendium();
    } catch (err: any) {
      alert(err.message);
    }
  }

  // Adiciona uma nova linha no construtor de efeitos mecânicos
  function addModifierRow() {
    const newMod: RuleModifier = {
      id: Math.random().toString(36).substring(2, 9),
      targetType: 'skill_bonus',
      targetKey: 'luta',
      value: 2,
      scaleWithLevel: false,
    };
    setModifiers([...modifiers, newMod]);
  }

  function updateModifierRow(id: string, changes: Partial<RuleModifier>) {
    setModifiers(modifiers.map((m) => (m.id === id ? { ...m, ...changes } : m)));
  }

  function removeModifierRow(id: string) {
    setModifiers(modifiers.filter((m) => m.id !== id));
  }

  async function handleCreateEntry(e: React.FormEvent) {
    e.preventDefault();
    if (activeSection === 'skills') return;

    try {
      await createCompendiumEntry({
        system: selectedSystem,
        category: activeSection,
        name: name.trim(),
        description: description.trim(),
        cost: Number(cost) || 0,
        modifiers,
        metadata: {
          damageFormula: damageFormula.trim() || undefined,
          critRange: activeSection === 'item' ? critRange : undefined,
          slots: activeSection === 'item' ? Number(slots) : undefined,
          circle: activeSection === 'spell' ? Number(circle) : undefined,
          element: element.trim() || undefined,
          requirements: requirements.trim() || undefined,
        },
      });

      setName('');
      setDescription('');
      setCost(0);
      setDamageFormula('');
      setElement('');
      setRequirements('');
      setModifiers([]);
      loadCompendium();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleDeleteEntry(id: string) {
    try {
      await deleteCompendiumEntry(id);
      loadCompendium();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleSaveSkill(e: React.FormEvent) {
    e.preventDefault();
    try {
      await upsertSystemSkill({
        system: selectedSystem,
        name: skillName.trim(),
        skillKey: skillKey.trim() || skillName.toLowerCase().trim(),
        defaultAttribute: skillAttr,
        trainedOnly,
        armorPenalty,
      });
      setSkillName('');
      setSkillKey('');
      setTrainedOnly(false);
      setArmorPenalty(false);
      loadCompendium();
    } catch (err: any) {
      alert(err.message);
    }
  }

  const filteredEntries = entries.filter((e) => {
    if (e.category !== activeSection) return false;
    if (!adminSearch.trim()) return true;
    const q = adminSearch.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      (e.metadata?.element || '').toLowerCase().includes(q)
    );
  });
  const resourceName = selectedSystem === 'ordem-paranormal' ? 'PE' : 'PM';

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho do Painel Admin */}
      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-amber-500">
            ⚙️ Motor de Regras & Compêndio (Admin)
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Cadastre poderes, rituais, magias, armas, condições e perícias com modificadores automáticos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSeed}
            className="px-3 py-2 bg-emerald-900/50 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/60 rounded-lg text-xs font-bold transition cursor-pointer"
          >
            ⚡ Ativar Admin & Carregar Pacote Inicial
          </button>

          <select
            value={selectedSystem}
            onChange={(e) => setSelectedSystem(e.target.value as SystemId)}
            className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-bold text-amber-400 uppercase"
          >
            <option value="ordem-paranormal">Sistema: Ordem Paranormal</option>
            <option value="tormenta20">Sistema: Tormenta 20</option>
          </select>
        </div>
      </div>

      {/* Sub-Abas de Categorias do Compêndio */}
      <div className="flex flex-wrap border-b border-zinc-800 gap-2">
        {(Object.keys(CATEGORY_LABELS) as CompendiumCategory[]).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveSection(cat)}
            className={`px-3 py-2.5 text-xs font-bold transition cursor-pointer border-b-2 ${
              activeSection === cat
                ? 'border-amber-500 text-amber-400 bg-zinc-900/60 rounded-t-lg'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setActiveSection('skills')}
          className={`px-3 py-2.5 text-xs font-bold transition cursor-pointer border-b-2 ${
            activeSection === 'skills'
              ? 'border-amber-500 text-amber-400 bg-zinc-900/60 rounded-t-lg'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          🎯 Perícias do Sistema ({skills.length})
        </button>
      </div>

      {/* SEÇÃO A: GERENCIADOR DE PERÍCIAS CUSTOMIZADAS */}
      {activeSection === 'skills' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleSaveSkill}
            className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col gap-4 h-fit"
          >
            <h3 className="font-bold text-sm text-amber-500">
              + Adicionar / Editar Perícia ({selectedSystem})
            </h3>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Nome da Perícia</label>
              <input
                type="text"
                required
                value={skillName}
                onChange={(e) => {
                  setSkillName(e.target.value);
                  setSkillKey(
                    e.target.value
                      .toLowerCase()
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '')
                      .replace(/\s+/g, '_')
                  );
                }}
                placeholder="Ex: Pilotagem de Mecha, Alquimia..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Chave Identificadora (ID)</label>
              <input
                type="text"
                required
                value={skillKey}
                onChange={(e) => setSkillKey(e.target.value)}
                placeholder="Ex: alquimia"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-300"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Atributo-Chave Padrão</label>
              <select
                value={skillAttr}
                onChange={(e) => setSkillAttr(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
              >
                {selectedSystem === 'ordem-paranormal' ? (
                  <>
                    <option value="agi">AGI (Agilidade)</option>
                    <option value="for">FOR (Força)</option>
                    <option value="int">INT (Intelecto)</option>
                    <option value="pre">PRE (Presença)</option>
                    <option value="vig">VIG (Vigor)</option>
                  </>
                ) : (
                  <>
                    <option value="forca">FOR (Força)</option>
                    <option value="destreza">DES (Destreza)</option>
                    <option value="constituicao">CON (Constituição)</option>
                    <option value="inteligencia">INT (Inteligência)</option>
                    <option value="sabedoria">SAB (Sabedoria)</option>
                    <option value="carisma">CAR (Carisma)</option>
                  </>
                )}
              </select>
            </div>

            <div className="flex flex-col gap-2 text-xs text-zinc-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={trainedOnly}
                  onChange={(e) => setTrainedOnly(e.target.checked)}
                />
                Somente Treinada (Exige treino para rolar)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={armorPenalty}
                  onChange={(e) => setArmorPenalty(e.target.checked)}
                />
                Sofre Penalidade de Carga/Armadura
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Salvar Perícia no Sistema
            </button>
          </form>

          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
            <h3 className="font-bold text-sm text-zinc-200 mb-3">
              Perícias Customizadas Cadastradas
            </h3>
            {skills.length === 0 ? (
              <p className="text-xs text-zinc-500">
                Nenhuma perícia extra cadastrada além das perícias padrão do livro básico. Crie uma ao lado para adicioná-la automaticamente às fichas!
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {skills.map((sk) => (
                  <div
                    key={sk.id}
                    className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg flex justify-between items-center"
                  >
                    <div>
                      <p className="text-sm font-bold text-white">{sk.name}</p>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">
                        Chave: {sk.skillKey} • Atributo: {sk.defaultAttribute}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {sk.trainedOnly && (
                        <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-800 px-1.5 py-0.5 rounded">
                          Treinada
                        </span>
                      )}
                      {sk.armorPenalty && (
                        <span className="text-[10px] bg-red-950 text-red-400 border border-red-800 px-1.5 py-0.5 rounded">
                          Carga
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* SEÇÃO B: GERENCIADOR DE PODERES, MAGIAS, ITENS, ORIGENS E CONDIÇÕES */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Formulário de Criação com Construtor de Modificadores */}
          <form
            onSubmit={handleCreateEntry}
            className="lg:col-span-5 bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col gap-4"
          >
            <h3 className="font-bold text-sm text-amber-500">
              + Cadastrar em {CATEGORY_LABELS[activeSection]}
            </h3>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-[11px] text-zinc-400 mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Sangue de Ferro, Katana, Abalado..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Custo ({resourceName})</label>
                <input
                  type="number"
                  min={0}
                  value={cost}
                  onChange={(e) => setCost(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            {/* Campos Extras para Magias/Rituais, Poderes Paranormais ou Armas/Itens */}
            {(activeSection === 'spell' ||
              activeSection === 'item' ||
              activeSection === 'power' ||
              activeSection === 'paranormal_power') && (
              <div className="grid grid-cols-3 gap-2 bg-zinc-950 p-3 rounded-lg border border-zinc-800/80">
                <div>
                  <label className="block text-[10px] text-zinc-400 mb-1">Fórmula de Dano/Cura</label>
                  <input
                    type="text"
                    value={damageFormula}
                    onChange={(e) => setDamageFormula(e.target.value)}
                    placeholder="Ex: 2d8+2"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white font-mono"
                  />
                </div>

                {activeSection === 'item' && (
                  <>
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1">Crítico</label>
                      <input
                        type="text"
                        value={critRange}
                        onChange={(e) => setCritRange(e.target.value)}
                        placeholder="19/x2"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1">Espaços</label>
                      <input
                        type="number"
                        step={0.5}
                        value={slots}
                        onChange={(e) => setSlots(Number(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>
                  </>
                )}

                {activeSection === 'spell' && (
                  <>
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1">Círculo</label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={circle}
                        onChange={(e) => setCircle(Number(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1">Elemento / Escola</label>
                      <input
                        type="text"
                        value={element}
                        onChange={(e) => setElement(e.target.value)}
                        placeholder="Morte, Evocação..."
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white"
                      />
                    </div>
                  </>
                )}

                {(activeSection === 'power' || activeSection === 'paranormal_power') && (
                  <>
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1">Elemento (Opcional)</label>
                      <input
                        type="text"
                        value={element}
                        onChange={(e) => setElement(e.target.value)}
                        placeholder="Sangue, Morte, Energia..."
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1">Pré-requisitos</label>
                      <input
                        type="text"
                        value={requirements}
                        onChange={(e) => setRequirements(e.target.value)}
                        placeholder="Ex: Sangue 1, NEX 30%"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Descrição & Regras</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o efeito na mesa..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            {/* CONSTRUTOR VISUAL DE MODIFICADORES MECÂNICOS */}
            <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-amber-400">
                  ⚡ Efeitos Mecânicos Automáticos ({modifiers.length})
                </span>
                <button
                  type="button"
                  onClick={addModifierRow}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-amber-600 text-zinc-200 hover:text-white rounded text-[11px] font-bold transition cursor-pointer"
                >
                  + Adicionar Efeito
                </button>
              </div>

              {modifiers.length === 0 ? (
                <p className="text-[11px] text-zinc-500">
                  Nenhum modificador numérico (apenas descritivo/rolagem). Clique acima se quiser que este item altere perícias, atributos, defesa ou barras vitais automaticamente!
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {modifiers.map((mod) => (
                    <div
                      key={mod.id}
                      className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg flex flex-col gap-2"
                    >
                      <div className="grid grid-cols-12 gap-1.5 items-center">
                        <select
                          value={mod.targetType}
                          onChange={(e) =>
                            updateModifierRow(mod.id, {
                              targetType: e.target.value as ModifierTargetType,
                            })
                          }
                          className="col-span-6 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-[11px] text-white"
                        >
                          {(Object.keys(TARGET_TYPE_LABELS) as ModifierTargetType[]).map((t) => (
                            <option key={t} value={t}>
                              {TARGET_TYPE_LABELS[t]}
                            </option>
                          ))}
                        </select>

                        <input
                          type="text"
                          value={mod.targetKey}
                          onChange={(e) => updateModifierRow(mod.id, { targetKey: e.target.value })}
                          placeholder="Alvo (luta, pv, all)"
                          title="Chave do alvo: ex: luta, pontaria, pv, pm, pe, for, all"
                          className="col-span-3 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-[11px] font-mono text-amber-300"
                        />

                        <input
                          type="number"
                          value={mod.value}
                          onChange={(e) =>
                            updateModifierRow(mod.id, { value: Number(e.target.value) })
                          }
                          className="col-span-2 bg-zinc-950 border border-zinc-700 rounded px-1.5 py-1 text-[11px] font-mono text-center text-white"
                        />

                        <button
                          type="button"
                          onClick={() => removeModifierRow(mod.id)}
                          className="col-span-1 text-zinc-500 hover:text-red-400 text-xs font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>

                      <label className="flex items-center gap-1.5 text-[10px] text-zinc-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(mod.scaleWithLevel)}
                          onChange={(e) =>
                            updateModifierRow(mod.id, { scaleWithLevel: e.target.checked })
                          }
                        />
                        Multiplicar pelo Nível / Patamar de NEX do personagem
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-lg shadow-amber-900/20"
            >
              Salvar no Compêndio Oficial
            </button>
          </form>

          {/* Lista de Itens Cadastrados no Compêndio */}
          <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col gap-3">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <h3 className="font-bold text-sm text-zinc-200">
                Catálogo Atual: {CATEGORY_LABELS[activeSection]} ({filteredEntries.length})
              </h3>
              <input
                type="text"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                placeholder="🔎 Pesquisar no catálogo..."
                className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white"
              />
            </div>

            {filteredEntries.length === 0 ? (
              <div className="bg-zinc-950 border border-dashed border-zinc-800 p-8 rounded-xl text-center">
                <p className="text-zinc-400 text-xs">
                  Nenhum registro nesta categoria ainda.
                </p>
                <p className="text-zinc-500 text-[11px] mt-1">
                  Clique no botão verde &quot;⚡ Ativar Admin & Carregar Pacote Inicial&quot; no topo para popular exemplos prontos!
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-[560px] overflow-y-auto pr-1">
                {filteredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex justify-between items-start gap-4"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-sm text-white">{entry.name}</h4>
                        {entry.cost > 0 && (
                          <span className="text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded">
                            {entry.cost} {resourceName}
                          </span>
                        )}
                        {entry.metadata?.damageFormula && (
                          <span className="text-[10px] font-mono bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded">
                            🎲 {entry.metadata.damageFormula}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-400">{entry.description}</p>

                      {entry.modifiers && entry.modifiers.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {entry.modifiers.map((m) => (
                            <span
                              key={m.id}
                              className="text-[10px] font-mono bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded"
                            >
                              ⚡ {m.targetType} [{m.targetKey}]: {m.value >= 0 ? `+${m.value}` : m.value}
                              {m.scaleWithLevel ? ' (x Nível)' : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="text-xs text-zinc-500 hover:text-red-400 px-2 py-1 cursor-pointer"
                      title="Excluir do Compêndio"
                    >
                      Excluir
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}