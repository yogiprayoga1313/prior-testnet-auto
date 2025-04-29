require('dotenv').config();
const axios = require('axios');
const { ethers } = require('ethers');

const API_BASE_URL = 'https://priortestnet.xyz/api';
const SWAP_AMOUNT = '0.05';
const SWAP_COUNT = 5;
const PRIOR_CONTRACT = '0xefc91c5a51e8533282486fa2601dffe0a0b16edb';
const MIN_PRIOR_BALANCE = '0.25'; // Minimum balance needed for 5 swaps of 0.05 each

// Function to parse wallet configuration from .env
function parseWalletConfig() {
    try {
        // Check if WALLETS array is defined (multi-account format)
        if (process.env.WALLETS) {
            return JSON.parse(process.env.WALLETS);
        }
        
        // Check if single wallet format is used
        if (process.env.WALLET_ADDRESS && process.env.PRIVATE_KEY) {
            return [{
                address: process.env.WALLET_ADDRESS,
                privateKey: process.env.PRIVATE_KEY
            }];
        }
        
        throw new Error('No wallet configuration found in .env file');
    } catch (error) {
        console.error('Error parsing wallet configuration:', error.message);
        throw error;
    }
}

// Get wallet configuration
const WALLETS = parseWalletConfig();

// Common headers for all requests
const headers = {
    'accept': '*/*',
    'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'content-type': 'application/json',
    'dnt': '1',
    'origin': 'https://priortestnet.xyz',
    'priority': 'u=1, i',
    'referer': 'https://priortestnet.xyz/',
    'sec-ch-ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
};

// Initialize provider
const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');

// Function to initialize wallet
function initializeWallet(privateKey) {
    try {
        const wallet = new ethers.Wallet(privateKey, provider);
        console.log('Wallet initialized successfully');
        console.log('Wallet Address:', wallet.address);
        return wallet;
    } catch (error) {
        console.error('Error initializing wallet:', error.message);
        throw error;
    }
}

// Function to check PRIOR balance
async function checkPriorBalance(walletAddress) {
    try {
        console.log('Checking PRIOR balance for wallet:', walletAddress);
        const priorContract = new ethers.Contract(
            PRIOR_CONTRACT,
            ['function balanceOf(address) view returns (uint256)'],
            provider
        );
        
        const balance = await priorContract.balanceOf(walletAddress);
        const formattedBalance = ethers.formatUnits(balance, 18);
        console.log('PRIOR Balance:', formattedBalance);
        
        return parseFloat(formattedBalance) >= parseFloat(MIN_PRIOR_BALANCE);
    } catch (error) {
        console.error('Error checking PRIOR balance:', error.message);
        throw error;
    }
}

// Function to connect wallet
async function connectWallet(walletAddress) {
    try {
        console.log('Connecting wallet:', walletAddress);
        const response = await axios.post(`${API_BASE_URL}/auth`,
            { address: walletAddress },
            { headers }
        );
        console.log('Wallet connected successfully');
        return response.data;
    } catch (error) {
        console.error('Error connecting wallet:', error.message);
        throw error;
    }
}

// Function to claim faucet
async function claimFaucet(walletAddress) {
    try {
        console.log('Claiming faucet for wallet:', walletAddress);
        const response = await axios.post(`${API_BASE_URL}/faucet/claim`,
            { address: walletAddress },
            { headers }
        );
        console.log('Faucet claimed successfully');
        return true;
    } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.message?.includes('24 hours')) {
            console.log(`Cannot claim faucet yet. Time remaining: ${error.response.data.timeRemaining} hours`);
            // Check if we have enough PRIOR balance to continue
            const hasSufficientBalance = await checkPriorBalance(walletAddress);
            if (hasSufficientBalance) {
                console.log('But we have sufficient PRIOR balance to continue with swaps');
                return true;
            }
            return false;
        }
        console.error('Error claiming faucet:', error.message);
        throw error;
    }
}

