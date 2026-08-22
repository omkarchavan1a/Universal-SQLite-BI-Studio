import React from 'react';
import { Palette, Check, Sparkles, X, Sun, Moon, Zap, Shield, Crown } from 'lucide-react';
import { ThemeId, THEME_LIST, ThemeConfig } from '../themes';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentThemeId: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  currentThemeId,
  onSelectTheme,
}) => {
  if (!isOpen) return null;

  const currentTheme = THEME_LIST.find((t) => t.id === currentThemeId) || THEME_LIST[0];

  const getThemeIcon = (theme: ThemeConfig) => {
    switch (theme.id) {
      case 'berry_noir':
        return <Sparkles className="w-4 h-4 text-[#E07A9A]" />;
      case 'obsidian_gold':
        return <Crown className="w-4 h-4 text-[#D4AF37]" />;
      case 'cyber_neon':
        return <Zap className="w-4 h-4 text-[#10B981]" />;
      case 'warm_sage':
        return <Sun className="w-4 h-4 text-[#4B5E40]" />;
      case 'quantum_slate':
        return <Shield className="w-4 h-4 text-[#6366F1]" />;
      case 'arctic_clean':
        return <Sun className="w-4 h-4 text-[#2563EB]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col transition-all duration-300"
        style={{
          backgroundColor: currentTheme.bgCard,
          borderColor: currentTheme.borderCard,
          color: currentTheme.textPrimary,
        }}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: currentTheme.borderSubtle }}
        >
          <div className="flex items-center space-x-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold"
              style={{
                background: currentTheme.bgBadge,
                color: currentTheme.accentPrimary,
                border: `1px solid ${currentTheme.borderCard}`,
              }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold tracking-tight" style={{ color: currentTheme.textPrimary }}>
                  Dashboard Visual Archetypes & Themes
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold" style={{ background: currentTheme.bgBadge, color: currentTheme.accentPrimary }}>
                  6 Showcase Palettes
                </span>
              </div>
              <p className="text-xs" style={{ color: currentTheme.textSecondary }}>
                Switch instantly between Luxury Gold, Cyber Neon HUD, Mauve Berry Noir, and Minimalist Light themes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl transition cursor-pointer hover:opacity-80"
            style={{ backgroundColor: currentTheme.bgInput, color: currentTheme.textSecondary }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Theme Cards Grid */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {THEME_LIST.map((theme) => {
              const isSelected = currentThemeId === theme.id;

              return (
                <div
                  key={theme.id}
                  onClick={() => {
                    onSelectTheme(theme.id);
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer group relative flex flex-col justify-between ${
                    isSelected ? 'ring-2' : 'hover:scale-[1.01]'
                  }`}
                  style={{
                    backgroundColor: theme.bgCard,
                    borderColor: isSelected ? theme.accentPrimary : theme.borderCard,
                    ringColor: theme.accentPrimary,
                    boxShadow: isSelected ? theme.glowEffect : 'none',
                  }}
                >
                  {/* Active Badge */}
                  {isSelected && (
                    <div
                      className="absolute top-3 right-3 flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-xs"
                      style={{ background: theme.accentGradient }}
                    >
                      <Check className="w-3 h-3" />
                      <span>Active</span>
                    </div>
                  )}

                  <div>
                    {/* Theme Header */}
                    <div className="flex items-center space-x-2.5 mb-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: theme.bgBadge, border: `1px solid ${theme.borderCard}` }}
                      >
                        {getThemeIcon(theme)}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold" style={{ color: theme.textPrimary }}>
                          {theme.name}
                        </h3>
                        <span className="text-[10px] uppercase font-mono tracking-wider" style={{ color: theme.textMuted }}>
                          {theme.category}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] leading-relaxed mb-3.5" style={{ color: theme.textSecondary }}>
                      {theme.description}
                    </p>

                    {/* Mini Visual Preview Mockup */}
                    <div
                      className="p-2.5 rounded-lg border mb-3 space-y-2"
                      style={{ backgroundColor: theme.bgApp, borderColor: theme.borderSubtle }}
                    >
                      {/* Mini KPI row */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <div
                          className="p-1.5 rounded border"
                          style={{
                            backgroundColor: theme.bgCard,
                            borderColor: theme.id === 'cyber_neon' ? theme.accentPrimary : theme.borderCard,
                          }}
                        >
                          <div className="text-[8px]" style={{ color: theme.textMuted }}>REVENUE</div>
                          <div className="text-[10px] font-bold font-mono" style={{ color: theme.accentPrimary }}>$8.47M</div>
                        </div>
                        <div
                          className="p-1.5 rounded border"
                          style={{
                            backgroundColor: theme.bgCard,
                            borderColor: theme.id === 'cyber_neon' ? theme.accentSecondary : theme.borderCard,
                          }}
                        >
                          <div className="text-[8px]" style={{ color: theme.textMuted }}>UTILIZATION</div>
                          <div className="text-[10px] font-bold font-mono" style={{ color: theme.accentSecondary }}>84.2%</div>
                        </div>
                      </div>

                      {/* Mini Chart Color Bar */}
                      <div className="flex items-center space-x-1 pt-1">
                        {theme.chartPalette.map((color, cIdx) => (
                          <div
                            key={cIdx}
                            className="h-2 flex-1 rounded-xs"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Select Theme Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTheme(theme.id);
                      onClose();
                    }}
                    className="w-full py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center space-x-1.5"
                    style={{
                      backgroundColor: isSelected ? theme.accentPrimary : theme.bgInput,
                      color: isSelected ? '#FFFFFF' : theme.textPrimary,
                      border: `1px solid ${isSelected ? theme.accentPrimary : theme.borderSubtle}`,
                    }}
                  >
                    <span>{isSelected ? 'Applied Theme' : 'Apply Theme'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-3.5 border-t text-xs"
          style={{ borderColor: currentTheme.borderSubtle, backgroundColor: currentTheme.bgInput }}
        >
          <span style={{ color: currentTheme.textSecondary }}>
            All charts, metric cards, SQL console, and tables sync with active theme.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white shadow-xs transition cursor-pointer"
            style={{ background: currentTheme.accentGradient }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
