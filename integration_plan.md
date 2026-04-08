Claude’un revize planını baz alarak, contenthub için uygulanacak ana ve alt fazları düzenli bir yol haritası halinde çıkarıyorum.

bahsi geçen repolar:
https://github.com/huskobro/ContentManager
https://github.com/huskobro/YouTubeStoryGenerator
https://github.com/huskobro/youtube_video_bot
https://github.com/huskobro/YTRobot-v3

Bu planın temeli şu:
contenthub ana omurga olarak korunacak; dış repolardan kod kopyalanmayacak, yalnızca faydalı desenler ve yetenekler referans alınarak contenthub mimarisine uyarlanacak. Ayrıca ilerleme sırası, contenthub’ın kendi kurallarıyla uyumlu olacak: önce Job Engine ve Step Runner, sonra gerçek Standard Video pipeline, ardından provider genişleme, subtitle derinliği, news, template/style, publish ve analytics.  ￼

Ayrıca mevcut durum da bunu destekliyor: şu an video workflow omurgası, create/detail/timeline/job progress görünürlüğü ve test disiplini oturmuş durumda; ama derin pipeline işleri, backend job entegrasyonu ve review gate sonraki iş olarak duruyor. Bu yüzden ilk büyük hedef gerçek execution motorunu ayağa kaldırmak olmalı.  ￼  ￼

Genel Yol Haritası

Ana fazlar:
	1.	Execution Foundation + SSE Pack
	2.	Standard Video Real Pipeline Pack
	3.	Provider Registry + Fallback Pack
	4.	Whisper Subtitle + Karaoke Pack
	5.	News Ingestion + Bulletin Pipeline Pack
	6.	Template + Style Blueprint Execution Pack
	7.	Publish Center + YouTube v1 Pack
	8.	Analytics + Operations Pack

Aşağıda her fazı, gerektiği kadar alt faza bölerek veriyorum.

⸻

Faz 1 — Execution Foundation + SSE Pack

Bu en kritik faz. Bitmeden sonraki ana fazlara geçilmemeli.

Amaç:
queued job kaydı oluşturan yapıdan, gerçek çalışan bir execution sistemi elde etmek.

1.1 Execution Contract Katmanı

Tanımlanacak çekirdek sözleşmeler:
	•	Job lifecycle
	•	JobStep lifecycle
	•	Artifact türleri
	•	ProviderTrace yapısı
	•	RetryHistory yapısı
	•	ReviewState temel alanları
	•	SSE event type sözleşmeleri
	•	Workspace klasör sözleşmesi
	•	State transition kuralları

Teslim:
	•	yazılı teknik contract belgesi
	•	backend şema/servis kontratları
	•	frontend’in okuyacağı sabit durum isimleri

1.2 Job State Machine

Amaç:
job geçişleri kontrolsüz olmasın.

İçerik:
	•	queued
	•	running
	•	waiting
	•	retrying
	•	completed
	•	failed
	•	cancelled

Kurallar:
	•	geçersiz state geçişleri engellenecek
	•	retry sonrası doğru state’e dönülecek
	•	final state sonrası tekrar çalıştırma ayrı işlem olacak

Teslim:
	•	state_machine.py
	•	unit testler
	•	geçiş matrisi

1.3 Step State Machine

Amaç:
job içindeki her adımın ayrı bir yaşam döngüsü olsun.

İçerik:
	•	pending
	•	running
	•	completed
	•	failed
	•	skipped
	•	retrying

Teslim:
	•	step state geçiş kuralları
	•	step retry kuralları
	•	timeline ile uyum

1.4 Executor + Worker Loop

Amaç:
job gerçekten çalışsın.

İçerik:
	•	in-process worker loop
	•	dispatch mantığı
	•	concurrency limiti
	•	sıradaki job seçimi
	•	job başlatma/durdurma
	•	graceful shutdown davranışı

Teslim:
	•	executor katmanı
	•	worker loop
	•	çalışan queued → running akışı

