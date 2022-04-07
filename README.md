# HackFirstBountyLater

If a white hat hacker finds a vulnerability in a protocol, they must rely on the project they hacked for a bug bounty.

This system does not always work out well. Not all projects pay out bounties in the first place, and even if a bounty program is in place, it requires the hacker to disclose the vulnerability before the severity (and hence the amount) of the bounty is determined. Hacked projects have strong incentives to downplay the severity of the vulnerability - both to save face and to pay out as little as possible. The hacker has no negotation power after submitting the vulnerability.

Although many projects have a solid bug bounty program, and we have seen some very large bug bounties been paid out, we have also seen white hat hackers left disappointed.

Somewhat provocatively, in https://twitter.com/DegenSpartan/status/1509023079078723585, DegenSpartan proposes to radically change (and considerably simplify) the way bounties are assigned:

> .. we should completely normalize and accept "hack first - bounty later" with 10% of amount as the minimum bounty ...

This repository contains a simple [contract](./contracts/HackFirst.sol) that implements such an _ad hoc_ bounty program. It implements the "Hack First, Bounty Later" idea in a naief but straightforward way.

With the contracts in this repository we provide a way for the community to "completely normalize and accept" the Hacked First model by offering a concrete contract that can help white hat hackers to negotiate a fair bounty for their work.

## How it works

- a **Hacker** deposits funds obtained from the hack (ETH and/or tokens) to an escrow contract called `HackFirst`.
- The funds are controlled by the **owner** of the contract, who can decide where the funds will be sent, and which percentage of the funds goes as a bounty to the hacker (at least 10%)
- The Hacker appoints the owner - this can be an address controlled by the hacked party, but it can also be the address of a third party that is considered impartial by the hacker
- The appointed owner must accept ownership before she gains control - if she does not want the responsibility, she can simply ignore the request. The owner can at any time renounce the ownership, in which case ownership goes back to the hacker address. The owner can also propose to transfer ownership to another address altogether.

## Which functions to call

1. The hacker (or any other address) calls `HackFirstFactory.createHackerFirstContract(address _hacker, address _owner)`. This will create a new `HackFirst` instance.
   he owner of the new instance is the `_hacker`.
2. The `_owner` address calls `HackFirst.acceptOwnership()` and becomes the owner of the contract
3. The hacker sends the hacked funds (tokens and /or ether) to the contract
4. The owner calls `HackFirst.retrieveFunds(address _beneficiary,uint256 _bounty,address _token)` for each token that is in the contract. This transfers a percentage of the tokens to the hacker (the amount is given by `_bounty`) - this must be at least 10%. The rest of the funds are sent to the `_beneficiary` address (typically the victims of the hack)
