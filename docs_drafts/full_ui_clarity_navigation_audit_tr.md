# ContentHub — Tam Kapsamlı UI / Navigation / Menu / Ayar / Akış Auditi

**Tarih:** 2026-04-10
**Yapan:** Claude (direct browser tour — dokuman okumadan, gerçek gezinme ile)
**Araçlar:** Claude Preview MCP (frontend Vite, port 5173) + canlı admin oturumu
**Viewport:** 1440x900
**Giriş:** admin@contenthub.local
**Kapsam:** Admin paneli (Bridge + Horizon + Legacy surfaces), User paneli (Canvas + Atrium surfaces), panel geçişleri, sistem ayarları, tüm menü kalemleri, tema/surface picker, önemli aksiyonlar.

Bu rapor hiçbir önceki rapor veya dokümana başvurmadı. Bulgular yalnızca canlı sistemde manuel gezinme sonucu çıkarıldı.

---

## 0. Sistem Netliği (Verdict)

ContentHub **güçlü bir iskelet üzerinde, tamamlanmamış bir ürün**. Operasyonel altyapı (job engine, audit log, provider management, settings registry, surface system) üst seviyede olgun; ancak kullanıcı tarafı (wizard akışı, proje detayı, yayın akışı) ve bazı yönetim sayfaları tamamlanmamış veya test fixture’larıyla kirlenmiş durumda.

**Tek cümle özet:** Admin bir operatör için neredeyse production-ready; fakat son kullanıcı deneyimi (Canvas üstünde) ve birkaç kritik kırık (BridgeJobDetailPage hook order, Visibility page test fixture kirliliği, Settings/Providers credential tutarsızlığı, panel switch route mismatch) düzeltilmeden MVP'ye çıkılamaz.

---

## 1. Methodoloji ve Kapsam

### Gezilen rotalar

**Admin (Bridge surface):**
- `/admin` (Yönetim Paneli, KPI + grafikler)
- `/admin/jobs` (Jobs Registry drawer)
- `/admin/jobs/{id}` (full page — KIRIK, aşağıda)
- `/admin/publish` (Publish Review Board)
- `/admin/settings` (3 tab: Kimlik Bilgileri, Effective Ayarlar, Ayar Kayıtları)
- `/admin/visibility` (Görünürlük Kuralları)
- `/admin/wizard-settings` (Wizard Ayarları)
- `/admin/audit-logs` (Audit Log)
- `/admin/modules` (Modül Yönetimi)
- `/admin/providers` (Provider Yönetimi)
- `/admin/prompts` (Prompt Editörü)
- `/admin/users` (Kullanıcılar)
- `/admin/themes` (Tema Yönetimi = Surface + Theme picker karışık)
- `/admin/library` (İçerik Kütüphanesi — CT rail)
- `/admin/sources` (Sources Registry — NW rail)
- 404'e düşen rotalar: `/admin/audit`, `/admin/audit-log` (singular form), `/admin/jobs/{id}` (hook crash)

**Admin (Horizon surface — aktif edildi):**
- Aynı rotalar Horizon layout üzerinde test edildi.

**User (Canvas surface — default):**
- `/user` (Canvas Workspace anasayfa)
- `/user/projects` (Projelerim grid)
- `/user/projects/{id}` (Proje detay)
- `/user/calendar` (Çalışma Takvimi)
- `/user/create/video` (Standart Video wizard)
- `/user/create/bulletin` (Haber Bülteni wizard)
- `/user/channels` (Kanal Studyom)
- `/user/publish` (Yayın Atolyesi)
- `/user/analytics` (Performans Studyom)
- `/user/settings` (Ayarlarım — user-scope surface picker)

**User (Atrium surface — aktif edildi):**
- `/user` (Atrium Showcase)

### Test edilen akışlar

- Admin login → redirect davranışı
- Panel switching: Bridge → Canvas, Canvas → Bridge, Atrium → Bridge, Bridge → Atrium (sessiz surface reset kontrolü)
- Surface activation: Bridge → Horizon → Bridge (admin), Canvas → Atrium → Canvas (user)
- "Varsayılana dön" flow
- Sidebar link discovery (href listesi ile)
- Console error collection (`preview_console_logs level=error`)
- Table filter / sort / kolon yapılarının kontrolü
- Empty state kontrolü (jobs, calendar, publish, analytics)
- Wizard step pill okunabilirliği
- Scroll pozisyonu davranışı

