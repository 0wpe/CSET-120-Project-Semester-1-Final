// delScript.js - Updated to work with menuScript.js context

// IndexedDB integration (will reuse the same db from menuScript)
let db;

// UI Elements
let itemsGrid, emptyState, loadingIndicator, selectedCountEl, bulkDeleteBtn, emptyStateText, addItemLink;
let selectedItems = new Set();

// Food type mapping from menuScript
const foodTypeMapping = {
    'Cold': 'Cold',
    'Hot': 'Hot', 
    'Starter': 'Starter',
    'Soup': 'Soup',
    'Pasta': 'Pasta',
    'Burger': 'Burger',
    'Chicken': 'Chicken',
    'Beef': 'Beef',
    'Seafood': 'Seafood',
    'Potatoe': 'Potatoe',
    'Vegetable': 'Vegetable',
    'Bread': 'Bread',
    'Salad': 'Salad',
    'Cake': 'Cake',
    'Pie': 'Pie',
    'Frozen': 'Frozen',
    'Kids Menu': 'Kids Menu'
};

// Default images for different food types (using relative paths)
const defaultImages = {
    'Cold': 'assets/imgs/default-cold.jpg',
    'Hot': 'assets/imgs/default-hot.jpg',
    'Starter': 'assets/imgs/default-starter.jpg',
    'Soup': 'assets/imgs/default-soup.jpg',
    'Pasta': 'assets/imgs/default-pasta.jpg',
    'Burger': 'assets/imgs/default-burger.jpg',
    'Chicken': 'assets/imgs/default-chicken.jpg',
    'Beef': 'assets/imgs/default-beef.jpg',
    'Seafood': 'assets/imgs/default-seafood.jpg',
    'Potatoe': 'assets/imgs/default-potato.jpg',
    'Vegetable': 'assets/imgs/default-vegetable.jpg',
    'Bread': 'assets/imgs/default-bread.jpg',
    'Salad': 'assets/imgs/default-salad.jpg',
    'Cake': 'assets/imgs/default-cake.jpg',
    'Pie': 'assets/imgs/default-pie.jpg',
    'Frozen': 'assets/imgs/default-frozen.jpg',
    'Kids Menu': 'assets/imgs/default-kids.jpg'
};

function openDB() {
    return new Promise((resolve, reject) => {
        // Use the same database as menuScript
        const request = indexedDB.open("StoreDB", 1);

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log("Database opened successfully from delScript");
            resolve(db);
        };

        request.onerror = () => {
            console.error("Database failed to open");
            reject("Database error");
        };
    });
}

function deleteProduct(productId) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(["products"], "readwrite");
        const store = tx.objectStore("products");
        const deleteReq = store.delete(productId);

        deleteReq.onsuccess = () => {
            console.log("Deleted product:", productId);
            resolve(productId);
        };

        deleteReq.onerror = (err) => {
            console.error("Failed to delete product:", err);
            reject(err);
        };
    });
}

function deleteMultipleProducts(productIds) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(["products"], "readwrite");
        const store = tx.objectStore("products");
        let completed = 0;
        let errors = [];

        productIds.forEach(productId => {
            const deleteReq = store.delete(productId);
            
            deleteReq.onsuccess = () => {
                completed++;
                if (completed === productIds.length) {
                    if (errors.length > 0) {
                        reject(errors);
                    } else {
                        resolve(productIds.length);
                    }
                }
            };

            deleteReq.onerror = (err) => {
                errors.push({ productId, error: err });
                completed++;
                if (completed === productIds.length) {
                    if (errors.length > 0) {
                        reject(errors);
                    } else {
                        resolve(productIds.length);
                    }
                }
            };
        });
    });
}

function getAllProducts() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(["products"], "readonly");
        const store = tx.objectStore("products");
        const req = store.getAll();

        req.onsuccess = () => {
            // Transform data to match menuScript structure
            const products = req.result.map(item => ({
                productId: item.productId,
                name: item.name,
                image: item.image,
                description: item.description,
                price: item.price,
                ingredients: item.ingredients || [],
                foodType: item.foodType || 'Uncategorized',
                keyText: item.keyText || generateKeyText(item.name)
            }));
            resolve(products);
        };

        req.onerror = (err) => {
            reject(err);
        };
    });
}

