const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const mongoose = require('mongoose');
const { OAuth2Client } = require('google-auth-library');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
    createdAt: { type: Date, default: Date.now },
    timestamp: { type: String, default: () => new Date().toLocaleTimeString() }
});
const Seat = mongoose.model('Seat', SeatLedgerSchema);

// Helper function to handle automated seating cleanup
async function performSeatingCleanup() {
    try {
        const now = new Date();
        const currentHours = now.getHours();
        
        // 1. Clear all seats after 10 PM (22:00) and before 6 AM
        if (currentHours >= 22 || currentHours < 6) {
            const result = await Seat.deleteMany({});
            if (result.deletedCount > 0) {
                console.log(`🌙 Night Cleanout: Wiped all ${result.deletedCount} active seat allocations after 10:00 PM / before 6:00 AM.`);
            }
        } else {
            // 2. Clear individual seats that have exceeded their booked duration
            const allSeats = await Seat.find({});
            for (const seat of allSeats) {
                const durationHours = parseInt(seat.duration) || 6;
                
                // Safe fallback for old database entries that do not have the createdAt field
                const bookingTime = seat.createdAt ? new Date(seat.createdAt).getTime() : Date.now();
                
                // Production math: A "6 Hours" booking will expire in exactly 6 hours (6 * 60 * 60 * 1000)
                const expiryTime = bookingTime + (durationHours * 60 * 60 * 1000);
                
                if (Date.now() > expiryTime) {
                    await Seat.deleteOne({ _id: seat._id });
                    console.log(`⏰ Expiry Cleanout: Seat #${seat.seatNumber} booked by ${seat.name} has expired after ${durationHours} hours.`);
                }
            }
        }
    } catch (err) {
        console.error("Seating cleanup execution fault:", err);
    }
}

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
        // Run automated cleanup for night cleanouts and individual expirations
        await performSeatingCleanup();

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

// Google Client OAuth Config Endpoint
app.get('/api/auth/google-config', (req, res) => {
    res.json({ clientId: process.env.GOOGLE_CLIENT_ID || "" });
});

// Verify Google Token & Sign In / Register
app.post('/api/auth/google-login', async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ success: false, error: "Google credentials are required." });
        }

        // Verify Google JWT Token
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const email = payload.email.trim().toLowerCase();
        const name = payload.name || email.split('@')[0];

        let user = await User.findOne({ email });
        const assignRole = (process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL.toLowerCase()) ? 'admin' : 'student';

        if (!user) {
            user = new User({
                name,
                email,
                password: "google-oauth",
                role: assignRole
            });
            await user.save();
        } else {
            if (user.role !== assignRole) {
                user.role = assignRole;
                await user.save();
            }
        }

        res.status(200).json({ success: true, role: user.role, name: user.name, email });
    } catch (err) {
        console.error("Google Auth verification failure:", err);
        res.status(401).json({ success: false, error: "Failed to verify Google login session." });
    }
});

// Admin Dashboard View Ledger
app.get('/api/admin/dashboard-ledger', async (req, res) => {
    try {
        // Run automated cleanup before displaying dashboard ledger
        await performSeatingCleanup();

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

// Submit General Inquiry Query
app.post('/api/submit-query', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ success: false, error: "All fields are required." });
        }

        const adminEmail = process.env.ADMIN_EMAIL || process.env.GMAIL_USER;
        
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: adminEmail,
            replyTo: email,
            subject: `[INQUIRY PORTAL] New Query from ${name}`,
            text: `Hello Admin,\n\nA new student inquiry has been received through the Gauri Library portal:\n\n• Name: ${name}\n• Email: ${email}\n\n📝 Query Message:\n"${message}"\n\nTo respond, simply reply to this email or send a message directly to ${email}.`
        };

        gmailTransporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("❌ Send Query Mail Error:", error);
                return res.status(500).json({ success: false, error: "Failed to dispatch email inquiry to administrator: " + error.message });
            }
            res.status(200).json({ success: true, message: "Your query has been dispatched successfully!" });
        });
    } catch (err) {
        console.error("Query submission error:", err);
        res.status(500).json({ success: false, error: "Server processing exception during inquiry dispatch." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running smoothly on Port ${PORT}`));