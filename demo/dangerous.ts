import mysql from 'mysql2/promise';

// Simulated database connection (assuming this is properly configured)
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'password123',
    database: 'testdb'
};

/**
 * (VULNERABILITY)
 * The bottom-level function that performs an **insecure** SQL query.
 */
async function doVulnerableQuery(userInput: string): Promise<void> {
    const connection = await mysql.createConnection(dbConfig);

    // **Vulnerable:** Directly concatenating user input into the SQL query (SQL Injection)
    const query = `SELECT * FROM Users WHERE username = '${userInput}'`;

    console.log("[QUERY]:", query);

    try {
        const [rows] = await connection.execute(query); // Actually executing the query
        console.log("Query Result:", rows);
    } catch (error) {
        console.error("Database Error:", error);
    } finally {
        await connection.end();
    }
}

/***************************************************************************
 * LEVEL 3 (Build Query Functions)
 * Each of these 27 functions calls the vulnerable function directly.
 ***************************************************************************/

/**
 * (3.1)
 */
function buildQueryA1(userInput: string): void {
    // Some mock transformation
    const sanitized = userInput.trim().toLowerCase();
    doVulnerableQuery(sanitized);
}

/**
 * (3.2)
 */
function buildQueryA2(userInput: string): void {
    const sanitized = userInput.replace("'", "''");
    doVulnerableQuery(sanitized);
}

/**
 * (3.3)
 */
function buildQueryA3(userInput: string): void {
    const sanitized = userInput.split(" ").join("_");
    doVulnerableQuery(sanitized);
}

/**
 * (3.4)
 */
function buildQueryA4(userInput: string): void {
    doVulnerableQuery(`[A4]_${userInput}`);
}

/**
 * (3.5)
 */
function buildQueryA5(userInput: string): void {
    doVulnerableQuery(`[A5]_${userInput}`);
}

/**
 * (3.6)
 */
function buildQueryA6(userInput: string): void {
    doVulnerableQuery(`[A6]_${userInput}`);
}

/**
 * (3.7)
 */
function buildQueryA7(userInput: string): void {
    doVulnerableQuery(`[A7]_${userInput}`);
}

/**
 * (3.8)
 */
function buildQueryA8(userInput: string): void {
    doVulnerableQuery(`[A8]_${userInput}`);
}

/**
 * (3.9)
 */
function buildQueryA9(userInput: string): void {
    doVulnerableQuery(`[A9]_${userInput}`);
}

/**
 * (3.10)
 */
function buildQueryB1(userInput: string): void {
    doVulnerableQuery(`[B1]_${userInput}`);
}

/**
 * (3.11)
 */
function buildQueryB2(userInput: string): void {
    doVulnerableQuery(`[B2]_${userInput}`);
}

/**
 * (3.12)
 */
function buildQueryB3(userInput: string): void {
    doVulnerableQuery(`[B3]_${userInput}`);
}

/**
 * (3.13)
 */
function buildQueryB4(userInput: string): void {
    doVulnerableQuery(`[B4]_${userInput}`);
}

/**
 * (3.14)
 */
function buildQueryB5(userInput: string): void {
    doVulnerableQuery(`[B5]_${userInput}`);
}

/**
 * (3.15)
 */
function buildQueryB6(userInput: string): void {
    doVulnerableQuery(`[B6]_${userInput}`);
}

/**
 * (3.16)
 */
function buildQueryB7(userInput: string): void {
    doVulnerableQuery(`[B7]_${userInput}`);
}

/**
 * (3.17)
 */
function buildQueryB8(userInput: string): void {
    doVulnerableQuery(`[B8]_${userInput}`);
}

/**
 * (3.18)
 */
function buildQueryB9(userInput: string): void {
    doVulnerableQuery(`[B9]_${userInput}`);
}

/**
 * (3.19)
 */
function buildQueryC1(userInput: string): void {
    doVulnerableQuery(`[C1]_${userInput}`);
}

