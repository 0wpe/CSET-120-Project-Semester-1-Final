//added the time info

// ===============================
// OPEN DATABASE + INITIAL SETUP
// ===============================
let db;

function openDB() {
    return new Promise((resolve, reject) => {
        //change this from 2 to 1
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
            if (!upgradeDB.objectStoreNames.contains("createFirstMenuList")) {
                upgradeDB.createObjectStore("createFirstMenuList", { keyPath: "runId" });
            }
            if (!upgradeDB.objectStoreNames.contains("timer")) {
                upgradeDB.createObjectStore("timer", { keyPath: "timeId"});
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

//changes - 12/6
// ===============================
// CREATE ADMIN ACCOUNT ON STARTUP
// ===============================
function createAdminOnStartup() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(["users"], "readonly");
        const store = tx.objectStore("users");
        const req = store.getAll();

        req.onsuccess = () => {
            const allUsers = req.result;

            // Check if admin already exists
            if (allUsers.some(u => u.username === "odejuanknobe")) {
                console.log("Admin account already exists");
                resolve();
                return;
            }

            // Create admin account
            const txWrite = db.transaction(["users"], "readwrite");
            const storeWrite = txWrite.objectStore("users");
            
            const adminUser = {
                username: "odejuanknobe",
                password: "08162008",
                email: "admin@restaurant.com",
                cart: [],
                isAdmin: true
            };

            const addReq = storeWrite.add(adminUser);
            
            addReq.onsuccess = () => {
                console.log("Admin account created successfully");
                resolve();
            };
            
            addReq.onerror = (error) => {
                console.error("Failed to create admin account:", error);
                reject(error);
            };
        };

        req.onerror = reject;
    });
}

// ===============================
// KEYTEXT GENERATOR
// ===============================
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

// ===============================
// MENU ITEM CLASS (Updated to match itemTemplateScript.js)
// ===============================
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

// ===============================
// CART ITEM CLASS (Added for consistency)
// ===============================
class CartItem {
    constructor(name, image, price, keyText) {
        this.name = name;
        this.image = image;
        this.price = price;
        this.keyText = keyText;
    }
}

// ===============================
// RAW DEFAULT PRODUCTS
// ===============================
const rawItems = [
    { name: "Bread Rolls", image: "assets/imgs/initialItemImgs/breadRoll.jpg", description: "Warm, freshly baked bread rolls with butter.", price: 5.99, ingredients: [{name: "Bread", type: "grain"}, {name: "Butter", type: "dairy"}], foodType: "Bread" },
    { name: "Mozzarella Sticks", image:"assets/imgs/initialItemImgs/mozzarellaStick.jpg", description: "Crispy breaded mozzarella sticks served with marinara.", price: 7.99, ingredients: [{name: "Cheese", type: "dairy"}, {name: "Bread Crumbs", type: "grain"}, {name: "Oil", type: "fat"}, {name: "Tomato Sauce", type: "sauce"}], a: "Bread" },
    { name: "Creamy Ravioli", image: "assets/imgs/initialItemImgs/creamyRavioli.jpg", description: "Soft cheese-filled ravioli tossed in a creamy sauce.", price: 8.99, ingredients: [{name: "Pasta", type: "grain"}, {name: "Cheese", type: "dairy"}, {name: "Cream Sauce", type: "sauce"}, {name: "Herbs", type: "seasoning"}], foodType: "Bread" },
    { name: "French Fries", image: "assets/imgs/initialItemImgs/frenchFries.jpg", price: 3.99, description: "Crispy golden fries lightly salted.", ingredients: [{name: "Potatoes", type: "vegetable"}, {name: "Oil", type: "fat"}, {name: "Salt", type: "seasoning"}], foodType: "Potatoe" },
    { name: "Steamed Broccoli", image: "assets/imgs/initialItemImgs/steamedBroccoli.jpg", price: 3.49, description: "Fresh broccoli steamed until tender.", ingredients: [{name: "Broccoli", type: "vegetable"}, {name: "Salt", type: "seasoning"}, {name: "Olive Oil", type: "fat"}], foodType: "Vegetable" },
    { name: "Mini-Salad", image: "assets/imgs/initialItemImgs/miniSalad.jpg", price: 3.99, description: "A small mixed salad with dressing.", ingredients: [{name: "Lettuce", type: "vegetable"}, {name: "Tomato", type: "vegetable"}, {name: "Cucumber", type: "vegetable"}, {name: "Dressing", type: "sauce"}], foodType: "Salad" },
    { name: "Garlic Bread", image: "assets/imgs/initialItemImgs/garlicBread.jpg", price: 4.49, description: "Toasted bread slices topped with garlic butter.", ingredients: [{name: "Bread", type: "grain"}, {name: "Butter", type: "dairy"}, {name: "Garlic", type: "vegetable"}, {name: "Herbs", type: "seasoning"}], foodType: "Bread" },
    { name: "Lasagna", image: "assets/imgs/initialItemImgs/lasagna.jpg", price: 14.99, description: "Layers of pasta baked with meat sauce and cheese.", ingredients: [{name: "Pasta", type: "grain"}, {name: "Beef", type: "meat"}, {name: "Tomato Sauce", type: "sauce"}, {name: "Cheese", type: "dairy"}], foodType: "Pasta" },
    { name: "Chicken Alfredo Pasta", image: "assets/imgs/initialItemImgs/chickenAlfredo.png", price: 16.99, description: "Creamy Alfredo pasta topped with grilled chicken.", ingredients: [{name: "Pasta", type: "grain"}, {name: "Chicken", type: "meat"}, {name: "Cream Sauce", type: "sauce"}, {name: "Parmesan", type: "dairy"}], foodType: "Pasta" },
    { name: "Chicken Parmesan", image: "assets/imgs/initialItemImgs/chickenParm.jpg", price: 15.99, description: "Breaded chicken topped with marinara and melted cheese.", ingredients: [{name: "Chicken", type: "meat"}, {name: "Bread Crumbs", type: "grain"}, {name: "Cheese", type: "dairy"}, {name: "Tomato Sauce", type: "sauce"}], foodType: "Chicken" },
    { name: "Shrimp Alfredo Pasta", image: "assets/imgs/initialItemImgs/shrimpAlfredoPastajpg.jpg", price: 17.99, description: "Creamy Alfredo pasta with sautéed shrimp.", ingredients: [{name: "Pasta", type: "grain"}, {name: "Shrimp", type: "seafood"}, {name: "Cream Sauce", type: "sauce"}, {name: "Parmesan", type: "dairy"}], foodType: "Pasta" },
    { name: "Caesar Salad", image: "assets/imgs/initialItemImgs/caesarSalad.jpg", price: 10.99, description: "Crisp romaine lettuce with Caesar dressing and croutons.", ingredients: [{name: "Lettuce", type: "vegetable"}, {name: "Croutons", type: "grain"}, {name: "Cheese", type: "dairy"}, {name: "Dressing", type: "sauce"}], foodType: "Salad" },
    { name: "Spaghetti & Meatballs (Gluten-Free)", image: "assets/imgs/initialItemImgs/spaghettiMeatballs.jpg", price: 13.99, description: "Gluten-free spaghetti with homemade meatballs.", ingredients: [{name: "Gluten-Free Pasta", type: "grain"}, {name: "Beef", type: "meat"}, {name: "Tomato Sauce", type: "sauce"}, {name: "Herbs", type: "seasoning"}], foodType: "Pasta" },
    { name: "Black Ink Pasta", image: "assets/imgs/initialItemImgs/blackInkPasta.jpg", price: 18.99, description: "Squid ink pasta served with seafood and light sauce.", ingredients: [{name: "Pasta", type: "grain"}, {name: "Squid Ink", type: "seafood"}, {name: "Seafood", type: "seafood"}, {name: "Olive Oil", type: "fat"}], foodType: "Pasta" },
    { name: "Water", image: "assets/imgs/initialItemImgs/waterBottle.jpg", price: 1.99, description: "Fresh chilled water served with optional ice.", ingredients: [{name: "Water", type: "beverage"}, {name: "Ice", type: "beverage"}], foodType: "Cold" },
    { name: "Coke", image: "assets/imgs/initialItemImgs/cocacola.jpg", price: 2.99, description: "Classic carbonated cola beverage.", ingredients: [{name: "Carbonated Water", type: "beverage"}, {name: "Sweetener", type: "sweetener"}, {name: "Flavoring", type: "flavor"}], foodType: "Cold" },
    { name: "Lemonade", image: "assets/imgs/initialItemImgs/lemonade.jpg", price: 3.49, description: "Fresh lemonade made with real lemons.", ingredients: [{name: "Water", type: "beverage"}, {name: "Lemon", type: "fruit"}, {name: "Sugar", type: "sweetener"}], foodType: "Cold" },
    { name: "Raspberry Lemonade", image:"assets/imgs/initialItemImgs/raspberryLemonade.jpg", price: 3.99, description: "Tart lemonade mixed with raspberry flavor.", ingredients: [{name: "Water", type: "beverage"}, {name: "Lemon", type: "fruit"}, {name: "Raspberry", type: "fruit"}, {name: "Sugar", type: "sweetener"}], foodType: "Cold" },
    { name: "Passion Smoothie", image:"assets/imgs/initialItemImgs/passionSmoothie.jpg", price: 4.99, description: "Sweet passionfruit blended into a chilled smoothie.", ingredients: [{name: "Passionfruit", type: "fruit"}, {name: "Ice", type: "beverage"}, {name: "Sugar", type: "sweetener"}], foodType: "Cold" },
    { name: "Watermelon Smoothie", image:"assets/imgs/initialItemImgs/watermelonSmoothie.jpg", price: 4.99, description: "Refreshing frozen watermelon smoothie.", ingredients: [{name: "Watermelon", type: "fruit"}, {name: "Ice", type: "beverage"}, {name: "Sugar", type: "sweetener"}], foodType: "Cold" },
    { name: "Cheesecake", image:"assets/imgs/initialItemImgs/cheesecake.jpg", price: 6.49, description: "Classic creamy cheesecake with a graham crust.", ingredients: [{name: "Cheese", type: "dairy"}, {name: "Crust", type: "grain"}, {name: "Sugar", type: "sweetener"}, {name: "Cream", type: "dairy"}], foodType: "Cake" },
    { name: "Molten Chocolate Cake", image:"assets/imgs/initialItemImgs/moltenChocolateCake.jpg", price: 6.99, description: "Warm chocolate cake with a soft melted center.", ingredients: [{name: "Chocolate", type: "sweet"}, {name: "Flour", type: "grain"}, {name: "Butter", type: "dairy"}, {name: "Sugar", type: "sweetener"}], foodType: "Cake" },
    { name: "Gelato", image:"assets/imgs/initialItemImgs/sorbet.jpg", price: 5.49, description: "Smooth Italian-style ice cream.", ingredients: [{name: "Milk", type: "dairy"}, {name: "Sugar", type: "sweetener"}, {name: "Flavoring", type: "flavor"}], foodType: "Frozen" },
    { name: "Melon Sorbet", image:"assets/imgs/initialItemImgs/melonSorbet.jpg", price: 4.99, description: "Light and refreshing melon-flavored sorbet.", ingredients: [{name: "Melon", type: "fruit"}, {name: "Sugar", type: "sweetener"}, {name: "Water", type: "beverage"}], foodType: "Frozen" },
    { name: "Chicken Tenders & Fries", image:"assets/imgs/initialItemImgs/chickenTender.jpg", price: 8.99, description: "Crispy chicken tenders with a side of fries.", ingredients: [{name: "Chicken", type: "meat"}, {name: "Batter", type: "grain"}, {name: "Potatoes", type: "vegetable"}, {name: "Oil", type: "fat"}], foodType: "Kids Menu" },
    { name: "Cheeseburger & Fries", image:"assets/imgs/initialItemImgs/cheeseBurger.jpg", price: 9.49, description: "Mini cheeseburger served with crispy fries.", ingredients: [{name: "Beef", type: "meat"}, {name: "Cheese", type: "dairy"}, {name: "Bun", type: "grain"}, {name: "Potatoes", type: "vegetable"}], foodType: "Kids Menu" },
    { name: "Mini-Pizza & Fries", image:"assets/imgs/initialItemImgs/miniPizzapg.jpg", price: 8.49, description: "Small cheese pizza with a side of fries.", ingredients: [{name: "Dough", type: "grain"}, {name: "Cheese", type: "dairy"}, {name: "Tomato Sauce", type: "sauce"}, {name: "Potatoes", type: "vegetable"}], foodType: "Kids Menu" },
    { name:"Macaroni & One Side", image:"assets/imgs/initialItemImgs/macaroni.jpg", price: 7.99, description: "Creamy macaroni pasta served with your choice of side.", ingredients: [{name: "Pasta", type: "grain"}, {name: "Cheese Sauce", type: "sauce"}], foodType: "Kids Menu" },
    
    
    { name:"Iced Cola", image:"assets/imgs/initialItemImgs/item01.jpg", price:2.49, description:"Chilled cola served over ice.", ingredients:[{name:"Cola Syrup",type:"beverage"},{name:"Carbonated Water",type:"beverage"}], foodType:"Cold" },
    { name:"Cold Brew Coffee", image:"assets/imgs/initialItemImgs/item02.jpg", price:3.29, description:"Slow-steeped cold brew coffee.", ingredients:[{name:"Coffee Beans",type:"beverage"},{name:"Water",type:"beverage"}], foodType:"Cold" },
    { name:"Sparkling Water", image:"assets/imgs/initialItemImgs/item03.jpg", price:1.99, description:"Refreshing sparkling mineral water.", ingredients:[{name:"Carbonated Water",type:"beverage"}], foodType:"Cold" },

    { name:"Hot Coffee", image:"assets/imgs/initialItemImgs/item04.jpg", price:2.49, description:"Freshly brewed hot coffee.", ingredients:[{name:"Coffee Beans",type:"beverage"},{name:"Water",type:"beverage"}], foodType:"Hot" },
    { name:"Hot Green Tea", image:"assets/imgs/initialItemImgs/item05.jpg", price:2.29, description:"Steamed green tea served hot.", ingredients:[{name:"Tea Leaves",type:"beverage"},{name:"Water",type:"beverage"}], foodType:"Hot" },
    { name:"Hot Apple Cider", image:"assets/imgs/initialItemImgs/item06.jpg", price:3.29, description:"Warm spiced apple cider.", ingredients:[{name:"Apple",type:"fruit"},{name:"Cinnamon",type:"spice"}], foodType:"Hot" },

    { name:"Garlic Bread Bites", image:"assets/imgs/initialItemImgs/item07.jpg", price:4.49, description:"Toasted garlic bread pieces.", ingredients:[{name:"Bread",type:"grain"},{name:"Garlic",type:"vegetable"}], foodType:"Starter" },
    { name:"Mozzarella Sticks", image:"assets/imgs/initialItemImgs/item08.jpg", price:5.49, description:"Crispy fried mozzarella sticks.", ingredients:[{name:"Mozzarella",type:"dairy"},{name:"Bread Crumbs",type:"grain"}], foodType:"Starter" },
    { name:"Onion Rings", image:"assets/imgs/initialItemImgs/item09.jpg", price:4.99, description:"Golden fried onion rings.", ingredients:[{name:"Onion",type:"vegetable"},{name:"Batter",type:"grain"}], foodType:"Starter" },

    { name:"Tomato Soup", image:"assets/imgs/initialItemImgs/item10.jpg", price:3.99, description:"Creamy tomato soup.", ingredients:[{name:"Tomatoes",type:"vegetable"},{name:"Cream",type:"dairy"}], foodType:"Soup" },
    { name:"Chicken Noodle Soup", image:"assets/imgs/initialItemImgs/item11.jpg", price:4.49, description:"Classic chicken noodle soup.", ingredients:[{name:"Chicken",type:"meat"},{name:"Noodles",type:"grain"}], foodType:"Soup" },
    { name:"Vegetable Soup", image:"assets/imgs/initialItemImgs/item12.jpg", price:4.29, description:"Warm mixed vegetable soup.", ingredients:[{name:"Carrots",type:"vegetable"},{name:"Celery",type:"vegetable"}], foodType:"Soup" },

    { name:"Spaghetti Marinara", image:"assets/imgs/initialItemImgs/item13.jpg", price:8.99, description:"Spaghetti with marinara sauce.", ingredients:[{name:"Pasta",type:"grain"},{name:"Tomato Sauce",type:"sauce"}], foodType:"Pasta" },
    { name:"Alfredo Fettucine", image:"assets/imgs/initialItemImgs/item14.jpg", price:9.49, description:"Fettuccine tossed in alfredo sauce.", ingredients:[{name:"Pasta",type:"grain"},{name:"Cream",type:"dairy"}], foodType:"Pasta" },
    { name:"Pesto Penne", image:"assets/imgs/initialItemImgs/item15.jpg", price:9.29, description:"Penne in fresh basil pesto.", ingredients:[{name:"Pasta",type:"grain"},{name:"Basil",type:"herb"}], foodType:"Pasta" },

    { name:"Classic Cheeseburger", image:"assets/imgs/initialItemImgs/item16.jpg", price:7.99, description:"Beef patty with cheese and lettuce.", ingredients:[{name:"Beef",type:"meat"},{name:"Cheese",type:"dairy"}], foodType:"Burger" },
    { name:"Bacon Burger", image:"assets/imgs/initialItemImgs/item17.jpg", price:8.49, description:"Beef burger topped with bacon.", ingredients:[{name:"Beef",type:"meat"},{name:"Bacon",type:"meat"}], foodType:"Burger" },
    { name:"Mushroom Swiss Burger", image:"assets/imgs/initialItemImgs/item18.jpg", price:8.99, description:"Beef burger with mushrooms and Swiss.", ingredients:[{name:"Beef",type:"meat"},{name:"Mushrooms",type:"vegetable"}], foodType:"Burger" },

    { name:"Grilled Chicken Plate", image:"assets/imgs/initialItemImgs/item19.jpg", price:9.49, description:"Seasoned grilled chicken breast.", ingredients:[{name:"Chicken",type:"meat"}], foodType:"Chicken" },
    { name:"Crispy Chicken Tenders", image:"assets/imgs/initialItemImgs/item20.jpg", price:7.99, description:"Breaded fried chicken strips.", ingredients:[{name:"Chicken",type:"meat"},{name:"Breading",type:"grain"}], foodType:"Chicken" },
    { name:"Honey BBQ Chicken", image:"assets/imgs/initialItemImgs/item21.jpg", price:9.99, description:"Chicken glazed with honey BBQ sauce.", ingredients:[{name:"Chicken",type:"meat"},{name:"BBQ Sauce",type:"sauce"}], foodType:"Chicken" },

    { name:"Beef Stir Fry", image:"assets/imgs/initialItemImgs/item22.jpg", price:10.49, description:"Beef with vegetables in stir fry sauce.", ingredients:[{name:"Beef",type:"meat"},{name:"Peppers",type:"vegetable"}], foodType:"Beef" },
    { name:"Beef Stew", image:"assets/imgs/initialItemImgs/item23.jpg", price:8.99, description:"Hearty beef and veggie stew.", ingredients:[{name:"Beef",type:"meat"},{name:"Potatoes",type:"vegetable"}], foodType:"Beef" },
    { name:"Grilled Steak", image:"assets/imgs/initialItemImgs/item24.jpg", price:13.99, description:"Seasoned grilled steak.", ingredients:[{name:"Beef",type:"meat"}], foodType:"Beef" },

    { name:"Grilled Salmon", image:"assets/imgs/initialItemImgs/item25.jpg", price:12.99, description:"Grilled salmon fillet.", ingredients:[{name:"Salmon",type:"seafood"}], foodType:"Seafood" },
    { name:"Fried Shrimp Basket", image:"assets/imgs/initialItemImgs/item26.jpg", price:11.49, description:"Crispy fried shrimp.", ingredients:[{name:"Shrimp",type:"seafood"},{name:"Batter",type:"grain"}], foodType:"Seafood" },
    { name:"Fish Tacos", image:"assets/imgs/initialItemImgs/item27.jpg", price:10.49, description:"Seasoned fish in soft tortillas.", ingredients:[{name:"Fish",type:"seafood"},{name:"Tortilla",type:"grain"}], foodType:"Seafood" },

    { name:"Mashed Potatoes", image:"assets/imgs/initialItemImgs/item28.jpg", price:3.49, description:"Creamy mashed potatoes.", ingredients:[{name:"Potatoes",type:"vegetable"},{name:"Butter",type:"dairy"}], foodType:"Potatoe" },
    { name:"Baked Potato", image:"assets/imgs/initialItemImgs/item29.jpg", price:3.99, description:"Oven-baked potato with butter.", ingredients:[{name:"Potato",type:"vegetable"}], foodType:"Potatoe" },
    { name:"Potato Wedges", image:"assets/imgs/initialItemImgs/item30.jpg", price:4.49, description:"Seasoned crispy potato wedges.", ingredients:[{name:"Potatoes",type:"vegetable"}], foodType:"Potatoe" },

    // { name:"Steamed Broccoli", image:"assets/imgs/initialItemImgs/item31.jpg", price:3.49, description:"Fresh steamed broccoli.", ingredients:[{name:"Broccoli",type:"vegetable"}], foodType:"Vegetable" },
    { name:"Grilled Asparagus", image:"assets/imgs/initialItemImgs/item32.jpg", price:3.99, description:"Lightly grilled asparagus.", ingredients:[{name:"Asparagus",type:"vegetable"}], foodType:"Vegetable" },
    { name:"Sautéed Spinach", image:"assets/imgs/initialItemImgs/item33.jpg", price:3.79, description:"Spinach sautéed with garlic.", ingredients:[{name:"Spinach",type:"vegetable"}], foodType:"Vegetable" },

    { name:"Dinner Roll", image:"assets/imgs/initialItemImgs/item34.jpg", price:1.49, description:"Soft, warm dinner roll.", ingredients:[{name:"Flour",type:"grain"}], foodType:"Bread" },
    { name:"Garlic Loaf Slice", image:"assets/imgs/initialItemImgs/item35.jpg", price:2.49, description:"Toasted garlic loaf slice.", ingredients:[{name:"Bread",type:"grain"},{name:"Garlic",type:"vegetable"}], foodType:"Bread" },
    { name:"Butter Croissant", image:"assets/imgs/initialItemImgs/item36.jpg", price:2.99, description:"Flaky buttery croissant.", ingredients:[{name:"Flour",type:"grain"},{name:"Butter",type:"dairy"}], foodType:"Bread" },

    { name:"House Salad", image:"assets/imgs/initialItemImgs/item37.jpg", price:4.99, description:"Mixed greens with vinaigrette.", ingredients:[{name:"Lettuce",type:"vegetable"},{name:"Tomato",type:"vegetable"}], foodType:"Salad" },
    // { name:"Caesar Salad", image:"assets/imgs/initialItemImgs/item38.jpg", price:5.49, description:"Crisp romaine with Caesar dressing.", ingredients:[{name:"Lettuce",type:"vegetable"},{name:"Croutons",type:"grain"}], foodType:"Salad" },
    { name:"Chicken Salad", image:"assets/imgs/initialItemImgs/item39.jpg", price:6.99, description:"Salad topped with grilled chicken.", ingredients:[{name:"Chicken",type:"meat"},{name:"Lettuce",type:"vegetable"}], foodType:"Salad" },

    { name:"Vanilla Cake", image:"assets/imgs/initialItemImgs/item40.jpg", price:4.49, description:"Classic vanilla layer cake.", ingredients:[{name:"Flour",type:"grain"},{name:"Sugar",type:"sweetener"}], foodType:"Cake" },
    { name:"Chocolate Cake", image:"assets/imgs/initialItemImgs/item41.jpg", price:4.79, description:"Rich chocolate cake slice.", ingredients:[{name:"Cocoa",type:"sweet"},{name:"Flour",type:"grain"}], foodType:"Cake" },
    { name:"Lemon Cake", image:"assets/imgs/initialItemImgs/item42.jpg", price:4.59, description:"Bright lemon-flavored cake.", ingredients:[{name:"Lemon",type:"fruit"}], foodType:"Cake" },

    { name:"Apple Pie Slice", image:"assets/imgs/initialItemImgs/item43.jpg", price:4.29, description:"Warm apple pie slice.", ingredients:[{name:"Apples",type:"fruit"},{name:"Crust",type:"grain"}], foodType:"Pie" },
    { name:"Cherry Pie Slice", image:"assets/imgs/initialItemImgs/item44.jpg", price:4.49, description:"Sweet cherry pie slice.", ingredients:[{name:"Cherries",type:"fruit"}], foodType:"Pie" },
    { name:"Blueberry Pie Slice", image:"assets/imgs/initialItemImgs/item45.jpg", price:4.59, description:"Fresh blueberry pie slice.", ingredients:[{name:"Blueberries",type:"fruit"}], foodType:"Pie" },

    { name:"Vanilla Ice Cream Cup", image:"assets/imgs/initialItemImgs/item46.jpg", price:2.99, description:"Frozen vanilla dessert cup.", ingredients:[{name:"Milk",type:"dairy"},{name:"Sugar",type:"sweetener"}], foodType:"Frozen" },
    { name:"Strawberry Ice Pop", image:"assets/imgs/initialItemImgs/item47.jpg", price:1.99, description:"Frozen strawberry pop.", ingredients:[{name:"Strawberry",type:"fruit"}], foodType:"Frozen" },
    { name:"Chocolate Ice Cream Cup", image:"assets/imgs/initialItemImgs/item48.jpg", price:2.99, description:"Frozen chocolate dessert cup.", ingredients:[{name:"Cocoa",type:"sweet"}], foodType:"Frozen" },

    { name:"Kids Chicken Nuggets", image:"assets/imgs/initialItemImgs/item49.jpg", price:6.49, description:"Crispy chicken nuggets for kids.", ingredients:[{name:"Chicken",type:"meat"}], foodType:"Kids Menu" },
    { name:"Kids Mini Burger", image:"assets/imgs/initialItemImgs/item50.jpg", price:6.99, description:"Small beef burger with fries.", ingredients:[{name:"Beef",type:"meat"},{name:"Bun",type:"grain"}], foodType:"Kids Menu" },
    // { name:"Macaroni & One Side", image:"assets/imgs/initialItemImgs/item51.jpg", price:7.99, description:"Creamy macaroni with a side.", ingredients:[{name:"Pasta",type:"grain"},{name:"Cheese Sauce",type:"sauce"}], foodType:"Kids Menu" }    
];

// ===============================
// CREATE PRODUCTS ON FIRST RUN
// ===============================
function createProducts() {
    return new Promise((resolve, reject) => {
        const txProducts = db.transaction(["products"], "readwrite");
        const storeProducts = txProducts.objectStore("products");

        const getAllReq = storeProducts.getAll();
        getAllReq.onsuccess = () => {
            if (getAllReq.result.length > 0) {
                resolve();
                return;
            }

            const existingKeys = new Set();
            rawItems.forEach(item => {
                const keyText = generateKeyText(item.name, existingKeys);
                existingKeys.add(keyText);
                console.log(item);
                
                const menuItem = new MenuItem({ 
                    ...item, 
                    keyText
                });
                storeProducts.add(menuItem);
            });
        };

        getAllReq.onerror = reject;
        txProducts.oncomplete = () => resolve();
        txProducts.onerror = reject;
    });
}

//change 12/6
function changeLoginText() {
    return new Promise((resolve, reject) => {
        const txG = db.transaction(["currentUser"], "readonly");
        const storeG = txG.objectStore("currentUser");
        const reqG = storeG.getAll();
        
        reqG.onsuccess = () => {
            const result = reqG.result;
            const guestUser = result.find(user => user.username === "guest");
            if (guestUser) {
                resolve(guestUser);
            } else {
                resolve();
            }
        };
        reqG.onerror = () => reject(reqG.error);
    });
}

function guestLoading() {
    return new Promise((resolve, reject) => {
        const txWrite = db.transaction(["currentUser"], "readwrite");
        const storeWrite = txWrite.objectStore("currentUser");
        const guestUser = {
            id: 1, 
            username: "guest", 
            userId: 1,
            cart: []
        };
        
        const request = storeWrite.put(guestUser);
        
        request.onsuccess = () => resolve();
        request.onerror = (error) => reject(error);
    });
}

// ===================================================
// ============ USER + CART SYNC LOGIC ===============
// ===================================================
let currentUserId = null;
let userAccount = null;

let items = []; // will mirror userAccount.cart

// NEW: Properly load items from currentUser
function loadItemsFromCurrentUser() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(["currentUser"], "readonly");
        const store = tx.objectStore("currentUser");
        const request = store.get(1); // Get current user (id: 1)

        request.onsuccess = () => {
            const currentUser = request.result;
            if (currentUser && currentUser.cart) {
                items = [...currentUser.cart];
                console.log("Loaded items from currentUser:", items);
            } else {
                items = [];
                console.log("No cart found in currentUser, using empty array");
            }
            resolve(items);
        };
        
        request.onerror = (event) => {
            console.error("Error fetching currentUser cart:", event.target.error);
            items = [];
            reject(event.target.error);
        };
    });
}

