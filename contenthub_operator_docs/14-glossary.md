# 14 — Glossary

Bu dosya ContentHub'da geçen tüm önemli terimleri tek cümlede açıklar. Alfabetik sıralı.

---

## A

**Admin Panel** — `/admin/*` kökündeki yetki alanı; operasyonel gözlem ve yönetim için.

**Advanced Mode** — Kullanıcının tüm override'ları, prompt düzenlemelerini ve provider seçimini gördüğü mod.

**Artifact** — Bir job step'inin ürettiği dosya (script.json, audio.mp3, subtitles.srt, final.mp4, thumbnail.jpg vb.).

**Atrium** — User panel için editoryal surface; "Premium Media OS" kimliğine sahip (beta, user scope).

**Audit Log** — Settings, visibility, publish manual override gibi kritik değişiklikleri kaydeden denetim izi (`/admin/audit-logs`).

**AuthGuard** — Her route'a girişte rol ve auth kontrolü yapan frontend guard component'i.

---

## B

**Blueprint** → Style Blueprint.

**Bridge** — Admin panel için operasyon odaklı surface; Jobs Cockpit ve Publish Review Board kuzey yıldızı sayfaları (beta, admin scope).

**Bulletin** → News Bulletin.

---

## C

**Canvas** — User panel için proje merkezli, portfolio tabanlı surface (beta, user scope).

**ChannelProfile** — Kullanıcının yayın kanalı profili; brand name, slug, default language, platform bağlantıları.

**Command Palette** — `Cmd+K` / `Ctrl+K` ile açılan global hızlı navigasyon / action paneli.

