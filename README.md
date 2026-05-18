# Call Break Scorekeeper

A premium, production-ready Call Break card game scorekeeper built with **React**, **Vite**, **Tailwind CSS**, and **Framer Motion**.

## Overview

Call Break Scorekeeper is a modern, fully-featured companion app for tracking bids, tricks, and scores in the Call Break (Lakdi) card game. It features a sleek dark/light theme, smooth animations, persistent storage, and complete rule guides.

### Key Features

✅ **Complete Game Logic** - All original functionality preserved exactly  
✅ **Dark/Light Theme** - Smooth theme switching with localStorage persistence  
✅ **Real-time Scoring** - Accurate bid/trick scoring with overtrick calculations  
✅ **Round Editing** - Edit any round's data with modal interface  
✅ **Player Rankings** - Live leaderboard with score tracking  
✅ **Smooth Animations** - Framer Motion for professional transitions  
✅ **Mobile Responsive** - Fully optimized for all screen sizes  
✅ **Automatic Persistence** - Game state saved to localStorage  
✅ **Comprehensive Rules** - Built-in guides for all player counts  
✅ **Form Validation** - Complete input validation and error handling  

## Tech Stack

- **React 18** - UI framework
- **Vite 5** - Build tool & dev server
- **Tailwind CSS 3** - Utility-first styling
- **Framer Motion 10** - Animation library
- **Zustand** - Lightweight state management
- **React Icons** - Icon library
- **PostCSS & Autoprefixer** - CSS processing

## Project Structure

```
callbreak/
├── src/
│   ├── components/
│   │   ├── modals/
│   │   │   ├── WinnerModal.jsx       # Game completion modal
│   │   │   ├── EditRoundModal.jsx    # Round editing modal
│   │   │   └── ConfirmDialog.jsx     # Confirmation dialogs
│   │   ├── Navbar.jsx                # Top navigation
│   │   ├── PlayerSetup.jsx           # Initial setup screen
│   │   ├── GameArea.jsx              # Main game container
│   │   ├── RoundTracker.jsx          # Bid/trick input
│   │   ├── BidCard.jsx               # Individual player card
│   │   ├── ScoreBoard.jsx            # Ranking display
│   │   ├── ScoreHistory.jsx          # Score table
│   │   ├── RulesPanel.jsx            # Rules sidebar
│   │   └── ToastContainer.jsx        # Notifications
│   ├── hooks/
│   │   └── useToast.js               # Toast notification system
│   ├── utils/
│   │   └── helpers.js                # Utility functions
│   ├── store.js                      # Zustand state store
│   ├── App.jsx                       # Root component
│   ├── main.jsx                      # React entry point
│   └── index.css                     # Global styles
├── index.html                        # HTML entry
├── package.json                      # Dependencies
├── vite.config.js                    # Vite configuration
├── tailwind.config.js                # Tailwind configuration
├── postcss.config.js                 # PostCSS configuration
├── .gitignore                        # Git ignore rules
└── README.md                         # This file
```

## Installation & Setup

### Prerequisites

- Node.js 16+ or higher
- npm or yarn package manager

### Local Development

1. **Clone or navigate to the project**
   ```bash
   cd callbreak
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   The app will open at `http://localhost:3000`

4. **Build for production**
   ```bash
   npm run build
   ```
   Output in `dist/` folder

5. **Preview production build**
   ```bash
   npm run preview
   ```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel Dashboard](https://vercel.com)
3. Vercel auto-detects Vite configuration
4. Deploy with one click!

```bash
# Or use Vercel CLI
npm i -g vercel
vercel
```

### Netlify

1. Push code to GitHub
2. Connect repo in [Netlify Dashboard](https://netlify.com)
3. Set build command: `npm run build`
4. Set publish directory: `dist`
5. Deploy!

```bash
# Or use Netlify CLI
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

### GitHub Pages

1. Add to `package.json`:
   ```json
   "homepage": "https://yourusername.github.io/callbreak"
   ```

2. Install gh-pages:
   ```bash
   npm install --save-dev gh-pages
   ```

3. Add scripts to `package.json`:
   ```json
   "predeploy": "npm run build",
   "deploy": "gh-pages -d dist"
   ```

4. Deploy:
   ```bash
   npm run deploy
   ```

### Firebase Hosting

1. Install Firebase CLI:
   ```bash
   npm i -g firebase-tools
   ```

2. Initialize Firebase:
   ```bash
   firebase init
   ```
   - Choose Hosting
   - Set public directory to `dist`
   - Configure as single-page app

3. Build and deploy:
   ```bash
   npm run build
   firebase deploy
   ```

## Game Rules

### Objective
Players bid the number of tricks they expect to win each round and earn/lose points based on accuracy.

### Setup
- **2 Players**: 26 cards each (1-13 bid range)
- **3 Players**: 17 cards each (1-8 bid range)
- **4 Players**: 13 cards each (1-13 bid range) - Standard
- **5 Players**: 10 cards each (1-6 bid range)

### Scoring
- **Meet/Exceed Bid**: 1 point per trick bid + 0.1 per overtrick
- **Fall Short**: Lose full bid amount (negative points)

Example: Bid 3, won 4 → +3.1 | Bid 3, won 2 → −3

### Trump Rules
- **Spades are always trump**
- Follow suit if able
- Play trump if can't follow suit
- Can't follow or trump? Play any card

### Winning
Highest total score after all rounds wins!

## Keyboard Shortcuts

- `Tab` - Navigate between inputs
- `Enter` - Submit round (when in last input)
- `Esc` - Close modals
- `?` - Toggle help panel (coming soon)

## State Management

All game state persists via localStorage:
- Current round progress
- Player names and scores
- All round history
- Theme preference

Game automatically restores on page refresh.

## Customization

### Colors & Theme

Edit `tailwind.config.js`:
```javascript
theme: {
  extend: {
    colors: {
      accent: { /* modify colors */ }
    }
  }
}
```

### Animations

Adjust Framer Motion transitions in component files or configure in `index.css`.

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- Optimized bundle (~120KB gzipped)
- Lazy component loading
- Efficient re-renders with Zustand
- Smooth 60fps animations

## Accessibility

- ARIA labels on interactive elements
- Keyboard navigation support
- High contrast dark/light modes
- Screen reader friendly

## Development Tips

### Adding New Features

1. Update Zustand store in `src/store.js`
2. Create component in `src/components/`
3. Add to appropriate parent component
4. Style with Tailwind classes
5. Test theme modes and mobile

### Debugging

Enable Redux DevTools-like store logging:
```javascript
// In store.js
useGameStore.subscribe(
  (state) => console.log('State:', state)
)
```

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch
3. Follow existing code style
4. Submit pull request

## License

MIT License - feel free to use in personal or commercial projects.

## Support

Issues or questions? Please open a GitHub issue with:
- Description of the problem
- Steps to reproduce
- Browser/device info
- Screenshots/video if applicable

## Roadmap

- [ ] Offline PWA support
- [ ] Undo/redo for all actions
- [ ] Multiplayer over network
- [ ] Tournament bracket mode
- [ ] Export game history to CSV
- [ ] Game statistics dashboard
- [ ] Custom player avatars
- [ ] Sound effects and haptics
- [ ] Keyboard shortcuts guide

## Credits

Created as a modern React conversion of the original Call Break scoring app with significant UI/UX enhancements, smooth animations, and production-ready architecture.

---

**Enjoy your game! 🏆**
