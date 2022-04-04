# HackedFirstBountyLater

If a white hat hacker finds a vulnerability in a protocol, they must rely on the project they hacked for a bug bounty. 

This system does not always work out well. A bounty program requires the hacker to disclose the vulnerability before the severity (and hance the amount) of the bounty is determined. Hacked projects have strong incentives to downplay the severity and pay out as little as possible - after all, now they about the vulnerability, the hacker has no negotation power anymore. Although  many projects have a solid bug bounty program, and we have seen some Very Large bug bounties been paid out, we have also seen white hat hackers left disappointed. 

Somewhat provocatively, by https://twitter.com/DegenSpartan/status/1509023079078723585, DegenSpartan proposes to  radically change (and considerably simplifies) the way bounties are assigned: 

> .. we should completely normalize and accept "hack first - bounty later" with 10% of amount as the minimum bounty ...

This repository contains a simple [contract](./contracts/HackedFirst.sol) that implements such a bounty program.


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
