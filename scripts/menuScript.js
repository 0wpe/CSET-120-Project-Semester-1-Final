// ===============================
// OPEN DATABASE + INITIAL SETUP
// ===============================
let db;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("StoreDB", 1);

        request.onupgradeneeded = (event) => {
            const upgradeDB = event.target.result;
            console.log("Upgrading StoreDB…");

            if (!upgradeDB.objectStoreNames.contains("users")) {
                upgradeDB.createObjectStore("users", { keyPath: "userId", autoIncrement: true });
            }
            if (!upgradeDB.objectStoreNames.contains("currentUser")) {
                upgradeDB.createObjectStore("currentUser", { keyPath: "id" });
            }
            if (!upgradeDB.objectStoreNames.contains("products")) {
                upgradeDB.createObjectStore("products", { keyPath: "productId", autoIncrement: true });
            }
            if (!upgradeDB.objectStoreNames.contains("images")) {
                upgradeDB.createObjectStore("images", { keyPath: "imageId", autoIncrement: true });
            }
            if (!upgradeDB.objectStoreNames.contains("targetItem")) {
                upgradeDB.createObjectStore("targetItem", { keyPath: "targetItemId" });
                console.log("targetItem store created");
            }
            if (!upgradeDB.objectStoreNames.contains("createFirstMenuList")) {
                upgradeDB.createObjectStore("createFirstMenuList", { keyPath: "runId" });
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
//changes - 12/6
// ===============================
// CREATE ADMIN ACCOUNT ON STARTUP
// ===============================
function createAdminOnStartup() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(["users"], "readonly");
        const store = tx.objectStore("users");
        const req = store.getAll();

        req.onsuccess = () => {
            const allUsers = req.result;

            // Check if admin already exists
            if (allUsers.some(u => u.username === "odejuanknobe")) {
                console.log("Admin account already exists");
                resolve();
                return;
            }

            // Create admin account
            const txWrite = db.transaction(["users"], "readwrite");
            const storeWrite = txWrite.objectStore("users");
            
            const adminUser = {
                username: "odejuanknobe",
                password: "08162008",
                email: "admin@restaurant.com",
                cart: [],
                isAdmin: true
            };

            const addReq = storeWrite.add(adminUser);
            
            addReq.onsuccess = () => {
                console.log("Admin account created successfully");
                resolve();
            };
            
            addReq.onerror = (error) => {
                console.error("Failed to create admin account:", error);
                reject(error);
            };
        };

        req.onerror = reject;
    });
}

// ===============================
// KEYTEXT GENERATOR
// ===============================
function generateKeyText(name, existingKeys) {
    const parts = name.trim().toLowerCase().split(/\s+/);
    const base = parts.length === 1 ? parts[0] : parts[0] + parts[1][0];

    let key = base;
    let counter = 1;

    while (existingKeys.has(key)) {
        key = base + counter;
        counter++;
    }

    return key;
}

// ===============================
// MENU ITEM CLASS (Updated to match itemTemplateScript.js)
// ===============================
class MenuItem {
    constructor({ name, image, description, price, ingredients = [], foodType, keyText }) {
        this.name = name;
        this.image = image;
        this.description = description;
        this.price = price;
        this.ingredients = ingredients;
        this.foodType = foodType;
        this.keyText = keyText;
    }
}

// ===============================
// CART ITEM CLASS (Added for consistency)
// ===============================
class CartItem {
    constructor(name, image, price, keyText) {
        this.name = name;
        this.image = image;
        this.price = price;
        this.keyText = keyText;
    }
}

