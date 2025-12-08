// ===============================
// OPEN DATABASE + INITIAL SETUP
// ===============================
let db;
let currentReceipt = null;
let isNewOrder = false;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("StoreDB", 1);
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
// ADD RECEIPT TO USER FUNCTION
// ===============================
function addReciptToUser(receipt) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(["users", "currentUser"], "readwrite");
        const usersStore = tx.objectStore("users");
        const currentUserStore = tx.objectStore("currentUser");

        const cuReq = currentUserStore.get(1);
        cuReq.onsuccess = () => {
            const currentUser = cuReq.result;
            if (!currentUser) return reject("No current user");

            const usersReq = usersStore.getAll();
            usersReq.onsuccess = () => {
                const allUsers = usersReq.result;
                const desiredUser = allUsers.find(u => u.username === currentUser.username);

                if (!desiredUser) return reject("User not found");

                // Initialize orders array if needed
                if (!desiredUser.orders) desiredUser.orders = [];

                // Add the new order
                desiredUser.orders.push(receipt);

                // Save updated user
                const putReq = usersStore.put(desiredUser);
                putReq.onsuccess = () => {
                    console.log("Order saved to user:", desiredUser.username);
                    resolve(desiredUser);
                };
                putReq.onerror = () => reject(putReq.error);
            };
            usersReq.onerror = () => reject(usersReq.error);
        };
        cuReq.onerror = () => reject(cuReq.error);
    });
}

// ===============================
// GET CURRENT USER FUNCTION
// ===============================
function getCurrentUser() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(["currentUser"], "readonly");
        const store = tx.objectStore("currentUser");
        const req = store.get(1);
        
        req.onsuccess = () => {
            const currentUser = req.result;
            if (!currentUser) {
                const guestUser = { id: 1, username: "guest", cart: [] };
                const txWrite = db.transaction(["currentUser"], "readwrite");
                const storeWrite = txWrite.objectStore("currentUser");
                storeWrite.put(guestUser);
                resolve(guestUser);
            } else {
                resolve(currentUser);
            }
        };
        req.onerror = () => reject(req.error);
    });
}

// ===============================
// GET USER ACCOUNT
// ===============================
function getUserAccount(username) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(["users"], "readonly");
        const store = tx.objectStore("users");
        const req = store.getAll();
        
        req.onsuccess = () => {
            const allUsers = req.result;
            const user = allUsers.find(u => u.username === username);
            resolve(user || null);
        };
        req.onerror = () => reject(req.error);
    });
}

// ===============================
// LOAD AND DISPLAY RECEIPT
// ===============================
async function loadReceipt() {
    try {
        await openDB();
        const currentUser = await getCurrentUser();
        const userAccount = await getUserAccount(currentUser.username);
        
        const localStorageReceipt = localStorage.getItem("checkoutReceipt");
        
        if (localStorageReceipt) {
            // New order from purchase flow
            currentReceipt = JSON.parse(localStorageReceipt);
            
            // Check if this is truly a new order (not yet purchased)
            if (!currentReceipt.purchased) {
                isNewOrder = true;
                console.log("Loading NEW order from localStorage");
            } else {
                isNewOrder = false;
                console.log("Loading completed order from localStorage");
            }
            
            console.log("Receipt data:", currentReceipt);
        } else if (userAccount && userAccount.orders && userAccount.orders.length > 0) {
            // Existing order from history
            currentReceipt = userAccount.orders[userAccount.orders.length - 1];
            isNewOrder = false;
            console.log("Loading existing order from user history");
        } else {
            displayNoReceipt("No purchase found. Please make an order first.");
            return;
        }
        
        displayReceiptInfo();
        setupEventListeners();
        
    } catch (error) {
        console.error("Error loading receipt:", error);
        displayNoReceipt("Error loading receipt. Please try again.");
    }
}

// ===============================
// DISPLAY RECEIPT INFORMATION
// ===============================
function displayReceiptInfo() {
    if (!currentReceipt) return;
    
    // Set date - use current date for new orders
    const date = isNewOrder ? new Date() : new Date(currentReceipt.date || currentReceipt.purchasedAt || new Date());
    document.getElementById("orderDate").innerText = date.toLocaleString();
    
    // Items list
    const container = document.getElementById("itemsList");
    container.innerHTML = "";
    
    currentReceipt.items.forEach(item => {
        const row = document.createElement("div");
        row.classList.add("item-row");
        row.innerHTML = `
            <div>
                <strong>${item.name}</strong>
                <div style="font-size: 13px; color: #666;">x${item.quantity} @ $${item.price.toFixed(2)}</div>
            </div>
            <div>$${item.lineTotal.toFixed(2)}</div>
        `;
        container.appendChild(row);
    });
    
    // Totals
    document.getElementById("r-subtotal").innerText = `$${currentReceipt.subtotal.toFixed(2)}`;
    document.getElementById("r-tax").innerText = `$${currentReceipt.tax.toFixed(2)}`;
    document.getElementById("r-total").innerText = `$${currentReceipt.total.toFixed(2)}`;
    
    // Render customer details section
    if (isNewOrder) {
        renderEditableForm();
    } else {
        renderSavedDetails();
    }
}

