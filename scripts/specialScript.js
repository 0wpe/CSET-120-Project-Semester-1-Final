// Load users
const users = JSON.parse(localStorage.getItem("users")) || [];
//this is an array of objects

// Load current logged-in user
const currentUser = JSON.parse(localStorage.getItem("currentUser")) || null;

// Example: Show current user's cart
if (currentUser) {
    console.log(`Logged in as: ${currentUser.username}`);
    console.log("Cart items:", currentUser.cart);
}

// Example: Add an item to the cart from another file
function addToCart(item) {
    if (!currentUser) {
        console.log("No user logged in.");
        return;
    }

    // Prevent duplicate items
    if (currentUser.cart.some(i => i.name === item.name)) {
        console.log("Item already in cart!");
        return;
    }

    currentUser.cart.push(item);

    // Update localStorage
    // Update the users array
    const idx = users.findIndex(u => u.username === currentUser.username);
    if (idx >= 0) {
        users[idx] = currentUser;
        localStorage.setItem("users", JSON.stringify(users));
    }

    localStorage.setItem("currentUser", JSON.stringify(currentUser));

    console.log(`${item.name} added to cart!`);
}
//inported
const specialsData = [
            {
                name: "Watermelon Smoothie",
                description: "Fresh watermelon blended with mint and lime.",
                price: "$4.99",
                imageUrl: "assets/imgs/specialImgs/watermelonSmoothie.jpg",
                tags: ["Fresh", "Mint", "Lime"]
            },
            {
                name: "Summer Salad",
                description: "Mixed greens with watermelon, feta, and balsamic.",
                price: "$7.49",
                imageUrl: "../assets/imgs/miniSalad.png",
                tags: ["Greens", "Watermelon", "Feta", "Balsamic"]
            },
            {
                name: "Melon Sorbet",
                description: "Light, refreshing melon sorbet dessert.",
                price: "$3.99",
                imageUrl: "../assets/imgs/sorbet.jpg",
                tags: ["Dessert", "Light", "Refreshing"]
            },
            {
                name: "Bread Rolls",
                description: "Warm, freshly baked bread rolls with butter.",
                price: "$5.99",
                imageUrl: "../assets/imgs/breadRoll.jpg",
                tags: ["Appetizer", "Bread", "Butter"]
            },
            {
                name: "Mozzarella Sticks",
                description: "Golden fried mozzarella sticks with marinara sauce.",
                price: "$8.49",
                imageUrl: "../assets/imgs/mozzarellaSticks.jpg",
                tags: ["Appetizer", "Fried", "Cheese"]
            },
            {
                name: "Toasted Ravioli",
                description: "Crispy toasted ravioli served with marinara.",
                price: "$9.99",
                imageUrl: "../assets/imgs/toastedRavioli.jpg",
                tags: ["Appetizer", "Toasted", "Pasta"]
            }
        ];

        const container = document.getElementById('specials-container');

        specialsData.forEach(item => {
            const card = document.createElement('div');
            card.className = 'special-card';
            
            card.innerHTML = `
                <div class="card-image"><img src="${item.imageUrl}" alt="${item.name}" /></div>
                <div class="card-content">
                    <h2>${item.name}</h2>
                    <p>${item.description}</p>
                    <p class="price">${item.price}</p>
                    <div class="tags">
                        ${item.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                </div>
            `;
            
            container.appendChild(card);
        });