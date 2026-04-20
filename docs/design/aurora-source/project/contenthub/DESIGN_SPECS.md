# ContentHub — Cockpit Layout Design Specs

**Amaç:** Bu doküman, Claude Design veya Claude Code ile tüm sayfaları piksel-doğruluğunda yeniden üretebilmek için yeterli detay içerir. Hiçbir sayfa "yorumlanmasın" — sadece bu spec'e göre uygulansın.

**Kapsam:** ContentHub Aurora Dusk teması üzerine inşa edilen Cockpit yerleşimi. Tüm renkler, boyutlar, tipografi `colors_and_type.css` ve `cockpit.css` tarafından sağlanır. Bu doküman _tasarım niyetini_ ve _her sayfanın spesifik içeriğini_ tanımlar.

---

## 0 · Genel Prensipler

1. **Görünürlük önce.** Her render queue, her job state, her bağlam sürekli görünür.
2. **Türkçe arayüz, İngilizce kimlikler.** `draft`, `pending_review`, `module_type=news_bulletin` çevrilmez.
3. **Operatörden operatöre dil.** "Siz" değil "sistem" odaklı. Pazarlama dili yok.
4. **Hiç emoji.** Hiçbir copy'de, hiçbir empty state'te.
5. **Mono = teknik, sans = insan.** ID, hex, status enum → mono. Başlık, paragraf → sans.
6. **Cockpit her zaman 5 zone'lu.** Auth ekranları hariç hiçbir sayfa shell'i değiştirmez.

---

## 1 · Cockpit Shell — Ortak Yapı

```
┌─────────────────────────────────────────────────────────────┐
│ CTXBAR (48px)  brand · workspace · breadcrumbs · ⌘K · user  │
├──────┬────────────────────────────────┬─────────────────────┤
│ RAIL │  WORKBENCH                     │  INSPECTOR (340px)  │
│ 56px │  (page content, scrollable)    │  (collapsible)      │
│      │                                │                     │
│      │                                │                     │
├──────┴────────────────────────────────┴─────────────────────┤
│ STATUSBAR (28px)  env · db · queues · render-chip · user    │
└─────────────────────────────────────────────────────────────┘
```

### 1.1 Context Bar (üst, 48px)

| Element | Sol→sağ sıra | Detay |
|---|---|---|
| Brand mark | 0 | 56px kare, brand-mark merkezi (26px gradient kare, "c" harfi) |
| Workspace pill | 1 | Yeşil dot + `@kanal_slug` (mono 12px). Tıklanabilir → workspace switcher dropdown |
| Breadcrumbs | 2 | `Section / Subsection / ID` — son crumb beyaz/medium, diğerleri muted |
| Search | sağa hizalı | 320-340px, "Komut, içerik veya ayar…" + `⌘K` chip. Tıklayınca palette açar |
| Bell icon | sağ | Bildirim noktası kırmızı pip'le |
| User pill | en sağ | 22px avatar + adı + chevron. Tıklayınca user menu |

**Davranış:** Sayfa değişiminde breadcrumb değişir; brand, workspace, search, user değişmez.

### 1.2 Rail (sol, 56px)

İkon-only nav, label yok. Hover'da tooltip (sağa açılır).

| Sıra | Section | Icon | Tooltip | Badge? |
|---|---|---|---|---|
| 1 | Dashboard | layout-dashboard | "Gösterge paneli" | — |
| 2 | İçerik (jobs) | list | "İş kayıtları" | sayı |
| 3 | Yayın merkezi | play | "Yayın merkezi" | sayı |
| 4 | Yapay zeka | sparkles | "Wizard / asistan" | — |
| **div** | | | | |
| 5 | Kanallar | tv | "Kanallar" | — |
| 6 | Kütüphane | grid | "Kütüphane" | — |
| 7 | Analitik | bar-chart | "Analitik" | — |
| **spacer** | | | | |
| **div** | | | | |
| 8 | Ayarlar | settings | "Ayarlar" | — |

Aktif item: sol kenarda 2px brand çubuk + brand-muted background + brand renk.

### 1.3 Workbench (orta, esnek)

- Üst: aurora-soft gradient ışıklandırma (180px yükseklik)
- İçerik: `.page` wrapper, max-width 1400px, padding `24px 28px 40px`
- Page-enter animasyonu: 6px translateY + opacity (320ms)

### 1.4 Inspector (sağ, 340px, collapsible)

Her sayfa kendi inspector içeriğini sağlar. Genel pattern:

```
[INSPECTOR · ID]                    [×]
─────────────────────────────────────
META
key      value
key      value

PIPELINE / TIMELINE
○ Step 1
● Step 2 (active, brand pulse)
○ Step 3

PREVIEW
[thumbnail / preview pane]

ACTIONS
[Btn] [Btn]
```

Listing sayfalarında: seçili öğenin metasını gösterir. Detay sayfalarında: ek konfigürasyon paneli. Boş duruma asla düşmez — bir öğe seçili değilse "İncelemek için bir kayıt seç" hint'i.

### 1.5 Status Bar (alt, 28px)

Mono 11px, sürekli görünür. Sol→sağ:

| Cell | Format | Renk |
|---|---|---|
| Env | `local` / `prod` / `staging` | ok=yeşil, warn=amber |
| DB latency | `db 52ms` | ok < 100ms, warn < 500ms |
| TTS queue | `tts: 2 queued` | warn if > 0 |
| **Render chip** | `3 render · eta 4:17` | brand-glow chip, pulse animasyonu |
| spacer | | |
| Theme | `aurora-dusk` | mono muted |
| Version | `v2.4.1` | mono muted |
| User | `hüsko · admin` | mono muted |

---

## 2 · Sayfa Spesifikasyonları

### 2.1 Auth Sayfaları (cockpit shell YOK)

Tüm auth sayfaları:
- Full-viewport, ortalanmış kart (max 440px)
- Sol üst köşede brand mark
- Sağ alt köşede `aurora-dusk · v2.4.1` mono caption
- Kart arka planı: `--bg-surface`, border `--border-default`, padding 32px, radius `--radius-lg`
- Aurora gradient background (`--gradient-aurora`)

