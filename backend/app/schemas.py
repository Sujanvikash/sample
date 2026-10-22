from datetime import datetime

from pydantic import BaseModel, ConfigDict


# what the API sends back for a user; hashed_password is left out on purpose
# so it never reaches the browser
class UserOut(BaseModel):
    # lets Pydantic read values straight from a SQLAlchemy User object
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    is_active: bool
    created_at: datetime
