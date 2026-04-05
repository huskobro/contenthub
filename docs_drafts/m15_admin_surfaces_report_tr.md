# M15 — Admin Yuzeyleri Raporu

## Ozet

M15 kapsaminda iki yeni admin yuzeyi olusturulmus/genisletilmistir:
1. **Audit Log sayfasi** — yeni, tam fonksiyonel
2. **Provider Trace gorunumu** — Job Detail sayfasinda gercek trace gosterimi

## 1. Audit Log Sayfasi

### Dosya: `frontend/src/pages/admin/AuditLogPage.tsx`

#### Ozellikler
- **Filtreler**: Aksiyon (text input, serbest arama), Varlik tipi (dropdown secimi)
- **Tablo**: Zaman, Aksiyon, Varlik Tipi, Varlik ID, Aktor kolonlari
- **Sayfalama**: Onceki/Sonraki butonlari, sayfa numarasi ve toplam sayfa gosterimi
- **Detay Paneli**: Secilen kayit icin aksiyon, varlik, aktor, zaman ve JSON detay gosterimi
- **Bos durum**: "Audit log kaydi bulunamadi" mesaji
- **Hata durumu**: API hata mesaji gosterimi
- **Yukleme durumu**: "Yukleniyor..." mesaji

#### Varlik Tipi Etiketleri (Turkce)
- publish_record → Yayin Kaydi
- credential → Kimlik Bilgisi
- setting → Ayar
- visibility_rule → Gorunurluk Kurali
- source → Kaynak
- template → Sablon
- style_blueprint → Stil Sablonu
- youtube_oauth → YouTube OAuth

#### Entegrasyon
- Route: `/admin/audit-logs`
- Sidebar: "Audit Log" linki AdminLayout'a eklendi
- Visibility: `VisibilityGuard targetKey="panel:audit-logs"` ile korunur
- API hook: `useAuditLogs()` ve `useAuditLogDetail()` React Query hook'lari

### API Dosyalari
- `frontend/src/api/auditLogApi.ts` — fetchAuditLogs, fetchAuditLogDetail
- `frontend/src/hooks/useAuditLogs.ts` — React Query wrapper'lari

## 2. Provider Trace Gorunumu

### Dosya: `frontend/src/components/jobs/JobSystemPanels.tsx`

#### Degisiklikler
- Onceki durum: 3 placeholder "deferred" mesaji (Logs, Artifacts, Provider Trace)
- Yeni durum: Gercek veri gosterimi

#### Logs Paneli
- Her step icin `log_text` alanini gosterir
- Monospace pre formati, karanlik tema
- Bos durum: "Henuz log kaydi yok"

#### Artifacts Paneli
- Her step icin `artifact_refs_json` alanini parse edip gosterir
- JSON pretty-print
- Bos durum: "Henuz artifact yok"

#### Provider Trace Paneli
- Her step icin `provider_trace_json` parse edilir
- Kart gorunumu:
  - Step key (monospace)
  - Basari/basarisizlik badge'i (yesil/kirmizi)
  - Provider adi, tur, model
  - Gecikme suresi (saniye cinsinden)
  - Token kullanimi (input/output)
  - Tahmini maliyet (USD)
  - Hata detaylari (basarisiz durumda)
- Bos durum: "Henuz provider trace verisi yok"

### JobDetailPage Degisikligi
- `<JobSystemPanels />` → `<JobSystemPanels steps={job.steps} />`
- Steps prop'u eklenerek gercek veri aktarimi saglandi

## Test Sonuclari

### Frontend
| Test Dosyasi | Test Sayisi | Durum |
|-------------|-------------|-------|
| `audit-log-page.smoke.test.tsx` | 6 | ALL PASSED |
| `job-detail-page.smoke.test.tsx` | 5 | ALL PASSED |

### Tum Frontend
- 161 test dosyasi, 2135 test — TUMU GECTI

## Bilinen Sinirlamalar

- Detay panelinde old/new JSON diff gorunumu yok — tek bir details_json gosteriliyor
- Tarih araligi filtresi audit log sayfasinda yok
- Provider trace gercek verisi yalnizca pipeline calistiginda gorunur (API key gerekli)
