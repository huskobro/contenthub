# Full-Auto Mode: Bilinen Sinirlar ve Ertelenen Kalemler

## Ilk Faz Sinirlari

### Modul Destegi
- Sadece `standard_video` modulu desteklenir
- `news_bulletin`, `product_review`, `educational_video`, `howto_video` modulleri full-auto kapsaminda degil

### Review Gate
- Review gate v1'de fiilen her zaman aktif
- `publish_now` secilse bile icerik draft olarak kalir
- Otomatik yayin (auto-publish) yok
- Operator onayindan gecmeden hicbir icerik yayina alinmaz

### Yayin ve Dagitim
- Otomatik yayin yok (auto-publish ertelendi)
- Multi-platform dagitim yok (sadece mevcut publish altyapisi)
- Yayin zamanlama (schedule) full-auto entegrasyonu yok

### Kaynak ve Icerik Secimi
- Kaynak otomatik secme / kesfetme (auto-source discovery) yok
- Otomatik konu secimi (auto-topic) yok
- A/B test veya icerik varyant olusturma yok
- Blueprint otomatik secimi yok

### Altyapi
- Dagitik (distributed) scheduler yok — tek makine, in-process
- Cluster-safe locking yok
- Scheduler state persistent degil (restart'ta in-memory state sifirlanir, next_run_at DB'den okunur)

---

## Neden Bu Sinirlar?

Her sinir bilerek konuldu. "Refactor later" degil, kasitli kapsam daraltmasi.

| Sinir | Gerekce |
|-------|---------|
| Sadece standard_video | En stabil pipeline. Ilk fazda guvenli baslangic. Diger modullerin input gereksinimleri farkli. |
| Review gate zorunlu | Otomatik uretilen icerik riskli. Operator onayindan gecmeden yayin yapilmamali. |
| Tek makine scheduler | Localhost-first prensip. Harici bagimliliklari (Redis, distributed lock) erteleme. |
| news_bulletin deferred | Farkli input gereksinimi: kaynak tarama + dedupe + kaynak secimi. Standard_video'dan farkli bir pipeline akisi. |
| Auto-source/topic yok | Bu katman ek AI karar mekanizmasi gerektirir. Ilk fazda insan-kontrollu input tercih edildi. |
| Multi-platform yok | Oncelik: tek pipeline'in dogru calismasi. Platform adaptorlerini stabilite sonrasi eklemek daha guvenli. |

---

## Sonraki Faza Ertelenen Kalemler

### Modul Genislemesi
- `news_bulletin` full-auto destegi
  - Kaynak tarama entegrasyonu
  - Dedupe kontrolu
  - Multi-source birlestirme
- Diger modullerin (`product_review`, `educational_video`, `howto_video`) full-auto destegi

### Yayin Otomasyonu
- `publish_now` fiili implementasyonu (review gate ile birlikte)
- Multi-platform publish (YouTube disinda: TikTok, Instagram, vb.)
- Yayin zamanlama ile full-auto entegrasyonu

### Scheduler Gelismeleri
- Dagitik / cluster-safe scheduler
- Gelismis cron syntax destegi (`L`, `#`, `@weekly`, `@monthly`)
- Scheduler health monitoring ve alerting
- Missed-run politikasi konfigurasyonu (catch-up davranisi ayarlanabilir)

### Icerik Zekasi
- Auto-topic / auto-source secimi
- Icerik varyant olusturma (A/B test)
- Blueprint otomatik secimi (icerige gore)
- Performans bazli template secimi

### UI ve Gorunurluk
- Visibility target: `panel:automation` (otomasyon paneli icin visibility engine entegrasyonu)
- Otomasyon dashboard'u (ayri sayfa)
- Scheduler gantt/timeline gorunumu

---

## Teknik Borc Notu

Asagidaki kalemler teknik borc olarak kayitlidir:

1. **Scheduler state yonetimi**: Restart sonrasi in-memory state sifirlanir. `next_run_at` DB'den okunur ancak `last_tick_at` gibi runtime bilgiler kaybolur.
2. **Guard evaluation caching yok**: Her tetiklemede tum guard'lar bastan evaluate edilir. Yuksek frekansta proje sayisi artarsa performans etkisi olabilir.
3. **Audit log query optimizasyonu**: `full_auto.*` prefix'li kayitlarin sorgulanmasi icin ozel index yok. Buyuk veri hacminde performans etkisi olabilir.
4. **Concurrent guard race condition**: Cok kisa aralikla iki tetikleme gelirse, concurrent guard atlanabilir. Pratik riskin dusuk oldugu degerlendirildi (tek makine, sequential scheduler tick).
