/**
 * Environment Variable Debug Utility
 * Use this to check if EmailJS environment variables are loaded in the browser
 */

export function logEnvironmentVariables() {
  console.log('🔧 Vite Environment Variables (import.meta.env)');
  console.log('==================================================');
  
  console.log('\n📧 EmailJS Configuration:');
  console.log('VITE_EMAILJS_SERVICE_ID:', import.meta.env.VITE_EMAILJS_SERVICE_ID || 'NOT FOUND');
  console.log('VITE_EMAILJS_TEMPLATE_ID:', import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'NOT FOUND');
  console.log('VITE_EMAILJS_PUBLIC_KEY:', import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'NOT FOUND');
  
  console.log('\n🌐 ICP Configuration:');
  console.log('VITE_DFX_NETWORK:', import.meta.env.VITE_DFX_NETWORK || 'NOT FOUND');
  console.log('VITE_API_HOST:', import.meta.env.VITE_API_HOST || 'NOT FOUND');
  console.log('VITE_BACKEND_CANISTER_ID:', import.meta.env.VITE_BACKEND_CANISTER_ID || 'NOT FOUND');
  
  console.log('\n🔍 All import.meta.env variables:');
  console.log(import.meta.env);
  
  // Return EmailJS config status
  return {
    emailJSConfigured: !!(
      import.meta.env.VITE_EMAILJS_SERVICE_ID &&
      import.meta.env.VITE_EMAILJS_TEMPLATE_ID &&
      import.meta.env.VITE_EMAILJS_PUBLIC_KEY
    ),
    serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
    templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
    publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY
  };
}

// Auto-run in development mode
if (import.meta.env.DEV) {
  console.log('🚀 Development Mode - Auto-logging environment variables');
  logEnvironmentVariables();
}
