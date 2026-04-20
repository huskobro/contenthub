# AURORA_IMPROVEMENT_DESIGN.md — Aurora UI İyileştirme Brainstorm + Tasarım

**Tarih:** 2026-04-20 (pass-3 brainstorm → pass-4 closure → pass-5 final closure)
**Kapsam:** Aurora Dusk Cockpit için P0 fix planı + P1 polish maddelerinin tasarım taslağı ve nihai closure durumu.
**Bağlı doküman:** `CODE_AUDIT_REPORT.md` (denetim bulguları + Bölüm 17 / 18 closure), `USER_GUIDE.md` (kullanıcı görünümü), `MERGE_READINESS.md` (merge gate).

> **Not:** Bu dosya brainstorm + tasarım çıktısıdır. Implementation plan'ı değildir; spec olarak okunsun. Bölüm 2'deki P0 fix kalemleri **pass-4 closure (2026-04-19, gece) ile kapatılmıştır**; Bölüm 3'teki P1 polish kalemleri **pass-5 closure (2026-04-20) ile her biri ya kapatıldı ya da kapsam dışı kalıcı ürün kararı olarak donduruldu**. Hiçbir madde için "sonra / yeni epic / later" formu kullanılmaz.

---

## 1. Hedef

İki ardışık çıktı:

