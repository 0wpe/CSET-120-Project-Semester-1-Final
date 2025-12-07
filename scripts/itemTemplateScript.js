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
class MenuItem {//add another one for the food foodType that is either appitizer, main, drink, desert, or kMeal and the creation 
    //if the change above is done add a checkbox to the admin add form that needs to be checked but when they check it adds the food foodType attribute to the new obj
    constructor({name, image, description, price, ingredients = [], foodType, keyText} ){
        this.name = name;
        this.image = image;               // URL for the image of the item
        this.description = description;   // Description of the item
        this.price = price;               // Price value of the item
        this.ingredients = ingredients;   // Array of ingredient objects
        this.foodType = foodType;         // optional food foodType (appetizer, main, drink, dessert, kMeal, etc.)
        this.keyText = keyText;           // generated unique short key for the item
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
    document.getElementById("item-name").innerText = menuItem.name;//change here
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
            // alert("Item quantity increased: " + existing.quantity);
            console.log("Item quantity increased: " + existing.quantity);
        } else {
            user.cart.push({ ...creation, quantity: 1 });
        }

        store.put(user);
    };
}

/* ---------------- PAGE START ---------------- */
document.addEventListener("DOMContentLoaded", async () => {
    await openDB();
    await fetchProducts();

    // Build menuItems only ONCE
    rawItems.forEach(item => {
        const keyText = generateKeyText(item.name, existingKeys);
        existingKeys.add(keyText);
        menuItems[keyText] = new MenuItem({ ...item, keyText });
    });

    // Get the selected targetItem
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
