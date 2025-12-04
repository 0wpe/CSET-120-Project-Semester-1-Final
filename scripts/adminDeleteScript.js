let db;

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
            if (!upgradeDB.objectStoreNames.contains("createFirstMenuList")) {
                upgradeDB.createObjectStore("createFirstMenuList", { keyPath: "runId" });
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

const container = document.getElementById("container");


function deleteProduct(productId) {
    const tx = db.transaction(["products"], "readwrite");
    const store = tx.objectStore("products");
    const deleteReq = store.delete(productId);

    deleteReq.onsuccess = () => {
        console.log("Deleted product:", productId);
        location.reload(); // reload when finished
    };

    deleteReq.onerror = (err) => {
        console.error("Failed to delete product:", err);
    };
}


openDB().then(() => {
    const tx = db.transaction(["products"], "readonly");
    const store = tx.objectStore("products");
    const req = store.getAll();

    req.onsuccess = () => {
        const products = req.result;

        products.forEach(product => {
            // Parent div for each product
            const itemDiv = document.createElement("div");
            itemDiv.style.border = "1px solid gray";
            itemDiv.style.padding = "10px";
            itemDiv.style.margin = "10px 0";
            itemDiv.style.borderRadius = "8px";
            itemDiv.style.display = "flex";
            itemDiv.style.justifyContent = "space-between";
            itemDiv.style.alignItems = "center";
            itemDiv.style.backgroundColor = "#f8f8f8";

            // Product text info
            const textDiv = document.createElement("div");
            textDiv.innerHTML = `
                <strong>${product.name}</strong><br>
                Price: $${product.price}
            `;

            // Delete button
            const delBtn = document.createElement("button");
            delBtn.textContent = "Delete Item";
            delBtn.style.padding = "6px 12px";
            delBtn.style.cursor = "pointer";
            delBtn.style.backgroundColor = "#d9534f";
            delBtn.style.color = "white";
            delBtn.style.border = "none";
            delBtn.style.borderRadius = "5px";

            delBtn.onclick = () => {
                deleteProduct(product.productId);
            };

            // Assemble div
            itemDiv.appendChild(textDiv);
            itemDiv.appendChild(delBtn);

            container.appendChild(itemDiv);
        });
    };

    req.onerror = (err) => {
        console.error("Error loading products:", err);
    };
});
