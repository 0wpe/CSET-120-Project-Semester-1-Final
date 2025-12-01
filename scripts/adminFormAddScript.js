//loading issue needs fix but lowkey pretty nice

let db;


const request = indexedDB.open("StoreDB", 1);
request.onupgradeneeded = (event) => {
    const db = event.target.result;
    console.log("Upgrading StoreDB…");
    
    if (!db.objectStoreNames.contains("users")) {
        db.createObjectStore("users", {
            keyPath: "userId",
            autoIncrement: true
        });
        console.log("user store made");
        
    }
    
    if (!db.objectStoreNames.contains("currentUser")) {
        db.createObjectStore("currentUser", {
            keyPath: "id"
        });
        console.log("current user store made");                
    }
    if (!db.objectStoreNames.contains("products")) {
        db.createObjectStore("products", {
            keyPath: "productId",
            autoIncrement: true
        });
        console.log("product store made");
    }
    if (!db.objectStoreNames.contains("images")) {
        db.createObjectStore("images", {
            keyPath: "imageId",
            autoIncrement: true
        });
        console.log("images store made");
    }
    
};

request.onsuccess = function (event) {
    db = event.target.result;
    console.log("Database opened successfully");
    try {
    loadImages();
    } catch(error){

    }

};

request.onerror = function () {
    console.error("Database failed to open");
};


const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");

dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "blue";
});

dropZone.addEventListener("dragleave", () => {
    dropZone.style.borderColor = "#aaa";
});

dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "green";


    const file = e.dataTransfer.files[0];
    if (!file) return;

        // Only accept image files
    if (!file.type.startsWith("image/")) {
        alert("Please drop a valid image file (PNG, JPG, etc).");
        return;
    }

    const transaction = db.transaction(["images"], "readonly"); 
    const store = transaction.objectStore("images");

    const request = store.getAll();

    request.onsuccess = function () {
        const images = request.result;
        try {
            if (images.length > 0) {
                alert("You already have an image"); 
                return;
            } else {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);

                saveImageToDB(file);
            }
        } catch (error) {
            console.log("No image url available");
        }
    }

});

function saveImageToDB(file) {
    const reader = new FileReader(); 
    

    reader.onload = function (event) {
        const base64data = event.target.result; 

        const transaction = db.transaction(["images"], "readwrite");
        const store = transaction.objectStore("images");

        store.add({
            image: base64data 

        });
        console.log("Item added"); 
        transaction.oncomplete = loadImages;
    };

    reader.readAsDataURL(file); 
    
}

function loadImages() {
    
    const gallery = document.getElementById("gallery");
    gallery.innerHTML = "";
    const transaction = db.transaction(["images"], "readonly"); 
    const store = transaction.objectStore("images");
    
    const request = store.getAll();

    request.onsuccess = function () {
        const images = request.result;
        if (images.length === 0) {
            console.log("No images in DB");
            return;
        }

        images.forEach((item) => {
            console.log("Loaded image object:", item);
            
            const container = document.createElement("div");
            container.style.display = "inline-block";
            container.style.margin = "10px";
            container.style.textAlign = "center";

            const img = document.createElement("img");
            img.src = item.image ;
            img.style.width = "150px";
            img.style.border = "1px solid #aaa";
            img.style.borderRadius = "6px";

            const btn = document.createElement("button");
            btn.textContent = "Delete";
            btn.type = "button";
            btn.style.marginTop = "5px";
            btn.onclick = () => deleteImage(item.imageId);

            container.appendChild(img);
            container.appendChild(btn);
            gallery.appendChild(container);
        });
    };
}


function deleteImage(imageId) {
    const transaction = db.transaction(["images"], "readwrite");
    const store = transaction.objectStore("images");
    store.delete(imageId);

    transaction.oncomplete = loadImages;
}

function addToCart(product) {
    const tx = db.transaction(["currentUser"], "readwrite");
    const store = tx.objectStore("currentUser");

    const req = store.get(1); // the only record

    req.onsuccess = () => {
        const user = req.result;

        if (!user.cart) user.cart = [];

        // prevent duplicates:
        const exists = user.cart.some(item => item.id === product.id);
        if (!exists) {
            user.cart.push(product);
        }

        store.put(user);
    };
}

function addProductToDB(productObj) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject("Database is not initialized.");
            return;
        }

        // FIRST transaction: read all products
        const readTx = db.transaction(["products"], "readonly");
        const readStore = readTx.objectStore("products");

        const getAllReq = readStore.getAll();

        getAllReq.onsuccess = () => {
            const products = getAllReq.result;

            const exists = products.some(
                p =>
                    p.title.trim().toLowerCase() ===
                    productObj.title.trim().toLowerCase()
            );

            if (exists) {
                alert("A product with this title already exists!");
                reject("Duplicate product");
                return;
            }

            // SECOND transaction: add the new product
            const writeTx = db.transaction(["products"], "readwrite");
            const writeStore = writeTx.objectStore("products");

            const addReq = writeStore.add(productObj);

            addReq.onsuccess = () => {
                console.log("Product added:", productObj);
                resolve(addReq.result);
            };

            addReq.onerror = (event) => {
                reject(event.target.error);
            };
            
        };

        const transaction = db.transaction(["images"], "readwrite");
        const store = transaction.objectStore("images");
        
        const request = store.getAll();

        getAllReq.onerror = () => {
            reject("Error reading products");
        };
        request.onsuccess = function () {
        const images = request.result;
        if (images.length === 0) {
            console.log("No images in DB");
            return;
        }

        images.forEach((item) => {
            console.log("Loaded image object:", item);
            deleteImage(item.imageId);
        });
    };
    
    transaction.oncomplete = loadImages;
    });
}

function removeIMG(request) {
    request.onsuccess = function () {
    const images = request.result;

    images.forEach((item) => {
        console.log("Loaded image object:", item);
        console.log(item.imageId);
        
        deleteImage(item.imageId);
    });
    };
}

let title = document.getElementById("itemTitle");
let description = document.getElementById("itemDescription");
let price = document.getElementById("itemPrice");
let fileForm = document.getElementById("fileInput");
let itemForm = document.getElementById("itemForm");

itemForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const transaction = db.transaction(["images"], "readwrite");
    const store = transaction.objectStore("images");
    const request = store.getAll();

    const priceValue = price.value.trim();

    // Validation for price
    if (isNaN(priceValue)) {
        alert("Price must be a valid number.");
        removeIMG(request);
        return;
    }

    const priceNumber = Number(priceValue);

    if (priceNumber < 0) {
        alert("Price must not be negative.");
        removeIMG(request);
        return;
    }

    if (!/^\d+(\.\d{1,2})?$/.test(priceValue)) {
        alert("Price can only have up to 2 decimal places.");
        removeIMG(request);
        return;
    }

    request.onsuccess = function () {
        const images = request.result;

        if (images.length === 0) {
            alert("No image stored!");
            return;
        }

        const imgData = images[0].image;

        console.log("Image for product:", imgData);
        console.log("Title:", title.value);

        // Build item object
        const newProduct = {
            title: title.value,
            description: description.value,
            price: price.value,
            image: imgData
        };

        console.log("Product ready:", newProduct);
        
        // Save product to DB
        addProductToDB(newProduct).then((id) => {
            console.log("Saved with productId:", id);
        });
        //.then() is done becuase the system has to wait for the changes to happen becuase like always indexedDB happpens in the background so .then foces it to wait for the changes


        

    };
        title.innerText = "";
        description.innerText = "";
        price.innerText = "";
});

