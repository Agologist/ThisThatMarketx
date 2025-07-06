// Test voting endpoint to trace execution
import axios from 'axios';

async function testVoteEndpoint() {
  try {
    console.log('🧪 Testing vote endpoint to trace execution...');
    
    // Make a vote request to poll 60 option B (should trigger coin generation)
    const response = await axios.post('http://localhost:5000/api/votes', {
      pollId: 60,
      option: 'B'
    }, {
      headers: {
        'Content-Type': 'application/json',
        // Add session cookie if needed for authentication
      },
      withCredentials: true
    });
    
    console.log('✅ Vote response:', response.data);
    console.log('✅ Status:', response.status);
    
  } catch (error) {
    console.error('❌ Vote failed:', error.response?.data || error.message);
    console.error('❌ Status:', error.response?.status);
  }
}

testVoteEndpoint();