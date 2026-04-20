# Aurora Dusk Cockpit — Implementasyon Raporu

**Branch:** `feature/aurora-dusk-cockpit`
**Başlangıç:** 2026-04-18
**Son güncelleme:** 2026-04-18

---

## 0. Temel İlkeler (kullanıcı kararı)

1. **Mevcut surface'ler dokunulmaz.** Legacy, Horizon, Atrium, Bridge, Canvas — hiçbir sayfasına, layout'una, store'una, CSS'ine, token'ına dokunulmaz. Aurora başarısız olursa hepsi olduğu gibi kalır.
2. **Aurora tamamen ayrı bir yapı.** Tüm dosyalar `frontend/src/surfaces/aurora/` ve `frontend/src/styles/aurora/` altında. CSS scope `[data-surface="aurora"]`.
3. **Karar erteleme:** Aurora beğenilirse diğer surface'leri Aurora'ya göre değerlendireceğiz. Şu an karşılaştırma yok — sadece Aurora'yı tam olarak inşa et.

## 1. İzolasyon Garantileri (verifiye edildi)

| Mekanizma | Nereden | Garanti |
|---|---|---|
| Surface seçimi | `useSurfaceResolution.ts` | Aurora aktif değilse hiçbir Aurora kodu render edilmez |
| Sayfa override | `useSurfacePageOverride(key, Legacy)` | Sadece **aktif** surface'in override map'ine bakar; diğer surface'ler legacy fallback'e düşer |
| CSS scope | `[data-surface="aurora"]` prefix | Aurora kapalıyken hiçbir Aurora stili global'i etkilemez |
| Settings gate | `ui.surface.aurora.enabled` | Backend'den kapatılırsa registry'de var ama seçilemez |
| Page override map | `AURORA_PAGE_OVERRIDES` | Boş map = legacy chrome + legacy sayfalar (Faz 6.0 davranışı) |

**Sonuç:** Aurora'ya yapılan herhangi bir ekleme/değişiklik diğer 5 surface'i etkilemez. Geri alma maliyeti = 1 settings toggle.

## 2. Aurora'nın Tasarım İmzası (kısa özet)

| Boyut | Değer |
|---|---|
| Font | Geist (UI), Geist Mono (tabular sayılar) |
| H1 | 26px, weight 500, -0.025em letter-spacing |
| Body | 13px (kompakt yoğunluk; canvas/atrium 14-16px) |
| Mono | 11-12px, weight 450, tabular-nums |
| Caption | 10-11px UPPERCASE |
| Spacing | 4-64px simetrik scale; card padding 18-20px; section gap 12px |
| Radius | 8 (button/input), 10 (card), 12 (modal), 14 (drawer) |
| Shadow | 1px 3px (soft) → 40px 80px (xl); accent glow vurgu |
| Renk (Aurora Dusk default) | Teal #3bc8b8 + Plum #b07ad8 + Amber #e8b87a; bg #0d0818, surface #17102a |
| Renk (Obsidian Slate light) | Aynı palet, açık zemin variant |
| Animasyon | 80-560ms spring ease-out; `aurora-*` keyframe prefix |
| Preview-first primitive | `media-preview`, `quicklook` (880px modal), `drawer` (520px sağ) |

## 3. Mevcut Durum Snapshot (Faz 6.0 — 2026-04-18 22:45)

### Hazır
- Token CSS, cockpit shell CSS (1014 satır, scoped)
- `CockpitShell.tsx` — 4 katman (Ctxbar/Rail/Workbench+Inspector/Statusbar), klavye nav (1-6 hotkeys, ok tuşları, Home/End)
- `AuroraAdminLayout.tsx` — 6 rail (ops/publish/content/news/insights/system)
- `AuroraUserLayout.tsx` — 6 rail (home/projects/publish/channels/engage/analytics)
- `AURORA_MANIFEST` (scope: both, status: beta, v0.1.0)
- Backend setting `ui.surface.aurora.enabled` (default: true)
- `SurfacePickerSection` — Aurora "Aktif Et" butonu görünür (commit `bc75ed4`)

