import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { Loader2, ArrowRight, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

// Theme colors from HTML templates
const colors = {
  primary: "#0F2854",
  secondary: "#1C4D8D",
  accent: "#4988C4",
  background: "#BDE8F5",
  light: "#E8F4F8",
  white: "#FFFFFF",
  success: "#27AE60",
  danger: "#E74C3C",
};

type AuthFormData = {
  username: string;
  password: string;
  role?: "caretaker" | "patient";
  caretakerUsername?: string;
  phoneNumber?: string; // Caretaker phone number
};

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { login, register: registerUser } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [caretakerUsername, setCaretakerUsername] = useState("");

  const { register, handleSubmit, watch, formState: { errors } } = useForm<AuthFormData>({
    defaultValues: {
      username: "",
      password: "",
      role: "caretaker",
      caretakerUsername: "",
    },
  });

  const role = watch("role");

  const onSubmit = async (data: AuthFormData) => {
    try {
      if (isLogin) {
        await login.mutateAsync({ 
          username: data.username.trim(), 
          password: data.password 
        });
        toast({
          title: "Welcome back!",
          description: "You've successfully logged in.",
        });
      } else {
        // Validation
        if (!data.username || data.username.trim().length < 3) {
          toast({
            title: "Validation Error",
            description: "Username must be at least 3 characters",
            variant: "destructive",
          });
          return;
        }

        if (!data.password || data.password.length < 6) {
          toast({
            title: "Validation Error",
            description: "Password must be at least 6 characters",
            variant: "destructive",
          });
          return;
        }

        // Client-side validation for patient caretaker username
        if (data.role === "patient") {
          if (!caretakerUsername || caretakerUsername.trim() === "") {
            toast({
              title: "Validation Error",
              description: "Caretaker username is required for patients",
              variant: "destructive",
            });
            return;
          }
        }

        // Client-side validation for caretaker phone number
        if (data.role === "caretaker") {
          if (!data.phoneNumber || data.phoneNumber.trim() === "") {
            toast({
              title: "Validation Error",
              description: "Mobile number is required for caretakers",
              variant: "destructive",
            });
            return;
          }
        }

        const registerData: any = { 
          username: data.username.trim(), 
          password: data.password, 
          role: data.role || "caretaker",
        };
        
        // Always send caretakerUsername if role is patient
        if (data.role === "patient") {
          registerData.caretakerUsername = caretakerUsername.trim();
        }

        // Always send phoneNumber if role is caretaker
        if (data.role === "caretaker") {
          registerData.phoneNumber = data.phoneNumber.trim();
        }

        await registerUser.mutateAsync(registerData);
        toast({
          title: "Account created!",
          description: "Welcome to Reminisce AI.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || (isLogin ? "Invalid credentials" : "Registration failed"),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row" style={{ background: `linear-gradient(180deg, ${colors.background} 0%, ${colors.light} 100%)` }}>
      {/* Floating orbs for visual effect */}
      <div 
        className="fixed rounded-full opacity-30 pointer-events-none blur-3xl"
        style={{
          width: "400px",
          height: "400px",
          background: `linear-gradient(135deg, ${colors.accent}, ${colors.secondary})`,
          top: "-10%",
          right: "-10%",
          animation: "float 25s ease-in-out infinite",
        }}
      />
      <div 
        className="fixed rounded-full opacity-30 pointer-events-none blur-3xl"
        style={{
          width: "300px",
          height: "300px",
          background: `linear-gradient(135deg, ${colors.background}, ${colors.accent})`,
          bottom: "-5%",
          left: "-5%",
          animation: "float 20s ease-in-out infinite reverse",
        }}
      />

      {/* Left Panel - Branding */}
      <div 
        className="hidden lg:flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-8 lg:p-12 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 50%, ${colors.accent} 100%)` }}
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        
        <div className="relative z-10 max-w-lg text-white space-y-8">
          <div 
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(255, 255, 255, 0.2)", backdropFilter: "blur(10px)" }}
          >
            <span className="text-5xl font-bold">R</span>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl font-bold leading-tight">
              Welcome to<br />Reminisce AI
            </h1>
            <p className="text-lg text-white/90 leading-relaxed">
              Empowering care through AI-powered memory support and comprehensive health management.
            </p>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1" style={{ background: "rgba(255, 255, 255, 0.2)" }}>
                <span className="text-sm">✓</span>
              </div>
              <p className="text-white/90">AI-powered memory enhancement therapy</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1" style={{ background: "rgba(255, 255, 255, 0.2)" }}>
                <span className="text-sm">✓</span>
              </div>
              <p className="text-white/90">Smart medication & routine management</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1" style={{ background: "rgba(255, 255, 255, 0.2)" }}>
                <span className="text-sm">✓</span>
              </div>
              <p className="text-white/90">24/7 emergency assistance & monitoring</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Logo for mobile */}
          <div className="lg:hidden mb-8 text-center">
            <div 
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${colors.secondary}, ${colors.accent})` }}
            >
              <span className="text-3xl font-bold text-white">R</span>
            </div>
            <h2 className="text-2xl font-bold" style={{ color: colors.primary }}>Reminisce AI</h2>
          </div>

          {/* Auth Card */}
          <div 
            className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl border"
            style={{ 
              background: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(20px)",
              borderColor: "rgba(255, 255, 255, 0.6)",
            }}
          >
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: colors.primary }}>
                {isLogin ? "Welcome back" : "Create an account"}
              </h2>
              <p style={{ color: `${colors.primary}99` }}>
                {isLogin ? "Log in to access your dashboard" : "Join us to start managing care effectively"}
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
              {/* Username */}
              <div className="space-y-2">
                <label className="text-sm font-semibold" style={{ color: colors.primary }}>Username</label>
                <input
                  {...register("username")}
                  className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-all"
                  style={{
                    borderColor: colors.light,
                    color: colors.primary,
                  }}
                  onFocus={(e) => e.target.style.borderColor = colors.accent}
                  onBlur={(e) => e.target.style.borderColor = colors.light}
                  placeholder="Enter your username"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm font-semibold" style={{ color: colors.primary }}>Password</label>
                <input
                  type="password"
                  {...register("password")}
                  className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-all"
                  style={{
                    borderColor: colors.light,
                    color: colors.primary,
                  }}
                  onFocus={(e) => e.target.style.borderColor = colors.accent}
                  onBlur={(e) => e.target.style.borderColor = colors.light}
                  placeholder="Enter your password"
                />
              </div>

              {/* Role Selection for Signup */}
              <AnimatePresence>
                {!isLogin && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 pt-2">
                      <label className="text-sm font-semibold" style={{ color: colors.primary }}>I am a...</label>
                      <div className="grid grid-cols-2 gap-4">
                        <label className="cursor-pointer">
                          <input
                            type="radio"
                            value="caretaker"
                            {...register("role")}
                            className="sr-only"
                          />
                          <div 
                            className={`p-4 rounded-xl border-2 hover:shadow-md transition-all text-center ${
                              role === 'caretaker' 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-slate-200 bg-white'
                            }`}
                          >
                            <User className={`w-6 h-6 mx-auto mb-2 ${role === 'caretaker' ? 'text-blue-600' : 'text-blue-400'}`} />
                            <span className="font-semibold block" style={{ color: colors.primary }}>Caretaker</span>
                          </div>
                        </label>
                        <label className="cursor-pointer">
                          <input
                            type="radio"
                            value="patient"
                            {...register("role")}
                            className="sr-only"
                          />
                          <div 
                            className={`p-4 rounded-xl border-2 hover:shadow-md transition-all text-center ${
                              role === 'patient' 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-slate-200 bg-white'
                            }`}
                          >
                            <User className={`w-6 h-6 mx-auto mb-2 ${role === 'patient' ? 'text-blue-600' : 'text-blue-400'}`} />
                            <span className="font-semibold block" style={{ color: colors.primary }}>Patient</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Phone Number Field for Caretaker */}
                    <AnimatePresence>
                      {role === "caretaker" && (
                        <motion.div
                          key="phone-field"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="space-y-2 pt-4"
                        >
                          <label className="text-sm font-semibold" style={{ color: colors.primary }}>
                            Mobile Number <span style={{ color: colors.danger }}>*</span>
                          </label>
                          <input
                            type="tel"
                            {...register("phoneNumber")}
                            className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-all"
                            style={{
                              borderColor: colors.light,
                              color: colors.primary,
                            }}
                            onFocus={(e) => e.target.style.borderColor = colors.accent}
                            onBlur={(e) => e.target.style.borderColor = colors.light}
                            placeholder="+91 XXXXX XXXXX"
                          />
                          <p className="text-xs" style={{ color: `${colors.primary}80` }}>
                            Used for emergency notifications and SMS alerts
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Caretaker Username Field */}
                    <AnimatePresence>
                      {role === "patient" && (
                        <motion.div
                          key="caretaker-field"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="space-y-2 pt-4"
                        >
                          <label className="text-sm font-semibold" style={{ color: colors.primary }}>
                            Caretaker Username <span style={{ color: colors.danger }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={caretakerUsername}
                            onChange={(e) => setCaretakerUsername(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-all"
                            style={{
                              borderColor: colors.light,
                              color: colors.primary,
                            }}
                            onFocus={(e) => e.target.style.borderColor = colors.accent}
                            onBlur={(e) => e.target.style.borderColor = colors.light}
                            placeholder="Enter caretaker's username"
                          />
                          <p className="text-xs" style={{ color: `${colors.primary}80` }}>
                            Ask your caretaker for their username to link your accounts
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={login.isPending || registerUser.isPending}
                className="w-full py-4 px-6 rounded-xl font-bold text-white hover:opacity-90 focus:ring-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                style={{ 
                  background: `linear-gradient(90deg, ${colors.secondary} 0%, ${colors.accent} 100%)`,
                  boxShadow: `0 8px 24px ${colors.accent}40`,
                }}
              >
                {(login.isPending || registerUser.isPending) ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isLogin ? "Sign In" : "Create Account"}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle Login/Signup */}
            <div className="text-center mt-6">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm font-semibold transition-colors"
                style={{ color: colors.secondary }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.primary}
                onMouseLeave={(e) => e.currentTarget.style.color = colors.secondary}
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(50px, -50px) scale(1.1); }
        }
      `}</style>
    </div>
  );
}
