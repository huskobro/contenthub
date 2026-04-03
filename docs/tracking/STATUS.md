# DURUM

## Mevcut Faz
Phase 250 — Entry Information Architecture & Primary Route Clarity ✓ TAMAMLANDI (feature)

## Mevcut Hedef
Ana giris noktalari ve route yuzeyleri kullanici acisindan netlestirildi. Header'da Turkce panel isimleri ve gecis butonu, admin sidebar'da section gruplari, admin overview'da hizli erisim kartlari, user dashboard'da Turkce icerik. 1671 toplam test.

## Devam Eden
— (devam eden calisma yok)

## Hygiene Hattı Kapanış Durumu
- **KAPATILDI:** Mikro readability faz zinciri Phase 235 ile resmen kapatıldı.
- **YENİ MİKRO FAZ AÇILMAYACAK.** Son ~45 fazın büyük çoğunluğu audit-only kapandı; marjinal getiri düştü.
- **ANA FAZ BAŞLADI:** Wizard / Onboarding (ürün geliştirme hattı)

## Son Tamamlananlar
- Phase 250: entry information architecture & primary route clarity — Turkce header/sidebar/dashboard, panel gecis butonu, admin section gruplari, hizli erisim kartlari, 4 yeni test, 1671 toplam (2026-04-03)
- Phase 249: onboarding flow polish & step coherence pass — Turkce dil tutarliligi, CTA netligi, geri donus mantigi, completion checklist genisletildi, 1667 toplam (2026-04-03)
- Phase 248: post-onboarding first landing & user handoff flow — PostOnboardingHandoff component, UserDashboardPage entegrasyonu, ana/ikincil CTA, 7 yeni test, 1667 toplam (2026-04-03)
- Phase 247: onboarding completion gate & ready-to-enter flow — end-to-end zincir testleri (completion/mutation/requirements bloklama/review gecisi), 5 yeni test, 1660 toplam (2026-04-03)
- Phase 246: duplicate — Phase 240 ile ayni, degisiklik yok (2026-04-03)
- Phase 245: app entry re-entry rules & post-setup bypass — OnboardingPage bypass guard, tamamlanan kullanicilar /onboarding'den /user'a yonlendirilir, 5 yeni test, 1655 toplam (2026-04-03)
- Phase 244: onboarding setup summary review step — kurulum ozeti ekrani (5 satir: sources/templates/settings/providers/workspace), workspace→review→completion zinciri, 7 yeni test, 1650 toplam (2026-04-03)
- Phase 243: onboarding output/workspace path setup step — workspace yapilandirma ekrani (workspace_root + output_dir), provider→workspace→completion zinciri, 7 yeni test, 1643 toplam (2026-04-03)
- Phase 242: onboarding provider/API setup step — provider yapilandirma ekrani (TTS/LLM/YouTube API keys), requirements→provider-setup→completion zinciri, 7 yeni test, 1636 toplam (2026-04-03)
- Phase 241: onboarding completion gate & continue flow — completion ekrani, requirements→completion→uygulamaya gecis zinciri, 7 yeni test, 1629 toplam (2026-04-03)
- Phase 240: onboarding settings setup required action — requirements ekraninda ayar aksiyonu, OnboardingSettingsSetupScreen, createSetting API+hook, 7 yeni test, 1622 toplam (2026-04-03)
- Phase 239: onboarding template setup required action — requirements ekraninda sablon aksiyonu, OnboardingTemplateSetupScreen, mevcut TemplateForm tekrar kullanimi, 7 yeni test, 1615 toplam (2026-04-03)
- Phase 238: onboarding source setup first required action — requirements ekraninda kaynak aksiyonu, OnboardingSourceSetupScreen, mevcut SourceForm tekrar kullanimi, 7 yeni test, 1608 toplam (2026-04-03)
- Phase 237: onboarding setup requirements screen — backend requirements endpoint, frontend requirements ekrani, welcome→requirements akisi, 7 yeni test, 1601 toplam (2026-04-03)
- Phase 236: onboarding app entry gate & welcome screen — backend API, frontend gate, welcome screen, 7 test, 1594 toplam (2026-04-03)
- Phase 235: hygiene closure & product pivot gate — kapanış doğrulaması, baseline stabil, 1587 toplam (2026-04-03)
- Phase 234: repeated small detail field/row call-site readability pack: audit-only, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 233: repeated small summary component call readability pack: audit-only, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 232: repeated small table cell content readability pack: audit-only, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 231: repeated small form validation readability pack: kapsamlı audit, per-field validation farklı, threshold karşılanmadı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 230: repeated small label/heading text readability pack: kapsamlı audit, tam string tekrar yok, DASH const mevcut, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 229: repeated small setter/update call readability pack: kapsamlı audit, per-field standart, farklı argümanlar, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 228: repeated small hook call readability pack: kapsamlı audit, useState per-field standart, custom hook'lar farklı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 227: repeated small return object/payload shape readability pack: kapsamlı audit, tek payload build per dosya, threshold karşılanmadı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 226: repeated small local derived value readability pack: kapsamlı audit, aynı computation tekrar etmiyor, farklı bağlam, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 225: repeated small JSX fragment/wrapper readability pack: kapsamlı audit, fragment yok, çoklu return farklı conditional path, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 224: repeated small early return/guard clause readability pack: kapsamlı audit, 3+ olan dosyalar summary kapsam dışı, detail/panel max 2×, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 223: repeated small function parameter naming/destructuring readability pack: kapsamlı audit, tüm imzalar tutarlı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 222: repeated small local variable naming readability pack: kapsamlı audit, standart React idiom, threshold karşılanmadı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 221: repeated small conditional JSX block readability pack: kapsamlı audit, farklı guard variable, threshold karşılanmadı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 220: repeated small local type alias/union readability pack: kapsamlı audit, form/panel/table'da type yok, badge kapsam dışı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 219: repeated small import grouping/ordering readability pack: kapsamlı audit, tüm dosyalar tutarlı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 218: repeated small inline event handler readability pack: kapsamlı audit, onChange per-field setter farklı, onClick farklı argümanlar, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 217: repeated small CSSProperties type annotation readability pack: kapsamlı audit, 39 dosya zaten tutarlı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 216: repeated small title/subject/name text readability pack: kapsamlı audit, loop variable property access, dosya-seviyesi const uygunsuz, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 215: repeated small disabled/busy button readability pack: kapsamlı audit, threshold altı (max 2×), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 214: repeated small edit/view mode readability pack: kapsamlı audit, threshold altı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 213: repeated small boolean prop readability pack: 4 dosyada const isCreate eklendi, 12 satır değiştirildi, 1587 toplam (2026-04-03)
- Phase 212: repeated small .join()/separator array render pattern pack: kapsamlı audit, threshold karşılanmadı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 211: repeated small nullish-coalescing readability pack: kapsamlı audit, ?? "" standart kullanım, extraction değer katmıyor, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 210: repeated small loading/error/fallback render pattern pack: kapsamlı audit, extraction değer katmıyor, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 209: repeated small local error message readability pack: kapsamlı audit, gerçek error literal yok, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 208: repeated small date/timestamp formatting constant pack: kapsamlı audit, extraction değer katmıyor, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 207: repeated small inline number formatting constant pack: kapsamlı audit, extraction değer katmıyor, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 206: repeated small boolean/ternary label text constant pack: kapsamlı audit, threshold karşılanmadı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 205: repeated small list/marker/bullet text constant pack: kapsamlı audit, threshold karşılanmadı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 204: repeated small position/zIndex literal constant pack: kapsamlı audit, kullanım yok, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 203: repeated small text-decoration literal constant pack: kapsamlı audit, threshold karşılanmadı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 202: repeated small outline/boxShadow literal constant pack: kapsamlı audit, kullanım yok, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 201: repeated small transition/animation literal constant pack: kapsamlı audit, kullanım yok, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 200: repeated small whiteSpace literal constant pack: kapsamlı audit, threshold karşılanmadı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 199: repeated verticalAlign literal constant pack: kapsamlı audit, threshold karşılanmadı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 198: repeated small gap literal constant pack: kapsamlı audit, threshold karşılanmadı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 197: repeated opacity literal constant pack: kapsamlı audit, kullanım yok/threshold altı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 196 — Repeated textTransform/letterSpacing Literal Constant Pack ✓ TAMAMLANDI (audit-only)