### Eksik / Bilinçli ertelendi
- **Sayfa override'ları:** 0/75 sayfa Aurora'ya özel (her sayfa şu an legacy versiyonunu render ediyor)
- **Statusbar canlı sayılar:** queue/running/failed = 0 (gerçek React Query bağlantısı yok)
- **Inspector canlı içerik:** rail seçimine göre statik metin (sayfa-aware değil)
- **Ctxbar arama:** placeholder, gerçek komut paleti tetiklemiyor
- **Rail badge'leri:** "yeni öğe" sayıları yok
- **Quicklook modal:** CSS'de tanımlı ama React component'i yok
- **Drawer:** CSS'de tanımlı ama React component'i yok

## 4. Sayfa Override Planı

### Admin (54 sayfa) — Rail slot dağılımı

| Rail | Sayfa sayısı | P0 sayfa |
|---|---|---|
| Ops | 9 | **AdminDashboard** (yok→yeni, JobsRegistry mock) |
| Publish | 4 | **PublishCenterPage** (P0-3) |
| Content | 18 | — |
| News | 6 | — |
| Insights | 5 | — |
| System | 9 | — |

### User (21 sayfa) — Rail slot dağılımı

| Rail | Sayfa sayısı | P0 sayfa |
|---|---|---|
| Home | 1 | **UserDashboard** (P0-2) |
| Projects | 2 | — |
| Publish | 1 | — |
| Channels | 4 | — |
| Engage | 3 | — |
| Analytics | 4 | — |

### Öncelik sırası (her bir = 1 commit + rapor güncellemesi)

| # | Öncelik | Sayfa | Override key | Kaynak referans |
|---|---|---|---|---|
| 1 | P0 | Admin Dashboard | `admin.dashboard` | yok (yeni sayfa) |
| 2 | P0 | User Dashboard | `user.dashboard` | Canvas dashboard pattern |
| 3 | P0 | Publish Center (admin) | `admin.publish.center` | Bridge override + Aurora skin |
| 4 | P0 | Jobs Registry (admin) | `admin.jobs.registry` | Bridge override + Aurora skin |
| 5 | P1 | Publish Review Queue | `admin.publish.review` | — |
| 6 | P1 | Analytics Overview | `admin.analytics.overview` | — |
| 7 | P1 | My Projects (user) | `user.projects.list` | Canvas pattern |
| 8 | P1 | Project Detail (user) | `user.projects.detail` | Canvas pattern |
| 9 | P2 | Channels (user) | `user.channels.list` | — |
| 10 | P2 | Inbox (user) | `user.engage.inbox` | — |
| 11+ | P2/P3 | Diğer registry/wizard/settings sayfaları | — | — |

## 5. İlerleme Tablosu

| # | Sayfa | Override key | Durum | Commit | Eksikler |
|---|---|---|---|---|---|
| 0 | (chrome only) | — | ✅ teslim | `62bc1e0` | Statusbar canlı, inspector canlı, ctxbar search |
| 0a | Picker fix | — | ✅ teslim | `bc75ed4` | — |
| 1 | Admin Dashboard | `admin.dashboard` | ✅ teslim | (pending) | Inspector sayfa-aware değil |
| 1a | Responsive CSS | — | ✅ teslim | (pending) | Quicklook/drawer mobilde henüz yok |
| 2 | User Dashboard | `user.dashboard` | ⏳ planlandı | — | — |
| 3 | Publish Center | `admin.publish.center` | ⏳ planlandı | — | — |
| 4 | Jobs Registry | `admin.jobs.registry` | ⏳ planlandı | — | — |

### Admin Dashboard teslim notu (P0-1, 2026-04-18)

**Yeni dosyalar:**
- `frontend/src/surfaces/aurora/AuroraAdminDashboardPage.tsx` (343 satır) — mevcut React Query hook'ları (useDashboardSummary, useJobsList) ile tam çalışan kokpit dashboard.
- `frontend/src/surfaces/aurora/primitives.tsx` (362 satır) — AuroraButton/Card/Section/StatusChip/MeterTile/Table/PageShell.
- `frontend/src/styles/aurora/responsive.css` (yeni) — 1200/900/640px breakpoint stratejisi + coarse-pointer touch iyileştirmeleri.