// FIXED: Properly load user account
function loadCurrentUserFromDB() {
    return new Promise((resolve, reject) => {
        // STEP 1 – get logged-in user reference
        const txCU = db.transaction(["currentUser"], "readonly");
        const storeCU = txCU.objectStore("currentUser");
        const reqCU = storeCU.get(1);

        reqCU.onsuccess = () => {
            const currentUser = reqCU.result;
            
            if (!currentUser) {
                // Create a default current user if none exists
                const defaultUser = { 
                    id: 1, 
                    username: "guest", 
                    userId: 1,
                    cart: [] 
                };
                
                const txWrite = db.transaction(["currentUser"], "readwrite");
                const storeWrite = txWrite.objectStore("currentUser");
                const putReq = storeWrite.put(defaultUser);
                
                putReq.onsuccess = () => {
                    userAccount = defaultUser;
                    items = [];
                    console.log("Created default guest user");
                    resolve();
                };
                
                putReq.onerror = reject;
                return;
            }

            // STEP 2 – load full user account from "users" using username
            const txU = db.transaction(["users"], "readonly");
            const storeU = txU.objectStore("users");
            const reqU = storeU.getAll();

            reqU.onsuccess = () => {
                const allUsers = reqU.result;
                
                // Find the user by username (not by userId=1)
                userAccount = allUsers.find(user => user.username === currentUser.username);
                
                if (!userAccount) {
                    console.warn("User account not found for username:", currentUser.username);
                    // Use currentUser as fallback
                    userAccount = currentUser;
                }

                // Load cart from userAccount
                items = [...(userAccount.cart || [])];
                console.log("Loaded cart from userAccount:", items);
                resolve();
            };

            reqU.onerror = reject;
        };

        reqCU.onerror = reject;
    });
}

