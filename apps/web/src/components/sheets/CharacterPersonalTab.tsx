import { useState } from 'react';
import { CharacterPersonalProfile, SystemId } from '@totalrpg/shared';

interface CharacterPersonalTabProps {
  system: SystemId;
  personalProfile: CharacterPersonalProfile;
  canEditPersonal: boolean;
  proficiencies: string[];
  onUpdateProfile: (next: CharacterPersonalProfile) => void;
}

const SHORT_FIELDS: Array<{
  key: keyof CharacterPersonalProfile;
  label: string;
  placeholder: string;
}> = [
  { key: 'age', label: 'Idade', placeholder: 'Ex.: 26 anos' },
  { key: 'pronouns', label: 'Gênero / Pronomes', placeholder: 'Ex.: Ele/Dele, Ela/Dela...' },
  { key: 'height', label: 'Altura', placeholder: 'Ex.: 1,78m' },
  { key: 'weight', label: 'Peso / Porte', placeholder: 'Ex.: 74 kg, atlético' },
  { key: 'birthplace', label: 'Naturalidade / Origem Civil', placeholder: 'Ex.: São Paulo, SP' },
  { key: 'occupation', label: 'Ocupação / Profissão Civil', placeholder: 'Ex.: Perito criminal, jornalista...' },
];

const LONG_FIELDS: Array<{
  key: keyof CharacterPersonalProfile;
  label: string;
  icon: string;
  placeholder: string;
  rows: number;
}> = [
  {
    key: 'appearance',
    label: 'Aparência Física & Traços Marcantes',
    icon: '🪞',
    placeholder: 'Cicatrizes, vestuário habitual, expressão, postura, marcas paranormais...',
    rows: 3,
  },
  {
    key: 'personality',
    label: 'Personalidade, Manias & Medos',
    icon: '🧠',
    placeholder: 'Como reage sob pressão, virtudes, defeitos, fobias e hábitos...',
    rows: 3,
  },
  {
    key: 'backstory',
    label: 'História / Backstory',
    icon: '📖',
    placeholder: 'Passado do personagem, primeiro contato com o Outro Lado e entrada na Ordem...',
    rows: 5,
  },
  {
    key: 'goals',
    label: 'Objetivos & Motivações',
    icon: '🎯',
    placeholder: 'O que move o personagem a arriscar a vida nas missões...',
    rows: 3,
  },
  {
    key: 'bonds',
    label: 'Pessoas & Vínculos Importantes',
    icon: '🤝',
    placeholder: 'Familiares, contatos, aliados, rivais ou pessoas desaparecidas...',
    rows: 3,
  },
  {
    key: 'personalNotes',
    label: 'Diário & Anotações Pessoais',
    icon: '📝',
    placeholder: 'Pistas, memórias de sessão, juramentos e lembretes particulares...',
    rows: 4,
  },
];

export function CharacterPersonalTab({
  system,
  personalProfile,
  canEditPersonal,
  proficiencies,
  onUpdateProfile,
}: CharacterPersonalTabProps) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const hasAnyInfo = Boolean(
    SHORT_FIELDS.some((f) => Boolean(personalProfile[f.key]?.trim())) ||
      LONG_FIELDS.some((f) => Boolean(personalProfile[f.key]?.trim()))
  );

  function updateField(key: keyof CharacterPersonalProfile, value: string) {
    onUpdateProfile({
      ...personalProfile,
      [key]: value,
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950 border border-zinc-800 px-4 py-3 rounded-xl">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
            👤 Dossiê Pessoal & História do Personagem
          </h4>
          <p className="text-[11px] text-zinc-400">
            {canEditPersonal
              ? 'Preencha idade, aparência, personalidade, backstory e anotações — salvo automaticamente na ficha.'
              : 'Visualização do histórico e informações pessoais do personagem.'}
          </p>
        </div>

        {canEditPersonal && (
          <button
            type="button"
            onClick={() => setIsEditingProfile((prev) => !prev)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold border transition cursor-pointer ${
              isEditingProfile
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow'
                : 'bg-zinc-900 hover:bg-amber-600 text-amber-300 hover:text-white border-amber-700/70'
            }`}
          >
            {isEditingProfile ? '✓ Concluir Edição' : '✏️ Editar Perfil Pessoal'}
          </button>
        )}
      </div>

      {/* Resumo de Proficiências no Dossiê */}
      {proficiencies.length > 0 && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 mr-1">
            🎖️ Proficiências ({system === 'ordem-paranormal' ? 'Ordem v1.3' : 'Sistema'}):
          </span>
          {proficiencies.map((p) => (
            <span
              key={p}
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-900 text-zinc-200 border border-zinc-700"
            >
              {p}
            </span>
          ))}
        </div>
      )}

      {/* Bloco 1: Dados Pessoais & Identidade */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
        <h5 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">
          🪪 Identidade & Características Físicas
        </h5>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {SHORT_FIELDS.map((field) => {
            const val = personalProfile[field.key] || '';
            return (
              <div
                key={field.key}
                className="bg-zinc-900/70 border border-zinc-800 rounded-lg px-3 py-2"
              >
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  {field.label}
                </label>
                {isEditingProfile && canEditPersonal ? (
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                ) : (
                  <p className={`text-xs font-semibold ${val ? 'text-zinc-100' : 'text-zinc-600 italic'}`}>
                    {val || 'Não informado'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bloco 2: Narrativa, Backstory & Diário */}
      {!isEditingProfile && !hasAnyInfo && canEditPersonal ? (
        <div className="bg-zinc-950 border border-dashed border-zinc-800 rounded-xl p-6 text-center space-y-2">
          <p className="text-xs text-zinc-400">
            Este personagem ainda não possui descrição pessoal ou história cadastrada.
          </p>
          <button
            type="button"
            onClick={() => setIsEditingProfile(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-extrabold cursor-pointer"
          >
            ✏️ Preencher História e Dados Pessoais
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {LONG_FIELDS.map((field) => {
            const val = personalProfile[field.key] || '';
            const isFullWidth = field.key === 'backstory';
            return (
              <div
                key={field.key}
                className={`bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col gap-2 ${
                  isFullWidth ? 'md:col-span-2' : ''
                }`}
              >
                <label className="text-xs font-extrabold text-amber-400 flex items-center gap-1.5">
                  <span>{field.icon}</span>
                  <span>{field.label}</span>
                </label>

                {isEditingProfile && canEditPersonal ? (
                  <textarea
                    rows={field.rows}
                    value={val}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 leading-relaxed focus:outline-none focus:border-amber-500 resize-y"
                  />
                ) : (
                  <div className="bg-zinc-900/50 border border-zinc-800/70 rounded-lg p-3 min-h-[3.5rem]">
                    {val.trim() ? (
                      <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                        {val}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-600 italic">Nenhum registro.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
