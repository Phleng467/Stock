import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'bot', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, history: messages })
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setMessages(prev => [...prev, { role: 'bot', text: data.reply }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'bot', text: 'ขออภัย เกิดข้อผิดพลาดในการเชื่อมต่อระบบ กรุณาลองใหม่อีกครั้งค่ะ' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition-all z-40 ${isOpen ? 'scale-0' : 'scale-100'} cursor-pointer`}
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      <div className={`fixed bottom-6 right-6 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right z-50 border border-gray-200 ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`} style={{ height: '500px', maxHeight: '80vh' }}>
        {/* Header */}
        <div className="bg-red-600 p-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            <h3 className="font-bold text-sm">Jaymart Assistant</h3>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 text-xs mt-4">
              <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>สวัสดีค่ะ มีอะไรให้ Jaymart ช่วยเหลือไหมคะ?</p>
              <p className="mt-1 opacity-70">(สามารถสอบถามข้อมูลสินค้าและราคาได้ค่ะ)</p>
            </div>
          )}
          
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-gray-200' : 'bg-red-100 text-red-600'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-gray-500" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`p-2.5 rounded-xl text-xs sm:text-sm shadow-sm ${msg.role === 'user' ? 'bg-gray-900 text-white rounded-tr-sm' : 'bg-white border border-gray-200 rounded-tl-sm text-gray-800'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2 self-start max-w-[85%]">
              <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3 bg-white border border-gray-200 rounded-xl rounded-tl-sm shadow-sm flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 bg-white border-t border-gray-200 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="พิมพ์ข้อความที่นี่..."
            className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-200 rounded-full px-4 py-2 text-sm outline-none transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 disabled:opacity-50 disabled:bg-gray-400 cursor-pointer shrink-0 transition-colors"
          >
            <Send className="w-4 h-4 -ml-0.5" />
          </button>
        </div>
      </div>
    </>
  );
}
