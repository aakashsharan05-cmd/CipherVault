import "./App.css";

import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Navbar from "./components/navbar";
import Footer from "./components/footer";
import Manager from "./components/manager";
import Register from "./components/register";
import Login from "./components/login";
import { API_URL } from "./config";

function App() {
  const [user, setUser] = useState(null);

  // On page load (or refresh), check if the user is already logged in
  // by calling the profile endpoint. The cookie is sent automatically.
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/profile`, {
          method: "GET",
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
        // If 401, user is not logged in — that's fine, user stays null
      } catch {
        // Network error — user stays null
      }
    };

    fetchProfile();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 relative overflow-x-hidden">
      {/* Ambient background decoration */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-indigo-500/10 via-violet-500/5 to-transparent blur-3xl opacity-70"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl"></div>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={3500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />

      <Navbar user={user} setUser={setUser} />

      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<Manager />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
