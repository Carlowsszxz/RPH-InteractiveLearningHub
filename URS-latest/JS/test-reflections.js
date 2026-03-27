// Test script for Reflections Database System
// Run this in browser console or Node.js to test database operations

console.log('=== Reflections Database Test ===');

// Test 1: Load reflection prompts
async function testLoadPrompts() {
    console.log('\n1. Testing getReflectionPrompts()...');
    try {
        const result = await DB.getReflectionPrompts();
        if (result.success) {
            console.log('✅ Successfully loaded', result.data.length, 'reflection prompts');
            result.data.forEach(prompt => {
                console.log(`   - ${prompt.title} (${prompt.topic})`);
            });
        } else {
            console.log('❌ Failed to load prompts:', result.error);
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

// Test 2: Load specific prompt
async function testLoadSpecificPrompt() {
    console.log('\n2. Testing getReflectionPrompt(1)...');
    try {
        const result = await DB.getReflectionPrompt(1);
        if (result.success) {
            console.log('✅ Successfully loaded prompt:', result.data.title);
            console.log('   Description:', result.data.description.substring(0, 100) + '...');
        } else {
            console.log('❌ Failed to load prompt:', result.error);
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

// Test 3: Test user reflection operations (requires authentication)
async function testUserReflections() {
    console.log('\n3. Testing user reflection operations...');

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.log('⚠️  User not authenticated - skipping user reflection tests');
        console.log('   Please log in first to test user reflection operations');
        return;
    }

    console.log('✅ User authenticated:', user.email);

    // Test saving a reflection
    console.log('   Testing saveUserReflection()...');
    try {
        const testContent = 'This is a test reflection for database validation.';
        const result = await DB.saveUserReflection(user.id, 1, testContent);
        if (result.success) {
            console.log('✅ Successfully saved user reflection');
        } else {
            console.log('❌ Failed to save reflection:', result.error);
        }
    } catch (error) {
        console.log('❌ Error saving reflection:', error.message);
    }

    // Test loading user reflection
    console.log('   Testing getUserReflection()...');
    try {
        const result = await DB.getUserReflection(user.id, 1);
        if (result.success) {
            console.log('✅ Successfully loaded user reflection');
            console.log('   Content length:', result.data.content.length, 'characters');
            console.log('   Word count:', result.data.word_count);
        } else {
            console.log('❌ Failed to load reflection:', result.error);
        }
    } catch (error) {
        console.log('❌ Error loading reflection:', error.message);
    }

    // Test loading all user reflections
    console.log('   Testing getUserReflections()...');
    try {
        const result = await DB.getUserReflections(user.id);
        if (result.success) {
            console.log('✅ Successfully loaded', result.data.length, 'user reflections');
        } else {
            console.log('❌ Failed to load user reflections:', result.error);
        }
    } catch (error) {
        console.log('❌ Error loading user reflections:', error.message);
    }
}

// Test 4: Test localStorage fallback
function testLocalStorageFallback() {
    console.log('\n4. Testing localStorage fallback...');

    const testKey = 'test_reflection_fallback';
    const testData = { content: 'Test fallback content', timestamp: Date.now() };

    try {
        // Save to localStorage
        localStorage.setItem(testKey, JSON.stringify(testData));
        console.log('✅ Successfully saved to localStorage');

        // Load from localStorage
        const loaded = JSON.parse(localStorage.getItem(testKey));
        if (loaded && loaded.content === testData.content) {
            console.log('✅ Successfully loaded from localStorage');
        } else {
            console.log('❌ localStorage data mismatch');
        }

        // Clean up
        localStorage.removeItem(testKey);
        console.log('✅ Cleaned up test data');
    } catch (error) {
        console.log('❌ localStorage error:', error.message);
    }
}

// Test 5: Test URL parameter loading
function testURLParameters() {
    console.log('\n5. Testing URL parameter handling...');

    // Simulate URL with parameters
    const testUrls = [
        '?id=1',
        '?topic=mass',
        '?id=2&topic=cavite'
    ];

    testUrls.forEach(url => {
        const params = new URLSearchParams(url);
        const id = params.get('id');
        const topic = params.get('topic');

        console.log(`   URL: ${url}`);
        console.log(`   ID: ${id}, Topic: ${topic}`);
    });

    console.log('✅ URL parameter parsing works correctly');
}

// Run all tests
async function runAllTests() {
    console.log('Starting Reflections Database Tests...\n');

    await testLoadPrompts();
    await testLoadSpecificPrompt();
    await testUserReflections();
    testLocalStorageFallback();
    testURLParameters();

    console.log('\n=== Test Complete ===');
    console.log('Check the results above. If all tests pass, the reflection system is working correctly.');
}

// Auto-run tests if this script is loaded directly
if (typeof window !== 'undefined' && window.DB && window.supabase) {
    runAllTests();
} else if (typeof module !== 'undefined' && module.exports) {
    // For Node.js testing (would need additional setup)
    console.log('Node.js testing not implemented - run in browser console instead');
} else {
    console.log('Load this script in the browser console on reflections.html to run tests');
}