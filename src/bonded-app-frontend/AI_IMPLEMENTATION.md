# AI Implementation for Bonded MVP

## Overview

This document outlines the AI classification system implemented for the Bonded MVP, featuring Computer Vision and Textual Analysis models for content filtering and verification.

## AI Models

### 1. Computer Vision (YOLO v5 nano)

**Purpose**: Image analysis for content appropriateness and human detection

**Capabilities**:
- Human detection (required for relationship evidence)
- Nudity/explicit content detection (automatic exclusion)
- Face recognition (future feature - not implemented in MVP)

**Implementation**:
- Model: YOLO v5 nano (lightweight, fast inference)
- File: `src/utils/aiClassification.js` - `ComputerVisionClassifier`
- Supported formats: JPEG, PNG, WebP, HEIC
- Max file size: 10MB
- Confidence threshold: 70% (configurable)

**Content Filtering Rules**:
1. **Include**: Images with at least one human detected AND no nudity
2. **Exclude**: Images with nudity/explicit content detected
3. **Exclude**: Images with no humans detected

### 2. Textual Analysis (TinyBert)

**Purpose**: Text analysis for sexually explicit content detection

**Capabilities**:
- Sexually explicit content detection
- Sentiment analysis (informational)
- Content appropriateness classification

**Implementation**:
- Model: TinyBert (efficient transformer model)
- File: `src/utils/aiClassification.js` - `TextualAnalysisClassifier`
- Max text length: 5000 characters
- Confidence threshold: 80% (configurable)

**Content Filtering Rules**:
1. **Include**: Messages with no sexually explicit content
2. **Exclude**: Messages containing sexually explicit content

## File Structure

```
src/
├── components/
│   └── AIClassificationDemo/
│       ├── AIClassificationDemo.jsx    # Interactive demo component
│       ├── style.css                   # Demo styling
│       └── index.js                    # Export file
├── screens/
│   └── AISettings/
│       ├── AISettings.jsx              # AI configuration screen
│       └── style.css                   # Settings styling
├── utils/
│   └── aiClassification.js             # Core AI service classes
└── components/UploadModal/
    └── UploadModal.jsx                 # Integrated AI filtering
```

## Core Components

### 1. AI Classification Service (`aiClassification.js`)

**Main Classes**:
- `AIClassificationService`: Main coordinator
- `ComputerVisionClassifier`: Image analysis
- `TextualAnalysisClassifier`: Text analysis

**Key Methods**:
```javascript
// Initialize AI models
await aiClassificationService.initialize()

// Classify image
const result = await aiClassificationService.classifyImage(imageFile)

// Classify text
const result = await aiClassificationService.classifyText(textString)

// Check exclusion
const exclusion = aiClassificationService.shouldExcludeContent(result, 'image')
```

### 2. AI Classification Demo (`AIClassificationDemo.jsx`)

**Features**:
- Interactive testing of both AI models
- Real-time classification results
- Visual feedback for content appropriateness
- Technical details display

**Usage**:
```javascript
import { AIClassificationDemo } from './components/AIClassificationDemo'

<AIClassificationDemo onClose={() => setShowDemo(false)} />
```

### 3. AI Settings Screen (`AISettings.jsx`)

**Features**:
- Enable/disable AI models
- Configure confidence thresholds
- Model status monitoring
- Access to AI demo

**Settings Stored**:
- Computer Vision: enabled, confidence threshold, human detection, nudity filter
- Textual Analysis: enabled, confidence threshold, explicit content filter

### 4. Upload Modal Integration

**Enhanced Features**:
- Automatic AI classification on file selection
- Real-time processing indicators
- AI status badges (✅ Approved, ❌ Rejected, 🔄 Processing)
- Automatic exclusion of inappropriate content

## Integration Points

### 1. Upload Modal (`UploadModal.jsx`)

The upload modal automatically runs AI classification on selected images:

```javascript
// Auto-classify new image files
const classifyNewFiles = async (files) => {
  const imageFiles = files.filter(file => getFileTypeCategory(file) === 'image')
  // Run AI classification...
}

// Check exclusion with AI results
const exclusionReason = getExclusionReason(file, captureSettings, fileTypeOverrides, aiResult)
```

### 2. Evidence Upload Process

AI classification is integrated into the evidence upload workflow:

1. User selects files
2. AI automatically analyzes images
3. Inappropriate content is flagged
4. User sees real-time status updates
5. Only appropriate content proceeds to upload

## MVP Specifications

### Pre-trained Models
- **No custom training required**
- Models are ready-to-use out of the box
- Suitable for immediate deployment

### Content Requirements (per MVP spec)
- Photos must contain at least one human
- Photos must not contain nudity/explicit content
- Messages must not contain sexually explicit text

### Performance
- YOLO v5 nano: ~500-1500ms processing time
- TinyBert: ~300-1100ms processing time
- Lightweight models suitable for client-side processing

## Configuration

### AI Settings Storage
Settings are stored in localStorage as `bonded_ai_settings`:

```json
{
  "computerVision": {
    "enabled": true,
    "confidenceThreshold": 0.7,
    "humanDetection": true,
    "nudityFilter": true,
    "faceRecognition": false
  },
  "textualAnalysis": {
    "enabled": true,
    "confidenceThreshold": 0.8,
    "explicitContentFilter": true,
    "sentimentAnalysis": true
  }
}
```

### Model Configuration
Model settings in `aiClassification.js`:

```javascript
const AI_CONFIG = {
  computerVision: {
    modelName: 'yolo-v5-nano',
    endpoint: '/api/ai/vision/classify',
    confidence_threshold: 0.7,
    max_file_size: 10 * 1024 * 1024,
    supported_formats: ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  },
  textualAnalysis: {
    modelName: 'tinybert',
    endpoint: '/api/ai/text/classify',
    confidence_threshold: 0.8,
    max_text_length: 5000
  }
}
```

## User Experience

### Visual Indicators
- **🔄 AI Analyzing...**: Processing in progress
- **✅ AI Approved**: Content appropriate for upload
- **❌ AI Rejected**: Content excluded due to policy violation
- **⚠️ AI Error**: Classification failed

### User Controls
- Enable/disable AI models
- Adjust confidence thresholds
- Test AI models with custom content
- View detailed classification results

## Future Enhancements

### Face Recognition
- Partner face identification
- Relationship verification
- Currently marked as "Coming Soon"

### Advanced Features
- Custom model training
- Batch processing optimization
- Real-time video analysis
- Multi-language text analysis

## Security & Privacy

### Data Protection
- No content stored or transmitted unnecessarily
- Local processing where possible
- Secure API endpoints for model inference
- Clear user consent for AI processing

### Compliance
- Immigration evidence standards
- Content appropriateness for legal proceedings
- Audit trail for AI decisions

## Testing

### AI Demo Features
- Upload test images
- Enter test text
- View detailed classification results
- Understand AI decision-making process

### Access AI Demo
1. Go to AI Settings (`/ai-settings`)
2. Click "Open AI Classification Demo"
3. Test both Computer Vision and Textual Analysis
4. Review detailed results and confidence scores

## Deployment Notes

### Production Considerations
- Replace mock implementations with actual model endpoints
- Configure proper API authentication
- Set up model serving infrastructure
- Monitor model performance and accuracy

### MVP Status
- ✅ Core AI service architecture
- ✅ Computer Vision mock implementation
- ✅ Textual Analysis mock implementation
- ✅ Upload modal integration
- ✅ AI settings configuration
- ✅ Interactive demo component
- ⏳ Production model endpoints (backend required)
- ⏳ Face recognition feature (future)

This implementation provides a solid foundation for AI-powered content filtering in the Bonded MVP, ensuring appropriate content for immigration evidence while maintaining user control and transparency. 