1.5 Pipeline Runner

Amaç:
step’ler sırayla ve kontrollü çalışsın.

İçerik:
	•	step çözümleme
	•	step execution sırası
	•	step sonucu kaydetme
	•	hata durumunda step/job işaretleme
	•	step artifact kaydı
	•	provider trace kaydı

Teslim:
	•	pipeline/runner.py
	•	adım bazlı orchestration
	•	step bazlı loglama

1.6 Workspace + Artifact Foundation

Amaç:
job çıktıları, geçici dosyalar ve final artefactlar karışmasın.

İçerik:
	•	workspace/ yapısı
	•	temp vs durable ayrımı
	•	job bazlı klasör standardı
	•	artifact metadata
	•	yeniden üretilebilir temp dosya yaklaşımı

Teslim:
	•	workspace init/finalize
	•	artifact kayıt standardı
	•	workspace integrity testleri

1.7 SSE Foundation

Bu faza dahildir; ayrı ana faz değildir.

Amaç:
job ilerlemesi canlı aksın.

İçerik:
	•	global SSE stream
	•	job-specific SSE stream
	•	event type standardı
	•	frontend bağlantı katmanı
	•	React Query invalidation/patch mantığı
	•	Zustand’da yalnızca SSE connection UI state

Teslim:
	•	backend SSE hub
	•	frontend SSE client
	•	canlı progress akışı
	•	sayfa yenilemeden state güncelleme

1.8 Elapsed Time + Basic ETA v1

Amaç:
job ve step süreleri gerçek veriye bağlansın.

İçerik:
	•	elapsed total time
	•	current step elapsed
	•	basit ETA
	•	retry sonrası ETA güncelleme

Teslim:
	•	job detail’da gerçek süre
	•	timeline’da gerçek süre
	•	ETA v1

1.9 Retry + Recovery Basic

Amaç:
tek hatada sistem kırılmasın.

İçerik:
	•	step retry
	•	job retry count
	•	temel restart recovery
	•	yarım kalan job’ı tanıma

Teslim:
	•	retry history kaydı
	•	restart sonrası temel tutarlılık
	•	recovery testleri

Faz 1 Teslim Kriteri

Bu faz bittiğinde:
	•	job gerçek çalışıyor
	•	step timeline gerçek veriyle doluyor
	•	SSE ile canlı ilerleme var
	•	elapsed time ve ETA çalışıyor
	•	artifacts kayıt altına alınıyor
	•	Job Detail gerçek execution data gösteriyor
	•	temel retry/recovery var

⸻

Faz 2 — Standard Video Real Pipeline Pack

Amaç:
mevcut Standard Video UI yüzeyini gerçek üretim zincirine bağlamak.

Şu an workflow görünürlüğü var, ama derin üretim zinciri sonraya bırakılmış durumda. Bu faz bunun için.  ￼

2.1 Standard Video Input Normalization

İçerik:
	•	topic/input temizleme
	•	zorunlu alan kontrolü
	•	module input contract
	•	job başlatma payload standardı

Teslim:
	•	standard video create ekranı gerçek pipeline trigger eder

2.2 Script Step

Kaynak:
	•	ContentManager desenleri
	•	tek LLM provider ile

İçerik:
	•	topic → structured script
	•	scene listesi
	•	narration
	•	visual cue alanları
	•	duration tahmini

Teslim:
	•	script artifact
	•	step log
	•	provider trace

2.3 Metadata Step

İçerik:
	•	başlık
	•	açıklama
	•	etiketler
	•	hashtag yapısı
	•	basic SEO

Teslim:
	•	metadata artifact
	•	detail yüzeyinde gerçek veri

2.4 TTS Step v1

İçerik:
	•	tek provider ile ses üretimi
	•	scene bazlı veya segment bazlı audio
	•	duration kaydı
	•	workspace’te audio artifact

Teslim:
	•	gerçek audio dosyaları
	•	timing tabanı oluşur

