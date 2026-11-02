import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaShieldAlt, FaEnvelope, FaLock, FaArrowRight } from "react-icons/fa";
import { toast } from "react-toastify";

const Login = ({ setUser }) => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.email.trim() === "" || form.password.trim() === "") {
      toast.warn("Please enter both email and password.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Invalid credentials");
      }

      toast.success("Welcome back! Login successful.");

      // Store user info in App-level state so Navbar shows the profile
      setUser(data.user);

      setForm({
        email: "",
        password: "",
      });

      navigate("/");
    } catch (error) {
      toast.error(error.message || "Login failed. Please check your credentials.");
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-md">
        {/* Auth Card */}
        <div className="relative bg-slate-900/80 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
          {/* Subtle top accent gradient */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 rounded-t-3xl"></div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 items-center justify-center text-white shadow-lg shadow-indigo-600/30 mb-4 ring-1 ring-white/20">
              <FaShieldAlt className="text-2xl" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Unlock Your Vault
            </h1>
            <p className="text-sm text-slate-400 mt-2">
              Sign in to decrypt and manage your credentials
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FaEnvelope className="text-sm" />
                </span>
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 pl-10 pr-4 py-3 text-slate-100 placeholder-slate-400 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition-all"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
              >
                Master Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FaLock className="text-sm" />
                </span>
                <input
                  id="login-password"
                  type="password"
                  name="password"
                  placeholder="••••••••••••"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 pl-10 pr-4 py-3 text-slate-100 placeholder-slate-400 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition-all"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              <span>Unlock Vault</span>
              <FaArrowRight className="text-xs" />
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <p className="text-sm text-slate-400">
              New to CipherVault?{" "}
              <Link
                to="/register"
                className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors focus:outline-none focus:underline"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
