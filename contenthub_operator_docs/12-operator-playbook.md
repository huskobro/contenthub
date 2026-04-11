# 12 — Operator Playbook

Bu dosya ContentHub'ı günlük kullanan admin / operatör için somut bir rutin rehberidir. Sabah ilk önce neye bakılır, sorun çıktığında ne yapılır, nerede ne kontrol edilir.

---

## Sabah ilk kontrol (5 dakika)

Admin panele gir (`/admin`) → şunları sırayla kontrol et:

### 1. Genel Bakış KPI'ları
**Sayfa:** `/admin`

- Son 24 saatteki job sayısı
- Son 24 saatteki hata sayısı
- Aktif işler (şu an çalışan)
- Bekleyen review sayısı
- Provider hata oranı

**Kırmızı bayraklar:**
- Hata sayısı > normal baz çizgi
- Bekleyen review > 3-4 saatlik tampon
- Provider hata oranı > %5

### 2. Jobs Registry
**Sayfa:** `/admin/jobs`

- **HATA** bucket'ına bak — kaç job failed? Hepsi aynı step'te mi?
- **ÇALIŞIYOR** bucket'ı — normal miden uzun çalışan var mı?
- **KUYRUK** bucket'ı — birikmiş job var mı?

**Aksiyon:**
- Failed job varsa → job kokpitine gir → step log'unu incele
- Aynı step'te birden fazla failure → root cause analysis gerek

### 3. Publish Review Board
**Sayfa:** `/admin/publish`

- **REVIEW_PENDING** bucket'ındaki sayı — bekleyen user publish'i var mı?
- **FAILED** bucket'ındaki sayı — yayın hatası var mı?

**Aksiyon:**
- Review pending'leri sırayla gözden geçir: content preview → metadata → approve/reject
- Failed publish varsa → sebep incele (OAuth expired, metadata invalid, API quota)

### 4. Providers sağlığı
**Sayfa:** `/admin/providers`

- Her provider kartının **credential status**'unu gör
- **Metrics** bölümü → `Hata %` sütununa bak
- Fallback sırasını doğrula

**Aksiyon:**
- Credential `Eksik` veya `Hatalı` → yenile
- Hata oranı > %10 → provider geçici kapat, fallback sırasını değiştir

### 5. Source health
**Sayfa:** `/admin/sources`

- Source liste — `health` kolonu kırmızı mı?
- Son 24 saatte başarısız scan var mı?

**Aksiyon:**
- Failed source → test scan çalıştır
- Tekrarlı fail → source'u geçici disable et

---

## Haftalık kontrol (30 dakika)

### 1. Audit log gözden geçir
**Sayfa:** `/admin/audit-logs`

- Son 7 gün içindeki kritik değişiklikler
- Settings değişiklikleri uygun mu?
- Visibility kuralları değişmiş mi?

### 2. Settings sağlığı
**Sayfa:** `/admin/settings`

- Credential'lar güncel mi? Özellikle YouTube OAuth (token expire olur)
- Prompt'ların son versiyonları effectiv mi?
- Yeni setting önerileri audit log'da mı?

### 3. Template + blueprint versiyonları
**Sayfa:** `/admin/templates` + `/admin/style-blueprints`

- Deprecated versiyonlar var mı?
- Yeni versiyon gerektiren template var mı?
- Template-blueprint link kontrolü

### 4. User aktivitesi
**Sayfa:** `/admin/users`

- Aktif kullanıcı sayısı
- Son giriş tarihlerine bak
- Disabled kullanıcılar uygun mu?

### 5. Analytics trend
**Sayfa:** `/admin/analytics`

- Üretim trendi yukarı mı aşağı mı?
- Yayın başarı oranı nasıl?
- Modül dağılımı dengeli mi?

---

## Sorun giderme sırası

Bir kullanıcı "işim takıldı" diye geldiğinde:

### 1. Job Detail'e bak (ilk bakılacak yer)
**Sayfa:** `/admin/jobs/:jobId`

- **Current step** hangi adımda takılmış?
- **Step timeline**'da hangi step failed?
- **Error message** ne diyor?
- **Logs** panel'inde son entries'ı incele
- **Provider trace** — çağrı başarılı mıydı? Latency makul mu?
- **Decision trail** — hangi template snapshot kullanıldı?

### 2. Yaygın senaryolar

**Script step failed:**
- Provider trace → LLM çağrı başarılı mı?
- Prompt `news_bulletin.prompt.narration_system` (veya standard video karşılığı) uygun mu?
- Fallback provider denenmiş mi?

