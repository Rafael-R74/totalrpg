import {
  CharacterAbility,
  CompendiumEntryData,
  ComputedBonuses,
  CursePricePrompt,
  OrdemSheetData,
  RPGItem,
  SceneEffect,
  getOrdemPeLimit,
} from '@totalrpg/shared';

interface InventoryItemActionBarProps {
  item: RPGItem;
  ordemSheetData: OrdemSheetData;
  bonuses: ComputedBonuses;
  abilities: CharacterAbility[];
  compendiumEntries: CompendiumEntryData[];
  onUpdateItem: (updated: RPGItem) => void;
  onConsumeUnit: (itemId: string) => void;
  onOpenCustomize: (itemId: string) => void;
  onSpendResource: (amount: number, extraSceneEffect?: SceneEffect) => boolean;
  onHealPv?: (amount: number, reason?: string) => void;
  onTakePvDamage?: (amount: number, reason?: string) => void;
  onGrantTempPe?: (amount: number, reason?: string) => void;
  onAddSceneEffect?: (effect: SceneEffect) => void;
  onFeedback: (msg: string) => void;
  onRoll: (
    label: string,
    count: number,
    sides: number,
    modifier: number,
    isDamage?: boolean,
    attackDamagePayload?: undefined,
    forcaOpressoraPayload?: undefined,
    extraRollOpts?: {
      explodingDieSide?: number;
      extraDice?: Array<{ count: number; sides: number; label: string }>;
      cursePricePrompt?: CursePricePrompt;
    }
  ) => void;
}

function getSkillRollParams(
  ordemSheetData: OrdemSheetData,
  bonuses: ComputedBonuses,
  skillId: string,
  fallbackAttr: keyof OrdemSheetData['attributes']
) {
  const sk = ordemSheetData.skills.find((s) => s.id === skillId);
  const attrKey = (sk?.attribute || fallbackAttr) as keyof OrdemSheetData['attributes'];
  const attrVal = (ordemSheetData.attributes[attrKey] || 0) + (bonuses.attributes[attrKey] || 0);
  const dice = attrVal + bonuses.skillDiceAll + (bonuses.skillDice[skillId] || 0);
  const bonus =
    (sk?.trainingDegree || 0) +
    (sk?.otherModifier || 0) +
    bonuses.skillBonusAll +
    (bonuses.skillBonus[skillId] || 0);
  const cp = bonuses.cursePriceByAttr?.[attrKey];
  const cursePricePrompt: CursePricePrompt | undefined =
    cp && cp.curseCount > 0
      ? {
          element: cp.element,
          attributeLabel: cp.attrLabel,
          curseCount: cp.curseCount,
          sanLossOnFail: cp.sanLoss,
        }
      : undefined;
  return { dice, bonus, cursePricePrompt };
}

