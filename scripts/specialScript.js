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
