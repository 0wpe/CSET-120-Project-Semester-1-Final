// Add this to gitHUB

// IndexedDB integration for Add Form
let db;
let dbInitialized = false;

// UI Elements
let itemForm, dropZone, fileInput, fileInfo, imagePreviewContainer;
let previewImage, removeImageBtn, messageContainer, recentItemsContainer;
let recentItemsGrid, formBtn, clearBtn;

// Store image data
let currentImage = {
    file: null,
    dataUrl: null,
    name: null
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize UI elements
    initializeUIElements();
    
    // Setup event listeners
    setupEventListeners();
    
    try {
        // Initialize database and wait for it to complete
        await initializeDatabase();
        dbInitialized = true;
        
        // Load recently added items
        await loadRecentItems();
    } catch (error) {
        console.error('Error initializing database:', error);
        showMessage('Error connecting to database. Some features may not work.', 'error');
    }
});

function initializeUIElements() {
    itemForm = document.getElementById('itemForm');
    dropZone = document.getElementById('dropZone');
    fileInput = document.getElementById('fileInput');
    fileInfo = document.getElementById('fileInfo');
    imagePreviewContainer = document.getElementById('imagePreviewContainer');
    previewImage = document.getElementById('previewImage');
    removeImageBtn = document.getElementById('removeImageBtn');
    messageContainer = document.getElementById('messageContainer');
    recentItemsContainer = document.getElementById('recentItemsContainer');
    recentItemsGrid = document.getElementById('recentItemsGrid');
    formBtn = document.getElementById('formBtn');
    clearBtn = document.getElementById('clearBtn');
}

function setupEventListeners() {
    // Navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.classList.contains('active')) return;
            
            if (this.textContent === 'Delete') {
                window.location.href = 'adminDeleteIndex.html';
            }
        });
    });
    
    
    // Form submission
    itemForm.addEventListener('submit', handleFormSubmit);
    
    // Clear form button
    clearBtn.addEventListener('click', clearForm);
    
    // Dropzone functionality
    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        if (e.dataTransfer.files.length) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFileSelect(e.target.files[0]);
        }
    });
    
    // Remove image button
    removeImageBtn.addEventListener('click', removeImage);
}

function initializeDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("StoreDB", 1);
        
        request.onupgradeneeded = (event) => {
            const upgradeDB = event.target.result;
            console.log("Setting up StoreDB for Add Form...");
            
            // Create object stores if they don't exist
            if (!upgradeDB.objectStoreNames.contains("products")) {
                upgradeDB.createObjectStore("products", { keyPath: "productId", autoIncrement: true });
            }
            if (!upgradeDB.objectStoreNames.contains("images")) {
                upgradeDB.createObjectStore("images", { keyPath: "imageId", autoIncrement: true });
            }
        };
        
        request.onsuccess = (event) => {
            db = event.target.result;
            console.log("Database ready for adding items");
            resolve(db);
        };
        
        request.onerror = (err) => {
            console.error("Database error:", err);
            reject(err);
        };
    });
}

function handleFileSelect(file) {
    // Check file type
    if (!file.type.match('image.*')) {
        showMessage('Please select an image file (JPG, PNG, GIF)', 'error');
        return;
    }
    
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        showMessage('Image size should be less than 5MB', 'error');
        return;
    }
    
    // Read file as data URL
    const reader = new FileReader();
    
    reader.onload = (e) => {
        currentImage = {
            file: file,
            dataUrl: e.target.result,
            name: file.name
        };
        
        // Update UI
        previewImage.src = currentImage.dataUrl;
        imagePreviewContainer.style.display = 'block';
        
        fileInfo.textContent = `Selected: ${file.name} (${formatFileSize(file.size)})`;
        fileInfo.style.display = 'block';
        
        // Scroll to preview
        imagePreviewContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    
    reader.onerror = () => {
        showMessage('Error reading image file', 'error');
    };
    
    reader.readAsDataURL(file);
}

