# Gurshabad - Gurbani Search and Display

This is the correct implementation of the Gurshabad website with all the features that were accidentally implemented in the wrong repository.

## Features Implemented

1. **Raag Carousel** - Interactive carousel showing all raags with their starting Ang numbers
2. **Search Functionality**
   - First letter search (Gurmukhi)
   - Full word search (Gurmukhi)  
   - Direct Ang navigation
3. **Ang Viewer** - Display Gurbani text by Ang with:
   - Navigation controls (Previous/Next/Go to Ang)
   - Keyboard navigation support
   - Clickable words for meanings
4. **Word Meaning Popup** - Click on any Gurmukhi word to see:
   - Translation
   - Transliteration
   - Etymology (coming soon)

## Setup Instructions

### 1. Install Node.js Dependencies

Open Terminal and navigate to this folder:
```bash
cd ~/Downloads/GitHub-Projects/Gurshabad
```

Install the required packages:
```bash
npm install
```

### 2. Start the Development Server

Run the server:
```bash
npm start
```

The server will start at http://localhost:3002

### 3. Open in Browser

Open your web browser and go to:
```
http://localhost:3002
```

## How to Use

### Homepage
- **Search Mode**: Use the search box to search for Gurbani
- **Raag Mode**: Click "View Raags" button to see the carousel
- Toggle between modes using the button in the bottom-right corner

### Searching
1. Enter at least 2 Gurmukhi characters
2. Select search type:
   - First letter each word
   - Full word match
   - Ang number
3. Press Enter or click search

### Ang Viewer
- Use Previous/Next buttons or arrow keys to navigate
- Click on any Gurmukhi word to see its meaning
- Enter an Ang number and click "Go" to jump directly

### Raag Carousel
- Use arrow keys or click navigation buttons
- Click on any raag card to go to its starting Ang

## Technical Details

- Static HTML/CSS/JavaScript implementation
- Uses BaniDB API for Gurbani data
- Responsive design with glass-morphism effects
- No framework dependencies (pure vanilla JS)

## Files Structure

```
Gurshabad/
├── index.html          # Homepage with search and carousel
├── ang.html           # Ang viewer page
├── search-results.html # Search results page
├── server.js          # Development server
├── package.json       # Node.js dependencies
├── css/
│   ├── raag-carousel.css
│   ├── ang-viewer.css
│   └── meaning-box.css
├── js/
│   ├── raag-carousel.js
│   ├── search.js
│   ├── ang-viewer.js
│   └── meaning-box.js
└── existing files...
```

## Notes

- Make sure the server is running before accessing the site
- The API calls go through the local server to avoid CORS issues
- All features from the wrong repository have been successfully ported
