import sys
from pathlib import Path

# Allow running this file directly from the project root.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from product_context_engine import (
    ProductContext,
    analyze_product_context,
    build_contextual_queries,
    clarification_question,
)


def test_chilli_powder_is_ambiguous_without_purpose():
    ctx = analyze_product_context(product_name="chilli powder")
    assert ctx.requires_clarification is True
    assert ctx.product_category == "UNKNOWN"
    assert "food/spice" in ctx.possible_contexts
    assert ctx.context_confidence <= 0.35


def test_chilli_powder_for_cooking_is_food():
    ctx = analyze_product_context(product_name="chilli powder for cooking", jurisdiction="India")
    assert ctx.product_category == "FOOD"
    assert ctx.product_form == "powder"
    assert ctx.requires_clarification is False
    assert any("chilli" in q and "food" in q for q in ctx.retrieval_queries)


def test_chilli_powder_for_face_is_cosmetic_context_only():
    ctx = analyze_product_context(product_name="chilli powder for face", jurisdiction="India")
    assert ctx.product_category == "COSMETIC"
    assert ctx.product_form == "powder"
    assert ctx.requires_clarification is False
    # The engine must not produce a safety/efficacy/legal conclusion.
    assert not hasattr(ctx, "is_safe")
    assert not hasattr(ctx, "legal_status")


def test_capsaicin_cream_is_topical_context():
    ctx = analyze_product_context(
        product_name="capsaicin cream",
        ingredients=["chilli"],
        product_type="cream",
        purpose="topical",
        jurisdiction="India",
    )
    assert ctx.product_category == "COSMETIC"
    assert ctx.product_form == "cream"


def test_turmeric_context_changes_with_form_and_purpose():
    food = analyze_product_context("turmeric powder for cooking")
    cosmetic = analyze_product_context("turmeric face cream")
    beverage = analyze_product_context("turmeric milk")
    assert food.product_category == "FOOD"
    assert cosmetic.product_category == "COSMETIC"
    assert beverage.product_category == "FOOD"
    assert food.product_form == "powder"
    assert cosmetic.product_form == "cream"
    assert beverage.product_form == "milk"


def test_ginger_contexts():
    tea = analyze_product_context("ginger tea")
    extract = analyze_product_context("ginger extract", product_type="extract", purpose="research")
    assert tea.product_category == "FOOD"
    assert extract.product_category == "RESEARCH / INDUSTRIAL"


def test_neem_hair_oil_is_cosmetic_context():
    ctx = analyze_product_context("neem oil for hair")
    assert ctx.product_category == "COSMETIC"
    assert ctx.product_form == "oil"


def test_aloe_contexts():
    gel = analyze_product_context("aloe vera gel", purpose="skin", product_type="gel")
    juice = analyze_product_context("aloe vera juice", purpose="beverage")
    assert gel.product_category == "COSMETIC"
    assert juice.product_category == "FOOD"


def test_ashwagandha_capsule():
    ctx = analyze_product_context("ashwagandha capsule", product_type="capsule", purpose="supplement")
    assert ctx.product_category == "HEALTH / SUPPLEMENT"
    assert ctx.product_form == "capsule"


def test_tulsi_tea():
    ctx = analyze_product_context("tulsi tea")
    assert ctx.product_category == "FOOD"
    assert ctx.product_form == "tea"


def test_oils_can_have_different_contexts():
    coconut_food = analyze_product_context("coconut oil for cooking")
    coconut_hair = analyze_product_context("coconut oil for hair")
    sesame_food = analyze_product_context("sesame oil for cooking")
    assert coconut_food.product_category == "FOOD"
    assert coconut_hair.product_category == "COSMETIC"
    assert sesame_food.product_category == "FOOD"


def test_powders_are_not_automatically_supplements():
    black_pepper = analyze_product_context("black pepper powder")
    cinnamon = analyze_product_context("cinnamon powder")
    garlic = analyze_product_context("garlic powder")
    assert black_pepper.requires_clarification
    assert cinnamon.requires_clarification
    assert garlic.requires_clarification


def test_moringa_powder_supplement_context():
    ctx = analyze_product_context(
        "moringa powder",
        product_type="supplement",
        purpose="supplement",
    )
    assert ctx.product_category == "HEALTH / SUPPLEMENT"


def test_queries_are_contextual_not_ingredient_only():
    ctx = analyze_product_context(
        "chilli powder for cooking",
        jurisdiction="India",
        traditional_knowledge=False,
    )
    queries = build_contextual_queries(ctx)
    assert queries
    assert all(q.strip().lower() != "chilli" for q in queries)
    assert any("india" in q for q in queries)
    assert any("cooking" in q for q in queries)


def test_ontology_has_100_plus_ingredients():
    import json
    from product_context_engine import DEFAULT_ONTOLOGY_PATH
    data = json.loads(DEFAULT_ONTOLOGY_PATH.read_text(encoding="utf-8"))
    assert len(data) >= 100


def test_examples_are_context_only_not_evidence():
    import json
    from product_context_engine import DEFAULT_EXAMPLES_PATH
    examples = json.loads(DEFAULT_EXAMPLES_PATH.read_text(encoding="utf-8"))
    assert len(examples) >= 100
    assert all(item["is_evidence"] is False for item in examples)
    assert all(item["source_type"] == "context_example_only" for item in examples)


def test_clarification_message():
    ctx = analyze_product_context("chilli powder")
    message = clarification_question(ctx)
    assert "intended use" in message.lower()
    assert "food/spice" in message.lower()


if __name__ == "__main__":
    import pytest
    raise SystemExit(pytest.main([__file__, "-q"]))
