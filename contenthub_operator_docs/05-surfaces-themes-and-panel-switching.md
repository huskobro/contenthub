# 05 — Surfaces, Themes ve Panel Geçişi

Bu dosya ContentHub'ın en çok kafa karıştıran üç kavramını netleştirir: **Surface**, **Theme** ve **Panel**. Bu üçü birbirinden bağımsızdır.

---

## İki farklı ayar

ContentHub tasarım sisteminde iki temel ayar vardır:

| Ayar | Ne belirler? | Örnek |
|---|---|---|
| **Surface (Arayüz Yüzeyi)** | Layout iskeleti, nav yapısı, etkileşim modeli, sayfa kabuğu | Legacy / Horizon / Bridge / Canvas / Atrium |
| **Theme (Renk Teması)** | Renk paleti, tipografi, spacing token'ları | Obsidian Slate / Horizon Midnight / Canvas Ivory / Atrium Paper / ... |

**Kritik nokta:** Surface ve theme bağımsızdır. Bridge yüzeyinde Horizon Midnight teması çalışabilir. Atrium yüzeyinde Obsidian Slate teması çalışabilir. Bir surface değiştirmek renkleri otomatik değiştirmez; bir tema değiştirmek nav yapısını otomatik değiştirmez.

Bu kavram `/admin/themes` sayfasında net yazılıdır: **"BÖLÜM 1 · ARAYÜZ YÜZEYİ"** ve **"BÖLÜM 2 · RENK TEMASI"** iki ayrı bölüm halinde sunulur.

---

## Surface — arayüz yüzeyi

Surface, panelin görsel + etkileşim kabuğudur. Aynı route ağacı, aynı veri, aynı job'lar; farklı layout, farklı nav, farklı UI dili.

### Mevcut 5 surface

| Surface | Scope | Durum | Karakter |
|---|---|---|---|
| **Legacy** | both | stable | En eski, en uzun test edilmiş. Classic ContentHub deneyimi. Klasik sidebar + header. |
| **Horizon** | both | stable | Modern, sakin. Icon rail + collapsible nav groups. |
| **Bridge** | admin | beta | Operasyon odaklı. Operasyon rayı + slot ağaç + preview-driven ops görünümü. Jobs cockpit + Publish Review Board kuzey yıldızı. |
| **Canvas** | user | beta | Proje merkezli yaratıcı akış. Portfolio dashboard + project-first nav. Ön izleme öncelikli. |
| **Atrium** | user | beta | Editoryal yayıncı deneyimi. "Premium Media OS" kimliği. Hero block + editorial sections + studio özeti sidebar. |

### Surface scope

- **admin** — sadece admin panelde çalışır (`/admin/*`)
- **user** — sadece user panelde çalışır (`/user/*`)
- **both** — hem admin hem user panelde çalışır

Legacy ve Horizon `both`, Bridge `admin`, Canvas ve Atrium `user`.

### Surface manifest sistemi

Her surface kendi manifest'inde şu bilgileri sağlar:

- `id` — unique surface ID (ör. `bridge`, `atrium`)
- `label` — görünen ad
- `scope` — `admin` / `user` / `both`
- `status` — `stable` / `beta`
- `version`
- `layouts` — `admin` ve/veya `user` için layout component'leri
- `pageOverrides` — belirli sayfa key'lerini override eden custom component'ler

Manifest dosyaları `frontend/src/surfaces/manifests/*.ts` içinde.

### Override mekanizması

Surface her sayfayı override etmek zorunda değildir. Override etmediği sayfalar için Legacy/Horizon'un varsayılan versiyonu kullanılır.

Örnek: **Bridge** sadece 3 sayfayı override eder:
- `admin.jobs.registry` → `BridgeJobsRegistryPage`
- `admin.jobs.detail` → `BridgeJobDetailPage`
- `admin.publish.center` → `BridgePublishCenterPage`

Diğer admin sayfaları (Settings, Visibility, Providers, Analytics, vb.) Bridge surface'ında Horizon layout'u içinde varsayılan formlarıyla render edilir. Bu sayede surface ekleme düşük maliyetlidir.

**Canvas** 9 sayfa override eder (dashboard, projects list/detail, publish, channels list/detail, connections, analytics, calendar). **Atrium** 3 sayfa override eder (dashboard, projects list/detail).

### Aktif surface nasıl hesaplanır?

`resolveActiveSurface(user, panel)` fonksiyonu şu sırayla karar verir:

1. **User override** — kullanıcı `/user/settings`'de bir surface seçtiyse
2. **Admin default** — admin `/admin/themes`'de sistem default surface'ı belirlediyse
3. **System default** — kod içi fallback (admin için Horizon, user için Horizon)
4. **En eski stable surface** — güvenlik ağı (Legacy)

Seçilen surface `SurfaceContext` ile tüm alt component'lere yayılır. Layout ve page override'lar bu context'ten çözümlenir.

### Surface değiştirmenin hissi

Surface değişikliği **anında** uygulanır — reload gerekmez, job state korunur, SSE bağlantısı kopmaz. Kullanıcı:

