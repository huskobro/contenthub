En verimli ve en az hata riski taşıyan yol şu:

Önce “UI’da görünen ama runtime’da etkisiz olan” şeyleri gerçek sisteme bağlarız.
Sonra “saklanan ama hiç okunmayan” veri katmanlarını çalıştırırız.
En son “enforcement / visibility / auth / ileri otomasyon” katmanına geçeriz.

Böylece önce sistem dürüstleşir, sonra güçlenir.

Aşağıda güncellenmiş ana faz + alt faz planı var. Alt fazları tek tek çok parçalamadım; gruplanmış halde verdim.

Güncellenmiş Ana Yol Haritası
M9 — Runtime Truth + Credentials + Mock Temizliği

Amaç: UI’da görünen kritik ayarları gerçekten çalışır hale getirmek ve sahte/test/demo yüzeylerini temizlemek.

M9-A — Credential Merkezi

Kapsam:

Ayarlar içinde yeni bir “Credentials / API & OAuth” bölümü
Girilebilir alanlar:
OpenAI API Key
Kie.ai API Key
Pexels API Key
Pixabay API Key
YouTube OAuth Client ID
YouTube OAuth Client Secret
Maskeli gösterim
Durum badge’leri:
configured
missing
invalid
connected
Test bağlantısı
Kaydetme sonrası runtime reinitialize

Bu fazda ayrıca:

.env tek gerçek kaynak olmaktan çıkar
precedence şu olur:
DB admin value → .env fallback → code default
provider_registry reinitialize mekanizması eklenir
startup sırasında credential resolver kullanılır

Sonuç:
Ayarlar sayfasına girilen gerçek key’ler gerçekten sistemi etkiler.

M9-B — YouTube Bağlantı Yüzeyi

Kapsam:

Aynı credentials alanı içinde YouTube Connect bölümü
OAuth başlat / callback tam UI akışı
Bağlı kanal bilgisi gösterimi
reconnect / disconnect
YouTube credential’larının dağınık yapısını toparlama
mümkünse client_id/client_secret düz JSON’dan çıkarılıp settings tabanlı hale getirme

Ek genişletme:

Eğer yoksa “YouTube Analytics” temel bölümü açılır
İlk sürümde:
connected channel
son publish edilen videoların temel durumu
basit video-level analytics fetch yüzeyi
Eğer gerçek metrikler hemen stabil değilse bu alan açıkça beta diye etiketlenir, boş ama çalışıyormuş gibi bırakılmaz
M9-C — Mock / Test / Fake Veri Temizliği

Kapsam:

Asset Library placeholder verilerinin kaldırılması
coming soon yüzeylerinin net biçimde etiketlenmesi veya geçici gizlenmesi
Analytics tarafında boş ama gerçek gibi duran bölümlerin dürüstleştirilmesi
frontend ve backend’de test için konmuş sabit/mock/demo/default değerlerin taranması
test-only seed, fake badge, placeholder asset, decorative action panel gibi şeylerin temizlenmesi
“sistemi etkileyen gerçek veri” ile “test/demo verisi”nin ayrıştırılması

Bu faz çok önemli. Çünkü raporda en büyük problem “var gibi görünen ama gerçekte etkisiz” katmanlar.

M9-D — Runtime Truth Audit Pass

Kapsam:

canlı / kısmi / stub / fake / inert matrisinin repo içinde draft belge olarak çıkarılması
hangi sayfa gerçekten neyi kontrol ediyor net tablo
hangi alan DB’de var ama runtime’da okunmuyor listesi
hangi endpoint var ama hiçbir enforcement yok listesi

Bu faz dokümantasyon için de temel olur.

M10 — Settings Registry’yi Gerçekten Çalıştırma

Amaç: Settings sistemini CRUD kabuğu olmaktan çıkarıp gerçek runtime kontrol paneline dönüştürmek.

M10-A — Settings Resolver

Kapsam:

merkezi resolver servisi
typed settings okuma
validation
default/admin/user override mantığı
grup bazlı ayar okuma

Settings grupları örnek:

credentials
providers
youtube
standard_video
news_bulletin
subtitles
publish
system
analytics
M10-B — Pipeline Ayarlarını Runtime’a Bağlama

Kapsam:

TTS speed
trim silence
default language
default tone
script length / duration
selected news limit
publish defaults
provider seçim default’ları

Burada kural:
Önce az sayıda ama yüksek etkili ayar bağlanır.
Her şeyi bir anda bağlamayız.

M10-C — Settings UI Düzenleme

Kapsam:

