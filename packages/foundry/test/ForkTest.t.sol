// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/VouchieVault.sol";
import "../contracts/VouchieBadge.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ForkTest is Test {
    VouchieVault public vault;
    VouchieBadge public badge;
    IERC20 public usdc;

    // Base USDC Address
    address constant USDC_ADDR = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    
    address public creator = address(0x123456789);
    
    function setUp() public {
        // This test expects to be run on a fork of Base Mainnet
        // forge test --fork-url <URL> --match-contract ForkTest
        
        usdc = IERC20(USDC_ADDR);
        
        // Deploy contracts locally on the fork
        vault = new VouchieVault(USDC_ADDR);
        badge = new VouchieBadge();
        
        vault.setBadgeContract(address(badge));
        badge.setVault(address(vault));

        // Fund the creator with real USDC using foundry's deal
        // deal(token, to, amount)
        deal(USDC_ADDR, creator, 2000 * 1e6); // USDC has 6 decimals
    }

    function test_Fork_SoloGoalLifecycle() public {
        vm.startPrank(creator);
        
        // 1. Approve
        usdc.approve(address(vault), type(uint256).max);
        
        // 2. Create Goal (100 USDC)
        uint256 stakeAmount = 100 * 1e6;
        address[] memory vouchies = new address[](0);
        
        vault.createGoal(stakeAmount, 1 days, "Fork Test Goal", vouchies);
        
        uint256 balAfterStake = usdc.balanceOf(creator);
        assertEq(balAfterStake, 1900 * 1e6, "Stake should be deducted");
        
        // 3. Verify (Solo verify success)
        vault.verifySolo(0);
        
        // 4. Claim
        vault.claim(0, 0);
        
        uint256 balFinal = usdc.balanceOf(creator);
        assertEq(balFinal, 2000 * 1e6, "Balance should be restored");
        
        vm.stopPrank();
    }
}
