import { useEffect, useRef, useState } from 'react';
import { Icon } from '../ui/Icon';

/** Usado só até a TV informar o tamanho real da janela dela (ou se nenhuma TV estiver aberta). */
const FALLBACK = { width: 1920, height: 1080 };
const STORAGE_KEY = 'totalrpg_tv_mirror_visible';

/**
 * Espelho ao vivo da TV dentro do escudo do mestre. É a mesma tela do 2º monitor,
 * conectada à mesa e recebendo os mesmos eventos, montada no MESMO tamanho da janela
 * da TV (que ela informa pela mesa) e só então reduzida — assim o layout é idêntico,
 * seja a TV 4K, 1080p ou um notebook. Sem cliques e com dados 2D para pesar pouco.
 */
export function MonitorMirror({ campaignId }: { campaignId: string }) {
  const [visible, setVisible] = useState(() => localStorage.getItem(STORAGE_KEY) !== '0');
  const [reloadKey, setReloadKey] = useState(0);
  const [scale, setScale] = useState(0.3);
  const [tvSize, setTvSize] = useState<{ width: number; height: number } | null>(null);
  const size = tvSize || FALLBACK;

  // A prévia (iframe) repassa o tamanho que a janela da TV informou.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data as { type?: string; campaignId?: string; width?: number; height?: number };
      if (d?.type !== 'totalrpg:tv-viewport' || d.campaignId !== campaignId) return;
      if (typeof d.width === 'number' && typeof d.height === 'number' && d.width > 0 && d.height > 0) {
        setTvSize({ width: Math.round(d.width), height: Math.round(d.height) });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [campaignId]);
  const frameBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, visible ? '1' : '0');
  }, [visible]);

  useEffect(() => {
    const box = frameBoxRef.current;
    if (!box) return;
    const update = () => setScale(box.clientWidth / size.width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(box);
    return () => ro.disconnect();
  }, [visible, size.width]);

  const src = `/?monitorCampaignId=${encodeURIComponent(campaignId)}&preview=1`;

  return (
    <section className="flex flex-col gap-2" aria-label="Espelho da TV">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <Icon name="eye" /> O que a TV está mostrando
          {visible && (
            <span className="inline-flex items-center gap-1.5 text-xs font-normal text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden /> ao vivo
            </span>
          )}
        </h4>
        <div className="flex gap-1">
          {visible && (
            <button
              type="button"
              className="trpg-btn-quiet trpg-btn-sm"
              onClick={() => setReloadKey((k) => k + 1)}
              title="Recarrega só o espelho, não a TV"
            >
              <Icon name="refresh" size={14} /> Recarregar espelho
            </button>
          )}
          <button type="button" className="trpg-btn-quiet trpg-btn-sm" onClick={() => setVisible((v) => !v)}>
            <Icon name={visible ? 'eye-off' : 'eye'} size={14} /> {visible ? 'Ocultar' : 'Mostrar espelho'}
          </button>
        </div>
      </div>

      {visible && (
        <div
          ref={frameBoxRef}
          className="relative overflow-hidden rounded-lg border border-zinc-700 bg-black mx-auto"
          style={{
            aspectRatio: `${size.width} / ${size.height}`,
            // TV em pé ou muito alta: limita a altura e estreita o quadro, mantendo a proporção.
            width: `min(100%, calc(65vh * ${size.width} / ${size.height}))`,
          }}
        >
          <iframe
            key={reloadKey}
            src={src}
            title="Espelho da tela da TV"
            tabIndex={-1}
            loading="lazy"
            className="absolute top-0 left-0 border-0 pointer-events-none origin-top-left"
            style={{ width: size.width, height: size.height, transform: `scale(${scale})` }}
          />
        </div>
      )}
      {visible && (
        <p className="text-xs text-zinc-500">
          {tvSize
            ? `Mesmo layout da TV (janela de ${tvSize.width}×${tvSize.height}).`
            : 'Nenhuma TV aberta informou o tamanho ainda; mostrando como ficaria em 1920×1080.'}{' '}
          Os dados aparecem em 2D aqui; na TV continuam em 3D.
        </p>
      )}
    </section>
  );
}