// ===============================
// RAW DEFAULT PRODUCTS
// ===============================
const rawItems = [
    { name: "Bread Rolls", image: "assets/imgs/initialItemImgs/breadRoll.jpg", description: "Warm, freshly baked bread rolls with butter.", price: 5.99, ingredients: [{name: "Bread", type: "grain"}, {name: "Butter", type: "dairy"}], foodType: "Bread" },
    { name: "Mozzarella Sticks", image:"assets/imgs/initialItemImgs/mozzarellaStick.jpg", description: "Crispy breaded mozzarella sticks served with marinara.", price: 7.99, ingredients: [{name: "Cheese", type: "dairy"}, {name: "Bread Crumbs", type: "grain"}, {name: "Oil", type: "fat"}, {name: "Tomato Sauce", type: "sauce"}], a: "Bread" },
    { name: "Creamy Ravioli", image: "assets/imgs/initialItemImgs/creamyRavioli.jpg", description: "Soft cheese-filled ravioli tossed in a creamy sauce.", price: 8.99, ingredients: [{name: "Pasta", type: "grain"}, {name: "Cheese", type: "dairy"}, {name: "Cream Sauce", type: "sauce"}, {name: "Herbs", type: "seasoning"}], foodType: "Bread" },
    { name: "French Fries", image: "assets/imgs/initialItemImgs/frenchFries.jpg", price: 3.99, description: "Crispy golden fries lightly salted.", ingredients: [{name: "Potatoes", type: "vegetable"}, {name: "Oil", type: "fat"}, {name: "Salt", type: "seasoning"}], foodType: "Potatoe" },
    { name: "Steamed Broccoli", image: "assets/imgs/initialItemImgs/steamedBroccoli.jpg", price: 3.49, description: "Fresh broccoli steamed until tender.", ingredients: [{name: "Broccoli", type: "vegetable"}, {name: "Salt", type: "seasoning"}, {name: "Olive Oil", type: "fat"}], foodType: "Vegetable" },
    { name: "Mini-Salad", image: "assets/imgs/initialItemImgs/miniSalad.jpg", price: 3.99, description: "A small mixed salad with dressing.", ingredients: [{name: "Lettuce", type: "vegetable"}, {name: "Tomato", type: "vegetable"}, {name: "Cucumber", type: "vegetable"}, {name: "Dressing", type: "sauce"}], foodType: "Salad" },
    { name: "Garlic Bread", image: "assets/imgs/initialItemImgs/garlicBread.jpg", price: 4.49, description: "Toasted bread slices topped with garlic butter.", ingredients: [{name: "Bread", type: "grain"}, {name: "Butter", type: "dairy"}, {name: "Garlic", type: "vegetable"}, {name: "Herbs", type: "seasoning"}], foodType: "Bread" },
    { name: "Lasagna", image: "assets/imgs/initialItemImgs/lasagna.jpg", price: 14.99, description: "Layers of pasta baked with meat sauce and cheese.", ingredients: [{name: "Pasta", type: "grain"}, {name: "Beef", type: "meat"}, {name: "Tomato Sauce", type: "sauce"}, {name: "Cheese", type: "dairy"}], foodType: "Pasta" },
    { name: "Chicken Alfredo Pasta", image: "assets/imgs/initialItemImgs/chickenAlfredo.png", price: 16.99, description: "Creamy Alfredo pasta topped with grilled chicken.", ingredients: [{name: "Pasta", type: "grain"}, {name: "Chicken", type: "meat"}, {name: "Cream Sauce", type: "sauce"}, {name: "Parmesan", type: "dairy"}], foodType: "Pasta" },
    { name: "Chicken Parmesan", image: "assets/imgs/initialItemImgs/chickenParm.jpg", price: 15.99, description: "Breaded chicken topped with marinara and melted cheese.", ingredients: [{name: "Chicken", type: "meat"}, {name: "Bread Crumbs", type: "grain"}, {name: "Cheese", type: "dairy"}, {name: "Tomato Sauce", type: "sauce"}], foodType: "Chicken" },
    { name: "Shrimp Alfredo Pasta", image: "assets/imgs/initialItemImgs/shrimpAlfredoPastajpg.jpg", price: 17.99, description: "Creamy Alfredo pasta with sautéed shrimp.", ingredients: [{name: "Pasta", type: "grain"}, {name: "Shrimp", type: "seafood"}, {name: "Cream Sauce", type: "sauce"}, {name: "Parmesan", type: "dairy"}], foodType: "Pasta" },
    { name: "Caesar Salad", image: "assets/imgs/initialItemImgs/caesarSalad.jpg", price: 10.99, description: "Crisp romaine lettuce with Caesar dressing and croutons.", ingredients: [{name: "Lettuce", type: "vegetable"}, {name: "Croutons", type: "grain"}, {name: "Cheese", type: "dairy"}, {name: "Dressing", type: "sauce"}], foodType: "Salad" },
    { name: "Spaghetti & Meatballs (Gluten-Free)", image: "assets/imgs/initialItemImgs/spaghettiMeatballs.jpg", price: 13.99, description: "Gluten-free spaghetti with homemade meatballs.", ingredients: [{name: "Gluten-Free Pasta", type: "grain"}, {name: "Beef", type: "meat"}, {name: "Tomato Sauce", type: "sauce"}, {name: "Herbs", type: "seasoning"}], foodType: "Pasta" },
    { name: "Black Ink Pasta", image: "assets/imgs/initialItemImgs/blackInkPasta.jpg", price: 18.99, description: "Squid ink pasta served with seafood and light sauce.", ingredients: [{name: "Pasta", type: "grain"}, {name: "Squid Ink", type: "seafood"}, {name: "Seafood", type: "seafood"}, {name: "Olive Oil", type: "fat"}], foodType: "Pasta" },
    { name: "Water", image: "assets/imgs/initialItemImgs/waterBottle.jpg", price: 1.99, description: "Fresh chilled water served with optional ice.", ingredients: [{name: "Water", type: "beverage"}, {name: "Ice", type: "beverage"}], foodType: "Cold" },
    { name: "Coke", image: "assets/imgs/initialItemImgs/cocacola.jpg", price: 2.99, description: "Classic carbonated cola beverage.", ingredients: [{name: "Carbonated Water", type: "beverage"}, {name: "Sweetener", type: "sweetener"}, {name: "Flavoring", type: "flavor"}], foodType: "Cold" },
    { name: "Lemonade", image: "assets/imgs/initialItemImgs/lemonade.jpg", price: 3.49, description: "Fresh lemonade made with real lemons.", ingredients: [{name: "Water", type: "beverage"}, {name: "Lemon", type: "fruit"}, {name: "Sugar", type: "sweetener"}], foodType: "Cold" },
    { name: "Raspberry Lemonade", image:"assets/imgs/initialItemImgs/raspberryLemonade.jpg", price: 3.99, description: "Tart lemonade mixed with raspberry flavor.", ingredients: [{name: "Water", type: "beverage"}, {name: "Lemon", type: "fruit"}, {name: "Raspberry", type: "fruit"}, {name: "Sugar", type: "sweetener"}], foodType: "Cold" },
    { name: "Passion Smoothie", image:"assets/imgs/initialItemImgs/passionSmoothie.jpg", price: 4.99, description: "Sweet passionfruit blended into a chilled smoothie.", ingredients: [{name: "Passionfruit", type: "fruit"}, {name: "Ice", type: "beverage"}, {name: "Sugar", type: "sweetener"}], foodType: "Cold" },
    { name: "Watermelon Smoothie", image:"assets/imgs/initialItemImgs/watermelonSmoothie.jpg", price: 4.99, description: "Refreshing frozen watermelon smoothie.", ingredients: [{name: "Watermelon", type: "fruit"}, {name: "Ice", type: "beverage"}, {name: "Sugar", type: "sweetener"}], foodType: "Cold" },
    { name: "Cheesecake", image:"assets/imgs/initialItemImgs/cheesecake.jpg", price: 6.49, description: "Classic creamy cheesecake with a graham crust.", ingredients: [{name: "Cheese", type: "dairy"}, {name: "Crust", type: "grain"}, {name: "Sugar", type: "sweetener"}, {name: "Cream", type: "dairy"}], foodType: "Cake" },
    { name: "Molten Chocolate Cake", image:"assets/imgs/initialItemImgs/moltenChocolateCake.jpg", price: 6.99, description: "Warm chocolate cake with a soft melted center.", ingredients: [{name: "Chocolate", type: "sweet"}, {name: "Flour", type: "grain"}, {name: "Butter", type: "dairy"}, {name: "Sugar", type: "sweetener"}], foodType: "Cake" },
    { name: "Gelato", image:"assets/imgs/initialItemImgs/sorbet.jpg", price: 5.49, description: "Smooth Italian-style ice cream.", ingredients: [{name: "Milk", type: "dairy"}, {name: "Sugar", type: "sweetener"}, {name: "Flavoring", type: "flavor"}], foodType: "Frozen" },
    { name: "Melon Sorbet", image:"assets/imgs/initialItemImgs/melonSorbet.jpg", price: 4.99, description: "Light and refreshing melon-flavored sorbet.", ingredients: [{name: "Melon", type: "fruit"}, {name: "Sugar", type: "sweetener"}, {name: "Water", type: "beverage"}], foodType: "Frozen" },
    { name: "Chicken Tenders & Fries", image:"assets/imgs/initialItemImgs/chickenTender.jpg", price: 8.99, description: "Crispy chicken tenders with a side of fries.", ingredients: [{name: "Chicken", type: "meat"}, {name: "Batter", type: "grain"}, {name: "Potatoes", type: "vegetable"}, {name: "Oil", type: "fat"}], foodType: "Kids Menu" },
    { name: "Cheeseburger & Fries", image:"assets/imgs/initialItemImgs/cheeseBurger.jpg", price: 9.49, description: "Mini cheeseburger served with crispy fries.", ingredients: [{name: "Beef", type: "meat"}, {name: "Cheese", type: "dairy"}, {name: "Bun", type: "grain"}, {name: "Potatoes", type: "vegetable"}], foodType: "Kids Menu" },
    { name: "Mini-Pizza & Fries", image:"assets/imgs/initialItemImgs/miniPizzapg.jpg", price: 8.49, description: "Small cheese pizza with a side of fries.", ingredients: [{name: "Dough", type: "grain"}, {name: "Cheese", type: "dairy"}, {name: "Tomato Sauce", type: "sauce"}, {name: "Potatoes", type: "vegetable"}], foodType: "Kids Menu" },
    { name: "Macaroni & One Side", image:"assets/imgs/initialItemImgs/macaroni.jpg", price: 7.99, description: "Creamy macaroni pasta served with your choice of side.", ingredients: [{name: "Pasta", type: "grain"}, {name: "Cheese Sauce", type: "sauce"}], foodType: "Kids Menu" }
];

