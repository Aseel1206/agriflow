"""Persists every AI service call to ai_recommendations for audit/demo purposes.

Keeps a record of what the mock services predicted and with what confidence,
so the admin/judge story ("why did it recommend this?") has a trail — and so
swapping in a real model later can be evaluated against logged mock outputs.
"""

from sqlalchemy.orm import Session

from app.models import AIRecommendation, AIRecommendationType


def log_recommendation(
    db: Session,
    type: AIRecommendationType,
    input_data: dict,
    output_data: dict,
    confidence: float,
    listing_id=None,
    requirement_id=None,
    model_version: str = "mock-v1",
) -> None:
    db.add(
        AIRecommendation(
            listing_id=listing_id,
            requirement_id=requirement_id,
            type=type,
            input_json=input_data,
            output_json=output_data,
            confidence=confidence,
            model_version=model_version,
        )
    )
