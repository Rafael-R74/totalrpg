import { useId, useState } from 'react';
import type { DiceRollResult } from '@totalrpg/shared';
import type { AuthResponse } from '../services/api';
import { DiceStage } from './dice/DiceStage';
import { Icon } from './ui/Icon';
import './landing.css';

interface LandingPageProps {
  onLoginSuccess: (authData: AuthResponse) => void;
  onOpenDedicatedAuth: (mode: 'login' | 'register') => void;
}

function CryptMap() {
  const grid = useId();
  const hatch = useId();

  return (
    <svg className="board-svg" viewBox="0 0 640 440" role="img" aria-label="Mapa da cripta com três personagens, área oculta e régua de 2,7 metros">
      <defs>
        <pattern id={grid} x="40" y="40" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" className="b-grid" fill="none" />
        </pattern>
        <pattern id={hatch} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0V8" className="b-hatch" />
        </pattern>
      </defs>
      <rect x="40" y="40" width="560" height="360" fill="var(--sunken)" />
      <rect x="40" y="40" width="560" height="360" fill={`url(#${grid})`} />
      <g className="b-label" textAnchor="middle">
        {Array.from('ABCDEFGHIJKLMN', (letter, i) => <text key={letter} x={60 + i * 40} y="27">{letter}</text>)}
        {Array.from({ length: 9 }, (_, i) => <text key={i} x="22" y={64 + i * 40}>{i + 1}</text>)}
      </g>
      <path d="M120 120H320M400 120H520V320H120V120" className="b-wall" fill="none" />
      <rect x="400" y="160" width="120" height="160" fill={`url(#${hatch})`} opacity=".9" />
      <text x="410" y="180" className="b-label">oculto</text>
      <path d="M200 200L240 280" className="b-measure" strokeDasharray="5 5" />
      <g transform="translate(246 226)">
        <rect width="52" height="22" fill="var(--ink)" />
        <text x="26" y="15" textAnchor="middle" className="b-tt" fill="var(--bg)">2,7 m</text>
      </g>
      <g transform="translate(440 200)">
        <circle r="17" className="b-enemy" />
        <text textAnchor="middle" y="5" className="b-tt b-enemytext">?</text>
      </g>
      {[
        ['EV', 200, 200, '--accent', '--on-accent'],
        ['KT', 240, 280, '--accent-2', '--on-accent-2'],
        ['HR', 160, 280, '--ink', '--bg'],
      ].map(([label, x, y, color, ink]) => (
        <g key={label} transform={`translate(${x} ${y})`}>
          <circle r="17" className="b-token" fill={`var(${color})`} />
          <text textAnchor="middle" y="4.5" className="b-tt" fill={`var(${ink})`}>{label}</text>
        </g>
      ))}
      <path d="M40 424h40" className="b-measure" />
      <text x="90" y="428" className="b-label">1 casa = 1,5 m</text>
    </svg>
  );
}

function DemoTable() {
  const [roll, setRoll] = useState<DiceRollResult | null>(null);
  const [rolling, setRolling] = useState(false);

  function run(system: 'tormenta20' | 'ordem-paranormal') {
    const pool = system === 'ordem-paranormal';
    const rolls = Array.from({ length: pool ? 3 : 1 }, () => Math.floor(Math.random() * 20) + 1);
    const modifier = pool ? 5 : 4;
    setRolling(true);
    setRoll({
      id: crypto.randomUUID(),
      system,
      characterName: pool ? 'Helena' : 'Eldrin',
      label: pool ? 'Teste de perícia' : 'Teste de atributo',
      formula: `${rolls.length}d20+${modifier}`,
      rolls,
      modifier,
      sides: 20,
      total: Math.max(...rolls) + modifier,
      timestamp: new Date().toISOString(),
    });
  }

  return (
    <figure className="board">
      <figcaption className="board-bar mono"><span>Mesa 01</span><span>Cripta de exemplo</span></figcaption>
      <div className="board-map">
        <CryptMap />
        {roll && rolling && (
          <div className="board-roll">
            <DiceStage key={roll.id} roll={roll} size="hero" onSettled={() => setRolling(false)} />
          </div>
        )}
      </div>
      <div className="tray">
        <p className="tray-note" role="status">
          <span className="mono">Última rolagem</span>
          <span className="tray-sum">
            {rolling ? 'Rolando…' : roll ? <>{roll.formula} = <b>{roll.total}</b></> : 'Escolha um teste e lance os dados'}
          </span>
        </p>
        <div className="tray-actions">
          <button className="btn primary small" disabled={rolling} onClick={() => run('tormenta20')}>d20 · Tormenta 20</button>
          <button className="btn ghost small" disabled={rolling} onClick={() => run('ordem-paranormal')}>Pilha · Ordem Paranormal</button>
        </div>
      </div>
    </figure>
  );
}

