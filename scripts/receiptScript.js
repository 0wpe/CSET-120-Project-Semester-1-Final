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
// TRACK SESSION TIME (FROM WEBSITE ENTRY)
// ===============================
function initializeSessionTimer() {
    // Get or create start time when user first enters website
    let startTime = localStorage.getItem("websiteSessionStartTime");
    
    if (!startTime) {
        startTime = new Date().toISOString();
        localStorage.setItem("websiteSessionStartTime", startTime);
        console.log("New website session started:", startTime);
    } else {
        console.log("Existing website session found:", startTime);
    }
    
    return startTime;
}

// ===============================
// CALCULATE SESSION DURATION (IN MINUTES)
// ===============================
function calculateSessionDuration() {
    const startTimeStr = localStorage.getItem("websiteSessionStartTime");
    if (!startTimeStr) return 0;
    
    const startTime = new Date(startTimeStr);
    const endTime = new Date();
    
    // Calculate difference in milliseconds
    const diffMs = endTime - startTime;
    
    // Convert to minutes (rounded to 2 decimal places)
    const minutes = Math.round((diffMs / (1000 * 60)) * 100) / 100;
    
    return minutes;
}

// ===============================
// UPDATE ELAPSED TIME DISPLAY
// ===============================
function updateElapsedTimeDisplay() {
    const elapsedTimeElement = document.getElementById("elapsedTime");
    if (!elapsedTimeElement) return;
    
    if (isNewOrder) {
        // For new orders, show current session duration
        const duration = calculateSessionDuration();
        elapsedTimeElement.innerText = `${duration} minutes`;
        
        // Store duration in receipt for later use
        if (currentReceipt) {
            currentReceipt.sessionDuration = duration;
            currentReceipt.sessionStartTime = localStorage.getItem("websiteSessionStartTime");
        }
    } else {
        // For completed orders, show saved session duration
        if (currentReceipt && currentReceipt.sessionDuration) {
            elapsedTimeElement.innerText = `${currentReceipt.sessionDuration} minutes`;
        } else {
            elapsedTimeElement.innerText = "Just now";
        }
    }
}

// ===============================
// RESET SESSION TIMER
// ===============================
function resetSessionTimer() {
    localStorage.removeItem("websiteSessionStartTime");
    console.log("Session timer reset");
}