// Helper function from menuScript
function generateKeyText(name, existingKeys = new Set()) {
    const parts = name.trim().toLowerCase().split(/\s+/);
    const base = parts.length === 1 ? parts[0] : parts[0] + (parts[1] ? parts[1][0] : '');
    
    let key = base;
    let counter = 1;
    
    while (existingKeys.has(key)) {
        key = base + counter;
        counter++;
    }
    
    return key;
}

function getImageForProduct(product) {
    // Use product image if available
    if (product.image && product.image.startsWith('assets/')) {
        return product.image;
    }
    
    // Try to use default image based on foodType
    if (product.foodType && defaultImages[product.foodType]) {
        return defaultImages[product.foodType];
    }
    
    // Fallback to a generic default
    return getDefaultImage();
}

function getDefaultImage() {
    return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80';
}

function formatPrice(price) {
    if (!price) return '$0.00';
    
    if (typeof price === 'number') {
        return `$${price.toFixed(2)}`;
    }
    
    if (typeof price === 'string') {
        return price.startsWith('$') ? price : `$${parseFloat(price).toFixed(2)}`;
    }
    
    return '$0.00';
}

function updateSelectionUI() {
    selectedCountEl.textContent = selectedItems.size;
    bulkDeleteBtn.disabled = selectedItems.size === 0;
}

function setupEventListeners() {
    // Navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.classList.contains('active')) return;
            
            if (this.textContent === 'Add') {
                window.location.href = 'adminForm.html';
            }
        });
    });
    
    // Home button - update to match your actual home page
    const homeBtn = document.querySelector('.home-btn');
    if (homeBtn) {
        homeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = '../index.html';
        });
    }
    
    // Bulk delete button
    bulkDeleteBtn.addEventListener('click', handleBulkDelete);
}

async function handleBulkDelete() {
    if (selectedItems.size === 0) return;
    
    const productIds = Array.from(selectedItems);
    
    if (confirm(`Are you sure you want to delete ${selectedItems.size} item(s)? This action cannot be undone.`)) {
        try {
            bulkDeleteBtn.disabled = true;
            bulkDeleteBtn.textContent = "Deleting...";
            
            await deleteMultipleProducts(productIds);
            
            // Also remove from currentUser carts if they contain these items
            await removeFromAllUserCarts(productIds);
            
            // Remove selected items from UI
            selectedItems.clear();
            updateSelectionUI();
            
            // Reload products from database
            await loadProducts();
            
            alert(`${productIds.length} item(s) deleted successfully!`);
        } catch (error) {
            console.error("Error deleting items:", error);
            alert("Some items could not be deleted. Please try again.");
        } finally {
            bulkDeleteBtn.disabled = false;
            bulkDeleteBtn.textContent = "Delete Selected";
        }
    }
}

// Remove deleted items from all user carts
async function removeFromAllUserCarts(productIds) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(["users"], "readwrite");
        const store = tx.objectStore("users");
        const req = store.getAll();
        
        req.onsuccess = () => {
            const users = req.result;
            users.forEach(user => {
                if (user.cart && Array.isArray(user.cart)) {
                    // Filter out deleted items
                    user.cart = user.cart.filter(item => {
                        // Check if item has productId or keyText that matches deleted items
                        const itemKey = item.productId || item.keyText;
                        return !productIds.some(id => 
                            id === itemKey || id === item.productId
                        );
                    });
                    
                    // Update user in database
                    const updateTx = db.transaction(["users"], "readwrite");
                    const updateStore = updateTx.objectStore("users");
                    updateStore.put(user);
                }
            });
            resolve();
        };
        
        req.onerror = reject;
    });
}

