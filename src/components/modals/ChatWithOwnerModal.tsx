import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Image, Mic, Smile, CheckCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { DetailedProperty } from '../../data/propertyDetailsHelper';
import { useScrollLock } from '../../hooks/useScrollLock';

interface ChatWithOwnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: DetailedProperty;
}

interface Message {
  id: string;
  sender: 'user' | 'owner';
  text: string;
  time: string;
  status: 'sent' | 'delivered' | 'read';
}

export const ChatWithOwnerModal: React.FC<ChatWithOwnerModalProps> = ({
  isOpen,
  onClose,
  property,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'owner',
      text: `Hello! Thanks for your interest in ${property.name || property.title}. How can I assist you with availability, room options, or food menu today?`,
      time: 'Just now',
      status: 'read',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useScrollLock(isOpen);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  if (!isOpen) return null;

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'read',
    };

    setMessages((prev) => [...prev, userMsg]);
    const sentText = input;
    setInput('');

    // Simulate owner typing & auto-reply
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      let replyText = `Thanks for reaching out! We have immediate move-in slots for ${property.name}. You can also schedule an in-person visit anytime!`;
      if (sentText.toLowerCase().includes('rent') || sentText.toLowerCase().includes('price')) {
        replyText = `The monthly rent starts at ₹${(property.rent || 10000).toLocaleString('en-IN')}/mo with a refundable deposit of ₹${(property.securityDeposit || 20000).toLocaleString('en-IN')}.`;
      } else if (sentText.toLowerCase().includes('food') || sentText.toLowerCase().includes('mess')) {
        replyText = `Yes, 4 freshly cooked meals are served daily (breakfast, lunch, snacks, dinner) with both Veg & Non-Veg options!`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-reply-${Date.now()}`,
          sender: 'owner',
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read',
        },
      ]);
    }, 1800);
  };

  const handleQuickChip = (text: string) => {
    setInput(text);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 z-10 overflow-hidden flex flex-col h-[580px]"
        >
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-[#a3e635] text-slate-950 font-black flex items-center justify-center text-sm font-heading">
                  {(property.owner?.name || 'H')[0]}
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-sm font-heading text-white">
                    {property.owner?.name || 'Property Host'}
                  </h4>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#a3e635]" />
                </div>
                <p className="text-[10px] text-emerald-400 font-medium">Online now • Verified Host</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FAF9F5]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-slate-900 text-white rounded-br-none'
                      : 'bg-white text-slate-900 border border-slate-200 shadow-xs rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>

                <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                  <span>{msg.time}</span>
                  {msg.sender === 'user' && <CheckCheck className="w-3 h-3 text-[#a3e635]" />}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 px-3 py-2 rounded-full w-max shadow-xs">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                <span className="text-[11px] font-medium text-slate-600">Host is typing...</span>
              </div>
            )}
          </div>

          {/* Quick Chips */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth shrink-0 text-[11px]">
            {[
              'Is room available today?',
              'What is total deposit?',
              'Food included in rent?',
              'Can I visit tomorrow?',
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickChip(chip)}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 whitespace-nowrap cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => alert('Image upload simulation active')}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="Attach photo"
            >
              <Image className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => alert('Voice note recording simulation active')}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="Voice note"
            >
              <Mic className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type message to host..."
              className="flex-1 px-3.5 py-2 rounded-full bg-slate-100 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#a3e635]"
            />

            <button
              type="submit"
              disabled={!input.trim()}
              className={`p-2.5 rounded-full transition-all cursor-pointer ${
                input.trim()
                  ? 'bg-[#a3e635] text-slate-950 shadow-md active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
