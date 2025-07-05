// Test script for end-to-end package system verification
const baseUrl = 'http://localhost:5000';

async function testPackageSystem() {
  console.log('🧪 Testing Package System End-to-End');
  console.log('=====================================');
  
  try {
    // Test 1: Check payment info endpoint
    console.log('\n1️⃣ Testing payment info endpoint...');
    const paymentResponse = await fetch(`${baseUrl}/api/packages/payment-info`);
    const paymentInfo = await paymentResponse.json();
    console.log('✅ Payment Info:', {
      wallet: paymentInfo.polygonWallet,
      price: paymentInfo.packagePrice,
      polls: paymentInfo.packagePolls
    });
    
    // Test 2: Check authentication status
    console.log('\n2️⃣ Checking authentication...');
    const userResponse = await fetch(`${baseUrl}/api/user`, {
      credentials: 'include'
    });
    
    if (userResponse.status === 401) {
      console.log('❌ Not authenticated - please log in first');
      return;
    }
    
    const user = await userResponse.json();
    console.log('✅ Authenticated as:', user.username);
    
    // Test 3: Check existing packages
    console.log('\n3️⃣ Checking existing packages...');
    const packagesResponse = await fetch(`${baseUrl}/api/user/packages`, {
      credentials: 'include'
    });
    const existingPackages = await packagesResponse.json();
    console.log('📦 Existing packages:', existingPackages.length);
    
    // Test 4: Create a test package purchase
    console.log('\n4️⃣ Creating test package purchase...');
    const testTxHash = `0xtest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const purchaseResponse = await fetch(`${baseUrl}/api/packages/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        paymentTxHash: testTxHash,
        paymentAmount: '1.00'
      })
    });
    
    if (!purchaseResponse.ok) {
      const error = await purchaseResponse.json();
      console.log('❌ Purchase failed:', error.message);
      return;
    }
    
    const newPackage = await purchaseResponse.json();
    console.log('✅ Package created:', {
      id: newPackage.id,
      status: newPackage.status,
      credits: `${newPackage.remainingPolls}/${newPackage.totalPolls}`,
      txHash: testTxHash.slice(0, 10) + '...'
    });
    
    // Test 5: Verify active package endpoint
    console.log('\n5️⃣ Verifying active package...');
    const activeResponse = await fetch(`${baseUrl}/api/user/packages/active`, {
      credentials: 'include'
    });
    
    if (activeResponse.ok) {
      const activePackage = await activeResponse.json();
      console.log('✅ Active package found:', {
        id: activePackage.id,
        remainingCredits: activePackage.remainingPolls
      });
    } else {
      console.log('❌ No active package found');
    }
    
    console.log('\n🎉 Package system test completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('- Visit /packages to see the UI');
    console.log('- Create a poll with MemeCoin Mode enabled');
    console.log('- Vote to test real coin generation');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Export for potential use in browser console
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testPackageSystem };
} else if (typeof window !== 'undefined') {
  window.testPackageSystem = testPackageSystem;
}

// Auto-run if called directly
if (typeof require !== 'undefined' && require.main === module) {
  testPackageSystem();
}