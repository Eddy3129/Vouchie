// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/VouchieVault.sol";
import "../contracts/VouchieBadge.sol";
import "../contracts/MockToken.sol";

/**
 * @notice Deploy script for VouchieVault contract (Vouchie)
 */
contract DeployVouchieVault is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        // Deploy MockToken first to use as the staking token
        MockToken mockToken = new MockToken();
        console.log("MockToken deployed at:", address(mockToken));

        // Deploy Badge
        VouchieBadge badge = new VouchieBadge();
        console.log("VouchieBadge deployed at:", address(badge));

        // Deploy VouchieVault with MockToken address
        VouchieVault vouchieVault = new VouchieVault(address(mockToken));
        console.log("VouchieVault deployed at:", address(vouchieVault));
        
        // Setup Linkage
        vouchieVault.setBadgeContract(address(badge));
        badge.setVault(address(vouchieVault));

        // Optionally mint some tokens to the deployer for testing
        mockToken.mint(deployer, 1000 * 10 ** 18);
    }
}