// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/VouchieVault.sol";
import "../contracts/VouchieBadge.sol";
import "../contracts/MockToken.sol";

contract VouchieVaultTest is Test {
    VouchieVault public vault;
    VouchieBadge public badge;
    MockToken public token;

    address public creator = address(1);
    address public bob = address(2);
    address public charlie = address(3);
    address public dave = address(4);
    address public treasury = address(this); // Test contract acts as treasury (via Ownable)

    function setUp() public {
        token = new MockToken();
        vault = new VouchieVault(address(token));
        badge = new VouchieBadge();
        
        vault.setBadgeContract(address(badge));
        badge.setVault(address(vault));
        // treasury is msg.sender by default in Ownable, which is this test contract
        
        token.mint(creator, 2000 ether);
        
        vm.startPrank(creator);
        token.approve(address(vault), type(uint256).max);
        vm.stopPrank();
    }

    function test_HappyPath_CreatorSucceeds() public {
        address[] memory vouchies = new address[](2);
        vouchies[0] = bob;
        vouchies[1] = charlie;

        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Run 5km", vouchies);

        vm.prank(bob);
        vault.vote(0, true, 0);

        vm.prank(charlie);
        vault.vote(0, true, 1);
        
        (bool resolved) = _getResolved(0);
        assertTrue(resolved, "Should be resolved");

        uint256 balBefore = token.balanceOf(creator);
        vm.prank(creator);
        vault.claim(0, 0);
        
        assertEq(token.balanceOf(creator) - balBefore, 100 ether, "Creator got refund");
    }

    function test_SadPath_LazyTaxOnFailure() public {
        // Goal: 100 ether
        // Tax: 10% (10 ether)
        // Remainder: 90 ether
        // Vouchies: 2 (45 ether each)
        
        address[] memory vouchies = new address[](2);
        vouchies[0] = bob;
        vouchies[1] = charlie;

        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Run 5km", vouchies);

        // Bob votes Invalid (index 0)
        vm.prank(bob);
        vault.vote(0, false, 0);

        uint256 treasuryBalBefore = token.balanceOf(address(this));

        // Charlie votes Invalid (index 1) -> triggers resolve
        vm.prank(charlie);
        vault.vote(0, false, 1);

        (bool resolved) = _getResolved(0);
        assertTrue(resolved);

        // Check Treasury Tax
        assertEq(token.balanceOf(address(this)) - treasuryBalBefore, 10 ether, "Treasury received tax");

        // Vouchies claims
        uint256 balBeforeBob = token.balanceOf(bob);
        vm.prank(bob);
        vault.claim(0, 0); 
        assertEq(token.balanceOf(bob) - balBeforeBob, 45 ether, "Bob got post-tax share");
        
        uint256 balBeforeCharlie = token.balanceOf(charlie);
        vm.prank(charlie);
        vault.claim(0, 1);
        assertEq(token.balanceOf(charlie) - balBeforeCharlie, 45 ether, "Charlie got post-tax share");
    }

    function test_StreakFreeze() public {
        // Fee: 5 ether
        // Extension: 12 hours
        
        address[] memory vouchies = new address[](1);
        vouchies[0] = bob;
        
        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Freeze Me", vouchies);
        
        uint256 initialDeadline = block.timestamp + 1 days;
        uint256 treasuryBalBefore = token.balanceOf(address(this));
        
        vm.prank(creator);
        vault.streakFreeze(0);
        
        (,,, uint256 deadline,,,,,) = vault.goals(0);
        assertEq(deadline, initialDeadline + 12 hours, "Deadline frozen/extended");
        assertEq(token.balanceOf(address(this)) - treasuryBalBefore, 5 ether, "Treasury got freeze fee");
    }

    function test_ClaimBadge() public {
        // Fee: 2 ether
        
        address[] memory vouchies = new address[](1);
        vouchies[0] = bob;
        
        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Badge Me", vouchies);
        
        // Pass the goal
        vm.prank(bob);
        vault.vote(0, true, 0);
        
        uint256 treasuryBalBefore = token.balanceOf(address(this));
        
        vm.prank(creator);
        vault.claimBadge(0);
        
        assertEq(token.balanceOf(address(this)) - treasuryBalBefore, 2 ether, "Treasury got badge fee");
        assertEq(badge.ownerOf(0), creator, "Creator owns badge #0");
    }

    function test_CreatorCannotBeInVouchies() public {
        address[] memory vouchies = new address[](2);
        vouchies[0] = bob;
        vouchies[1] = creator; 

        vm.prank(creator);
        vm.expectRevert("Creator cannot be in vouchies");
        vault.createGoal(100 ether, 1 days, "Self Deal", vouchies);
    }

    function test_CancelGoal() public {
        address[] memory vouchies = new address[](1);
        vouchies[0] = bob;
        
        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Mistake", vouchies);
        
        // Cancel immediately
        uint256 balBefore = token.balanceOf(creator);
        vm.prank(creator);
        vault.cancelGoal(0);
        
        assertEq(token.balanceOf(creator) - balBefore, 100 ether, "Got refund");
        
        (,,,,, bool resolved,,,) = vault.goals(0);
        assertTrue(resolved, "Goal resolved");
    }
    
    function test_CancelGoal_RevertIfVoted() public {
        address[] memory vouchies = new address[](2);
        vouchies[0] = bob;
        vouchies[1] = charlie;
        
        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Locked In", vouchies);
        
        vm.prank(bob);
        vault.vote(0, true, 0);
        
        vm.prank(creator);
        vm.expectRevert("Cannot cancel after voting started");
        vault.cancelGoal(0);
    }
    
    function test_ExtendGoal() public {
        address[] memory vouchies = new address[](1);
        vouchies[0] = bob;
        
        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Extend Me", vouchies);
        
        uint256 initialDeadline = block.timestamp + 1 days;
        
        vm.prank(creator);
        vault.extendGoal(0, 1 days, 50 ether);
        
        (,, uint256 stake, uint256 deadline,,,,,) = vault.goals(0);
        assertEq(stake, 150 ether, "Stake increased");
        assertEq(deadline, initialDeadline + 1 days, "Deadline extended");
    }
    
    function test_DustCollection() public {
        // 50 ether stake, 3 members
        // Tax 10% = 5 ether.
        // Remainder = 45 ether.
        // Members = 3.
        // Share = 45 / 3 = 15 ether
        // Total Distributed = 15 * 3 = 45
        // Dust = 0.
        
        address[] memory vouchies = new address[](3);
        vouchies[0] = bob;
        vouchies[1] = charlie;
        vouchies[2] = dave;

        uint256 stake = 50 ether; 
        vm.prank(creator);
        vault.createGoal(stake, 1 days, "Dust Test", vouchies);

        vm.prank(bob);
        vault.vote(0, false, 0);
        vm.prank(charlie);
        vault.vote(0, false, 1);
        
        uint256 treasuryBalBefore = token.balanceOf(address(this));
        
        vm.prank(dave);
        vault.vote(0, false, 2);
        
        uint256 tax = (stake * 1000) / 10000; // 5 ether
        uint256 pot = stake - tax; // 45 ether
        
        uint256 share = pot / 3;
        uint256 dust = pot % 3;
        
        uint256 balBefore = token.balanceOf(bob);
        vm.prank(bob);
        vault.claim(0, 0);
        assertEq(token.balanceOf(bob) - balBefore, share + dust, "Bob should get share (no dust in this case)");
        
        balBefore = token.balanceOf(charlie);
        vm.prank(charlie);
        vault.claim(0, 1);
        assertEq(token.balanceOf(charlie) - balBefore, share, "Charlie gets standard share");
        
        balBefore = token.balanceOf(dave);
        vm.prank(dave);
        vault.claim(0, 2);
        assertEq(token.balanceOf(dave) - balBefore, share, "Dave gets standard share");
        
        assertEq(token.balanceOf(address(this)) - treasuryBalBefore, tax, "Treasury has 10% tax");
        assertEq(token.balanceOf(address(vault)), 0, "No dust left behind");
    }
    
    function test_BadgeBaseURI() public {
        string memory uri = "ipfs://my-vouchie-badges/";
        badge.setBaseURI(uri);
        
        // Setup goal and pass it to mint badge
        address[] memory vouchies = new address[](1);
        vouchies[0] = bob;
        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "URI Test", vouchies);
        vm.prank(bob);
        vault.vote(0, true, 0);
        
        vm.prank(creator);
        vault.claimBadge(0);
        
        assertEq(badge.tokenURI(0), string(abi.encodePacked(uri, "0")), "Token URI should be correct");
    }
    
    function _getResolved(uint256 id) internal view returns (bool) {
        (,,,,, bool resolved,,,) = vault.goals(id);
        return resolved;
    }
}
