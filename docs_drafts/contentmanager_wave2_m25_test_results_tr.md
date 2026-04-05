# Wave 2 / M25 — Test Sonuclari

## Ozet
```
Test Files  179 passed (179)
Tests       2291 passed (2291)
Duration    ~100s
TypeScript  0 errors
```

## Yeni Test Dosyalari

### stores/commandPaletteStore.test.ts (17 test)
- starts closed ✅
- opens and resets query ✅
- closes and resets state ✅
- toggles open/close ✅
- registers commands ✅
- does not duplicate on re-register ✅
- unregisters commands by id ✅
- executes command by id ✅
- executeSelected runs the selected command ✅
- setQuery resets selectedIndex to 0 ✅
- filterCommands: returns all when empty ✅
- filterCommands: filters by label ✅
- filterCommands: filters by keyword ✅
- filterCommands: multi-term search ✅
- filterCommands: case insensitive ✅
- filterCommands: Turkish char normalization ✅
- filterCommands: empty result ✅

### hooks/useCommandPaletteShortcut.test.ts (4 test)
- opens palette on Ctrl+K ✅
- opens palette on Meta+K (Cmd+K) ✅
- toggles palette on repeated Ctrl+K ✅
- does not open on plain K key ✅

### commands/adminCommands.test.ts (11 test)
- returns commands for all admin pages ✅
- all commands have unique ids ✅
- all commands are navigation category ✅
- all commands have label, icon, and action ✅
- executing a command calls navigate with correct path ✅
- visibility-gated commands have visibilityKey ✅
- returns action commands ✅
- all commands are action category ✅
- all commands have unique ids ✅
- executing create-standard-video navigates to /new ✅
- no id collision with navigation commands ✅

## Mevcut Testlerin Durumu
- Wave 1 testleri: TUMU GECTI (degisiklik yok)
- Theme testleri: TUMU GECTI
- uiStore testleri: TUMU GECTI
- useSearchFocus testleri: TUMU GECTI
- Smoke testleri: TUMU GECTI (Turkish karakter onarimindan sonra)