#### 2.1.1 `auth/login.html`
- H1: "ContentHub'a giriş"
- Subtitle: "Operatör hesabınla devam et"
- Field: e-posta (autofocus)
- Field: şifre (toggle visibility)
- Checkbox: "Beni hatırla"
- Primary btn: "Giriş yap"
- Sub-link: "Şifremi unuttum"
- Divider "veya"
- Secondary btn: "SSO ile devam et"
- Footer: "İlk kez mi? Yöneticinden davet iste"

#### 2.1.2 `auth/2fa.html`
- H1: "İki adımlı doğrulama"
- Subtitle: "Authenticator uygulamandaki 6 haneli kodu gir"
- 6 hane OTP input (her bir hane 48×56px, mono büyük)
- Primary btn: "Doğrula"
- Sub-link: "Kod alamıyor musun? Yedek kod kullan"
- Helper: "30 saniye içinde otomatik gönderilecek" + countdown

#### 2.1.3 `auth/forgot.html`
- H1: "Şifre sıfırlama"
- 2 state: form / sent confirmation
- Field: e-posta
- Primary btn: "Sıfırlama bağlantısı gönder"
- Sent state: yeşil chip "Bağlantı gönderildi" + e-posta hatırlatma + "Tekrar dene" link

#### 2.1.4 `auth/session-expired.html`
- H1: "Oturumun sona erdi"
- Subtitle: "Güvenlik için 60 dk hareketsizlik sonrası çıkış yapıldı"
- Mono detail: `last_active: 14:32:08 · session_id: ses_a8f2…`
- Primary btn: "Tekrar giriş yap"
- Sub-link: "Çıkış yap (oturumu tamamen sonlandır)"

#### 2.1.5 `auth/onboarding.html`
- 4 adımlı stepper (üst yatay)
- Adım 1: "Workspace tanımla" — slug + ad + zaman dilimi
- Adım 2: "İlk kanalı bağla" — YouTube OAuth düğmesi
- Adım 3: "Tema seç" — 4 tema önizleme kartı (Aurora Dusk, Obsidian Slate, Tokyo Neon, Ink & Wire)
- Adım 4: "Hazır" — "İlk job'unu oluştur" CTA + "Sonra" link

#### 2.1.6 `auth/workspace-switch.html`
- Tam ekran modal-style picker
- H1: "Workspace seç"
- Search input
- Liste: kanal logosu + slug + son aktivite + "Aç" btn
- Alt: "+ Yeni workspace oluştur" (admin only)

---

### 2.2 Admin Sayfaları (Cockpit shell ile)

Tüm admin sayfaları breadcrumb formatı: `Admin / [Section] / [Detail]`

#### 2.2.1 `admin/dashboard.html`
**Breadcrumb:** `Admin / Dashboard`
**Page title:** "Gösterge paneli"
**Subtitle:** "Sistem geneli — son 24 saat"

**Workbench layout:**
1. **Metric strip** (4 sütun): Aktif jobs (`12 +3`), Bugün yayınlananlar (`8`), Queue uzunluğu (`17`), Başarı oranı (`98.4% +0.6%`)
2. **Section: "Aktif renderlar"** — card içinde 3-5 satır, her satırda: başlık, ID, modül tipi, progress bar, % chip
3. **Section: "Son 24 saat — yayın akışı"** — chart card (line/area chart placeholder, "Kanal başına yayınlar" legend)
4. **Section: "Modül performansı"** — 3 kart yan yana (standard_video, news_bulletin, product_review). Her kart: count, avg duration, success rate, mini sparkline
5. **Section: "Sistem sağlığı"** — Disk usage, FFmpeg workers, TTS queue, OpenAI rate limit (4 mini metric tile)

**Inspector:** "Sistem genel" — env, uptime, render workers, last deploy

#### 2.2.2 `admin/jobs.html` (Jobs Registry)
**Breadcrumb:** `İçerik / İş kayıtları`
**Page title:** "İş kayıtları"
**Subtitle:** "Tüm jobs — filtre, ara, yönet"

**Workbench:**
1. **Filter bar:** module_type select, status select (multi), tarih aralığı, kanal, search input. Sağda "+ Yeni job" primary btn
2. **Bulk actions:** "3 seçili — Yeniden başlat / Sil / Dışa aktar"
3. **Table:** ID (mono) | Title | Module | Status (chip) | Progress | Owner | Started | Updated | actions (kebab)
4. **Pagination:** alt, "1–25 / 217 · sayfa 1 / 9"

**Inspector (seçili job için):**
- ID, module, status, started, eta
- Pipeline timeline (8 adım)
- "Detayı aç" btn
- "Yeniden başlat" btn

#### 2.2.3 `admin/publish.html` (Publish Center)
**Breadcrumb:** `İçerik / Yayın merkezi`
**Page title:** "Yayın merkezi"
**Subtitle:** "draft → pending → approved → scheduled → published"

**Workbench:**
1. **Kanban-style 5 sütun:** her sütun bir status. Kart başlığı, modül chip, kanal, tarih, owner avatar
2. Sütun başlığında count + "Tümü görüntüle" link
3. Kartı tıklayınca inspector'da preview açılır

**Inspector:**
- Video thumbnail preview
- Başlık, açıklama, tags
- Schedule controls (tarih + saat picker)
- "Onayla" / "Reddet" butonları (pending review için)

#### 2.2.4 `admin/wizard.html` (İçerik üretim wizard'ı)
**Breadcrumb:** `İçerik / Yeni job / [Modül]`
**Page title:** "Yeni içerik"
**Subtitle:** "Modül seç ve adımları takip et"

**Workbench:**
1. **Module picker** (3 büyük kart, ilk adım): standard_video, news_bulletin, product_review. Her kart: ikon, açıklama, ortalama süre
2. Modül seçilince: **stepper** (8 adım, yatay) + aktif adımın form içeriği
3. **Sticky footer:** "← Önceki" / "Taslak kaydet" / "Sonraki →"

**Inspector:** Snapshot preview — "Bu job başladığında dondurulacak ayarlar"

#### 2.2.5 `admin/palette.html` (Command Palette gösterimi)
Bu bir _ekran_ değil — ortak overlay. Ayrı doc sayfası olarak: nasıl çağırılır (`⌘K`), kategoriler, grouped results, keyboard nav, recent commands.

#### 2.2.6 `admin/analytics.html`
**Breadcrumb:** `Analitik / Genel bakış`
**Page title:** "Analitik"
**Subtitle:** "İçerik, operasyon, YouTube performansı"

