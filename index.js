require("dotenv").config();

const dns = require("node:dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");

const urlSchema = new mongoose.Schema({
    original_url: {
        type: String,
        required: true,
    },
    short_url: {
        type: Number,
        required: true,
        unique: true,
    },
});

const Url = mongoose.model("Url", urlSchema);

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
    res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.post("/api/shorturl", async (req, res) => {
    console.log("POST request received:", req.body);

    const submittedUrl = req.body.url;

    let parsedUrl;

    // Validate URL format
    try {
        if (typeof submittedUrl !== "string") {
            return res.json({ error: "invalid url" });
        }

        parsedUrl = new URL(submittedUrl);

        if (
            !["http:", "https:"].includes(parsedUrl.protocol) ||
            !parsedUrl.hostname
        ) {
            return res.json({ error: "invalid url" });
        }
    } catch (err) {
        return res.json({ error: "invalid url" });
    }

    try {
        const lastUrl = await Url.findOne().sort({ short_url: -1 });
        const nextId = lastUrl ? lastUrl.short_url + 1 : 1;

        const newUrl = await Url.create({
            original_url: submittedUrl,
            short_url: nextId,
        });

        return res.json({
            original_url: newUrl.original_url,
            short_url: newUrl.short_url,
        });
    } catch (err) {
        console.error("POST /api/shorturl error:", err);
        return res.status(500).json({ error: "Database error" });
    }
});

app.get("/api/shorturl/:short_url", async (req, res) => {
    console.log("Redirect requested:", req.params.short_url);

    try {
        const shortId = Number(req.params.short_url);

        if (!Number.isInteger(shortId) || shortId < 0) {
            return res.json({ error: "No short URL found" });
        }

        const urlData = await Url.findOne({
            short_url: shortId,
        });

        if (!urlData) {
            return res.json({ error: "No short URL found" });
        }

        return res.redirect(urlData.original_url);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Database error" });
    }
});

async function startServer() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB!");

        app.listen(port, function () {
            console.log(`Listening on port ${port}`);
        });
    } catch (err) {
        console.error("MongoDB connection error:", err);
    }
}

startServer();
