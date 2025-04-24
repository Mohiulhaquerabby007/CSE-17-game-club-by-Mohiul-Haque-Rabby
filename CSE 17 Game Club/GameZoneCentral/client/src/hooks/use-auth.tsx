import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  useMutation,
  useQuery,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  auth, 
  loginWithEmailPassword, 
  registerWithEmailPassword, 
  signInWithGoogle, 
  logoutFirebase,
  onAuthStateChange 
} from "@/lib/firebase";
import { User as FirebaseUser } from "firebase/auth";

type AuthContextType = {
  user: FirebaseAuthUser | null;
  dbUser: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<FirebaseAuthUser, Error, LoginData>;
  googleLoginMutation: UseMutationResult<FirebaseAuthUser, Error, void>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<FirebaseAuthUser, Error, RegisterData>;
  syncUserWithBackend: (firebaseUser: FirebaseUser) => Promise<void>;
};

// Custom user type that combines Firebase User with any extra fields we need
export interface FirebaseAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role?: "user" | "mediator" | "admin";
}

type LoginData = {
  email: string;
  password: string;
};

type RegisterData = {
  email: string;
  password: string;
  username: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Fetch the user from the database
  const {
    data: dbUser,
    error: dbError,
    isLoading: isDbLoading,
    refetch: refetchDbUser
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user/firebase"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!firebaseUser, // only run when we have a firebase user
  });

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      if (user) {
        // Convert Firebase user to our custom user format
        setFirebaseUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: "user", // Default role - will update from DB if exists
        });
      } else {
        setFirebaseUser(null);
      }
      setAuthInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  // Sync Firebase user with our backend
  const syncUserWithBackend = async (user: FirebaseUser) => {
    if (!user) return;

    try {
      // Get the Firebase auth token
      const tokenResult = await user.getIdToken();
      
      // Call our API to create/update the user in our database
      const res = await fetch("/api/user/firebase", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenResult}`
        },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
        })
      });
      
      const dbUserData = await res.json();
      
      // Update the database user data
      queryClient.setQueryData(["/api/user/firebase"], dbUserData);
      
      // If we get user role from the backend, update our firebase user
      if (dbUserData && dbUserData.role) {
        setFirebaseUser(prev => prev ? {...prev, role: dbUserData.role} : null);
      }
    } catch (error) {
      console.error("Error syncing user with backend:", error);
    }
  };

  // Log in with email/password
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const user = await loginWithEmailPassword(credentials.email, credentials.password);
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      };
    },
    onSuccess: (user) => {
      toast({
        title: "Login successful",
        description: "You are now logged in",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Log in with Google
  const googleLoginMutation = useMutation({
    mutationFn: async () => {
      const user = await signInWithGoogle();
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      };
    },
    onSuccess: (user) => {
      toast({
        title: "Login successful",
        description: "You are now logged in with Google",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Google login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Register with email/password
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const user = await registerWithEmailPassword(data.email, data.password);
      return {
        uid: user.uid,
        email: user.email,
        displayName: data.username || user.email?.split('@')[0] || null,
        photoURL: user.photoURL,
      };
    },
    onSuccess: (user) => {
      toast({
        title: "Registration successful",
        description: "Your account has been created",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Log out
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await logoutFirebase();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user/firebase"], null);
      toast({
        title: "Logged out",
        description: "You have been logged out",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update the database when the Firebase user changes
  useEffect(() => {
    if (firebaseUser && auth.currentUser) {
      syncUserWithBackend(auth.currentUser);
    }
  }, [firebaseUser]);

  // Determine if we're still loading
  const isLoading = !authInitialized || (!!firebaseUser && isDbLoading);

  return (
    <AuthContext.Provider
      value={{
        user: firebaseUser,
        dbUser: dbUser,
        isLoading,
        error: dbError || null,
        loginMutation,
        googleLoginMutation,
        logoutMutation,
        registerMutation,
        syncUserWithBackend
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