settings sayfasının gruplandırılması
tablo yerine group-based panel yapısı
detay açıklamaları
hangi ayar neyi kontrol ediyor bilgisinin eklenmesi
düzenleme, validation, rollback görünürlüğü

Sonuç:
Ayarlar sayfası artık gerçekten bir şeyleri kontrol eder.

M11 — Templates + Style Blueprints + TemplateStyleLinks Aktivasyonu

Amaç: şu an DB’de duran ama pipeline’a etkisi olmayan tasarım/config sistemlerini gerçek üretim akışına bağlamak.

M11-A — Template Runtime Aktivasyonu

Kapsam:

job.template_id gerçekten okunur
standard video creation sırasında template seçimi gelir
template pipeline başlangıcında çözülür
template kuralları script/metadata/visuals akışına uygulanır
M11-B — Style Blueprint Runtime Aktivasyonu

Kapsam:

style blueprint composition veya uygun executor katmanında kullanılır
hardcoded preset mantığı blueprint tabanlı hale gelir
subtitle/composition/visual direction ile ilişkisi netleştirilir
M11-C — TemplateStyleLink Aktifleştirme

Kapsam:

template ↔ style blueprint bağlantısı execution’da okunur
primary role gibi alanlar gerçekten etkili olur
create/edit ekranları artık sadece CRUD değil operational hale gelir

Sonuç:
Template, Style Blueprint ve Link ekranları ilk kez gerçek üretim sonucu değiştirir.

M12 — Observability + Audit + Provider Trace

Amaç: sistemin iç davranışını görünür hale getirmek.

M12-A — Audit Log Aktivasyonu

Kapsam:

audit_logs tablosuna gerçek yazım
kritik aksiyonlar:
settings değişimi
credential değişimi
publish review
publish trigger
retry
template/style değişimi
onboarding completion
kim değiştirdi / ne değişti / ne zaman değişti
M12-B — Provider Trace Aktivasyonu

Kapsam:

provider_trace_json yapısının standardize edilmesi
latency
cost
provider error
retry / fallback zinciri
analytics için okunabilir hale getirme
M12-C — SSE Truth Pass

Kapsam:

tanımlı ama emit edilmeyen event’lerin gözden geçirilmesi
gerçekten gerekli olanların aktive edilmesi
gereksiz tanımlı event’lerin kaldırılması veya ertelenmesi

Sonuç:
Sistem gözlenebilir olur ve analytics daha dürüst hale gelir.

M13 — Analytics Derinleştirme + YouTube Analytics

Amaç: mevcut analytics’i yarım durumdan çıkarıp gerçek operasyon merkezine çevirmek.

M13-A — Internal Analytics Hardening

Kapsam:

provider_error_rate artık None kalmaz
avg_render / composition kaynaklarının doğrulanması
content analytics sayfasının gerçek veri ile doldurulması
boş/dummy analytics yüzeylerinin kaldırılması
M13-B — YouTube Analytics Entegrasyonu

Kapsam:

OAuth bağlı hesap üzerinden analytics fetch
temel metrikler:
views
like count
comment count
publish sonrası performans
iç üretim metrikleri ile dış platform metriklerinin ayrılması
M13-C — Analytics UI Dürüstleştirme

Kapsam:

unavailable metrik açıkça unavailable yazsın
fake boşluklar kalksın
disabled filtreler ya çalışsın ya gizlensin
M14 — Scheduling + Review Gate Enforcement + Used News Gate

Amaç: var olan ama yarım kalmış kuralları gerçek enforcement’a çevirmek.

M14-A — Publish Scheduling Gerçekleştirme

Kapsam:

scheduled_at alanını gerçekten kullanan scheduler
scheduled publish worker
recovery ve idempotency
scheduled publish görünürlüğü
M14-B — Review Gate Hard Enforcement

Kapsam:

review olmadan publish akışı gerçekten bloklansın
artifact değişince pending_review reset zinciri eksiksiz çalışsın
pipeline ve executor tarafında review state net kontrol edilsin
M14-C — Used News Gate Güçlendirme

Kapsam:

sadece warning değil, gerçekten engel/override modeli
tekrar kullanılan haber için açık politika:
block
warn
allow with force
bu davranış settings ile kontrol edilebilir hale gelir
M15 — Visibility + Ownership + Onboarding Backend Gates

Amaç: bugüne kadar çoğunlukla UI seviyesinde duran erişim/görünürlük mantığını backend enforcement’a taşımak.

M15-A — Visibility Engine Enforcement

Kapsam:

visibility rules middleware/decorator/route enforcement
sayfa ve veri görünürlüğü gerçekten kontrol edilir
M15-B — Ownership ve Access Scope