// ===============================
// CREATE PRODUCTS ON FIRST RUN
// ===============================
function createProducts() {
    return new Promise((resolve, reject) => {
        const txProducts = db.transaction(["products"], "readwrite");
        const storeProducts = txProducts.objectStore("products");

        const getAllReq = storeProducts.getAll();
        getAllReq.onsuccess = () => {
            if (getAllReq.result.length > 0) {
                resolve();
                return;
            }

            const existingKeys = new Set();
            rawItems.forEach(item => {
                const keyText = generateKeyText(item.name, existingKeys);
                existingKeys.add(keyText);
                console.log(item);
                
                const menuItem = new MenuItem({ 
                    ...item, 
                    keyText
                });
                storeProducts.add(menuItem);
            });
        };

        getAllReq.onerror = reject;
        txProducts.oncomplete = () => resolve();
        txProducts.onerror = reject;
    });
}
//change 12/6
function changeLoginText() {
    return new Promise((resolve, reject) => {
        const txG = db.transaction(["currentUser"], "readonly");
        const storeG = txG.objectStore("currentUser");
        const reqG = storeG.getAll();
        
        reqG.onsuccess = () => {
            const result = reqG.result;
            const guestUser = result.find(user => user.username === "guest");
            if (guestUser) {
            resolve(guestUser);
            } else {
            resolve();
            }
        };
        reqG.onerror = () => reject(reqG.error);
    });
}

