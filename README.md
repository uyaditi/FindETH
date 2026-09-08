# 🗝️ Internet Treasure Hunts

> **Turn the internet into a treasure map.**

Internet Treasure Hunts is a Web3 platform where individuals and businesses can create interactive treasure hunts — with ETH prizes, NFT trophies, AI-generated clues, and provably fair winner selection.

---

## What is it?

The internet is full of content: product pages, blogs, brand stories, and social media. Most of it is passively consumed. Internet Treasure Hunts turns that content into a game.

**For players:** Discover clues hidden across websites and content. Solve the mystery. Win ETH and a Treasure NFT.

**For creators:** Design your own hunt manually or use AI to generate one around your brand.

**For businesses:** Let AI analyse your website and generate a complete hunt campaign — with exact instructions for where to place each clue on your actual pages.

---

## Problem

Businesses have valuable websites, products, and digital spaces. Most digital marketing is passive: ads, emails, social posts. There is no engagement layer that turns existing content into something interactive and rewarding.

## Solution

Internet Treasure Hunts turns those spaces into interactive treasure hunts — secured by Ethereum, powered by AI, and made fair by Chainlink VRF.

---

## Architecture

```
                    INTERNET TREASURE HUNTS

                         ┌───────────┐
                         │    AI     │
                         │ Hunt      │
                         │ Designer  │
                         └─────┬─────┘
                               │
                    Business Content
                               │
                               ▼
                        Generated Hunt
                               │
                               ▼
                     ┌─────────────────┐
                     │ TreasureHunt.sol│
                     └───────┬─────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
        ENS              Chainlink          Ethereum
      Identity              VRF              Rewards
          │                  │                  │
          └──────────────────┼──────────────────┘
                             ▼
                        The Graph
                             │
                ┌────────────┼────────────┐
                ▼            ▼            ▼
             Explore     Leaderboard   Analytics
```

### Technology roles

| Technology | Role |
|---|---|
| **AI** | Creates and personalises the hunt. Analyses business content, generates clues, provides exact placement instructions. |
| **Ethereum** | Owns and rewards the experience. Prize is locked in a smart contract and paid automatically. |
| **Chainlink VRF** | Makes winner selection provably fair. No `block.timestamp`, no pseudo-randomness. |
| **ENS** | Identity layer. Creator and winner names resolve to human-readable `.eth` names. |
| **The Graph** | Makes the ecosystem searchable and measurable. Powers Explore, Leaderboard, and Analytics. |

---

## Features

### Hunt Creation
- **Manual Wizard** — 5-step wizard: title/story → clues → reward → answer → review & publish
- **AI Creator** — Enter your business URL, campaign goal, and content channels. AI generates a complete hunt with exact clue placement instructions for your website.
- **Business Branding** — Custom logo, accent colours, hunt URL, campaign name

### Gameplay
- **Race Mode** — First correct solver wins immediately. Contract prevents a second winner.
- **Mystery Draw** — All correct solvers enter. Chainlink VRF selects the winner. Verifiable, tamper-proof.
- **Sequential Clues** — Players progress through clues in order. Each clue points to a real web location.

### Web3
- **Answer Security** — Only `keccak256(normalise(answer))` is stored on-chain. Plaintext never leaves the client.
- **ETH Prize** — Locked in the smart contract. Paid automatically to the winner (minus 2.5% platform fee).
- **Treasure NFT** — ERC-721 with fully on-chain SVG metadata. Minted only to the winner.
- **ENS Identity** — Creator and winner `.eth` names displayed throughout the platform.

### Business / SaaS
- **AI Hunt Pipeline** — Content discovery → extraction → clue generation → location mapping → quality check → creator review → publish
- **Placement Instructions** — Every AI clue includes the exact page, section, reason, and merchant action
- **Campaign Analytics** — Participants, completion rate, correct solvers, prize distributed
- **Plans** — Free, Hosted, AI Personalised, Enterprise/White-label

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity 0.8.24, Foundry, OpenZeppelin |
| VRF | Chainlink VRF v2 |
| NFT | ERC-721, on-chain SVG metadata |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Wallet | wagmi v2, viem, RainbowKit |
| ENS | ensjs v4 (mainnet resolution) |
| Indexing | The Graph (AssemblyScript mappings) |
| AI | Configurable backend (OpenAI/Anthropic); demo pipeline built-in |
| State | Zustand, TanStack Query |
| Animations | Framer Motion |

---

## Project Structure

```
internet-treasure-hunts/
│
├── contracts/                   # Foundry project
│   ├── src/
│   │   ├── TreasureHunt.sol     # Core hunt contract
│   │   └── TreasureNFT.sol      # ERC-721 trophy
│   ├── test/
│   │   ├── TreasureHuntTest.t.sol
│   │   └── mocks/
│   │       └── MockVRFCoordinator.sol
│   ├── script/
│   │   ├── Deploy.s.sol
│   │   └── SeedLocal.s.sol
│   └── foundry.toml
│
├── frontend/                    # React/Vite app
│   └── src/
│       ├── components/
│       │   ├── layout/          # Navbar, Footer, Layout
│       │   └── ui/              # HuntCard, TxButton, AddressDisplay...
│       ├── pages/               # All route pages
│       ├── hooks/               # useHunt, useHuntActions, useENS...
│       ├── services/            # ens.ts, graph.ts, ai.ts
│       ├── contracts/           # ABIs + addresses
│       ├── data/                # Demo hunts
│       ├── lib/                 # utils, constants, answerHash, wagmi
│       ├── store/               # Zustand stores
│       └── types/               # TypeScript types
│
├── subgraph/                    # The Graph subgraph
│   ├── schema.graphql
│   ├── subgraph.yaml
│   ├── src/mapping.ts
│   └── abis/
│
├── .env.example
└── README.md
```

