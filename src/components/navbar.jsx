import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaShieldAlt, FaSignOutAlt } from "react-icons/fa";
import { toast } from "react-toastify";

const Navbar = ({ user, setUser }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // =========================
  // LOGOUT
  // =========================
  const handleLogout = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        setUser(null);
        setShowDropdown(false);
        toast.info("You have been securely logged out.");
        navigate("/login");
      } else {
        toast.error("Logout failed. Please try again.");
      }
    } catch {
      toast.error("Network error during logout.");
    }
  };

  return (
    <nav className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="mycontainer">
        <div className="flex justify-between items-center h-16">
          {/* Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-1"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 ring-1 ring-white/20 group-hover:scale-105 transition-transform">
              <FaShieldAlt className="text-xl" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center text-xl font-bold tracking-tight text-white">
                <span>Cipher</span>
                <span className="text-indigo-400">Vault</span>
              </div>
              <span className="text-[10px] tracking-wider uppercase font-semibold text-slate-400 -mt-1 hidden sm:block">
                Encrypted Vault
              </span>
            </div>
          </Link>

          {/* Navigation / User Section */}
          <div className="flex items-center gap-3 sm:gap-4">
            {user ? (
              <>
                <Link
                  to="/"
                  className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    location.pathname === "/"
                      ? "text-white bg-slate-800/90 border border-slate-700/60"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  My Vault
                </Link>

                {/* Profile dropdown container */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown((prev) => !prev)}
                    className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="User menu"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-sm flex items-center justify-center shadow-inner">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-200 hidden md:block max-w-[120px] truncate">
                      {user.username}
                    </span>
                  </button>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-3 px-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-base flex items-center justify-center">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <p className="font-semibold text-slate-100 text-sm truncate">
                            {user.username}
                          </p>
                          <p className="text-slate-400 text-xs truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      <div className="py-2.5 text-xs text-slate-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>AES-256 Vault Active</span>
                      </div>

                      <button
                        onClick={handleLogout}
                        className="w-full mt-1 flex items-center justify-center gap-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 text-sm font-medium py-2 rounded-xl transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500"
                      >
                        <FaSignOutAlt className="text-xs" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Real navigation for logged out visitors */
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  to="/login"
                  className={`text-sm font-medium px-3.5 py-2 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    location.pathname === "/login"
                      ? "text-white bg-slate-800 border border-slate-700"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-semibold px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
