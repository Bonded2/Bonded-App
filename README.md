# Bonded App

> Relationship verification app for immigration success. Privacy-first. AI runs fully in-browser. Storage on ICP blockchain.

## Architecture

The Bonded app follows a clean separation of concerns:

- **Frontend**: React PWA deployed to traditional web hosting (Vercel/Netlify)
- **Backend**: Single ICP canister for secure blockchain storage
- **AI Processing**: All AI models run client-side in the browser for privacy

## Features

- 🔐 **Privacy-First**: All AI processing happens in your browser - no data sent to external servers
- 🤖 **AI-Powered Filtering**: Automatic content filtering using in-browser AI models
- 💝 **Threshold Cryptography**: 2-of-3 key management for relationship evidence
- 📱 **Progressive Web App**: Install on your phone like a native app
- 🔗 **Blockchain Storage**: Immutable evidence storage on Internet Computer
- 🌐 **Offline-First**: Works without internet, syncs when connected

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for fast builds
- PWA with offline support
- @dfinity/agent for ICP communication
- TensorFlow.js for in-browser AI
- Tesseract.js for OCR

### Backend
- Rust canisters on Internet Computer
- Stable memory for persistent storage
- Threshold cryptography implementation

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- DFX SDK for Internet Computer development
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/bonded-app.git
cd bonded-app
```

2. Install dependencies:
```bash
npm install
cd src/bonded-app-frontend && npm install
```

3. Start local ICP network:
```bash
dfx start --clean
```

4. Deploy backend canister:
```bash
dfx deploy bonded-app-backend
```

5. Generate frontend declarations:
```bash
dfx generate bonded-app-backend
```

6. Configure frontend environment:
```bash
cd src/bonded-app-frontend
cp env.example .env
# Edit .env with your canister ID
```

7. Start frontend development server:
```bash
npm run dev
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy

**Backend (ICP):**
```bash
dfx deploy bonded-app-backend --network ic
```

**Frontend (Vercel):**
```bash
cd src/bonded-app-frontend
vercel
```

## Project Structure

```
bonded-app/
├── src/
│   ├── bonded-app-backend/     # Rust backend canister
│   │   ├── src/                # Rust source files
│   │   └── Cargo.toml          # Rust dependencies
│   └── bonded-app-frontend/    # React PWA frontend
│       ├── src/                # React source files
│       ├── public/             # Static assets
│       └── package.json        # Frontend dependencies
├── dfx.json                    # ICP configuration
├── package.json                # Root dependencies
└── DEPLOYMENT.md               # Deployment guide
```

## Development

### Frontend Development
```bash
cd src/bonded-app-frontend
npm run dev
```

### Backend Development
```bash
dfx build
dfx deploy
```

### Testing
```bash
# Test backend
dfx canister call bonded-app-backend health_check

# Test frontend
cd src/bonded-app-frontend
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- DFINITY Foundation for the Internet Computer platform
- The open-source AI community for in-browser models
- All contributors who have helped shape Bonded

## Support

For support, email support@bonded.app or open an issue in this repository.
