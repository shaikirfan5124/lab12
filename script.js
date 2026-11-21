// Embedded XML fallback so pages work even when opened directly via file:// without a local HTTP server
const FALLBACK_XML = `<?xml version="1.0" encoding="UTF-8"?>
<store>
    <product id="P101">
        <name>Wireless Noise-Cancelling Headphones</name>
        <category>Electronics</category>
        <price>4999</price>
        <description>Over-ear Bluetooth 5.3 headphones with 40-hour battery life and active noise cancellation.</description>
        <image>https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&amp;q=80</image>
    </product>
    <product id="P102">
        <name>Minimalist Smart Watch</name>
        <category>Wearables</category>
        <price>3499</price>
        <description>AMOLED display fitness tracker with heart rate monitor, SpO2 sensor, and 10-day standby.</description>
        <image>https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&amp;q=80</image>
    </product>
    <product id="P103">
        <name>Mechanical Gaming Keyboard</name>
        <category>Accessories</category>
        <price>2799</price>
        <description>Compact 75% tactile mechanical keyboard with customizable RGB backlighting and braided USB-C cable.</description>
        <image>https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&amp;q=80</image>
    </product>
    <product id="P104">
        <name>Ergonomic Laptop Stand</name>
        <category>Accessories</category>
        <price>1299</price>
        <description>Adjustable anodized aluminum stand suitable for 11-inch to 17-inch laptops.</description>
        <image>https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&amp;q=80</image>
    </product>
    <product id="P105">
        <name>Portable Bluetooth Speaker</name>
        <category>Electronics</category>
        <price>1999</price>
        <description>IPX7 waterproof 20W stereo speaker with deep bass and dual-pairing support.</description>
        <image>https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&amp;q=80</image>
    </product>
    <product id="P106">
        <name>Classic Leather Backpack</name>
        <category>Lifestyle</category>
        <price>2499</price>
        <description>Water-resistant vegan leather backpack with padded 16-inch laptop compartment.</description>
        <image>https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&amp;q=80</image>
    </product>
</store>`;

let allProducts = [];

// Load & Parse products.xml
async function loadProductsFromXML() {
    let xmlText = "";
    try {
        const response = await fetch("products.xml");
        if (!response.ok) throw new Error("Network error");
        xmlText = await response.text();
    } catch (err) {
        xmlText = FALLBACK_XML;
    }

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    const productNodes = xmlDoc.getElementsByTagName("product");

    allProducts = Array.from(productNodes).map(node => ({
        id: node.getAttribute("id"),
        name: node.getElementsByTagName("name")[0].textContent,
        category: node.getElementsByTagName("category")[0].textContent,
        price: parseFloat(node.getElementsByTagName("price")[0].textContent),
        description: node.getElementsByTagName("description")[0].textContent,
        image: node.getElementsByTagName("image")[0].textContent
    }));

    return allProducts;
}

// LocalStorage Cart Helpers
function getCart() {
    return JSON.parse(localStorage.getItem("online_shopping_cart") || "[]");
}

function saveCart(cart) {
    localStorage.setItem("online_shopping_cart", JSON.stringify(cart));
    updateCartBadge();
}

function updateCartBadge() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    const badge = document.getElementById("cart-count");
    if (badge) badge.textContent = `(${count})`;
}

function showToast(message) {
    let toast = document.getElementById("toast-msg");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast-msg";
        toast.className = "toast";
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.display = "block";
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => {
        toast.style.display = "none";
    }, 2200);
}

function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const cart = getCart();
    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    saveCart(cart);
    showToast(`Added "${product.name}" to cart`);
}

// Home Page Featured Preview
async function initHomePage() {
    const featuredGrid = document.getElementById("featured-grid");
    if (!featuredGrid) return;

    await loadProductsFromXML();
    renderProductCards(allProducts.slice(0, 3), featuredGrid);
}

// Products Catalogue Page
async function initProductsPage() {
    const grid = document.getElementById("product-grid");
    if (!grid) return;

    await loadProductsFromXML();
    renderProductCards(allProducts, grid);

    const searchInput = document.getElementById("search-input");
    const categorySelect = document.getElementById("category-filter");

    function applyFilters() {
        const query = searchInput.value.toLowerCase().trim();
        const category = categorySelect.value;

        const filtered = allProducts.filter(p => {
            const matchText = p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query);
            const matchCat = category === "All" || p.category === category;
            return matchText && matchCat;
        });

        renderProductCards(filtered, grid);
    }

    searchInput.addEventListener("input", applyFilters);
    categorySelect.addEventListener("change", applyFilters);
}

