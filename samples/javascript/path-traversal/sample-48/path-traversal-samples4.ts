import express from 'express';
import path from 'path';
import { getAuthenticatedUserId } from 'AuthenticationHelper';

const app = express();

/**
 * VULNERABLE
 * Demonstrates a path traversal vulnerability by concatenating user-controlled fileName
 * without any checks.
 */
app.get('/download-vulnerable', (req, res) => {
    const userId = getAuthenticatedUserId(req);
    // The user should only have access to documents in their subdirectory
    const userBasePath = path.join('/var/app/data', userId);

    // fileName is controlled by the client
    const fileName = req.query.fileName as string;

    // Vulnerable: if attacker uses fileName == '../1/passwords.txt'
    // The filePath becomes: /var/app/data/1/passwords.txt
    // If user with id 1 has a passwords.txt file, the attacker can download it
    const filePath = path.resolve(userBasePath, fileName);

    res.sendFile(filePath);
});

/**
 * VALIDATION
 * Verifies if the final path is still within the user’s directory.
 */
app.get('/download-validated', (req, res) => {
    const userId = getAuthenticatedUserId(req);
    // The user should only have access to documents in their subdirectory
    const userBasePath = path.join('/var/app/data', userId);

    // fileName is controlled by the client
    const fileName = req.query.fileName as string;

    // Resolve the full path
    const resolvedPath = path.resolve(userBasePath, fileName);

    // Validation: Ensure the resolved path is still under userBasePath
    if (resolvedPath.startsWith(userBasePath)) {
        res.sendFile(resolvedPath);
    }
});

/**
 * SANITIZATION
 * Removes dangerous patterns (e.g., '..', backslashes) before using the fileName.
 * This approach helps mitigate path traversal, but can be combined with validation
 * for an extra layer of security.
 */
app.get('/download-sanitized', (req, res) => {
    const userId = getAuthenticatedUserId(req);
    // The user should only have access to documents in their subdirectory
    const userBasePath = path.join('/var/app/data', userId);

    // fileName is controlled by the client
    const fileName = req.query.fileName as string;

    // Remove known path-traversal patterns (basic example)
    const sanitizedFileName = fileName
        .replace(/\.\./g, '') // Remove ".."
        .replace(/\\/g, '') // Remove backslashes (Windows)
        .replace(/\//g, ''); // Remove forward slashes (Unix)

    // Construct a path under the user's directory using the sanitized fileName
    const filePath = path.resolve(userBasePath, sanitizedFileName);

    res.sendFile(filePath);
});

/**
 * CASTING
 * The filename is constructed using a documentId, which is cast to an integer. Since integer cannot contain
 * ../ patterns, the sample is not vulnerable
 */
app.get('/download-casted', (req, res) => {
    const userId = getAuthenticatedUserId(req);
    // The user should only have access to documents in their subdirectory
    const userBasePath = path.join('/var/app/data', userId);

    // documentId is controlled by the client, but we cast it to a number
    const documentIdStr = req.query.documentId as string;
    const documentId = parseInt(documentIdStr, 10);

    // If documentId isn’t a valid integer, bail out
    if (isNaN(documentId)) {
        return res.status(400).send('Invalid document ID');
    }

    // Construct the filename using a strict format: "document_<id>.pdf"
    // This removes any possibility for malicious path segments
    const fileName = `document_${documentId}.pdf`;

    // Build the final path
    const filePath = path.resolve(userBasePath, fileName);

    res.sendFile(filePath);
});

// Start the server
app.listen(3000, () => {
    console.log('Server listening on port 3000');
});
