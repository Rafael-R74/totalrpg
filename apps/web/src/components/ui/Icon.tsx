import type { CSSProperties, SVGProps } from 'react';
import {
  Activity,
  ArrowLeft,
  Award,
  Backpack,
  BookOpen,
  Bomb,
  Brain,
  BriefcaseBusiness,
  ChartNoAxesColumnIncreasing,
  Check,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  CircleX,
  Clapperboard,
  Clock,
  Clover,
  Coins,
  Crosshair,
  Crown,
  Drama,
  Droplet,
  Dumbbell,
  Eye,
  EyeOff,
  FlaskConical,
  Flame,
  Flashlight,
  Footprints,
  Gift,
  Ghost,
  GraduationCap,
  Hammer,
  Handshake,
  Heart,
  HeartCrack,
  HeartPulse,
  Hourglass,
  Info,
  KeyRound,
  Library,
  Link2,
  Lock,
  LockOpen,
  LogOut,
  type LucideIcon,
  Megaphone,
  Minus,
  Monitor,
  Moon,
  Package,
  Palette,
  Pencil,
  Pin,
  Plus,
  Puzzle,
  Radio,
  RefreshCw,
  Route,
  Save,
  ScrollText,
  Search,
  Settings,
  Shield,
  ShieldHalf,
  Skull,
  Sparkles,
  Star,
  StickyNote,
  Store,
  Sun,
  Sword,
  Swords,
  Target,
  Timer,
  Trash2,
  TrendingUp,
  TriangleAlert,
  Trophy,
  Tv,
  Undo2,
  User,
  Users,
  VenetianMask,
  Wind,
  Wrench,
  X,
  Zap,
} from 'lucide-react';

/* Glifos próprios do domínio (mesmo traço do Lucide: 24px, stroke 1.75) */
type GlyphProps = SVGProps<SVGSVGElement>;

function D20Glyph(p: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinejoin="round" {...p}>
      <path d="M12 2.5 20.5 7.4v9.2L12 21.5l-8.5-4.9V7.4Z" />
      <path d="M12 6.6 16.9 15H7.1Z" />
      <path d="M12 2.5v4.1M20.5 16.6 16.9 15M3.5 16.6 7.1 15M7.1 15 3.5 7.4M16.9 15l3.6-7.6M12 21.5 7.1 15M12 21.5l4.9-6.5" strokeOpacity={0.55} />
    </svg>
  );
}

function D6Glyph(p: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinejoin="round" {...p}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <circle cx="9" cy="9" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="15" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BurstGlyph(p: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinejoin="round" {...p}>
      <path d="m12 2.5 2 5.6 5.4-2.6-2.6 5.4 5.6 2-5.6 2 2.6 5.4-5.4-2.6-2 5.6-2-5.6-5.4 2.6 2.6-5.4-5.6-2 5.6-2-2.6-5.4 5.4 2.6Z" />
    </svg>
  );
}

/* Sigilo de ritual: círculo de conjuração com triângulo inscrito */
function SigilGlyph(p: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5.5" strokeOpacity={0.55} />
      <path d="M12 3v18M4.2 16.5 19.8 7.5M4.2 7.5l15.6 9" strokeOpacity={0.55} />
      <path d="M12 6.5 16.8 15H7.2Z" />
    </svg>
  );
}

/* Elementos do Outro Lado */
function ElementSangue(p: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinejoin="round" {...p}>
      <path d="M12 3c3.6 4.6 6 8 6 11a6 6 0 0 1-12 0c0-3 2.4-6.4 6-11Z" />
      <path d="M9.5 14.5a2.6 2.6 0 0 0 2.5 2.6" strokeOpacity={0.6} />
    </svg>
  );
}
function ElementMorte(p: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5a8.5 8.5 0 0 0 0 17 5 5 0 0 1 0-10 3.5 3.5 0 0 0 0-7Z" fill="currentColor" fillOpacity={0.35} />
    </svg>
  );
}
function ElementConhecimento(p: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinejoin="round" {...p}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2" strokeOpacity={0.6} />
    </svg>
  );
}
function ElementEnergia(p: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinejoin="round" {...p}>
      <path d="M12 2.5 21 12l-9 9.5L3 12Z" />
      <path d="m13 7-3 5.5h4L11 17" />
    </svg>
  );
}
function ElementMedo(p: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
      <path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21" strokeOpacity={0.6} />
    </svg>
  );
}

