# Test Report — Phase 32: Admin News Bulletin Create/Edit Frontend

## Date
2026-04-02

## Amaç
Admin panelde News Bulletin kaydı oluşturma ve düzenleme formu eklendi. Registry ekranına "Yeni News Bulletin" butonu ve detail panel'e edit mode getirildi.

## Çalıştırılan Komutlar
```
npm run test -- --reporter=verbose
npm run build  (tsc --noEmit + vite build)
```

## Test Sonuçları

### Phase 32 Tests — 7/7 PASSED (news-bulletin-form.smoke.test.tsx)

| Test | Result |
|------|--------|
| renders the create page heading | PASSED |
| shows topic field | PASSED |
| shows validation error when topic is empty on submit | PASSED |
| cancel button is present and clickable on create page | PASSED |
| calls create mutation on valid submit | PASSED |
| registry page shows '+ Yeni News Bulletin' button | PASSED |
| edit mode opens when Düzenle is clicked in detail panel | PASSED |
| cancel closes edit mode in detail panel | PASSED |

### Full Frontend Suite
**147/147 PASSED** | Build ✅ 354.42 kB

## Bilerek Yapılmayanlar
- Selected news picker UI yok
- Used-news enforcement UI yok
- Draft/script generation yok
- Wizard yok
- User panel news bulletin sayfası yok

## Riskler / Ertelenenlar
- selected_news_ids_json JSON textarea olarak bırakıldı — ileride picker ile değiştirilebilir
- Negatif duration client-side validate ediliyor, server-side da zaten reddediyor
