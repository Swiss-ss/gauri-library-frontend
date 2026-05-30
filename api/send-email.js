// Gauri Library Vercel Email Gateway Router - Production Environment Active
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Try to load env variables from .env file if running locally or committed
let GMAIL_USER = process.env.GMAIL_USER;
let GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    try {
        const envPath = path.resolve(process.cwd(), 'gauri-server/.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            envContent.split('\n').forEach(line => {
                const parts = line.split('=');
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const value = parts.slice(1).join('=').trim();
                    if (key === 'GMAIL_USER') GMAIL_USER = value;
                    if (key === 'GMAIL_APP_PASSWORD') GMAIL_APP_PASSWORD = value;
                }
            });
        }
    } catch (e) {
        console.error("Error reading fallback .env file:", e);
    }
}

module.exports = async (req, res) => {
    // Enable CORS for Render backend calling
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { to, subject, text } = req.body;
    if (!to || !subject || !text) {
        return res.status(400).json({ error: 'Missing required parameters (to, subject, text)' });
    }

    const finalUser = GMAIL_USER || process.env.GMAIL_USER;
    const finalPass = GMAIL_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD;
    const cleanPass = finalPass ? finalPass.replace(/\s+/g, '') : '';

    if (!finalUser || !cleanPass) {
        return res.status(500).json({ error: 'Email credentials not configured on host.' });
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: finalUser,
            pass: cleanPass
        }
    });

    try {
        await transporter.sendMail({
            from: finalUser,
            to,
            subject,
            text
        });
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Nodemailer Vercel execution error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
