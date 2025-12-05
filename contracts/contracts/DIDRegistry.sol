// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title DIDRegistry - Minimal registry for did:mychain DIDs
/// @notice Stores a reference to the DID Document and a simple credential revocation registry
contract DIDRegistry {
    struct DIDRecord {
        string didDocumentURI; // Could be IPFS CID, HTTPS URL, or inline JSON for MVP
        address controller;    // Who controls this DID
        bool exists;
    }

    // Maps Ethereum address -> DIDRecord (our did:mychain:<address>)
    mapping(address => DIDRecord) private dids;

    // Simple credential status mapping: hash(credential-id) -> revoked?
    mapping(bytes32 => bool) private revokedCredentials;

    event DIDRegistered(address indexed subject, string didDocumentURI, address controller);
    event DIDUpdated(address indexed subject, string didDocumentURI);
    event CredentialStatusChanged(bytes32 indexed credentialIdHash, bool revoked);

    /// @notice Register a DID for msg.sender
    /// @param didDocumentURI A URI or hash pointing to the DID Document
    function registerDID(string calldata didDocumentURI) external {
        require(!dids[msg.sender].exists, "DID already exists for this address");

        dids[msg.sender] = DIDRecord({
            didDocumentURI: didDocumentURI,
            controller: msg.sender,
            exists: true
        });

        emit DIDRegistered(msg.sender, didDocumentURI, msg.sender);
    }

    /// @notice Update DID Document reference for msg.sender
    /// @param didDocumentURI New URI/hash for the DID Document
    function updateDID(string calldata didDocumentURI) external {
        require(dids[msg.sender].exists, "DID not registered");

        dids[msg.sender].didDocumentURI = didDocumentURI;

        emit DIDUpdated(msg.sender, didDocumentURI);
    }

    /// @notice Resolve DID stored for an address
    /// @param subject The address whose DID we are resolving
    /// @return didDocumentURI URI/hash of DID Document
    /// @return controller Controller address
    /// @return exists Whether DID is registered
    function resolveDID(address subject)
        external
        view
        returns (string memory didDocumentURI, address controller, bool exists)
    {
        DIDRecord memory rec = dids[subject];
        return (rec.didDocumentURI, rec.controller, rec.exists);
    }

    /// @notice Set revocation status for a credential
    /// @dev In a more advanced design, you would add access control (only issuer can revoke)
    /// @param credentialIdHash keccak256 hash of the credential's id or entire VC
    /// @param revoked Revocation status
    function setCredentialStatus(bytes32 credentialIdHash, bool revoked) external {
        // NOTE: For a real system, enforce that only authorized issuers can revoke.
        revokedCredentials[credentialIdHash] = revoked;
        emit CredentialStatusChanged(credentialIdHash, revoked);
    }

    /// @notice Check whether a credential is revoked
    /// @param credentialIdHash keccak256 hash of the credential's id or entire VC
    /// @return revoked True if revoked
    function isCredentialRevoked(bytes32 credentialIdHash) external view returns (bool revoked) {
        return revokedCredentials[credentialIdHash];
    }
}