// Save cart updates to both USERS and currentUser DB
function saveCartToUserDB() {
    return new Promise((resolve, reject) => {
        if (!userAccount) {
            console.error("User account not loaded, cannot save cart");
            return reject("User not loaded.");
        }

        // Update userAccount cart
        userAccount.cart = items;

        // Save to users store
        const tx = db.transaction(["users", "currentUser"], "readwrite");
        const usersStore = tx.objectStore("users");
        const currentUserStore = tx.objectStore("currentUser");

        // Save to users
        const putUserReq = usersStore.put(userAccount);
        
        putUserReq.onsuccess = () => {
            // Also update currentUser store
            const getCurrentUserReq = currentUserStore.get(1);
            
            getCurrentUserReq.onsuccess = () => {
                const currentUser = getCurrentUserReq.result || { id: 1 };
                currentUser.cart = items;
                if (userAccount.username) currentUser.username = userAccount.username;
                if (userAccount.userId) currentUser.userId = userAccount.userId;
                
                const putCurrentUserReq = currentUserStore.put(currentUser);
                
                putCurrentUserReq.onsuccess = () => {
                    console.log("Cart saved to both users and currentUser");
                    resolve();
                };
                
                putCurrentUserReq.onerror = reject;
            };
            
            getCurrentUserReq.onerror = reject;
        };

        putUserReq.onerror = reject;
        
        tx.onerror = (event) => {
            console.error("Transaction error:", event);
            reject(event);
        };
    });
}

