# 03 — Admin Panel Guide

Bu dosya admin panelinin tam rehberidir. Her menü bölümü, her sayfa tek tek — amaç, ne görünür, ana bölümler, butonlar, detay panelleri, durum.

Durum etiketi: **tam** = operasyonel / **büyük ölçüde hazır** = küçük pürüzler / **partial** = iskelet var, tüm akışlar tamamlanmamış / **shell** = placeholder / **planlı** = henüz yazılmamış.

---

## /admin — Genel Bakış

**Ad:** Yönetim Paneli
**Route:** `/admin`
**Surface:** Legacy / Horizon / Bridge (Bridge'de rafine operasyon dashboard)
**Amaç:** Tek sayfada sistem durumu — KPI'lar, operasyonel sağlık, son işler, hızlı erişim.

**Ana bölümler:**
- **Filtre barı** — tarih aralığı, kullanıcı, kanal, platform filtreleri
- **8 KPI kartı** — toplam işler, tamamlanan işler, hata oranı, yayınlanan, bekleyen review, aktif kullanıcı, provider hata oranı, ortalama üretim süresi
- **Grafik paneli** — Günlük Üretim Trendi, Modül Dağılımı, Platform Yayın Dağılımı, Yayın Başarı Trendi
- **Operasyonel Durum** — provider sağlığı, SSE durumu, job queue derinliği
- **Son İşler** — en son 10 job (durum + modül + yaş)
- **Hızlı Erişim** — Jobs Registry, Publish Review Board, Settings, Providers kısayolları

**Durum:** **tam.** Round 2 + final acceptance'ta doğrulandı.

---

## /admin/settings — Ayarlar

**Ad:** Ayarlar / Settings Registry
**Route:** `/admin/settings`
**Surface:** Legacy / Horizon / Bridge
**Amaç:** KNOWN_SETTINGS listesindeki tüm setting'leri görüntüleme + düzenleme + effective değer izleme.

**Ana bölümler (tab'lar):**
- **Genel** — text/number/bool/select tipindeki setting'ler, kategori bazlı grupladı
- **Kimlik Bilgileri (Credentials)** — Provider credential'ları: LLM anahtarları (Kie AI, Gemini), TTS, Image (Pexels, Pixabay), Speech, YouTube OAuth. Credential durumu + `Yapılandırıldı / Eksik` badge + test butonu + değiştir butonu + doğrula butonu.
- **Prompts (Master Prompt Editor)** — type:`prompt` setting'ler (`{module}.prompt.{purpose}`). News bulletin narration system, script pipeline, metadata generator vb.
- **Wizard Ayarları** — wizard step'lere bağlı parametreler (adım sayısı, default değerler, gizleme kuralları)

**Butonlar:**
- `Kaydet` — setting değerini günceller (audit log kaydı + settings snapshot revizyonu)
- `Varsayılana Dön` — default_value'ya reset
- `Test Et` (credential'larda) — provider smoke test
- `Doğrula` / `Değiştir` (credential'larda) — rotate / replace

**Üst akış:** Setting değişiklikleri **yeni job'lara** uygulanır. Çalışan job'lar kendi snapshot'ına kilitlidir (settings snapshot-lock).

**Durum:** **büyük ölçüde hazır.** Kimlik Bilgileri tab'ında ASCII-only Türkçe metin pürüzü final acceptance raporunda kaydedildi (polish seviyesi).

---

## /admin/visibility — Görünürlük

**Ad:** Görünürlük (Visibility Engine)
**Route:** `/admin/visibility`
**Surface:** Legacy / Horizon / Bridge
**Amaç:** Panel / widget / field / wizard step görünürlük kurallarını yönetmek.

**Ana bölümler:**
- **Kural listesi** — `key` (ör. `panel:publish`) → `audience` (ör. `user`, `role:admin`, `user:username`) → `visible` (true/false) → `read_only` → `notes`
- **Test fixture toggle** — `Test verisini göster` ile test fixture'ları dahil et
- **Empty state** — `Henüz ürün kuralı yok (test fixture'lar gizli)` + `İlk kuralı ekleyin` CTA

**Butonlar:**
- `Yeni kural ekle`
- `Düzenle` (inline)
- `Sil`
- `Kopyala`

**Üst akış:** Visibility server-side enforce edilir. Bir kuralın `visible=false` olması client'ta da nav öğesini gizler. Kural bypass edilemez.

**Durum:** **tam.**

---

## /admin/wizard-settings — Wizard Ayarları

**Ad:** Wizard Ayarları
**Route:** `/admin/wizard-settings`
**Amaç:** Video Wizard ve Bulletin Wizard'ın step-by-step konfigürasyonu — hangi adım gösterilir, hangi default, hangi validation.

**Ana bölümler:**
- Wizard step listesi (module bazlı)
- Step başına visibility + read-only + default value + override izni

**Durum:** **partial.** Temel yapı var, tüm adımların governance'ı user panelinden bağlanmadı.

---

## /admin/jobs — İşler (Jobs Registry)

**Ad:** İşler / Jobs Registry
**Route:** `/admin/jobs`
**Surface:** Bridge'de "Registry" + Legacy/Horizon tablo
**Amaç:** Sistemdeki tüm job'ların operasyonel görünümü.

**Ana bölümler:**
- **Buckets** — `KUYRUK / ÇALIŞIYOR / İNCELEME / TAMAMLANDI / HATA` (state machine bazlı, count badge'li)
- **Tablo** — kolonlar: `DURUM / MODÜL / YAŞ / ADIM / HATA / İD`
- **Keyboard hint** — `↑↓ ile gez · Enter ile kokpit`
- **Filtreler** — status, modül, kullanıcı, tarih aralığı

**Butonlar:**
- Satır tıklanınca → `/admin/jobs/:jobId` job kokpitine gider
- `Retry` / `Cancel` (satır üzerinde, yetki kontrolüyle)

**Durum:** **tam.** Bridge surface'ında operasyonel ve oturmuş.

---

## /admin/jobs/:jobId — İş Kokpiti (Job Detail)

**Ad:** İş Kokpiti / Job Detail
**Route:** `/admin/jobs/:jobId`
**Surface:** Bridge
**Amaç:** Tek bir job'ın her şeyini tek sayfada sunmak.

**Ana bölümler:**
- **Üst metrik çubuğu** — JOB ID, MODÜL, ADIM, JOB GEÇTİ (elapsed), JOB ETA, RETRY
- **Step Timeline** — Her adım (script / metadata / tts / subtitle / composition / render / publish) için:
  - State (queued / running / completed / failed / skipped)
  - Elapsed time (ör. script 26sn, render 1dk 45sn)
  - Started/ended timestamp'leri
  - Hata mesajı
- **Operasyonel Aksiyonlar** — Retry, Cancel, Rollback to step, Clone
- **Yayın Bağlantısı** — Review Gate korundu mu, PublishRecord bağlantısı
- **Logs** — Sequential log entries (step bazlı filtre)
- **Artifacts** — Üretilen dosyalar (script.json, script_enhanced.json, metadata.json, subtitles.srt, final.mp4, thumbnail.jpg)
- **Provider Trace** — LLM çağrıları (örn. `kie_ai_gemini_flash + gemini-2.5-flash-openai, 1072 input tokens, 478 output tokens, 26567ms latency, $0.00045498 cost`)
- **Decision Trail** — hangi template, hangi blueprint, hangi settings snapshot kullanıldı
- **Retry History** — her retry'ın nedeni + sonucu

**Butonlar:**
- `Retry step` — sadece belirli bir adımı yeniden çalıştır
- `Cancel job`
- `Rollback`
- `Clone` — yeni job
- `Go to publish` — yayın merkezine bağlantı

**Durum:** **tam.** Kuzey yıldızı sayfa — CLAUDE.md Job Detail Requirements bölümüne uyumlu.

---

## /admin/audit-logs — Audit Log

**Route:** `/admin/audit-logs`
**Amaç:** Kritik operasyonların denetim kaydı (settings değişiklikleri, visibility rule düzenlemeleri, publish manual override, user yönetimi).

**Ana bölümler:** tablo (timestamp / aktör / kategori / key / eski değer / yeni değer)

**Durum:** **büyük ölçüde hazır.**

---

## /admin/modules — Modüller

**Route:** `/admin/modules`
**Amaç:** Hangi content modülünün aktif olduğunu yönetmek.

**Modüller:**
- `standard_video` — aktif
- `news_bulletin` — aktif
- `product_review` — planlı
- `educational_video` — planlı
- `howto_video` — planlı

Her modül için `module.{id}.enabled` toggle. Kapatıldığında ilgili nav öğeleri tüm surface'larda gizlenir.

**Durum:** **tam** (toggle mekanizması).

---

## /admin/providers — Sağlayıcılar

**Route:** `/admin/providers`
**Amaç:** LLM / TTS / Görsel / Konuşma Tanıma provider'larının credential + metrik + fallback yönetimi.

**Ana bölümler (gruplar):**
- **LLM** — Kie AI Gemini Flash, OpenAI Compatible, vb.
- **TTS** — Kie AI TTS, local TTS
- **Görseller** — Pexels, Pixabay
- **Konuşma Tanıma** — local_whisper

Her provider kartında:
- Provider adı + durum (`Yapılandırıldı / Eksik / Hatalı`)
- Test butonu (ping smoke)
- Metrikler: `Çağrı / Hata / Hata %`
- `Varsayılan Yap` (fallback sırasında ilk sıraya al)
- `Credentials` butonu (Settings > Kimlik Bilgileri'ne götürür)

**Durum:** **tam.**

---

## /admin/prompts — Prompt Yönetimi

**Route:** `/admin/prompts`
**Amaç:** type:`prompt` setting'lerin merkezi editörü. Tüm modüllerin prompt'ları burada.

**Ana bölümler:**
- Prompt listesi (module_scope bazlı gruplu)
- Prompt editörü (monaco / textarea)
- Version history (her prompt'un önceki revizyonları)

**Örnek key'ler:**
- `news_bulletin.prompt.narration_system`
- `news_bulletin.prompt.script_pipeline`
- `standard_video.prompt.metadata_generator`

**Durum:** **büyük ölçüde hazır.**

---

## /admin/library — İçerik Kütüphanesi

**Route:** `/admin/library`
**Amaç:** Admin tarafından tüm kullanıcıların content project'lerinin görünümü.

**Durum:** **partial.** Liste + filtre var, derin operasyonel aksiyonlar eksik.

---

## /admin/assets — Varlık Kütüphanesi

**Route:** `/admin/assets`
**Amaç:** Sistem içindeki media asset registry — uploaded/curated visual assets.

**Durum:** **partial.**

---

## /admin/standard-videos — Standart Video

**Route:** `/admin/standard-videos`
**Amaç:** Standard Video modülüne bağlı içerik listesi (admin perspektifi).

**Not:** `module.standard_video.enabled=false` ise menü gizlenir.

**Durum:** **partial.**

---

## /admin/standard-videos/wizard — Video Wizard

**Route:** `/admin/standard-videos/wizard`
**Amaç:** Admin tarafında Standard Video oluşturma akışı (tipik olarak user panelinden yapılır, ama admin testing için kullanabilir).

**Durum:** **partial.**

---

## /admin/templates — Şablonlar

**Route:** `/admin/templates`
**Amaç:** Template Engine — Style Template, Content Template, Publish Template CRUD.

**Ana bölümler:** Template listesi (module + family + version), template detayı.

**Butonlar:** Yeni template, kopyala, versiyonla, deprecate.

**Durum:** **büyük ölçüde hazır.**

---

## /admin/style-blueprints — Stil Şablonları

**Route:** `/admin/style-blueprints`
**Amaç:** Style Blueprint CRUD — visual identity, motion style, layout, subtitle style, disallowed elements.

**Ana bölümler:** Blueprint listesi, detay sayfası (rules + preview strategy).

**Durum:** **büyük ölçüde hazır.**

---

## /admin/template-style-links — Şablon-Stil Bağlantıları

**Route:** `/admin/template-style-links`
**Amaç:** Template ↔ Blueprint binding kuralları.

**Durum:** **partial.**

---

## /admin/publish — Yayın Merkezi (Publish Review Board)

**Route:** `/admin/publish`
**Surface:** Bridge'de "Yayın Review Board"
**Amaç:** PublishRecord state machine'inin operasyonel gözlemi + review gate yönetimi.

**Ana bölümler:**
- **Bucket kolonları** — `DRAFT / REVIEW_PENDING / APPROVED / SCHEDULED / PUBLISHING / PUBLISHED / FAILED / REJECTED`
- Her kolonda: PublishRecord kartları (title, channel, module, state timestamp)
- Empty state her kolonda

**Butonlar:**
- `Approve` — review_pending → approved
- `Reject` — review_pending → rejected (reason zorunlu)
- `Schedule` — approved → scheduled (datetime picker)
- `Publish now` — approved → publishing
- `Retry` — failed → publishing
- `Rollback` — published → unpublished (YouTube v1: unlisted'a al)

**Üst akış:** Review Gate korunur — `published` state'ine sadece admin onayından sonra geçilir. CLAUDE.md'nin Publishing kuralı.

**Durum:** **büyük ölçüde hazır.** Bucket label'larında ASCII-only Türkçe pürüzü final acceptance raporunda kaydedildi.

---

## /admin/comments — Yorum İzleme

**Route:** `/admin/comments`
**Amaç:** Yayınlanan içeriklerin yorumlarını moderasyon için izlemek.

**Durum:** **partial / shell.**

---

## /admin/playlists — Playlist İzleme

**Route:** `/admin/playlists`
**Amaç:** YouTube playlist'lerin admin görünümü.

**Durum:** **partial / shell.**

---

## /admin/posts — Gönderi İzleme

**Route:** `/admin/posts`
**Amaç:** Community post / yayın öncesi post'ların görünümü.

**Durum:** **partial / shell.**

---

## /admin/analytics — Analytics

**Route:** `/admin/analytics`
**Amaç:** Platform Overview — tüm sistemin yayın + üretim + provider metrikleri.

**Durum:** **partial.** M34 analytics backend tamamlanınca zenginleşecek.

---

## /admin/analytics/youtube — YouTube Analytics

**Route:** `/admin/analytics/youtube`
**Durum:** **partial.**

---

## /admin/analytics/channel-performance — Kanal Performansı

**Route:** `/admin/analytics/channel-performance`
**Durum:** **partial.**

---

## /admin/sources — Kaynaklar

**Route:** `/admin/sources`
**Amaç:** Source Registry — RSS / manual URL / API kaynakları yönetimi.

**Ana bölümler:**
- Kaynak listesi (tip, URL, health, trust level, last_scan)
- Yeni kaynak ekle

**Butonlar:** Test scan, enable/disable, edit, delete.

**Durum:** **büyük ölçüde hazır.**

---

## /admin/source-scans — Kaynak Taramaları

**Route:** `/admin/source-scans`
**Amaç:** SourceScan log — her tarama çağrısının sonucu (kaç item, kaç yeni, kaç dedupe edildi).

**Durum:** **büyük ölçüde hazır.**

---

## /admin/news-bulletins — Haber Bültenleri

**Route:** `/admin/news-bulletins`
**Amaç:** News Bulletin modülüne bağlı bülten projelerinin admin görünümü.

**Durum:** **büyük ölçüde hazır.**

---

## /admin/news-items — Haber Öğeleri

**Route:** `/admin/news-items`
**Amaç:** Normalize edilmiş haber item'larının registry'si.

**Durum:** **büyük ölçüde hazır.**

---

## /admin/used-news — Kullanılan Haberler

**Route:** `/admin/used-news`
**Amaç:** Used News ledger — kullanılan haberleri işaretleyen dedupe tablosu.

**Ana bölümler:**
- Kullanılan haber listesi (haber item + kullanıldığı bulletin + tarih)
- Hard dedupe status

**Durum:** **büyük ölçüde hazır.**

---

## /admin/users — Kullanıcı Yönetimi

**Route:** `/admin/users`
**Amaç:** User CRUD, rol değiştirme, user başına setting override.

**Ana bölümler:**
- Kullanıcı listesi (username, rol, durum, son giriş)
- User detay drawer / sayfa
- Rol ve override paneli

**Butonlar:** Kullanıcı ekle, rol değiştir, disable, override ayarı.

**Durum:** **büyük ölçüde hazır.**

---

## /admin/themes — Tema Yönetimi

**Route:** `/admin/themes`
**Amaç:** Surface (shell) ve Theme (renk paleti) seçiminin admin tarafı. İki kavramı aynı sayfada net şekilde ayırır.

**Ana bölümler:**
- **BÖLÜM 1 · ARAYÜZ YÜZEYİ** — Legacy / Horizon / Bridge / Canvas / Atrium kartları. Her kart: surface adı, durum, versiyon, scope (admin/user/both), "Varsayılan yap" butonu.
- **BÖLÜM 2 · RENK TEMASI** — 12 tema kartı (Obsidian Slate, Horizon Midnight, Canvas Ivory, Atrium Paper, vb.). Her kart: tema adı, versiyon, preview swatch.
- **Theme Import** — ThemeManifest JSON yükleyerek yeni tema kaydı.

**Şu an aktif:**
- Surface: kullanıcıya göre (default: Atrium user, Bridge admin)
- Tema: Horizon Midnight v1.0.0 (Inter)

**Butonlar:** `Varsayılan Yap`, `Önizle`, `Import Theme`, `Düzenle`.

**Durum:** **tam.** Pedagoji ("yüzey ve tema bağımsızdır") net yazılı.

---

## Sonraki adım

- User panel rehberi → `04-user-panel-guide.md`
- Surface / theme farkı → `05-surfaces-themes-and-panel-switching.md`
- Her buton + action referansı → `09-buttons-actions-and-states.md`
- Settings / Visibility / Providers governance → `10-settings-visibility-and-governance.md`
- Günlük rutin → `12-operator-playbook.md`