**TTS step failed:**
- TTS credential valid mi?
- Text çok mu uzun?
- Dil (language) ayarı doğru mu?

**Render step failed:**
- Remotion composition JSON valid mi?
- Artifact'lar mevcut mu?
- Workspace disk yeri var mı?

**Publish step / PublishRecord failed:**
- YouTube OAuth valid mi?
- Metadata validation (title length, tags count) geçti mi?
- Privacy setting uygun mu?

### 3. Retry stratejisi

- Tek step'te transient hata → `Retry step`
- Tüm pipeline etkilenmiş → `Retry job` (taze snapshot)
- Template/blueprint değişmesi gerekiyor → `Clone` + yeni template

### 4. Rollback ne zaman?

- Render bozuk ama composition iyi → `Rollback to composition`, tekrar render
- Script kabul edilemez → `Rollback to script`, prompt değiştir, `Retry job`

---

## Haber akışı operatör sorumlulukları

### Günlük
- `/admin/sources` → failed source var mı? Test scan çalıştır
- `/admin/source-scans` → scan log — yeni item sayıları normal mi?
- `/admin/used-news` → dedupe ledger büyüyor mu? (sağlıklı sistem için büyümeli)

### Haftalık
- Source trust level'ları doğru mu?
- Soft dedupe false positive oranı nasıl?
- Yeni haber kaynağı eklenmesi gerekiyor mu?

---

## Publish operatör sorumlulukları

### Günlük
- `/admin/publish` → REVIEW_PENDING bucket SLA'sı
- Review onay veya reject kararları (reason zorunlu)
- Scheduled publish takvimi kontrol

### Haftalık
- Failed publish pattern analizi
- YouTube quota kullanımı
- Playlist ve post entegrasyonu (eğer aktif)

---

## Settings operatör sorumlulukları

### Zaman zaman
- `/admin/settings` → Credentials tab → OAuth expire'larını yenile
- `/admin/prompts` → prompt performansı düşükse revize et
- Audit log'dan toplu değişiklik history'sini gör

### Kural
- Büyük bir prompt değişikliğinden önce test job başlat
- Kritik setting değişikliği audit log'a düşmeli
- Backup olarak yeni versiyon öncesi mevcut değeri not et

---

## Visibility operatör sorumlulukları

- Yeni user açıldığında default visibility rule'ları uygun mu?
- Read-only kısıtlamalar kullanıcıya bildirildi mi?
- Advanced Mode istiyen kullanıcıya visibility rule ekle

---

## Provider operatör sorumlulukları

### Günlük
- Credential sağlığı
- Error rate

### Aylık
- Fallback sırasını gözden geçir
- Cost trendi (kullanılan tokens × fiyat)
- Yeni provider eklenmesi gerekiyor mu?

---

## Kritik durumlarda acil protokol

### 1. Tüm job'lar failing
- Bir provider mı düştü? `/admin/providers` → hata oranı kontrol
- Database mi kilitli? Logları kontrol et
- Disk yeri mi doldu? Workspace path'e bak

### 2. Review backlog patlaması
- Toplu onay akışı devreye al (ama dikkatli — Review Gate bypass değil)
- User'a Guided Mode'a al diye öneri

### 3. YouTube OAuth toplu expire
- `/admin/settings` → Credentials → YouTube OAuth → re-authorize
- User'lara bildir (Notification Center)

### 4. Source scan toplu fail
- `/admin/sources` → health check
- Network / DNS sorunu mu? Manual URL source olan varsa kontrol et

---

## Kontrol listesi özeti

**Günlük (5 dk):**
- [ ] `/admin` KPI
- [ ] `/admin/jobs` HATA bucket
- [ ] `/admin/publish` REVIEW_PENDING
- [ ] `/admin/providers` credential + hata %
- [ ] `/admin/sources` health

**Haftalık (30 dk):**
- [ ] `/admin/audit-logs`
- [ ] `/admin/settings` credentials
- [ ] `/admin/templates` versiyonlar
- [ ] `/admin/users` aktivite
- [ ] `/admin/analytics` trend

**Aylık (60 dk):**
- [ ] Provider fallback sırası
- [ ] Cost trend analizi
- [ ] Template sprawl temizliği
- [ ] Source trust level revizyonu
- [ ] User Advanced Mode istek listesi

---

## Sonraki adım

- Yeni devralan için hızlı giriş → `13-quick-start-for-new-owner.md`
- Terim sözlüğü → `14-glossary.md`
- Her sayfa referans → `08-page-by-page-reference.md`
