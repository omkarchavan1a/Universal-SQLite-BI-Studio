export type ThemeId = 'berry_noir' | 'obsidian_gold' | 'cyber_neon' | 'warm_sage' | 'quantum_slate' | 'arctic_clean';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  category: string;
  description: string;
  isDark: boolean;
  
  // Backgrounds & Surfaces
  bgApp: string;
  bgCard: string;
  bgCardHover: string;
  bgInput: string;
  bgBadge: string;
  
  // Borders & Accents
  borderCard: string;
  borderSubtle: string;
  accentPrimary: string;
  accentSecondary: string;
  accentGradient: string;
  glowEffect?: string;
  
  // Text Colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textAccent: string;

  // Chart Palettes & Gradients
  chartPalette: string[];
  chartGradients: { start: string; end: string }[];
  gridLineColor: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;

  // Visual card style archetype
  archetype: 'mauve_berry' | 'gold_noir' | 'cyber_neon' | 'warm_sage' | 'quantum_slate' | 'arctic_clean';
  badgeStyle: string;
  kpiGlowClass?: string;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  berry_noir: {
    id: 'berry_noir',
    name: 'Berry Noir & Mauve',
    category: 'Muted Rose Dark',
    description: 'Espresso charcoal with dusty rose pink highlights, soft curves and glowing magenta charts',
    isDark: true,
    bgApp: '#181316',
    bgCard: '#241C21',
    bgCardHover: '#2E242B',
    bgInput: '#1F171C',
    bgBadge: 'rgba(224, 122, 154, 0.15)',
    borderCard: '#3A2C35',
    borderSubtle: '#2E222A',
    accentPrimary: '#E07A9A',
    accentSecondary: '#C45D7E',
    accentGradient: 'linear-gradient(135deg, #E07A9A 0%, #8C3A5A 100%)',
    glowEffect: '0 8px 24px -4px rgba(224, 122, 154, 0.25)',
    textPrimary: '#FAF0F4',
    textSecondary: '#CCA8B7',
    textMuted: '#8F717F',
    textAccent: '#F2AEC3',
    chartPalette: ['#E07A9A', '#C45D7E', '#8C3A5A', '#F2AEC3', '#D989B5', '#662B42'],
    chartGradients: [
      { start: '#E07A9A', end: '#8C3A5A' },
      { start: '#F2AEC3', end: '#C45D7E' },
    ],
    gridLineColor: '#30242B',
    tooltipBg: '#1A1418',
    tooltipBorder: '#45333E',
    tooltipText: '#FAF0F4',
    archetype: 'mauve_berry',
    badgeStyle: 'bg-[#E07A9A]/15 text-[#F2AEC3] border border-[#E07A9A]/30',
    kpiGlowClass: 'border-[#3A2C35] hover:border-[#E07A9A]/50 transition-all duration-300',
  },

  obsidian_gold: {
    id: 'obsidian_gold',
    name: 'Obsidian & 24K Gold',
    category: 'Executive Luxury Noir',
    description: 'Jet obsidian black with metallic champagne gold accents and warm amber gauges',
    isDark: true,
    bgApp: '#0A0908',
    bgCard: '#151310',
    bgCardHover: '#1D1A16',
    bgInput: '#100E0C',
    bgBadge: 'rgba(212, 175, 55, 0.15)',
    borderCard: '#2C261E',
    borderSubtle: '#221D16',
    accentPrimary: '#D4AF37',
    accentSecondary: '#E6CA65',
    accentGradient: 'linear-gradient(135deg, #D4AF37 0%, #8C6D1F 100%)',
    glowEffect: '0 8px 24px -4px rgba(212, 175, 55, 0.2)',
    textPrimary: '#FAF6ED',
    textSecondary: '#C7B9A3',
    textMuted: '#857864',
    textAccent: '#F5E296',
    chartPalette: ['#D4AF37', '#E6CA65', '#9E7D2B', '#F5E296', '#C2983B', '#694F14'],
    chartGradients: [
      { start: '#E6CA65', end: '#8C6D1F' },
      { start: '#D4AF37', end: '#543F0E' },
    ],
    gridLineColor: '#242019',
    tooltipBg: '#110F0C',
    tooltipBorder: '#3D3426',
    tooltipText: '#FAF6ED',
    archetype: 'gold_noir',
    badgeStyle: 'bg-[#D4AF37]/15 text-[#F5E296] border border-[#D4AF37]/30',
    kpiGlowClass: 'border-[#2C261E] hover:border-[#D4AF37]/50 transition-all duration-300',
  },

  cyber_neon: {
    id: 'cyber_neon',
    name: 'Cyber Fleet Neon',
    category: 'Electric Dark HUD',
    description: 'Midnight navy HUD with multi-color glowing neon card borders and luminous data curves',
    isDark: true,
    bgApp: '#080D1A',
    bgCard: '#0F172A',
    bgCardHover: '#17233D',
    bgInput: '#0B1120',
    bgBadge: 'rgba(16, 185, 129, 0.15)',
    borderCard: '#1E293B',
    borderSubtle: '#152136',
    accentPrimary: '#10B981',
    accentSecondary: '#06B6D4',
    accentGradient: 'linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #3B82F6 100%)',
    glowEffect: '0 8px 28px -4px rgba(16, 185, 129, 0.3)',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textAccent: '#34D399',
    chartPalette: ['#10B981', '#06B6D4', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6'],
    chartGradients: [
      { start: '#10B981', end: '#06B6D4' },
      { start: '#06B6D4', end: '#3B82F6' },
    ],
    gridLineColor: '#1E293B',
    tooltipBg: '#0F172A',
    tooltipBorder: '#334155',
    tooltipText: '#F8FAFC',
    archetype: 'cyber_neon',
    badgeStyle: 'bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30',
    kpiGlowClass: 'border-[#1E293B] hover:shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all duration-300',
  },

  warm_sage: {
    id: 'warm_sage',
    name: 'Natural Sage & Linen',
    category: 'Minimalist Warm Light',
    description: 'Earthy cream canvas with forest sage accents, clean lines and natural paper texture',
    isDark: false,
    bgApp: '#F7F6F2',
    bgCard: '#FFFFFF',
    bgCardHover: '#FAF9F5',
    bgInput: '#F0EEE6',
    bgBadge: 'rgba(75, 94, 64, 0.1)',
    borderCard: '#E2DFD7',
    borderSubtle: '#EAE7DF',
    accentPrimary: '#4B5E40',
    accentSecondary: '#7B8F68',
    accentGradient: 'linear-gradient(135deg, #4B5E40 0%, #2F3C28 100%)',
    glowEffect: '0 4px 16px -2px rgba(75, 94, 64, 0.1)',
    textPrimary: '#1E231F',
    textSecondary: '#5E665D',
    textMuted: '#8A9289',
    textAccent: '#4B5E40',
    chartPalette: ['#4B5E40', '#7B8F68', '#A98D65', '#B86A4C', '#5C7480', '#8D7B68'],
    chartGradients: [
      { start: '#4B5E40', end: '#7B8F68' },
      { start: '#A98D65', end: '#B86A4C' },
    ],
    gridLineColor: '#EBE7DD',
    tooltipBg: '#FFFFFF',
    tooltipBorder: '#D8D4C8',
    tooltipText: '#1E231F',
    archetype: 'warm_sage',
    badgeStyle: 'bg-[#4B5E40]/10 text-[#4B5E40] border border-[#4B5E40]/20',
    kpiGlowClass: 'border-[#E2DFD7] hover:border-[#4B5E40]/40 transition-all duration-300',
  },

  quantum_slate: {
    id: 'quantum_slate',
    name: 'Quantum Indigo',
    category: 'SaaS Deep Cobalt Dark',
    description: 'High-contrast midnight slate with electric violet and vibrant indigo curves',
    isDark: true,
    bgApp: '#0B0F19',
    bgCard: '#131B2E',
    bgCardHover: '#1B2640',
    bgInput: '#0E1524',
    bgBadge: 'rgba(99, 102, 241, 0.15)',
    borderCard: '#232F4B',
    borderSubtle: '#1B253D',
    accentPrimary: '#6366F1',
    accentSecondary: '#8B5CF6',
    accentGradient: 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
    glowEffect: '0 8px 24px -4px rgba(99, 102, 241, 0.25)',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textAccent: '#818CF8',
    chartPalette: ['#6366F1', '#8B5CF6', '#EC4899', '#38BDF8', '#10B981', '#F59E0B'],
    chartGradients: [
      { start: '#6366F1', end: '#8B5CF6' },
      { start: '#38BDF8', end: '#EC4899' },
    ],
    gridLineColor: '#1E293B',
    tooltipBg: '#131B2E',
    tooltipBorder: '#334155',
    tooltipText: '#F8FAFC',
    archetype: 'quantum_slate',
    badgeStyle: 'bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30',
    kpiGlowClass: 'border-[#232F4B] hover:border-[#6366F1]/50 transition-all duration-300',
  },

  arctic_clean: {
    id: 'arctic_clean',
    name: 'Arctic Quartz Light',
    category: 'Modern Corporate Light',
    description: 'Crisp snow-white layout with vivid royal sapphire and clean tabular precision',
    isDark: false,
    bgApp: '#F8FAFC',
    bgCard: '#FFFFFF',
    bgCardHover: '#F1F5F9',
    bgInput: '#F1F5F9',
    bgBadge: 'rgba(37, 99, 235, 0.1)',
    borderCard: '#E2E8F0',
    borderSubtle: '#CBD5E1',
    accentPrimary: '#2563EB',
    accentSecondary: '#0284C7',
    accentGradient: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
    glowEffect: '0 4px 16px -2px rgba(37, 99, 235, 0.1)',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    textAccent: '#2563EB',
    chartPalette: ['#2563EB', '#0284C7', '#059669', '#D97706', '#7C3AED', '#DC2626'],
    chartGradients: [
      { start: '#2563EB', end: '#0284C7' },
      { start: '#059669', end: '#10B981' },
    ],
    gridLineColor: '#E2E8F0',
    tooltipBg: '#FFFFFF',
    tooltipBorder: '#CBD5E1',
    tooltipText: '#0F172A',
    archetype: 'arctic_clean',
    badgeStyle: 'bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20',
    kpiGlowClass: 'border-[#E2E8F0] hover:border-[#2563EB]/40 transition-all duration-300',
  },
};

export const THEME_LIST = Object.values(THEMES);

export function getTheme(id: ThemeId): ThemeConfig {
  return THEMES[id] || THEMES.berry_noir;
}