2.5 Visuals Step v1

İçerik:
	•	basit keyword extraction
	•	tek visuals provider ile medya toplama
	•	asset indirme
	•	asset cache v1

Teslim:
	•	sahneler için medya artefactları

2.6 Subtitle Step v1

İçerik:
	•	temel subtitle üretimi
	•	scene/audio ile zamanlama
	•	SRT veya eşdeğer format
	•	henüz karaoke şart değil

Teslim:
	•	ilk çalışan subtitle çıktısı

2.7 Composition Step v1

İçerik:
	•	Remotion props assembly
	•	render komutu
	•	render output artifact
	•	hata loglama

Teslim:
	•	gerçek video çıktısı

2.8 Standard Video UI Bağlantısı

İçerik:
	•	create ekranı pipeline başlatır
	•	detail ekranı gerçek step datayı gösterir
	•	job detail gerçek logs/artifacts gösterir
	•	review yüzeyi minimum seviyede bağlanır

Faz 2 Teslim Kriteri

Bu faz bittiğinde:
	•	konu girilip gerçek video üretilebiliyor
	•	script/metadata/audio/visuals/subtitles/composition adımları çalışıyor
	•	artifacts görünür
	•	step bazlı retry mümkün
	•	Standard Video modülü ilk gerçek çalışan modül oluyor

⸻

Faz 3 — Provider Registry + Fallback Pack

Amaç:
gerçek ihtiyaç doğduktan sonra provider soyutlamasını kontrollü şekilde genişletmek.

3.1 Base Provider Contract

İçerik:
	•	ortak provider arayüzü
	•	invoke
	•	timeout/failure handling
	•	trace üretimi
	•	cost metadata alanları

3.2 Provider Registry

İçerik:
	•	provider kayıt mekanizması
	•	capability bazlı çözümleme
	•	active/default provider seçimi
	•	health durumu

3.3 LLM Fallback

İçerik:
	•	primary LLM
	•	secondary fallback LLM
	•	health check
	•	failure sonrası fallback kararı

3.4 TTS Fallback

İçerik:
	•	primary TTS
	•	secondary TTS
	•	voice list
	•	preview endpoint

3.5 Visuals Provider Expansion

İçerik:
	•	ikinci visuals provider
	•	fallback veya parallel sourcing mantığı
	•	asset provenance kaydı

3.6 Provider Manager Admin Surface

İçerik:
	•	provider health görünürlüğü
	•	default provider seçimi
	•	test/preview yüzeyi
	•	settings registry ile bağ

3.7 Provider Trace + Cost v1

İçerik:
	•	her step için provider trace
	•	basit maliyet metadata
	•	job detail/provider trace görünürlüğü

Faz 3 Teslim Kriteri

Bu faz bittiğinde:
	•	birden fazla provider var
	•	fallback çalışıyor
	•	provider health görülebiliyor
	•	provider trace job detail’da görünüyor
	•	admin provider ayarlarını yönetebiliyor

⸻

Faz 4 — Whisper Subtitle + Karaoke Pack

Amaç:
altyazı sistemini farklılaştırıcı hale getirmek.

4.1 Whisper Word-Level Alignment

İçerik:
	•	audio’dan word timing
	•	kelime bazlı zamanlama
	•	alignment artifact

4.2 Subtitle Data Model Expansion

İçerik:
	•	word timing yapısı
	•	scene/subtitle/word ilişkisi
	•	preview için okunabilir format

4.3 Karaoke Highlight

İçerik:
	•	aktif kelime vurgusu
	•	Remotion subtitle bileşeni güncelleme
	•	timing uyumu

4.4 Subtitle Style Set

İçerik:
	•	4–5 net style preset
	•	controlled style seçim modeli
	•	subtitle preview örnekleri

4.5 Preview-First Subtitle Selection

İçerik:
	•	kullanıcı subtitle stilini seçerken örnek görür
	•	preview artifact ile final artifact ayrılır

