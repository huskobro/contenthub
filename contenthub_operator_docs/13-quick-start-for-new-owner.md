# 13 — Quick Start for New Owner

Bu dosya ContentHub'ı yeni devralan biri için **1 saatlik** öğrenme yoludur. Proje dosyalarını ve kodu aynı zamanda da okumana gerek yok — bu seti okumakla sistemi çalıştırabilir hale gelirsin.

---

## Sen kimsin?

Bu rehber sana uygun:
- ContentHub'ı ilk kez devralıyorsun
- Kod tabanının tamamını okumaya vaktin yok
- "Bu sistem ne yapıyor?" ve "Hangi menü ne işe yarar?" sorularına hızlı cevap istiyorsun
- 1 saat içinde sistemle çalışır hale gelmek istiyorsun

---

## 1. saat içinde ne öğreneceksin?

- ContentHub'ın ne yaptığı
- Admin ve user panelinin farkı
- Surface ve theme kavramı
- Job engine + publish akışı
- Günlük operasyon rutini
- Kritik kurallar (snapshot-lock, review gate, visibility)

---

## Okuma sırası (60 dakika)

### Dakika 0-10 — `01-system-overview.md`
- Sistemin ne yaptığı + neyi çözdüğü
- Ana kavramlar (Panel, Surface, Theme, Module, Job, PublishRecord, ...)
- Yedi temel altyapı
- Stack özeti
- Sistemin ne olmadığı

### Dakika 10-20 — `02-information-architecture.md`
- Admin panelin tam hiyerarşisi
- User panelin tam hiyerarşisi
- Panel / Surface / Theme geçişlerinin nerede yapıldığı
- Modül bazlı menü filtresi
- Visibility bazlı menü filtresi

### Dakika 20-30 — `05-surfaces-themes-and-panel-switching.md`
- Surface ve theme'in farkı
- 5 surface'ın (Legacy / Horizon / Bridge / Canvas / Atrium) karakteri
- Default surface stratejisi
- Panel geçişi

### Dakika 30-40 — `06-core-domain-model.md`
- User → ChannelProfile → ContentProject → Job → PublishRecord ilişkisi
- Job state machine
- Publish state machine (Review Gate önemli)
- Settings, Visibility Rule, Provider entity'leri

### Dakika 40-50 — `07-key-workflows.md`
- Video oluşturma akışı
- Bülten oluşturma akışı
- Publish akışı (Review Gate)
- Job izleme akışı
- Haber akışı (Source → News → Bulletin)

### Dakika 50-60 — `11-current-capabilities-vs-partial-areas.md`
- Hangi alanlar tam, hangileri partial
- Şu an çalışan durum
- Kalan teknik borç
- Phased delivery listesi

---

## İlk saatte hafızana almanın şart olduğu 10 şey

### 1. Panel ve surface ayrı kavramlardır
Panel = yetki alanı (admin / user). Surface = görsel kabuk (Legacy / Horizon / Bridge / Canvas / Atrium). Birini değiştirmek diğerini otomatik değiştirmez.

### 2. Job snapshot-lock edilir
Bir job başladığında template + blueprint + settings o anki haliyle JSON olarak kopyalanır. Setting değişse bile çalışan job etkilenmez. Bu CLAUDE.md'nin non-negotiable kuralıdır.

### 3. Review Gate bypass edilemez
PublishRecord asla `draft → published` doğrudan geçemez. `review_pending → approved → scheduled/publishing → published` sırası zorunludur. Kod içinde enforce edilir.

### 4. Settings Registry tek doğruluk kaynağıdır
Prompt'lar, threshold'lar, default'lar, provider credential'ları — hepsi Settings Registry'dedir. Kod içinde string literal prompt veya hardcoded config olmayacak.

### 5. Visibility server-side enforce edilir
Client-side visibility sadece UX içindir. Hidden field'lar API response'tan da çıkarılır. Client asla güvenlik katmanı değildir.

### 6. Her provider'ın fallback sırası vardır
LLM / TTS / image / speech — her kategoride priority sırasıyla birden fazla provider bulunur. İlk fail olursa otomatik fallback.

### 7. Used News dedupe ledger'ı kritiktir
Bir haber aynı kanalda iki kez kullanılamaz (hard dedupe). Bu ledger news_bulletin modülünün güvenlik ağıdır.

### 8. Default surface stratejisi
- Admin panelde Bridge (operasyon)
- User panelde Atrium (editoryal)
- Kullanıcı istediği zaman `/user/settings`'den değiştirebilir

