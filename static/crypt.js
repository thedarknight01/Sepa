// Wrap all crypto functions in a global 'sepa.crypto' object
window.sepa = window.sepa || {};
window.sepa.crypto = (function() {

    // --- Helper Functions for ArrayBuffer <-> Base64 ---
    
    function abToB64(buffer) {
        return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)));
    }
    
    function b64ToAb(base64) {
        const binary_string = window.atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }

    // --- ASYMMETRIC (RSA) FUNCTIONS for Handshake ---

    /**
     * Generates a new RSA-OAEP key pair for the handshake.
     * @returns {Promise<{publicKey: CryptoKey, privateKey: CryptoKey}>}
     */
    async function generateRsaKeyPair() {
        return await window.crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
                hash: "SHA-256",
            },
            true, // non-extractable private key
            ["encrypt", "decrypt"]
        );
    }

    /**
     * Exports a CryptoKey (public) to a Base64 string.
     * @param {CryptoKey} key - The public CryptoKey.
     * @returns {Promise<string>} Base64-encoded key.
     */
    async function exportPublicKeyB64(key) {
        const exported = await window.crypto.subtle.exportKey("spki", key);
        return abToB64(exported);
    }

    /**
     * Imports a Base64-encoded public key.
     * @param {string} keyB64 - The Base64 string.
     * @returns {Promise<CryptoKey>} The imported CryptoKey.
     */
    async function importPublicKeyB64(keyB64) {
        const keyBuffer = b64ToAb(keyB64);
        return await window.crypto.subtle.importKey(
            "spki",
            keyBuffer,
            { name: "RSA-OAEP", hash: "SHA-256" },
            true,
            ["encrypt"]
        );
    }

    /**
     * Encrypts the AES key (as a string) using the receiver's public key.
     * @param {string} aesKeyB64 - The AES key to encrypt.
     * @param {string} publicKeyB64 - The receiver's public key.
     * @returns {Promise<string>} Base64-encoded encrypted AES key.
     */
    async function encryptAesKey(aesKeyB64, publicKeyB64) {
        const publicKey = await importPublicKeyB64(publicKeyB64);
        const dataBuffer = new TextEncoder().encode(aesKeyB64);
        const encryptedBuffer = await window.crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            publicKey,
            dataBuffer
        );
        return abToB64(encryptedBuffer);
    }

    /**
     * Decrypts the AES key using the receiver's private key.
     * @param {string} encryptedKeyB64 - The encrypted key from the sender.
     * @param {CryptoKey} privateKey - The receiver's own private key.
     * @returns {Promise<string>} The decrypted AES key (Base64 string).
     */
    async function decryptAesKey(encryptedKeyB64, privateKey) {
        const encryptedBuffer = b64ToAb(encryptedKeyB64);
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "RSA-OAEP" },
            privateKey,
            encryptedBuffer
        );
        return new TextDecoder().decode(decryptedBuffer);
    }

    // --- SYMMETRIC (AES) FUNCTIONS for Text Sharing ---

    /**
     * Generates a new AES-GCM key.
     * @returns {Promise<string>} Base64-encoded AES key.
     */
    async function generateAesKey() {
        const key = await window.crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
        const keyRaw = await window.crypto.subtle.exportKey("raw", key);
        return abToB64(keyRaw);
    }

    /**
     * Imports a Base64-encoded AES-GCM key.
     * @param {string} keyB64 - The base64-encoded key.
     * @returns {Promise<CryptoKey>} The imported CryptoKey object.
     */
    async function importAesKey(keyB64) {
        const keyRaw = b64ToAb(keyB64);
        return await window.crypto.subtle.importKey(
            "raw",
            keyRaw,
            "AES-GCM",
            true,
            ["encrypt", "decrypt"]
        );
    }

    /**
     * Encrypts plaintext with the shared AES key.
     * @param {string} text - The plaintext to encrypt.
     * @param {string} aesKeyB64 - The shared session key.
     * @returns {Promise<string>} Ciphertext (IV:CT).
     */
    async function encryptText(text, aesKeyB64) {
        const enc = new TextEncoder();
        const key = await importAesKey(aesKeyB64);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        
        const ciphertextBuf = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            key,
            enc.encode(text)
        );
        
        const ivB64 = abToB64(iv);
        const ciphertextB64 = abToB64(ciphertextBuf);
        return ivB64 + ":" + ciphertextB64;
    }

    /**
     * Decrypts ciphertext with the shared AES key.
     * @param {string} ciphertext - (IV:CT).
     * @param {string} aesKeyB64 - The shared session key.
     * @returns {Promise<string>} The decrypted plaintext.
     */
    async function decryptText(ciphertext, aesKeyB64) {
        const [ivB64, ctB64] = ciphertext.split(":");
        if (!ivB64 || !ctB64) {
            throw new Error("Invalid ciphertext format. Expected 'iv:ciphertext'");
        }

        const iv = b64ToAb(ivB64);
        const ciphertextBuf = b64ToAb(ctB64);
        const key = await importAesKey(aesKeyB64);
        
        const plainBuf = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv, tagLength: 128 },
            key,
            ciphertextBuf
        );
        
        return new TextDecoder().decode(plainBuf);
    }

    // Expose public functions
    return {
        generateAesKey,
        generateRsaKeyPair,
        exportPublicKeyB64,
        encryptAesKey,
        decryptAesKey,
        encryptText,
        decryptText
    };

})();