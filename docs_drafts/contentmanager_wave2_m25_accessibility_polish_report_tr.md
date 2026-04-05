# Wave 2 / M25 — Faz F: Accessibility / Polish Raporu

## Ozet
Overlay stack guvenligi, keyboard scope cakismalari ve aria/label/focus yonetimi guclendirildi.

## Overlay Stack Mimarisi

### z-index Katmanlari (tokens.ts)
```
sidebar:         100
header:          110
dropdown:        200
modal:           300  (Sheet, QuickLook)
commandPalette:  350  (Cmd+K palette)
toast:           400  (bildirimler)
```

### Dismiss Stack (ESC Onceligi)
- LIFO sira: en ustteki overlay ESC'yi yakalar
- Birden fazla overlay acikken cakisma yok
- CommandPalette, Sheet, QuickLook hepsi dismiss stack ile entegre

### Keyboard Scope Stack
- LIFO scope yonetimi: ustteki scope tum keyboard eventleri yakalar
- CommandPalette acikken diger scope'lar devre disi
- Sheet acikken CommandPalette scope'u duser

### Focus Yonetimi
- CommandPalette: input'a otomatik focus, Tab trap
- Sheet: panele focus, Tab/Shift+Tab cycle (focus trap)
- QuickLook: modal'e focus, Space ile kapat
- Focus restore: overlay kapandiginda onceki aktif element'e donus

## ARIA ve Label Uyumlulugu
- CommandPalette: role="dialog", aria-modal="true", aria-label="Komut Paleti"
- CommandPalette items: role="option", aria-selected
- CommandPalette list: role="listbox", aria-label="Komutlar"
- Sheet: role="dialog", aria-modal="true", aria-label
- QuickLook: role="dialog", aria-modal="true", aria-label
- Toast: role="alert", aria-live="polite"
- Kapat butonlari: aria-label="Kapat"
- Header palette butonu: aria-label="Komut Paleti"

## Keyboard Kisayollari
- Cmd+K / Ctrl+K: Command Palette ac/kapat (capture phase, preventDefault)
- ESC: En ustteki overlay'i kapat
- /: Arama alanina odaklan (input disindayken)
- Space: QuickLook toggle (Jobs table)
- ArrowUp/Down: Tablo gezintisi, palette gezintisi
- Enter: Secili komut calistir, detay ac

## CSS Animasyonlar (index.css)
- sheetSlideIn: sag'dan kayma
- sheetFadeIn: arka plan solma
- quicklookScaleIn: olcek buyume
- toastSlideIn: sag'dan kayma
- palette-enter: yukari'dan kayma + olcek

## Test Durumu
- 2291 test, tumu gecti
- 0 TypeScript hatasi
- Tum overlay'lar cakismasiz calisir
