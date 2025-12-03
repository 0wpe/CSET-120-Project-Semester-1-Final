// Load users
const users = JSON.parse(localStorage.getItem("users")) || [];
const currentUser = JSON.parse(localStorage.getItem("currentUser"));

// CART LIST
let items = [];

// Menu Item Class
class MenuItem {
    constructor({image, title, description, price, ingredients = []}) {
        this.image = image;
        this.title = title;
        this.description = description;
        this.price = price;
        this.ingredients = ingredients;
    }
}

// Example menu
const menuItems = [
    new MenuItem({
        image: "assets/imgs/sample1.jpg",
        title: "Herb Crusted Steak",
        description: "Juicy steak coated with rosemary and garlic herb butter.",
        price: 22.99,
        ingredients: ["Steak", "Garlic", "Rosemary", "Butter"]
    }),
    new MenuItem({
        image: "assets/imgs/sample2.jpg",
        title: "Roasted Grape Flatbread",
        description: "A Vineyard specialty with balsamic glaze and feta.",
        price: 14.49,
        ingredients: ["Flatbread", "Grapes", "Feta", "Balsamic"]
    }),
    new MenuItem({
        image: "assets/imgs/sample3.jpg",
        title: "Wine-Infused Pasta",
        description: "Creamy linguine simmered in house red wine reduction.",
        price: 18.25,
        ingredients: ["Linguine", "Red Wine", "Parmesan", "Cream"]
    }),
];

// -------- MENU DISPLAY --------
function loadMenuItems() {
    const grid = document.getElementById("menuGrid");
    grid.innerHTML = "";

    menuItems.forEach((item, i) => {
        const card = document.createElement("div");
        card.classList.add("menu-card");

        card.innerHTML = `
            <img src="${item.image}" alt="${item.title}">
            <div class="menu-card-content">
                <div class="menu-card-title">${item.title}</div>
                <div class="menu-card-desc">${item.description}</div>
                <div class="menu-card-price">$${item.price.toFixed(2)}</div>
                <div class="menu-card-ingredients">
                    ${item.ingredients.map(i => `<span>${i}</span>`).join("")}
                </div>

                <button class="add-btn" data-index="${i}">Add to Cart</button>
            </div>
        `;

        grid.appendChild(card);
    });

    attachAddToCartBtns();
}

function attachAddToCartBtns() {
    document.querySelectorAll(".add-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            const i = e.target.getAttribute("data-index");
            addToCart(menuItems[i]);
        });
    });
}

// -------- CART SYSTEM --------
class ReceiptItem {
    constructor(name, price, quantity = 1) {
        this.name = name;
        this.price = price;
        this.quantity = quantity;
    }

    get total() {
        return this.price * this.quantity;
    }
}

function addToCart(menuItem) {
    let existing = items.find(i => i.name === menuItem.title);

    if (existing) {
        existing.quantity++;
    } else {
        items.push(new ReceiptItem(menuItem.title, menuItem.price, 1));
    }

    renderCart();
    renderReceipt();
}

// Render cart
function renderCart() {
    const cartContainer = document.getElementById("cartItems");
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
            let val = Math.max(1, parseInt(e.target.value));
            items[index].quantity = val;
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

// -------- RECEIPT --------
function renderReceipt() {
    const itemContainer = document.getElementById("receiptItems");
    itemContainer.innerHTML = "";

    let subtotal = 0;

    items.forEach(item => {
        const row = document.createElement("div");
        row.innerHTML = `
            <span>${item.name} (x${item.quantity})</span>
            <span>$${item.total.toFixed(2)}</span>
        `;
        itemContainer.appendChild(row);
        subtotal += item.total;
    });

    const taxRate = 0.07;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    document.getElementById("subtotal").textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById("tax").textContent = `$${tax.toFixed(2)}`;
    document.getElementById("total").textContent = `$${total.toFixed(2)}`;
}

// Initialize
loadMenuItems();
renderCart();
renderReceipt();