---

## 2. Bulgular (53 ham bulgu, sınıflandırılmış)

Her bulgu dört sınıftan biriyle etiketlenmiştir:
- **✅ net ve başarılı**
- **⚠️ çalışıyor ama kafa karıştırıyor**
- **🎨 çalışıyor ama polish eksik**
- **🔴 eksik / kırık / yanıltıcı**

Ve her bulguya bir öncelik atanmıştır: kritik / yüksek / orta / düşük.

---

### 🔴 KRİTİK — eksik / kırık / yanıltıcı

#### F1. Admin login → `/user` redirect (kritik)
Admin kullanıcı başarılı login sonrası `/user` rotasına düşüyor, `/admin`'e değil. AppEntryGate rol-aware default yapmıyor. Admin URL'yi elle `/admin` yapmak zorunda. İlk deneyim bozuk.

**Yer:** `AppEntryGate` veya `AuthGuard` default redirect logic.
**Öneri:** Role admin ise `/admin`, role user ise `/user`'a yönlendir.

#### F2. `/admin/jobs/{id}` full page — BridgeJobDetailPage hook order crash (kritik)
Full-page admin job detail rotası tamamen bozuk. `BridgeJobDetailPage.tsx:132` satırında koşullu `useMemo` çağrısı var — React Rules of Hooks ihlali. Sayfa her açıldığında `"Rendered more hooks than during the previous render"` error ile error boundary'e düşüyor.

Console'dan aynen:
```
Rendered more hooks than during the previous render.
  at updateWorkInProgressHook ...
  at updateMemo ...
  at useMemo ...
  at BridgeJobDetailPage (BridgeJobDetailPage.tsx:132:23)
```

Hook count: previous render 56 hook, next render 57'nci hook bir `useMemo` — demek ki 57'nci hook koşullu return'un *sonrasında* çağrılıyor.

**Etki:** Drawer detail çalışıyor, ama drawer'daki "Tam Sayfa" linki hep crash. Admin production kullanımı için kritik kırık. Job Detail page CLAUDE.md'de "core operational page" olarak listelenmiş.

**Öneri:** Line 132 civarındaki `useMemo`'yu koşulsuz hale getir. Erken return varsa hook'tan sonraya taşı.

#### F9. Visibility Engine — zero real rules, test fixture kirliliği (kritik)
`/admin/visibility` gözlerimizin önünde 137+ satır test fixture gösteriyor:
- "Aktif" filtresi: 12 satır, hepsi `test:m23-history-*` ve `test:m23-restore-*`
- "Pasif" filtresi: 125 satır, hepsi `test:m22-resolve-delete` ve `test:m22-bulk-1`
- Modül: — Rol: — Durum: inactive

Yani Visibility Engine — CLAUDE.md'de "core subsystem" olarak listelenmiş — production DB'de **tek bir gerçek kural bile içermiyor**. Sadece M22/M23 testlerinden kalan fixture'lar var.

**Öneri:**
1. Acil bir temizleme migration'ı (test fixture'ları sil veya `is_test_data` filter uygula).
2. Sonra Visibility Engine'in ne koruduğuna dair 5-10 baseline kural yaz (kimlik bilgisi sekmeleri, wizard step visibility, vb.).

#### F11. `/admin/audit` ve `/admin/audit-log` → unthemed 404 (kritik)
Canonical rota `/admin/audit-logs` (plural) ama kullanıcı doğal olarak `/admin/audit` veya `/admin/audit-log` yazdığında:
1. 404 sayfası açılıyor
2. 404 sayfası **beyaz zemin, siyah yazı** — Bridge surface tema tokenlarını miras almıyor, tamamen unthemed.
3. Kullanıcı birdenbire tema tutarsız bir sayfa görüyor

**Öneri:**
1. Route aliases ekle (`/admin/audit` → `/admin/audit-logs`)
2. 404 sayfası ThemeProvider altına gir; Bridge/Horizon/Canvas her surface'de tema aware olmalı

#### F21. `/admin/themes` — Surface vs Theme concept collision (kritik)
`/admin/themes` sayfası İKİ bağımsız kavramı aynı sayfada karıştırıyor:
1. **Arayüz Yüzeyi (Surface)** — Legacy/Horizon/Bridge = layout shell
2. **Tema (Theme)** — Obsidian Slate / Void Terminal / Horizon Midnight = color palette

