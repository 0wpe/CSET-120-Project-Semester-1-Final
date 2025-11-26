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

function test() {
    const params = new URLSearchParams(window.location.search);
    const itemKey = params.get("item") || "burger";
    const selectedItem = menuItems[itemKey];
    console.log(selectedItem);
    //selected 
}

// Example: Add an item to the cart from another file
function addToCart() {
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


class MenuItem {
    constructor({image, title, description, price, ingredients = []}){
        this.image = image;               // URL for the image of the item
        this.title = title;
        this.description = description;   // Description of the item
        this.price = price;               // Price value of the item
        this.ingredients = ingredients;   // Array of ingredient objects
    }
}

// Example of what an item will look like

const burger = new MenuItem({
    image: "burger.jpg",
    title: "burger",
    description: "Juicy beef burger with fresh toppings.",
    price: 8.99,
    ingredients:[
        {name: "Beef Patty", quantity: "150g"},
        {name: "Lettuce", quantity: "2 leaves"},
        {name: "Cheddar Cheese", quantity: "1 slice"},
        {name: "Bun", type: "sesame"}
    ]
});
const pasta = new MenuItem({
    image: "",//file name
    title: "pasta",
    description: "yumyum pasta",
    price: 50.00, //dont change "when" said 50 bucks for all prices
    ingredients:[
        {name: "pasta", quantity: "150g"},
        {name: "tomato", quantity: "2 slices"},
        {name: "cheese", quantity: "1 slice"},
    ]  
});
 const chicken_alfredo = new MenuItem({
    image: "",
    title: "chicken alfredo",
    description: "yumyum chicken alfredo",
    price: 1.01,
    ingredients:[
        {name: "chicken", quantity: "150g"},
        {name: "alfredo sauce", quantity: "500 oz"},
        {name: "cheese", quantity: "3 slice"},
    ]      
});

function renderItem(menuItem) {
    document.getElementById("item-image").src = "../assets/imgs/" + menuItem.image;
    console.log(menuItem.image);
    document.getElementById("item-title").textContent = menuItem.title;
    document.getElementById("item-description").textContent = menuItem.description;
    document.getElementById("item-price").textContent = `$${menuItem.price.toFixed(2)}`;//price decimal

    const ingredientsList = document.getElementById("item-ingredients");
    ingredientsList.innerHTML = ""; // Clear existing

    menuItem.ingredients.forEach(ingredient => {
        const li = document.createElement("li");
        li.textContent = ingredient.quantity
            ? `${ingredient.name} - ${ingredient.quantity}`
            : `${ingredient.name} (${ingredient.type})`;
        ingredientsList.appendChild(li);
    });
}
const menuItems = {
    burger,
    pasta,
    chicken_alfredo
}
document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const itemKey = params.get("item") || "burger";
    const selectedItem = menuItems[itemKey];
    if (selectedItem) {
        renderItem(selectedItem);
    }
    else{
        console.error("Item not found:",itemkey);
    }
});
// #881fc9 :Darker
// #a81bff :Lighter
// white :White 