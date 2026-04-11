# 07 — Key Workflows

Bu dosya ContentHub'ın ana iş akışlarını uçtan uca gösterir. Her akış: başlangıç, kritik adımlar, state değişimleri, kim ne yapar.

---

## 1. Video oluşturma akışı (Standard Video)

Kullanıcı bir standard video üretir.

### Adımlar

**1. Başlangıç**
- User panele girer (`/user`)
- `Projelerim` → `+Video` butonu VEYA `/user/create/video`

**2. Wizard — Kanal seçimi**
- Dropdown'dan bir ChannelProfile seç
- Yoksa: `Kanal Oluştur` CTA → ChannelProfile Wizard

**3. Wizard — Template + Blueprint seçimi**
- Modül `standard_video` için uygun Template'lerden seç (system + admin + kendi user template'leri)
- Style Blueprint seç — preview cards ile görsel stil seçimi
- Preview-first: blueprint seçimi metin değil preview artifact'larla yapılır

**4. Wizard — Topic + brief girdisi**
- Topic (zorunlu)
- Brief / talimatlar (opsiyonel)
- Hedef süre (opsiyonel)

**5. Wizard — Advanced opsiyonlar (Advanced Mode)**
- Prompt override (script prompt, metadata prompt)
- Provider seçimi (LLM / TTS / Image)
- Visibility kurallarıyla hangi alanların görüneceği belirlenir

**6. Onay**
- `Başlat` butonu → ContentProject (`draft` → `in_production`) + Job (`queued`) oluşur
- Kullanıcı Job Detail sayfasına yönlendirilir veya Projelerim'e dönebilir

**7. Job execution**
- Job queue'dan alınır → `running`
- Step'ler sırayla çalışır:
  1. `script` — LLM script üretir
  2. `metadata` — title/description/tags üretir
  3. `tts` — audio üretir
  4. `subtitle` — subtitle üretir
  5. `composition` — Remotion composition planlar
  6. `render` — Remotion final video render eder
  7. `thumbnail` — thumbnail üretir
- Her step'in state, elapsed, provider trace, log ve artifact'ı Job Detail'de görünür
- SSE ile gerçek zamanlı güncelleme

**8. Job tamamlama**
- Tüm step'ler başarılıysa Job `completed`, ContentProject `ready_for_publish`
- Bir step başarısız olursa Job `failed` → retry butonu aktif

**9. Review + Publish (bağlantılı akış)**
- User Publish akışına girer → PublishRecord `draft` → `review_pending`
- Admin review board'da `approved` veya `rejected` kararı verir
- `approved` → `scheduled` / `publishing` → `published`

### State değişim özeti

```
ContentProject: draft → in_production → ready_for_publish → published
Job:            queued → running → completed
JobStep:        queued → running → completed (her adım için)
```

---

## 2. Bülten oluşturma akışı (News Bulletin)

Kullanıcı haber kaynaklarından bir bülten oluşturur.

### Adımlar

**1. Başlangıç**
- `/user/create/bulletin` veya `Projelerim` → `+Bülten`

**2. Wizard — Kanal + dil + süre**
- ChannelProfile, hedef dil, hedef bülten süresi (ör. 5-10 dakika)

**3. Wizard — Kaynak seçimi**
- Source Registry'den hangi kaynaklar taransın? (RSS / manual URL / API)
- Default olarak kullanıcının daha önce kullandığı kaynaklar işaretli

**4. Wizard — Haber tarama**
- `Haberleri tara` butonu → on-demand SourceScan tetiklenir
- Yeni NewsItem'lar gelir
- Used News ledger'de işaretli olanlar **otomatik dışlanır** (hard dedupe)
- Soft dedupe uyarıları (benzer başlık, benzer içerik) sarı badge ile gösterilir

**5. Wizard — Haber seçimi**
- Aday haberlerden hangileri kullanılacak (default: hepsi veya top N)
- Sıralama (priority, recency, custom)
- Her haber için mini preview

**6. Wizard — Stil + template**
- Bülten Style Blueprint seç
- Bülten Template seç (lower-third, opener, closer, section transitions)

**7. Onay**
- `Başlat` → ContentProject + Job başlar
- Seçilen NewsItem'lar UsedNews ledger'ına işaretlenir (hard dedupe koruma)

**8. Job execution**
- News bulletin pipeline standard video'ya benzer ama:
  - `script` step news_bulletin.prompt.narration_system prompt'unu kullanır
  - `composition` step lower-third + section transitions ekler
  - Provider trace bülten spesifik LLM çağrılarını gösterir

