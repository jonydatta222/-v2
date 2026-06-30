import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Store, Phone, UserCircle } from 'lucide-react';
import { StoreInfo } from '../types';
import { useLanguage } from '../LanguageContext';

interface StoreProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (info: StoreInfo) => void;
  initialData: StoreInfo | null;
  isInitialPrompt?: boolean;
}

export const StoreProfileDialog: React.FC<StoreProfileDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  isInitialPrompt = false,
}) => {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setError('');
    }
  }, [isOpen, initialData]);

  const handleSave = () => {
    if (!name.trim()) {
      setError('অনুগ্রহ করে দোকানের নাম দিন।');
      return;
    }
    onSave({ name: name.trim() });
  };

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
            onClick={!isInitialPrompt ? onClose : undefined}
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
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <UserCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    প্রোফাইল
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {t('storeProfileDesc') || 'আপনার দোকানের তথ্য সেট করুন'}
                  </p>
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
            <div className="p-4 space-y-4 overflow-y-auto">
              {error && (
                <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {t('storeName') || 'দোকানের নাম'}
                  </label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('storeNamePlaceholder') || 'আপনার দোকানের নাম লিখুন'}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button
                onClick={handleSave}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors cursor-pointer shadow-sm shadow-indigo-600/20"
              >
                {t('saveBtn') || 'সেভ করুন'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
