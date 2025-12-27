// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VouchieBadge
 * @notice Soulbound-ish NFT badge for successful goal completion.
 * @dev Controlled by the VouchieVault. 
 */
contract VouchieBadge is ERC721, Ownable {
    uint256 public nextTokenId;
    address public vault;
    string public baseURI;

    event VaultUpdated(address indexed oldVault, address indexed newVault);
    event BaseURIUpdated(string newURI);

    constructor() ERC721("Vouchie Badge", "VOUCH") Ownable(msg.sender) {}

    /**
     * @notice Limits minting rights to the VouchieVault contract.
     * @param _vault The address of the VouchieVault.
     */
    function setVault(address _vault) external onlyOwner {
        require(_vault != address(0), "Invalid vault address");
        emit VaultUpdated(vault, _vault);
        vault = _vault;
    }

    /**
     * @notice Updates the metadata base URI.
     * @param _newBaseURI The IPFS/Server URL for badge metadata.
     */
    function setBaseURI(string memory _newBaseURI) external onlyOwner {
        baseURI = _newBaseURI;
        emit BaseURIUpdated(_newBaseURI);
    }

    /**
     * @notice Mints a new badge to a user. Only callable by Vault.
     * @param to The recipient address.
     * @return tokenId The ID of the minted NFT.
     */
    function mint(address to) external returns (uint256) {
        require(msg.sender == vault, "Only vault can mint");
        uint256 tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        return tokenId;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }
}