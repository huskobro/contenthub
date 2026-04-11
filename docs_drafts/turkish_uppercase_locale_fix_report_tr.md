# Türkçe Uppercase / Locale Görünüm Düzeltmesi — Raporu

**Tarih:** 2026-04-11
**Branch:** main
**Kapsam:** Mini fix turu. Yeni feature yok, yeni copy yok, layout değişmedi, token/theme rewrite yok, büyük CSS refactor yok, backend değişmedi.

## Sorun — tam olarak neydi?

Round 2 UI polish doğrulaması sırasında Atrium kullanıcı yüzeyinde ve Bridge yönetim paneli'nde, kaynak string'ler doğru Türkçe yazılmış olsa bile, CSS `text-transform: uppercase` uygulanan etiketlerin yanlış büyük harfe dönüştürüldüğü görüldü:

- `VITRIN` (doğrusu `VİTRİN`) — Atrium nav
- `TAKVIM` (doğrusu `TAKVİM`) — Atrium nav
- `ANALIZ` (doğrusu `ANALİZ`) — Atrium nav
- `HABER BÜLTENI` (doğrusu `HABER BÜLTENİ`) — Atrium kicker
- `ÖNCELIK` (doğrusu `ÖNCELİK`) — Atrium hero badge
- `CANLI IŞ` (doğrusu `CANLI İŞ`) — Atrium StatPill
- `ÖN IZLEME` (doğrusu `ÖN İZLEME`) — Atrium lineup kartı
- `YAYIN KIMLIKLERI` (doğrusu `YAYIN KİMLİKLERİ`) — Atrium side panel
- `STÜDYO ÖZETI` (doğrusu `STÜDYO ÖZETİ`) — Atrium side panel
- `SISTEM` (doğrusu `SİSTEM`) — Bridge context rail header
- `INCELEME` (doğrusu `İNCELEME`) — Bridge job bucket
- `ID` (doğrusu `İD`) — Bridge jobs tablosu kolon başlığı

### Kök neden

Tarayıcılar CSS `text-transform: uppercase` uygularken, büyük harf dönüşüm kurallarını HTML dokümanının `lang` attribute'undan okur:

- `<html lang="en">` altında Türkçe `i` → `I` (yanlış — Türkçe'de `i`'nin büyük hali `İ` olmalıdır)
- `<html lang="tr">` altında Türkçe `i` → `İ` (doğru)

Projede `frontend/index.html` HTML element'i `lang="en"` olarak gelmiş, dolayısıyla tüm CSS uppercase dönüşümleri varsayılan (İngilizce) Unicode kurallarını kullanıyordu.

Aynı sorun JavaScript `.toUpperCase()` çağrılarında da var: bu yöntem locale-agnostic çalışır ve `i` → `I` yapar. Doğru yöntem `.toLocaleUpperCase("tr-TR")`'dir.

## Nasıl çözüldü?

İki katmanlı minimal müdahale:

### 1. Global düzeltme: HTML lang

`frontend/index.html`:
```diff
- <html lang="en">
+ <html lang="tr">
```

Bu tek satırlık değişiklik, projede CSS `text-transform: uppercase` kullanan **tüm 158+ yerdeki** Türkçe metin için doğru büyük harf dönüşümünü tetikler. Tailwind `uppercase` utility sınıfı dahil tüm CSS-bazlı dönüşümler tek tek dokunmadan düzelir.

### 2. Regresyon izolasyonu: hedefli `lang="en"`

Global `lang="tr"` yapınca yeni bir risk doğuyor: uppercase class ile gösterilen **İngilizce backend değerleri** (`job.status`, `channel_slug`, `module_type`, `default_language` vb.) da Türkçe locale kuralıyla dönüşmeye başlıyor. Örneğin `failed` → `FAİLED`, `running` → `RUNNİNG`, `live` → `LİVE` — bu bir regresyon olurdu.

Çözüm: uppercase ile İngilizce dinamik değer gösteren noktalara hedefli `lang="en"` attribute'u eklendi. Bu, CSS uppercase'in o elementte İngilizce kuralıyla çalışmasını sağlar.

**İzole edilen 7 yer:**

| Dosya | Satır | Element | İçerik |
|---|---|---|---|
| `components/jobs/JobTimelinePanel.tsx` | 51 | status chip `<span>` | `{step.status}` — `queued`, `running`, `completed`, `failed` |
| `surfaces/bridge/BridgeJobDetailPage.tsx` | 179 | job status chip `<span>` | `{job.status}` (ham İngilizce) |
| `surfaces/bridge/BridgeJobDetailPage.tsx` | 186 | module_type `<span>` | `{job.module_type}` — `news_bulletin` vb. |
| `surfaces/bridge/BridgeJobDetailPage.tsx` | 304 | publish status chip `<span>` | `{publish.status}` |
| `surfaces/canvas/CanvasChannelDetailPage.tsx` | 249 | channel slug `<p>` | `@{channel.channel_slug}` |
| `surfaces/canvas/CanvasChannelDetailPage.tsx` | 659 | module_type `<span>` | `{p.module_type}` |
| `surfaces/canvas/CanvasMyChannelsPage.tsx` | 303 | channel slug `<p>` | `{ch.channel_slug}` |
| `components/wizard/ChannelProfileStep.tsx` | 207 | language code `<span>` | `{profile.default_language}` — `tr`/`en`/`de` vb. |