Her ikisi de aynı "Tema Yönetimi" başlığı altında, arka arkaya listeleniyor. Sayfanın üstünde "Bridge aktif" diyor, ortasında "Aktif Tema: Horizon Midnight" diyor. Kullanıcı bu iki cümleyi birbiriyle bağdaştıramıyor çünkü ikisi **farklı şeyler**.

**Öneri:**
1. İki ayrı ayar altsayfası: `/admin/surfaces` (yüzey seçici) + `/admin/themes` (renk paleti yöneticisi)
2. Sayfa başlıklarını net yap: "Arayüz Yüzeyleri" vs "Renk Teması"
3. `/admin/themes` içinde çift başlık yerine bir yönlendirme: "Surface'i değiştirmek istiyorsan Yüzey Ayarları'na git"

#### F49. Panel switch → sessiz surface reset (kritik)
Atrium (user)'dayken "Yönetim Paneli"ne tıkladığımda admin panel açıldı ama surface Bridge'e düştü. Çünkü Atrium user-scope, admin panel bunu gösteremiyor. **Beklenen sistem davranışı** — ama kullanıcı tarafından hiçbir bilgilendirme yok. Birden farklı bir UI'a düşüyor.

**Öneri:** Panel geçişinde toast veya inline banner: "Yönetim panelinde Atrium kullanılamadığı için Bridge'e geçildi."

#### F35. `/user/create/video` ilk yüklemede scroll pozisyonu kirli (orta, eskiden kritik)
İlk ziyarette wizard sanki boş bir sayfa gibi göründü. Aslında içerik vardı; scroll pozisyonu önceki sayfadan miras kalmıştı. React Router route change'inde otomatik scroll-to-top yapılmıyor.

**Etki:** Kullanıcı "bu sayfa boş" diye geri dönüyor.
**Öneri:** Global route change listener → `window.scrollTo(0, 0)`.

#### F45. User settings → Execution group leak (yüksek → kritik tartışmalı)
`/user/settings` (Ayarlarım) sayfasında **Execution** başlığı altında sunucu-tarafı path ayarları görünüyor:
- Çıktı Klasörü (Workspace) — `backend/workspace/` path
- Çıktı Dizini (Exports) — `workspace/users/{slug}/exports/` path

CLAUDE.md kuralı: *"User panel must stay simple. Do not expose unnecessary technical detail by default."*

Bu ayarlar hiçbir kullanıcının görmemesi gereken admin-only sistem yolları.

**Öneri:** Execution group'u user settings'ten gizle; sadece admin Effective Ayarlar'da göster.

---

### ⚠️ YÜKSEK — çalışıyor ama kafa karıştırıyor

#### F15. Settings tab vs Providers credential tutarsızlığı (yüksek)
Aynı credential iki sayfada çelişik durumda:
- `/admin/settings` (Kimlik Bilgileri tab): Pexels API Key "Yapılandırıldı ✅ kaynak: DB"
- `/admin/providers`: Pexels "PEXELS_API_KEY — eksik" (kırmızı)

Admin hangisine inanacak? Data source mismatch; muhtemelen biri `os.environ`, diğeri DB okuyor ve aralarında senkron yok.

**Öneri:** Tek bir credential validator servisi → hem Settings hem Providers aynı cevabı alsın.

#### F10. Wizard Ayarları — invisible toggle buttons (yüksek)
`/admin/wizard-settings` altında "Standart Video" ve "Haber Bülteni" için Wizard/Form mode toggle butonları **neredeyse görünmez** — beyaz zemin üzerinde beyaz yazı. Hover etmeden ne olduklarını okuyamıyorsun. WCAG contrast fail.

Kullanıcı memory'deki tekrar eden feedback: "design token kuralları — text-neutral-100/200 ana içeride KULLANMA". Bu bulgu o kuralın doğrulaması.

**Öneri:** Button text color `--color-text-primary` token'ı olmalı, `--color-neutral-50` değil.

#### F29. Horizon shell icon-only rail (orta, eski yüksek)
Horizon surface aktifleştiğinde sol rail'de hiçbir görünür label yok — sadece ikonlar. Accessibility tree'de button name'ler var (screen reader uyumlu), ama görsel keşif zayıf. Bridge'deki "OP/PB/CT/NW/IN/SY" üç-harf kodları bile daha net.

