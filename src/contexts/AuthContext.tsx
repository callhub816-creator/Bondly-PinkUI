
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { storage } from '../../utils/storage';
import { UserProfile, SubscriptionPlan, ConnectionLevel } from '../../types';
import { GATING_CONFIG } from '../../constants';
import { useNotification } from '../../components/NotificationProvider';
import { auth } from '../utils/firebase';
import { signOut as firebaseSignOut, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

type ProviderName = 'facebook' | 'google';

type AuthContextType = {
  user: any;
  profile: UserProfile;
  loading: boolean;
  syncProfile: (profile: UserProfile) => Promise<void>;
  signInWithProvider: (provider: ProviderName) => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateConnection: (companionId: string | number, points: number) => void;
  incrementUsage: () => number;
  refreshProfile: () => void;
  upgradeSubscription: (plan: SubscriptionPlan) => Promise<void>;
  purchaseHearts: (amount: number) => Promise<void>;
  spendHearts: (amount: number) => Promise<boolean>;
  sendGift: (companionId: string | number, giftId: string) => Promise<boolean>;
  unlockConnectionTier: (companionId: string | number, tier: ConnectionLevel) => boolean;
  leasePersonality: (mode: string) => boolean;
  extendMessages: () => Promise<boolean>;
  buyStarterPass: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  claimDailyBonus: () => Promise<boolean>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

// Helper for authenticated fetches with Auto-Refresh
const authFetch = async (url: string, options: any = {}) => {
  // STRICT FIX: Always include credentials for cookies to be sent
  const finalOptions = {
    ...options,
    credentials: "include" as RequestCredentials
  };

  let res = await fetch(url, finalOptions);

  // If 401, attempt refresh automatically
  if (res.status === 401) {
    const refreshRes = await fetch('/api/auth/refresh', { method: 'POST', credentials: "include" });
    if (refreshRes.ok) {
      // Retry original request
      res = await fetch(url, finalOptions);
    }
  }
  return res;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile>(storage.getProfile());
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  const refreshProfile = useCallback(() => {
    setProfile(storage.getProfile());
  }, []);

  // Sync profile to DB
  const syncProfile = useCallback(async (updatedProfile: UserProfile) => {
    try {
      await authFetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileData: updatedProfile })
      });
    } catch (err) {
      console.warn('Sync failed');
    }
  }, []);

  // Fetch user session on load with SessionStorage caching to prevent /api/auth/me spam
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const cachedUser = sessionStorage.getItem('bondly_auth_cache');
        if (cachedUser) {
          const parsed = JSON.parse(cachedUser);
          if (parsed.timestamp > Date.now() - 5 * 60 * 1000) {
            // Cache valid for 5 minutes
            setUser(parsed.user);
            setLoading(false);
            return;
          }
        }

        const res = await authFetch('/api/auth/me');
        if (res.ok) {
          const userData = await res.json();
          const userObj = { id: userData.id, username: userData.username, displayName: userData.displayName };
          setUser(userObj);

          if (userData.profileData) {
            setProfile(prev => {
              const updated = { ...prev, ...userData.profileData };
              storage.saveProfile(updated);
              return updated;
            });
          }

          sessionStorage.setItem('bondly_auth_cache', JSON.stringify({
            user: userObj,
            timestamp: Date.now()
          }));
        } else {
          setUser(null);
          sessionStorage.removeItem('bondly_auth_cache');
        }
      } catch (err) {
        setUser(null);
        sessionStorage.removeItem('bondly_auth_cache');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleFirebaseSync = async (idToken: string, displayName: string | null) => {
    try {
      const res = await fetch('/api/auth/firebase-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          idToken,
          displayName: displayName || undefined,
          apiKey: import.meta.env.VITE_FIREBASE_API_KEY
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Backend sync failed');

      setUser(data.user);
      if (data.profileData) {
        setProfile(prev => {
          const updated = { ...prev, ...data.profileData };
          storage.saveProfile(updated);
          return updated;
        });
      }
      return data;
    } catch (err: any) {
      console.error('Sync error:', err);
      throw err;
    }
  };



  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) { }
    setUser(null);
    sessionStorage.removeItem('bondly_auth_cache');
    storage.clearAllHistories();
    window.location.href = '/login';
  };

  const signInWithProvider = async (provider: ProviderName) => {
    if (provider === 'google') {
      const googleProvider = new GoogleAuthProvider();
      try {
        const userCredential = await signInWithPopup(auth, googleProvider);
        const token = await userCredential.user.getIdToken();
        await handleFirebaseSync(token, userCredential.user.displayName);
        window.location.href = '/';
      } catch (e) {
        console.error(e);
        showNotification('Google Sign-In failed', 'error');
      }
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const token = await userCredential.user.getIdToken();
      await handleFirebaseSync(token, userCredential.user.displayName || email.split('@')[0]);
      window.location.href = '/';
    } catch (e: any) {
      console.error(e);
      showNotification(e.message || 'Login failed', 'error');
      throw e;
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const token = await userCredential.user.getIdToken();
      await handleFirebaseSync(token, email.split('@')[0]);
      window.location.href = '/';
    } catch (e: any) {
      console.error(e);
      showNotification(e.message || 'Signup failed', 'error');
      throw e;
    }
  };

  const updateConnection = useCallback((companionId: string | number, points: number) => {
    const currentProfile = storage.getProfile();
    const currentPoints = currentProfile?.connectionPoints?.[companionId] || 0;
    const newPoints = currentPoints + points;

    // Simplify logic for now, real thresholds in constants
    const updated = {
      ...currentProfile,
      connectionPoints: {
        ...(currentProfile?.connectionPoints || {}),
        [companionId]: newPoints
      }
    };
    storage.saveProfile(updated);
    setProfile(updated);
    syncProfile(updated);
  }, [syncProfile]);

  const incrementUsage = () => {
    const current = storage.getUsage();
    const newVal = current + 1;
    storage.saveUsage(newVal);
    return newVal;
  };

  // Helper to load Razorpay SDK dynamically
  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const initiatePayment = async (amount: number, description: string, onSuccess: () => void) => {
    const res = await loadRazorpay();
    if (!res) {
      showNotification('Razorpay SDK failed to load. Are you online?', 'error');
      return;
    }

    try {
      // 1. Create Order on Backend
      const orderResponse = await authFetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amount * 100 }) // Razorpay expects paise
      });

      // Check if response is OK before parsing
      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        let errorMessage = 'Payment server error';
        let errorData = null;

        try {
          errorData = JSON.parse(errorText);

          // Extract specific Razorpay error message if available
          const specificError = errorData.detail?.error?.description || errorData.detail?.description || errorData.error;
          errorMessage = specificError || errorMessage;
        } catch {
          errorMessage = errorText || `Server returned ${orderResponse.status}`;
        }

        throw new Error(errorMessage);
      }

      const orderData = await orderResponse.json();

      if (orderData.error) {
        throw new Error(orderData.error);
      }

      // 2. Options for Razorpay
      const options = {
        key: orderData.key_id, // Enter the Key ID generated from the Dashboard
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Bondly AI",
        description: description,
        image: "https://bondly.online/favicon.svg",
        order_id: orderData.id,
        handler: async function (response: any) {
          // 3. Verify Payment on Backend
          try {
            const verifyRes = await authFetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...response,
                amount: amount,
                type: 'purchase'
              })
            }).then((t) => t.json());

            if (verifyRes.success) {
              onSuccess();
              const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
              const historyLimit = Date.now() - SEVEN_DAYS_MS;
              const newRecord = {
                id: Date.now().toString(),
                type: 'purchase' as const,
                amount: amount, // or hearts value
                label: description,
                timestamp: new Date().toISOString()
              };
              const filteredHistory = [newRecord, ...(profile.earningsHistory || [])]
                .filter(item => new Date(item.timestamp).getTime() > historyLimit)
                .slice(0, 50);

              await updateProfile({
                earningsHistory: filteredHistory
              });
              showNotification(`Payment Successful! ${description} added.`, 'success');
            } else {
              showNotification(verifyRes.error || 'Payment verification failed.', 'error');
            }
          } catch (error) {

            showNotification('Payment verification error', 'error');
          }
        },
        prefill: {
          name: user?.displayName || 'Rajesh Madhukar Navsagar',
          email: 'navsagar.rajesh@gmail.com',
          contact: '8329576393'
        },
        notes: {
          address: "Bondly AI Corp"
        },
        theme: {
          color: "#FF9ACB"
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();

    } catch (error: any) {

      showNotification(error.message || 'Payment initiation failed', 'error');
    }
  };

  const upgradeSubscription = async (plan: SubscriptionPlan) => {
    // Determine price dynamically (Placeholder prices)
    const prices: Record<string, number> = {
      starter: 49,
      core: 199,
      plus: 499
    };
    const price = prices[plan] || 99;

    await initiatePayment(price, `Upgrade to ${plan.toUpperCase()}`, async () => {
      const updated = { ...profile, subscription: plan };
      setProfile(updated);
      storage.saveProfile(updated);
      await syncProfile(updated);
      showNotification(`Welcome to ${plan.toUpperCase()}! 🌟`, 'success');
    });
  };

  const purchaseHearts = async (heartsAmount: number) => {
    // Calculate price logic (approx ₹1 = 1.2 hearts for simplicity or use config)
    // Using mapping from constants (reversed) or direct packs
    // Just a placeholder logic: 1 Heart = ₹1 (roughly)
    const price = Math.floor(heartsAmount * 0.8); // Example discount

    await initiatePayment(price, `${heartsAmount} Hearts Pack`, async () => {
      const updated = { ...profile, hearts: profile.hearts + heartsAmount };
      setProfile(updated);
      storage.saveProfile(updated);
      await syncProfile(updated);
    });
  };

  const spendHearts = async (amount: number) => {
    try {
      const res = await authFetch('/api/user/spend_hearts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason: 'Manual Spend' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.success) {
        setProfile(prev => {
          const updated = { ...prev, ...data.profile };
          storage.saveProfile(updated);
          return updated;
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error("Spend Hearts Error:", err);
      return false;
    }
  };

  const sendGift = async (companionId: string | number, giftId: string) => {
    // Gift prices map (ensure sync with constants)
    const prices: Record<string, number> = { 'rose': 10, 'chocolate': 25, 'teddy': 50, 'ring': 150, 'necklace': 500 };
    const price = prices[giftId] || 10;

    return await spendHearts(price);
  };

  const unlockConnectionTier = (companionId: string | number, tier: ConnectionLevel) => {
    // Placeholder
    return true;
  };

  const leasePersonality = (mode: string) => {
    // Placeholder
    return true;
  };

  const extendMessages = () => {
    return spendHearts(50);
  };

  const buyStarterPass = async () => {
    await upgradeSubscription('starter');
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    // If we're updating user info like name/avatar, update auth user state too
    if (data.nickname && user) {
      setUser({ ...user, displayName: data.nickname });
    }

    const updated = { ...profile, ...data };
    setProfile(updated);
    storage.saveProfile(updated);

    await syncProfile(updated);
  };

  const claimDailyBonus = async () => {
    try {
      const res = await authFetch('/api/auth/bonus', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        showNotification(data.error || "Failed to claim bonus", 'info');
        return false;
      }

      if (data.success && data.profile) {
        setProfile(prev => {
          const updated = { ...prev, ...data.profile };
          storage.saveProfile(updated);
          return updated;
        });

        // Random message for Lucky Box feel
        const rewards = data.amount || 1;
        const streak = data.profile.streakCount || 1;
        showNotification(`Lucky Box! 🎁 +${rewards} Hearts added. Current Streak: 🔥 ${streak} Days`, 'success');
        return true;
      }
      return false;
    } catch (err) {
      console.error("Bonus Error:", err);
      showNotification("Could not claim bonus. Try again later.", 'error');
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{
      user, profile, loading, syncProfile, signInWithProvider, signInWithEmail, signUpWithEmail, signOut,
      updateConnection, incrementUsage, refreshProfile, upgradeSubscription, purchaseHearts,
      spendHearts, sendGift, unlockConnectionTier, leasePersonality, extendMessages, buyStarterPass,
      updateProfile, claimDailyBonus
    }}>
      {children}
    </AuthContext.Provider>
  );
};
