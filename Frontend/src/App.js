import { useState, useEffect, useRef, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("http://localhost:5000");
const Ctx = createContext();

const Login = () => {
  const { setUser, setUserId, setToken } = useContext(Ctx);
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const f = async (e) => {
    e.preventDefault();
    const r = await axios.post("http://localhost:5000/auth/login", { email, password, });
    if (r.data.result) {
      setUser(r.data.name);
      setUserId(r.data.userId);
      localStorage.setItem("session", JSON.stringify({ name: r.data.name, userId: r.data.userId, token: r.data.token, }), );
      setToken(r.data.token);
      nav("/");
    }
  };
  return (
    <div className="center">
      <form className="card" onSubmit={f}>
        <h2>Login</h2>
        <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Password" type="password" onChange={(e) => setPassword(e.target.value)} />
        <button>Login</button>
      </form>
    </div>
  );
};

const Signup = () => {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const f = async (e) => {
    e.preventDefault();
    await axios.post("http://localhost:5000/auth/signup", { name, email, password, });
    nav("/login");
  };
  return (
    <div className="center">
      <form className="card" onSubmit={f}>
        <h2>Sign Up</h2>
        <input placeholder="Name" onChange={(e) => setName(e.target.value)} />
        <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Password" type="password" onChange={(e) => setPassword(e.target.value)} />
        <button>Signup</button>
      </form>
    </div>
  );
};

const Home = () => {
  const { user } = useContext(Ctx);
  return user ? <Chats /> : <Login />;
};

const Chats = () => {
  const { userId, token } = useContext(Ctx);
  const [chats, setChats] = useState([]);
  const [chatId, setChatId] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [target, setTarget] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    if (userId && token) {
      socket.emit("join", userId);
      axios
        .get(`http://localhost:5000/chats/${userId}`, { headers: { "x-token": token }, })
        .then((r) => setChats(r.data.chats));
    }
  }, [userId, token]);

  useEffect(() => {
    if (chatId && token) {
      axios
        .get(`http://localhost:5000/messages/${chatId}`, { headers: { "x-token": token }, })
        .then((r) => setMessages(r.data.messages));
    }
  }, [chatId, token]);

  useEffect(() => {
    socket.on("receive_message", (m) => { setMessages((p) => [...p, m]); });
    return () => socket.off("receive_message");
  });
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = () => {
    if (!text || !chatId) return;
    socket.emit("send_message", { sender: userId, chatId, content: text });
    setText("");
  };

  const createChat = async () => {
    const r = await axios.post(
      "http://localhost:5000/chat/create",
      { userId, targetId: target },
      { headers: { "x-token": token } },
    );
    setChatId(r.data.chatId);
  };

  return (
    <div className="app">
      <div className="sidebar">
        <h3>Chats</h3>
        <input placeholder="User ID" onChange={(e) => setTarget(e.target.value)} />
        <button onClick={createChat}>Start Chat</button>
        <div className="chatList">
          {chats.length === 0 && <p>No chats yet</p>}
          {chats.map((c) => (
            <div key={c._id} className="chatItem" onClick={() => setChatId(c._id)}>
              {c.participants.find((p) => p._id !== userId)?.name}
            </div>
          ))}
        </div>
      </div>
      <div className="chatArea">
        {chatId ? (
          <>
            <div className="messages" ref={bottomRef}>
              {messages.map((m, i) => (
                <div key={i} className={`msg ${m.sender === userId ? "me" : "other"}`}>
                  <span>{m.content}</span>
                  <small>{m.status}</small>
                </div>
              ))}
            </div>
            <div className="inputBox">
              <input placeholder="Type a message..."  value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { send(); } }}/>
              <button onClick={send}>Send</button>
            </div>
          </>
        ) : (
          <div className="empty">Select or start a chat</div>
        )}
      </div>
    </div>
  );
};

const Account = () => {
  const { user, userId } = useContext(Ctx);
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="center">
      <div className="card">
        <h2>Account</h2>
        <p>
          <b>Name:</b> {user}
        </p>
        <p>
          <b>User ID: </b>
          <span className="useridBox copyable" onClick={copyId}>
            {userId}
          </span>
        </p>
        <small>{copied ? "Copied" : "Click to copy"}</small>
      </div>
    </div>
  );
};

const Navbar = () => {
  const nav = useNavigate();
  const { user, setUser, setUserId, setToken } = useContext(Ctx);

  const logout = () => {
    localStorage.removeItem("session");
    setUser("");
    setUserId("");
    setToken("");
    nav("/login");
  };

  return (
    <div className="navbar">
      <div className="navContent">
        <div className="logo">ChatApp</div>
        <div className="navLinks">
          <button onClick={() => nav("/")}>Home</button>
          <button onClick={() => nav("/account")}>Account</button>
          {user ? (
            <button onClick={logout}>Logout</button>
          ) : (
            <>
              <button onClick={() => nav("/login")}>Login</button>
              <button onClick={() => nav("/signup")}>Signup</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState("");
  const [userId, setUserId] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("session");
    if (saved) {
      const p = JSON.parse(saved);
      setUser(p.name);
      setUserId(p.userId);
      setToken(p.token);
    }
  }, []);

  const ProtectedRoute = ({ children }) => {
    if (!token) return <Login />;
    return children;
  };

  return (
    <Ctx.Provider value={{ user, setUser, userId, setUserId, token, setToken }}>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route path="/account" element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </Ctx.Provider>
  );
}