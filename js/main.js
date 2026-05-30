// Environment-Aware Backend Gateway URI
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "https://gauri-library-backend.onrender.com";

// -------------------------------------------------------------------------
// GOOGLE IDENTITY SERVICES CONFIGURATION
// -------------------------------------------------------------------------
// REPLACE THIS with your real Google Client ID when deploying to production!
// Example: "123456789-abcdef.apps.googleusercontent.com"
const GOOGLE_CLIENT_ID = "YOUR_REAL_CLIENT_ID_HERE";

// -------------------------------------------------------------------------
// GOOGLE IDENTITY SERVICES & MOCK SIGN-IN GLOBAL HANDLERS
// -------------------------------------------------------------------------
window.initGoogleLibrary = function () {
    const container = document.getElementById("google-signin-btn-container");
    if (!container) return;

    if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== "YOUR_REAL_CLIENT_ID_HERE" && !GOOGLE_CLIENT_ID.includes("dummy")) {
        try {
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: window.handleGoogleSignIn
            });
            google.accounts.id.renderButton(
                container,
                { theme: "outline", size: "large", shape: "pill" }
            );
        } catch (e) {
            console.error("Google accounts library initialization failed:", e);
            window.renderMockButton();
        }
    } else {
        window.renderMockButton();
    }
};

window.renderMockButton = function () {
    const container = document.getElementById("google-signin-btn-container");
    if (container) {
        container.innerHTML = `
            <button type="button" id="custom-google-signin-btn" class="google-btn" onclick="handleMockGoogleSignIn()">
                <svg class="google-icon" viewBox="0 0 24 24" style="width: 18px; height: 18px;">
                    <path fill="#EA4335" d="M12 5.04c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.5 15 0 12 0 7.3 0 3.3 2.7 1.3 6.6l3.9 3C6.2 6.8 8.9 5.04 12 5.04z"/>
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"/>
                    <path fill="#FBBC05" d="M5.2 14.8c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2L1.3 7.8C.5 9.4 0 11.2 0 13s.5 3.6 1.3 5.2l3.9-3.2z"/>
                    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-1.8-6.8-4.5l-3.9 3C3.3 21.3 7.3 24 12 24z"/>
                </svg>
                <span>Sign in with Google</span>
            </button>
        `;
    }
};

window.handleGoogleSignIn = async function (response) {
    try {
        const credential = response.credential;
        const payload = parseJwt(credential);
        
        if (payload && payload.email) {
            await window.selectMockGoogleAccount(payload.email, payload.name);
        } else {
            alert("❌ Could not read Google account profile info.");
        }
    } catch (err) {
        console.error("Google Sign-In Error:", err);
        alert("Google authentication communication offline.");
    }
};

window.handleMockGoogleSignIn = function () {
    // If a real client ID is set, use google API instead of chooser
    if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== "YOUR_REAL_CLIENT_ID_HERE" && !GOOGLE_CLIENT_ID.includes("dummy")) {
        google.accounts.id.prompt();
        return;
    }
    showMockGoogleAccountChooser();
};

window.selectMockGoogleAccount = async function (email, name) {
    // Remove chooser modals if open
    const chooser = document.getElementById("google-chooser-modal");
    if (chooser) chooser.remove();
    const style = document.getElementById("chooser-hover-styles");
    if (style) style.remove();

    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/gmail-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, name })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            sessionStorage.setItem("library_user", JSON.stringify({ name: data.name, email: data.email, role: data.role }));
            window.location.href = data.role === "admin" ? "admin.html" : "spaces.html";
        } else {
            alert(`❌ Access Denied: ${data.error}`);
        }
    } catch (err) {
        alert("Server validation processing failed.");
    }
};

window.selectCustomMockGoogleAccount = function () {
    const email = prompt("Enter simulated Google Gmail address:");
    if (!email) return;
    if (!email.toLowerCase().endsWith("@gmail.com")) {
        alert("🔒 Google SSO Simulation Constraint: Please enter a valid Gmail address (@gmail.com).");
        return;
    }
    const name = prompt("Enter simulated Google Profile Name:") || email.split('@')[0];
    window.selectMockGoogleAccount(email, name);
};

