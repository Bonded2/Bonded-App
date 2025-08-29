import { HttpAgent } from '@dfinity/agent';
import { CANISTER_IDS, IC_HOST } from './ic';

export const createAgent = async (): Promise<HttpAgent> => {
  const agent = new HttpAgent({
    host: IC_HOST,
  });

  // Fetch root key for local development
  if (import.meta.env.VITE_DFX_NETWORK === 'local') {
    await agent.fetchRootKey();
  }

  return agent;
};

export { CANISTER_IDS, IC_HOST };