// ===============================
// LOAD MENU FROM PRODUCTS DB
// ===============================
function loadMenuItemsFromDB() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(["products"], "readonly");
        const store = tx.objectStore("products");
        const req = store.getAll();

        req.onsuccess = () => resolve(req.result);
        req.onerror = reject;
    });
}

// ===============================
// ADD TO CART FUNCTION (Updated for compatibility)
// ===============================
function addToCart(product) {
    if (!product) {
        console.error("No product to add to cart");
        return;
    }
    
    const creation = new CartItem(
        product.name, 
        product.image, 
        product.price, 
        product.keyText
    );

    let existing = items.find(i => i.keyText === creation.keyText);

    if (existing) {
        existing.quantity = (existing.quantity || 1) + 1;
    } else {
        items.push({
            ...creation,
            quantity: 1,
            productId: product.productId
        });
    }

    console.log("Added to cart, new items:", items);
    
    saveCartToUserDB().then(() => {
        renderCart();
        renderReceipt();
    }).catch(error => {
        console.error("Failed to save cart:", error);
    });
}

// ===============================
// MENU RENDERING
// ===============================
async function loadMenuItems() {
    const menuItems = await loadMenuItemsFromDB();
    const cold = document.getElementById("drop-cold");
    const hot = document.getElementById("drop-hot");
    const starter = document.getElementById("drop-starter");
    const soup = document.getElementById("drop-soup");
    const pasta = document.getElementById("drop-pasta");
    const burger = document.getElementById("drop-burger");
    const chicken = document.getElementById("drop-chicken");
    const beef = document.getElementById("drop-beef");
    const seafood = document.getElementById("drop-seafood");
    const potatoe = document.getElementById("drop-potatoes");
    const vegetable = document.getElementById("drop-vegetable");
    const bread = document.getElementById("drop-bread");
    const salad = document.getElementById("drop-salad");
    const cake = document.getElementById("drop-cake");
    const pie = document.getElementById("drop-pie");
    const frozen = document.getElementById("drop-frozen");
    const kids = document.getElementById("drop-kids");
    
    // Clear existing items
    [cold, hot, starter, soup, pasta, burger, chicken, beef, seafood, potatoe, vegetable, bread, salad, cake, pie, frozen, kids].forEach(container => {
        if (container) container.innerHTML = "";
    });

    // Store globally for access in event handlers
    window.loadedMenuItems = menuItems;

    menuItems.forEach((item, index) => {
        const card = document.createElement("div");
        card.classList.add("menu-card");
        card.dataset.keyText = item.keyText;
        card.dataset.index = index;

        card.innerHTML = `
            <img src="${item.image}" alt="${item.name}">
            <div class="menu-card-content">
                <div class="menu-card-title">${item.name}</div>
                <div class="menu-card-desc">${item.description}</div>
                <div class="menu-card-price">$${item.price.toFixed(2)}</div>
                <div class="menu-card-ingredients">
                    ${item.ingredients.map(i => `<span>${i.name || i}</span>`).join("")}
                </div>
                <button class="add-btn" data-index="${index}">Add to Cart</button>
            </div>
        `;

        const container = getContainerByFoodType(item.foodType, {
            cold, hot, starter, soup, pasta, burger, chicken, beef, seafood, 
            potatoe, vegetable, bread, salad, cake, pie, frozen, kids
        });
        
        if (container) {
            container.appendChild(card);
        }
    });

    // Now attach event handlers
    attachCardClickHandlers(menuItems);
    attachAddToCartBtns(menuItems);
}

