// feedbackScript.js - Version 1 compatible (No name input + Character Counter)

let db;
let currentUser = null;
let selectedRating = 0;
const MAX_CHARS = 250;

// Initialize the database (using version 1)
function initDB() {
    return new Promise((resolve, reject) => {
        // Use version 1 to match your existing DB
        const request = indexedDB.open("StoreDB", 1);

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log("Database opened successfully (Version 1)");
            
            // Check if reviews store exists, if not, create it
            checkAndCreateReviewsStore().then(() => {
                resolve(db);
            }).catch(error => {
                console.error("Failed to check/create reviews store:", error);
                reject(error);
            });
        };

        request.onerror = (event) => {
            console.error("Database initialization failed:", event.target.error);
            reject(event.target.error);
        };
    });
}

// Check and create reviews store without upgrading DB version
function checkAndCreateReviewsStore() {
    return new Promise((resolve, reject) => {
        // We can't create a store without onupgradeneeded, but we can check
        // and handle it differently if it doesn't exist
        const tx = db.transaction(["reviews"], "readonly");
        const store = tx.objectStore("reviews");
        
        tx.onerror = () => {
            // If we get an error, the store doesn't exist
            console.log("Reviews store doesn't exist, will create with fallback");
            // We'll handle this in the getCurrentUser function
            resolve();
        };
        
        tx.oncomplete = () => {
            console.log("Reviews store exists");
            resolve();
        };
    });
}

// Get current user from database
async function getCurrentUser() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(["currentUser"], "readonly");
        const store = tx.objectStore("currentUser");
        const request = store.get(1);

        request.onsuccess = () => {
            currentUser = request.result;
            
            // If no current user, create a guest user
            if (!currentUser) {
                currentUser = {
                    id: 1,
                    username: "Guest",
                    userId: null,
                    isGuest: true
                };
            }
            
            resolve(currentUser);
        };

        request.onerror = (error) => {
            console.error("Error getting current user:", error);
            // Return a guest user as fallback
            currentUser = {
                id: 1,
                username: "Guest",
                userId: null,
                isGuest: true
            };
            resolve(currentUser);
        };
    });
}

// Display current user info
function displayCurrentUserInfo() {
    const userDisplay = document.querySelector('.current-user-display');
    const userAvatar = document.querySelector('.current-user-avatar');
    const userName = document.querySelector('.current-user-info h3');
    const userStatus = document.querySelector('.current-user-info p');
    
    if (!currentUser || !currentUser.username) {
        currentUser = {
            username: "Guest",
            isGuest: true
        };
    }
    
    // Set user initials for avatar
    const initials = currentUser.username.charAt(0).toUpperCase();
    userAvatar.textContent = initials;
    
    // Set username
    userName.textContent = currentUser.username;
    
    // Set status
    if (currentUser.isGuest || currentUser.username === "Guest" || currentUser.username === "guest") {
        userStatus.textContent = "Guest User";
        userStatus.style.color = "#ffc107";
        
        // Show guest warning
        const guestWarning = document.querySelector('.guest-warning');
        if (guestWarning) {
            guestWarning.style.display = 'flex';
        }
        
        // Disable submit button for guests
        const submitBtn = document.querySelector('.submit-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.title = "Please log in to submit a review";
        }
    } else {
        userStatus.textContent = "Logged In User";
        userStatus.style.color = "#4CAF50";
        
        // Hide guest warning
        const guestWarning = document.querySelector('.guest-warning');
        if (guestWarning) {
            guestWarning.style.display = 'none';
        }
        
        // Enable submit button
        const submitBtn = document.querySelector('.submit-btn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.title = "Submit your review";
        }
    }
}