**Öneri:** Hover üzerinde tooltip bubble veya rail genişleyince label göster.

---

### 🎨 ORTA/DÜŞÜK — polish eksik

#### F17. Prompt Editörü — "Prompt tipi ayar bulunamadı" + hemen 7 prompt listesi (orta)
Üstte "Prompt tipi ayar bulunamadı" empty state diyor, hemen altında Prompt Bloklari başlığı ve 7 core_system prompt listeleniyor. Header ve content birbiriyle tutarsız.

**Öneri:** Empty state koşulunu düzelt — prompt listesi boş olduğunda göster, boş değilse gizle.

#### F22. Aktif surface kartında "Aktif Et" butonu hâlâ görünüyor (orta)
Bridge zaten aktif olduğu halde `/admin/themes` içinde Bridge kartında "Aktif Et" butonu görünmeye devam ediyor. Horizon Midnight theme kartı ise aktifken butonu doğru şekilde gizliyor.

**Öneri:** `entry.isAlreadyActive && !isSelectable` durumunda activate button tamamen hide olmalı.

#### F5. Jobs page responsive kırılma (orta)
1440x900'ün altındaki viewport'larda Bridge jobs page sıkışıyor — "ISLER (32)" header, keyboard shortcut hint "↑↓ gezin · Enter kokpit" gibi metinler kesikli/üst üste biniyor.

#### F27. Rail ambiguity — OP / IN / SY hangisi nerede gider? (orta)
Bridge rail tooltipsiz; OP = Operasyon (jobs) mı, IN = Insights = dashboard mı, SY = System (settings) mi? Yeni admin rail'e bakınca ezberlemek zorunda. Tooltip eksik.

**Öneri:** Rail buton'larına `title` attribute ekle, hover'da full name göster.

#### F32. User sidebar — gereksiz "CANVAS" tag (orta)
User panelin sol sidebar'ında her link'in yanında küçük "CANVAS" rozeti var. Bu surface manifest id. Kullanıcı yüzey kavramını bilmez; bu tag debug bilgisi gibi duruyor.

**Öneri:** Sadece dev/debug mode'da göster. Production'da gizle.

#### F36. Wizard step pill okunabilirliği (orta)
6-adım video wizard pill progress'i: 1 aktif (koyu sarı + beyaz yazı, okunaklı), 2-6 pasif (çok soluk gri). İlerledikçe geride kalan step label'larını okumak zor.

**Öneri:** Pasif step label'larına biraz daha kontrast ver.

#### F33. Proje detayı sparse (orta)
`/user/projects/{id}`: Sadece başlık + 2 status chip + 4 satır metadata + "pending render" placeholder. Admin jobs drawer'ında 10x fazla bilgi var (adım timeline, logs, artifacts, provider trace, retry history). User proje detayı bu bilgilerin hiçbirini göstermiyor — kullanıcı bir sonraki aksiyonu göremiyor.

**Öneri:** En azından step list + son render artifact preview + "yayınla" action ekle.

#### F48. Panel switch button copy tutarsız (orta)
- Bridge rail → "USR" (3 harf kod)
- Horizon rail → "Kullanıcı Paneli"
- Canvas header → "Yönetim Paneline Geç"
- Atrium header → "Yönetim Paneli"

Aynı eylem 4 farklı kelimeyle. Birleştirilmeli.

#### F41. Empty KPI'larda açıklama yok (düşük)
`/user/analytics`'de "Yayın Başarı: —" ve "Ort. Üretim: —". Altında "henüz yayınınız yok" gibi bir açıklama yok. Kullanıcı "neden boş?" sorusuna yanıt alamıyor.

#### F52. Atrium showcase low density (düşük)
Atrium surface, 2 projesi olan kullanıcıda neredeyse boş görünüyor. %70 negatif alan. İçerik 10+ projeye sahip kullanıcılar için tasarlanmış.

#### F44. Canvas aktifken "Aktif Et" butonu görünüyor (düşük)
F22 ile paralel — user settings altında Canvas kartında aktifken redundant "Aktif Et" butonu var.