export function InventoryItemActionBar({
  item,
  ordemSheetData,
  bonuses,
  abilities,
  compendiumEntries,
  onUpdateItem,
  onConsumeUnit,
  onOpenCustomize,
  onSpendResource,
  onHealPv,
  onTakePvDamage,
  onGrantTempPe,
  onAddSceneEffect,
  onFeedback,
  onRoll,
}: InventoryItemActionBarProps) {
  const ln = item.name.toLowerCase();
  const peLimit = getOrdemPeLimit(ordemSheetData.nex, ordemSheetData.origin, abilities);
  const effAgi = (ordemSheetData.attributes.agi || 0) + (bonuses.attributes.agi || 0);
  const effInt = (ordemSheetData.attributes.int || 0) + (bonuses.attributes.int || 0);

  const hasPeritoExplosivos = abilities.some(
    (ab) =>
      ab.name.toLowerCase().includes('perito em explosivos') ||
      ab.id.toLowerCase().includes('perito-em-explosivos')
  );
  const grenadeDt = 10 + peLimit + effAgi + (hasPeritoExplosivos ? effInt : 0);
  const minaDt = 10 + peLimit + effInt + (hasPeritoExplosivos ? effInt : 0);

  const buttons: JSX.Element[] = [];

  const rollSkill = (skillId: string, fallbackAttr: keyof OrdemSheetData['attributes'], label: string, extraBonus = 0) => {
    const { dice, bonus, cursePricePrompt } = getSkillRollParams(
      ordemSheetData,
      bonuses,
      skillId,
      fallbackAttr
    );
    onRoll(
      label,
      dice,
      20,
      bonus + extraBonus,
      false,
      undefined,
      undefined,
      cursePricePrompt ? { cursePricePrompt } : undefined
    );
  };

  const useChargeOrConsume = (defaultCharges: number): boolean => {
    const current = item.remainingCharges ?? defaultCharges;
    if (current <= 1) {
      if ((item.quantity || 1) > 1) {
        onUpdateItem({
          ...item,
          quantity: (item.quantity || 1) - 1,
          remainingCharges: defaultCharges,
        });
      } else {
        onUpdateItem({ ...item, remainingCharges: 0 });
      }
      return true;
    }
    onUpdateItem({ ...item, remainingCharges: current - 1 });
    return true;
  };

  // ============================================================================
  // 1. CONSUMÍVEIS MÉDICOS (Cicatrizante / Spray Médico)
  // ============================================================================
  if (ln.includes('cicatrizante')) {
    buttons.push(
      <button
        key="use-cicatrizante"
        type="button"
        onClick={() => {
          onRoll(`💚 ${item.name} (Cura de PV)`, 2, 8, 2, true);
          onConsumeUnit(item.id);
          onFeedback(`💚 ${item.name} usado (2d8+2 PV) — 1 unidade consumida do inventário.`);
        }}
        className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-700 text-emerald-200 hover:text-white border border-emerald-600/80 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        💚 Usar Spray (2d8+2 PV • -1 un.)
      </button>
    );
  }

  // ============================================================================
  // 2. GRANADAS & EXPLOSIVOS (Cap. 3, p. 66)
  // ============================================================================
  if (ln.includes('granada de fragmentação') || ln.includes('granada de fragmentacao')) {
    buttons.push(
      <button
        key="throw-frag"
        type="button"
        onClick={() => {
          onRoll(
            `💣 Granada de Fragmentação [Raio 6m • Reflexos DT ${grenadeDt} reduz à metade • Perfuração]`,
            8,
            6,
            0,
            true
          );
          onConsumeUnit(item.id);
          onFeedback(
            `💣 Granada de Fragmentação arremessada (8d6 Perfuração • Reflexos DT ${grenadeDt}) — 1 unidade consumida.`
          );
        }}
        className="px-2.5 py-1 bg-orange-950/80 hover:bg-orange-700 text-orange-200 hover:text-white border border-orange-600/80 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        💣 Arremessar (8d6 • Ref DT {grenadeDt} • -1 un.)
      </button>
    );
  } else if (ln.includes('granada incendiária') || ln.includes('granada incendiaria')) {
    buttons.push(
      <button
        key="throw-inc"
        type="button"
        onClick={() => {
          onRoll(
            `🔥 Granada Incendiária [Raio 6m • Reflexos DT ${grenadeDt} reduz à metade e evita Em Chamas • Fogo]`,
            6,
            6,
            0,
            true
          );
          onConsumeUnit(item.id);
          onFeedback(
            `🔥 Granada Incendiária arremessada (6d6 Fogo + Em Chamas • Reflexos DT ${grenadeDt}) — 1 unidade consumida.`
          );
        }}
        className="px-2.5 py-1 bg-red-950/80 hover:bg-red-700 text-red-200 hover:text-white border border-red-600/80 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        🔥 Arremessar (6d6 Fogo • Ref DT {grenadeDt} • -1 un.)
      </button>
    );
  } else if (ln.includes('granada de atordoamento')) {
    buttons.push(
      <button
        key="throw-stun"
        type="button"
        onClick={() => {
          onConsumeUnit(item.id);
          onFeedback(
            `⚡ Granada de Atordoamento arremessada (Raio 6m): seres devem passar em Fortitude DT ${grenadeDt} ou ficam Atordoados por 1 rodada (Ofuscados se passarem). -1 unidade.`
          );
        }}
        className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-700 text-amber-200 hover:text-white border border-amber-600/80 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        ⚡ Arremessar (Atordoar • Fort DT {grenadeDt} • -1 un.)
      </button>
    );
  } else if (ln.includes('granada de fumaça') || ln.includes('granada de fumaca')) {
    buttons.push(
      <button
        key="throw-smoke"
        type="button"
        onClick={() => {
          onConsumeUnit(item.id);
          onFeedback(
            `💨 Granada de Fumaça arremessada (Raio 6m): cria fumaça densa por 2 rodadas — seres na área ficam Cegos e sob Camuflagem Total. -1 unidade.`
          );
        }}
        className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-600 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        💨 Arremessar (Fumaça 2 rod. • -1 un.)
      </button>
    );
  } else if (ln.includes('mina antipessoal')) {
    buttons.push(
      <button
        key="install-mina"
        type="button"
        onClick={() => rollSkill('tatica', 'int', `🔧 Instalar Mina Antipessoal (Tática DT 15)`)}
        className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-700/70 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        🔧 Instalar (Tática DT 15)
      </button>,
      <button
        key="detonate-mina"
        type="button"
        onClick={() => {
          onRoll(
            `💣 Mina Antipessoal [Cone 6m • Reflexos DT ${minaDt} reduz à metade • Perfuração]`,
            12,
            6,
            0,
            true
          );
          onConsumeUnit(item.id);
          onFeedback(
            `💣 Mina Antipessoal detonada (12d6 Perfuração em cone 6m • Reflexos DT ${minaDt}) — 1 unidade consumida.`
          );
        }}
        className="px-2.5 py-1 bg-red-950/80 hover:bg-red-700 text-red-200 hover:text-white border border-red-600/80 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        💣 Detonar (12d6 • Ref DT {minaDt} • -1 un.)
      </button>
    );
  }

  // ============================================================================
  // 3. SELO PARANORMAL (Cap. 6, p. 151)
  // ============================================================================
  if (ln.includes('selo paranormal')) {
    if (!item.storedRitualName) {
      buttons.push(
        <button
          key="config-selo"
          type="button"
          onClick={() => onOpenCustomize(item.id)}
          className="px-2.5 py-1 bg-fuchsia-950/80 hover:bg-fuchsia-800 text-fuchsia-200 border border-fuchsia-600 rounded-lg text-[11px] font-bold transition cursor-pointer"
        >
          ⚙️ Escolher Ritual do Selo
        </button>
      );
    } else {
      const circle = item.storedRitualCircle || 1;
      const peCost = item.storedRitualCost || (circle === 1 ? 1 : circle === 2 ? 3 : circle === 3 ? 6 : 10);
      const knowsRitual = abilities.some(
        (ab) => ab.name.toLowerCase() === item.storedRitualName!.toLowerCase()
      );
      const ritualComp = compendiumEntries.find(
        (e) =>
          e.category === 'spell' &&
          e.name.toLowerCase() === item.storedRitualName!.toLowerCase()
      );

      buttons.push(
        <button
          key="activate-selo"
          type="button"
          onClick={() => {
            if (!onSpendResource(peCost)) return;
            onConsumeUnit(item.id);
            if (!knowsRitual) {
              rollSkill(
                'ocultismo',
                'int',
                `🔮 Ativar Selo (${item.storedRitualName}) — Ocultismo DT ${20 + peCost}`
              );
              onFeedback(
                `🔮 Selo "${item.storedRitualName}" ativado (-${peCost} PE, -1 un.)! Como você não conhece este ritual, role Ocultismo DT ${20 + peCost} para conjurá-lo sem perdê-lo.`
              );
            } else {
              const dmg = ritualComp?.metadata?.damageFormula;
              if (dmg) {
                const m = dmg.toLowerCase().replace(/\s+/g, '').match(/^(\d+)d(\d+)([+-]\d+)?$/);
                if (m) {
                  onRoll(
                    `🔮 Selo Paranormal: ${item.storedRitualName}`,
                    parseInt(m[1], 10),
                    parseInt(m[2], 10),
                    m[3] ? parseInt(m[3], 10) : 0,
                    true
                  );
                }
              }
              onFeedback(
                `🔮 Selo "${item.storedRitualName}" ativado com sucesso (-${peCost} PE, sem precisar de componentes ritualísticos) — 1 unidade consumida.`
              );
            }
          }}
          className="px-2.5 py-1 bg-fuchsia-950/80 hover:bg-fuchsia-700 text-fuchsia-100 border border-fuchsia-500 rounded-lg text-[11px] font-bold transition cursor-pointer"
        >
          🔮 Ativar Selo: {item.storedRitualName} (-{peCost} PE • -1 un.)
        </button>
      );
    }
  }

  // ============================================================================
  // 4. OPERACIONAIS ATIVOS (Taser, Spray de Pimenta, Lanterna, Pistolas)
  // ============================================================================
  if (ln.includes('taser')) {
    const charges = item.remainingCharges ?? 2;
    buttons.push(
      <button
        key="use-taser"
        type="button"
        disabled={charges <= 0}
        onClick={() => {
          useChargeOrConsume(2);
          onRoll(
            `⚡ Taser [Eletricidade • Fortitude DT ${grenadeDt} ou Atordoado 1 rod.]`,
            1,
            6,
            0,
            true
          );
          onFeedback(`⚡ Taser disparado (1d6 Eletricidade • Fort DT ${grenadeDt}). Cargas restantes: ${Math.max(0, charges - 1)}.`);
        }}
        className="px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-700 disabled:opacity-40 text-cyan-200 border border-cyan-600/80 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        ⚡ Disparar (1d6 • Fort DT {grenadeDt} • {charges}/2 cargas)
      </button>,
      ...(charges < 2
        ? [
            <button
              key="reload-taser"
              type="button"
              onClick={() => onUpdateItem({ ...item, remainingCharges: 2 })}
              className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg text-[10px] font-bold cursor-pointer"
              title="Recarregar bateria do Taser"
            >
              ↺ Recarregar
            </button>,
          ]
        : [])
    );
  } else if (ln.includes('spray de pimenta')) {
    const charges = item.remainingCharges ?? 2;
    buttons.push(
      <button
        key="use-pimenta"
        type="button"
        disabled={charges <= 0}
        onClick={() => {
          useChargeOrConsume(2);
          onRoll(
            `🌶️ Spray de Pimenta [Cego por 1d4 rodadas • Fortitude DT ${grenadeDt} anula]`,
            1,
            4,
            0,
            true
          );
          onFeedback(`🌶️ Spray de Pimenta borrifado (Fort DT ${grenadeDt}). Usos restantes: ${Math.max(0, charges - 1)}/2.`);
        }}
        className="px-2.5 py-1 bg-red-950/80 hover:bg-red-700 disabled:opacity-40 text-red-200 border border-red-600/80 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        🌶️ Borrifar (1d4 rod. Cego • Fort DT {grenadeDt} • {charges}/2)
      </button>
    );
  } else if (ln.includes('lanterna tática') || ln.includes('lanterna tatica')) {
    buttons.push(
      <button
        key="use-lanterna"
        type="button"
        onClick={() =>
          onFeedback(
            `🔦 Lanterna Tática (Ação de Movimento): alvo em alcance curto fica Ofuscado por 1 rodada (imune por 1 cena depois).`
          )
        }
        className="px-2.5 py-1 bg-amber-950/70 hover:bg-amber-700 text-amber-200 border border-amber-600/70 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        🔦 Ofuscar Alvo (Mov.)
      </button>
    );
  } else if (ln.includes('pistola de dardos')) {
    const charges = item.remainingCharges ?? 2;
    buttons.push(
      <button
        key="use-dardos"
        type="button"
        disabled={charges <= 0}
        onClick={() => {
          useChargeOrConsume(2);
          onFeedback(
            `🎯 Pistola de Dardos disparada (alcance curto): alvo sofre Fortitude DT ${grenadeDt} ou fica Inconsciente até o fim da cena (Desprevenido 1 rod. se passar). Dardos: ${Math.max(0, charges - 1)}/2.`
          );
        }}
        className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-700 disabled:opacity-40 text-emerald-200 border border-emerald-600/80 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        🎯 Disparar Dardo (Fort DT {grenadeDt} • {charges}/2)
      </button>
    );
  } else if (ln.includes('pistola sinalizadora')) {
    const charges = item.remainingCharges ?? 2;
    buttons.push(
      <button
        key="use-sinalizadora"
        type="button"
        disabled={charges <= 0}
        onClick={() => {
          useChargeOrConsume(2);
          onRoll(`🔥 Pistola Sinalizadora [Fogo • Alcance Curto]`, 2, 6, 0, true);
          onFeedback(`🔥 Sinalizador disparado (2d6 Fogo). Cargas: ${Math.max(0, charges - 1)}/2.`);
        }}
        className="px-2.5 py-1 bg-orange-950/80 hover:bg-orange-700 disabled:opacity-40 text-orange-200 border border-orange-600/80 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        🔥 Disparar (2d6 Fogo • {charges}/2)
      </button>
    );
  }

  // ============================================================================
  // 5. ITENS PARANORMAIS (Cap. 3, Tabela 3.10)
  // ============================================================================
  if (ln.includes('amarras de ')) {
    buttons.push(
      <button
        key="amarras-lacar"
        type="button"
        onClick={() => {
          if (!onSpendResource(1)) return;
          onFeedback(
            `⛓️ ${item.name} (-1 PE): laçar criatura de ${item.element || 'elemento oposto'} (manobra Agarrar com +10; imobiliza).`
          );
        }}
        className="px-2.5 py-1 bg-purple-950/80 hover:bg-purple-800 text-purple-200 border border-purple-600 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        ⛓️ Laçar (-1 PE)
      </button>,
      <button
        key="amarras-armadilha"
        type="button"
        onClick={() => {
          if (!onSpendResource(2)) return;
          onFeedback(
            `⛓️ ${item.name} (-2 PE): armadilha paranormal preparada (Reflexos DT 25 ou fica Paralisado).`
          );
        }}
        className="px-2.5 py-1 bg-purple-950/80 hover:bg-purple-800 text-purple-200 border border-purple-600 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        ⛓️ Armadilha (-2 PE)
      </button>
    );
  } else if (ln.includes('câmera de aura') || ln.includes('camera de aura')) {
    buttons.push(
      <button
        key="use-camera-aura"
        type="button"
        onClick={() => {
          if (!onSpendResource(1)) return;
          onFeedback(
            `📷 Câmera de Aura Paranormal (-1 PE): fotografia revelada — auras paranormais aparecem coloridas pelo elemento correspondente!`
          );
        }}
        className="px-2.5 py-1 bg-purple-950/80 hover:bg-purple-800 text-purple-200 border border-purple-600 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        📷 Fotografar Aura (-1 PE)
      </button>
    );
  } else if (ln.includes('emissor de pulsos')) {
    buttons.push(
      <button
        key="use-emissor"
        type="button"
        onClick={() => {
          if (!onSpendResource(1)) return;
          onFeedback(
            `📡 Emissor de Pulsos Paranormais (-1 PE): pulso emitido (atrai criaturas do elemento oposto e afasta do mesmo elemento em alcance longo).`
          );
        }}
        className="px-2.5 py-1 bg-purple-950/80 hover:bg-purple-800 text-purple-200 border border-purple-600 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        📡 Emitir Pulso (-1 PE)
      </button>
    );
  } else if (ln.includes('escuta de ruídos') || ln.includes('escuta de ruidos')) {
    buttons.push(
      <button
        key="use-escuta"
        type="button"
        onClick={() => {
          if (!onSpendResource(2)) return;
          onFeedback(
            `🎙️ Escuta de Ruídos Paranormais (-2 PE): gravação de ruídos paranormais iniciada (+5 em Ocultismo para identificar fenômenos na área).`
          );
        }}
        className="px-2.5 py-1 bg-purple-950/80 hover:bg-purple-800 text-purple-200 border border-purple-600 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        🎙️ Gravar Ruídos (-2 PE)
      </button>
    );
  } else if (ln.includes('scanner de manifestação') || ln.includes('scanner de manifestacao')) {
    buttons.push(
      <button
        key="use-scanner"
        type="button"
        onClick={() => {
          if (!onSpendResource(1)) return;
          onFeedback(
            `📡 Scanner de Manifestação (${item.element || 'Elemento'}) ativado (-1 PE): detecta manifestações em alcance longo até o fim da cena.`
          );
        }}
        className="px-2.5 py-1 bg-purple-950/80 hover:bg-purple-800 text-purple-200 border border-purple-600 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        📡 Ativar Scanner (-1 PE)
      </button>
    );
  } else if (ln.includes('medidor de estabilidade')) {
    buttons.push(
      <button
        key="use-medidor"
        type="button"
        onClick={() =>
          onFeedback(
            `📟 Medidor de Estabilidade da Membrana: leitura realizada — o Mestre informa o estado atual da Membrana (Intacta, Estável, Danificada, Arruinada ou Rompida).`
          )
        }
        className="px-2.5 py-1 bg-purple-950/80 hover:bg-purple-800 text-purple-200 border border-purple-600 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        📟 Medir Membrana
      </button>
    );
  }

  // ============================================================================
  // 6. ITENS AMALDIÇOADOS ESPECIAIS (Cap. 6, p. 148–151)
  // ============================================================================
  if (ln.includes('peitoral da segunda chance')) {
    buttons.push(
      <button
        key="use-peitoral"
        type="button"
        onClick={() => {
          if (!onSpendResource(5)) return;
          const riskDie = Math.floor(Math.random() * 10) + 1;
          onRoll(
            `⚡ Peitoral da Segunda Chance (Reanimação 0 PV • Risco 1d10 = ${riskDie}${
              riskDie === 1 ? ' — ⚠️ QUEBROU!' : ' — OK'
            })`,
            4,
            10,
            0,
            true
          );
          onFeedback(
            riskDie === 1
              ? `💥 Peitoral da Segunda Chance (-5 PE): você recuperou 4d10 PV, mas rolou 1 no d10 de risco — o Peitoral se desfez em plasma!`
              : `⚡ Peitoral da Segunda Chance (-5 PE): você reanimou com 4d10 PV! (Risco 1d10 = ${riskDie}, intacto.)`
          );
        }}
        className="px-2.5 py-1 bg-purple-950/90 hover:bg-purple-700 text-purple-100 border border-purple-500 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        ⚡ Reanimar 0 PV (-5 PE • 4d10 PV + Risco)
      </button>
    );
  } else if (ln.includes('crânio espiral') || ln.includes('cranio espiral')) {
    const uses = item.dailyUses || 0;
    const dt = 15 + uses * 5;
    buttons.push(
      <button
        key="use-cranio"
        type="button"
        onClick={() => {
          onUpdateItem({ ...item, dailyUses: uses + 1 });
          rollSkill('vontade', 'pre', `💀 Crânio Espiral (+1 Ação Padrão • Vontade DT ${dt})`);
          onFeedback(
            `💀 Crânio Espiral ativado: +1 Ação Padrão neste turno! Em falha em Vontade DT ${dt}, o crânio não funciona mais hoje e você envelhece 1d10 anos.`
          );
        }}
        className="px-2.5 py-1 bg-zinc-900 hover:bg-purple-900 text-purple-200 border border-purple-600 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        💀 +1 Ação Padrão (Vontade DT {dt})
      </button>,
      ...(uses > 0
        ? [
            <button
              key="reset-cranio"
              type="button"
              onClick={() => onUpdateItem({ ...item, dailyUses: 0 })}
              className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-lg text-[10px] font-bold cursor-pointer"
              title="Resetar usos diários (novo dia)"
            >
              ↺ Dia ({uses})
            </button>,
          ]
        : [])
    );
  } else if (ln.includes('frasco de lodo')) {
    buttons.push(
      <button
        key="lodo-recente"
        type="button"
        onClick={() => {
          onRoll(`🖤 Frasco de Lodo (Ferida Recente — Cura de PV)`, 6, 8, 20, true);
          onConsumeUnit(item.id);
          onFeedback(`🖤 Frasco de Lodo aplicado em ferida recente (6d8+20 PV) — 1 unidade consumida.`);
        }}
        className="px-2.5 py-1 bg-zinc-900 hover:bg-emerald-800 text-emerald-200 border border-emerald-700 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        🖤 Recente (6d8+20 PV • -1 un.)
      </button>,
      <button
        key="lodo-antiga"
        type="button"
        onClick={() => {
          const d6 = Math.floor(Math.random() * 6) + 1;
          const isEven = d6 % 2 === 0;
          onRoll(
            `🎲 Frasco de Lodo (Ferida Antiga • 1d6 = ${d6} ${
              isEven ? 'PAR → CURA PV' : 'ÍMPAR → DANO DE MORTE'
            })`,
            3,
            8,
            10,
            true
          );
          onConsumeUnit(item.id);
          onFeedback(
            isEven
              ? `🖤 Frasco de Lodo (Ferida Antiga • 1d6=${d6} PAR): curou 3d8+10 PV! -1 unidade.`
              : `💀 Frasco de Lodo (Ferida Antiga • 1d6=${d6} ÍMPAR): causou 3d8+10 de dano de Morte! -1 unidade.`
          );
        }}
        className="px-2.5 py-1 bg-zinc-900 hover:bg-purple-800 text-purple-200 border border-purple-700 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        🎲 Antiga (3d8+10 Par/Ímpar • -1 un.)
      </button>
    );
  } else if (ln.includes('pérola de sangue') || ln.includes('perola de sangue')) {
    buttons.push(
      <button
        key="perola-absorver"
        type="button"
        onClick={() => {
          if (onAddSceneEffect) {
            onAddSceneEffect({
              id: `perola-sangue-${Date.now()}`,
              name: 'Pérola de Sangue (+5 FOR/AGI/VIG)',
              description:
                '+5 em testes de Agilidade, Força e Vigor até o fim da cena. Ao fim da cena: Fortitude DT 20 ou 1d4+1 turnos Enjoado e 1d6 dano de Sangue.',
              modifiers: [],
            });
          }
          onFeedback(
            `🔴 Pérola de Sangue absorvida: +5 em testes de FOR, AGI e VIG até o fim da cena (efeito adicionado na cena)!`
          );
        }}
        className="px-2.5 py-1 bg-red-950/90 hover:bg-red-700 text-red-200 border border-red-600 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        🔴 Absorver (+5 FOR/AGI/VIG Cena)
      </button>,
      <button
        key="perola-pos"
        type="button"
        onClick={() =>
          rollSkill('fortitude', 'vig', `🩸 Pérola de Sangue — Pós-Cena (Fortitude DT 20)`)
        }
        className="px-2.5 py-1 bg-zinc-900 hover:bg-red-900 text-red-300 border border-red-800 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        🩸 Pós-Cena (Fort DT 20)
      </button>
    );
  } else if (ln.includes('coração pulsante') || ln.includes('coracao pulsante')) {
    const uses = item.dailyUses || 0;
    const dt = 15 + uses * 5;
    buttons.push(
      <button
        key="use-coracao"
        type="button"
        onClick={() => {
          onUpdateItem({ ...item, dailyUses: uses + 1 });
          rollSkill('fortitude', 'vig', `❤️ Coração Pulsante (½ Dano • Fortitude DT ${dt})`);
          onFeedback(
            `❤️ Coração Pulsante espremido (Reação): reduz dano sofrido pela metade! Se falhar em Fortitude DT ${dt}, o coração se desfaz.`
          );
        }}
        className="px-2.5 py-1 bg-red-950/90 hover:bg-red-700 text-red-200 border border-red-600 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        ❤️ Espremer (½ Dano • Fort DT {dt})
      </button>,
      ...(uses > 0
        ? [
            <button
              key="reset-coracao"
              type="button"
              onClick={() => onUpdateItem({ ...item, dailyUses: 0 })}
              className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-lg text-[10px] font-bold cursor-pointer"
            >
              ↺ ({uses})
            </button>,
          ]
        : [])
    );
  } else if (ln.includes('frasco de vitalidade')) {
    const stored = item.storedBloodPv || 0;
    buttons.push(
      <button
        key="vitalidade-armazenar"
        type="button"
        disabled={stored >= 20}
        onClick={() => {
          const add = Math.min(5, 20 - stored);
          if (onTakePvDamage) onTakePvDamage(add, 'Frasco de Vitalidade (armazenar sangue)');
          onUpdateItem({ ...item, storedBloodPv: stored + add });
          onFeedback(
            `🩸 ${add} PV transferidos para o Frasco de Vitalidade (${stored + add}/20 PV armazenados).`
          );
        }}
        className="px-2.5 py-1 bg-red-950/80 hover:bg-red-800 disabled:opacity-40 text-red-200 border border-red-700 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        🩸 Guardar 5 PV ({stored}/20)
      </button>,
      <button
        key="vitalidade-beber"
        type="button"
        disabled={stored <= 0}
        onClick={() => {
          if (onHealPv) onHealPv(stored, 'Frasco de Vitalidade');
          onUpdateItem({ ...item, storedBloodPv: 0 });
          rollSkill('fortitude', 'vig', `💚 Frasco de Vitalidade (Beber +${stored} PV • Fortitude DT 20)`);
          onFeedback(
            `💚 Você bebeu ${stored} PV do Frasco de Vitalidade! Role Fortitude DT 20 (em falha, fica Enjoado por 1 rodada).`
          );
        }}
        className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-700 disabled:opacity-40 text-emerald-200 border border-emerald-600 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        💚 Beber (+{stored} PV)
      </button>
    );
  } else if (ln.includes('pergaminho da pertinácia') || ln.includes('pergaminho da pertinacia')) {
    const uses = item.dailyUses || 0;
    const dt = 15 + uses * 5;
    buttons.push(
      <button
        key="use-pergaminho"
        type="button"
        onClick={() => {
          if (onGrantTempPe) onGrantTempPe(5, 'Pergaminho da Pertinácia');
          onUpdateItem({ ...item, dailyUses: uses + 1 });
          rollSkill('ocultismo', 'int', `📜 Pergaminho da Pertinácia (+5 PE Temp • Ocultismo DT ${dt})`);
          onFeedback(
            `📜 Pergaminho da Pertinácia: +5 PE Temporários concedidos! Se falhar em Ocultismo DT ${dt}, o pergaminho vira cinzas.`
          );
        }}
        className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-700 text-amber-200 border border-amber-600 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        📜 +5 PE Temp (Ocultismo DT {dt})
      </button>,
      ...(uses > 0
        ? [
            <button
              key="reset-pergaminho"
              type="button"
              onClick={() => onUpdateItem({ ...item, dailyUses: 0 })}
              className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-lg text-[10px] font-bold cursor-pointer"
            >
              ↺ ({uses})
            </button>,
          ]
        : [])
    );
  } else if (ln.includes('talismã da sorte') || ln.includes('talisma da sorte')) {
    buttons.push(
      <button
        key="use-talisma"
        type="button"
        onClick={() => {
          if (!onSpendResource(3)) return;
          onRoll(
            `🍀 Talismã da Sorte (-3 PE • 1=Falha+Dano / 2-3=Imune ao dano / 4=Imune+Sorte)`,
            1,
            4,
            0,
            true
          );
          onFeedback(`🍀 Talismã da Sorte ativado (-3 PE): role 1d4 para definir o destino!`);
        }}
        className="px-2.5 py-1 bg-purple-950/80 hover:bg-purple-700 text-purple-200 border border-purple-500 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        🍀 Ativar (-3 PE • 1d4)
      </button>
    );
  } else if (ln.includes('relógio de arnaldo') || ln.includes('relogio de arnaldo')) {
    const uses = item.dailyUses || 0;
    const peCost = uses + 1;
    buttons.push(
      <button
        key="use-relogio"
        type="button"
        onClick={() => {
          if (!onSpendResource(peCost)) return;
          onUpdateItem({ ...item, dailyUses: uses + 1 });
          onFeedback(
            `⏱️ Relógio de Arnaldo (-${peCost} PE): você rerrolou um resultado 1 no dado! (Próximo uso nesta cena custará ${peCost + 1} PE.)`
          );
        }}
        className="px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-700 text-cyan-200 border border-cyan-500 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        ⏱️ Rerrolar 1 (-{peCost} PE)
      </button>,
      ...(uses > 0
        ? [
            <button
              key="reset-relogio"
              type="button"
              onClick={() => onUpdateItem({ ...item, dailyUses: 0 })}
              className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-lg text-[10px] font-bold cursor-pointer"
            >
              ↺ Cena ({uses})
            </button>,
          ]
        : [])
    );
  } else if (ln.includes('bateria reversa')) {
    const uses = item.dailyUses || 0;
    const dt = 15 + uses * 5;
    buttons.push(
      <button
        key="use-bateria"
        type="button"
        onClick={() => {
          if (!onSpendResource(2)) return;
          onUpdateItem({ ...item, dailyUses: uses + 1 });
          rollSkill('ocultismo', 'int', `🔋 Bateria Reversa (-2 PE • Ocultismo DT ${dt})`);
          onFeedback(
            `🔋 Bateria Reversa acionada (-2 PE): drena ou transfere energia de dispositivo eletrônico. Em falha (DT ${dt}), explode causando 12d6 de Energia!`
          );
        }}
        className="px-2.5 py-1 bg-purple-950/80 hover:bg-purple-700 text-purple-200 border border-purple-500 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        🔋 Drenar/Transferir (-2 PE • DT {dt})
      </button>,
      ...(uses > 0
        ? [
            <button
              key="reset-bateria"
              type="button"
              onClick={() => onUpdateItem({ ...item, dailyUses: 0 })}
              className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-lg text-[10px] font-bold cursor-pointer"
            >
              ↺ ({uses})
            </button>,
          ]
        : [])
    );
  } else if (ln.includes('amarras mortais')) {
    buttons.push(
      <button
        key="use-amarras-mortais"
        type="button"
        onClick={() => {
          if (!onSpendResource(2)) return;
          rollSkill('luta', 'for', `⛓️ Amarras Mortais — Manobra Agarrar (+10 Luta)`, 10);
          onFeedback(`⛓️ Amarras Mortais (-2 PE): manobra Agarrar rolada com +10!`);
        }}
        className="px-2.5 py-1 bg-zinc-900 hover:bg-purple-800 text-purple-200 border border-purple-600 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        ⛓️ Agarrar +10 (-2 PE)
      </button>
    );
  } else if (ln.includes('máscara das pessoas nas sombras') || ln.includes('mascara das pessoas nas sombras')) {
    buttons.push(
      <button
        key="use-mascara"
        type="button"
        onClick={() => {
          if (!onSpendResource(2)) return;
          onFeedback(
            `👤 Máscara das Pessoas nas Sombras (-2 PE, Ação de Movimento): teleporte instantâneo para outra sombra em alcance médio!`
          );
        }}
        className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-700 text-amber-200 border border-amber-600 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        👤 Teleporte Sombras (-2 PE)
      </button>
    );
  } else if (ln.includes('jaqueta de veríssimo') || ln.includes('jaqueta de verissimo')) {
    buttons.push(
      <button
        key="use-jaqueta"
        type="button"
        onClick={() => {
          if (!onSpendResource(2)) return;
          onFeedback(
            `🛡️ Jaqueta de Veríssimo (-2 PE, Reação): você se joga na frente de um aliado adjacente e absorve o dano no lugar dele (com sua RD Paranormal 15)!`
          );
        }}
        className="px-2.5 py-1 bg-zinc-800 hover:bg-amber-700 text-amber-200 border border-amber-500/80 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        🛡️ Interceptar Dano Aliado (-2 PE)
      </button>
    );
  } else if (ln.includes('lanterna reveladora')) {
    buttons.push(
      <button
        key="use-lanterna-rev"
        type="button"
        onClick={() => {
          if (!onSpendResource(1)) return;
          onFeedback(
            `🔦 Lanterna Reveladora (-1 PE): feixe de luz paranormal ativo (efeito similar a Terceiro Olho — revela auras, invisíveis e passagens ocultas).`
          );
        }}
        className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-700 text-amber-200 border border-amber-600 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        🔦 Revelar / Terceiro Olho (-1 PE)
      </button>
    );
  } else if (ln.includes('tela do pesadelo')) {
    buttons.push(
      <button
        key="use-tela-pesadelo"
        type="button"
        onClick={() => {
          if (!onSpendResource(2)) return;
          onFeedback(
            `📱 Tela do Pesadelo (-2 PE): quem olhar a tela sofre Vontade DT ${10 + peLimit + (ordemSheetData.attributes.pre || 0)} ou fica Apavorado e sofre 4d6 Mental!`
          );
        }}
        className="px-2.5 py-1 bg-purple-950/80 hover:bg-purple-700 text-purple-200 border border-purple-500 rounded-lg text-[11px] font-bold transition cursor-pointer"
      >
        📱 Armar Tela (-2 PE)
      </button>
    );
  }

  // ============================================================================
  // 7. MALDIÇÕES ATIVAS EM PROTEÇÕES / ACESSÓRIOS EQUIPADOS
  // ============================================================================
  if (item.isEquipped && item.curses && item.curses.length > 0) {
    const curseIds = new Set(item.curses.map((c) => c.curseId));
    if (curseIds.has('curse-prot-regenerativa')) {
      buttons.push(
        <button
          key="curse-regen"
          type="button"
          onClick={() => {
            if (!onSpendResource(1)) return;
            onRoll(`🩸 Proteção Regenerativa (-1 PE • Cura PV)`, 1, 12, 0, true);
            onFeedback(`🩸 Regenerativa ativada (-1 PE, Ação Livre): role 1d12 para curar PV!`);
          }}
          className="px-2.5 py-1 bg-red-950/80 hover:bg-red-700 text-red-200 border border-red-600 rounded-lg text-[11px] font-bold transition cursor-pointer"
        >
          🩸 Regenerativa (+1d12 PV • -1 PE)
        </button>
      );
    }
    if (curseIds.has('curse-prot-voltaica')) {
      buttons.push(
        <button
          key="curse-voltaica"
          type="button"
          onClick={() => {
            if (!onSpendResource(2)) return;
            onRoll(`⚡ Proteção Voltaica (-2 PE • 2d6 Eletricidade + Atordoado)`, 2, 6, 0, true);
            onFeedback(`⚡ Voltaica ativada (-2 PE, Reação): atacante adjacente sofre 2d6 Eletricidade!`);
          }}
          className="px-2.5 py-1 bg-purple-950/80 hover:bg-purple-700 text-purple-200 border border-purple-500 rounded-lg text-[11px] font-bold transition cursor-pointer"
        >
          ⚡ Voltaica (2d6 Eletr. • -2 PE)
        </button>
      );
    }
    if (curseIds.has('curse-prot-repulsiva')) {
      buttons.push(
        <button
          key="curse-repulsiva"
          type="button"
          onClick={() => {
            if (!onSpendResource(2)) return;
            onRoll(`🖤 Proteção Repulsiva (-2 PE • 2d8 Morte + Empurrão)`, 2, 8, 0, true);
            onFeedback(`🖤 Repulsiva ativada (-2 PE, Reação): atacante sofre 2d8 de Morte e é empurrado!`);
          }}
          className="px-2.5 py-1 bg-zinc-900 hover:bg-purple-800 text-purple-200 border border-purple-600 rounded-lg text-[11px] font-bold transition cursor-pointer"
        >
          🖤 Repulsiva (2d8 Morte • -2 PE)
        </button>
      );
    }
    if (curseIds.has('curse-prot-profetica')) {
      buttons.push(
        <button
          key="curse-profetica"
          type="button"
          onClick={() => {
            if (!onSpendResource(2)) return;
            onFeedback(`👁️ Profética (-2 PE, Reação): você pode rerrolar o teste de resistência que acabou de falhar!`);
          }}
          className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-700 text-amber-200 border border-amber-600 rounded-lg text-[11px] font-bold transition cursor-pointer"
        >
          👁️ Profética: Rerrolar Resist. (-2 PE)
        </button>
      );
    }
    if (curseIds.has('curse-prot-lepida')) {
      buttons.push(
        <button
          key="curse-lepida"
          type="button"
          onClick={() => {
            if (!onSpendResource(2)) return;
            onFeedback(`💨 Lépida (-2 PE): salto sobrenatural / +10 em Atletismo neste turno!`);
          }}
          className="px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-700 text-cyan-200 border border-cyan-600 rounded-lg text-[11px] font-bold transition cursor-pointer"
        >
          💨 Lépida: Impulso (-2 PE)
        </button>
      );
    }
  }

  if (buttons.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-800/70">
      {buttons}
    </div>
  );
}
