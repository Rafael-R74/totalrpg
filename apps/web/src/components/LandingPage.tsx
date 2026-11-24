import React, { useState } from 'react';
import type { DiceRollResult, SystemId } from '@totalrpg/shared';
import { AuthResponse, loginUser, registerUser } from '../services/api';
import { BrandMark } from './BrandMark';
import { ArtDirectionId, PaletteId, useTheme } from '../theme/themeEngine';
import { DiceStage } from './dice/DiceStage';
import { Icon, IconName } from './ui/Icon';

interface LandingPageProps {
  onLoginSuccess: (authData: AuthResponse) => void;
  onOpenDedicatedAuth: (mode: 'login' | 'register') => void;
}

const SYSTEMS: Array<{
  id: SystemId;
  title: string;
  palette: PaletteId;
  artDirection: ArtDirectionId;
  pitch: string;
  points: string[];
}> = [
  {
    id: 'ordem-paranormal',
    title: 'Ordem Paranormal',
    palette: 'ordo-crimson',
    artDirection: 'dossier',
    pitch: 'Investigação e horror. A ficha acompanha NEX, trilhas, rituais e a sanidade que vai embora.',
    points: [
      'Criação guiada de NEX 0% a 99%, com origem, classe, trilha e patente',
      'Rituais com custo do paranormal, maldições e itens amaldiçoados',
      'Bestiário para o mestre e cenas de interlúdio liberadas na hora',
    ],
  },
  {
    id: 'tormenta20',
    title: 'Tormenta 20',
    palette: 'arton-gold',
    artDirection: 'grimoire',
    pitch: 'Fantasia heroica em Arton. Raças, classes, divindades e PM sem conta de cabeça.',
    points: [
      'Raças, classes, origens e divindades no assistente',
      'Defesa, carga e perícias calculadas a cada mudança',
      'PV, PM e condições sincronizados com o escudo do mestre',
    ],
  },
  {
    id: 'duna',
    title: 'Duna',
    palette: 'arrakis-ochre',
    artDirection: 'monolith',
    pitch: 'Intriga entre Grandes Casas. Uma interface austera, sem ornamento, para não roubar a cena.',
    points: [
      'Tema próprio que entra sozinho ao abrir a campanha',
      'Rolagens ao vivo e anotações rápidas do mestre',
      'Tela para a TV com o que os jogadores podem ver',
    ],
  },
];

const SCREENS: Array<{ icon: IconName; who: string; title: string; body: string }> = [
  {
    icon: 'user',
    who: 'Jogadores, no celular',
    title: 'A ficha',
    body: 'Toque na perícia e role. Gaste PE, sofra dano, use um item: a ficha faz a conta e o mestre vê na hora.',
  },
  {
    icon: 'shield',
    who: 'Mestre, no notebook',
    title: 'O escudo',
    body: 'Iniciativa, ameaças, vida de todo mundo, itens, lojas e um registro do que cada jogador fez.',
  },
  {
    icon: 'tv',
    who: 'Mesa, na TV',
    title: 'A tela da sala',
    body: 'Retratos, vida e iniciativa projetados para o grupo, sem mostrar as anotações do mestre.',
  },
];

function demoRoll(n: number): DiceRollResult {
  const rolls = Array.from({ length: 3 }, () => Math.floor(Math.random() * 20) + 1);
  return {
    id: `demo-${n}-${Date.now()}`,
    characterName: 'Helena Vasconcelos',
    label: 'Ocultismo',
    formula: '3d20+10',
    rolls,
    sides: 20,
    modifier: 10,
    total: Math.max(...rolls) + 10,
    system: 'ordem-paranormal',
    timestamp: '',
  };
}