#### F34. Calendar empty grid readable (düşük)
Empty calendar grid netlikli; bugünün tarihi highlighted; "henüz etkinlik yok" banner'ı eksik (ama kullanıcı boş görünce zaten anlıyor).

#### F30. Horizon rail grouping lost (düşük)
Bridge rail'de OP/PB/CT/NW/IN/SY grupları var; Horizon rail'de bu gruplar ardışık ikonlar halinde listeleniyor — grouping/divider yok.

---

### ✅ NET VE BAŞARILI (26+ bulgu — ContentHub'ın gerçekten iyi yaptığı şeyler)

- **F3** Jobs drawer (Üretim Kokpiti) — 2-pane split, keyboard shortcuts, COMPLETED/FAILED badges, full action set (İptal, Retry, Klonla, Arşivle, Kokpit), job metadata tam.
- **F4** Bridge admin dashboard KPI cards — 8 KPI (Toplam Proje, Toplam İş, Aktif İş, Yayın Başarı, Ort. Üretim, Retry Oranı, Başarısız İş, Toplam Yayın) + filter bar + 4 grafik.
- **F6** Settings/Credentials UI — masked secrets, source provenance (`kaynak: DB`), timestamps, verify action.
- **F7** Effective Ayarlar — group filter, search, WIRED/DEFAULT badges, Sadece Wired checkbox, "2/2 ayar" count. Settings Registry'nin güçlü görsel temsili.
- **F12** Audit Log — 1215 kayıt, aksiyon filtresi, varlık tipi filter, tarih aralığı, kolon config.
- **F13** Modül Yönetimi — Standart Video + Haber Bülteni, her biri 7-adım pipeline + rule badges (`re_executable`, `artifact_check`, `operator_confirm`, `idempotent`).
- **F14** Provider Yönetimi — LLM/TTS/Görseller grupları, her provider'da Test Et, Primary badge, Çağrı/Hata/Hata%/Son Gecikme metrics, Varsayılan yap.
- **F16** Prompt Editörü — Tümü/News Bulletin/Standart Video filtreleri, CORE group, 7+ prompt with type badge + live preview excerpt.
- **F18** Kullanıcılar page — 5 kolon, Rol badge, Durum, Override count, Ayarlar/Deaktif actions. Kullanıcının "max 6-7 kolon" kuralı ile uyumlu.
- **F19** Tema Yönetimi status panel — 4 satır (Altyapı/Aktif/Neden/Tercihiniz) perfect clarity.
- **F20** Surface card info density — Ne Icin Uygun? bullet list + version + tag set + stability tag + role label.
- **F23** Horizon Midnight theme card — aktifken Aktif Et butonu doğru şekilde gizli, sadece Onizle/Dışarı Aktar.
- **F24** Tema Import — JSON paste + Import Et. Extension point.
- **F25** İçerik Kütüphanesi tablo — 32 kayıt, 6 kolon, Detay + Klonla per-row, filter bar, keyboard hint ("4 gizli, Enter detay panel, Space on izleme").
- **F26** Sources Registry — 4 source (Mynet Teknoloji/Spor/Son Dakika, NTV Gündem), Durum/Tür/Güven filter chips, trust badges, son tarama timestamps.
- **F28** Surface activation live swap — Horizon Aktif Et'e tıklayınca SHELL tamamen canlı değişti (rail, header, breadcrumbs). Sayfa reload yok.
- **F31** Canvas Workspace anasayfa — 5 KPI, Aktif Projelerim + Çalışan İşler grid, + Video/+ Bülten CTA.
- **F37** Haber Bülteni wizard — Video wizard'a yapısal paralel, 4-adım odaklı.
- **F38** Kanal Stüdyom — 3 KPI + tek kanal kartı + Kanal Oluştur CTA, temiz.
- **F39** Yayın Atölyesi — 2-pane split, empty-state guidance'ı iyi yazılmış.
- **F40** Performans Stüdyom — Son 7/30/90 gün + 4 KPI + Üretim Trendi/Modül Dağılımı chart'ları, graceful empty state.
- **F42** User settings — Arayüz Yüzeyleri status panel (Altyapı/Aktif/Neden/Tercihiniz), "Tercihiniz: bridge (resolver tarafından kullanılmıyor)" açıklayıcı fallback mesajı (Faz 4D).
- **F43** Faz 4E scope filtering — User panelden Bridge card gizli, admin panelden Canvas/Atrium gizli. Doğru çalışıyor.
- **F46** Atrium surface activation — SHELL tamamen farklı (top nav, no side rail, editorial header "Premium Media OS / STUDIO"), premium/editorial identity net.
- **F50** Surface preserved across panel switch — user tercihi Atrium olunca admin→user geçişinde Atrium korundu.
- **F51** Atrium editorial copy — "Headline Yapim / Lineup / In Production / Attention" magazine editor-in-chief metafor.
- **F53** "Varsayılana dön" feedback — "Tercihiniz temizlendi. Bu panel artık varsayılanla 'Canvas' yüzeyini gösteriyor." — positive, human-readable.