### 9. Job Detail kuzey yıldızıdır
Bir operasyonel sorunda ilk bakılacak yer `/admin/jobs/:jobId`. Overview + timeline + logs + artifacts + provider trace + decision trail hepsi bu tek sayfada.

### 10. Audit log kritik değişiklikleri takip eder
Settings, Visibility, Users, Publish manual override, Template/Blueprint CRUD — hepsi audit_log'a yazılır. `/admin/audit-logs`.

---

## Hızlı glossary (tam sözlük için `14-glossary.md`)

- **Panel** — admin veya user yetki alanı
- **Surface** — görsel kabuk (Legacy / Horizon / Bridge / Canvas / Atrium)
- **Theme** — renk paleti (12 hazır)
- **Module** — content module (`standard_video`, `news_bulletin`)
- **ContentProject** — kullanıcının başlattığı içerik projesi
- **Job** — pipeline'ı çalıştıran iş (state machine)
- **Job Step** — job içindeki deterministik adım (script/metadata/tts/subtitle/composition/render/publish)
- **Template** — içerik şablonu
- **Style Blueprint** — görsel stil kuralları
- **ChannelProfile** — kullanıcının yayın kanalı
- **PlatformConnection** — ChannelProfile'ın YouTube'a OAuth bağlantısı
- **PublishRecord** — bir içeriğin yayın kaydı (state machine)
- **Review Gate** — publish approve aşaması
- **Source** — haber kaynağı
- **NewsItem** — normalize edilmiş haber
- **Used News** — kullanılan haber dedupe ledger
- **Setting** — Settings Registry kaydı
- **Effective Setting** — merge edilmiş nihai değer
- **Visibility Rule** — panel/field/wizard görünürlük kuralı
- **Provider** — LLM/TTS/image/speech servisi

---

## Hızlı pathlary (nereye bakacağını bilmen gerekenler)

| Ne arıyorsun? | Nereye bakarsın? |
|---|---|
| Sistem ne yapıyor? | `01-system-overview.md` |
| Bir kullanıcı bir şey yapmıyor, neden? | `07-key-workflows.md` + `10-settings-visibility-and-governance.md` |
| Bir job neden takıldı? | `/admin/jobs/:jobId` (operasyonel) |
| Bir publish neden onaylanmadı? | `/admin/publish` + `09-buttons-actions-and-states.md` |
| Bir menü neden görünmüyor? | `10-settings-visibility-and-governance.md` → Visibility |
| Bir prompt değiştirmek istiyorum | `/admin/prompts` → Master Prompt Editor |
| Bir template düzenlemek istiyorum | `/admin/templates` + `06-core-domain-model.md` |
| Sistem omurgasını anlamak istiyorum | `06-core-domain-model.md` |
| Günlük rutine başlamak istiyorum | `12-operator-playbook.md` |
| Bir route ne işe yarıyor? | `08-page-by-page-reference.md` |
| Bir terim anlamadım | `14-glossary.md` |

---

## İlk gün yapılacaklar

### 1. Sistemi başlat
```
# Backend (FastAPI)
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload

# Frontend (Vite)
cd frontend && npm run dev
```

### 2. Login ol
- Admin credential ile `/login`
- `/admin` genel bakış sayfası açılmalı

### 3. Bir test job çalıştır
- `/user/create/video` veya `/user/create/bulletin`
- Test kanal + test topic
- Job başlat
- `/admin/jobs/:jobId`'de canlı izle

### 4. Publish akışını simüle et
- Job tamamlandıktan sonra user publish wizard
- Admin review board → approve
- Publish başarılı mı?

### 5. Sorun giderme provası
- Bir job'u manuel cancel et
- Retry mekanizmasını dene
- Rollback to step'i test et

---

## İkinci güne geçmeden önce

- [ ] Settings Registry'deki en az 3 setting'in anlamını biliyor musun?
- [ ] Visibility kuralı nasıl eklenir biliyor musun?
- [ ] Provider fallback sırasını nereden değiştireceğini biliyor musun?
- [ ] Job Detail'de provider trace'i okuyabiliyor musun?
- [ ] Bir user için Advanced Mode aktif etmek istesen ne yaparsın?
- [ ] Audit log nereden bakılır biliyor musun?
- [ ] Yeni bir haber kaynağı nasıl eklersin biliyor musun?

Cevapların hepsi "evet" ise devir tamam. Değilse ilgili dosyalara geri dön.

---

## Sonraki adım

- Günlük rutine başla → `12-operator-playbook.md`
- Spesifik menü için → `03-admin-panel-guide.md` veya `04-user-panel-guide.md`
- Governance için → `10-settings-visibility-and-governance.md`