function showMockGoogleAccountChooser() {
    const existing = document.getElementById("google-chooser-modal");
    if (existing) existing.remove();

    const chooserModal = document.createElement("div");
    chooserModal.id = "google-chooser-modal";
    chooserModal.className = "modal-overlay modal-visible";
    chooserModal.style.display = "flex";
    chooserModal.style.zIndex = "10000";

    chooserModal.innerHTML = `
        <div class="modal-box" style="max-width: 400px; padding: 25px; border-radius: 16px; border: 3px solid #122244; box-shadow: 6px 6px 0px #122244; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
                <svg style="width: 32px; height: 32px; margin-bottom: 8px;" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5.04c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.5 15 0 12 0 7.3 0 3.3 2.7 1.3 6.6l3.9 3C6.2 6.8 8.9 5.04 12 5.04z"/>
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"/>
                    <path fill="#FBBC05" d="M5.2 14.8c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2L1.3 7.8C.5 9.4 0 11.2 0 13s.5 3.6 1.3 5.2l3.9-3.2z"/>
                    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-1.8-6.8-4.5l-3.9 3C3.3 21.3 7.3 24 12 24z"/>
                </svg>
                <h3 style="margin: 0; color: #122244; font-size: 18px; font-weight: 800;">Sign in with Google</h3>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #64748b;">to continue to Gauri Library</p>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
                <div class="google-account-row" onclick="selectMockGoogleAccount('rma.pndy@gmail.com', 'System Admin')" style="display: flex; align-items: center; gap: 12px; padding: 12px; border: 2px solid #cbd5e1; border-radius: 10px; cursor: pointer; transition: all 0.2s;">
                    <div style="width: 36px; height: 36px; border-radius: 50%; background: #122244; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">SA</div>
                    <div style="text-align: left;">
                        <div style="font-weight: 700; font-size: 14px; color: #122244;">System Admin (Admin Account)</div>
                        <div style="font-size: 12px; color: #64748b;">rma.pndy@gmail.com</div>
                    </div>
                </div>

                <div class="google-account-row" onclick="selectMockGoogleAccount('sarthakpandey315@gmail.com', 'Sarthak Pandey')" style="display: flex; align-items: center; gap: 12px; padding: 12px; border: 2px solid #cbd5e1; border-radius: 10px; cursor: pointer; transition: all 0.2s;">
                    <div style="width: 36px; height: 36px; border-radius: 50%; background: #f26f3c; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">SP</div>
                    <div style="text-align: left;">
                        <div style="font-weight: 700; font-size: 14px; color: #122244;">Sarthak Pandey (Student Account)</div>
                        <div style="font-size: 12px; color: #64748b;">sarthakpandey315@gmail.com</div>
                    </div>
                </div>

                <div class="google-account-row" onclick="selectCustomMockGoogleAccount()" style="display: flex; align-items: center; gap: 12px; padding: 12px; border: 2px solid #cbd5e1; border-radius: 10px; cursor: pointer; transition: all 0.2s;">
                    <div style="width: 36px; height: 36px; border-radius: 50%; background: #cbd5e1; color: #122244; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;">+</div>
                    <div style="text-align: left;">
                        <div style="font-weight: 700; font-size: 14px; color: #122244;">Use another Gmail account</div>
                        <div style="font-size: 12px; color: #64748b;">Simulate custom Google profile</div>
                    </div>
                </div>
            </div>

            <button type="button" id="close-chooser-btn" class="google-btn" style="width: 100%; border-radius: 8px; font-size: 13px; background:#f1f5f9 !important;">Cancel</button>
        </div>
    `;

    document.body.appendChild(chooserModal);

    const style = document.createElement("style");
    style.id = "chooser-hover-styles";
    style.innerHTML = `
        .google-account-row:hover {
            border-color: #122244 !important;
            background: #f8fafc;
            transform: translateY(-2px);
            box-shadow: 3px 3px 0px #122244;
        }
    `;
    document.head.appendChild(style);

    chooserModal.querySelector("#close-chooser-btn").addEventListener("click", () => {
        chooserModal.remove();
        style.remove();
    });
}

