import { ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Ballot, Ballot__factory } from "../typechain-types";
import * as dotenv from 'dotenv'
import { BigNumber, ContractTransaction, Wallet } from "ethers";
import { Provider } from "@ethersproject/providers";
dotenv.config()

async function main() {
    // Usage: yarn run ts-node --files .\scripts\Assignment.ts "Raspberry" "Vanilla" "Pistacchio"

    const localDeploy = true;
    const numberOfWallets = 3;

    let accounts: Wallet[] = [];
    let provider: Provider;
    let minimumRequiredBalance= 0.01;
    // let balance: BigNumber;
    // let balanceInEth: string;
    
    provider = ethers.provider;
    if (!localDeploy) {
        console.log("Using Goerli network");
        provider = ethers.getDefaultProvider("goerli", {
            infura: process.env.INFURA_API_KEY,
            alchemy: process.env.ALCHEMY_API_KEY,
            etherscan: process.env.ETHERSCAN_API_KEY,
        });
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
                "0x1000000000000000",
              ]);
        }
        
        const balance = await accounts[index].getBalance();
        const balanceInEth = ethers.utils.formatEther(balance);
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


    // give voting rights to the other accounts
    console.log("\nGiving voting rights to the other accounts");
    for (let index = 1; index < numberOfWallets; index++) {
        let tx = await ballotContract.connect(accounts[0]).giveRightToVote(accounts[index].address);
        let receipt = await tx.wait();
        console.log(`Account ${index} - (${accounts[index].address}) has been given voting rights`);
        console.log(`Transaction hash: ${receipt.transactionHash}`);
        console.log(`Tx cost: ${ethers.utils.formatEther(Number(receipt.cumulativeGasUsed) * Number(receipt.effectiveGasPrice))} ETH`);
    }
    
    // delegating votes 
    console.log("\nDelegating votes");
    let tx = await ballotContract.connect(accounts[0]).delegate(accounts[2].address);
    let receipt = await tx.wait();
    console.log(`Account 0 / (${accounts[0].address}) delegated the rights to: Account 2 / (${accounts[2].address})`); 
    console.log(`Transaction hash: ${receipt.transactionHash}`);
    // console.log({receipt});
    // console.log(`Tx cost: ${ethers.utils.formatEther(Number(receipt.cumulativeGasUsed) * Number(receipt.effectiveGasPrice))} ETH`);

    // casting votes
    console.log("\nCasting votes");

    let voted_to = 1;
    tx = await ballotContract.connect(accounts[1]).vote(1);
    // console.log(`${accounts[1].address} voted for proposal ${voted_to} / ${proposals[voted_to]}`);
    console.log(`Account 1 / (${accounts[1].address}) voted for proposal ${voted_to} / ${ethers.utils.parseBytes32String((await ballotContract.proposals(voted_to)).name)}`);
    receipt = await tx.wait();
    console.log(`Transaction hash: ${receipt.transactionHash}`);

    voted_to = 2;
    tx = await ballotContract.connect(accounts[2]).vote(voted_to);
    // console.log(`${accounts[2].address} voted for proposal ${voted_to} / ${proposals[voted_to]}`);
    console.log(`Account 2 / (${accounts[2].address}) voted for proposal ${voted_to} / ${ethers.utils.parseBytes32String((await ballotContract.proposals(voted_to)).name)}`);
    receipt = await tx.wait();
    console.log(`Transaction hash: ${receipt.transactionHash}`);
    
    // querying results
    let winnerName = await ballotContract.winnerName();
    console.log(`\nThe winner is: ${ethers.utils.parseBytes32String(winnerName)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});