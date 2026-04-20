# CODE_AUDIT_REPORT_TR.md — ContentHub Tam Operasyonel Gerçeklik Denetimi

**Tarih:** 2026-04-16 (2026-04-06 sentezinin yerini alır)
**Denetleyen:** Claude Sonnet 4.6 (Başmimar Modu)
**Kapsam:** Tam yığın — backend (Python/FastAPI), frontend (React/TypeScript), konfigürasyon, state yönetimi, UI operasyonel gerçeklik
**Yöntem:** 5 fazlı paralel inceleme (Faz 1 anlama, Faz 2 yapı, Faz 4 UI gerçekliği, Faz 6 kaynak-gerçeklik, Faz 7 rota-yetenek)

---

## 1. Yönetici Özeti

ContentHub yapısal olarak sağlam, localhost-öncelikli bir içerik üretim platformudur — FastAPI + SQLAlchemy async + SQLite(WAL) backend, React+Vite+TS frontend (React Query + Zustand doğru kullanılıyor), işler ve yayın için açık durum makineleri ve takılabilir modül/sağlayıcı sistemi. 2026-04-06 denetimi "çekirdek mimari korunmaya değer" sonucunda büyük ölçüde haklıydı. Bu güncellemede işaretlenen dört maddi değişiklik: **(a) Surface Registry (legacy/horizon/atrium/bridge/canvas) artık 13 sayfa override'ı taşıyor ve paralel bir render stratejisine dönüştü**, bu da layout çoğaltmasını katlıyor; **(b) `_make_*_provider` oluşturucuları `resolve()` yerine `_get_builtin` ile çözüyor, bu yüzden kimlik bilgisi olmayan ayar düzenlemeleri (model adı, sıcaklık) restart'a kadar sessizce düşürülüyor**; **(c) 10 admin rotası admin navigasyonundan yetim durumda** ve yalnızca command palette / doğrudan URL ile erişilebilir; **(d) DubVoice kimlik bilgisi yazma yolu bozuk (anahtar `CREDENTIAL_KEYS`'te eksik)**, okuma yolu ise çalışıyor. Bunların hiçbiri mimari hata değil; sapma. Çekirdek motor güvenilir kalmaya devam ediyor.

### En Ciddi 5 Mimari Problem

1. **Surface Registry gerekçesinin ötesine geçti.** 5 surface × admin/user panelleri = 10 layout adayı, `frontend/src/surfaces/*/pages/` altında 13 sayfa-seviyesi override. `useSurfacePageOverride` kaçış kapısı herhangi bir surface'in herhangi bir sayfayı değiştirmesine izin veriyor ve iki paralel render stratejisi yaratıyor (doğrudan route element vs. surface override). Sunset planı olmadan bu sınırsız büyür.
2. **`backend/app/db/models.py` 47 varlıklı bir monolit.** Her domain'in modeli tek dosyada yaşıyor; bu durum `jobs/router.py`'nin join sorguları için yabancı modelleri (ör. YouTube analytics tabloları) import etmesine yol açtı. Domain modelleri kendi router/service/schemas'ıyla aynı yerde olmalı.
3. **`KNOWN_SETTINGS` tek dict içinde 3046 satır.** Metadata'sı doğru ve iyi yapılandırılmış ama operatöre görünen her davranış için yetkili tek doğruluk kaynağı olduğundan gözden geçirilemez hale geldi. `module_scope` bazında alt modüllere bölünmesi gerekli.
4. **Merkezi frontend API fetch wrapper'ı yok.** 47 `frontend/src/api/*.ts` dosyası her biri kendi `const BASE = "/api/v1/..."` tanımını ve kendi `if (!res.ok) throw new Error()` mantığını yeniden yazıyor. ~600 satır fetch boilerplate. (2026-04-06'da raporlanan 21 dosyadan daha kötü — sayı arttı.)
5. **`backend/app/main.py` lifespan'i 400+ satır.** Provider bootstrap, credential seeding, modül kaydı, scheduler başlatma, ayar snapshot'ı — hepsi inline. Startup'ta tek bir refactor hatası tüm uygulamayı bozabiliyor.

### En Ciddi 5 UI/UX Operasyonel Gerçeklik Problemi

1. **`ContentCreationWizard` `useWizardConfig`'i yok sayıyor.** Wizard bileşeni STEPS'i hardcode ediyor ve wizard visibility/konfigürasyon registry'sini okumuyor. Bu nedenle admin'deki wizard-adım kontrolleri bu akış için kozmetik. (Faz 4'te bulundu.)
2. **"Test Connection" butonu bağlantı testi değil, varlık kontrolü.** `CredentialsPanel` "test" yolları anahtarın mevcut ve placeholder olmadığını doğruluyor; sağlayıcıyı gerçekten çağırmıyor. Başarı toast'ı yapılmayan canlı doğrulamayı ima ediyor.
3. **OpenAI "placeholder blocklist"i anahtarları sessizce düşürüyor.** `main.py:234` `{"abc","sk-test-key-123","placeholder",""}` setini eksik olarak değerlendiriyor. `abc`'yi OpenAI anahtarı olarak kaydeden kullanıcı "kaydedildi" görüyor, yok sayıldığına dair hiçbir gösterge yok.
4. **SSE bağlantı kopması hâlâ görünmüyor.** 2026-04-06'dan taşınıyor — yeniden bağlanma göstergesi yok, eski-veri etiketi yok. Kullanıcılar donmuş iş durumuna göre aksiyon alıyor.
5. **Timezone DB + localStorage çift-yazması.** UI kullanıcının timezone tercihini her iki konuma yazıyor; çakışmada (farklı tarayıcı, farklı sekme) öncelik tanımsız.

### En Ciddi 5 Kaynak-Gerçeklik / Konfigürasyon Problemi

1. **`_make_llm_provider` / `_make_tts_provider` / `_make_visuals_provider` `resolve` yerine `_get_builtin` kullanıyor.** Kimlik bilgisi olmayan ayarlar (`llm.model`, `llm.temperature`, `tts.voice_id`, `visuals.style_preset`, vb.) provider oluşturulurken builtin default'lardan okunuyor. `/admin/settings`'teki DB düzenlemeleri başarıyla kaydediliyor gibi görünüyor ama çalışan provider'a asla ulaşmıyor. Yalnızca kimlik bilgileri `resolve_credential()`'dan yararlanıyor. Restart da çözmüyor — yine builtin okuyor.
2. **DubVoice kimlik bilgisi `CREDENTIAL_KEYS`'te eksik.** `resolve_credential()` okuma yolu çalışıyor (anahtar DB'ye düşüyor), ancak `save_credential()` aracılığıyla neyin kalıcılaştırılacağına karar vermek için `CREDENTIAL_KEYS`'i dolanan admin yazma yolu DubVoice'u hiç görmüyor, yani UI'da DubVoice anahtarı kaydetmek başarı gösteren bir no-op.
3. **`module.product_review.enabled` `KNOWN_SETTINGS`'te eksik.** Diğer her modülün kendi `module.{id}.enabled` toggle'ı kayıtlı; product_review'ın yok. Modül kod içinde kendini kaydediyor ama settings registry'sinin etkinleştir/devre dışı bırak mekanizmasına görünmüyor.
4. **Publish scheduler aralığı `backend/app/publish/scheduler.py`'de 60s olarak hardcode**; oysa `publish.scheduler.interval_seconds` `KNOWN_SETTINGS`'te mevcut. Full-Auto scheduler'ın kendi aralık ayarı var. Split-brain: iki scheduler, iki kaynak.
5. **`execution.workspace_root` `contracts/workspace.py`'de dokümante ediliyor ama hiçbir kod onu okumuyor.** Yetim doküman; workspace root aslında `config.py`'den hesaplanıyor.

