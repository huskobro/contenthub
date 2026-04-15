"""
Faz 4 TTS fine controls — unit tests.

Kapsam:
  - TTSFineControls clamping
  - apply_scene_energy (calm/neutral/energetic)
  - apply_glossary_and_pronunciation (marka/urun/pronunciation)
  - insert_ssml_pauses
  - build_provider_voice_settings (dubvoice/edge_tts/system_tts)
  - plan_scene_tts end-to-end
  - SABIT: glossary degisimi SUBTITLE metni degistirmez (audit ile dogrulanir)
"""

from __future__ import annotations

import pytest

from app.tts.controls import (
    SceneTTSPlan,
    TTSFineControls,
    apply_glossary_and_pronunciation,
    apply_scene_energy,
    build_provider_voice_settings,
    insert_ssml_pauses,
    plan_scene_tts,
)


# ---------------------------------------------------------------------------
# TTSFineControls clamping
# ---------------------------------------------------------------------------


def test_controls_clamp_speed_ust_sinir():
    c = TTSFineControls(speed=3.0).clamped()
    assert c.speed == 1.5


def test_controls_clamp_speed_alt_sinir():
    c = TTSFineControls(speed=0.1).clamped()
    assert c.speed == 0.5


def test_controls_clamp_pitch_ust_sinir():
    c = TTSFineControls(pitch=5.0).clamped()
    assert c.pitch == 1.0


def test_controls_clamp_emphasis_negatif():
    c = TTSFineControls(emphasis=-0.5).clamped()
    assert c.emphasis == 0.0


def test_controls_clamp_break_ms_negatif():
    c = TTSFineControls(sentence_break_ms=-100).clamped()
    assert c.sentence_break_ms == 0


def test_controls_default_degerler_makul():
    c = TTSFineControls()
    assert c.speed == 1.0
    assert c.pitch == 0.0
    assert 0.0 <= c.emphasis <= 1.0
    assert c.use_speaker_boost is True


# ---------------------------------------------------------------------------
# apply_scene_energy
# ---------------------------------------------------------------------------


def test_scene_energy_calm_emphasis_duser():
    base = TTSFineControls(emphasis=0.9)
    out = apply_scene_energy(base, "calm")
    assert out.emphasis < 0.5
    assert out.scene_energy == "calm"


def test_scene_energy_energetic_emphasis_artar():
    base = TTSFineControls(emphasis=0.1)
    out = apply_scene_energy(base, "energetic")
    assert out.emphasis > 0.5


def test_scene_energy_neutral_orta():
    base = TTSFineControls()
    out = apply_scene_energy(base, "neutral")
    assert 0.3 <= out.emphasis <= 0.7


def test_scene_energy_none_no_op():
    base = TTSFineControls(emphasis=0.42)
    out = apply_scene_energy(base, None)
    assert out.emphasis == 0.42


def test_scene_energy_bilinmeyen_no_op():
    base = TTSFineControls(emphasis=0.42)
    out = apply_scene_energy(base, "hyper")
    assert out.emphasis == 0.42


def test_scene_energy_energetic_speed_artar():
    base = TTSFineControls(speed=1.0)
    out = apply_scene_energy(base, "energetic")
    assert out.speed > 1.0


def test_scene_energy_calm_speed_azalir():
    base = TTSFineControls(speed=1.0)
    out = apply_scene_energy(base, "calm")
    assert out.speed < 1.0


# ---------------------------------------------------------------------------
# Glossary + pronunciation
# ---------------------------------------------------------------------------


def test_glossary_brand_replaces_word():
    text = "ContentHub kullaniyoruz."
    out, repl = apply_glossary_and_pronunciation(
        text, glossary_brand={"ContentHub": "kontent hab"}
    )
    assert "kontent hab" in out
    assert "ContentHub" not in out
    assert any(r["from"] == "ContentHub" for r in repl)


def test_glossary_product_replaces_word():
    text = "Remotion ile render."
    out, repl = apply_glossary_and_pronunciation(
        text, glossary_product={"Remotion": "remoşın"}
    )
    assert "remoşın" in out
    assert any(r["source"] == "product" for r in repl)


def test_pronunciation_overrides_tam_kelime():
    text = "cunku guzel"
    out, repl = apply_glossary_and_pronunciation(
        text, pronunciation_overrides={"cunku": "çünki"}
    )
    assert "çünki" in out


