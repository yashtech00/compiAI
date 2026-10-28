'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Sparkles, X, Send, Bot } from 'lucide-react';

interface AiMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AiTutorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId?: string;
  conceptName?: string;
}

export function AiTutorDrawer({ isOpen, onClose, lessonId, conceptName }: AiTutorDrawerProps) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && lessonId) {
      // Load previous conversation history
      apiClient(`/ai/conversations/${lessonId}`)
        .then((data) => {
          if (data?.messages && data.messages.length > 0) {
            setMessages(data.messages);
          } else {
            setMessages([
              {
                role: 'assistant',
                content: `Hello! I'm your Socratic learning companion for **${conceptName || 'this lesson'}**. What questions do you have about this concept?`
              }
            ]);
          }
        })
        .catch(() => {
          setMessages([
            {
              role: 'assistant',
              content: `Hello! I'm your Socratic learning companion for **${conceptName || 'this lesson'}**. What questions do you have about this concept?`
            }
          ]);
        });
    }
  }, [isOpen, lessonId, conceptName]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const data = await apiClient('/ai/tutor', {
        method: 'POST',
        body: JSON.stringify({
          lessonId,
          message: userMsg
        })
      });

      if (data?.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'I had trouble processing that request right now. Please try again.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">AI Socratic Tutor</h3>
            <p className="text-[11px] text-slate-400">{conceptName || 'Lesson Assistant'}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={idx}
              className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-6 h-6 rounded-md bg-indigo-600/30 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800/80 text-slate-200 border border-slate-700/60'
                }`}
              >
                {m.content}
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex gap-2.5 items-center text-slate-400 text-xs pl-8">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            <span>Tutor is reasoning...</span>
          </div>
        )}
      </div>

      {/* Input Field */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-950/60 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question or request a hint..."
          className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <Button size="sm" type="submit" disabled={!input.trim() || isLoading} className="px-3">
          <Send className="w-3.5 h-3.5" />
        </Button>
      </form>
    </div>
  );
}
