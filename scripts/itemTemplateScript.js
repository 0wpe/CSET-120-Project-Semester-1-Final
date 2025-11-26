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
    image: "pasta.png",
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
    image: "chicken-alfredo.png",
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