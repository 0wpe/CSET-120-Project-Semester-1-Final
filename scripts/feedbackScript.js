// feedbackScript.js - Version 1 compatible

let db;
let currentUser = null;
let selectedRating = 0;

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
    
    const username = document.getElementById('reviewerName').value.trim();
    const reviewText = document.getElementById('reviewText').value.trim();
    
    // Validation
    if (selectedRating === 0) {
        alert('Please select a star rating');
        return;
    }
    
    if (!username) {
        alert('Please enter your name');
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
    
    // Create review object
    const review = {
        username: username,
        rating: selectedRating,
        reviewText: reviewText,
        timestamp: new Date().toISOString(),
        dateDisplay: formatDate(new Date())
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
    document.getElementById('reviewerName').value = '';
    document.getElementById('reviewText').value = '';
    
    // Reset stars
    document.querySelectorAll('.star').forEach(star => {
        star.classList.remove('selected');
        star.innerHTML = '☆';
    });
    
    // Auto-fill username if user is logged in and not guest
    if (currentUser && currentUser.username && 
        currentUser.username !== "Guest" && 
        currentUser.username !== "guest") {
        document.getElementById('reviewerName').value = currentUser.username;
        document.getElementById('reviewerName').readOnly = true;
    }
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
        
        // Initialize star rating
        initStarRating();
        
        // Load existing reviews
        await loadReviews();
        
        // Auto-fill username if user is logged in
        if (currentUser && currentUser.username && 
            currentUser.username !== "Guest" && 
            currentUser.username !== "guest") {
            document.getElementById('reviewerName').value = currentUser.username;
            document.getElementById('reviewerName').readOnly = true;
        }
        
        // Set up form submission
        document.getElementById('reviewForm').addEventListener('submit', submitReview);
        
        console.log("Feedback page initialized successfully");
        
    } catch (error) {
        console.error("Failed to initialize feedback page:", error);
        // Still allow basic functionality even if DB fails
        alert("Feedback system loaded with basic functionality.");
        
        // Initialize star rating anyway
        initStarRating();
        
        // Try to load from localStorage
        loadReviews();
        
        // Set up form submission with localStorage fallback
        document.getElementById('reviewForm').addEventListener('submit', submitReview);
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