async function loadProducts() {
    try {
        const products = await getAllProducts();
        
        // Hide loading indicator
        loadingIndicator.style.display = 'none';
        
        if (products.length === 0) {
            itemsGrid.style.display = 'none';
            emptyState.style.display = 'block';
            emptyStateText.textContent = "No items found in the database.";
            return;
        }
        
        emptyState.style.display = 'none';
        itemsGrid.style.display = 'grid';
        
        // Clear the grid
        itemsGrid.innerHTML = '';
        
        // Create item cards
        products.forEach(product => {
            const itemCard = document.createElement('div');
            itemCard.className = 'item-card';
            itemCard.dataset.id = product.productId;
            itemCard.dataset.keyText = product.keyText;
            
            const imageUrl = getImageForProduct(product);
            const price = formatPrice(product.price);
            const foodType = product.foodType || 'Uncategorized';
            
            itemCard.innerHTML = `
                <input type="checkbox" class="select-checkbox" data-id="${product.productId}">
                <img src="${imageUrl}" alt="${product.name}" class="item-image" onerror="this.src='${getDefaultImage()}'">
                <div class="item-details">
                    <div class="item-name">${product.name || 'Unnamed Item'}</div>
                    <div class="item-description">${product.description || 'No description available'}</div>
                    <div class="item-type">${foodType}</div>
                    <div class="item-price">${price}</div>
                    <div class="item-ingredients">
                        ${product.ingredients.map(ing => 
                            `<span class="ingredient-tag">${ing.name || ing}</span>`
                        ).join('')}
                    </div>
                    <button class="delete-btn" data-id="${product.productId}">Delete Item</button>
                </div>
            `;
            
            itemsGrid.appendChild(itemCard);
        });
        
        // Add event listeners to checkboxes
        document.querySelectorAll('.select-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const itemId = parseInt(this.dataset.id);
                
                if (this.checked) {
                    selectedItems.add(itemId);
                } else {
                    selectedItems.delete(itemId);
                }
                
                updateSelectionUI();
            });
        });
        
        // Add event listeners to delete buttons
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', handleSingleDelete);
        });
        
    } catch (error) {
        console.error("Error loading products:", error);
        loadingIndicator.style.display = 'none';
        emptyState.style.display = 'block';
        emptyStateText.textContent = "Error loading items from database.";
        addItemLink.textContent = "Retry";
        addItemLink.href = "#";
        addItemLink.onclick = (e) => {
            e.preventDefault();
            addItemLink.textContent = "Go to Add Items";
            addItemLink.href = "adminForm.html";
            loadData();
        };
    }
}

async function handleSingleDelete(event) {
    const button = event.target;
    const itemId = parseInt(button.dataset.id);
    const itemCard = button.closest('.item-card');
    const itemName = itemCard.querySelector('.item-name').textContent;
    
    if (confirm(`Are you sure you want to delete "${itemName}"? This action cannot be undone.`)) {
        try {
            button.disabled = true;
            button.textContent = "Deleting...";
            
            await deleteProduct(itemId);
            
            // Also remove from all user carts
            await removeFromAllUserCarts([itemId]);
            
            // Remove from selection if selected
            selectedItems.delete(itemId);
            updateSelectionUI();
            
            // Remove from UI
            itemCard.remove();
            
            // Show empty state if no items left
            if (document.querySelectorAll('.item-card').length === 0) {
                itemsGrid.style.display = 'none';
                emptyState.style.display = 'block';
            }
            
        } catch (error) {
            console.error("Error deleting item:", error);
            button.disabled = false;
            button.textContent = "Delete Item";
            alert("Failed to delete item. Please try again.");
        }
    }
}

async function loadData() {
    try {
        // Show loading indicator
        loadingIndicator.style.display = 'block';
        itemsGrid.style.display = 'none';
        emptyState.style.display = 'none';
        
        // Open database (will connect to the same one as menuScript)
        await openDB();
        
        // Load products
        await loadProducts();
        
    } catch (error) {
        console.error("Error loading data:", error);
        loadingIndicator.style.display = 'none';
        emptyState.style.display = 'block';
        emptyStateText.textContent = "Error loading items from database.";
        addItemLink.textContent = "Retry";
        addItemLink.href = "#";
        addItemLink.onclick = (e) => {
            e.preventDefault();
            addItemLink.textContent = "Go to Add Items";
            addItemLink.href = "adminForm.html";
            loadData();
        };
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI elements
    itemsGrid = document.getElementById("itemsGrid");
    emptyState = document.getElementById("emptyState");
    loadingIndicator = document.getElementById("loadingIndicator");
    selectedCountEl = document.getElementById("selectedCount");
    bulkDeleteBtn = document.getElementById("bulkDeleteBtn");
    emptyStateText = document.getElementById("emptyStateText");
    addItemLink = document.getElementById("addItemLink");
    
    // Setup event listeners
    setupEventListeners();
    
    // Load data from IndexedDB
    loadData();
});