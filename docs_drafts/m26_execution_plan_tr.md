# M26 — Uygulama Plani

## Genel Amac
ContentHub'i daha operator dostu, daha kesfedilebilir ve daha akilli hale getirmek.
Command palette'i gercek bir operator discovery merkezi yapmak.
Server-backed arama, contextual komutlar ve control surface olgunlastirmasi.

## Fazlar

### Faz A: Server-Backed Discovery
1. Backend'e unified search endpoint eklenmesi (`GET /api/v1/discovery/search`)
2. Mevcut list endpoint'lerine `search` parametresi eklenmesi:
   - Jobs: module_type/status uzerinde
   - Sources: name uzerinde ilike
   - Templates: name uzerinde ilike
   - Style Blueprints: name uzerinde ilike
   - News Items: title uzerinde ilike
3. Frontend'de discovery hook (React Query + debounce)
4. Command palette'e server discovery entegrasyonu

### Faz B: Contextual Command System
1. Command palette store'una context destegi (currentRoute)
2. Contextual commands: sayfa-bazli komutlar
   - Jobs: durum filtreleme
   - Library: icerik tipi filtreleme
   - Settings: arama odaklama
   - Sources: tip/durum filtreleme
3. Event-based action dispatch sistemi (useContextualActions)
4. AdminLayout'da route takibi ve context guncelleme

### Faz C: Control Surfaces Deepening
1. CredentialsPanel: token derinlestirme, spacing/shadow/transition
2. EffectiveSettingsPanel: zaten iyi — dokunulmadi
3. Settings genel deneyimi: tab aciklamalari, durum netigi
4. Analytics: mevcut metrik ve filtre akislari korundu
5. Publish: mevcut yapilar korundu (ileride genisletme icin hazir)

### Faz D: Registry/Detail/Action Experience Maturation
1. Tablo sayfalari taramasi: tutarsizlik duzeltmeleri
2. Detail panel / Sheet / inline detail davranislari kontrolu
3. Action grouping ve button dili tutarliligi
4. Back-link ve context preservation

### Faz E: Theme + Shell Continuation Polish
1. Command palette tema uyumu
2. Server discovery sonuclari shell diliyle uyumlu
3. Typography ve spacing tutarliligi
4. Dark mode: TAM ve guvenli bitirilmezse eklenmeyecek

### Faz F: Test, Truth Audit, Docs, Commit
1. Yeni testler (discovery, contextual commands, filtreleme)
2. TypeScript temiz
3. Frontend full suite
4. Backend testleri
5. Truth audit
6. 8 dokumantasyon dosyasi
7. Commit + push

## Risk ve Kararlari
- Dark mode: TAM yapilmazsa eklenmeyecek — risk: yarim dark mode kullanici icin daha kotu
- Publish registry sayfasi: henuz yok — bu fazda eklenmeyecek (scope disi)
- Settings wiring: mevcut autosave/effective sistem korunuyor, degistirilmiyor
