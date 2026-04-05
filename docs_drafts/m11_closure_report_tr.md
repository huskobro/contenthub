# M11 Kapanış Raporu

## M11'de Kesin Kapananlar

### 1. Settings Wiring (16/19)
16 ayar gerçek runtime consumer'a bağlı. Her biri main.py startup'ında resolve() ile okunuyor ve provider constructor'larına aktarılıyor. Kod yolu doğrulandı.

### 2. Audit Log Servisi
- `write_audit_log()` fonksiyonu 6 farklı call site'ta kullanılıyor
- Tüm call site'lar runtime'da erişilebilir durumda
- Kapsanan subsystem'ler: settings (2), visibility (2), publish service (1), publish scheduler (1)
- Never-raise, never-commit tasarımı üretim için uygun

### 3. Publish Scheduler
- `poll_scheduled_publishes()` background asyncio task olarak main.py lifespan'ında kayıtlı
- 60 saniye aralıkla scheduled publish'leri poll ediyor
- `trigger_publish()` state machine gate'li, audit log'lu
- Graceful shutdown lifecycle yönetimli

### 4. Analytics provider_error_rate
- Gerçek JobStep verisinden hesaplanıyor (script, metadata, tts, visuals step'leri)
- Placeholder/None değeri kaldırıldı
- Sıfıra bölme koruması mevcut

### 5. Dedupe Threshold
- `source_scans.soft_dedupe_threshold` settings resolver'dan okunuyor
- scan_engine.py → build_dedupe_context(soft_threshold=...) zinciri doğrulandı

### 6. Template Context Resolver
- `resolve_template_context()` fonksiyonu Template + TemplateStyleLink + StyleBlueprint zincirini yüklüyor
- dispatcher → pipeline → executor akışı çalışıyor

---

## M11'de Kısmen Aktif Ama Tam Enforcement Olmayanlar

### 1. Visibility Enforcement
- **Durum:** Altyapı hazır, uygulama yok
- `resolve_visibility()` fonksiyonu çalışıyor
- `require_visible()` FastAPI dependency tanımlı
- `/visibility-rules/resolve` endpoint mevcut
- **AMA:** `require_visible()` hiçbir route'a uygulanmamış. Sıfır route'ta gerçek guard var.
- Frontend `/resolve` endpoint'ini çağırmıyor
- **Hüküm:** "Enforced" demek yanıltıcı. Doğru ifade: "altyapı hazır, enforcement uygulanmamış"

### 2. Template/Style Runtime Kapsamı
- **Durum:** Sadece composition step tüketiyor
- 8 executor'dan yalnızca CompositionStepExecutor `_template_context` okuyor
- Okunan alanlar: template_id, template_name, template_version, link_role ve style_blueprint alt alanları
- subtitle_rules blueprint'ten composition_props'a merge ediliyor (tek aktif davranış)
- Script, TTS, visuals, subtitle, render, metadata, publish executor'ları template context'i okumuyor
- `content_rules` ve `publish_profile` resolver'da yükleniyor ama hiçbir yerde tüketilmiyor
- **Hüküm:** "Runtime bağlı" ama kapsamı dar. Doğru ifade: "composition step'te aktif, diğer step'lerde yok"

### 3. Template Context Test Kapsamı
- resolve_template_context() için dedicated test yok
- Dispatcher/pipeline template context aktarım testi yok
- Composition executor'ın template context okuma testi yok (MagicMock fix'i var ama pozitif test yok)

---

## M11 Sonrası M12'ye Devreden Açıklar

1. **3 unwired setting:** whisper.model_size, render_still_timeout, youtube.upload_timeout
2. **Visibility route-level enforcement:** require_visible() hiçbir route'ta kullanılmıyor
3. **Template context genişlemesi:** Sadece composition step tüketiyor
4. **Template context test kapsamı:** Sıfır dedicated test
5. **Frontend visibility entegrasyonu:** /resolve endpoint'i frontend'den çağrılmıyor

---

## Yanıltıcı Wired/Active İddiası Kalıp Kalmadığı

### Düzeltilmesi Gereken İfadeler

1. **M11 visibility raporunda:** "FastAPI guard dependency created and available for route-level enforcement" — bu doğru ama "enforcement" kelimesi yanıltıcı. Guard mevcut, enforcement yok.

2. **AdminOverviewPage'de:** "gorunurluk runtime resolver + guard aktif" — guard tanımlı ama aktif değil. Hiçbir route'a uygulanmamış.

3. **M11 final delivery report'unda:** "Visibility Enforcement" başlığı altında anlatılan içerik aslında "Visibility Infrastructure" — enforcement sözcüğü fazla iddialı.

### Doğru Olan İfadeler
- 16/19 settings wired: DOĞRU, her biri kanıtlandı
- Audit log 4 subsystem'de aktif: DOĞRU (aslında 6 call site, 4 subsystem)
- Scheduler aktif: DOĞRU, lifespan'da kayıtlı
- provider_error_rate gerçek: DOĞRU, JobStep verisinden hesaplanıyor

---

## Test-Only / Mock / Placeholder Temizliği Durumu

### Yapılan Temizlikler
- Python 3.9 `X | None` syntax hataları düzeltildi (4 test dosyası)
- MagicMock template context sorunu düzeltildi (isinstance guard)
- provider_error_rate None placeholder'ı kaldırıldı
- Settings wired flag'leri gerçekle eşleştirildi

### Kalan Bilinen Sorunlar
- `test_g_avg_production_duration_exact`: pre-existing timing precision drift
- m7_c1 migration testleri: pre-existing Alembic migration test hataları

---

## Nihai Hüküm

### ACCEPT WITH KNOWN GAPS

**Gerekçe:**
- 16/19 settings wiring doğru ve kanıtlanmış
- Audit log, scheduler, analytics gerçek runtime'da çalışıyor
- Template context akışı composition step'te doğrulanmış

**Bilinen Açıklar:**
- Visibility enforcement altyapı seviyesinde — hiçbir route'ta uygulanmamış
- Template context sadece 1/8 executor'da tüketiliyor
- 3 setting unwired (consumer yok veya parametrize edilmemiş)
- Template context resolver testi yok
- AdminOverviewPage'deki bazı durum etiketleri gerçeği biraz süslüyor

Bu açıklar M12'de kapatılacak.