## Mevcut Hedef
textTransform/letterSpacing literal audit. Bu property'ler codebase'de kullanılmıyor. Hiçbir dosya değiştirilmedi. 1587 toplam test.

## Devam Eden
— (devam eden çalışma yok)

## Son Tamamlananlar
- Phase 196: repeated textTransform/letterSpacing literal constant pack: kapsamlı audit, kullanım yok, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 195 — Repeated Small Border Literal Constant Pack ✓ TAMAMLANDI

## Mevcut Hedef
Border literal audit. BORDER = "1px solid #e2e8f0" (3 dosya: TemplateStyleLinkDetailPanel×3, TemplateDetailPanel×3, StandardVideoArtifactsPanel×3). 1587 toplam test.

## Devam Eden
— (devam eden çalışma yok)

## Son Tamamlananlar
- Phase 195: repeated small border literal constant pack: BORDER extraction (3 dosya, toplam 9 değişim), 1587 toplam (2026-04-03)
- Phase 194 — Repeated Small Helper Function Name/Const Readability Pack ✓ TAMAMLANDI

## Mevcut Hedef
Const/helper sıralama ve yerleşim audit. StandardVideoScriptPanel primitive→style sırası düzeltildi, TemplateForm REQ_MARK errorStyle yanına taşındı. 1587 toplam test.

## Devam Eden
— (devam eden çalışma yok)

## Son Tamamlananlar
- Phase 194: repeated small helper function name/const readability pack: StandardVideoScriptPanel const reorder, TemplateForm REQ_MARK reorder, 1587 toplam (2026-04-03)
- Phase 193 — Repeated Placeholder/Empty-State String Literal Constant Pack ✓ TAMAMLANDI (audit-only)

## Mevcut Hedef
Placeholder/empty-state string literal audit. Tüm değerler max 1× per dosya — threshold altı. Hiçbir dosya değiştirilmedi. 1587 toplam test.

## Devam Eden
— (devam eden çalışma yok)

## Son Tamamlananlar
- Phase 193: repeated placeholder/empty-state string literal constant pack: kapsamlı audit, threshold altı (max 1× per dosya), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 192 — Repeated Line-Height Literal Constant Pack ✓ TAMAMLANDI (audit-only)

## Mevcut Hedef
lineHeight literal audit. Hiçbir component dosyasında lineHeight kullanımı bulunamadı. Hiçbir dosya değiştirilmedi. 1587 toplam test.

## Devam Eden
— (devam eden çalışma yok)

## Son Tamamlananlar
- Phase 192: repeated line-height literal constant pack: kapsamlı audit, lineHeight kullanılmıyor, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 191 — Repeated Width/MinWidth Literal Constant Pack ✓ TAMAMLANDI (audit-only)

## Mevcut Hedef
Width/minWidth/maxWidth literal audit. Tüm değerler max 2× per dosya — threshold altı. Hiçbir dosya değiştirilmedi. 1587 toplam test.

## Devam Eden
— (devam eden çalışma yok)

## Son Tamamlananlar
- Phase 191: repeated width/minwidth literal constant pack: kapsamlı audit, threshold altı (max 2× per dosya), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 190 — Repeated Display/Layout Literal Constant Pack ✓ TAMAMLANDI (audit-only)

## Mevcut Hedef
Display/layout literal audit. Anlamlı extraction fırsatı bulunamadı. JobTimelinePanel 3× "flex" farklı nesnelerde, StandardVideoArtifactSummary 2× composite (threshold altı). Hiçbir dosya değiştirilmedi. 1587 toplam test.

## Devam Eden
— (devam eden çalışma yok)

## Son Tamamlananlar
- Phase 190: repeated display/layout literal constant pack: kapsamlı audit, anlamlı extraction fırsatı yok, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 189 — Repeated Small Background Literal Constant Pack ✓ TAMAMLANDI (audit-only)

## Mevcut Hedef
Background literal audit. Tüm değerler max 2× per dosya — threshold altı. Hiçbir dosya değiştirilmedi. 1587 toplam test.

## Devam Eden
— (devam eden çalışma yok)

## Son Tamamlananlar
- Phase 189: repeated small background literal constant pack: kapsamlı audit, threshold altı (max 2× per dosya), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 188 — Repeated Small Color Literal Constant Pack ✓ TAMAMLANDI

## Mevcut Hedef
Bileşenlerde tekrar eden color hex literal audit. COLOR_DARK (5 dosya), COLOR_ERR (10 dosya), COLOR_FAINT (1 dosya), COLOR_BLUE (1 dosya). 1587 toplam test.

## Devam Eden
— (devam eden çalışma yok)

