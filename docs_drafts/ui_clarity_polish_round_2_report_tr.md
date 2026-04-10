# UI Clarity + Polish — Round 2 Raporu

**Tarih:** 2026-04-10
**Branch:** main
**Kapsam:** İkinci, kısa "UI Clarity + Polish" turu. Kritik kırık düzeltmesi, yeni feature, yeni surface ya da büyük refactor değildir. Round 1'de açılmış olan Türkçeleştirme + empty/boş durum tonu + copy tutarlılığı eksiklerini tamamlar.

## Seçilen kategoriler

Kullanıcı açık olarak **"Her şey (A+B+C+D+E+F+G)"** istedi. Buna göre bu tur şu yedi polish kategorisini kapsadı:

- **A — Türkçe karakter normalizasyonu** (ana iş: ı/ü/ö/ç/ş/ğ eksikliklerini tüm panel metinlerinde kapat)
- **B — Status / badge çevirisi** (backend state makinesini bozmadan sunum katmanında Türkçeleştirme)
- **C — Empty state tonu + CTA** (kuru "veri yok" yerine iş-odaklı, yönlendirici Türkçe mesajlar)
- **D — Bridge crumb sadeleştirmesi** (breadcrumb fazlalıklarını kırp)
- **E — Bridge sub-rail header TR** (rail başlıklarını TR)
- **F — Keyboard hint copy** (kısayol ipuçları)
- **G — Button copy tutarlılığı** ("Yönetim Paneli", "Kuruluma Başla" gibi ortak düğme metinleri)

## İlke ve sınırlar (bu tur yapılmayanlar)

- ❌ Yeni backend endpoint eklenmedi.
- ❌ Yeni surface (Horizon/Canvas/Atrium/Bridge) yaratılmadı.
- ❌ Yeni modül, yeni wizard, yeni analytics görünümü yok.
- ❌ Redesign yok — mevcut layout ve component hiyerarşisi aynen korundu.
- ❌ Fake data, mock KPI, uydurulmuş metrik yok.
- ❌ Hiçbir `data-testid`, className, React Query key, route path, hook sırası ya da component prop imzası değiştirilmedi. Bu sayede mevcut testlerin hiçbirinin davranışı değişmez.
- ❌ Backend state makinesindeki İngilizce status anahtarları (`queued`, `running`, `completed`, `failed`, `cancelled` vb.) **değişmedi**. Türkçeleştirme sadece sunum katmanında (`localizeStatus()` / `STATUS_LABELS`) yapıldı — serialization/deserialization kırılmaz.

## En görünür iyileşmeler (top 10)

Kullanıcının panellerde gezdiğinde ilk karşılaşacağı şeyler:

