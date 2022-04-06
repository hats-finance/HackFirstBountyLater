//SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";


contract HackFirst is OwnableUpgradeable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public hacker;
    address public hats;
    address public newOwner; // candidate for becoming the new owner of this contract, must accept 

    uint256 public constant HUNDRED_PERCENT = 10000;
    uint256 public constant MINIMUM_BOUNTY = 1000;

    // TODO: should probably rename this event
    event CommitteeChanged(address indexed _newOwner);
    event FundsRetrieved(address indexed _beneficiary, address indexed _token, uint256 _bounty, uint256 _rewardForHats);

    constructor() initializer {}

    receive() external payable {}

    function initialize(address _hacker, address _newOwner, address _hats) external initializer {
        require(_newOwner != address(0), "Must have committee");

        hacker = _hacker;

        // instead of directly setting _owner = hacker, we should call transferOwnership so we get the proper event
        _transferOwnership(_hacker);

        // we do not transfer ownership to the _newOwner address yet, the _newOwner must first accept 
        newOwner = _newOwner;
        hats = _hats;
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner. The new owner must first accept the ownership
     * by calling acceptOwnership()
     */
    function transferOwnership(address _newOwner) public override virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        newOwner = _newOwner;
        emit CommitteeChanged(_newOwner);
    }
        
    function acceptOwnership() external {
        require(msg.sender == newOwner, "must be newOwner to accept ownership");
        _transferOwnership(newOwner);
        newOwner = address(0);
    }

    // renouncing ownership will return ownership of the funds to the hacker
    function renounceOwnership() public virtual override onlyOwner {
        _transferOwnership(hacker);
    }


    function retrieveFunds(
        address _beneficiary,
        uint256 _bounty,
        uint256 _rewardForHats,
        address _token
    ) external onlyOwner nonReentrant {
        require(_bounty >= MINIMUM_BOUNTY, "Bounty must be at least 10%");
        uint256 returnedToBeneficiary = HUNDRED_PERCENT - (_bounty + _rewardForHats);
        if (_token == address(0)) {
            uint256 totalReward = address(this).balance;
            require(totalReward > 0, "No ETH in the contract");
            sendETHReward(hacker, _bounty, totalReward);

            if (_rewardForHats > 0) {
                sendETHReward(hats, _rewardForHats, totalReward);
            }

            if (returnedToBeneficiary > 0) {
                require(_beneficiary != address(0), "Cannot send to 0 address");
                sendETHReward(_beneficiary, returnedToBeneficiary, totalReward);
            }
        } else {
            // tranfer all _token held by this contract to the different parties
            uint256 totalReward = IERC20(_token).balanceOf(address(this));
            require(totalReward > 0, "No tokens in the contract");
            IERC20(_token).safeTransfer(hacker, _bounty * totalReward / HUNDRED_PERCENT);

            if (_rewardForHats > 0) {
                IERC20(_token).safeTransfer(hats, _rewardForHats * totalReward / HUNDRED_PERCENT);

            }

            if (returnedToBeneficiary > 0) {
                require(_beneficiary != address(0), "Cannot send to 0 address");
                IERC20(_token).safeTransfer(_beneficiary, returnedToBeneficiary * totalReward / HUNDRED_PERCENT);
            }
        }
        emit FundsRetrieved(_beneficiary, _token, _bounty, _rewardForHats);
    }

    function sendETHReward(address _to, uint256 _rewardPercentage, uint256 _totalReward) internal {
        (bool sent,) = _to.call{value: _rewardPercentage * _totalReward / HUNDRED_PERCENT}("");
        require(sent, "Failed to send ETH");
    }
}