def test_glossary_partial_match_yoktur():
    """ContentHub eşleşir ama ContentHubXL eşleşmemeli (kelime sınırı)."""
    text = "ContentHubXL ve ContentHub farkli."
    out, _ = apply_glossary_and_pronunciation(
        text, glossary_brand={"ContentHub": "kontent hab"}
    )
    # ContentHubXL korunmali (boundary check)
    assert "ContentHubXL" in out
    # ContentHub ile baslayip sonu olmayan yerlerden replace edilmemeli
    # (Bizim pattern kelime sonrası (?!\w))
    assert out.count("kontent hab") == 1


def test_glossary_empty_text_safe():
    out, repl = apply_glossary_and_pronunciation(
        "", glossary_brand={"A": "B"}
    )
    assert out == ""
    assert repl == []


def test_glossary_no_mapping_no_op():
    out, repl = apply_glossary_and_pronunciation("Merhaba dunya")
    assert out == "Merhaba dunya"
    assert repl == []


def test_glossary_turkce_karakter_preserved():
    """SABIT kontrol: script-canonical Turkce harfler bozulmamali."""
    text = "Çünkü güzel"
    out, _ = apply_glossary_and_pronunciation(text)
    assert "Çünkü" in out
    assert "güzel" in out


def test_glossary_audit_count_dogru():
    text = "iPhone iPhone iPhone."
    out, repl = apply_glossary_and_pronunciation(
        text, glossary_product={"iPhone": "aay fon"}
    )
    iphone_repl = [r for r in repl if r["from"] == "iPhone"]
    assert len(iphone_repl) == 1
    assert iphone_repl[0]["count"] == 3


# ---------------------------------------------------------------------------
# SSML pauses
# ---------------------------------------------------------------------------


def test_insert_ssml_pauses_sentence_break():
    text = "Merhaba. Dunya."
    out = insert_ssml_pauses(text, sentence_break_ms=300)
    assert '<break time="300ms"/>' in out


def test_insert_ssml_pauses_zero_no_op():
    text = "Merhaba. Dunya."
    out = insert_ssml_pauses(text)
    assert "<break" not in out


def test_insert_ssml_pauses_paragraph_break():
    text = "Para 1.\n\nPara 2."
    out = insert_ssml_pauses(text, paragraph_break_ms=800)
    assert '<break time="800ms"/>' in out


def test_insert_ssml_pauses_empty_safe():
    out = insert_ssml_pauses("")
    assert out == ""


# ---------------------------------------------------------------------------
# build_provider_voice_settings
# ---------------------------------------------------------------------------


def test_build_voice_settings_dubvoice():
    c = TTSFineControls(speed=1.1, emphasis=0.7, stability=0.6, similarity_boost=0.8)
    vs = build_provider_voice_settings(c, provider_id="dubvoice")
    assert vs["stability"] == pytest.approx(0.6)
    assert vs["similarity_boost"] == pytest.approx(0.8)
    assert vs["speed"] == pytest.approx(1.1)
    assert vs["style"] == pytest.approx(0.7)  # emphasis → style
    assert vs["use_speaker_boost"] is True


def test_build_voice_settings_edge_tts_rate_pozitif():
    c = TTSFineControls(speed=1.2)
    vs = build_provider_voice_settings(c, provider_id="edge_tts")
    assert vs["rate"] == "+20%"


def test_build_voice_settings_edge_tts_rate_negatif():
    c = TTSFineControls(speed=0.8)
    vs = build_provider_voice_settings(c, provider_id="edge_tts")
    assert vs["rate"] == "-20%"


def test_build_voice_settings_edge_tts_pitch():
    c = TTSFineControls(pitch=0.5)
    vs = build_provider_voice_settings(c, provider_id="edge_tts")
    assert vs["pitch"] == "+10Hz"


def test_build_voice_settings_system_tts_basit():
    c = TTSFineControls(speed=1.15)
    vs = build_provider_voice_settings(c, provider_id="system_tts")
    assert vs["speed"] == pytest.approx(1.15)
    assert "pitch" not in vs  # system_tts destekleyemez