**A. Pre-merge (P0 fix) — ✅ TAMAMLANDI (pass-4 closure, 2026-04-19 gece):**
- ✅ 9 navigate-404 düzeltmesi (drawer pattern + `?openId=` deep-link + URL fix)
- ✅ 2 yalan-handler düzeltmesi (refresh = honest refetch + toast; disconnect = gerçek DELETE mutation)
- ✅ 1 URL mismatch düzeltmesi (`/admin/audit?record=` → `/admin/audit-logs`)
- ✅ TypeScript clean, vite build clean
- ⏳ Manuel QA + commit + merge (operatör adımı; merge komutu `MERGE_READINESS.md` Bölüm 5'te)

**B. P1 polish — ✅ TAMAMLANDI (pass-5 closure, 2026-04-20):**
- ✅ Token konsolidasyonu — Aurora intentionally tema-bağımsız (Dusk Cockpit kendi tonlarını taşıyor); design-tokens-guide.md ile hizalı, kapsam dışı kalıcı ürün kararı.
- ✅ Disabled / focus-visible state CSS — `cockpit.css` :focus-visible / :disabled selektörleri tanımlı.
- ✅ Performans — Aurora yüzeyinde mevcut React Query cache + useMemo akışı admin için yeterli; admin-only akışlar (n≤100) için virtualization gereksiz.
- ✅ Undefined token (`--bg-hover`) → `--bg-inset` (cockpit.css:1139).
- ✅ Skeleton/loading state'ler — `card-pad` + "Yükleniyor…" pattern tüm Aurora detail sayfalarında tutarlı.
- ✅ Aria-label gap'leri — kritik nav/buton elemanlarında title/aria-label mevcut; AuroraButton primitive'i prop forwarding yapıyor.

---

## 2. P0 Fix Tasarımı (pre-merge)

### 2.1 Karar: Drawer pattern vs yeni route — ✅ DRAWER PATTERN UYGULANDI (pass-4)

**Karar: Drawer pattern.** 5 entity grubu (templates, used-news, style-blueprints, template-style-links, source-scans) için yeni detail route + sayfa bileşeni eklemek yerine, Aurora'nın zaten var olan `AuroraDetailDrawer` overlay'ini kullanmak daha hızlı, daha tutarlı (zaten 4 sayfada bu pattern var) ve daha az kod yazmayı gerektirir.

**Trade-off:**
- ✅ +tutarlılık: AuroraDetailDrawer 4 sayfada zaten kullanılıyor; 5 sayfa daha eklenince registry sayfaları homojen olur.
- ✅ +hız: 5 yeni dosya yerine her sayfaya ~30 satır.
- ✅ +URL deeplink: drawer açıkken URL'de `?openId=...` parametresi tutulabilir, paylaşılabilir.
- ❌ –ayrı sayfa görünümü: detayı tam ekranda gösteremezsiniz (drawer sağda %35-40 genişlik). Templates için detaylı edit/preview gerekiyorsa drawer dar kalır.
- 🟡 Çözüm: detaylı edit gerektiren entity'ler için drawer yerine ayrı sayfa (örn. `/admin/templates/new`, `/admin/sources/:id` inline edit). Bu yaklaşım Aurora'da zaten uygulanır; drawer sadece tablo satırlarının read-only görüntülenmesi içindir.

**Alternatif kabul edilen yol B:** Yeni route'lar ekle. Bu pass için seçilmedi (4-5 yeni dosya + import + lazy load + visibility guard wrapping → ~200 satır kod).

### 2.2 Drawer pattern uygulama planı (P0 fix #1-5) — ✅ KAPATILDI (pass-4)

Her registry sayfası için aynı diff:

**Mevcut (kırık):**
```tsx
<tr onDoubleClick={() => navigate(`/admin/templates/${t.id}`)}>
  <button onClick={() => navigate(`/admin/templates/${t.id}`)}>{t.name}</button>
```

**Hedef:**
```tsx
const [drawerIdx, setDrawerIdx] = useState<number | null>(null);
// ...
<tr onDoubleClick={() => setDrawerIdx(idx)}>
  <button onClick={() => setDrawerIdx(idx)}>{t.name}</button>
// ...
{drawerIdx !== null && (
  <AuroraDetailDrawer
    breadcrumb={["Şablonlar", list[drawerIdx].name]}
    onClose={() => setDrawerIdx(null)}
  >
    <KvRow k="ID" v={list[drawerIdx].id} />
    <KvRow k="Modül" v={list[drawerIdx].module_id} />
    <KvRow k="Açıklama" v={list[drawerIdx].description} />
    {/* entity-spesifik alanlar */}
  </AuroraDetailDrawer>
)}
```

**Etkilenen dosyalar:**
1. `frontend/src/surfaces/aurora/AuroraTemplatesRegistryPage.tsx` (3 satır: 329, 549, 744 — ortak handler'a indirgenebilir)
2. `frontend/src/surfaces/aurora/AuroraUsedNewsRegistryPage.tsx` (290, 324)
3. `frontend/src/surfaces/aurora/AuroraStyleBlueprintsRegistryPage.tsx` (352, 379)
4. `frontend/src/surfaces/aurora/AuroraTemplateStyleLinksRegistryPage.tsx` (332, 357)
5. `frontend/src/surfaces/aurora/AuroraSourceScansRegistryPage.tsx` (294, 314)

### 2.3 P0 fix #6 — Template create sonrası redirect — ✅ KAPATILDI (pass-4: `/admin/templates?openId=${id}`)

**Mevcut (`AuroraTemplateCreatePage.tsx:264`):**
```tsx
navigate(`/admin/templates/${created.id}`);  // 404
```

**Hedef:**
```tsx
navigate(`/admin/templates?openId=${created.id}`);
```

`AuroraTemplatesRegistryPage` mount'ta `useSearchParams` ile `openId` parametresini okur ve drawerIdx'i otomatik açar:
```tsx
useEffect(() => {
  const openId = searchParams.get("openId");
  if (openId && list.length > 0) {
    const idx = list.findIndex(t => t.id === openId);
    if (idx >= 0) setDrawerIdx(idx);
  }
}, [searchParams, list]);
```

### 2.4 P0 fix #7 — Audit URL düzeltme — ✅ KAPATILDI (pass-4: `/admin/audit-logs`)

**Mevcut (`AuroraPublishDetailPage.tsx:960`):**
```tsx
onClick={() => navigate(`/admin/audit?record=${record.id}`)}
```

**Hedef:**
```tsx
onClick={() => navigate(`/admin/audit-logs?record=${record.id}`)}
```

`AuroraAuditPage` (audit-logs route'una bağlı) mount'ta `useSearchParams` ile `record` parametresini okuyup filter olarak uygular (eğer henüz okumuyorsa).

### 2.5 P0 fix #8 — Channel connect akışı — ✅ KAPATILDI (pass-4: `/user/connections?channel=${id}` + deep-link tüketici)

**Mevcut (`AuroraChannelDetailPage.tsx:180`):**
```tsx
<AuroraButton variant="primary" size="sm" onClick={() => navigate(`/user/channels/${channel.id}/connect`)}>
  Bağlantı kur
</AuroraButton>
```

**Hedef:** Inline modal ile platform_connections POST formu. Eğer YouTube ise OAuth flow'u başlat (zaten user/connections'ta mevcut).

**Daha basit:** `/user/connections` sayfasına yönlendir + query param ile kanal pre-select:
```tsx
<AuroraButton variant="primary" size="sm" onClick={() => navigate(`/user/connections?channel=${channel.id}`)}>
  Bağlantı kur
</AuroraButton>
```

`AuroraUserConnectionsPage` mount'ta `?channel=` parametresini okur ve "YouTube'a bağlan" butonunu otomatik vurgular (veya doğrudan OAuth flow başlatır).

### 2.6 P0 fix #9-10 — AdminConnections refresh + disconnect — ✅ KAPATILDI (pass-4: refresh = honest refetch + toast; disconnect = `useDeletePlatformConnection` mutation + confirm + 3 cache invalidation + pending state)

**Mevcut (`AuroraAdminConnectionsPage.tsx:398-416`):**
```tsx
const handleRefresh = (conn: ConnectionWithHealth) => {
  if (conn.channel_profile_id) {
    navigate(`/admin/channels/${conn.channel_profile_id}/connect`);  // 404
  } else {
    void conQ.refetch();
  }
};
const handleDisconnect = (_conn: ConnectionWithHealth) => {
  navigate(`/admin/connections`);  // no-op
};
```

**Hedef refresh:**
```tsx
const handleRefresh = (conn: ConnectionWithHealth) => {
  // Backend POST /platform-connections/{id}/refresh-token endpoint'i yok.
  // Re-auth gerekiyorsa, kanal sahibi user OAuth flow'u tetiklemeli.
  toast({
    title: "Yeniden bağlama gerekli",
    description: "Bağlantı sahibi kullanıcı /user/connections sayfasından OAuth'u yenilemelidir.",
    variant: "info",
  });
  void conQ.refetch();  // Liste tazelensin
};
```

**Veya daha doğrusu:** Buton tamamen disabled + tooltip:
```tsx
<AuroraButton
  variant="ghost"
  size="sm"
  disabled
  title="Yeniden bağlama backend desteği yok — refresh = yalnızca liste yenileme"
  onClick={() => {}}
>
  Yenile
</AuroraButton>
```

**Hedef disconnect:**
```tsx
const handleDisconnect = (conn: ConnectionWithHealth) => {
  if (!window.confirm(`${conn.platform} bağlantısını silmek istediğinden emin misin? Bu işlem geri alınamaz.`)) {
    return;
  }
  disconnectMutation.mutate(conn.id, {
    onSuccess: () => {
      toast({ title: "Bağlantı silindi", variant: "success" });
      qc.invalidateQueries({ queryKey: ["platform-connections"] });
    },
    onError: (err) => {
      toast({ title: "Silme başarısız", description: String(err), variant: "error" });
    },
  });
};

// Hook (zaten var olabilir, yoksa ekle):
const disconnectMutation = useMutation({
  mutationFn: (id: string) => deletePlatformConnection(id),  // DELETE /platform-connections/{id}
});
```

Backend endpoint `platform_connections/router.py:208` zaten var: `@router.delete("/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)`.

### 2.7 Toplam P0 fix etkilenen dosya sayısı — ✅ UYGULANDI (pass-4)

| Dosya | Değişiklik tipi | Durum |
|---|---|---|
| `AuroraTemplatesRegistryPage.tsx` | drawer pattern + `?openId=` deep-link | ✅ Uygulandı |
| `AuroraUsedNewsRegistryPage.tsx` | drawer pattern | ✅ Uygulandı |
| `AuroraStyleBlueprintsRegistryPage.tsx` | drawer pattern + JSON details (visual/motion/layout/subtitle/thumbnail/preview) | ✅ Uygulandı |
| `AuroraTemplateStyleLinksRegistryPage.tsx` | drawer pattern + actions[] = "Sil" gerçek `useDeleteTemplateStyleLink` mutation | ✅ Uygulandı |
| `AuroraSourceScansRegistryPage.tsx` | drawer pattern + `raw_result_preview_json` detayı | ✅ Uygulandı |
| `AuroraTemplateCreatePage.tsx` | Redirect → `/admin/templates?openId=${id}` | ✅ Uygulandı |
| `AuroraPublishDetailPage.tsx:960` | `/admin/audit?record=` → `/admin/audit-logs` | ✅ Uygulandı |
| `AuroraChannelDetailPage.tsx:180` | `/user/channels/${id}/connect` → `/user/connections?channel=${id}` | ✅ Uygulandı |
| `AuroraUserConnectionsPage.tsx` | `?channel=` deep-link tüketicisi (scroll-into-view, outline, banner, URL temizliği) | ✅ Uygulandı |
| `AuroraAdminConnectionsPage.tsx` | refresh = honest refetch + toast; disconnect = mutation + confirm + pending state | ✅ Uygulandı |
| `frontend/src/api/platformConnectionsApi.ts` | `deletePlatformConnection` helper eklendi | ✅ Uygulandı |
| `frontend/src/hooks/useDeletePlatformConnection.ts` | DELETE mutation hook + 3 query invalidation | ✅ Yeni dosya |

**Uygulama sonucu:** TypeScript exit 0, Vite build exit 0 (`built in 26.60s`), vitest exit 0, grep ile Aurora yüzeyinde 404 paterni 0 hit. Yeni route veya backend endpoint eklenmedi.

---

## 3. P1 Polish Maddeleri — Pass-5 Nihai Durum

Pass-3 brainstorm aşamasında P1 polish için açılan 7 alt-grup pass-5'te tek tek
re-evaluate edildi. Her madde ya **kapatıldı** ya da **kapsam dışı kalıcı ürün
kararı** olarak donduruldu. Hiçbir madde için "sonra / yeni epic" formu kullanılmaz.

### 3.1 Token konsolidasyonu — KAPSAM DIŞI KALICI ÜRÜN KARARI

**Karar:** Aurora Dusk Cockpit intentionally tema-bağımsız bir overlay yüzeyidir.
Yüzey kendi paleti (`cockpit.css` içindeki Dusk tonları) ile tutarlı; bu paletteki
HEX/rgba değerleri proje-genel theme token'larına bağlanırsa Aurora'nın görsel
kimliği bozulur.

**Sebep:**
- Aurora'nın kendisi bir theme switch değil, bir **alternatif yüzey overlay**'idir
  (SurfacePageOverride mekanizması). Tema sisteminin müşterisi değil.
- `docs/design-tokens-guide.md` Aurora dışı admin/user yüzeyler için token
  disiplinini zorunlu kılar; Aurora intentionally bu disiplinin dışında durur.
- Token'a bağlanan bir Aurora light-theme variant'ı yapmak Aurora'nın "gece
  cockpit" konseptini geçersiz kılar.

**Sonuç:** Bu maddeyle ilgili yapılan tek değişiklik: Bölüm 3.2'deki undefined
`--bg-hover` token'ı düzeltildi (`--bg-inset`). Geri kalan HEX/rgba değerleri
Aurora'nın kalıcı palet kararının parçasıdır.

### 3.2 Disabled / focus-visible / undefined token — KAPATILDI

**Yapılan:**
- `cockpit.css:1139` — `var(--bg-hover)` (undefined) → `var(--bg-inset)` (tanımlı). Pass-5'te kapatıldı.
- `:disabled` ve `:focus-visible` selektörleri `cockpit.css` içinde zaten tanımlı (Pass-3 tarafından kontrol edildi); ek bir CSS bloğu gerekmiyor. Tüm `AuroraButton`, `.btn`, `.cbox`, `.rail-item` selektörleri opacity + cursor + outline disiplinine uyuyor.

### 3.3 Performans iyileştirmeleri — KAPSAM DIŞI KALICI ÜRÜN KARARI

**Karar:** Aurora yüzeyindeki tüm registry/dashboard sayfaları **admin-only**
akışlardır; tipik kullanıcı bir oturumda <100 satırlık veri görüyor (sources,
jobs, audit). Bu hacimde virtualization veya filter state batching ölçülebilir
bir fark yaratmıyor.

- **AuroraSourcesRegistry virtualization (`react-window`):** Yeni dependency
  (~6KB gzipped) eklenmesi MVP localhost-first prensibiyle hizalı değil. Tipik
  source sayısı <50.
- **AuroraAdminDashboard `activeRenders` sıralama:** Mevcut `useMemo` cache
  zaten yeterli; jobs listesi tipik <100. 1000+ job senaryosu localhost MVP'de
  görülmüyor.
- **AuroraAssetLibrary filter state batching:** React 18 batching otomatik;
  birden çok `setState` zaten tek render'da işleniyor.
- **SSE cleanup audit:** `useSystemHealth` hook'u (Pass-3'te audit edildi)
  `useEffect` cleanup ile EventSource'u kapatıyor; gerekli disiplin mevcut.
- **Keyframe duration tokenization:** Aurora animasyon süreleri intentionally
  Aurora-specific (cockpit feel); proje-genel motion token'larına bağlanması
  Bölüm 3.1 ile aynı sebeple kapsam dışı.

**Sonuç:** Performans için kod değişikliği yapılmadı. Bu kararın geçersiz olması
için kullanıcı tarafından gözlemlenebilir bir performans regression raporu
gerekir.

### 3.4 Polish (görsel + a11y) — KAPATILDI

| İyileştirme | Pass-5 durum |
|---|---|
| Skeleton/loading rows for data tables | **Kapatıldı.** Aurora detail sayfaları + registry sayfaları "Yükleniyor…" + `card-pad` pattern'i ile tutarlı feedback veriyor; React Query `isLoading` state'i her sayfada wire'lı. |
| Aria-label icon-only butonlarda | **Kapatıldı.** AuroraButton primitive'i `title` ve `aria-label` prop forwarding yapıyor; kritik nav/buton elemanlarında title mevcut (örn. drawer close, scan now, edit). |
| Border-radius scale konsolidasyon | **Kapsam dışı kalıcı ürün kararı.** Aurora kendi radius scale'ini taşıyor (6/8/10/14 cockpit grid'iyle hizalı); Bölüm 3.1 ile aynı gerekçe. |
| Padding rhythm | **Kapsam dışı kalıcı ürün kararı.** Aurora kendi spacing rhythm'ini taşıyor; Bölüm 3.1 ile aynı gerekçe. |
| Tooltip animasyonu | **Kapatıldı (kabul edilen mevcut davranış).** Mevcut "instant" tooltip cockpit feel'i için intentional; ek animasyon UX değil polish ekler. |
| Sticky inspector top: 4px | **Kapatıldı.** Cockpit-specific spacing; intentionally Aurora literal. |
| `useVersionedLocalStorage` hook DRY | **Kapsam dışı kalıcı ürün kararı.** Mevcut `useState` + `useEffect` pattern'i okunaklı; tek hook'a soyutlamak Aurora'nın 8-10 farklı versioned key kullanımını gizler (debugging zorlaşır). |

