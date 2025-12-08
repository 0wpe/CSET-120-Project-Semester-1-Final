//Add this to gitHUB *change on line 104

//changes made

let db;

/* ---------------- KEY TEXT ---------------- */
function generateKeyText(title, existingKeys) {
    const parts = title.trim().toLowerCase().split(/\s+/);
    const base = parts.length === 1 ? parts[0] : parts[0] + parts[1][0];
    let key = base;
    let counter = 1;

    while (existingKeys.has(key)) {
        key = base + counter;
        counter++;
    }
    return key;
}

/* ---------------- OPEN DATABASE ---------------- */
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
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log("DB opened");
            resolve(db);
        };

        request.onerror = () => reject("Database error");
    });
}

/* ---------------- CART ITEM ---------------- */
class MenuItem {
    constructor({name, image, description, price, ingredients = [], foodType, keyText}) {
        this.name = name;
        this.image = image;
        this.description = description;
        this.price = price;
        this.ingredients = ingredients;
        this.foodType = foodType;
        this.keyText = keyText;
    }
}

class CartItem {
    constructor(name, image, price, keyText) {
        this.name = name;
        this.image = image;
        this.price = price;
        this.keyText = keyText;
    }
}

/* ---------------- PRODUCT FETCH ---------------- */
const rawItems = [];
const existingKeys = new Set();
const menuItems = {};

function fetchProducts() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(["products"], "readonly");
        const store = tx.objectStore("products");

        const req = store.getAll();
        req.onsuccess = () => {
            rawItems.push(...req.result);
            resolve();
        };
        req.onerror = () => reject("Failed to load products");
    });
}

/* ---------------- RENDER ITEM ---------------- */
function renderItem(menuItem) {
    console.log(menuItem.name);
    document.getElementById("item-image").src = menuItem.image;
    document.getElementById("item-name").innerText = menuItem.name;
    document.getElementById("item-description").textContent = menuItem.description;
    document.getElementById("item-price").innerText = `$${menuItem.price.toFixed(2)}`;

    const ul = document.getElementById("item-ingredients");
    ul.innerHTML = "";

    menuItem.ingredients.forEach(ing => {
        const li = document.createElement("li");
        li.innerText = ing.quantity
            ? `${ing.name} - ${ing.quantity}`
            : `${ing.name} (${ing.type})`;
        ul.appendChild(li);
    });
}

/* ---------------- POPUP ---------------- */
function showPopup(message) {
    const button = document.getElementById("item-button");
    const wrapper = button.parentElement;

    const popup = document.createElement("div");
    popup.classList.add("notification");
    popup.textContent = message;

    wrapper.appendChild(popup);

    setTimeout(() => popup.remove(), 1600);
}

/* ---------------- ADD TO CART ---------------- */
function addToCart(product) {
    const creation = new CartItem(product.name, product.image, product.price, product.keyText);

    const tx = db.transaction(["currentUser"], "readwrite");
    const store = tx.objectStore("currentUser");
    const req = store.get(1);

    req.onsuccess = () => {
        const user = req.result;
        if (!user) return console.error("No currentUser in DB");

        user.cart = user.cart || [];

        const existing = user.cart.find(i => i.keyText === creation.keyText);

        if (existing) {
            existing.quantity++;
            showPopup("Quantity increased");
        } else {
            user.cart.push({ ...creation, quantity: 1 });
            showPopup("Item added to cart");
        }

        store.put(user);
    };
}

/* ---------------- PAGE START ---------------- */
document.addEventListener("DOMContentLoaded", async () => {
    await openDB();
    await fetchProducts();

    rawItems.forEach(item => {
        const keyText = generateKeyText(item.name, existingKeys);
        existingKeys.add(keyText);
        menuItems[keyText] = new MenuItem({ ...item, keyText });
    });

    const tx = db.transaction(["targetItem"], "readonly");
    const store = tx.objectStore("targetItem");

    const req = store.get(1);

    req.onsuccess = () => {
        const targetItem = req.result;
        const keyText = targetItem ? targetItem.keyText : "breadr";

        const itemToRender = menuItems[keyText];
        if (!itemToRender) {
            console.error("Item not found:", keyText);
            return;
        }

        renderItem(itemToRender);

        document.getElementById("item-button").onclick = () => {
            addToCart(itemToRender);
        };
    };
});