// Initialize character counter
function initCharCounter() {
    const textarea = document.getElementById('reviewText');
    const charCounter = document.querySelector('.char-counter');
    
    if (!textarea || !charCounter) {
        console.error("Textarea or character counter not found");
        return;
    }
    
    // Set max length attribute
    textarea.maxLength = MAX_CHARS;
    
    // Update counter on input
    textarea.addEventListener('input', updateCharCounter);
    
    // Update counter on page load (in case there's existing text)
    updateCharCounter();
    
    // Prevent paste that exceeds limit
    textarea.addEventListener('paste', (e) => {
        const pastedText = e.clipboardData.getData('text');
        const currentText = textarea.value;
        const selectionStart = textarea.selectionStart;
        const selectionEnd = textarea.selectionEnd;
        
        // Calculate new text length
        const newText = currentText.substring(0, selectionStart) + 
                       pastedText + 
                       currentText.substring(selectionEnd);
        
        if (newText.length > MAX_CHARS) {
            e.preventDefault();
            
            // Calculate how much we can paste
            const allowedLength = MAX_CHARS - (currentText.length - (selectionEnd - selectionStart));
            const truncatedPaste = pastedText.substring(0, allowedLength);
            
            // Insert truncated text
            textarea.value = currentText.substring(0, selectionStart) + 
                           truncatedPaste + 
                           currentText.substring(selectionEnd);
            
            // Update cursor position
            const newCursorPos = selectionStart + truncatedPaste.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
            
            // Update counter
            updateCharCounter();
            
            // Show warning
            showCharLimitWarning();
        }
    });
    
    // Prevent typing beyond limit
    textarea.addEventListener('keydown', (e) => {
        if (textarea.value.length >= MAX_CHARS && 
            !isControlKey(e.key) && 
            !e.ctrlKey && 
            !e.metaKey) {
            e.preventDefault();
            showCharLimitWarning();
        }
    });
}

// Update character counter display
function updateCharCounter() {
    const textarea = document.getElementById('reviewText');
    const charCounter = document.querySelector('.char-counter');
    
    if (!textarea || !charCounter) return;
    
    const currentLength = textarea.value.length;
    const remaining = MAX_CHARS - currentLength;
    
    // Update counter text
    charCounter.textContent = `${currentLength}/${MAX_CHARS}`;
    
    // Update counter styling based on remaining characters
    charCounter.classList.remove('near-limit', 'at-limit');
    
    if (remaining <= 0) {
        charCounter.classList.add('at-limit');
    } else if (remaining <= 50) {
        charCounter.classList.add('near-limit');
    }
}

// Check if key is a control key
function isControlKey(key) {
    const controlKeys = [
        'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 
        'ArrowUp', 'ArrowDown', 'Tab', 'Escape', 'Enter'
    ];
    return controlKeys.includes(key);
}

// Show character limit warning
function showCharLimitWarning() {
    const charCounter = document.querySelector('.char-counter');
    if (!charCounter) return;
    
    // Add warning animation
    charCounter.classList.add('at-limit');
    
    // Remove animation after 1 second
    setTimeout(() => {
        if (document.getElementById('reviewText').value.length < MAX_CHARS) {
            charCounter.classList.remove('at-limit');
        }
    }, 1000);
}

// Initialize reviews storage (fallback if store doesn't exist)
function initReviewsStorage() {
    return new Promise((resolve, reject) => {
        // Try to create transaction, if it fails, we need to handle it
        try {
            const tx = db.transaction(["reviews"], "readonly");
            const store = tx.objectStore("reviews");
            const request = store.count();
            
            request.onsuccess = () => {
                console.log("Reviews store accessible, count:", request.result);
                resolve(true);
            };
            
            request.onerror = () => {
                console.log("Reviews store not accessible, using localStorage as fallback");
                resolve(false);
            };
            
            tx.onerror = () => {
                console.log("Transaction failed, using localStorage as fallback");
                resolve(false);
            };
        } catch (error) {
            console.log("Cannot access reviews store, using localStorage:", error);
            resolve(false);
        }
    });
}

// Save review (with fallback to localStorage if IndexedDB fails)
async function saveReview(review) {
    try {
        // First try IndexedDB
        const saved = await saveReviewToDB(review);
        return saved;
    } catch (dbError) {
        console.log("IndexedDB save failed, using localStorage:", dbError);
        // Fallback to localStorage
        return saveReviewToLocalStorage(review);
    }
}

// Save review to IndexedDB
function saveReviewToDB(review) {
    return new Promise((resolve, reject) => {
        try {
            const tx = db.transaction(["reviews"], "readwrite");
            const store = tx.objectStore("reviews");
            const request = store.add(review);

            request.onsuccess = () => {
                console.log("Review saved to IndexedDB with ID:", request.result);
                resolve(request.result);
            };

            request.onerror = (error) => {
                console.error("Error saving review to IndexedDB:", error);
                reject(error);
            };
        } catch (error) {
            console.error("Transaction error:", error);
            reject(error);
        }
    });
}

