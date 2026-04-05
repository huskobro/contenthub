# M15 Hazirlik Notu

## M14 Sonrasi Durum Ozeti

M14 ile tamamlanan alanlar:
- Frontend visibility: route guard (10), read_only enforcement (4 edit yuzeyi), wizard step filtreleme (3)
- Template context: 5/8 executor consumer, 3 non-consumer belgelendi, 0 belirsiz
- YouTube Analytics: yerel snapshot trend, scope siniri belgelendi
- Test debt: pre-existing failure kapandi (1063 passed, 0 failed backend)
- Frontend: 2129 passed, 0 failed, tsc --noEmit 0 hata

## M15 Icin Oncelikli Alanlar

### 1. Audit Log Sistemi

**Mevcut durum**: CLAUDE.md'de "audit logs" admin panel gereksinimlerinde listeleniyor. Henuz uygulama yok.

**Gerekli isler**:
- AuditLog modeli (who, what, when, target_type, target_id, old_value, new_value)
- Otomatik kayit: settings degisiklikleri, visibility rule degisiklikleri, credential degisiklikleri, publish islemleri
- Admin panelinde audit log goruntusu
- Filtreleme: tarih araligi, islem tipi, kullanici

**Risk**: Retrofit edilmesi gerekiyor — mevcut save/update endpoint'lerine audit kaydi eklenmeli.

### 2. Provider Trace Tamamlama

**Mevcut durum**: Job Detail sayfasinda provider trace bolumu var ancak executor'larin cogu yeterli trace bilgisi loglamiyor.

**Gerekli isler**:
- Her AI provider cagrisi icin: model, token kullanimi, sure, maliyet tahmini
- Provider hata detaylari (rate limit, token limit, API error codes)
- Trace bilgisinin step artifact olarak kaydedilmesi
- Job Detail'de provider trace goruntuleme

### 3. Style Blueprint V1

**Mevcut durum**: Style Blueprint modeli CLAUDE.md'de tanimli. Template sistemi mevcut, blueprint entegrasyonu bekliyor.

**Gerekli isler**:
- StyleBlueprint DB modeli
- CRUD endpoint'leri
- Admin panel yonetim sayfasi
- Template → Blueprint baglantisi
- Blueprint kurallarina uygunluk kontrolu (render oncesi)

### 4. Snapshot Compaction

**Mevcut durum**: VideoStatsSnapshot tablosu buyuyebilir (her sayfa ziyaretinde birikiyor).

**Gerekli isler**:
- Eski snapshot'lari gunluk/haftalik ozete donusturme
- Compaction job'i veya periyodik temizlik
- Snapshot retention politikasi (ornek: son 30 gun detayli, oncesi gunluk ortalama)

### 5. Scheduler-Tabanli Snapshot

**Mevcut durum**: YouTube stats snapshot'lari yalnizca kullanici sayfayi ziyaret ettiginde birikiyor.

**Gerekli isler**:
- Periyodik snapshot job'i (ornek: her 6 saatte)
- Job engine uzerinden calistirilabilir veya basit asyncio task

## Operasyonel Kontrol Listesi

### Pre-M15 Dogrulama
- [ ] Backend: 1063+ test passed, 0 failed
- [ ] Frontend: 2129+ test passed, 0 failed
- [ ] tsc --noEmit: 0 hata
- [ ] Git: tum M14 degisiklikleri committed ve pushed
- [ ] Alembic migration chain: tutarli (video_stats_snapshots tablosu mevcut)

### Bilinen Teknik Borc (M14 devri)
1. `test_m7_c1_migration_fresh_db`: System Python/venv uyumsuzlugu nedeniyle basarisiz — Alembic migration testi icin venv icinde calistirma gerekiyor
2. YouTube Analytics API scope: Demographics, watch time, retention icin ek OAuth scope gerekli — kullanici yeniden yetkilendirmesi gerektirir
3. Wizard step default: `wizardVisible` default false — admin visibility rule ile acilmasi gerekiyor; rule yoksa adimlar gizli kalir

### Mimari Uyarilar
- Audit log retrofit yapilirken mevcut endpoint'leri bozmamak icin middleware veya decorator pattern onerilir
- Style Blueprint eklenmeden once Template sistemiyle entegrasyon noktalarini net tanimlamak gerekir
- Scheduler eklemek in-process async job queue ile cakisma riski tasir — dikkatli tasarim gerekir

## Oneri

M15 icin en yuksek degerli ilk adim **Audit Log sistemi**dir. CLAUDE.md'de acikca gereksinim olarak listeleniyor, operational truth/visibility felsefesiyle dogrudan uyumlu, ve diger tum modullerin (settings, visibility, credentials, publish) uzerine eklenebilir yapisal bir katman.