function getContainerByFoodType(foodType, containers) {
    switch(foodType) {
        case "Cold": return containers.cold;
        case "Hot": return containers.hot;
        case "Starter": return containers.starter;
        case "Soup": return containers.soup;
        case "Pasta": return containers.pasta;
        case "Burger": return containers.burger;
        case "Chicken": return containers.chicken;
        case "Beef": return containers.beef;
        case "Seafood": return containers.seafood;
        case "Potatoe": return containers.potatoe;
        case "Vegetable": return containers.vegetable;
        case "Bread": return containers.bread;
        case "Salad": return containers.salad;
        case "Cake": return containers.cake;
        case "Pie": return containers.pie;
        case "Frozen": return containers.frozen;
        case "Kids Menu": return containers.kids;
        default: return containers.kids; // fallback
    }
}

function attachCardClickHandlers(menuItems) {
    const cardSections = document.querySelectorAll(".menu-card");

    cardSections.forEach(card => {
        card.addEventListener("click", e => {
            if (e.target.classList.contains("add-btn")) return;
            
            const index = card.dataset.index;
            const menuItem = menuItems[index];
            
            if (menuItem) {
                // Save the selected item to targetItem store
                const tx = db.transaction(["targetItem"], "readwrite");
                const store = tx.objectStore("targetItem");
                
                // CORRECT: The object must have targetItemId as per the store's keyPath
                const targetItemData = { 
                    targetItemId: 1,  // This is REQUIRED - matches the keyPath
                    keyText: menuItem.keyText
                };
                
                const request = store.put(targetItemData);
                
                request.onsuccess = () => {
                    console.log("Target item saved, redirecting...");
                    // Redirect to item template page
                    window.location.href = "itemTemplate.html";
                };
                
                request.onerror = (error) => {
                    console.error("Failed to save target item:", error);
                    alert("Failed to load item details. Please try again.");
                };
            }
        });
    });
}