## Son Tamamlananlar
- Phase 188: repeated small color literal constant pack: COLOR_DARK + COLOR_ERR + COLOR_FAINT + COLOR_BLUE extraction (17 dosya, badge hariç), 1587 toplam (2026-04-03)
- Phase 187: repeated small margin/padding literal constant pack: PAD_B_SM + PAD_B_XS + TD_PAD extraction (3 dosya, toplam 22 değişim), 1587 toplam (2026-04-03)
- Phase 186: repeated small overflow/wrap style constant pack: WRAP_WORD extraction (NewsBulletinMetadataPanel×3), test guard güncellendi, 1587 toplam (2026-04-03)
- Phase 185: repeated small cursor/pointer style constant pack: CURSOR_PTR extraction (StandardVideoScriptPanel×3), 1587 toplam (2026-04-03)
- Phase 184: repeated small text align literal constant pack: kapsamlı audit, threshold altı (max 1× per dosya), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 183: repeated small font weight constant pack: TH_CELL extraction (TemplateStyleLinksTable×6, NewsBulletinSelectedItemsPanel×5), 1587 toplam (2026-04-03)
- Phase 182: repeated small font size literal constant pack: FONT_SM extraction (3 dosya: ArtifactsPanel×8, SourceScanDetailPanel×3, SourceDetailPanel×3), 1587 toplam (2026-04-03)
- Phase 181: repeated small border radius constant pack: RADIUS_XS + RADIUS_SM extraction (2 dosya), 1587 toplam (2026-04-03)
- Phase 180: repeated small loading/busy text constant pack: kapsamlı audit, threshold altı (max 2× per dosya), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 179: repeated small status text constant pack: kapsamlı audit, threshold altı (max 2× per dosya), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 178: repeated small monospace/code style constant pack: kapsamlı audit, threshold altı (max 2× per dosya), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 177: repeated small panel meta text constant pack: kapsamlı audit, threshold altı (max 2× per dosya), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 176: repeated small form help text style constant pack: kapsamlı audit, threshold altı (max 2× per dosya), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 175: repeated small panel divider constant pack: kapsamlı audit, threshold altı (max 1× per dosya), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 174: repeated required mark constant pack: kapsamlı audit, threshold altı (max 2 tekrar kalan dosyalarda), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 173: repeated form label style constant pack: REQ_MARK extraction (TemplateForm×3, UsedNewsForm×3), 1587 toplam (2026-04-03)
- Phase 172: repeated input/textarea style constant pack: JSON_TEXTAREA + TEXTAREA extraction (3 dosya), 1587 toplam (2026-04-03)
- Phase 171 — Repeated Simple Layout Constant Pack ✓ TAMAMLANDI

## Mevcut Hedef
Küçük form bileşenlerinde tekrar eden basit layout style bloklarını const ile extraction. 4 NewsBulletin form dosyasında FIELD const eklendi (toplam 23 inline → const). 1587 toplam test.

## Devam Eden
— (devam eden çalışma yok)

