import { useState, useEffect, useRef } from "react";
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

export function PomodoroTimer() {
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATIONS.work);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element for notification
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvPaizMHGGS56+mgUBELTqXj8bllHgU2jdXtyHAmBSl+zPLaizsIE12y6OqqWBQLSKHh8rxrIQUsgs/z2ow0BxdnuertolIRC0ul4/K5Zx4FNo3V7chxJwUpf8zy24s7CBRdsujqqVgTCkig4fK8ayCFLILP8tqMNAcXZ7nq7aJSEQtLpePxuGYeBS+Mz+3McyYEKH3L8tmKOwgUXLLn6qdZFApHnuDyvGscBSyCzvLbjDMHF2e56+yiUhELSqXj8rhnHgU2jdXtyHEmBCh+y/LZijsJE1yx6OqoWRMKR57g8rxrHAUsgs7y24wzBxdnuevoIlIQC0ql4/K4Zh4FNo3V7chxJgQofszy2Yo7CBNcsefqp1oUCkee4PK8ahwELIHO8tqLNAcXZ7nr7KJSEQtKpePyuWYeBTaN1e3IcSYEKH7M8tmJOwgTXLLo6qlaFApHnuDxvGobBSuBzvPaizQHF2e56+uiURILSqTi8bllHgY2jdXtyHEmBCl+y/LZijsIE1yx5+qnWhQLR57g8bxqHAYrgs7y2oozCBdouevrolQRDEqk4/G4Zh4FNo3V7chxJgQpfsvy2Yo7CBNbsefqp1oUC0ee4PG8ahsGK4HO8tqLMwgXaLnr66JVEQxKpOPyuGUeBTaN1e3IcScEKX/L8tiKOwkSXLLn6qhbFQtHnt/xvGocByyBzvLajDMIF2e56+qiVBEMSqTj8rhlHgU2jdXuyHEnBCl/y/LYijsJElyx6OqoWxULR53f8bxrHAYsgc/y2owzCBdnuevqolQRDEqk4/K5ZR4FNo3V7shwJwQpf8vy2Is7CBJcsujqqFsVC0ed3/G8ahwGLIHO8tqMNAgWZ7nr6qJUEQxKpOPyuWUeBjaN1e7IcCcFKX/M8tiLOwgSXLHo6qhbFQtHnt/xvGodBiyBzvPajTMIF2a56+qiVBEMSqTj8rllHgU2jdXtyHAnBCl/y/LYijwIElyx6OqoWxUKR53f8bxqHQYsgc7z2owyBxdmuevsIVQRC0qk4/K5ZR4FNo3V7shwJwUpf8vy2Io7CBJcsejqqFsVC0ed3/G8ah0GLIDO89qMMggWZrnr66JUERALO6Tj8rllHgU2jdXuyHEnBCl/y/LYijsIElyx6OqoWxYKR53g8bxqHQYsgc7y2owyBxZmuevsI1QRC0qk4/G5ZR4FNo3V7shyJgUpfsvy2Ys7CBJcsejpqFsVCked4PG8ah0GLILO8tqLNAgWZrnr7KNUEQtKpOPxuWYeBTaN1e7HcScEKH7L8tmLPAgSW7Lo6alZFQpHneDxvGobBSyBzvLaizQIF2a56+yhVREMSqPi8bhlHgU2jdXux3ElBCh+zPLZjDwIEluw6OmpWBYJR5zg8bxrGwcsgs7y2oo0CBZmuevsI1QRC0qk4/K4Zh4FNo3V7sdxJwQofszx2Io8CBJbsOjqqVkVCked4PG7axsGLILO8tqKNAgWZrnr6yNVEQtKpOPxuGYeBTaN1e7HcScFKH7M8tmLOwgSXLHo6qlZFQpHneDxu2odBSyBzvLaijMIF2a56+uiVREMSqPj8bhlHgU2jdXuyHEnBCh+zPLZijsIElyx6OqpWRUKR57g8btrGwYrgs7y2oozCBdnuevoI1USCkqk4/G4Zh4FNo3V7shxJwQofczy2Yo7CBNcsefqqVgVCkee4PG8ahwGK4LO8tqLMwgXZ7nr66JUEgtKpOPxuGYeBTWN1e7IcSYFKH7M8tmKOwgTXLHo6qhZFQpHnuDxvGscBSuCzvLaizQHF2e56+uiUxILSqPj8rhmHQU1jtXuyHEmBSh+y/LZijsJE1ux6OqoWhUKR57g8bxrHAUrgs7y2owzCBdnuevrolMRC0qk4/K4ZR4FNY7V7shwJwUpfsvy2Ik7CBNcsejqqFsVC0ee3/G8ahwFLILO8tqMNAgXZ7nr66NUEgtKpOPyuGQeBjWN1e7IcCcFKX/L8tiKOwgTXLHo6qhaFQtHnt/xvGobBSyCzvLajDQIF2e56+ujVBEMSqTj8rhlHgU2jdXuyHEnBSl/y/LZijsIElyx6OqoWxUKR57g8bxqHAUsgs7y2owzCBdnuevrIlQRC0qk4/K4ZR4FNo3V7shxJgUpf8vy2Yk7CBNcsejqqFsVC0ed4PG8ahwFLILO8tqMMwgXZ7nr6yJUEQtKpOPyuGQeBTWO1e7IcCYEKX/L8tmKOwgSXLLo6qhbFQpHnuDxvGobBSyCzvLajDMIF2e56+siVBELSqTj8rhlHgU1jtXuyHEnBCl/y/LZizsIElyx6OqoWxUKR57f8bxqHAYrgs7y2owzCBdnuevoIlQRC0qk4/K4ZR4FNY7V7shxJwQpf8vy2Yo7CBJcsejpqFsVCkee3/G8ahwGK4LO8tqMMwgXZ7nr6yJUEQtKpOPyuGQeBTWO1e7IcSYEKX/L8tmKOwgSXLLo6qhbFQpHnt/xvGobBiyyzvLajDMIF2e56+siVBEMSqPi8rhlHgU1jtXuxnInBCl/y/LZijwIElyx6OmpmBUKR57g8bxrGwcrgs7y2oozCBdnuevoI1QRC0qk4/G4ZR4FNY7V7shxJgUpf8vy2Yo7CBJcsejqqFsVCked3/G8ahwGK4LO8tqMMwgXZ7nr6iNUEQtKpOPyuGQeBTWO1e7IcSYEKX/L8tmKOwgSXLHo6qlZFQpHnuDxvGobBSyBzvLaizMIF2a56+sjVRELSqPj8bhlHgU1jtXuyHAnBSh+y/HYijsJElux6OqpWhYKRp3f8bxqGwYrgs7y2oozCBdnuevrolQRC0qk4/K4ZR4FNY7V7sdxJwUpfsvy2Yo8CBJbsejqqVkVCkee3/G8ahsGK4LO8tqKNAgXZ7nr6qJUEQtKpOPxuGYeBTaN1e7IcSYEKH7M8tmLOwgSW7Do6qlZFQpHnt/xu2obBiuBzvPaizMIF2e56+qiVBILSqTj8bhlHgU2jdXuyHEmBSh+y/LZizsIElyx6OmpWhUKR57f8btqHAYsgc7z2oo0BxdnuevqolQSC0qk4/K4ZR4FNY7V7shxJgUofsvy2Yo7CBNbsejpqVoUC0ed3/G7ahwGLIHO89qKMwgXZ7nr66JTEQtKpOPyuGQeBjSN1e/IcCYEKH/L8tmKOwgTW7Ho6ahbFApHnuDxu2obBSyBzvPaizMIF2e56+qiUxELSqTj8rhlHgU1jtXuyHEnBCh+y/LZijwIE1ux6OmoWxQKR57g8btrGwYrgs7y2oszCBdnuevqolQRCkqk4/K4ZR4FNY7V7shxJgQofszy2Yo7CBNbsejpqFsUCked4PG7axwGLIHO89qKMwgXZ7nr6qJUEQpKpePyuGYeBTaN1e3IcSYEKH7M8dmLOwgSW7Ho6ahbFApHnuDxu2scBiuBzvPaizMIF2e56+qjVRELSqTj8bhlHgU1jtXuyHEnBCh+zPHYijwIElyx6OmpWRUKR57g8btrGwYrgs7y2oo0CBZnuevrolURDEqj4/K4ZR4FNY7V7shxJgUofsvy2Ys7CBJcsejpqVkVCked4PG8ahsGK4LO8tqKNAgWZ7nr66JVEQtKo+PyuWQeBTWO1e7IcSYFJ37M8tmLOwgSXLDo6ahZFQpHneDxvGocBSuCzvLajDQIF2a56+ujVRELSqPj8rllHgU2jdXuyHEnBCh+zPLYijsIE1uw6OmoWhYKR53f8bxqHAYrgs7y2ow0Bhdn');
  }, []);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft]);

  const handleTimerComplete = () => {
    setIsRunning(false);

    // Play notification sound
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.error('Audio play failed:', e));
    }

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
  };

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
