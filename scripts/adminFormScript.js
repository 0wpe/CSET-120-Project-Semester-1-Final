//Add this to gitHUB

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
                upgradeDB.createObjectStore("images", { keyPath: "image", autoIncrement: true });
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
        // Prepare product data
        const productData = {
            name: document.getElementById('itemName').value.trim(),
            description: document.getElementById('itemDescription').value.trim(),
            price: parseFloat(document.getElementById('itemPrice').value),
            type: document.getElementById('itemType').value,
            createdAt: new Date().toISOString()
        };
        
        // Store image if available
        if (currentImage.dataUrl) {
            const image = await storeImage(currentImage);
            productData.image = image;
            productData.hasImage = true;
        }
        
        // Save product to IndexedDB
        const productId = await saveProduct(productData);
        
        // Show success message
        showMessage(`Item "${productData.name}" added successfully! (ID: ${productId})`, 'success');
        
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

async function storeImage(imageData) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        const tx = db.transaction(["images"], "readwrite");
        const store = tx.objectStore("images");
        
        const imageRecord = {
            dataUrl: imageData.dataUrl,
            name: imageData.name,
            type: imageData.file.type,
            size: imageData.file.size,
            uploadedAt: new Date().toISOString()
        };
        
        const request = store.add(imageRecord);
        
        request.onsuccess = (e) => {
            const image = e.target.result;
            console.log('Image saved with ID:', image);
            resolve(image);
        };
        
        request.onerror = (err) => {
            console.error('Error saving image:', err);
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
            
            // Get image if available
            let imageUrl = getDefaultImageForType(product.type);
            if (product.image) {
                try {
                    const image = await getImage(product.image);
                    if (image && image.dataUrl) {
                        imageUrl = image.dataUrl;
                    }
                } catch (error) {
                    console.warn('Could not load image for product:', product.productId);
                }
            }
            
            const price = formatPrice(product.price);
            
            itemCard.innerHTML = `
                <img src="${product.image}" alt="${product.name}" class="recent-item-image" onerror="this.src='${getDefaultImageForType(product.type)}'">
                <div class="recent-item-details">
                    <div class="recent-item-name">${product.name}</div>
                    <div class="recent-item-type">${product.type}</div>
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

function getImage(image) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        const tx = db.transaction(["images"], "readonly");
        const store = tx.objectStore("images");
        const request = store.get(image);
        
        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onerror = (err) => {
            reject(err);
        };
    });
}

function getDefaultImageForType(type) {
    const defaultImages = {
        'Appetizer': 'https://images.unsplash.com/photo-1546793665-c74683f339c1?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200&q=80',
        'Side': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200&q=80',
        'Main': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200&q=80',
        'Drink': 'https://images.unsplash.com/photo-1561047029-3000c68339ca?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200&q=80',
        'Dessert': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200&q=80',
        'Kids Menu': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200&q=80'
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