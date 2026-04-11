# Master Index — ContentHub Operator Docs

Bu tek sayfa, klasördeki tüm dokümanlara "hangi sorunun cevabı nerede?" mantığıyla yönlendirir.

---

## Hangi soru nerede?

| Soru | Dosya |
|---|---|
| Bu sistem ne yapıyor? | `01-system-overview.md` |
| Kim için tasarlandı? | `01-system-overview.md` — "Kimin için" |
| Ana kavramlar neler? | `01-system-overview.md` + `14-glossary.md` |
| Panellerin yapısı nasıl? | `02-information-architecture.md` |
| Admin panelde hangi menü ne işe yarar? | `03-admin-panel-guide.md` |
| User panelde hangi menü ne işe yarar? | `04-user-panel-guide.md` |
| Bridge / Atrium / Canvas / Horizon / Legacy ne farkı? | `05-surfaces-themes-and-panel-switching.md` |
| Surface ve theme aynı şey mi? | `05-surfaces-themes-and-panel-switching.md` — "İki farklı ayar" |
| Panel nasıl geçiliyor? | `05-surfaces-themes-and-panel-switching.md` — "Panel geçişi" |
| Bir job'ın içinde ne var? | `06-core-domain-model.md` — "Job" + `07-key-workflows.md` — "Job izleme" |
| Content project nedir? | `06-core-domain-model.md` — "ContentProject" |
| Publish record nedir? | `06-core-domain-model.md` — "PublishRecord" |
| Video nasıl oluşturulur? | `07-key-workflows.md` — "Video oluşturma akışı" |
| Bulletin nasıl oluşturulur? | `07-key-workflows.md` — "Bulletin oluşturma akışı" |
| Publish akışı nasıl işler? | `07-key-workflows.md` — "Publish akışı" |
| Review gate ne demek? | `07-key-workflows.md` + `14-glossary.md` |
| Source → news → bulletin ilişkisi? | `07-key-workflows.md` — "Haber akışı" |
| Belirli bir sayfa ne işe yarar? | `08-page-by-page-reference.md` |
| Bir buton ne yapar? | `09-buttons-actions-and-states.md` |
| Status badge renkleri ne anlama gelir? | `09-buttons-actions-and-states.md` — "Status mantığı" |
| Settings Registry nasıl çalışır? | `10-settings-visibility-and-governance.md` — "Settings Registry" |
| Visibility Engine ne yapar? | `10-settings-visibility-and-governance.md` — "Visibility Engine" |
| Provider credentials nereden yönetilir? | `10-settings-visibility-and-governance.md` — "Providers" |
| Hangi alan tam, hangi alan partial? | `11-current-capabilities-vs-partial-areas.md` |
| Sabah ilk önce neye bakmalıyım? | `12-operator-playbook.md` |
| Sorun çıktığında nereye bakmalıyım? | `12-operator-playbook.md` — "Sorun giderme sırası" |
| Bu projeyi yeni devraldım, nereden başlamalıyım? | `13-quick-start-for-new-owner.md` |
| Bir terim ne demek? | `14-glossary.md` |
| Tüm sitemap tek bakışta? | `sitemap.md` |

---

## Dosya rol tablosu

| Dosya | Rol | Kim okumalı? |
|---|---|---|
| `README.md` | Giriş + klasör tanıtımı | Herkes |
| `00-master-index.md` | Bu dosya — navigasyon | Herkes |
| `01-system-overview.md` | Kavramsal giriş | Yeni devralan, yeni admin |
| `02-information-architecture.md` | Hiyerarşi + menü ağacı | Admin, user, operatör |
| `03-admin-panel-guide.md` | Admin detay rehberi | Admin, operatör |
| `04-user-panel-guide.md` | User detay rehberi | User, admin (empati için) |
| `05-surfaces-themes-and-panel-switching.md` | Shell + theme mantığı | Admin, user |
| `06-core-domain-model.md` | Domain model | Teknik devralan, admin |
| `07-key-workflows.md` | Akış rehberi | Herkes |
| `08-page-by-page-reference.md` | Route-bazlı referans | Admin, operatör, geliştirici |
| `09-buttons-actions-and-states.md` | UI sözlüğü | Herkes |
| `10-settings-visibility-and-governance.md` | Governance | Admin |
| `11-current-capabilities-vs-partial-areas.md` | Gerçeklik tablosu | Yeni devralan, admin, yatırımcı |
| `12-operator-playbook.md` | Günlük rutin | Operatör, admin |
| `13-quick-start-for-new-owner.md` | 1-saatlik intro | Yeni devralan |
| `14-glossary.md` | Kavram sözlüğü | Herkes |
| `sitemap.md` | Tam sitemap | Admin, geliştirici |

---

## Okuma stratejileri

### "Sadece ürünün ne olduğunu anlamak istiyorum" (20 dk)
1. `01-system-overview.md`
2. `02-information-architecture.md`
3. `11-current-capabilities-vs-partial-areas.md`

### "Bu projeyi devraldım, çalışıyorum" (1 saat)
1. `13-quick-start-for-new-owner.md`
2. `01-system-overview.md`
3. `02-information-architecture.md`
4. `05-surfaces-themes-and-panel-switching.md`
5. `06-core-domain-model.md`
6. `11-current-capabilities-vs-partial-areas.md`

### "Ben admin / operatörüm, günlük kullanacağım" (45 dk)
1. `02-information-architecture.md`
2. `03-admin-panel-guide.md`
3. `07-key-workflows.md`
4. `10-settings-visibility-and-governance.md`
5. `12-operator-playbook.md`

### "Ben son kullanıcıyım, hızlı öğrenmek istiyorum" (20 dk)
1. `04-user-panel-guide.md`
2. `07-key-workflows.md` — video/bulletin/publish bölümleri
3. `05-surfaces-themes-and-panel-switching.md` — sadece surface değiştirme

### "Belirli bir ekranı anlamam gerek"
- `08-page-by-page-reference.md` → ilgili route → ilgili bölüme git.

### "Bir terim anlamadım"
- `14-glossary.md`.