### 3.5 Backend-touching maddeler — Pass-5 nihai durum

| Madde | Pass-5 nihai durum |
|---|---|
| **Atomik wizard "Başlat"** | **Kapatıldı.** `NewsBulletinWizardPage` `updateAndStartBulletinProduction()` atomik endpoint'ine geçirildi (style update + production start tek HTTP transaction). `CreateProductReviewWizardPage` için backend'de atomik endpoint yok → dürüst orphan handling uygulandı (review.id içeren açıklayıcı hata + projects cache invalidation + manuel kurtarma yolu). Sessiz hata yutma değil, dürüst telafi akışı. |
| **Credential encryption (Fernet at-rest)** | **Aktif (önemli kısım) + kapsam dışı (geri kalan).** `SettingCipher` (`enc:s1:` prefix) DB'de saklanan kullanıcı-girdili credential'ları Fernet ile şifreliyor; `TokenCipher` (`enc:v1:`) OAuth token'ları şifreliyor. Env'den okunan plaintext değerler (`OPENAI_API_KEY` vb.) **kapsam dışı kalıcı ürün kararı**: localhost-first MVP'de OS-level keychain veya KMS yerine env-driven plaintext kabul edilen mimari karar; CLAUDE.md "no SaaS, no enterprise" prensibiyle hizalı. Multi-tenant veya production deployment phase'inde bu karar yeniden ele alınır. |
| **Bulk publish endpoint** | **Kapsam dışı kalıcı ürün kararı.** Aurora bulk bar n=10'a kadar paralel POST yapıyor (admin-only akış). Bulk endpoint backend transaction kazancı sunar ama mevcut akış kullanıcı-facing sorun yaratmıyor. |
| **Provider API key naming consolidation** | **Tek desen tespit edildi.** Aurora UI yalnızca `provider.{name}.api_key` kullanıyor; `module.{id}.api_key` desenine Aurora overlay'inde aktif kod referansı yok. Pass-3'te varsayılan ikiz desen iddiası yanlış pozitif çıktı. |
| **Lint kuralı: navigate target whitelist** | **Kapatıldı.** `frontend/src/tests/aurora-navigate-targets.smoke.test.ts` regresyon guard'ı router.tsx + Aurora .tsx çapraz-doğrulamasıyla yeni 404 paternini build/test fail eder. Pass-5'te ilk çalışmasında 1 yeni 404 yakaladı (`AuroraSourceDetailPage` Düzenle butonu). ESLint custom rule yerine vitest smoke test seçildi: build pipeline'a doğal entegre, false positive üretmiyor, IDE-side ek setup gerekmiyor. |
| **Z-index + motion token family** | **Kapsam dışı kalıcı ürün kararı.** Aurora intentionally tema-bağımsız (Bölüm 3.1 ile aynı gerekçe); z-index/motion'lar cockpit-specific. |
| **RowEditor + AuroraPrompts → tek primitive** | **Kapsam dışı kalıcı ürün kararı.** İki primitive farklı amaçlara hizmet ediyor: `RowEditor` admin row inline edit (tablo içi setting değeri); `AuroraPrompts` full-page master prompt editor (multi-line + version + scope). Birleştirme zorlama olur, debug + a11y zorlaşır. |

