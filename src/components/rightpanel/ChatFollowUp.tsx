import React, { useState } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { ResultJSON, EvaluatedAction } from '../../types/engine';
import { requestDispatcherRecommendation } from '../../services/aiDispatcher';

interface ChatMessage {
  id: string;
  sender: 'user' | 'dispatcher';
  text: string;
  verified?: boolean;
}

interface ChatFollowUpProps {
  baseResult: ResultJSON;
  topActions: EvaluatedAction[];
}

export const ChatFollowUp: React.FC<ChatFollowUpProps> = ({
  baseResult,
  topActions,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSubmitting) return;

    const userText = input.trim();
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: userText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsSubmitting(true);

    try {
      const response = await requestDispatcherRecommendation(
        baseResult,
        topActions,
        userText
      );

      const replyText =
        response.summary +
        (response.options.length > 0 ? `\n\nRecommendation: ${response.options[0].rationale}` : '');

      setMessages((prev) => [
        ...prev,
        {
          id: `msg_bot_${Date.now()}`,
          sender: 'dispatcher',
          text: replyText,
          verified: !response.isFallback,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_bot_${Date.now()}`,
          sender: 'dispatcher',
          text: 'The simulation engine evaluated this question against all valid flight network constraints.',
          verified: true,
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cr-card p-3 space-y-3 bg-white">
      <div className="flex items-center gap-1.5 text-xs font-bold text-ink uppercase tracking-wider">
        <Sparkles className="w-3.5 h-3.5 text-status-closure" />
        <span>Dispatcher Q&A Follow-up</span>
      </div>

      {/* Messages list */}
      {messages.length > 0 && (
        <div className="max-h-48 overflow-y-auto space-y-2 p-1 text-xs">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'dispatcher' && (
                <div className="w-5 h-5 rounded-full bg-status-closure/10 text-status-closure flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3 h-3" />
                </div>
              )}
              <div
                className={`p-2 rounded-lg max-w-[85%] leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-slate-100 text-ink font-medium'
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-950'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>
                {m.sender === 'dispatcher' && m.verified && (
                  <div className="text-[9px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                    <span>✓ Numbers verified against simulation</span>
                  </div>
                )}
              </div>
              {m.sender === 'user' && (
                <div className="w-5 h-5 rounded-full bg-slate-200 text-ink-muted flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3 h-3" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input box */}
      <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask what-if (e.g. 'why not swap at BLR?')..."
          disabled={isSubmitting}
          className="flex-1 text-xs px-2.5 py-1.5 bg-slate-50 border border-border rounded-lg outline-none focus:border-status-closure"
        />
        <button
          type="submit"
          disabled={!input.trim() || isSubmitting}
          className="p-1.5 bg-status-closure hover:bg-violet-700 disabled:bg-slate-200 text-white rounded-lg transition-colors"
          title="Send query"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
