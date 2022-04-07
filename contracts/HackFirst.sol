//SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";


contract HackFirst is OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    address public hacker;
    address public newOwner; // candidate for becoming the new owner of this contract, must accept 

    uint256 public constant HUNDRED_PERCENT = 10000;
    uint256 public constant MINIMUM_BOUNTY = 1000;

    event NewOwnerProposed(address indexed _newOwner);
    event FundsRetrieved(address indexed _beneficiary, address indexed _token, uint256 _bounty);

    constructor() initializer {}

    receive() external payable {}

    function initialize(address _hacker, address _newOwner) external initializer {
        require(_newOwner != address(0), "Must have committee");

        hacker = _hacker;
        

        // until the _newOwner accepts, the hacker is the owner of the contracct
        _transferOwnership(_hacker);
        // we do not transfer ownership to the _newOwner address yet, the _newOwner must first accept 
        newOwner = _newOwner;
    }

    /**
     * @dev Propose to transfers the ownership of the contract to a new account (`newOwner`)
     * Can only be called by the current owner. The new owner must accept the ownership
     * by calling acceptOwnership() before the ownership is actually transfered
     */
    function transferOwnership(address _newOwner) public override virtual onlyOwner {
        require(_newOwner != address(0), "Ownable: new owner is the zero address");
        newOwner = _newOwner;
        emit NewOwnerProposed(_newOwner);
    }
        
    /**
     * @dev Accept to transfer ownership of the contract to a new account (`newOwner`).
     * Can only be called by the new owner. 
     */
    function acceptOwnership() external {
        require(msg.sender == newOwner, "must be newOwner to accept ownership");
        _transferOwnership(newOwner);
        newOwner = address(0);
    }

    /**
     * @dev Renounce ownership of the contract - the ownership will be transfered to the hacker
     */
    function renounceOwnership() public virtual override onlyOwner {
        newOwner = address(0);
        _transferOwnership(hacker);
    }


    /**
     * @dev Retrieve funds from the contract. This transfers the entire _token balance of the contract, dividing the balance between the hacker and the beneificiary
     * @param _beneficiary - the address that will receive all of the funds, minus the bounty
     * @param _bounty - the percentage of the funds that will be sent to the hacker, expressed as a value between 0 and 10000. The minimum value is 10% (i.e. 1000)
     * @param _token - the address of the token to transfer. If set to address(0), ETH will be transfered. 
     */
    function retrieveFunds(
        address _beneficiary,
        uint256 _bountyPercentage,
        address _token
    ) external onlyOwner nonReentrant {
        require(_bountyPercentage >= MINIMUM_BOUNTY, "Bounty percentage must be at least 10%");
        require(_bountyPercentage <= HUNDRED_PERCENT, "Bounty percentage can be at most 100%");
        uint256 bounty = _bountyPercentage * totalFunds / HUNDRED_PERCENT;
        if (_token == address(0)) {
            uint256 totalFunds = address(this).balance;
            require(totalFunds > 0, "No ETH in the contract");
            sendETHReward(hacker, bounty);

            if (bounty < totalFunds) {
                require(_beneficiary != address(0), "Cannot send to 0 address");
                sendETHReward(_beneficiary, totalFunds - bounty);
            }
        } else {
            // tranfer all _token held by this contract to the different parties
            uint256 totalFunds = IERC20Upgradeable(_token).balanceOf(address(this));
            require(totalFunds > 0, "No tokens in the contract");
            IERC20Upgradeable(_token).safeTransfer(hacker, bounty);

            if (bounty < totalFunds) {
                require(_beneficiary != address(0), "Cannot send to 0 address");
                IERC20Upgradeable(_token).safeTransfer(_beneficiary, totalFunds - bounty);
            }
        }
        emit FundsRetrieved(_beneficiary, _token, _bountyPercentage);
    }

    function sendETHReward(address _to, uint256 _amount) internal {
        (bool sent,) = _to.call{value: _amount}("");
        require(sent, "Failed to send ETH");
    }
}