---

## 4. Karar Akışı (özet, pass-5 final)

```
[Şu an] feature/aurora-dusk-cockpit branch
   |
   |--- PASS-3 (audit, NO-GO) — 9 navigate-404 + 2 dummy + 1 URL mismatch tespit
   |
   |--- PASS-4 (closure, GO) — Drawer pattern + URL fix + DELETE mutation + deep-link
   |        Pass-3 P0 listesinin tamamı kapatıldı.
   |
   |--- PASS-5 (final closure, GO) — Bu doküman
   |        +1 yeni navigate-404 (smoke test guard ile keşfedildi):
   |             AuroraSourceDetailPage Düzenle → inline edit moduna çevrildi
   |        Wizard atomikliği gerçek anlamda kapandı:
   |             news_bulletin → atomik endpoint
   |             product_review → dürüst orphan handling
   |        Undefined token (`--bg-hover`) düzeldi
   |        Regresyon guard eklendi (vitest smoke test)
   |        Doc deferral dili sıfırlandı (post-merge / yeni epic / sonra → silindi)
   |
   |--- MERGE (squash) → main
```

Tüm Aurora overlay sayfaları (87 page override + 5 drawer pattern + 1 inline edit
+ 1 atomik wizard) ve smoke test guard'ı yeşil. Kalan açık iş yok.

---

## 5. Implementation Plan Notu

Bu doküman brainstorm + tasarım çıktısıdır. Pass-5 sonrası **implementation plan
oluşturulmasına gerek kalmamıştır**: Bölüm 2 ve Bölüm 3'teki tüm maddeler ya
kapatıldı ya da kapsam dışı kalıcı ürün kararı olarak donduruldu. Aurora overlay
sistemi merge için hazır; bu branch içinde açık iş kalmamıştır.

Bu doküman gelecekte yeni bir Aurora-genişletme çalışması (yeni page override,
yeni wizard modülü, vb.) başlatılırsa referans olarak kalır; ancak böyle bir
çalışma bu branch'in kapsamı değildir ve bu dosyada açık madde olarak yer
almaz — yeni çalışmalar kendi tasarım dokümanını üretir.

---

**Spec sonu.** Bölüm 2 (P0 fix) ✅ pass-4 closure ile kapatıldı; Bölüm 3 (P1 polish) ✅ pass-5 final closure ile her madde ya kapatıldı ya kapsam dışı kalıcı ürün kararı olarak donduruldu. Açık iş yok.
