import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calculator as CalculatorIcon, Delete } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface CalculatorDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CalculatorDialog: React.FC<CalculatorDialogProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  const parsePercentValue = (valStr: string, currentEquation: string) => {
    if (!valStr.endsWith('%')) return valStr;
    const val = parseFloat(valStr);
    if (isNaN(val)) return '0';
    
    if (currentEquation) {
      const parts = currentEquation.trim().split(' ');
      if (parts.length >= 2) {
        const prevValue = parseFloat(parts[0]);
        const operator = parts[parts.length - 1];
        
        if (!isNaN(prevValue)) {
          if (operator === '+' || operator === '-') {
            return ((prevValue * val) / 100).toString();
          } else if (operator === '×' || operator === '÷') {
            return (val / 100).toString();
          }
        }
      }
    }
    return (val / 100).toString();
  };

  const handleNumber = (num: string) => {
    if (display === '0' || display === 'Error' || display.endsWith('%')) {
      setDisplay(num);
    } else {
      setDisplay(display + num);
    }
  };

  const handleOperator = (op: string) => {
    if (display === 'Error') return;
    
    // If the user just pressed an operator and presses another one without entering a number
    if (equation && (display === '0' || display.endsWith('%') === false && parseFloat(display) === 0)) {
      if (display === '0') {
        setEquation(equation.slice(0, -2) + op + ' ');
        return;
      }
    }

    const currentValStr = parsePercentValue(display, equation);

    if (equation) {
      try {
        const expr = equation + currentValStr;
        const safeExpr = expr.replace(/×/g, '*').replace(/÷/g, '/');
        // eslint-disable-next-line no-new-func
        const result = new Function('return ' + safeExpr)();
        const formattedResult = Number.isInteger(result) ? result.toString() : result.toFixed(2).replace(/\.?0+$/, '');
        setEquation(formattedResult + ' ' + op + ' ');
        setDisplay('0');
      } catch (e) {
        setDisplay('Error');
        setEquation('');
      }
    } else {
      setEquation(currentValStr + ' ' + op + ' ');
      setDisplay('0');
    }
  };

  const calculate = () => {
    if (!equation && !display.includes('%')) return;
    if (display === 'Error') return;
    try {
      const currentValStr = parsePercentValue(display, equation);
      
      const expr = equation + currentValStr;
      const safeExpr = expr.replace(/×/g, '*').replace(/÷/g, '/');
      // eslint-disable-next-line no-new-func
      const result = new Function('return ' + safeExpr)();
      
      const formattedResult = Number.isInteger(result) ? result.toString() : result.toFixed(2).replace(/\.?0+$/, '');
      
      setDisplay(formattedResult);
      setEquation('');
    } catch (e) {
      setDisplay('Error');
      setEquation('');
    }
  };

  const clear = () => {
    setDisplay('0');
    setEquation('');
  };

  const backspace = () => {
    if (display === 'Error') {
      setDisplay('0');
    } else if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const handlePercentage = () => {
    if (display === 'Error') return;
    if (display.endsWith('%')) return;
    setDisplay(display + '%');
  };

  const buttons = [
    { label: 'C', onClick: clear, className: 'bg-rose-100 text-rose-600 hover:bg-rose-200' },
    { label: '⌫', onClick: backspace, className: 'bg-slate-200 text-slate-700 hover:bg-slate-300' },
    { label: '%', onClick: handlePercentage, className: 'bg-slate-200 text-slate-700 hover:bg-slate-300' },
    { label: '÷', onClick: () => handleOperator('÷'), className: 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200 text-xl font-bold' },
    { label: '7', onClick: () => handleNumber('7'), className: 'bg-white text-slate-800 hover:bg-slate-100 font-bold' },
    { label: '8', onClick: () => handleNumber('8'), className: 'bg-white text-slate-800 hover:bg-slate-100 font-bold' },
    { label: '9', onClick: () => handleNumber('9'), className: 'bg-white text-slate-800 hover:bg-slate-100 font-bold' },
    { label: '×', onClick: () => handleOperator('×'), className: 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200 text-xl font-bold' },
    { label: '4', onClick: () => handleNumber('4'), className: 'bg-white text-slate-800 hover:bg-slate-100 font-bold' },
    { label: '5', onClick: () => handleNumber('5'), className: 'bg-white text-slate-800 hover:bg-slate-100 font-bold' },
    { label: '6', onClick: () => handleNumber('6'), className: 'bg-white text-slate-800 hover:bg-slate-100 font-bold' },
    { label: '-', onClick: () => handleOperator('-'), className: 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200 text-xl font-bold' },
    { label: '1', onClick: () => handleNumber('1'), className: 'bg-white text-slate-800 hover:bg-slate-100 font-bold' },
    { label: '2', onClick: () => handleNumber('2'), className: 'bg-white text-slate-800 hover:bg-slate-100 font-bold' },
    { label: '3', onClick: () => handleNumber('3'), className: 'bg-white text-slate-800 hover:bg-slate-100 font-bold' },
    { label: '+', onClick: () => handleOperator('+'), className: 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200 text-xl font-bold' },
    { label: '0', onClick: () => handleNumber('0'), className: 'bg-white text-slate-800 hover:bg-slate-100 font-bold col-span-2' },
    { label: '.', onClick: () => handleNumber('.'), className: 'bg-white text-slate-800 hover:bg-slate-100 font-bold' },
    { label: '=', onClick: calculate, className: 'bg-indigo-600 text-white hover:bg-indigo-700 text-xl font-bold' },
  ];

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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[320px] bg-slate-100 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col will-change-transform"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-white rounded-t-3xl border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <CalculatorIcon className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-slate-800">
                  {t('calculator') || 'ক্যালকুলেটর'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Display */}
            <div className="p-6 bg-slate-800 flex flex-col items-end justify-end space-y-1">
              <div className="text-slate-400 text-sm font-mono h-5 overflow-hidden">
                {equation}
              </div>
              <div className="text-white text-4xl font-bold font-mono tracking-tight overflow-x-auto max-w-full no-scrollbar whitespace-nowrap">
                {display}
              </div>
            </div>

            {/* Keypad */}
            <div className="p-4 bg-slate-100 grid grid-cols-4 gap-2">
              {buttons.map((btn, index) => (
                <motion.button
                  key={index}
                  whileTap={{ scale: 0.9 }}
                  onClick={btn.onClick}
                  className={`h-14 rounded-2xl flex items-center justify-center text-lg shadow-sm cursor-pointer touch-manipulation ${btn.className}`}
                >
                  {btn.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
