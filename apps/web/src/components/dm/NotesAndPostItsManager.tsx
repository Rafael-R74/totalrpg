import { useState, useRef, useEffect } from 'react';
import { StickyPostIt } from '@totalrpg/shared';
import { DMScreenCharacter } from '../../services/api';

interface NotesAndPostItsManagerProps {
  typedNotes: string;
  onUpdateTypedNotes: (val: string) => void;
  postIts: StickyPostIt[];
  characters: DMScreenCharacter[];
  onUpdatePostIts: (next: StickyPostIt[]) => void;
  onBroadcastPostIt: (postIt: StickyPostIt, action: 'show' | 'hide') => void;
}

const POSTIT_COLORS: Record<StickyPostIt['color'], { bg: string; border: string; header: string }> = {
  amber: {
    bg: 'bg-amber-950/95',
    border: 'border-amber-500',
    header: 'bg-amber-900/80 text-amber-200',
  },
  red: {
    bg: 'bg-red-950/95',
    border: 'border-red-500',
    header: 'bg-red-900/80 text-red-200',
  },
  blue: {
    bg: 'bg-blue-950/95',
    border: 'border-blue-500',
    header: 'bg-blue-900/80 text-blue-200',
  },
  emerald: {
    bg: 'bg-emerald-950/95',
    border: 'border-emerald-500',
    header: 'bg-emerald-900/80 text-emerald-200',
  },
  purple: {
    bg: 'bg-purple-950/95',
    border: 'border-purple-500',
    header: 'bg-purple-900/80 text-purple-200',
  },
};

