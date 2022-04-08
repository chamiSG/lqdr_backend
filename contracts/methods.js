const Web3 = require('web3')
const dotenv = require('dotenv');
const HDWalletProvider = require("truffle-hdwallet-provider");
const chefABI = require('./MasterChefV2.json');

dotenv.config();

const provider = new HDWalletProvider(
  process.env.PRIVATE_KEY,
  process.env.RPC_URL
);

const web3 = new Web3(provider);


module.exports = { };
