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

        // instead of directly setting _owner = hacker, we should call transferOwnership so we get the proper event
        _transferOwnership(_hacker);

        // we do not transfer ownership to the _newOwner address yet, the _newOwner must first accept 
        newOwner = _newOwner;
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner. The new owner must first accept the ownership
     * by calling acceptOwnership()
     */
    function transferOwnership(address _newOwner) public override virtual onlyOwner {
        require(_newOwner != address(0), "Ownable: new owner is the zero address");
        newOwner = _newOwner;
        emit NewOwnerProposed(_newOwner);
    }
        
    function acceptOwnership() external {
        require(msg.sender == newOwner, "must be newOwner to accept ownership");
        _transferOwnership(newOwner);
        newOwner = address(0);
    }

    // renouncing ownership will return ownership of the funds to the hacker
    function renounceOwnership() public virtual override onlyOwner {
        newOwner = address(0);
        _transferOwnership(hacker);
    }


    function retrieveFunds(
        address _beneficiary,
        uint256 _bounty,
        address _token
    ) external onlyOwner nonReentrant {
        require(_bounty >= MINIMUM_BOUNTY, "Bounty must be at least 10%");
        uint256 returnedToBeneficiary = HUNDRED_PERCENT - _bounty;
        if (_token == address(0)) {
            uint256 totalReward = address(this).balance;
            require(totalReward > 0, "No ETH in the contract");
            sendETHReward(hacker, _bounty, totalReward);

            if (returnedToBeneficiary > 0) {
                require(_beneficiary != address(0), "Cannot send to 0 address");
                sendETHReward(_beneficiary, returnedToBeneficiary, totalReward);
            }
        } else {
            // tranfer all _token held by this contract to the different parties
            uint256 totalReward = IERC20Upgradeable(_token).balanceOf(address(this));
            require(totalReward > 0, "No tokens in the contract");
            IERC20Upgradeable(_token).safeTransfer(hacker, _bounty * totalReward / HUNDRED_PERCENT);

            if (returnedToBeneficiary > 0) {
                require(_beneficiary != address(0), "Cannot send to 0 address");
                IERC20Upgradeable(_token).safeTransfer(_beneficiary, returnedToBeneficiary * totalReward / HUNDRED_PERCENT);
            }
        }
        emit FundsRetrieved(_beneficiary, _token, _bounty);
    }

    function sendETHReward(address _to, uint256 _rewardPercentage, uint256 _totalReward) internal {
        (bool sent,) = _to.call{value: _rewardPercentage * _totalReward / HUNDRED_PERCENT}("");
        require(sent, "Failed to send ETH");
    }
}