**Workbench:**
1. **Tab bar:** "Genel" / "İçerik" / "Operasyon" / "YouTube"
2. **Metric strip** (4 KPI)
3. **Chart card** — büyük (full-width), area chart, "Görüntülenme — son 30 gün"
4. **Grid 2x2 küçük chart kartları:** "İzleme süresi", "Beğeni oranı", "Abone kazanımı", "CTR"
5. **Top performers table:** En çok izlenen 10 video

#### 2.2.7 `admin/settings.html` (Settings Registry)
**Breadcrumb:** `Ayarlar / Kayıt`
**Page title:** "Ayarlar"
**Subtitle:** "204 ayar · 16 grup"

**Workbench (split):**
- Sol (200px): grup nav (sticky) — General, Content, TTS, Visual, Render, Publish, Channels, Auth, AI, Storage, Audit, Notifications, Webhooks, API, Themes, Advanced
- Sağ: seçili grubun ayar listesi. Her ayar: label, açıklama, current value (input/select/toggle), "default" badge, "history" link

#### 2.2.8 `admin/audit.html` (Audit Log)
**Breadcrumb:** `Sistem / Denetim kaydı`
**Page title:** "Denetim kaydı"
**Subtitle:** "Sistemde gerçekleşen tüm olaylar — değiştirilemez"

**Workbench:**
1. **Filter bar:** event type, actor, date range, search
2. **Timeline list:** her satır — timestamp (mono), actor avatar+name, action verb, target (mono ID), diff link
3. Genişletilmiş satır: JSON diff viewer (before/after side-by-side, syntax-highlighted)

#### 2.2.9 `admin/prompts.html` (Prompt Editor)
**Breadcrumb:** `Yapay zeka / Prompt editör`
**Page title:** "Prompts"
**Subtitle:** "Modül başına prompt şablonları — versiyonlu"

**Workbench (3-pane):**
- Sol (220px): prompt list (modül grouped)
- Orta: code editor (monospace, mor-yeşil syntax highlight, satır numaraları)
- Sağ: "Test çalıştır" panel — input örnekleri, çıktı önizleme, token sayısı

**Inspector:** Version history list — "v12 (current) · v11 · v10…" + diff link

#### 2.2.10 `admin/themes.html` (Theme Registry)
**Breadcrumb:** `Görünüm / Temalar`
**Page title:** "Temalar"
**Subtitle:** "12 yerleşik tema · 3 özel"

**Workbench:**
1. **Active theme banner:** mevcut temanın preview kartı + "Düzenle" / "Çoğalt"
2. **Grid 3x4:** her tema için: ad, açıklama, color swatch strip (8 token), "Önizle" / "Aktive et"
3. **+ Yeni tema oluştur** primary btn (sağ üst)

**Inspector:** Selected theme'in token tablosu — bg-canvas, accent-primary, vs.

---

### 2.3 User Sayfaları (Cockpit shell, USER scope)

User panelinde rail nav'i değişir: dashboard, my projects, channels, calendar, playlists, comments, analytics. Settings yerine identity.

#### 2.3.1 `user/projects.html`
**Breadcrumb:** `Projelerim`
**Page title:** "Projelerim"
**Subtitle:** "Senin başlattığın tüm jobs"

**Workbench:**
- Card grid 3 sütun: her proje kartı thumbnail + başlık + modül chip + status + progress (rendering ise) + "Aç" btn

**Inspector:** Seçili proje detayı + son aktivite

#### 2.3.2 `user/channels.html`
**Breadcrumb:** `Kanallar`
**Page title:** "Kanallarım"
**Subtitle:** "YouTube hesaplarına bağlı kanallar"

**Workbench:**
- Card list: her kanal için logo + ad + subscriber count + monthly upload + connection health chip + "Yönet" btn
- "+ Yeni kanal bağla" CTA

**Inspector:** Seçili kanalın token expiry, OAuth health, son upload tarihi

#### 2.3.3 `user/calendar.html`
**Breadcrumb:** `Takvim`
**Page title:** "Yayın takvimi"
**Subtitle:** "Planlanmış ve geçmiş yayınlar"

**Workbench:**
- Ay görünümü (büyük takvim grid)
- Her gün hücresinde: scheduled badges (her biri kanal-renkli)
- Sağda "Bugün" / "Hafta" / "Ay" toggle

**Inspector:** Seçili gün — o günün event listesi (saat sıralı)

#### 2.3.4 `user/playlists.html`
**Breadcrumb:** `Oynatma listeleri`
**Page title:** "Oynatma listeleri"

**Workbench:**
- 2-pane: sol playlist listesi, sağ seçili playlist'in video sıralaması (drag handle)

#### 2.3.5 `user/comments.html`
**Breadcrumb:** `Yorumlar`
**Page title:** "Yorum kutusu"
**Subtitle:** "Tüm kanallardan toplanan yorumlar"

**Workbench:**
- Filter: kanal, sentiment, replied/unreplied
- List: her yorum için video thumb + yorum metni + author + sentiment chip + "Yanıtla" / "Sil"

#### 2.3.6 `user/wizard-standard.html`, `user/wizard-news.html`, `user/wizard-review.html`
3 modüle özel wizard varyasyonu. Aynı 8-step yapı, modüle özel formlar:
- **standard_video:** topic, script intent, voice, visuals palette, music, format
- **news_bulletin:** kaynak listesi, dedupe ayarları, editorial filtre, voice
- **product_review:** ürün URL, rating intent, voice, visuals, FTC disclaimer

#### 2.3.7 `user/analytics.html`
Admin analytics'in user-scoped versiyonu — sadece o kullanıcının kanalları.

#### 2.3.8 `user/identity.html`
**Breadcrumb:** `Kimliğim`
**Page title:** "Hesap kimliği"

**Workbench:**
- Avatar + display name düzenleme
- Bağlı OAuth provider'lar
- 2FA enable/disable
- API key management
- Theme tercihi
- Notification preferences
- Danger zone: hesap silme

---

### 2.4 Empty / Error / Edge States

#### 2.4.1 `states/empty-jobs.html`
- Cockpit shell + workbench'te ortalanmış empty state
- Geometric SVG vignette (CSS-drawn)
- H2: "Henüz job yok"
- Caption: "İlk içeriğini oluşturmak için aşağıdaki düğmeyi kullan"
- Primary btn: "+ Yeni job oluştur"

