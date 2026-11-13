import { useState } from 'react';
import { ImageUploadField } from '../ImageUploadField';
import {
  SystemId,
  CampaignThreat,
  ThreatSkill,
  PreparedAttack,
  CompendiumEntryData,
  MonitorProjection,
} from '@totalrpg/shared';

interface BestiaryManagerProps {
  system: SystemId;
  threats: CampaignThreat[];
  compendiumEntries: CompendiumEntryData[];
  isSecretRoll: boolean;
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
    characterId?: string
  ) => void;
  onSendThreatToCombatManual: (threat: CampaignThreat, manualInitiative: number) => void;
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

export function BestiaryManager({
  system,
  threats,
  compendiumEntries,
  isSecretRoll,
  activeProjectionId,
  onUpdateThreats,
  onToggleProjection,
  onRollDice,
  onSendThreatToCombatManual,
}: BestiaryManagerProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingThreatId, setEditingThreatId] = useState<string | null>(null);

  const defaultAttrs: Record<string, number> =
    system === 'ordem-paranormal'
      ? { agi: 2, for: 2, int: 1, pre: 1, vig: 2 }
      : { forca: 3, destreza: 2, constituicao: 3, inteligencia: 0, sabedoria: 1, carisma: 0 };

  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [hpMax, setHpMax] = useState(45);
  const [defense, setDefense] = useState(18);
  const [initDice, setInitDice] = useState(system === 'ordem-paranormal' ? 2 : 1);
  const [initBonus, setInitBonus] = useState(5);
  const [description, setDescription] = useState('');
  const [attributes, setAttributes] = useState<Record<string, number>>(defaultAttrs);
  const [skills, setSkills] = useState<ThreatSkill[]>([
    { id: 's1', name: 'Percepção', diceCount: 2, bonus: 5 },
    { id: 's2', name: 'Fortitude', diceCount: 2, bonus: 8 },
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

  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillDice, setNewSkillDice] = useState(2);
  const [newSkillBonus, setNewSkillBonus] = useState(5);

  const [newAtkName, setNewAtkName] = useState('');
  const [newAtkDice, setNewAtkDice] = useState(2);
  const [newAtkBonus, setNewAtkBonus] = useState(10);
  const [newAtkDmg, setNewAtkDmg] = useState('2d8+5');

  const [manualInitInputs, setManualInitInputs] = useState<Record<string, number>>({});

  function handleOpenCreateNew() {
    setEditingThreatId(null);
    setName('');
    setImageUrl('');
    setHpMax(45);
    setDefense(18);
    setInitDice(system === 'ordem-paranormal' ? 2 : 1);
    setInitBonus(5);
    setDescription('');
    setAttributes(defaultAttrs);
    setSkills([
      { id: 's1', name: 'Percepção', diceCount: 2, bonus: 5 },
      { id: 's2', name: 'Fortitude', diceCount: 2, bonus: 8 },
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
    setIsFormOpen(true);
  }

  function handleStartEditThreat(threat: CampaignThreat) {
    setEditingThreatId(threat.id);
    setName(threat.name);
    setImageUrl(threat.imageUrl || '');
    setHpMax(threat.hpMax);
    setDefense(threat.defense);
    setInitDice(threat.initiativeDice);
    setInitBonus(threat.initiativeBonus);
    setDescription(threat.description);
    setAttributes({ ...threat.attributes });
    setSkills([...threat.skills]);
    setAttacks([...threat.attacks]);
    setIsFormOpen(true);
  }

  function handleAddSkillToDraft() {
    if (!newSkillName.trim()) return;
    setSkills([
      ...skills,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: newSkillName.trim(),
        diceCount: Number(newSkillDice) || 1,
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
        damageType: 'Físico',
      },
    ]);
    setNewAtkName('');
  }

  function handleSaveThreat(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const threatPayload: CampaignThreat = {
      id: editingThreatId || `threat-${Math.random().toString(36).substring(2, 9)}`,
      name: name.trim(),
      system,
      imageUrl: imageUrl.trim() || undefined,
      hpMax: Math.max(1, Number(hpMax)),
      defense: Number(defense),
      initiativeDice: Math.max(1, Number(initDice)),
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

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-5 shadow-lg">
      <div className="flex flex-wrap justify-between items-center gap-3 border-b border-zinc-800 pb-3">
        <div>
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-red-400">
            👹 Bestiário & Ameaças da Mesa ({threats.length})
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Crie criaturas completas, envie-as para a luta (aparecem no lado direito do 2º Monitor!) ou projete sua imagem.
          </p>
        </div>

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
          {isFormOpen ? 'Cancelar' : '+ Criar Nova Ameaça / Criatura'}
        </button>
      </div>

      {isFormOpen && (
        <form
          onSubmit={handleSaveThreat}
          className="bg-zinc-950 border border-red-900/60 p-5 rounded-2xl flex flex-col gap-5"
        >
          <h4 className="text-sm font-bold text-red-400 uppercase">
            {editingThreatId
              ? `✏️ Editando Criatura: ${name}`
              : `🛠️ Construtor Completo de Criatura / NPC (${system})`}
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
                  min={1}
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

          <div className="bg-zinc-900/70 border border-zinc-800 p-3.5 rounded-xl flex flex-col gap-3">
            <span className="text-xs font-bold text-amber-400">
              🎯 Perícias e Testes de Resistência ({skills.length})
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
                  min={1}
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
                    {sk.name}: {sk.diceCount}d20{sk.bonus >= 0 ? `+${sk.bonus}` : sk.bonus}
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

          <div className="bg-zinc-900/70 border border-zinc-800 p-3.5 rounded-xl flex flex-col gap-3">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <span className="text-xs font-bold text-red-400">
                ⚔️ Ataques e Ações Agressivas ({attacks.length})
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
                  📚 Importar arma/magia com dano do Compêndio...
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

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
              <div className="col-span-2">
                <label className="block text-[10px] text-zinc-400 mb-1">Nome do Ataque</label>
                <input
                  type="text"
                  value={newAtkName}
                  onChange={(e) => setNewAtkName(e.target.value)}
                  placeholder="Ex: Tentáculo de Lodo, Sopro..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Dados (d20)</label>
                <input
                  type="number"
                  min={1}
                  value={newAtkDice}
                  onChange={(e) => setNewAtkDice(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Bônus Acerto</label>
                <input
                  type="number"
                  value={newAtkBonus}
                  onChange={(e) => setNewAtkBonus(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-xs font-mono text-white"
                />
              </div>
              <div className="flex gap-1">
                <div className="flex-1">
                  <label className="block text-[10px] text-zinc-400 mb-1">Dano</label>
                  <input
                    type="text"
                    value={newAtkDmg}
                    onChange={(e) => setNewAtkDmg(e.target.value)}
                    placeholder="2d8+6"
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
                  <strong className="text-white">{atk.name}</strong>
                  <span className="font-mono text-amber-400">
                    ({atk.diceCount}d20+{atk.attackBonus} | Dano: {atk.damageFormula})
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

          <div>
            <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">
              Habilidades Passivas, Resistências (RD) e Descrição
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Resistência a Corte 10, Imune a Medo, Enigma de Medo..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-xl text-xs font-extrabold cursor-pointer shadow-lg"
          >
            {editingThreatId
              ? '💾 Salvar Alterações na Criatura'
              : '💾 Salvar Nova Criatura no Bestiário'}
          </button>
        </form>
      )}

      {threats.length === 0 ? (
        <div className="bg-zinc-950/60 border border-dashed border-zinc-800 rounded-xl p-8 text-center">
          <p className="text-xs text-zinc-400">
            Nenhuma criatura guardada nesta mesa ainda. Clique em "+ Criar Nova Ameaça" acima!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {threats.map((threat) => {
            const manualInitVal = manualInitInputs[threat.id] ?? 15;
            const isProjected = activeProjectionId === threat.id;

            return (
              <div
                key={threat.id}
                className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between gap-4"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-3 border-b border-zinc-800/80 pb-3">
                    <div className="flex items-center gap-4 min-w-0">
                      {threat.imageUrl ? (
                        <img
                          src={threat.imageUrl}
                          alt={threat.name}
                          className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-red-700/80 shadow-xl shrink-0 bg-zinc-900"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-red-950/50 border border-red-800/70 flex items-center justify-center text-3xl shrink-0">
                          👹
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-lg font-extrabold text-white truncate">{threat.name}</h4>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs font-mono">
                          <span className="text-red-400 font-bold">❤️ PV: {threat.hpMax}</span>
                          <span className="text-amber-400 font-bold">🛡️ DEF: {threat.defense}</span>
                          <span className="text-zinc-400">
                            ⚡ INI: {threat.initiativeDice}d20+{threat.initiativeBonus}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          onToggleProjection({
                            type: 'threat',
                            id: threat.id,
                            title: threat.name,
                            subtitle: 'Ameaça / Criatura',
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
                        {isProjected ? '🖥️ Na TV (Sair)' : '🖥️ 2º Monitor'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartEditThreat(threat)}
                        className="px-2 py-1 bg-zinc-800 hover:bg-amber-600 text-zinc-200 hover:text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateThreats(threats.filter((t) => t.id !== threat.id))}
                        className="px-2 py-1 bg-zinc-900 hover:bg-red-950 text-zinc-500 hover:text-red-400 rounded-lg text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

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
                            system === 'ordem-paranormal' ? Math.max(1, val) : 1,
                            20,
                            system === 'ordem-paranormal' ? 0 : val,
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
                          🎲 {sk.name} ({sk.diceCount}d20{sk.bonus >= 0 ? `+${sk.bonus}` : sk.bonus})
                        </button>
                      ))}
                    </div>
                  )}

                  {threat.attacks.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {threat.attacks.map((atk) => {
                        const dmg = parseFormula(atk.damageFormula);
                        return (
                          <div
                            key={atk.id}
                            className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl flex justify-between items-center gap-2"
                          >
                            <span className="text-xs font-bold text-zinc-200">{atk.name}</span>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  onRollDice(
                                    threat.name,
                                    system,
                                    `Acerto: ${atk.name}`,
                                    atk.diceCount,
                                    20,
                                    atk.attackBonus,
                                    isSecretRoll
                                  )
                                }
                                className="px-2 py-0.5 bg-zinc-950 hover:bg-amber-600 text-amber-400 hover:text-white border border-zinc-700 rounded text-[11px] font-mono font-bold cursor-pointer"
                              >
                                🎯 {atk.diceCount}d20+{atk.attackBonus}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onRollDice(
                                    threat.name,
                                    system,
                                    `Dano: ${atk.name}`,
                                    dmg.count,
                                    dmg.sides,
                                    dmg.modifier,
                                    isSecretRoll
                                  )
                                }
                                className="px-2 py-0.5 bg-zinc-950 hover:bg-red-700 text-red-400 hover:text-white border border-zinc-700 rounded text-[11px] font-mono font-bold cursor-pointer"
                              >
                                🩸 {atk.damageFormula}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {threat.description && (
                    <p className="text-[11px] text-zinc-400 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/60">
                      {threat.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() =>
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
                      )
                    }
                    className="w-full py-2 bg-purple-800 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold transition cursor-pointer shadow"
                  >
                    👁️ Rolar Iniciativa (Oculta) & Enviar ao Combate
                  </button>

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
                      onClick={() => onSendThreatToCombatManual(threat, manualInitVal)}
                      className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      📥 Adicionar Manualmente ao Combate
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}