Faz 4 Teslim Kriteri

Bu faz bittiğinde:
	•	word-level subtitle timing var
	•	karaoke highlight çalışıyor
	•	kullanıcı subtitle stilini kör seçmiyor
	•	preview-first ilke altyazıda gerçeklenmiş oluyor

⸻

Faz 5 — News Ingestion + Bulletin Pipeline Pack

Amaç:
News Bulletin modülünü gerçek veri ve gerçek pipeline ile çalışır hale getirmek.

5.1 RSS / Source Fetch Layer

İçerik:
	•	RSS çekme
	•	source parse
	•	fetch log
	•	source health başlangıcı

5.2 News Normalization

İçerik:
	•	başlık, url, tarih, source normalizasyonu
	•	news item kaydı
	•	içerik özet alanları

5.3 Source Scan Engine Real Execution

İçerik:
	•	manual scan
	•	auto scan
	•	curated scan akışı
	•	scan history

5.4 Used News + Dedupe Protection

İçerik:
	•	hard dedupe
	•	soft dedupe v1
	•	follow-up exception kuralları
	•	used news kaydı

5.5 News Bulletin Pipeline

İçerik:
	•	selected news → script
	•	tts
	•	visuals
	•	subtitles
	•	composition

5.6 News Bulletin UI Bağlantısı

İçerik:
	•	create/detail yüzeyleri gerçek pipeline’a bağlanır
	•	selected items görünürlüğü
	•	source ve used-news bağlantısı

Faz 5 Teslim Kriteri

Bu faz bittiğinde:
	•	RSS taranıyor
	•	news item üretiliyor
	•	dedupe koruması çalışıyor
	•	bulletin pipeline gerçek video üretiyor

⸻

Faz 6 — Template + Style Blueprint Execution Pack

Amaç:
render çalışan hale geldikten sonra, style/template kararlarını güvenli ve sürümlü biçimde execution katmanına bağlamak.

6.1 Template Execution Contract

İçerik:
	•	content template
	•	style template
	•	publish template ayrımı
	•	template version lock

6.2 Style Blueprint Mapping

İçerik:
	•	blueprint → safe composition props
	•	disallowed element kuralları
	•	motion/layout/subtitle/thumbnail yönleri

6.3 Preview Render vs Final Render

İçerik:
	•	hafif preview render
	•	final render ayrımı
	•	preview artifact kaydı

6.4 Style Selection Surface

İçerik:
	•	style cards
	•	mock frames
	•	subtitle overlay previews
	•	lower-third / thumbnail direction preview

6.5 Version Locking

İçerik:
	•	job açıldığında template/style sürümü sabitlenir
	•	yeni sürümler eski job’ı bozmaz

Faz 6 Teslim Kriteri

Bu faz bittiğinde:
	•	kullanıcı büyük görsel kararları preview ile verir
	•	final render güvenli composition mapping ile çalışır
	•	template/style sürümleri job ile kilitlenir

⸻

Faz 7 — Publish Center + YouTube v1 Pack

Amaç:
draft → review → publish zincirini gerçek hale getirmek.

7.1 Publish Contract

İçerik:
	•	publish record
	•	publish state
	•	retry history
	•	audit trail
	•	job linkage

7.2 YouTube OAuth + Channel Binding

İçerik:
	•	OAuth akışı
	•	channel binding
	•	credential storage
	•	admin görünürlüğü

7.3 Upload Engine

İçerik:
	•	resumable upload
	•	metadata injection
	•	privacy seçimi
	•	schedule seçimi
	•	thumbnail upload

7.4 Review Gate + Manual Override

İçerik:
	•	review bekleyen çıktı
	•	publish öncesi manuel onay
	•	override aksiyonları

7.5 Publish Hub UI

İçerik:
	•	draft
	•	review
	•	schedule
	•	publish
	•	retry
	•	publish log

Faz 7 Teslim Kriteri