// ===============================
// LOAD AND DISPLAY RECEIPT
// ===============================
async function loadReceipt() {
    try {
        await openDB();
        const currentUser = await getCurrentUser();
        const userAccount = await getUserAccount(currentUser.username);
        
        // Initialize session timer when page loads
        initializeSessionTimer();
        
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
    
    // Update elapsed time display (will show "X minutes" or "Just now")
    updateElapsedTimeDisplay();
    
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
    // set base subtotal/tax text (updateTotals will handle tip & total)
    if (currentReceipt.subtotal != null) {
        document.getElementById("r-subtotal").innerText = `$${currentReceipt.subtotal.toFixed(2)}`;
    }
    if (currentReceipt.tax != null) {
        document.getElementById("r-tax").innerText = `$${currentReceipt.tax.toFixed(2)}`;
    }

    // If receipt already has saved tip info (from history), set radio/custom UI so updateTotals can show it
    if (currentReceipt.tipAmount != null) {
        // prefer saved tipPercent if present
        if (currentReceipt.tipPercent && currentReceipt.tipPercent !== 'custom') {
            // programmatically check radio
            const radio = document.querySelector(`input[name="tip"][value="${currentReceipt.tipPercent}"]`);
            if (radio) radio.checked = true;
        } else if (currentReceipt.tipPercent === 'custom' || currentReceipt.tipAmount > 0) {
            // check custom and fill input
            const radioCustom = document.querySelector('input[name="tip"][value="custom"]');
            const customInput = document.getElementById('customTip');
            if (radioCustom) radioCustom.checked = true;
            if (customInput) {
                customInput.style.display = '';
                customInput.value = currentReceipt.tipAmount.toFixed(2);
            }
        }
    }

    // Recalculate tip & total (will also update r-total and r-tip)
    updateTotals();
    
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
                    <input type="text" id="cardName" placeholder="Exact name on card" value="${(currentReceipt.card && currentReceipt.card.nameOnCard) || ''}">
                    <div class="error-message" id="cardNameError" style="display: none;">Please enter the name on the card</div>
                </div>
                
                <div class="form-row">
                    <label for="cardNumber">Card Number *</label>
                    <input type="text" id="cardNumber" maxlength="19" placeholder="1234 5678 9012 3456" value="">
                    <div class="error-message" id="cardNumberError" style="display: none;">Please enter a valid card number</div>
                </div>
                
                <div class="form-row" style="display: flex; gap: 15px;">
                    <div style="flex: 1;">
                        <label for="cardExp">Expiry (MM/YY) *</label>
                        <input type="text" id="cardExp" maxlength="5" placeholder="MM/YY" value="${(currentReceipt.card && currentReceipt.card.exp) || ''}">
                        <div class="error-message" id="cardExpError" style="display: none;">Please enter expiry in MM/YY format</div>
                    </div>
                    <div style="flex: 1;">
                        <label for="cardCvv">CVV *</label>
                        <input type="password" id="cardCvv" maxlength="4" placeholder="123">
                        <div class="error-message" id="cardCvvError" style="display: none;">Please enter a valid CVV</div>
                    </div>
                </div>
            </div>

            <!-- TIP SECTION -->
            <div class="form-row">
                <label>Tip</label>
                <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
                    <label><input type="radio" name="tip" value="0" ${(!currentReceipt.tipPercent && (!currentReceipt.tipAmount || currentReceipt.tipAmount === 0)) ? 'checked' : ''}> No tip</label>
                    <label><input type="radio" name="tip" value="0.10" ${currentReceipt.tipPercent === 0.10 ? 'checked' : ''}> 10%</label>
                    <label><input type="radio" name="tip" value="0.15" ${currentReceipt.tipPercent === 0.15 ? 'checked' : ''}> 15%</label>
                    <label><input type="radio" name="tip" value="0.20" ${currentReceipt.tipPercent === 0.20 ? 'checked' : ''}> 20%</label>
                    <label style="display:flex; align-items:center; gap:6px;">
                        <input type="radio" name="tip" value="custom" ${currentReceipt.tipPercent === 'custom' ? 'checked' : ''}> Custom
                        <input type="number" id="customTip" placeholder="Amount" style="width:110px; margin-left:8px; ${currentReceipt.tipPercent === 'custom' ? '' : 'display:none;'}" min="0" step="0.01" value="${currentReceipt.tipAmount ? currentReceipt.tipAmount.toFixed(2) : ''}">
                    </label>
                </div>
                <div style="font-size:12px; color:#666; margin-top:6px;">Tip will be added to your total and saved with the receipt.</div>
            </div>

            <div class="success-message" id="successMessage" style="display: none;">
                ✓ Order completed successfully! You can now print your receipt.
            </div>
        </div>
    `;

    // Setup form validation AFTER the form is rendered
    setTimeout(() => {
        setupFormValidation();
        setupTipListeners(); // <-- new function to wire tip controls
        updateTotals();      // <-- ensure totals show the current tip immediately
    }, 100);
}

// Helper: safely parse numbers
function toNumber(value) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
}

// Wire tip radio buttons and custom input to recalc totals
function setupTipListeners() {
    const tipRadios = document.querySelectorAll('input[name="tip"]');
    const customTipInput = document.getElementById('customTip');

    if (tipRadios) {
        tipRadios.forEach(r => {
            r.addEventListener('change', () => {
                if (r.value === 'custom') {
                    customTipInput.style.display = '';
                    customTipInput.focus();
                } else if (customTipInput) {
                    customTipInput.style.display = 'none';
                }
                updateTotals();
            });
        });
    }

    if (customTipInput) {
        customTipInput.addEventListener('input', () => {
            // ensure non-negative
            if (customTipInput.value !== '') {
                customTipInput.value = Math.max(0, toNumber(customTipInput.value)).toFixed(2);
            }
            updateTotals();
        });
    }
}

// Recompute tip and update totals display (and currentReceipt fields)
function updateTotals() {
    if (!currentReceipt) return;

    const subtotal = toNumber(currentReceipt.subtotal);
    const tax = toNumber(currentReceipt.tax);

    // Determine selected tip
    const selected = document.querySelector('input[name="tip"]:checked');
    let tipAmount = 0;
    let tipPercent = null;

    if (selected) {
        if (selected.value === 'custom') {
            const custom = document.getElementById('customTip');
            tipAmount = toNumber(custom ? custom.value : 0);
            tipPercent = 'custom';
        } else {
            tipPercent = toNumber(selected.value); // e.g., 0.15
            tipAmount = Math.round((subtotal * tipPercent) * 100) / 100; // round to cents
        }
    }

    // save to receipt (temporary until purchase)
    currentReceipt.tipAmount = tipAmount;
    currentReceipt.tipPercent = tipPercent;

    // update totals shown on page
    const rTip = document.getElementById('r-tip');
    const rSubtotal = document.getElementById('r-subtotal');
    const rTax = document.getElementById('r-tax');
    const rTotal = document.getElementById('r-total');

    if (rSubtotal) rSubtotal.innerText = `$${subtotal.toFixed(2)}`;
    if (rTax) rTax.innerText = `$${tax.toFixed(2)}`;
    if (rTip) rTip.innerText = `$${tipAmount.toFixed(2)}`;

    const total = Math.round((subtotal + tax + tipAmount) * 100) / 100;
    if (rTotal) rTotal.innerText = `$${total.toFixed(2)}`;
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
            resetTimer().then(() =>{
                const tx = db.transaction(["timer"], "readwrite");
                const store = tx.objectStore("timer");

                const req = store.put({currentTime: performance.now(), timeId: 1});

                req.onsuccess = () => {
                    console.log("Successful timer reset");
                    
                };
                req.onerror = () => {};
            });
            window.location.href = "index.html";
        });
    }
}

function resetTimer() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(["timer"], "readwrite");
        const store = tx.objectStore("timer");

        const req = store.get(1);

        req.onsuccess = () => {
            const result = req.result;
            resolve();
        };
        req.onerror = () => reject();
    });
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
        // Calculate final session duration
        const sessionDuration = calculateSessionDuration();
        console.log("Final session duration:", sessionDuration, "minutes");
        
        // Get form values
        const name = document.getElementById("orderName").value.trim();
        const paymentType = document.getElementById("paymentType").value;
        
        // Update receipt with customer details
        currentReceipt.name = name;
        currentReceipt.paymentType = paymentType;
        currentReceipt.purchased = true;
        currentReceipt.purchasedAt = new Date().toISOString();
        
        // Add session time to receipt
        currentReceipt.sessionDuration = sessionDuration;
        currentReceipt.sessionStartTime = localStorage.getItem("websiteSessionStartTime");
        currentReceipt.sessionEndTime = new Date().toISOString();
        
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
        
        // Reset session timer for next session
        resetSessionTimer();
        
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
        
        // Update elapsed time display to show the final duration
        updateElapsedTimeDisplay();
        
        // Show original alert (kept as is)
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