### Basitleştirme için En Büyük 5 Fırsat

1. **`_make_*_provider`'ı `resolve()` çağıracak şekilde düzelt** — önemsiz kod değişikliği, büyük dürüstlük kazanımı. "Ayarlar kaydediliyor ama uygulanmıyor" sınıfı hataları tek commit'te ortadan kaldırır.
2. **Surface Registry'yi Canvas'ta dondur.** Canvas'ı ileriye dönük surface olarak gönder, Legacy/Horizon/Atrium/Bridge'i sunset olarak işaretle, yeni override yazmayı durdur. Registry'nin kendisi tema için kalsın; `useSurfacePageOverride` yolu deprecate edilsin.
3. **`KNOWN_SETTINGS`'i `module_scope` ile böl.** `settings/registry/llm.py`, `settings/registry/tts.py`, vs. Her module_scope için bir dict, import'ta birleştirilir. Kod incelemesini tekrar mümkün kılar.
4. **Eksik kimlik bilgisi anahtarlarını `CREDENTIAL_KEYS`'e ekle.** DubVoice'u dahil et ve her sağlayıcıyı simetrik okuma/yazma yolları için denetle.
5. **Admin-yetim rotaları `AdminLayout` sidebar'ına taşı** veya açıkça emekliye ayır. Yalnızca doğrudan URL ile erişilebilen 10 rota ya ölü ürün ya da eksik navigasyon demek.

---

## 2. Mimari Değerlendirmesi

### Mimari Desen
**Katmanlı monolit (iyi uygulanmış, kenarlarda sapıyor).** Backend: Router → Service → Repository/Model. Frontend: Pages → Components → Hooks → API → Backend. Bağımlılıklar doğru şekilde içe akıyor. Sapma frontend kenarında (Surface Registry) ve backend persistans kenarında (models.py monolit).