---

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`curl -L https://foundry.paradigm.xyz | bash`)
- [Git](https://git-scm.com/)

### 1. Clone and install

```bash
git clone https://github.com/yourname/internet-treasure-hunts
cd internet-treasure-hunts
npm install
```

### 2. Install Foundry dependencies

```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts
forge install smartcontractkit/chainlink
cd ..
```

### 3. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

### 4. Start local blockchain (Anvil)

```bash
# In a separate terminal
anvil
```

### 5. Deploy contracts

```bash
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url http://localhost:8545 \
  --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

Copy the deployed addresses from `contracts/deployment.json` into your `.env.local`:
```
VITE_TREASURE_HUNT_CONTRACT=0x...
VITE_TREASURE_NFT_CONTRACT=0x...
```

### 6. Seed demo hunts (optional)

```bash
cd contracts
forge script script/SeedLocal.s.sol \
  --rpc-url http://localhost:8545 \
  --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### 7. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Run Contract Tests

```bash
cd contracts
forge test -vv
```

Expected output: all 30+ tests passing including Race, MysteryDraw, VRF, NFT, security, and fuzz tests.

---

## Sepolia Deployment

### 1. Configure Sepolia environment

```
SEPOLIA_RPC_URL=https://rpc.sepolia.org
PRIVATE_KEY=0x...
VRF_COORDINATOR=0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625
VRF_KEY_HASH=0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c
VRF_SUBSCRIPTION_ID=<your Chainlink subscription ID>
ETHERSCAN_API_KEY=<your key>
```

Get test ETH at [sepoliafaucet.com](https://sepoliafaucet.com).

Create a Chainlink VRF subscription at [vrf.chain.link](https://vrf.chain.link).

### 2. Deploy

```bash
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

### 3. Fund VRF subscription

Add your deployed `TreasureHunt` contract as a VRF consumer in the Chainlink dashboard and fund the subscription with LINK.

### 4. Deploy subgraph

```bash
cd subgraph
npm install

# Update subgraph.yaml with your deployed contract address + startBlock
# Then:
graph auth --studio $GRAPH_DEPLOY_KEY
graph codegen && graph build
graph deploy --studio internet-treasure-hunts
```

Update `VITE_SUBGRAPH_URL` in your environment with the Studio query URL.

### 5. Update frontend for Sepolia

```
VITE_CHAIN_ID=11155111
VITE_RPC_URL=https://rpc.sepolia.org
VITE_TREASURE_HUNT_CONTRACT=0x<deployed>
VITE_TREASURE_NFT_CONTRACT=0x<deployed>
VITE_SUBGRAPH_URL=https://api.studio.thegraph.com/query/.../internet-treasure-hunts/v0.0.1
```

---

## Demo Hunts

Three demo hunts are pre-seeded for the frontend:

| Hunt | Type | Difficulty | Prize |
|---|---|---|---|
| The Lost Ethereum | Race | Medium | 0.05 ETH |
| The Mystery of the Golden Block | Mystery Draw | Hard | 0.10 ETH |
| Linen & Co. — The Summer Secret | Mystery Draw | Easy | 0.05 ETH |

The third hunt demonstrates the full AI business use case — clues are placed across fictional product pages with exact merchant placement instructions.

---

## Hackathon Demo Flow

```
1. Open Internet Treasure Hunts
2. Click: CREATE WITH AI
3. Enter: Linen & Co. / https://example.com
4. Select: Summer Linen Collection campaign
5. Select: Website + Product Pages
6. Select: Mystery Draw / 0.05 ETH
7. Click: GENERATE HUNT
8. AI generates 5 clues with exact placement instructions
9. Creator reviews each clue, edits if needed
10. Creator approves and clicks: FUND & PUBLISH HUNT
11. Wallet confirms transaction → Hunt is live
12. Open player view → solve clues
13. Multiple players become eligible
14. Creator closes hunt → Chainlink VRF requested
15. VRF callback → winner selected
16. Winner receives ETH + Treasure NFT
17. Open Business Dashboard → The Graph shows analytics
```

---

## Smart Contract Security

The contracts follow secure Solidity practices:

- `ReentrancyGuard` on all state-changing functions
- `checks-effects-interactions` pattern throughout
- Answer stored as `keccak256` hash — plaintext never on-chain
- Chainlink VRF for randomness — no `block.timestamp` or `blockhash`
- Platform fee capped at 10% via `FeeTooHigh` guard
- `Pausable` for emergency stops
- Hunt can only be solved once (Race) or closed once (Mystery Draw)
- Cancel only possible with zero correct solvers

---

## AI Integration Note

The AI generation service (`frontend/src/services/ai.ts`) has two paths:

1. **Real API** — When `VITE_AI_API` is set, it calls your backend which can use OpenAI, Anthropic, or any LLM.
2. **Demo pipeline** — When `VITE_AI_API` is not set, a built-in simulation runs the full pipeline with realistic, contextual output. This is clearly labelled in the UI.

The AI is never given authority to publish. The creator must review and approve every clue before the smart contract transaction is sent.

---

## Monetisation Architecture

Platform fees are cleanly separated from hunt prizes:

- **Hunt prize** — ETH locked in `TreasureHunt.sol`, paid to the winner
- **Platform fee** — 2.5% deducted from prize at settlement, sent to `feeRecipient`
- **Plan fees** — Application-layer subscriptions (not in smart contracts)

This separation ensures players always know exactly what they're playing for.

---

## License

MIT
