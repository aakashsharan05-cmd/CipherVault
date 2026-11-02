import { useEffect, useState } from "react";
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
} from "react-icons/fa";
import { toast } from "react-toastify";
import { API_URL } from "../config";

const Manager = () => {
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

  // =========================
  // GET PASSWORDS
  // =========================
  const getpassword = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/get`, {
        method: "GET",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch passwords");
      }

      setPasswordArray(data.passwords || []);
    } catch (error) {
      toast.error(error.message || "Could not load vault data.");
    }
  };

  // Fetch passwords when Manager loads
  useEffect(() => {
    getpassword();
  }, []);

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
    const query = search.toLowerCase();

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
    if (
      form.title.trim() === "" ||
      form.url.trim() === "" ||
      form.username.trim() === "" ||
      form.password.trim() === ""
    ) {
      toast.warn("Please fill in all fields before saving.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/create`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to save password");
      }

      await getpassword();

      setForm({
        title: "",
        url: "",
        username: "",
        password: "",
      });

      toast.success("Credential encrypted and saved to your vault!");
    } catch (error) {
      toast.error(error.message || "Error saving credential.");
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
    if (
      form.title.trim() === "" ||
      form.url.trim() === "" ||
      form.username.trim() === "" ||
      form.password.trim() === ""
    ) {
      toast.warn("Please fill in all fields before updating.");
      return;
    }

    if (!editingId) {
      toast.error("No password selected for editing.");
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/api/auth/update/${editingId}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

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

      await getpassword();

      toast.success("Credential updated successfully!");
    } catch (error) {
      toast.error(error.message || "Failed to update credential.");
    }
  };

  // =========================
  // DELETE PASSWORD
  // =========================
  const deletePassword = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to permanently delete this credential from your vault?"
    );

    if (!confirmDelete) return;

    try {
      const res = await fetch(`${API_URL}/api/auth/delete/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to delete password");
      }

      await getpassword();

      toast.success("Credential removed from vault.");
    } catch (error) {
      toast.error(error.message || "Failed to delete credential.");
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

  return (
    <div className="mycontainer py-8 sm:py-12">
      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide uppercase mb-4">
          <FaShieldAlt className="text-xs" />
          <span>Zero-Knowledge Architecture</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
          Cipher<span className="text-indigo-400">Vault</span>
        </h1>
        <p className="text-slate-400 text-sm sm:text-base">
          AES-256-GCM encrypted credential vault with authenticated sessions.
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
                  : "All credentials are encrypted server-side before storage"}
              </p>
            </div>
          </div>

          {editingId && (
            <button
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
              <span>Cancel Edit</span>
            </button>
          )}
        </div>

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
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 pl-10 pr-4 py-3 text-slate-100 placeholder-slate-400 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition-all"
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
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
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 pl-10 pr-4 py-3 text-slate-100 placeholder-slate-400 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition-all"
                type="text"
                name="url"
                value={form.url}
                onChange={handleChange}
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
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 pl-10 pr-4 py-3 text-slate-100 placeholder-slate-400 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition-all"
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Password with Visibility Toggle */}
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
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 pl-10 pr-12 py-3 text-slate-100 placeholder-slate-400 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition-all font-mono"
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
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
              onClick={editingId ? updatePassword : savePassword}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold px-7 py-3 rounded-xl shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              {editingId ? (
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
          {passwordArray.length === 0 ? (
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
                No passwords matched your search query "{search}".
              </p>
              <button
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
                              href={
                                item.url && item.url.startsWith("http")
                                  ? item.url
                                  : `https://${item.url}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-400 hover:text-indigo-300 font-mono text-xs hover:underline flex items-center gap-1.5 truncate max-w-[200px]"
                            >
                              <span className="truncate">{item.url}</span>
                              <FaExternalLinkAlt className="text-[10px] shrink-0 opacity-70" />
                            </a>

                            <button
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
                              onClick={() => editPassword(item)}
                              title="Edit credential"
                              className="p-2 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-indigo-500/10 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <FaEdit size={14} />
                            </button>
                            <button
                              onClick={() => deletePassword(item._id)}
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
                          onClick={() => editPassword(item)}
                          aria-label="Edit credential"
                          className="p-2 text-slate-400 hover:text-indigo-400 rounded-lg bg-slate-900 border border-slate-800 transition-colors"
                        >
                          <FaEdit size={13} />
                        </button>
                        <button
                          onClick={() => deletePassword(item._id)}
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
                          href={
                            item.url && item.url.startsWith("http")
                              ? item.url
                              : `https://${item.url}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 font-mono truncate hover:underline flex items-center gap-1"
                        >
                          <span className="truncate">{item.url}</span>
                          <FaExternalLinkAlt className="text-[9px] shrink-0" />
                        </a>
                        <button
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
    </div>
  );
};

export default Manager;