**Priority değerleri için ayrı inline izolasyon** (4 dosya): `"öncelik: {priority}"` pattern'i karma yapıdaydı — Türkçe label + İngilizce değer aynı uppercase span'da. Burada sadece değer kısmına nested `<span lang="en">` eklendi:

```tsx
<span className="... uppercase ...">
  öncelik: <span lang="en">{project.priority}</span>
</span>
```

- `surfaces/atrium/AtriumUserDashboardPage.tsx`
- `surfaces/atrium/AtriumProjectsListPage.tsx`
- `surfaces/atrium/AtriumProjectDetailPage.tsx`
- `surfaces/canvas/CanvasProjectDetailPage.tsx`

### 3. JS `.toUpperCase()` düzeltmesi

`surfaces/bridge/BridgeAdminLayout.tsx:416` breadcrumb'da `.toUpperCase()` çağrısı vardı. Locale-aware versiyonla değiştirildi:

```diff
- BRIDGE · {activeSlot.label.toUpperCase()}
+ BRIDGE · {activeSlot.label.toLocaleUpperCase("tr-TR")}
```

(Bu etiket zaten CSS `uppercase` class ile de sarmalanmış durumda — iki kat dönüşüm zararsız, sadece ekstra güvence.)

### 4. Round 2 kaçağı: `⚡ live job`

`surfaces/atrium/AtriumProjectDetailPage.tsx:332` Round 2'de atlanmış küçük bir İngilizce metin vardı:

```diff
- ⚡ live job
+ ⚡ canlı iş
```

Bu hem copy tutarlılığı hem de regresyon önlemi — `live` kelimesi `i` içerdiği için Türkçe locale'de "LİVE JOB" olurdu.

## Hangi yüzeylerde doğrulandı?

Canlı browser smoke testi — Vite dev server + preview MCP accessibility snapshot ile.

### Atrium — user surface (`/user`)

**Top nav strip — `data-testid="atrium-topnav"`:**

| Kaynak | Doğrulanan render |
|---|---|
| `Vitrin` | `VİTRİN` ✅ |
| `Projeler` | `PROJELER` ✅ |
| `Takvim` | `TAKVİM` ✅ |
| `Dağıtım` | `DAĞITIM` ✅ |
| `Kanallar` | `KANALLAR` ✅ |
| `Analiz` | `ANALİZ` ✅ |
| `Ayarlar` | `AYARLAR` ✅ |

**Brand rail:** `Atrium` → `ATRİUM` ✅

**Hero + headline block:**

- `Bu Hafta Ön Planda` → `BU HAFTA ÖN PLANDA` ✅
- `Öne Çıkan Yapım` → `ÖNE ÇIKAN YAPIM` ✅
- `Haber Bülteni` → `HABER BÜLTENİ` ✅ (önce `HABER BÜLTENI`)
- `öncelik:` → `ÖNCELİK:` ✅ (önce `ÖNCELIK:`)
- `{priority}` → `NORMAL` ✅ (İngilizce değer, `lang="en"` izolasyonu; `i` yok yine de doğru)
- `canlı iş` → `CANLI İŞ` ✅ (önce `CANLI IŞ`)

**Side stats panel:**

- `Stüdyo Özeti` → `STÜDYO ÖZETİ` ✅
- `Toplam yapım` → `TOPLAM YAPIM` ✅
- `Devam eden` → `DEVAM EDEN` ✅
- `Yayınlanan` → `YAYINLANAN` ✅
- `Canlı iş` → `CANLI İŞ` ✅
- `Yayın Kimlikleri` → `YAYIN KİMLİKLERİ` ✅

**Lineup kartları:**

- `ön izleme · henüz render yok` → `ÖN İZLEME · HENÜZ RENDER YOK` ✅
- `{moduleLabel}` (`Haber Bülteni`) → `HABER BÜLTENİ` ✅

**Editorial section header'ları:** `YAPIM PLANI`, `ÜRETİMDE`, `DİKKAT` — zaten kaynakta büyük harf yazıldığı için CSS uppercase no-op; doğrulandı ✅

**Bottom pill grid:** `YAPIM / DEVAM / YAYINLANAN / CANLI İŞ / KANAL` ✅

### Bridge — admin surface (`/admin`, `/admin/jobs`)

**Operasyon rayı:** `Operasyonlar / Yayın / İçerik / Haber / İçgörü / Sistem` ✅ (normal case, uppercase yok → dokunulmadı)

**Context panel header:** `SISTEM` → `SİSTEM` ✅

**Breadcrumb:** `BRIDGE · OPERASYONLAR` ✅ — `.toLocaleUpperCase("tr-TR")` doğru çalıştı

