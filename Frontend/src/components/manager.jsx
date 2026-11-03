import { useEffect, useState, useId, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaEye,
  FaEyeSlash,
  FaCopy,
  FaEdit,
  FaTrash,
  FaExternalLinkAlt,
  FaSearch,
  FaPlus,
  FaKey,
  FaCheck,
  FaTimes,
  FaGlobe,
  FaUser,
  FaLock,
  FaShieldAlt,
  FaMagic,
  FaSlidersH,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { API_URL } from "../config";

function generateSecurePassword(options) {
  const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
  const NUMBERS = "0123456789";
  const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  let available = "";
  const guaranteed = [];

  if (options.upper) {
    available += UPPERCASE;
    const rand = window.crypto.getRandomValues(new Uint32Array(1))[0];
    guaranteed.push(UPPERCASE[rand % UPPERCASE.length]);
  }
  if (options.lower) {
    available += LOWERCASE;
    const rand = window.crypto.getRandomValues(new Uint32Array(1))[0];
    guaranteed.push(LOWERCASE[rand % LOWERCASE.length]);
  }
  if (options.numbers) {
    available += NUMBERS;
    const rand = window.crypto.getRandomValues(new Uint32Array(1))[0];
    guaranteed.push(NUMBERS[rand % NUMBERS.length]);
  }
  if (options.symbols) {
    available += SYMBOLS;
    const rand = window.crypto.getRandomValues(new Uint32Array(1))[0];
    guaranteed.push(SYMBOLS[rand % SYMBOLS.length]);
  }

  if (!available) {
    available = LOWERCASE + NUMBERS;
  }

  const length = Math.max(8, Math.min(64, options.length || 16));
  const remainingCount = Math.max(0, length - guaranteed.length);
  const result = [...guaranteed];

  if (remainingCount > 0) {
    const randomBuffer = new Uint32Array(remainingCount);
    window.crypto.getRandomValues(randomBuffer);
    for (let i = 0; i < remainingCount; i++) {
      result.push(available[randomBuffer[i] % available.length]);
    }
  }

  // Cryptographic Fisher-Yates shuffle
  const shuffleBuffer = new Uint32Array(result.length);
  window.crypto.getRandomValues(shuffleBuffer);
  for (let i = result.length - 1; i > 0; i--) {
    const j = shuffleBuffer[i] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.join("");
}

function calculatePasswordStrength(pass) {
  if (!pass) return { score: 0, label: "Empty", color: "bg-slate-700", text: "text-slate-500" };

  let score = 0;
  if (pass.length >= 8) score++;
  if (pass.length >= 12) score++;
  if (pass.length >= 16) score++;
  if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^a-zA-Z0-9]/.test(pass)) score++;

  if (score <= 2) return { score: 1, label: "Weak", color: "bg-rose-500", text: "text-rose-400" };
  if (score <= 4) return { score: 2, label: "Fair", color: "bg-amber-500", text: "text-amber-400" };
  if (score === 5) return { score: 3, label: "Good", color: "bg-blue-500", text: "text-blue-400" };
  return { score: 4, label: "Strong", color: "bg-emerald-500", text: "text-emerald-400" };
}

function getSafeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "#";
  const trimmed = rawUrl.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
    return "#";
  }
  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

