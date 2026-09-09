"""Minimal trust signal — idea.txt's optional "trust signal" recommendation.

No ML: a farmer/buyer's reliability is just their historical completed-vs-
cancelled transaction ratio. Cheap to compute from data we already have.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Transaction, TransactionStatus

COMPLETED_STATUSES = (TransactionStatus.delivered, TransactionStatus.completed)


def _reliability_from_transactions(transactions: list[Transaction]) -> dict:
    total = len(transactions)
    completed = sum(1 for t in transactions if t.status in COMPLETED_STATUSES)
    cancelled = sum(1 for t in transactions if t.status == TransactionStatus.cancelled)

    if total == 0:
        return {"completed_count": 0, "total_count": 0, "reliability_pct": None}

    # Cancelled orders count against reliability; still-in-progress ones are
    # neutral (not yet proven either way).
    scored = completed + cancelled
    reliability_pct = round((completed / scored) * 100, 1) if scored > 0 else None

    return {"completed_count": completed, "total_count": total, "reliability_pct": reliability_pct}


def get_farmer_reliability(db: Session, farmer_id) -> dict:
    transactions = db.execute(select(Transaction).where(Transaction.farmer_id == farmer_id)).scalars().all()
    return _reliability_from_transactions(transactions)


def get_buyer_reliability(db: Session, buyer_id) -> dict:
    transactions = db.execute(select(Transaction).where(Transaction.buyer_id == buyer_id)).scalars().all()
    return _reliability_from_transactions(transactions)
