import { installInterceptors } from "./interceptor.js";
import { mountInspector } from "./inspector.js";
import { getProducts, setMode, viewProduct, addToCart, getCart, checkout } from "./shop.js";

installInterceptors();
mountInspector(document.getElementById("inspector"));

const productList = document.getElementById("productList");
const cartCount = document.getElementById("cartCount");
const checkoutBtn = document.getElementById("checkoutBtn");
const modeRadios = document.querySelectorAll('input[name="mode"]');

for (const product of getProducts()) {
  const card = document.createElement("div");
  card.className = "product-card";
  card.innerHTML = `
    <div class="product-name">${product.name}</div>
    <div class="product-meta">${product.category} &middot; $${product.price.toFixed(2)}</div>
    <div class="product-actions">
      <button type="button" data-action="view">View</button>
      <button type="button" data-action="add">Add to cart</button>
    </div>
  `;

  card.querySelector('[data-action="view"]').addEventListener("click", () => viewProduct(product));
  card.querySelector('[data-action="add"]').addEventListener("click", () => {
    addToCart(product);
    updateCartCount();
  });

  productList.appendChild(card);
}

checkoutBtn.addEventListener("click", () => {
  if (getCart().length === 0) return;
  checkout();
  updateCartCount();
});

for (const radio of modeRadios) {
  radio.addEventListener("change", (event) => {
    if (event.target.checked) setMode(event.target.value);
  });
}

function updateCartCount() {
  cartCount.textContent = String(getCart().length);
}

updateCartCount();