// Save review to localStorage (fallback)
function saveReviewToLocalStorage(review) {
    return new Promise((resolve) => {
        try {
            // Get existing reviews from localStorage
            let reviews = JSON.parse(localStorage.getItem("vineyard_reviews") || "[]");
            
            // Add new review with ID
            review.reviewId = reviews.length + 1;
            reviews.push(review);
            
            // Save back to localStorage
            localStorage.setItem("vineyard_reviews", JSON.stringify(reviews));
            
            console.log("Review saved to localStorage with ID:", review.reviewId);
            resolve(review.reviewId);
        } catch (error) {
            console.error("Error saving to localStorage:", error);
            resolve(null);
        }
    });
}

// Load reviews (with fallback)
async function loadReviews() {
    try {
        let reviews;
        
        // Try IndexedDB first
        try {
            reviews = await getAllReviewsFromDB();
        } catch (dbError) {
            console.log("Failed to load from IndexedDB, trying localStorage:", dbError);
            reviews = await getAllReviewsFromLocalStorage();
        }
        
        displayReviews(reviews);
    } catch (error) {
        console.error("Error loading reviews:", error);
        document.querySelector('.reviews-list').innerHTML = 
            '<div class="no-reviews">Unable to load reviews. Please try again later.</div>';
    }
}

// Get all reviews from IndexedDB
function getAllReviewsFromDB() {
    return new Promise((resolve, reject) => {
        try {
            const tx = db.transaction(["reviews"], "readonly");
            const store = tx.objectStore("reviews");
            const request = store.getAll();

            request.onsuccess = () => {
                // Sort by date (newest first)
                const reviews = request.result.sort((a, b) => 
                    new Date(b.timestamp) - new Date(a.timestamp)
                );
                resolve(reviews);
            };

            request.onerror = (error) => {
                console.error("Error fetching reviews from DB:", error);
                reject(error);
            };
        } catch (error) {
            console.error("Transaction error:", error);
            reject(error);
        }
    });
}

// Get all reviews from localStorage (fallback)
function getAllReviewsFromLocalStorage() {
    return new Promise((resolve) => {
        try {
            const reviews = JSON.parse(localStorage.getItem("vineyard_reviews") || "[]");
            // Sort by date (newest first)
            const sorted = reviews.sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
            );
            resolve(sorted);
        } catch (error) {
            console.error("Error loading from localStorage:", error);
            resolve([]);
        }
    });
}

// Star rating functionality
function initStarRating() {
    const stars = document.querySelectorAll('.star');
    
    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            // Check if user is guest
            if (currentUser.isGuest || currentUser.username === "Guest" || currentUser.username === "guest") {
                alert("Please log in to submit a review");
                return;
            }
            
            selectedRating = index + 1;
            
            // Update star display
            stars.forEach((s, i) => {
                if (i <= index) {
                    s.classList.add('selected');
                    s.innerHTML = '★';
                } else {
                    s.classList.remove('selected');
                    s.innerHTML = '☆';
                }
            });
            
            console.log("Selected rating:", selectedRating);
        });
        
        // Add hover effect
        star.addEventListener('mouseover', () => {
            stars.forEach((s, i) => {
                if (i <= index) {
                    s.style.color = '#ffd700';
                }
            });
        });
        
        star.addEventListener('mouseout', () => {
            stars.forEach((s, i) => {
                if (!s.classList.contains('selected')) {
                    s.style.color = '';
                }
            });
        });
    });
}

