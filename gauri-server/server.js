const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// ==========================================================================
// MONGO_DB CLOUD CONNECTIVITY PIPELINE
// ==========================================================================
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🍃 Permanent Cloud MongoDB Cluster connected successfully!"))
    .catch(err => console.error("❌ MongoDB connection critical failure:", err));

// Database Schema Blueprints
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, default: 'student' }
});
const User = mongoose.model('User', UserSchema);

const SeatLedgerSchema = new mongoose.Schema({
    seatNumber: { type: Number, required: true, unique: true },
    name: String,
    phone: String,
    email: String,
    duration: String,
    timestamp: { type: String, default: () => new Date().toLocaleTimeString() }
});
const Seat = mongoose.model('Seat', SeatLedgerSchema);

// Automated 5:00 AM Cloud Purge
setInterval(async () => {
    const now = new Date();
    if (now.getHours() === 5 && now.getMinutes() === 0) {
        try {
            await Seat.deleteMany({});
            console.log("🌅 Daily Morning Reset: All 72 database seat layouts cleared permanently.");
        } catch (err) {
            console.error("Reset routine failure:", err);
        }
    }
}, 60000);

const gmailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

// ==========================================================================
// DATABASE INITIALIZATION ENGINE
// ==========================================================================
app.get('/api/admin/init-db', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({});
        
        if (totalUsers === 0) {
            const seedAdmin = new User({
                name: "System Admin",
                email: process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.toLowerCase() : "admin@library.com",
                password: "AdminPassword123", 
                role: "admin"
            });
            await seedAdmin.save();
            return res.status(200).json({ success: true, message: "Database schemas initialized, Admin seed generated!" });
        }
        
        res.status(200).json({ success: true, message: "Database tables are already active." });
    } catch (err) {
        console.error("Initialization fault:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================================================
// FORCE ADMIN ROLE UPGRADE ACCOUNT ENGINE
// ==========================================================================
app.get('/api/admin/make-me-admin', async (req, res) => {
    try {
        const targetEmail = "freelancingsarthak@gmail.com";
        
        const updatedUser = await User.findOneAndUpdate(
            { email: targetEmail.toLowerCase() },
            { $set: { role: 'admin' } },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(444).json({ success: false, error: "User account profile not found in MongoDB. Sign up on the website first!" });
        }

        res.status(200).json({ success: true, message: `Success! ${targetEmail} has been upgraded to ADMIN.`, profile: updatedUser });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================================================
// CORE ENDPOINTS
// ==========================================================================

// Get Seating Matrix
app.get('/api/seats', async (req, res) => {
    try {
        const occupiedSeats = await Seat.find({});
        const dynamicArrayLayout = Array(72).fill(null);
        
        occupiedSeats.forEach(seat => {
            if (seat.seatNumber >= 1 && seat.seatNumber <= 72) {
                dynamicArrayLayout[seat.seatNumber - 1] = {
                    name: seat.name,
                    phone: seat.phone,
                    email: seat.email,
                    duration: seat.duration,
                    timestamp: seat.timestamp
                };
            }
        });
        res.status(200).json(dynamicArrayLayout);
    } catch (err) {
        res.status(500).json({ error: "Failed to map seat arrays." });
    }
});

// Signup
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const cleanEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({ email: cleanEmail });
        if (existingUser) {
            return res.status(400).json({ success: false, error: "Account already exists." });
        }

        const assignRole = (process.env.ADMIN_EMAIL && cleanEmail === process.env.ADMIN_EMAIL.toLowerCase()) ? 'admin' : 'student';
        
        const newUser = new User({ name, email: cleanEmail, password, role: assignRole });
        await newUser.save();

        res.status(200).json({ success: true, role: assignRole, name });
    } catch (err) {
        res.status(500).json({ success: false, error: "Signup internal error." });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const cleanEmail = email.trim().toLowerCase();

        const user = await User.findOne({ email: cleanEmail });
        if (!user || user.password !== password) {
            return res.status(401).json({ success: false, error: "Invalid credentials." });
        }

        let activeRole = user.role || 'student';
        if (process.env.ADMIN_EMAIL && cleanEmail === process.env.ADMIN_EMAIL.toLowerCase()) {
            activeRole = 'admin';
        }

        res.status(200).json({ success: true, role: activeRole, name: user.name, email: cleanEmail });
    } catch (err) {
        res.status(500).json({ success: false, error: "Login system processing exception." });
    }
});

// Admin Dashboard View Ledger
app.get('/api/admin/dashboard-ledger', async (req, res) => {
    try {
        const occupiedSeats = await Seat.find({});
        const ledgerMap = {};
        
        occupiedSeats.forEach(seat => {
            ledgerMap[seat.seatNumber] = {
                name: seat.name,
                phone: seat.phone,
                email: seat.email,
                duration: seat.duration,
                timestamp: seat.timestamp
            };
        });
        res.status(200).json({ success: true, ledger: ledgerMap });
    } catch (err) {
        res.status(500).json({ success: false, error: "Ledger fetch processing error." });
    }
});

// Reserve Seat & Email Ticket
app.post('/api/allocate-seat', async (req, res) => {
    try {
        const { studentName, studentPhone, studentEmail, seatNumber, duration } = req.body;
        const targetSeatNum = parseInt(seatNumber);

        const alreadyTaken = await Seat.findOne({ seatNumber: targetSeatNum });
        if (alreadyTaken) {
            return res.status(400).json({ success: false, error: "Occupied!" });
        }

        const newReservation = new Seat({
            seatNumber: targetSeatNum,
            name: studentName,
            phone: studentPhone,
            email: studentEmail,
            duration: duration
        });
        await newReservation.save();

        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: studentEmail,
            subject: `[CONFIRMATION] Gauri Library Desk #${targetSeatNum}`,
            text: `Hello ${studentName},\n\nYour study desk space selection at Gauri Library has been booked!\n\n• Seat: Desk Space #${targetSeatNum}\n• Duration Limit: ${duration} Hours Plan`
        };

        gmailTransporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("❌ Gmail Transporter Error:", error);
                return res.status(200).json({ success: true, note: "Mail system offline, space locked in cluster." });
            }
            res.status(200).json({ success: true });
        });
    } catch (err) {
        res.status(500).json({ success: false, error: "Allocation transaction system fault." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running smoothly on Port ${PORT}`));