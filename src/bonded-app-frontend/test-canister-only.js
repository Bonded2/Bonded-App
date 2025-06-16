#!/usr/bin/env node
// Direct canister test without browser dependencies
import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
// Candid interface definition for our backend canister
const bondedBackendIDL = ({ IDL }) => {
  const BondedResult = IDL.Variant({ 
    'Ok' : IDL.Text, 
    'Err' : IDL.Text 
  });
  return IDL.Service({
    'health_check' : IDL.Func([], [IDL.Text], ['query']),
    'greet' : IDL.Func([IDL.Text], [IDL.Text], ['query']),
    'get_canister_stats' : IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat64))], ['query']),
    'whoami' : IDL.Func([], [IDL.Principal], ['query']),
  });
};
async function testCanisterDirect() {
  try {
    // Create HTTP agent for local development
    const agent = new HttpAgent({
      host: 'http://127.0.0.1:4943',
    });
    // Fetch root key for local development
    await agent.fetchRootKey();
    // Use the deployed canister ID
    const canisterId = 'uxrrr-q7777-77774-qaaaq-cai';
    const bondedBackend = Actor.createActor(bondedBackendIDL, {
      agent,
      canisterId,
    });
    try {
      const healthResult = await bondedBackend.health_check();
    } catch (error) {
    }
    try {
      const greetResult = await bondedBackend.greet('Node.js Test Client');
    } catch (error) {
    }
    try {
      const statsResult = await bondedBackend.get_canister_stats();
    } catch (error) {
    }
    try {
      const whoamiResult = await bondedBackend.whoami();
    } catch (error) {
    }
  } catch (error) {
    process.exit(1);
  }
}
testCanisterDirect().catch(() => {}); 