**Jobs Registry (`/admin/jobs`):**

- Status bucket'ları: `KUYRUK / ÇALIŞIYOR / İNCELEME / TAMAMLANDI / HATA` ✅ — "İNCELEME" doğru Türkçe büyük harfle görünüyor (`i` → `İ`)
- Kolon başlıkları: `DURUM / MODÜL / YAŞ / ADIM / HATA / İD` ✅ — "İD" doğru
- Job satırları: `TAMAMLANDI`, `HATA` ✅ — `localizeStatus` + Türkçe uppercase birlikte çalışıyor

**Admin Overview (`/admin`):** Section başlıkları ve KPI'ler zaten Round 2'de doğru kaynak metinleriyle yazılmıştı; lang fix sonrası CSS uppercase uygulanan alanların hepsi doğrulandı ✅

### İngilizce regresyon kontrolü

Uppercase + İngilizce değer içeren yerlerin `lang="en"` izolasyonu sonrası hala doğru görünmesi:

- `news_bulletin` — zaten uppercase class'sız yerlerde küçük harfte ✅
- `draft` / `unpublished` — StatusBadge uppercase uygulamıyor, görünüm değişmedi ✅
- `Step 'render' failed.` — İngilizce hata mesajı uppercase değil, görünüm değişmedi ✅

## Test sonuçları

### Code Quality Gate

- **TypeScript:** `npx tsc --noEmit` → **EXIT 0**, sıfır hata
- **Vite production build:** `npx vite build` → **EXIT 0**, `✓ built in 3.03s`, sıfır hata
  - Pre-existing chunk size uyarısı devam ediyor (bu fix ile ilgisiz)
- **Console runtime:** Browser smoke sırasında sıfır error / sıfır warning

### Behavior Gate

- Hiçbir `data-testid` dokunulmadı → tüm mevcut testler aynı selector'ları bulur
- Hiçbir React Query key değişmedi → cache invalidasyon aynı
- Hiçbir hook sırası değişmedi → Rules of Hooks korundu
- Hiçbir route / component prop imzası değişmedi
- Backend state makinesi / status anahtarları / visibility rules dokunulmadı

### Product Gate

- Türkçe metinler artık görsel olarak doğru (İ/ı ayrımı saygı görüyor)
- İngilizce backend değerleri hala İngilizce kurallarıyla gösteriliyor (regresyon yok)
- Tasarım, spacing, renk, typography — hiçbiri değişmedi

### Stability Gate

- Vite HMR sırasında sorunsuz
- Tam sayfa reload sonrası kalıcı (HTML attribute)
- Restart path etkilenmedi

## Dokunulan dosyalar

1. `frontend/index.html` — `lang="en"` → `lang="tr"` (ana fix)
2. `frontend/src/components/jobs/JobTimelinePanel.tsx` — `lang="en"` izolasyonu (status chip)
3. `frontend/src/components/wizard/ChannelProfileStep.tsx` — `lang="en"` izolasyonu (language code)
4. `frontend/src/surfaces/bridge/BridgeJobDetailPage.tsx` — `lang="en"` izolasyonu (job.status, publish.status, module_type)
5. `frontend/src/surfaces/bridge/BridgeAdminLayout.tsx` — `.toLocaleUpperCase("tr-TR")` düzeltmesi
6. `frontend/src/surfaces/canvas/CanvasChannelDetailPage.tsx` — `lang="en"` izolasyonu (channel_slug, module_type)
7. `frontend/src/surfaces/canvas/CanvasMyChannelsPage.tsx` — `lang="en"` izolasyonu (channel_slug)
8. `frontend/src/surfaces/atrium/AtriumUserDashboardPage.tsx` — priority değeri için nested `lang="en"`
9. `frontend/src/surfaces/atrium/AtriumProjectsListPage.tsx` — priority değeri için nested `lang="en"`
10. `frontend/src/surfaces/atrium/AtriumProjectDetailPage.tsx` — priority için nested `lang="en"` + `live job` → `canlı iş`
11. `frontend/src/surfaces/canvas/CanvasProjectDetailPage.tsx` — priority değeri için nested `lang="en"`

**Toplam:** 11 dosya, minimal satır değişikliği (ana fix tek satır, geri kalanı hedefli attribute eklemesi).

## Bu fix'in DEĞİŞTİRMEDİĞİ şeyler

- Herhangi bir tasarım token'ı
- Tailwind config
- Theme registry (`[data-theme=...]` koşullu uppercase'ler dokunulmadı — zaten tema bazlı)
- CSS dosyası (`index.css`)
- `text-transform: uppercase` kullanımlarının hiçbiri kaldırılmadı
- Hiçbir yeni utility, hiçbir yeni helper, hiçbir yeni hook
- Hiçbir yeni state, hiçbir yeni prop
- Backend schema / API contract / response shape

## Commit + push

- Commit hash: `e5e75bc`
- Push status: ✅ `git push origin main` başarılı → `abfff86..e5e75bc  main -> main`
