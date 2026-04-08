"""
M31 — Render output planlama testleri.

_build_render_outputs fonksiyonunun combined/per_category/per_item
modlarında dogru cikti planlari urettigini dogrular.
"""

import pytest
from app.modules.news_bulletin.executors.composition import _build_render_outputs

COMMON_KWARGS = dict(
    composition_id="NewsBulletin",
    subtitles_srt=None,
    word_timing_path=None,
    timing_mode="cursor",
    resolved_subtitle_style={"preset_id": "clean_white"},
    lower_third_style=None,
    language="tr",
    metadata_data={"title": "Test Bulten", "description": "", "tags": [], "hashtags": []},
)

SAMPLE_ITEMS = [
    {"itemNumber": 1, "headline": "Haber 1", "narration": "Narr 1", "audioPath": None,
     "imagePath": None, "durationSeconds": 10.0, "category": "tech"},
    {"itemNumber": 2, "headline": "Haber 2", "narration": "Narr 2", "audioPath": None,
     "imagePath": None, "durationSeconds": 12.0, "category": "finance"},
    {"itemNumber": 3, "headline": "Haber 3", "narration": "Narr 3", "audioPath": None,
     "imagePath": None, "durationSeconds": 8.0, "category": "tech"},
]


class TestCombinedRenderOutput:
    """Combined mod — tek output."""

    def test_combined_returns_single_output(self):
        outputs = _build_render_outputs(
            render_mode="combined",
            props_items=SAMPLE_ITEMS,
            bulletin_title="Test Bulten",
            **COMMON_KWARGS,
        )
        assert len(outputs) == 1

    def test_combined_output_key(self):
        outputs = _build_render_outputs(
            render_mode="combined",
            props_items=SAMPLE_ITEMS,
            bulletin_title="Test Bulten",
            **COMMON_KWARGS,
        )
        assert outputs[0]["output_key"] == "combined"

    def test_combined_output_filename(self):
        outputs = _build_render_outputs(
            render_mode="combined",
            props_items=SAMPLE_ITEMS,
            bulletin_title="Test Bulten",
            **COMMON_KWARGS,
        )
        assert outputs[0]["suggested_filename"] == "output.mp4"

    def test_combined_includes_all_items(self):
        outputs = _build_render_outputs(
            render_mode="combined",
            props_items=SAMPLE_ITEMS,
            bulletin_title="Test Bulten",
            **COMMON_KWARGS,
        )
        assert len(outputs[0]["items"]) == 3

    def test_combined_total_duration(self):
        outputs = _build_render_outputs(
            render_mode="combined",
            props_items=SAMPLE_ITEMS,
            bulletin_title="Test Bulten",
            **COMMON_KWARGS,
        )
        # 30.0s audio + 3 items × 1.25s CATEGORY_FLASH_DUR = 33.75s
        assert outputs[0]["total_duration_seconds"] == pytest.approx(33.75)

    def test_combined_has_props(self):
        outputs = _build_render_outputs(
            render_mode="combined",
            props_items=SAMPLE_ITEMS,
            bulletin_title="Test Bulten",
            **COMMON_KWARGS,
        )
        assert "props" in outputs[0]
        assert outputs[0]["props"]["renderMode"] == "combined"

    def test_unknown_mode_falls_back_to_combined(self):
        outputs = _build_render_outputs(
            render_mode="unknown_mode_xyz",
            props_items=SAMPLE_ITEMS,
            bulletin_title="Test",
            **COMMON_KWARGS,
        )
        assert len(outputs) == 1
        assert outputs[0]["output_key"] == "combined"


