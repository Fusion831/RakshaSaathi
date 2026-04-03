import { useState } from 'react';
import { Play, Square } from 'lucide-react';

interface DemoButtonProps {
  onStartDemo?: () => void;
  onStopDemo?: () => void;
}

export function DemoButton({ onStartDemo, onStopDemo }: DemoButtonProps) {
  const [isRunning, setIsRunning] = useState(false);

  const handleToggle = async () => {
    if (isRunning) {
      setIsRunning(false);
      onStopDemo?.();
    } else {
      setIsRunning(true);
      onStartDemo?.();
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
        isRunning
          ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg'
          : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md'
      }`}
    >
      {isRunning ? (
        <>
          <Square size={18} fill="currentColor" />
          Stop Demo
        </>
      ) : (
        <>
          <Play size={18} fill="currentColor" />
          Start Live Demo
        </>
      )}
    </button>
  );
}
