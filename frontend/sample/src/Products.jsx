import { useEffect, useRef, useState } from 'react'
import './Products.css'

// same proxy as App.jsx: /api/... goes to the FastAPI backend
const API_URL = '/api'

// what the form looks like when nothing is filled in
const emptyForm = {
  name: '',
  description: '',
  price: '',
  stock: '0',
  is_active: true,
}

// a product from the API -> values for the form inputs
// (inputs always hold strings, so numbers are turned into text)
function productToForm(product) {
  return {
    name: product.name,
    description: product.description ?? '',
    price: product.price,
    stock: String(product.stock),
    is_active: product.is_active,
  }
}

// form values -> JSON body for the API (matches ProductCreate)
function formToBody(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null, // empty box -> null
    price: form.price, // sent as text like "49.99"; Pydantic turns it into a Decimal
    stock: Number(form.stock),
    is_active: form.is_active,
  }
}

// keep only the fields that are different from the saved product.
// this is what makes PATCH send just the changes.
function changedFields(body, product) {
  return Object.fromEntries(
    Object.entries(body).filter(([field, value]) => value !== product[field]),
  )
}

// turn a FastAPI error response into one readable sentence
async function readError(response) {
  const data = await response.json().catch(() => null)
  // 422 validation errors come as a list: [{ loc: [..., "price"], msg: "..." }]
  if (Array.isArray(data?.detail)) {
    return data.detail.map((d) => `${d.loc.at(-1)}: ${d.msg}`).join('. ')
  }
  // other errors (like 404) come as { detail: "Product not found" }
  return data?.detail || `Request failed (HTTP ${response.status})`
}

// short names for the status codes this page can get back
const statusText = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  404: 'Not Found',
  422: 'Validation Error',
  500: 'Server Error',
}

// a small colored tag that shows the HTTP method, like in /docs
function Method({ name }) {
  return <span className={`method method-${name.toLowerCase()}`}>{name}</span>
}

// stock number -> a short label and a CSS class for its color
function stockLevel(stock) {
  if (stock === 0) return { label: 'Sold out', className: 'is-out' }
  if (stock <= 5) return { label: 'Running low', className: 'is-low' }
  return { label: 'In stock', className: '' }
}

