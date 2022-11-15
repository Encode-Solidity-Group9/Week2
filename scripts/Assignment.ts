import { ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Ballot, Ballot__factory } from "../typechain-types";
import * as dotenv from 'dotenv'
import { BigNumber, Wallet } from "ethers";
import { Provider } from "@ethersproject/providers";

dotenv.config()

async function main() {
    // Usage: yarn run ts-node --files .\scripts\Deployment.ts "Raspberry" "Vanilla" "Pistacchio"

    const localDeploy = true;
    const numberOfWallets = 2;

    let accounts: Wallet[] = [];
    let provider: Provider;
    let balance: BigNumber;
    let balanceInEth: string;
    let minimumRequiredBalance= 0.01;

    provider = ethers.provider;
    if (!localDeploy) {
        console.log("Using Goerli network");
        provider = ethers.getDefaultProvider("goerli", {
            infura: process.env.INFURA_API_KEY,
            alchemy: process.env.ALCHEMY_API_KEY,
            etherscan: process.env.ETHERSCAN_API_KEY,
        });
        console.log("potato");
        return;
    }
    else {
        console.log("Using local network");
    }

    if (numberOfWallets < 2) throw new Error("Number of wallets if not enough to run the script");   
    
    console.log("Loading multiple accounts from mnemonic\n");
    for (let index = 0; index < numberOfWallets; index++) {
        let account = ethers.Wallet.fromMnemonic(process.env.MNEMONIC ?? "", "m/44'/60'/0'/0/" + index).connect(provider);
        accounts.push(account);
        console.log(`Account ${index} address: ${accounts[index].address}`);

        if (localDeploy) {
            await network.provider.send("hardhat_setBalance", [
                accounts[index].address,
                "0x100000000000000",
              ]);
        }
        
        balance = await accounts[index].getBalance();
        balanceInEth = ethers.utils.formatEther(balance)
        console.log(`Account ${index} balance: ${balanceInEth} ETH`);

        if (Number(balanceInEth) < minimumRequiredBalance) throw new Error("Balance not enough to run the script");
    }
    
    const args = process.argv;
    const proposals = args.slice(2);

    if (proposals.length <= 0) throw new Error("not enough arguments");

    // console.log("Arguments:", args);
    console.log("\nDeploying Ballot contract");
    console.log("Proposals: ");

    proposals.forEach((element, index) => {
        console.log(`Proposal N. ${index + 1}: ${element}`);
    });

    let ballotContract: Ballot;

    const ballotContractFactory = await ethers.getContractFactory("Ballot");
    // const ballotContractFactory = new Ballot__factory(accounts[0]);

    ballotContract = await ballotContractFactory.connect(accounts[0]).deploy(
        proposals.map((prop) => ethers.utils.formatBytes32String(prop))
        ) as Ballot;
    await ballotContract.deployed();

    console.log(`\nThe contract is deployed.`);
    console.log(`Contract address: ${ballotContract.address}`);
    const chairPerson = await ballotContract.chairperson();
    console.log(`The chairperson of the ballot: ${chairPerson}`);

    // # give the right to vote to the first account
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});