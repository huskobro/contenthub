# 09 — Buttons, Actions and States

Bu dosya ContentHub'ın UI aksiyon dilini açıklar: buton tipleri, status badge'ler, disabled mantığı, fallback ve uyarı state'leri.

---

## Buton tipleri (stil dili)

### Primary (ana aksiyon)
- Görev: tek ana aksiyon — en belirgin olan
- Örnekler: `Başlat`, `Kaydet`, `Yayınla`, `Approve`, `Aktif Et`
- Stil: solid, contrast renkli, prominent

### Secondary (ikincil aksiyon)
- Görev: destekleyici aksiyon
- Örnekler: `İptal`, `Geri`, `Taslak olarak kaydet`, `Düzenle`
- Stil: outline veya muted solid

### Destructive (yıkıcı aksiyon)
- Görev: silme, reddetme, iptal etme, rollback
- Örnekler: `Sil`, `Reject`, `Cancel job`, `Rollback`
- Stil: kırmızı outline veya kırmızı solid, onay dialog'u tetikler
- **Kural:** Her destructive aksiyon confirmation dialog'u gerektirir

### Ghost / link
- Görev: düşük prominence aksiyon veya navigation
- Örnekler: `STÜDYOYA GİT →`, `Detaya git`, `Önizle`
- Stil: borderless, muted text

### Icon-only
- Görev: kompakt toolbar aksiyon
- Örnekler: retry icon, duplicate icon, overflow menu
- Stil: tooltip ile label

---

## Status badge mantığı

Status badge her yerde aynı sistemi kullanır: bir **renk** + bir **label** kombinasyonu.

### Job status

| State | Renk | Label | Kullanım |
|---|---|---|---|
| `queued` | nötr gri | KUYRUKTA | Jobs bucket, job detail |
| `running` | mavi | ÇALIŞIYOR | Jobs bucket, job detail, live indicator |
| `completed` | yeşil | TAMAMLANDI | Jobs bucket, job detail |
| `failed` | kırmızı | HATA | Jobs bucket, job detail, hata listesi |
| `cancelled` | koyu gri | İPTAL | Jobs bucket |

### Job step status

Job status ile aynı ek olarak:

| State | Renk | Label | Kullanım |
|---|---|---|---|
| `skipped` | mavi-gri | ATLANDI | Step timeline (ör. publish step skipped) |

### Publish status

| State | Renk | Label | Kullanım |
|---|---|---|---|
| `draft` | nötr | DRAFT / TASLAK | Publish board |
| `review_pending` | sarı | REVIEW BEKLİYOR | Publish board |
| `approved` | mavi | ONAYLANDI | Publish board |
| `rejected` | kırmızı | REDDEDİLDİ | Publish board |
| `scheduled` | mor | ZAMANLANDI | Publish board, calendar |
| `publishing` | mavi | YAYINLANIYOR | Publish board |
| `published` | yeşil | YAYINDA | Publish board, channel detail |
| `failed` | kırmızı | BAŞARISIZ | Publish board |

### ContentProject status

| State | Renk | Label |
|---|---|---|
| `draft` | nötr | TASLAK |
| `in_production` | mavi | ÜRETİMDE |
| `ready_for_publish` | sarı | YAYINA HAZIR |
| `published` | yeşil | YAYINLANDI |
| `archived` | gri | ARŞİV |

### Source health

| State | Renk | Label |
|---|---|---|
| `healthy` | yeşil | SAĞLIKLI |
| `degraded` | sarı | UYARI |
| `failed` | kırmızı | HATALI |

### Provider credential status

| State | Renk | Label |
|---|---|---|
| `configured` | yeşil | YAPILANDIRILDI |
| `missing` | nötr gri | EKSİK |
| `invalid` | kırmızı | HATALI |

### localizeStatus

Backend state machine İngilizcedir (`queued`, `running`, `completed`, vb.). Frontend `localizeStatus` mapping ile TR label'a çevirir. Bu ayrım korunur çünkü state machine API contract'ının parçasıdır.

---

## Disabled state mantığı

Bir buton disabled olabilir:

### Permission disabled
- User'ın yetkisi yok (Visibility Engine read_only veya visible=false)
- Örnek: user kendi publish'ini `Approve` edemez — button disabled

### State machine disabled
- Geçerli state'te bu transition mümkün değil
- Örnek: `published` state'indeki bir record için `Approve` disabled
- Örnek: `queued` state'indeki job için `Rollback` disabled

### Dependency disabled
- Bir ön koşul eksik
- Örnek: ChannelProfile yoksa `+Video` butonu "Önce kanal oluştur" tooltip'iyle disabled
- Örnek: YouTube OAuth bağlanmamışsa `Publish` disabled

### Data loading disabled
- Async bir işlem bekleniyor
- Spinner + disabled kombinasyonu

**Kural:** Disabled button her zaman tooltip ile **neden** disabled olduğunu açıklamalıdır.

---

## Warning state mantığı

Bir UI öğesi warning state'inde olabilir:

- **Yellow badge** — uyarı, devam edilebilir ama dikkat
  - Örnek: "Bu kaynak son 24 saatte başarısız tarandı"
  - Örnek: "Soft dedupe: benzer bir haber daha önce kullanıldı"
- **Red badge** — hata, aksiyon gerekli
  - Örnek: "YouTube OAuth expired — yenile"
  - Örnek: "Provider credential invalid"

Warning'ler Notification Center'a da yazılır.

---

## Fallback state mantığı

