import { useState, useEffect, useRef, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("http://localhost:5000");
const Ctx = createContext();

const Login = () => {
  const { setUser, setUserId } = useContext(Ctx);
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const f = async e => {
    e.preventDefault();
    const r = await axios.post("http://localhost:5000/auth/login", { email, password });
    if (r.data.result) {
      setUser(r.data.name);
      setUserId(r.data.userId);
      nav("/");
    }
  };
  return (
    <div className="center">
      <form className="card" onSubmit={f}>
        <h2>Login</h2>
        <input placeholder="Email" onChange={e=>setEmail(e.target.value)} />
        <input placeholder="Password" type="password" onChange={e=>setPassword(e.target.value)} />
        <button>Login</button>
      </form>
    </div>
  );
};

const Signup = () => {
  const nav = useNavigate();
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const f=async e=>{
    e.preventDefault();
    await axios.post("http://localhost:5000/auth/signup",{name,email,password});
    nav("/login");
  };
  return (
    <div className="center">
      <form className="card" onSubmit={f}>
        <h2>Sign Up</h2>
        <input placeholder="Name" onChange={e=>setName(e.target.value)} />
        <input placeholder="Email" onChange={e=>setEmail(e.target.value)} />
        <input placeholder="Password" type="password" onChange={e=>setPassword(e.target.value)} />
        <button>Signup</button>
      </form>
    </div>
  );
};

const Home = () => {
  const { user } = useContext(Ctx);
  return user ? <Chats/> : <Login/>;
};

const Chats = () => {
  const { userId } = useContext(Ctx);
  const [chats,setChats]=useState([]);
  const [chatId,setChatId]=useState("");
  const [messages,setMessages]=useState([]);
  const [text,setText]=useState("");
  const [target,setTarget]=useState("");
  const bottomRef = useRef(null);

  useEffect(()=>{
    if(userId){
      socket.emit("join",userId);
      axios.get(`http://localhost:5000/chats/${userId}`)
        .then(r=>setChats(r.data.chats));
    }
  },[userId]);

  useEffect(()=>{
    if(chatId){
      axios.get(`http://localhost:5000/messages/${chatId}`)
        .then(r=>setMessages(r.data.messages));
    }
  },[chatId]);

  useEffect(()=>{
    socket.on("receive_message",m=>{
      setMessages(p=>[...p,m]);
    });
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    return ()=>socket.off("receive_message");
  },[messages]);

  const send=()=>{
    if(!text||!chatId)return;
    socket.emit("send_message",{sender:userId,chatId,content:text});
    setText("");
  };

  const createChat=async()=>{
    const r=await axios.post("http://localhost:5000/chat/create",{userId,targetId:target});
    setChatId(r.data.chatId);
  };

  return (
    <div className="app">
      <div className="sidebar">
        <h3>Chats</h3>
        <input placeholder="User ID" onChange={e=>setTarget(e.target.value)} />
        <button onClick={createChat}>Start Chat</button>
        <div className="chatList">
          {chats.length===0 && <p>No chats yet</p>}
          {chats.map(c=>(
            <div key={c._id} className="chatItem" onClick={()=>setChatId(c._id)}>
              {c.participants.map(p=>p.name).join(",")}
            </div>
          ))}
        </div>
      </div>
      <div className="chatArea">
        {chatId ? (
          <>
            <div className="messages" ref={bottomRef}>
              {messages.map((m,i)=>(
                <div key={i} className={`msg ${m.sender===userId?"me":"other"}`}>
                  <span>{m.content}</span>
                  <small>{m.status}</small>
                </div>
              ))}
            </div>
            <div className="inputBox">
              <input value={text} onChange={e=>setText(e.target.value)} />
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

export default function App(){
  const [user,setUser]=useState("");
  const [userId,setUserId]=useState("");
  return (
    <Ctx.Provider value={{user,setUser,userId,setUserId}}>
      <BrowserRouter>
        <div className="navbar">
          <button onClick={()=>window.location.href="/"}>Home</button>
          <button onClick={()=>window.location.href="/login"}>Login</button>
          <button onClick={()=>window.location.href="/signup"}>Signup</button>
        </div>
        <Routes>
          <Route path="*" element={<Home/>}/>
          <Route path="/login" element={<Login/>}/>
          <Route path="/signup" element={<Signup/>}/>
        </Routes>
      </BrowserRouter>
    </Ctx.Provider>
  );
}
