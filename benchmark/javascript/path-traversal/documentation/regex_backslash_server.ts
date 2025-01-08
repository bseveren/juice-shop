// server.js
const http = require("http");
const url = require("url");

/**
 * Regex that detects directory-traversal attempts:
 * - (?:^|[\\/])  => Start of string OR a slash/backslash
 * - \.\.         => Two literal dots ("..")
 * - (?:[\\/]|$)  => Followed by a slash/backslash OR end of string
 */
const UP_PATH_REGEXP = /(?:^|[\\/])\.\.(?:[\\/]|$)/;

// Create a simple HTTP server
const server = http.createServer((req, res) => {
	// Parse the URL and get the "file" query parameter
	const parsedUrl = url.parse(req.url, true);
	const fileParam = parsedUrl.query.file || "";

	// Log the raw fileParam to see how Node interprets the backslashes
	console.log("User-supplied file param:", JSON.stringify(fileParam));

	// Test against the regex
	const isTraversalAttempt = UP_PATH_REGEXP.test(fileParam);

	// Respond with a JSON summary
	const responseBody = {
		fileParam,
		matchedTraversalRegex: isTraversalAttempt,
		explanation: isTraversalAttempt
			? "Regex detected '..' pattern with slashes or backslashes."
			: "No '..' pattern detected.",
	};

	res.writeHead(200, { "Content-Type": "application/json" });
	res.end(JSON.stringify(responseBody));
});

// Start the server on port 3000
server.listen(8023, () => {
	console.log("Server running at http://localhost:8023");
});