function guestLoading() {
    return new Promise((resolve, reject)=>{
        const txWrite = db.transaction(["currentUser"], "readwrite");
        const storeWrite = txWrite.objectStore("currentUser");
        storeWrite.onsuccess = () => resolve(storeWrite);
        storeWrite.onerror = () => reject(error);
    });
}

// ===================================================
// ============ USER + CART SYNC LOGIC ===============
// ===================================================
let currentUserId = null;
let userAccount = null;
let items = []; // will mirror userAccount.cart

function loadCurrentUserFromDB() {
    return new Promise((resolve, reject) => {
        // STEP 1 — get logged-in user reference
        const txCU = db.transaction(["currentUser"], "readonly");
        const storeCU = txCU.objectStore("currentUser");
        const reqCU = storeCU.get(1);

        reqCU.onsuccess = () => {
            const cu = reqCU.result;
            if (!cu) {
                // Create a default current user if none exists
                const defaultUser = { id: 1, cart: [] };
                const txWrite = db.transaction(["currentUser"], "readwrite");
                const storeWrite = txWrite.objectStore("currentUser");
                storeWrite.add(defaultUser);
                
                userAccount = defaultUser;
                items = [];
                resolve();
                return;
            }

            // STEP 2 — load full user account from "users"
            const txU = db.transaction(["users"], "readonly");
            const storeU = txU.objectStore("users");
            const reqU = storeU.get(1);

            reqU.onsuccess = () => {
                userAccount = reqU.result;

                if (!userAccount) {
                    console.warn("User account missing.");
                    // Create a default user account
                    userAccount = { userId: 1, cart: [] };
                    const txWrite = db.transaction(["users"], "readwrite");
                    const storeWrite = txWrite.objectStore("users");
                    storeWrite.add(userAccount);
                }

                items = [...(userAccount.cart || [])];
                resolve();
            };

            reqU.onerror = reject;
        };

        reqCU.onerror = reject;
    });
}



