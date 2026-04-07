"""Tests for TemplateRenderer -- {{variable}} substitution."""

import pytest
from app.prompt_assembly.template_renderer import TemplateRenderer, RenderResult


@pytest.fixture
def renderer() -> TemplateRenderer:
    return TemplateRenderer()


def test_simple_substitution(renderer):
    result = renderer.render(
        template="Kategori: {{category_name}}",
        data={"category_name": "gundem"},
    )
    assert result.rendered_text == "Kategori: gundem"
    assert result.used_variables == ["category_name"]
    assert result.missing_variables == []
    assert result.is_empty is False


def test_multiple_variables(renderer):
    result = renderer.render(
        template="{{title}} - {{summary}}",
        data={"title": "Test", "summary": "Ozet"},
    )
    assert result.rendered_text == "Test - Ozet"
    assert set(result.used_variables) == {"title", "summary"}


def test_missing_non_critical_variable(renderer):
    result = renderer.render(
        template="Ton: {{tone}}, Stil: {{style}}",
        data={"tone": "formal"},
    )
    assert result.rendered_text == "Ton: formal, Stil: "
    assert "style" in result.missing_variables
    assert result.has_critical_missing is False


def test_missing_critical_variable(renderer):
    result = renderer.render(
        template="Haberler: {{news_summary}}",
        data={},
        critical_keys=["news_summary"],
    )
    assert result.has_critical_missing is True
    assert "news_summary" in result.missing_variables


def test_no_variables(renderer):
    result = renderer.render(
        template="Sabit metin bloku",
        data={},
    )
    assert result.rendered_text == "Sabit metin bloku"
    assert result.used_variables == []
    assert result.missing_variables == []


def test_empty_render(renderer):
    result = renderer.render(
        template="{{maybe_empty}}",
        data={"maybe_empty": ""},
    )
    assert result.rendered_text == ""
    assert result.is_empty is True


def test_unicode_content(renderer):
    result = renderer.render(
        template="Baslik: {{title}}",
        data={"title": "Turkiye'de deprem: Afet bolgesinden son haberler"},
    )
    assert "Turkiye" in result.rendered_text


def test_multiline_template(renderer):
    result = renderer.render(
        template="Baslik: {{title}}\nOzet:\n{{summary}}",
        data={"title": "Test", "summary": "Paragraf 1\nParagraf 2"},
    )
    assert "Test" in result.rendered_text
    assert "Paragraf 2" in result.rendered_text


def test_repeated_variable(renderer):
    result = renderer.render(
        template="{{name}} diyor ki: {{name}}",
        data={"name": "Ali"},
    )
    assert result.rendered_text == "Ali diyor ki: Ali"
    assert result.used_variables == ["name"]


def test_extract_data_dependencies(renderer):
    deps = renderer.extract_data_dependencies("{{a}} ve {{b}} ile {{c}}")
    assert set(deps) == {"a", "b", "c"}


def test_whitespace_only_is_empty(renderer):
    result = renderer.render(
        template="  {{content}}  ",
        data={"content": ""},
    )
    assert result.is_empty is True
