# M11 Kalan Açıklar — M12'ye Devir Listesi

## Kritik Açıklar

### 1. Visibility Enforcement (Yüksek Öncelik)
- `require_visible()` dependency tanımlı ama sıfır route'a uygulanmış
- Frontend /resolve endpoint'ini çağırmıyor
- Hiçbir admin veya user route'unda backend visibility guard yok
- M12-A kapsamında kapatılmalı

### 2. 3 Unwired Setting (Orta Öncelik)
- `provider.whisper.model_size`: Whisper provider codebase'de var ama kayıtlı değil
- `execution.render_still_timeout_seconds`: render_still.py hardcoded sabit kullanıyor
- `publish.youtube.upload_timeout_seconds`: YouTube adapter hardcoded timeout kullanıyor
- M12-B kapsamında kapatılmalı

### 3. Template Context Dar Kapsam (Orta Öncelik)
- Sadece CompositionStepExecutor template context okuyor
- 7 diğer executor template context'ten habersiz
- content_rules ve publish_profile yükleniyor ama hiçbir yerde kullanılmıyor
- M12-C kapsamında kontrollü genişleme yapılmalı

## Orta Öncelikli Açıklar

### 4. Template Context Test Eksikliği
- resolve_template_context() için test yok
- Pipeline template context aktarım testi yok
- Composition executor pozitif template context testi yok

### 5. AdminOverviewPage Durum Etiketleri
- "gorunurluk runtime resolver + guard aktif" ifadesi yanıltıcı
- Guard tanımlı ama aktif değil, düzeltilmeli

## Düşük Öncelikli Açıklar

### 6. Pre-existing Test Sorunları
- test_g_avg_production_duration_exact: timing precision drift
- m7_c1 migration testleri: Alembic migration test hataları
- Bunlar M11 regresyonu değil, eski sorunlar
