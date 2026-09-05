// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Testnet credential registry. Issuer approval is an explicit trust boundary.
contract ProoflineCredential is ERC721, Ownable2Step, ReentrancyGuard {
    error Unauthorized();
    error InvalidInput();
    error AlreadyRegistered();
    error UnknownIssuer();
    error UnknownCredential();
    error DuplicateSerial();
    error Soulbound();
    error AlreadyRevoked();
    error InvalidPagination();

    struct Issuer {
        string label;
        address parent;
        bool enabled;
        bool institution;
    }

    struct Credential {
        address recipient;
        address issuer;
        address institution;
        bytes32 serial;
        string cid;
        bytes32 metadataHash;
        uint64 issuedAt;
        bool revoked;
        uint8 reason;
    }
    mapping(address => Issuer) private _issuers;
    mapping(uint256 => Credential) private _credentials;
    mapping(address => mapping(bytes32 => bool)) public usedSerial;
    mapping(address => uint256[]) private _recipientTokens;
    mapping(address => uint256[]) private _issuerTokens;
    address[] private _issuerAddresses;
    uint256 public totalIssued;
    uint256 public totalRevoked;
    event InstitutionRegistered(address indexed institution, string label);
    event DepartmentRegistered(address indexed institution, address indexed department, string label);
    event IssuerStatusChanged(address indexed issuer, bool enabled);
    event CredentialIssued(
        uint256 indexed tokenId, address indexed recipient, address indexed issuer, address institution, bytes32 serial
    );
    event CredentialRevoked(uint256 indexed tokenId, address indexed revokedBy, uint8 reason);
    event Locked(uint256 tokenId);

    constructor(address admin) ERC721("Proofline Credential", "PROOF") Ownable(admin) {}

    function registerInstitution(address account, string calldata label) external onlyOwner nonReentrant {
        _register(account, label, account, true);
        emit InstitutionRegistered(account, label);
    }

    function registerDepartment(address account, string calldata label) external nonReentrant {
        Issuer storage parent = _issuers[msg.sender];
        if (!parent.institution || !parent.enabled) revert Unauthorized();
        _register(account, label, msg.sender, false);
        emit DepartmentRegistered(msg.sender, account, label);
    }

    function _register(address account, string calldata label, address parent, bool institution) private {
        if (account == address(0) || bytes(label).length == 0 || bytes(label).length > 100) revert InvalidInput();
        if (_issuers[account].parent != address(0)) revert AlreadyRegistered();
        _issuers[account] = Issuer(label, parent, true, institution);
        _issuerAddresses.push(account);
    }

    function setIssuerEnabled(address account, bool enabled) external nonReentrant {
        Issuer storage issuer = _issuers[account];
        if (issuer.parent == address(0)) revert UnknownIssuer();
        if (issuer.institution ? msg.sender != owner() : msg.sender != issuer.parent) revert Unauthorized();
        issuer.enabled = enabled;
        emit IssuerStatusChanged(account, enabled);
    }

    function canIssue(address account) public view returns (bool) {
        Issuer storage issuer = _issuers[account];
        return issuer.enabled && _issuers[issuer.parent].enabled;
    }

    function issue(address recipient, bytes32 serial, string calldata cid, bytes32 metadataHash)
        external
        nonReentrant
        returns (uint256 tokenId)
    {
        if (!canIssue(msg.sender)) revert Unauthorized();
        if (
            recipient == address(0) || serial == bytes32(0) || metadataHash == bytes32(0) || bytes(cid).length < 10
                || bytes(cid).length > 120
        ) revert InvalidInput();
        if (usedSerial[msg.sender][serial]) revert DuplicateSerial();
        usedSerial[msg.sender][serial] = true;
        tokenId = ++totalIssued;
        address institution = _issuers[msg.sender].parent;
        _credentials[tokenId] = Credential(
            recipient, msg.sender, institution, serial, cid, metadataHash, uint64(block.timestamp), false, 0
        );
        _recipientTokens[recipient].push(tokenId);
        _issuerTokens[msg.sender].push(tokenId);
        _safeMint(recipient, tokenId);
        emit CredentialIssued(tokenId, recipient, msg.sender, institution, serial);
        emit Locked(tokenId);
    }

    function canRevoke(uint256 tokenId, address caller) public view returns (bool) {
        Credential storage c = _credentials[tokenId];
        return c.recipient != address(0) && !c.revoked && _issuers[c.institution].enabled
            && (caller == c.institution || (caller == c.issuer && _issuers[caller].enabled));
    }

    function revoke(uint256 tokenId, uint8 reason) external nonReentrant {
        Credential storage c = _credentials[tokenId];
        if (c.recipient == address(0)) revert UnknownCredential();
        if (c.revoked) revert AlreadyRevoked();
        if (!canRevoke(tokenId, msg.sender)) revert Unauthorized();
        if (reason == 0 || reason > 3) revert InvalidInput();
        c.revoked = true;
        c.reason = reason;
        totalRevoked++;
        emit CredentialRevoked(tokenId, msg.sender, reason);
    }

    function credential(uint256 tokenId) external view returns (Credential memory) {
        if (_credentials[tokenId].recipient == address(0)) revert UnknownCredential();
        return _credentials[tokenId];
    }

    function issuerInfo(address account) external view returns (Issuer memory) {
        return _issuers[account];
    }

    function issuerCount() external view returns (uint256) {
        return _issuerAddresses.length;
    }

    function issuers(uint256 offset, uint256 limit) external view returns (address[] memory page) {
        uint256 length = _pageLength(_issuerAddresses.length, offset, limit);
        page = new address[](length);
        for (uint256 i; i < length; ++i) {
            page[i] = _issuerAddresses[offset + i];
        }
    }

    function tokensOf(address recipient, uint256 offset, uint256 limit) external view returns (uint256[] memory) {
        return _page(_recipientTokens[recipient], offset, limit);
    }

    function tokensByIssuer(address issuer, uint256 offset, uint256 limit) external view returns (uint256[] memory) {
        return _page(_issuerTokens[issuer], offset, limit);
    }

    function issuerTokenCount(address issuer) external view returns (uint256) {
        return _issuerTokens[issuer].length;
    }

    function _page(uint256[] storage values, uint256 offset, uint256 limit)
        private
        view
        returns (uint256[] memory page)
    {
        uint256 length = _pageLength(values.length, offset, limit);
        page = new uint256[](length);
        for (uint256 i; i < length; ++i) {
            page[i] = values[offset + i];
        }
    }

    function _pageLength(uint256 size, uint256 offset, uint256 limit) private pure returns (uint256) {
        if (limit == 0 || limit > 50) revert InvalidPagination();
        if (offset >= size) return 0;
        return size - offset < limit ? size - offset : limit;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string.concat("ipfs://", _credentials[tokenId].cid);
    }

    function locked(uint256 tokenId) external view returns (bool) {
        _requireOwned(tokenId);
        return true;
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == 0xb45a3c0e || super.supportsInterface(interfaceId);
    }

    function approve(address, uint256) public pure override {
        revert Soulbound();
    }

    function setApprovalForAll(address, bool) public pure override {
        revert Soulbound();
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        if (_ownerOf(tokenId) != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }

    /// @dev Avoid permanently stranding issuer administration through accidental renunciation.
    function renounceOwnership() public view override onlyOwner {
        revert InvalidInput();
    }
}