const CUSTOM: Record<string, (p: GlyphProps) => JSX.Element> = {
  d20: D20Glyph,
  d6: D6Glyph,
  burst: BurstGlyph,
  sigil: SigilGlyph,
  sangue: ElementSangue,
  morte: ElementMorte,
  conhecimento: ElementConhecimento,
  energia: ElementEnergia,
  medo: ElementMedo,
};

const LUCIDE = {
  activity: Activity,
  'arrow-left': ArrowLeft,
  award: Award,
  backpack: Backpack,
  book: BookOpen,
  bomb: Bomb,
  brain: Brain,
  briefcase: BriefcaseBusiness,
  chart: ChartNoAxesColumnIncreasing,
  check: Check,
  'check-circle': CircleCheck,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  clapperboard: Clapperboard,
  clock: Clock,
  clover: Clover,
  coins: Coins,
  crosshair: Crosshair,
  crown: Crown,
  drama: Drama,
  droplet: Droplet,
  dumbbell: Dumbbell,
  eye: Eye,
  'eye-off': EyeOff,
  flask: FlaskConical,
  flame: Flame,
  flashlight: Flashlight,
  footprints: Footprints,
  gift: Gift,
  ghost: Ghost,
  graduation: GraduationCap,
  hammer: Hammer,
  handshake: Handshake,
  heart: Heart,
  'heart-crack': HeartCrack,
  'heart-pulse': HeartPulse,
  hourglass: Hourglass,
  info: Info,
  key: KeyRound,
  library: Library,
  link: Link2,
  lock: Lock,
  'lock-open': LockOpen,
  logout: LogOut,
  megaphone: Megaphone,
  minus: Minus,
  monitor: Monitor,
  moon: Moon,
  package: Package,
  palette: Palette,
  pencil: Pencil,
  pin: Pin,
  plus: Plus,
  puzzle: Puzzle,
  radio: Radio,
  refresh: RefreshCw,
  route: Route,
  save: Save,
  scroll: ScrollText,
  search: Search,
  settings: Settings,
  shield: Shield,
  'shield-half': ShieldHalf,
  skull: Skull,
  sparkles: Sparkles,
  star: Star,
  note: StickyNote,
  store: Store,
  sun: Sun,
  sword: Sword,
  swords: Swords,
  target: Target,
  timer: Timer,
  trash: Trash2,
  trending: TrendingUp,
  warning: TriangleAlert,
  trophy: Trophy,
  tv: Tv,
  undo: Undo2,
  user: User,
  users: Users,
  mask: VenetianMask,
  wind: Wind,
  wrench: Wrench,
  x: X,
  'x-circle': CircleX,
  zap: Zap,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof LUCIDE | keyof typeof CUSTOM;

interface IconProps {
  name: IconName | string;
  size?: number | string;
  className?: string;
  strokeWidth?: number;
  style?: CSSProperties;
  label?: string;
}

/**
 * Ícone do sistema. Herda `currentColor`. Inline por padrão (alinhado à linha
 * de base do texto), então funciona dentro de frases e botões.
 */
export function Icon({ name, size = '1.1em', className = '', strokeWidth = 1.75, style, label }: IconProps) {
  const a11y = label
    ? { role: 'img', 'aria-label': label }
    : { 'aria-hidden': true as const, focusable: 'false' as const };
  const baseStyle: CSSProperties = {
    display: 'inline-block',
    verticalAlign: '-0.15em',
    flexShrink: 0,
    ...style,
  };
  const Custom = CUSTOM[name];
  if (Custom) {
    return (
      <Custom
        width={size}
        height={size}
        strokeWidth={strokeWidth}
        className={className}
        style={baseStyle}
        {...a11y}
      />
    );
  }
  const Lucide = (LUCIDE as Record<string, LucideIcon>)[name];
  if (!Lucide) return null;
  return (
    <Lucide
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      style={baseStyle}
      {...a11y}
    />
  );
}

/** Mapa emoji → ícone, usado na migração e para textos vindos de dados (ex.: badges do pacote shared). */
export const EMOJI_ICON: Record<string, IconName> = {
  '⚡': 'zap',
  '👁': 'conhecimento',
  '👁‍🗨': 'eye',
  '🛡': 'shield',
  '🩸': 'sangue',
  '🎲': 'd20',
  '⚔': 'swords',
  '🔮': 'sigil',
  '🎯': 'target',
  '🎒': 'backpack',
  '✨': 'sparkles',
  '⚠': 'warning',
  '💀': 'skull',
  '💥': 'burst',
  '🧠': 'brain',
  '🔥': 'flame',
  '🗡': 'sword',
  '👑': 'crown',
  '🔍': 'search',
  '🔎': 'search',
  '🖥': 'monitor',
  '📺': 'tv',
  '🔧': 'wrench',
  '❤': 'heart',
  '💚': 'heart-pulse',
  '💖': 'heart-pulse',
  '👹': 'ghost',
  '👻': 'ghost',
  '✏': 'pencil',
  '📝': 'pencil',
  '📚': 'library',
  '📖': 'book',
  '🔒': 'lock',
  '🔓': 'lock-open',
  '🌙': 'moon',
  '🎓': 'graduation',
  '✅': 'check-circle',
  '✔': 'check',
  '❌': 'x-circle',
  '📢': 'megaphone',
  '💣': 'bomb',
  '🖤': 'heart-crack',
  '🧰': 'briefcase',
  '🛠': 'hammer',
  '🔨': 'hammer',
  '🥷': 'mask',
  '🎭': 'drama',
  '📜': 'scroll',
  '🔫': 'crosshair',
  '🪙': 'coins',
  '💰': 'coins',
  '⏳': 'hourglass',
  '⌛': 'hourglass',
  '⏱': 'timer',
  '⛓': 'link',
  '🏋': 'dumbbell',
  '🍀': 'clover',
  '🤝': 'handshake',
  '⚙': 'settings',
  '🎖': 'award',
  '🏅': 'award',
  '🏆': 'trophy',
  '🛤': 'route',
  '👤': 'user',
  '👥': 'users',
  '🔄': 'refresh',
  '🔁': 'refresh',
  '🧩': 'puzzle',
  '💾': 'save',
  '📌': 'pin',
  '🎬': 'clapperboard',
  '💨': 'wind',
  '🔦': 'flashlight',
  '📡': 'radio',
  '🎁': 'gift',
  '🧪': 'flask',
  '📈': 'trending',
  '🗒': 'note',
  '📋': 'note',
  '🏪': 'store',
  '🛒': 'store',
  '📦': 'package',
  '🌀': 'energia',
  '😱': 'medo',
  '🫀': 'heart',
  '🦶': 'footprints',
  '🏃': 'footprints',
  '🎨': 'palette',
  '☀': 'sun',
  '⭐': 'star',
  '🌟': 'star',
  '🗝': 'key',
  '🔑': 'key',
  '↩': 'undo',
  '🕒': 'clock',
  '📊': 'chart',
  '🫸': 'swords',
  '🦵': 'footprints',
  '🪚': 'hammer',
  '🪞': 'user',
  'ℹ': 'info',
  '💔': 'heart-crack',
  '🗑': 'trash',
  '🚫': 'x-circle',
  '🚪': 'logout',
  '📥': 'package',
  '⚖': 'scroll',
};

const EMOJI_RE = /(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|️‍\p{Extended_Pictographic})*️?)\s?/gu;

/** Remove emojis de um texto vindo de dados (mantém o resto). */
export function stripEmoji(text: string): string {
  return text.replace(EMOJI_RE, '').replace(/\s{2,}/g, ' ').trim();
}

/** Primeiro emoji do texto convertido em nome de ícone (ou null). */
export function leadingEmojiIcon(text: string): IconName | null {
  const m = text.match(/^\s*(\p{Extended_Pictographic})/u);
  if (!m) return null;
  return EMOJI_ICON[m[1]] ?? null;
}

/** Renderiza texto de dados trocando o emoji inicial por ícone. */
export function IconText({ text, size = 14, className = '' }: { text: string; size?: number; className?: string }) {
  const icon = leadingEmojiIcon(text);
  const clean = stripEmoji(text);
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {icon && <Icon name={icon} size={size} />}
      <span>{clean}</span>
    </span>
  );
}