export function LandingPage({ onLoginSuccess, onOpenDedicatedAuth }: LandingPageProps) {
  const { updatePreferences } = useTheme();
  const [roll, setRoll] = useState<DiceRollResult>(() => demoRoll(0));
  const [rollCount, setRollCount] = useState(1);
  const [rolling, setRolling] = useState(true);
  const [system, setSystem] = useState<SystemId>('ordem-paranormal');

  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeSystem = SYSTEMS.find((s) => s.id === system)!;

  function pickSystem(item: (typeof SYSTEMS)[number]) {
    setSystem(item.id);
    updatePreferences({ palette: item.palette, artDirection: item.artDirection });
  }

  function reroll() {
    setRolling(true);
    setRoll(demoRoll(rollCount));
    setRollCount((c) => c + 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (authMode === 'register') {
      if (username.trim().length < 3) errs.username = 'Use pelo menos 3 caracteres.';
      if (!email.includes('@')) errs.email = 'Digite um e-mail válido.';
      if (password.length < 4) errs.password = 'Use pelo menos 4 caracteres.';
    } else {
      if (!emailOrUsername.trim()) errs.emailOrUsername = 'Digite seu usuário ou e-mail.';
      if (!password) errs.password = 'Digite sua senha.';
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsSubmitting(true);
    try {
      const data =
        authMode === 'register'
          ? await registerUser(username.trim(), email.trim(), password)
          : await loginUser(emailOrUsername.trim(), password);
      localStorage.setItem('totalrpg_token', data.token);
      localStorage.setItem('totalrpg_user', JSON.stringify(data.user));
      onLoginSuccess(data);
    } catch (err: any) {
      setFieldErrors({ form: err.message || 'Não foi possível entrar. Tente de novo.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  function field(
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts: { type?: string; autoComplete?: string; placeholder?: string } = {}
  ) {
    const err = fieldErrors[id];
    return (
      <div>
        <label htmlFor={`landing-${id}`} className="trpg-label">
          {label}
        </label>
        <input
          id={`landing-${id}`}
          type={opts.type || 'text'}
          autoComplete={opts.autoComplete}
          placeholder={opts.placeholder}
          value={value}
          aria-invalid={Boolean(err)}
          aria-describedby={err ? `landing-${id}-err` : undefined}
          onChange={(e) => onChange(e.target.value)}
          className="trpg-input"
        />
        {err && (
          <p id={`landing-${id}-err`} className="text-sm text-red-300 mt-1.5">
            {err}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 trpg-btn-primary"
      >
        Pular para o conteúdo
      </a>

      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
        <div className="trpg-wrap h-16 flex items-center justify-between gap-4">
          <a href="#topo" aria-label="TotalRPG, início" className="rounded-md">
            <BrandMark size="md" />
          </a>
          <nav aria-label="Seções" className="hidden md:flex items-center gap-1 text-[0.9375rem]">
            <a href="#telas" className="trpg-btn-quiet">
              Como funciona
            </a>
            <a href="#sistemas" className="trpg-btn-quiet">
              Sistemas
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onOpenDedicatedAuth('login')} className="trpg-btn-quiet">
              Entrar
            </button>
            <a href="#conta" className="trpg-btn-primary hidden sm:inline-flex">
              Criar conta
            </a>
          </div>
        </div>
      </header>

      <main id="conteudo">
        {/* Hero: a rolagem é a primeira coisa que se vê */}
        <section id="topo" className="relative overflow-hidden">
          <div className="trpg-wrap grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-10 lg:gap-14 items-center pt-10 pb-16 sm:pt-16 lg:pt-20 lg:pb-24">
            <div className="flex flex-col gap-6 trpg-hero-enter">
              <h1 className="text-[2.75rem] leading-[1.02] sm:text-6xl lg:text-[4.5rem]">
                Sua mesa de RPG, da ficha à TV da sala.
              </h1>
              <p className="text-lg text-zinc-300 max-w-[46ch]">
                Fichas que fazem as contas, um escudo do mestre que vê cada rolagem e uma tela para projetar o combate. Para
                Ordem Paranormal, Tormenta 20 e Duna.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <a href="#conta" className="trpg-btn-primary trpg-btn-lg">
                  Criar conta grátis
                </a>
                <button type="button" onClick={() => onOpenDedicatedAuth('login')} className="trpg-btn-secondary trpg-btn-lg">
                  Já tenho conta
                </button>
              </div>
            </div>

            <figure className="relative">
              <div className="trpg-card p-4 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-zinc-400">Helena Vasconcelos rolou</p>
                    <p className="text-xl font-semibold text-zinc-100">
                      Ocultismo <span className="trpg-num text-zinc-400 font-normal">3d20+10</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={reroll}
                    disabled={rolling}
                    className="trpg-btn-secondary trpg-btn-sm shrink-0"
                  >
                    <Icon name="d20" size={16} /> Rolar de novo
                  </button>
                </div>
                <DiceStage key={roll.id} roll={roll} size="hero" onSettled={() => setRolling(false)} className="mt-2" />
              </div>
              <figcaption className="text-sm text-zinc-500 mt-3 max-w-[52ch]">
                Em Ordem Paranormal você rola um d20 por ponto de atributo e fica com o maior. O dado escolhido sobe,
                o bônus bate nele e o total aparece para a mesa inteira.
              </figcaption>
            </figure>
          </div>
        </section>

        {/* Três telas */}
        <section id="telas" className="border-t border-zinc-800/80 bg-zinc-900/35">
          <div className="trpg-wrap py-16 lg:py-24">
            <h2 className="text-3xl sm:text-[2.5rem] leading-tight max-w-[22ch]">Três telas, a mesma sessão.</h2>
            <p className="text-zinc-400 mt-3 max-w-[58ch]">
              Tudo que acontece numa tela aparece nas outras no mesmo instante. Ninguém precisa perguntar quanto de vida
              sobrou.
            </p>
            <ul className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-3">
              {SCREENS.map((s) => (
                <li key={s.title} className="flex flex-col gap-2">
                  <span className="flex items-center gap-2 text-sm text-zinc-400">
                    <Icon name={s.icon} size={17} className="text-amber-500" /> {s.who}
                  </span>
                  <h3 className="text-2xl trpg-display text-zinc-100">{s.title}</h3>
                  <p className="text-zinc-300 max-w-[40ch]">{s.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Sistemas — a própria página troca de tema */}
        <section id="sistemas" className="border-t border-zinc-800/80">
          <div className="trpg-wrap py-16 lg:py-24 grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-10 lg:gap-16 items-start">
            <div>
              <h2 className="text-3xl sm:text-[2.5rem] leading-tight">Cada sistema veste a interface.</h2>
              <p className="text-zinc-400 mt-3 max-w-[48ch]">
                Ao abrir uma campanha, cores e tipografia mudam para combinar com o jogo. Escolha um para ver esta página
                mudar.
              </p>
              <div role="radiogroup" aria-label="Sistema" className="mt-6 flex flex-col gap-1.5">
                {SYSTEMS.map((s) => {
                  const active = s.id === system;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => pickSystem(s)}
                      className={`text-left rounded-lg border px-4 py-3 flex items-center justify-between gap-3 transition-colors ${
                        active ? 'border-amber-500 bg-amber-950/35' : 'border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      <span className="font-semibold text-zinc-100">{s.title}</span>
                      <span
                        className={`w-4 h-4 rounded-full border-2 grid place-items-center ${
                          active ? 'border-amber-500' : 'border-zinc-600'
                        }`}
                        aria-hidden="true"
                      >
                        {active && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div key={system} className="trpg-card trpg-card-signature p-6 sm:p-8 trpg-hero-enter">
              <p className="text-5xl sm:text-6xl trpg-display text-zinc-100 leading-none">{activeSystem.title}</p>
              <p className="text-lg text-zinc-300 mt-4 max-w-[48ch]">{activeSystem.pitch}</p>
              <ul className="mt-6 flex flex-col gap-3">
                {activeSystem.points.map((p) => (
                  <li key={p} className="flex gap-3 text-zinc-200">
                    <Icon name="check" size={18} className="text-amber-500 mt-0.5 shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 grid grid-cols-3 gap-2" aria-hidden="true">
                {[
                  { label: 'PV', color: 'var(--trpg-pv)', pct: 72 },
                  { label: 'SAN', color: 'var(--trpg-san)', pct: 48 },
                  { label: 'PE', color: 'var(--trpg-pe)', pct: 86 },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="flex justify-between text-xs text-zinc-400 mb-1">
                      <span>{m.label}</span>
                      <span className="trpg-num">{m.pct}%</span>
                    </div>
                    <div className="trpg-meter">
                      <div className="trpg-meter-fill" style={{ width: `${m.pct}%`, background: m.color }} />
                      <div className="trpg-meter-ticks" style={{ ['--tick' as string]: '10%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Conta */}
        <section id="conta" className="border-t border-zinc-800/80 bg-zinc-900/35">
          <div className="trpg-wrap py-16 lg:py-24 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10 lg:gap-16 items-start">
            <div>
              <h2 className="text-3xl sm:text-[2.5rem] leading-tight max-w-[18ch]">Uma conta para jogar e para mestrar.</h2>
              <p className="text-zinc-400 mt-3 max-w-[46ch]">
                Crie personagens antes da sessão, entre em mesas com um código e abra suas próprias campanhas. Sem cartão,
                sem limite de fichas.
              </p>
            </div>

            <div className="trpg-card p-6 sm:p-8">
              <div role="tablist" aria-label="Acesso" className="trpg-tabs mb-6">
                {(
                  [
                    { id: 'register', label: 'Criar conta' },
                    { id: 'login', label: 'Entrar' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={authMode === t.id}
                    onClick={() => {
                      setAuthMode(t.id);
                      setFieldErrors({});
                    }}
                    className="trpg-tab"
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                {authMode === 'register' ? (
                  <>
                    {field('username', 'Nome de usuário', username, setUsername, {
                      autoComplete: 'username',
                      placeholder: 'como os amigos te chamam na mesa',
                    })}
                    {field('email', 'E-mail', email, setEmail, { type: 'email', autoComplete: 'email' })}
                  </>
                ) : (
                  field('emailOrUsername', 'Usuário ou e-mail', emailOrUsername, setEmailOrUsername, {
                    autoComplete: 'username',
                  })
                )}
                {field('password', 'Senha', password, setPassword, {
                  type: 'password',
                  autoComplete: authMode === 'register' ? 'new-password' : 'current-password',
                })}

                {fieldErrors.form && (
                  <p role="alert" className="text-sm text-red-300 flex items-center gap-2">
                    <Icon name="warning" size={15} /> {fieldErrors.form}
                  </p>
                )}

                <button type="submit" disabled={isSubmitting} className="trpg-btn-primary trpg-btn-lg w-full mt-1">
                  {isSubmitting ? 'Entrando…' : authMode === 'register' ? 'Criar conta' : 'Entrar'}
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800/80 mt-auto">
        <div className="trpg-wrap py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm text-zinc-500">
          <BrandMark size="sm" />
          <p>Feito para mesas de Ordem Paranormal, Tormenta 20 e Duna. {new Date().getFullYear()}.</p>
        </div>
      </footer>
    </div>
  );
}
