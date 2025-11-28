import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, Clock, Coffee, Trophy } from "lucide-react";
import { showSuccess } from "@/utils/toast";

type TimerMode = 'work' | 'shortBreak' | 'longBreak';

const TIMER_DURATIONS = {
  work: 25 * 60, // 25 minutes
  shortBreak: 5 * 60, // 5 minutes
  longBreak: 15 * 60, // 15 minutes
};

const SESSIONS_BEFORE_LONG_BREAK = 4;

interface PomodoroTimerProps {
  onStateChange?: (isRunning: boolean, timeLeft: number, mode: TimerMode) => void;
}

export function PomodoroTimer({ onStateChange }: PomodoroTimerProps = {}) {
  // Load initial state from localStorage
  const [mode, setMode] = useState<TimerMode>(() => {
    const saved = localStorage.getItem('pomodoroMode');
    return (saved as TimerMode) || 'work';
  });
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem('pomodoroTimeLeft');
    return saved ? parseInt(saved) : TIMER_DURATIONS.work;
  });
  const [isRunning, setIsRunning] = useState(() => {
    const saved = localStorage.getItem('pomodoroIsRunning');
    return saved === 'true';
  });
  const [sessionsCompleted, setSessionsCompleted] = useState(() => {
    const saved = localStorage.getItem('pomodoroSessionsCompleted');
    return saved ? parseInt(saved) : 0;
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pomodoroMode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('pomodoroTimeLeft', timeLeft.toString());
  }, [timeLeft]);

  useEffect(() => {
    localStorage.setItem('pomodoroIsRunning', isRunning.toString());
  }, [isRunning]);

  useEffect(() => {
    localStorage.setItem('pomodoroSessionsCompleted', sessionsCompleted.toString());
  }, [sessionsCompleted]);

  // Function to play notification sound using Web Audio API
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Create a pleasant notification sound (two beeps)
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);

      // Second beep
      setTimeout(() => {
        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();

        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);

        oscillator2.frequency.value = 1000;
        oscillator2.type = 'sine';

        gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

        oscillator2.start(audioContext.currentTime);
        oscillator2.stop(audioContext.currentTime + 0.2);
      }, 250);
    } catch (e) {
      console.error('Audio play failed:', e);
    }
  };

  // Notify parent component of state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange(isRunning, timeLeft, mode);
    }
  }, [isRunning, timeLeft, mode, onStateChange]);

  const handleTimerComplete = useCallback(() => {
    setIsRunning(false);

    // Play notification sound
    playNotificationSound();

    if (mode === 'work') {
      const newSessionCount = sessionsCompleted + 1;
      setSessionsCompleted(newSessionCount);

      // Determine next break type
      if (newSessionCount % SESSIONS_BEFORE_LONG_BREAK === 0) {
        setMode('longBreak');
        setTimeLeft(TIMER_DURATIONS.longBreak);
        showSuccess(`Session terminée ! Temps pour une longue pause (${TIMER_DURATIONS.longBreak / 60} min)`);
      } else {
        setMode('shortBreak');
        setTimeLeft(TIMER_DURATIONS.shortBreak);
        showSuccess(`Session terminée ! Temps pour une courte pause (${TIMER_DURATIONS.shortBreak / 60} min)`);
      }
    } else {
      // Break completed, back to work
      setMode('work');
      setTimeLeft(TIMER_DURATIONS.work);
      showSuccess('Pause terminée ! Prêt pour une nouvelle session ?');
    }
  }, [mode, sessionsCompleted]);

  // Manage timer interval
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, handleTimerComplete]);

  const handleStart = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(TIMER_DURATIONS[mode]);
  };

  const handleModeChange = (newMode: TimerMode) => {
    setMode(newMode);
    setTimeLeft(TIMER_DURATIONS[newMode]);
    setIsRunning(false);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((TIMER_DURATIONS[mode] - timeLeft) / TIMER_DURATIONS[mode]) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pomodoro Timer
          <Badge variant="outline" className="ml-auto">
            <Trophy className="h-3 w-3 mr-1" />
            {sessionsCompleted} session{sessionsCompleted !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode Selector */}
        <div className="flex gap-2">
          <Button
            variant={mode === 'work' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleModeChange('work')}
            className="flex-1"
            disabled={isRunning}
          >
            Travail
          </Button>
          <Button
            variant={mode === 'shortBreak' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleModeChange('shortBreak')}
            className="flex-1"
            disabled={isRunning}
          >
            <Coffee className="h-4 w-4 mr-1" />
            Courte
          </Button>
          <Button
            variant={mode === 'longBreak' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleModeChange('longBreak')}
            className="flex-1"
            disabled={isRunning}
          >
            <Coffee className="h-4 w-4 mr-1" />
            Longue
          </Button>
        </div>

        {/* Timer Display */}
        <div className="relative">
          <div className="text-6xl font-bold text-center py-8 tabular-nums">
            {formatTime(timeLeft)}
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          {!isRunning ? (
            <Button onClick={handleStart} className="flex-1" size="lg">
              <Play className="h-5 w-5 mr-2" />
              Démarrer
            </Button>
          ) : (
            <Button onClick={handlePause} variant="secondary" className="flex-1" size="lg">
              <Pause className="h-5 w-5 mr-2" />
              Pause
            </Button>
          )}
          <Button onClick={handleReset} variant="outline" size="lg">
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>

        {/* Session Info */}
        <div className="text-center text-sm text-muted-foreground">
          {mode === 'work' && (
            <p>Session {(sessionsCompleted % SESSIONS_BEFORE_LONG_BREAK) + 1} sur {SESSIONS_BEFORE_LONG_BREAK}</p>
          )}
          {mode === 'shortBreak' && <p>Pause courte - Profitez-en pour vous étirer</p>}
          {mode === 'longBreak' && <p>Pause longue - Temps de vraiment déconnecter</p>}
        </div>
      </CardContent>
    </Card>
  );
}