// Save cart updates to USERS DB
function saveCartToUserDB() {
    return new Promise((resolve, reject) => {
        if (!userAccount) return reject("User not loaded.");

        userAccount.cart = items;

        const tx = db.transaction(["users"], "readwrite");
        const store = tx.objectStore("users");
        const req = store.put(userAccount);

        req.onsuccess = resolve;
        req.onerror = reject;
    });
}

// ===============================
// LOAD MENU FROM PRODUCTS DB
// ===============================
function loadMenuItemsFromDB() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(["products"], "readonly");
        const store = tx.objectStore("products");
        const req = store.getAll();

        req.onsuccess = () => resolve(req.result);
        req.onerror = reject;
    });
}

// ===============================
// ADD TO CART FUNCTION (Updated for compatibility)
// ===============================
function addToCart(product) {
    if (!product) {
        console.error("No product to add to cart");
        return;
    }
    
    const creation = new CartItem(
        product.name, 
        product.image, 
        product.price, 
        product.keyText
    );

    let existing = items.find(i => i.keyText === creation.keyText);

    if (existing) {
        existing.quantity = (existing.quantity || 1) + 1;
    } else {
        items.push({
            ...creation,
            quantity: 1,
            productId: product.productId
        });
    }

    saveCartToUserDB().then(() => {
        renderCart();
        renderReceipt();
        
        // Also update currentUser store for itemTemplateScript.js compatibility
        const tx = db.transaction(["currentUser"], "readwrite");
        const store = tx.objectStore("currentUser");
        const req = store.get(1);
        
        req.onsuccess = () => {
            const currentUser = req.result || { id: 1, cart: [] };
            currentUser.cart = items;
            store.put(currentUser);
        };
    }).catch(error => {
        console.error("Failed to save cart:", error);
    });
}

