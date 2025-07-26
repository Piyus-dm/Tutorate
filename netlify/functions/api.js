const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors({ origin: true }));
app.use(bodyParser.json());

// Serve static files (HTML, CSS, JS, images)
app.use(express.static('.')); // Remove this line

// Serve index.html at root
// app.get('/', (req, res) => { // Remove this block
//   res.sendFile(path.join(__dirname, 'index.html'));
// });

// Helper functions
function readJSON(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function writeJSON(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

// GET all tutors
app.get("/api/tutors", (req, res) => {
const tutors = readJSON(path.join(__dirname, "../public/tutors.json")); // Update path
  res.json(tutors);
});

// GET all ratings (optional)
app.get("/api/ratings", (req, res) => {
const ratings = readJSON(path.join(__dirname, "../public/ratings.json")); // Update path
  res.json(ratings);
});

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({ message: "Test endpoint working" });
});

// POST check if user can rate a tutor (cooldown check)
console.log("Registering /api/can-rate endpoint");
app.post("/api/can-rate", (req, res) => {
  console.log("can-rate endpoint called with:", req.body);
  const { tutorId, deviceId } = req.body;

const ratingsPath = path.join(__dirname, "../public/ratings.json"); // Update path
  const ratings = readJSON(ratingsPath);

  // Check for 7-day cooldown period
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  // Check if this device has rated this tutor within the last 7 days
  const recentRatingByDevice = ratings.find(r =>
    r.tutorId === tutorId &&
    r.deviceId && // Only check ratings that have deviceId
    r.deviceId === deviceId &&
    new Date(r.timestamp) > sevenDaysAgo
  );

  if (recentRatingByDevice) {
    const timeLeft = new Date(new Date(recentRatingByDevice.timestamp).getTime() + 7 * 24 * 60 * 60 * 1000);
    const daysLeft = Math.ceil((timeLeft - new Date()) / (1000 * 60 * 60 * 24));
    
    return res.json({
      canRate: false,
      message: `You can rate this tutor again in ${daysLeft} day(s).`,
      nextRatingDate: timeLeft.toISOString()
    });
  }

  res.json({ canRate: true });
});

// POST new or updated rating
app.post("/api/ratings", (req, res) => {
  const { tutorId, rating, reviewText, email, deviceId, deviceInfo } = req.body;

  const ratingsPath = path.join(__dirname, "../ratings.json"); // Update path
const tutorsPath = path.join(__dirname, "../public/tutors.json"); // Update path

  const ratings = readJSON(ratingsPath);
  const tutors = readJSON(tutorsPath);

  // Check for 7-day cooldown period
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  // Check if this device has rated this tutor within the last 7 days
  // Only check ratings that have deviceId (new ratings with device tracking)
  const recentRatingByDevice = ratings.find(r =>
    r.tutorId === tutorId &&
    r.deviceId && // Only check ratings that have deviceId
    r.deviceId === deviceId &&
    new Date(r.timestamp) > sevenDaysAgo
  );

  if (recentRatingByDevice) {
    const timeLeft = new Date(new Date(recentRatingByDevice.timestamp).getTime() + 7 * 24 * 60 * 60 * 1000);
    const daysLeft = Math.ceil((timeLeft - new Date()) / (1000 * 60 * 60 * 24));
    
    return res.status(429).json({
      success: false,
      error: "COOLDOWN_ACTIVE",
      message: `You can rate this tutor again in ${daysLeft} day(s).`,
      nextRatingDate: timeLeft.toISOString()
    });
  }

  // Check if user already rated this tutor (for updates)
  const existing = ratings.find(
    r => r.tutorId === tutorId && r.email.toLowerCase() === email.toLowerCase()
  );

  if (existing) {
    // Update existing rating
    existing.rating = rating;
    existing.reviewText = reviewText;
    existing.timestamp = new Date().toISOString();
    existing.deviceId = deviceId;
    existing.deviceInfo = deviceInfo;
  } else {
    // Add new rating
    ratings.push({
      tutorId,
      rating,
      reviewText,
      email,
      deviceId,
      deviceInfo,
      timestamp: new Date().toISOString()
    });
  }

  // Save updated ratings
  writeJSON(ratingsPath, ratings);

  // Recalculate average for this tutor
  const tutorRatings = ratings.filter(r => r.tutorId === tutorId);
  const total = tutorRatings.reduce((sum, r) => sum + r.rating, 0);
  const avg = total / tutorRatings.length;

  const tutor = tutors.find(t => t.id === tutorId);
  if (tutor) {
    tutor.rating = parseFloat(avg.toFixed(1));
    tutor.reviews = tutorRatings.length;
    writeJSON(tutorsPath, tutors);
  }

  res.json({ success: true, updated: !!existing });
});

// Start server
// app.listen(PORT, () => { // Remove this block
//   console.log(`✅ Server running at http://localhost:${PORT}`);
// });

// Netlify function handler
exports.handler = async (event, context) => {
  const server = express();
  server.use(cors({ origin: true }));
  server.use(bodyParser.json());
  server.use('/api', app); // Mount the existing app under /api

  return new Promise((resolve, reject) => {
    const callback = (err, body) => {
      if (err) {
        console.error(err);
        return reject(err);
      }
      resolve({
        statusCode: 200,
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
        },
      });
    };

    server(event, context, callback);
  });
};