function Attributes({ values, className }: { values: ReadonlyArray<readonly [string, string]>; className: string }) {
  return (
    <dl className={className}>
      {values.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
  );
}

const journey = [
  ['Monte sua ficha', 'Agentes da Ordem ou aventureiros de Arton, com os números do seu sistema à mão.'],
  ['Abra a aventura', 'Escolha o sistema, o nível de partida e quantas cadeiras a mesa terá.'],
  ['Chame o grupo', 'Cada jogador entra pelo painel e encontra a próxima sessão no topo.'],
];

export function LandingPage({ onOpenDedicatedAuth }: LandingPageProps) {
  const [light, setLight] = useState(false);
  const register = () => onOpenDedicatedAuth('register');
  const login = () => onOpenDedicatedAuth('login');

  return (
    <div className="make-landing" data-mode={light ? 'light' : 'dark'}>
      <a href="#main" className="landing-skip">Ir para o conteúdo</a>
      <header className="site-head wrap">
        <a className="brand" href="#main" aria-label="Totalrpg, ir para o início">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2l9 5v10l-9 5-9-5V7l9-5Z" />
            <path d="M12 7l4.5 8h-9L12 7Z" />
          </svg>
          <span>Total<b>rpg</b></span>
        </a>
        <nav className="site-nav" aria-label="Seções da página"><a href="#sistemas">Sistemas</a><a href="#jornada">Como começa</a></nav>
        <div className="site-actions">
          <button className="icon-btn" onClick={() => setLight(!light)} aria-label={light ? 'Mudar para o tema escuro' : 'Mudar para o tema claro'}>
            <Icon name={light ? 'moon' : 'sun'} size={20} />
          </button>
          <button className="btn link" onClick={login}>Entrar</button>
          <button className="btn primary small" onClick={register}>Criar conta</button>
        </div>
      </header>
      <main id="main">
        <section className="hero wrap">
          <div>
            <p className="mono kicker">Mesa virtual de RPG</p>
            <h1 className="display hero-title">Sente-se.<span>A sessão já vai começar.</span></h1>
            <p className="lede">Totalrpg reúne fichas, mapas e dados em uma mesa feita para Ordem Paranormal e Tormenta 20.</p>
            <div className="hero-cta">
              <button className="btn primary" onClick={register}>Criar minha conta <span aria-hidden="true">→</span></button>
              <button className="btn ghost" onClick={login}>Já tenho conta</button>
            </div>
            <ul className="sys-inline mono">
              <li><Icon name="eye" size={18} /> Ordem Paranormal</li>
              <li><Icon name="shield" size={18} /> Tormenta 20</li>
            </ul>
          </div>
          <DemoTable />
        </section>
        <section id="sistemas" className="systems" aria-label="Sistemas disponíveis">
          <article className="sys sys-ordem">
            <div className="wrap-half">
              <p className="mono sys-tag"><Icon name="eye" size={18} /> Sistema 01</p>
              <h2 className="display sys-name">Ordem Paranormal</h2>
              <p className="sys-text">Investigue o que não deveria existir. Fichas com NEX, Sanidade e Esforço, sempre à vista de quem narra.</p>
              <div className="file mono">
                <div className="file-top"><span>Arquivo 0417</span><span>NEX 35%</span></div>
                <p className="file-name">Agente Helena Ravel</p>
                <Attributes className="file-attrs" values={ [['AGI', '2'], ['FOR', '0'], ['INT', '3'], ['PRE', '3'], ['VIG', '1']] } />
                <p className="file-line">Última ocorrência: <span className="redact" tabIndex={0}>Edifício Aurora, São Paulo</span></p>
                <p className="file-line">Contato com o Outro Lado: <span className="redact" tabIndex={0}>confirmado</span></p>
              </div>
            </div>
          </article>
          <article className="sys sys-t20">
            <div className="wrap-half">
              <p className="mono sys-tag"><Icon name="shield" size={18} /> Sistema 02</p>
              <h2 className="display sys-name">Tormenta 20</h2>
              <p className="sys-text">Pegue a estrada de Arton. Fichas com Pontos de Vida, Pontos de Mana e modificadores prontos para o d20.</p>
              <div className="crest">
                <div className="crest-top mono"><span>Arcanista</span><span>Nível 5</span></div>
                <p className="crest-name">Eldrin Folha-Prata</p>
                <Attributes className="crest-attrs mono" values={ [['FOR', '+0'], ['DES', '+2'], ['CON', '+1'], ['INT', '+4'], ['SAB', '+1'], ['CAR', '+2']] } />
                <p className="crest-line">Magia favorita: Bola de Fogo.</p>
              </div>
            </div>
          </article>
        </section>
        <section id="jornada" className="journey wrap" aria-labelledby="journey-title">
          <h2 id="journey-title" className="display journey-title">Do convite à primeira rolagem</h2>
          <ol className="journey-list">
            {journey.map(([title, body], i) => (
              <li key={title}><span className="journey-n display" aria-hidden="true">0{i + 1}</span><h3>{title}</h3><p>{body}</p></li>
            ))}
          </ol>
        </section>
        <section className="closing" aria-labelledby="closing-title">
          <div className="wrap closing-in">
            <h2 id="closing-title" className="display closing-title">Sua cadeira está vaga.</h2>
            <button className="btn closing-button" onClick={register}>Criar minha conta <span aria-hidden="true">→</span></button>
          </div>
        </section>
      </main>
      <footer className="site-foot wrap mono">
        <span>Totalrpg</span><span>Ordem Paranormal e Tormenta 20 pertencem aos seus respectivos autores.</span>
      </footer>
    </div>
  );
}
