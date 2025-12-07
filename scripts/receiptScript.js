function loadReceipt() {
    const raw = localStorage.getItem("checkoutReceipt");

    if (!raw) {
        document.getElementById("receiptCard").innerHTML = `
            <h1>No Receipt Found</h1>
            <p class="small">You haven't made a purchase yet.<br><br>
            <a href="index.html">Return to the menu</a></p>
        `;
        return;
    }

    const receipt = JSON.parse(raw);

    // Set date
    const date = new Date(receipt.date);
    document.getElementById("orderDate").innerText = date.toLocaleString();

    // Items list
    const container = document.getElementById("itemsList");
    container.innerHTML = "";

    receipt.items.forEach(item => {
        const row = document.createElement("div");
        row.classList.add("item-row");
        row.innerHTML = `
            <div>
                <strong>${item.name}</strong>
                <div style="font-size: 13px; color: #666;">x${item.quantity} @ ${item.price.toFixed(2)}</div>
            </div>
            <div>${item.lineTotal.toFixed(2)}</div>
        `;
        container.appendChild(row);
    });

    // Totals
    document.getElementById("r-subtotal").innerText = `${receipt.subtotal.toFixed(2)}`;
    document.getElementById("r-tax").innerText = `${receipt.tax.toFixed(2)}`;
    document.getElementById("r-total").innerText = `${receipt.total.toFixed(2)}`;

    // Inject customer + payment form (if not already added)
    const receiptCard = document.getElementById("receiptCard");
    const controls = document.getElementById("printBtn").parentElement; // .controls

    let details = document.getElementById("customerDetails");
    if (!details) {
        details = document.createElement("div");
        details.id = "customerDetails";
        details.className = "customer-details";
        details.innerHTML = `
            <h2>Customer & Payment</h2>
            <div class="form-row">
                <label for="orderName">Name for Order</label>
                <input type="text" id="orderName" placeholder="e.g., John D." />
            </div>
            <div class="form-row">
                <label for="paymentType">Payment Method</label>
                <select id="paymentType">
                    <option value="">Select...</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Gift Card">Gift Card</option>
                    <option value="Apple Pay">Apple Pay</option>
                    <option value="Google Pay">Google Pay</option>
                </select>
            </div>

            <div id="cardDetails" style="display:none;">
                <div class="form-row">
                    <label for="cardName">Name on Card</label>
                    <input type="text" id="cardName" placeholder="Exact name on card" />
                </div>
                <div class="form-row">
                    <label for="cardNumber">Card Number</label>
                    <input type="text" id="cardNumber" maxlength="19" placeholder="1234 5678 9012 3456" />
                </div>
                <div class="form-row" style="display:flex; gap:10px;">
                    <div style="flex:1; display:flex; flex-direction:column;">
                        <label for="cardExp">Expiry (MM/YY)</label>
                        <input type="text" id="cardExp" maxlength="5" placeholder="MM/YY" />
                    </div>
                    <div style="flex:1; display:flex; flex-direction:column;">
                        <label for="cardCvv">CVV</label>
                        <input type="password" id="cardCvv" maxlength="4" placeholder="123" />
                    </div>
                </div>
            </div>

            <button class="btn" id="saveDetailsBtn">Save Details</button>
            <p class="small" id="detailsSavedMsg" style="display:none; margin-top:8px;">Details saved.</p>
        `;
        receiptCard.insertBefore(details, controls);
    }

    // Prefill if data exists
    const nameInput = document.getElementById("orderName");
    const paymentSelect = document.getElementById("paymentType");
    const cardBlock = document.getElementById("cardDetails");
    const savedMsg = document.getElementById("detailsSavedMsg");

    if (receipt.name) nameInput.value = receipt.name;
    if (receipt.paymentType) paymentSelect.value = receipt.paymentType;

    // Manage purchase/print availability
    const purchaseBtn = document.getElementById("purchaseBtn");
    const printBtn = document.getElementById("printBtn");
    const backBtn = document.getElementById("backBtn");

    function hasValidDetails() {
        return (nameInput.value || "").trim().length > 0 && (paymentSelect.value || "").trim().length > 0;
    }

    function hasValidCard() {
        if (!(paymentSelect.value === "Credit Card" || paymentSelect.value === "Debit Card")) return true; // not required
        const n = (document.getElementById("cardNumber").value || "").replace(/\s+/g, "");
        const e = (document.getElementById("cardExp").value || "").trim();
        const c = (document.getElementById("cardCvv").value || "").trim();
        const nm = (document.getElementById("cardName").value || "").trim();
        // Basic checks
        if (!nm) return false;
        if (!/^\d{13,19}$/.test(n)) return false;
        if (!/^(0[1-9]|1[0-2])\/[0-9]{2}$/.test(e)) return false;
        if (!/^\d{3,4}$/.test(c)) return false;
        // Luhn check for number
        let sum = 0, dbl = false;
        for (let i = n.length - 1; i >= 0; i--) {
            let d = parseInt(n[i], 10);
            if (dbl) {
                d *= 2; if (d > 9) d -= 9;
            }
            sum += d; dbl = !dbl;
        }
        return sum % 10 === 0;
    }

    function updateCardVisibility() {
        const needsCard = paymentSelect.value === "Credit Card" || paymentSelect.value === "Debit Card";
        cardBlock.style.display = needsCard ? "block" : "none";
    }

    paymentSelect.addEventListener("change", () => {
        updateCardVisibility();
        updateButtonsState();
    });

    updateCardVisibility();

    function updateButtonsState() {
        const valid = hasValidDetails() && hasValidCard();
        // Print only after purchased
        printBtn.disabled = !receipt.purchased;
        // Purchase requires valid details
        purchaseBtn.disabled = !valid || !!receipt.purchased;
    }

    updateButtonsState();

    // Save details handler
    const saveBtn = document.getElementById("saveDetailsBtn");
    saveBtn.addEventListener("click", () => {
        const name = (nameInput.value || "").trim();
        const paymentType = (paymentSelect.value || "").trim();

        if (!name) {
            alert("Please enter a name for the order.");
            nameInput.focus();
            return;
        }
        if (!paymentType) {
            alert("Please select a payment method.");
            paymentSelect.focus();
            return;
        }
        if (!hasValidCard()) {
            alert("Please complete valid card details.");
            return;
        }

        // Masked card save if applicable
        if (paymentType === "Credit Card" || paymentType === "Debit Card") {
            const nRaw = (document.getElementById("cardNumber").value || "").replace(/\s+/g, "");
            const e = (document.getElementById("cardExp").value || "").trim();
            const nm = (document.getElementById("cardName").value || "").trim();
            const last4 = nRaw.slice(-4);
            receipt.card = {
                brand: detectCardBrand(nRaw),
                last4,
                exp: e,
                nameOnCard: nm
            };
        } else {
            delete receipt.card;
        }

        receipt.name = name;
        receipt.paymentType = paymentType;
        localStorage.setItem("checkoutReceipt", JSON.stringify(receipt));

        savedMsg.style.display = "block";
        setTimeout(() => (savedMsg.style.display = "none"), 1500);
        updateButtonsState();
    });

    // Purchase flow: finalize order and persist for past orders
    purchaseBtn.addEventListener("click", () => {
        if (!hasValidDetails()) {
            alert("Please enter a name and select a payment method before purchasing.");
            return;
        }

        // Mark as purchased
        receipt.purchased = true;
        receipt.purchasedAt = new Date().toISOString();

        // Normalize order object for future 'Past Orders' page
        const order = {
            orderId: cryptoRandomId(),
            name: receipt.name,
            paymentType: receipt.paymentType,
            createdAt: receipt.date,        // when receipt was created
            purchasedAt: receipt.purchasedAt, // when user finalized
            items: receipt.items.map(i => ({
                name: i.name,
                price: i.price,
                quantity: i.quantity,
                lineTotal: i.lineTotal
            })),
            subtotal: receipt.subtotal,
            tax: receipt.tax,
            total: receipt.total
        };

        // Save back to checkoutReceipt
        localStorage.setItem("checkoutReceipt", JSON.stringify(receipt));

        // Append to past orders list in localStorage
        const pastRaw = localStorage.getItem("pastOrders");
        const past = pastRaw ? JSON.parse(pastRaw) : [];
        past.push(order);
        localStorage.setItem("pastOrders", JSON.stringify(past));
        // Also persist to IndexedDB 'orders' store
        saveOrderToIndexedDB(order).catch(err => console.error("Failed to save order to IndexedDB:", err));

        alert("Purchase completed. You can now print your receipt.");
        updateButtonsState();
    });

    // Print guarded by purchased flag
    printBtn.addEventListener("click", () => {
        if (!receipt.purchased) {
            alert("You must purchase the order before printing the receipt.");
            return;
        }
        window.print();
    });

    backBtn.addEventListener("click", () => window.location.href = "index.html");
}

