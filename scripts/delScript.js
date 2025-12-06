// IndexedDB integration
let db;

// UI Elements (will be initialized when DOM is loaded)
let itemsGrid, emptyState, loadingIndicator, selectedCountEl, bulkDeleteBtn, emptyStateText, addItemLink;
let selectedItems = new Set();

// Default images for different food types
const defaultImages = {
    'Appetizer': 'https://images.unsplash.com/photo-1546793665-c74683f339c1?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80',
    'Side': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80',
    'Main': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80',
    'Drink': 'https://images.unsplash.com/photo-1561047029-3000c68339ca?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80',
    'Dessert': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80',
    'Kids Menu': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80'
};

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
            resolve(req.result);
        };

        req.onerror = (err) => {
            reject(err);
        };
    });
}

function getImageForProduct(product) {
    // Check if product has image data or URL
    if (product.image) {
        return product.image;
    }
    
    // Check if product has imageId that references the images store
    if (product.image) {
        // In a real implementation, you'd fetch from images store
        return defaultImages[product.type] || getDefaultImage();
    }
    
    // Use default image based on type
    return defaultImages[product.type] || getDefaultImage();
}

function getDefaultImage() {
    return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80';
}

function formatPrice(price) {
    if (!price) return '$0.00';
    
    if (typeof price === 'number') {
        return `$${price.toFixed(2)}`;
    }
    
    // If it's already a string, check if it starts with $
    if (typeof price === 'string') {
        return price.startsWith('$') ? price : `$${price}`;
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
    
    // Home button
    const homeBtn = document.querySelector('.home-btn');
    if (homeBtn) {
        homeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // alert('Navigating to Home page');
            // In a real app, redirect to home
        });
    }
    
    // Bulk delete button
    bulkDeleteBtn.addEventListener('click', handleBulkDelete);
}

async function handleBulkDelete() {
    if (selectedItems.size === 0) return;
    
    const productIds = Array.from(selectedItems);
    
    if (confirm(`Are you sure you want to delete ${selectedItems.size} item(s)?`)) {
        try {
            bulkDeleteBtn.disabled = true;
            bulkDeleteBtn.textContent = "Deleting...";
            
            await deleteMultipleProducts(productIds);
            
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

async function loadProducts() {
    try {
        const products = await getAllProducts();
        
        // Hide loading indicator
        loadingIndicator.style.display = 'none';
        
        if (products.length === 0) {
            itemsGrid.style.display = 'none';
            emptyState.style.display = 'block';
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
            
            const imageUrl = getImageForProduct(product);
            const price = formatPrice(product.price);
            
            itemCard.innerHTML = `
                <input type="checkbox" class="select-checkbox" data-id="${product.productId}">
                <img src="${imageUrl}" alt="${product.name}" class="item-image" onerror="this.src='${getDefaultImage()}'">
                <div class="item-details">
                    <div class="item-name">${product.name || 'Unnamed Item'}</div>
                    <div class="item-description">${product.description || 'No description available'}</div>
                    <div class="item-type">${product.type || 'Uncategorized'}</div>
                    <div class="item-price">${price}</div>
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
        addItemLink.onclick = () => {
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
    
    if (confirm(`Are you sure you want to delete "${itemName}"?`)) {
        try {
            button.disabled = true;
            button.textContent = "Deleting...";
            
            await deleteProduct(itemId);
            
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
        
        // Open database
        await openDB();
        
        // Load products
        await loadProducts();
        
    } catch (error) {
        console.error("Error loading data:", error);
        loadingIndicator.style.display = 'none';
        emptyState.style.display = 'block';
        emptyStateText.textContent = "Error loading items from database.";
        addItemLink.textContent = "Retry";
        addItemLink.onclick = () => {
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