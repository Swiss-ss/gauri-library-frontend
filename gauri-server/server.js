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
const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/gauri-library";
mongoose.connect(mongoURI)
    .then(() => console.log(`🍃 MongoDB connected successfully! Target: ${mongoURI.startsWith("mongodb://127.0.0.1") ? "Local Database Instance" : "Cloud Cluster"}`))
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
            console.log("🌅 Daily Morning Reset: All 16 database seat layouts cleared permanently.");
        } catch (err) {
            console.error("Reset routine failure:", err);
        }
    }
}, 60000);

const appPassword = process.env.GMAIL_APP_PASSWORD ? process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '') : '';

const gmailTransporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.GMAIL_USER,
        pass: appPassword
    }
});

// Verify SMTP connection on startup
gmailTransporter.verify((error, success) => {
    if (error) {
        console.error("❌ Gmail SMTP verification failed:", error.message);
    } else {
        console.log("📨 Gmail SMTP connection verified! Ready to dispatch tickets.");
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
        const dynamicArrayLayout = Array(16).fill(null);
        
        occupiedSeats.forEach(seat => {
            if (seat.seatNumber >= 1 && seat.seatNumber <= 16) {
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

// Memory Cache for OTP Authentication Codes
const otps = new Map(); // email -> { otp, expires }

// Send 6-Digit OTP via Nodemailer
app.post('/api/auth/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, error: "Gmail address is required." });
        }
        const cleanEmail = email.trim().toLowerCase();

        if (!cleanEmail.endsWith("@gmail.com")) {
            return res.status(400).json({ success: false, error: "Only Gmail (@gmail.com) addresses are permitted." });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = Date.now() + 5 * 60 * 1000; // 5 minutes validity
        otps.set(cleanEmail, { otp, expires });

        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: cleanEmail,
            subject: `[OTP VERIFICATION] Gauri Library Portal Access Code`,
            text: `Hello Aspirant,\n\nYour 6-digit Gauri Library login verification code is:\n\n🔑 ${otp}\n\nThis verification code is valid for 5 minutes. Please do not share this OTP code with anyone.`
        };

        gmailTransporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("❌ Send OTP Mail Error:", error);
                return res.status(500).json({ success: false, error: "Failed to send code via Gmail: " + error.message });
            }
            res.status(200).json({ success: true, message: "Verification code sent to your email!" });
        });
    } catch (err) {
        console.error("Send OTP error:", err);
        res.status(500).json({ success: false, error: "Nodemailer dispatch processing exception." });
    }
});

// Verify OTP & Complete Login / Register
app.post('/api/auth/verify-otp', async (req, res) => {
    try {
        const { email, otp, name } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ success: false, error: "Email and verification code are required." });
        }
        const cleanEmail = email.trim().toLowerCase();

        const record = otps.get(cleanEmail);
        if (!record || record.otp !== otp || Date.now() > record.expires) {
            return res.status(400).json({ success: false, error: "Invalid or expired login code." });
        }

        // Verification success - clear the code
        otps.delete(cleanEmail);

        let user = await User.findOne({ email: cleanEmail });
        const assignRole = (process.env.ADMIN_EMAIL && cleanEmail === process.env.ADMIN_EMAIL.toLowerCase()) ? 'admin' : 'student';

        if (!user) {
            user = new User({
                name: name || cleanEmail.split('@')[0],
                email: cleanEmail,
                password: "passwordless-otp",
                role: assignRole
            });
            await user.save();
        } else {
            if (user.role !== assignRole) {
                user.role = assignRole;
                await user.save();
            }
        }

        res.status(200).json({ success: true, role: user.role, name: user.name, email: cleanEmail });
    } catch (err) {
        console.error("Verify OTP error:", err);
        res.status(500).json({ success: false, error: "OTP validation system processing exception." });
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
                // Return success: true but with mailSent: false and error message
                return res.status(200).json({ success: true, mailSent: false, error: error.message });
            }
            res.status(200).json({ success: true, mailSent: true });
        });
    } catch (err) {
        console.error("Allocation error:", err);
        res.status(500).json({ success: false, error: "Allocation transaction system fault." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running smoothly on Port ${PORT}`));