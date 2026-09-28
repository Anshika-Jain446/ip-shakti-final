# Product Context Engine

Standalone additive module.

Files:
- `product_context_engine.py`
- `data/ingredient_ontology.json`
- `data/product_context_examples.json`
- `tests/test_product_context_engine.py`

## Principle

`INGREDIENT != PRODUCT != PRODUCT USE != EVIDENCE`

The example dataset is context/training data only. It is not legal, medical, safety, efficacy, or authoritative traditional-knowledge evidence.

## Run tests

```bash
python -m pytest tests/test_product_context_engine.py -q
```

## Integration

Call the engine immediately after raw user/questionnaire input has been normalized and BEFORE the existing retrieval pipeline.

```python
from product_context_engine import analyze_product_context

context = analyze_product_context(
    product_name=product_name,
    ingredients=ingredients,
    purpose=purpose,
    product_type=product_type,
    jurisdiction=jurisdiction,
    traditional_knowledge=traditional_knowledge,
)

# Preserve the existing pipeline; add context as an additional retrieval input.
results = existing_retrieval_function(
    query=user_query,
    product_context=context.to_dict(),
)
```

If the existing retrieval function does not yet accept `product_context`, do not change its scoring logic in the first integration step. Build the context and attach it to the request/session object, or pass it to a thin adapter that creates contextual query strings from `context.retrieval_queries`.
