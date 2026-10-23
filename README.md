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

## Card Table: three games

The app opens on a Home hub with three games.

- **Call Break** - a scorekeeper for a physical deck (everything described above).
- **Call Break online** - the real game played on screen, each player on their own device.
  - One player creates a room and shares the 5-letter code (or an invite link, `?room=CODE`); the others join by typing their name and the code. 2 to 5 players, 4 is the classic game; the host picks 1, 3, 5, 7 or 10 rounds.
  - Every deal opens with a riffle-shuffle animation, then the cards are dealt one at a time clockwise from the dealer's left. Bids and cards are entered on screen, and finished tricks fly to their winner.
  - Rules are enforced: follow suit and beat the winning card if you can; with no card of the led suit you must play a spade, over-trumping if you can. Spades are trump; scoring is the same as the scorekeeper.
  - Refreshing, or rejoining from another device with the same code and name, puts you back in your seat.
  - In the waiting room the host can switch any empty seat to a bot (and back), and close the room so no one new can join. Bots bid and play on their own; the host's browser makes their moves (or the first player online, if the host is away).
  - Logic lives in `src/online/engine.js` (pure, unit-tested); `src/online/room.js` talks to Supabase.
- **Blackjack** - a playable table against the dealer with play-money chips.
  - Hit, stand, double, split, insurance (2:1, when the dealer shows an ace) and late surrender (half the bet back); blackjack pays 3:2; the dealer stands on all 17s.
  - Cards come from a 6-deck shoe shuffled with `crypto.getRandomValues` and a Fisher-Yates shuffle with rejection sampling (no modulo bias), then reshuffled when about 75% is dealt.
  - "Get a hint" suggests the basic-strategy move; shortcuts: H hit, S stand, D double, P split, R surrender, Enter deal / next hand.
  - Chips, stats and recent hands are saved on the device. A hand left unfinished by refreshing counts as lost.
  - Logic lives in `src/blackjack/engine.js` (pure, unit-tested) and `src/blackjack/store.js`.

- **Teen Patti online** - 3-card betting game in the same online section (2 to 6 players, play chips).
  - 1,000 chips each, boot 10. Bet blind (the stake) or seen (double); chaal, raise (doubles the stake, capped at 8 x boot), pack, show (two players left; the asker loses a tie) or all in when short (every hand left is shown).
  - Rankings: trail, pure sequence, sequence, color, pair, high card; A-K-Q is the top sequence and A-2-3 second.
  - The host picks 5, 10, 20 or 30 hands; most chips at the end wins. Rooms, chat, bots, accounts and history are shared with Call Break.
  - Rules live in `src/online/teenpatti.js` (pure, unit-tested); per-game settings are in `src/online/games.js`. Run `supabase/migrations/20261023000000_teen_patti.sql` to store Teen Patti history.

- **Jut Patti online** - pairing game with 7 cards in the same online section (2 to 4 players).
  - Draw from the stock or the discard pile, then discard. Three pairs plus one spare card wins the round; the card one rank above the turned-up card is a joker that pairs with anything.
  - The round winner scores 10 and everyone else loses a point per unpaired card; the host picks 3, 5, 7 or 10 rounds. Rooms, chat, bots, accounts and history are shared with the other online games.
  - Rules live in `src/online/juttpatti.js` (pure, unit-tested); per-game settings are in `src/online/games.js`. Run `supabase/migrations/20261024000000_jut_patti.sql` to store Jut Patti history.

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

5. **Online play (Supabase)**
   - Create a Supabase project and run the files in `supabase/migrations/` in order in its SQL editor (or `supabase db push` with the CLI). `20261020000000_callbreak_rooms.sql` creates the `callbreak_rooms` table; `20261021000000_callbreak_messages.sql` adds table chat (`callbreak_messages`, which only seated players can post to). Both set up row-level security and realtime.
   - `20261022000000_accounts_and_history.sql` adds accounts and history (`callbreak_games`). Online play needs a username and password: in Supabase go to Authentication > Sign In / Providers > Email and turn **off** "Confirm email". Usernames are stored as placeholder addresses (`name@players.example.com`) and no email is ever sent; set `VITE_USERNAME_EMAIL_DOMAIN` to use a different domain.
   - Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Project Settings > API), then restart `npm run dev`. Set the same two variables on your host (Vercel, Netlify…) for production builds.
   - Players join without signing in, so anyone who has a room's code can read that room's row, including the other hands. The app only ever shows you your own cards, which is fine for games among friends but is not cheat-proof.

6. **Run the tests**
   ```bash
   npm test
   ```

7. **Preview production build**
   ```bash
   npm run preview
   ```

## Deployment

Every screen has its own URL (`/online/callbreak/ABCDE`, `/blackjack`, `/settings`, ...), so the host must serve `index.html` for paths that aren't files. `vercel.json` (Vercel) and `public/_redirects` (Netlify) already do this; `npm run dev` and `npm run preview` do it out of the box. On other hosts, add the equivalent "single-page app" fallback rule.

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
- [x] Multiplayer over network (online Call Break)
- [ ] Tournament bracket mode
- [ ] Custom player avatars
- [ ] Sound effects and haptics

## Credits

Created as a modern React conversion of the original Call Break scoring app with significant UI/UX enhancements, smooth animations, and production-ready architecture.

---

**Enjoy your game! 🏆**
