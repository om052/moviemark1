const fetch = require('node-fetch');

// Comprehensive test suite for film creation feature
class FilmCreationTester {
  constructor() {
    this.baseURL = 'http://localhost:3000/api';
    this.adminToken = null;
    this.userToken = null;
    this.testScriptId = null;
    this.testFilmId = null;
    this.testUserId = null;
  }

  log(message, status = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      info: '\x1b[36m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[status]}[${timestamp}] ${message}${colors.reset}`);
  }

  async runAllTests() {
    console.log('🎬 FILM CREATION FEATURE - COMPREHENSIVE TEST SUITE');
    console.log('================================================\n');

    try {
      // Phase 1: Setup and Authentication
      await this.testAuthentication();

      // Phase 2: Data Preparation
      await this.testDataPreparation();

      // Phase 3: Admin Film Creation
      await this.testFilmCreationWorkflow();

      // Phase 4: User Dashboard Integration
      await this.testUserDashboardIntegration();

      // Phase 5: Request System
      await this.testRequestSystem();

      // Phase 6: Edge Cases and Error Handling
      await this.testEdgeCases();

      console.log('\n🎉 ALL TESTS COMPLETED!');
      console.log('========================');

    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
    }
  }

  async testAuthentication() {
    this.log('Phase 1: Testing Authentication', 'info');

    // Test 1.1: Admin Login
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@moviemark.com',
          password: 'admin123'
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.adminToken = data.token;
        this.log('✅ Admin login successful', 'success');
      } else {
        // Create admin if doesn't exist
        this.log('⚠️ Admin not found, creating test admin...', 'warning');
        const createResponse = await fetch(`${this.baseURL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Test Admin',
            email: 'admin@moviemark.com',
            password: 'admin123',
            role: 'admin'
          })
        });

        if (createResponse.ok) {
          const loginAgain = await fetch(`${this.baseURL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'admin@moviemark.com',
              password: 'admin123'
            })
          });

          if (loginAgain.ok) {
            const data = await loginAgain.json();
            this.adminToken = data.token;
            this.log('✅ Test admin created and logged in', 'success');
          }
        }
      }
    } catch (error) {
      this.log(`❌ Admin authentication failed: ${error.message}`, 'error');
      throw error;
    }

    // Test 1.2: Regular User Login
    try {
      const userResponse = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@moviemark.com',
          password: 'user123'
        })
      });

      if (userResponse.ok) {
        const data = await userResponse.json();
        this.userToken = data.token;
        this.log('✅ User login successful', 'success');
      } else {
        // Create test user
        this.log('⚠️ Test user not found, creating...', 'warning');
        const createUserResponse = await fetch(`${this.baseURL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Test User',
            email: 'user@moviemark.com',
            password: 'user123'
          })
        });

        if (createUserResponse.ok) {
          const loginUserAgain = await fetch(`${this.baseURL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'user@moviemark.com',
              password: 'user123'
            })
          });

          if (loginUserAgain.ok) {
            const data = await loginUserAgain.json();
            this.userToken = data.token;
            this.testUserId = data.user._id;
            this.log('✅ Test user created and logged in', 'success');
          }
        }
      }
    } catch (error) {
      this.log(`❌ User authentication failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async testDataPreparation() {
    this.log('Phase 2: Testing Data Preparation', 'info');

    // Test 2.1: Create Test Script
    try {
      const scriptData = {
        title: 'Test Script for Film Creation',
        description: 'A test script to verify film creation functionality',
        genre: 'Drama',
        category: 'Short film',
        content: 'This is a test script content for film creation testing.'
      };

      const response = await fetch(`${this.baseURL}/scripts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.userToken}`
        },
        body: JSON.stringify(scriptData)
      });

      if (response.ok) {
        const script = await response.json();
        this.testScriptId = script._id;
        this.log('✅ Test script created successfully', 'success');
      } else {
        this.log(`❌ Failed to create test script: ${response.status}`, 'error');
      }
    } catch (error) {
      this.log(`❌ Script creation failed: ${error.message}`, 'error');
      throw error;
    }

    // Test 2.2: Approve Script (Admin)
    try {
      const response = await fetch(`${this.baseURL}/admin/projects/${this.testScriptId}/script`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.adminToken}`
        },
        body: JSON.stringify({ status: 'approved' })
      });

      if (response.ok) {
        this.log('✅ Test script approved by admin', 'success');
      } else {
        this.log(`❌ Failed to approve script: ${response.status}`, 'error');
      }
    } catch (error) {
      this.log(`❌ Script approval failed: ${error.message}`, 'error');
      throw error;
    }

    // Test 2.3: Verify Script Rankings
    try {
      const response = await fetch(`${this.baseURL}/admin/script-rankings`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      if (response.ok) {
        const rankings = await response.json();
        const foundScript = rankings.rankings.find(r => r._id === this.testScriptId);
        if (foundScript) {
          this.log(`✅ Test script appears in rankings (Rank: ${foundScript.rank})`, 'success');
        } else {
          this.log('⚠️ Test script not found in rankings', 'warning');
        }
      }
    } catch (error) {
      this.log(`❌ Rankings check failed: ${error.message}`, 'error');
    }
  }

  async testFilmCreationWorkflow() {
    this.log('Phase 3: Testing Film Creation Workflow', 'info');

    // Test 3.1: Create Film with Team
    try {
      const filmData = {
        scriptId: this.testScriptId,
        title: 'Test Film: Comprehensive Test',
        director: this.testUserId,
        actors: [this.testUserId],
        budget: 2500,
        sendApproval: true,
        createChatroom: true
      };

      const response = await fetch(`${this.baseURL}/admin/post-production/create-film-with-team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.adminToken}`
        },
        body: JSON.stringify(filmData)
      });

      if (response.ok) {
        const result = await response.json();
        this.testFilmId = result.film._id;
        this.log('✅ Film created successfully with team', 'success');
        this.log(`   🎬 Film: "${result.film.title}"`, 'info');
        this.log(`   👥 Director: ${result.film.team.director ? 'Assigned' : 'Not assigned'}`, 'info');
        this.log(`   🎭 Actors: ${result.film.team.actors.length} assigned`, 'info');
        this.log(`   💰 Budget: $${result.film.budget.amount}`, 'info');
        this.log(`   📨 Approval sent: ${result.approvalSent}`, 'info');
        this.log(`   💬 Chatroom created: ${!!result.chatroom}`, 'info');
      } else {
        const error = await response.json();
        this.log(`❌ Film creation failed: ${error.message}`, 'error');
        throw new Error(`Film creation failed: ${error.message}`);
      }
    } catch (error) {
      this.log(`❌ Film creation test failed: ${error.message}`, 'error');
      throw error;
    }

    // Test 3.2: Verify Film in Post-Production
    try {
      const response = await fetch(`${this.baseURL}/admin/post-production/short-films`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      if (response.ok) {
        const films = await response.json();
        const foundFilm = films.find(f => f._id === this.testFilmId);
        if (foundFilm) {
          this.log('✅ Film appears in post-production list', 'success');
        } else {
          this.log('❌ Film not found in post-production list', 'error');
        }
      }
    } catch (error) {
      this.log(`❌ Post-production verification failed: ${error.message}`, 'error');
    }
  }

  async testUserDashboardIntegration() {
    this.log('Phase 4: Testing User Dashboard Integration', 'info');

    // Test 4.1: Check if film appears in user's projects
    try {
      const response = await fetch(`${this.baseURL}/projects/my-projects`, {
        headers: { 'Authorization': `Bearer ${this.userToken}` }
      });

      if (response.ok) {
        const projects = await response.json();
        const foundProject = projects.find(p => p._id === this.testFilmId);
        if (foundProject) {
          this.log('✅ Film appears in user dashboard projects', 'success');
        } else {
          this.log('⚠️ Film not found in user projects (may be normal if user not assigned)', 'warning');
        }
      }
    } catch (error) {
      this.log(`❌ User projects check failed: ${error.message}`, 'error');
    }

    // Test 4.2: Check available projects for other users
    try {
      // Create another test user
      const altUserResponse = await fetch(`${this.baseURL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Alt Test User',
          email: 'altuser@moviemark.com',
          password: 'user123'
        })
      });

      if (altUserResponse.ok) {
        const altUserData = await altUserResponse.json();
        const altUserToken = altUserData.token;

        const availableResponse = await fetch(`${this.baseURL}/projects/available`, {
          headers: { 'Authorization': `Bearer ${altUserToken}` }
        });

        if (availableResponse.ok) {
          const availableProjects = await availableResponse.json();
          const foundAvailable = availableProjects.find(p => p._id === this.testFilmId);
          if (foundAvailable) {
            this.log('✅ Film appears in available projects for other users', 'success');
          } else {
            this.log('⚠️ Film not in available projects (may be team-only)', 'warning');
          }
        }
      }
    } catch (error) {
      this.log(`❌ Available projects test failed: ${error.message}`, 'error');
    }
  }

  async testRequestSystem() {
    this.log('Phase 5: Testing Request System', 'info');

    // Test 5.1: Check approval request was created
    try {
      const response = await fetch(`${this.baseURL}/admin/requests`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      if (response.ok) {
        const requests = await response.json();
        const approvalRequest = requests.find(r =>
          r.script && r.script._id === this.testScriptId &&
          r.type === 'film_approval'
        );

        if (approvalRequest) {
          this.log('✅ Approval request created successfully', 'success');
          this.log(`   📝 Request type: ${approvalRequest.type}`, 'info');
          this.log(`   👤 Receiver: ${approvalRequest.receiver.name}`, 'info');
          this.log(`   📊 Status: ${approvalRequest.status}`, 'info');
        } else {
          this.log('❌ Approval request not found', 'error');
        }
      }
    } catch (error) {
      this.log(`❌ Request verification failed: ${error.message}`, 'error');
    }

    // Test 5.2: Test user sending join request
    try {
      const joinRequestData = {
        projectId: this.testFilmId,
        role: 'Actor',
        message: 'I would love to join this film project as an actor!'
      };

      const response = await fetch(`${this.baseURL}/requests/project-join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.userToken}`
        },
        body: JSON.stringify(joinRequestData)
      });

      if (response.ok) {
        this.log('✅ User join request sent successfully', 'success');
      } else {
        const error = await response.json();
        this.log(`❌ Join request failed: ${error.msg || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      this.log(`❌ Join request test failed: ${error.message}`, 'error');
    }
  }

  async testEdgeCases() {
    this.log('Phase 6: Testing Edge Cases and Error Handling', 'info');

    // Test 6.1: Try creating film without required fields
    try {
      const invalidFilmData = {
        // Missing scriptId and title
        director: this.testUserId,
        budget: 1000
      };

      const response = await fetch(`${this.baseURL}/admin/post-production/create-film-with-team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.adminToken}`
        },
        body: JSON.stringify(invalidFilmData)
      });

      if (response.status === 400) {
        this.log('✅ Proper validation for missing required fields', 'success');
      } else {
        this.log('⚠️ Unexpected response for invalid data', 'warning');
      }
    } catch (error) {
      this.log(`❌ Edge case test failed: ${error.message}`, 'error');
    }

    // Test 6.2: Try creating film with non-existent script
    try {
      const invalidScriptData = {
        scriptId: '507f1f77bcf86cd799439011', // Fake ObjectId
        title: 'Invalid Script Film',
        director: this.testUserId,
        budget: 1000
      };

      const response = await fetch(`${this.baseURL}/admin/post-production/create-film-with-team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.adminToken}`
        },
        body: JSON.stringify(invalidScriptData)
      });

      if (response.status === 404) {
        this.log('✅ Proper error handling for non-existent script', 'success');
      } else {
        this.log('⚠️ Unexpected response for invalid script ID', 'warning');
      }
    } catch (error) {
      this.log(`❌ Invalid script test failed: ${error.message}`, 'error');
    }

    // Test 6.3: Test admin-only access
    try {
      const response = await fetch(`${this.baseURL}/admin/post-production/create-film-with-team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.userToken}` // Regular user token
        },
        body: JSON.stringify({
          scriptId: this.testScriptId,
          title: 'Unauthorized Film',
          budget: 1000
        })
      });

      if (response.status === 403 || response.status === 401) {
        this.log('✅ Proper admin-only access control', 'success');
      } else {
        this.log('⚠️ Admin access control may not be working properly', 'warning');
      }
    } catch (error) {
      this.log(`❌ Access control test failed: ${error.message}`, 'error');
    }
  }
}

// Run the comprehensive test suite
const tester = new FilmCreationTester();
tester.runAllTests().catch(error => {
  console.error('Test suite execution failed:', error);
  process.exit(1);
});
