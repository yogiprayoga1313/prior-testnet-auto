# Prior Protocol Bot

A Node.js bot for interacting with the Prior Protocol API.

## Features

- Multi-wallet support (single or multiple accounts)
- Automatic faucet claiming
- PRIOR token swapping
- Balance checking
- Transaction tracking
- Points monitoring

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with one of the following configurations:

### Single Wallet Configuration
```
WALLET_ADDRESS=your_wallet_address
PRIVATE_KEY=your_private_key
```

### Multiple Wallets Configuration
```
WALLETS=[{"address":"wallet_address_1","privateKey":"private_key_1"},{"address":"wallet_address_2","privateKey":"private_key_2"}]
```

Note: For multiple wallets, the JSON must be in a single line without spaces or line breaks.

## Usage

Run the bot:
```bash
node index.js
```

The bot will:
1. Initialize all configured wallets
2. Check PRIOR token balance
3. Claim faucet if needed
4. Perform configured number of swaps
5. Display transaction details and points earned

## Configuration

The bot supports the following environment variables:
- `WALLET_ADDRESS` - Single wallet address (for single wallet mode)
- `PRIVATE_KEY` - Single wallet private key (for single wallet mode)
- `WALLETS` - JSON array of wallet configurations (for multi-wallet mode)
- `SWAP_AMOUNT` - Amount to swap in each transaction (default: 0.05)
- `SWAP_COUNT` - Number of swaps to perform per wallet (default: 5)

## API Endpoints

- POST `/auth` - Connect wallet
- POST `/faucet/claim` - Claim PRIOR tokens
- POST `/swap` - Perform token swap
- GET `/users/:address` - Get user data

## Dependencies

- axios
- dotenv
- ethers 