// ===============================
// RENDER EDITABLE FORM (FOR NEW ORDERS)
// ===============================
function renderEditableForm() {
    const detailsContainer = document.getElementById("customerDetails");
    
    detailsContainer.innerHTML = `
        <div class="customer-details">
            <h2>Complete Your Order</h2>
            <p style="color: #666; margin-bottom: 20px;">Please provide your details to complete the purchase.</p>
            
            <div class="form-row">
                <label for="orderName">Name for Order *</label>
                <input type="text" id="orderName" placeholder="e.g., John D." value="${currentReceipt.name || ''}">
                <div class="error-message" id="nameError" style="display: none;">Please enter a name for the order</div>
            </div>
            
            <div class="form-row">
                <label for="paymentType">Payment Method *</label>
                <select id="paymentType">
                    <option value="">Select Payment Method...</option>
                    <option value="Credit Card" ${currentReceipt.paymentType === 'Credit Card' ? 'selected' : ''}>Credit Card</option>
                    <option value="Debit Card" ${currentReceipt.paymentType === 'Debit Card' ? 'selected' : ''}>Debit Card</option>
                    <option value="Cash" ${currentReceipt.paymentType === 'Cash' ? 'selected' : ''}>Cash</option>
                    <option value="Gift Card" ${currentReceipt.paymentType === 'Gift Card' ? 'selected' : ''}>Gift Card</option>
                    <option value="Apple Pay" ${currentReceipt.paymentType === 'Apple Pay' ? 'selected' : ''}>Apple Pay</option>
                    <option value="Google Pay" ${currentReceipt.paymentType === 'Google Pay' ? 'selected' : ''}>Google Pay</option>
                </select>
                <div class="error-message" id="paymentError" style="display: none;">Please select a payment method</div>
            </div>
            
            <div id="cardDetails" style="display: none;">
                <h3>Card Details</h3>
                <div class="form-row">
                    <label for="cardName">Name on Card *</label>
                    <input type="text" id="cardName" placeholder="Exact name on card">
                    <div class="error-message" id="cardNameError" style="display: none;">Please enter the name on the card</div>
                </div>
                
                <div class="form-row">
                    <label for="cardNumber">Card Number *</label>
                    <input type="text" id="cardNumber" maxlength="19" placeholder="1234 5678 9012 3456">
                    <div class="error-message" id="cardNumberError" style="display: none;">Please enter a valid card number</div>
                </div>
                
                <div class="form-row" style="display: flex; gap: 15px;">
                    <div style="flex: 1;">
                        <label for="cardExp">Expiry (MM/YY) *</label>
                        <input type="text" id="cardExp" maxlength="5" placeholder="MM/YY">
                        <div class="error-message" id="cardExpError" style="display: none;">Please enter expiry in MM/YY format</div>
                    </div>
                    <div style="flex: 1;">
                        <label for="cardCvv">CVV *</label>
                        <input type="password" id="cardCvv" maxlength="4" placeholder="123">
                        <div class="error-message" id="cardCvvError" style="display: none;">Please enter a valid CVV</div>
                    </div>
                </div>
            </div>
            
            <div class="success-message" id="successMessage" style="display: none;">
                ✓ Order completed successfully! You can now print your receipt.
            </div>
        </div>
    `;
    
    // Setup form validation AFTER the form is rendered
    setTimeout(() => {
        setupFormValidation();
    }, 100);
}

