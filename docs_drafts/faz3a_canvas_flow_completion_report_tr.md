# Faz 3A — Canvas Flow Completion Raporu

## 1. Kapsam ve amac

Faz 3'te Canvas user shell'i ve uc proje-merkezli sayfa (dashboard /
projects list / project detail) acildi. Ama kullanici publish, kanallar,
baglantilar ve analitik gibi akislara girdigi an legacy yuzeylere dusuyordu.

Faz 3A'nin tek amaci **canvas user deneyimini butun hale getirmek** —
kullanicinin legacy'ye dusme ihtiyacini azaltmak, dagitim + analiz
akislarini workspace diline cekmek. Odak "yeni buyuk ozellik eklemek" degil;
**hissiyati tamamlamak.**

Bu faz icinde:
- admin paneline dokunulmadi
- Bridge bozulmadi
- Atrium'a el surulmedi
- backend contract'i degistirilmedi (yeni endpoint uydurulmadi)
- create wizard backend mantigi bozulmadi
- preview/metric uydurulmadi (preview-honest kaldi)

## 2. Override edilen yeni user sayfalari

Faz 3A dort yeni Canvas override ekledi. Uceleme siralamasi kullaniciya
gorunurluk ve sikligina gore secildi — publish ve channels/connections en
yuksek oncelikte, analytics dordunculuk olarak eklendi (calendar bu fazda
yapilmadi — bkz. "bilinen sinirlar").

| Sayfa | Key | Canvas dosyasi | Legacy trampolin |
|--|--|--|--|
| Yayin Atolyesi | `user.publish` | `CanvasUserPublishPage.tsx` | `UserPublishPage.tsx` |
| Kanal Studyom | `user.channels.list` | `CanvasMyChannelsPage.tsx` | `MyChannelsPage.tsx` |
| Baglanti Merkezim | `user.connections.list` | `CanvasUserConnectionsPage.tsx` | `UserConnectionsPage.tsx` |
| Performans Studyom | `user.analytics.overview` | `CanvasUserAnalyticsPage.tsx` | `UserAnalyticsPage.tsx` |

Faz 3 ile birlikte Canvas'in topladigi toplam override sayisi **7**:
`user.dashboard`, `user.projects.list`, `user.projects.detail` (Faz 3) +
`user.publish`, `user.channels.list`, `user.connections.list`,
`user.analytics.overview` (Faz 3A).

## 3. Her sayfa icin kisa aciklama

### 3.1 `CanvasUserPublishPage` — Yayin Atolyesi

Legacy `UserPublishPage` "3 numarali bolum, flat liste" seklinde davraniyor
— kullanici asagiya kayarak proje secer, baglanti secer, form doldurur. Canvas
yorumunda bu yeniden **iki-sutun atolye**: sol sutun "hazir projeler" listesi,
sag sutun secilen projenin ozeti + baglanti picker + inline intent formu.
Placeholder panel proje secilmediginde degeri acikca gosteriyor.

Data hatlari birebir korundu:
- `fetchContentProjects({ content_status: "completed" })` ve
  `content_status: "in_production"` iki query'sinin merge + dedupe'u
- `fetchChannelProfiles()` kanal isim lookup'i icin
- `fetchConnectionsForPublish(channelProfileId)`
- `createPublishRecordFromJob` + `updatePublishIntent` + `submitForReview`
  mutasyon zinciri
- `fetchPublishRecordsByProject` mevcut yayin kayitlari

Yani server tarafinda review gate, onay akisi, platform kisitlamalari
degismedi. Canvas yalnizca operator goruntusunu yeniden dusundu.

### 3.2 `CanvasMyChannelsPage` — Kanal Studyom

Legacy "form acilir kapanir + kart grid" yaklasimi korundu ama workspace'e
evrildi: hero, stats ribbon (toplam / aktif / farkli dil), inline create
drawer, kart grid. Her kart secilen kanalin proje sayisini de gosteriyor
(client-side aggregation, yeni endpoint yok — mevcut `useContentProjects`'ten
cikariliyor).

Hooks:
- `useChannelProfiles(userId)`
- `useCreateChannelProfile()`
- `useContentProjects({ user_id, limit: 200 })` — sadece kart footnote'lari
  icin, server-side filtreleme yok

### 3.3 `CanvasUserConnectionsPage` — Baglanti Merkezim

Platform baglantilari bir **workspace saglik tablosu** olarak yeniden
kurgulandi. Hero'da reauth uyarisi, hemen altinda 5'li saglik ribbon'u
(healthy / partial / disconnected / reauth_required / token_issue), filtre
bari, capability matrix'li kart grid'i. Capability badge'leri tooltip'siz
kompakt kaldi, issue listesi hala yakala-goster.

Hooks:
- `useMyConnections({ platform, health_level })`

Server contract tamamen korundu — `capability_matrix`, `health_level`,
`requires_reauth` alanlari aynen kullaniliyor.

