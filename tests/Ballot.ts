import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Ballot } from "../typechain-types";

const PROPOSALS = ["vanilla", "blueberry", "potato"]

function convertStringArratToBytes32(array: string[]) {
    const bytes32Array = [];
    for (let index=0; index < array.length; index++) {
        bytes32Array.push(ethers.utils.formatBytes32String(array[index]));
    }
    return bytes32Array;
}

describe("Ballot", () => {
    let ballotContract: Ballot;
    let accounts: SignerWithAddress[];


    beforeEach(async () => {
        accounts = await ethers.getSigners();
        const ballotContractFactory = await ethers.getContractFactory("Ballot");
        ballotContract = await ballotContractFactory.deploy(
            PROPOSALS.map((prop) => ethers.utils.formatBytes32String(prop))
            // convertStringArratToBytes32(PROPOSALS)
            ) as Ballot;
    });

    describe("when the contract is deployed", () => {
        it("has the provided proposals", async () => {
            
            for (let index = 0; index < PROPOSALS.length; index++) {
                const proposal = await ballotContract.proposals(index);
                expect(ethers.utils.parseBytes32String(proposal.name)).to.equal(PROPOSALS[index]);
            }
        });

        it("has the deployer address as chairperson", async () => {
            const owner = await ballotContract.chairperson();
            expect(owner).to.equal(accounts[0].address);
        });

        it("sets the voting weight for the chairperson as 1", async () => {
            // const chairPerson = await ballotContract.chairperson();
            const chairPersonVoter = await ballotContract.voters(accounts[0].address);
            expect(chairPersonVoter.weight).to.equal(1);

        });
    });
});