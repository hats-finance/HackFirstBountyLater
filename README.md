# HackFirstBountyLater

If a white hat hacker finds a vulnerability in a protocol, they must rely on the project they hacked for a bug bounty.

This system does not always work out well. Not all projects pay out bounties in the first place, and even if a bounty program is in place, it requires the hacker to disclose the vulnerability before the severity (and hence the amount) of the bounty is determined. Hacked projects have strong incentives to downplay the severity of the vulnerability - both to save face and to pay out as little as possible. The hacker has no negotation power after submitting the vulnerability.

Although many projects have a solid bug bounty program, and we have seen some Very Large bug bounties been paid out, we have also seen white hat hackers left disappointed.

Somewhat provocatively, in https://twitter.com/DegenSpartan/status/1509023079078723585, DegenSpartan proposes to radically change (and considerably simplify) the way bounties are assigned:

> .. we should completely normalize and accept "hack first - bounty later" with 10% of amount as the minimum bounty ...

This repository contains a simple [contract](./contracts/HackerFirst.sol) that implements such an _ad hoc_ bounty program. It implements the "Hack First, Bounty Later" idea in a naief but straightforward way.

With the contracts in this repository we provide a way for the community to "completely normalize and accept" the Hacked First model by offering a concrete contract that can help white hat hackers to negotiate a fair bounty for their work.

The contracts are deployed on XXX and YYY.

## Specs

- a **Hacker** deposits funds obtained from the hack (ETH and/or tokens), with the purpose of giving the funds back to the hacked "team and community", but to be guaranteed to get at least a 10% bounty
- The **beneficiary** (typically the hacked party) can retrieve the funds, but must specify a percentage to give to the hacker as a bounty (must be >= 10%). The beneficiary can also choose to give a percentage to HATs as a tip for the service rendered, but this can be 0%
- The **Hacker** can choose the **beneficiary**. If the hacker is somehow not sure about of the address to of the "team and community", or if she thinks they are "bitches", she can set a `committee` instead, which can decide who to set as a beneficiary
- the system must be able to manage several different hacking events contemporally

## Implementation

1. Hacker calls `HackerFirstFactory.createHackerFirstContract(address _committee, address _beneficiary)` which will create a new `HackerFirst` instance. This should be a clone, so it is relatively cheap. The function sets the `hacker` and `committee` and `beneficiary` values on the new instance, and trigger an Event with the address of the new contract. The function requires that either a committee or a beneficiary address is provided.
2. The hacker can now send funds and tokens to the contract
3. The committee of the contract assigns the beneficiary
4. The beneficiary calls `retrieveFunds`, specifying the token to retreive, and the percentage that goes to the hacker (at least 10%) and the tip to HATs (can be 0%)