/**
 * (3.20)
 */
function buildQueryC2(userInput: string): void {
    doVulnerableQuery(`[C2]_${userInput}`);
}

/**
 * (3.21)
 */
function buildQueryC3(userInput: string): void {
    doVulnerableQuery(`[C3]_${userInput}`);
}

/**
 * (3.22)
 */
function buildQueryC4(userInput: string): void {
    doVulnerableQuery(`[C4]_${userInput}`);
}

/**
 * (3.23)
 */
function buildQueryC5(userInput: string): void {
    doVulnerableQuery(`[C5]_${userInput}`);
}

/**
 * (3.24)
 */
function buildQueryC6(userInput: string): void {
    doVulnerableQuery(`[C6]_${userInput}`);
}

/**
 * (3.25)
 */
function buildQueryC7(userInput: string): void {
    doVulnerableQuery(`[C7]_${userInput}`);
}

/**
 * (3.26)
 */
function buildQueryC8(userInput: string): void {
    doVulnerableQuery(`[C8]_${userInput}`);
}

/**
 * (3.27)
 */
function buildQueryC9(userInput: string): void {
    doVulnerableQuery(`[C9]_${userInput}`);
}

/***************************************************************************
 * LEVEL 2 (Process Input Functions)
 * Each of these 9 functions calls 3 distinct buildQuery functions.
 ***************************************************************************/

/**
 * (2.1)
 */
function processInputA1(userInput: string): void {
    buildQueryA1(userInput);
    buildQueryA2(userInput);
    buildQueryA3(userInput);
}

/**
 * (2.2)
 */
function processInputA2(userInput: string): void {
    buildQueryA4(userInput);
    buildQueryA5(userInput);
    buildQueryA6(userInput);
}

/**
 * (2.3)
 */
function processInputA3(userInput: string): void {
    buildQueryA7(userInput);
    buildQueryA8(userInput);
    buildQueryA9(userInput);
}

/**
 * (2.4)
 */
function processInputB1(userInput: string): void {
    buildQueryB1(userInput);
    buildQueryB2(userInput);
    buildQueryB3(userInput);
}

/**
 * (2.5)
 */
function processInputB2(userInput: string): void {
    buildQueryB4(userInput);
    buildQueryB5(userInput);
    buildQueryB6(userInput);
}

/**
 * (2.6)
 */
function processInputB3(userInput: string): void {
    buildQueryB7(userInput);
    buildQueryB8(userInput);
    buildQueryB9(userInput);
}

/**
 * (2.7)
 */
function processInputC1(userInput: string): void {
    buildQueryC1(userInput);
    buildQueryC2(userInput);
    buildQueryC3(userInput);
}

/**
 * (2.8)
 */
function processInputC2(userInput: string): void {
    buildQueryC4(userInput);
    buildQueryC5(userInput);
    buildQueryC6(userInput);
}

/**
 * (2.9)
 */
function processInputC3(userInput: string): void {
    buildQueryC7(userInput);
    buildQueryC8(userInput);
    buildQueryC9(userInput);
}

/***************************************************************************
 * LEVEL 1 (Top-Level Request Handlers)
 * Each of these 3 functions calls 3 second-level functions.
 ***************************************************************************/

/**
 * (1.1)
 */
function handleRequestA(userInput: string): void {
    // In a real scenario, this might parse HTTP request data, etc.
    console.log("[handleRequestA] Received input:", userInput);
    processInputA1(userInput);
    processInputA2(userInput);
    processInputA3(userInput);
}

/**
 * (1.2)
 */
function handleRequestB(userInput: string): void {
    console.log("[handleRequestB] Received input:", userInput);
    processInputB1(userInput);
    processInputB2(userInput);
    processInputB3(userInput);
}

/**
 * (1.3)
 */
function handleRequestC(userInput: string): void {
    console.log("[handleRequestC] Received input:", userInput);
    processInputC1(userInput);
    processInputC2(userInput);
    processInputC3(userInput);
}