---

## 3. Konsol Hata Analizi

`preview_console_logs level=error` sonucu: tek bir kırık component, defalarca re-raise olmuş.

**Tek kaynak:** `BridgeJobDetailPage.tsx:132` — `useMemo` koşullu çağrılıyor (F2).

Başka distinctive hata **bulunmadı**. Network request'ler normal; 404'lar bile error olarak console'a yansımıyor (SPA router intercept). Tour süresince hiçbir `useSSE` veya React Query hata log'u yok.

---

## 4. Default Surface Strategy Assessment

Sistem üç admin surface ve üç user surface sunuyor:

| Scope | Surfaces | Default | Durum |
|---|---|---|---|
| Admin | Legacy, Horizon, Bridge | Bridge | ✅ Sensible — Bridge operasyon-ilk |
| User | Legacy, Horizon, Atrium, Canvas | Canvas | ✅ Sensible — Canvas creator workspace |

**Değerlendirme:**

- Bridge = ops kokpiti, data-dense, keyboard-first, doğru default admin için.
- Canvas = creator workspace, proje merkezli, doğru default user için.
- Atrium = editorial showcase, "premium Media OS" identity — çok güçlü ama **veri seyrekliğinde boş hissediyor**. 10+ proje olmadan önerme.
- Horizon = "calm alternative" — hem admin hem user için kullanılabilir; ama rail icon-only, scan etmesi zor.
- Legacy = acil fallback, test amaçlı.

**Öneri:**
1. Default stratejisi doğru.
2. Atrium için "minimum proje sayısı" eşiği eklenebilir — 5'in altında ise Canvas'a fallback + banner "Atrium'u görmek için daha fazla proje oluştur".
3. Horizon'da label tooltips şart — yoksa insanlar onu hiç seçmez.

---

## 5. Top 10 Confusing Things (En Kafa Karıştırıcı)

1. **`/admin/jobs/{id}` crash** — drawer'daki "Tam Sayfa" linki hep error boundary'e düşüyor (F2).
2. **Visibility page test fixture kirliliği** — 137 satırın 137'si fake test kuralı (F9).
3. **`/admin/themes` surface vs theme concept collision** — iki ayrı kavram aynı sayfada (F21).
4. **Admin login → `/user` redirect** — admin'i yanlış panele atıyor (F1).
5. **Settings/Providers credential contradiction** — aynı anahtar iki yerde farklı status (F15).
6. **`/admin/audit` → unthemed 404** — canonical `/admin/audit-logs`; diğer varyantlar beyaz 404 (F11).
7. **Panel switch → silent surface reset** — Atrium'dan admin'e geçince hiç uyarı olmadan Bridge'e düşüyor (F49).
8. **Invisible wizard-settings toggle buttons** — beyaz üstüne beyaz (F10).
9. **Horizon rail — label yok** — sadece icon, tooltipsiz (F29).
10. **User `/user/settings` altında admin-only Execution path ayarları** — teknik detay leak (F45).

---

## 6. Top 10 Best Working Things (En İyi Çalışanlar)

1. **Jobs drawer (Üretim Kokpiti)** — 2-pane split, keyboard shortcuts, full action set (F3).
2. **Modül Yönetimi** — 7-adım pipeline + rule badges (re_executable / artifact_check / operator_confirm) (F13).
3. **Provider Yönetimi** — LLM/TTS/Görseller groupby, Test Et butonu, metrics (çağrı/hata%/gecikme) (F14).
4. **Effective Ayarlar** — search + group filter + WIRED/DEFAULT badges + "2/2 ayar" count (F7).
5. **Surface picker Faz 4D status panel** — Altyapı/Aktif/Neden/Tercihiniz 4 satır clarity (F19).
6. **Live surface swap** — Aktif Et'e tıklayınca shell anında değişiyor (F28).
7. **Atrium editorial identity** — "Headline Yapim / Lineup / In Production / Attention" metafor (F51).
8. **Audit Log** — 1215 kayıt, filtrelenebilir, varlık tipi + aktör kolonları (F12).
9. **İçerik Kütüphanesi table** — 32 kayıt, 6 kolon, keyboard shortcut hint inline (F25).
10. **Bridge admin dashboard** — 8 KPI + filter bar + 4 grafik (F4).

