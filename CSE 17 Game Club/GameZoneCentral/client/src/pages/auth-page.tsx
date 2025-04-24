import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gamepad } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import logoImage from "../assets/logo.png";

// Firebase authentication form schemas
const firebaseLoginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  rememberMe: z.boolean().optional(),
});

const firebaseRegisterSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  email: z.string().email({ message: "Please enter a valid email" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(1, { message: "Please confirm your password" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Traditional authentication form schemas
const loginSchema = z.object({
  username: z.string().min(1, { message: "Username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
  rememberMe: z.boolean().optional(),
});

const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(1, { message: "Please confirm your password" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;
type FirebaseLoginFormData = z.infer<typeof firebaseLoginSchema>;
type FirebaseRegisterFormData = z.infer<typeof firebaseRegisterSchema>;

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { 
    user, 
    loginMutation, 
    registerMutation, 
    googleLoginMutation 
  } = useAuth();
  const [activeTab, setActiveTab] = useState("login");
  const [authMethod, setAuthMethod] = useState<"traditional" | "firebase">("firebase");

  // Traditional auth forms
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      role: "user"
    },
  });

  // Firebase auth forms
  const firebaseLoginForm = useForm<FirebaseLoginFormData>({
    resolver: zodResolver(firebaseLoginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false
    },
  });

  const firebaseRegisterForm = useForm<FirebaseRegisterFormData>({
    resolver: zodResolver(firebaseRegisterSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: ""
    },
  });

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  // Traditional authentication handlers
  const onLoginSubmit = (data: LoginFormData) => {
    loginMutation.mutate({
      email: data.username,
      password: data.password,
    });
  };

  const onRegisterSubmit = (data: RegisterFormData) => {
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate(registerData);
  };

  // Firebase authentication handlers
  const onFirebaseLoginSubmit = (data: FirebaseLoginFormData) => {
    loginMutation.mutate({
      email: data.email,
      password: data.password,
    });
  };

  const onFirebaseRegisterSubmit = (data: FirebaseRegisterFormData) => {
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate({
      email: registerData.email,
      password: registerData.password,
      username: registerData.username
    });
  };

  const handleGoogleLogin = () => {
    googleLoginMutation.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left column - Auth form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={logoImage} alt="CSE-17 Game Club Logo" className="w-32 h-32 mx-auto mb-4" />
            <h1 className="text-2xl font-heading font-bold text-foreground">Welcome to CSE-17 Game Club</h1>
          </div>

          <div className="mb-6 flex justify-center">
            <div className="inline-flex rounded-md border border-input p-1">
              <button
                type="button"
                className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${
                  authMethod === "firebase" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-background text-muted-foreground hover:bg-secondary"
                }`}
                onClick={() => setAuthMethod("firebase")}
              >
                Firebase Auth
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${
                  authMethod === "traditional" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-background text-muted-foreground hover:bg-secondary"
                }`}
                onClick={() => setAuthMethod("traditional")}
              >
                Traditional Auth
              </button>
            </div>
          </div>

          {authMethod === "firebase" ? (
            // Firebase Authentication UI
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <div className="space-y-6">
                  <Button 
                    type="button" 
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2" 
                    onClick={handleGoogleLogin}
                    disabled={googleLoginMutation.isPending}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    {googleLoginMutation.isPending ? "Signing in..." : "Sign in with Google"}
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t"></span>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-background px-2 text-muted-foreground">or continue with email</span>
                    </div>
                  </div>
                  
                  <form onSubmit={firebaseLoginForm.handleSubmit(onFirebaseLoginSubmit)}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email"
                          {...firebaseLoginForm.register("email")}
                        />
                        {firebaseLoginForm.formState.errors.email && (
                          <p className="text-destructive text-sm">{firebaseLoginForm.formState.errors.email.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter your password"
                          {...firebaseLoginForm.register("password")}
                        />
                        {firebaseLoginForm.formState.errors.password && (
                          <p className="text-destructive text-sm">{firebaseLoginForm.formState.errors.password.message}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="firebase-rememberMe" 
                            {...firebaseLoginForm.register("rememberMe")} 
                          />
                          <Label htmlFor="firebase-rememberMe" className="text-sm font-normal">Remember me</Label>
                        </div>
                        <a href="#" className="text-sm text-primary hover:text-primary/80">Forgot password?</a>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Signing in..." : "Sign In with Email"}
                      </Button>
                    </div>
                  </form>
                  
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Don't have an account?{" "}
                      <button 
                        type="button" 
                        className="text-primary hover:text-primary/80"
                        onClick={() => setActiveTab("register")}
                      >
                        Sign up
                      </button>
                    </p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="register">
                <div className="space-y-6">
                  <form onSubmit={firebaseRegisterForm.handleSubmit(onFirebaseRegisterSubmit)}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-username">Username</Label>
                        <Input
                          id="register-username"
                          placeholder="Choose a username"
                          {...firebaseRegisterForm.register("username")}
                        />
                        {firebaseRegisterForm.formState.errors.username && (
                          <p className="text-destructive text-sm">{firebaseRegisterForm.formState.errors.username.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="register-email">Email</Label>
                        <Input
                          id="register-email"
                          type="email"
                          placeholder="Enter your email"
                          {...firebaseRegisterForm.register("email")}
                        />
                        {firebaseRegisterForm.formState.errors.email && (
                          <p className="text-destructive text-sm">{firebaseRegisterForm.formState.errors.email.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="register-password">Password</Label>
                        <Input
                          id="register-password"
                          type="password"
                          placeholder="Choose a password"
                          {...firebaseRegisterForm.register("password")}
                        />
                        {firebaseRegisterForm.formState.errors.password && (
                          <p className="text-destructive text-sm">{firebaseRegisterForm.formState.errors.password.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="register-confirm-password">Confirm Password</Label>
                        <Input
                          id="register-confirm-password"
                          type="password"
                          placeholder="Confirm your password"
                          {...firebaseRegisterForm.register("confirmPassword")}
                        />
                        {firebaseRegisterForm.formState.errors.confirmPassword && (
                          <p className="text-destructive text-sm">{firebaseRegisterForm.formState.errors.confirmPassword.message}</p>
                        )}
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "Creating account..." : "Create Account"}
                      </Button>
                    </div>
                  </form>
                  
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Already have an account?{" "}
                      <button 
                        type="button" 
                        className="text-primary hover:text-primary/80"
                        onClick={() => setActiveTab("login")}
                      >
                        Sign in
                      </button>
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            // Traditional Authentication UI
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="login">User</TabsTrigger>
                <TabsTrigger value="mediator">Mediator</TabsTrigger>
                <TabsTrigger value="admin">Admin</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <div className="space-y-6">
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          placeholder="Enter your username"
                          {...loginForm.register("username")}
                        />
                        {loginForm.formState.errors.username && (
                          <p className="text-destructive text-sm">{loginForm.formState.errors.username.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter your password"
                          {...loginForm.register("password")}
                        />
                        {loginForm.formState.errors.password && (
                          <p className="text-destructive text-sm">{loginForm.formState.errors.password.message}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="rememberMe" 
                            {...loginForm.register("rememberMe")} 
                          />
                          <Label htmlFor="rememberMe" className="text-sm font-normal">Remember me</Label>
                        </div>
                        <a href="#" className="text-sm text-primary hover:text-primary/80">Forgot password?</a>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Signing in..." : "Sign In"}
                      </Button>
                    </div>
                  </form>
                  
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Don't have an account?{" "}
                      <button 
                        type="button" 
                        className="text-primary hover:text-primary/80"
                        onClick={() => setActiveTab("register")}
                      >
                        Sign up
                      </button>
                    </p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="mediator">
                <div className="space-y-6">
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="mediator-username">Mediator Username</Label>
                        <Input
                          id="mediator-username"
                          placeholder="Enter your username"
                          {...loginForm.register("username")}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="mediator-password">Password</Label>
                        <Input
                          id="mediator-password"
                          type="password"
                          placeholder="Enter your password"
                          {...loginForm.register("password")}
                        />
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Signing in..." : "Sign In as Mediator"}
                      </Button>
                    </div>
                  </form>
                </div>
              </TabsContent>
              
              <TabsContent value="admin">
                <div className="space-y-6">
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="admin-username">Admin Username</Label>
                        <Input
                          id="admin-username"
                          placeholder="Enter your username"
                          {...loginForm.register("username")}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="admin-password">Password</Label>
                        <Input
                          id="admin-password"
                          type="password"
                          placeholder="Enter your password"
                          {...loginForm.register("password")}
                        />
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Signing in..." : "Sign In as Admin"}
                      </Button>
                    </div>
                  </form>
                </div>
              </TabsContent>
              
              <TabsContent value="register">
                <div className="space-y-6">
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-traditional-username">Username</Label>
                        <Input
                          id="register-traditional-username"
                          placeholder="Choose a username"
                          {...registerForm.register("username")}
                        />
                        {registerForm.formState.errors.username && (
                          <p className="text-destructive text-sm">{registerForm.formState.errors.username.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="register-traditional-password">Password</Label>
                        <Input
                          id="register-traditional-password"
                          type="password"
                          placeholder="Choose a password"
                          {...registerForm.register("password")}
                        />
                        {registerForm.formState.errors.password && (
                          <p className="text-destructive text-sm">{registerForm.formState.errors.password.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="register-traditional-confirm-password">Confirm Password</Label>
                        <Input
                          id="register-traditional-confirm-password"
                          type="password"
                          placeholder="Confirm your password"
                          {...registerForm.register("confirmPassword")}
                        />
                        {registerForm.formState.errors.confirmPassword && (
                          <p className="text-destructive text-sm">{registerForm.formState.errors.confirmPassword.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="register-role">Account Type</Label>
                        <select
                          id="register-role"
                          className="w-full bg-muted rounded-md border border-input px-3 py-2 text-sm"
                          {...registerForm.register("role")}
                        >
                          <option value="user">User</option>
                          <option value="mediator">Mediator</option>
                        </select>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "Creating account..." : "Create Account"}
                      </Button>
                    </div>
                  </form>
                  
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Already have an account?{" "}
                      <button 
                        type="button" 
                        className="text-primary hover:text-primary/80"
                        onClick={() => setActiveTab("login")}
                      >
                        Sign in
                      </button>
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
      
      {/* Right column - Hero banner */}
      <div className="w-full md:w-1/2 bg-gradient-to-br from-primary to-primary/70 p-8 flex items-center justify-center hidden md:flex">
        <div className="max-w-lg text-center">
          <img src={logoImage} alt="CSE-17 Game Club Logo" className="w-40 h-40 mx-auto mb-6" />
          <h1 className="text-4xl font-heading font-bold text-white mb-6">
            CSE-17 Game Club
          </h1>
          <p className="text-white/90 text-lg mb-8">
            Join our gaming community and challenge yourself with our collection of interactive mini-games. 
            Compete with friends, track your scores, and climb the leaderboards!
          </p>
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 flex flex-col items-center">
              <span className="text-accent text-lg mb-2">🎮</span>
              <span className="text-white text-xs">Guessing Game</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 flex flex-col items-center">
              <span className="text-accent text-lg mb-2">🎡</span>
              <span className="text-white text-xs">Spin Wheel</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 flex flex-col items-center">
              <span className="text-accent text-lg mb-2">🚦</span>
              <span className="text-white text-xs">Red Light Green Light</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 flex flex-col items-center">
              <span className="text-accent text-lg mb-2">⌨️</span>
              <span className="text-white text-xs">Type Racer</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 flex flex-col items-center">
              <span className="text-accent text-lg mb-2">🍞</span>
              <span className="text-white text-xs">Bread Game</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}