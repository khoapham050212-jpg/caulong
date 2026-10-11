// ===== Bắt buộc đăng nhập =====
const currentUser = JSON.parse(localStorage.getItem("currentUser"));
if (!currentUser) {
  window.location.href = "./login.html";
}

// ===== Cấu hình API =====
// SỬA Ở ĐÂY: dán link resource mockapi.io của bạn
const API_URL = "https://xxxxxxxx.mockapi.io/api/v1/products";
// Dữ liệu dự phòng khi API không dùng được
const BACKUP_URL = "../data/products.json";

// ===== Hàm dùng chung =====
function formatPrice(n) {
  return Number(n).toLocaleString("vi-VN") + "₫";
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

// Ảnh sản phẩm: nếu ảnh lỗi hoặc chưa có thì hiện emoji thay thế
function productImage(p, big) {
  const size = big ? " big" : "";
  const emoji = p.emoji || "🏸";
  if (!p.image) return `<div class="product-emoji${size}">${emoji}</div>`;

  return `
    <img class="product-photo${size}" src="${p.image}" alt="${p.name}"
         onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';">
    <div class="product-emoji${size}" style="display:none">${emoji}</div>
  `;
}

// ===== Giỏ hàng (lưu bằng Local Storage) =====
const cartModal = document.getElementById("cart-modal");
const cartItemsDiv = document.getElementById("cart-items");

function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

function updateCartCount() {
  document.getElementById("cart-count").textContent =
    getCart().reduce((sum, item) => sum + item.qty, 0);
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
  renderCart();
}

function buyProduct(product) {
  const cart = getCart();
  const found = cart.find((item) => String(item.id) === String(product.id));
  if (found) found.qty += 1;
  else cart.push({ id: String(product.id), name: product.name, price: Number(product.price), qty: 1 });
  saveCart(cart);
  showToast(`Đã thêm "${product.name}" vào giỏ hàng`);
}

function renderCart() {
  const cart = getCart();

  if (cart.length === 0) {
    cartItemsDiv.innerHTML = `<p class="cart-empty">Giỏ hàng đang trống.</p>`;
    document.getElementById("cart-total").textContent = formatPrice(0);
    return;
  }

  cartItemsDiv.innerHTML = cart.map((item) => `
    <div class="cart-row">
      <div class="cart-info">
        <strong>${item.name}</strong>
        <span>${formatPrice(item.price)}</span>
      </div>
      <div class="cart-qty">
        <button type="button" data-action="minus" data-id="${item.id}">−</button>
        <span>${item.qty}</span>
        <button type="button" data-action="plus" data-id="${item.id}">+</button>
      </div>
      <button type="button" class="cart-remove" data-action="remove" data-id="${item.id}" aria-label="Xóa">🗑</button>
    </div>
  `).join("");

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  document.getElementById("cart-total").textContent = formatPrice(total);
}

// Bấm +, −, 🗑 trong giỏ hàng
cartItemsDiv.addEventListener("click", function (e) {
  const btn = e.target.closest("button");
  if (!btn) return;

  const id = btn.dataset.id;
  let cart = getCart();

  if (btn.dataset.action === "remove") {
    cart = cart.filter((item) => String(item.id) !== id);
  } else if (btn.dataset.action === "plus") {
    cart.find((item) => String(item.id) === id).qty += 1;
  } else if (btn.dataset.action === "minus") {
    const item = cart.find((i) => String(i.id) === id);
    item.qty -= 1;
    if (item.qty <= 0) cart = cart.filter((i) => String(i.id) !== id);
  }
  saveCart(cart);
});

document.getElementById("cart-clear").addEventListener("click", function () {
  if (getCart().length === 0) return;
  if (confirm("Xóa tất cả sản phẩm trong giỏ?")) saveCart([]);
});

document.getElementById("cart-btn").addEventListener("click", function () {
  renderCart();
  cartModal.showModal();
});

document.getElementById("cart-close").addEventListener("click", () => cartModal.close());

// ===== Lấy dữ liệu sản phẩm từ API =====
const listDiv = document.getElementById("product-list");
const statusEl = document.getElementById("product-status");
const searchInput = document.getElementById("product-search");
const filterSelect = document.getElementById("product-filter");

let products = [];
let sourceNote = "";

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("HTTP " + response.status);
  return response.json();
}