// ===============================
// RENDER SAVED DETAILS (FOR COMPLETED ORDERS)
// ===============================
function renderSavedDetails() {
    const detailsContainer = document.getElementById("customerDetails");
    
    detailsContainer.innerHTML = `
        <div class="customer-details">
            <h2>Customer & Payment Details</h2>
            <div class="form-row">
                <label>Name for Order</label>
                <div style="padding: 10px; background: white; border-radius: 5px; border: 1px solid #eee;">
                    ${currentReceipt.name || "Not provided"}
                </div>
            </div>
            <div class="form-row">
                <label>Payment Method</label>
                <div style="padding: 10px; background: white; border-radius: 5px; border: 1px solid #eee;">
                    ${currentReceipt.paymentType || "Not provided"}
                </div>
            </div>
            ${currentReceipt.card ? `
                <div style="margin-top: 15px; padding: 15px; background: #f0f5ff; border-radius: 5px;">
                    <h3 style="margin-top: 0; font-size: 16px;">Card Details</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <label style="font-size: 12px; color: #666;">Card Brand</label>
                            <div>${currentReceipt.card.brand || "Unknown"}</div>
                        </div>
                        <div>
                            <label style="font-size: 12px; color: #666;">Last 4 Digits</label>
                            <div>**** **** **** ${currentReceipt.card.last4 || "****"}</div>
                        </div>
                        <div>
                            <label style="font-size: 12px; color: #666;">Expiry</label>
                            <div>${currentReceipt.card.exp || "MM/YY"}</div>
                        </div>
                        <div>
                            <label style="font-size: 12px; color: #666;">Cardholder</label>
                            <div>${currentReceipt.card.nameOnCard || "Not provided"}</div>
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

// ===============================
// SETUP EVENT LISTENERS
// ===============================
function setupEventListeners() {
    const purchaseBtn = document.getElementById("purchaseBtn");
    const printBtn = document.getElementById("printBtn");
    const backBtn = document.getElementById("backBtn");
    
    if (isNewOrder) {
        // New order - show purchase button
        purchaseBtn.style.display = "block";
        purchaseBtn.disabled = true; // Initially disabled until form is valid
        printBtn.disabled = true; // Can't print until purchased
    } else {
        // Completed order
        purchaseBtn.style.display = "none";
        printBtn.disabled = false;
    }
    
    // Purchase button click handler
    if (purchaseBtn) {
        purchaseBtn.addEventListener("click", handlePurchase);
    }
    
    // Print button click handler
    if (printBtn) {
        printBtn.addEventListener("click", () => {
            if (isNewOrder) {
                alert("Please complete the purchase first.");
                return;
            }
            window.print();
        });
    }
    
    // Back button click handler
    if (backBtn) {
        backBtn.addEventListener("click", () => {
            window.location.href = "index.html";
        });
    }
}

// ===============================
// SETUP FORM VALIDATION
// ===============================
function setupFormValidation() {
    const paymentSelect = document.getElementById("paymentType");
    const cardDetails = document.getElementById("cardDetails");
    
    if (!paymentSelect || !cardDetails) {
        console.error("Form elements not found");
        return;
    }
    
    console.log("Setting up form validation");
    
    // Toggle card details based on payment type
    paymentSelect.addEventListener("change", function() {
        const needsCard = this.value === "Credit Card" || this.value === "Debit Card";
        cardDetails.style.display = needsCard ? "block" : "none";
        validateForm();
    });
    
    // Add input listeners for validation
    const inputs = ['orderName', 'paymentType', 'cardName', 'cardNumber', 'cardExp', 'cardCvv'];
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', validateForm);
            element.addEventListener('change', validateForm);
            
            // Format card number
            if (id === 'cardNumber') {
                element.addEventListener('input', formatCardNumber);
            }
            
            // Format expiry date
            if (id === 'cardExp') {
                element.addEventListener('input', formatExpiryDate);
            }
        }
    });
    
    // Trigger change event to show/hide card details based on initial selection
    if (paymentSelect.value === 'Credit Card' || paymentSelect.value === 'Debit Card') {
        cardDetails.style.display = 'block';
    }
    
    // Initial validation
    validateForm();
}

// ===============================
// FORMAT CARD NUMBER
// ===============================
function formatCardNumber(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.substring(0, 16);
    const formatted = value.replace(/(\d{4})/g, '$1 ').trim();
    e.target.value = formatted;
}

// ===============================
// FORMAT EXPIRY DATE
// ===============================
function formatExpiryDate(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    e.target.value = value;
}

