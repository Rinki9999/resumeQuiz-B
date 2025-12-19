// backend/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

// ----------------------
// CORS SETTINGS (Correct)
// ----------------------
const allowedOrigins = [
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "https://rinki9999.github.io",
  "https://rinki9999.github.io/resumeQuiz-F",
  "https://resume-quiz-b.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("❌ Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS: " + origin));
      }
    },
    credentials: true,
  })
);


// Parse JSON
app.use(express.json());
const PORT = process.env.PORT || 4000;

// ----------------------
// MODELS + ROUTES
// ----------------------
const User = require("./models/User");
const bcrypt = require("bcryptjs");
const Streak = require("./models/Streak");
const signupRoute = require("./routes/signup");
const loginRoute = require("./routes/login");

// Correct API route prefixes
app.use("/api/signup", signupRoute);
app.use("/api/login", loginRoute);

// ----------------------
// MONGO CONNECT
// ----------------------
mongoose
  .connect(process.env.MONGODB_URI, {})
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err.message));

// ----------------------
// GROQ AI
// ----------------------
const Groq = require("groq-sdk");
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ----------------------
// HEALTH CHECK
// ----------------------
app.get("/", (req, res) => {
  res.send({ ok: true, msg: "Aptitude Groq backend running" });
});

// ----------------------
// API TEST ROUTE
// ----------------------
app.get("/api", (req, res) => res.send("API is running🔥"));

// ----------------------
// UPDATE STREAK (fixed)
// ----------------------
app.post("/api/update-streak", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId)
      return res.status(400).json({ error: "userId required" });

    const today = new Date();
    const todayStr = today.toDateString();

    let user = await Streak.findOne({ userId });

    if (!user) {
      user = new Streak({
        userId,
        currentStreak: 1,
        bestStreak: 1,
        lastQuizDate: today,
      });
    } else {
      const last = user.lastQuizDate
        ? user.lastQuizDate.toDateString()
        : null;

      const yesterdayStr = new Date(Date.now() - 86400000).toDateString();

      if (last === todayStr) {
        // already counted
      } else if (last === yesterdayStr) {
        user.currentStreak += 1;
      } else {
        user.currentStreak = 1;
      }

      if (user.currentStreak > user.bestStreak) {
        user.bestStreak = user.currentStreak;
      }

      user.lastQuizDate = today;
    }

    await user.save();

    res.json({
      ok: true,
      currentStreak: user.currentStreak,
      bestStreak: user.bestStreak,
    });
  } catch (err) {
    res.status(500).json({ error: "Streak update failed" });
  }
});

// ----------------------
// GENERATE QUESTIONS (fixed)
// ----------------------
app.post("/api/generate", async (req, res) => {
  try {
    const { topics = [], difficulty = "basic", perTopic = 3 } = req.body;

    const prompt = buildPrompt(topics, difficulty, perTopic);

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "Return STRICT JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    });

    const textOutput = response.choices[0].message.content;

    let parsed;
    try {
      parsed = JSON.parse(textOutput);
    } catch {
      const first = textOutput.indexOf("[");
      const last = textOutput.lastIndexOf("]");
      if (first !== -1 && last !== -1) {
        parsed = JSON.parse(textOutput.slice(first, last + 1));
      } else {
        throw new Error("AI returned invalid JSON");
      }
    }

    res.json({ ok: true, questions: parsed });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate questions" });
  }
});

// ----------------------
// PROMPT BUILDER
// ----------------------
function buildPrompt(topics, difficulty, perTopic) {
  const topicsList =
    topics.length > 0
      ? topics.join(", ")
      : "Percentages, Ratio & Proportion, Time & Work, Profit & Loss, Probability";

  return `
Generate ${perTopic} multiple-choice questions PER TOPIC for: ${topicsList}.
Difficulty: ${difficulty}

IMPORTANT:
- Use ONLY Indian currency (₹ / INR), NOT dollars ($)
- Use Indian number format (₹1,000, ₹10,000, ₹1,00,000)
- Questions must be suitable for Indian students

Return STRICT JSON ONLY, like:
[
  {
    "topic": "Percentages",
    "question": "Example question?",
    "options": ["A", "B", "C", "D"],
    "answer": "A",
    "explain": "Short explanation"
  }
]

Rules:
- No extra text
- No commentary
- Options must be unique
- Answer must match one option
`;
}


// ----------------------
// GET STREAK (fixed)
// ----------------------
app.get("/api/get-streak", async (req, res) => {
  try {
    const userId = req.query.userId;

    const user = await Streak.findOne({ userId });

    if (!user)
      return res.json({ ok: true, currentStreak: 0, bestStreak: 0 });

    res.json({
      ok: true,
      currentStreak: user.currentStreak,
      bestStreak: user.bestStreak,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load streak" });
  }
});

// ----------------------
// START SERVER
// ----------------------
app.get("/api", (req, res) => res.send("API is running🔥"));

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
