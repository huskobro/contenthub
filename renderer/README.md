# Renderer

Bu dizin ContentHub'ın render katmanını barındırır.

## Amaç

Renderer kasıtlı olarak backend'den (`backend/`) ayrı tutulur. Render ayrı bir sorumluluk alanıdır — yapılandırılmış içerik verisini Remotion kullanarak video/görsel çıktılara dönüştürür. Bu mantığı FastAPI uygulamasının içine karıştırmak, izole etmesi, test etmesi veya değiştirmesi güç monolitik bir sınır oluşturur.

## Neden Henüz Remotion Kodu Yok

Remotion, composition bileşenleri, bir render giriş noktası ve paketlenmiş bir composition kaydı gerektirir. Bunlar Template sistemi ve Style Blueprint sistemine bağımlıdır; henüz bu sistemler inşa edilmemiştir. Remotion'ı bu sözleşmeler kararlı hale gelmeden önce eklemek erken bağımlılık yaratır.

## Buraya Gelecek Olanlar

- `src/compositions/` — Remotion composition bileşenleri, her içerik modül tipi için ayrı
- `src/shared/` — paylaşılan layout primitifleri, güvenli composition mapping, tip sözleşmeleri
- Güvenli composition mapping: Yapay zeka tarafından üretilen içeriğin kontrolsüz render kodu yazmasına asla izin verilmez. Buradaki deterministik mapping katmanı yapılandırılmış veriyi Remotion prop'larına çevirir.
- Final render giriş noktaları: içerik onaylandıktan sonra iş motoru tarafından çağrılır
- Önizleme/taslak composition yüzeyleri: sihirbaz önizlemeleri ve stil seçimi için hafif tek kare veya kısa segment çıktıları

## Buraya Gelmeyecek Olanlar

- Henüz Remotion paketi yok
- Composition bileşeni yok
- Önizleme pipeline'ı yok
- İş motoru entegrasyonu yok
- Backend veya frontend ile bağlantı yok
