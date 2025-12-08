// ===============================
// OPEN DATABASE
// ===============================
let db;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("StoreDB");

        request.onupgradeneeded = (event) => {
            const upgradeDB = event.target.result;
            if (!upgradeDB.objectStoreNames.contains("currentUser")) {
                upgradeDB.createObjectStore("currentUser", { keyPath: "id" });
            }
            if (!upgradeDB.objectStoreNames.contains("users")) {
                upgradeDB.createObjectStore("users", { keyPath: "userId", autoIncrement: true });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log("Database opened successfully");
            resolve(db);
        };

        request.onerror = () => {
            console.error("Database failed to open");
            reject("Database error");
        };
    });
}

// ===============================
// GET CURRENT USER'S ORDERS
// ===============================
function getUserOrders() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(["currentUser", "users"], "readonly");
        const cuStore = tx.objectStore("currentUser");
        const uStore = tx.objectStore("users");

        // Get current user ID
        const cuReq = cuStore.get(1);
        cuReq.onsuccess = () => {
            const cu = cuReq.result;
            if (!cu || !cu.userId) {
                reject(new Error("No user logged in"));
                return;
            }

            // Get user record with orders
            const userReq = uStore.get(cu.userId);
            userReq.onsuccess = () => {
                const user = userReq.result;
                if (!user) {
                    reject(new Error("User not found"));
                    return;
                }
                const orders = user.orders || [];
                resolve(orders);
            };
            userReq.onerror = () => reject(userReq.error);
        };
        cuReq.onerror = () => reject(cuReq.error);
    });
}

// ===============================
// RENDER ORDERS
// ===============================
function renderOrders(orders) {
    const ordersList = document.getElementById("ordersList");
    const emptyState = document.getElementById("emptyState");

    if (!orders || orders.length === 0) {
        ordersList.style.display = "none";
        emptyState.style.display = "block";
        return;
    }

    emptyState.style.display = "none";
    ordersList.style.display = "block";
    ordersList.innerHTML = "";

    // Sort orders by date (newest first)
    const sortedOrders = [...orders].sort((a, b) => 
        new Date(b.purchasedAt || b.createdAt) - new Date(a.purchasedAt || a.createdAt)
    );

    sortedOrders.forEach(order => {
        const orderCard = createOrderCard(order);
        ordersList.appendChild(orderCard);
    });
}

// ===============================
// CREATE ORDER CARD
// ===============================
function createOrderCard(order) {
    const card = document.createElement("div");
    card.className = "order-card";

    const orderDate = new Date(order.purchasedAt || order.createdAt);
    const dateStr = orderDate.toLocaleDateString();
    const timeStr = orderDate.toLocaleTimeString();

    card.innerHTML = `
        <div class="order-header">
            <div class="order-info">
                <h3>Order by ${order.name}</h3>
                <p class="order-date">${dateStr} at ${timeStr}</p>
                <p class="order-payment">Payment: ${order.paymentType}</p>
            </div>
            <div class="order-total">
                <p class="total-label">Total</p>
                <p class="total-amount">$${(order.total || 0).toFixed(2)}</p>
            </div>
        </div>

        <div class="order-body">
            <h4>Items Ordered:</h4>
            <ul class="items-list">
                ${order.items.map(item => `
                    <li>
                        <span class="item-name">${item.name}</span>
                        <span class="item-qty">x${item.quantity}</span>
                        <span class="item-price">$${(item.lineTotal || item.price * item.quantity).toFixed(2)}</span>
                    </li>
                `).join('')}
            </ul>
        </div>

        <div class="order-footer">
            <div class="pricing">
                <div class="price-row">
                    <span>Subtotal:</span>
                    <span>$${(order.subtotal || 0).toFixed(2)}</span>
                </div>
                <div class="price-row">
                    <span>Tax:</span>
                    <span>$${(order.tax || 0).toFixed(2)}</span>
                </div>
            </div>
            <button class="btn-details" onclick="showOrderDetails('${order.orderId}')">View Details</button>
        </div>
    `;

    // Store order data in the card for modal access
    card.dataset.orderData = JSON.stringify(order);

    return card;
}

// ===============================
// MODAL FUNCTIONS
// ===============================
function showOrderDetails(orderId) {
    const cards = document.querySelectorAll(".order-card");
    let orderData = null;

    cards.forEach(card => {
        if (JSON.parse(card.dataset.orderData).orderId === orderId) {
            orderData = JSON.parse(card.dataset.orderData);
        }
    });

    if (!orderData) return;

    const modal = document.getElementById("orderModal");
    const modalBody = document.getElementById("modalBody");

    const orderDate = new Date(orderData.purchasedAt || orderData.createdAt);

    modalBody.innerHTML = `
        <h2>Order Details</h2>
        <div class="modal-section">
            <h3>Order Information</h3>
            <p><strong>Order Name:</strong> ${orderData.name}</p>
            <p><strong>Date:</strong> ${orderDate.toLocaleString()}</p>
            <p><strong>Payment Method:</strong> ${orderData.paymentType}</p>
            ${orderData.card ? `
                <p><strong>Card:</strong> ${orderData.card.brand} ending in ${orderData.card.last4}</p>
            ` : ''}
        </div>

        <div class="modal-section">
            <h3>Items</h3>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${orderData.items.map(item => `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.quantity}</td>
                            <td>$${item.price.toFixed(2)}</td>
                            <td>$${(item.lineTotal || item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="modal-section">
            <h3>Summary</h3>
            <div class="summary-row">
                <span>Subtotal:</span>
                <span>$${(orderData.subtotal || 0).toFixed(2)}</span>
            </div>
            <div class="summary-row">
                <span>Tax:</span>
                <span>$${(orderData.tax || 0).toFixed(2)}</span>
            </div>
            <div class="summary-row total">
                <span>Total:</span>
                <span>$${(orderData.total || 0).toFixed(2)}</span>
            </div>
        </div>
    `;

    modal.style.display = "block";
}

// ===============================
// FILTER & SEARCH
// ===============================
let allOrders = [];

function filterOrders() {
    const searchTerm = document.getElementById("searchInput").value.toLowerCase();
    const paymentFilter = document.getElementById("filterPayment").value;

    const filtered = allOrders.filter(order => {
        const matchesSearch = 
            order.name.toLowerCase().includes(searchTerm) ||
            new Date(order.purchasedAt || order.createdAt).toLocaleDateString().includes(searchTerm);
        
        const matchesPayment = !paymentFilter || order.paymentType === paymentFilter;

        return matchesSearch && matchesPayment;
    });

    renderOrders(filtered);
}

// ===============================
// INITIALIZATION
// ===============================
function loadOrderHistory() {
    openDB()
        .then(() => getUserOrders())
        .then(orders => {
            allOrders = orders;
            renderOrders(orders);
        })
        .catch(error => {
            console.error("Error loading orders:", error);
            const ordersList = document.getElementById("ordersList");
            ordersList.innerHTML = `<p class="error">Error loading orders. Please log in first.</p>`;
        });
}

// ===============================
// EVENT LISTENERS
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    loadOrderHistory();

    // Search and filter
    document.getElementById("searchInput").addEventListener("input", filterOrders);
    document.getElementById("filterPayment").addEventListener("change", filterOrders);

    // Modal close button
    document.getElementById("closeModal").addEventListener("click", () => {
        document.getElementById("orderModal").style.display = "none";
    });

    // Close modal when clicking outside
    window.addEventListener("click", (event) => {
        const modal = document.getElementById("orderModal");
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });
});
