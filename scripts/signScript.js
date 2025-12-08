//this this files works becuase the menu code never creats a guest DB

/*
Idea: make it so that when a new user login in / sign up it stores their cart in a temporary array inside of the 'users' storage and the new user's cart is created and stored in the currentUser storage
this should be in a function to make it more understable
*/ 

/*
Opens all of the databases 
*/
let db;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("StoreDB", 1);

        request.onupgradeneeded = (event) => {
            const upgradeDB = event.target.result;
            console.log("Upgrading StoreDB…");

            if (!upgradeDB.objectStoreNames.contains("users")) {
                upgradeDB.createObjectStore("users", {
                    keyPath: "userId",
                    autoIncrement: true
                });
                console.log("user store made");
            }

            if (!upgradeDB.objectStoreNames.contains("currentUser")) {
                upgradeDB.createObjectStore("currentUser", {
                    keyPath: "id"
                });
                console.log("current user store made");
            }

            if (!upgradeDB.objectStoreNames.contains("products")) {
                upgradeDB.createObjectStore("products", {
                    keyPath: "productId",
                    autoIncrement: true
                });
                console.log("product store made");
            }

            if (!upgradeDB.objectStoreNames.contains("images")) {
                upgradeDB.createObjectStore("images", {
                    keyPath: "imageId",
                    autoIncrement: true
                });
                console.log("images store made");
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

openDB().then((e) => {
    console.log("Time to Move On!");
});//this is done to make the software wait to make sire the databse is made



/*
 * USER CLASS
 * Represents each account in the system.
 */
class User {
    constructor(username, password, email) {
        this.username = username;       // Stores username
        this.password = password;       // Plain-text password (in real apps use hashing)
        this.email = email;               // Password email
        this.cart = [];                 // Initialize empty cart
    }

    // Check if input password matches stored password
    checkPassword(input) {
        return input === this.password;
    }
}

/*
 * SYSTEM CLASS
 * Handles storing users, logging in/out, and sign-ups.
 */
class System {
    constructor() {
        this.users = [];                 // Stores all users
        this.currentUser = null;         // Stores currently logged-in user
    }

    setCurrentUser(user) {
        return new Promise((resolve, reject) => {
            try {
                const tx = db.transaction(["currentUser"], "readwrite");
                const store = tx.objectStore("currentUser");

                const currentUserData = {
                    cart: user.cart || [],
                    username: user.username, 
                    id: 1,
                    userId: user.userId // Include userId for consistency
                };

                // Add isAdmin flag if user is an admin
                if (user.isAdmin) {
                    currentUserData.isAdmin = user.isAdmin;
                }

                const request = store.put(currentUserData);

                request.onsuccess = (event) => {
                    // Update in-memory currentUser only after successful write
                    this.currentUser = user;
                    console.log("currentUser put succeeded", event.target.result);
                    resolve(event.target.result);
                };

                request.onerror = (event) => {
                    console.error("currentUser put failed", event.target.error);
                    reject(event.target.error);
                };
                
            } catch (err) {
                console.error("Unexpected error in setCurrentUser", err);
                reject(err);
            }
        });
    }

    /*CREATE USER ACCOUNT*/
    signUp(username, password, email) {
        return new Promise((resolve, reject) => {
            // First, check if user exists and validate email
            this.checkUserExists(username).then(exists => {
                if (exists) {
                    alert("Username already exists!");
                    console.log("Account creation failed: duplicate username");
                    resolve(false);
                    return;
                }

                // Validate email format
                if (!this.validateEmail(email)) {
                    alert("Please enter a valid email address!");
                    console.log("Account creation failed: invalid email");
                    resolve(false);
                    return;
                }

                // Create new user
                const newUser = new User(username, password, email);
                
                // Transfer guest cart to new user (but don't delete guest from users store)
                this.transferGuestCart(newUser).then((userWithCart) => {
                    // Now create a new transaction to add the user
                    const tx = db.transaction(["users"], "readwrite");
                    const store = tx.objectStore("users");
                    
                    const addRequest = store.add(userWithCart);

                    addRequest.onsuccess = (event) => {
                        const userId = event.target.result;
                        userWithCart.userId = userId;
                        this.users.push(userWithCart);
                        
                        this.setCurrentUser(userWithCart).then(() => {
                            alert("Account created successfully!");
                            console.log("New user created successfully");
                            console.log(`User ${userWithCart.username} logged in.`);
                            resolve(true);
                        }).catch(err => {
                            console.error("Error setting current user:", err);
                            alert("Account created but failed to log in automatically.");
                            resolve(false);
                        });
                    };

                    addRequest.onerror = (err) => {
                        console.error("Error adding new user: " + err);
                        alert("Error creating account. Please try again.");
                        resolve(false);
                    };
                }).catch(err => {
                    console.error("Error transferring guest cart:", err);
                    // Continue with empty cart if guest cart transfer fails
                    const tx = db.transaction(["users"], "readwrite");
                    const store = tx.objectStore("users");
                    
                    const addRequest = store.add(newUser);
                    
                    addRequest.onsuccess = (event) => {
                        const userId = event.target.result;
                        newUser.userId = userId;
                        this.users.push(newUser);
                        
                        this.setCurrentUser(newUser).then(() => {
                            alert("Account created successfully!");
                            resolve(true);
                        }).catch(err => {
                            console.error("Error setting current user:", err);
                            alert("Account created but failed to log in automatically.");
                            resolve(false);
                        });
                    };
                    
                    addRequest.onerror = (err) => {
                        console.error("Error adding new user: " + err);
                        alert("Error creating account. Please try again.");
                        resolve(false);
                    };
                });
            }).catch(err => {
                console.error("Error checking user existence:", err);
                alert("Error accessing database. Please try again.");
                resolve(false);
            });
        });
    }

    /*CHECK IF USER EXISTS*/
    checkUserExists(username) {
        return new Promise((resolve, reject) => {
            // FIXED: Removed the problematic loadUsers() call
            const tx = db.transaction(["users"], "readonly");
            const store = tx.objectStore("users");
            const request = store.getAll();

            request.onsuccess = () => {
                const allUsers = request.result;
                const exists = allUsers.some((u) => u.username === username);
                resolve(exists);
            };

            request.onerror = () => {
                reject("Error retrieving users from database");
            };
        });
    }

    /*LOGIN FUNCTION*/
    logIn(username, password) {
        return new Promise((resolve, reject) => {
            let tx = db.transaction(["users"], "readonly");
            let store = tx.objectStore("users");

            const request = store.getAll();

            request.onsuccess = () => {
                const allUsers = request.result;

                // Check if user exists
                if (!allUsers.find((u) => u.username === username)) {
                    alert("User not found!");
                    resolve(false);
                    return;
                }

                const dbUser = allUsers.find(u => u.username === username);
                if (dbUser) {
                    // Check password
                    if (dbUser.password === password) {
                        // Create a User instance from the stored record
                        const userInstance = new User(
                            dbUser.username, 
                            dbUser.password, 
                            dbUser.email
                        );
                        userInstance.userId = dbUser.userId;
                        userInstance.cart = dbUser.cart || [];
                        // changeY
                        if (dbUser.isAdmin) {
                            userInstance.isAdmin = dbUser.isAdmin;
                        }
                        console.log(userInstance);
                        
                        // Transfer guest cart to logged-in user (but don't delete guest)
                        this.transferGuestCart(userInstance).then((updatedUser) => {
                            // Update user in database with merged cart
                            this.updateUserCart(updatedUser).then(() => {
                                this.setCurrentUser(updatedUser).then(() => {
                                    alert(`Welcome, ${username}!`);
                                    console.log(`User ${username} logged in successfully.`);
                                    resolve(true);
                                }).catch(err => {
                                    console.error("Failed to set current user:", err);
                                    alert(`Welcome, ${username}! (Login partially successful)`);
                                    resolve(true);
                                });
                            }).catch(err => {
                                console.error("Failed to update user cart:", err);
                                this.setCurrentUser(userInstance).then(() => {
                                    alert(`Welcome, ${username}!`);
                                    resolve(true);
                                });
                            });
                        }).catch(err => {
                            console.error("Error transferring guest cart:", err);
                            this.setCurrentUser(userInstance).then(() => {
                                alert(`Welcome, ${username}!`);
                                resolve(true);
                            });
                        });
                    } else {
                        alert("Incorrect password!");
                        resolve(false);
                    }
                }
            };

            request.onerror = () => {
                console.error("Error retrieving users from database");
                alert("Error accessing database. Please try again.");
                resolve(false);
            };
        });
    }

    /*VALIDATE EMAIL FORMAT*/
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /*TRANSFER GUEST CART (no deletion of guest from users store)*/
    transferGuestCart(user) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(["currentUser"], "readonly");
            const store = tx.objectStore("currentUser");
            const req = store.get(1);
            
            req.onsuccess = () => {
                const guestUser = req.result;
                if (guestUser && guestUser.username === "guest" && guestUser.cart && guestUser.cart.length > 0) {
                    console.log("Transferring guest cart to user...");
                    
                    // Merge guest cart with user's existing cart
                    if (!user.cart) user.cart = [];
                    
                    // Simple merge - you might want to handle duplicates differently
                    const guestCartItems = guestUser.cart || [];
                    
                    // For each item in guest cart, check if it already exists in user cart
                    guestCartItems.forEach(guestItem => {
                        const existingItemIndex = user.cart.findIndex(item => 
                            item.keyText === guestItem.keyText
                        );
                        
                        if (existingItemIndex !== -1) {
                            // Item exists, update quantity
                            user.cart[existingItemIndex].quantity = 
                                (user.cart[existingItemIndex].quantity || 1) + 
                                (guestItem.quantity || 1);
                        } else {
                            // Add new item
                            user.cart.push({...guestItem});
                        }
                    });
                    
                    console.log("Guest cart transferred to user.");
                    resolve(user);
                } else {
                    // No guest cart to transfer
                    resolve(user);
                }
            };
            
            req.onerror = (error) => {
                console.error("Error checking guest cart:", error);
                resolve(user); // Still resolve even if there's an error
            };
        });
    }

    /*UPDATE USER CART IN DATABASE*/
    updateUserCart(user) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(["users"], "readwrite");
            const store = tx.objectStore("users");
            
            // Get the current user data to preserve other fields
            const getReq = store.get(user.userId);
            
            getReq.onsuccess = () => {
                const existingUser = getReq.result;
                if (existingUser) {
                    // Update cart and keep other properties
                    existingUser.cart = user.cart;
                    const updateReq = store.put(existingUser);
                    
                    updateReq.onsuccess = () => {
                        resolve();
                    };
                    
                    updateReq.onerror = (error) => {
                        reject(error);
                    };
                } else {
                    reject("User not found in database");
                }
            };
            
            getReq.onerror = (error) => {
                reject(error);
            };
        });
    }
}

