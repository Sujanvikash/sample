from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


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


# --- Products ---

# what the client must send to create a product.
# id and created_at are not here: the database fills those in.
class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    # matches Numeric(10, 2) in the model: up to 10 digits, 2 after the dot
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    stock: int = Field(default=0, ge=0)
    is_active: bool = True


# what the client may send to change a product (PATCH).
# every field is optional so they can send only what they want to change.
class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    price: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    stock: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


# what the API sends back for a product
class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    price: Decimal
    stock: int
    is_active: bool
    created_at: datetime