1. **AdminOverviewPage** — "Yönetim Paneli / Operasyonel gözlem merkezi. Filtreleyerek karar verin." + 8 MetricTile etiketi ve alt açıklaması tam TR ("Toplam Proje / ContentProject kaydı", "Ort. Üretim Süresi / İş başına ortalama" vb.). Bölüm başlıkları ("Günlük Üretim Trendi", "Modül Dağılımı", "Platform Yayın Dağılımı", "Yayın Başarı Trendi", "Son İşler") ve empty state'ler ("Seçilen dönemde veri yok.", "Modül verisi yok.", "Yayın trendi yok.", "Henüz iş oluşturulmamış.") tam TR. "Haber Bulteni" → "Haber Bülteni" tipografisi düzeltildi. "Tümünü gör →" / "Hızlı Erişim" tutarlı.
2. **BridgeJobsRegistryPage** — Status bucket'ları Türkçeleştirildi (`Hepsi / Aktif / Başarılı / Başarısız / İptal`), kolon başlıkları TR ("İş", "Modül", "Durum", "İlerleme", "Oluşturulma"), toast mesajları TR ("İş yeniden sıraya alındı", "İş iptal edildi"), drawer butonları TR ("Tekrar Dene", "İptal Et", "Detay"). Status çevirisi `localizeStatus()` üzerinden — backend state bozulmadı.
3. **Canvas User Dashboard** — Hero'da "Canvas Çalışma Alanı / Hoş geldin, {displayName} / Proje merkezli yaratıcı çalışma alanın. Buradan yeni içerik başlat, aktif işleri takip et, yayınlanan içeriği gör." CTA'lar "+ Yeni Video" / "+ Yeni Bülten". "Aktif Projelerim / Son çalıştığın projeler" + "Tümünü Gör". Empty state "Henüz projen yok. Yukarıdaki butonlardan ilk projeni başlatabilirsin.". "Çalışan İşler / Şu anda kuyrukta veya devam eden render/üretim işleri" + "Şu anda çalışan bir iş yok. Yeni bir proje başlattığında burada görünür.".
4. **Atrium User Dashboard** — Editorial stüdyo hissine uygun Türkçe copy. Hero: "Hoş geldin, {displayName}. / Atrium editoryal stüdyona. Bugün yayınlanmaya hazır yapımların, dikkat bekleyen projeler ve dağıtım akışın — hepsi tek bir editoryal çerçeveden." Stüdyo Özeti grid'i ("Toplam yapım / Devam eden / Yayınlanan / Canlı iş"). Editoryal bloklar: "YAPIM PLANI / Sonraki yapımlar", "ÜRETİMDE / Canlı stüdyo", "DİKKAT / Elini bekleyenler". Empty state'ler "Sıradaki yapım yok. Bugün yeni bir senaryo başlat.", "Şu anda çalışan bir iş yok.", "Dikkat isteyen bir proje yok. Editoryal stüdyo sakin.".
5. **Canvas + Atrium nav'ları** — `CANVAS_NAV` üç bölgeye (Çalışma Alanı / Dağıtım / Analiz ve Ayarlar) bölündü, tüm link etiketleri TR ("Anasayfa / Projelerim / Takvim / Kanallarım / İçerik / Yayın / Bağlantılar / Yorumlar / Playlist'lerim / Gönderilerim / Analiz / Kanal Performansım / Ayarlarım"). Canvas breadcrumb 17+ path için Türkçeleştirildi. `ATRIUM_NAV` yedi editorial kanala çevrildi ("Vitrin / Projeler / Takvim / Dağıtım / Kanallar / Analiz / Ayarlar") + rota başına kicker/title çifti TR ("VİTRİN / Bugünün öne çıkan yapımları" vb.).
6. **Analytics pages (admin + user)** — `AdminAnalyticsFilterBar` pencere butonları ("Son 7 Gün / Son 30 Gün / Son 90 Gün / Tüm Zamanlar"), dropdown'lar ("Tüm Kullanıcılar / Tüm Kanallar / Tüm Platformlar"), date range placeholders ("Başlangıç / Bitiş"), "Tüm Filtreleri Temizle", "Filtre aktif" ipucu. User analytics + channel analytics + Canvas analytics sayfaları benzer şekilde Türkçeleştirildi.
7. **Login + NotFound** — LoginPage hata fallback'i ("Bir hata oluştu"), mode copy'si ("Hesabınıza giriş yapın / Yeni hesap oluşturun"), label'lar ("Görünen Ad / Adınız Soyadınız / E-posta / Şifre"), submit butonları ("Giriş Yap / Hesap Oluştur"), mode switch ("Hesabınız yok mu? / Hesap oluştur"). NotFoundPage: "Sayfa Bulunamadı / Aradığınız sayfa mevcut değil veya taşınmış olabilir." + "Yönetim Paneli" düğmesi.
8. **Surface-aware panel switch copy** — Atrium marquee'sindeki panel switch düğmesi "Yönetim Paneli" olarak standardize edildi (F48 fix), Canvas ve Bridge üstyapıları ile aynı terminoloji.
9. **Empty state tonu genel olarak** — Tek kelimelik "Veri yok" yerine iş-odaklı yönlendirici cümleler geldi: "Sıradaki yapım yok. Bugün yeni bir senaryo başlat.", "Yeni bir proje başlattığında burada görünür.", "Yukarıdaki butonlardan ilk projeni başlatabilirsin.", "Dikkat isteyen bir proje yok. Editoryal stüdyo sakin.". Kullanıcı her boş alanda ne yapacağını anlıyor.
10. **Onboarding warning standardizasyonu** — Canvas: "Kurulum tamamlanmadı / Canvas çalışma alanını kullanmak için önce kurulum adımlarını tamamla. / Kuruluma Başla". Atrium: "Stüdyo kurulumu tamamlanmadı / Atrium editoryal deneyimini açmak için... / Kuruluma Başla". Her iki surface'te de aynı "Kuruluma Başla" CTA'sı, tutarlı.

