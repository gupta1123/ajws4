// src/components/ui/splash-screen.tsx

'use client';

import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';

type Quote = { text: string; author: string };

const QUOTES: Quote[] = [
  { text: 'Education is the most powerful weapon which you can use to change the world.', author: 'Nelson Mandela' },
  { text: 'The beautiful thing about learning is that no one can take it away from you.', author: 'B.B. King' },
  { text: 'It is the supreme art of the teacher to awaken joy in creative expression and knowledge.', author: 'Albert Einstein' },
  { text: 'Tell me and I forget. Teach me and I remember. Involve me and I learn.', author: 'Benjamin Franklin' },
  { text: 'Education is not the filling of a pail, but the lighting of a fire.', author: 'William Butler Yeats' },
  { text: 'The mind is not a vessel to be filled but a fire to be kindled.', author: 'Plutarch' },
  { text: 'What we learn with pleasure we never forget.', author: 'Alfred Mercier' },
  { text: 'Teaching kids to count is fine, but teaching them what counts is best.', author: 'Bob Talbert' },
  { text: 'A good teacher can inspire hope, ignite the imagination, and instill a love of learning.', author: 'Brad Henry' },
  { text: 'Learning never exhausts the mind.', author: 'Leonardo da Vinci' },
  { text: 'The purpose of education is to replace an empty mind with an open one.', author: 'Malcolm Forbes' },
  { text: 'The expert in anything was once a beginner.', author: 'Helen Hayes' },
  { text: 'Children must be taught how to think, not what to think.', author: 'Margaret Mead' },
  { text: 'The whole world opens when you learn to read.', author: 'Barack Obama' },
  { text: 'Develop a passion for learning. If you do, you will never cease to grow.', author: 'Anthony J. D’Angelo' },
];

export function SplashScreen({ hint }: { hint?: string }) {
  const quote = useMemo(() => {
    if (hint) return { text: hint, author: '' } as Quote;
    const idx = Math.floor(Math.random() * QUOTES.length);
    return QUOTES[idx];
  }, [hint]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="mx-auto text-center mb-6">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
          <h2 className="text-lg font-semibold">Signing you in...</h2>
        </div>

        <div className="relative rounded-2xl border bg-gradient-to-br from-primary/5 to-muted p-6 sm:p-8">
          <div className="absolute -top-3 -left-3 text-5xl opacity-10 select-none">“</div>
          <blockquote className="text-xl sm:text-2xl leading-relaxed italic">
            {quote.text}
          </blockquote>
          {quote.author && (
            <figcaption className="mt-3 text-sm text-muted-foreground">— {quote.author}</figcaption>
          )}
        </div>

        <p className="mt-6 text-xs text-muted-foreground text-center">
          Preparing your classes, messages, and timetable...
        </p>
      </div>
    </div>
  );
}
