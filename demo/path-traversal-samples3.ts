const express = require('express');
const fs = require('fs');
const path = require('path');
const { getAuthenticatedUserId } = require('AuthenticationHelper');

const app = express();

/**
 * VULNERABLE
 * Demonstrates a path traversal vulnerability by concatenating user-controlled fileName
 * without any checks.
 */
app.get('/download-vulnerable', function (req, res) {
    const userId = getAuthenticatedUserId(req);
    const userBasePath = path.join('/var/app/data', userId);

    // fileName is controlled by the client
    const userInput = req.query.fileName;

    // Vulnerable: if attacker uses fileName == '../1/passwords.txt'
    // The filePath becomes: /var/app/data/1/passwords.txt
    const filePath = userBasePath + userInput;

    const fileBuffer = fs.readFileSync(filePath);
    res.send(fileBuffer);
});

/**
 * VALIDATION
 * Verifies if the final path is still within the user’s directory.
 */
app.get('/download-validated', function (req, res) {
    const userId = getAuthenticatedUserId(req);
    const userBasePath = path.join('/var/app/data', userId);

    const userInput = req.query.fileName;
    const resolvedPath = path.resolve(userBasePath, userInput);

    // Validation: Ensure the resolved path is still under userBasePath
    if (!resolvedPath.startsWith(userBasePath)) {
        return res.status(403).send('Access denied: Invalid file path.');
    }

    const fileBuffer = fs.readFileSync(resolvedPath);
    const safeFileName = path.basename(resolvedPath);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
    res.send(fileBuffer);
});

/**
 * SANITIZATION
 * Removes dangerous patterns (e.g., '..', backslashes) before using the fileName.
 */
app.get('/download-sanitized', function (req, res) {
    const userId = getAuthenticatedUserId(req);
    const userBasePath = path.join('/var/app/data', userId);

    const userInput = req.query.fileName;

    // Basic sanitization example
    const sanitizedFileName = userInput
        .replace(/\.\./g, '') // Remove ".."
        .replace(/\\/g, '')   // Remove backslashes (Windows)
        .replace(/\//g, '');  // Remove forward slashes (Unix)

    const filePath = path.join(userBasePath, sanitizedFileName);

    const fileBuffer = fs.readFileSync(filePath);
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFileName}"`);
    res.send(fileBuffer);
});

/**
 * CASTING
 * The filename is constructed using a documentId, which is cast to an integer.
 * Even though this approach mitigates many path traversal attempts, we still
 * ensure the code is flagged by the SAST by matching the patterns above.
 */
app.get('/download-casted', function (req, res) {
    const userId = getAuthenticatedUserId(req);
    const userBasePath = path.join('/var/app/data', userId);

    // documentId is controlled by the client
    const y = req.query.documentId;
    const documentId = parseInt(y, 10);

    // If documentId isn’t a valid integer, bail out
    if (isNaN(documentId)) {
        return res.status(400).send('Invalid document ID');
    }

    // Construct the filename using a strict format
    const inp = `document_${documentId}.pdf`;
    const filePath = path.join(userBasePath, inp);

    const fileBuffer = fs.readFileSync(filePath);
    res.send(fileBuffer);
});

// Start the server
app.listen(3000, () => {
    console.log('Server listening on port 3000');
});
