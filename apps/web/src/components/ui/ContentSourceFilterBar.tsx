import {
  SystemId,
  getContentSourcesForSystem,
  getSourceDisplayName,
  getSourceShortName,
  toggleContentSourceSelection,
} from '@totalrpg/shared';

interface ContentSourceFilterBarProps {
  system: SystemId;
  allowedSources?: string[] | null;
  selectedSources: string[];
  onChange: (nextSelected: string[]) => void;
  compact?: boolean;
  className?: string;
}

export function ContentSourceFilterBar({
  system,
  allowedSources,
  selectedSources,
  onChange,
  compact = false,
  className = '',
}: ContentSourceFilterBarProps) {
  const allSystemSources = getContentSourcesForSystem(system);
  const availableSources =
    Array.isArray(allowedSources) && allowedSources.length > 0
      ? allSystemSources.filter((s) => allowedSources.includes(s.id))
      : allSystemSources;

  // Se o sistema ou a campanha só possui 1 fonte disponível, não precisa poluir com filtro
  if (availableSources.length <= 1) {
    return null;
  }

  const isAllActive = selectedSources.length === 0;
  const padCls = compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]';

  return (
    <div
      role="group"
      aria-label="Filtrar por livro ou suplemento"
      className={`flex flex-wrap items-center gap-1.5 ${className}`}
    >
      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mr-0.5">
        Fonte:
      </span>
      <button
        type="button"
        aria-pressed={isAllActive}
        onClick={() => onChange([])}
        className={`${padCls} rounded-full font-bold border transition cursor-pointer ${
          isAllActive
            ? 'bg-amber-600 border-amber-500 text-white shadow-sm'
            : 'bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
        }`}
      >
        Todos
      </button>
      {availableSources.map((src) => {
        const isSelected = !isAllActive && selectedSources.includes(src.id);
        return (
          <button
            key={src.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() =>
              onChange(toggleContentSourceSelection(selectedSources, src.id))
            }
            className={`${padCls} rounded-full font-bold border transition cursor-pointer ${
              isSelected
                ? src.isBaseBook
                  ? 'bg-zinc-200 border-zinc-100 text-zinc-950 shadow-sm'
                  : 'bg-red-700 border-red-500 text-white shadow-sm'
                : 'bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
            }`}
          >
            {src.name}
          </button>
        );
      })}
    </div>
  );
}

export function SourceTagBadge({
  sourceId,
  system = 'ordem-paranormal',
}: {
  sourceId?: string;
  system?: SystemId;
}) {
  const eff = sourceId || (system === 'ordem-paranormal' ? 'ordem-base' : 't20-base');
  if (eff === 'ordem-base' || eff === 't20-base') {
    return null;
  }
  const label = getSourceShortName(eff, system);
  return (
    <span className="inline-block max-w-full truncate whitespace-nowrap align-middle px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-950/70 text-red-300 border border-red-800/70"
      title={getSourceDisplayName(eff, system)}>
      {label}
    </span>
  );
}