### 3.4 `CanvasUserAnalyticsPage` — Performans Studyom

Legacy `UserAnalyticsPage` zaten `fetchDashboardSummary` + shared
`TrendChart` + `DistributionDonut`'a yasliyordu. Canvas yorumu ayni data
hattini kullaniyor ama chrome'u "performans studyosu" olarak yeniden kurdu:
hero + window button group (pill-style), 4'lu KPI ribbon, 2-kolon card
(trend + donut). Boylece analytics page'i artik legacy hissiyatinin bir
parcasi olmuyor, Canvas workspace icinde bir yer tutuyor.

Hooks + API:
- `fetchDashboardSummary({ window, user_id })` — birebir legacy ile ayni
- `TrendChart`, `DistributionDonut` — shared, forklanmadi

## 4. Trampolin pattern'i (Faz 3 ile tutarli)

4 legacy sayfa ayni trampolin yapisini aldi:

```tsx
export function UserPublishPage() {
  const Override = useSurfacePageOverride("user.publish");
  if (Override) return <Override />;
  return <LegacyUserPublishPage />;
}

function LegacyUserPublishPage() {
  // eski govde
}
```

`useSurfacePageOverride` key prefix'inden scope'u zaten `user` olarak
cikariyor, yani contract migration gerekmedi. `SurfacePageKey` branded-union
oldugu icin `user.publish`, `user.channels.list` gibi yeni anahtarlar
strukturel olarak zaten kabul ediliyor.