Bu faz bittiğinde:
	•	tamamlanan video draft olarak hazır
	•	review edilebiliyor
	•	YouTube’a yüklenebiliyor
	•	publish log ve audit trail tutuluyor

⸻

Faz 8 — Analytics + Operations Pack

Amaç:
gerçek üretim ve publish verileri üzerinden analitik yüzeyleri doldurmak.

8.1 Platform Overview

İçerik:
	•	toplam publish
	•	failed publish
	•	job success rate
	•	genel operasyon özeti

8.2 Operations Analytics

İçerik:
	•	average production duration
	•	render duration
	•	retry rate
	•	provider error rate

8.3 Content Analytics

İçerik:
	•	template impact
	•	source impact
	•	module performance
	•	publish başarısı etkileri

8.4 Platform Detail

İçerik:
	•	job/step detay kırılımları
	•	modül bazlı operasyon görünürlüğü
	•	hataların kümelenmesi

8.5 Analytics Hardening

İçerik:
	•	metric doğruluğu
	•	aggregation testleri
	•	boş/verisiz durumların güvenli gösterimi

Faz 8 Teslim Kriteri

Bu faz bittiğinde:
	•	4 analytics görünümü gerçek veriyle dolu
	•	operasyonel karar vermeye yarayan metrikler oluşmuş
	•	analytics yüzeyi placeholder olmaktan çıkmış olur

⸻

Fazlar Arası Geçiş Kuralları

Bir faz bitmeden sonraki ana faza geçilmemeli.

Geçiş kuralları şöyle olmalı:

Faz 1 tamamlanmadan Faz 2’ye geçilmez.
Faz 2 tamamlanmadan Faz 3’e geçilmez.
Faz 3 tamamlanmadan Faz 4’e geçilmez.
Faz 4 tamamlanmadan Faz 5’e geçilmez.
Faz 5 tamamlanmadan Faz 6’ya geçilmez.
Faz 6 tamamlanmadan Faz 7’ye geçilmez.
Faz 7 tamamlanmadan Faz 8’e geçilmez.

Her faz sonunda zorunlu kalite kapısı:
	•	ilgili testler çalışmalı
	•	build temiz olmalı
	•	type check temiz olmalı
	•	change log güncellenmeli
	•	status güncellenmeli
	•	test raporu yazılmalı
	•	git checkpoint alınmalı

Bu da contenthub’ın kendi çalışma kuralıyla uyumlu: her anlamlı değişiklik testli, belgeli ve checkpoint’li olmalı.  ￼

⸻

Dış Repo Kaynak Haritası

Hızlı referans olarak:

ContentManager:
	•	execution foundation
	•	worker loop
	•	pipeline runner
	•	SSE desenleri
	•	provider fallback mantığı
	•	Remotion orchestration
	•	publish adapter mantığı

YTRobot-v3:
	•	Whisper subtitle
	•	karaoke mantığı
	•	RSS/news fetch
	•	news pipeline davranışı
	•	bildirim ve bazı provider fikirleri

youtube_video_bot:
	•	küçük visuals/media helper fikirleri
	•	Pexels/Pixabay benzeri yardımcı mantıklar

YouTubeStoryGenerator:
	•	şimdilik ana yolun dışında
	•	ileride viral scoring / thumbnail fikirleri için not düşülebilir

⸻

Nihai Uygulama Sırası

Kesin uygulanacak sıra şu:
	1.	Execution Foundation + SSE Pack
	2.	Standard Video Real Pipeline Pack
	3.	Provider Registry + Fallback Pack
	4.	Whisper Subtitle + Karaoke Pack
	5.	News Ingestion + Bulletin Pipeline Pack
	6.	Template + Style Blueprint Execution Pack
	7.	Publish Center + YouTube v1 Pack
	8.	Analytics + Operations Pack

Bu sıra hem senin kabul ettiğin Claude planıyla, hem mevcut contenthub durumu ile, hem de CLAUDE.md içindeki ürün kurallarıyla en uyumlu yol.  