function removeImage() {
    currentImage = {
        file: null,
        dataUrl: null,
        name: null
    };
    
    previewImage.src = '';
    imagePreviewContainer.style.display = 'none';
    fileInfo.style.display = 'none';
    fileInput.value = '';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Check if database is initialized
    if (!dbInitialized) {
        try {
            await initializeDatabase();
            dbInitialized = true;
        } catch (error) {
            showMessage('Database not available. Please refresh the page.', 'error');
            return;
        }
    }
    
    // Validate form
    if (!validateForm()) {
        return;
    }
    
    // Show loading
    showLoading(true);
    
    try {
        // Get form values
        const name = document.getElementById('itemName').value.trim();
        const description = document.getElementById('itemDescription').value.trim();
        const price = parseFloat(document.getElementById('itemPrice').value);
        const type = document.getElementById('itemType').value;
        
        // Prepare product data - match the structure from menuScript.js
        const productData = {
            name: name,
            description: description,
            price: price,
            foodType: type, // Changed from 'type' to 'foodType' to match menuScript
            ingredients: [], // Empty array by default
            keyText: generateKeyText(name), // Generate keyText like menuScript
            createdAt: new Date().toISOString()
        };
        
        // Handle image - store as data URL directly in product
        if (currentImage.dataUrl) {
            // Store image as data URL directly in the product
            productData.image = currentImage.dataUrl;
        } else {
            // Use default image based on type
            productData.image = getDefaultImageForType(type);
        }
        
        // Save product to IndexedDB
        const productId = await saveProduct(productData);
        
        // Show success message
        showMessage(`Item "${productData.name}" added successfully!`, 'success');
        
        // Clear form
        clearForm();
        
        // Reload recent items
        await loadRecentItems();
        
    } catch (error) {
        console.error('Error adding item:', error);
        showMessage('Error adding item. Please try again.', 'error');
    } finally {
        // Hide loading
        showLoading(false);
    }
}

// Generate keyText function (similar to menuScript.js)
function generateKeyText(name, existingKeys = new Set()) {
    const parts = name.trim().toLowerCase().split(/\s+/);
    const base = parts.length === 1 ? parts[0] : parts[0] + (parts[1] ? parts[1][0] : '');
    
    let key = base;
    let counter = 1;
    
    // We'll get existing keys from the database to ensure uniqueness
    return new Promise((resolve) => {
        if (!db) {
            resolve(key);
            return;
        }
        
        const tx = db.transaction(["products"], "readonly");
        const store = tx.objectStore("products");
        const request = store.getAll();
        
        request.onsuccess = () => {
            const existingProducts = request.result || [];
            const existingKeysSet = new Set(existingProducts.map(p => p.keyText));
            
            while (existingKeysSet.has(key)) {
                key = base + counter;
                counter++;
            }
            
            resolve(key);
        };
        
        request.onerror = () => {
            resolve(key); // Fallback if we can't check
        };
    });
}

// Modified handleFormSubmit to use async keyText generation
async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Check if database is initialized
    if (!dbInitialized) {
        try {
            await initializeDatabase();
            dbInitialized = true;
        } catch (error) {
            showMessage('Database not available. Please refresh the page.', 'error');
            return;
        }
    }
    
    // Validate form
    if (!validateForm()) {
        return;
    }
    
    // Show loading
    showLoading(true);
    
    try {
        // Get form values
        const name = document.getElementById('itemName').value.trim();
        const description = document.getElementById('itemDescription').value.trim();
        const price = parseFloat(document.getElementById('itemPrice').value);
        const type = document.getElementById('itemType').value;
        
        // Generate unique keyText
        const keyText = await generateKeyText(name);
        
        // Prepare product data - match the structure from menuScript.js
        const productData = {
            name: name,
            description: description,
            price: price,
            foodType: type, // Changed from 'type' to 'foodType' to match menuScript
            ingredients: [], // Empty array by default
            keyText: keyText, // Generated keyText
            createdAt: new Date().toISOString()
        };
        
        // Handle image - store as data URL directly in product
        if (currentImage.dataUrl) {
            // Store image as data URL directly in the product
            productData.image = currentImage.dataUrl;
        } else {
            // Use default image based on type
            productData.image = getDefaultImageForType(type);
        }
        
        // Save product to IndexedDB
        const productId = await saveProduct(productData);
        
        // Show success message
        showMessage(`Item "${productData.name}" added successfully!`, 'success');
        
        // Clear form
        clearForm();
        
        // Reload recent items
        await loadRecentItems();
        
    } catch (error) {
        console.error('Error adding item:', error);
        showMessage('Error adding item. Please try again.', 'error');
    } finally {
        // Hide loading
        showLoading(false);
    }
}