const Manager = ({ user, setUser, authLoading }) => {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const cancelDeleteBtnRef = useRef(null);
  const deleteTriggerRef = useRef(null);

  const [showPassword, setShowPassword] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedField, setCopiedField] = useState(null);

  const [form, setForm] = useState({
    title: "",
    url: "",
    username: "",
    password: "",
  });

  const [passwordArray, setPasswordArray] = useState([]);
  const [isLoadingVault, setIsLoadingVault] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Password Generator State
  const [showGenerator, setShowGenerator] = useState(false);
  const [genOptions, setGenOptions] = useState({
    length: 16,
    upper: true,
    lower: true,
    numbers: true,
    symbols: true,
  });
  const [generatedPassword, setGeneratedPassword] = useState("");

  const genLengthId = useId();
  const genUpperId = useId();
  const genLowerId = useId();
  const genNumbersId = useId();
  const genSymbolsId = useId();
  const deleteTitleId = useId();
  const deleteDescId = useId();

  const isFormExpanded = passwordArray.length === 0 || Boolean(editingId) || isFormOpen;

  // Handle escape key and focus management for delete dialog
  useEffect(() => {
    if (!deleteCandidate) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isDeleting) {
        setDeleteCandidate(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteCandidate, isDeleting]);

  useEffect(() => {
    if (deleteCandidate) {
      requestAnimationFrame(() => {
        cancelDeleteBtnRef.current?.focus();
      });
    } else if (deleteTriggerRef.current) {
      deleteTriggerRef.current.focus();
      deleteTriggerRef.current = null;
    }
  }, [deleteCandidate]);

  // Load passwords when user is authenticated
  useEffect(() => {
    let isSubscribed = true;
    if (!user) {
      return;
    }

    queueMicrotask(() => {
      if (isSubscribed) setIsLoadingVault(true);
    });

    fetch(`${API_URL}/api/auth/get`, {
      method: "GET",
      credentials: "include",
    })
      .then((res) => {
        if (res.status === 401) {
          if (setUser) setUser(null);
          toast.error("Session expired, please log in again.");
          navigate("/login");
          return null;
        }
        if (!res.ok) throw new Error("Failed to fetch passwords");
        return res.json().catch(() => ({}));
      })
      .then((data) => {
        if (isSubscribed && data) {
          setPasswordArray(data.passwords || []);
        }
      })
      .catch((err) => {
        if (isSubscribed) {
          toast.error(err.message || "Could not load vault data.");
        }
      })
      .finally(() => {
        if (isSubscribed) {
          setIsLoadingVault(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [user, setUser, navigate]);

  // Refresh passwords function for after mutations
  const refreshPasswords = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/api/auth/get`, {
        method: "GET",
        credentials: "include",
      });

      if (res.status === 401) {
        if (setUser) setUser(null);
        toast.error("Session expired, please log in again.");
        navigate("/login");
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to fetch passwords");
      setPasswordArray(data.passwords || []);
    } catch (err) {
      toast.error(err.message || "Could not load vault data.");
    }
  };

  const handleGenerate = (optionsToUse = genOptions) => {
    if (!optionsToUse.upper && !optionsToUse.lower && !optionsToUse.numbers && !optionsToUse.symbols) {
      toast.warn("Please select at least one character type.");
      return;
    }
    const pwd = generateSecurePassword(optionsToUse);
    setGeneratedPassword(pwd);
  };

  const toggleGenerator = () => {
    setShowGenerator((prev) => {
      const next = !prev;
      if (next) {
        const pwd = generateSecurePassword(genOptions);
        setGeneratedPassword(pwd);
      }
      return next;
    });
  };

  const applyGeneratedPassword = () => {
    if (!generatedPassword) return;
    setForm((prev) => ({ ...prev, password: generatedPassword }));
    setShowPassword(true);
    toast.success("Generated password applied to form!");
  };

  const showPass = () => {
    setShowPassword((prev) => !prev);
  };

  const toggleRowPassword = (id) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredPasswords = passwordArray.filter((item) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;

    return (
      (item.title && item.title.toLowerCase().includes(query)) ||
      (item.url && item.url.toLowerCase().includes(query)) ||
      (item.username && item.username.toLowerCase().includes(query))
    );
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // =========================
  // CREATE PASSWORD
  // =========================
  const savePassword = async () => {
    if (isSubmitting) return;

    const trimmedTitle = form.title.trim();
    const trimmedUrl = form.url.trim();
    const trimmedUsername = form.username.trim();

    if (!trimmedTitle || !trimmedUrl || !trimmedUsername || !form.password) {
      toast.warn("Please fill in all fields before saving.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/create`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: trimmedTitle,
          url: trimmedUrl,
          username: trimmedUsername,
          password: form.password,
        }),
      });

      if (res.status === 401) {
        if (setUser) setUser(null);
        toast.error("Session expired, please log in again.");
        navigate("/login");
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to save password");
      }

      await refreshPasswords();

      setForm({
        title: "",
        url: "",
        username: "",
        password: "",
      });
      setIsFormOpen(false);

      toast.success("Credential encrypted and saved to your vault!");
    } catch (error) {
      toast.error(error.message || "Error saving credential.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================
  // LOAD PASSWORD FOR EDIT
  // =========================
  const editPassword = (item) => {
    setEditingId(item._id);

    setForm({
      title: item.title,
      url: item.url,
      username: item.username,
      password: item.password,
    });

    setIsFormOpen(true);
    toast.info(`Editing "${item.title}". Update the fields above.`);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  // =========================
  // UPDATE PASSWORD
  // =========================
  const updatePassword = async () => {
    if (isSubmitting) return;

    const trimmedTitle = form.title.trim();
    const trimmedUrl = form.url.trim();
    const trimmedUsername = form.username.trim();

    if (!trimmedTitle || !trimmedUrl || !trimmedUsername || !form.password) {
      toast.warn("Please fill in all fields before updating.");
      return;
    }

    if (!editingId) {
      toast.error("No password selected for editing.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/update/${editingId}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: trimmedTitle,
          url: trimmedUrl,
          username: trimmedUsername,
          password: form.password,
        }),
      });

      if (res.status === 401) {
        if (setUser) setUser(null);
        toast.error("Session expired, please log in again.");
        navigate("/login");
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to update password");
      }

      setEditingId(null);
      setForm({
        title: "",
        url: "",
        username: "",
        password: "",
      });
      setIsFormOpen(false);

      await refreshPasswords();

      toast.success("Credential updated successfully!");
    } catch (error) {
      toast.error(error.message || "Failed to update credential.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================
  // DELETE PASSWORD
  // =========================
  const openDeleteModal = (item, e) => {
    deleteTriggerRef.current = e?.currentTarget || null;
    setDeleteCandidate(item);
  };

  const confirmDeleteAction = async () => {
    if (!deleteCandidate || isDeleting) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/delete/${deleteCandidate._id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.status === 401) {
        if (setUser) setUser(null);
        toast.error("Session expired, please log in again.");
        navigate("/login");
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to delete password");
      }

      await refreshPasswords();

      toast.success("Credential removed from vault.");
      setDeleteCandidate(null);
    } catch (error) {
      toast.error(error.message || "Failed to delete credential.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      updatePassword();
    } else {
      savePassword();
    }
  };

  // =========================
  // COPY TEXT
  // =========================
  const copyText = async (text, fieldIdentifier) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldIdentifier);
      setTimeout(() => setCopiedField(null), 2000);

      toast.success("Copied to clipboard!", {
        autoClose: 2000,
      });
    } catch {
      toast.error("Failed to copy to clipboard.");
    }
  };

  const strength = calculatePasswordStrength(form.password);

  // If initial auth check is ongoing
  if (authLoading) {
    return (
      <div className="mycontainer py-16 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 animate-bounce">
          <FaShieldAlt className="text-2xl" />
        </div>
        <p className="text-sm text-slate-400 font-medium">Securing session...</p>
      </div>
    );
  }

  // If user is not logged in (landing card)
  if (!user) {
    return (
      <div className="mycontainer py-16 sm:py-24 max-w-4xl min-w-0">
        <div className="relative bg-slate-900/80 border border-slate-800 rounded-3xl p-8 sm:p-14 shadow-2xl backdrop-blur-xl text-center overflow-hidden min-w-0">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500"></div>

          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white text-2xl mx-auto mb-6 shadow-xl shadow-indigo-600/30 ring-1 ring-white/20">
            <FaLock />
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
            Encrypted Credential Vault
          </h1>

          <p className="text-slate-300 max-w-xl mx-auto text-base sm:text-lg mb-6 leading-relaxed">
            CipherVault stores your sensitive website passwords encrypted at rest using server-side
            <strong className="text-indigo-400 font-semibold"> AES-256-GCM</strong> authenticated encryption. Sign in or create an account to unlock your personal vault.
          </p>

          {/* F12: One-line row of three features */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs font-medium text-slate-300 mb-8 border-y border-slate-800/80 py-3.5 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5">
              <FaKey className="text-indigo-400 text-xs shrink-0" />
              <span>AES-256-GCM Encryption</span>
            </span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="inline-flex items-center gap-1.5">
              <FaMagic className="text-violet-400 text-xs shrink-0" />
              <span>Built-in Password Generator</span>
            </span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="inline-flex items-center gap-1.5">
              <FaSearch className="text-indigo-400 text-xs shrink-0" />
              <span>Instant Search</span>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-lg shadow-indigo-600/25 transition-all text-sm"
            >
              Unlock Vault
            </Link>
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 hover:text-white font-semibold transition-all text-sm"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Logged-in Vault View
  return (
    <div className="mycontainer py-6 sm:py-8 min-w-0">
      {/* F3: Compact Header Row replacing the huge hero */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-800/80 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 shrink-0">
            <FaShieldAlt className="text-lg" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Your Vault
              </h1>
              <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0">
                {passwordArray.length} {passwordArray.length === 1 ? "entry" : "entries"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              Server-side AES-256-GCM encrypted vault isolated to your account
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (editingId) {
              setEditingId(null);
              setForm({ title: "", url: "", username: "", password: "" });
            }
            setIsFormOpen((prev) => !prev);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 transition-all cursor-pointer self-start sm:self-auto shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-10 sm:min-h-0"
        >
          {isFormExpanded && !editingId && passwordArray.length > 0 ? (
            <>
              <FaTimes className="text-xs" />
              <span>Close Form</span>
            </>
          ) : (
            <>
              <FaPlus className="text-xs" />
              <span>{editingId ? "Update Credential" : " Add credential"}</span>
            </>
          )}
        </button>
      </div>

      {/* ===================================================
          F3 & F7: COLLAPSIBLE ADD / EDIT CREDENTIAL FORM
      =================================================== */}
      {isFormExpanded && (
        <div
          ref={formRef}
          className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl mb-8 relative overflow-hidden min-w-0 animate-in fade-in duration-200"
        >
          {/* Glow accent */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <form onSubmit={handleFormSubmit} className="min-w-0">
            <div className="flex flex-wrap items-center justify-between pb-5 mb-5 border-b border-slate-800 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 shrink-0">
                  {editingId ? (
                    <FaEdit className="text-base" />
                  ) : (
                    <FaPlus className="text-base" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-base sm:text-lg text-white">
                    {editingId ? "Update Stored Credential" : "Store New Credential"}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {editingId
                      ? "Modifying existing encrypted password record"
                      : "Encrypted with fresh 96-bit IV before database storage"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleGenerator}
                  className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-8"
                >
                  <FaMagic className="text-xs" />
                  <span>{showGenerator ? "Hide Generator" : "Password Generator"}</span>
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setForm({
                        title: "",
                        url: "",
                        username: "",
                        password: "",
                      });
                      setIsFormOpen(false);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer min-h-8"
                  >
                    <FaTimes className="text-xs" />
                    <span>Cancel</span>
                  </button>
                )}
              </div>
            </div>

            {/* PASSWORD GENERATOR PANEL (Expandable) */}
            {showGenerator && (
              <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-indigo-500/30 shadow-inner min-w-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 min-w-0">
                  <div className="flex items-center gap-2">
                    <FaSlidersH className="text-indigo-400 text-sm" />
                    <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                      Cryptographic Password Generator
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    window.crypto CSPRNG
                  </span>
                </div>

                {/* Generated Output Display */}
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl p-2.5 sm:p-3 mb-4 min-w-0">
                  <span className="flex-1 font-mono text-xs sm:text-sm text-indigo-300 tracking-wider truncate select-all min-w-0">
                    {generatedPassword || "Select options to generate"}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(generatedPassword, "gen-pwd")}
                    className="min-w-7 min-h-7 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
                    title="Copy password"
                    aria-label="Copy generated password"
                  >
                    {copiedField === "gen-pwd" ? (
                      <FaCheck className="text-emerald-400 text-xs" />
                    ) : (
                      <FaCopy className="text-xs" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerate()}
                    className="min-w-7 min-h-7 p-1.5 text-indigo-400 hover:text-indigo-300 rounded-lg hover:bg-indigo-500/10 transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
                    title="Regenerate password"
                    aria-label="Regenerate password"
                  >
                    <FaMagic className="text-xs" />
                  </button>
                  <button
                    type="button"
                    onClick={applyGeneratedPassword}
                    className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 min-h-7"
                  >
                    Use in Form
                  </button>
                </div>

                {/* F10: Range slider with proper dark styling */}
                <div className="space-y-3 min-w-0">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <label htmlFor={genLengthId} className="font-medium cursor-pointer">
                      Password Length: <span className="font-bold text-indigo-400">{genOptions.length}</span>
                    </label>
                    <span className="text-slate-500 text-[11px]">(8 - 64 characters)</span>
                  </div>
                  <input
                    id={genLengthId}
                    type="range"
                    min="8"
                    max="64"
                    value={genOptions.length}
                    onChange={(e) => {
                      const newOpts = { ...genOptions, length: Number(e.target.value) };
                      setGenOptions(newOpts);
                      handleGenerate(newOpts);
                    }}
                    style={{
                      background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${((genOptions.length - 8) / (64 - 8)) * 100}%, #334155 ${((genOptions.length - 8) / (64 - 8)) * 100}%, #334155 100%)`,
                    }}
                    className="w-full cursor-pointer h-1.5 rounded-lg appearance-none"
                  />

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 min-w-0">
                    <label htmlFor={genUpperId} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none min-h-6">
                      <input
                        id={genUpperId}
                        type="checkbox"
                        checked={genOptions.upper}
                        onChange={(e) => {
                          const newOpts = { ...genOptions, upper: e.target.checked };
                          setGenOptions(newOpts);
                          handleGenerate(newOpts);
                        }}
                        className="accent-indigo-500 rounded"
                      />
                      <span>Uppercase (A-Z)</span>
                    </label>
                    <label htmlFor={genLowerId} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none min-h-6">
                      <input
                        id={genLowerId}
                        type="checkbox"
                        checked={genOptions.lower}
                        onChange={(e) => {
                          const newOpts = { ...genOptions, lower: e.target.checked };
                          setGenOptions(newOpts);
                          handleGenerate(newOpts);
                        }}
                        className="accent-indigo-500 rounded"
                      />
                      <span>Lowercase (a-z)</span>
                    </label>
                    <label htmlFor={genNumbersId} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none min-h-6">
                      <input
                        id={genNumbersId}
                        type="checkbox"
                        checked={genOptions.numbers}
                        onChange={(e) => {
                          const newOpts = { ...genOptions, numbers: e.target.checked };
                          setGenOptions(newOpts);
                          handleGenerate(newOpts);
                        }}
                        className="accent-indigo-500 rounded"
                      />
                      <span>Numbers (0-9)</span>
                    </label>
                    <label htmlFor={genSymbolsId} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none min-h-6">
                      <input
                        id={genSymbolsId}
                        type="checkbox"
                        checked={genOptions.symbols}
                        onChange={(e) => {
                          const newOpts = { ...genOptions, symbols: e.target.checked };
                          setGenOptions(newOpts);
                          handleGenerate(newOpts);
                        }}
                        className="accent-indigo-500 rounded"
                      />
                      <span>Symbols (!@#$)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Form Inputs Grid: All children min-w-0 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 min-w-0">
              {/* Title */}
              <div className="min-w-0">
                <label
                  htmlFor="form-title"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Service / Title
                </label>
                <div className="relative min-w-0">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <FaShieldAlt className="text-sm" />
                  </span>
                  <input
                    id="form-title"
                    placeholder="e.g. GitHub, Google, AWS"
                    className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 pl-10 pr-4 py-2.5 sm:py-3 text-slate-100 placeholder-slate-400 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition-all disabled:opacity-50 min-w-0"
                    type="text"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    maxLength={100}
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Website URL */}
              <div className="min-w-0">
                <label
                  htmlFor="form-url"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Website URL
                </label>
                <div className="relative min-w-0">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <FaGlobe className="text-sm" />
                  </span>
                  <input
                    id="form-url"
                    placeholder="https://example.com"
                    className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 pl-10 pr-4 py-2.5 sm:py-3 text-slate-100 placeholder-slate-400 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition-all disabled:opacity-50 min-w-0"
                    type="text"
                    name="url"
                    value={form.url}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    maxLength={2048}
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Username / Email */}
              <div className="min-w-0">
                <label
                  htmlFor="form-username"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Username / Email
                </label>
                <div className="relative min-w-0">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <FaUser className="text-sm" />
                  </span>
                  <input
                    id="form-username"
                    placeholder="user@example.com"
                    className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 pl-10 pr-4 py-2.5 sm:py-3 text-slate-100 placeholder-slate-400 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition-all disabled:opacity-50 min-w-0"
                    type="text"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    maxLength={100}
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Password with Visibility Toggle & Strength */}
              <div className="min-w-0">
                <label
                  htmlFor="form-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Password
                </label>
                <div className="relative min-w-0">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <FaLock className="text-sm" />
                  </span>
                  <input
                    id="form-password"
                    placeholder="Enter password"
                    className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 pl-10 pr-12 py-2.5 sm:py-3 text-slate-100 placeholder-slate-400 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition-all font-mono disabled:opacity-50 min-w-0"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    maxLength={500}
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    onClick={showPass}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-7 min-h-7 inline-flex items-center justify-center"
                  >
                    {showPassword ? (
                      <FaEyeSlash size={16} />
                    ) : (
                      <FaEye size={16} />
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {form.password && (
                  <div className="mt-2 space-y-1 min-w-0">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Strength:</span>
                      <span className={`font-semibold ${strength.text}`}>{strength.label}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${strength.color}`}
                        style={{ width: `${(strength.score / 4) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Actions */}
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-slate-800 min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-400 self-start sm:self-auto">
                <FaKey className="text-indigo-400 shrink-0" />
                <span>AES-256-GCM authenticated encryption</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 sm:py-3 rounded-xl shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 min-h-10 sm:min-h-0 text-sm"
                >
                  {isSubmitting ? (
                    <span>Processing...</span>
                  ) : editingId ? (
                    <>
                      <FaCheck className="text-sm" />
                      <span>Update Credential</span>
                    </>
                  ) : (
                    <>
                      <FaPlus className="text-sm" />
                      <span>Encrypt & Save</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================
          STORED CREDENTIALS SECTION
      =================================================== */}
      <div className="space-y-6 min-w-0">
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl backdrop-blur-xl min-w-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="font-extrabold text-xl sm:text-2xl text-white">
                  Stored Credentials
                </h2>
                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0">
                  {passwordArray.length} {passwordArray.length === 1 ? "entry" : "entries"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Decrypted in real-time for your authenticated session
              </p>
            </div>

            {/* Quick search input */}
            <div className="relative w-full md:w-80 min-w-0">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FaSearch className="text-sm" />
              </span>
              <input
                type="text"
                placeholder="Search by title, URL or username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 pl-10 pr-9 py-2.5 text-slate-100 placeholder-slate-400 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition-all min-w-0"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                  aria-label="Clear search"
                >
                  <FaTimes size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Credentials Display */}
          {isLoadingVault ? (
            <div className="py-12 space-y-4 min-w-0">
              <div className="h-14 bg-slate-800/40 rounded-xl animate-pulse"></div>
              <div className="h-14 bg-slate-800/40 rounded-xl animate-pulse"></div>
              <div className="h-14 bg-slate-800/40 rounded-xl animate-pulse"></div>
            </div>
          ) : passwordArray.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto mb-4">
                <FaLock className="text-2xl" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">
                Your vault is currently empty
              </h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto mb-5">
                Add your first credential using the form above. It will be securely stored with AES-256-GCM encryption.
              </p>
              {!isFormExpanded && (
                <button
                  type="button"
                  onClick={() => setIsFormOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
                >
                  <FaPlus className="text-xs" />
                  <span>Create First Credential</span>
                </button>
              )}
            </div>
          ) : filteredPasswords.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto mb-4">
                <FaSearch className="text-2xl" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">
                No matching credentials
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                No passwords matched your search query &quot;{search}&quot;.
              </p>
              <button
                type="button"
                onClick={() => setSearch("")}
                className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Clear Search Filter
              </button>
            </div>
          ) : (
            <>
              {/* ===================================================
                  F2 & F4: DESKTOP TABLE VIEW (Visible on md and larger)
              =================================================== */}
              <div className="hidden md:block w-full max-w-full min-w-0 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 shadow-inner">
                <table className="w-full text-left text-sm text-slate-200 table-fixed">
                  <thead className="bg-slate-900/90 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th scope="col" className="px-4 py-3.5 font-semibold w-[20%]">
                        Service
                      </th>
                      <th scope="col" className="px-4 py-3.5 font-semibold w-[28%]">
                        Website
                      </th>
                      <th scope="col" className="px-4 py-3.5 font-semibold w-[26%]">
                        Account / Username
                      </th>
                      <th scope="col" className="px-4 py-3.5 font-semibold w-[16%]">
                        Password
                      </th>
                      <th scope="col" className="px-4 py-3.5 font-semibold text-right w-[10%] min-w-[80px]">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800/70">
                    {filteredPasswords.map((item) => (
                      <tr
                        key={item._id}
                        className="hover:bg-slate-800/40 transition-colors group"
                      >
                        {/* Title */}
                        <td className="px-4 py-4 font-semibold text-white min-w-0">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {item.title ? item.title.charAt(0) : "P"}
                            </div>
                            <span className="truncate text-sm min-w-0 flex-1" title={item.title}>
                              {item.title}
                            </span>
                          </div>
                        </td>

                        {/* URL with title tooltip & 13px font */}
                        <td className="px-4 py-4 text-slate-300 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <a
                              href={getSafeUrl(item.url)}
                              target="_blank"
                              rel="noreferrer"
                              title={item.url}
                              className="text-indigo-400 hover:text-indigo-300 font-mono text-[13px] hover:underline flex items-center gap-1.5 truncate min-w-0 flex-1"
                            >
                              <span className="truncate">{item.url}</span>
                              <FaExternalLinkAlt className="text-[10px] shrink-0 opacity-70" />
                            </a>

                            <button
                              type="button"
                              onClick={() => copyText(item.url, `url-${item._id}`)}
                              title="Copy URL"
                              aria-label="Copy URL"
                              className="min-w-7 min-h-7 p-1.5 inline-flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 shrink-0"
                            >
                              {copiedField === `url-${item._id}` ? (
                                <FaCheck className="text-emerald-400 text-xs" />
                              ) : (
                                <FaCopy className="text-xs" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Username with title tooltip & 13px font */}
                        <td className="px-4 py-4 text-slate-300 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[13px] truncate min-w-0 flex-1" title={item.username}>
                              {item.username}
                            </span>

                            <button
                              type="button"
                              onClick={() => copyText(item.username, `user-${item._id}`)}
                              title="Copy Username"
                              aria-label="Copy Username"
                              className="min-w-7 min-h-7 p-1.5 inline-flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 shrink-0"
                            >
                              {copiedField === `user-${item._id}` ? (
                                <FaCheck className="text-emerald-400 text-xs" />
                              ) : (
                                <FaCopy className="text-xs" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Password with 13px font */}
                        <td className="px-4 py-4 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[13px] tracking-wider text-slate-200 bg-slate-900 px-2 py-1 rounded-md border border-slate-800 select-all truncate min-w-0">
                              {visiblePasswords[item._id]
                                ? item.password
                                : "••••••••••••"}
                            </span>

                            {/* Visibility toggle button */}
                            <button
                              type="button"
                              onClick={() => toggleRowPassword(item._id)}
                              title={visiblePasswords[item._id] ? "Hide password" : "Show password"}
                              aria-label={visiblePasswords[item._id] ? "Hide password" : "Show password"}
                              className="min-w-7 min-h-7 p-1.5 inline-flex items-center justify-center text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 shrink-0"
                            >
                              {visiblePasswords[item._id] ? (
                                <FaEyeSlash size={14} />
                              ) : (
                                <FaEye size={14} />
                              )}
                            </button>

                            {/* Copy button */}
                            <button
                              type="button"
                              onClick={() => copyText(item.password, `pass-${item._id}`)}
                              title="Copy Password"
                              aria-label="Copy Password"
                              className="min-w-7 min-h-7 p-1.5 inline-flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 shrink-0"
                            >
                              {copiedField === `pass-${item._id}` ? (
                                <FaCheck className="text-emerald-400 text-xs" />
                              ) : (
                                <FaCopy className="text-xs" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Actions: at least 28x28px */}
                        <td className="px-4 py-4 text-right min-w-0">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => editPassword(item)}
                              title="Edit credential"
                              aria-label="Edit credential"
                              className="min-w-7 min-h-7 p-2 inline-flex items-center justify-center text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-indigo-500/10 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 shrink-0"
                            >
                              <FaEdit size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => openDeleteModal(item, e)}
                              title="Delete credential"
                              aria-label="Delete credential"
                              className="min-w-7 min-h-7 p-2 inline-flex items-center justify-center text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-rose-500 shrink-0"
                            >
                              <FaTrash size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ===================================================
                  F2 & F4: MOBILE CARD VIEW (Visible on mobile screens < md)
                  Fixed: min-w-0 on all wrappers, full text display with break-all,
                  and 40x40px touch targets.
              =================================================== */}
              <div className="block md:hidden space-y-4 min-w-0">
                {filteredPasswords.map((item) => (
                  <div
                    key={item._id}
                    className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3 min-w-0 overflow-hidden"
                  >
                    {/* Top Row: Service Title & Action Buttons */}
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/80 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {item.title ? item.title.charAt(0) : "P"}
                        </div>
                        <h3 className="font-bold text-white text-base truncate min-w-0" title={item.title}>
                          {item.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => editPassword(item)}
                          aria-label="Edit credential"
                          className="min-h-10 min-w-10 inline-flex items-center justify-center text-slate-400 hover:text-indigo-400 rounded-lg bg-slate-900 border border-slate-800 transition-colors"
                        >
                          <FaEdit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => openDeleteModal(item, e)}
                          aria-label="Delete credential"
                          className="min-h-10 min-w-10 inline-flex items-center justify-center text-slate-400 hover:text-rose-400 rounded-lg bg-slate-900 border border-slate-800 transition-colors"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Website: FULL value with break-all, min-w-0, and 40x40 touch target */}
                    <div className="flex items-start justify-between text-xs gap-3 min-w-0">
                      <span className="text-slate-400 flex items-center gap-1.5 shrink-0 pt-0.5">
                        <FaGlobe className="text-[11px]" />
                        <span>Website:</span>
                      </span>
                      <div className="flex items-start justify-end gap-1.5 min-w-0 flex-1 text-right">
                        <a
                          href={getSafeUrl(item.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 font-mono text-[13px] hover:underline break-all wrap:anywhere min-w-0"
                          title={item.url}
                        >
                          {item.url}
                        </a>
                        <button
                          type="button"
                          onClick={() => copyText(item.url, `m-url-${item._id}`)}
                          className="min-h-10 min-w-10 inline-flex items-center justify-center text-slate-400 hover:text-white shrink-0 -mr-2 -mt-1.5"
                          title="Copy URL"
                          aria-label="Copy URL"
                        >
                          {copiedField === `m-url-${item._id}` ? (
                            <FaCheck className="text-emerald-400 text-xs" />
                          ) : (
                            <FaCopy className="text-xs" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Username: FULL value with break-all, min-w-0, and 40x40 touch target */}
                    <div className="flex items-start justify-between text-xs gap-3 min-w-0">
                      <span className="text-slate-400 flex items-center gap-1.5 shrink-0 pt-0.5">
                        <FaUser className="text-[11px]" />
                        <span>Account:</span>
                      </span>
                      <div className="flex items-start justify-end gap-1.5 min-w-0 flex-1 text-right">
                        <span className="text-slate-200 font-mono text-[13px] break-all wrap:anywhere min-w-0" title={item.username}>
                          {item.username}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyText(item.username, `m-user-${item._id}`)}
                          className="min-h-10 min-w-10 inline-flex items-center justify-center text-slate-400 hover:text-white shrink-0 -mr-2 -mt-1.5"
                          title="Copy username"
                          aria-label="Copy username"
                        >
                          {copiedField === `m-user-${item._id}` ? (
                            <FaCheck className="text-emerald-400 text-xs" />
                          ) : (
                            <FaCopy className="text-xs" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Password: 40x40px touch targets for buttons */}
                    <div className="flex items-center justify-between text-xs gap-2 pt-1 border-t border-slate-900 min-w-0">
                      <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                        <FaLock className="text-[11px]" />
                        <span>Password:</span>
                      </span>
                      <div className="flex items-center gap-1.5 min-w-0 justify-end">
                        <span className="font-mono text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[13px] select-all break-all">
                          {visiblePasswords[item._id]
                            ? item.password
                            : "••••••••••••"}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleRowPassword(item._id)}
                          className="min-h-10 min-w-10 inline-flex items-center justify-center text-slate-400 hover:text-white"
                          title="Toggle visibility"
                          aria-label="Toggle password visibility"
                        >
                          {visiblePasswords[item._id] ? (
                            <FaEyeSlash size={14} />
                          ) : (
                            <FaEye size={14} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyText(item.password, `m-pass-${item._id}`)}
                          className="min-h-10 min-w-10 inline-flex items-center justify-center text-slate-400 hover:text-white"
                          title="Copy password"
                          aria-label="Copy password"
                        >
                          {copiedField === `m-pass-${item._id}` ? (
                            <FaCheck className="text-emerald-400 text-xs" />
                          ) : (
                            <FaCopy className="text-xs" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===================================================
          F5: DELETE CONFIRMATION MODAL (ACCESSIBLE ALERTDIALOG)
      =================================================== */}
      {deleteCandidate && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={deleteTitleId}
          aria-describedby={deleteDescId}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <FaTrash className="text-sm" />
              </div>
              <div>
                <h3 id={deleteTitleId} className="text-base font-bold text-white">
                  Delete Credential
                </h3>
                <p className="text-xs text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <p id={deleteDescId} className="text-sm text-slate-300">
              Are you sure you want to permanently delete credentials for{" "}
              <strong className="text-white font-semibold">
                &quot;{deleteCandidate.title}&quot;
              </strong>{" "}
              from your vault?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                ref={cancelDeleteBtnRef}
                onClick={() => setDeleteCandidate(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 transition-colors cursor-pointer min-h-10 inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAction}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 transition-colors cursor-pointer min-h-10 inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Manager;