function attachAddToCartBtns(menuItems) {
    document.querySelectorAll(".add-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            e.stopPropagation(); // Prevent card redirect click
            const index = btn.dataset.index;
            const targetItem = menuItems[index];

            if (targetItem) {
                // Fancy Added to Cart feedback
                const originalText = btn.innerText;
                btn.disabled = true;
                btn.classList.add("added");
                btn.innerText = "Added ✓";

                addToCart(targetItem);

                setTimeout(() => {
                    btn.disabled = false;
                    btn.classList.remove("added");
                    btn.innerText = originalText;
                }, 1000);
            }
        });
    });
}

// ===============================
// CART + RECEIPT SYSTEM
// ===============================
function renderCart() {
    const cartContainer = document.getElementById("cartItems");
    if (!cartContainer) {
        console.log("Cart container not found, skipping render");
        return; // Only render if element exists
    }
    
    cartContainer.innerHTML = "";

    if (!items || items.length === 0) {
        cartContainer.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
        return;
    }

    items.forEach((item, index) => {
        const row = document.createElement("div");
        row.classList.add("cart-row");
        
        row.innerHTML = `
            <div class="cart-left">
                <span class="cart-name">${item.name}</span>
                <input type="number" class="qty-input" value="${item.quantity || 1}" min="1" data-index="${index}">
                <span class="cart-price">$${((item.quantity || 1) * item.price).toFixed(2)}</span>
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
            const index = parseInt(e.target.dataset.index);
            const val = Math.max(1, parseInt(e.target.value) || 1);

            if (items[index]) {
                items[index].quantity = val;

                saveCartToUserDB().then(() => {
                    renderCart();
                    renderReceipt();
                }).catch(error => {
                    console.error("Failed to save quantity change:", error);
                });
            }
        });
    });

    document.querySelectorAll(".remove-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            const index = parseInt(e.target.dataset.index);
            
            if (items[index]) {
                items.splice(index, 1);

                saveCartToUserDB().then(() => {
                    renderCart();
                    renderReceipt();
                }).catch(error => {
                    console.error("Failed to remove item:", error);
                });
            }
        });
    });
}

function renderReceipt() {
    const container = document.getElementById("receiptItems");
    if (!container) {
        console.log("Receipt container not found, skipping render");
        return; // Only render if element exists
    }
    
    container.innerHTML = "";

    if (!items || items.length === 0) {
        const subtotalEl = document.getElementById("subtotal");
        const taxEl = document.getElementById("tax");
        const totalEl = document.getElementById("total");
        
        if (subtotalEl) subtotalEl.textContent = "0.00";
        if (taxEl) taxEl.textContent = "0.00";
        if (totalEl) totalEl.textContent = "0.00";
        return;
    }

    let subtotal = 0;

    items.forEach(item => {
        const row = document.createElement("div");
        const quantity = item.quantity || 1;
        const itemTotal = (item.price || 0) * quantity;
        
        row.innerHTML = `
            <span>${item.name} (x${quantity})</span>
            <span>$${itemTotal.toFixed(2)}</span>
        `;

        container.appendChild(row);
        subtotal += itemTotal;
    });

    const tax = subtotal * 0.07;
    const total = subtotal + tax;

    const subtotalEl = document.getElementById("subtotal");
    const taxEl = document.getElementById("tax");
    const totalEl = document.getElementById("total");
    
    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `$${tax.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
}

// ===============================
// FINAL INITIALIZATION
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM loaded, initializing...");
    
    openDB()
        .then(() => {
            console.log("Database opened, loading user...");
            // Load user and cart first
            return loadCurrentUserFromDB();
        })
        .then(() => {
            console.log("User loaded, items:", items);
            // Now load menu
            return loadMenuItems();
        })
        .then(() => {
            console.log("Menu loaded, rendering cart and receipt...");
            // Now render cart and receipt with loaded items
            renderCart();
            renderReceipt();
        })
        .catch(error => {
            console.error("Failed to initialize:", error);
        });

    // ======= DROPDOWN BUTTON LOGIC =======
    document.querySelectorAll(".dropdown-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const dropdown = btn.parentElement;
            dropdown.classList.toggle("open");
        });
    });

    // ============================
    //      PURCHASE BUTTON
    // ============================
    const purchaseBtn = document.getElementById("purchaseBtn");

    if (purchaseBtn) {
        purchaseBtn.addEventListener("click", async () => {
            // STOP EMPTY CART PURCHASES
            if (!items || items.length === 0) {
                alert("Your cart is empty.");
                return;
            }

            // BUILD RECEIPT SNAPSHOT
            const subtotal = items.reduce(
                (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
                0
            );

            const tax = +(subtotal * 0.07).toFixed(2);//the plus sign acts like "Number(String)" 
            const total = +(subtotal + tax).toFixed(2);

            const receipt = {
                date: new Date().toISOString(),
                items: items.map(it => ({//this is an array of items that holds:
                    name: it.name,//item name
                    price: it.price,//item price per item
                    quantity: it.quantity || 1,//quantity of item
                    lineTotal: +(it.price * (it.quantity || 1)).toFixed(2)//total cost of the quantity of the respective item
                })),
                subtotal: +subtotal.toFixed(2),
                tax,
                total,
                purchased: false  // Mark as unpurchased - needs customer details
            };

            // SAVE TO LOCALSTORAGE FOR RECEIPT PAGE
            localStorage.setItem("checkoutReceipt", JSON.stringify(receipt));

            // CLEAR CART IN MEMORY
            items = [];

            try {
                // SAVE EMPTY CART TO DB
                await saveCartToUserDB();

                // Re-render cart and receipt to show empty state
                renderCart();
                renderReceipt();

                // REDIRECT TO RECEIPT PAGE
                window.location.href = "receipt.html";
                
            } catch (err) {
                console.error("Error clearing cart:", err);
                alert("There was an error processing your purchase. Please try again.");
            }
        });
    }
});