function validateForm() {
    const name = document.getElementById('itemName').value.trim();
    const price = document.getElementById('itemPrice').value;
    const type = document.getElementById('itemType').value;
    
    // Clear previous messages
    clearMessages();
    
    let isValid = true;
    let errorMessages = [];
    
    if (!name) {
        errorMessages.push('Item name is required');
        isValid = false;
    }
    
    if (!price || parseFloat(price) <= 0) {
        errorMessages.push('Valid price is required');
        isValid = false;
    }
    
    if (!type) {
        errorMessages.push('Food type is required');
        isValid = false;
    }
    
    if (errorMessages.length > 0) {
        showMessage(errorMessages.join('<br>'), 'error');
    }
    
    return isValid;
}

async function saveProduct(productData) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        const tx = db.transaction(["products"], "readwrite");
        const store = tx.objectStore("products");
        
        const request = store.add(productData);
        
        request.onsuccess = (e) => {
            const productId = e.target.result;
            console.log('Product saved with ID:', productId);
            resolve(productId);
        };
        
        request.onerror = (err) => {
            console.error('Error saving product:', err);
            reject(err);
        };
    });
}

async function loadRecentItems() {
    // Don't try to load if database isn't initialized
    if (!dbInitialized || !db) {
        console.log('Database not initialized yet, skipping recent items load');
        recentItemsContainer.style.display = 'none';
        return;
    }
    
    try {
        const products = await getRecentProducts();
        
        if (products.length === 0) {
            recentItemsContainer.style.display = 'none';
            return;
        }
        
        recentItemsContainer.style.display = 'block';
        recentItemsGrid.innerHTML = '';
        
        // Display last 6 items
        const recentItems = products.slice(-6).reverse();
        
        for (const product of recentItems) {
            const itemCard = document.createElement('div');
            itemCard.className = 'recent-item-card';
            
            // Get image - now stored directly in product.image as data URL
            let imageUrl = product.image || getDefaultImageForType(product.foodType || product.type);
            
            const price = formatPrice(product.price);
            const name = product.name || 'Unnamed Item';
            const foodType = product.foodType || product.type || 'Uncategorized';
            
            itemCard.innerHTML = `
                <img src="${imageUrl}" alt="${name}" class="recent-item-image" onerror="this.src='${getDefaultImageForType(foodType)}'">
                <div class="recent-item-details">
                    <div class="recent-item-name">${name}</div>
                    <div class="recent-item-type">${foodType}</div>
                    <div class="recent-item-price">${price}</div>
                </div>
            `;
            
            recentItemsGrid.appendChild(itemCard);
        }
        
    } catch (error) {
        console.error('Error loading recent items:', error);
        recentItemsContainer.style.display = 'none';
    }
}

function getRecentProducts() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        const tx = db.transaction(["products"], "readonly");
        const store = tx.objectStore("products");
        const request = store.getAll();
        
        request.onsuccess = () => {
            resolve(request.result || []);
        };
        
        request.onerror = (err) => {
            reject(err);
        };
    });
}

function getDefaultImageForType(type) {
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
    
    return defaultImages[type] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200&q=80';
}

function formatPrice(price) {
    if (typeof price === 'number') {
        return `$${price.toFixed(2)}`;
    }
    if (typeof price === 'string') {
        return price.startsWith('$') ? price : `$${price}`;
    }
    return '$0.00';
}

function clearForm() {
    itemForm.reset();
    removeImage();
    clearMessages();
    
    // Reset file input
    fileInput.value = '';
    
    // Focus on first field
    document.getElementById('itemName').focus();
}

function showMessage(text, type = 'info') {
    clearMessages();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = text;
    
    messageContainer.appendChild(messageDiv);
    messageContainer.style.display = 'block';
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            if (messageContainer.contains(messageDiv)) {
                messageDiv.remove();
                if (messageContainer.children.length === 0) {
                    messageContainer.style.display = 'none';
                }
            }
        }, 5000);
    }
}

function clearMessages() {
    messageContainer.innerHTML = '';
    messageContainer.style.display = 'none';
}

function showLoading(show) {
    if (show) {
        formBtn.disabled = true;
        formBtn.textContent = 'Adding Item...';
        
        // Create loading overlay if it doesn't exist
        if (!document.querySelector('.loading-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.innerHTML = '<div class="loading-spinner"></div>';
            document.body.appendChild(overlay);
        }
        
        document.querySelector('.loading-overlay').style.display = 'flex';
    } else {
        formBtn.disabled = false;
        formBtn.textContent = 'Add Item to Menu';
        
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
}

// Add CSS for loading overlay
const style = document.createElement('style');
style.textContent = `
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    }
    
    .loading-overlay .loading-spinner {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #4A9DEC;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);