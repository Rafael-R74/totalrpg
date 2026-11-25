import { useState, useRef } from 'react';
import { uploadImageFile } from '../services/api';

interface ImageUploadFieldProps {
  label?: string;
  value?: string;
  onChange: (newUrl: string) => void;
  compact?: boolean;
  /** Imagens já usadas: escolher uma não abre o seletor de arquivos do sistema */
  recentImages?: string[];
}

export function ImageUploadField({
  label,
  value,
  onChange,
  compact = false,
  recentImages,
}: ImageUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  }

  /** Colar (Ctrl+V) ou arrastar uma imagem também envia, sem abrir o seletor de arquivos. */
  function pickImageFile(list: DataTransferItemList | FileList | null | undefined): File | null {
    if (!list) return null;
    for (const entry of Array.from(list as ArrayLike<DataTransferItem | File>)) {
      const file = entry instanceof File ? entry : entry.kind === 'file' ? entry.getAsFile() : null;
      if (file && file.type.startsWith('image/')) return file;
    }
    return null;
  }

  async function uploadFile(file: File) {
    setIsUploading(true);
    try {
      const uploadedUrl = await uploadImageFile(file);
      onChange(uploadedUrl);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  const otherRecents = (recentImages || []).filter((u) => u && u !== value);

  return (
    <div
      className={`flex flex-col gap-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
        isDragging ? 'ring-2 ring-zinc-300 bg-zinc-900/60' : ''
      }`}
      tabIndex={0}
      onPaste={(e) => {
        const file = pickImageFile(e.clipboardData?.items);
        if (file) {
          e.preventDefault();
          uploadFile(file);
        }
      }}
      onDragOver={(e) => {
        if (Array.from(e.dataTransfer.types).includes('Files')) {
          e.preventDefault();
          setIsDragging(true);
        }
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        setIsDragging(false);
        const file = pickImageFile(e.dataTransfer.files);
        if (file) {
          e.preventDefault();
          uploadFile(file);
        }
      }}
    >
      {label && (
        <label className="block text-[10px] uppercase text-zinc-400 font-bold">
          {label}
        </label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex items-center gap-3">
        {value && (
          <img
            src={value}
            alt="Preview"
            className={`${
              compact ? 'w-12 h-12' : 'w-16 h-16'
            } rounded-xl object-cover border border-zinc-700 shadow-md shrink-0 bg-zinc-950`}
          />
        )}

        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className={`flex-1 ${
            compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
          } bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-amber-500/60 text-zinc-200 rounded-lg font-bold transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap`}
        >
          <span>{isUploading ? 'Enviando...' : value ? 'Trocar Imagem' : 'Enviar Imagem'}</span>
        </button>

        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="px-2 py-1.5 bg-zinc-900 hover:bg-red-950 text-zinc-400 hover:text-red-400 border border-zinc-800 rounded-lg text-xs font-bold cursor-pointer"
            title="Remover imagem"
          >
            ✕
          </button>
        )}
      </div>
      <p className="text-[11px] text-zinc-500">
        {isDragging ? 'Solte a imagem para enviar.' : 'Também dá para colar (Ctrl+V) com o campo selecionado ou arrastar uma imagem até aqui.'}
      </p>
      {otherRecents.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-zinc-400">Usadas nesta mesa</span>
          <div className="flex flex-wrap gap-1.5">
            {otherRecents.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => onChange(url)}
                className="w-11 h-11 rounded-md overflow-hidden border border-zinc-700 hover:border-zinc-300 transition"
                title="Usar esta imagem"
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}