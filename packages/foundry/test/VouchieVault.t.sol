// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/VouchieVault.sol";
import "../contracts/VouchieBadge.sol";
import "../contracts/MockUSDC.sol";

contract VouchieVaultTest is Test {
    VouchieVault public vault;
    VouchieBadge public badge;
    MockUSDC public token;

    address public creator = address(1);
    address public bob = address(2);
    address public charlie = address(3);
    address public dave = address(4);
    address public treasury = address(this); // Test contract acts as treasury (via Ownable)

    event GoalCreated(uint256 indexed goalId, address indexed creator, uint256 stakeAmount, uint256 deadline, bool isSolo);
    event GoalResolved(uint256 indexed goalId, bool successful, bool isSolo);

    function setUp() public {
        token = new MockUSDC();
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

    /// @notice Verify that a creator can successfully complete a goal, get verified by vouchies, and reclaim their full stake.
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

    /// @notice Verify that if a creator fails a goal (voted invalid), the protocol takes a tax (Lazy Tax) and the remaining pot is split among vouchies.
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

    /// @notice Verify that a creator can pay a fee to extend the goal deadline (Streak Freeze).
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
        
        (,, uint256 deadline,,,,) = vault.getGoalDetails(0);
        assertEq(deadline, initialDeadline + 12 hours, "Deadline frozen/extended");
        assertEq(token.balanceOf(address(this)) - treasuryBalBefore, 5 ether, "Treasury got freeze fee");
    }

    /// @notice Verify that a successful creator can pay a fee to mint a completion badge.
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

    /// @notice Verify that a creator cannot list themselves as a vouchie to prevent self-verification.
    function test_CreatorCannotBeInVouchies() public {
        address[] memory vouchies = new address[](2);
        vouchies[0] = bob;
        vouchies[1] = creator; 

        vm.prank(creator);
        vm.expectRevert("Creator cannot be in vouchies");
        vault.createGoal(100 ether, 1 days, "Self Deal", vouchies);
    }

    /// @notice Verify that a creator can cancel a goal and get a full refund if no voting has started.
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
        
        (,,,, bool resolved,,) = vault.getGoalDetails(0);
        assertTrue(resolved, "Goal resolved");
    }
    
    /// @notice Verify that a creator CANNOT cancel a goal once voting has started.
    function test_CancelGoal_RevertIfVoted() public {
        address[] memory vouchies = new address[](2);
        vouchies[0] = bob;
        vouchies[1] = charlie;
        
        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Locked In", vouchies);
        
        vm.prank(bob);
        vault.vote(0, true, 0);
        
        vm.prank(creator);
        vm.expectRevert("Cannot cancel: voting started");
        vault.cancelGoal(0);
    }
    
    /// @notice Verify that the protocol correctly handles division remainders (dust) when splitting the pot among vouchies, ensuring no funds are locked.
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
    
    /// @notice Verify that the badge NFT correctly returns the metadata URI.
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

    /// @notice Verify that a user can create a Solo Mode goal (no vouchies).
    function test_SoloMode_Create() public {
        address[] memory vouchies = new address[](0);

        vm.expectEmit(true, true, false, true);
        emit GoalCreated(0, creator, 100 ether, block.timestamp + 1 days, true); // isSolo = true

        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Beat the House", vouchies);

        (address c, uint256 stake, , bool successful, bool resolved, , ) = vault.getGoalDetails(0);
        
        assertEq(c, creator);
        assertEq(stake, 100 ether);
        assertFalse(resolved);
        assertFalse(successful);
    }

    /// @notice Verify that a creator can self-verify a Solo Mode goal before the deadline.
    function test_SoloMode_VerifySuccess() public {
        address[] memory vouchies = new address[](0);
        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Beat the House", vouchies);

        // Creator verifies BEFORE deadline
        vm.expectEmit(true, false, false, true);
        emit GoalResolved(0, true, true); // successful=true, isSolo=true

        vm.prank(creator);
        vault.verifySolo(0);

        (, uint256 stake, , bool successful, bool resolved, , ) = vault.getGoalDetails(0);
        assertTrue(resolved);
        assertTrue(successful);
        assertEq(stake, 100 ether); // Stake remains for claiming
    }

    /// @notice Verify that a creator can claim their stake after a successful Solo Mode goal.
    function test_SoloMode_ClaimSuccess() public {
        address[] memory vouchies = new address[](0);
        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Beat the House", vouchies);

        vm.prank(creator);
        vault.verifySolo(0);

        uint256 balBefore = token.balanceOf(creator);
        
        vm.prank(creator);
        vault.claim(0, 0);

        assertEq(token.balanceOf(creator) - balBefore, 100 ether);
    }

    /// @notice Verify that if a Solo Mode goal times out, it is marked as failed and 100% of the stake goes to the Treasury.
    function test_SoloMode_FailOnTimeout() public {
        address[] memory vouchies = new address[](0);
        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Beat the House", vouchies);

        // Warp past deadline
        vm.warp(block.timestamp + 1 days + 1);

        uint256 treasuryBalBefore = token.balanceOf(treasury);

        // Anyone calls resolve
        vm.expectEmit(true, false, false, true);
        emit GoalResolved(0, false, true); // successful=false, isSolo=true

        vault.resolve(0);

        (, uint256 stake, , bool successful, bool resolved, , ) = vault.getGoalDetails(0);
        
        assertTrue(resolved);
        assertFalse(successful);
        assertEq(stake, 0); // Wiped

        // Treasury took 100%
        assertEq(token.balanceOf(treasury) - treasuryBalBefore, 100 ether);
    }

    /// @notice Verify that voting is disabled for Solo Mode goals.
    function test_SoloMode_CannotVote() public {
        address[] memory vouchies = new address[](0);
        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Beat the House", vouchies);

        vm.expectRevert("Cannot vote on solo goal");
        vault.vote(0, true, 0);
    }
    
    /// @notice Verify that a creator cannot self-verify a Solo Mode goal after the deadline has passed.
    function test_SoloMode_VerifyAfterDeadlineReverts() public {
        address[] memory vouchies = new address[](0);
        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Beat the House", vouchies);
        
        vm.warp(block.timestamp + 1 days + 1);
        
        vm.prank(creator);
        vm.expectRevert("Deadline passed");
        vault.verifySolo(0);
    }
    
    function _getResolved(uint256 id) internal view returns (bool) {
        (,,,, bool resolved,,) = vault.getGoalDetails(id);
        return resolved;
    }

    // =========================================================================
    // GRACE PERIOD TESTS
    // =========================================================================

    /// @notice Verify that a creator can cancel within the 10-minute grace period and get full refund.
    function test_GracePeriod_CancelWithinGracePeriod() public {
        address[] memory vouchies = new address[](1);
        vouchies[0] = bob;

        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Quick Cancel", vouchies);

        // Warp 5 minutes (within grace period)
        vm.warp(block.timestamp + 5 minutes);

        uint256 balBefore = token.balanceOf(creator);
        vm.prank(creator);
        vault.cancelGoal(0);

        assertEq(token.balanceOf(creator) - balBefore, 100 ether, "Got full refund");
    }

    /// @notice Verify that cancel reverts after grace period expires.
    function test_GracePeriod_CancelAfterGracePeriodReverts() public {
        address[] memory vouchies = new address[](1);
        vouchies[0] = bob;

        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Late Cancel", vouchies);

        // Warp 11 minutes (past grace period)
        vm.warp(block.timestamp + 11 minutes);

        vm.prank(creator);
        vm.expectRevert("Grace period expired, use forfeit");
        vault.cancelGoal(0);
    }

    /// @notice Verify getGracePeriodStatus returns correct values.
    function test_GracePeriod_StatusCheck() public {
        address[] memory vouchies = new address[](1);
        vouchies[0] = bob;

        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Status Check", vouchies);

        // Initially in grace period
        (bool inGrace, uint256 remaining) = vault.getGracePeriodStatus(0);
        assertTrue(inGrace, "Should be in grace period");
        assertEq(remaining, 10 minutes, "Should have 10 minutes remaining");

        // Warp 5 minutes
        vm.warp(block.timestamp + 5 minutes);
        (inGrace, remaining) = vault.getGracePeriodStatus(0);
        assertTrue(inGrace, "Still in grace period");
        assertEq(remaining, 5 minutes, "Should have 5 minutes remaining");

        // Warp past grace period
        vm.warp(block.timestamp + 6 minutes);
        (inGrace, remaining) = vault.getGracePeriodStatus(0);
        assertFalse(inGrace, "Grace period expired");
        assertEq(remaining, 0, "No time remaining");
    }

    // =========================================================================
    // FORFEIT TESTS
    // =========================================================================

    /// @notice Verify forfeit reverts during grace period.
    function test_Forfeit_RevertsDuringGracePeriod() public {
        address[] memory vouchies = new address[](1);
        vouchies[0] = bob;

        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Early Forfeit", vouchies);

        vm.prank(creator);
        vm.expectRevert("Use cancelGoal during grace period");
        vault.forfeit(0);
    }

    /// @notice Verify solo forfeit sends 100% to treasury.
    function test_Forfeit_SoloGoesToTreasury() public {
        address[] memory vouchies = new address[](0);

        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Solo Forfeit", vouchies);

        // Warp past grace period
        vm.warp(block.timestamp + 11 minutes);

        uint256 treasuryBalBefore = token.balanceOf(treasury);

        vm.prank(creator);
        vault.forfeit(0);

        assertEq(token.balanceOf(treasury) - treasuryBalBefore, 100 ether, "Treasury got 100%");

        (, uint256 stake, , bool successful, bool resolved, , ) = vault.getGoalDetails(0);
        assertTrue(resolved, "Goal resolved");
        assertFalse(successful, "Goal failed");
        assertEq(stake, 0, "Stake zeroed");
    }

    /// @notice Verify squad forfeit takes tax to treasury, rest claimable by vouchies.
    function test_Forfeit_SquadSplitsWithTax() public {
        address[] memory vouchies = new address[](2);
        vouchies[0] = bob;
        vouchies[1] = charlie;

        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Squad Forfeit", vouchies);

        // Warp past grace period
        vm.warp(block.timestamp + 11 minutes);

        uint256 treasuryBalBefore = token.balanceOf(treasury);

        vm.prank(creator);
        vault.forfeit(0);

        // Treasury got 10% tax
        assertEq(token.balanceOf(treasury) - treasuryBalBefore, 10 ether, "Treasury got 10% tax");

        // Vouchies can claim
        uint256 balBefore = token.balanceOf(bob);
        vm.prank(bob);
        vault.claim(0, 0);
        assertEq(token.balanceOf(bob) - balBefore, 45 ether, "Bob got 45 ether");

        balBefore = token.balanceOf(charlie);
        vm.prank(charlie);
        vault.claim(0, 1);
        assertEq(token.balanceOf(charlie) - balBefore, 45 ether, "Charlie got 45 ether");
    }

    /// @notice Verify only creator can forfeit.
    function test_Forfeit_OnlyCreator() public {
        address[] memory vouchies = new address[](1);
        vouchies[0] = bob;

        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Not My Goal", vouchies);

        vm.warp(block.timestamp + 11 minutes);

        vm.prank(bob);
        vm.expectRevert("Only creator");
        vault.forfeit(0);
    }

    // =========================================================================
    // BATCH RESOLVE TESTS
    // =========================================================================

    /// @notice Verify batchResolve can resolve multiple expired goals.
    function test_BatchResolve_MultipleGoals() public {
        // Create 3 solo goals
        address[] memory vouchies = new address[](0);

        vm.startPrank(creator);
        vault.createGoal(10 ether, 1 hours, "Goal 1", vouchies);
        vault.createGoal(20 ether, 1 hours, "Goal 2", vouchies);
        vault.createGoal(30 ether, 1 hours, "Goal 3", vouchies);
        vm.stopPrank();

        // Warp past deadline
        vm.warp(block.timestamp + 2 hours);

        uint256 treasuryBalBefore = token.balanceOf(treasury);

        // Batch resolve all
        uint256[] memory ids = new uint256[](3);
        ids[0] = 0;
        ids[1] = 1;
        ids[2] = 2;

        vault.batchResolve(ids);

        // All should be resolved and failed
        for (uint256 i = 0; i < 3; i++) {
            (,,,, bool resolved,,) = vault.getGoalDetails(i);
            assertTrue(resolved, "Goal should be resolved");
        }

        // Treasury got all stakes (60 ether total)
        assertEq(token.balanceOf(treasury) - treasuryBalBefore, 60 ether, "Treasury got all stakes");
    }

    /// @notice Verify batchResolve skips already resolved goals.
    function test_BatchResolve_SkipsResolved() public {
        address[] memory vouchies = new address[](0);

        vm.startPrank(creator);
        vault.createGoal(10 ether, 1 hours, "Goal 1", vouchies);
        vault.createGoal(20 ether, 1 hours, "Goal 2", vouchies);
        vm.stopPrank();

        // Verify first goal before deadline
        vm.prank(creator);
        vault.verifySolo(0);

        // Warp past deadline
        vm.warp(block.timestamp + 2 hours);

        uint256 treasuryBalBefore = token.balanceOf(treasury);

        // Batch resolve both (should skip goal 0 since it's resolved)
        uint256[] memory ids = new uint256[](2);
        ids[0] = 0;
        ids[1] = 1;

        vault.batchResolve(ids); // Should not revert

        // Goal 0 was successful (verified), goal 1 failed
        (, uint256 stake0, , bool successful0, , , ) = vault.getGoalDetails(0);
        (, uint256 stake1, , bool successful1, , , ) = vault.getGoalDetails(1);

        assertTrue(successful0, "Goal 0 should be successful");
        assertFalse(successful1, "Goal 1 should have failed");
        assertEq(stake0, 10 ether, "Goal 0 stake intact for claim");
        assertEq(stake1, 0, "Goal 1 stake taken by treasury");

        // Only goal 1's stake went to treasury
        assertEq(token.balanceOf(treasury) - treasuryBalBefore, 20 ether, "Only goal 1 to treasury");
    }

    /// @notice Verify batchResolve skips goals not past deadline.
    function test_BatchResolve_SkipsNotExpired() public {
        address[] memory vouchies = new address[](0);

        vm.startPrank(creator);
        vault.createGoal(10 ether, 1 hours, "Short Goal", vouchies);
        vault.createGoal(20 ether, 2 hours, "Long Goal", vouchies);
        vm.stopPrank();

        // Warp past first deadline but not second
        vm.warp(block.timestamp + 90 minutes);

        uint256 treasuryBalBefore = token.balanceOf(treasury);

        uint256[] memory ids = new uint256[](2);
        ids[0] = 0;
        ids[1] = 1;

        vault.batchResolve(ids);

        // Only goal 0 should be resolved
        (,,,, bool resolved0,,) = vault.getGoalDetails(0);
        (,,,, bool resolved1,,) = vault.getGoalDetails(1);

        assertTrue(resolved0, "Goal 0 should be resolved");
        assertFalse(resolved1, "Goal 1 should NOT be resolved");

        assertEq(token.balanceOf(treasury) - treasuryBalBefore, 10 ether, "Only goal 0 to treasury");
    }

    /// @notice Verify isGoalExpired returns correct status.
    function test_IsGoalExpired() public {
        address[] memory vouchies = new address[](0);

        vm.prank(creator);
        vault.createGoal(10 ether, 1 hours, "Expiry Check", vouchies);

        // Not expired yet
        assertFalse(vault.isGoalExpired(0), "Not expired initially");

        // Warp past deadline
        vm.warp(block.timestamp + 2 hours);
        assertTrue(vault.isGoalExpired(0), "Should be expired");

        // Resolve it
        vault.resolve(0);
        assertFalse(vault.isGoalExpired(0), "Not expired after resolution");
    }

    // =========================================================================
    // EDGE CASES & SECURITY TESTS
    // =========================================================================

    /// @notice Verify vouchie cannot vote twice.
    function test_Security_DoubleVotePrevented() public {
        address[] memory vouchies = new address[](2);
        vouchies[0] = bob;
        vouchies[1] = charlie;

        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Double Vote", vouchies);

        vm.prank(bob);
        vault.vote(0, true, 0);

        vm.prank(bob);
        vm.expectRevert("Already voted");
        vault.vote(0, true, 0);
    }

    /// @notice Verify vouchie cannot claim twice.
    function test_Security_DoubleClaimPrevented() public {
        address[] memory vouchies = new address[](2);
        vouchies[0] = bob;
        vouchies[1] = charlie;

        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Double Claim", vouchies);

        vm.prank(bob);
        vault.vote(0, false, 0);
        vm.prank(charlie);
        vault.vote(0, false, 1);

        vm.prank(bob);
        vault.claim(0, 0);

        vm.prank(bob);
        vm.expectRevert("Already claimed");
        vault.claim(0, 0);
    }

    /// @notice Verify cannot resolve before deadline.
    function test_Security_CannotResolveEarly() public {
        address[] memory vouchies = new address[](0);

        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Early Resolve", vouchies);

        vm.expectRevert("Cannot force resolve before deadline");
        vault.resolve(0);
    }

    /// @notice Verify non-vouchie cannot vote.
    function test_Security_OnlyVouchiesCanVote() public {
        address[] memory vouchies = new address[](1);
        vouchies[0] = bob;

        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Outsider Vote", vouchies);

        vm.prank(charlie);
        vm.expectRevert("Not vouchie member");
        vault.vote(0, true, 0);
    }

    /// @notice Verify solo goal cannot have anyone claim after failure (stake goes to treasury).
    function test_Security_SoloNoVouchieClaim() public {
        address[] memory vouchies = new address[](0);

        vm.prank(creator);
        vault.createGoal(100 ether, 1 hours, "Solo No Claim", vouchies);

        vm.warp(block.timestamp + 2 hours);
        vault.resolve(0);

        // Stake is now 0 (sent to treasury), so "Nothing to claim"
        vm.prank(bob);
        vm.expectRevert("Nothing to claim");
        vault.claim(0, 0);
    }

    /// @notice Verify zero stake goal reverts.
    function test_Validation_ZeroStakeReverts() public {
        address[] memory vouchies = new address[](0);

        vm.prank(creator);
        vm.expectRevert("Stake must be > 0");
        vault.createGoal(0, 1 hours, "No Stake", vouchies);
    }

    /// @notice Verify zero duration goal reverts.
    function test_Validation_ZeroDurationReverts() public {
        address[] memory vouchies = new address[](0);

        vm.prank(creator);
        vm.expectRevert("Duration must be > 0");
        vault.createGoal(100 ether, 0, "No Duration", vouchies);
    }

    /// @notice Verify config update works correctly.
    function test_Admin_ConfigUpdate() public {
        address newTreasury = address(999);

        vault.setConfig(newTreasury, 500, 10 ether, 5 ether, 24 hours);

        assertEq(vault.treasury(), newTreasury, "Treasury updated");
        assertEq(vault.lazyTaxBps(), 500, "Tax updated to 5%");
        assertEq(vault.extensionFee(), 10 ether, "Extension fee updated");
        assertEq(vault.badgeFee(), 5 ether, "Badge fee updated");
        assertEq(vault.extensionDuration(), 24 hours, "Extension duration updated");
    }

    /// @notice Verify only owner can update config.
    function test_Admin_OnlyOwnerCanConfig() public {
        vm.prank(bob);
        vm.expectRevert();
        vault.setConfig(bob, 500, 10 ether, 5 ether, 24 hours);
    }

    /// @notice Verify vote tie defaults to success (creator-friendly).
    function test_Voting_TieDefaultsToSuccess() public {
        address[] memory vouchies = new address[](2);
        vouchies[0] = bob;
        vouchies[1] = charlie;

        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Tie Vote", vouchies);

        // 1 valid, 1 invalid = tie
        vm.prank(bob);
        vault.vote(0, true, 0);
        vm.prank(charlie);
        vault.vote(0, false, 1);

        (, , , bool successful, bool resolved, , ) = vault.getGoalDetails(0);
        assertTrue(resolved, "Goal resolved");
        assertTrue(successful, "Tie = success (creator-friendly)");
    }

    /// @notice Verify squad majority vote needed for failure.
    function test_Voting_MajorityNeededForFailure() public {
        address[] memory vouchies = new address[](3);
        vouchies[0] = bob;
        vouchies[1] = charlie;
        vouchies[2] = dave;

        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Majority Vote", vouchies);

        // 2 valid, 1 invalid = success
        vm.prank(bob);
        vault.vote(0, true, 0);
        vm.prank(charlie);
        vault.vote(0, true, 1);
        vm.prank(dave);
        vault.vote(0, false, 2);

        (, , , bool successful, , , ) = vault.getGoalDetails(0);
        assertTrue(successful, "2/3 valid = success");
    }

    /// @notice Verify createdAt is stored correctly.
    function test_CreatedAt_StoredCorrectly() public {
        address[] memory vouchies = new address[](0);

        vm.prank(creator);
        vault.createGoal(100 ether, 1 days, "Timestamp Test", vouchies);

        // Check via grace period (createdAt + 10 min)
        (bool inGrace, uint256 remaining) = vault.getGracePeriodStatus(0);
        assertTrue(inGrace);
        assertEq(remaining, 10 minutes, "Grace period matches createdAt");
    }
}
