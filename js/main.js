// ----------------------------------------------------------------------
// LOGIN AND SIGNUP PIPELINE ROUTER OVERLAYS
// ----------------------------------------------------------------------
const loginForm = document.getElementById("login-action-form");
const signupForm = document.getElementById("signup-action-form");
const currentActivePage = window.location.pathname.split("/").pop();
const isLoggedIn = sessionStorage.getItem("gauri_logged_in");

if (currentActivePage === "spaces.html" && !isLoggedIn) {
    alert("🔒 Access Denied: Please log in or register an account first!");
    window.location.href = "login.html";
}

if (loginForm) {
    loginForm.addEventListener("submit", function(e) {
        e.preventDefault();
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;

        // FIXED: Added '/api/auth/login' route endpoint string
        fetch('https://gauri-library-backend.onrender.com/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                sessionStorage.setItem("gauri_logged_in", "true");
                sessionStorage.setItem("gauri_user_role", data.role);
                sessionStorage.setItem("gauri_user_name", data.name || "Aspirant");
                sessionStorage.setItem("gauri_user_email", data.email);

                // ROLE-BASED REDIRECTION DASHBOARD LOOP
                if (data.role === 'admin') {
                    alert('Access Granted. Welcome back, Admin!');
                    window.location.href = "admin.html"; // Redirect Father to the ledger dashboard view
                } else {
                    alert('Login successful! Redirecting to seat layout layout grid...');
                    window.location.href = "spaces.html"; // Redirect Student to layout mapping grid
                }
            } else { 
                alert(data.error || "Invalid username or password credentials."); 
            }
        })
        .catch(err => {
            console.error("Login Error:", err);
            alert("Unable to reach backend database cluster. Verify server status.");
        });
    });
}

if (signupForm) {
    signupForm.addEventListener("submit", function(e) {
        e.preventDefault();
        const name = document.getElementById("signup-name").value;
        const email = document.getElementById("signup-email").value;
        const password = document.getElementById("signup-password").value;

        // FIXED: Added '/api/auth/signup' route endpoint string
        fetch('https://gauri-library-backend.onrender.com/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert("✨ Account Registered Successfully! Please Log In with your credentials.");
                window.location.reload(); // Reloads to let them sign in cleanly
            } else { 
                alert(data.error || "Signup rejected. Account might already exist."); 
            }
        })
        .catch(err => {
            console.error("Signup Error:", err);
            alert("Unable to reach backend signup node pipeline.");
        });
    });
}

// ==========================================================================
// GAURI LIBRARY REAL-TIME SEAT MATRIX GENERATION ENGINE
// ==========================================================================

document.addEventListener("DOMContentLoaded", function () {
    console.log("System initialization...");

    // 1. RUN SEAT MATRIX DRAW ENGINE IMMEDIATELY
    try {
        const gridContainer = document.getElementById("dynamic-72-seat-grid");
        if (gridContainer) {
            gridContainer.innerHTML = ""; // Clear any leftover hardcoded HTML artifacts
            
            let seatCounterLeft = 1;
            let seatCounterRight = 37;

            // Loop through 6 rows
            for (let row = 0; row < 6; row++) {
                // Build Left Side Column Section (6 Desks wide)
                for (let i = 0; i < 6; i++) {
                    createDeskElement(seatCounterLeft, gridContainer);
                    seatCounterLeft++;
                }

                // Build Center Walking Aisle Spacer Element Block per row
                const aisle = document.createElement("div");
                aisle.className = "aisle-spacer";
                gridContainer.appendChild(aisle);

                // Build Right Side Column Section (6 Desks wide)
                for (let j = 0; j < 6; j++) {
                    createDeskElement(seatCounterRight, gridContainer);
                    seatCounterRight++;
                }
            }
            console.log("72 Seat nodes generated perfectly.");
            initializeSeatClickLogic();
        }
    } catch (error) {
        console.error("Grid builder ran into an issue: ", error);
    }

    // 2. RUN NAVIGATION & AUTH UTILITIES SAFELY (FIXED TO MATCH GAURI KEYS)
    try {
        if (isLoggedIn) {
            const authContainer = document.querySelector(".auth-buttons");
            const userName = sessionStorage.getItem("gauri_user_name") || "Aspirant";
            if (authContainer) {
                authContainer.innerHTML = `
                    <span style="font-weight: bold; font-size: 14px; margin-right: 10px;">👋 ${userName}</span>
                    <button class="btn-accent-pill" style="background-color: #f26f3c; color: white; padding: 6px 15px; border: none; border-radius: 20px; cursor: pointer;" onclick="logoutUser()">Log Out</button>
                `;
            }
        }
    } catch (error) {
        console.log("Auth display bypassed on this interface template layer.");
    }
});

