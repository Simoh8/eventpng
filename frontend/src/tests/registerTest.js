import authService from '../services/authService';

async function testRegistration() {
  try {
    console.log('Starting registration test...');
    
    // Test data with valid password requirements
    const userData = {
      email: `testuser${Date.now()}@example.com`,
      password: 'Securepass123!',
      confirmPassword: 'Securepass123!',
      full_name: 'Test User',
      is_photographer: true
    };
    
    console.log('Registering user:', userData.email);
    const result = await authService.register(userData);
    
    if (result.success) {
      console.log('✅ Registration successful!');
      console.log('User data:', result.user);
      console.log('Access token:', result.access ? '✅' : '❌ Missing');
      console.log('Refresh token:', result.refresh ? '✅' : '❌ Missing');
      
      // Verify authentication
      const isAuthenticated = authService.isAuthenticated();
      console.log('User is authenticated:', isAuthenticated ? '✅' : '❌');
      
      // Get current user
      const currentUser = authService.getCurrentUser();
      console.log('Current user:', currentUser || '❌ Not found');
    } else {
      console.error('❌ Registration failed:', result.error);
      if (result.errors) {
        console.error('Validation errors:', JSON.stringify(result.errors, null, 2));
      }
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testRegistration();