export function NotesAndPostItsManager({
  typedNotes,
  onUpdateTypedNotes,
  postIts,
  onUpdatePostIts,
  onBroadcastPostIt,
}: NotesAndPostItsManagerProps) {
  const [noteMode, setNoteMode] = useState<'text' | 'draw'>('text');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#f59e0b');
  const [brushSize, setBrushSize] = useState(3);

  const [postItTitle, setPostItTitle] = useState('');
  const [postItColor, setPostItColor] = useState<StickyPostIt['color']>('amber');

  useEffect(() => {
    if (noteMode === 'draw' && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [noteMode]);

  function startDrawing(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  }

  function drawMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function handleTransformCurrentIntoPostIt() {
    let drawingDataUrl: string | undefined = undefined;
    let textContent = '';

    if (noteMode === 'draw' && canvasRef.current) {
      drawingDataUrl = canvasRef.current.toDataURL('image/png');
    } else {
      textContent = typedNotes.trim();
      if (!textContent) {
        alert('Digite alguma anotação antes de transformar em Post-it!');
        return;
      }
    }

    const offsetCount = postIts.length % 5;
    const newPost: StickyPostIt = {
      id: Math.random().toString(36).substring(2, 9),
      title: postItTitle.trim() || (noteMode === 'draw' ? 'Desenho / Símbolo' : 'Anotação Destacada'),
      textContent,
      drawingDataUrl,
      color: postItColor,
      x: 120 + offsetCount * 35,
      y: 120 + offsetCount * 35,
      width: 310,
      height: noteMode === 'draw' ? 340 : 250,
      isPinned: true,
      sharedWithCharacterIds: [],
    };

    onUpdatePostIts([...postIts, newPost]);
    setPostItTitle('');
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-5 shadow-lg">
      <div className="flex flex-wrap justify-between items-center gap-3 border-b border-zinc-800 pb-3">
        <div>
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-amber-500">
            🎨 Anotações da Sessão (Texto & Desenho Livre)
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Escreva ou desenhe livremente e destaque qualquer anotação como um Post-it flutuante na tela.
          </p>
        </div>

        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => setNoteMode('text')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              noteMode === 'text' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            📝 Texto Digitado
          </button>
          <button
            type="button"
            onClick={() => setNoteMode('draw')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              noteMode === 'draw' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            🖌️ Desenhar (Canvas)
          </button>
        </div>
      </div>

      {noteMode === 'text' ? (
        <textarea
          rows={10}
          value={typedNotes}
          onChange={(e) => onUpdateTypedNotes(e.target.value)}
          placeholder="Digite aqui suas anotações da sessão, pistas, nomes de NPCs ou segredos..."
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 leading-relaxed focus:outline-none focus:border-amber-500"
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap justify-between items-center gap-3 bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-semibold">Cor do Pincel:</span>
              {['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#a855f7', '#ffffff'].map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setBrushColor(hex)}
                  className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                    brushColor === hex ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
              <button
                type="button"
                onClick={() => setBrushColor('#09090b')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold border cursor-pointer ${
                  brushColor === '#09090b'
                    ? 'bg-zinc-700 text-white border-white'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                }`}
              >
                🧽 Borracha
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Traço:</span>
              <input
                type="range"
                min={1}
                max={18}
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-20 accent-amber-500 cursor-pointer"
              />
              <button
                type="button"
                onClick={clearCanvas}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-red-950 text-zinc-300 hover:text-red-300 rounded text-xs font-semibold cursor-pointer"
              >
                Limpar Quadro
              </button>
            </div>
          </div>

          <div className="border-2 border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 flex justify-center">
            <canvas
              ref={canvasRef}
              width={720}
              height={360}
              onMouseDown={startDrawing}
              onMouseMove={drawMove}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="cursor-crosshair w-full max-w-[720px] h-[360px]"
            />
          </div>
        </div>
      )}

      {/* BARRA INTEGRADA: TRANSFORMAR ANOTAÇÃO/DESENHO ATUAL EM POST-IT */}
      <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <span className="text-xs font-bold text-amber-400 whitespace-nowrap">
            📌 Transformar {noteMode === 'draw' ? 'Desenho Atual' : 'Anotação Atual'} em Post-it:
          </span>

          <input
            type="text"
            value={postItTitle}
            onChange={(e) => setPostItTitle(e.target.value)}
            placeholder="Nome / Título da anotação..."
            className="flex-1 min-w-[180px] bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
          />

          <select
            value={postItColor}
            onChange={(e) => setPostItColor(e.target.value as StickyPostIt['color'])}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
          >
            <option value="amber">🟨 Cor: Amarelo</option>
            <option value="red">🟥 Cor: Vermelho</option>
            <option value="blue">🟦 Cor: Azul</option>
            <option value="emerald">🟩 Cor: Verde</option>
            <option value="purple">🟪 Cor: Roxo</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleTransformCurrentIntoPostIt}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-extrabold transition cursor-pointer shadow whitespace-nowrap"
        >
          📌 Destacar como Post-it na Tela
        </button>
      </div>

      {/* Lista Compacta de Post-its Salvos */}
      {postIts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800">
          <span className="text-[11px] font-bold uppercase text-zinc-400">
            Post-its Salvos ({postIts.length}):
          </span>
          {postIts.map((post) => {
            const sharedCount = Array.isArray(post.sharedWithCharacterIds)
              ? post.sharedWithCharacterIds.length
              : 0;

            return (
              <div
                key={post.id}
                className="bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-lg flex items-center gap-2 text-xs"
              >
                <button
                  type="button"
                  onClick={() =>
                    onUpdatePostIts(
                      postIts.map((p) => (p.id === post.id ? { ...p, isPinned: !p.isPinned } : p))
                    )
                  }
                  className={`font-bold cursor-pointer ${
                    post.isPinned ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {post.isPinned ? '📌 ' : '👁️‍🗨️ '}
                  {post.title}
                  {sharedCount > 0 && (
                    <span className="ml-1 text-[10px] text-emerald-400">
                      ({sharedCount} vendo)
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (sharedCount > 0) {
                      onBroadcastPostIt({ ...post, sharedWithCharacterIds: [] }, 'hide');
                    }
                    onUpdatePostIts(postIts.filter((p) => p.id !== post.id));
                  }}
                  className="text-zinc-600 hover:text-red-400 cursor-pointer"
                  title="Excluir Post-it"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// CAMADA GLOBAL DE POST-ITS FLUTUANTES (Para o Mestre e para os Jogadores!)
interface FloatingPostItsLayerProps {
  postIts: StickyPostIt[];
  characters?: DMScreenCharacter[];
  isDMView: boolean;
  onUpdatePostIt?: (updated: StickyPostIt) => void;
  onUpdatePostItSharing?: (postIt: StickyPostIt, nextCharacterIds: string[]) => void;
  onClosePlayerPostIt?: (id: string) => void;
}

export function FloatingPostItsLayer({
  postIts,
  characters = [],
  isDMView,
  onUpdatePostIt,
  onUpdatePostItSharing,
  onClosePlayerPostIt,
}: FloatingPostItsLayerProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (!draggingId || !onUpdatePostIt) return;

    function handleMouseMove(e: MouseEvent) {
      const target = postIts.find((p) => p.id === draggingId);
      if (!target || !onUpdatePostIt) return;
      onUpdatePostIt({
        ...target,
        x: Math.max(10, e.clientX - dragOffset.x),
        y: Math.max(10, e.clientY - dragOffset.y),
      });
    }

    function handleMouseUp() {
      setDraggingId(null);
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, dragOffset, postIts, onUpdatePostIt]);

  const visiblePostIts = postIts.filter((p) => p.isPinned);
  if (visiblePostIts.length === 0) return null;

  return (
    <>
      {visiblePostIts.map((post) => {
        const theme = POSTIT_COLORS[post.color] || POSTIT_COLORS.amber;
        const sharedIds = Array.isArray(post.sharedWithCharacterIds)
          ? post.sharedWithCharacterIds
          : [];

        const allCharIds = characters.map((c) => c.id);
        const isSharedWithAll =
          allCharIds.length > 0 && allCharIds.every((id) => sharedIds.includes(id));

        return (
          <div
            key={post.id}
            style={{
              left: `${post.x}px`,
              top: `${post.y}px`,
              width: `${post.width}px`,
              height: `${post.height}px`,
              resize: 'both',
              overflowX: 'hidden',
              overflowY: 'auto',
            }}
            className={`fixed z-40 ${theme.bg} border-2 ${theme.border} rounded-2xl shadow-2xl flex flex-col justify-between backdrop-blur-md`}
          >
            {/* Cabeçalho Arrastável (Funciona tanto para o Mestre quanto para o Jogador!) */}
            <div
              onMouseDown={(e) => {
                setDraggingId(post.id);
                setDragOffset({ x: e.clientX - post.x, y: e.clientY - post.y });
              }}
              className={`${theme.header} px-3 py-2 cursor-move flex justify-between items-center select-none`}
              title="Arraste para mover o Post-it pela sua tela"
            >
              <span className="text-xs font-extrabold truncate">📌 {post.title}</span>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => {
                  if (isDMView && onUpdatePostIt) {
                    onUpdatePostIt({ ...post, isPinned: false });
                  } else if (onClosePlayerPostIt) {
                    onClosePlayerPostIt(post.id);
                  }
                }}
                className="text-xs font-bold opacity-80 hover:opacity-100 px-1.5 cursor-pointer"
                title="Fechar Post-it"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo do Post-it */}
            <div className="p-3 flex-1 flex flex-col gap-2 overflow-y-auto overflow-x-hidden w-full min-w-0">
              {isDMView && onUpdatePostIt ? (
                <textarea
                  value={post.textContent}
                  onChange={(e) => onUpdatePostIt({ ...post, textContent: e.target.value })}
                  placeholder="Título/Notas..."
                  className="w-full flex-1 bg-transparent text-xs text-white resize-none focus:outline-none break-words [overflow-wrap:anywhere]"
                />
              ) : (
                <p className="w-full text-xs text-white whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {post.textContent}
                </p>
              )}

              {post.drawingDataUrl && (
                <img
                  src={post.drawingDataUrl}
                  alt={post.title}
                  className="w-full rounded-lg border border-white/10 bg-zinc-950/70 object-contain"
                />
              )}
            </div>

            {/* Rodapé Exclusivo do Mestre: Seleção Múltipla de Jogadores + Projeção no 2º Monitor */}
            {isDMView && onUpdatePostItSharing && (
              <div className="px-3 py-2 border-t border-white/10 bg-black/40 flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-zinc-300 font-bold">
                    👁️ Exibir em ({sharedIds.length + (post.sharedOnMonitor ? 1 : 0)}):
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => onUpdatePostItSharing(post, allCharIds)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${
                        isSharedWithAll
                          ? 'bg-emerald-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Todos Jogadores
                    </button>
                    {(sharedIds.length > 0 || post.sharedOnMonitor) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onUpdatePostIt) {
                            onUpdatePostIt({
                              ...post,
                              sharedWithCharacterIds: [],
                              sharedOnMonitor: false,
                            });
                          }
                          onUpdatePostItSharing(post, []);
                        }}
                        className="px-1.5 py-0.5 bg-zinc-800 hover:bg-red-900 text-zinc-400 hover:text-white rounded text-[9px] font-bold cursor-pointer"
                      >
                        Ocultar Tudo
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {/* Botão dedicado para exibir este Post-it no 2º Monitor! */}
                  {onUpdatePostIt && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdatePostIt({
                          ...post,
                          sharedOnMonitor: !post.sharedOnMonitor,
                        })
                      }
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border transition cursor-pointer ${
                        post.sharedOnMonitor
                          ? 'bg-purple-600 border-purple-300 text-white shadow'
                          : 'bg-zinc-900 border-zinc-700 text-purple-300 hover:text-white'
                      }`}
                    >
                      {post.sharedOnMonitor ? '✓ 🖥️ 2º Monitor' : '+ 🖥️ 2º Monitor'}
                    </button>
                  )}

                  {characters.map((ch) => {
                    const isSelected = sharedIds.includes(ch.id);
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => {
                          const nextIds = isSelected
                            ? sharedIds.filter((id) => id !== ch.id)
                            : [...sharedIds, ch.id];
                          onUpdatePostItSharing(post, nextIds);
                        }}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                          isSelected
                            ? 'bg-amber-600 border-amber-400 text-white shadow'
                            : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {ch.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}