// ===============================
// MENU RENDERING
// ===============================
async function loadMenuItems() {
    const menuItems = await loadMenuItemsFromDB();
    const cold = document.getElementById("drop-cold");
    const hot = document.getElementById("drop-hot");
    const starter = document.getElementById("drop-starter");
    const soup = document.getElementById("drop-soup");
    const pasta = document.getElementById("drop-pasta");
    const burger = document.getElementById("drop-burger");
    const chicken = document.getElementById("drop-chicken");
    const beef = document.getElementById("drop-beef");
    const seafood = document.getElementById("drop-seafood");
    const potatoe = document.getElementById("drop-potatoes");
    const vegetable = document.getElementById("drop-vegetable");
    const bread = document.getElementById("drop-bread");
    const salad = document.getElementById("drop-salad");
    const cake = document.getElementById("drop-cake");
    const pie = document.getElementById("drop-pie");
    const frozen = document.getElementById("drop-frozen");
    const kids = document.getElementById("drop-kids");
    // if (!grid) return; // If not on menu page, exit
    
    // grid.innerHTML = "";

    // Store globally for access in event handlers
    window.loadedMenuItems = menuItems;

    menuItems.forEach((item, index) => {
        const card = document.createElement("div");
        card.classList.add("menu-card");
        card.dataset.keyText = item.keyText;
        card.dataset.index = index;

        card.innerHTML = `
            <img src="${item.image}" alt="${item.name}">
            <div class="menu-card-content">
                <div class="menu-card-title">${item.name}</div>
                <div class="menu-card-desc">${item.description}</div>
                <div class="menu-card-price">$${item.price.toFixed(2)}</div>
                <div class="menu-card-ingredients">
                    ${item.ingredients.map(i => `<span>${i.name || i}</span>`).join("")}
                </div>
                <button class="add-btn" data-index="${index}">Add to Cart</button>
            </div>
        `;

        if(item.foodType=="Cold"){
          cold.appendChild(card);
        }
        else if(item.foodType=="Hot"){
          hot.appendChild(card);
        }
        else if(item.foodType=="Starter"){
          starter.appendChild(card);
        }
        else if(item.foodType=="Soup"){
          soup.appendChild(card);
        }
        else if(item.foodType=="Pasta"){
          pasta.appendChild(card);
        }
        else if(item.foodType=="Burger"){
          burger.appendChild(card);
        }
        else if(item.foodType=="Chicken"){
          chicken.appendChild(card);
        }
        else if(item.foodType=="Beef"){
          beef.appendChild(card);
        }
        else if(item.foodType=="Seafood"){
          seafood.appendChild(card);
        }
        else if(item.foodType=="Potatoe"){
          potatoe.appendChild(card);
        }
        else if(item.foodType=="Vegetable"){
          vegetable.appendChild(card);
        }
        else if(item.foodType=="Bread"){
          bread.appendChild(card);
        }
        else if(item.foodType=="Salad"){
          salad.appendChild(card);
        }
        else if(item.foodType=="Cake"){
          cake.appendChild(card);
        }
        else if(item.foodType=="Pie"){
          pie.appendChild(card);
        }
        else if(item.foodType=="Frozen"){
          frozen.appendChild(card);
        }
        else{
          kids.appendChild(card);
        }
    });

    // Now attach event handlers
    attachCardClickHandlers(menuItems);
    attachAddToCartBtns(menuItems);
}

function attachCardClickHandlers(menuItems) {
    const cardSections = document.querySelectorAll(".menu-card");

    cardSections.forEach(card => {
        card.addEventListener("click", e => {
            if (e.target.classList.contains("add-btn")) return;
            
            const index = card.dataset.index;
            const menuItem = menuItems[index];
            
            if (menuItem) {
                // Save the selected item to targetItem store
                const tx = db.transaction(["targetItem"], "readwrite");
                const store = tx.objectStore("targetItem");
                
                // CORRECT: The object must have targetItemId as per the store's keyPath
                const targetItemData = { 
                    targetItemId: 1,  // This is REQUIRED - matches the keyPath
                    keyText: menuItem.keyText
                };
                
                const request = store.put(targetItemData);
                
                request.onsuccess = () => {
                    console.log("Target item saved, redirecting...");
                    // Redirect to item template page
                    window.location.href = "itemTemplate.html";
                };
                
                request.onerror = (error) => {
                    console.error("Failed to save target item:", error);
                    alert("Failed to load item details. Please try again.");
                };
            }
        });
    });
}

function attachAddToCartBtns(menuItems) {
    document.querySelectorAll(".add-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            e.stopPropagation(); // Prevent card click event
            const index = e.target.dataset.index;
            const targetItem = menuItems[index];
            
            if (targetItem) {
                addToCart(targetItem);
            }
        });
    });
}

// ===============================
// CART + RECEIPT SYSTEM
// ===============================
function renderCart() {
    const cartContainer = document.getElementById("cartItems");
    if (!cartContainer) return; // Only render if element exists
    
    cartContainer.innerHTML = "";

    items.forEach((item, index) => {
        const row = document.createElement("div");
        row.classList.add("cart-row");
        console.log(item);
        

        row.innerHTML = `
            <div class="cart-left">
                <span class="cart-name">${item.name}</span>
                <input type="number" class="qty-input" value="${item.quantity || 1}" min="1" data-index="${index}">
                <span class="cart-price">$${((item.quantity || 1) * item.price).toFixed(2)}</span>
            </div>
            <button class="remove-btn" data-index="${index}">Remove</button>
        `;

        cartContainer.appendChild(row);
    });

    attachCartListeners();
}

