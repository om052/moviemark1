import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

// Test data
const testData = {
    scriptId: '507f1f77bcf86cd799439011', // Example ObjectId - replace with actual if needed
    title: 'Test Movie Title',
    director: '507f1f77bcf86cd799439012', // Example ObjectId
    actors: ['507f1f77bcf86cd799439013'], // Example ObjectIds
    budget: 50000,
    sendApproval: true,
    createChatroom: true
};

// Test 1: Valid film creation with chatroom
async function testValidFilmCreation() {
    console.log('Test 1: Valid film creation with chatroom');

    try {
        const response = await fetch(`${BASE_URL}/api/admin/post-production/create-film-with-team`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_ADMIN_TOKEN' // Replace with actual token
            },
            body: JSON.stringify(testData)
        });

        const result = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', result);

        if (response.ok) {
            console.log('✅ Test 1 PASSED: Film and chatroom created successfully');
        } else {
            console.log('❌ Test 1 FAILED:', result.message);
        }
    } catch (error) {
        console.log('❌ Test 1 ERROR:', error.message);
    }
}

// Test 2: Empty title validation
async function testEmptyTitle() {
    console.log('\nTest 2: Empty title validation');

    const invalidData = { ...testData, title: '' };

    try {
        const response = await fetch(`${BASE_URL}/api/admin/post-production/create-film-with-team`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_ADMIN_TOKEN' // Replace with actual token
            },
            body: JSON.stringify(invalidData)
        });

        const result = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', result);

        if (response.status === 400 && result.message.includes('Film title cannot be empty')) {
            console.log('✅ Test 2 PASSED: Empty title properly rejected');
        } else {
            console.log('❌ Test 2 FAILED: Expected validation error for empty title');
        }
    } catch (error) {
        console.log('❌ Test 2 ERROR:', error.message);
    }
}

// Test 3: Whitespace-only title validation
async function testWhitespaceTitle() {
    console.log('\nTest 3: Whitespace-only title validation');

    const invalidData = { ...testData, title: '   ' };

    try {
        const response = await fetch(`${BASE_URL}/api/admin/post-production/create-film-with-team`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_ADMIN_TOKEN' // Replace with actual token
            },
            body: JSON.stringify(invalidData)
        });

        const result = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', result);

        if (response.status === 400 && result.message.includes('Film title cannot be empty')) {
            console.log('✅ Test 3 PASSED: Whitespace-only title properly rejected');
        } else {
            console.log('❌ Test 3 FAILED: Expected validation error for whitespace-only title');
        }
    } catch (error) {
        console.log('❌ Test 3 ERROR:', error.message);
    }
}

// Test 4: Film creation without chatroom
async function testFilmCreationWithoutChatroom() {
    console.log('\nTest 4: Film creation without chatroom');

    const noChatroomData = { ...testData, createChatroom: false };

    try {
        const response = await fetch(`${BASE_URL}/api/admin/post-production/create-film-with-team`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_ADMIN_TOKEN' // Replace with actual token
            },
            body: JSON.stringify(noChatroomData)
        });

        const result = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', result);

        if (response.ok) {
            console.log('✅ Test 4 PASSED: Film created successfully without chatroom');
        } else {
            console.log('❌ Test 4 FAILED:', result.message);
        }
    } catch (error) {
        console.log('❌ Test 4 ERROR:', error.message);
    }
}

// Run all tests
async function runTests() {
    console.log('Starting MovieChatroom validation fix tests...\n');

    await testValidFilmCreation();
    await testEmptyTitle();
    await testWhitespaceTitle();
    await testFilmCreationWithoutChatroom();

    console.log('\nTesting completed. Please check the results above.');
    console.log('Note: Replace YOUR_ADMIN_TOKEN with a valid admin JWT token to run these tests.');
}

runTests();
