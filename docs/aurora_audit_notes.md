# Aurora — Sayfa-Sayfa Denetim Notları

Bu doküman, Aurora surface sayfalarının tek-tek geçilmesi sırasında biriken
**iki tür kayıt** içerir:

1. **Tasarım üzerinde değişiklik gerektiren noktalar** — `tasarımla çok
   oynama, gerekirse not al` direktifi gereği işaretlenir, en sonda birlikte
   gözden geçiririz.
2. **Diğer layout/surface'lerde olup Aurora'da olmayan fonksiyonlar /
   endpoint'ler** — sonradan Aurora'ya port edilebilir kapasiteleri kayıt
   altına alır.

Tarih: 2026-04-19

---

## 1. Tasarımla Oynanan / Oynanması Önerilen Yerler

### 1.1 Rail (CockpitShell) — UYGULANDI
- 2 harfli text glyph (`OP`, `PB`, `CT`...) → Lucide-style SVG icon. Rail
  boyutu (56px) ve aktif accent çubuğu korundu, sadece glyph yerine icon.
- **Tasarım dokümanına uyum:** `cockpit-shell.jsx` zaten SVG icon kullanıyor;
  bu değişim tasarıma daha yakın olmasını sağladı.

### 1.2 Rail navigation logic — UYGULANDI
- Eski: `grp?.items?.[0]?.to ?? slot.matchPrefix`.
- Yeni: her slot için `homeRoute` alanı, sabit hedef.
- **Tasarım etkisi: yok** (sadece davranışsal düzeltme).

### 1.3 Boş handler düzeltmeleri — UYGULANDI
- Jobs Registry "Dışa aktar" → CSV export.
- Publish "Takvim görünümü" → `/admin/calendar` navigate.
- Audit "CSV" → CSV export.
- **Tasarım etkisi: yok** (zaten butonlar tasarımdaydı, sadece bağlandı).

### 1.4 BEKLEMEDE — Confirm dialog ekleme (KRİTİK)
CLAUDE.md kuralı: silme/arşivleme/red işlemleri onay isteyecek. Şu an Aurora'da:
- Jobs Registry **Arşivle** (bulk + context menu) — onaysız
- Publish Center **Reddet** — onaysız
- Themes activate — onaysız (düşük risk, geri alınabilir)
**Karar:** Toast tabanlı "geri al" pattern'i mi yoksa ConfirmDialog primitive mi?
Tasarım dokümanı `cockpit-shell.jsx`'te native `confirm()` kullanılıyor — geçici
olarak `window.confirm` ile bağlayacağım, sonra ConfirmDialog primitive eklenir.

### 1.5 BEKLEMEDE — Hardcoded demo veri temizlikleri (KRİTİK)
- **AuroraAnalyticsPage**: `WEEKLY`, `DAY_VALS`, `TOP_CONTENT` hardcoded constant
  (satır 40-54). Backend hook'u var (`useAnalyticsOverview`) ama UI hâlâ demo'ya
  bakıyor. → Live data'ya bağlanacak.
- **AuroraAdminDashboardPage**: System health (52ms, sqlite·idle, disk/CPU/mem %)
  hardcoded (satır 426-471). → `useSystemHealth` hook'u veya backend endpoint
  kontrol edilecek; yoksa "veri yok" empty state gösterilecek (asla yalan rakam).
- **AuroraAdminDashboardPage**: Workspace pane "hüsko / news_bulletin / v2.4.1"
  hardcoded (satır 329-337). → useAuthStore + activeChannelStore.