## Son Tamamlananlar
- Phase 171: repeated simple layout constant pack: FIELD extraction (Form×10, MetadataForm×8, ScriptForm×3+spread, SelectedItemForm×2+spread), 1587 toplam (2026-04-03)
- Phase 170: repeated action row style constant pack: PAIR_ROW + FLEX_1 extraction (MetadataForm 4+2, ScriptForm 2+1), 1587 toplam (2026-04-03)
- Phase 169: repeated form section heading constant pack: kapsamlı audit, threshold altı (max 2 tekrar per dosya), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 168: repeated action button text constant pack: kapsamlı audit, threshold altı (max 2 tekrar), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 167: repeated form button style constant pack: 9 form dosyasında BTN_PRIMARY/BTN_CANCEL extraction, 1587 toplam (2026-04-03)
- Phase 166: repeated neutral color literal constant pack: 4 dosyada BORDER_COLOR/MUTED_TEXT extraction, 1587 toplam (2026-04-03)
- Phase 165: repeated empty/fallback string constant pack: NewsBulletinForm.tsx'e const DASH eklendi, 4 JSX em-dash sadeleşti, 1587 toplam (2026-04-03)
- Phase 164: repeated heading/text style constant pack: 4 dosyada FORM_HEADING/MUTED extraction, 1587 toplam (2026-04-03)
- Phase 163: repeated section/container style constant pack: 8 dosyada SECTION_STYLE/PANEL_BOX/SECTION_DIVIDER extraction, 1587 toplam (2026-04-03)
- Phase 162: repeated table cell style constant pack: 12 tablo dosyasında TH_STYLE/TD_STYLE extraction, 1587 toplam (2026-04-03)
- Phase 161: repeated panel label style constant pack: 6 dosyada LABEL_TD/LABEL_TD_TOP/LABEL_SPAN extraction, 27 inline style → const referansı, 1587 toplam (2026-04-03)
- Phase 160: field/row label-value rendering consistency pack: 3 Row value overflowWrap fix, 2 Field label color+fontSize fix, 1587 toplam (2026-04-03)
- Phase 159: helper return-type consistency call-site safety pack: formatDateTime default fallback null→"—", dönüş tipi string|null→string, 1 test güncelleme, 1587 toplam (2026-04-03)
- Phase 158: repeated date fallback constant readability pack: 4 dosyada kalan inline "—" → DASH, 1587 toplam (2026-04-03)
- Phase 157: duplicate inline fallback pattern reduction pack: 13 dosyada const DASH extraction, 62 inline "—" → DASH, 11 test assertion güncelleme, 1587 toplam (2026-04-03)
- Phase 156: shared fallback helper consolidation pack: 8 safeNumber konsolidasyonu, 1 formatDateISO konsolidasyonu, 4 test dosyası güncelleme, 1587 toplam (2026-04-03)
- Phase 155: string normalization whitespace safety pack: isBlank helper, 10 bileşen fix, 27 yeni guard test, 1587 toplam (2026-04-03)
- Phase 153: array list render safety pack: 2 steps array guard (JobTimelinePanel, JobStepsList), Array.isArray + safeSteps pattern, 15 yeni guard test, 1535 toplam (2026-04-03)
- Phase 152: numeric count ratio display safety pack: 7 summary count guard, 2 table version guard, 5 detail panel Number() guard, 6 form isFinite guard, safeNumber helper, 33 yeni guard test, 1520 toplam (2026-04-03)
- Phase 151: badge enum status unknown-value safety pack: 62 badge style lookup neutral fallback, 76 badge label text null fallback (70 level + 6 status), 236 yeni guard test, 1487 toplam (2026-04-03)
- Phase 150: required field assumption safety pack: 30 property null fallback (9 tablo + 2 detail panel), version numeric fallback, 42 yeni guard test, badge stilleri korundu, 1251 toplam (2026-04-03)
- Phase 149: clipboard copy surface safety text export hygiene pack: 13 property null fallback, 3 content block null-safe length, 4 overflowWrap fix, safeJsonPretty whitespace guard, 25 yeni guard test, badge stilleri korundu, 1209 toplam (2026-04-03)
- Phase 148: url link surface safety external target hygiene pack: anchor null guard fix, rel="noopener noreferrer" fix, UrlField overflowWrap, 13 yeni guard test, badge stilleri korundu, 1184 toplam (2026-04-03)
- Phase 147: text field overflow long content safety pack: 9 panel Field/Row overflow fix, 5 inline text overflow fix, 7 registry table td overflow fix, 14 form error overflow fix, 34 yeni guard test, badge stilleri korundu, 1171 toplam (2026-04-03)
- Phase 146: json field preview safety readability pack: shared safeJson.ts + JsonPreviewField, 3 duplicate kaldırıldı, 4 overflow fix, 2 validateJson dedup, 19 yeni guard test, badge stilleri korundu, 1137 toplam (2026-04-03)
- Phase 145: list detail form date formatting safety unification pack: 4 helper (formatDateTime, formatDateShort, formatDateISO, normalizeDateForInput), 23 dosya güncellendi, SourceScanSummary Invalid Date guard eklendi, 19 yeni guard test, badge stilleri korundu, 1118 toplam (2026-04-03)
- Phase 144: form surface empty null state safety pack: 2 version String(null) guard, 1 published_at String() coercion, 11 form zaten güvenli, 4 yeni guard test, badge stilleri korundu, 1099 toplam (2026-04-03)
- Phase 143: detail panel empty null state safety pack: 9 panel tarih ternary guard, 2 Job panel .slice() crash fix, 4 form handler .trim() null coalescing (22 alan), 2 yeni guard test, badge stilleri korundu, 1095 toplam (2026-04-03)
- Phase 142: registry empty null state safety pack: 9 tarih alanı Invalid Date koruması, Jobs created_at crash fix, 3 summary NaN guard, 2 string typeof guard, badge stilleri korundu, 1093 toplam (2026-04-03)
- Phase 141: registry density overflow safety pack: overflow-x wrapper (9 tablo), Jobs header background/border/padding fix, StandardVideo header background fix, NewsBulletin fontSize fix, badge stilleri korundu, 1093 toplam (2026-04-03)
- Phase 140: cross registry header grouping consistency pack: Yayın Sonucu→Yayın Çıktısı (SourceScans, Jobs), Enforcement→Uygunluk (NewsBulletin), 1 test fix, badge stilleri korundu, 1093 toplam (2026-04-03)
- Phase 139: standardvideo newsbulletin registry visibility completion pack: StandardVideo sütun sıralama, NewsBulletin 8 başlık Türkçeleştirme + sıralama, 1 import fix, 1 test fix, badge stilleri korundu, 1093 toplam (2026-04-03)
- Phase 138: template styleblueprint registry visibility completion pack: Templates + StyleBlueprints Türkçeleştirme, mantıksal sıralama, 2 import fix, 1 test fix, badge stilleri korundu, 1093 toplam (2026-04-03)
- Phase 137: news registry visibility completion pack: NewsItems + UsedNews Türkçeleştirme, mantıksal sıralama, import fix, badge stilleri korundu, 1093 toplam (2026-04-03)
- Phase 136: jobs registry visibility completion pack: sütun Türkçeleştirme, mantıksal sıralama, 2 import fix, badge stilleri korundu, 1093 toplam (2026-04-03)
- Phase 135: source scans registry visibility completion pack: sütun Türkçeleştirme, mantıksal sıralama, import fix, badge stilleri korundu, 1093 toplam (2026-04-03)
- Phase 134: sources registry visibility completion pack: sütun Türkçeleştirme, mantıksal sıralama, import fix, test mock düzeltmeleri, badge stilleri korundu, 1093 toplam (2026-04-03)
- Phase 133: source publication outcome summary: pure frontend, SourcePublicationOutcomeBadge, SourcePublicationOutcomeSummary, Yayın Çıktısı sütunu, 10 yeni test, 1093 toplam (2026-04-02)
- Phase 124: template target-output consistency summary: pure frontend, TemplateTargetOutputConsistencyBadge, TemplateTargetOutputConsistencySummary, Target/Output Tutarlılığı sütunu, 10 yeni test, 1003 toplam (2026-04-02)
- Phase 123: style blueprint input specificity summary: pure frontend, StyleBlueprintInputSpecificityBadge, StyleBlueprintInputSpecificitySummary, Girdi Özgüllüğü sütunu, 10 yeni test, 993 toplam (2026-04-02)
- Phase 122: template input specificity summary: pure frontend, TemplateInputSpecificityBadge, TemplateInputSpecificitySummary, Girdi Özgüllüğü sütunu, 10 yeni test, 983 toplam (2026-04-02)
- Phase 121: standard video input specificity summary: pure frontend, StandardVideoInputSpecificityBadge, StandardVideoInputSpecificitySummary, Girdi Özgüllüğü sütunu, 10 yeni test, 973 toplam (2026-04-02)
- Phase 120: source input specificity summary: pure frontend, SourceInputSpecificityBadge, SourceInputSpecificitySummary, Girdi Özgüllüğü sütunu, 10 yeni test, 963 toplam (2026-04-02)
- Phase 119: source scan input specificity summary: pure frontend, SourceScanInputSpecificityBadge, SourceScanInputSpecificitySummary, Girdi Özgüllüğü sütunu, 10 yeni test, 953 toplam (2026-04-02)
- Phase 118: used news input specificity summary: pure frontend, UsedNewsInputSpecificityBadge, UsedNewsInputSpecificitySummary, Girdi Özgüllüğü sütunu, 10 yeni test, 943 toplam (2026-04-02)
- Phase 117: news bulletin input specificity summary: pure frontend, NewsBulletinInputSpecificityBadge, NewsBulletinInputSpecificitySummary, Girdi Özgüllüğü sütunu, 10 yeni test, 933 toplam (2026-04-02)
- Phase 116: news item input specificity summary: pure frontend, NewsItemInputSpecificityBadge, NewsItemInputSpecificitySummary, Girdi Özgüllüğü sütunu, 10 yeni test, 923 toplam (2026-04-02)
- Phase 115: job input specificity summary: pure frontend, JobInputSpecificityBadge, JobInputSpecificitySummary, Girdi Özgüllüğü sütunu, 10 yeni test, 913 toplam (2026-04-02)
- Phase 114: job publication yield summary: pure frontend, JobPublicationYieldBadge, JobPublicationYieldSummary, Yayın Verimi sütunu, 10 yeni test, 903 toplam (2026-04-02)
- Phase 113: source scan publication outcome summary: pure frontend, SourceScanPublicationOutcomeBadge, SourceScanPublicationOutcomeSummary, Yayın Sonucu sütunu, 10 yeni test, 893 toplam (2026-04-02)
- Phase 112: job target-output consistency summary: pure frontend, JobTargetOutputConsistencyBadge, JobTargetOutputConsistencySummary, Target/Output Tutarlılığı sütunu, 10 yeni test, 883 toplam (2026-04-02)
- Phase 111: source scan target-output consistency summary: pure frontend, SourceScanTargetOutputConsistencyBadge, SourceScanTargetOutputConsistencySummary, Target/Output Tutarlılığı sütunu, 10 yeni test, 873 toplam (2026-04-02)
- Phase 110: used news input quality summary: pure frontend, UsedNewsInputQualityBadge, UsedNewsInputQualitySummary, Girdi Kalitesi sütunu, 10 yeni test, 863 toplam (2026-04-02)
- Phase 109: news bulletin input quality summary: pure frontend, NewsBulletinInputQualityBadge, NewsBulletinInputQualitySummary, Girdi Kalitesi sütunu, 10 yeni test, 853 toplam (2026-04-02)
- Phase 108: news item input quality summary: pure frontend, NewsItemInputQualityBadge, NewsItemInputQualitySummary, Girdi Kalitesi sütunu, 10 yeni test, 843 toplam (2026-04-02)
- Phase 107: job input quality summary: pure frontend, JobInputQualityBadge, JobInputQualitySummary, Girdi Kalitesi sütunu, 10 yeni test, 833 toplam (2026-04-02)
- Phase 106: source scan input quality summary: pure frontend, SourceScanInputQualityBadge, SourceScanInputQualitySummary, Girdi Kalitesi sütunu, 10 yeni test, 823 toplam (2026-04-02)
- Phase 105: source input quality summary: pure frontend, SourceInputQualityBadge, SourceInputQualitySummary, Girdi Kalitesi sütunu, 10 yeni test, 813 toplam (2026-04-02)
- Phase 104: style blueprint input quality summary: pure frontend, StyleBlueprintInputQualityBadge, StyleBlueprintInputQualitySummary, Girdi Kalitesi sütunu, 10 yeni test, 803 toplam (2026-04-02)
- Phase 103: template input quality summary: pure frontend, TemplateInputQualityBadge, TemplateInputQualitySummary, Girdi Kalitesi sütunu, 10 yeni test, 793 toplam (2026-04-02)
- Phase 102: used news artifact consistency summary: pure frontend, UsedNewsArtifactConsistencyBadge, UsedNewsArtifactConsistencySummary, Artifact Tutarlılığı sütunu, 10 yeni test, 783 toplam (2026-04-02)
- Phase 101: news item artifact consistency summary: pure frontend, NewsItemArtifactConsistencyBadge, NewsItemArtifactConsistencySummary, Artifact Tutarlılığı sütunu, 10 yeni test, 773 toplam (2026-04-02)
- Phase 100: job artifact consistency summary: pure frontend, JobArtifactConsistencyBadge, JobArtifactConsistencySummary, Artifact Tutarlılığı sütunu, 10 yeni test, 763 toplam (2026-04-02)
- Phase 99: source scan artifact consistency summary: pure frontend, SourceScanArtifactConsistencyBadge, SourceScanArtifactConsistencySummary, Artifact Tutarlılığı sütunu, 10 yeni test, 753 toplam (2026-04-02)
- Phase 98: source artifact consistency summary: pure frontend, SourceArtifactConsistencyBadge, SourceArtifactConsistencySummary, Artifact Tutarlılığı sütunu, 10 yeni test, 743 toplam (2026-04-02)
- Phase 97: style blueprint artifact consistency summary: pure frontend, StyleBlueprintArtifactConsistencyBadge, StyleBlueprintArtifactConsistencySummary, Artifact Tutarlılığı sütunu, 10 yeni test, 733 toplam (2026-04-02)
- Phase 96: template artifact consistency summary: pure frontend, TemplateArtifactConsistencyBadge, TemplateArtifactConsistencySummary, Artifact Tutarlılığı sütunu, 10 yeni test, 723 toplam (2026-04-02)
- Phase 95: standard video artifact consistency summary: pure frontend, StandardVideoArtifactConsistencyBadge, StandardVideoArtifactConsistencySummary, Artifact Tutarlılığı sütunu, 10 yeni test, 713 toplam (2026-04-02)
- Phase 94: news bulletin artifact consistency summary: pure frontend, NewsBulletinArtifactConsistencyBadge, NewsBulletinArtifactConsistencySummary, Artifact Tutarlılığı sütunu, 10 yeni test, 703 toplam (2026-04-02)
- Phase 93: standard video input quality summary: pure frontend, StandardVideoInputQualityBadge, StandardVideoInputQualitySummary, Girdi Kalitesi sütunu, 10 yeni test, 693 toplam (2026-04-02)
- Phase 92: news bulletin selected-news quality summary: backend 3 quality count fields (complete/partial/weak), NewsBulletinSelectedNewsQualityBadge, NewsBulletinSelectedNewsQualitySummary, İçerik Kalitesi sütunu, 10 yeni test, 683 toplam (2026-04-02)
- Phase 91: news item publication lineage summary: pure frontend, NewsItemPublicationLineageBadge, NewsItemPublicationLineageSummary, Yayın Zinciri sütunu, 10 yeni test, 673 toplam (2026-04-02)
- Phase 90: news item used-news linkage summary: backend has_published_used_news_link batch query, NewsItemUsedNewsLinkageBadge, NewsItemUsedNewsLinkageSummary, Used News Bağı sütunu, 10 yeni test, 663 toplam (2026-04-02)
- Phase 89: used news target resolution summary: backend has_target_resolved batch lookup, UsedNewsTargetResolutionBadge, UsedNewsTargetResolutionSummary, Hedef Çözümü sütunu, 10 yeni test, 653 toplam (2026-04-02)
- Phase 88: job publication outcome summary: pure frontend, JobPublicationOutcomeBadge, JobPublicationOutcomeSummary, Yayın Sonucu sütunu, 10 yeni test, 643 toplam (2026-04-02)
- Phase 87: source scan publication yield summary: backend linked/reviewed/used COUNT batch queries, SourceScanPublicationYieldBadge, SourceScanPublicationYieldSummary, Yayın Verimi sütunu, 10 yeni test, 633 toplam (2026-04-02)
- Phase 86: used news publication linkage summary: pure frontend, UsedNewsPublicationLinkageBadge, UsedNewsPublicationLinkageSummary, Yayın Bağı sütunu, 10 yeni test, 623 toplam (2026-04-02)
- Phase 85: used news source context summary: backend has_news_item_source/has_news_item_scan_reference batch JOIN, UsedNewsSourceContextBadge, UsedNewsSourceContextSummary, Kaynak Bağlamı sütunu, 10 yeni test, 613 toplam (2026-04-02)
- Phase 84: job output richness summary: pure frontend, JobOutputRichnessBadge, JobOutputRichnessSummary, Çıktı Zenginliği sütunu, 10 yeni test, 603 toplam (2026-04-02)
- Phase 83: style blueprint publication signal summary: pure frontend, StyleBlueprintPublicationSignalBadge, StyleBlueprintPublicationSignalSummary, Yayın Sinyali sütunu, 10 yeni test, 593 toplam (2026-04-02)
- Phase 82: template publication signal summary: pure frontend, TemplatePublicationSignalBadge, TemplatePublicationSignalSummary, Yayın Sinyali sütunu, 10 yeni test, 583 toplam (2026-04-02)
- Phase 81: standard video publication signal summary: pure frontend, StandardVideoPublicationSignalBadge, StandardVideoPublicationSignalSummary, Yayın Sinyali sütunu, 10 yeni test, 573 toplam (2026-04-02)
- Phase 80: news bulletin publication signal summary: pure frontend, NewsBulletinPublicationSignalBadge, NewsBulletinPublicationSignalSummary, Yayın Sinyali sütunu, 10 yeni test, 563 toplam (2026-04-02)
- Phase 79: source publication supply summary: backend reviewed/used counts, SourcePublicationSupplyBadge, SourcePublicationSupplySummary, Yayın Kaynağı sütunu, 10 yeni test, 553 toplam (2026-04-02)
- Phase 78: news item publication signal summary: pure frontend, NewsItemPublicationSignalBadge, NewsItemPublicationSignalSummary, Yayın Sinyali sütunu, 10 yeni test, 543 toplam (2026-04-02)
- Phase 77: source scan result richness summary: pure frontend, SourceScanResultRichnessBadge, SourceScanResultRichnessSummary, Çıktı Zenginliği sütunu, 10 yeni test, 533 toplam (2026-04-02)
- Phase 76: news item content completeness summary: pure frontend, NewsItemContentCompletenessBadge, NewsItemContentCompletenessSummary, İçerik sütunu, 10 yeni test, 523 toplam (2026-04-02)
- Phase 75: source config coverage summary: pure frontend, SourceConfigCoverageBadge, SourceConfigCoverageSummary, Konfigürasyon sütunu, 10 yeni test, 513 toplam (2026-04-02)
- Phase 74: source linked news summary: linked_news_count backend, SourceLinkedNewsStatusBadge, SourceLinkedNewsSummary, Haberler sütunu, 10 yeni test, 503 toplam (2026-04-02)
- Phase 73: source scan source context summary: source_name/source_status backend lookup, SourceScanSourceStatusBadge, SourceScanSourceSummary, Kaynak sütunu güncellendi, 10 yeni test, 493 toplam (2026-04-02)
- Phase 72: news bulletin source coverage summary: source_count/missing_source backend, NewsBulletinSourceCoverageBadge, NewsBulletinSourceCoverageSummary, Kaynak Kapsamı sütunu, 10 yeni test, 483 toplam (2026-04-02)
- Phase 71: news item scan lineage summary: source_scan_status backend lookup, NewsItemScanLineageBadge, NewsItemScanLineageSummary, Scan Kaynağı sütunu, 10 yeni test, 473 toplam (2026-04-02)
- Phase 70: news item source summary: source_name/source_status backend lookup, NewsItemSourceStatusBadge, NewsItemSourceSummary, Kaynak Özeti sütunu, 10 yeni test, 463 toplam (2026-04-02)
- Phase 69: news bulletin enforcement summary: warning aggregate backend, NewsBulletinEnforcementStatusBadge, NewsBulletinEnforcementSummary, Enforcement sütunu, 10 yeni test, 453 toplam (2026-04-02)
- Phase 68: standard video artifact summary: has_script/has_metadata backend, StandardVideoArtifactStatusBadge, StandardVideoArtifactSummary, Artifact sütunu, 10 yeni test, 443 toplam (2026-04-02)
- Phase 67: job actionability summary frontend: JobActionabilityBadge, JobActionabilitySummary, Aksiyon Özeti sütunu, 10 yeni test, 433 toplam (2026-04-02)
- Phase 66: template style link readiness summary frontend: TemplateStyleLinkReadinessBadge, TemplateStyleLinkReadinessSummary, Bağ Durumu sütunu, 10 yeni test, 423 toplam (2026-04-02)
- Phase 65: style blueprint readiness summary frontend: StyleBlueprintReadinessBadge, StyleBlueprintReadinessSummary, Hazırlık sütunu, 10 yeni test, 413 toplam (2026-04-02)
- Phase 64: source scan execution summary frontend: SourceScanExecutionBadge, SourceScanExecutionSummary, Çalışma Özeti sütunu, 10 yeni test, 403 toplam (2026-04-02)
- Phase 63: standard video readiness summary frontend: StandardVideoReadinessBadge, StandardVideoReadinessSummary, Hazırlık sütunu, 10 yeni test, 393 toplam (2026-04-02)
- Phase 62: used news state summary frontend: UsedNewsStateBadge, UsedNewsStateSummary, Durum sütunu, 10 yeni test, 383 toplam (2026-04-02)
- Phase 61: news item readiness summary frontend: NewsItemReadinessBadge, NewsItemReadinessSummary, Hazırlık sütunu, 10 yeni test, 373 toplam (2026-04-02)
- Phase 60: source readiness summary frontend: SourceReadinessBadge, SourceReadinessSummary, Hazırlık sütunu, 10 yeni test, 363 toplam (2026-04-02)
- Phase 59: template readiness summary frontend: TemplateReadinessBadge, TemplateReadinessSummary, Hazırlık sütunu, 10 yeni test, 353 toplam (2026-04-02)
- Phase 58: template style link summary frontend: style_link_count/primary_link_role, TemplateStyleLinkStatusBadge, TemplateStyleLinkSummary, Style Links sütunu, 10 yeni test, 343 toplam (2026-04-02)
- Phase 57: job context summary frontend: JobContextBadge, JobContextSummary, JobsTable Context sütunu, 10 yeni test, 333 toplam (2026-04-02)
- Phase 56: news bulletin readiness summary frontend: computeReadinessLevel, NewsBulletinReadinessBadge, NewsBulletinReadinessSummary, Hazırlık sütunu, 10 yeni test, 323 toplam (2026-04-02)
- Phase 55: news item usage summary frontend: usage_count/last_usage_type/last_target_module, NewsItemUsageBadge, NewsItemUsageSummary, NewsItemsTable Kullanım sütunu, 10 yeni test, 313 toplam (2026-04-02)
- Phase 54: source scan summary frontend: scan_count/last_scan_status/last_scan_finished_at, SourceScanStatusBadge, SourceScanSummary, SourcesTable Scans sütunu, 10 yeni test, 303 toplam (2026-04-02)
- Phase 1: backend + frontend + renderer iskeleti tamamlandı (2026-04-01)
- Phase 2 panel shell + DB temeli tamamlandı (2026-04-01)
- Phase 3 settings backend: Setting modeli, CRUD API, 17 test (2026-04-01)
- Phase 4 visibility backend: VisibilityRule modeli, CRUD API, 28 backend test (2026-04-01)
- Doküman Türkçeleştirme (2026-04-01)
- Phase 5 settings frontend: API katmanı, React Query hooks, SettingsRegistryPage, 9 frontend test (2026-04-01)
- Phase 6 visibility frontend: API katmanı, React Query hooks, VisibilityRegistryPage, 14 frontend test toplam (2026-04-01)
- Phase 6 integration check: Vite proxy eklendi, endpoint uyumu doğrulandı, curl ile manuel test geçti (2026-04-01)
- Phase 7 jobs backend: Job + JobStep modeli, migration, CRUD API, 8 yeni test, 36 toplam backend test (2026-04-01)
- Phase 8 jobs frontend: API katmanı, hooks, JobsTable, JobDetailPanel, JobStepsList, JobsRegistryPage, 19 toplam frontend test (2026-04-01)
- Phase 9 elapsed/ETA frontend: formatDuration, DurationBadge, jobs UI güncellendi, 28 toplam frontend test (2026-04-01)
- Phase 10 job detail page: JobDetailPage, JobOverviewPanel, JobTimelinePanel, JobSystemPanels, /admin/jobs/:jobId, 33 toplam frontend test (2026-04-01)
- Phase 11 standard video backend: StandardVideo modeli, migration, CRUD API, 8 yeni test, 44 toplam backend test (2026-04-01)
- Phase 12 standard video script backend: StandardVideoScript modeli, script CRUD API, 8 yeni test, 52 toplam backend test (2026-04-01)
- Phase 13 standard video metadata backend: StandardVideoMetadata modeli, metadata CRUD API, 8 yeni test, 60 toplam backend test (2026-04-01)
- Phase 14 standard video admin frontend: API katmanı, hooks, tablo, overview/artifacts panelleri, 11 yeni frontend test, 44 toplam frontend test (2026-04-01)
- Phase 15 standard video create/edit frontend: StandardVideoForm, CreatePage, edit modu, /new route, Yeni butonu, 6 yeni test, 50 toplam frontend test (2026-04-01)
- Phase 16 admin standard video script frontend: StandardVideoScriptPanel, create/update mutation hook'ları, API fonksiyonları, 13 yeni test, 63 toplam frontend test (2026-04-01)
- Phase 17 admin standard video metadata frontend: StandardVideoMetadataPanel, create/update mutation hook'ları, API fonksiyonları, 12 yeni test, 75 toplam frontend test (2026-04-01)
- Phase 18 template engine backend: Template modeli, migration, schemas, service, router, 11 yeni test, 71 toplam backend test (2026-04-02)
- Phase 19 admin templates registry frontend: API katmanı, hooks, TemplatesTable, TemplateDetailPanel, TemplatesRegistryPage, sidebar, 9 yeni test, 84 toplam frontend test (2026-04-02)
- Phase 20 template create/edit form frontend: TemplateForm, TemplateCreatePage, edit mode, useCreateTemplate, useUpdateTemplate, 10 yeni test, 94 toplam frontend test (2026-04-02)
- Phase 21 style blueprint backend: StyleBlueprint modeli, migration, schemas, service, router, 11 yeni test, 82 toplam backend test (2026-04-02)
- Phase 22 admin style blueprints registry frontend: API, hooks, table, detail panel, registry page, sidebar, 9 yeni test, 103 toplam frontend test (2026-04-02)
- Phase 23 news source registry backend: NewsSource modeli, migration, schemas, service, router, 15 yeni test, 97 toplam backend test (2026-04-02)
- Phase 24 admin sources registry frontend: API, hooks, table, detail panel, registry page, sidebar, 9 yeni test, 112 toplam frontend test (2026-04-02)
- Phase 25 admin sources create/edit frontend: SourceForm, SourceCreatePage, edit mode, useCreateSource, useUpdateSource, 9 yeni test, 121 toplam frontend test (2026-04-02)
- Phase 26 source scans backend: SourceScan modeli, migration, schemas, service, router, 14 yeni test, 111 toplam backend test (2026-04-02)
- Phase 27 admin source scans registry frontend: API, hooks, table, detail panel, registry page, sidebar, 9 yeni test, 130 toplam frontend test (2026-04-02)
- Phase 28 news items backend: NewsItem modeli, migration, schemas, service, router, 14 yeni test, 125 toplam backend test (2026-04-02)
- Phase 29 used news registry backend: UsedNewsRegistry modeli, migration, schemas, service, router, 14 yeni test, 139 toplam backend test (2026-04-02)
- Phase 30 news bulletin backend: NewsBulletin modeli, migration, schemas, service, router, 11 yeni test, 150 toplam backend test (2026-04-02)
- Phase 31 admin news bulletin registry frontend: API, hooks, table, detail panel, registry page, sidebar, 9 yeni test, 139 toplam frontend test (2026-04-02)
- Phase 32 admin news bulletin create/edit frontend: useCreateNewsBulletin, useUpdateNewsBulletin, NewsBulletinForm, CreatePage, edit mode, /new route, 8 yeni test, 147 toplam frontend test (2026-04-02)
- Phase 33 news bulletin script backend: NewsBulletinScript modeli, migration, schemas+service+router genişletildi, 9 yeni test, 159 toplam backend test (2026-04-02)
- Phase 34 news bulletin metadata backend: NewsBulletinMetadata modeli, migration, schemas+service+router genişletildi, 7 yeni test, 166 toplam backend test (2026-04-02)
- Phase 35 admin news bulletin script frontend: API genişletildi, useNewsBulletinScript + create/update hooks, NewsBulletinScriptForm, NewsBulletinScriptPanel, DetailPanel güncellendi, 9 yeni test, 156 toplam frontend test (2026-04-02)
- Phase 36 admin news bulletin metadata frontend: API genişletildi, useNewsBulletinMetadata + create/update hooks, NewsBulletinMetadataForm, NewsBulletinMetadataPanel, DetailPanel güncellendi, 11 yeni test, 167 toplam frontend test (2026-04-02)
- Phase 37 news bulletin selected items backend: NewsBulletinSelectedItem modeli, UniqueConstraint, migration, schemas+service+router genişletildi, IntegrityError → 409, 8 yeni test, 174 toplam backend test (2026-04-02)
- Phase 38 admin news bulletin selected items frontend: API genişletildi, useNewsBulletinSelectedItems + create/update hooks, NewsBulletinSelectedItemForm, NewsBulletinSelectedItemsPanel, DetailPanel güncellendi, 11 yeni test, 179 toplam frontend test (2026-04-02)
- Phase 39 admin used news registry frontend: usedNewsApi, useUsedNewsList, useUsedNewsDetail, UsedNewsTable, UsedNewsDetailPanel, UsedNewsRegistryPage, sidebar + route, 8 yeni test, 187 toplam frontend test (2026-04-02)
- Phase 40 admin news items registry frontend: newsItemsApi, useNewsItemsList, useNewsItemDetail, NewsItemsTable, NewsItemDetailPanel, NewsItemsRegistryPage, sidebar + route, 8 yeni test, 195 toplam frontend test (2026-04-02)
- Phase 42 admin style blueprint create/edit frontend: API genişletildi (Create+UpdatePayload, create+update fonksiyonları), useCreateStyleBlueprint, useUpdateStyleBlueprint, StyleBlueprintForm, StyleBlueprintCreatePage, DetailPanel edit modu, /new route, 10 yeni test, 205 toplam frontend test (2026-04-02)
- Phase 43 template↔style blueprint link backend: TemplateStyleLink modeli, UniqueConstraint, migration, schemas+service+router, GET/POST/PATCH /template-style-links, FK 404, duplicate 409, 11 yeni test, 185 toplam backend test (2026-04-02)
- Phase 44 admin template style links registry frontend: templateStyleLinksApi, useTemplateStyleLinksList, useTemplateStyleLinkDetail, TemplateStyleLinksTable, TemplateStyleLinkDetailPanel, TemplateStyleLinksRegistryPage, sidebar + route, 8 yeni test, 213 toplam frontend test (2026-04-02)
- Phase 45 admin template style links create/edit frontend: API genişletildi (Create+UpdatePayload, create+update fonksiyonları), useCreateTemplateStyleLink, useUpdateTemplateStyleLink, TemplateStyleLinkForm, TemplateStyleLinkCreatePage, DetailPanel edit modu, /new route, 10 yeni test, 223 toplam frontend test (2026-04-02)
- Phase 46 admin news items create/edit frontend: newsItemsApi genişletildi, useCreateNewsItem, useUpdateNewsItem, NewsItemForm, NewsItemCreatePage, DetailPanel edit modu, /new route, 10 yeni test, 233 toplam frontend test (2026-04-02)
- Phase 47 admin source scans create/edit frontend: sourceScansApi genişletildi, useCreateSourceScan, useUpdateSourceScan, SourceScanForm, SourceScanCreatePage, DetailPanel edit modu, /new route, 10 yeni test, 243 toplam frontend test (2026-04-02)
- Phase 48 admin used news create/edit frontend: usedNewsApi genişletildi, useCreateUsedNews, useUpdateUsedNews, UsedNewsForm, UsedNewsCreatePage, DetailPanel edit modu, /new route, 10 yeni test, 253 toplam frontend test (2026-04-02)
- Phase 49 news bulletin selected news picker frontend: useNewsItemsPickerList, NewsItemPickerTable, NewsBulletinSelectedNewsPicker, SelectedItemsPanel güncellendi (+picker entegrasyonu), 10 yeni test, 263 toplam frontend test (2026-04-02)
- Phase 50 news bulletin used news enforcement backend: get_used_news_enforcement() helper, NewsBulletinSelectedItemWithEnforcementResponse schema, list/create endpoints enforcement alanları döndürüyor, 10 yeni backend test, 195 toplam backend test (2026-04-02)
- Phase 51 news bulletin used news warning frontend: UsedNewsWarningBadge, UsedNewsWarningDetails, NewsBulletinSelectedItemsPanel uyarı entegrasyonu, frontend tipler güncellendi, 10 yeni frontend test, 273 toplam frontend test (2026-04-02)
- Phase 52 news bulletin artifact summary frontend: has_script/has_metadata backend, NewsBulletinArtifactStatusBadge, NewsBulletinArtifactSummary, registry Artifacts sütunu, 10 yeni frontend test, 283 toplam frontend test, 195 backend test (2026-04-02)
- Phase 53 news bulletin selected news summary frontend: selected_news_count backend, NewsBulletinSelectedNewsCountBadge, NewsBulletinSelectedNewsSummary, registry Haberler sütunu, 10 yeni frontend test, 293 toplam frontend test, 195 backend test (2026-04-02)
- Phase 54 source scan summary frontend: scan_count/last_scan_status/last_scan_finished_at backend, SourceScanStatusBadge, SourceScanSummary, SourcesTable Scans sütunu, 10 yeni frontend test, 303 toplam frontend test, 195 backend test (2026-04-02)

## Mevcut Riskler
- Henüz auth / rol zorlama yok (kasıtlı)
- Node varsayılan shell PATH'inde değil
- Port 8000 başka bir uygulama tarafından kullanılıyorsa dev proxy çalışmaz
- Testlerde React Router v7 future flag uyarısı — kozmetik

## GitHub Yedek Durumu
✓ Aktif. `git@github.com:huskobro/contenthub.git` — main branch upstream ayarlandı ve güncel.
