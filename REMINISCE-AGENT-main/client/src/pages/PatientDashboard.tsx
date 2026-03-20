import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/ui/Layout";
import { useMemories, useRoutines, useToggleRoutine, useTriggerEmergency } from "@/hooks/use-resources";
import { Mic, Heart, Check, Play, AlertCircle, Volume2, X, ChevronLeft, ChevronRight, Image as ImageIcon, Clock, Pill, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export default function PatientDashboard() {
  const { data: memories } = useMemories();
  const { data: routines } = useRoutines();
  const toggleRoutine = useToggleRoutine();
  const triggerEmergency = useTriggerEmergency();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch current user and caretaker info
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/user"],
  });
  
  const { data: caretaker } = useQuery<User>({
    queryKey: ["/api/user/caretaker", currentUser?.caretakerId],
    enabled: !!currentUser?.caretakerId,
    queryFn: async () => {
      const res = await fetch(`/api/user/${currentUser?.caretakerId}`);
      if (!res.ok) throw new Error("Failed to fetch caretaker");
      return res.json();
    },
  });
  
  const [sosActive, setSosActive] = useState(false);
  const [showVoiceUI, setShowVoiceUI] = useState(false);
  const [showMemoryHub, setShowMemoryHub] = useState(false);
  const [currentMemoryIndex, setCurrentMemoryIndex] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [medicationAlert, setMedicationAlert] = useState<any>(null);
  const [timeDisplay, setTimeDisplay] = useState<{ type: 'time' | 'date', value: string } | null>(null);

  // States for voice recording and answer submission
  const [recordingForMemoryId, setRecordingForMemoryId] = useState<number | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

  // Get current question for each memory using currentQuestionIndex
  const getTodayQuestion = (memory: any) => {
    if (!memory.aiQuestions || memory.aiQuestions.length === 0) {
      return memory.aiQuestion || "Tell me about this memory";
    }
    // Use currentQuestionIndex from backend (rotates daily)
    const questionIndex = memory.currentQuestionIndex || 0;
    return memory.aiQuestions[questionIndex];
  };

  // Get today's answer if it exists
  const getTodayAnswer = (memory: any) => {
    if (!memory.answers || memory.answers.length === 0) return null;
    const today = new Date().toISOString().split('T')[0];
    const todayAnswer = memory.answers.find((a: any) => a.date === today);
    return todayAnswer?.answer || null;
  };

  // Voice recognition setup
  useEffect(() => {
    // Store memories count for voice commands
    (window as any).__memoriesCount = memories?.length || 0;
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const speechResult = event.results[0][0].transcript;
        setTranscript(speechResult);
        // Store the transcript to process after state updates
        setTimeout(() => {
          const command = speechResult.toLowerCase().trim();
          
          // Process the command
          if (command.includes('memor') || command.includes('photo') || command.includes('picture') || command.includes('show me')) {
            // Close voice UI and open memory hub
            setShowVoiceUI(false);
            setShowMemoryHub(true);
            const count = (window as any).__memoriesCount || 0;
            toast({
              title: "Opening Memory Hub",
              description: `You have ${count} ${count === 1 ? 'memory' : 'memories'}`,
            });
          } else if (command.includes('call') && (command.includes('caretaker') || command.includes('nurse') || command.includes('doctor'))) {
            // Call caretaker directly
            setShowVoiceUI(false);
            if (caretaker?.phoneNumber) {
              window.location.href = `tel:${caretaker.phoneNumber}`;
              toast({
                title: "📞 Calling Caretaker",
                description: `Calling ${caretaker.username}...`,
              });
            } else {
              toast({
                title: "Cannot Call",
                description: "Caretaker phone number not available",
                variant: "destructive",
              });
            }
          } else if (command.includes('help') || command.includes('sos') || command.includes('emergency')) {
            // Close voice UI and trigger emergency
            setShowVoiceUI(false);
            handleSOS();
          } else if (command.includes('task') || command.includes('routine') || command.includes('schedule') || command.includes('what do i need') || command.includes('to do')) {
            // Close voice assistant and scroll to tasks
            setShowVoiceUI(false);
            const section = document.querySelector('.routines-section');
            if (section) {
              section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            toast({
              title: "Your Daily Routines",
              description: "Showing your task list below",
            });
          } else if (command.includes('time')) {
            // Show big time display
            setShowVoiceUI(false);
            const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            setTimeDisplay({ type: 'time', value: time });
            setTimeout(() => setTimeDisplay(null), 5000);
          } else if (command.includes('date') || command.includes('day')) {
            // Show big date display
            setShowVoiceUI(false);
            const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            setTimeDisplay({ type: 'date', value: date });
            setTimeout(() => setTimeDisplay(null), 5000);
          } else if (command.includes('listen') || command.includes('play') || command.includes('question') || command.includes('read')) {
            // Keep voice assistant open
            toast({
              title: "Playing Question",
              description: "Playing the question from your latest memory",
            });
            // Trigger audio playback
            const event = new CustomEvent('playLatestQuestion');
            window.dispatchEvent(event);
          } else if (command.includes('close') || command.includes('cancel') || command.includes('stop') || command.includes('exit') || command.includes('dismiss')) {
            // Close voice UI
            setShowVoiceUI(false);
            toast({
              title: "Voice Assistant Closed",
              description: "You can reopen it anytime!",
            });
          } else if (command.includes('hello') || command.includes('hi') || command.includes('hey')) {
            // Keep voice assistant open
            toast({
              title: "Hello! 👋",
              description: "I'm here to help you. What would you like to do?",
            });
          } else {
            // Keep voice assistant open for unrecognized commands
            toast({
              title: "I heard you say:",
              description: `"${speechResult}"\n\nTry: "Show me my memories", "Call caretaker", "List my tasks", or "What time is it?"`,
            });
          }
        }, 100);
      };

      recognition.onerror = () => {
        setIsListening(false);
        toast({
          title: "Could not hear you",
          description: "Please try again",
          variant: "destructive",
        });
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      (window as any).voiceRecognition = recognition;
    }
    
    // Listen for play question event from voice commands
    const handlePlayQuestion = () => {
      if (memories && memories.length > 0) {
        const latestMemory = memories[0];
        const question = getTodayQuestion(latestMemory);
        handleListenToQuestion(question);
      }
    };
    
    window.addEventListener('playLatestQuestion', handlePlayQuestion);
    
    return () => {
      window.removeEventListener('playLatestQuestion', handlePlayQuestion);
      // Cleanup audio on unmount
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
      }
    };
  }, [memories, currentAudio]);

  // Check for upcoming medications every minute
  useEffect(() => {
    const checkMedications = () => {
      if (!routines) return;
      
      const now = new Date();
      const medications = routines.filter(r => r.type === 'medication' && !r.isCompleted && r.time);
      
      for (const med of medications) {
        const [hours, minutes] = med.time!.split(':').map(Number);
        const medTime = new Date();
        medTime.setHours(hours, minutes, 0, 0);
        
        const timeDiff = medTime.getTime() - now.getTime();
        const minutesUntil = Math.floor(timeDiff / 60000);
        
        // Show alert if medication is due within 15 minutes
        if (minutesUntil >= 0 && minutesUntil <= 15) {
          setMedicationAlert(med);
          break;
        }
      }
    };
    
    checkMedications();
    const interval = setInterval(checkMedications, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [routines]);

  const startVoiceRecognition = () => {
    const recognition = (window as any).voiceRecognition;
    if (recognition) {
      setIsListening(true);
      setTranscript("");
      recognition.start();
    } else {
      toast({
        title: "Voice not supported",
        description: "Your browser doesn't support voice recognition",
        variant: "destructive",
      });
    }
  };

  const stopVoiceRecognition = () => {
    const recognition = (window as any).voiceRecognition;
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const handleSOS = () => {
    triggerEmergency.mutate(undefined, {
      onSuccess: (data: any) => {
        setSosActive(true);
        
        // Show call options
        toast({
          title: "🚨 Emergency Alert!",
          description: (
            <div className="space-y-2">
              <p>Emergency log created. Choose who to call:</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => window.location.href = 'tel:112'}
                  className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md font-semibold text-sm hover:bg-red-700"
                >
                  📞 Call 112
                </button>
                {data.caretakerPhone && (
                  <button
                    onClick={() => window.location.href = `tel:${data.caretakerPhone}`}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md font-semibold text-sm hover:bg-blue-700"
                  >
                    📞 Call {data.caretakerName || 'Caretaker'}
                  </button>
                )}
              </div>
            </div>
          ),
          variant: "destructive",
          duration: 10000,
        });
        
        setTimeout(() => setSosActive(false), 10000); 
      }
    });
  };

  const startAnswerRecording = (memoryId: number) => {
    const recognition = (window as any).voiceRecognition;
    if (recognition) {
      setRecordingForMemoryId(memoryId);
      setAnswerText(""); // Clear previous answer
      
      // Store the original handler to restore later
      const originalOnResult = recognition.onresult;
      const originalOnError = recognition.onerror;
      
      recognition.onresult = (event: any) => {
        const speechResult = event.results[0][0].transcript;
        setAnswerText(speechResult);
        setRecordingForMemoryId(null);
        
        // Restore original handlers
        recognition.onresult = originalOnResult;
        recognition.onerror = originalOnError;
        
        toast({
          title: "Answer recorded",
          description: "You can edit your answer before submitting",
        });
      };
      
      recognition.onerror = () => {
        setRecordingForMemoryId(null);
        
        // Restore original handlers
        recognition.onresult = originalOnResult;
        recognition.onerror = originalOnError;
        
        toast({
          title: "Could not hear you",
          description: "Please try again",
          variant: "destructive",
        });
      };
      
      recognition.start();
      toast({
        title: "Listening...",
        description: "Speak your answer now",
      });
    } else {
      toast({
        title: "Voice not supported",
        description: "Your browser doesn't support voice recognition",
        variant: "destructive",
      });
    }
  };

  const submitAnswer = async (memoryId: number, answer: string) => {
    if (!answer || answer.trim().length === 0) {
      toast({
        title: "Answer required",
        description: "Please provide an answer",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingAnswer(true);
    try {
      const res = await fetch(`/api/memories/${memoryId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ answer: answer.trim() }),
      });

      if (!res.ok) throw new Error('Failed to save answer');

      toast({
        title: "Answer saved! 💚",
        description: "Your memory has been recorded",
      });
      setAnswerText("");
      // Refresh memories data without full page reload
      await queryClient.invalidateQueries({ queryKey: ["/api/memories"] });
    } catch (error) {
      console.error('Error saving answer:', error);
      toast({
        title: "Failed to save",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const handleListenToQuestion = async (text: string) => {
    if (isPlayingAudio && currentAudio) {
      currentAudio.pause();
      setIsPlayingAudio(false);
      setCurrentAudio(null);
      return;
    }

    setIsPlayingAudio(true);
    
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error('Failed to generate speech');

      const { audioUrl } = await response.json();
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsPlayingAudio(false);
        setCurrentAudio(null);
      };
      
      audio.onerror = () => {
        setIsPlayingAudio(false);
        setCurrentAudio(null);
        toast({
          title: "Playback Error",
          description: "Could not play audio",
          variant: "destructive",
        });
      };

      setCurrentAudio(audio);
      await audio.play();
      
    } catch (error) {
      setIsPlayingAudio(false);
      toast({
        title: "Audio Not Available",
        description: "Speech service is not configured",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout variant="patient" caretakerName={caretaker?.username}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12 patient-view">
        
        {/* LEFT COLUMN: Memory Hub Button */}
        <div className="space-y-6 md:space-y-8">
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="card-glass p-6 md:p-8 space-y-4 md:space-y-6"
          >
            <h2 className="flex items-center gap-3 md:gap-4 text-[#1C4D8D] font-black text-3xl md:text-5xl">
              <Heart className="w-10 h-10 md:w-16 md:h-16 fill-current" />
              Memory Hub
            </h2>
            
            <motion.button
              whileHover={{ scale: 1.03, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowMemoryHub(true)}
              className="w-full p-8 md:p-16 bg-gradient-to-br from-[#4988C4] via-[#1C4D8D] to-[#0F2854] hover:from-[#1C4D8D] hover:via-[#0F2854] hover:to-[#0A1B3D] rounded-2xl md:rounded-[32px] shadow-[0_20px_60px_rgba(28,77,141,0.4)] hover:shadow-[0_30px_80px_rgba(28,77,141,0.6)] transition-all duration-300 group border-4 border-white/10"
            >
              <div className="flex flex-col items-center gap-4 md:gap-8">
                <motion.div 
                  className="w-20 h-20 md:w-32 md:h-32 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-4 border-white/30 group-hover:border-white/50 transition-all shadow-lg"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  <ImageIcon className="w-10 h-10 md:w-16 md:h-16 text-white" strokeWidth={3} />
                </motion.div>
                <motion.span 
                  className="text-3xl md:text-5xl font-black text-white uppercase tracking-wider drop-shadow-lg"
                  whileHover={{ scale: 1.05 }}
                >
                  View Memories
                </motion.span>
                <motion.span 
                  className="text-lg md:text-2xl text-white/90 font-bold bg-white/10 px-6 py-2 rounded-full backdrop-blur-sm"
                  whileHover={{ scale: 1.05 }}
                >
                  {memories?.length || 0} Photos Available
                </motion.span>
              </div>
            </motion.button>
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="card-glass p-6 md:p-8 routines-section"
          >
            <h2 className="text-3xl md:text-5xl font-black text-[#1C4D8D] mb-6 md:mb-8 uppercase tracking-tight">Today's Routine</h2>
            <div className="space-y-4 md:space-y-6">
              {routines?.map((routine, index) => (
                <motion.button
                  key={routine.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleRoutine.mutate(routine.id)}
                  className={cn(
                    "w-full p-4 md:p-8 rounded-2xl md:rounded-[32px] border-4 md:border-8 text-left transition-all",
                    routine.isCompleted 
                      ? "bg-[#D5F4E6]/50 border-[#27AE60]/50 opacity-60" 
                      : "bg-[#E8F4F8] border-[#4988C4]/30 hover:border-[#1C4D8D] hover:bg-white hover:shadow-lg"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <span className={cn(
                        "text-2xl md:text-4xl font-black block",
                        routine.isCompleted ? "text-[#27AE60] line-through decoration-4 md:decoration-8" : "text-[#0F2854]"
                      )}>
                        {routine.task}
                      </span>
                      <div className="flex flex-wrap gap-2 mt-2 md:mt-3">
                        {routine.time && (
                          <span className="inline-flex items-center gap-1 text-sm md:text-lg text-[#1C4D8D] bg-white/60 px-3 py-1 rounded-full font-bold">
                            <Clock className="w-4 h-4 md:w-5 md:h-5" />
                            {routine.time}
                          </span>
                        )}
                        {routine.frequency && (
                          <span className="text-sm md:text-lg text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full font-bold uppercase tracking-wide">
                            {routine.frequency}
                          </span>
                        )}
                        {routine.type === 'medication' && routine.dosage && (
                          <span className="inline-flex items-center gap-1 text-sm md:text-lg text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full font-bold">
                            <Pill className="w-4 h-4 md:w-5 md:h-5" />
                            {routine.dosage}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={cn(
                      "w-12 h-12 md:w-16 md:h-16 rounded-full border-4 md:border-8 flex items-center justify-center transition-all flex-shrink-0 ml-4",
                      routine.isCompleted 
                        ? "bg-[#27AE60] border-[#27AE60] scale-110" 
                        : "border-[#5D6D7E] group-hover:border-[#1C4D8D]"
                    )}>
                      {routine.isCompleted && <Check className="w-6 h-6 md:w-10 md:h-10 text-white stroke-[5px]" />}
                    </div>
                  </div>
                </motion.button>
              ))}
              {routines?.length === 0 && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-2xl md:text-3xl text-[#5D6D7E] italic font-bold text-center py-8 md:py-10"
                >
                  All done for today! Good job!
                </motion.p>
              )}
            </div>
          </motion.section>
        </div>

        {/* RIGHT COLUMN: Action Center */}
        <div className="space-y-6 md:space-y-12 flex flex-col">
          
          {/* Voice Assistant */}
          <motion.button 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setShowVoiceUI(true);
              // Auto-start mic after a short delay
              setTimeout(() => {
                startVoiceRecognition();
              }, 300);
            }}
            className="patient-button-voice w-full p-8 md:p-12 shadow-2xl flex flex-col items-center gap-4 md:gap-8 group"
          >
            <motion.div 
              className="w-20 h-20 md:w-32 md:h-32 bg-white/20 rounded-full flex items-center justify-center"
              whileHover={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5 }}
            >
              <Mic className="w-10 h-10 md:w-16 md:h-16 text-white" strokeWidth={3} />
            </motion.div>
            <span className="text-3xl md:text-5xl font-black uppercase tracking-widest">Talk to Assistant</span>
          </motion.button>

          {/* SOS Button */}
          <div className="flex-1 min-h-[300px] md:min-h-[400px]">
            <AnimatePresence mode="wait">
              {sosActive ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="h-full w-full bg-[#E74C3C] rounded-3xl md:rounded-[48px] p-8 md:p-12 flex flex-col items-center justify-center text-center border-8 md:border-[12px] border-white shadow-[0_0_80px_rgba(231,76,60,0.6)]"
                >
                  <AlertCircle className="w-32 h-32 md:w-48 md:h-48 text-white mb-6 md:mb-8 animate-bounce" strokeWidth={3} />
                  <h2 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter leading-none mb-4 md:mb-6">
                    HELP IS<br/>COMING
                  </h2>
                  <p className="text-2xl md:text-3xl text-white font-black uppercase tracking-widest">Alert Sent!</p>
                </motion.div>
              ) : (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSOS}
                  disabled={triggerEmergency.isPending}
                  className="patient-button-sos h-full w-full rounded-3xl md:rounded-[48px] flex flex-col items-center justify-center gap-6 md:gap-10 shadow-[0_30px_60px_rgba(231,76,60,0.4)]"
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <AlertCircle className="w-32 h-32 md:w-48 md:h-48 lg:w-56 lg:h-56" strokeWidth={4} />
                  </motion.div>
                  <span className="text-[80px] md:text-[120px] font-black tracking-tighter leading-none">
                    SOS
                  </span>
                  <span className="text-2xl md:text-3xl font-black uppercase tracking-[0.5em] md:tracking-[1em] opacity-80">
                    HELP
                  </span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Voice UI Overlay with Actual Functionality */}
      <AnimatePresence>
        {showVoiceUI && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center p-4 md:p-8 backdrop-blur-xl overflow-y-auto"
          >
            {/* Cross Button */}
            <motion.button
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", damping: 15 }}
              onClick={() => {
                stopVoiceRecognition();
                setShowVoiceUI(false);
                setTranscript("");
              }}
              className="fixed top-6 right-6 md:top-8 md:right-8 w-14 h-14 md:w-16 md:h-16 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center shadow-2xl border-2 border-white/30 z-[60] backdrop-blur-sm"
            >
              <X className="w-7 h-7 md:w-8 md:h-8 text-white" strokeWidth={3} />
            </motion.button>

            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              transition={{ type: "spring", damping: 20 }}
              className="max-w-2xl w-full my-auto py-8"
            >
              <motion.div
                animate={isListening ? { scale: [1, 1.05, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
                className={cn(
                  "w-32 h-32 md:w-40 md:h-40 mx-auto rounded-full flex items-center justify-center mb-6 md:mb-8 shadow-[0_0_100px_rgba(59,130,246,0.5)] transition-all duration-500",
                  isListening 
                    ? "bg-gradient-to-tr from-red-500 to-pink-500" 
                    : "bg-gradient-to-tr from-blue-500 to-purple-500"
                )}
              >
                <Mic className="w-14 h-14 md:w-18 md:h-18 text-white" />
              </motion.div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 md:mb-6 text-center">
                {isListening ? "I'm listening..." : "Voice Assistant"}
              </h2>
              {transcript && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/10 px-6 md:px-8 py-3 md:py-4 rounded-2xl mb-4 md:mb-6"
                >
                  <p className="text-lg md:text-xl text-white text-center">"{transcript}"</p>
                </motion.div>
              )}
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 md:p-6 mb-6 md:mb-8">
                <p className="text-base md:text-lg text-blue-100 mb-3 text-center font-semibold">
                  Try saying:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 text-sm md:text-base">
                  <div className="bg-white/10 rounded-lg p-3 text-white text-center">
                    💭 "Show me my memories"
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-white text-center">
                    🆘 "Call caretaker"
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-white text-center">
                    📋 "List my tasks"
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-white text-center">
                    🕐 "What time is it?"
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-white text-center">
                    🔊 "Listen to the question"
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-white text-center">
                    🚨 "Help" or "Emergency"
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4 px-4">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
                  className={cn(
                    "w-full px-8 md:px-12 py-5 md:py-6 text-white text-xl md:text-2xl font-bold rounded-2xl transition-all shadow-lg",
                    isListening 
                      ? "bg-red-500 hover:bg-red-600 border-2 border-red-400 animate-pulse" 
                      : "bg-green-500 hover:bg-green-600 border-2 border-green-400"
                  )}
                >
                  {isListening ? "🎤 Listening..." : "🎤 Start Speaking"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Memory Hub Modal */}
      <AnimatePresence>
        {showMemoryHub && memories && memories.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-gradient-to-br from-black/95 via-black/97 to-black/95 z-50 flex items-center justify-center p-4 md:p-8 backdrop-blur-2xl overflow-y-auto"
            onClick={() => setShowMemoryHub(false)}
          >
            <motion.button
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", damping: 15 }}
              onClick={() => setShowMemoryHub(false)}
              className="fixed top-6 right-6 md:top-8 md:right-8 w-14 h-14 md:w-20 md:h-20 bg-red-500/90 hover:bg-red-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-white/20 z-[60] backdrop-blur-sm"
            >
              <X className="w-7 h-7 md:w-10 md:h-10 text-white" strokeWidth={3} />
            </motion.button>

            <div className="max-w-5xl w-full my-auto" onClick={(e) => e.stopPropagation()}>
              <motion.div 
                initial={{ scale: 0.8, y: 30, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.8, y: 30, opacity: 0 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                className="bg-gradient-to-br from-[#E8F4F8] via-white to-[#E8F4F8] rounded-3xl md:rounded-[48px] p-6 md:p-12 shadow-[0_30px_90px_rgba(0,0,0,0.5)] border-4 border-white/50"
              >
                {/* Image Display */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="aspect-video w-full rounded-2xl md:rounded-3xl overflow-hidden border-4 md:border-8 border-[#4988C4]/30 bg-black shadow-2xl mb-6 md:mb-8 hover:border-[#4988C4]/50 transition-all duration-300"
                >
                  <motion.img 
                    key={currentMemoryIndex}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.5 }}
                    src={memories[currentMemoryIndex].imageUrl} 
                    alt="Memory" 
                    className="w-full h-full object-contain"
                  />
                </motion.div>

                {/* Description */}
                <motion.div 
                  key={`desc-${currentMemoryIndex}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="bg-white/95 backdrop-blur-sm p-4 md:p-8 rounded-2xl md:rounded-3xl border-2 md:border-4 border-[#1C4D8D]/30 shadow-2xl mb-6 md:mb-8 hover:shadow-[0_20px_60px_rgba(28,77,141,0.2)] transition-shadow duration-300"
                >
                  {/* Today's Question */}
                  <div>
                    <p className="text-sm md:text-xl text-[#1C4D8D] font-black mb-2 md:mb-3 uppercase tracking-wider">Think about this:</p>
                    <div className="flex items-start gap-3 md:gap-6 mb-6">
                      <p className="text-lg md:text-2xl text-[#0F2854] italic font-medium leading-relaxed flex-1">
                        {getTodayQuestion(memories[currentMemoryIndex])}
                      </p>
                      <button
                        onClick={() => handleListenToQuestion(getTodayQuestion(memories[currentMemoryIndex]))}
                        className={cn(
                          "flex-shrink-0 w-14 h-14 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all shadow-lg hover:scale-110",
                          isPlayingAudio 
                            ? "bg-[#27AE60] hover:bg-[#229954] animate-pulse" 
                            : "bg-[#4988C4] hover:bg-[#1C4D8D]"
                        )}
                      >
                        <Volume2 className="w-7 h-7 md:w-10 md:h-10 text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Voice Recording & Answer Section */}
                  <div className="pt-4 md:pt-6 border-t-2 md:border-t-4 border-[#1C4D8D]/20">
                    <p className="text-sm md:text-lg text-[#1C4D8D] font-bold mb-3 uppercase tracking-wide">Your Answer:</p>
                    
                    {getTodayAnswer(memories[currentMemoryIndex]) ? (
                      <div className="bg-green-50 p-4 md:p-6 rounded-xl border-2 border-green-300">
                        <p className="text-sm text-green-700 font-semibold mb-2">✓ You've answered this today!</p>
                        <p className="text-base md:text-lg text-green-900 italic">
                          "{getTodayAnswer(memories[currentMemoryIndex])}"
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Microphone Button */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => startAnswerRecording(memories[currentMemoryIndex].id)}
                            disabled={recordingForMemoryId !== null || isSubmittingAnswer}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold text-lg transition-all shadow-lg",
                              recordingForMemoryId === memories[currentMemoryIndex].id
                                ? "bg-red-500 text-white animate-pulse cursor-not-allowed"
                                : "bg-gradient-to-r from-[#4988C4] to-[#1C4D8D] text-white hover:from-[#1C4D8D] hover:to-[#0F2854] hover:shadow-xl"
                            )}
                          >
                            <Mic className="w-6 h-6" />
                            {recordingForMemoryId === memories[currentMemoryIndex].id ? "Listening..." : "Record Answer"}
                          </button>
                        </div>

                        {/* Answer Textarea */}
                        <textarea
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          placeholder="Your answer will appear here... You can also type directly."
                          className="w-full px-4 py-3 border-2 border-[#4988C4]/30 rounded-xl focus:ring-4 focus:ring-[#4988C4]/20 focus:border-[#4988C4] outline-none text-base md:text-lg min-h-[120px] resize-none"
                        />

                        {/* Submit Button */}
                        <button
                          onClick={() => submitAnswer(memories[currentMemoryIndex].id, answerText)}
                          disabled={!answerText.trim() || isSubmittingAnswer}
                          className="w-full px-6 py-4 bg-gradient-to-r from-[#27AE60] to-[#229954] text-white font-black text-lg rounded-xl hover:from-[#229954] hover:to-[#1E8449] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                        >
                          {isSubmittingAnswer ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
                          ) : (
                            <><Check className="w-5 h-5" /> Submit Answer</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Navigation */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  className="flex items-center justify-between gap-2 md:gap-4"
                >
                  <motion.button
                    whileHover={currentMemoryIndex > 0 ? { scale: 1.05, x: -5 } : {}}
                    whileTap={currentMemoryIndex > 0 ? { scale: 0.95 } : {}}
                    onClick={() => setCurrentMemoryIndex(Math.max(0, currentMemoryIndex - 1))}
                    disabled={currentMemoryIndex === 0}
                    className={cn(
                      "px-4 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-base md:text-xl flex items-center gap-2 md:gap-3 transition-all shadow-lg",
                      currentMemoryIndex === 0 
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
                        : "bg-gradient-to-r from-[#4988C4] to-[#1C4D8D] text-white hover:from-[#1C4D8D] hover:to-[#0F2854] hover:shadow-xl"
                    )}
                  >
                    <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                    <span className="hidden sm:inline">Previous</span>
                  </motion.button>

                  <div className="text-lg md:text-2xl font-bold text-[#1C4D8D] px-2">
                    {currentMemoryIndex + 1} of {memories.length}
                  </div>

                  <motion.button
                    whileHover={currentMemoryIndex < memories.length - 1 ? { scale: 1.05, x: 5 } : {}}
                    whileTap={currentMemoryIndex < memories.length - 1 ? { scale: 0.95 } : {}}
                    onClick={() => setCurrentMemoryIndex(Math.min(memories.length - 1, currentMemoryIndex + 1))}
                    disabled={currentMemoryIndex === memories.length - 1}
                    className={cn(
                      "px-4 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-base md:text-xl flex items-center gap-2 md:gap-3 transition-all shadow-lg",
                      currentMemoryIndex === memories.length - 1 
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
                        : "bg-gradient-to-r from-[#1C4D8D] to-[#4988C4] text-white hover:from-[#0F2854] hover:to-[#1C4D8D] hover:shadow-xl"
                    )}
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                  </motion.button>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Medication Alert Modal */}
      <AnimatePresence>
        {medicationAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70"
            onClick={() => setMedicationAlert(null)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-2xl max-w-2xl w-full p-10 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <Pill className="w-24 h-24 mx-auto text-white mb-6 animate-bounce" />
              <h2 className="text-5xl font-black text-white mb-4 uppercase tracking-wide">
                Time for Medication!
              </h2>
              <p className="text-3xl font-bold text-white mb-6">
                {medicationAlert.task}
              </p>
              {medicationAlert.dosage && (
                <p className="text-2xl text-white/90 mb-6">
                  Dosage: {medicationAlert.dosage}
                </p>
              )}
              <div className="flex items-center justify-center gap-3 text-2xl text-white/90 mb-8">
                <Clock className="w-8 h-8" />
                {medicationAlert.time}
              </div>
              <button
                onClick={() => {
                  toggleRoutine.mutate(medicationAlert.id);
                  setMedicationAlert(null);
                }}
                className="w-full bg-white text-indigo-600 text-2xl font-black py-6 px-8 rounded-2xl hover:bg-indigo-50 transition-all shadow-lg"
              >
                ✓ Mark as Taken
              </button>
              <button
                onClick={() => setMedicationAlert(null)}
                className="mt-4 text-white/80 hover:text-white text-lg font-semibold"
              >
                Remind me later
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Time/Date Display Modal */}
      <AnimatePresence>
        {timeDisplay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
            onClick={() => setTimeDisplay(null)}
          >
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.5 }}
              className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-3xl shadow-2xl max-w-3xl w-full p-16 text-center"
            >
              <Clock className="w-32 h-32 mx-auto text-white mb-8" />
              <h2 className="text-5xl font-black text-white mb-6 uppercase tracking-wider">
                {timeDisplay.type === 'time' ? 'Current Time' : "Today's Date"}
              </h2>
              <p className="text-8xl font-black text-white">
                {timeDisplay.value}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