// Function to display transaction details
function displayTransactionDetails(data) {
    console.log('\n=== Transaction Details ===');
    console.log('Transaction ID:', data.transaction.id);
    console.log('Type:', data.transaction.type);
    console.log('Amount:', data.transaction.amount, data.transaction.tokenFrom, 'to', data.transaction.tokenTo);
    console.log('Points Earned:', data.pointsEarned);
    console.log('Status:', data.transaction.status);
    console.log('Timestamp:', new Date(data.transaction.timestamp).toLocaleString());
    console.log('TX Hash:', data.transaction.txHash);
    
    console.log('\n=== User Stats ===');
    console.log('User ID:', data.user.id);
    console.log('Address:', data.user.address);
    console.log('Total Points:', data.user.totalPoints);
    console.log('Daily Points:', data.user.dailyPoints);
    console.log('Last Faucet Claim:', data.user.lastFaucetClaim ? new Date(data.user.lastFaucetClaim).toLocaleString() : 'Never');
    console.log('========================\n');
}

// Function to display summary
function displaySummary(swapResults) {
    const totalPoints = swapResults.reduce((sum, result) => sum + result.pointsEarned, 0);
    const lastUserStats = swapResults[swapResults.length - 1].user;
    
    console.log('\n====== Summary ======');
    console.log('Total Swaps Completed:', swapResults.length);
    console.log('Total Points Earned:', totalPoints);
    console.log('Final Total Points:', lastUserStats.totalPoints);
    console.log('Final Daily Points:', lastUserStats.dailyPoints);
    console.log('===================\n');
}

// Function to process single wallet
async function processWallet(walletData) {
    try {
        console.log('\n=== Processing Wallet ===');
        console.log('Address:', walletData.address);
        
        // Initialize wallet
        const wallet = initializeWallet(walletData.privateKey);
        
        // Connect wallet
        await connectWallet(wallet.address);
        
        // Check balance and claim faucet if needed
        const hasSufficientBalance = await checkPriorBalance(wallet.address);
        let canProceed = hasSufficientBalance;
        if (!hasSufficientBalance) {
            canProceed = await claimFaucet(wallet.address);
        }
        
        // Perform swaps if possible
        if (canProceed) {
            // Perform multiple swaps
            for (let i = 0; i < SWAP_COUNT; i++) {
                await performSwap(wallet.address);
                // Add delay between swaps
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        
        // Add delay between wallets
        await new Promise(resolve => setTimeout(resolve, 10000));
        
    } catch (error) {
        console.error('Error processing wallet:', error);
    }
}

// Function to perform swap
async function performSwap(walletAddress) {
    try {
        // Get current block number
        const blockNumber = await provider.getBlockNumber();
        
        // Generate random transaction hash for testing
        const txHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
        
        console.log('Performing swap for wallet:', walletAddress);
        const response = await axios.post(`${API_BASE_URL}/swap`,
            {
                address: walletAddress,
                amount: SWAP_AMOUNT,
                tokenFrom: "PRIOR",
                tokenTo: "USDC",
                txHash: txHash
            },
            { headers }
        );
        console.log('Swap completed successfully');
        displayTransactionDetails(response.data);
        return response.data;
    } catch (error) {
        if (error.response?.status === 429) {
            const retryAfter = error.response.data.retryAfter || 2;
            console.log(`Rate limit hit. Waiting ${retryAfter} seconds before retrying...`);
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            return performSwap(walletAddress); // Retry the swap
        }
        console.error('Error performing swap:', error.message);
        throw error;
    }
}

// Main function to run the bot
async function runBot() {
    try {
        if (WALLETS.length === 0) {
            throw new Error('No wallets configured in .env file');
        }
        
        console.log(`Starting bot with ${WALLETS.length} wallets...`);
        
        // Process each wallet
        for (let i = 0; i < WALLETS.length; i++) {
            console.log(`\nProcessing wallet ${i + 1}/${WALLETS.length}`);
            await processWallet(WALLETS[i]);
        }
        
        console.log('\nAll wallets processed successfully');
    } catch (error) {
        console.error('Bot error:', error);
    }
}

// Run the bot
runBot(); 