class TestPerCategoryRenderOutput:
    """Per-category mod — kategori sayisi kadar output."""

    def test_per_category_two_categories(self):
        outputs = _build_render_outputs(
            render_mode="per_category",
            props_items=SAMPLE_ITEMS,
            bulletin_title="Bulten",
            **COMMON_KWARGS,
        )
        # tech ve finance → 2 output
        assert len(outputs) == 2

    def test_per_category_keys(self):
        outputs = _build_render_outputs(
            render_mode="per_category",
            props_items=SAMPLE_ITEMS,
            bulletin_title="Bulten",
            **COMMON_KWARGS,
        )
        keys = {o["output_key"] for o in outputs}
        assert "category_tech" in keys
        assert "category_finance" in keys

    def test_per_category_correct_item_counts(self):
        outputs = _build_render_outputs(
            render_mode="per_category",
            props_items=SAMPLE_ITEMS,
            bulletin_title="Bulten",
            **COMMON_KWARGS,
        )
        output_map = {o["output_key"]: o for o in outputs}
        assert len(output_map["category_tech"]["items"]) == 2   # item 1 + 3
        assert len(output_map["category_finance"]["items"]) == 1  # item 2

    def test_per_category_none_category_becomes_genel(self):
        items_with_none = [
            {"itemNumber": 1, "headline": "H", "narration": "N", "audioPath": None,
             "imagePath": None, "durationSeconds": 5.0, "category": None},
        ]
        outputs = _build_render_outputs(
            render_mode="per_category",
            props_items=items_with_none,
            bulletin_title="Bulten",
            **COMMON_KWARGS,
        )
        assert len(outputs) == 1
        assert outputs[0]["output_key"] == "category_genel"

    def test_per_category_single_category(self):
        single_cat = [
            {"itemNumber": 1, "headline": "H1", "narration": "N1", "audioPath": None,
             "imagePath": None, "durationSeconds": 5.0, "category": "sports"},
            {"itemNumber": 2, "headline": "H2", "narration": "N2", "audioPath": None,
             "imagePath": None, "durationSeconds": 5.0, "category": "sports"},
        ]
        outputs = _build_render_outputs(
            render_mode="per_category",
            props_items=single_cat,
            bulletin_title="Bulten",
            **COMMON_KWARGS,
        )
        assert len(outputs) == 1
        assert outputs[0]["output_key"] == "category_sports"
        assert len(outputs[0]["items"]) == 2


class TestPerItemRenderOutput:
    """Per-item mod — her haber icin ayri output."""

    def test_per_item_count_equals_items(self):
        outputs = _build_render_outputs(
            render_mode="per_item",
            props_items=SAMPLE_ITEMS,
            bulletin_title="Bulten",
            **COMMON_KWARGS,
        )
        assert len(outputs) == 3

    def test_per_item_keys(self):
        outputs = _build_render_outputs(
            render_mode="per_item",
            props_items=SAMPLE_ITEMS,
            bulletin_title="Bulten",
            **COMMON_KWARGS,
        )
        keys = [o["output_key"] for o in outputs]
        assert keys == ["item_1", "item_2", "item_3"]

    def test_per_item_each_has_one_item(self):
        outputs = _build_render_outputs(
            render_mode="per_item",
            props_items=SAMPLE_ITEMS,
            bulletin_title="Bulten",
            **COMMON_KWARGS,
        )
        for o in outputs:
            assert len(o["items"]) == 1

    def test_per_item_filenames(self):
        outputs = _build_render_outputs(
            render_mode="per_item",
            props_items=SAMPLE_ITEMS,
            bulletin_title="Bulten",
            **COMMON_KWARGS,
        )
        filenames = [o["suggested_filename"] for o in outputs]
        assert filenames == ["output_item_01.mp4", "output_item_02.mp4", "output_item_03.mp4"]

    def test_per_item_single_item_duration(self):
        outputs = _build_render_outputs(
            render_mode="per_item",
            props_items=SAMPLE_ITEMS,
            bulletin_title="Bulten",
            **COMMON_KWARGS,
        )
        # Her item: audio_duration + 1 × 1.25s CATEGORY_FLASH_DUR
        assert outputs[0]["total_duration_seconds"] == pytest.approx(11.25)
        assert outputs[1]["total_duration_seconds"] == pytest.approx(13.25)
        assert outputs[2]["total_duration_seconds"] == pytest.approx(9.25)

    def test_per_item_props_structure(self):
        outputs = _build_render_outputs(
            render_mode="per_item",
            props_items=SAMPLE_ITEMS,
            bulletin_title="Bulten",
            **COMMON_KWARGS,
        )
        for o in outputs:
            assert "props" in o
            assert "items" in o["props"]
            assert len(o["props"]["items"]) == 1


class TestRenderOutputsCompositionId:
    """Tum modlarda composition_id guvenli mapping'den gelmeli."""

    def test_combined_composition_id(self):
        outputs = _build_render_outputs(
            render_mode="combined", props_items=SAMPLE_ITEMS,
            bulletin_title="B", **COMMON_KWARGS,
        )
        assert outputs[0]["composition_id"] == "NewsBulletin"

    def test_per_category_composition_ids(self):
        outputs = _build_render_outputs(
            render_mode="per_category", props_items=SAMPLE_ITEMS,
            bulletin_title="B", **COMMON_KWARGS,
        )
        for o in outputs:
            assert o["composition_id"] == "NewsBulletin"

    def test_per_item_composition_ids(self):
        outputs = _build_render_outputs(
            render_mode="per_item", props_items=SAMPLE_ITEMS,
            bulletin_title="B", **COMMON_KWARGS,
        )
        for o in outputs:
            assert o["composition_id"] == "NewsBulletin"
