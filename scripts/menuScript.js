// Load users
const users = JSON.parse(localStorage.getItem("users")) || [];
//this is an array of objects

// Load current logged-in user
const currentUser = JSON.parse(localStorage.getItem("currentUser"));

// Example: Show current user's cart
if (currentUser) {     
    console.log(`Logged in as: ${currentUser.username}`);
    console.log("Cart items:", currentUser.cart || []);
}
