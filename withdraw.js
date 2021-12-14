const { ethers } = require("ethers");
const abi = require('./abi.json');
const routerAbi = require('./router.json');
const BigNumber = require('bignumber.js');
const axios = require('axios');
const moment = require('moment');

// DOT-BNB PAIR
// this night balance: 254busd
// TO CHANGE
const WITHDRAW_TRESHOLD = 30; // minimo para ejecutar
const SHITCOIN_TOKEN = '0xb9Fcb5B2935D57A8568B6309b3093200482C448D'; // superlion
const SHITCOIN_TOKEN_X = 'b9fcb5b2935d57a8568b6309b3093200482c448d'; // superlion (direccion token minuscula y sin 0x del principio)
const SWAPTO_TOKEN = "e9e7cea3dedca5984780bafc599bd69add087d56"; // BUSD  (direccion token de venta minuscula, y sin la 0x del principio)
const MF_ADDRESS = "0x5d741FdD5B86183dd02814ba8B0ddB8e2F6a2580"; //superlion (direccion masterchef)
//const MY_POOL = 10; //dot-bnb
const MY_POOL = 25; //mlion-slion
const MAX_SLIPAGGE = 35;

// DONT CHANGE
const PANCAKE_API = "https://api.pancakeswap.info/api/v2/tokens";
const ROUTER_ADDRESS = "0x10ED43C718714eb63d5aA57B78B54704E256024E";

var customHttpProvider = new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
wallet = new ethers.Wallet('private wallet key here!', customHttpProvider);

const mf = new ethers.Contract(MF_ADDRESS, abi,customHttpProvider)
const router = new ethers.Contract(ROUTER_ADDRESS, routerAbi, customHttpProvider)

const mfWithSigner = mf.connect(wallet);
const routerWithSigner = router.connect(wallet);

const options = { gasPrice: 6000000000, gasLimit: 350952}; // curently 0.5$ jeez ! !!! GAS !!

// SESSION STATS
let soldTokens = new BigNumber(0);
let busdGain = new BigNumber(0);


async function findMyPool() {
    for (let i=0; i<100; i++) {
        let pendingGains = await mf.pendingSlion(i, wallet.address); 
        pendingGains = new BigNumber(pendingGains.toString())   
        console.log(`${pendingGains.toNumber()} | ${i}`)
    }
}

async function main() {
    let pendingGains = await mf.pendingSlion(MY_POOL, wallet.address); 
    pendingGains = new BigNumber(pendingGains.toString())   
    
    const prices = await axios.get(PANCAKE_API);
    const currentPrice = prices.data.data[SHITCOIN_TOKEN];
    
    let dividedAmount = pendingGains.dividedBy("1000000000000000000");
    const value = dividedAmount.multipliedBy(new BigNumber(currentPrice.price));
    
    
    // NOT ENOUGH MONEY BIATCH
    if (value.toNumber() < WITHDRAW_TRESHOLD) {
        return;
    }

    try {
        let withdrawTx = await mfWithSigner.withdraw(MY_POOL, 0, options);
        if (withdrawTx.hash == undefined) {
            return;
        } 
        console.log(withdrawTx);
    } catch(e) {}
    
    let valueWSlippage = value.minus(value.multipliedBy(MAX_SLIPAGGE/100)).precision(4);
    valueWSlippageEthBase = valueWSlippage.multipliedBy(new BigNumber("1000000000000000000"));
    
    const deadline = moment().add(25, 'seconds').unix();
    try {
        const swapTx = await routerWithSigner.swapExactTokensForTokens(pendingGains.toString(), valueWSlippageEthBase.toString(), [
            SHITCOIN_TOKEN_X.toLowerCase(),
            SWAPTO_TOKEN.toLowerCase()
        ], wallet.address, deadline, options);
        console.log(swapTx);
        if (swapTx.hash == undefined){ 
            return;
        }
        //console.log(swapTx)
    } catch(e) {};
    
    
    soldTokens = new BigNumber(dividedAmount).plus(soldTokens);
    busdGain = new BigNumber(busdGain).plus(valueWSlippage);

    console.log(`Tokens sold: ${soldTokens.toString()} | USD Profit: ${busdGain}`);
}



setInterval(main, 60000);
//findMyPool();