Legacy `UserConnectionsPage` bu faza kadar `PageShell`'e `testId` vermiyordu;
fallback testi icin `testId="user-connections"` eklendi. Bu, fallback smoke
testi disinda gorunur bir yan etkisi olmayan kucuk bir dokunus (legacy
render agaci degismedi, yalnizca `data-testid` attribute'u eklendi).

## 5. Canvas user deneyimi daha butun hale geldi mi?

**Evet, kayda deger olcude.**

Onceden Canvas sadece ilk 3 yuzeyde vardi:
- `/user` (dashboard)
- `/user/projects` (proje listesi)
- `/user/projects/:id` (proje detay)

Canvas sidebar'dan **Dagitim** zonuna (publish / channels / connections) ya
da **Analiz** zonuna gecen kullanici eskiden anlik olarak legacy chrome'una
dusuyordu — hero, badge sistemi, layout her sey degisiyordu. Artik o 4
sayfa Canvas workspace dilinde:
- ayni hero stili (small brand label + h1 + hint)
- ayni spacious card-forward chrome
- ayni stats/health ribbon disiplini
- ayni preview-honest gorsel dili

Dagitim tarafi ozellikle belirgin hale geldi: publish artik "bir form
sayfasi" degil, "bir proje uzerinde bitirme atolyesi" gibi hissettiriyor.
Channels "kanal profilleri listesi" degil, "studyo uslu grid". Connections
de "card grid + filter" degil, "sagligi on planda olan kontrol tablosu".

Calendar bu fazda bilinerek atlandi. Tercih sirasinda dorduncu slotu
analytics kazandi cunku analytics hem **cok sik ziyaret edilen** (workspace
zon'unda insights bolumunun tek elementi) hem de **shared chart**'lari
halihazirda olan bir sayfaydi. Calendar'in 800+ satirlik zengin govdesi
(scheduled publishes + timeline) ayri bir faza birakildi.

## 6. Legacy fallback bozuldu mu?

**Hayir.** Canvas kapali oldugunda veya `useSurfacePageOverride` null
dondurdugunde dort sayfanin da legacy govdesi aynen calisir. Bu kontrat
`canvas-flow-legacy-fallback.smoke.test.tsx` tarafindan her sayfa icin ayri
ayri dogrulaniyor (SurfaceProvider mount edilmeden sayfa render ediliyor,
Canvas testId'lerinin bulunmadigi ve legacy heading testId'lerinin bulundugu
dogrulaniyor).

Ek olarak:
- Legacy `UserConnectionsPage.tsx`'te yalnizca `PageShell testId`
  eklendi — govde degismedi.
- Diger uc legacy dosyada (Publish / Channels / Analytics) govde hic
  degismedi; sadece fonksiyon adi `LegacyXxxPage` olarak yeniden isimlendirildi
  ve bir trampolin sarmalayicisi yukari eklendi.

## 7. Test sonuclari

| Gate | Sonuc |
|--|--|
| `npx tsc --noEmit` | temiz, 0 hata |
| `npx vite build` | 2.69s, temiz |
| Targeted `canvas-flow-*` suite | 2 dosya / 8 test, 8 pass |
| Faz 3 + Faz 3A targeted (6 dosya) | 6 dosya / 29 test, 29 pass |
| Surface + bridge + canvas butun suite | 15 dosya / 102 test, 102 pass |
| Full suite (`npx vitest run`) | 243 failed / **2204 passed** — baseline'a gore sifir yeni regresyon (243 Faz 3 baseline ile **birebir** ayni), +9 yeni pass |

Faz 3 baseline: 243 fail / 2195 pass. Faz 3A sonrasi: 243 fail / 2204 pass.
Failed test sayisi birebir ayni kaldi; yeni 9 passing test Faz 3A testlerinden
(`canvas-flow-legacy-fallback` + `canvas-flow-shell` + guncellenmis
`canvas-user-surface` + guncellenmis `surfaces-builtin-registration`).

## 8. Degismis / eklenmis dosyalar

Yeni dosyalar:
- `frontend/src/surfaces/canvas/CanvasUserPublishPage.tsx`
- `frontend/src/surfaces/canvas/CanvasMyChannelsPage.tsx`
- `frontend/src/surfaces/canvas/CanvasUserConnectionsPage.tsx`
- `frontend/src/surfaces/canvas/CanvasUserAnalyticsPage.tsx`
- `frontend/src/tests/canvas-flow-legacy-fallback.smoke.test.tsx`
- `frontend/src/tests/canvas-flow-shell.smoke.test.tsx`
- `docs_drafts/faz3a_canvas_flow_completion_report_tr.md`

Degismis dosyalar (minimal trampolin/registry/test guncellemeleri):
- `frontend/src/surfaces/manifests/register.tsx` — 4 yeni namespace import,
  4 yeni forwarder, 4 yeni override map entry
- `frontend/src/pages/user/UserPublishPage.tsx` — trampolin + `LegacyUserPublishPage`
- `frontend/src/pages/user/MyChannelsPage.tsx` — trampolin + `LegacyMyChannelsPage`
- `frontend/src/pages/user/UserConnectionsPage.tsx` — trampolin + `LegacyUserConnectionsPage` + `PageShell testId="user-connections"`
- `frontend/src/pages/user/UserAnalyticsPage.tsx` — trampolin + `LegacyUserAnalyticsPage`
- `frontend/src/tests/canvas-user-surface.unit.test.ts` — override sayisi 3'ten 7'ye cikti, yeni assertion
- `frontend/src/tests/surfaces-builtin-registration.unit.test.ts` — canvas testi 7 override'i kapsar hale getirildi

## 9. Bilinen sinirlar / teknik borc

- **Calendar Canvas'ta degil.** `UserCalendarPage` 800+ satirlik zengin bir
  govde; schedule + published list + timeline + day-detail panel tasiyor.
  Faz 3A kapsaminda dort onceligin disinda birakildi. Canvas'ta calendar
  gozukmediginde kullanici bir kez daha legacy'ye duser — ama calendar
  kullanim sikligi dagitim/analiz akislarina gore daha dusuk oldugu icin
  oncelik farki bilincli.
- **Publish AssistedComposer disardi birakildi.** Canvas publish form'u,
  legacy'deki `AssistedComposer`'i kullanmiyor; sade `<input>` ve
  `<textarea>` ile inline. Bunun uc nedeni var: (1) composer'in kendi zip
  kontrolu ve policy bagimliligi Canvas'in sadelik hedefini gerginlestiriyor,
  (2) shell test'lerinde daha az stub gerektiriyor, (3) ileride Canvas'a
  ozgu bir "yayin onerisi" bileseni takilmasi daha kolay olacak. Bu bilincli
  bir sinirlama, bir geri adim degil — `AssistedComposer` hala legacy publish
  sayfasinda yasiyor.
- **Connection capability badge'lerinde tooltip yok.** Legacy versiyonda
  her capability badge'inde `title` attribute'u var. Canvas'ta badge chip'leri
  gorsel olarak daha kompakt ama tooltip yerine class-coded renk tasiyor.
  Gelecek fazda, custom tooltip bileseni eklenirse guncellenebilir.
- **Channel stats yarim.** Canvas kanal kartlarindaki "projeler" sayisi
  client-side aggregation; eger `useContentProjects` limit'i 200'un uzerine
  cikarsa eksik sayim olabilir. Gercek "channel KPI" endpoint'i soz konusu
  olmadigi icin bu bilincli bir kestirme — server-side aggregation
  gerektirseydi Faz 3A kapsami disi bir backend degisikligi gerekirdi.
- **Full suite'teki 243 failing test Faz 3A kapsami disi**: M7 fresh DB,
  22 smoke test updates ve onceki fazlardan gelen known issues. Bunlar Faz 3
  baseline ile birebir ayni liste.
- **Kanal detay sayfasi (`/user/channels/:id`) Canvas'ta degil.** Canvas
  kanal kartina tiklayinca legacy `ChannelDetailPage`'e gider. Bu bilincli
  — detay sayfasi platform connections CRUD icerdigi icin kendi fazi gerekir.

## 10. Commit hash & push durumu

Commit hash: `7364f941940051bd75d911c951442d17fd7919cf`
(kisa: `7364f94`)

Push: **basarili** — `git push origin main` → `b8f371f..7364f94  main -> main`.
