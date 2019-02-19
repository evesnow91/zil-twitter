const { Zilliqa } = require("@zilliqa-js/zilliqa");
const { BN, Long, bytes, units } = require("@zilliqa-js/util");
const CP = require("@zilliqa-js/crypto");
const { promisify } = require("util");
const fs = require("fs");

const CHAIN_ID = 333;
const MSG_VERSION = 1;
const VERSION = bytes.pack(CHAIN_ID, MSG_VERSION);

// const zilliqa = new Zilliqa("http://localhost:4200");
const zilliqa = new Zilliqa("https://dev-api.zilliqa.com");

const CONTRACT_PATH = "../scilla/Twitter.scilla";
const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY;
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;

zilliqa.wallet.addByPrivateKey(OWNER_PRIVATE_KEY);
zilliqa.wallet.addByPrivateKey(ORACLE_PRIVATE_KEY);

const ownerAddress = CP.getAddressFromPrivateKey(OWNER_PRIVATE_KEY);
const oracleAddress = CP.getAddressFromPrivateKey(ORACLE_PRIVATE_KEY);
const contractAddress = "0x6ac6e30b8cd822a4ea1985d66a565e25f88f1c04";
const deployedContract = zilliqa.contracts.at(contractAddress);

// const myGasPrice = new BN(units.fromQa(new BN("100"), units.Units.Li));
// const myGasPrice = units.toQa("1000", units.Units.Li);
const myGasPrice = new BN("1000000000");

async function readContractFile(filepath) {
  const readfile = promisify(fs.readFile);
  try {
    const content = await readfile(filepath);
    return content.toString();
  } catch (e) {
    console.error(e);
  }
}

const initParams = [
  {
    vname: "_scilla_version",
    type: "Uint32",
    value: "0"
  },
  {
    vname: "owner",
    type: "ByStr20",
    value: `0x${ownerAddress}`
  },
  {
    vname: "oracle_address",
    type: "ByStr20",
    value: `0x${oracleAddress}`
  },
  {
    vname: "hashtag",
    type: "String",
    value: "#BuiltWithZil"
  }
];

async function deployTestContract() {
  const code = await readContractFile(CONTRACT_PATH);
  const contract = zilliqa.contracts.new(code, initParams);
  try {
    const [deployTx, deployedContract] = await contract.deploy({
      version: VERSION,
      gasPrice: myGasPrice,
      gasLimit: Long.fromNumber(100000)
    });
    console.log(deployTx, deployedContract);
    console.log(deployTx.receipt);
    return deployedContract;
  } catch (e) {
    console.error(e);
  }
}

async function fundAccount(address) {
  const tx = await zilliqa.blockchain.createTransaction(
    zilliqa.transactions.new({
      version: VERSION,
      toAddr: `0x${address}`,
      amount: new BN(units.toQa("50", units.Units.Zil)),
      gasPrice: new BN("2000000000"),
      gasLimit: Long.fromNumber(1)
    })
  );
  console.log("fundAccount", tx.receipt);
  return tx.receipt;
}

async function registerUser(userAddress, username) {
  const tx = await deployedContract.call(
    "register_user",
    [
      {
        vname: "user_address",
        type: "ByStr20",
        value: `0x${userAddress}`
      },
      { vname: "twitter_username", type: "String", value: username }
    ],
    {
      version: VERSION,
      amount: new BN(0),
      gasPrice: new BN("2000000000"),
      gasLimit: Long.fromNumber(1000)
    }
  );
  console.log("registerUser", tx.receipt);
  return tx.receipt;
}

async function getBalance() {
  const balance = await zilliqa.blockchain.getBalance(ownerAddress);
  const minGasPrice = await zilliqa.blockchain.getMinimumGasPrice();
  console.log(balance, minGasPrice);
  return balance;
}

async function main() {
  // const contract = await deployTestContract();
  // await registerUser(contract, oracleAddress, "kenchangh");
  // await fundAccount(oracleAddress);
}
main();

module.exports = { fundAccount, registerUser };
