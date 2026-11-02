import { useEffect, useState, useId } from "react";
import { Link } from "react-router-dom";
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

  if (available.length === 0) return "";

  const remainingLength = Math.max(0, options.length - guaranteed.length);
  const randomValues = new Uint32Array(remainingLength);
  window.crypto.getRandomValues(randomValues);

  const passwordChars = [...guaranteed];
  for (let i = 0; i < remainingLength; i++) {
    passwordChars.push(available[randomValues[i] % available.length]);
  }

  const shuffleValues = new Uint32Array(passwordChars.length);
  window.crypto.getRandomValues(shuffleValues);
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = shuffleValues[i] % (i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join("");
}

function calculatePasswordStrength(pass) {
  if (!pass) return { score: 0, label: "Not entered", color: "bg-slate-700", text: "text-slate-400" };
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

const Manager = ({ user, authLoading }) => {
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
        if (!res.ok) throw new Error("Failed to fetch passwords");
        return res.json();
      })
      .then((data) => {
        if (isSubscribed) {
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
  }, [user]);

  // Refresh passwords function for after mutations
  const refreshPasswords = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/api/auth/get`, {
        method: "GET",
        credentials: "include",
      });
      const data = await res.json();
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

  // =========================
  // SHOW / HIDE PASSWORD (form input)
  // =========================
  const showPass = () => {
    setShowPassword((prev) => !prev);
  };

  // =========================
  // TOGGLE PASSWORD VISIBILITY (table rows)
  // =========================
  const toggleRowPassword = (id) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // =========================
  // SEARCH FILTER
  // =========================
  const filteredPasswords = passwordArray.filter((item) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;

    return (
      (item.title && item.title.toLowerCase().includes(query)) ||
      (item.url && item.url.toLowerCase().includes(query)) ||
      (item.username && item.username.toLowerCase().includes(query))
    );
  });

  // =========================
  // HANDLE INPUT CHANGE
  // =========================
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

      const data = await res.json();

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

    toast.info(`Editing "${item.title}". Update the fields above.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

      const data = await res.json();

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
  const confirmDeleteAction = async () => {
    if (!deleteCandidate || isDeleting) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/delete/${deleteCandidate._id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

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

  // If user is not logged in
  if (!user) {
    return (
      <div className="mycontainer py-16 sm:py-24 max-w-4xl">
        <div className="relative bg-slate-900/80 border border-slate-800 rounded-3xl p-8 sm:p-14 shadow-2xl backdrop-blur-xl text-center overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500"></div>

          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white text-2xl mx-auto mb-6 shadow-xl shadow-indigo-600/30 ring-1 ring-white/20">
            <FaLock />
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
            Encrypted Credential Vault
          </h1>

          <p className="text-slate-300 max-w-xl mx-auto text-base sm:text-lg mb-8 leading-relaxed">
            CipherVault stores your sensitive website passwords encrypted at rest using server-side
            <strong className="text-indigo-400 font-semibold"> AES-256-GCM</strong> authenticated encryption. Sign in or create an account to unlock your personal vault.
          </p>

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

  return (
    <div className="mycontainer py-8 sm:py-12">
      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide uppercase mb-4">
          <FaShieldAlt className="text-xs" />
          <span>Server-Side AES-256-GCM Encrypted</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
          Cipher<span className="text-indigo-400">Vault</span>
        </h1>
        <p className="text-slate-400 text-sm sm:text-base">
          AES-256-GCM authenticated credential vault isolated to your account.
        </p>
      </div>

      {/* =========================
          ADD / EDIT CREDENTIAL FORM
      ========================= */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl mb-12 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              {editingId ? (
                <FaEdit className="text-lg" />
              ) : (
                <FaPlus className="text-lg" />
              )}
            </div>
            <div>
              <h2 className="font-bold text-lg sm:text-xl text-white">
                {editingId ? "Update Stored Credential" : "Store New Credential"}
              </h2>
              <p className="text-xs text-slate-400">
                {editingId
                  ? "Modifying existing encrypted password record"
                  : "All credentials are encrypted with fresh 96-bit IV before storage"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleGenerator}
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                }}
                className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <FaTimes className="text-xs" />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>

        {/* PASSWORD GENERATOR PANEL (Expandable) */}
        {showGenerator && (
          <div className="mb-6 p-5 rounded-2xl bg-slate-950/80 border border-indigo-500/30 shadow-inner animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <FaSlidersH className="text-indigo-400 text-sm" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Cryptographic Password Generator
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Uses window.crypto CSPRNG
              </span>
            </div>

            {/* Generated Output Display */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl p-3 mb-4">
              <span className="flex-1 font-mono text-sm sm:text-base text-indigo-300 tracking-wider truncate select-all">
                {generatedPassword || "Select options to generate"}
              </span>
              <button
                type="button"
                onClick={() => copyText(generatedPassword, "gen-pwd")}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Copy password"
              >
                {copiedField === "gen-pwd" ? (
                  <FaCheck className="text-emerald-400 text-sm" />
                ) : (
                  <FaCopy className="text-sm" />
                )}
              </button>
              <button
                type="button"
                onClick={() => handleGenerate()}
                className="p-2 text-indigo-400 hover:text-indigo-300 rounded-lg hover:bg-indigo-500/10 transition-colors cursor-pointer"
                title="Regenerate password"
              >
                <FaMagic className="text-sm" />
              </button>
              <button
                type="button"
                onClick={applyGeneratedPassword}
                className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Use in Form
              </button>
            </div>

            {/* Options */}
            <div className="space-y-3">
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
                className="w-full accent-indigo-500 cursor-pointer"
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                <label htmlFor={genUpperId} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
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
                <label htmlFor={genLowerId} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
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
                <label htmlFor={genNumbersId} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
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
                <label htmlFor={genSymbolsId} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
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

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Title */}
          <div>
            <label
              htmlFor="form-title"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
            >
              Service / Title
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FaShieldAlt className="text-sm" />
              </span>
              <input
                id="form-title"
                placeholder="e.g. GitHub, Google, AWS"
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 pl-10 pr-4 py-3 text-slate-100 placeholder-slate-400 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition-all disabled:opacity-50"
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                disabled={isSubmitting}
                maxLength={100}
              />
            </div>
          </div>

          {/* Website URL */}
          <div>
            <label
              htmlFor="form-url"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
            >
              Website URL
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FaGlobe className="text-sm" />
              </span>
              <input
                id="form-url"
                placeholder="https://example.com"
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 pl-10 pr-4 py-3 text-slate-100 placeholder-slate-400 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition-all disabled:opacity-50"
                type="text"
                name="url"
                value={form.url}
                onChange={handleChange}
                disabled={isSubmitting}
                maxLength={2048}
              />
            </div>
          </div>

          {/* Username / Email */}
          <div>
            <label
              htmlFor="form-username"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
            >
              Username / Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FaUser className="text-sm" />
              </span>
              <input
                id="form-username"
                placeholder="user@example.com"
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 pl-10 pr-4 py-3 text-slate-100 placeholder-slate-400 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition-all disabled:opacity-50"
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                disabled={isSubmitting}
                maxLength={100}
              />
            </div>
          </div>

          {/* Password with Visibility Toggle & Strength */}
          <div>
            <label
              htmlFor="form-password"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
            >
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FaLock className="text-sm" />
              </span>
              <input
                id="form-password"
                placeholder="Enter password"
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 pl-10 pr-12 py-3 text-slate-100 placeholder-slate-400 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition-all font-mono disabled:opacity-50"
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                disabled={isSubmitting}
                maxLength={500}
              />

              <button
                type="button"
                onClick={showPass}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              <div className="mt-2 space-y-1">
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
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <FaKey className="text-indigo-400" />
            <span>Encrypted with 256-bit AES authenticated tag</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={editingId ? updatePassword : savePassword}
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold px-7 py-3 rounded-xl shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
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
      </div>

      {/* =========================
          SAVED PASSWORDS SECTION
      ========================= */}
      <div className="space-y-6">
        {/* Section Header with Stats & Search */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="font-extrabold text-xl sm:text-2xl text-white">
                  Stored Credentials
                </h2>
                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  {passwordArray.length} {passwordArray.length === 1 ? "entry" : "entries"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Decrypted in real-time for your authenticated session
              </p>
            </div>

            {/* Quick search input */}
            <div className="relative w-full md:w-80">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FaSearch className="text-sm" />
              </span>
              <input
                type="text"
                placeholder="Search by title, URL or username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 pl-10 pr-9 py-2.5 text-slate-100 placeholder-slate-400 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition-all"
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
            <div className="py-12 space-y-4">
              <div className="h-14 bg-slate-800/40 rounded-xl animate-pulse"></div>
              <div className="h-14 bg-slate-800/40 rounded-xl animate-pulse"></div>
              <div className="h-14 bg-slate-800/40 rounded-xl animate-pulse"></div>
            </div>
          ) : passwordArray.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto mb-4">
                <FaLock className="text-2xl" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">
                Your vault is currently empty
              </h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">
                Add your first credential using the form above. It will be securely stored with AES-256-GCM encryption.
              </p>
            </div>
          ) : filteredPasswords.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl">
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
                  DESKTOP TABLE VIEW (Visible on md and larger)
              =================================================== */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 shadow-inner">
                <table className="w-full text-left text-sm text-slate-200">
                  <thead className="bg-slate-900/90 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th scope="col" className="px-5 py-3.5 font-semibold">
                        Service
                      </th>
                      <th scope="col" className="px-5 py-3.5 font-semibold">
                        Website
                      </th>
                      <th scope="col" className="px-5 py-3.5 font-semibold">
                        Account / Username
                      </th>
                      <th scope="col" className="px-5 py-3.5 font-semibold">
                        Password
                      </th>
                      <th scope="col" className="px-5 py-3.5 font-semibold text-right">
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
                        <td className="px-5 py-4 font-semibold text-white">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs uppercase">
                              {item.title ? item.title.charAt(0) : "P"}
                            </div>
                            <span className="truncate max-w-[160px]">
                              {item.title}
                            </span>
                          </div>
                        </td>

                        {/* URL */}
                        <td className="px-5 py-4 text-slate-300">
                          <div className="flex items-center gap-2">
                            <a
                              href={getSafeUrl(item.url)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-400 hover:text-indigo-300 font-mono text-xs hover:underline flex items-center gap-1.5 truncate max-w-[200px]"
                            >
                              <span className="truncate">{item.url}</span>
                              <FaExternalLinkAlt className="text-[10px] shrink-0 opacity-70" />
                            </a>

                            <button
                              type="button"
                              onClick={() => copyText(item.url, `url-${item._id}`)}
                              title="Copy URL"
                              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              {copiedField === `url-${item._id}` ? (
                                <FaCheck className="text-emerald-400 text-xs" />
                              ) : (
                                <FaCopy className="text-xs" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Username */}
                        <td className="px-5 py-4 text-slate-300">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs truncate max-w-[180px]">
                              {item.username}
                            </span>

                            <button
                              type="button"
                              onClick={() => copyText(item.username, `user-${item._id}`)}
                              title="Copy Username"
                              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              {copiedField === `user-${item._id}` ? (
                                <FaCheck className="text-emerald-400 text-xs" />
                              ) : (
                                <FaCopy className="text-xs" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Password */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs tracking-wider text-slate-200 bg-slate-900 px-2 py-1 rounded-md border border-slate-800 select-all">
                              {visiblePasswords[item._id]
                                ? item.password
                                : "••••••••••••"}
                            </span>

                            {/* Visibility toggle button */}
                            <button
                              type="button"
                              onClick={() => toggleRowPassword(item._id)}
                              title={visiblePasswords[item._id] ? "Hide password" : "Show password"}
                              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              {copiedField === `pass-${item._id}` ? (
                                <FaCheck className="text-emerald-400 text-xs" />
                              ) : (
                                <FaCopy className="text-xs" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => editPassword(item)}
                              title="Edit credential"
                              className="p-2 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-indigo-500/10 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <FaEdit size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteCandidate(item)}
                              title="Delete credential"
                              className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-rose-500"
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
                  MOBILE CARD VIEW (Visible on mobile screens < md)
              =================================================== */}
              <div className="block md:hidden space-y-4">
                {filteredPasswords.map((item) => (
                  <div
                    key={item._id}
                    className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3"
                  >
                    {/* Top Row: Service Title & Action Buttons */}
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {item.title ? item.title.charAt(0) : "P"}
                        </div>
                        <h3 className="font-bold text-white text-base truncate">
                          {item.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => editPassword(item)}
                          aria-label="Edit credential"
                          className="p-2 text-slate-400 hover:text-indigo-400 rounded-lg bg-slate-900 border border-slate-800 transition-colors"
                        >
                          <FaEdit size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteCandidate(item)}
                          aria-label="Delete credential"
                          className="p-2 text-slate-400 hover:text-rose-400 rounded-lg bg-slate-900 border border-slate-800 transition-colors"
                        >
                          <FaTrash size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Website */}
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                        <FaGlobe className="text-[11px]" />
                        <span>Website:</span>
                      </span>
                      <div className="flex items-center gap-1.5 truncate">
                        <a
                          href={getSafeUrl(item.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 font-mono truncate hover:underline flex items-center gap-1"
                        >
                          <span className="truncate">{item.url}</span>
                          <FaExternalLinkAlt className="text-[9px] shrink-0" />
                        </a>
                        <button
                          type="button"
                          onClick={() => copyText(item.url, `m-url-${item._id}`)}
                          className="p-1 text-slate-400 hover:text-white"
                          title="Copy URL"
                        >
                          {copiedField === `m-url-${item._id}` ? (
                            <FaCheck className="text-emerald-400 text-xs" />
                          ) : (
                            <FaCopy className="text-xs" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Username */}
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                        <FaUser className="text-[11px]" />
                        <span>Account:</span>
                      </span>
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-slate-200 font-mono truncate">
                          {item.username}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyText(item.username, `m-user-${item._id}`)}
                          className="p-1 text-slate-400 hover:text-white"
                          title="Copy username"
                        >
                          {copiedField === `m-user-${item._id}` ? (
                            <FaCheck className="text-emerald-400 text-xs" />
                          ) : (
                            <FaCopy className="text-xs" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Password */}
                    <div className="flex items-center justify-between text-xs gap-2 pt-1 border-t border-slate-900">
                      <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                        <FaLock className="text-[11px]" />
                        <span>Password:</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-xs">
                          {visiblePasswords[item._id]
                            ? item.password
                            : "••••••••••••"}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleRowPassword(item._id)}
                          className="p-1 text-slate-400 hover:text-white"
                          title="Toggle visibility"
                        >
                          {visiblePasswords[item._id] ? (
                            <FaEyeSlash size={13} />
                          ) : (
                            <FaEye size={13} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyText(item.password, `m-pass-${item._id}`)}
                          className="p-1 text-slate-400 hover:text-white"
                          title="Copy password"
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

      {/* =========================
          DELETE CONFIRMATION MODAL
      ========================= */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <FaTrash className="text-sm" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Credential</h3>
                <p className="text-xs text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-slate-300">
              Are you sure you want to permanently delete credentials for{" "}
              <strong className="text-white font-semibold">
                &quot;{deleteCandidate.title}&quot;
              </strong>{" "}
              from your vault?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAction}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 transition-colors cursor-pointer"
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