### Gerçek vs Yapay Katmanlar
- **Gerçek:** Router (yalnızca HTTP), Service (iş mantığı + durum makinesi uygulaması), Models (persistans), Contracts (enum'lar + durum makineleri), Providers (fallback zincirleriyle dış servis soyutlaması), Modül Registry (takılabilir içerik modülleri), Publish Adapter Registry, SSE (event bus), 4-katmanlı resolver ile Settings Registry.
- **Yapay / gerekçeli-ama-aşırı-büyümüş:** Surface Registry. Orijinal amaç: tema değiştirme. Mevcut durum: 13 override'lı paralel sayfa render stratejisi. Takılabilirlik gerçek; kullanım orijinal sözleşmenin ötesine geçti.

### Bağlama / Uyum
- **Bağlama: GENEL OLARAK DÜŞÜK** — 160+ backend dosyası arasında döngüsel import yok. Modüller registry ve servis arayüzleri üzerinden iletişim kuruyor.
- **Uyum: ALT SİSTEM BAŞINA YÜKSEK**, istisnalar:
  - `db/models.py` (tek dosyada 47 varlık, 6 domain)
  - `main.py` lifespan (inline 6 alt sistem bootstrap)
  - Frontend layout'lar (2 mantıksal panel için 10 layout adayı)

### Proje Şekli vs Amaç
Amacı doğru yansıtıyor: iş orkestrasyonu + çoklu-sağlayıcı + yayın iş akışıyla yerel içerik üretim platformu. Hayali özellik yok, mimari-astronot soyutlama yok.

### Frontend/Backend/Konfigürasyon/Runtime Sınırları
- **Net:** Frontend ↔ Backend yalnızca REST + SSE üzerinden. Yığınlar arasında paylaşılan kod yok.
- **Karışık:** Ayar çözümlemesi `.env`, `core/config.py`, `settings_seed.py`, `settings_resolver.py`, `credential_resolver.py`, `KNOWN_SETTINGS` üzerine yayılmış. Öncelik dokümante (DB admin_value → DB default → .env → builtin), ancak hiçbir entegrasyon testi tüm zinciri kapsamıyor ve provider oluşturucular kimlik bilgisi olmayan ayarlar için resolver'ı tamamen atlıyor.

---

## 3. UI/UX Sistem Değerlendirmesi

### Yapısal Güvenilirlik
UI yapısal olarak güvenilir. Form gönderimleri yalnızca onaylanmış sunucu başarısında yönlendiriyor. Önbellek invalidasyonu yalnızca mutasyon başarısında gerçekleşiyor. State'i yanıltacak optimistik UI yok. Erişilebilirlik iyi: 38+ gerçek rota ve gerçek backend.

### Runtime Davranış Yansıması
**Çoğunlukla doğru. Dört dürüstlük boşluğu:**
1. SSE bağlantı kopması → görünmez eski veri
2. Kimlik bilgisi olmayan değerler için ayar kaydetme → provider seviyesinde sessizce no-op
3. "Test Connection" → yalnızca varlık kontrolü
4. OpenAI placeholder blocklist → sessiz düşürme

### Bilgi Mimarisi
IA seviyesinde tutarlı (Admin / User panelleri, net ayrım). Navigasyon seviyesinde zayıf: 10 admin rotası sidebar'dan yetim ve yalnızca command palette veya doğrudan URL ile erişilebilir.

### Kaynak-Gerçeklik Tutarlılığı
- **Tek kaynak:** visibility kuralları, yayın kayıtları, iş durumu, ayarların admin değerleri.
- **Çok-kaynak / çelişkili:** timezone (DB + localStorage), provider konfigürasyonu (DB kaydediyor ama provider builtin okuyor), tema state (yalnızca localStorage).
- **Geçici:** provider seçimi (in-memory registry, restart'ta sıfırlanıyor).

### Ölü / Çift / Bayat / Yanıltıcı / Kısmi

| Kategori | Elemanlar |
|----------|-----------|
| **Ölü** | `pages/admin/YouTubeCallbackPage.tsx` (settings callback ile değiştirildi), `tts_preview_router` backend (frontend tüketicisi yok), `brand_profiles_router` backend (frontend tüketicisi yok) |
| **Nav'dan-yetim** | `/admin/inbox`, `/admin/calendar`, `/admin/automation`, `/admin/notifications`, `/admin/connections`, `/admin/analytics/content`, `/admin/analytics/operations`, `/admin/analytics/publish`, `/admin/users/:userId/settings`, kısmen `/admin/themes` |
| **Çift** | 5 surface × 2 panel = 10 layout implementasyonu; 47 api/*.ts dosyası yeniden-tanımlanan BASE sabitleriyle |
| **Bayat** | Bağlantı koptuğunda SSE-bağımlı görünümler (gösterge yok) |
| **Yanıltıcı** | "Test Connection" varlık kontrolü, provider model/temp için ayar kaydetme, OpenAI placeholder düşürme |
| **Kısmi** | `ContentCreationWizard` wizard config registry'sini yok sayıyor; Full-Auto `SUPPORTED_MODULES_V1={"standard_video"}` diğer modülleri sessizce filtreliyor |

### Onarım vs Yeniden Yapım
Aşamalı onarım hâlâ yeterli. Yeni bulgular 1–2 günlük düzeltmeler, yeniden yapılandırma değil.

---

## 4. Dosya ve Modül Bulguları

### Çekirdek Modüller (koru)

| Dosya | Amaç | Önem | Katman | Ana Problemler | Öneri | Risk |
|------|------|------|--------|----------------|-------|------|
| `backend/app/main.py` (400+L lifespan) | FastAPI app + bootstrap | çekirdek | altyapı | Lifespan çok büyük | bootstrap modüllerini çıkar | orta |
| `backend/app/jobs/dispatcher.py` | Pipeline orkestratörü | çekirdek | iş mantığı | Yok | koru | düşük |
| `backend/app/jobs/pipeline.py` | İş durum makinesi runner'ı | çekirdek | iş mantığı | Yok | koru | düşük |
| `backend/app/jobs/service.py` | İş CRUD + geçişler | çekirdek | state | Yok | koru | düşük |
| `backend/app/contracts/state_machine.py` | İş/Adım durum makineleri | çekirdek | iş mantığı | Yok | koru (dondur) | düşük |
| `backend/app/publish/service.py` | Yayın CRUD + durum makinesi | çekirdek | iş mantığı | Büyük | koru, izle | orta |
| `backend/app/publish/state_machine.py` | Yayın akış durumları | çekirdek | iş mantığı | Yok | koru (dondur) | düşük |
| `backend/app/providers/registry.py` | Provider yetenek registry'si | çekirdek | state | Yok | koru | düşük |
| `backend/app/settings/settings_resolver.py` | Ayar çözümleme zinciri | çekirdek | iş mantığı | `_make_*_provider` bunu atlıyor | **provider oluşturucuları düzelt** | orta |
| `backend/app/settings/known_settings.py` (3046L) | Settings registry metadata | çekirdek | konfig | Tek monolitik dict | module_scope ile böl | orta |
| `backend/app/db/models.py` (47 varlık) | ORM modelleri | çekirdek | persistans | Monolit, çapraz-domain | domain ile böl | **yüksek** |
| `frontend/src/app/router.tsx` | Merkezi rotalar | çekirdek | route | Çoğunda zaten lazy() var | koru | düşük |
| `frontend/src/components/design-system/primitives.tsx` | UI primitifler | çekirdek | UI | Yok | koru | düşük |
| `frontend/src/components/shared/VideoPlayer.tsx` | Klavyeli HTML5 player | çekirdek | UI | Yok | koru | düşük |

### Yüksek Risk / Refactor

| Dosya | Amaç | Katman | Ana Problemler | Öneri | Risk |
|------|------|--------|----------------|-------|------|
| `backend/app/main.py` (lifespan bölümü) | Bootstrap | altyapı | 400+L inline, 6 alt sistem | `bootstrap/providers.py`, `bootstrap/credentials.py`, `bootstrap/modules.py`, `bootstrap/scheduler.py` ayır | orta |
| `backend/app/db/models.py` | Tüm modeller | persistans | 47 varlık, 981+L | Domain ile böl (`models/jobs.py`, `models/publish.py`, `models/youtube.py`, vs.) | **yüksek** |
| `backend/app/settings/known_settings.py` | KNOWN_SETTINGS dict | konfig | 3046L gözden geçirilemez | module_scope ile böl | orta |
| `frontend/src/pages/admin/ThemeRegistryPage.tsx` | Tema CRUD | UI | Tanrı bileşeni | 3 alt-bileşene çıkar | orta |
| `frontend/src/components/settings/EffectiveSettingsPanel.tsx` | Ayar görüntüleme | UI | Tanrı bileşeni | SettingRow/Group çıkar | orta |
| `frontend/src/components/settings/CredentialsPanel.tsx` | API anahtar yönetimi | UI | Tanrı bileşeni + "test" varlık kontrolü | Çıkar + test'i düzelt | orta |
| `frontend/src/components/ContentCreationWizard.tsx` | Wizard akışı | UI | STEPS hardcode, `useWizardConfig` yok sayılıyor | Config üzerinden bağla | orta |
| `backend/app/jobs/router.py` | İşler HTTP | route | YouTube analytics modellerini import ediyor | Böl veya service katmanını kullan | orta |

### Artık / Birleştirme Adayları

| Dosyalar | Örtüşme | Önerilen | Risk |
|----------|---------|----------|------|
| 5 surface dizini × admin+user layout'lar (10 dosya) | Paralel render stratejisi | Canvas'ta dondur; diğerlerini sunset | **orta-yüksek** |
| 13 `surfaces/*/pages/*.tsx` override | Paralel sayfa render vs. route element | Sunset sonrası `useSurfacePageOverride`'ı deprecate | orta |
| 47 `api/*.ts` dosyası, her biri BASE + fetch yeniden tanımlıyor | Çoğaltma | `api/client.ts` + ince domain-başına modüller oluştur | düşük |
| `timing.py` + `timing_service.py` | İkisi de heartbeat ele alıyor | Birleştir | düşük |
| `/admin/standard-videos/new` + `/admin/standard-videos/wizard` | Aynı POST endpoint | Akışları birleştir | orta |

### Ölü / Yetim Kod

| Dosya | Neden Ölü | Güven | Güvenli Doğrulama |
|------|-----------|-------|-------------------|
| `frontend/src/pages/admin/YouTubeCallbackPage.tsx` | `/admin/settings/youtube-callback` ile değiştirildi | **yüksek** | grep import → 0 |
| `backend/app/tts/preview_router.py` | Frontend tüketicisi yok | yüksek | frontend'de grep `tts/preview` → 0 |
| `backend/app/brand/brand_profiles_router.py` | Frontend tüketicisi yok | yüksek | frontend'de grep `/api/v1/brand-profiles` → 0 |

---

## 5. Teknik Borç ve Kod Kokuları

### Aşırı Mühendislik
- `useSurfacePageOverride`'lı Surface Registry — başlangıçta tema için gerekçeliydi, şimdi herhangi bir surface'in herhangi bir sayfayı sessizce değiştirmesine izin veriyor. Kaçış kapısı paralel bir routing stratejisine dönüştü.

### Ölü Kod
- `pages/admin/YouTubeCallbackPage.tsx` (değiştirildi)
- `backend/app/tts/preview_router.py` (tüketici yok)
- `backend/app/brand/brand_profiles_router.py` (tüketici yok)
- `contracts/workspace.py`'deki `execution.workspace_root` (okuyucu yok)

### Çift Mantık
- **47 API dosyası** her biri `const BASE = "/api/v1/..."` ve fetch-wrapper boilerplate'i yeniden tanımlıyor. ~600 satır çoğaltılmış.
- 5 surface genelinde 2 mantıksal panel (admin, user) için **10 layout implementasyonu**.
- 10+ form genelinde **form state deseni**: aynı useState + handleSubmit yapısı.
- Layout başına 5+ kez tekrarlanan **visibility hook çağrıları**.

### Tanrı Modülleri
- `backend/app/db/models.py` — 6 domain genelinde 47 varlık
- `backend/app/settings/known_settings.py` — 3046L tek dict
- `backend/app/main.py` lifespan — 400+L, 6 alt sistem
- `frontend/src/pages/admin/ThemeRegistryPage.tsx` — 551L
- `frontend/src/components/settings/EffectiveSettingsPanel.tsx` — 468L
- `frontend/src/components/settings/CredentialsPanel.tsx` — 384L

### Gizli Yan Etkiler
- `_make_llm_provider` / `_make_tts_provider` / `_make_visuals_provider` — `resolve()` mevcut olmasına rağmen kimlik bilgisi olmayan ayarlar için builtin default okuyorlar — sessiz düşürme.
- İş instance'larına `object.__setattr__` ile eklenen template context.
- Her lifespan başlangıcında çağrılan `create_all_tables()`.

### Konfigürasyon Kaosu
- 5 konfig kaynağı: `.env`, `core/config.py`, `settings_seed.py`, `settings_resolver.py`, `credential_resolver.py`.
- İki scheduler (publish + full-auto), iki aralık.
- DubVoice okuma yolu çalışıyor, yazma yolu bozuk (asimetrik `CREDENTIAL_KEYS`).
- `KNOWN_SETTINGS`'te `module.product_review.enabled` eksik.

### String-Tipli Mantık
- Frontend formları backend'le enum paylaşmak yerine `["active", "paused", "archived"]` hardcode ediyor.
- OpenAI placeholder blocklist `main.py:234`'te bir string seti.

### URL Sapması
- `/admin/product-review`, navigasyon yoluna bağlı olarak `/admin/modules/product-review` ile birlikte var oluyor. Modül, manuel kaydedilen muadillerine kıyasla tutarsız şekilde kendini kaydediyor.

---

## 6. UI Eleman Gerçeklik Tablosu

| Ekran/Rota | Eleman | Amaç | Erişilebilirlik | Bağlantı | Runtime Etki | Persistans | Geri-Okuma | Geri Bildirim Dürüstlüğü | Karar |
|---|---|---|---|---|---|---|---|---|---|
| `/admin/settings` | Settings Registry sekmesi | Ayarları listele | ✅ | `useSettingsList()` → GET `/api/v1/settings` | Gerçek | DB | resolver | Dürüst | **CANLI** |
| `/admin/settings` | Effective Settings sekmesi | Çözümlenmiş değerler | ✅ | GET `/api/v1/settings/effective` | Gerçek | DB | startup'ta provider'lar | Dürüst | **CANLI** |
| `/admin/settings` | Auto-save alanda (kimlik bilgileri) | Kalıcılaştır | ✅ | PUT `/api/v1/settings/effective/{key}` + `save_credential()` | Bilinen anahtarlar için gerçek | DB | `resolve_credential()` | Dürüst | **CANLI** |
| `/admin/settings` | Auto-save (DubVoice anahtarı) | Kalıcılaştır | ✅ | Yazma yolunda anahtar eksik | **No-op** | Kaydedilmedi | N/A | Başarı gösteriyor | **YANILTICI** |
| `/admin/settings` | Auto-save (llm.model, llm.temperature, vb.) | Kalıcılaştır + uygula | ✅ | PUT endpoint DB'ye yazıyor | DB güncel; provider hâlâ builtin kullanıyor | DB | provider oluşturucuda `_get_builtin` | Başarı gösteriyor | **YANILTICI** |
| `/admin/settings` | "Test Connection" butonu | Kimlik bilgilerinin çalıştığını doğrula | ✅ | Anahtarda varlık kontrolü | Non-empty onayı | N/A | N/A | Toast "bağlandı" diyor | **YANILTICI** |
| `/admin/settings` | OpenAI anahtar alanı (değer ∈ placeholder set) | Anahtarı kaydet | ✅ | main.py:234 filtreliyor | Sessizce düşürüldü | N/A | N/A | "kaydedildi" gösteriyor | **YANILTICI** |
| `/admin/publish` | Kayıt listesi | Kuyruğu görüntüle | ✅ | GET `/api/v1/publish/` | Gerçek | DB | scheduler | Dürüst | **CANLI** |
| `/admin/publish/:id` | Submit/Approve/Trigger/Cancel/Retry | Durum geçişleri | ✅ koşullu | POST geçişleri | Gerçek durum makinesi | DB | iş akışı | Dürüst | **CANLI** |
| `/admin/publish/:id` | Denetim logu | Geçiş geçmişi | ✅ | GET log | Append-only | DB | uyumluluk | Dürüst | **CANLI** |
| `/admin/standard-videos/new` | Oluşturma formu | Video gönder | ✅ | POST `/api/v1/modules/standard-video` | Gerçek iş + kayıt | DB | dispatcher | Dürüst | **CANLI** |
| `/admin/standard-videos/wizard` | Wizard | Rehberli oluşturma | ✅ | Aynı POST | Aynı | DB | dispatcher | Dürüst | **CANLI** (ama wizard config registry'sini yok sayıyor) |
| `/admin/analytics/*` | Metrik görünümleri | İstatistik oku | ✅ | GET analytics | Gerçek SQL | N/A | N/A | Dürüst | **CANLI** |
| `/admin/jobs/:id` | Detay + timeline | Yürütme görünümü | ✅ | GET + SSE | Gerçek | N/A | N/A | SSE kopması hariç dürüst | **CANLI** |
| `/admin/jobs/:id` | SSE stream | Gerçek zamanlı | ✅ | GET SSE | Gerçek event'ler | N/A | job detail UI | **Kopma göstergesi yok** | **YANILTICI** |
| `/admin/library` | Kütüphane + clone | Gözat + çoğalt | ✅ | GET + POST clone | Gerçek | DB | liste | Dürüst | **CANLI** |
| `/admin/assets` | Upload/delete | Dosyaları yönet | ✅ | multipart POST / DELETE | Gerçek FS + DB | FS+DB | görüntüleme | Dürüst | **CANLI** |
| `/admin/visibility` | Kurallar CRUD | Erişim kontrolü | ✅ | Tam CRUD | Gerçek | DB | VisibilityGuard | Dürüst | **CANLI** |
| `/admin/themes` | Import/export | Tema yönetimi | ✅ | Yalnızca localStorage | Yalnızca istemci | localStorage | ThemeProvider | Dürüst ama sınırlı | **KABUK** |
| `/admin` | Sistem Hazırlık kartları | Modül durumu | ✅ | Hardcode `READINESS_ITEMS` | Yok | Yok | Yok | Yanıltıcı | **KOZMETİK** |
| `/admin/inbox` vb. (10 yetim rota) | Çeşitli | ✅ yalnızca URL ile | Gerçek backend'ler | Değişir | Değişir | Değişir | Dürüst | **NAV'DAN-YETİM** |
| `/user` | Dashboard | Ana sayfa | ✅ | `useOnboardingStatus()` | Gerçek | N/A | N/A | Dürüst | **CANLI** |
| `/user/channels/:channelId` | Kanal detayı | Kanalı görüntüle | ✅ | ChannelDetailPage (326L) | Gerçek | DB | N/A | Dürüst | **CANLI** |
| `/user/publish` | Yayın girişi | Navigasyon | ✅ | Statik link'ler | Yok | Yok | Yok | Dürüst | **KOZMETİK** |
| `/onboarding` | Kurulum wizard'ı | Yapılandır | ✅ ilk çalıştırma | Çok adımlı backend | Gerçek | DB | durum | Dürüst | **CANLI** |

---

## 7. Aksiyon Akış İzleme Tablosu

| Aksiyon | Giriş Noktası | Rota | Handler | Doğrulama | State | API | Backend | Persistans | Sonraki Tüketici | Sonuç | Karar |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Standard Video Oluştur | Buton | `/admin/standard-videos/new` | onSubmit | service schema | RQ mutasyon | POST `/api/v1/modules/standard-video` | `standard_video.service.create()` | Job + StandardVideo | dispatcher.dispatch() | İş kuyruğa | **ÇALIŞIYOR** |
| Wizard oluştur | Wizard | `/admin/standard-videos/wizard` | handleCreate | istemci gerekli | RQ | Aynı POST | Aynı | Aynı | Aynı | İş kuyruğa | **ÇALIŞIYOR** (ama wizard config yok sayılıyor) |
| llm.model ayarını kaydet | Auto-save | `/admin/settings` | debounced | tip kontrolü | RQ mutasyon | PUT `/api/v1/settings/effective/llm.model` | service.update() | DB admin_value_json | `_make_llm_provider` (`_get_builtin` okuyor) | DB yazıldı, provider değişmedi | **BOZUK (sessiz)** |
| OpenAI API anahtarı kaydet | Auto-save | `/admin/settings` | debounced | main.py:234'te placeholder blocklist | RQ | PUT + save_credential() | credential_resolver | DB | startup'ta provider | Placeholder set'in dışındaysa kalıcılaştırılır | **KISMI** |
| DubVoice API anahtarı kaydet | Auto-save | `/admin/settings` | debounced | CREDENTIAL_KEYS girdisi yok | RQ | PUT başarılı; yazma-yolu save_credential() çağırmıyor | N/A | **Kaydedilmedi** | N/A | Başarı gösteriyor ama etkisi yok | **BOZUK (sessiz)** |
| Test Connection | Buton | `/admin/settings` | testConnection | Varlık kontrolü | RQ | GET credential status | credential_resolver.resolve_credential() | N/A | N/A | Non-empty durumuna göre bool döndürüyor | **YANILTICI** |
| Publish Submit | Buton | `/admin/publish/:id` | mutasyon | Durum guard | RQ | POST submit | `publish.service.submit_for_review()` | State + log | iş akışı | Geçiş + log | **ÇALIŞIYOR** |
| Approve/Trigger/Cancel/Retry | Butonlar | `/admin/publish/:id` | mutasyonlar | Durum guard'ları | RQ | POST'lar | publish service | DB + log | iş akışı + YouTube | Gerçek etki | **ÇALIŞIYOR** |
| İçerik clone | Kütüphane butonu | `/admin/library` | mutasyon | sunucu doğruluyor | RQ | POST clone | modül service | DB | liste | Duplika oluşturuldu | **ÇALIŞIYOR** |
| Asset yükle | Dosya input | `/admin/assets` | handler | sunucu doğruluyor | RQ | multipart POST | assets service | FS + DB | görüntüleme | Dosya saklandı | **ÇALIŞIYOR** |
| İşi iptal et | Buton | `/admin/jobs/:id` | mutasyon | Durum guard | RQ | POST cancel | jobs service | DB | pipeline duruyor | Sonlandırıldı | **ÇALIŞIYOR** |
| Full-Auto çalıştır | Scheduler tick | N/A | scheduler | SUPPORTED_MODULES_V1 filtre | N/A | Dahili | full_auto.service | DB | iş dispatcher | Yalnızca standard_video modülleri çalışıyor | **KISMI** (sessiz filtre) |
| YouTube OAuth callback | Yönlendirme | `/admin/settings/youtube-callback` | handler | kod kontrolü | N/A | GET token exchange | youtube/token_store | DB | adapter | Token saklandı | **ÇALIŞIYOR** |

---

## 8. Kaynak-Gerçeklik Tablosu

| Değer | Giriş Konumları | Yazma Yolları | Okuma Yolları | Geçersiz Kılma Kaynakları | Etkin SoT | Çelişen Yollar | Karar |
|---|---|---|---|---|---|---|---|
| **API Anahtarları (KIE, OpenAI, Pexels, Pixabay, ElevenLabs)** | Settings UI, `.env` | `save_credential()` + DB | Runtime'da `resolve_credential()` | `.env` fallback | DB admin → `.env` → Yok | Provider instance'ları startup'ta donuyor | **NET, restart-bağımlı** |
| **DubVoice API Anahtarı** | Settings UI, `.env` | **`CREDENTIAL_KEYS`'te eksik → yazma yolu no-op** | `resolve_credential()` çalışıyor | `.env` | Etkin olarak yalnızca `.env` | UI kaydetmeleri sessizce düşürüldü | **BOZUK** |
| **Değeri ∈ {"abc","sk-test-key-123","placeholder",""} olan OpenAI API anahtarı** | Settings UI | `main.py:234` filtreliyor → kayıt yok | N/A | `.env` | `.env` veya Yok | UI başarı gösteriyor | **YANILTICI** |
| **Kimlik bilgisi olmayan provider ayarları (llm.model, llm.temperature, tts.voice_id, visuals.style_preset)** | Settings UI | PUT `/api/v1/settings/effective/{key}` → DB | `_make_*_provider` `_get_builtin` kullanıyor (`resolve` DEĞİL) | N/A | **Builtin default (DB yok sayılıyor)** | DB yazma + builtin okuma | **BOZUK (sessiz)** |
| **YouTube OAuth token'ları** | OAuth callback | `youtube/token_store` → DB | YouTube adapter upload'da | Yok | Yalnızca DB | Yok | **NET** |
| **Provider seçimi (hangi LLM/TTS/Visuals)** | UI-yapılandırılabilir değil | Startup'ta in-memory ProviderRegistry | `registry.get_primary(capability)` | `main.py` lifespan'de hardcode | **Geçici in-memory** | Persistans yok | **PERSİSTANS EKSİK** |
| **Visibility kuralları** | Admin UI | service.create_rule() → DB | Request başına resolver | Yok | Her zaman DB | Yok | **NET** |
| **Tema/Layout** | Tema Registry UI | themeStore → localStorage | DynamicAdminLayout Zustand okuyor | Yok | **Yalnızca localStorage** | Yedekleme/paylaşım yok | **YALNIZCA-İSTEMCİ** |
| **Timezone tercihi** | User UI | DB + localStorage çift-yazma | Farklı kod yolları ikisini okuyor | N/A | Belirsiz | Sekmeler/tarayıcılar arası split-brain | **ÇELİŞKİLİ** |
| **Publish scheduler aralığı** | UI yok | N/A | `publish/scheduler.py`'de 60s hardcode | KNOWN_SETTINGS'te `publish.scheduler.interval_seconds` (kullanılmıyor) | Hardcode | Ayar var ama yetim | **ÖLÜ AYAR** |
| **Full-Auto scheduler aralığı** | Admin UI | DB | Full-Auto service ayarı okuyor | N/A | DB | Publish'ten ayrı scheduler | **SPLIT-BRAIN** (iki scheduler) |
| **İş default'ları** | İş başına form | Job.input_data_json | Modül executor'ları | Modül default'ları | İş başına | Yok | **NET** |
| **Ayarlar (genel)** | Settings UI, `.env` | service.update() → DB | settings_resolver.resolve() | `.env`; builtin | DB admin → DB default → `.env` → builtin | Bazıları yalnızca startup'ta okunuyor | **NET, provider oluşturucular için restart-bağımlı** |
| **Kaynak tarama dedup eşiği** | Settings UI | service.update() → DB | scan_engine tarama başına resolve() | builtin 0.65 | DB admin → builtin | Yok | **NET** |
| **`execution.workspace_root`** | `contracts/workspace.py`'de dokümante | N/A | **Okuyucu yok** | `config.py` workspace root'u ayrıca hesaplıyor | `config.py` | Contract doküman yetimi | **ÖLÜ DOKÜMAN** |
| **`module.product_review.enabled`** | N/A (kayıtlı değil) | N/A | Toggle için ayar yok | Modül kod içinde kendini kaydediyor | Kod yolu çalışıyorsa her zaman aktif | Diğer modüllere göre asimetrik | **EKSİK AYAR** |

---

## 9. Rota-Yetenek Tablosu (Yalnızca Yetimler ve Sapma)

Gerçek ve tam-bağlı rotalar (Standard Video CRUD, Templates, Style Blueprints, Sources, Source Scans, News Bulletins, News Items, Used News, Template-Style Links, Library, Assets, Visibility, Analytics, Publish, Audit Logs, onboarding) hepsi **CANLI** — ayrıntılı liste için 2026-04-06 denetimine bakın; hiçbiri regres etmedi. Aşağıda eklenenler ve sapmalar:

| Rota | Amaç | Gerçek Yetenek | Tamamlanma | Karar | Önerilen Aksiyon |
|---|---|---|---|---|---|
| `/user/channels/:channelId` | Kanal detayı | Gerçek 326L sayfa | Tam | ✅ **CANLI** (daha önce stub, şimdi düzeltildi) | koru |
| `/admin/inbox` | Inbox görünümü | Gerçek backend | Tam | ⚠️ **NAV'DAN-YETİM** | sidebar'a ekle veya emekli et |
| `/admin/calendar` | Takvim görünümü | Gerçek backend | Tam | ⚠️ **NAV'DAN-YETİM** | sidebar'a ekle veya emekli et |
| `/admin/automation` | Otomasyon config | Gerçek backend | Tam | ⚠️ **NAV'DAN-YETİM** | sidebar'a ekle veya emekli et |
| `/admin/notifications` | Bildirimler | Gerçek backend | Tam | ⚠️ **NAV'DAN-YETİM** | sidebar'a ekle veya emekli et |
| `/admin/connections` | Bağlantılar | Gerçek backend | Tam | ⚠️ **NAV'DAN-YETİM** | sidebar'a ekle veya emekli et |
| `/admin/analytics/content` | İçerik analytics | Gerçek | Tam | ⚠️ **NAV'DAN-YETİM** | analytics alt-nav'a ekle |
| `/admin/analytics/operations` | Ops analytics | Gerçek | Tam | ⚠️ **NAV'DAN-YETİM** | analytics alt-nav'a ekle |
| `/admin/analytics/publish` | Yayın analytics | Gerçek | Tam | ⚠️ **NAV'DAN-YETİM** | analytics alt-nav'a ekle |
| `/admin/users/:userId/settings` | Kullanıcı başına ayarlar | Gerçek backend | Tam | ⚠️ **NAV'DAN-YETİM** | users sayfasına ekle |
| `/admin/themes` | Tema registry | Backend yok | Kısmi | ❌ **İSTEMCİ-KABUK** | backend ekle veya dokümante et |
| `/admin/product-review` vs `/admin/modules/product-review` | Aynı modül | URL sapması | N/A | ⚠️ **ÇİFT ROTA** | Birini seç, diğerini yönlendir |
| `/user/publish` | Yayın girişi | Yalnızca navigasyon | Kabuk | ⚠️ **KOZMETİK** | gerçek fonksiyon bağla veya içerik akışına birleştir |

---

## 10. Kaldırma Adayları

| Dosya / Modül / Rota | Neden Kaldırılabilir | Güven | Kaldırılırsa Risk | Güvenli Doğrulama |
|---|---|---|---|---|
| `frontend/src/pages/admin/YouTubeCallbackPage.tsx` | `/admin/settings/youtube-callback` ile değiştirildi | **Yüksek** | Düşük | `grep -r YouTubeCallbackPage frontend/src` → 0 import |
| `backend/app/tts/preview_router.py` | Frontend tüketicisi yok | Yüksek | Düşük | `grep "tts/preview" frontend/src` → 0 |
| `backend/app/brand/brand_profiles_router.py` | Frontend tüketicisi yok | Yüksek | Düşük | `grep "brand-profiles" frontend/src` → 0 |
| `contracts/workspace.py`'deki `execution.workspace_root` dokümanı | Okuyucu yok | Yüksek | Yok | `grep "execution.workspace_root"` → yalnızca doküman |
| `publish.scheduler.interval_seconds` ayarı | Scheduler 60s hardcode | Orta | Yok | Scheduler'ı resolver'a bağla VEYA ayarı sil |

---

## 11. Birleştirme / Düzleştirme / Basitleştirme Adayları

| İlgili Dosyalar | Neden Örtüşüyorlar | Önerilen Basitleştirme | Beklenen Fayda | Risk |
|---|---|---|---|---|
| 47 `frontend/src/api/*.ts` dosyası | Her biri BASE + fetch wrapper yeniden tanımlıyor | `api/client.ts` oluştur; domain başına modüller inceltilir | -600 satır; merkezi auth/hata | düşük |
| 10 layout implementasyonu (5 surface × 2 panel) | Paralel render stratejileri | Canvas'ı dondur; Legacy/Horizon/Atrium/Bridge'i sunset | -1500 satır eventually | orta-yüksek |
| 13 `frontend/src/surfaces/*/pages/*.tsx` override | `useSurfacePageOverride` yolu | Sunset sonrası deprecate; route element SoT | Daha basit zihinsel model | orta |
| `backend/app/db/models.py` (47 varlık) | Çapraz-domain monolit | `models/jobs.py`, `models/publish.py`, `models/youtube.py`, vb. ayır | Gözden geçirilebilir + domain-hizalı | **yüksek** (import'lar) |
| `backend/app/settings/known_settings.py` (3046L) | Tek dict | `module_scope` ile böl | Gözden geçirilebilir | orta |
| `backend/app/main.py` lifespan (400+L) | 6 alt sistem inline | `bootstrap/providers.py`, `bootstrap/credentials.py`, `bootstrap/modules.py`, `bootstrap/scheduler.py` | İzole hata alanları | orta |
| `timing.py` + `timing_service.py` | İkisi de heartbeat | `timing.py`'ye birleştir | -50 satır | düşük |
| `/admin/standard-videos/new` + `/wizard` | Aynı POST endpoint | Akışları birleştir (wizard = aynı formun rehberli modu) | Tek oluşturma yolu | orta |
| `ThemeRegistryPage.tsx` / `EffectiveSettingsPanel.tsx` / `CredentialsPanel.tsx` | Tanrı bileşenleri | Alt-bileşenleri çıkar | -1400 → ~8 odaklı dosya | orta |
| 10+ `*Form.tsx` dosyası | Aynı useState deseni | `useFormState` hook'u | -200 satır | orta |

---

## 12. Bağımlılık İncelemesi

Frontend ve backend `package.json` / `pyproject.toml` 2026-04-06'dan beri değişmedi. Sıfır gereksiz bağımlılık; listelenen her paket somut bir amaca hizmet ediyor (backend'de FastAPI, uvicorn, SQLAlchemy+aiosqlite, Alembic, httpx, pydantic-settings, feedparser, edge-tts; frontend'de React 18, RRD, React Query, Zustand, clsx, tailwind-merge). Şişkinlik yok, spekülatif dep yok.

---

## 13. Refactor Strateji Seçenekleri

### Seçenek A: Muhafazakâr Temizlik (5–7 gün)

- `_make_*_provider`'ı kimlik bilgisi olmayan ayarlar için `_get_builtin` yerine `resolve()` çağıracak şekilde düzelt (~0.5 gün)
- DubVoice'u `CREDENTIAL_KEYS`'e ekle (~0.25 gün)
- `module.product_review.enabled`'ı `KNOWN_SETTINGS`'e ekle (~0.25 gün)
- OpenAI placeholder sessiz-düşürmeyi kaldır (ya net hatayla reddet ya da davranışı dokümante et) (~0.5 gün)
- Publish scheduler'ı `publish.scheduler.interval_seconds` ayarına bağla (~0.5 gün)
- Ölü kodu sil (`YouTubeCallbackPage`, `tts_preview_router`, `brand_profiles_router`, `execution.workspace_root` dokümanı) (~0.5 gün)
- `frontend/src/api/client.ts` oluştur + 47 API dosyasını bunu kullanacak şekilde refactor et (~1.5 gün)
- SSE bağlantı kopması göstergesi ekle (~0.5 gün)
- 3 tanrı bileşeni çıkar (~1 gün, zaman-sınırlı)

**Kalanlar:** Surface Registry olduğu gibi, models.py monolit, KNOWN_SETTINGS monolit, yetim rotalar, `main.py` lifespan.
**Faydalar:** Tüm dürüstlük bug'ları düzeltildi; en büyük çoğaltma (API dosyaları) çöktü.
**Riskler:** Düşük.
**Önerilir eğer:** Ekibin bir haftası var ve yanıltıcı-geribildirim sınıfı bug'ları hızla ortadan kaldırmak istiyorsa.

### Seçenek B: Çekirdeği Koru, Kenarları Yeniden Yap (12–15 gün)

Seçenek A'daki her şey artı:

- `backend/app/db/models.py`'yi domain ile böl (~2 gün, yüksek risk — tüm import'ları etkiliyor)
- `backend/app/settings/known_settings.py`'yi `module_scope` ile böl (~1 gün)
- `backend/app/main.py` lifespan'i `bootstrap/*.py` modüllerine çıkar (~1 gün)
- Surface Registry'yi Canvas'ta dondur; Legacy/Horizon/Atrium/Bridge'i kodda + dokümanlarda sunset olarak işaretle (~1 gün)
- `useSurfacePageOverride`'ı deprecate et (kullanımda uyar, sunset tarihini dokümante et) (~0.5 gün)
- 10 yetim rotanın her biri için karar ver: nav'a ekle VEYA emekli et (~1 gün)
- `/admin/product-review` vs `/admin/modules/product-review` URL sapmasını çöz (~0.5 gün)
- Ayar öncelik entegrasyon testi ekle (~1 gün)
- Seçim için provider persistansı ekle (LLM/TTS/Visuals primary) (~1 gün)
- `useFormState` hook'u + formları migrate et (~2 gün)
- `useVisibility` → `useVisibilityMap` birleştir (~0.5 gün)
- Durum enum'larını frontend ↔ backend birleştir (~1 gün)

**Kalanlar:** çekirdek motor (dispatcher, pipeline, service, durum makineleri, provider registry, yayın iş akışı), tüm contract'lar, çalışan tüm iş mantığı.
**Faydalar:** Tüm sapma çözüldü; kod tabanı tekrar gözden geçirilebilir; ayar başına tek kaynak-gerçeklik.
**Riskler:** Orta — models.py bölünmesi birçok import'u etkiliyor; surface dondurma bir ürün kararı, yalnızca refactor değil.
**Önerilir eğer:** Ekip özellik döngüleri arasında 2–3 odaklı hafta ayırabilirse.

### Seçenek C: Kontrollü Yeniden Yazım

**Uygun değil.** Çekirdek doğru, kapsamlı test edilmiş (1215+ backend test, 2530 frontend test geçiyor) ve belirlenen her sorun 1-günlük bir düzeltme. Yeniden yazım 160+ iyi yapılandırılmış backend dosyasını, tam durum makinesi kütüphanesini ve test temelini kaybedecek — yüzey-seviyesi sapmaları çözmek için.

---

## 14. Önerilen Yol

### **Seçenek B: Çekirdeği Koru, Kenarları Yeniden Yap.**

**Neden:** Çekirdek motor sağlam ve çalışıyor. Sapma (1) frontend surface sınırında, (2) persistans monolitinde, (3) ayar monolitinde, (4) provider-ayar atlamasında. Dördü de dispatcher/pipeline/durum makinelerine dokunmadan düzeltilebilir.

**Operasyon sırası (önce → sonra):**

1. **Önce sessiz bug'ları düzelt** (Seçenek A credential + provider-resolver + placeholder düzeltmeleri). Bunlar bugün kullanıcıları yanıltanlar; her biri bir günden kısa sürüyor.
2. **API dosya çoğaltmasını öldür.** Tek `api/client.ts`, uniform hata işleme. Daha sonra tutarlı auth, retry, SSE yeniden-bağlanma için önünü açar.
3. **models.py'yi böl.** En yüksek yapısal kazanım; domain sahipliğini mümkün kılar.
4. **KNOWN_SETTINGS'i böl.** Kod incelemesi tekrar mümkün hale gelir.
5. **Surface Registry'yi dondur.** Ürün kararı: Canvas ileriye dönük surface, diğerleri sunset. Yeni override yazmayı durdur.
6. **Yetim rotaları çöz.** Her rota ya nav girişi ya da kaldırma commit'i alır.
7. **Lifespan çıkarma + provider persistansı + entegrasyon testleri.** Sertleştirme.

**Hemen dondur:** `contracts/state_machine.py`, `jobs/pipeline.py`, `publish/state_machine.py`. Bunlar doğruluk omurgası; bu çalışma sırasında dokunma.

**Düzeltilene kadar güvenme:** "Test Connection" butonları, kimlik bilgisi olmayan ayar kaydetme toast'ları, OpenAI placeholder işleme, DubVoice kaydetme, bağlantı kopması sırasında SSE-bağımlı görünümler.

**Herhangi bir refactor'dan önce:** backend test paketini çalıştır (temel), frontend `npx vitest run` (temel 2530 geçiyor / 35 atlanmış), 10 layout variantının hepsinin ekran görüntüsünü al, 10+ oluşturma formunu uçtan uca izle.

---

## 15. Sıralı Kurtarma Planı

### Faz 1: Sessiz-Bug Düzeltmeleri (Gün 1–2)
1. `_make_llm_provider` / `_make_tts_provider` / `_make_visuals_provider` → kimlik bilgisi olmayan ayarlar için `resolve()` kullan
2. DubVoice'u `CREDENTIAL_KEYS`'e ekle; her sağlayıcıyı simetrik okuma/yazma için denetle
3. `module.product_review.enabled`'ı `KNOWN_SETTINGS`'e ekle
4. OpenAI placeholder sessiz-düşürmeyi kaldır (net hata yüzeye çıkar)
5. Publish scheduler'ı `publish.scheduler.interval_seconds`'a bağla VEYA ayarı sil
6. Ölü kodu sil: `YouTubeCallbackPage`, `tts_preview_router`, `brand_profiles_router`, `execution.workspace_root` dokümanı
7. Tam test paketini çalıştır; temeli kaydet

### Faz 2: Frontend Çoğaltma Çökerme (Gün 3–4)
8. fetch wrapper, URL builder, auth header, hata normalizasyonu ile `frontend/src/api/client.ts` oluştur
9. 47 `api/*.ts` dosyasını bunu kullanacak şekilde refactor et
10. "Test Connection"ı her sağlayıcı için gerçek 1-hop ping yapacak şekilde düzelt
11. SSE bağlantı kopması göstergesi + "yeniden bağlanılıyor…" etiketi ekle

### Faz 3: Backend Yapısı (Gün 5–7)
12. `backend/app/db/models.py`'yi domain ile böl (jobs, publish, youtube, templates, sources, news, visibility, assets)
13. `backend/app/settings/known_settings.py`'yi `module_scope` ile böl
14. `backend/app/main.py` lifespan'i → `bootstrap/providers.py`, `bootstrap/credentials.py`, `bootstrap/modules.py`, `bootstrap/scheduler.py` çıkar
15. Ayar öncelik entegrasyon testi ekle (DB admin → DB default → `.env` → builtin)

### Faz 4: Surface Dondurma (Gün 8–9)
16. Ürün kararı kaydedildi: Canvas = ileriye dönük surface; Legacy/Horizon/Atrium/Bridge = sunset
17. `useSurfacePageOverride`'da deprecation uyarıları
18. 10 layout variantının hepsinin ekran görüntüsünü regresyon temeli olarak al
19. Sunset tarihini `docs/surface-sunset.md`'de dokümante et

### Faz 5: Yetim Rotalar + URL Sapması (Gün 10)
20. 10 admin yetim rotasının her biri için: nav girişi ekle veya kaldırma commit'i yap
21. `/admin/product-review` vs `/admin/modules/product-review`'ı çöz — birini seç, diğerini yönlendir
22. `/user/publish`'i içerik akışına birleştir veya emekli et

### Faz 6: Tanrı Bileşen Çıkarma (Gün 11–12)
23. `ThemeRegistryPage`'i → `ThemePreviewPanel`, `ThemeImportForm`, `ThemeExportButton` çıkar
24. `EffectiveSettingsPanel`'i → `SettingRow`, `SettingGroup`, `AutoSaveIndicator` çıkar
25. `CredentialsPanel`'i → `ApiKeyField`, provider-başına alan bileşenleri çıkar
26. `ContentCreationWizard`'ı `useWizardConfig` üzerinden bağla

### Faz 7: Desen Birleştirme (Gün 13–14)
27. `useFormState` hook'u oluştur; 10+ formu migrate et
28. `useVisibility` → `useVisibilityMap` birleştir
29. Durum enum'larını frontend ↔ backend paylaşımlı codegen veya elle bakılan eşlik dosyası ile birleştir
30. LLM/TTS/Visuals primary seçimi için provider persistansı ekle

### Faz 8: Son Doğrulama (Gün 15)
31. Tam backend test paketi (hedef ≥ 1215 geçiyor)
32. Tam frontend test paketi (hedef ≥ 2530 geçiyor)
33. Uçtan uca iz: video oluştur → iş → yayın → denetim logu
34. Git checkpoint; tag `audit-2026-04-16-complete`

---

## 16. Nihai Karar

**"Çekirdeği koru, gerisini yeniden yap."**

### 5 Somut Neden

1. **Çekirdek doğru ve test edilmiş.** Dispatcher, pipeline, durum makineleri (işler + yayın), fallback'li provider registry, modül registry, visibility engine, analytics aggregation — hepsi uçtan uca operasyonel olarak izlendi. 1215+ backend test, 2530 frontend test geçiyor. Bunlar yeniden yazılmaz; korunur.

2. **Sapma lokalize ve sayılabilir.** 4 sessiz-bug sınıfı (provider resolver atlama, DubVoice yazma yolu, OpenAI placeholder düşürme, Test Connection varlık kontrolü), 3 yapısal monolit (models.py, KNOWN_SETTINGS, lifespan), 1 takılabilirlik aşırı-büyümesi (Surface Registry), 10 yetim rota, 1 URL sapması, 1 çift oluşturma yolu. Her kalemin 1–2 günlük düzeltmesi var. Hiçbiri yeniden tasarım gerektirmiyor.

3. **Yanıltıcı-geri bildirim bug'ları gerçek acil durum.** `llm.model`'i kaydedip "kaydedildi" gören ama eski davranışı alan kullanıcı, net bir hata gören kullanıcıdan daha kötü. Aynısı DubVoice kaydetmeleri, OpenAI placeholder ve "Test Connection" için. Bunlar bugün operatör güvenini sarstığı için Faz 1 olmak zorunda.

4. **Surface Registry dondurma teknik değil, ürün kararı.** Teknik borç gerçek — 10 layout dosyası, 13 sayfa override, iki render yolu — ancak çözüm "Canvas'ı seç, gerisini sunset et, override yazmayı durdur", bu bir ürün kararı. Kod zaten bunu temiz bir şekilde destekliyor.

5. **Her bağımlılık yerini hâlâ hak ediyor.** Şişkinlik yok. Spekülatif soyutlama yok. Her paket, her registry, her servis somut operasyonel gereksinimlere hizmet ediyor. Yeniden yazım aynı şekli 3–6 aylık çalışmayla yeniden üretir ve sıfır test kapsamından başlar.

---

*Denetim raporu sonu — 2026-04-16.*
