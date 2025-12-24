// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VouchieBadge is ERC721, Ownable {
    uint256 public nextTokenId;
    address public vault;
    string public baseURI;

    constructor() ERC721("Vouchie Badge", "VOUCH") Ownable(msg.sender) {}

    function setVault(address _vault) external onlyOwner {
        vault = _vault;
    }

    function setBaseURI(string memory _baseURIValue) external onlyOwner {
        baseURI = _baseURIValue;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function mint(address to) external returns (uint256) {
        require(msg.sender == vault, "Only vault can mint");
        uint256 tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        return tokenId;
    }
}