- `/user/settings` → "Arayüz Yüzeyleri" → hedef surface kartına `Aktif Et` tıklar
- Layout ve nav yeni surface'ın manifest'ine göre yeniden render edilir
- React Query cache korunur; aynı job detail sayfası aynı kaldığı halde görsel olarak farklı render edilir

---

## Theme — renk teması

Theme, sadece renk ve tipografi token'larını değiştirir. Layout'a, nav'a, etkileşime dokunmaz.

### Mevcut 12 tema (özet)

Tema registry `/admin/themes` **BÖLÜM 2**'de listelenir. Tipik örnekler:

- **Horizon Midnight v1.0.0** — koyu, zarif, Inter tipografisi (şu anda aktif)
- **Obsidian Slate** — en koyu, profesyonel ops hissi
- **Canvas Ivory** — açık, editorial
- **Atrium Paper** — warm light, zin bir editoryal yayıncı havası
- **Bridge Dusk** — Bridge surface'ı ile uyumlu koyu paleti
- Diğerleri: çeşitli light/dark varyantlar

### Theme manifest

Her tema bir **ThemeManifest** JSON nesnesi ile tanımlanır:

- `id`, `label`, `version`, `status`
- `palette` — color token'lar (background, foreground, primary, secondary, accent, muted, destructive, border)
- `typography` — font family, weight scale
- `spacing` — boşluk ölçekleri

### Theme import

`/admin/themes` **BÖLÜM 2** sayfasında **Theme Import** paneli vardır. Admin bir ThemeManifest JSON yükler → validate edilir → registry'ye eklenir → anında kullanılabilir.

### Theme değiştirmenin hissi

Theme değişikliği CSS variables üzerinden uygulanır. Tüm sayfa anında yeni renklerle render edilir. Layout değişmez.

---

## Panel — yetki alanı

Panel Surface'tan ayrı bir kavramdır. Panel, kullanıcının hangi yetki alanında çalıştığını belirler.

- **Admin panel** (`/admin/*`) — operasyonel gözlem + yönetim + tüm kullanıcıların görünümü
- **User panel** (`/user/*`) — içerik üretim workspace'i + sadece kendi projelerini görür

Bir kullanıcı admin rolündeyse **her iki panele de** girebilir. User rolündeki kullanıcı sadece user panele girebilir.

### Panel geçişi

UI'da iki panel arasında geçiş açık şekilde sunulur:

- **Admin panelinden user paneline:** Bridge layout'unda üst sağdaki user menüsünde **"Kullanıcı Paneli"** butonu (veya Legacy/Horizon admin header'ında aynı buton)
- **User panelinden admin paneline:** admin rolündeki kullanıcılar için user menüsünde **"Yönetim Paneli"** butonu görünür; user rolündeki kullanıcıda bu buton yoktur

### Panel koruması

- `AuthGuard` + `AppEntryGate` rol bazlı yönlendirme yapar
- Admin olmayan biri `/admin/*` rotasına inerse otomatik olarak `/user`'a yönlendirilir
- Admin her iki panele de serbestçe girer

### Panel ≠ Surface

Bir yanılgıyı baştan kapatalım:

- Panel = yetki alanı (admin mi, user mı?)
- Surface = görsel kabuk (Legacy mi, Atrium mı?)

**Admin panelinde bir surface seçilir, user panelinde başka bir surface seçilir.** Örneğin default ayarlarda:

- Admin paneli → Bridge surface'ı
- User paneli → Atrium surface'ı

Admin kullanıcı panel değiştirdiğinde surface de değişir çünkü her panel için ayrı surface seçimi vardır.

---

## Default surface stratejisi (bugünkü)

Final acceptance turunda onaylanan default:

| Panel | Default surface | Gerekçe |
|---|---|---|
| Admin | **Bridge** | Operasyon + ops hazırlığı için en parlak yüzey |
| User | **Atrium** | Editoryal ürün kimliği için en güçlü yüzey |

**Alternatifler:** Canvas (user — portfolio/preview-first), Horizon (both — sakin modern), Legacy (both — klasik, en stable fallback).

Bu default kullanıcı istediği zaman `/user/settings` veya admin `/admin/themes` üzerinden değiştirebilir.

---

## Üç kavramı birleştiren tek cümle

> **Bir kullanıcı bir PANEL'e girer (admin veya user), bu panelin SURFACE'ını (Legacy/Horizon/Bridge/Canvas/Atrium) seçer, ve o surface'in üzerine bir THEME (Obsidian Slate / Horizon Midnight / ... ) uygulanır.**

Her üçü birbirinden bağımsızdır. Her üçü de admin tarafından merkezi olarak yönetilebilir, kullanıcı override edebilir.

---

## Sonraki adım

- Her sayfanın durumunu görmek için → `08-page-by-page-reference.md`
- Domain modelini anlamak için → `06-core-domain-model.md`
- Settings + visibility + governance → `10-settings-visibility-and-governance.md`
