// Production Live Backend Gateway URI
const API_BASE_URL = "https://gauri-library-backend.onrender.com";

document.addEventListener("DOMContentLoaded", function () {
    // -------------------------------------------------------------------------
    // 1. DYNAMIC NAVIGATION AUTH STATUS & ROUTING TRACKER
    // -------------------------------------------------------------------------
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

    // Security Gate: Protect spaces.html from unauthenticated visitors
    if (window.location.pathname.includes("spaces.html") && !activeUser) {
        alert("🔒 Security Access Pass required. Please sign in first.");
        window.location.href = "login.html";
        return;
    }

    // -------------------------------------------------------------------------
    // 2. AUTHENTICATION GATEWAY PIPELINES (login.html actions)
    // -------------------------------------------------------------------------
    const signupForm = document.getElementById("signup-action-form");
    const loginForm = document.getElementById("login-action-form");

    if (signupForm) {
        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("signup-name").value;
            const email = document.getElementById("signup-email").value;
            const password = document.getElementById("signup-password").value;

            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, password })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    alert("✨ Account registered successfully! Logging you in...");
                    sessionStorage.setItem("library_user", JSON.stringify({ name: data.name, email: email, role: data.role }));
                    window.location.href = data.role === "admin" ? "admin.html" : "spaces.html";
                } else {
                    alert(`❌ Signup Failed: ${data.error}`);
                }
            } catch (err) {
                alert("Server connectivity offline. Please try again.");
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("login-email").value;
            const password = document.getElementById("login-password").value;

            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
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
    const gridContainer = document.getElementById("dynamic-72-seat-grid");
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
                gridContainer.innerHTML = "<p style='grid-column: span 13; text-align:center; font-weight:bold;'>Syncing layout geometry... ⏳</p>";
                const res = await fetch(`${API_BASE_URL}/api/seats`);
                const seatLayoutArray = await res.json();
                gridContainer.innerHTML = "";

                let structuralIndex = 1;
                // Generate 72 theater layout slots (6 columns - aisle - 6 columns)
                for (let row = 0; row < 6; row++) {
                    // Left Wing Block
                    for (let col = 0; col < 6; col++) {
                        appendDeskNode(structuralIndex, seatLayoutArray[structuralIndex - 1]);
                        structuralIndex++;
                    }
                    // Theater Central Aisle Way Spacer
                    const aisle = document.createElement("div");
                    aisle.className = "aisle-spacer";
                    gridContainer.appendChild(aisle);
                    // Right Wing Block
                    for (let col = 0; col < 6; col++) {
                        appendDeskNode(structuralIndex, seatLayoutArray[structuralIndex - 1]);
                        structuralIndex++;
                    }
                }
            } catch (err) {
                gridContainer.innerHTML = "<p style='grid-column: span 13; text-align:center; color:red; font-weight:bold;'>❌ Failed to load seat maps. Verify backend server connectivity.</p>";
            }
        }

        function appendDeskNode(seatNo, bookingData) {
            const desk = document.createElement("div");
            desk.className = "desk";
            desk.textContent = seatNo;

            if (bookingData) {
                desk.classList.add("occupied");
                desk.title = `Occupied by an active aspirant`;
            } else {
                desk.classList.add("available");
                desk.addEventListener("click", () => {
                    // Toggle selections cleanly theater style
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
                        // Slide open the time allocator bar layout right beneath
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
                
                if (response.ok) {
                    alert(`🎉 Desk #${currentlySelectedSeat} successfully allocated! Confirmation ticket dispatched to your email.`);
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