async function loadProducts() {
  statusEl.textContent = "Đang tải sản phẩm...";
  try {
    products = await fetchJson(API_URL);
    if (!Array.isArray(products) || products.length === 0) {
      throw new Error("API không có dữ liệu");
    }
    sourceNote = "(từ API)";
  } catch (error) {
    console.warn("API lỗi, dùng dữ liệu dự phòng:", error);
    try {
      products = await fetchJson(BACKUP_URL);
      sourceNote = "(dữ liệu dự phòng)";
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Không tải được sản phẩm. Hãy chạy bằng Live Server hoặc GitHub Pages.";
      statusEl.className = "player-status api-error";
      return;
    }
  }
  applyFilter();
}

function applyFilter() {
  const keyword = searchInput.value.trim().toLowerCase();
  const category = filterSelect.value;
  const result = products.filter((p) =>
    p.name.toLowerCase().includes(keyword) &&
    (category === "all" || p.category === category)
  );
  renderProducts(result);
}

function renderProducts(list) {
  listDiv.innerHTML = "";
  if (list.length === 0) {
    statusEl.textContent = "Không tìm thấy sản phẩm phù hợp.";
    return;
  }
  statusEl.textContent = `Hiển thị ${list.length} sản phẩm ${sourceNote}`;

  list.forEach((p) => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-img">
        <span class="price-tag">${formatPrice(p.price)}</span>
        ${productImage(p, false)}
      </div>
      <h3>${p.name}</h3>
      <p class="product-cat">${p.brand} · ${p.category}</p>
      <div class="product-actions">
        <button class="btn btn-detail" type="button" data-id="${p.id}">Xem chi tiết</button>
        <button class="btn btn-buy" type="button" data-id="${p.id}">Mua</button>
      </div>
    `;
    listDiv.appendChild(card);
  });
}

function findProduct(id) {
  return products.find((p) => String(p.id) === String(id));
}

// Bấm "Xem chi tiết" hoặc "Mua" trong danh sách
listDiv.addEventListener("click", function (e) {
  const detailBtn = e.target.closest(".btn-detail");
  const buyBtn = e.target.closest(".btn-buy");
  if (detailBtn) showDetail(detailBtn.dataset.id);
  if (buyBtn) buyProduct(findProduct(buyBtn.dataset.id));
});

// ===== Chi tiết sản phẩm (hộp thoại) =====
const productModal = document.getElementById("product-modal");

function showDetail(id) {
  const p = findProduct(id);
  document.getElementById("modal-body").innerHTML = `
    <div class="detail-box">
      <div class="product-img">
        <span class="price-tag">${formatPrice(p.price)}</span>
        ${productImage(p, true)}
      </div>
      <div>
        <h3>${p.name}</h3>
        <p><strong>Thương hiệu:</strong> ${p.brand}</p>
        <p><strong>Loại:</strong> ${p.category}</p>
        <p>${p.description}</p>
        <button class="btn btn-buy" type="button" id="modal-buy">Mua ngay – ${formatPrice(p.price)}</button>
      </div>
    </div>
  `;
  document.getElementById("modal-buy").addEventListener("click", function () {
    buyProduct(p);
    productModal.close();
  });
  productModal.showModal();
}

document.getElementById("modal-close").addEventListener("click", () => productModal.close());

searchInput.addEventListener("input", applyFilter);
filterSelect.addEventListener("change", applyFilter);

// ===== Khởi động =====
updateCartCount();
loadProducts();