### 1.6 BEKLEMEDE — Mobile responsive
Tüm sayfalar 768px altında bozuluyor (3-col grid'ler, geniş tablolar). Bu
büyük bir iş — ayrı faz olarak işaretle, MVP shipping'i bloklamaz.

### 1.7 BEKLEMEDE — Empty state / loading polish
Birkaç sayfada error path sessiz (sadece data=[] dönüp boş kalıyor):
- AuroraAdminDashboardPage error path
- AuroraAnalyticsPage error path
- AuroraThemesPage themes=[] empty path

---

## 2. Aurora'da Eksik Olan Fonksiyonlar / Endpoint'ler

### 2.1 admin.jobs.detail — KRİTİK EKSİK
- Bridge surface'inde override edilmiş, Aurora'da yok.
- Job detail sayfası (Overview/Timeline/Logs/Artifacts/Provider Trace/...)
  CLAUDE.md "Job Detail Requirements" bölümüne göre core operasyonel sayfa.
- Aurora'da `/admin/jobs/:jobId` legacy `JobDetailPage`'e düşüyor.
- **Aksiyon:** AuroraJobDetailPage portu (P1).

### 2.2 News Items / Used News — UI yok
- Backend `/news-items` ve `/used-news` endpoint'leri var (`require_admin`).
- Hiçbir surface'in (legacy dahil) UI'ı yok.
- CLAUDE.md product priority listesinde "used-news prevention / dedupe" var.
- **Aksiyon:** Aurora'da News Items registry sayfası (P2).

### 2.3 Theme Yönetimi (Aurora) — Eksik kabiliyetler
Legacy `ThemeRegistryPage`'de var ama Aurora'da yok:
- Tema import (JSON upload)
- Tema export (JSON download)
- Tema silme
- Tema klonlama
- Tema kilitleme (system theme override koruması)
**Karar:** Aurora minimal — aktivasyon yeterli; ileri yönetim için "Tam editörü
aç" linki legacy'ye yönlendirsin (Settings sayfasıyla aynı pattern).

### 2.4 Settings yazma — kasıtlı eksik
Aurora SettingsPage read-only; yazma için legacy linki var. CLAUDE.md ile
uyumlu (visible & manageable; manageable kısmı legacy üzerinden). KORUNACAK.

### 2.5 Publish Center — Eksik kabiliyetler
Legacy PublishCenterPage'de var:
- Schedule (zaman seçici)
- Retry failed publish
- Publish log detail
**Karar:** Aurora'ya port edilecek (P2).

### 2.6 Jobs Registry — Eksik kabiliyetler
- Job filter persisting (server-side filter, URL param sync)
- Bulk status change (sadece arşivleme var, retry/restart yok)
**Karar:** P3 — şu an çalışan minimum yeterli.

---

## 3. Yapılacaklar (Sıralı Plan)

| # | İş | Faz | Etki |
|---|----|-----|------|
| A | Confirm dialog (window.confirm geçici) — Jobs archive, Publish reject | P0 | Veri kaybı engelleme |
| B | Dashboard system health — backend endpoint çağır veya empty state | P0 | "Yalan veri yok" |
| C | Dashboard workspace pane — auth + channel store | P0 | "Yalan veri yok" |
| D | Analytics live data wiring (DAY_VALS / TOP_CONTENT) | P0 | "Yalan veri yok" |
| E | Audit page IP alanı — backend'de yoksa "—" yerine kaldır | P1 | Tasarım temizliği |
| F | Wizard form data → modül sihirbazına taşıma | P1 | Wizard akış bütünlüğü |
| G | AuroraJobDetailPage port | P1 | Eksik kabiliyet |
| H | AuroraNewsItemsPage (yeni) | P2 | Yeni kabiliyet |
| I | AuroraPublishSchedule + Retry | P2 | Eksik kabiliyet |
| J | Mobile responsive pass | P3 | Erişilebilirlik |

## Değişiklik Günlüğü

- **2026-04-19** — Doküman oluşturuldu. Rail icon + homeRoute + 3 boş handler
  düzeltmeleri kaydedildi. P0-P3 sıralı plan eklendi.
- **2026-04-19** — P0-A/B/C/D tamamlandı:
  - P0-A: Jobs archive (single+bulk) ve Publish reject artık `window.confirm` /
    `window.prompt` ile onaya tabi.
  - P0-B: Dashboard system health → `useSystemHealth` (`/api/v1/health`)
    bağlandı. "52ms" / "14 dinleyici" / "azure ~38s" / "disk-cpu-mem 68/34/52"
    sahte rakamları kaldırıldı; yerine canlı DB durumu, WAL flag, Python
    sürüm, venv aktif, son 7 gün hata sayacı + uygulama adı geliyor.
  - P0-C: Workspace pane → `useAuthStore` + `useThemeStore` + health'e
    bağlandı. "@ekonomi_gundem / hüsko / v2.4.1" hardcode kaldırıldı; gerçek
    kullanıcı, rol, aktif tema id, backend app adı, db modu görünüyor.
  - P0-D: Analytics live data → `useDashboardSummary().daily_trend` ile günlük
    publish bar chart + iş hacmi line chart canlı. `WEEKLY/DAY_VALS/
    TOP_CONTENT/CHANNELS` hardcode'ları kaldırıldı. "En çok izlenen içerikler"
    tablosu (görüntülenme/CTR sahte verileri) → "Modül performansı" tablosuna
    dönüştürüldü (gerçek `module_distribution` üzerinden).
  - **Tasarım etkisi (kayıt):** Analytics sayfasının "Top content" tablosu
    YouTube engagement gerektirdiği için kaldırıldı. İleride channel-overview
    endpoint'leri kullanılarak gerçek view/like/CTR verisi gelirse benzer
    tablo geri eklenebilir.

### Backend tarafında ileride istenecek endpoint'ler (eksik kabiliyetler)
Aşağıdakiler dashboard/analytics'i tam-fidelity yapmak için gerekebilir:
- `/system/metrics` — disk/CPU/memory/SSE listener count/render worker count
- `/tts/status` — provider, kuyruk, ortalama latency
- `/channels/{id}/top-content` — view/like/CTR sıralı içerik listesi
  (şu an `useYoutubeAnalytics` var ama channel bazlı, dashboard agregesi yok)

### 2026-04-19 (devam) — Wizard + Prompts + Tokens
- **Modül palet tokenları**: `tokens.css`'e `--module-news-bulletin`,
  `--module-product-review`, `--module-standard-video`, `--module-educational`,
  `--module-howto`, `--module-default` eklendi (hem aurora-dusk hem
  obsidian-slate variantlarına). `moduleColor()` artık var(--module-*) döndürür
  → yeni Aurora teması üretildiğinde sadece bu tokenlar override edilir.
- **AuroraWizardPage**:
  - `CHANNELS = ["@ekonomi_gundem", ...]` hardcode kaldırıldı; artık
    `useMyChannelProfiles()` ile gerçek kullanıcı kanal profilleri geliyor.
    Profil yoksa "Henüz kanal profili yok" mesajı + select disable.
  - `launch()` artık form verisini `navigate(route, { state: { aurora_prep }})`
    ile modül sayfasına aktarıyor (önceden state taşımadan yönlendiriyordu).
  - `reset()` artık `window.confirm` ile onay istiyor (boş form değilse).
  - VOICES/DURATIONS sabit listeler kasıtlı tutuldu — Aurora wizard "ön-prep"
    olduğu için modül sayfası kendi otoritesini uygular (kayıt: docstring).
- **AuroraPromptsPage**: "Sıfırla" butonu artık kaydedilmemiş değişiklikleri
  silmeden önce `window.confirm` ile onay istiyor.
- **AuroraSettingsPage**, **AuroraThemesPage**: Denetim sonucu temiz —
  yıkıcı işlem yok, hardcoded fake veri yok, hepsi backend/store'a bağlı.

### Modül sayfası tarafında bekleyen entegrasyon
Aurora wizard `aurora_prep` state ile modül sayfasına yönleniyor, ancak modül
sayfaları (`AdminNewsBulletinWizardPage`, `AdminStandardVideoWizardPage`)
bu state'i okumuyor. **TODO (P1):** Modül wizard sayfalarında
`useLocation().state?.aurora_prep` ile form prefill ekle.

### Performans denetimi (refetch interval'lar)
Mevcut polling cadence'leri:
- `useNotifications`: 30s (count) / 15s (list)
- `useFullAuto`: 30s
- `usePublish`: 30s
- `useDashboardSummary`: 60s
- `useSystemHealth`: 30s (yeni)

CLAUDE.md kuralı: "SSE zaten kapsıyorsa polling kullanma". Bu hook'ların
büyük kısmı SSE invalidasyonu ile pekala değiştirilebilir; ancak şu an SSE
event tipleri tüm domain'leri kapsamadığı için polling güvenli fallback.
**Not:** SSE event tipleri genişletildiğinde bu polling'ler kaldırılabilir.
Tüm interval'lar ≥15s — UI yükü minimal, kabul edilebilir.
