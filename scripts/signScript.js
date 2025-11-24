/*****************************************************
 * USER CLASS
 * Represents each account in the system.
 *****************************************************/
class User {
    constructor(username, password, email) {
        this.username = username;       // Stores username
        this.password = password;       // Plain-text password (in real apps use hashing)
        this.email = email;               // Password email
    }

    // Check if input password matches stored password
    checkPassword(input) {
        return input === this.password;
    }
}

/*****************************************************
 * SYSTEM CLASS
 * Handles storing users, logging in/out, and sign-ups.
 *****************************************************/
class System {
    constructor() {
        this.users = [];                 // Stores all users
        this.currentUser = null;         // Stores currently logged-in user
    }

    /*************************************************
     * SAVE USERS TO LOCAL STORAGE
     *************************************************/
    saveUsers() {
        localStorage.setItem("users", JSON.stringify(this.users));
        localStorage.setItem("currentUser", JSON.stringify(this.currentUser));
    }

    /*************************************************
     * LOAD USERS FROM LOCAL STORAGE
     *************************************************/
    loadUsers() {
        const saved = localStorage.getItem("users");
        if (!saved) return;
        
        const arr = JSON.parse(saved);

        // Convert plain objects back into User class instances
        this.users = arr.map(u => {
            const user = new User(u.username, u.password, u.email);
            return user;
        });
    }

    /*************************************************
     * CREATE USER ACCOUNT
     *************************************************/
    signUp(username, password, email) {
        if (this.users.some(u => u.username === username)) {
            alert("Username already exists!");
            return false;
        }

        const newUser = new User(username, password, email);
        this.users.push(newUser);
        alert("Account created successfully!");
        this.currentUser = newUser.username;
        this.saveUsers();
        return true;
    }

    /*************************************************
     * LOGIN LOGIC
     *************************************************/
    logIn(username, password) {
        const user = this.users.find(u => u.username === username); //this checks the username arrtribute and check if it's the same as the username entered in the html file
        // console.log(user);
        // User {username: username, password: password, email: email}
        
        if (!user) {
            alert("User not found!");
            return false;
        }

        if (user.checkPassword(password)) {
            this.currentUser = user;
            this.saveUsers();
            alert(`Welcome, ${username}!`);
            return true;
        } else {
            alert(`Incorrect password! email: ${user.email}`);
            return false;
        }
        
    }
}

/*****************************************************
 * FRONT-END INTERACTION LOGIC FOR sign.html
 *****************************************************/

// Load system
const system = new System();
system.loadUsers(); //initially be empty []
console.log(system.users);


/****************************************
 * FORM ELEMENT SELECTION
 ****************************************/
const signInForm = document.querySelector(".sign-in-form");
const signUpForm = document.querySelector(".sign-up-form");

/****************************************
 * SIGN IN FORM HANDLER
 ****************************************/
signInForm.addEventListener("submit", e => {
    e.preventDefault(); // Prevent page refresh

    const username = signInForm.querySelector("input[type='text']").value;
    const password = signInForm.querySelector("input[type='password']").value;

    if (system.logIn(username, password)) {
        console.log(`User ${username} logged in.`);
        window.location.href = "index.html";
    }
});

/****************************************
 * SIGN UP FORM HANDLER
 ****************************************/
signUpForm.addEventListener("submit", e => {
    e.preventDefault();

    const username = signUpForm.querySelector("input[placeholder='Username']").value;
    const email = signUpForm.querySelector("input[placeholder='Email']").value;
    const password = signUpForm.querySelector("input[placeholder='Password']").value;

    if (system.signUp(username, password, email)) {
        console.log(`User ${username} created.`);
        window.location.href = "index.html";
    }
});

/****************************************
 * PANEL SWITCHING LOGIC (UI animation)
 ****************************************/
const signUpBtn = document.getElementById("sign-up-btn");
const signInBtn = document.getElementById("sign-in-btn");
const container = document.querySelector(".container");

signUpBtn.addEventListener("click", () => {
    container.classList.add("sign-up-mode"); // Slides UI to sign-up
});

signInBtn.addEventListener("click", () => {
    container.classList.remove("sign-up-mode"); // Slides UI back to sign-in
});
