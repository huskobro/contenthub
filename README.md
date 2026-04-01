# ContentHub

ContentHub, yerel ortamda çalışan, modüler bir içerik üretim ve yayınlama platformudur.

Klasik bir CMS değildir. İçerik oluşturma, yayın iş akışları, operasyon görünürlüğü, analitik, şablon ve stil yönetimi ile haber kaynağı entegrasyonunu tek bir yerel sistem altında birleştirir.

## Durum

Erken geliştirme aşaması. Şu an Phase 3 tamamlandı — Settings Registry backend temeli kuruldu.

## Teknoloji Yığını

- Backend: FastAPI (Python)
- Frontend: React + Vite + TypeScript
- Veritabanı: SQLite (WAL modu)
- Render: Remotion
- Gerçek zamanlı: SSE
- Kuyruk: Süreç içi asenkron iş kuyruğu

## Dokümantasyon

Ürün kuralları, mimari kararlar, teslim fazları ve çalışma kuralları için bkz. [CLAUDE.md](./CLAUDE.md).

## Dokümantasyon Dili

Bu repository'deki genel dokümantasyon varsayılan olarak **Türkçe** yazılır.

- Dosya yolları, endpoint path'leri, sınıf/fonksiyon adları, değişken isimleri, komutlar ve paket isimleri çevrilmez — teknik tanımlayıcı olarak aynen kalır.
- `CLAUDE.md` şu aşamada istisna olarak İngilizce bırakılmıştır.
- Yeni eklenen genel dokümanlar varsayılan olarak Türkçe yazılmalıdır.
