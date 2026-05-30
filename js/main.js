// Environment-Aware Backend Gateway URI
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
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

    // Security Gate: Protect spaces.html directly from custom URL bar entry bypasses
    if (window.location.pathname.includes("spaces.html") && !activeUser) {
        alert("🔒 Security Access Pass required. Please sign in first.");
        window.location.href = "login.html";
        return;
    }

    // -------------------------------------------------------------------------
    // 2. AUTHENTICATION GATEWAY PIPELINES (login.html actions)
    // -------------------------------------------------------------------------
    const otpRequestForm = document.getElementById("otp-request-action-form");
    const otpVerifyForm = document.getElementById("otp-verify-action-form");

    if (otpRequestForm) {
        otpRequestForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById("otp-email");
            const sendBtn = document.getElementById("send-otp-btn");
            const email = emailInput.value.trim();

            if (!email.toLowerCase().endsWith("@gmail.com")) {
                alert("🔒 Access Constraint: Please enter a valid Gmail address (@gmail.com).");
                return;
            }

            sendBtn.disabled = true;
            sendBtn.textContent = "Sending Login Code... ⏳";

            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    alert(`✉ Verification code sent successfully to ${email}! Please check your Gmail inbox.`);
                    document.getElementById("auth-subheadline").textContent = `We have sent a 6-digit login verification code to: ${email}. Enter details to log in.`;
                    otpRequestForm.style.display = "none";
                    otpVerifyForm.style.display = "flex";
                } else {
                    alert(`❌ Failed to send code: ${data.error}`);
                    sendBtn.disabled = false;
                    sendBtn.textContent = "Send Login Code ✉";
                }
            } catch (err) {
                alert("Server connection failed. Please ensure the backend server is running.");
                sendBtn.disabled = false;
                sendBtn.textContent = "Send Login Code ✉";
            }
        });
    }

    if (otpVerifyForm) {
        otpVerifyForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("otp-email").value.trim();
            const name = document.getElementById("otp-name").value.trim();
            const code = document.getElementById("otp-code").value.trim();
            const verifyBtn = document.getElementById("verify-otp-btn");

            verifyBtn.disabled = true;
            verifyBtn.textContent = "Verifying Code... ⏳";

            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, name, otp: code })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    sessionStorage.setItem("library_user", JSON.stringify({ name: data.name, email: data.email, role: data.role }));
                    window.location.href = data.role === "admin" ? "admin.html" : "spaces.html";
                } else {
                    alert(`❌ Verification Failed: ${data.error}`);
                    verifyBtn.disabled = false;
                    verifyBtn.textContent = "Verify & Access Workspace ➔";
                }
            } catch (err) {
                alert("Verification failed. Server connection issue.");
                verifyBtn.disabled = false;
                verifyBtn.textContent = "Verify & Access Workspace ➔";
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