function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null) // the product being edited, or null when adding
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('') // short message after an action

  const [log, setLog] = useState([]) // every request this page has sent
  const nextLogId = useRef(1) // a unique key for each log entry

  const nameInput = useRef(null) // lets us move the cursor to the Name box

  // GET (all): load every product once, when the page first appears
  useEffect(() => {
    fetch(`${API_URL}/products`)
      .then(async (response) => {
        setLog([{ id: 0, method: 'GET', path: '/products', status: response.status }])
        if (!response.ok) throw new Error(await readError(response))
        return response.json()
      })
      .then((data) => setProducts(data))
      .catch((error) => setLoadError(error.message))
      .finally(() => setLoading(false))
  }, [])

  // one handler for every input: uses the input's name to know which field
  function handleChange(event) {
    const { name, value, type, checked } = event.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  // send one request to the API and add it to the request log.
  // throws an Error with a readable message if the API says no.
  async function send(method, path, body) {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      // only requests with a body (POST, PATCH) need these two
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const entry = { id: nextLogId.current++, method, path, status: response.status }
    setLog((old) => [entry, ...old].slice(0, 8)) // newest first, keep 8
    if (!response.ok) throw new Error(await readError(response))
    return response
  }

  // GET (one): load the latest values of this product, then fill the form
  async function startEdit(product) {
    setFormError('')
    setNotice('')
    try {
      const response = await send('GET', `/products/${product.id}`)
      const fresh = await response.json()
      setProducts(products.map((p) => (p.id === fresh.id ? fresh : p)))
      setEditing(fresh)
      setForm(productToForm(fresh))
      nameInput.current.focus()
    } catch (error) {
      setNotice(`Couldn't open ${product.name}: ${error.message}`)
    }
  }

  function resetForm() {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
  }

  // what the form would send right now
  const body = formToBody(form)
  const patchBody = editing ? changedFields(body, editing) : null
  const nothingChanged = editing && Object.keys(patchBody).length === 0

  // POST (create) or PATCH (update), depending on the mode
  async function handleSubmit(event) {
    event.preventDefault() // stop the browser from reloading the page
    setSaving(true)
    setFormError('')

    try {
      const response = editing
        ? await send('PATCH', `/products/${editing.id}`, patchBody)
        : await send('POST', '/products', body)

      const saved = await response.json() // the API sends back the saved product
      if (editing) {
        // swap the old version of this product for the new one
        setProducts(products.map((p) => (p.id === saved.id ? saved : p)))
        setNotice(`Saved changes to ${saved.name}`)
      } else {
        setProducts([...products, saved])
        setNotice(`Added ${saved.name}`)
      }
      resetForm()
    } catch (error) {
      setFormError(error.message)
    } finally {
      setSaving(false)
    }
  }

  // DELETE
  async function handleDelete(product) {
    if (!window.confirm(`Delete "${product.name}"? This can't be undone.`)) {
      return
    }
    try {
      await send('DELETE', `/products/${product.id}`)
      setProducts(products.filter((p) => p.id !== product.id))
      if (editing?.id === product.id) resetForm()
      setNotice(`Deleted ${product.name}`)
    } catch (error) {
      setNotice(`Couldn't delete ${product.name}: ${error.message}`)
    }
  }

  return (
    <section className="products" aria-labelledby="products-title">
      <header className="products-header">
        <h2 id="products-title" className="products-title">
          Products
        </h2>
        <p className="products-count">
          {products.length} {products.length === 1 ? 'product' : 'products'}
        </p>
      </header>

      {/* aria-live makes screen readers announce the message when it changes */}
      <p className="products-notice" aria-live="polite">
        {notice}
      </p>

      <div className="products-layout">
        {/* ---------- the list ---------- */}
        <div className="shelf">
          <p className="shelf-caption">
            <Method name="GET" /> /products runs when the page opens
          </p>

          {loading && <p className="shelf-empty">Loading products…</p>}

          {loadError && (
            <p className="shelf-empty">
              Couldn't load products: {loadError}. Check that the backend is
              running on port 8000.
            </p>
          )}

          {!loading && !loadError && products.length === 0 && (
            <p className="shelf-empty">
              No products yet. Add your first one with the form.
            </p>
          )}

          <ul className="shelf-list">
            {products.map((product) => {
              const level = stockLevel(product.stock)
              return (
                <li
                  key={product.id}
                  className={[
                    'item',
                    editing?.id === product.id && 'is-editing',
                    !product.is_active && 'is-inactive',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className="item-info">
                    <p className="item-name">
                      {product.name}
                      {!product.is_active && (
                        <span className="item-tag">Inactive</span>
                      )}
                    </p>
                    {product.description && (
                      <p className="item-desc">{product.description}</p>
                    )}
                    <p className="item-price">{product.price}</p>
                  </div>

                  <div className={`item-stock ${level.className}`}>
                    <span className="item-stock-number">{product.stock}</span>
                    <span className="item-stock-label">{level.label}</span>
                  </div>

                  <div className="item-actions">
                    <button
                      type="button"
                      className="btn btn-quiet"
                      onClick={() => startEdit(product)}
                    >
                      Edit <Method name="GET" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-quiet btn-danger"
                      onClick={() => handleDelete(product)}
                    >
                      Delete <Method name="DELETE" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        {/* ---------- the form (add or edit) ---------- */}
        <form className="editor" onSubmit={handleSubmit}>
          <h3 className="editor-title">
            {editing ? `Edit ${editing.name}` : 'Add a product'}
          </h3>

          <label className="field">
            <span>Name</span>
            <input
              ref={nameInput}
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              maxLength={200}
            />
          </label>

          <label className="field">
            <span>Description (optional)</span>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={2}
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Price</span>
              <input
                name="price"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={form.price}
                onChange={handleChange}
                required
              />
            </label>

            <label className="field">
              <span>Stock</span>
              <input
                name="stock"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={form.stock}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <label className="check">
            <input
              name="is_active"
              type="checkbox"
              checked={form.is_active}
              onChange={handleChange}
            />
            <span>Active (shown to customers)</span>
          </label>

          {/* shows the exact request, so you can see PATCH sends only changes */}
          <div className="request">
            <p className="request-line">
              <Method name={editing ? 'PATCH' : 'POST'} />{' '}
              {editing ? `/products/${editing.id}` : '/products'}
            </p>
            <pre className="request-body">
              {JSON.stringify(editing ? patchBody : body, null, 2)}
            </pre>
          </div>

          {formError && (
            <p className="editor-error" role="alert">
              {formError}
            </p>
          )}

          <div className="editor-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || nothingChanged}
            >
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add product'}{' '}
              <Method name={editing ? 'PATCH' : 'POST'} />
            </button>
            {editing && (
              <button type="button" className="btn btn-quiet" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
          {nothingChanged && (
            <p className="editor-hint">Change a field to enable saving.</p>
          )}
        </form>
      </div>

      {/* ---------- the request log ---------- */}
      <div className="log">
        <h3 className="log-title">Requests sent</h3>
        {log.length === 0 ? (
          <p className="log-empty">Requests will show up here as you use the page.</p>
        ) : (
          <ol className="log-list">
            {log.map((entry) => (
              <li key={entry.id} className="log-item">
                <Method name={entry.method} />
                <span className="log-path">{entry.path}</span>
                <span className={entry.status >= 400 ? 'log-status is-error' : 'log-status'}>
                  {entry.status} {statusText[entry.status]}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}

export default Products