def test_build_voice_settings_bilinmeyen_provider_generic():
    c = TTSFineControls(speed=1.0, pitch=0.0, emphasis=0.5)
    vs = build_provider_voice_settings(c, provider_id="yeni_saglayici")
    assert "speed" in vs
    assert "pitch" in vs
    assert "emphasis" in vs


# ---------------------------------------------------------------------------
# plan_scene_tts — end-to-end
# ---------------------------------------------------------------------------


def test_plan_scene_tts_script_canonical_degismez_glossary_sonrasi():
    """SABIT: plan_scene_tts glossary uygular ama SCRIPT metni input'tur.

    Subtitle icin kullanilan metin PLAN'DAKI tts_text DEGIL; script_narration'dir.
    Bu test planin audit'ini kontrol eder.
    """
    script = "ContentHub gelistiriyor."
    controls = TTSFineControls(glossary_brand={"ContentHub": "kontent hab"})
    plan = plan_scene_tts(
        script_narration=script,
        base_controls=controls,
        provider_id="dubvoice",
    )
    # TTS metni degismis
    assert "kontent hab" in plan.tts_text
    assert "ContentHub" not in plan.tts_text
    # Audit replacements listeli
    assert len(plan.replacements) == 1
    assert plan.replacements[0]["from"] == "ContentHub"
    # Orijinal script degismemis (cagri argumani immutable string)
    assert script == "ContentHub gelistiriyor."


def test_plan_scene_tts_dubvoice_voice_settings_dolu():
    plan = plan_scene_tts(
        script_narration="Merhaba.",
        base_controls=TTSFineControls(speed=1.05, emphasis=0.6),
        provider_id="dubvoice",
    )
    assert "stability" in plan.voice_settings
    assert "style" in plan.voice_settings
    assert plan.voice_settings["style"] == pytest.approx(0.6)
    assert plan.voice_settings["speed"] == pytest.approx(1.05)


def test_plan_scene_tts_scene_energy_calm_stability_yukselir():
    plan = plan_scene_tts(
        script_narration="Yavas anlat.",
        base_controls=TTSFineControls(stability=0.3),
        scene_energy="calm",
        provider_id="dubvoice",
    )
    assert plan.voice_settings["stability"] >= 0.7
    assert plan.scene_energy == "calm"


def test_plan_scene_tts_audit_entry_yapisi():
    plan = plan_scene_tts(
        script_narration="Test.",
        base_controls=TTSFineControls(
            glossary_brand={"Test": "tes"},
        ),
        scene_energy="energetic",
        provider_id="dubvoice",
    )
    audit = plan.as_audit_entry(scene_number=3)
    assert audit["scene_number"] == 3
    assert audit["provider_id"] == "dubvoice"
    assert audit["scene_energy"] == "energetic"
    assert "replacements" in audit
    assert "voice_settings" in audit
    assert "controls_snapshot" in audit


def test_plan_scene_tts_ssml_pauses_kapali_default():
    plan = plan_scene_tts(
        script_narration="Bir. Iki.",
        base_controls=TTSFineControls(sentence_break_ms=300),
        provider_id="dubvoice",
    )
    assert "<break" not in plan.tts_text


def test_plan_scene_tts_ssml_pauses_acik_enjekte_eder():
    plan = plan_scene_tts(
        script_narration="Bir. Iki.",
        base_controls=TTSFineControls(sentence_break_ms=400),
        provider_id="dubvoice",
        apply_ssml_pauses=True,
    )
    assert '<break time="400ms"/>' in plan.tts_text


def test_plan_scene_tts_pronunciation_ve_brand_siralama():
    """Pronunciation once, sonra brand, sonra product uygulanir."""
    script = "iPhone ContentHub Remotion."
    plan = plan_scene_tts(
        script_narration=script,
        base_controls=TTSFineControls(
            glossary_brand={"ContentHub": "kontent hab"},
            glossary_product={"Remotion": "remoşın"},
        ),
        provider_id="dubvoice",
    )
    assert "kontent hab" in plan.tts_text
    assert "remoşın" in plan.tts_text
    # iPhone degistirilmemeli (mapping yok)
    assert "iPhone" in plan.tts_text


def test_plan_scene_tts_empty_narration_safe():
    plan = plan_scene_tts(
        script_narration="",
        base_controls=TTSFineControls(),
        provider_id="dubvoice",
    )
    assert plan.tts_text == ""
    assert plan.replacements == []
