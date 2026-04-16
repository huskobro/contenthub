# Channel URL-Only Final — PHASE AF

Durum: **Kapandı** — URL-only create akışı honest state ile çalışıyor;
reimport retry path'i user surface'tan tetiklenebiliyor.

## Öncül

Phase X'te URL-only create eklendi: kullanıcı sadece URL girer, backend
platform + handle + external_id + normalized_url + avatar fetch'ini
dener. Fetch kısmen başarılı olsa dahi kayıt açılır — user'a yalan
söylenmez.

PHASE AD reimport endpoint'ini backend'e ekledi (ownership ile zorlanan).
PHASE AF bu endpoint'i kullanıcı yüzeyine bağlar.

## Akış

1. Kullanıcı `MyChannelsPage` → "URL'den Ekle" modal → URL yapıştır
2. Backend `POST /channel-profiles/from-url` → platform tespit + auto-fetch
3. Cevap: `import_status ∈ {pending, success, partial, failed}`
   - `success`: tüm metadata çekildi — normal badge, CTA yok
   - `partial`: bazı alanlar eksik — "Meta veri bekleniyor" badge + **Yeniden Dene** butonu
   - `failed`: fetch başarısız — "Meta alınamadı" badge + **Yeniden Dene** butonu
   - `pending`: işlem devam — "Bekliyor" badge
4. Kullanıcı "Yeniden Dene" → `POST /channel-profiles/{id}/reimport`
   - Backend ownership kontrol eder (sadece sahip + admin)
   - User-edit alanları (profile_name, notes, default_language) korunur
   - Metadata re-fetch dener; sonuç yine 4 state'ten birine düşer
5. Toast:
   - `success` → "Kanal başarıyla güncellendi"
   - `partial` → "Kısmen alındı — bazı alanlar hâlâ eksik"
   - `failed` → toast.error "İçe aktarma başarısız"

## Kontrat

### POST `/api/v1/channel-profiles/{id}/reimport`

- Ownership: sahip veya admin
- Idempotent: her çağrı yeni fetch denemesi
- User-edit alanlarına dokunmaz
- Response: tam `ChannelProfileResponse` (güncellenmiş `import_status`,
  `import_error`, `last_import_at`)

### Hook

```ts
const { mutate: reimport, isPending } = useReimportChannelProfile();
reimport(channelId);
```

Query invalidation: `["channel-profiles"]` — MyChannelsPage otomatik refetch.

## UI Kanıtı

MyChannelsPage card içi, import status badge'inin yanında:

```tsx
{(importStatus === "partial" || importStatus === "failed") && (
  <button
    onClick={(e) => handleReimport(e, ch.id)}
    data-testid={`channel-card-reimport-${ch.id}`}
  >
    Yeniden Dene
  </button>
)}
```

`stopPropagation()` kartın navigate'ine düşmesin diye kullanılır.

## Honest State Kuralları

- Fetch başarısız olsa bile kayıt açılır — yalan değil, `failed` state
  gösterilir ve reimport path sunulur
- Boş alan varsa badge'de o bilgi vardır — "YouTube Kanal" gibi fake
  varsayılan doldurma yok
- Reimport sonucu hâlâ eksikse badge yine eksiklik gösterir, toast dürüst

## Test Kanıtı

- Backend: `test_phase_af_project_centered.py::test_channel_reimport_ownership_blocks_cross_user`
- Frontend: MyChannelsPage'e `Yeniden Dene` butonu (data-testid üzerinden
  erişilebilir); PHASE AF smoke testlerinde `useReimportChannelProfile`
  mock'lar temizlendi

## Dokunulmayan

- URL-only create endpoint'i (phase_x) — değişmedi
- Auto-fetch service (channel_metadata.py) — değişmedi
- `import_status` enum — değişmedi
- Kanal silme yolu — değişmedi
