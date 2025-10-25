require("dotenv").config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const Feedback = require("./models/Feedback");

const app = express();

// ===============================
// 🌐 MongoDB Connection
// ===============================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ===============================
// ⚙️ Middleware Setup
// ===============================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
  })
);

// Make session available in all EJS templates
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// ===============================
// 🏠 Feedback Page Route
// ===============================
app.get("/", (req, res) => {
  res.render("index"); // session is available in EJS via res.locals.session
});

// ===============================
// 📨 Submit Feedback via AJAX
// ===============================
app.post("/feedback", async (req, res) => {
  try {
    const { name, email, rating, comments } = req.body;
    await Feedback.create({ name, email, rating, comments });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Error saving feedback:", err);
    res.status(500).json({ success: false, error: "Error submitting feedback" });
  }
});

// ===============================
// 🔐 Admin Login Page
// ===============================
app.get("/admin", (req, res) => {
  res.render("admin-login");
});

// ===============================
// 🔑 Admin Login Logic
// ===============================
app.post("/admin", (req, res) => {
  const { username, password } = req.body;
  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    req.session.admin = true;
    res.redirect("/dashboard");
  } else {
    res.send(`
      <h3>❌ Invalid credentials</h3>
      <a href='/admin'>Try again</a>
    `);
  }
});

// ===============================
// 🧩 Middleware: Protect Dashboard
// ===============================
function isAdmin(req, res, next) {
  if (req.session.admin) return next();
  res.redirect("/admin"); // redirect to login if not admin
}

// ===============================
// 📊 Dashboard Page (View Feedbacks)
// ===============================
app.get("/dashboard", isAdmin, async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.render("dashboard", { feedbacks });
  } catch (err) {
    console.error("❌ Error loading dashboard:", err);
    res.status(500).send("Error loading dashboard");
  }
});

// ===============================
// 🗑️ Delete Feedback via AJAX
// ===============================
app.post("/delete/:id", isAdmin, async (req, res) => {
  try {
    const feedbackId = req.params.id;
    await Feedback.findByIdAndDelete(feedbackId);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Error deleting feedback:", err);
    res.status(500).json({ success: false, error: "Error deleting feedback" });
  }
});

// ===============================
// 🔓 Logout Route
// ===============================
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("❌ Error logging out:", err);
      return res.status(500).send("Error logging out");
    }
    res.redirect("/"); // Redirect to feedback page after logout
  });
});

// ===============================
// 🚀 Start Server
// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