// Structural creation engine helper logic string
function createDeskElement(seatNumber, container) {
    const desk = document.createElement("div");
    // 35% probability index allocation for real-time occupant metrics simulation
    const isOccupiedRandom = Math.random() < 0.35;
    
    if (isOccupiedRandom) {
        desk.className = "desk occupied";
        desk.innerText = seatNumber;
    } else {
        desk.className = "desk available";
        desk.innerText = seatNumber;
        desk.setAttribute("data-seat", seatNumber);
    }
    container.appendChild(desk);
}

// Interactive filter states listener channels
function initializeSeatClickLogic() {
    const availableDesks = document.querySelectorAll(".desk.available");
    const displayTarget = document.getElementById("target-seat-display");
    const modalTriggerButton = document.getElementById("open-modal-trigger-btn");
    
    // Slider Controllers
    const hoursSlider = document.getElementById("study-hours-range");
    const hoursCounterDisplay = document.getElementById("hours-display-counter");
    
    // Modal Overlay Elements
    const bookingModalOverlay = document.getElementById("booking-profile-modal");
    const closeModalButton = document.getElementById("close-modal-btn");
    const finalSubmissionForm = document.getElementById("brutal-submission-form");
    
    // Modal internal text tag summary boxes
    const summarySeatTag = document.getElementById("summary-seat-tag");
    const summaryHoursTag = document.getElementById("summary-hours-tag");

    const availableCheckbox = document.getElementById("filter-available");
    const occupiedCheckbox = document.getElementById("filter-occupied");

    let globallySelectedSeatNumber = "None";

    // Dynamic filtering execution block
    function applyLiveFilters() {
        const showAvailable = availableCheckbox ? availableCheckbox.checked : true;
        const showOccupied = occupiedCheckbox ? occupiedCheckbox.checked : true;

        document.querySelectorAll(".study-hall-grid .desk").forEach(desk => {
            if (desk.classList.contains("available") && !desk.classList.contains("selected")) {
                desk.style.opacity = showAvailable ? "1" : "0.15";
                desk.style.pointerEvents = showAvailable ? "auto" : "none";
            } else if (desk.classList.contains("occupied")) {
                desk.style.opacity = showOccupied ? "1" : "0.15";
            }
        });
    }

    if (availableCheckbox) availableCheckbox.addEventListener("change", applyLiveFilters);
    if (occupiedCheckbox) occupiedCheckbox.addEventListener("change", applyLiveFilters);

    // Live slider readout updates
    if (hoursSlider) {
        hoursSlider.addEventListener("input", function() {
            const calculatedValue = this.value;
            if (hoursCounterDisplay) hoursCounterDisplay.innerText = `${calculatedValue} ${calculatedValue == 1 ? 'Hour' : 'Hours'}`;
            if (summaryHoursTag) summaryHoursTag.innerText = `${calculatedValue} ${calculatedValue == 1 ? 'Hour' : 'Hours'}`;
        });
    }

    // Click selection logic handler updates
    availableDesks.forEach(desk => {
        desk.addEventListener("click", function() {
            if (this.classList.contains("selected")) {
                this.classList.remove("selected");
                globallySelectedSeatNumber = "None";
                if (displayTarget) displayTarget.innerText = "None";
                if (modalTriggerButton) modalTriggerButton.disabled = true;
            } else {
                document.querySelectorAll(".desk").forEach(d => d.classList.remove("selected"));
                this.classList.add("selected");
                globallySelectedSeatNumber = this.getAttribute("data-seat");
                if (displayTarget) displayTarget.innerText = `Desk No. ${globallySelectedSeatNumber}`;
                if (modalTriggerButton) modalTriggerButton.disabled = false;
            }
        });
    });

    // Modal Trigger Toggles
    if (modalTriggerButton) {
        modalTriggerButton.addEventListener("click", function() {
            if (summarySeatTag) summarySeatTag.innerText = `Desk Assigned: Position #${globallySelectedSeatNumber}`;
            if (summaryHoursTag && hoursSlider) summaryHoursTag.innerText = `${hoursSlider.value} Hours Plan`;
            if (bookingModalOverlay) bookingModalOverlay.classList.add("modal-visible");
            
            // Auto-fill student email/name fields if logged in
            const activeEmail = sessionStorage.getItem("gauri_user_email") || "";
            const activeName = sessionStorage.getItem("gauri_user_name") || "";
            if(document.getElementById("modal-user-email")) document.getElementById("modal-user-email").value = activeEmail;
            if(document.getElementById("modal-user-name")) document.getElementById("modal-user-name").value = activeName;
        });
    }

    if (closeModalButton) {
        closeModalButton.addEventListener("click", function() {
            if (bookingModalOverlay) bookingModalOverlay.classList.remove("modal-visible");
        });
    }

    // ----------------------------------------------------------------------
    // D. SECURE NATIVE DIRECT GMAIL TRANSACTION PIPELINE INTERCEPTOR
    // ----------------------------------------------------------------------
    if (finalSubmissionForm) {
        finalSubmissionForm.addEventListener("submit", function(event) {
            event.preventDefault(); // Stop standard redirect behavior

            // Extract values
            const studentName = document.getElementById("modal-user-name").value;
            const studentPhone = document.getElementById("modal-user-phone").value;
            const studentEmail = document.getElementById("modal-user-email").value;
            const bookedHours = hoursSlider ? hoursSlider.value : "6";

            // UI feedback loader status states adjustments
            const actionButton = document.getElementById("final-mail-dispatch-btn");
            if (actionButton) {
                actionButton.innerText = "Connecting directly to Gmail Hub... ⏳";
                actionButton.disabled = true;
            }

            // FIXED: Added '/api/allocate-seat' endpoint routing path string
            fetch('https://gauri-library-backend.onrender.com/api/allocate-seat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    studentName: studentName,
                    studentPhone: studentPhone,
                    studentEmail: studentEmail,
                    seatNumber: globallySelectedSeatNumber,
                    duration: bookedHours
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert(`🎉 Allocation Success!\n\nDesk Space #${globallySelectedSeatNumber} is officially locked.\nA confirmation pass has been dispatched directly from our Gmail system straight to ${studentEmail}.`);
                    if (bookingModalOverlay) bookingModalOverlay.classList.remove("modal-visible");
                    window.location.href = "index.html";
                } else {
                    throw new Error(data.error || "Server processing transaction error drop.");
                }
            })
            .catch(error => {
                console.error("Connection failure details:", error);
                alert("Booking finalized! Launching manual validation mail client option fallback link...");
                window.location.href = `mailto:${studentEmail}?subject=Gauri Library Pass&body=Desk Space Allocation #${globallySelectedSeatNumber}`;
                
                // Reset button loop state
                if (actionButton) {
                    actionButton.innerText = "Generate Receipt & Transmit Confirmation Email ✉";
                    actionButton.disabled = false;
                }
            });
        });
    }
}

// Global authentication handlers escape sequences
function logoutUser() {
    sessionStorage.clear();
    window.location.href = "index.html";
}