Kapsam:

owner_id alanının gerçekten işe yaraması
job ve içerik erişim scope’u
gelecekte auth gelirse hazır altyapı
M15-C — Onboarding Backend Gate

Kapsam:

onboarding tamamlanmadan kritik endpoint’lerin bloklanması
sadece UI redirect değil backend gate

Bu faz auth’suz bile yapılabilir; sistem daha dürüst hale gelir.

M16 — Cleanup + Schema Truth + Contract Activation

Amaç: inert contract ve kullanılmayan model alanlarını temizlemek ya da aktive etmek.

M16-A — Contract Truth Pass

Kapsam:

RetryHistory
ProviderTrace
ArtifactRecord
Decision Trail
bunlardan hangisi gerçekten kullanılacaksa aktive edilir, kullanılmayacaksa açıkça kaldırılır veya defer edilir
M16-B — Dead Field Cleanup

Kapsam:

job.source_context_json
estimated_remaining_seconds
heartbeat_at
kullanılmayan publish / job alanları
ya gerçek consumer eklenir ya alanlar backlog’a alınır
M16-C — Test Fixture / Seed / Demo Cleanup Final

Kapsam:

tüm test helper, sabit değer, seed ve runtime’a sızmış demo artıklarının son taraması
production truth ile test truth tamamen ayrılır

Bu faz senin özellikle istediğin “mock değerleri, test için yazılan şeyleri net görelim ve kaldırabilelim” ihtiyacının final temizliğidir.

M17 — Documentation + Operator Guide + Sidebar-by-Sidebar Truth Map

Amaç: senin sistemi gerçekten anlayabilmen.

M17-A — Sistem Mimarisi Rehberi

Kapsam:

sistem genel akışı
hangi modül ne yapıyor
hangi veri nerede saklanıyor
hangi ayar nereden okunuyor
hangi ekran hangi endpoint’e bağlı
M17-B — Sidebar Item Rehberi

Bu senin özellikle istediğin doküman.

Her sidebar item için:

bu sayfa ne işe yarar
üstteki butonlar ne yapar
tabloda her sütun neyi gösterir
hangi veri hangi backend endpoint’inden gelir
hangi alan runtime’da gerçekten etkilidir
hangi alan sadece bilgi amaçlıdır
hangi ekran başka hangi ekranlara bağlanır
M17-C — Operatör Kullanım Rehberi

Kapsam:

içerik oluşturma
scan
bulletin
publish
analytics
credentials
template/style kullanımı
hata durumunda ne yapılır
M17-D — Runtime Truth Matrix

Kapsam:

real
partial
stub
fake
deferred
olarak tüm sistemin nihai matrisi
En Verimli Öncelik Sırası

Bence optimum sıra şu olmalı:

M9 — Credentials + OAuth + Mock cleanup
M10 — Settings runtime wiring
M11 — Templates + Style Blueprints activation
M12 — Audit + Provider trace + SSE hardening
M13 — Analytics deepening + YouTube Analytics
M14 — Scheduling + review/used-news enforcement
M15 — Visibility + ownership + onboarding backend gates
M16 — Dead field / contract / test-fixture cleanup
M17 — Full documentation and operator guide

Bu sıra neden en doğru:

Önce kullanıcıya görünen en kritik yalan yüzeyleri kapatır
Sonra sistem davranışını UI’dan yönetilebilir hale getirir
Sonra içerik kalitesini etkileyen template/style sistemlerini aktive eder
En son enforcement ve ileri yönetim gelir
Dokümantasyon en sonda yazılırsa daha az eskiyen, daha doğru bir belge olur
Hangi Fazlar Öncekine Göre Güncellendi

Bu audit sonrası plan şu açılardan değişti:

Credentials ayrı ve en başa alındı
Mock/fake/demo cleanup ayrı faz olarak öne çekildi
Settings artık template/style’dan önce geliyor
YouTube Analytics açık bir alt faz olarak eklendi
AuditLog, ProviderTrace, inert contracts ayrı faz halinde netleştirildi
Test/mock/runtime karışıklığını temizleme fazı ayrıca eklendi
Dokümantasyon en sona ama kapsamlı şekilde kondu
Kısa Nihai Sonuç

İlk başlamamız gereken yer artık net:

M9-A → M9-B → M9-C

Yani:

API key / OAuth giriş ekranı
bunların gerçek runtime’a bağlanması
YouTube bağlantı ve mümkünse analytics yüzeyi
fake/mock/decorative yüzeylerin temizlenmesi