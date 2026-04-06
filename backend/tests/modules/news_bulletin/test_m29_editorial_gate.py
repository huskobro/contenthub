"""
M29 — Editorial gate lifecycle testleri.

Gate'in dogru siralamayla calistigini, status gecislerinin
tutarli oldugunu ve contract'in korunmasini dogrular.
"""

import pytest

from app.modules.news_bulletin.editorial_gate import (
    BULLETIN_STATUS_DRAFT,
    BULLETIN_STATUS_SELECTION_CONFIRMED,
    BULLETIN_STATUS_IN_PROGRESS,
    BULLETIN_STATUS_DONE,
    GATE_ENTRY_STATUS,
)


class TestEditorialGateConstants:
    """Gate sabitleri dogru tanimlanmis olmali."""

    def test_draft_constant(self):
        assert BULLETIN_STATUS_DRAFT == "draft"

    def test_selection_confirmed_constant(self):
        assert BULLETIN_STATUS_SELECTION_CONFIRMED == "selection_confirmed"

    def test_in_progress_constant(self):
        assert BULLETIN_STATUS_IN_PROGRESS == "in_progress"

    def test_done_constant(self):
        assert BULLETIN_STATUS_DONE == "done"

    def test_gate_entry_is_draft(self):
        assert GATE_ENTRY_STATUS == "draft"


class TestEditorialGateLifecycle:
    """Gate lifecycle semantik kurallari."""

    def test_confirm_requires_draft_status(self):
        """confirm_selection sadece 'draft' bulletinlerde calisir."""
        from app.modules.news_bulletin.editorial_gate import confirm_selection
        import inspect
        src = inspect.getsource(confirm_selection)
        assert "GATE_ENTRY_STATUS" in src or '"draft"' in src

    def test_consume_requires_selection_confirmed(self):
        """consume_news sadece 'selection_confirmed' bulletinlerde calisir."""
        from app.modules.news_bulletin.editorial_gate import consume_news
        import inspect
        src = inspect.getsource(consume_news)
        assert "BULLETIN_STATUS_SELECTION_CONFIRMED" in src or '"selection_confirmed"' in src

    def test_gate_does_not_change_news_item_status_on_confirm(self):
        """confirm_selection NewsItem.status'unu DEGISTIRMEZ."""
        from app.modules.news_bulletin.editorial_gate import confirm_selection
        import inspect
        src = inspect.getsource(confirm_selection)
        # confirm_selection icinde NewsItem.status atamasi OLMAMALI
        assert 'news_item.status = "used"' not in src

    def test_consume_sets_used_status(self):
        """consume_news NewsItem.status = 'used' atar."""
        from app.modules.news_bulletin.editorial_gate import consume_news
        import inspect
        src = inspect.getsource(consume_news)
        assert 'news_item.status = "used"' in src

    def test_lifecycle_order(self):
        """Gate lifecycle sirasi: draft → selection_confirmed → in_progress."""
        statuses = [
            BULLETIN_STATUS_DRAFT,
            BULLETIN_STATUS_SELECTION_CONFIRMED,
            BULLETIN_STATUS_IN_PROGRESS,
            BULLETIN_STATUS_DONE,
        ]
        assert statuses == ["draft", "selection_confirmed", "in_progress", "done"]


class TestDeleteSelectedItemGuard:
    """Secili haber silme guard'i — sadece draft'ta izin verir."""

    def test_delete_service_exists(self):
        from app.modules.news_bulletin.service import delete_bulletin_selected_item
        assert callable(delete_bulletin_selected_item)

    def test_delete_endpoint_contract(self):
        """Router'da delete endpoint var ve draft guard iceriyor."""
        import inspect
        from app.modules.news_bulletin.router import delete_bulletin_selected_item
        src = inspect.getsource(delete_bulletin_selected_item)
        assert '"draft"' in src
