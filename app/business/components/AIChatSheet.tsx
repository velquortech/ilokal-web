'use client';

import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Send, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function AIChatSheet() {
  const { isAIChatOpen } = useAIContext();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        "Hello! I'm your AI assistant. I can help you analyze your business data, provide insights, and answer questions about your operations. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response (replace with actual AI integration)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          'This is a demo response. In a real implementation, this would connect to an AI service to provide insights based on your business data.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn('w-0 transition-all', isAIChatOpen && 'w-lg p-2')}>
      <Card className="m-0 flex h-full flex-col p-0 sm:max-w-sm">
        <div className="border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Bot className="size-5" />
            AI Assistant
          </div>
        </div>

        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-full">
                    <Bot className="text-primary size-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="mt-1 text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="bg-primary flex size-8 shrink-0 items-center justify-center rounded-full">
                    <User className="text-primary-foreground size-4" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-full">
                  <Bot className="text-primary size-4" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <div className="flex gap-1">
                    <div className="bg-foreground/50 size-2 animate-bounce rounded-full" />
                    <div className="bg-foreground/50 size-2 animate-bounce rounded-full [animation-delay:0.1s]" />
                    <div className="bg-foreground/50 size-2 animate-bounce rounded-full [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your business data..."
              className="max-h-30 min-h-15 resize-none"
              rows={2}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-15 w-15 shrink-0"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

type AIContextProps = {
  isAIChatOpen: boolean;
  setIsAIChatOpen: Dispatch<SetStateAction<boolean>>;
};

export const aiChatContext = createContext<AIContextProps>({
  isAIChatOpen: false,
  setIsAIChatOpen: () => {},
});

export function AIChatProvider(props: PropsWithChildren) {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  useEffect(() => {
    if (isAIChatOpen) {
      document.body.classList.add('ai-chat-sheet-open');
    } else {
      document.body.classList.remove('ai-chat-sheet-open');
    }
  }, [isAIChatOpen]);

  return (
    <aiChatContext.Provider value={{ isAIChatOpen, setIsAIChatOpen }}>
      {props.children}
    </aiChatContext.Provider>
  );
}

export function useAIContext() {
  return useContext(aiChatContext);
}
