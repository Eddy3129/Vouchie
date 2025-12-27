// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/VouchieVault.sol";
import "../contracts/VouchieBadge.sol";
import "../contracts/MockUSDC.sol";

/**
 * @notice Deploy script for VouchieVault contract (Vouchie)
 * @dev Deploys MockUSDC, VouchieBadge, and VouchieVault with proper linkages
 */
contract DeployVouchieVault is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        // Deploy MockUSDC first to use as the staking token
        MockUSDC mockUSDC = new MockUSDC();
        console.log("MockUSDC deployed at:", address(mockUSDC));

        // Deploy Badge NFT
        VouchieBadge badge = new VouchieBadge();
        console.log("VouchieBadge deployed at:", address(badge));

        // Deploy VouchieVault with MockUSDC address
        VouchieVault vouchieVault = new VouchieVault(address(mockUSDC));
        console.log("VouchieVault deployed at:", address(vouchieVault));

        // Setup Linkage between contracts
        vouchieVault.setBadgeContract(address(badge));
        badge.setVault(address(vouchieVault));

        // Mint test tokens to deployer for testing (10,000 mUSDC)
        mockUSDC.mint(deployer, 10_000 * 10 ** 18);
        console.log("Minted 10,000 mUSDC to deployer:", deployer);
    }
}