#### 2.4.2 `states/empty-search.html`
- Search-no-results
- "Arama eşleşmedi" + "'foo' için sonuç bulunamadı" + "Filtreleri sıfırla" link

#### 2.4.3 `states/error-500.html`
- Cockpit shell + büyük geometric error vignette
- H1: "Bir şey yanlış gitti"
- Mono error code: `err_503_render_worker_unavailable · 14:32:08`
- "Tekrar dene" / "Destek ekibine bildir" / "Ana sayfaya dön"

#### 2.4.4 `states/error-404.html`
- "Sayfa bulunamadı"
- Mono URL: `/admin/foo/bar`
- "Ana sayfaya dön" btn

#### 2.4.5 `states/maintenance.html`
- Full-viewport (cockpit shell yok)
- "Bakım modu"
- ETA countdown
- Status page link

---

## 2.5 · Preview-First Pattern Library (KRİTİK)

ContentHub'ın temel prensibi: **"önizleme önce — kör konfigürasyon yok"**. Bu üç primitive her sayfada sürekli erişilebilir olmalı.

### 2.5.1 QuickLook Overlay (`.quicklook`)

**Tetikleyici:** herhangi bir kart/satırda `Space` tuşu, veya thumb hover'ında 👁 ikon.

**Davranış:**
- macOS Finder QuickLook gibi merkezi modal
- Hızlı kapanır (`Esc`), hızlı sonraki/önceki (`←` `→`)
- Backdrop: `var(--bg-overlay)` + `backdrop-filter: blur(8px)`
- Container: max 880×620px, `--radius-xl`, `--shadow-2xl`
- Animasyon: `quicklook-scale-in` (0.94 → 1 + opacity, 200ms)

**Yapı:**
```
┌──────────────────────────────────────────┐
│ [thumb] Title                       [×]  │  header (sticky)
│         ID · module · status              │
├──────────────────────────────────────────┤
│                                          │
│       [video preview / image]            │  preview pane (16:9)
│                                          │
├──────────────────────────────────────────┤
│ Meta strip: duration · fps · size · ...  │
├──────────────────────────────────────────┤
│ [Düzenle] [İndir] [Aç →]                 │  footer actions
└──────────────────────────────────────────┘
```

**Token'lar:** `--bg-surface`, `--border-default`, `--shadow-2xl`, `--radius-xl`, `--space-4/5/6`.

### 2.5.2 Detail Drawer (`.drawer`, sağdan açılan)

**Tetikleyici:** kart/satırda "Detay" linki, veya Inspector'da "Tam görüntü" btn.

**Davranış:**
- Inspector'dan **farklı**: Inspector = persistent küçük yan panel (340px), Drawer = sağdan ON-DEMAND büyük overlay (520-720px)
- Animasyon: `slide-in-right` (translateX 100% → 0, 240ms `--motion-ease-out`)
- Backdrop: `var(--bg-overlay)` (no blur — focus the content)
- ESC ile kapanır
- İç scroll independent

**Yapı:**
```
┌──────────────────────────────────────────┐
│ [Title]                    [↕] [⤢] [×]   │  header
│ breadcrumb + ID                          │
├──────────────────────────────────────────┤
│                                          │
│  Tab bar: Genel · Pipeline · Logs · ...  │  optional
│                                          │
│  Tab content (scrollable)                │
│                                          │
│  - Preview pane (collapsible)            │
│  - Meta sections                         │
│  - Pipeline timeline (interactive)       │
│  - Logs panel                            │
│                                          │
├──────────────────────────────────────────┤
│ [Onayla] [Reddet]    [Yeniden başlat]    │  sticky footer
└──────────────────────────────────────────┘
```

**Header eylem ikonları:**
- `↕` → drawer'ı pencereye genişlet (520 → 720)
- `⤢` → tam sayfaya geçir (popout)
- `×` → kapat

**Token'lar:** `--bg-surface`, `--border-default`, `--shadow-2xl`.

### 2.5.3 Media Preview Component (`.media-preview`)

Video, image veya audio için tek primitive. **Her job listesinde, kanban kartında, inspector'da** kullanılır.

**Variants:**
- `media-preview.thumb` — 96×54 küçük (16:9), liste içi
- `media-preview.card` — 240×135 orta, grid kartı
- `media-preview.hero` — full-width 16:9, drawer/quicklook içinde
- `media-preview.audio` — waveform-strip (yatay band, 32px yüksek)

**Yapı (video için):**
```
┌────────────────────────┐
│ [▶]                    │  play overlay (hover'da görünür)
│                        │
│   thumbnail            │  bg, object-fit cover
│                        │
│ ◉ 02:34   [HD]    [👁] │  duration · quality · quicklook btn
└────────────────────────┘
```