function attachCartListeners() {
    document.querySelectorAll(".qty-input").forEach(input => {
        input.addEventListener("input", e => {
            const index = e.target.dataset.index;
            const val = Math.max(1, parseInt(e.target.value) || 1);

            items[index].quantity = val;

            saveCartToUserDB().then(() => {
                renderCart();
                renderReceipt();
            });
        });
    });

    document.querySelectorAll(".remove-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            const index = e.target.dataset.index;
            items.splice(index, 1);

            saveCartToUserDB().then(() => {
                renderCart();
                renderReceipt();
            });
        });
    });
}

function renderReceipt() {
    const container = document.getElementById("receiptItems");
    if (!container) return; // Only render if element exists
    
    container.innerHTML = "";

    let subtotal = 0;

    items.forEach(item => {
        const row = document.createElement("div");
        row.innerHTML = `
            <span>${item.name} (x${item.quantity || 1})</span>
            <span>$${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
        `;

        container.appendChild(row);
        subtotal += (item.price || 0) * (item.quantity || 1);
    });

    const tax = subtotal * 0.07;
    const total = subtotal + tax;

    const subtotalEl = document.getElementById("subtotal");
    const taxEl = document.getElementById("tax");
    const totalEl = document.getElementById("total");
    
    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `$${tax.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
}

// ===============================
// FINAL INITIALIZATION
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    openDB().then(() => {
        loadCurrentUserFromDB().then(() => {
            loadMenuItems();
            renderCart();
            renderReceipt();
        }).catch(error => {
            console.error("Failed to load user:", error);
        });
    }).catch(error => {
        console.error("Failed to open database:", error);
    });
  document.querySelectorAll(".dropdown-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const dropdown = btn.parentElement;

      // toggle this dropdown
      dropdown.classList.toggle("open");
    });
  });
  const purchaseBtn = document.getElementById("purchaseBtn");
    purchaseBtn.addEventListener("click", () => {
        document.getElementById("receiptItems").style.display = "block";
        document.querySelector(".receipt-totals").style.display = "block";

        alert("Thank you for your purchase!");
    });

});

// // Scroll-triggered fixed cart
// const cartBox = document.getElementById("cartBox");
// const cartInitialTop = cartBox.offsetTop;
// const offset = 138;

// window.addEventListener("scroll", () => {
//     const scrollY = window.scrollY || window.pageYOffset;

//     if (scrollY + offset >= cartInitialTop) {
//         cartBox.classList.add("cart-fixed");
//     } else {
//         cartBox.classList.remove("cart-fixed");
//     }
// });

// // Scroll-triggered fixed drink-app
// const drinkBox = document.getElementById("drinkBox");
// const drinkInitialTop = drinkBox.offsetTop;
// const Doffset = 138;

// window.addEventListener("scroll", () => {
//     const scrollY = window.scrollY || window.pageYOffset;

//     if (scrollY + offset >= drinkInitialTop) {
//         drinkBox.classList.add("drink-app-fixed");
//     } else {
//         drinkBox.classList.remove("drink-app-fixed");
//     }
// });

function renderDropdownMenu(menuItems) {
    const categories = {
        // "Appetizer": document.getElementById("drop-appetizers"),
        // "Main": document.getElementById("drop-mains"),
        // "Side": document.getElementById("drop-sides"),
        // "Drink": document.getElementById("drop-drinks"),
        // "Dessert": document.getElementById("drop-desserts"),
        "Kids Menu": document.getElementById("drop-kids"),
        "Pasta": document.getElementById("drop-pasta"),
        "Burger": document.getElementById("drop-burger"),
        "Chicken": document.getElementById("drop-chicken"),
        "Beef": document.getElementById("drop-beef"),
        "Seafood": document.getElementById("drop-seafood"),
        "Potatoe": document.getElementById("drop-potatoes"),
        "vegetable": document.getElementById("drop-vegetable"),
        "Bread": document.getElementById("drop-bread"),
        "Salad": document.getElementById("drop-salad"),
        "Cold": document.getElementById("drop-cold"),
        "Hot": document.getElementById("drop-hot"),
        "Starter": document.getElementById("drop-starter"),
        "Soup": document.getElementById("drop-soup"),
    };

    menuItems.forEach((item, index) => {
        const card = document.createElement("div");
        card.classList.add("menu-card");
        card.dataset.keyText = item.keyText;
        card.dataset.index = index;

        card.innerHTML = `
            <img src="${item.image}" alt="${item.name}">
            <div class="menu-card-content">
                <div class="menu-card-title">${item.name}</div>
                <div class="menu-card-desc">${item.description}</div>
                <div class="menu-card-price">$${item.price.toFixed(2)}</div>
                <div class="menu-card-ingredients">
                    ${item.ingredients.map(i => `<span>${i.name || i}</span>`).join("")}
                </div>
                <button class="add-btn" data-index="${index}">Add to Cart</button>
            </div>
        `;

        categories[item.foodType].appendChild(card);
    });

    attachAddToCartBtns(menuItems);
    attachCardClickHandlers(menuItems);
}

function displayAdminBtnFN(){
    return new Promise((resolve, reject) => {
        const tx = db.transaction(["currentUser"], "readonly");
        const store = tx.objectStore("currentUser");
        const req = store.get(1);
        
        req.onsuccess = () =>{
            const currentUser = req.result;
            resolve(currentUser);
        }
    });
}


// ===============================
// MARK FIRST RUN EXECUTION
// ===============================
openDB().then(() => {
    // Create admin account on startup
    createAdminOnStartup().then(() => {
        console.log("Admin initialization complete");
    }).catch(err => {
        console.error("Admin creation error:", err);
    });

    displayAdminBtnFN().then((currentUser) => {
        const adminBtn = document.getElementById("adminBtn");
        console.log(currentUser);
        if (currentUser.isAdmin) {//if there is no isAdmin it will be false and if there is an an admin the return will run!
            adminBtn.style.display = "block";
        } else {
            adminBtn.style.display = "none"; 
        }
    });
    
    const tx = db.transaction(["createFirstMenuList"], "readwrite");
    const store = tx.objectStore("createFirstMenuList");
    const req = store.get(1);

    req.onsuccess = () => {
        if (!req.result) {
            createProducts().then(() => console.log("Products created."));
            guestLoading().then();
            const txCurrentUser = db.transaction(["currentUser"], "readwrite");
            const storeCurrentUser = txCurrentUser.objectStore("currentUser");
            
            const guestUser = {
                id: 1, 
                username: "guest", 
                userId: 1,
                cart: []
            };
            
            const putCurrentUser = storeCurrentUser.put(guestUser);
            
            putCurrentUser.onsuccess = () => {
                console.log("CurrentUser updated to guest");
            };
            
            putCurrentUser.onerror = (error) => {
                console.error("Error updating currentUser:", error);
                alert("Failed to logout. Please try again.");
            };
            store.add({ runId: 1, check: true });
        }
    };

    changeLoginText().then((result) =>{
        const loginBtn = document.getElementById("log-in");
        console.log(result);        
        if (result) { //result only happens if there is a guest account
            loginBtn.innerText = "LOGIN";
            loginBtn.onclick = () => "window.location.href='sign.html'";
            console.log(result);
        } else {
            console.log("result is empty");
            loginBtn.innerText = "LOG OUT";       
            loginBtn.onclick = () => {
                const check = confirm("Confirm that you want to log out of your account.");
                console.log(check);
                if (check) {
                    // Set currentUser to guest
                    
                    const txCurrentUser = db.transaction(["currentUser"], "readwrite");
                    const storeCurrentUser = txCurrentUser.objectStore("currentUser");
                    guestLoading().then();
                    const guestUser = {
                        id: 1, 
                        username: "guest", 
                        userId: 1,
                        cart: []
                    };
                    
                    const putCurrentUser = storeCurrentUser.put(guestUser);
                    
                    putCurrentUser.onsuccess = () => {
                        console.log("CurrentUser updated to guest");
                    };
                    
                    putCurrentUser.onerror = (error) => {
                        console.error("Error updating currentUser:", error);
                        alert("Failed to logout. Please try again.");
                    };
                } else {
                    alert("Log out canceled, you may continue your shopping experience");
                    return;
                }
            };
        }
        

    });

    req.onerror = () => console.error("Failed to check first run.");
});
