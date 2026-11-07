// Icon set — inline SVG line icons (24px grid, currentColor stroke).
// Usage in templates:  ${Icon.svg('chevron-left')}  or  ${Icon.svg('book', 20)}

const Icon = {
  PATHS: {
    'chevron-left': '<path d="m15 18-6-6 6-6"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
    'arrow-left': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    'home': '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v10.5a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9"/>',
    'diary': '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M9 3v18"/><path d="M12.5 8.5h3M12.5 12h3"/>',
    'gameplan': '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M8.5 6h7M7.2 8.3l3.6 7.4M16.8 8.3l-3.6 7.4"/>',
    'belt': '<circle cx="12" cy="9" r="5.5"/><path d="m9 13.8-1.5 7.2L12 18.5l4.5 2.5-1.5-7.2"/>',
    'rules': '<path d="M12 3.5V20M8 20.5h8M5 7h14"/><path d="M5 7 2.5 13a2.5 2.5 0 0 0 5 0z"/><path d="M19 7l-2.5 6a2.5 2.5 0 0 0 5 0z"/>',
    'stretch': '<circle cx="12" cy="4.5" r="2"/><path d="M12 7.5v5.5M5 10.5l7 1.5 7-1.5M7.5 21l4.5-8 4.5 8"/>',
    'ball': '<circle cx="12" cy="12" r="8.5"/><path d="M4 9.5c5 2 11 2 16 0M5.5 17c4-1.6 9-1.6 13 0"/>',
    'timer': '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v3.5l2.5 2M9.5 2.5h5M19 6.5l1.5-1.5"/>',
    'plus': '<path d="M12 5v14M5 12h14"/>',
    'x': '<path d="M18 6 6 18M6 6l12 12"/>',
    'check': '<path d="M20 6.5 9 17.5l-5-5"/>',
    'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16.5 9.5"/>',
    'ban': '<circle cx="12" cy="12" r="9"/><path d="m5.7 5.7 12.6 12.6"/>',
    'camera': '<path d="M4 7.5h3l2-3h6l2 3h3a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
    'trash': '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    'trophy': '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5.5h3V7a3 3 0 0 1-3 3M7 5.5H4V7a3 3 0 0 0 3 3"/>',
    'flame': '<path d="M12 21.5c3.9 0 6.5-2.6 6.5-6.3 0-3.7-2.6-6-4-8.7-.7 1.8-1.8 2.8-3.1 3.2.3-2.4-.2-4.5-.9-6.2C7.2 5.8 5.5 9.7 5.5 15.2c0 3.7 2.6 6.3 6.5 6.3z"/>',
    'book-open': '<path d="M2.5 5H8a4 4 0 0 1 4 4v11.5a3 3 0 0 0-3-3H2.5z"/><path d="M21.5 5H16a4 4 0 0 0-4 4v11.5a3 3 0 0 1 3-3h6.5z"/>',
    'search': '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    'pencil': '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    'chart': '<path d="M3 20.5h18"/><path d="M6.5 17v-5M12 17V6.5M17.5 17v-8"/>',
    'target': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    'alert': '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.5h.01"/>',
    'help': '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 2.1-2.4 3.7M12 17h.01"/>',
    'note': '<path d="M6 3h8.5L19 7.5V21H6z"/><path d="M9.5 12h6M9.5 16h4"/>',
    'calendar': '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    'star': '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
    'sparkle': '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    'play': '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>',
    'skip': '<path d="M5 5v14l10-7z" fill="currentColor" stroke="none"/><path d="M18.5 5v14"/>',
    'refresh': '<path d="M20 12a8 8 0 1 1-2.3-5.7L20 8.5"/><path d="M20 3.5v5h-5"/>'
  },

  svg(name, size, cls) {
    const s = size || 22;
    return `<svg class="icon${cls ? ' ' + cls : ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${this.PATHS[name] || ''}</svg>`;
  },

  // Rounded square tinted with a feature colour (see .icon-badge-* in CSS)
  badge(name, tone, size) {
    return `<span class="icon-badge icon-badge-${tone}${size === 'lg' ? ' icon-badge-lg' : ''}" aria-hidden="true">${this.svg(name, size === 'lg' ? 26 : 20)}</span>`;
  }
};
