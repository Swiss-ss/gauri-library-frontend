const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { LocalStorage } = require('node-localstorage');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Internal local data engine
const localStorage = new LocalStorage('./scratch');

const gmailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

function getDatabase(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
}

// 5:00 AM Auto-Reset Engine
setInterval(() => {
    const now = new Date();
    if (now.getHours() === 5 && now.getMinutes() === 0) {
        localStorage.setItem('seat_ledger', JSON.stringify({}));
        console.log("🌅 All seats successfully cleared for the day.");
    }
}, 60000);

// Live Seating Matrix Endpoint
app.get('/api/seats', (req, res) => {
    try {
        const seatLedger = getDatabase('seat_ledger');
        const dynamicArrayLayout = Array(72).fill(null);
        
        for (let i = 1; i <= 72; i++) {
            if (seatLedger[i]) {
                dynamicArrayLayout[i - 1] = seatLedger[i];
            }
        }
        res.status(200).json(dynamicArrayLayout);
    } catch (err) {
        console.error("Matrix generation error:", err);
        res.status(500).json({ error: "Internal server map error" });
    }
});

// Auth Pipelines: SIGNUP
app.post('/api/auth/signup', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ success: false, error: "Missing required fields." });
    }

    const usersDB = getDatabase('users_list');
    const cleanEmail = email.trim().toLowerCase();

    if (usersDB[cleanEmail]) {
        return res.status(400).json({ success: false, error: "Account exists." });
    }

    // Determine role dynamically based on Env variables
    const assignRole = (process.env.ADMIN_EMAIL && cleanEmail === process.env.ADMIN_EMAIL.toLowerCase()) ? 'admin' : 'student';
    
    usersDB[cleanEmail] = { name, password, role: assignRole };
    localStorage.setItem('users_list', JSON.stringify(usersDB));

    res.status(200).json({ success: true, role: assignRole, name });
});

// Auth Pipelines: LOGIN
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, error: "Missing fields." });
    }

    const usersDB = getDatabase('users_list');
    const cleanEmail = email.trim().toLowerCase();
    const user = usersDB[cleanEmail];

    if (!user || user.password !== password) {
        return res.status(401).json({ success: false, error: "Invalid credentials." });
    }

    // Dynamic Admin Role Enforcement Override
    let activeRole = user.role || 'student';
    if (process.env.ADMIN_EMAIL && cleanEmail === process.env.ADMIN_EMAIL.toLowerCase()) {
        activeRole = 'admin';
    }

    res.status(200).json({ 
        success: true, 
        role: activeRole, 
        name: user.name, 
        email: cleanEmail 
    });
});

// Seat Allocation & Safe Email Dispatcher
app.post('/api/allocate-seat', (req, res) => {
    const { studentName, studentPhone, studentEmail, seatNumber, duration } = req.body;
    const seatLedger = getDatabase('seat_ledger');

    if (seatLedger[seatNumber]) {
        return res.status(400).json({ success: false, error: "Occupied!" });
    }

    // Write to file database instantly
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
        subject: `[CONFIRMATION] Gauri Library Desk #${seatNumber}`,
        text: `Hello ${studentName},\n\nYour study desk space selection at Gauri Library has been booked!\n\n• Seat: Desk Space #${seatNumber}\n• Duration Limit: ${duration} Hours Plan`
    };

    // Safe delivery execution check
    gmailTransporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("❌ Gmail Transporter Error:", error);
            // We STILL send success: true so the seat registers on the web UI layout 
            // even if the confirmation mail fails or logs a timeout.
            return res.status(200).json({ success: true, note: "Mail system offline, space locked." });
        }
        res.status(200).json({ success: true });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running smoothly on Port ${PORT}`));