# Sepa 🔒

Secure platform for copy paste - Share text between devices easily and securely.

## Features

- 📝 Create text pastes with unique shareable links
- 🔗 Share links across devices to access your text
- 📋 One-click copy to clipboard
- 🎨 Clean, modern UI
- 🚀 Fast and lightweight
- 💾 Simple in-memory storage

## Installation

1. Clone the repository:
```bash
git clone https://github.com/thedarknight01/Sepa.git
cd Sepa
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and visit `http://localhost:3000`

## Usage

1. **Create a Paste**: Enter your text in the textarea and click "Create Paste"
2. **Share the Link**: Copy the generated link and share it with any device
3. **Access from Another Device**: Open the link on any device to view and copy the text

## API Endpoints

### Create a Paste
```
POST /api/paste
Content-Type: application/json

{
  "content": "Your text here"
}

Response:
{
  "id": "abc123",
  "url": "/paste/abc123"
}
```

### Get a Paste
```
GET /api/paste/:id

Response:
{
  "id": "abc123",
  "content": "Your text here",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Technology Stack

- **Backend**: Node.js, Express
- **Frontend**: HTML, CSS, JavaScript
- **Storage**: In-memory (Map)

## License

ISC