// Submit review function
async function submitReview(event) {
    event.preventDefault();
    
    // Check if user is guest
    if (currentUser.isGuest || currentUser.username === "Guest" || currentUser.username === "guest") {
        alert("Please log in to submit a review");
        return;
    }
    
    const reviewText = document.getElementById('reviewText').value.trim();
    
    // Validation
    if (selectedRating === 0) {
        alert('Please select a star rating');
        return;
    }
    
    if (!reviewText) {
        alert('Please write your review');
        return;
    }
    
    if (reviewText.length < 10) {
        alert('Review must be at least 10 characters long');
        return;
    }
    
    if (reviewText.length > MAX_CHARS) {
        alert(`Review must be ${MAX_CHARS} characters or less`);
        return;
    }
    
    // Create review object with current user's username
    const review = {
        username: currentUser.username,
        rating: selectedRating,
        reviewText: reviewText,
        timestamp: new Date().toISOString(),
        dateDisplay: formatDate(new Date()),
        isGuest: false
    };
    
    try {
        // Save review
        await saveReview(review);
        
        // Show success message
        showSuccessMessage();
        
        // Reset form
        resetForm();
        
        // Reload reviews
        loadReviews();
        
    } catch (error) {
        console.error('Error saving review:', error);
        alert('Failed to submit review. Please try again.');
    }
}

// Display reviews on page
function displayReviews(reviews) {
    const reviewsList = document.querySelector('.reviews-list');
    
    if (!reviews || reviews.length === 0) {
        reviewsList.innerHTML = '<div class="no-reviews">No reviews yet. Be the first to share your experience!</div>';
        return;
    }
    
    reviewsList.innerHTML = reviews.map(review => createReviewCard(review)).join('');
}

// Create HTML for a single review card
function createReviewCard(review) {
    const starHTML = Array.from({length: 5}, (_, i) => 
        `<span class="star ${i < review.rating ? 'selected' : ''}">${i < review.rating ? '★' : '☆'}</span>`
    ).join('');
    
    const userInitial = review.username.charAt(0).toUpperCase();
    const displayDate = review.dateDisplay || formatDate(new Date(review.timestamp));
    
    return `
        <div class="review-card">
            <div class="review-header">
                <div class="review-user">
                    <div class="user-avatar">${userInitial}</div>
                    <div class="user-name">${review.username}</div>
                </div>
                <div class="review-meta">
                    <div class="review-stars" title="${review.rating} out of 5 stars">
                        ${starHTML}
                    </div>
                    <div class="review-date">${displayDate}</div>
                </div>
            </div>
            <div class="review-content">
                ${review.reviewText}
            </div>
        </div>
    `;
}

// Format date for display
function formatDate(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Show success message
function showSuccessMessage() {
    const message = document.createElement('div');
    message.className = 'success-message show';
    message.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>Thank you for your review!</span>
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.classList.remove('show');
        setTimeout(() => message.remove(), 300);
    }, 3000);
}

// Reset form after submission
function resetForm() {
    selectedRating = 0;
    document.getElementById('reviewText').value = '';
    
    // Reset stars
    document.querySelectorAll('.star').forEach(star => {
        star.classList.remove('selected');
        star.innerHTML = '☆';
    });
    
    // Update character counter
    updateCharCounter();
}

// Redirect to login page
function redirectToLogin() {
    window.location.href = 'sign.html';
}

// Initialize the page
async function initPage() {
    try {
        // Add Font Awesome
        addFontAwesome();
        
        // Initialize database
        await initDB();
        
        // Get current user
        await getCurrentUser();
        
        // Display current user info
        displayCurrentUserInfo();
        
        // Initialize star rating
        initStarRating();
        
        // Initialize character counter
        initCharCounter();
        
        // Load existing reviews
        await loadReviews();
        
        // Set up form submission
        document.getElementById('reviewForm').addEventListener('submit', submitReview);
        
        // Set up login redirect for guest warning
        const loginLink = document.querySelector('.guest-warning a');
        if (loginLink) {
            loginLink.addEventListener('click', redirectToLogin);
        }
        
        console.log("Feedback page initialized successfully");
        
    } catch (error) {
        console.error("Failed to initialize feedback page:", error);
        // Still allow basic functionality even if DB fails
        alert("Feedback system loaded with basic functionality.");
        
        // Initialize star rating anyway
        initStarRating();
        
        // Initialize character counter anyway
        initCharCounter();
        
        // Try to load from localStorage
        loadReviews();
        
        // Set up form submission with localStorage fallback
        document.getElementById('reviewForm').addEventListener('submit', submitReview);
        
        // Set up login redirect
        const loginLink = document.querySelector('.guest-warning a');
        if (loginLink) {
            loginLink.addEventListener('click', redirectToLogin);
        }
    }
}

// Add Font Awesome for icons
function addFontAwesome() {
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
        document.head.appendChild(link);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initPage);