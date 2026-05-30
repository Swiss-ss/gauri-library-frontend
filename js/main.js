const isLocal = 
    window.location.hostname === "localhost" || 
    window.location.hostname === "127.0.0.1" || 
    window.location.hostname.startsWith("192.168.") || 
    window.location.hostname.startsWith("10.") || 
    window.location.hostname.startsWith("172.") || 
    window.location.hostname === "";

const API_BASE_URL = isLocal
    ? `http://${window.location.hostname || "localhost"}:3000`
    : "https://gauri-library-backend.onrender.com";

document.addEventListener("DOMContentLoaded", function () {

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

    // Security Gate: Protect spaces.html and admin.html from bypasses
    if (window.location.pathname.includes("spaces.html")) {
        if (!activeUser) {
            alert("🔒 Security Access Pass required. Please sign in first.");
            window.location.href = "login.html";
            return;
        }
    }

    if (window.location.pathname.includes("admin.html")) {
        if (!activeUser) {
            alert("🔒 Security Access Pass required. Please sign in first.");
            window.location.href = "login.html";
            return;
        }
        if (activeUser.role !== "admin") {
            alert("🔒 Admin clearance required to access the occupancy ledger.");
            window.location.href = "spaces.html";
            return;
        }
    }

    // -------------------------------------------------------------------------
    // 2. GOOGLE SIGN-IN AUTHENTICATION GATEWAY (login.html actions)
    // -------------------------------------------------------------------------
    const googleBtnContainer = document.getElementById("google-signin-btn-container");

    if (googleBtnContainer) {
        async function initGoogleSignIn() {
            // Check if GSI library is loaded, retry if not yet available
            if (typeof google === "undefined" || !google.accounts || !google.accounts.id) {
                setTimeout(initGoogleSignIn, 300);
                return;
            }

            try {
                // Fetch the Google Client ID from backend config
                const res = await fetch(`${API_BASE_URL}/api/auth/google-config`);
                const data = await res.json();

                if (data.clientId) {
                    // Initialize GIS
                    google.accounts.id.initialize({
                        client_id: data.clientId,
                        callback: handleGoogleCredentialResponse
                    });

                    // Render Google button
                    google.accounts.id.renderButton(
                        document.getElementById("google-signin-btn"),
                        { 
                            theme: "filled_blue", 
                            size: "large", 
                            width: 320,
                            text: "signin_with",
                            shape: "pill"
                        }
                    );
                } else {
                    document.getElementById("google-signin-btn").innerHTML = `
                        <div style="background-color: #fee2e2; border: 2px solid #ef4444; color: #b91c1c; padding: 15px; border-radius: 12px; font-weight: bold; font-size: 13px; text-align: center;">
                            ⚠️ Backend Google Auth Missing!<br>
                            Please define GOOGLE_CLIENT_ID in the backend server's .env file.
                        </div>
                    `;
                }
            } catch (err) {
                console.error("Google Sign-In configuration error:", err);
                document.getElementById("google-signin-btn").innerHTML = `
                    <div style="background-color: #fee2e2; border: 2px solid #ef4444; color: #b91c1c; padding: 15px; border-radius: 12px; font-weight: bold; font-size: 13px; text-align: center;">
                        ❌ Cannot connect to backend auth service.
                    </div>
                `;
            }
        }

        async function handleGoogleCredentialResponse(response) {
            const btn = document.getElementById("google-signin-btn");
            btn.innerHTML = `<span style="font-weight: bold; color: #122244;">Authenticating Session... ⏳</span>`;

            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/google-login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ credential: response.credential })
                });

                const data = await res.json();
                if (res.ok && data.success) {
                    sessionStorage.setItem("library_user", JSON.stringify({ 
                        name: data.name, 
                        email: data.email, 
                        role: data.role 
                    }));
                    window.location.href = data.role === "admin" ? "admin.html" : "spaces.html";
                } else {
                    alert(`❌ Authentication Failed: ${data.error || "Unknown Error"}`);
                    initGoogleSignIn(); // Re-render button
                }
            } catch (err) {
                alert("❌ Authentication request failed. Verify backend server is active.");
                initGoogleSignIn(); // Re-render button
            }
        }

        // Trigger loading routine
        initGoogleSignIn();
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
                gridContainer.innerHTML = `
                    <div style='text-align:center; padding: 40px 0;'>
                        <p style='font-weight:bold; margin-bottom: 10px;'>🍃 Connecting to Cloud Infrastructure...</p>
                        <p style='font-size: 12px; color: #666; max-width: 250px; margin: 0 auto; line-height: 1.4;'>
                            Syncing databases from Render. Please wait... ⏳
                        </p>
                    </div>
                `;
                
                const res = await fetch(`${API_BASE_URL}/api/seats`);
                const seatLayoutArray = await res.json();
                gridContainer.innerHTML = "";

                // Create Map Wrapper
                const mapWrapper = document.createElement("div");
                mapWrapper.className = "library-map-wrapper";

                // Left Wing: 5 blocks of 8 seats (starts: 1, 17, 33, 49, 65)
                const leftWing = document.createElement("div");
                leftWing.className = "column-wing left-wing";
                leftWing.innerHTML = `<h3 class="wing-title"><i class="fa-solid fa-graduation-cap"></i> Left Wing</h3>`;
                for (let r = 0; r < 5; r++) {
                    const startSeatNo = r * 16 + 1;
                    const blockNode = createDeskBlock(startSeatNo, seatLayoutArray);
                    leftWing.appendChild(blockNode);
                }

                // Central Aisle
                const aisle = document.createElement("div");
                aisle.className = "aisle-spacer-central";
                aisle.innerHTML = `<div class="aisle-text">WALKING AISLE</div>`;

                // Right Wing: 4 blocks of 8 seats (starts: 9, 25, 41, 57)
                const rightWing = document.createElement("div");
                rightWing.className = "column-wing right-wing";
                rightWing.innerHTML = `<h3 class="wing-title"><i class="fa-solid fa-award"></i> Right Wing</h3>`;
                for (let r = 0; r < 4; r++) {
                    const startSeatNo = r * 16 + 9;
                    const blockNode = createDeskBlock(startSeatNo, seatLayoutArray);
                    rightWing.appendChild(blockNode);
                }

                mapWrapper.appendChild(leftWing);
                mapWrapper.appendChild(aisle);
                mapWrapper.appendChild(rightWing);
                
                gridContainer.appendChild(mapWrapper);

            } catch (err) {
                console.error("Grid loading fault:", err);
                gridContainer.innerHTML = `
                    <div style='text-align:center; padding: 30px; color:red; font-weight:bold;'>
                        <p>❌ Connection timeout during server boot sequence.</p>
                        <button class="btn-black-pill" onclick="location.reload()" style="margin-top: 15px; padding: 8px 20px;">Wake up & Retry Connection 🔄</button>
                    </div>
                `;
            }
        }

        function createDeskBlock(startSeatNo, seatLayoutArray) {
            const block = document.createElement("div");
            block.className = "desk-block";

            // Row 1 (4 seats)
            const row1 = document.createElement("div");
            row1.className = "desk-row";
            for (let i = 0; i < 4; i++) {
                const seatNo = startSeatNo + i;
                const seatNode = createSeatNode(seatNo, seatLayoutArray[seatNo - 1]);
                row1.appendChild(seatNode);
            }

            // Divider Partition
            const partition = document.createElement("div");
            partition.className = "desk-partition";

            // Row 2 (4 seats)
            const row2 = document.createElement("div");
            row2.className = "desk-row";
            for (let i = 4; i < 8; i++) {
                const seatNo = startSeatNo + i;
                const seatNode = createSeatNode(seatNo, seatLayoutArray[seatNo - 1]);
                row2.appendChild(seatNode);
            }

            block.appendChild(row1);
            block.appendChild(partition);
            block.appendChild(row2);
            return block;
        }

        function createSeatNode(seatNo, bookingData) {
            const desk = document.createElement("div");
            desk.className = "desk";
            desk.textContent = seatNo;

            if (bookingData) {
                desk.classList.add("occupied");
                desk.title = `Occupied by ${bookingData.name}`;
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
            return desk;
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
                    <h3 style="margin-top: 0; color: #122244; font-size: 22px; margin-bottom: 20px;">Desk Space #${seatNo} Details</h3>
                    
                    <div style="display: flex; flex-direction: column; gap: 15px; text-align: left; font-size: 15px;">
                        <div>
                            <span style="font-weight: 800; text-transform: uppercase; font-size: 12px; color: #64748b; display: block;">Aspirant Name</span>
                            <span style="font-weight: 700; font-size: 16px;">${bookingData.name || "N/A"}</span>
                        </div>
                        <div>
                            <span style="font-weight: 800; text-transform: uppercase; font-size: 12px; color: #64748b; display: block;">Contact Number</span>
                            <span style="font-weight: 700; font-size: 16px; color: #122244;">${bookingData.phone || "N/A"}</span>
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

    // -------------------------------------------------------------------------
    // 4. ABOUT PAGE QUERY FORM HANDLER
    // -------------------------------------------------------------------------
    const queryForm = document.getElementById("query-dispatch-form");
    if (queryForm) {
        queryForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById("query-submit-btn");
            submitBtn.disabled = true;
            submitBtn.textContent = "Sending query to library... ✉";

            const payload = {
                name: document.getElementById("query-name").value,
                email: document.getElementById("query-email").value,
                message: document.getElementById("query-message").value
            };

            try {
                const response = await fetch(`${API_BASE_URL}/api/submit-query`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                if (response.ok && data.success) {
                    alert("🎉 Success! Your query has been successfully dispatched to the Gauri Library Admin. We will reply to your email shortly!");
                    queryForm.reset();
                } else {
                    alert(`❌ Failed to send: ${data.error || "Please try again."}`);
                }
            } catch (err) {
                alert("❌ Connection failure: backend server is offline.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "Dispatch Query ➔";
            }
        });
    }
});