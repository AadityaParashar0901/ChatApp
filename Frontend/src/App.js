import { useState, useEffect, useContext, createContext } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import './App.css';

const AppContext = createContext();
const socket = io("http://localhost:5000");

const Home = () => {
  const { username, isLoggedIn, userId } = useContext(AppContext);
  const [chatId, setChatId] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [chats, setChats] = useState([]);
  useEffect(() => {
    if (userId) {
      socket.emit("join", userId);
    }
  }, [userId]);
  useEffect(() => {
    socket.on("receive_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => socket.off("receive_message");
  }, []);
  useEffect(() => {
    setChats([
      { _id: "chat1", name: "Test Chat 1" },
      { _id: "chat2", name: "Test Chat 2" }
    ]);
  }, []);
  const sendMessage = () => {
    if (!message || !chatId) return;
    socket.emit("send_message", {
      sender: userId,
      chatId: chatId,
      content: message
    });
    setMessage("");
  };
  return (
    <div>
      {isLoggedIn && <h3>Welcome {username}</h3>}
      <div style={{ display: "flex", gap: "20px" }}>
        <div>
          <h4>Chats</h4>
          {chats.map((chat) => (
            <div key={chat._id} style={{ cursor: "pointer", border: "1px solid white", margin: "5px", padding: "5px" }} onClick={() => setChatId(chat._id)}>{chat.name}</div>
          ))}
        </div>
        <div>
          <h4>Message</h4>
          <div style={{ height: "200px", overflowY: "scroll", border: "1px solid white" }}>
            {messages.map((msg, index) => (
              <div key={index}>
                <b>{msg.sender}</b>: {msg.content}
              </div>
            ))}
          </div>
          <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message" />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}

const Login = () => {
  const { setUsername, setLoggedIn, setUserId } = useContext(AppContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        "http://localhost:5000/auth/login",
        { email, password }
      );
      if (response.data.result === true) {
        setLoggedIn(true);
        setUsername(response.data.name);
        setUserId(response.data.userId);
        navigate("/");
      }
    } catch (err) {
      console.error(err);
    }
  }
  return (
    <div className="floating-div">
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <input type="email" name="email" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" name="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}

const SignUp = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        "http://localhost:5000/auth/signup",
        { name, email, password }
      );
      navigate("/login");
    } catch (err) {
      console.error(err);
    }
  }
  return (
    <div className="floating-div">
      <h1>Sign Up</h1>
      <form onSubmit={handleSubmit}>
        <input type="name" name="name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="email" name="email" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" name="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}

function App() {
  const [username, setUsername] = useState("");
  const [isLoggedIn, setLoggedIn] = useState(false);
  const [userId, setUserId] = useState("");
  const globalState = {
    username,
    setUsername,
    isLoggedIn,
    setLoggedIn,
    userId,
    setUserId
  }

  return (
    <AppContext.Provider value={globalState}>
      <BrowserRouter>
        <div className="navigation-bar-div">
          <nav>
            <Link to="/">Home</Link>
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign Up</Link>
          </nav>
        </div>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

export default App;
