# Bonded - Relationship Verification for Immigration Success

> **Privacy-first relationship verification app for visa and residency applications. AI runs fully in-browser. Storage on ICP blockchain.**


## 🎯 Overview

**Bonded** is a Progressive Web App (PWA) that helps couples collect, organize, and present evidence of their genuine relationship for immigration applications. Built with privacy-first principles, all AI processing happens in-browser, and data is encrypted before storage on the Internet Computer blockchain.

### ✨ Key Features

- 🤖 **In-Browser AI Filtering** - Face detection, NSFW filtering, and text classification
- 🔐 **End-to-End Encryption** - 2-of-3 threshold cryptography with client-side encryption
- 📱 **Offline-First PWA** - Works without internet, syncs when connected
- 🔗 **Smart Integrations** - Telegram messages, photo library scanning, document OCR
- 📊 **Timeline View** - Chronological evidence with filtering and search
- 📄 **PDF Export** - Visa-ready evidence packages for immigration officers
- 🛡️ **Privacy by Design** - No sensitive data ever leaves your device unencrypted

## 🏗️ Architecture

### Frontend (React + Vite PWA)
- **React 18** with TypeScript for type safety
- **Vite** for fast development and optimized builds
- **Service Worker** for offline functionality and background sync
- **IndexedDB** for local storage and evidence queuing
- **WebCrypto API** for client-side encryption

### Backend (ICP Rust Canisters)
- **Evidence Canister** - Encrypted evidence storage and retrieval
- **Relationship Canister** - Partner linking and threshold key management
- **Auth Canister** - User authentication and session management
- **Settings Canister** - User preferences and configuration
- **Audit Canister** - Transparent action logging

### AI Models (Client-Side)
- **YOLOv5 Nano** - Face detection and human presence verification
- **NSFWJS** - Content filtering for appropriate evidence
- **DistilBERT** - Text classification for message filtering
- **Tesseract.js** - OCR for document text extraction

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **DFX** (DFINITY Canister SDK) 0.15+
- **Rust** with wasm32 target
- Modern browser with WebAssembly support


## 📱 Usage Guide

### 1. Account Setup
1. **Register** with email/password or Internet Identity
2. **Complete KYC** (optional) for enhanced verification
3. **Set preferences** for AI filtering and privacy settings

### 2. Partner Invitation
1. **Generate invite link** or QR code
2. **Share with partner** via secure channel
3. **Accept invitation** to form relationship bond
4. **Exchange key shares** for threshold cryptography

### 3. Evidence Collection

#### Automatic Daily Collection
- **Photo scanning** from device gallery with AI filtering
- **Telegram integration** for message collection
- **Geolocation tagging** (optional) for evidence context
- **Scheduled uploads** at midnight (configurable)

#### Manual Evidence Upload
- **Document upload** (PDFs, images, receipts)
- **OCR text extraction** for searchable content
- **Custom metadata** and categorization
- **Batch processing** for historical evidence

### 4. Timeline Management
- **Chronological view** of all evidence
- **Filter by type** (photos, messages, documents)
- **Date range selection** for specific periods
- **Search functionality** across all content

### 5. Evidence Export
- **Select evidence** for specific time periods
- **Generate PDF** with professional formatting
- **Include metadata** (timestamps, locations)
- **Share directly** via email or messaging apps


## 🔐 Security & Privacy

### Encryption Architecture
- **Client-side encryption** using AES-256-GCM
- **Threshold cryptography** (2-of-3 Shamir's Secret Sharing)
- **Key derivation** via HKDF-SHA256
- **Perfect forward secrecy** for all communications

### Privacy Guarantees
- **No plaintext data** ever leaves your device
- **AI processing** happens entirely in-browser
- **Zero-knowledge architecture** - Bonded cannot access your content
- **Selective disclosure** - Share only what's necessary

### Security Features
- **Content Security Policy** (CSP) protection
- **Subresource Integrity** (SRI) for external resources
- **HTTPS enforcement** with HSTS headers
- **XSS protection** and CSRF mitigation
- **Audit logging** for transparency


## 📊 Monitoring & Analytics

### Performance Metrics
- **Bundle size optimization** - Lazy loading and code splitting
- **AI model efficiency** - Quantized models for mobile performance
- **Offline capability** - Service worker caching strategies
- **Battery optimization** - Efficient background processing

### User Analytics (Privacy-Preserving)
- **Usage patterns** - Anonymous feature adoption metrics
- **Performance data** - Load times and error rates
- **AI accuracy** - Model performance without exposing content

*Bonded is committed to helping genuine relationships succeed in their immigration journey while maintaining the highest standards of privacy and security.*
