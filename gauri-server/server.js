const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { LocalStorage } = require('node-localstorage');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const localStorage = new LocalStorage('./scratch');

const gmailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

// Helper Functions to manage data files
function getDatabase(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
}

// ----------------------------------------------------------------------
// AUTOMATED MORNING RESET ENGINE
// ----------------------------------------------------------------------
// Runs once every minute to clear the ledger back to empty at 5:00 AM daily
setInterval(() => {
    const now = new Date();
    if (now.getHours() === 5 && now.getMinutes() === 0) {
        localStorage.setItem('seat_ledger', JSON.stringify({}));
        console.log("🌅 Morning cleaning routine complete: All 72 seats reset to empty.");
    }
}, 60000);

// ----------------------------------------------------------------------
// SEAT RETRIEVAL ENDPOINT
// ----------------------------------------------------------------------
// Maps the persistent JSON data into a clean 72-position array for the frontend matrix
app.get('/api/seats', (req, res) => {
    const seatLedger = getDatabase('seat_ledger');
    const dynamicArrayLayout = Array(72).fill(null);
    
    for (let i = 1; i <= 72; i++) {
        if (seatLedger[i]) {
            dynamicArrayLayout[i - 1] = seatLedger[i];
        }
    }
    res.status(200).json(dynamicArrayLayout);
});

// ----------------------------------------------------------------------
// 1. SIGN UP ENDPOINT
// ----------------------------------------------------------------------
app.post('/api/auth/signup', (req, res) => {
    const { name, email, password } = req.body;
    const usersDB = getDatabase('users_list');

    if (usersDB[email.toLowerCase()]) {
        return res.status(400).json({ success: false, error: "Account with this email already exists." });
    }

    const assignRole = (email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()) ? 'admin' : 'student';

    usersDB[email.toLowerCase()] = { name, password, role: assignRole };
    localStorage.setItem('users_list', JSON.stringify(usersDB));

    res.status(200).json({ success: true, role: assignRole, name });
});

// ----------------------------------------------------------------------
// 2. LOGIN ENDPOINT
// ----------------------------------------------------------------------
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const usersDB = getDatabase('users_list');
    const user = usersDB[email.toLowerCase()];

    if (!user || user.password !== password) {
        return res.status(401).json({ success: false, error: "Invalid email credentials or wrong password password." });
    }

    let activeRole = user.role;
    if (email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()) {
        activeRole = 'admin';
    }

    res.status(200).json({ 
        success: true, 
        role: activeRole, 
        name: user.name, 
        email: email.toLowerCase() 
    });
});

// ----------------------------------------------------------------------
// 3. ADMIN ENDPOINT: GET SEATING DATA FOR LEDGER
// ----------------------------------------------------------------------
app.get('/api/admin/dashboard-ledger', (req, res) => {
    const seatLedger = getDatabase('seat_ledger');
    res.status(200).json({ success: true, ledger: seatLedger });
});

// ----------------------------------------------------------------------
// 4. STUDENT ENDPOINT: ALLOCATE AND BOOK SEAT
// ----------------------------------------------------------------------
app.post('/api/allocate-seat', (req, res) => {
    const { studentName, studentPhone, studentEmail, seatNumber, duration } = req.body;
    const seatLedger = getDatabase('seat_ledger');

    // Prevent overwriting a desk workspace node if someone else filled it first
    if (seatLedger[seatNumber]) {
        return res.status(400).json({ success: false, error: "This desk has already been occupied!" });
    }

    // Save allocation into the server state
    seatLedger[seatNumber] = {
        name: studentName,
        phone: studentPhone,
        email: studentEmail,
        duration: duration,
        timestamp: new Date().toLocaleTimeString()
    };
    localStorage.setItem('seat_ledger', JSON.stringify(seatLedger));

    const mailOptions = {
        from: process.env.GMAIL_USER,
        to: studentEmail,
        subject: `[CONFIRMATION TICKET] Gauri Library Desk #${seatNumber}`,
        text: `Hello ${studentName},\n\nYour study desk space selection at Gauri Library has been booked!\n\n• Seat: Desk Space #${seatNumber}\n• Duration Limit: ${duration} Hours Plan\n\nPreparation Meets Progress.`
    };

    gmailTransporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Mail system warning:", error);
            // We still respond with success: true because the seat reservation is safely saved in local storage!
            return res.status(200).json({ success: true, message: "Seat booked locally, notification pending." });
        }
        // Send complete success confirmation packet back to frontend main.js
        res.status(200).json({ success: true, message: "Seat booked and confirmation email sent!" });
    });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Gauri Server running smoothly on Port ${PORT}`));