**ContentProject** — Bir kullanıcının başlattığı içerik üretim projesi (bir modüle bağlı, birden fazla Job'a ev sahipliği yapabilir).

**Core Invariant** — Admin panelden kapatılamayan, kod içinde enforce edilen kural (state machine, security guard, pipeline order, validation).

---

## D

**Decision Trail** — Bir job'a uygulanan template, blueprint ve settings snapshot'larının izi.

**Dedupe** — Aynı haber / içeriğin iki kez kullanılmasını önleme mekanizması (hard + soft).

**Draft** — Taslak state (ContentProject veya PublishRecord için).

---

## E

**Effective Setting** — User override + admin value + default değerin merge edilmiş nihai hali.

**ETA** — Estimated Time to Arrival — bir job veya step'in tahmini bitiş süresi (historical average ile hesaplanır).

---

## F

**Fallback** — Bir provider çağrısı başarısız olduğunda aynı kategorideki bir sonraki priority provider'ın otomatik olarak denenmesi.

---

## G

**Guided Mode** — Wizard'ların basitleştirilmiş, teknik detaylar gizli olarak sunulduğu mod (yeni kullanıcılar için).

---

## H

**Hard Dedupe** — Aynı external_id / aynı kimlikle bir haberin ikinci kez kullanılmasının engellenmesi (kesin).

**Horizon** — Hem admin hem user panelde çalışan modern icon-rail + collapsible nav surface'ı (stable, both scope).

---

## I-İ

**In Production** — Bir ContentProject'in aktif olarak üretim pipeline'ından geçtiği state.

**İş Kokpiti** — Bridge surface'ındaki Job Detail sayfasının adı (`/admin/jobs/:jobId`).

---

## J

**Job** — Bir ContentProject'in pipeline'ını çalıştıran iş; state machine + step'ler + artifact'lar + snapshot'lar içerir.

**Job Engine** — Job'ları queue'layan, çalıştıran ve state machine'e göre yöneten in-process async sistem.

**Job Step** — Job içindeki tek deterministik adım (script / metadata / tts / subtitle / composition / render / publish).

---

## K

**KNOWN_SETTINGS** — Backend'de izin verilen tüm setting key'lerinin merkezi listesi; tanımlı olmayan key registry'ye yazılamaz.

---

## L

**Legacy** — En eski, en stable, klasik sidebar-header surface'ı (stable, both scope).

**localizeStatus** — Backend İngilizce state machine key'lerini (queued, running, ...) TR label'a çeviren frontend mapping.

---

## M

**Master Prompt Editor** — `/admin/prompts` sayfasındaki, type=`prompt` olan tüm setting'lerin merkezi editörü.

**Module** — Bir içerik tipi (standard_video, news_bulletin, product_review (planlı), vb.).

**module_scope** — Bir setting'in hangi modüle ait olduğunu belirten metadata.

---

## N

**News Bulletin** — Haber kaynaklarından normalize edilmiş haberlerden video bülten oluşturan modül.

**NewsItem** — Bir SourceScan'den normalize edilmiş tekil haber kaydı.

**Notification Center** — Kritik olayları kullanıcıya push eden global bildirim paneli (SSE bazlı).

---

## O

**Override** — Bir setting'in default değerinin user veya admin tarafından değiştirilmesi.

---

## P

**Panel** — Yetki alanı; admin veya user.

**Phased Delivery Order** — CLAUDE.md'de tanımlı, sistemin hangi sırada inşa edileceğini belirten 40 maddeli liste.

**Pipeline** — Bir job'un çalıştırdığı adımların deterministik sırası.

**PlatformConnection** — Bir ChannelProfile'ı YouTube'a (veya ileride başka platformlara) bağlayan OAuth connection kaydı.

**Preview-First UX** — Görsel kararların metin değil preview artifact'larla yapılmasını sağlayan ilke (CLAUDE.md).

**Prompt-type Setting** — Type'ı `prompt` olan Settings Registry kaydı; prompt metni kod içinde değil burada tutulur.

**Provider** — Dış bir AI / TTS / image / speech servisi (ör. kie_ai_gemini_flash, pexels, local_whisper).

**Provider Trace** — Bir job içinde yapılan provider çağrılarının log'u (input/output tokens, latency, cost).

**PublishRecord** — Bir içeriğin bir platforma yayınlanma kaydı (state machine: draft → review_pending → approved → scheduled → publishing → published).

---

## Q

**Queued** — Job state'inde "henüz başlamadı, sırada" anlamına gelir.

---

## R

**React Query** — Server-synchronized data'nın client'ta yönetildiği library (jobs, settings, projects, vb.).

**Review Gate** — PublishRecord'un `published` state'ine geçmeden önce admin onayından geçmesi zorunlu olan kontrol noktası.

**Review Pending** — PublishRecord'un admin onayı beklediği state.

**Rollback** — Bir job'u belirli bir adıma geri döndürerek sonraki adımları invalidate etmek.

---

## S

**Section (nav)** — Admin nav'ındaki bölüm ayıracı (ör. "Sistem", "İçerik Üretimi", "Yayın").

**Setting** — Settings Registry'de tutulan bir config key.

**Settings Registry** — Tüm operatör-facing davranışın yönetildiği merkezi config sistemi.

**Setting Snapshot** — Bir job başlatıldığında embed edilen effective setting değerleri (snapshot-lock).

**Snapshot-lock** — Çalışan bir job'un kendi başlangıç snapshot'ıyla devam etmesi, runtime config değişikliğinden etkilenmemesi.

**Soft Dedupe** — Benzer başlık veya içerik için uyarı veren (ama bloklamayan) dedupe kontrolü.

**Source** — Haber kaynağı (RSS / manual URL / API).

**SourceScan** — Bir Source'un tek taramasının kaydı (fetched / new / duplicate sayıları).

**SSE** — Server-Sent Events; job progress + visibility invalidation + notification için kullanılan realtime kanal.

**Standard Video** — Klasik video üretim modülü (script → TTS → subtitle → composition → render → thumbnail).

**Style Blueprint** — Görsel stil kuralları (renk, motion, layout, subtitle stil, disallowed elements).

**Surface** — Panelin görsel kabuğu (Legacy / Horizon / Bridge / Canvas / Atrium).

**Surface Context** — Aktif surface bilgisini tüm alt component'lere yayılan React context.

**Surface Manifest** — Bir surface'in ID, scope, layout, override'larını tanımlayan TypeScript nesnesi.

---

## T

**Template** — İçerik üretim şablonu (Style Template / Content Template / Publish Template).

**Template Engine** — Template CRUD, versiyonlama ve snapshot-lock'u sağlayan sistem.

**Theme** — Renk paleti + tipografi (Obsidian Slate, Horizon Midnight, vb.).

**ThemeManifest** — Bir temanın JSON definition'ı (palette, typography, spacing).

---

## U

**Used News** — Kullanılan haberleri işaretleyen dedupe ledger.

**User Override** — Kullanıcının kendi setting'i için admin veya default değeri üzerine yazması.

**User Panel** — `/user/*` kökündeki yetki alanı; içerik üretim workspace'i.

---

## V

**Visibility Engine** — Panel / widget / field / wizard step görünürlüğünü kural bazlı kontrol eden sistem.

**Visibility Rule** — `key`, `audience`, `visible`, `read_only` içeren görünürlük kuralı.

---

## W

**Wizard** — Adımlı rehberli akış (onboarding / content creation / source setup / publish).

**Wizard Governance** — Admin'in wizard step'lerini visible / read_only / default_override olarak yönetmesi.

**Workspace** — Job artifact'larının saklandığı local dizin (`backend/workspace/users/<username>/jobs/<job-id>/`).

---

## Y

**Yayın Merkezi** → Publish Review Board (`/admin/publish`).

**YouTube v1** — İlk publish adapter'ı; privacy, metadata, schedule, OAuth flow desteği.

---

## Z

**Zustand** — Client-only UI state için kullanılan frontend store library'si (sidebar, modals, wizard progress, command palette).

---

## Sonraki adım

- Tam sitemap için → `sitemap.md`
- Master index → `00-master-index.md`
- Rehberi kapat ve doğrudan panel'e gir 🚀
