import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Info, Linkedin, Facebook } from "lucide-react";

interface AboutUsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutUsDialog: React.FC<AboutUsDialogProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 bg-slate-900/60 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh] will-change-transform"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">About Us</h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-center">
              <img
                src="/logo.jpg"
                alt="Logo"
                className="w-20 h-20 rounded-2xl shadow-md object-cover mx-auto mb-4"
              />
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                হিসাব খাতা
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                আপনার ব্যবসায়ের দৈনিক বেচাকেনা, বকেয়া এবং খরচের সহজ সমাধান।
                সবকিছু নিরাপদে হিসেব রাখুন।
              </p>

              <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-400 font-medium mb-3">
                  Developed by
                </p>
                <div className="flex flex-col items-center gap-3">
                  <span className="font-bold text-slate-800">Jony Datta</span>
                  <div className="flex items-center gap-4">
                    <a
                      href="https://www.facebook.com/share/1EMccG71AB/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:scale-110 transition-transform flex items-center justify-center p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/30 font-semibold gap-2"
                      title="Facebook"
                    >
                      <Facebook className="w-5 h-5 fill-current" />
                      <span className="text-sm">Facebook</span>
                    </a>
                    <a
                      href="https://www.linkedin.com/in/jonydatta"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:scale-110 transition-transform flex items-center justify-center p-3 bg-sky-600 rounded-xl shadow-lg shadow-sky-600/30 font-semibold gap-2"
                      title="LinkedIn"
                    >
                      <Linkedin className="w-5 h-5 fill-current" />
                      <span className="text-sm">LinkedIn</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
