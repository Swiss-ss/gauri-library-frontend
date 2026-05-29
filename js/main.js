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
                    alert('Login successful! Redirecting to seat layout grid...');
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

    // 1. FETCH REAL LIVE SEAT MATRIX STATUS FROM SERVER
    try {
        const gridContainer = document.getElementById("dynamic-72-seat-grid");
        if (gridContainer) {
            gridContainer.innerHTML = "<div style='grid-column: span 13; text-align: center; color: #777;'>Syncing live library desk grid matrix... ⏳</div>";
            
            fetch('https://gauri-library-backend.onrender.com/api/seats')
                .then(res => res.json())
                .then(seatsArray => {
                    gridContainer.innerHTML = ""; // Clear loader string content
                    
                    let seatCounterLeft = 1;
                    let seatCounterRight = 37;

                    // Loop through 6 rows structurally
                    for (let row = 0; row < 6; row++) {
                        // Build Left Side Column Section (6 Desks wide)
                        for (let i = 0; i < 6; i++) {
                            createRealDeskElement(seatCounterLeft, seatsArray[seatCounterLeft - 1], gridContainer);
                            seatCounterLeft++;
                        }

                        // Build Center Walking Aisle Spacer Element Block per row
                        const aisle = document.createElement("div");
                        aisle.className = "aisle-spacer";
                        gridContainer.appendChild(aisle);

                        // Build Right Side Column Section (6 Desks wide)
                        for (let j = 0; j < 6; j++) {
                            createRealDeskElement(seatCounterRight, seatsArray[seatCounterRight - 1], gridContainer);
                            seatCounterRight++;
                        }
                    }
                    console.log("72 Live database seat nodes synchronized perfectly.");
                    initializeSeatClickLogic();
                })
                .catch(err => {
                    console.error("Database status fetch failed:", err);
                    gridContainer.innerHTML = "<div style='grid-column: span 13; text-align: center; color: red;'>❌ Unable to load seat maps. Verify server connectivity.</div>";
                });
        }
    } catch (error) {
        console.error("Grid builder ran into an issue: ", error);
    }

    // 2. RUN NAVIGATION & AUTH UTILITIES SAFELY
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

// Structural helper parsing database state values cleanly
// Structural helper parsing database state values cleanly
function createRealDeskElement(seatNumber, occupancyData, container) {
    const desk = document.createElement("div");
    
    if (occupancyData !== null) {
        // Seat is taken in server records
        desk.className = "desk occupied";
        desk.innerText = seatNumber;
    } else {
        // Seat is completely open and free
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

    if (hoursSlider) {
        hoursSlider.addEventListener("input", function() {
            const calculatedValue = this.value;
            if (hoursCounterDisplay) hoursCounterDisplay.innerText = `${calculatedValue} ${calculatedValue == 1 ? 'Hour' : 'Hours'}`;
            if (summaryHoursTag) summaryHoursTag.innerText = `${calculatedValue} ${calculatedValue == 1 ? 'Hour' : 'Hours'}`;
        });
    }

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

    if (finalSubmissionForm) {
        finalSubmissionForm.addEventListener("submit", function(event) {
            event.preventDefault();

            const studentName = document.getElementById("modal-user-name").value;
            const studentPhone = document.getElementById("modal-user-phone").value;
            const studentEmail = document.getElementById("modal-user-email").value;
            const bookedHours = hoursSlider ? hoursSlider.value : "6";

            const actionButton = document.getElementById("final-mail-dispatch-btn");
            if (actionButton) {
                actionButton.innerText = "Allocating Space & Sending Email Ticket... ⏳";
                actionButton.disabled = true;
            }

            fetch('https://gauri-library-backend.onrender.com/api/allocate-seat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentName: studentName,
                    studentPhone: studentPhone,
                    studentEmail: studentEmail,
                    seatNumber: globallySelectedSeatNumber,
                    duration: bookedHours
                })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.error || "Taken") });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    alert(`🎉 Allocation Success!\n\nDesk Space #${globallySelectedSeatNumber} is officially locked.\nA confirmation pass has been dispatched directly from our Gmail system straight to ${studentEmail}.`);
                    if (bookingModalOverlay) bookingModalOverlay.classList.remove("modal-visible");
                    window.location.href = "spaces.html"; // Reload to capture newly updated layout maps
                }
            })
            .catch(error => {
                console.error("Connection failure details:", error);
                alert("Booking error: " + error.message + ". Launching backup mail shortcut link option...");
                window.location.href = `mailto:${studentEmail}?subject=Gauri Library Pass&body=Desk Space Allocation #${globallySelectedSeatNumber}`;
                
                if (actionButton) {
                    actionButton.innerText = "Generate Receipt & Transmit Confirmation Email ✉";
                    actionButton.disabled = false;
                }
            });
        });
    }
}

function logoutUser() {
    sessionStorage.clear();
    window.location.href = "index.html";
}