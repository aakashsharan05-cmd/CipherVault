import { FaGithub, FaLinkedin, FaShieldAlt, FaLock } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="bg-slate-900/70 border-t border-slate-800 text-slate-400 mt-auto">
      <div className="mycontainer py-8 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand / Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-sm">
            <FaShieldAlt className="text-sm" />
          </div>
          <div>
            <div className="font-bold text-slate-100 text-base">
              Cipher<span className="text-indigo-400">Vault</span>
            </div>
            <p className="text-xs text-slate-400">
              Server-side AES-256-GCM encrypted vault
            </p>
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/80 border border-slate-700/60 px-3.5 py-1.5 rounded-full">
          <FaLock className="text-indigo-400 text-[10px]" />
          <span>AES-256-GCM Server-Side Encrypted</span>
        </div>

        {/* Links & copyright */}
        <div className="flex items-center gap-4 text-slate-400">
          <span className="text-xs text-slate-400">
            Crafted by <span className="text-slate-200 font-medium">Aakash</span>
          </span>
          <div className="flex gap-3 text-lg">
            <a
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub profile"
              className="text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded p-1"
            >
              <FaGithub />
            </a>
            <a
              href="https://linkedin.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn profile"
              className="text-slate-400 hover:text-indigo-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded p-1"
            >
              <FaLinkedin />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
