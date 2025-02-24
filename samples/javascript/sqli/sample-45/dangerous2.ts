import mysql from 'mysql2/promise';

// Simulated database connection (assuming this is properly configured)
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'password123',
    database: 'testdb',
};

/**
 * (VULNERABILITY)
 * The bottom-level function that performs an **insecure** SQL query.
 */
async function doVulnerableQuery(userInput: string): Promise<void> {
    const connection = await mysql.createConnection(dbConfig);

    // **Vulnerable:** Directly concatenating user input into the SQL query (SQL Injection)
    const query = `SELECT * FROM Users WHERE username = '${userInput}'`;

    console.log('[QUERY]:', query);

    try {
        const [rows] = await connection.execute(query); // Actually executing the query
        console.log('Query Result:', rows);
    } catch (error) {
        console.error('Database Error:', error);
    } finally {
        await connection.end();
    }
}

/***************************************************************************
 * LEVEL 3 (Build Query Functions)
 * Each of these 27 functions calls the vulnerable function directly.
 ***************************************************************************/

async function buildQuery1(userInput: string): Promise<void> {
    // Some mock transformation
    const sanitized = userInput.trim().toLowerCase();
    await doVulnerableQuery(sanitized);
}

async function buildQuery2(userInput: string): Promise<void> {
    const sanitized = userInput.replace("'", "''");
    await doVulnerableQuery(sanitized);
}

async function buildQuery3(userInput: string): Promise<void> {
    const sanitized = userInput.split(' ').join('_');
    await doVulnerableQuery(sanitized);
}

/***************************************************************************
 * LEVEL 2 (Process Input Functions)
 * Each of these 9 functions calls 3 distinct buildQuery functions.
 ***************************************************************************/

async function processInput1(userInput: string): Promise<void> {
    await buildQuery1(userInput);
    await buildQuery2(userInput);
    await buildQuery3(userInput);
}

async function processInput2(userInput: string): Promise<void> {
    await buildQuery1(userInput);
    await buildQuery2(userInput);
    await buildQuery3(userInput);
}

async function processInput3(userInput: string): Promise<void> {
    await buildQuery1(userInput);
    await buildQuery2(userInput);
    await buildQuery3(userInput);
}

/***************************************************************************
 * LEVEL 1 (Top-Level Request Handlers)
 * Each of these 3 functions calls 3 second-level functions.
 ***************************************************************************/

async function handleRequest1(userInput: string): Promise<void> {
    // In a real scenario, this might parse HTTP request data, etc.
    console.log('[handleRequestA] Received input:', userInput);
    await processInput1(userInput);
    await processInput2(userInput);
    await processInput3(userInput);
}

async function handleRequest2(userInput: string): Promise<void> {
    // In a real scenario, this might parse HTTP request data, etc.
    console.log('[handleRequestA] Received input:', userInput);
    await processInput1(userInput);
    await processInput2(userInput);
    await processInput3(userInput);
}

async function handleRequest3(userInput: string): Promise<void> {
    // In a real scenario, this might parse HTTP request data, etc.
    console.log('[handleRequestA] Received input:', userInput);
    await processInput1(userInput);
    await processInput2(userInput);
    await processInput3(userInput);
}
