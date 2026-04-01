const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const sessions = {};
const { Server } = require("socket.io");

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect("mongodb://localhost:27017/backend_aaditya");

const User = mongoose.model("User", new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String
}, { timestamps: true }));

const Chat = mongoose.model("Chat", new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" }
}, { timestamps: true }));

const Message = mongoose.model("Message", new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
  content: String,
  status: { type: String, default: "sent" }
}, { timestamps: true }));

const createSession = (userId) => {
  const token = Math.random().toString(36).substring(2);
  const expiresAt = Date.now() + 1000 * 60 * 60;
  sessions[token] = { userId, expiresAt };
  return token;
};
const auth = (req, res, next) => {
  const token = req.headers["x-token"];
  if (!token || !sessions[token]) return res.status(401).json({ result: false });
  const session = sessions[token];
  if (Date.now() > session.expiresAt) {
    delete sessions[token];
    return res.status(401).json({ result: false });
  }
  session.expiresAt = Date.now() + 1000 * 60 * 60;
  req.userId = session.userId;
  next();
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on("connection", (socket) => {
  socket.on("join", (userId) => {
    socket.join(userId);
  });

  socket.on("send_message", async ({ sender, chatId, content }) => {
    const msg = await Message.create({ sender, chat: chatId, content, status: "sent" });
    const chat = await Chat.findById(chatId);
    chat.lastMessage = msg._id;
    await chat.save();
    chat.participants.forEach(u => {
      io.to(u.toString()).emit("receive_message", msg);
    });
    msg.status = "delivered";
    await msg.save();
  });
});

app.post("/auth/signup", async (req, res) => {
  try {
    await User.create(req.body);
    res.json({ result: true });
  } catch {
    res.json({ result: false });
  }
});

app.post("/auth/login", async (req, res) => {
  const u = await User.findOne(req.body);
  if (!u) return res.json({ result: false });
  const token = createSession(u._id);
  res.json({ result: true, name: u.name, userId: u._id, token });
});

app.post("/chat/create", auth, async (req, res) => {
  const { userId, targetId } = req.body;
  let chat = await Chat.findOne({
    participants: { $all: [userId, targetId], $size: 2 }
  });
  if (!chat) chat = await Chat.create({ participants: [userId, targetId] });
  res.json({ chatId: chat._id });
});

app.get("/chats/:userId", auth, async (req, res) => {
  const chats = await Chat.find({ participants: req.params.userId })
    .populate("participants", "name")
    .populate("lastMessage");
  res.json({ chats });
});

app.get("/messages/:chatId", auth, async (req, res) => {
  const messages = await Message.find({ chat: req.params.chatId });
  res.json({ messages });
});

server.listen(5000);
