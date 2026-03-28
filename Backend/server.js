const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/backend_aaditya");
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB Connection Error: " + err);
    process.exit(1);
  }
}

const app = express();

app.use(express.json());
app.use(cors());

const User = mongoose.model("User", new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  }
}, { timestamps: true }));

const Chats = mongoose.model("Chat", new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message"
  }
}, { timestamps: true}));

const Message = mongoose.model("Message", new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chat",
    required: true
  },
  content: {
    type: String,
    required: true
  }
}, { timestamps: true }));

const PORT = 5000;

const createUser = async (name, email, password) => {
  try {
    const user = new User({
      name: name,
      email: email,
      password: password
    });
    const savedUser = await user.save();
    console.log("New User Created: " + savedUser);
    return true;
  } catch (err) {
    console.error("Sign Up Error: " + err);
    return false;
  }
};

const checkUser = async(email, password) => {
  const user = await User.findOne( { email: email, password: password });
  return user;
};

const startServer = async () => {
  await connectDB();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
       methods: ["GET", "POST"]
    }
  });
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    socket.on("join", (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined room`);
    });
    socket.on("send_message", async (data) => {
      const { sender, chatId, content } = data;
      try {
        const newMessage = new Message({
          sender,
          chat: chatId,
          content
        });
        const savedMessage = await newMessage.save();
        const chat = await Chats.findById(chatId);
        chat.participants.forEach((userId) => {
          io.to(userId.toString()).emit("receive_message", savedMessage);
        });
      } catch (err) {
        console.error("Message Error:", err);
      }
    });
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
  app.get("/", (request, response) => {
    response.send("Backend is Working");
  });
  app.post("/auth/login", async (request, response) => {
    const user = await checkUser(request.body.email, request.body.password);
    if (user != null) response.json({ result: true, name: user.name });
    else response.json({ result: false });
  });
  app.post("/auth/signup", async (request, response) => {
    const user = await createUser(request.body.name, request.body.email, request.body.password);
    if (user == true) response.json({ result: true });
    else response.json({ result: false });
  });
  server.listen(PORT, () => {
    console.log(`Server is started on port ${PORT}`);
  })
}

startServer();
