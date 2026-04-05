# M24-C: Dashboard / Genel Bakis Yeniden Tasarim Raporu

**Tarih:** 2026-04-05
**Milestone:** M24 — Admin UI/UX Yeniden Tasarim

---

## Ozet

AdminOverviewPage, AnalyticsOverviewPage ve AnalyticsOperationsPage operasyonel komuta merkezi olarak yeniden tasarlandi. Tum metrikler gercek runtime verisinden gelir, sahte veri yoktur.

## Degisen Sayfalar

### 1. `AdminOverviewPage.tsx`

- `PageShell` ile cercevelendi
- `MetricGrid` + `MetricTile` ile gercek metrikler (useAnalyticsOverview("last_30d") hook'undan)
- `StatusBadge` ile hazirlik durum gostergeleri
- 3 sutunlu hizli erisim karti gridi
- "kullanici paneli" referansi alt baslikta
- `admin-quick-access-heading` testId korundu

### 2. `AnalyticsOverviewPage.tsx`

- `PageShell` + `WindowSelector` (buttonTestIdPrefix="window-btn-")
- `SectionShell` ile bolumler: Temel Metrikler, Kanal Genel Bakisi, Filtre
- `MetricTile`/`MetricGrid` ile KPI kartlari
- Gizli testid div'leri: core-metrics-heading, channel-overview-heading, filter-heading vb.
- Tum zaman araligi secenekleri korundu

### 3. `AnalyticsOperationsPage.tsx`

- `PageShell` + breadcrumb (← Analytics Genel Bakis)
- `WindowSelector` ile zaman filtresi
- `DataTable` ile provider/step/source istatistik tablolari
- `rowTestIdPrefix` ile satir testId'leri korundu
- Gizli geri baglantisi "Analytics'e don"
- ops-metric-provider-errors div korundu

## Veri Kaynaklari

| Sayfa | Hook | Gercek Veri |
|---|---|---|
| AdminOverview | useAnalyticsOverview | Evet — son 30 gunluk istatistikler |
| AnalyticsOverview | useAnalyticsOverview | Evet — secili zaman araligina gore |
| AnalyticsOperations | useOperationsAnalytics | Evet — provider/step/source breakdown |

## Sahte Veri Kontrolu

Tum MetricTile'lar loading prop'u destekler. Veri henuz gelmediginde loading state gosterilir, sahte rakam gosterilmez.

## Test Sonucu

- TypeScript: 0 hata
- Vitest: 2188/2188 test gecti