function parseJwt(token) {
    try {
        var base64Url = token.split('.')[1];
        var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch(e) {
        return null;
    }
}

document.addEventListener("DOMContentLoaded", function () {
    // Render Google / Mock Sign-In button on load
    if (typeof google !== "undefined" && google.accounts) {
        window.initGoogleLibrary();
    } else {
        window.renderMockButton();
    }

    const authContainer = document.querySelector(".auth-buttons");
    const activeUser = JSON.parse(sessionStorage.getItem("library_user"));

    if (authContainer) {
        if (activeUser) {
            authContainer.innerHTML = `
                <span style="font-weight:800; color:var(--text-dark); margin-right:15px;">
                    👋 ${activeUser.name} (${activeUser.role.toUpperCase()})
                </span>
                <button class="btn-black-pill" id="global-logout-btn" style="padding: 8px 16px; font-size:13px;">Log Out</button>
            `;
            document.getElementById("global-logout-btn").addEventListener("click", () => {
                sessionStorage.clear();
                window.location.href = "index.html";
            });
        } else {
            authContainer.innerHTML = `
                <button class="btn-black-pill" onclick="window.location.href='login.html'">Gateway Access →</button>
            `;
        }
    }

    // INTERCEPT ENGINE: Handle the "View Available Seats" option on the home/index page
    const viewSeatsBtn = document.getElementById("view-seats-homepage-btn");
    if (viewSeatsBtn) {
        viewSeatsBtn.addEventListener("click", (e) => {
            if (!activeUser) {
                e.preventDefault(); // Stop standard navigation
                alert("🔒 Access Denied: Please log in or register an account to view available library seats.");
                window.location.href = "login.html";
            } else {
                window.location.href = "spaces.html";
            }
        });
    }

    // Security Gate: Protect spaces.html directly from custom URL bar entry bypasses
    if (window.location.pathname.includes("spaces.html") && !activeUser) {
        alert("🔒 Security Access Pass required. Please sign in first.");
        window.location.href = "login.html";
        return;
    }

    // -------------------------------------------------------------------------
    // 2. AUTHENTICATION GATEWAY PIPELINES (login.html actions)
    // -------------------------------------------------------------------------
    const gmailLoginForm = document.getElementById("gmail-login-action-form");

    if (gmailLoginForm) {
        gmailLoginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("gmail-login-email").value;
            const name = document.getElementById("gmail-login-name").value;

            // Simple validation that it's a Gmail address
            if (!email.toLowerCase().endsWith("@gmail.com")) {
                alert("🔒 Access Constraint: Please enter a valid Gmail address (@gmail.com).");
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/gmail-login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, name })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    sessionStorage.setItem("library_user", JSON.stringify({ name: data.name, email: data.email, role: data.role }));
                    window.location.href = data.role === "admin" ? "admin.html" : "spaces.html";
                } else {
                    alert(`❌ Access Denied: ${data.error}`);
                }
            } catch (err) {
                alert("Server validation processing failed.");
            }
        });
    }

    // -------------------------------------------------------------------------
    // 3. THEATER-STYLE SEATING MATRIX ENGINE (spaces.html actions)
    // -------------------------------------------------------------------------
    const gridContainer = document.getElementById("dynamic-16-seat-grid");
    if (gridContainer && activeUser) {
        let currentlySelectedSeat = null;

        const targetDisplay = document.getElementById("target-seat-display");
        const actionBtn = document.getElementById("open-modal-trigger-btn");
        const rangeSlider = document.getElementById("modal-study-duration-slider");
        const sliderOutput = document.getElementById("slider-hours-counter");

        // Sync visual counter text whenever user moves the slider bar
        if (rangeSlider && sliderOutput) {
            rangeSlider.addEventListener("input", (e) => {
                sliderOutput.textContent = `${e.target.value} Hours Plan Session`;
            });
        }

        async function loadSeatLayoutGrid() {
            try {
                gridContainer.innerHTML = `
                    <div style='grid-column: span 5; text-align:center; padding: 40px 0;'>
                        <p style='font-weight:bold; margin-bottom: 10px;'>🍃 Connecting to Cloud Infrastructure...</p>
                        <p style='font-size: 12px; color: #666; max-width: 250px; margin: 0 auto; line-height: 1.4;'>
                            Syncing databases from Render. Please wait... ⏳
                        </p>
                    </div>
                `;
                
                const res = await fetch(`${API_BASE_URL}/api/seats`);
                const seatLayoutArray = await res.json();
                gridContainer.innerHTML = "";

                // Render 4 rows of seats theater-style (2 columns of 8 seats facing each other)
                // Left Column: 8 seats total (seats 1-8). Right Column: 8 seats total (seats 9-16).
                // Row i (0 to 3) contains:
                // - Left Column seats: 2*i + 1, 2*i + 2
                // - Aisle Spacer
                // - Right Column seats: 2*i + 9, 2*i + 10
                for (let i = 0; i < 4; i++) {
                    // Left Column
                    const left1 = 2 * i + 1;
                    const left2 = 2 * i + 2;
                    appendDeskNode(left1, seatLayoutArray[left1 - 1]);
                    appendDeskNode(left2, seatLayoutArray[left2 - 1]);

                    // Center walking aisle channel spacer
                    const aisle = document.createElement("div");
                    aisle.className = "aisle-spacer";
                    gridContainer.appendChild(aisle);

                    // Right Column
                    const right1 = 2 * i + 9;
                    const right2 = 2 * i + 10;
                    appendDeskNode(right1, seatLayoutArray[right1 - 1]);
                    appendDeskNode(right2, seatLayoutArray[right2 - 1]);
                }
            } catch (err) {
                gridContainer.innerHTML = `
                    <div style='grid-column: span 5; text-align:center; padding: 30px; color:red; font-weight:bold;'>
                        <p>❌ Connection timeout during server boot sequence.</p>
                        <button class="btn-black-pill" onclick="location.reload()" style="margin-top: 15px; padding: 8px 20px;">Wake up & Retry Connection 🔄</button>
                    </div>
                `;
            }
        }

        function showOccupiedSeatDetails(seatNo, bookingData) {
            const existingModal = document.getElementById("seat-details-modal");
            if (existingModal) existingModal.remove();

            const detailsModal = document.createElement("div");
            detailsModal.id = "seat-details-modal";
            detailsModal.className = "modal-overlay modal-visible";
            detailsModal.style.display = "flex";

            const durationText = bookingData.duration ? `${bookingData.duration} Hours Plan` : "N/A";
            const bookingTime = bookingData.timestamp || "N/A";

            detailsModal.innerHTML = `
                <div class="modal-box" style="position: relative;">
                    <button class="close-btn" id="close-details-btn" style="position: absolute; top: 15px; right: 15px; font-size: 24px; cursor: pointer; background: none; border: none; font-weight: bold;">&times;</button>
                    <div class="badge-discount" style="background: var(--bg-accent-orange); color: white;">Occupied Desk Info</div>
                    <h3 style="margin-top: 0; color: #0f2c59; font-size: 22px; margin-bottom: 20px;">Desk Space #${seatNo} Details</h3>
                    
                    <div style="display: flex; flex-direction: column; gap: 15px; text-align: left; font-size: 15px;">
                        <div>
                            <span style="font-weight: 800; text-transform: uppercase; font-size: 12px; color: #64748b; display: block;">Aspirant Name</span>
                            <span style="font-weight: 700; font-size: 16px;">${bookingData.name || "N/A"}</span>
                        </div>
                        <div>
                            <span style="font-weight: 800; text-transform: uppercase; font-size: 12px; color: #64748b; display: block;">Contact Number</span>
                            <span style="font-weight: 700; font-size: 16px; color: #0f2c59;">${bookingData.phone || "N/A"}</span>
                        </div>
                        <div>
                            <span style="font-weight: 800; text-transform: uppercase; font-size: 12px; color: #64748b; display: block;">Gmail Address</span>
                            <span style="font-weight: 600; font-size: 15px;">${bookingData.email || "N/A"}</span>
                        </div>
                        <div style="display: flex; gap: 20px; border-top: 2px dashed #cbd5e1; padding-top: 15px; margin-top: 10px;">
                            <div>
                                <span style="font-weight: 800; text-transform: uppercase; font-size: 12px; color: #64748b; display: block;">Duration</span>
                                <span class="badge-discount" style="margin: 5px 0 0 0; background-color: #fff3cd; color: #856404; font-size: 13px;">${durationText}</span>
                            </div>
                            <div>
                                <span style="font-weight: 800; text-transform: uppercase; font-size: 12px; color: #64748b; display: block;">Booked At</span>
                                <span style="font-weight: 700; font-size: 14px; display: inline-block; margin-top: 8px;">${bookingTime}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(detailsModal);

            const closeBtn = detailsModal.querySelector("#close-details-btn");
            closeBtn.addEventListener("click", () => detailsModal.remove());

            detailsModal.addEventListener("click", (e) => {
                if (e.target === detailsModal) detailsModal.remove();
            });
        }

        function appendDeskNode(seatNo, bookingData) {
            const desk = document.createElement("div");
            desk.className = "desk";
            desk.textContent = seatNo;

            if (bookingData) {
                desk.classList.add("occupied");
                desk.title = `Occupied by ${bookingData.name}`;
                // Seat data visible to everyone when clicked
                desk.addEventListener("click", () => {
                    showOccupiedSeatDetails(seatNo, bookingData);
                });
            } else {
                desk.classList.add("available");
                desk.addEventListener("click", () => {
                    const previousSelected = document.querySelector(".desk.selected");
                    if (previousSelected) previousSelected.classList.remove("selected");

                    if (currentlySelectedSeat === seatNo) {
                        currentlySelectedSeat = null;
                        targetDisplay.textContent = "None";
                        actionBtn.disabled = true;
                        document.getElementById("slider-control-wrapper").style.display = "none";
                    } else {
                        currentlySelectedSeat = seatNo;
                        desk.classList.add("selected");
                        targetDisplay.textContent = `Desk Space #${seatNo}`;
                        actionBtn.disabled = false;
                        document.getElementById("slider-control-wrapper").style.display = "block";
                    }
                });
            }
            gridContainer.appendChild(desk);
        }

        // Modal Form Interactivities
        const modal = document.getElementById("booking-profile-modal");
        const closeModal = document.getElementById("close-modal-btn");
        const bookingForm = document.getElementById("brutal-submission-form");

        actionBtn.addEventListener("click", () => {
            document.getElementById("summary-seat-tag").textContent = `Desk Assigned: Position #${currentlySelectedSeat}`;
            document.getElementById("modal-user-email").value = activeUser.email;
            document.getElementById("modal-user-name").value = activeUser.name;
            modal.classList.add("modal-visible");
        });

        closeModal.addEventListener("click", () => modal.classList.remove("modal-visible"));

        bookingForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const finalBtn = document.getElementById("final-mail-dispatch-btn");
            finalBtn.disabled = true;
            finalBtn.textContent = "Locking desk space & sending ticket... ✉";

            const payload = {
                studentName: document.getElementById("modal-user-name").value,
                studentPhone: document.getElementById("modal-user-phone").value,
                studentEmail: activeUser.email,
                seatNumber: currentlySelectedSeat,
                duration: rangeSlider.value
            };

            try {
                const response = await fetch(`${API_BASE_URL}/api/allocate-seat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                
                const data = await response.json();
                if (response.ok && data.success) {
                    if (data.mailSent === false) {
                        alert(`🎉 Desk #${currentlySelectedSeat} successfully allocated!\n⚠️ Note: The confirmation email could not be dispatched (${data.error}).`);
                    } else {
                        alert(`🎉 Desk #${currentlySelectedSeat} successfully allocated! Confirmation ticket dispatched to your email.`);
                    }
                    modal.classList.remove("modal-visible");
                    currentlySelectedSeat = null;
                    targetDisplay.textContent = "None";
                    actionBtn.disabled = true;
                    document.getElementById("slider-control-wrapper").style.display = "none";
                    loadSeatLayoutGrid();
                } else {
                    alert("Allocation conflict detected. Please select another slot.");
                }
            } catch (err) {
                alert("Transaction processing framework exception.");
            } finally {
                finalBtn.disabled = false;
                finalBtn.textContent = "Lock Desk Space & Dispatched Email Ticket ✉";
            }
        });

        loadSeatLayoutGrid();
    }
});