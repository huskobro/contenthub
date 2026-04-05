# Wave 2 / M25 — Faz A: Command Palette Raporu

## Ozet
Cmd+K / Ctrl+K ile acilan gercek bir komut paleti sistemi kuruldu. Tum admin sayfalarinin navigasyonu ve yeni olusturma aksiyonlari tek bir arayuzden erisilebilir hale getirildi.

## Olusturulan Dosyalar

### 1. `stores/commandPaletteStore.ts`
- Zustand store: isOpen, query, selectedIndex, commands
- Command tipleri: navigation, action, search, settings, theme
- `filterCommands()`: Turkish karakter normalizasyonlu arama (I/i/ı/ş/ç/g/u/o)
- Register/unregister/execute API

### 2. `commands/adminCommands.ts`
- `buildAdminNavigationCommands(navigate)`: 21 gercek navigasyon komutu
- `buildAdminActionCommands(navigate)`: 9 gercek olusturma komutu
- Her komut: id, label, category, icon, description, keywords, visibilityKey (opsiyonel), action
- Visibility-gated komutlar: panel:settings, panel:visibility, panel:templates, panel:analytics, panel:sources
- SAHTE veya DEKORATIF komut yok — her komut gercek bir route veya action'a baglanir

### 3. `components/design-system/CommandPalette.tsx`
- Portal-based overlay (document.body'ye render edilir)
- Visibility-aware filtreleme (useVisibility hook ile)
- Keyboard-first: ArrowUp/Down, Enter, ESC (dismiss stack), Tab trap
- Kategorize gruplu gosterim (Eylem, Gezinti, Ayarlar, Tema, Arama)
- Arama alanina otomatik odaklanma
- Secili komut scroll into view
- Footer hint (↑↓ gezin, ↵ calistir, esc kapat)
- z-index: commandPalette (350) — modal (300) ile toast (400) arasinda

### 4. `hooks/useCommandPaletteShortcut.ts`
- Global capture-phase keydown listener
- Meta+K (macOS) ve Ctrl+K (Windows/Linux) destegi
- preventDefault ile tarayici davranisini engeller

### 5. AppHeader guncellemesi
- "Ara veya komut..." butonu eklendi (⌘K hint ile)
- Click ile palette acar
- Token-based styling

### 6. AdminLayout entegrasyonu
- useCommandPaletteShortcut hook
- useEffect ile admin commands kaydedilir, unmount'ta cikarilir
- CommandPalette componenti Toast ve outlet ile birlikte render edilir

## z-index Katmani
tokens.ts'e `commandPalette: 350` eklendi:
```
sidebar: 100
header: 110
dropdown: 200
modal: 300
commandPalette: 350
toast: 400
```

## Animasyon
index.css'e `palette-enter` keyframe eklendi (translateY + scale + opacity).

## Testler
- `commandPaletteStore.test.ts`: 17 test (open/close/toggle, register/unregister, execute, query filter, Turkish normalization)
- `useCommandPaletteShortcut.test.ts`: 4 test (Ctrl+K, Meta+K, toggle, plain K ignored)
- `adminCommands.test.ts`: 11 test (unique ids, categories, navigate calls, visibility keys, no collisions)
- Toplam: 32 yeni test, tumu gecti

## Overlay Stack Guvenligi
- Dismiss stack entegrasyonu (ESC onceligi)
- Keyboard scope stack entegrasyonu (LIFO)
- Toast, Sheet, QuickLook ile cakisma yok
- Body scroll engellenmez (palette sayfayi kaplamaz)

## Bilinen Limitasyonlar
- Arama sadece client-side (sunucu arasi arama yok — gelecek fazda)
- User panel icin ayri komut seti henuz yok (sadece Admin)
- Komutlar statik (dinamik komutlar gelecek fazda)
