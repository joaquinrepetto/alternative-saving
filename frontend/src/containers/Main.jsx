import "antd/dist/antd.css";
import React, { useCallback, useEffect, useState } from "react";
import { Account } from "../components";
import {
  useGasPrice,
  useUserProviderAndSigner,
  useContractLoader,
  useContractReader,
} from "eth-hooks";
import { NETWORKS, ALCHEMY_KEY } from "../constants";
import externalContracts from "../contracts/external_contracts";
import deployedContracts from "../contracts/hardhat_contracts.json";
import { Transactor, Web3ModalSetup } from "../helpers";
import { useStaticJsonRPC, useContractConfig } from "../hooks";

const { ethers } = require("ethers");
const initialNetwork = NETWORKS.localhost; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

const DEBUG = true;
const NETWORKCHECK = true;
const USE_BURNER_WALLET = true; // toggle burner wallet feature
const USE_NETWORK_SELECTOR = false;

const web3Modal = Web3ModalSetup();

// 🛰 providers
const providers = [
  // "https://eth-mainnet.gateway.pokt.network/v1/lb/611156b4a585a20035148406",
  // `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_KEY}`,
  // "https://rpc.scaffoldeth.io:48544",
  `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
];

function Main() {
  const networkOptions = [initialNetwork.name, "mainnet", "rinkeby"];

  const [injectedProvider, setInjectedProvider] = useState();
  const [address, setAddress] = useState("");
  const [newPurpose, setNewPurpose] = useState("");
  const [balance, setBalance] = useState();
  const [selectedNetwork, setSelectedNetwork] = useState(networkOptions[0]);

  const targetNetwork = NETWORKS[selectedNetwork];

  // load all your providers
  const localProvider = useStaticJsonRPC([
    process.env.REACT_APP_PROVIDER
      ? process.env.REACT_APP_PROVIDER
      : targetNetwork.rpcUrl,
  ]);
  const mainnetProvider = useStaticJsonRPC(providers);

  if (DEBUG) console.log(`Using ${selectedNetwork} network`);

  // 🔭 block explorer URL
  const blockExplorer = targetNetwork.blockExplorer;

  const logoutOfWeb3Modal = async () => {
    await web3Modal.clearCachedProvider();
    if (
      injectedProvider &&
      injectedProvider.provider &&
      typeof injectedProvider.provider.disconnect == "function"
    ) {
      await injectedProvider.provider.disconnect();
    }
    setTimeout(() => {
      window.location.reload();
    }, 1);
  };

  const userProviderAndSigner = useUserProviderAndSigner(
    injectedProvider,
    localProvider
  );
  const userSigner = userProviderAndSigner.signer;

  useEffect(() => {
    async function getAddress() {
      if (userSigner) {
        const newAddress = await userSigner.getAddress();
        console.log(`New address: ${newAddress}`);
        setAddress(newAddress);
      }
    }
    getAddress();
  }, [userSigner]);

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork, "fast");

  // The transactor wraps transactions and provides notificiations
  const tx = Transactor(userSigner, gasPrice);

  const contractConfig = useContractConfig();

  // const contractConfig = {
  //   deployedContracts: deployedContracts || {},
  //   externalContracts: externalContracts || {},
  // };

  // Load in your local 📝 contract and read a value from it:
  const readContracts = useContractLoader(localProvider, contractConfig);

  // If you want to make 🔐 write transactions to your contracts, use the userSigner:
  const writeContracts = useContractLoader(userSigner, contractConfig);

  const abi = [
    {
      inputs: [{ internalType: "address", name: "account", type: "address" }],
      name: "balanceOf",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  ];

  const daiContract = new ethers.Contract(
    "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    abi,
    userSigner
  );

  // keep track of a variable from the contract in the local React state:
  const purpose = useContractReader(readContracts, "SavingPool", "purpose");
  console.log(`purpose: ${purpose}, newPurpose: ${newPurpose}`);

  useEffect(() => {
    if (purpose) {
      setNewPurpose(purpose);
    }
  }, [purpose]);

  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new ethers.providers.Web3Provider(provider));

    provider.on("chainChanged", (chainId) => {
      console.log(`chain changed to ${chainId}! updating providers`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    provider.on("accountsChanged", () => {
      console.log(`account changed!`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    // Subscribe to session disconnection
    provider.on("disconnect", (code, reason) => {
      console.log(code, reason);
      logoutOfWeb3Modal();
    });
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  return (
    <div style={{ backgroundColor: "#201D1F", minHeight: "100vh" }}>
      <div
        style={{
          position: "fixed",
          textAlign: "right",
          right: 0,
          top: 0,
          padding: 10,
        }}
      >
        <Account
          address={address}
          localProvider={localProvider}
          userSigner={userSigner}
          mainnetProvider={mainnetProvider}
          web3Modal={web3Modal}
          loadWeb3Modal={loadWeb3Modal}
          logoutOfWeb3Modal={logoutOfWeb3Modal}
          blockExplorer={blockExplorer}
          daiContract={daiContract}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "20%",
        }}
      >
        <h1 style={{ color: "white" }}>
          Proposito:{" "}
          <input
            style={{ color: "black" }}
            value={newPurpose}
            onChange={(e) => setNewPurpose(e.target.value)}
          ></input>
        </h1>
        <button
          onClick={async () => {
            const result = tx(
              writeContracts.SavingPool.setPurpose(newPurpose),
              (update) => {
                console.log("📡 Transaction Update:", update);
                if (
                  update &&
                  (update.status === "confirmed" || update.status === 1)
                ) {
                  console.log(" 🍾 Transaction " + update.hash + " finished!");
                  console.log(
                    " ⛽️ " +
                      update.gasUsed +
                      "/" +
                      (update.gasLimit || update.gas) +
                      " @ " +
                      parseFloat(update.gasPrice) / 1000000000 +
                      " gwei"
                  );
                }
              }
            );
            console.log("awaiting metamask/web3 confirm result...", result);
            console.log(await result);
          }}
        >
          Modificar proposito
        </button>
      </div>
    </div>
  );
}

export default Main;
