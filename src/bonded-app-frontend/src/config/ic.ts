import canisterIds from '../../../canister_ids.json';

const network = import.meta.env.VITE_DFX_NETWORK ?? 'local';

export const CANISTER_IDS = {
  backend: canisterIds['bonded-app-backend'][network as keyof typeof canisterIds['bonded-app-backend']],
  frontend: canisterIds['bonded-app-frontend'][network as keyof typeof canisterIds['bonded-app-frontend']],
};

export const IC_HOST = network === 'local'
  ? 'http://127.0.0.1:4943'
  : 'https://icp0.io';