function renderProductCards(products, container) {
    if (products.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted);">No matching products found.</p>`;
        return;
    }

    container.innerHTML = products.map(p => `
        <div class="product-card">
            <img src="${p.image}" alt="${p.name}" class="product-img">
            <div class="product-body">
                <span class="badge">${p.category}</span>
                <h3 class="product-title">${p.name}</h3>
                <p class="product-desc">${p.description}</p>
                <div class="product-footer">
                    <span class="price">₹${p.price.toLocaleString("en-IN")}</span>
                    <button class="btn btn-emerald" onclick="addToCart('${p.id}')">Add to Cart</button>
                </div>
            </div>
        </div>
    `).join("");
}

// Shopping Cart & Checkout Page
function initCartPage() {
    const tbody = document.getElementById("cart-body");
    if (!tbody) return;

    const cart = getCart();
    const emptySection = document.getElementById("empty-cart");
    const filledSection = document.getElementById("filled-cart");

    if (cart.length === 0) {
        emptySection.style.display = "block";
        filledSection.style.display = "none";
        return;
    }

    emptySection.style.display = "none";
    filledSection.style.display = "block";

    let subtotal = 0;
    tbody.innerHTML = cart.map((item, idx) => {
        const rowTotal = item.price * item.qty;
        subtotal += rowTotal;
        return `
            <tr>
                <td><strong>${item.name}</strong><br><span style="font-size:12px;color:var(--text-muted);">${item.category}</span></td>
                <td>₹${item.price.toLocaleString("en-IN")}</td>
                <td>
                    <div class="qty-controls">
                        <button class="qty-btn" onclick="updateQty(${idx}, -1)">-</button>
                        <span>${item.qty}</span>
                        <button class="qty-btn" onclick="updateQty(${idx}, 1)">+</button>
                    </div>
                </td>
                <td>₹${rowTotal.toLocaleString("en-IN")}</td>
                <td><button class="btn btn-rose" style="padding: 6px 12px; font-size: 12px;" onclick="removeFromCart(${idx})">Remove</button></td>
            </tr>
        `;
    }).join("");

    const gst = Math.round(subtotal * 0.18);
    const grandTotal = subtotal + gst;

    document.getElementById("subtotal-val").textContent = `₹${subtotal.toLocaleString("en-IN")}`;
    document.getElementById("gst-val").textContent = `₹${gst.toLocaleString("en-IN")}`;
    document.getElementById("total-val").textContent = `₹${grandTotal.toLocaleString("en-IN")}`;
}

function updateQty(index, delta) {
    const cart = getCart();
    cart[index].qty += delta;
    if (cart[index].qty <= 0) {
        cart.splice(index, 1);
    }
    saveCart(cart);
    initCartPage();
}

function removeFromCart(index) {
    const cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
    initCartPage();
}

function handleOrderSubmit(e) {
    e.preventDefault();
    const name = document.getElementById("cust-name").value.trim();
    const address = document.getElementById("cust-address").value.trim();
    const payment = document.getElementById("pay-method").value;
    const total = document.getElementById("total-val").textContent;
    const orderId = "ORD-" + Math.floor(100000 + Math.random() * 900000);

    localStorage.removeItem("online_shopping_cart");
    updateCartBadge();

    document.getElementById("filled-cart").style.display = "none";
    const receipt = document.getElementById("order-receipt");
    receipt.style.display = "block";
    receipt.innerHTML = `
        <div class="alert alert-success">
            <strong>Order Confirmed!</strong> Your Order ID is <strong>${orderId}</strong>.
        </div>
        <p style="margin-bottom: 8px;"><strong>Customer Name:</strong> ${name}</p>
        <p style="margin-bottom: 8px;"><strong>Delivery Address:</strong> ${address}</p>
        <p style="margin-bottom: 8px;"><strong>Payment Method:</strong> ${payment}</p>
        <p style="margin-bottom: 20px;"><strong>Amount Paid:</strong> ${total}</p>
        <a href="products.html" class="btn btn-emerald">Continue Shopping</a>
    `;
}

document.addEventListener("DOMContentLoaded", () => {
    updateCartBadge();
    initHomePage();
    initProductsPage();
    initCartPage();
});