Bir provider veya data source başarısız olduğunda:

- **Provider fallback** — ilk tercih provider başarısız olursa priority listesinde bir sonraki denenir. Job detail "Fallback kullanıldı" etiketi gösterir.
- **Empty state** — veri yoksa sayfa empty state gösterir (ör. `Henüz proje yok. İlk projenizi oluşturun.` + CTA)
- **Error state** — veri fetch başarısız olursa error state + retry butonu gösterir

---

## Aksiyon kataloğu (en kritik butonlar)

### Job actions (`/admin/jobs/:jobId`)

| Buton | Koşul | Sonuç |
|---|---|---|
| `Retry job` | Job `failed` | Yeni job, taze snapshot |
| `Retry step` | Step `failed` | Aynı job'ta step yeniden çalışır |
| `Cancel` | Job `queued` veya `running` | Job `cancelled` state |
| `Rollback to step` | Job `failed` veya `completed` | Belirli adıma kadar koru, sonrasını invalidate et |
| `Clone` | Her state | Yeni ContentProject + yeni Job |
| `Go to publish` | Job `completed` | İlgili PublishRecord'a git |

### Publish actions (`/admin/publish/:publishId`)

| Buton | Koşul | Sonuç |
|---|---|---|
| `Approve` | `review_pending` | → `approved`, ReviewDecision kaydı |
| `Reject` | `review_pending` | → `rejected`, reason zorunlu |
| `Send back` | `review_pending` | → `draft` |
| `Schedule` | `approved` | → `scheduled`, datetime picker |
| `Publish now` | `approved` veya `scheduled` | → `publishing` |
| `Retry publish` | `failed` | → `publishing` |
| `Rollback` | `published` | → `unpublished` (YouTube: unlisted) |

### Channel actions (`/user/channels`)

| Buton | Koşul | Sonuç |
|---|---|---|
| `Kanal Oluştur` | Her zaman | ChannelProfile wizard |
| `YouTube Bağla` | YouTube henüz bağlı değil | OAuth flow |
| `YouTube Kopar` | YouTube bağlı | OAuth revoke |
| `Düzenle` | Kendi kanalı | Detay sayfası |
| `Sil` | Kendi kanalı, bağlı publish yok | ChannelProfile silinir |

### Source actions (`/admin/sources`)

| Buton | Koşul | Sonuç |
|---|---|---|
| `Yeni Kaynak` | Admin | Source Setup Wizard |
| `Test Scan` | Source var | Smoke tarama |
| `Enable/Disable` | Source var | `enabled` toggle |
| `Sil` | Source var, bağlı UsedNews yok | Source silinir |

### Settings actions (`/admin/settings`)

| Buton | Koşul | Sonuç |
|---|---|---|
| `Kaydet` | Değer değişti | Audit log + revizyon, yeni job'lara uygulanır |
| `Varsayılana Dön` | Değer override | Default'a reset |
| `Test Et` | Credential setting | Provider smoke test |
| `Doğrula` | OAuth setting | Token validate |
| `Değiştir` | OAuth setting | Re-authorize flow |

### Provider actions (`/admin/providers`)

| Buton | Koşul | Sonuç |
|---|---|---|
| `Test` | Her provider | Ping smoke test |
| `Varsayılan Yap` | Category içinde | Priority 1'e al |
| `Credentials` | Her provider | Settings > Kimlik Bilgileri |

### Surface picker (`/user/settings`)

| Buton | Koşul | Sonuç |
|---|---|---|
| `Aktif Et` | Surface seçilebilir | Active surface override set |
| `Varsayılana Dön` | Override var | Override clear, admin default'a dön |

### Visibility actions (`/admin/visibility`)

| Buton | Koşul | Sonuç |
|---|---|---|
| `Yeni kural` | Admin | Rule editor |
| `Düzenle` | Rule var | Inline editor |
| `Sil` | Rule var | Rule silinir |
| `Test verisini göster` | Toggle | Test fixture'ları dahil et |

---

## Form input state'leri

| State | Görsel | Anlam |
|---|---|---|
| empty | placeholder | Henüz değer yok |
| filled | solid | Geçerli değer |
| invalid | kırmızı border | Validation fail |
| read_only | muted | Kullanıcı yetkisi yok |
| disabled | opak | Başka ön koşul |
| loading | spinner | Async save |

---

## Empty state mantığı

Her liste sayfası bir empty state gösterir:

- **Icon + mesaj + CTA**
- Örnek: Projelerim boşsa → `Henüz projeniz yok` + `İlk projenizi oluşturun` CTA
- Örnek: Visibility kuralları boşsa → `Henüz ürün kuralı yok (test fixture'lar gizli)` + `İlk kuralı ekleyin` CTA
- Örnek: Publish board bucket boşsa → `bu kolonda kayıt yok`

**Kural:** Empty state asla silent olmamalı; her zaman next action gösterilmeli.

---

## Keyboard shortcut'lar

Bridge jobs registry'de:
- `↑↓` — satır gezme
- `Enter` — job kokpitine git
- `R` — retry (selected)
- `C` — cancel (selected)

Command Palette (global):
- `Cmd+K` / `Ctrl+K` — palette aç
- `Esc` — kapat

---

## Sonraki adım

- Governance (settings + visibility) detayı → `10-settings-visibility-and-governance.md`
- Tam / partial tablosu → `11-current-capabilities-vs-partial-areas.md`
- Günlük admin rutini → `12-operator-playbook.md`
