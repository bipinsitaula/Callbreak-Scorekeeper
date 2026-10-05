# Call Break Scorekeeper

A premium, production-ready Call Break card game scorekeeper built with **React**, **Vite**, **Tailwind CSS**, and **Framer Motion**.

## Overview

Call Break Scorekeeper is a modern, fully-featured companion app for tracking bids, tricks, and scores in the Call Break (Lakdi) card game. It features a sleek dark/light theme, smooth animations, persistent storage, and complete rule guides.

### Key Features

✅ **Two-step rounds** - Lock bids first, then enter tricks; live "tricks assigned" counter and score preview
✅ **Tie-aware rankings** - Shared ranks and shared wins
✅ **Exact scoring** - Scores stored as integer tenths, no floating-point drift
✅ **Dealer rotation** - Shows who deals and who bids first
✅ **Insights** - Score-progression chart and bidding accuracy stats
✅ **Export** - CSV download and shareable results image
✅ **Past games** - Finished games are archived automatically
✅ **Installable & offline** - PWA with service worker (production build)
✅ **Safe persistence** - Saved data is validated; old v1 saves are migrated; in-progress bids survive refreshes
✅ **Mobile first** - Large tap targets, numeric keypad, sticky action bar
✅ **Accessible** - Focus-trapped dialogs, Esc to close, live-region toasts, reduced-motion support
✅ **Dark/Light theme** - Follows the OS by default

## Card Table: two games

The app opens on a Home hub with two games.

- **Call Break** - a scorekeeper for a physical deck (everything described above).
- **Blackjack** - a playable table against the dealer with play-money chips.
  - Hit, stand, double, split, insurance (2:1, when the dealer shows an ace) and late surrender (half the bet back); blackjack pays 3:2; the dealer stands on all 17s.
  - Cards come from a 6-deck shoe shuffled with `crypto.getRandomValues` and a Fisher-Yates shuffle with rejection sampling (no modulo bias), then reshuffled when about 75% is dealt.
  - "Get a hint" suggests the basic-strategy move; shortcuts: H hit, S stand, D double, P split, R surrender, Enter deal / next hand.
  - Chips, stats and recent hands are saved on the device. A hand left unfinished by refreshing counts as lost.
  - Logic lives in `src/blackjack/engine.js` (pure, unit-tested) and `src/blackjack/store.js`.

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
│   │   │   ├── WinnerModal.jsx       # Game completion modal (ties, export)
│   │   │   ├── EditRoundModal.jsx    # Round editing modal
│   │   │   └── ConfirmDialog.jsx     # Confirmation dialogs
│   │   ├── Navbar.jsx                # Top navigation
│   │   ├── PlayerSetup.jsx           # Initial setup screen
│   │   ├── GameArea.jsx              # Main game container
│   │   ├── RoundTracker.jsx          # Bid/trick input
│   │   ├── BidCard.jsx               # Per-player bid/tricks card
│   │   ├── NumberPicker.jsx          # Stepper + quick-pick chips
│   │   ├── Modal.jsx                 # Accessible dialog/drawer shell
│   │   ├── InsightsPanel.jsx         # Score chart + stats
│   │   ├── HistoryPanel.jsx          # Past games
│   │   ├── ExportButtons.jsx         # CSV / share image
│   │   ├── ScoreBoard.jsx            # Ranking display
│   │   ├── ScoreHistory.jsx          # Score table
│   │   ├── RulesPanel.jsx            # Rules sidebar
│   │   └── ToastContainer.jsx        # Notifications
│   ├── hooks/
│   │   └── useToast.js               # Toast notification system
│   ├── utils/
│   │   ├── helpers.js                # Pure game logic (scoring, ranking, validation)
│   │   ├── storage.js                # Validated persistence + migration
│   │   └── export.js                 # CSV and image export
│   ├── store.js                      # Zustand state store
│   ├── App.jsx                       # Root component
│   ├── main.jsx                      # React entry point
│   └── index.css                     # Global styles
├── index.html                        # HTML entry
├── package.json                      # Dependencies
├── vite.config.js                    # Vite + Vitest configuration
├── public/                           # PWA manifest, icon, service worker
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

5. **Run the tests**
   ```bash
   npm test
   ```

6. **Preview production build**
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
- **2 Players**: 26 cards each (bids 1-13)
- **3 Players**: 17 cards each (bids 1-13)
- **4 Players**: 13 cards each (bids 1-13) - Standard
- **5 Players**: 10 cards each (bids 1-10)

Bids are capped at 13. Tricks won in a round must total the cards dealt. Traditional Call Break is 5 rounds.

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

- `?` - Open the rules guide
- `Esc` - Close dialogs
- `Tab` - Navigate between fields

## State Management

All game state persists via localStorage:
- Current round progress
- Player names and scores
- All round history
- Theme preference

Bids and tricks for the round in progress are saved too. Finished games are archived to a history list. Corrupt or outdated saves are validated and ignored/migrated instead of crashing the app.

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

- Small bundle (~100KB gzipped JS)
- Selector-based Zustand subscriptions
- Works offline after the first load (service worker, production builds)

## Accessibility

- Labelled controls, live-region toasts, focus-trapped dialogs
- Full keyboard navigation, visible focus rings
- Respects prefers-reduced-motion
- Score chart has a text alternative and a stats table

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

- [x] Offline PWA support
- [x] Export game history to CSV
- [x] Game statistics dashboard
- [ ] Multiplayer over network
- [ ] Tournament bracket mode
- [ ] Custom player avatars
- [ ] Sound effects and haptics

## Credits

Created as a modern React conversion of the original Call Break scoring app with significant UI/UX enhancements, smooth animations, and production-ready architecture.

---

**Enjoy your game! 🏆**