**Dokunulan dosyalar (minimal, geri döndürülebilir):**
- `frontend/src/surfaces/manifests/register.tsx` — AuroraAdminDashboardForwarder + AURORA_PAGE_OVERRIDES map.
- `frontend/src/pages/AdminOverviewPage.tsx` — override hook + erken return (JobsRegistryPage pattern'i).
- `frontend/src/index.css` — responsive.css import.

**Doğrulama (browser preview):**
- Desktop (1280+): 6 meter tile yatay, inspector görünür, sağ tarafta rail vertical.
- Tablet (768): rail bottom nav'a döner, inspector gizli, meter grid 2 kolon, tablo horizontal scroll.
- Mobile (375): 2 kolon meter, kompakt ctxbar (icon-only arama), 36px touch button'lar, bottom rail.
- Console hata yok; `tsc --noEmit` temiz.

**Bilinçli ertelendi:**
- Inspector aurora-only içerik (şu anda placeholder, AdminDashboard'a özel değil).
- Quicklook/drawer React component'i (CSS var, henüz React tarafı yok).
- Statusbar canlı sayılar (queue/running/failed sayaçları hâlâ 0).

## 6. Eksik Frontend Element Envanteri (Faz 6 boyunca güncellenecek)

Şu an tespit edilen, Aurora'nın tasarım dilini tam karşılamak için eklenmesi gereken React primitive'leri:

| Eksik | Açıklama | Çözüm | Öncelik |
|---|---|---|---|
| `<AuroraQuicklookModal>` | 880px modal, scale-in 0.2s, full metadata footer | React component yaz, `useQuicklookStore` Zustand | P1 (preview-first için kritik) |
| `<AuroraDrawer>` | 520px sağ panel, slide-in 0.24s, tabbed body | React component, focus trap | P1 (job/project detay için) |
| `<AuroraMediaPreview>` | thumb + audio waveform + shimmer skeleton card | Component | P1 |
| `<AuroraMeterTile>` | metric tile (status pulse + tabular value) | Component | P0 (dashboard için) |
| `<AuroraStatusChip>` | success/warning/danger/info chip with icon dot | Component | P0 |
| `<AuroraDataTable>` | header 10px upper, row 12px pad, hover bg-inset, selection accent | Component (custom; ContentHub'ın mevcut DataTable'ı Aurora'ya uymaz) | P1 |
| `<AuroraButton>` | `.btn` class wrapper (sm/md/lg + primary/secondary/ghost/danger) | Component | P0 |
| Live job counts | statusbar'ın queue/running/failed gerçek sayıları | React Query hook bağla | P2 |
| Inspector sayfa-aware | aktif rail/page'e göre dinamik içerik | Inspector context store + per-page registry | P2 |
| Ctxbar global search | `Cmd+K` paleti tetiklemesi | `useCommandPaletteStore.openPalette()` çağrısı | P0 |

## 7. Karar Verme Noktaları (kullanıcıya açık)

Her P0 sayfa teslim edildikten sonra durulup şunlar değerlendirilecek:

1. **Görsel hissiyat doğru mu?** Aurora'nın kompakt + premium dilini taşıyor mu?
2. **Eksik primitive var mı?** Sayfa yazarken yukarıdaki listeye ek bileşen ihtiyacı doğdu mu?
3. **Devam mı, pivot mı?** P0 grubu (4 sayfa) bittikten sonra: Aurora'yı yaymak için P1'e geçilsin mi, yoksa tasarım dili değişsin mi?

---

## Değişiklik Günlüğü

| Tarih | İşlem | Etki |
|---|---|---|
| 2026-04-18 | Rapor dosyası oluşturuldu | İzolasyon ilkeleri sabitlendi, P0-P2 plan dondu |
| 2026-04-18 | P0-1 AdminDashboard teslim (v1 basit) | 6 meter + iş akışı + son hatalar + modül dağılımı; register wire + AdminOverviewPage override hook |
| 2026-04-18 | Responsive CSS eklendi | 1200/900/640 breakpoint; tablet'te bottom rail, mobile'da touch target 40px |
| 2026-04-18 | Tasarım kaynağı güncellendi | `ContentHub_Design _System/` klasörü (9 admin + 7 user + 6 auth sayfa + 27 design-system dokümanı) - full port kaynağı |

