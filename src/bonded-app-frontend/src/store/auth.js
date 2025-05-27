import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthClient } from '@dfinity/auth-client';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

// Import generated declarations (these will be created after dfx generate)
import { canisterId, createActor } from '../../../declarations/bonded-app-backend';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // Authentication state
      isAuthenticated: false,
      user: null,
      authClient: null,
      actor: null,
      principal: null,
      session: null,
      loading: false,
      error: null,

      // Threshold key state
      thresholdKeys: null,
      keyShares: [],

      // Initialize authentication
      init: async () => {
        set({ loading: true, error: null });
        
        try {
          const authClient = await AuthClient.create({
            idleOptions: {
              idleTimeout: 1000 * 60 * 30, // 30 minutes
              disableDefaultIdleCallback: true,
            },
          });

          const isAuthenticated = await authClient.isAuthenticated();
          
          if (isAuthenticated) {
            const identity = authClient.getIdentity();
            const principal = identity.getPrincipal();
            
            // Create actor with authenticated identity
            const agent = new HttpAgent({
              identity,
              host: process.env.DFX_NETWORK === 'local' ? 'http://localhost:4943' : 'https://ic0.app',
            });

            if (process.env.DFX_NETWORK === 'local') {
              await agent.fetchRootKey();
            }

            const actor = createActor(canisterId, {
              agent,
            });

            // Get user data from backend
            const userResponse = await actor.get_user();
            
            if (userResponse.success) {
              set({
                isAuthenticated: true,
                authClient,
                actor,
                principal,
                user: userResponse.data,
                loading: false,
              });
              
              // Create or refresh session
              get().createSession();
            } else {
              throw new Error(userResponse.error || 'Failed to get user data');
            }
          } else {
            set({
              isAuthenticated: false,
              authClient,
              loading: false,
            });
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({
            error: error.message,
            loading: false,
          });
        }
      },

      // Login with Internet Identity
      login: async () => {
        set({ loading: true, error: null });
        
        try {
          const authClient = get().authClient;
          if (!authClient) {
            throw new Error('Auth client not initialized');
          }

          await new Promise((resolve, reject) => {
            authClient.login({
              identityProvider: process.env.DFX_NETWORK === 'local' 
                ? `http://localhost:4943/?canisterId=${process.env.INTERNET_IDENTITY_CANISTER_ID}`
                : 'https://identity.ic0.app',
              onSuccess: resolve,
              onError: reject,
            });
          });

          const identity = authClient.getIdentity();
          const principal = identity.getPrincipal();

          // Create actor with authenticated identity
          const agent = new HttpAgent({
            identity,
            host: process.env.DFX_NETWORK === 'local' ? 'http://localhost:4943' : 'https://ic0.app',
          });

          if (process.env.DFX_NETWORK === 'local') {
            await agent.fetchRootKey();
          }

          const actor = createActor(canisterId, {
            agent,
          });

          // Check if user exists, if not create new user
          const userResponse = await actor.get_user();
          
          let user;
          if (userResponse.success) {
            user = userResponse.data;
          } else {
            // Create new user
            const createUserResponse = await actor.create_user({
              username: null,
              email: null,
              verification_method: { InternetIdentity: null },
            });
            
            if (createUserResponse.success) {
              user = createUserResponse.data;
            } else {
              throw new Error(createUserResponse.error || 'Failed to create user');
            }
          }

          set({
            isAuthenticated: true,
            authClient,
            actor,
            principal,
            user,
            loading: false,
          });

          // Create session
          get().createSession();

        } catch (error) {
          console.error('Login error:', error);
          set({
            error: error.message,
            loading: false,
          });
        }
      },

      // Logout
      logout: async () => {
        set({ loading: true });
        
        try {
          const authClient = get().authClient;
          const session = get().session;
          
          if (session && get().actor) {
            // Invalidate session on backend
            await get().actor.invalidate_session(session.session_id);
          }
          
          if (authClient) {
            await authClient.logout();
          }

          set({
            isAuthenticated: false,
            user: null,
            actor: null,
            principal: null,
            session: null,
            thresholdKeys: null,
            keyShares: [],
            loading: false,
            error: null,
          });
        } catch (error) {
          console.error('Logout error:', error);
          set({
            error: error.message,
            loading: false,
          });
        }
      },

      // Create session
      createSession: async () => {
        try {
          const actor = get().actor;
          if (!actor) return;

          const sessionResponse = await actor.create_auth_session();
          if (sessionResponse.success) {
            set({ session: sessionResponse.data });
          }
        } catch (error) {
          console.error('Session creation error:', error);
        }
      },

      // Update user profile
      updateUser: async (updateData) => {
        set({ loading: true, error: null });
        
        try {
          const actor = get().actor;
          if (!actor) {
            throw new Error('Not authenticated');
          }

          const response = await actor.update_user(updateData);
          
          if (response.success) {
            set({
              user: response.data,
              loading: false,
            });
            return response.data;
          } else {
            throw new Error(response.error);
          }
        } catch (error) {
          console.error('Update user error:', error);
          set({
            error: error.message,
            loading: false,
          });
          throw error;
        }
      },

      // Setup threshold keys
      setupThresholdKeys: async (threshold = 2, totalShares = 3) => {
        set({ loading: true, error: null });
        
        try {
          const actor = get().actor;
          if (!actor) {
            throw new Error('Not authenticated');
          }

          const response = await actor.setup_threshold_keys(threshold, totalShares);
          
          if (response.success) {
            set({
              thresholdKeys: response.data,
              loading: false,
            });
            return response.data;
          } else {
            throw new Error(response.error);
          }
        } catch (error) {
          console.error('Setup threshold keys error:', error);
          set({
            error: error.message,
            loading: false,
          });
          throw error;
        }
      },

      // Get threshold keys
      getThresholdKeys: async () => {
        try {
          const actor = get().actor;
          if (!actor) return null;

          const response = await actor.get_threshold_keys();
          
          if (response.success) {
            set({ thresholdKeys: response.data });
            return response.data;
          }
          return null;
        } catch (error) {
          console.error('Get threshold keys error:', error);
          return null;
        }
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Check if user has completed onboarding
      isOnboardingComplete: () => {
        const user = get().user;
        return user && user.username && user.kyc_status !== 'Unverified';
      },

      // Check if user has threshold keys setup
      hasThresholdKeys: () => {
        const thresholdKeys = get().thresholdKeys;
        return thresholdKeys && thresholdKeys.is_active;
      },
    }),
    {
      name: 'bonded-auth-storage',
      partialize: (state) => ({
        // Only persist essential state, not sensitive data
        isAuthenticated: state.isAuthenticated,
        user: state.user ? {
          principal: state.user.principal,
          username: state.user.username,
          email: state.user.email,
          profile_photo: state.user.profile_photo,
          kyc_status: state.user.kyc_status,
          settings: state.user.settings,
        } : null,
      }),
    }
  )
);

export default useAuthStore;