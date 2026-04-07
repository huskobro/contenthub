# M40a: Multi-User Completion Fix Pack Raporu

**Tarih:** 2026-04-08
**Kapsam:** M40 sonrasi kalan 3 kritik acik kapatildi

---

## 1. Job Owner Wiring (FAZ B)

**Sorun:** Job olusturulurken aktif kullanici bilgisi (`owner_id`) atanmiyordu; joblar kullaniciya gore filtrelenemiyordu.

**Degisiklikler:**
- `backend/app/jobs/router.py` — `get_active_user_id` dependency eklendi; create endpoint `owner_id=user_id` ile job olusturur; list endpoint `owner_id` query param destekler
- `backend/app/jobs/service.py` — `list_jobs` fonksiyonuna `owner_id` filtre parametresi eklendi
- `backend/app/modules/news_bulletin/router.py` — `get_active_user_id` dependency eklendi, `owner_id` service'e aktarilir
- `backend/app/modules/news_bulletin/service.py` — `start_production` fonksiyonuna `owner_id: Optional[str]` parametresi eklendi

**Geriye uyumluluk:** Mevcut joblar `owner_id=null` olarak kalir, filtre uygulanmazsa tum joblar doner.

---

## 2. system.output_dir Resmi Entegrasyonu (FAZ C)

**Sorun:** Onboarding ekraninda toplanan output_dir degeri kaydedilmiyordu (TODO comment vardi); setting KNOWN_SETTINGS'te tanimli degildi.

**Degisiklikler:**
- `backend/app/settings/settings_resolver.py` — `system.output_dir` KNOWN_SETTINGS'e eklendi (group: execution, type: string, env: CONTENTHUB_OUTPUT_DIR)
- `frontend/src/components/onboarding/OnboardingWorkspaceSetupScreen.tsx` — TODO comment kaldirildi, `updateMutation.mutateAsync` ile `system.output_dir` kaydediliyor

**Dogrulama:** Effective settings API'sinda `system.output_dir` gorunur ve kullanici override destekler.

---

## 3. Admin Governance Toggle UI (FAZ D)

**Sorun:** Admin Settings detail panelinde governance bayraklari salt okunurdu, degistirilemiyordu.

**Degisiklikler:**
- `frontend/src/api/settingsApi.ts` — `SettingPatchPayload` interface ve `patchSetting(id, payload)` fonksiyonu eklendi
- `frontend/src/components/settings/SettingDetailPanel.tsx` — `GovernanceToggle` switch komponenti eklendi; 4 toggle: `visible_to_user`, `user_override_allowed`, `visible_in_wizard`, `read_only_for_user`; `useMutation` ile anlik kayit; basarida `settings` + `effective-settings` query invalidation

---

## 4. Test Sonuclari

| Kategori | Sonuc |
|---|---|
| TypeScript (tsc --noEmit) | 0 hata |
| Backend pytest | 1426 passed, 4 pre-existing skip |
| API curl: output_dir effective | Basarili |
| API curl: governance PATCH | Basarili |
| API curl: job owner_id filter | Basarili |
| API curl: backward compat (null owner) | Basarili |
| Frontend preview: user settings | output_dir gorunur |
| Frontend preview: admin governance | 4 toggle switch gorunur |

**Onceden var olan hatalar (bu PR'dan bagimsiz):** M5 RSS, M5 dedupe, M6 composition, M7 migration

---

## 5. Degisen Dosyalar

1. `backend/app/jobs/router.py` — owner_id wiring
2. `backend/app/jobs/service.py` — owner_id filtre
3. `backend/app/modules/news_bulletin/router.py` — owner_id wiring
4. `backend/app/modules/news_bulletin/service.py` — owner_id parametresi
5. `backend/app/settings/settings_resolver.py` — system.output_dir KNOWN_SETTING
6. `frontend/src/api/settingsApi.ts` — patchSetting API
7. `frontend/src/components/onboarding/OnboardingWorkspaceSetupScreen.tsx` — output_dir kayit
8. `frontend/src/components/settings/SettingDetailPanel.tsx` — governance toggle UI

---

## 6. Bilinen Sinirlamalar

- Job owner_id mevcut joblarda null — retroaktif atama yapilmadi (kasitli)
- Governance toggle'lar yalniz admin detay panelinden erisiliyor (toplu islem yok)
- system.output_dir henuz pipeline icerisinde aktif olarak tuketilmiyor (wired_to bilgisi tanimli)