function cryptoRandomId() {
    // Generates a URL-safe random id
    const arr = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(arr);
    } else {
        for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

function detectCardBrand(num) {
    // Very basic prefixes; not exhaustive
    if (/^4/.test(num)) return "Visa";
    if (/^(34|37)/.test(num)) return "American Express";
    if (/^5[1-5]/.test(num)) return "Mastercard";
    if (/^6(011|5)/.test(num)) return "Discover";
    return "Card";
}

// IndexedDB helpers for storing past orders
function openOrdersDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("StoreDB", 2);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("orders")) {
                db.createObjectStore("orders", { keyPath: "orderId" });
            }
        };
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"));
    });
}

function saveOrderToIndexedDB(order) {
    return openOrdersDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(["orders"], "readwrite");
        const store = tx.objectStore("orders");
        const req = store.put(order);
        req.onsuccess = () => resolve(order);
        req.onerror = () => reject(req.error || new Error("Failed to save order"));
    }));
}

// Exportable helper to transfer a receipt to past orders from any script
window.transferReceiptToPastOrders = function(receiptLike) {
    // Accepts a receipt-like object and appends a normalized order to pastOrders
    if (!receiptLike || !receiptLike.items || !Array.isArray(receiptLike.items)) {
        throw new Error("Invalid receipt object passed to transferReceiptToPastOrders");
    }

    const order = {
        orderId: cryptoRandomId(),
        name: receiptLike.name || "",
        paymentType: receiptLike.paymentType || "",
        createdAt: receiptLike.date || new Date().toISOString(),
        purchasedAt: receiptLike.purchasedAt || new Date().toISOString(),
        items: receiptLike.items.map(i => ({
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            lineTotal: i.lineTotal
        })),
        subtotal: receiptLike.subtotal || 0,
        tax: receiptLike.tax || 0,
        total: receiptLike.total || 0
    };

    const pastRaw = localStorage.getItem("pastOrders");
    const past = pastRaw ? JSON.parse(pastRaw) : [];
    past.push(order);
    localStorage.setItem("pastOrders", JSON.stringify(past));
    // Also persist to IndexedDB 'orders' store
    saveOrderToIndexedDB(order).catch(err => console.error("Failed to save order to IndexedDB:", err));

    return order;
};

// Ensure the receipt renders after the DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadReceipt);
} else {
    loadReceipt();
}