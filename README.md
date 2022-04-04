# HackedFirstBountyLater

Inspired by https://twitter.com/DegenSpartan/status/1509023079078723585?t=NZ_UqjiffNoAJS8AcOAHzQ&s=19, we have created a `HackedFirst` that contract in which:

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