**Davranışlar:**
- Hover: thumbnail %1 büyür yok (transform suppressed), bunun yerine border `--accent-primary` highlight + `--glow-accent` ring
- Play btn click: inline player aç (in-place) **VEYA** QuickLook tetikle (config'e göre)
- Eye btn click: QuickLook
- Loading state: `skeleton-shimmer` keyframe
- Error state: alert-circle icon + "Önizleme yüklenemedi"

**Token'lar:** `--bg-inset` (placeholder), `--accent-primary` (hover ring), `--glow-accent`, `--radius-md`.

### 2.5.4 Where each appears

| Context | Component |
|---|---|
| Job table row | thumb media-preview + Space → QuickLook + click → Drawer |
| Publish kanban card | card media-preview + click → Drawer (pending review için) |
| Inspector | hero media-preview (collapsed default), tıklayınca QuickLook |
| Wizard preview step | hero media-preview |
| Analytics top videos | thumb media-preview |
| Calendar event | thumb media-preview tooltip'ta |

**Asla tek başına container yok** — her preview component kullanıcıya bir sonraki adımı (QuickLook veya Drawer) sunar.

---

## 3 · Component Library Detayları

`cockpit.css` içindeki tüm componentler:

### 3.1 Button (`.btn`)
- Sizes: `sm` (26px), default (30px), `lg` (36px), `icon` (kare)
- Variants: `primary` (gradient brand), `secondary` (border), `ghost` (no border, hover bg), `danger` (state-danger), `dark` (rail context)

### 3.2 Chip (`.chip`)
- Default: muted bg, border-subtle, mono 11px, height 22px
- Variants: `ok`, `warn`, `err`, `info`, `brand` — her biri kendi state token'ından bg/border/fg

### 3.3 Input (`.input`)
- Height 32px, padding 0 12px, radius 8px
- Focus: brand border + 3px brand-15% glow ring
- Variant: `mono` (font-mono, 12px)

### 3.4 Metric Tile (`.metric`)
- Padding 16px 18px, radius 12px
- 2px brand gradient accent strip top
- Label (uppercase, tracking, muted) + value (display 30px) + delta (mono, semantic)

### 3.5 Table (`.tbl`)
- Header: uppercase 10px, bg-inset, border-bottom default
- Rows: padding 12px 14px, hover bg-inset, selected bg-accent-muted + 2px brand left bar

### 3.6 Progress Bar (`.pbar`)
- Height 4px, radius 2px, bg-inset
- Fill: gradient brand + brand glow
- `done` variant: success-fg solid, no glow

### 3.7 Inspector (`.inspector`)
- Width 340px, border-left, padding 16px 18px
- Sections: title (uppercase 10px tracking) + rows (k/v mono 11px)

### 3.8 Modal/Palette (`.modal-veil`, `.palette`)
- Backdrop: rgba(15,18,25,0.5) + blur(6px)
- Container: max 640px, fade-in + pop-in
- Search input + grouped results + keyboard hint footer

### 3.9 Drawer (`.drawer`)
- Right slide-in, 520px max
- Backdrop: rgba(15,18,25,0.35)
- Used for: detail panels, "view full" expansions

### 3.10 Toast (`.toast`)
- Bottom-right stack
- 3 variants: default, ok, err — left border 3px semantic color
- Auto-dismiss 4s

---

## 4 · İçerik Örnekleri

### 4.1 Sahte İsim Veritabanı (Türkçe)

**Operatör isimleri:** Hüsko, Mehmet Y., Ayşe K., Burak T., Selin O., Cem A., Defne K., Emre S.

**Kanal slug'ları:** `@ekonomi_gundem`, `@teknoloji_anlik`, `@belgesel_hattı`, `@ürün_inceleme_tr`, `@haftalık_haber`

**Job ID format:** `<MOD>-<YYYY>-<NNN>` — `BLT-2026-042`, `REV-2026-018`, `VID-2026-108`

**Modül kodu:** `BLT` = bulletin, `REV` = review, `VID` = standard_video

### 4.2 Status Enum Sözlüğü
```
draft, pending_review, approved, scheduled, published, review_rejected,
queued, rendering, paused, failed, completed,
healthy, degraded, down,
connected, disconnected, expired, refreshing
```

### 4.3 Sample Title'lar (içerik karakteri için)
- "Haftalık ekonomi bülteni — 18 Nisan"
- "Ürün inceleme: AirPods Pro 3"
- "Tarih belgeseli · Bizans dönemi mimarisi"
- "Günlük haber özeti · 15:00"
- "Teknoloji raporu: Apple Vision Pro 2"

---

## 5 · Üretim Sırası (önerilen)

1. **Auth (6 sayfa)** — shell yok, basit, hızlı
2. **Empty/error states (5 sayfa)** — pattern'ler için template
3. **Admin dashboard** — en zengin layout, ana referans olur
4. **Admin jobs** — table + inspector pattern'i
5. **Admin publish** — kanban pattern
6. **Admin wizard** — stepper pattern
7. **Admin analytics** — chart-heavy pattern
8. **Admin settings** — split nav pattern
9. **Admin audit + prompts + themes** — varyasyonlar
10. **User sayfaları** — admin pattern'lerinin user-scope versiyonu
11. **Index.html** — tüm sayfaların portal'ı

Her sayfada:
- Cockpit shell aynı kalır
- Sadece breadcrumb + workbench + inspector içeriği değişir
- Status bar her zaman aynı (canlı veri)

---

---

## 6 · Kritik Ürün Özellikleri (Mevcut Sistemden Korunacaklar)

Bu özellikler mevcut ContentHub'da bulunan ve yeni tasarımda **mutlaka korunması gereken** çekirdek ürün davranışlarıdır. Sadece görsellik değişir, mantık aynı kalır.

### 6.1 · Navigation & Layout

- **Rail collapse toggle** — rail üst sol köşede küçük chevron, tıklayınca rail 56px → 220px expand (label'lar görünür). State localStorage'a kaydedilir.
- **AdminScopeSwitcher** — context bar'da admin kullanıcılar için dropdown: "Admin olarak bak / Kullanıcı [X] olarak bak". Seçili olmayan scope'ta rail nav ve sayfa içeriği değişir; üstte persistent "impersonating [X]" amber banner.
- **Sistem saati + timezone** — statusbar'da `14:32 GMT+3` mono chip, her dakika update. Operasyonel referans.
- **Notification bell + center** — bell click'te sağdan açılan `NotificationCenter` sheet (SSE-driven). Geçmiş bildirimler, unread/read ayrımı, filtrele.

### 6.2 · Modal & Panel Sistemi

- **ConfirmAction** — destructive eylemler için iki aşamalı onay: ilk tıklama inline "gerçekten? [Evet, sil] [iptal]" transforms the button. 3s içinde onaylanmazsa geri döner.
- **Dismiss Stack (z-layer manager)** — aynı anda QuickLook + Drawer + Palette açıksa ESC sırayla en üsttekinden kapanır. Focus restore: kapanınca tetikleyen elemana geri döner.
- **Body scroll lock** — herhangi bir modal açıkken `body` scroll disabled.
- **Focus trap** — Sheet/QuickLook içinde Tab döngüsü sadece overlay içinde kalır.

### 6.3 · Command Palette

- **Cmd+K** her sayfadan erişilebilir
- **Visibility-aware** — kullanıcının erişemediği komutlar listede yok
- **Context-aware** — hangi sayfadaysa ilgili komutlar top-3'te
- **TR karakter normalizasyonu** — "ayar" aramak "ayarlar"ı bulur (İ/ı/ş/ç sorunsuz)
- **`?` global shortcut help** — tüm klavye kısayollarını listeleyen overlay
- **Keyboard nav** — ↑↓ sonuçlar, ↵ seç, esc kapat, Tab focus change

### 6.4 · Table & List

- **ColumnSelector** — sütun göster/gizle menüsü (tablonun sağ üstünde kebab+sütun ikon). Seçim localStorage'a `table.<id>.columns` anahtarıyla kaydedilir.
- **Bulk Action Bar** — ≥1 satır seçili olunca üstte sticky bar: "3 seçili · [Yeniden başlat] [Dışa aktar] [Sil] [✕]". Unchecked bulk action bar = gizli.
- **TableFilterBar** — badge-style active filtreler chip olarak görünür; her biri `✕` ile kaldırılabilir. "Filtreleri temizle" linki.
- **Indeterminate checkbox** — parent checkbox'ı partial child seçiminde − (dash) gösterir.
- **Per-state rendering** — Empty / Loading (skeleton) / Error (alert + retry) — hepsi semantik token'larla.

### 6.5 · Form & AutoSave

- **useAutoSave davranışı:**
  - `toggle` → anında kayıt
  - `text input` → blur'da kayıt
  - `textarea` → 800ms debounce
- **Field-level göstergeler:** sağ tarafta küçük chip
  - `isDirty` → warn amber dot + "değişti"
  - `isSaving` → spinner + "kaydediliyor"
  - `saved` → yeşil ✓ + "kaydedildi · 2 sn önce"
  - `error` → kırmızı alert + "tekrar dene"
- **Form header** tüm ayarlar için `Son kayıt: 14:32:08 · 4 değişiklik pending`

### 6.6 · Toast & Notification

- **Toast stack** — sağ alt köşe, max 5 simultane, 4s auto-dismiss (hover'da duraklar)
- **Spam dedup** — aynı metinli toast 2. kez gelirse count badge eklenir ("Kaydedildi ×3")
- **Variants:** `default` / `ok` / `err` / `info` / `warn` — left border 3px semantik
- **Notification Center** (SSE-driven history):
  - Bell'den açılır, sağdan 380px sheet
  - Tabs: Tümü / Okunmamış / Arşivlenmiş
  - Her item: ikon + başlık + kaynak + mono timestamp + action
  - Bulk "tümünü okundu işaretle"

### 6.7 · Keyboard & Accessibility

- **Keyboard scope stack** — z-layer'daki en üst overlay ESC'i yakalar
- **Focus trap** — overlay açıkken Tab overlay içinde döner
- **Body scroll lock** — overlay açıkken arka plan sabit
- **Arrow nav** — palette, dropdown, OTP cells, calendar'da standart

### 6.8 · Realtime (SSE)

- **Connection indicator** — statusbar'da `sse` hücresi:
  - `connected` → yeşil dot + "sse · live"
  - `reconnecting` → amber pulse + "sse · 3s içinde yeniden"
  - `disconnected` → kırmızı + "sse · offline"
- **Auto-reconnect** — 3s default, exponential backoff
- **Event-driven invalidation** — progress bar'lar SSE ile anında update (polling yok)

### 6.9 · Visibility & Permissions

- **VisibilityGuard** — yetkisiz route direkt 403 state ("Bu sayfa senin için görünür değil")
- **Nav filtering** — rail'da erişilemeyen section'lar hiç render edilmez
- **Role badges** — user pill'de rolü chip ile gösterilir: `admin`, `editor`, `viewer`

### 6.10 · Job Detail & Media

- **Inline video player** — JobQuickLookContent içinde .mp4/.webm/.mov tam oynatıcı (play/pause/seek/fullscreen/volume). QuickLook'tan drawer'a geçerken player state korunur.
- **SSE step updates** — pipeline timeline'daki active step progress % SSE ile her saniye yenilenir
- **StatusBadge + DetailGrid** — ID, modül, durum, owner, started, eta — tek bakışta grid format

---

---

## 7 · Ergonomi Güçlendirmeleri (Mevcut Sistemi Geliştiren Eklemeler)

### 7.1 · Mevcut olan ama güçlendirilecek

- **Job ETA bar** — her job satırında inline mini progress bar + sağında mono `eta 01:32`. Tutarlı format, her yerde aynı görünür.
- **QuickLook universal** — Job'a özel değil: Template, Source, Blueprint, Prompt, Theme, Channel için de Space → QuickLook. Her tipin kendi content adapter'ı olur.
- **Toast "Detayı gör" link** — hata/warn toast'larında opsiyonel `link: { label, href }` alanı, sağda chevron'lu. Uzun stacktrace'leri toast'ta göstermek yok.
- **Command Palette — Son kullanılanlar** — palette açılışında default section "Son açılanlar" (localStorage'dan 5 sayfa), "Son işlemler" (5 komut). Arama yazılınca gizlenir.
- **Empty state — modül özel CTA** — jobs empty → "İlk job'unu oluştur" · templates empty → "İlk şablonu ekle" · sources empty → "İlk kaynağı bağla". Context'e göre copy ve eylem.

### 7.2 · Yeni eklenmesi önerilenler

- **Breadcrumb navigasyonu** (§1.1'de mevcut; ama vurgu) — context bar'da her seviye tıklanabilir, sağ tarafta `>` dropdown ile siblings gösterilir (ör. `Jobs > BLT-2026-042 ▾` → aynı seviyedeki job'lara atla).
- **Son ziyaret edilen sayfalar** — palette içinde `Recents` grubu + rail'da opsiyonel "Son gezinti" icon (clock). localStorage-backed, max 10.
- **Satır içi hızlı düzenleme** — table cell'de çift tıklama → inline input. Enter kaydet, Esc iptal. Supported cell'ler: title, owner, tags. Autosave pattern aynı (blur'da commit).
- **Sticky table başlıkları** — `thead` `position: sticky; top: 0` + `z-index: 2`, `background: var(--bg-inset)` opak + bottom border. Tüm uzun tablolar için default.
- **Sayfa içi hızlı arama** — `Cmd+F` sayfa içinde toast-style top bar açar (browser find override etmeden). Sadece görünen tablo row'ları üzerinde text filter.
- **Bulk export** — Bulk Action Bar'da "Dışa aktar →" menüsü: CSV / JSON / NDJSON seçenekleri. Toast'ta progress, tamamlanınca download link'li toast.
- **Inspector widget — Aktif işler** — Inspector'ın her zaman en altında "Aktif renderlar" kartı: 3 satır job + mini progress bar. Hangi sayfada olursan ol render'lar periferde görünür.
- **Setting diff bildirimi** — settings'te bir ayar değiştiğinde toast: `"voice_default: tr_anchor_male_1 → tr_anchor_female_2"` (mono font). 6s dismiss.
- **Klavye kısayol ipucu** — tüm primary button'larda hover'da sağ kenarda küçük `kbd` chip'i (örn. Yayına gönder → `⇧↵`). Rail item'larda, tab'larda, palette komutlarında da aynı.
- **Sağ tık bağlam menüsü** — table row'da right-click → `ContextMenu` overlay: QuickLook (Space) · Düzenle · Kopyala · Pipeline görüntüle · Sil. Sağ tık sadece row'da aktif; global disable dışında.

### 7.3 · Öncelik sırası

1. Breadcrumb dropdown navigation
2. Sticky table headers (varsayılan tüm tablolarda)
3. Satır içi hızlı düzenleme (title/owner/tags)
4. Son ziyaretler (palette + rail widget)
5. Bağlam menüsü (table row)
6. Kalan özellikler üretim sırasına göre

---

---

## 8 · İleri Ergonomi & Güven (v1.3)

### 8.1 · Zaman & planlama
- **Timeline (Gantt-style) görünümü** — Jobs ve Publish Center için opsiyonel "Timeline" view toggle. Saatlik/günlük yatay bantta job bar'ları (başlangıç-eta). Renk = modül, opacity = status.
- **Relative + absolute time** — "3 saat önce" gösterimi, hover'da mono tooltip: `2026-04-18 11:32:08 GMT+3`. Tüm tarih alanlarında default pattern.
- **Gecikme göstergesi** — planlanan süre aşıldığında row'da kırmızı `+02:14 geç` chip + gutter'da ince kırmızı çizgi.

### 8.2 · Akıllı varsayılanlar
- **Son kullanılan değerler** — wizard field'larında placeholder: "Son seferki: tr_anchor_male_1 · [uygula]" link. localStorage `wizard.<module>.lastValues`.
- **"Benzerinden kopyala"** — her detay drawer'ında `...` menüsünde "Bunu kopyala → yeni job". Snapshot değerlerini baz alır.
- **Auto-name** — `Haftalık ekonomi bülteni — 18 Nisan` formatıyla otomatik başlık önerisi; kullanıcı override edebilir.

### 8.3 · Görsel geri bildirim
- **Skeleton loader** — spinner YOK. Her yükleme state'i shimmer skeleton. Dashboard kartlarında, table row'larda, quicklook preview'ında.
- **Optimistic UI** — toggle, kanban drag, approve/reject anında UI'a yansır; arka planda SSE confirm eder. Hata olursa toast + rollback.
- **Progress button** — kaydetme süresinde button `Kaydediliyor · %60` göstergesi + fill-bar; tamamlanınca `✓ Kaydedildi` 2sn sonra normal state.
- **Counter animation** — dashboard metric value'larında sayı değişiminde rolling count (400ms).
- **Row highlight/collapse** — yeni eklenen row'da 1s brand fade-in, silinende height collapse + opacity out.

### 8.4 · Hata yönetimi
- **Hata detay genişletici** — toast'ta "Detayı gör ↓" → inline expand: stack trace, request id (mono), retry button.
- **"Tekrar dene"** — her error state'te zorunlu. Network/timeout chip'lerinde de.
- **Offline banner** — backend unreachable → ctxbar üstünde amber sticky banner: `Çevrimdışı — son senkronizasyon 14:32 · salt-okunur mod`. SSE reconnect başarılı olunca gizlenir.
- **Error boundary** — her section/widget bağımsız boundary. Bir kart çökerse sayfa ayakta kalır, kart yerinde `Bu widget yüklenemedi · [Yenile]` mini state.
- **"Hata bildir"** — error state'lerde sağ alt "Problem bildir" button → prefilled form (ss + log + context).

### 8.5 · Bulk & toplu işlemler
- **Bulk edit** — sadece delete değil: tag ekle/çıkar, owner değiştir, status transition. Bulk action bar'da dropdown.
- **CSV import** — Sources, Channels, Templates için drop-zone modal. Preview table + "şu 3 satır hatalı" inline validation.
- **Bulk progress toast** — sağ altta sticky progress `120 / 500 işlendi · eta 01:20`. Dismiss'leme yok, kendi kendine kapanır.
- **Background job queue** — uzun işlem → ctxbar'da küçük "3 arka plan işlemi ▾" pill; hover'da progress listesi.

### 8.6 · Raporlama & export
- **Sayfa → PDF** — Analytics pages'te "PDF indir" icon button. @media print stylesheet'iyle rendered.
- **Grafik fullscreen** — her chart'ın sağ üstünde `⛶` ikonu → fullscreen modal.
- **Snapshot link** — "Bu sayfanın link'ini kopyala" (URL'de filtreler + zaman damgası). Paylaşılan kişi aynı state'i görür.

### 8.7 · Erişilebilirlik (A11y)
- **ARIA live region** — toasts & notifications `role="status" aria-live="polite"`. Kritik hata `aria-live="assertive"`.
- **High contrast mode** — theme variant `aurora-dusk-hc` (border, text contrast +%30 ratio). Settings > Erişilebilirlik'ten toggle.
- **Reduced motion** — `@media (prefers-reduced-motion: reduce)` tüm keyframe'leri disable, scale transforms → opacity-only.
- **Form `aria-describedby`** — hata mesajı field'a bağlı. Screen reader sırayla okur.

### 8.8 · Keşfetme & öğrenme
- **"What's new" changelog** — versiyon bump'ta otomatik açılan modal: son 3 sürüm değişiklikleri. "Bir daha gösterme" check.
- **Demo/sandbox mode** — settings'ten aktive edilir. Sample data yükler, mutasyonlar no-op. Ctxbar'da amber `DEMO MOD` chip.
- **Keyboard hint overlay** — 30s hareketsizlik sonrası sağ alt köşede discrete "? kısayollar" pill.
- **Örnek veri yükle** — empty state'te secondary button: "Örnek kayıtlarla doldur".

### 8.9 · Veri kalitesi
- **Duplicate uyarısı** — URL/slug field'ı blur'da async check → amber inline uyarı: "3 saat önce benzer kayıt oluşturuldu · [göster]".
- **Validation preview (dry-run)** — wizard'ın son step'inde "Bu ayarlarla bir test çıktısı üret" button → mini QuickLook, actual render'dan önce.
- **Orphan kayıt badge** — kullanılmayan Template/Source/Prompt satırlarında `kullanılmıyor` gri chip.
- **Data integrity badge** — eksik alanlı kayıtlarda amber `eksik` chip, hover'da hangi alanların eksik olduğu.

### 8.10 · İşbirliği (gelecek)
- **Inline yorum/not** — her drawer'da "Notlar" tab. @mention autocomplete. Timestamp'li, silinebilir.
- **Onay akışı** — publish için reviewer atanır. Reviewer notification alır, drawer'da approve/reject + yorum zorunlu.

### 8.11 · Smart details
- **Linkify** — log/description alanlarında URL, job ID, prompt ID regex ile auto-link.
- **Markdown render** — description/notes alanlarında bold/italic/list/link destekli.
- **Code highlight** — JSON/YAML/SQL alanlarında syntax highlight (Prism-lite, theme aware).
- **Image lazy + blur-up** — thumbnail'lar önce 40×23 blur placeholder, sonra asıl.
- **Video poster** — render edilmiş job'larda 00:01'deki kare preview poster.

### 8.12 · Performans
- **Virtual scroll** — `≥500` row'lu table/list'te otomatik virtualize. Heading sticky, scroll position persist.
- **Route prefetch** — rail item veya link hover 150ms'den uzun olursa sayfanın data'sını arka planda fetch.
- **Thumbnail cache** — aynı src 2. kez istenmezse IndexedDB cache.

---

## 9 · Güven, Kurtarma & Görünürlük (v1.4)

### 9.1 · Undo & kurtarma
- **Undo toast** — destructive her action → toast: "1 kayıt silindi · [Geri al]" 6s timer. Arkada soft-delete + 24h recovery window.
- **Activity log (sayfa bazlı)** — her detay drawer'ında "Geçmiş" tab: kim, ne zaman, ne değiştirdi (diff inline).
- **Versiyon karşılaştırma** — template/prompt/blueprint drawer'ında "v12 vs v11" side-by-side diff view (satır satır).
- **Draft auto-save (wizard)** — wizard state'i her step geçişinde ve 10s idle'da localStorage + backend'e kaydedilir. Tarayıcı kapansa kaldığı yerden döner.

### 9.2 · Keşif & anlama
- **Inline yardım** — her complex ayar label'ının yanında `?` ikon → popover: 1-2 cümle açıklama + ilgili docs link.
- **Tur modu** — yeni kullanıcıya ilk dashboard'da "tura başla" CTA → 5-6 adımlı spotlight overlay ("Bu rail… · Bu render chip…").
- **Arama sonucu highlight** — eşleşen karakterler `<mark>` (brand-muted bg + brand-hover fg).
- **İlişki linkleri** — her kayıt drawer'ında "Bağlantılı": bu template'i kullanan 14 job, bu job'un publish'i, vb.

### 9.3 · Operasyonel görünürlük (statusbar genişletildi)
- **Sistem sağlık nokta** — ctxbar sağında 3-dot cluster: DB, SSE, Render worker. Hepsi yeşil = ok, biri kırmızı = click'le detay sheet.
- **Aktif job sayaç widget** — inspector'da her zaman altta: "3 çalışıyor · 1 failed · 5 queue". Click → jobs page filtered.
- **Son hata banner** — kritik sistem hatası olursa ctxbar altında sticky: `HATA · render_worker_down · 14:28 · [detay] [kapat]`.
- **Disk kullanımı** — statusbar'da `disk 68%` mono chip. %80 üzeri amber, %90 üzeri kırmızı pulse.

### 9.4 · Kullanıcı ergonomisi
- **Density toggle** — table header'da density switch: compact (28px row) / comfortable (36px) / spacious (44px). Per-table persist.
- **Zoom hafıza** — `ctrl+ / ctrl-` ile page zoom, workspace başına kaydedilir.
- **Dark/Light/Auto** — identity page'de theme + "sistem teması takip et" toggle.
- **Font size A−/A+** — settings > erişilebilirlik'te 3-step (14/16/18px base).
- **Copy button** — her ID, URL, JSON alan yanında `⧉` ikon; click'te tick + toast.

### 9.5 · Güvenlik & oturum
- **Oturum zaman aşımı uyarısı** — token 2 dk sonra bitecekse modal: "Oturum 2:00 sonra bitecek · [Uzat] [Çıkış]".
- **Aktif oturum listesi** — identity'de: hangi cihaz, hangi IP, son aktivite. "Bu oturumu sonlandır" her biri için.
- **Re-auth destructive actions** — workspace sil, user role değiştir, API key revoke → şifre tekrar sorar.

### 9.6 · Gelişmiş workflow
- **Favoriler / Pinned** — her kayıt satırında `⭐` hover action. Pinned → rail'da "Sabitlenen" section (max 8).
- **Paylaşılabilir view** — table filter state URL hash'e serialize: `?status=rendering&module=news_bulletin`. Kopyalanabilir.
- **Bulk undo** — bulk action sonrası toast 8s uzun: "47 kayıt silindi · [Toplu geri al]".

### 9.7 · Geliştirici dostu (admin)
- **JSON viewer** — settings payload'lar, audit diff'ler: collapsible tree, copy-path, type-colored.
- **Raw response mod** — admin-only; her modal/drawer header'ında `{}` ikon → raw JSON panel açar.
- **Feature flag paneli** — settings > flags: modül-bazlı on/off toggle (canlı).
- **Query counter** — debug mode'da statusbar'da `42 queries · 312ms` mono pill.

---

**Spec versiyonu:** v1.4 · **Tarih:** 18 Nisan 2026 · **Tema:** Aurora Dusk · **Changelog:**
- v1.1 — 10 kritik ürün özelliği (§6)
- v1.2 — 15 ergonomi güçlendirmesi (§7)
- v1.3 — 12 ileri kategori, 60+ özellik (§8: zaman, akıllı default, görsel geri bildirim, hata yönetimi, bulk, rapor, a11y, öğrenme, veri kalitesi, smart details, performans)
- v1.4 — 7 güven & görünürlük kategorisi, 30+ özellik (§9: undo, activity log, sistem sağlık, density, güvenlik, favoriler, dev tools)
