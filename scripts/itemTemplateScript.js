// Updated version with keyText generation

let db;

function generateKeyText(title, existingKeys) {
    // Split the title into words:
    // "Parm Burger" → ["parm", "burger"]
    // "pasta" → ["pasta"]
    const parts = title.trim().toLowerCase().split(/\s+/);

    // Build the base key:
    // If there's only ONE word → use that word
    // Example: "pasta" → "pasta"
    //
    // If there are TWO OR MORE words → use:
    //   firstWord + firstLetterOfSecondWord
    // Example: "Parm Burger" → "parmb"
    const base = parts.length === 1 ? parts[0] : parts[0] + parts[1][0];

    // Start with the base key
    let key = base;

    // Counter used to create "parmb1", "parmb2", etc.
    let counter = 1;

    // If this key already exists inside "existingKeys" (a Set),
    // then keep trying base + number until we find a unique one.
    //
    // Example:
    // existingKeys = {"parmb"}
    // Try "parmb"  → exists
    // Try "parmb1" → does NOT exist → accept it
    while (existingKeys.has(key)) {
        key = base + counter;  // append increasing number
        counter++;             // try the next number if needed
    }

    // Return the unique keyText for this item
    return key;
}


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

openDB().then(() => console.log("All done!"));

function addToCart(product) {
    const creation = new CartItem(product.title, product.image, product.price, product.keyText);

    const tx = db.transaction(["currentUser"], "readwrite");
    const store = tx.objectStore("currentUser");

    const req = store.get(1);

    req.onsuccess = () => {
        const user = req.result;
        if (!user) {
            console.error("No current user found in DB.");
            return;
        }

        if (!Array.isArray(user.cart)) user.cart = [];

        const exists = user.cart.some(item => item.keyText === creation.keyText);

        if (!exists) {
            user.cart.push({
                title: creation.title,
                image: creation.image,
                price: creation.price,
                keyText: creation.keyText,
                quantity: 1
            });
        } else {
            const existingItem = user.cart.find(item => item.keyText === creation.keyText);
            if (existingItem) {
                existingItem.quantity = (existingItem.quantity || 1) + 1;
                alert("Item quanitity increased, Item quantity: " + existingItem.quantity);
            }
        }

        store.put(user);
    };

    req.onerror = () => console.error("Failed to retrieve user cart");
}

class MenuItem {
    constructor({ image, title, description, price, ingredients = [], keyText }) {
        this.image = image;
        this.title = title;
        this.description = description;
        this.price = price;
        this.ingredients = ingredients;
        this.keyText = keyText;
    }
}

class CartItem {
    constructor(title, image, price, keyText) {
        this.title = title;
        this.image = image;
        this.price = price;
        this.keyText = keyText
    }
}

// Build menu items with dynamic keyText
const rawItems = [
    { image: "../assets/imgs/burger.jpg", title: "burger", 
        description: "Juicy beef burger with fresh toppings.", 
        price: 8.99, 
        ingredients: [
        { name: "Beef Patty", quantity: "150g" },
        { name: "Lettuce", quantity: "2 leaves" },
        { name: "Cheddar Cheese", quantity: "1 slice" },
        { name: "Bun", type: "sesame" }
    ]},
    { image: "", 
        title: "pasta", 
        description: "yumyum pasta", 
        price: 50.00, 
        ingredients: [
        { name: "pasta", quantity: "150g" },
        { name: "tomato", quantity: "2 slices" },
        { name: "cheese", quantity: "1 slice" }
    ]},
    { image: "", 
        title: "chicken alfredo", 
        description: "yumyum chicken alfredo", 
        price: 1.01, 
        ingredients: [
        { name: "chicken", quantity: "150g" },
        { name: "alfredo sauce", quantity: "500 oz" },
        { name: "cheese", quantity: "3 slice" }
    ]}
];

const existingKeys = new Set();
const menuItems = {};

rawItems.forEach(item => {
    const keyText = generateKeyText(item.title, existingKeys);
    existingKeys.add(keyText);

    const menuItem = new MenuItem({ ...item, keyText });
    menuItems[keyText] = menuItem;
});

function renderItem(menuItem) {
    document.getElementById("item-image").src = menuItem.image;
    document.getElementById("item-title").textContent = menuItem.title;
    document.getElementById("item-description").textContent = menuItem.description;
    document.getElementById("item-price").textContent = `$${menuItem.price.toFixed(2)}`;

    const ingredientsList = document.getElementById("item-ingredients");
    ingredientsList.innerHTML = "";

    menuItem.ingredients.forEach(ingredient => {
        const li = document.createElement("li");
        li.textContent = ingredient.quantity
            ? `${ingredient.name} - ${ingredient.quantity}`
            : `${ingredient.name} (${ingredient.type})`;
        ingredientsList.appendChild(li);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("item-button");
    const itemKey = btn.value;

    const selectedItem = menuItems[itemKey];

    if (selectedItem) {
        renderItem(selectedItem);
        btn.addEventListener("click", () => {
            const key = btn.value;
            const product = menuItems[key];
            if (!product) return console.error("ERROR: item undefined. Key=", key);
            addToCart(product);
        });
    } else {
        console.error("Item not found:", itemKey);
    }
});

// document.getElementById("item-button")
// #881fc9 :Darker
// #a81bff :Lighter
// white :White
