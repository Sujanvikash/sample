from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Product
from app.schemas import ProductCreate, ProductOut, ProductUpdate

# a mini-app just for products.
# prefix: every path below starts with /products
# tags: groups these endpoints under "products" on the /docs page
router = APIRouter(prefix="/products", tags=["products"])


# shared helper: load one product or stop with a 404 error
def get_product_or_404(product_id: int, db: Session) -> Product:
    product = db.get(Product, product_id)  # look up by primary key
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


# CREATE - 201 means "created"
# path "" + prefix "/products" = POST /products
@router.post("", response_model=ProductOut, status_code=201)
def create_product(data: ProductCreate, db: Session = Depends(get_db)):
    product = Product(**data.model_dump())  # schema -> model object
    db.add(product)       # stage the new row
    db.commit()           # save it to the database
    db.refresh(product)   # reload so id and created_at are filled in
    return product


# READ (all) - GET /products
@router.get("", response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db)):
    return db.scalars(select(Product).order_by(Product.id)).all()


# READ (one) - GET /products/{product_id}
@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    return get_product_or_404(product_id, db)


# UPDATE - PATCH changes only the fields the client sent
@router.patch("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int, data: ProductUpdate, db: Session = Depends(get_db)
):
    product = get_product_or_404(product_id, db)
    # exclude_unset=True drops fields the client didn't send,
    # so we don't overwrite them with None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)  # same as product.<field> = value
    db.commit()
    db.refresh(product)
    return product


# DELETE - 204 means "done, nothing to send back"
@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = get_product_or_404(product_id, db)
    db.delete(product)
    db.commit()