// ===============================
// VALIDATE FORM
// ===============================
function validateForm() {
    const purchaseBtn = document.getElementById("purchaseBtn");
    const nameInput = document.getElementById("orderName");
    const paymentSelect = document.getElementById("paymentType");
    const cardNameInput = document.getElementById("cardName");
    const cardNumberInput = document.getElementById("cardNumber");
    const cardExpInput = document.getElementById("cardExp");
    const cardCvvInput = document.getElementById("cardCvv");
    
    // Hide all error messages
    document.querySelectorAll('.error-message').forEach(el => {
        el.style.display = 'none';
    });
    
    let isValid = true;
    
    // Validate name
    if (!nameInput || !nameInput.value.trim()) {
        if (nameInput && document.getElementById('nameError')) {
            document.getElementById('nameError').style.display = 'block';
        }
        isValid = false;
    }
    
    // Validate payment type
    if (!paymentSelect || !paymentSelect.value) {
        if (paymentSelect && document.getElementById('paymentError')) {
            document.getElementById('paymentError').style.display = 'block';
        }
        isValid = false;
    }
    
    // Validate card details if needed
    if (paymentSelect && (paymentSelect.value === 'Credit Card' || paymentSelect.value === 'Debit Card')) {
        // Card name
        if (!cardNameInput || !cardNameInput.value.trim()) {
            if (cardNameInput && document.getElementById('cardNameError')) {
                document.getElementById('cardNameError').style.display = 'block';
            }
            isValid = false;
        }
        
        // Card number (remove spaces)
        const cardNumber = cardNumberInput ? cardNumberInput.value.replace(/\s/g, '') : '';
        if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
            if (cardNumberInput && document.getElementById('cardNumberError')) {
                document.getElementById('cardNumberError').style.display = 'block';
            }
            isValid = false;
        }
        
        // Expiry date (MM/YY format)
        const expPattern = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
        if (!cardExpInput || !expPattern.test(cardExpInput.value)) {
            if (cardExpInput && document.getElementById('cardExpError')) {
                document.getElementById('cardExpError').style.display = 'block';
            }
            isValid = false;
        }
        
        // CVV (3-4 digits)
        const cvvPattern = /^[0-9]{3,4}$/;
        if (!cardCvvInput || !cvvPattern.test(cardCvvInput.value)) {
            if (cardCvvInput && document.getElementById('cardCvvError')) {
                document.getElementById('cardCvvError').style.display = 'block';
            }
            isValid = false;
        }
    }
    
    // Enable/disable purchase button
    if (purchaseBtn) {
        purchaseBtn.disabled = !isValid;
        console.log("Form validation result:", isValid);
    }
    
    return isValid;
}

// ===============================
// HANDLE PURCHASE
// ===============================
async function handlePurchase() {
    if (!validateForm()) {
        alert("Please fix the errors in the form before purchasing.");
        return;
    }
    
    try {
        // Get form values
        const name = document.getElementById("orderName").value.trim();
        const paymentType = document.getElementById("paymentType").value;
        
        // Update receipt with customer details
        currentReceipt.name = name;
        currentReceipt.paymentType = paymentType;
        currentReceipt.purchased = true;
        currentReceipt.purchasedAt = new Date().toISOString();
        
        // Add card details if applicable
        if (paymentType === "Credit Card" || paymentType === "Debit Card") {
            const cardNumber = document.getElementById("cardNumber").value.replace(/\s/g, '');
            const last4 = cardNumber.slice(-4);
            currentReceipt.card = {
                brand: detectCardBrand(cardNumber),
                last4: last4,
                exp: document.getElementById("cardExp").value,
                nameOnCard: document.getElementById("cardName").value.trim()
            };
        }
        
        // Save to IndexedDB
        await addReciptToUser(currentReceipt);
        
        // Update localStorage with purchased receipt
        localStorage.setItem("checkoutReceipt", JSON.stringify(currentReceipt));
        
        // Show success message
        const successMessage = document.getElementById("successMessage");
        if (successMessage) {
            successMessage.style.display = "block";
        }
        
        // Update UI state
        isNewOrder = false;
        
        // Disable purchase button, enable print button
        document.getElementById("purchaseBtn").style.display = "none";
        document.getElementById("printBtn").disabled = false;
        
        // Show completed state
        renderSavedDetails();
        
        // Show alert
        alert("Purchase completed successfully! You can now print your receipt.");
        
    } catch (error) {
        console.error("Purchase failed:", error);
        alert("Failed to complete purchase. Please try again.");
    }
}

// ===============================
// DETECT CARD BRAND
// ===============================
function detectCardBrand(cardNumber) {
    const cleanNum = cardNumber.replace(/\D/g, '');
    
    if (/^4/.test(cleanNum)) return "Visa";
    if (/^5[1-5]/.test(cleanNum)) return "Mastercard";
    if (/^3[47]/.test(cleanNum)) return "American Express";
    if (/^6(?:011|5)/.test(cleanNum)) return "Discover";
    if (/^3(?:0[0-5]|[68])/.test(cleanNum)) return "Diners Club";
    if (/^(?:2131|1800|35)/.test(cleanNum)) return "JCB";
    
    return "Credit Card";
}

// ===============================
// DISPLAY NO RECEIPT MESSAGE
// ===============================
function displayNoReceipt(message) {
    const receiptCard = document.getElementById("receiptCard");
    if (receiptCard) {
        receiptCard.innerHTML = `
            <h1>No Receipt Found</h1>
            <p class="small">${message}<br><br>
            <a href="index.html" style="color: #4a90e2; text-decoration: none; font-weight: 500;">Return to the menu</a></p>
        `;
    }
}

// ===============================
// INITIALIZE
// ===============================
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadReceipt);
} else {
    loadReceipt();
}