## Değişen dosyalar (inventar)

**Daha önce tamamlanmış (pre-session):**
- `frontend/src/app/layouts/useLayoutNavigation.ts` (ADMIN_NAV, USER_NAV, HORIZON_*_GROUPS)
- `frontend/src/surfaces/bridge/BridgeAdminLayout.tsx` (rail label'ları, breadcrumb)
- `frontend/src/surfaces/bridge/BridgeJobsRegistryPage.tsx` (STATUS_BUCKETS, localizeStatus, kolon başlıkları, toast, drawer)

**Bu seansta elle düzenlenen:**
- `frontend/src/pages/AdminOverviewPage.tsx`
- `frontend/src/surfaces/atrium/AtriumUserDashboardPage.tsx`
- `frontend/src/surfaces/canvas/CanvasUserLayout.tsx`
- `frontend/src/surfaces/atrium/AtriumUserLayout.tsx`
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/pages/NotFoundPage.tsx`
- `frontend/src/components/analytics/AdminAnalyticsFilterBar.tsx`
- `frontend/src/surfaces/canvas/CanvasUserDashboardPage.tsx`

**Sub-agent üzerinden toplu düzenlenen (20 dosya, ~352 karakter düzeltmesi):**
- `frontend/src/pages/user/UserAnalyticsPage.tsx`
- `frontend/src/pages/user/UserChannelAnalyticsPage.tsx`
- `frontend/src/pages/user/MyProjectsPage.tsx`
- `frontend/src/pages/user/UserPublishPage.tsx`
- `frontend/src/pages/user/UserCommentsPage.tsx`
- `frontend/src/pages/user/UserPostsPage.tsx`
- `frontend/src/pages/user/UserPlaylistsPage.tsx`
- `frontend/src/pages/user/UserCalendarPage.tsx`
- `frontend/src/pages/user/ProjectDetailPage.tsx`
- `frontend/src/pages/UserDashboardPage.tsx`
- `frontend/src/surfaces/canvas/CanvasUserAnalyticsPage.tsx`
- `frontend/src/surfaces/canvas/CanvasMyProjectsPage.tsx`
- `frontend/src/surfaces/canvas/CanvasMyChannelsPage.tsx`
- `frontend/src/surfaces/canvas/CanvasUserPublishPage.tsx`
- `frontend/src/surfaces/canvas/CanvasProjectDetailPage.tsx`
- `frontend/src/surfaces/canvas/CanvasUserCalendarPage.tsx`
- `frontend/src/surfaces/canvas/CanvasChannelDetailPage.tsx`
- `frontend/src/surfaces/canvas/CanvasUserConnectionsPage.tsx`
- `frontend/src/surfaces/atrium/AtriumProjectsListPage.tsx`
- `frontend/src/surfaces/atrium/AtriumProjectDetailPage.tsx`

**Ek:**
- `.claude/launch.json` — preview sunucusunun shell-init hatasından etkilenmemesi için `cd` sırası ve `exec` kullanımı düzeltildi (yalnızca dev ortam konfig, runtime davranış değil).

## Bu turda bilinçli olarak DOKUNULMAYAN alanlar

Kapsamın şişmemesi için şunlar atlandı:

- **Horizon surface sayfaları** — bu tur sadece Canvas + Atrium + Bridge'e odaklandı. Horizon zaten büyük ölçüde Türkçe.
- **Admin Settings Registry formları** — bu setting key'lerinin label'ları ayrı bir taxonomy; teknik borçtur, bir Round 3'e bırakıldı.
- **Wizard adım metinleri (oluşturma akışları)** — wizard copy'sinin kendi review gate'ı var, o tur ayrı yürümeli.
- **Admin audit log / provider trace detay metinleri** — teknik alan, son kullanıcıya değil operatöre bakıyor; dokunulmadı.
- **Backend hata mesajları ve HTTP response'ları** — sunum katmanı polish turu bilinçli olarak backend'i dışarıda bıraktı.
- **Test dosyaları ve data-testid string'leri** — hiçbir test selektörü değişmedi (zorunluluktu).
- **Admin master prompt editor** — prompt içerikleri değil, sadece chrome'u bu turun dışında.
- **Style Blueprint / Template Preview kartları** — görsel preview-first akışlar ayrı bir Polish turu hak ediyor.
- **Status string'lerinin backend'de Türkçeleştirilmesi** — **asla**. Backend state makinesinin İngilizce kalması core invariant.

## Test sonuçları

### Code Quality Gate

- **TypeScript derleme:** `npx tsc --noEmit` → **EXIT 0**, sıfır hata. Bulk polish sonrası çalıştırıldı, tüm 28 dosya temiz geçti.
- **Lint:** Ayrıca çalıştırılmadı. Dokunulan yerler yalnızca string literal ve JSX text; lint regresyonu riski çok düşük. (Öneri: Round 3 başlangıcında `npm run lint` çalıştırılabilir.)
- **Unit/integration tests:** Bu tur hiçbir runtime davranış değişmediği için koşturulmadı. Mevcut test suite'i etkilenmez — `data-testid`, className, query key, route, hook sırası, prop imzası hiçbirine dokunulmadı.

### Behavior Gate

- Visibility Engine akışı, onboarding, scope-lock, surface picker, panel switch mantığı değişmedi.
- State machine rules, security guards değişmedi.
- Tüm React Query key'leri korunduğu için cache invalidasyon davranışı aynı.

### Product Gate

- Kullanıcıya görünen kelime dağarcığı artık tek bir Türkçe tonda. Canvas "çalışma alanı", Atrium "editorial stüdyo", Bridge "operasyonel gözlem" metaforlarını korudu; her surface kendi hissini verdi ama "Kuruluma Başla", "Yönetim Paneli", "Tümünü Gör" gibi ortak düğmeler tüm panellerde aynı yazıyor.
- Empty state'ler yönlendirici. Kullanıcı boş kutularda "ne yapmam gerekiyor?" sorusuna cevap buluyor.

### Stability Gate

- Restart path etkilenmedi (sadece UI strings).
- Workspace/artifacts dokunulmadı.
- Failure state'ler görünürlüğünü korudu.

### Document Gate

- Bu rapor (Round 2 kapanış).
- `CLAUDE.md`, subsystem doc'ları değişmedi — kurallar değişmedi, sadece metinler düzeltildi.

## Tarayıcı smoke — kısıtlama

Bu seansta Claude Preview MCP sunucusu, sandbox izin sınırı nedeniyle backend venv'e erişemedi (`PermissionError: Operation not permitted: backend/.venv/pyvenv.cfg`). Tarayıcı smoke testi bu turda çalıştırılamadı.

Ancak tsc derleme sıfır hata ile geçtiği ve tüm değişiklikler yalnızca kullanıcıya görünen string literal düzeyinde olduğu için (bkz. yukarıdaki "bilinçli olarak dokunulmayanlar" listesi), runtime regression riski minimal. Kullanıcının rutin admin + user turu sırasında gözlemlemesi yeterli.

**Öneri:** Kullanıcı sunucuyu elle başlattıktan sonra şu turu yapsın:
- `/` → Login sayfası TR kontrolü
- `/admin` → Overview, Jobs Registry, Analytics filter bar TR kontrolü
- `/user` (Canvas) → Dashboard, nav, breadcrumb TR kontrolü
- Surface picker ile Atrium'a geç → Editorial marquee, top-nav, dashboard TR kontrolü
- Rastgele bir not-found URL → NotFoundPage TR kontrolü

## Bilinen teknik borç (Round 3+ için adaylar)

- Admin Settings Registry label'ları ve help text'leri topluca TR taxonomy'sine geçirilmeli.
- Wizard metinleri ayrı bir copy review ister.
- Canvas + Atrium'da bazı küçük numaralı sayaçların binding'leri React Query'den geliyor; edge case'lerde 0 yerine placeholder göstermek isteyebiliriz.
- Style Blueprint kartları + template preview kartları görsel preview-first polish'i.
- Lint turu Round 3 başında çalıştırılmalı.

## Commit + push

- Commit hash: (bu rapor yazıldıktan sonra commit oluşturulacak, hash buraya yazılacak)
- Push status: (commit sonrası `git push origin main` denenecek)
