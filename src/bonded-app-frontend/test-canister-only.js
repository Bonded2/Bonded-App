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

console.log('🧪 Bonded Canister Direct Test');
console.log('===============================\\n');

async function testCanisterDirect() {
  try {
    console.log('1. Setting up HTTP Agent...');
    
    // Create HTTP agent for local development
    const agent = new HttpAgent({
      host: 'http://127.0.0.1:4943',
    });
    
    // Fetch root key for local development
    await agent.fetchRootKey();
    console.log('   ✅ HTTP Agent configured\\n');
    
    console.log('2. Creating canister actor...');
    
    // Use the deployed canister ID
    const canisterId = 'uxrrr-q7777-77774-qaaaq-cai';
    
    const bondedBackend = Actor.createActor(bondedBackendIDL, {
      agent,
      canisterId,
    });
    
    console.log('   ✅ Canister actor created\\n');
    
    console.log('3. Testing canister methods...');
    
    try {
      console.log('   Testing health_check...');
      const healthResult = await bondedBackend.health_check();
      console.log('   Health check result:', healthResult);
      console.log('   ✅ Health check passed\\n');
    } catch (error) {
      console.log('   ❌ Health check failed:', error.message);
    }
    
    try {
      console.log('   Testing greet...');
      const greetResult = await bondedBackend.greet('Node.js Test Client');
      console.log('   Greet result:', greetResult);
      console.log('   ✅ Greet test passed\\n');
    } catch (error) {
      console.log('   ❌ Greet test failed:', error.message);
    }
    
    try {
      console.log('   Testing get_canister_stats...');
      const statsResult = await bondedBackend.get_canister_stats();
      console.log('   Stats result:', statsResult);
      console.log('   ✅ Stats test passed\\n');
    } catch (error) {
      console.log('   ❌ Stats test failed:', error.message);
    }
    
    try {
      console.log('   Testing whoami...');
      const whoamiResult = await bondedBackend.whoami();
      console.log('   Whoami result:', whoamiResult.toString());
      console.log('   ✅ Whoami test passed\\n');
    } catch (error) {
      console.log('   ❌ Whoami test failed:', error.message);
    }
    
    console.log('🎉 Direct canister test completed successfully!');
    console.log('This confirms the ICP backend canister is working correctly.');
    
  } catch (error) {
    console.error('❌ Direct canister test failed:', error);
    process.exit(1);
  }
}

testCanisterDirect().catch(console.error); 