# M26 — Contextual Command System

## Ozet
Command palette'e sayfa-bazli (route-aware) komutlar ve event-based action dispatch sistemi eklendi.

## Mimari

### Context Destegi (commandPaletteStore)
- `CommandPaletteContext { currentRoute: string }` tipi eklendi
- `context` alani store'a eklendi (varsayilan: `{ currentRoute: "/" }`)
- `setContext(ctx)` aksiyonu eklendi
- `filterCommands(commands, query, context?)` context parametresi aldi
- Command tipi: `contextRoutes?: string[]` — ayarlanirsa yalnizca eslesen route'ta gosterilir

### Route Takibi (AdminLayout)
- `useLocation()` ile her route degisikliginde `setContext({ currentRoute: location.pathname })` cagrisi
- useEffect icinde otomatik guncelleme

### Contextual Komutlar
`frontend/src/commands/contextualCommands.ts`:

| Route | Komut | Aksiyon ID |
|-------|-------|------------|
| /admin/jobs | Hatali isleri goster | jobs:filter-failed |
| /admin/jobs | Tamamlanan isleri goster | jobs:filter-completed |
| /admin/jobs | Kuyrukta bekleyenleri goster | jobs:filter-queued |
| /admin/library | Sadece Standard Video | library:filter-standard-video |
| /admin/library | Sadece News Bulletin | library:filter-news-bulletin |
| /admin/library | Filtreleri temizle | library:clear-filters |
| /admin/settings | Arama alanina odaklan | settings:focus-search |
| /admin/settings | Tema Yonetimine git | navigate → /admin/themes |
| /admin/sources | Sadece RSS kaynaklari | sources:filter-rss |
| /admin/sources | Sadece aktif kaynaklar | sources:filter-active |

### Event-Based Action Dispatch
`frontend/src/hooks/useContextualActions.ts`:
- Module-scoped pub/sub sistemi (window events degil)
- `dispatchAction(actionId, payload?)` — komut calistirildiktan sonra pub/sub'a gonderir
- `useContextualActionListener(actionId, handler)` — sayfa mount/unmount'ta subscribe/unsubscribe
- Sayfalar dinleyici ekleyerek kendi filtre/odak mantikini yonetir

## Kullanim Akisi
1. Operator Cmd+K basar
2. Command palette acilir, `context.currentRoute` otomatik ayarli
3. Sayfa-bazli komutlar yalnizca dogru route'ta gorunur
4. Operator "Hatali isleri goster" secer
5. `dispatchAction("jobs:filter-failed")` cagrisi yapilir
6. Jobs sayfasindaki `useContextualActionListener` tetiklenir
7. Filtre guncellenir

## Test Kapsamasi
- commandPaletteStore context testleri (7 yeni test)
- contextualCommands builder testleri (13 test)
- dispatchAction module testleri (5 test)