---

## 7. Priority Fix List (öncelik sırasıyla)

### Sprint 1 — KRİTİK blockers (kullanım engelleyen)

1. **F2 fix BridgeJobDetailPage hook order** — `BridgeJobDetailPage.tsx:132` satırındaki `useMemo`'yu unconditional hale getir. Test: drawer'dan "Tam Sayfa" tıkla → error boundary yok.
2. **F1 admin login redirect** — AppEntryGate role-aware default. Test: admin login → `/admin`.
3. **F9 Visibility Engine temizlik** — (a) Test fixture'ları sil veya filter (b) 5-10 baseline real kural yaz.
4. **F21 Themes page split** — `/admin/themes` → `/admin/surfaces` + `/admin/themes` (color) ayrı sayfalara böl.
5. **F11 Audit 404 + unthemed** — (a) route alias ekle (b) 404 sayfası ThemeProvider altına sok.
6. **F15 Credentials contradiction** — Settings ve Providers sayfaları tek validator kullansın.

### Sprint 2 — YÜKSEK UX iyileştirmeleri

7. **F45 User settings Execution leak** — user settings'ten admin path ayarlarını gizle.
8. **F10 wizard-settings invisible buttons** — token fix.
9. **F35 scroll-to-top on route change** — global route listener.
10. **F49 panel switch silent reset** — toast mesajı "Bridge'e geçildi".

### Sprint 3 — ORTA polish

11. **F17 Prompt Editörü empty state** — koşulu düzelt.
12. **F22 + F44 aktif surface Aktif Et button hide** — `isAlreadyActive` → hide button.
13. **F27 rail tooltips** — `title` attribute veya hover bubble.
14. **F32 sidebar CANVAS tag hide in production** — debug-only.
15. **F33 proje detay sparse** — step list + artifact + yayınla action ekle.
16. **F36 wizard step pill kontrast**.
17. **F48 panel switch copy unification** — "Yönetim Paneli" tek standard.
18. **F29 Horizon rail labels** — tooltip veya rail-expand.

### Sprint 4 — DÜŞÜK polish

19. **F41 empty KPI açıklaması**.
20. **F52 Atrium low-density empty state guidance**.
21. **F5 Jobs page responsive breakpoint**.

---

## 8. Not Covered / Deferred

Bu tour şunları **test etmedi** (istenmedi veya kapsam dışı):
- Yeni video wizard'ını uçtan uca tamamlamak (6 adım)
- Yeni bülten wizard'ını tamamlamak
- Gerçek YouTube publish flow
- Real source scan tetikleme
- Notification Center etkileşimi (sağ üst çan ikonu)
- Command palette (⌘K)
- Mobile viewport
- Login olmayan "guest" durum
- SSE live update davranışı (jobs'da real-time step progress)

Bunlar ayrı bir tour veya targeted test oturumunda kapsanabilir.

---

## 9. Tour Sırasında Yazılan Ama Düzeltilen Bulgular

- **F35** (önce "KRITIK — Video wizard boş") → ORTA (scroll pozisyonu sorunu, içerik DOM'da var)
- **F11** (önce "Audit Log yok") → KRITIK ama farklı açıdan (canonical rota var, aliases ve tema eksik)
- **F29** (önce "Horizon rail label yok — YÜKSEK") → ORTA (accessible names var, görsel keşif zayıf)

---

## 10. Ek: Gezilen Sayfaların Ekran Görüntüleri Özeti

Tour sırasında alınan 20+ screenshot tek tek commit edilmedi (büyük dosya ve küçük boyut nedeniyle bellek maliyeti). İleride gerekli olursa tour re-run edilip attach edilebilir. Bulgu numaraları ile referans verildi.

---

**Rapor sonu.**
