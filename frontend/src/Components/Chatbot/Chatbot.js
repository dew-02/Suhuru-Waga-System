import React, { useMemo, useRef, useState, useEffect } from 'react';
import './Chatbot.css';
import knowledgeBase from './knowledgeBase';

// Very small, offline retrieval: simple tokenization + cosine similarity
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function termFreq(tokens) {
  const tf = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  return tf;
}

function cosineSim(tf1, tf2) {
  let dot = 0;
  let mag1 = 0;
  let mag2 = 0;
  const keys = new Set([...tf1.keys(), ...tf2.keys()]);
  for (const k of keys) {
    const v1 = tf1.get(k) || 0;
    const v2 = tf2.get(k) || 0;
    dot += v1 * v2;
    mag1 += v1 * v1;
    mag2 += v2 * v2;
  }
  if (mag1 === 0 || mag2 === 0) return 0;
  return dot / (Math.sqrt(mag1) * Math.sqrt(mag2));
}

function useSmallRetriever(items) {
  // Precompute TF for KB items
  const kb = useMemo(() => {
    return items.map((it) => {
      const tokens = tokenize(`${it.q} ${it.a}`);
      const tf = termFreq(tokens);
      return { ...it, tf };
    });
  }, [items]);

  function search(query, minScore = 0.05) {
    const qtf = termFreq(tokenize(query));
    let best = null;
    for (const it of kb) {
      const s = cosineSim(qtf, it.tf);
      if (!best || s > best.score) best = { item: it, score: s };
    }
    if (!best || best.score < minScore) return null;
    return best.item;
  }

  return { search };
}

const SUGGESTIONS = [
  'How to register?',
  'How to login?',
  'How to create a crop plan?',
  'What is crop suggestion?',
  'How to contact support?'
];

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hi! I\'m your Suhuru Waga assistant. Ask me about registration, login, crop plans, resources, or type a question.' }
  ]);
  const { search } = useSmallRetriever(knowledgeBase);
  const endRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    // Robust scroll to bottom of messages container
    if (messagesContainerRef.current) {
      const el = messagesContainerRef.current;
      el.scrollTop = el.scrollHeight;
    }
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  function answerFor(query) {
    // Simple rule-based shortcuts first
    const q = query.toLowerCase().trim();

    if (q.includes('hello') || q.includes('hi')) {
      return 'Hello! How can I help you today?';
    }
    if (q.includes('register')) {
      return 'To register, go to the Register page and fill in your details. On this app it\'s at route /Register or /adduser for profile creation.';
    }
    if (q.includes('login')) {
      return 'Use the Login page at /Login with your email and password.';
    }
    if (q.includes('contact')) {
      return 'Use the Contact page at /contact, or check the footer for support details.';
    }

    // Fallback to small retrieval over knowledge base
    const hit = search(query);
    if (hit) return hit.a;

    return "Sorry, I couldn't find an answer. Try rephrasing or ask about registration, login, crop plans, resources, or reports.";
  }

  function onSend(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    const response = answerFor(text);
    // Append once: user then bot
    setMessages((m) => [...m, { role: 'user', text }, { role: 'bot', text: response }]);
    setInput('');
  }

  function onQuickAsk(q) {
    setMessages((m) => [...m, { role: 'user', text: q }, { role: 'bot', text: answerFor(q) }]);
  }

  return (
    <div className="chatbot-root">
      {!open && (
        <button className="chatbot-fab" onClick={() => setOpen(true)} aria-label="Open chat">
          💬
        </button>
      )}

      {open && (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            <div className="chatbot-title">Suhuru Waga Assistant</div>
            <button className="chatbot-close" onClick={() => setOpen(false)} aria-label="Close chat">×</button>
          </div>

          <div className="chatbot-body">
            <div className="chatbot-messages" ref={messagesContainerRef}>
              {messages.map((m, i) => (
                <div key={i} className={m.role === 'bot' ? 'msg bot' : 'msg user'}>
                  {m.text}
                </div>
              ))}
              <div ref={endRef} />
            </div>

            <div className="chatbot-suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chip" onClick={() => onQuickAsk(s)}>{s}</button>
              ))}
            </div>
          </div>

          <form className="chatbot-input" onSubmit={onSend}>
            <input
              type="text"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit">Send</button>
          </form>
        </div>
      )}
    </div>
  );
}