// FIXED: loadUsers function
function loadUsers() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(["users"], "readonly");
        const store = tx.objectStore("users");
        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onerror = () => {
            reject("Error loading users");
        };
    });
}

//opening the users indexed DB to let it be timed
function openUsersDB() {
    return new Promise((resolve, reject) => {
        let tx = db.transaction(["currentUser"], "readwrite");
        let store = tx.objectStore("currentUser");
        resolve({tx, store});
    });
}

/*
 * FRONT-END INTERACTION LOGIC FOR sign.html
 */

// Load system
const system = new System();
console.log(system.users);


/*
 * FORM ELEMENT SELECTION
 */
const signInForm = document.querySelector(".sign-in-form");
const signUpForm = document.querySelector(".sign-up-form");

/*
 * SIGN IN FORM HANDLER
 */
signInForm.addEventListener("submit", e => {
    e.preventDefault(); // Prevent page refresh

    const username = signInForm.querySelector("input[type='text']").value;
    const password = signInForm.querySelector("input[type='password']").value;

    system.logIn(username, password).then(success => {
        if (success) {
            // Redirect to main page after successful login
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1000);
        }
    });
});

/*
 * SIGN UP FORM HANDLER
 */
signUpForm.addEventListener("submit", e => {
    e.preventDefault();
    const username = signUpForm.querySelector("input[placeholder='Username']").value;
    const email = signUpForm.querySelector("input[placeholder='Email']").value;
    const password = signUpForm.querySelector("input[placeholder='Password']").value;

    system.signUp(username, password, email).then(success => {
        if (success) {
            console.log(`User ${username} created.`);
            // Redirect to main page after successful signup
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1000);
        }
    });
});

/*
 * PANEL SWITCHING LOGIC (UI animation)
 */
const signUpBtn = document.getElementById("sign-up-btn");
const signInBtn = document.getElementById("sign-in-btn");
const container = document.querySelector(".container");

signUpBtn.addEventListener("click", () => {
    container.classList.add("sign-up-mode"); // Slides UI to sign-up
});

signInBtn.addEventListener("click", () => {
    container.classList.remove("sign-up-mode"); // Slides UI back to sign-in
});