function addReciptToUser() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(["users", "currentUser"], "readwrite");
        const usersStore = tx.objectStore("users");
        const currentUserStore = tx.objectStore("currentUser");

        // Must explicitly request data
        const cuReq = currentUserStore.get(1);

        cuReq.onsuccess = () => {
            const currentUser = cuReq.result;
            if (!currentUser) return reject("No current user");

            const usersReq = usersStore.getAll();

            usersReq.onsuccess = () => {
                const allUsers = usersReq.result;
                const desiredUser = allUsers.find(u => u.username === currentUser.username);

                console.log("User found:", desiredUser);

                resolve(desiredUser);
            };

            usersReq.onerror = () => reject(usersReq.error);
        };

        cuReq.onerror = () => reject(cuReq.error);
    });
}

function displayAdminBtnFN(){
    return new Promise((resolve, reject) => {
        const tx = db.transaction(["currentUser"], "readonly");
        const store = tx.objectStore("currentUser");
        const req = store.get(1);
        
        req.onsuccess = () =>{
            const currentUser = req.result;
            resolve(currentUser);
        };
        
        req.onerror = () => reject(req.error);
    });
}

function timeStart() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(["timer"], "readwrite");
        const store = tx.objectStore("timer");

        const req = store.get(1);

        req.onsuccess = () => {
            const result = req.result;
            resolve({store, result});
        };
        req.onerror = () => reject(req.error);
    });
}

