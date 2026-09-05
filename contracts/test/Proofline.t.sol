// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ProoflineCredential} from "../src/ProoflineCredential.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

interface Vm {
    function prank(address) external;
    function expectRevert() external;
    function expectRevert(bytes4) external;
}

contract Receiver is IERC721Receiver {
    ProoflineCredential registry;
    bool public blocked;
    bool public reject;

    constructor(ProoflineCredential r) {
        registry = r;
    }

    function configure(bool value) external {
        reject = value;
    }

    function mint() external {
        registry.issue(address(this), bytes32(uint256(9)), "bafy-test-cid", bytes32(uint256(1)));
    }

    function onERC721Received(address, address, uint256 id, bytes calldata) external returns (bytes4) {
        (bool ok,) = address(registry).call(abi.encodeCall(registry.revoke, (id, uint8(1))));
        blocked = !ok;
        (bool again,) = address(registry)
            .call(
                abi.encodeCall(
                    registry.issue, (address(this), bytes32(uint256(10)), "bafy-test-cid", bytes32(uint256(2)))
                )
            );
        require(!again, "reentrant mint");
        if (reject) revert("receiver rejected");
        return IERC721Receiver.onERC721Received.selector;
    }
}

contract ProoflineTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    ProoflineCredential r;
    address university = address(0x111);
    address department = address(0x222);
    address student = address(0x333);
    address other = address(0x444);

    function setUp() public {
        r = new ProoflineCredential(address(this));
        r.registerInstitution(university, "Example Academy");
        vm.prank(university);
        r.registerDepartment(department, "Software");
    }

    function mint() internal returns (uint256) {
        vm.prank(department);
        return r.issue(student, bytes32(uint256(1)), "bafy-test-cid", bytes32(uint256(42)));
    }

    function testIssuanceProvenanceAndIndexes() public {
        uint256 id = mint();
        ProoflineCredential.Credential memory c = r.credential(id);
        require(c.issuer == department && c.institution == university && c.recipient == student);
        require(r.ownerOf(id) == student && r.locked(id));
        require(r.totalIssued() == 1 && r.balanceOf(student) == 1);
        require(r.tokensOf(student, 0, 50)[0] == id);
        require(r.tokensByIssuer(department, 0, 50)[0] == id);
        require(r.supportsInterface(0xb45a3c0e));
        require(keccak256(bytes(r.tokenURI(id))) == keccak256("ipfs://bafy-test-cid"));
    }

    function testUnauthorizedIssuance() public {
        vm.expectRevert(ProoflineCredential.Unauthorized.selector);
        vm.prank(other);
        r.issue(student, bytes32(uint256(1)), "bafy-test-cid", bytes32(uint256(42)));
    }

    function testDuplicateSerial() public {
        mint();
        vm.expectRevert(ProoflineCredential.DuplicateSerial.selector);
        mint();
    }

    function testAllTransferPathsBlocked() public {
        uint256 id = mint();
        vm.expectRevert();
        vm.prank(student);
        r.transferFrom(student, other, id);
        vm.expectRevert();
        vm.prank(student);
        r.safeTransferFrom(student, other, id);
        vm.expectRevert();
        vm.prank(student);
        r.safeTransferFrom(student, other, id, "");
        vm.expectRevert();
        vm.prank(student);
        r.transferFrom(student, student, id);
        require(r.ownerOf(id) == student);
    }

    function testApprovalsBlocked() public {
        uint256 id = mint();
        vm.expectRevert();
        vm.prank(student);
        r.approve(other, id);
        vm.expectRevert();
        vm.prank(student);
        r.setApprovalForAll(other, true);
    }

    function testRevokePreservesRecord() public {
        uint256 id = mint();
        vm.prank(department);
        r.revoke(id, 1);
        require(r.credential(id).revoked && r.ownerOf(id) == student);
        require(r.credential(id).metadataHash == bytes32(uint256(42)));
        require(r.totalRevoked() == 1);
        vm.expectRevert(ProoflineCredential.AlreadyRevoked.selector);
        vm.prank(department);
        r.revoke(id, 1);
    }

    function testUnrelatedCannotRevoke() public {
        uint256 id = mint();
        vm.expectRevert(ProoflineCredential.Unauthorized.selector);
        vm.prank(other);
        r.revoke(id, 1);
        vm.expectRevert(ProoflineCredential.Unauthorized.selector);
        r.revoke(id, 1);
    }

    function testParentCanRevokeDisabledDepartment() public {
        uint256 id = mint();
        vm.prank(university);
        r.setIssuerEnabled(department, false);
        require(!r.canIssue(department));
        vm.expectRevert();
        vm.prank(department);
        r.revoke(id, 1);
        vm.prank(university);
        r.revoke(id, 2);
        require(r.credential(id).revoked);
    }

    function testDisabledParentStopsMintAndRevoke() public {
        uint256 id = mint();
        r.setIssuerEnabled(university, false);
        require(!r.canIssue(department));
        require(!r.canRevoke(id, department));
        require(!r.canRevoke(id, university));
        require(!r.credential(id).revoked);
        vm.expectRevert();
        vm.prank(university);
        r.revoke(id, 1);
        r.setIssuerEnabled(university, true);
        vm.prank(university);
        r.revoke(id, 1);
    }

    function testDirectInstitution() public {
        vm.prank(university);
        uint256 id = r.issue(student, bytes32(uint256(3)), "bafy-test-cid", bytes32(uint256(4)));
        require(r.credential(id).issuer == university && r.credential(id).institution == university);
        vm.prank(university);
        r.revoke(id, 3);
    }

    function testHierarchyCannotBeReparented() public {
        r.registerInstitution(other, "Other Academy");
        vm.expectRevert();
        vm.prank(other);
        r.registerDepartment(department, "Hijack");
        vm.expectRevert();
        vm.prank(other);
        r.setIssuerEnabled(department, false);
        vm.expectRevert();
        vm.prank(department);
        r.registerDepartment(student, "Nested");
    }

    function testInvalidInputsAndUnknowns() public {
        vm.expectRevert();
        r.registerInstitution(address(0), "X");
        vm.expectRevert();
        r.registerInstitution(other, "");
        vm.expectRevert();
        r.credential(8);
        vm.expectRevert();
        r.locked(8);
        vm.expectRevert();
        r.tokenURI(8);
        vm.expectRevert();
        vm.prank(department);
        r.issue(address(0), bytes32(uint256(1)), "bafy-test-cid", bytes32(uint256(1)));
        uint256 id = mint();
        vm.expectRevert();
        vm.prank(department);
        r.revoke(id, 0);
    }

    function testPagination() public {
        mint();
        require(r.tokensOf(student, 1, 50).length == 0);
        require(r.issuers(0, 50).length == 2);
        vm.expectRevert();
        r.issuers(0, 51);
        vm.expectRevert();
        r.tokensOf(student, 0, 0);
    }

    function testReceiverCannotReenterOrRevoke() public {
        Receiver receiver = new Receiver(r);
        r.registerInstitution(address(receiver), "Contract issuer");
        receiver.mint();
        require(receiver.blocked());
        require(!r.credential(1).revoked && r.totalIssued() == 1);
    }

    function testRejectedReceiverRollsBackEverything() public {
        Receiver receiver = new Receiver(r);
        r.registerInstitution(address(receiver), "Contract issuer");
        receiver.configure(true);
        vm.expectRevert();
        receiver.mint();
        require(r.totalIssued() == 0);
        require(!r.usedSerial(address(receiver), bytes32(uint256(9))));
        require(r.tokensOf(address(receiver), 0, 50).length == 0);
    }

    function testOwnershipRequiresAcceptance() public {
        r.transferOwnership(other);
        require(r.owner() == address(this));
        vm.prank(other);
        r.acceptOwnership();
        require(r.owner() == other);
        vm.expectRevert();
        r.registerInstitution(student, "No");
        vm.expectRevert();
        vm.prank(other);
        r.renounceOwnership();
    }

    function testFuzzOwnershipAndRevocationStayFixed(bytes32 serial, bytes32 hash) public {
        if (serial == 0 || hash == 0) return;
        vm.prank(department);
        uint256 id = r.issue(student, serial, "bafy-test-cid", hash);
        vm.prank(university);
        r.revoke(id, 1);
        vm.expectRevert();
        vm.prank(student);
        r.transferFrom(student, other, id);
        require(
            r.ownerOf(id) == student && r.credential(id).metadataHash == hash && r.credential(id).serial == serial
                && r.credential(id).revoked
        );
    }
}
