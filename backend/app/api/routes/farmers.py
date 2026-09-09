from fastapi import APIRouter, Depends

from app.api.deps import get_current_farmer
from app.models import FarmerProfile

router = APIRouter(prefix="/farmers", tags=["farmers"])


@router.get("/me")
def get_me(farmer: FarmerProfile = Depends(get_current_farmer)):
    return {
        "id": str(farmer.id),
        "user_id": str(farmer.user_id),
        "fpo_id": str(farmer.fpo_id) if farmer.fpo_id else None,
        "village": farmer.village,
        "district": farmer.district,
        "state": farmer.state,
    }