// ===============================
// MARK FIRST RUN EXECUTION
// ===============================
openDB().then(() => {
    console.log("Database ready for first run setup");
    
    timeStart().then(({store, result}) =>{
        if (!result) {
            const tx = db.transaction(["timer"], "readwrite");
            const store = tx.objectStore("timer");

            const req = store.add({currentTime: performance.now(), timeId: 1});

            req.onsuccess = () => {console.log("Time added sucessfully")};
            req.onerror = () => {console.log("Time addition error")};
        } else {
            console.log("timer already started");
        }
    }).catch(error => {
        console.error("Error starting timer:", error);
    })
    // Create admin account on startup
    createAdminOnStartup().then(() => {
        console.log("Admin initialization complete");
    }).catch(err => {
        console.error("Admin creation error:", err);
    });

    displayAdminBtnFN().then((currentUser) => {
        const adminBtn = document.getElementById("adminBtn");
        console.log("Current user for admin check:", currentUser);
        if (adminBtn) {
            if (currentUser && currentUser.isAdmin) {
                adminBtn.style.display = "block";
            } else {
                adminBtn.style.display = "none"; 
            }
        }
    }).catch(error => {
        console.error("Error checking admin status:", error);
        const adminBtn = document.getElementById("adminBtn");
        if (adminBtn) adminBtn.style.display = "none";
    });
    
    const tx = db.transaction(["createFirstMenuList"], "readwrite");
    const store = tx.objectStore("createFirstMenuList");
    const req = store.get(1);

    req.onsuccess = () => {
        if (!req.result) {
            console.log("First run detected, creating products and guest user...");
            createProducts().then(() => console.log("Products created."));
            
            const guestUser = {
                id: 1, 
                username: "guest", 
                userId: 1,
                cart: [],
            };
            
            const txCurrentUser = db.transaction(["currentUser"], "readwrite");
            const storeCurrentUser = txCurrentUser.objectStore("currentUser");
            const putCurrentUser = storeCurrentUser.put(guestUser);
            
            putCurrentUser.onsuccess = () => {
                console.log("CurrentUser set to guest");
            };
            
            putCurrentUser.onerror = (error) => {
                console.error("Error setting currentUser to guest:", error);
            };
            
            store.add({ runId: 1, check: true });
        } else {
            console.log("Not first run, skipping product creation");
        }
    };

    req.onerror = () => console.error("Failed to check first run.");

    // Handle login text and button states
    changeLoginText().then((result) => {
        const loginBtn = document.getElementById("log-in");
        const ordersBtn = document.getElementById("goPastOrdersBtn");
        
        if (loginBtn) {
            if (result) { //result only happens if there is a guest account
                if (ordersBtn) ordersBtn.style.display = "none";
                loginBtn.innerText = "LOGIN";
                loginBtn.onclick = () => window.location.href='sign.html';
                console.log("User is guest");
            } else { // the user is logged in / registered
                if (ordersBtn) ordersBtn.style.display = "block";
                console.log("user is logged in");
                loginBtn.innerText = "LOG OUT";       
                loginBtn.onclick = () => {
                    const check = confirm("Confirm that you want to log out of your account.");
                    console.log(check);
                    if (check) {
                        // Set currentUser to guest
                        guestLoading().then(() => {
                            console.log("Logged out, set to guest");
                            window.location.reload();
                        }).catch(error => {
                            console.error("Error logging out:", error);
                            alert("Failed to logout. Please try again.");
                        });
                    } else {
                        alert("Log out canceled, you may continue your shopping experience");
                        return;
                    }
                };
            }
        }
    }).catch(error => {
        console.error("Error checking login status:", error);
    });
});