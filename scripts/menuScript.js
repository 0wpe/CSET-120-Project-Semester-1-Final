// DATABASE
let db;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("StoreDB", 1);

        request.onupgradeneeded = (event) => {
            const upgradeDB = event.target.result;

            if (!upgradeDB.objectStoreNames.contains("products")) {
                upgradeDB.createObjectStore("products", { keyPath: "productId", autoIncrement: true });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = () => reject("Database failed to open");
    });
}

// MENU ITEM CLASS 
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
// RAW ITEMS 
const rawItems = [
    { name: "Bread Rolls", image: "assets/imgs/initialItemImgs/breadRoll.jpg", description: "Warm, freshly baked bread rolls with butter.", price: 5.99, ingredients: ["Bread", "Butter"], foodType: "Appetizer" },
    { name: "Mozzarella Sticks", image: "assets/imgs/initialItemImgs/mozzarellaStick.jpg", description: "Crispy breaded mozzarella sticks served with marinara.", price: 7.99, ingredients: ["Cheese", "Bread Crumbs", "Oil", "Tomato Sauce"], foodType: "Appetizer" },
    { name: "Creamy Ravioli", image: "assets/imgs/initialItemImgs/creamyRavioli.jpg", description: "Soft cheese-filled ravioli tossed in a creamy sauce.", price: 8.99, ingredients: ["Pasta", "Cheese", "Cream Sauce", "Herbs"], foodType: "Appetizer" },
    { name: "French Fries", image: "assets/imgs/initialItemImgs/frenchFries.jpg", description: "Crispy golden fries lightly salted.", price: 3.99, ingredients: ["Potatoes", "Oil", "Salt"], foodType: "Side" },
    { name: "Lasagna", image: "assets/imgs/initialItemImgs/lasagna.jpg", description: "Layers of pasta baked with meat sauce and cheese.", price: 14.99, ingredients: ["Pasta", "Beef", "Tomato Sauce", "Cheese"], foodType: "Main" },
    { name: "Water", image: "assets/imgs/initialItemImgs/waterBottle.jpg", description: "Fresh chilled water served with optional ice.", price: 1.99, ingredients: ["Water", "Ice"], foodType: "Drink" }
];

// CREATE PRODUCTS
async function createProducts() {
    const tx = db.transaction("products", "readwrite");
    const store = tx.objectStore("products");

    const existing = await new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve([]);
    });

    if (existing.length > 0) return;

    const existingKeys = new Set();
    for (const item of rawItems) {
        const keyText = generateKeyText(item.name, existingKeys);
        existingKeys.add(keyText);
        const menuItem = new MenuItem({...item, keyText});
        store.add(menuItem);
    }

    return new Promise((resolve) => tx.oncomplete = () => resolve());
}

// LOAD MENU
async function loadMenuItems() {
    const tx = db.transaction("products", "readonly");
    const store = tx.objectStore("products");

    const menuItems = await new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        //so in a function return is the syntax for movign the data you want assigned to the outside variable but for a new promise the return function is the resolve IMPORTANT
    });


    const grid = document.getElementById("menuGrid");
    if (!grid) return console.error("No element with ID 'menuGrid'");
    grid.innerHTML = "";

    menuItems.forEach((item, index) => {
        const card = document.createElement("div");
        card.classList.add("menu-card");
        card.innerHTML = `
            <img src="${item.image}" alt="${item.name}">
            <div class="menu-card-content">
                <div class="menu-card-title">${item.name}</div>
                <div class="menu-card-desc">${item.description}</div>
                <div class="menu-card-price">$${item.price.toFixed(2)}</div>
                <div class="menu-card-ingredients">${item.ingredients.map(i => `<span>${i}</span>`).join("")}</div>
                <button class="add-btn" data-index="${index}">Add to Cart</button>
            </div>
        `;
        grid.appendChild(card);
    });

    window.loadedMenuItems = menuItems;
    attachAddToCartBtns();
}

// CART
let items = [];

class ReceiptItem {
    constructor(name, price, quantity = 1) {
        this.name = name;
        this.price = price;
        this.quantity = quantity;
    }
    get total() { return this.price * this.quantity; }
}

function addToCart(menuItem) {
    let existing = items.find(i => i.name === menuItem.name);
    if (existing) existing.quantity++;
    else items.push(new ReceiptItem(menuItem.name, menuItem.price));
    renderCart();
    renderReceipt();
}

function renderCart() {
    const cartContainer = document.getElementById("cartItems");
    if (!cartContainer) return;
    cartContainer.innerHTML = "";

    items.forEach((item, index) => {
        const row = document.createElement("div");
        row.classList.add("cart-row");
        row.innerHTML = `
            <div class="cart-left">
                <span class="cart-name">${item.name}</span>
                <input type="number" class="qty-input" value="${item.quantity}" min="1" data-index="${index}">
                <span class="cart-price">$${item.total.toFixed(2)}</span>
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
            let index = e.target.dataset.index;
            items[index].quantity = Math.max(1, parseInt(e.target.value));
            renderCart();
            renderReceipt();
        });
    });

    document.querySelectorAll(".remove-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            let index = e.target.dataset.index;
            items.splice(index, 1);
            renderCart();
            renderReceipt();
        });
    });
}

function renderReceipt() {
    const itemContainer = document.getElementById("receiptItems");
    if (!itemContainer) return;
    itemContainer.innerHTML = "";

    let subtotal = 0;
    items.forEach(item => {
        const row = document.createElement("div");
        row.innerHTML = `<span>${item.name} (x${item.quantity})</span><span>$${item.total.toFixed(2)}</span>`;
        itemContainer.appendChild(row);
        subtotal += item.total;
    });

    const tax = subtotal * 0.07;
    const total = subtotal + tax;

    document.getElementById("subtotal").textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById("tax").textContent = `$${tax.toFixed(2)}`;
    document.getElementById("total").textContent = `$${total.toFixed(2)}`;
}

// BUTTONS
function attachAddToCartBtns() {
    document.querySelectorAll(".add-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            const i = e.target.dataset.index;
            addToCart(window.loadedMenuItems[i]);
        });
    });
}

// INIT
openDB()
    .then(async () => {
        await createProducts();
        await loadMenuItems();
        renderCart();
        renderReceipt();
    })
    .catch(console.error);

// Scroll-triggered fixed cart
const cartBox = document.getElementById("cartBox");
const cartInitialTop = cartBox.offsetTop;
const offset = 142;

window.addEventListener("scroll", () => {
    const scrollY = window.scrollY || window.pageYOffset;

    if (scrollY + offset >= cartInitialTop) {
        cartBox.classList.add("cart-fixed");
    } else {
        cartBox.classList.remove("cart-fixed");
    }
});