**9. Review + Publish** — Standard Video ile aynı

### Dedupe koruması

- **Hard dedupe** — aynı external_id tekrar kullanılamaz
- **Soft dedupe** — benzer başlık/içerik (basic similarity) uyarısı
- **Kontrollü follow-up exception** — admin bir NewsItem'ı "reuse OK" olarak işaretleyebilir

Semantic dedupe v2'de.

---

## 3. Publish akışı (Review Gate)

İçerik tamamlandıktan sonra yayın akışı.

### Adımlar

**1. User yayına gönderir**
- `/user/publish` VEYA proje detayından `Yayına Gönder`
- Publish Wizard:
  - Metadata override (title, description, tags — defaults job metadata'dan)
  - Thumbnail seç
  - Privacy (`private` / `unlisted` / `public`)
  - Schedule (opsiyonel datetime)
- `Gönder` → PublishRecord `draft` → `review_pending`

**2. Admin review board'da inceler**
- `/admin/publish` → `REVIEW_PENDING` bucket'ına düşer
- Admin kartı açar → content preview + metadata + publish metadata inceler
- Aksiyonlar:
  - `Approve` → `approved` state (ReviewDecision `approved` kaydı)
  - `Reject` → `rejected` state (reason zorunlu)
  - `Send back` (opsiyonel) → `draft` state, user'a geri döner

**3. Scheduled veya publishing**
- `Approve` sonrası:
  - Eğer `scheduled_for` set edilmişse → `scheduled` state
  - Yoksa → `publishing` state hemen başlar
- Scheduled job'lar cron benzeri bir polling ile `publishing`'e geçer (cutover zamanında)

**4. Publishing execution**
- YouTube publish adapter çağrılır
- Video upload edilir
- Başarılıysa → `published`, `external_video_id` set edilir
- Başarısızsa → `failed`, retry açık

**5. Published sonrası**
- `external_video_id` ile YouTube linki açık
- Analytics akışı başlar (M34 backend tamamlandığında)

### Review Gate garantisi

PublishRecord asla `draft → published` doğrudan geçemez. Mutlaka `review_pending → approved` üzerinden geçmelidir. Bu kod içinde enforce edilir.

### State değişim özeti

```
draft → review_pending → approved → scheduled → publishing → published
                            ↓                                    ↓
                         rejected                              failed → (retry)
```

---

## 4. Job izleme akışı

Bir job'ın durumunu canlı izleme.

### Nereden izlenir?
- Admin: `/admin/jobs` → Jobs Registry → satır tıkla → `/admin/jobs/:jobId`
- User: `/user/projects/:projectId` → bağlı job linki → proje-scope job detail

### Canlı izleme nasıl çalışır?
- Frontend sayfası açıldığında SSE bağlantısı kurulur
- Job ve step state değişiklikleri SSE ile anlık gelir
- React Query cache invalidate edilir veya patch'lenir
- Timeline ve metrikler otomatik güncellenir

### Ne görünür?
- Job header: status, elapsed, ETA, current step, retry count
- Step timeline: her step state + elapsed + error
- Logs panel: log entries (step filtresi)
- Artifacts panel: üretilen dosyalar (tıklanabilir)
- Provider trace panel: LLM çağrıları + cost
- Decision trail: template snapshot, blueprint snapshot, settings snapshot

### Aksiyonlar
- `Retry step` — tek adım retry (sadece failed'da aktif)
- `Retry job` — tüm job retry
- `Cancel` — running job iptali
- `Rollback to step` — belirli bir adıma geri dön
- `Clone` — yeni job (yeni retry context)
- `Go to publish` — publish record'a bağlantı

---

## 5. Haber akışı (Source → News → Bulletin)

Haber kaynağından bültene giden tam akış.

### Adımlar

**1. Admin Source ekler**
- `/admin/sources` → `Yeni kaynak ekle`
- Tip (rss / manual URL / API), URL, dil, trust level, scan mode
- `Test scan` ile smoke test
- Enable

**2. Tarama yapılır**
- Admin `Scan now` tetikler VEYA
- `scan_mode: auto` ise scheduler periyodik tarama yapar
- SourceScan kaydı oluşur: fetched / new / duplicate sayıları

**3. NewsItem'lar normalize edilir**
- Her haber için `title`, `summary`, `body`, `published_at`, `url` çıkartılır
- `external_id` ile dedupe edilir (aynı source × aynı external_id tekrar gelmez)

**4. User bülten wizard'ına girer**
- `/user/create/bulletin`
- Kaynak seçiminde admin'in enable ettiği kaynaklar görünür
- `Haberleri tara` → taze NewsItem listesi
- UsedNews ledger'de olan haberler otomatik dışlanır

**5. Bülten üretilir**
- Seçilen haberler UsedNews'e eklenir
- Bulletin job çalışır
- Script step tüm seçilen haberleri single narration'a entegre eder

**6. Yayın sonrası**
- Bulletin yayınlandığında UsedNews kaydı kalıcılaşır
- Aynı haberler bir daha otomatik olarak gösterilmez (hard dedupe)

---

## 6. Onboarding akışı (yeni kullanıcı)

Yeni bir kullanıcı ilk girişte ne yapar?

### Adımlar

**1. İlk giriş**
- Admin bir user oluşturur (`/admin/users` → `Yeni kullanıcı`)
- User kendi credential'ı ile login olur

**2. Onboarding wizard**
- Mod seçimi (Guided / Advanced)
- İlk ChannelProfile oluşturma (brand name, slug, default language, logo)
- YouTube OAuth bağlantısı (opsiyonel ama önerilir)
- Surface tanıtımı — default Atrium, ama "yüzey değiştirebilirsin" bilgisi

**3. İlk proje**
- Onboarding'in sonunda CTA: "İlk videonu / bülteninü oluştur"
- Video Wizard veya Bulletin Wizard'a giriş

### Onboarding'in durumu
Onboarding wizard yapısı mevcut. İlk-giriş tetikleyici v1.

---

## 7. Wizard governance akışı (admin)

Admin kullanıcıya hangi wizard adımlarının gösterileceğini belirler.

### Adımlar

**1. Admin `/admin/wizard-settings`'e girer**

**2. Wizard seçer** (ör. Video Wizard)

**3. Step listesi gösterilir** — her step için:
- `visible` toggle
- `read_only` toggle
- Default value override
- User override allowed?

**4. Kayıt** — Settings Registry'ye yazılır

**5. User wizard'a girdiğinde** — server-side visibility kontrolü yapılır → ilgili step gizlenir veya read-only gösterilir

---

## 8. Retry + rollback + clone akışı

Bir job başarısız olduğunda veya tekrar çalıştırılması gerektiğinde.

### Retry job
- Job Detail'de `Retry job` → yeni Job aynı ContentProject için başlatılır, snapshot'lar taze alınır (yeni settings ile)
- Orijinal job'ın history'si korunur (retry_count++ değil, yeni job)

### Retry step
- Sadece failed step'i yeniden çalıştırır
- Diğer step'lerin artifact'ları korunur
- Pipeline step order sağlandığı sürece çalışır

### Rollback to step
- Belirli bir adıma kadar olan artifact'ları koruyarak sonraki adımları invalidate eder
- Yeniden çalıştırma için kullanılır (ör. composition'ı değiştir ve render'dan devam)

### Clone
- Yeni ContentProject + yeni Job, orijinal proje referans alınarak oluşturulur
- Tamamen bağımsız bir dallanma

---

## 9. Settings değiştirme akışı (admin)

Admin bir setting değeri değiştirdiğinde ne olur?

**1. Admin `/admin/settings`'e girer**

**2. Setting'i bulur** (tab içinde veya Prompt Editor'de)

**3. Yeni değer girer → `Kaydet`**

**4. Audit log kaydı oluşur**

**5. Yeni effective snapshot** sonraki job'lara uygulanır

**6. Çalışan job'lar değişmez** (snapshot-lock)

**7. Eğer `visible_in_wizard=true`** ise wizard UI'ı da güncellenir (SSE + React Query invalidate)

---

## 10. Visibility kuralı değiştirme akışı (admin)

**1. Admin `/admin/visibility`'ye girer**

**2. Kural ekler veya mevcut kuralı düzenler**

**3. Kaydet**

**4. Server-side yeni kural uygulanır** — SSE ile client'ların visibility manifest'i invalidate edilir

**5. İlgili kullanıcı sayfayı yenilediğinde** (veya SSE ile otomatik) yeni görünürlük uygulanır

---

## Sonraki adım

- Her sayfa için tek satır referans → `08-page-by-page-reference.md`
- Her buton + state + action → `09-buttons-actions-and-states.md`
- Governance detayı → `10-settings-visibility-and-governance.md`
- Günlük admin rutini → `12-operator-playbook.md`
