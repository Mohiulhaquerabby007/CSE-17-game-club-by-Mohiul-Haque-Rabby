import { initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Request, Response, NextFunction } from 'express';
import { User } from '@shared/schema';

// Extend Express Request interface to include custom properties
declare global {
  namespace Express {
    interface Request {
      firebaseUser?: any;
    }
  }
}

// Initialize Firebase Admin SDK
function initFirebaseAdmin() {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;

  // Initialize with default credentials for Replit environment
  const app = initializeApp({
    projectId: projectId,
  });

  return app;
}

const firebaseAdminApp = initFirebaseAdmin();
const auth = getAuth(firebaseAdminApp);

// Define custom interface for Firebase-verified user info
interface FirebaseUserInfo {
  uid: string;
  email?: string | null;
  name?: string | null;
  picture?: string | null;
  displayName?: string | null;
}

// Middleware to verify Firebase token
export const verifyFirebaseToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await auth.verifyIdToken(token);
    
    // Store Firebase user info in custom property
    req.firebaseUser = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      name: decodedToken.name || decodedToken.displayName || null,
      picture: decodedToken.picture || null
    } as FirebaseUserInfo;
    
    next();
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

export { auth };