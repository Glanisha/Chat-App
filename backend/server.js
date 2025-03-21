const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGODB_URL);
mongoose.connection;

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
});
const User = mongoose.model("User", userSchema);

const JWT_SECRET = process.env.JWT_SECRET;
const GEMINI_API_KEY = process.env.GEMINI; 
const maxConnections = 2;

const registerAIUser = async () => {
  const aiUsername = "AI";
  const aiPassword = "ai_password"; 
  const hashedPassword = await bcrypt.hash(aiPassword, 10);

  try {
    const aiUser = new User({ username: aiUsername, password: hashedPassword });
    await aiUser.save();
    console.log("AI user registered successfully");
  } catch (error) {
    if (error.code === 11000) {
      console.log("AI user already exists");
    } else {
      console.error("Error registering AI user:", error);
    }
  }
};

registerAIUser(); 

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: "Username already exists" });
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ token, userId: user._id, username: user.username });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

const onlineUsers = new Map();

const getGeminiResponse = async (message) => {
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await axios.post(
      GEMINI_API_URL,
      {
        contents: [
          {
            parts: [
              {
                text: message,
              },
            ],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const generatedText = response.data.candidates[0].content.parts[0].text;
    return generatedText;
  } catch (error) {
    console.error("Error fetching response from Gemini:", error);
    return "Sorry, I couldn't process your request.";
  }
};

io.on("connection", (socket) => {
  if (onlineUsers.size >= maxConnections) {
    console.log(`Max users reached. Disconnecting: ${socket.id}`);
    socket.disconnect(true); // Disconnect extra users
    return;
  }

  console.log("A user connected:", socket.id);

  // Listen for "login" event to track online users
  socket.on("login", (userId) => {
    onlineUsers.set(userId, socket.id); // Map userId to socketId
    console.log(`User ${userId} is online`);
  });

  // Listen for "privateMessage" event
  socket.on("privateMessage", async ({ senderId, receiverUsername, message }) => {
    try {
      const receiver = await User.findOne({ username: receiverUsername });
      if (!receiver) {
        console.log(`User ${receiverUsername} not found`);
        return;
      }

      // Check if the receiver is the AI
      if (receiver.username === "AI") {
        // Get response from Gemini
        const aiResponse = await getGeminiResponse(message);

        // Send the AI's response back to the sender
        const senderSocketId = onlineUsers.get(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("privateMessage", {
            senderId: receiver._id.toString(),
            message: aiResponse,
          });
        }
      } else {
        // Forward message to the receiver
        const receiverSocketId = onlineUsers.get(receiver._id.toString());
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("privateMessage", { senderId, message });
        } else {
          console.log(`User ${receiverUsername} is offline`);
        }
      }
    } catch (error) {
      console.error("Error sending private message:", error);
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    onlineUsers.forEach((value, key) => {
      if (value === socket.id) {
        onlineUsers.delete(key); // Remove user from online users
        console.log(`User ${key} disconnected`);
      }
    });
  });
});

server.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});