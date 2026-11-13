import { useState, useRef } from 'react';
import { uploadImageFile } from '../services/api';

interface ImageUploadFieldProps {
  label?: string;
  value?: string;
  onChange: (newUrl: string) => void;
  compact?: boolean;
}

export function ImageUploadField({
  label,
  value,
  onChange,
  compact = false,
}: ImageUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

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

  return (
    <div className="flex flex-col gap-1">
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
            } rounded-xl object-cover border-2 border-amber-500/70 shadow-md shrink-0 bg-zinc-950`}
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
          <span>{isUploading ? '⏳ Enviando...' : value ? '🖼️ Trocar Imagem' : '📁 Enviar Imagem'}</span>
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
    </div>
  );
}