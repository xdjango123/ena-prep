import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://ohngxnhnbwnystzkqzwy.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Function to delete a user by ID
async function deleteUser(userId) {
  console.log(`🗑️ Attempting to delete user: ${userId}`);
  
  try {
    // First, verify the user exists
    console.log('🔍 Verifying user exists...');
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Failed to fetch users:', listError.message);
      return false;
    }
    
    const user = users.users.find(u => u.id === userId);
    if (!user) {
      console.error('❌ User not found with that ID');
      return false;
    }
    
    console.log(`✅ Found user: ${user.email} (${user.id})`);
    
    // Show what will be deleted
    console.log('📋 Cleaning up related records...');
    
    // Check and delete from subscriptions table
    const { data: subsData, error: subsCheckError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId);
    
    if (subsCheckError) {
      console.log('⚠️ Warning: Could not check subscription records:', subsCheckError.message);
    } else {
      console.log(`📊 Found ${subsData?.length || 0} subscription records`);
    }
    
    const { error: subsError } = await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', userId);
    
    if (subsError) {
      console.log('⚠️ Warning: Could not delete subscription records:', subsError.message);
    } else {
      console.log('✅ Subscription records deleted');
    }
    
    // Check and delete from profiles table
    const { data: profileData, error: profileCheckError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId);
    
    if (profileCheckError) {
      console.log('⚠️ Warning: Could not check profile records:', profileCheckError.message);
    } else {
      console.log(`📊 Found ${profileData?.length || 0} profile records`);
    }
    
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (profileError) {
      console.log('⚠️ Warning: Could not delete profile records:', profileError.message);
    } else {
      console.log('✅ Profile records deleted');
    }
    
    // Check and delete from test_results table
    const { data: testData, error: testCheckError } = await supabase
      .from('test_results')
      .select('*')
      .eq('user_id', userId);
    
    if (testCheckError) {
      console.log('⚠️ Warning: Could not check test result records:', testCheckError.message);
    } else {
      console.log(`📊 Found ${testData?.length || 0} test result records`);
    }
    
    const { error: testError } = await supabase
      .from('test_results')
      .delete()
      .eq('user_id', userId);
    
    if (testError) {
      console.log('⚠️ Warning: Could not delete test result records:', testError.message);
    } else {
      console.log('✅ Test result records deleted');
    }
    
    // Check and delete from user_attempts table
    const { data: attemptsData, error: attemptsCheckError } = await supabase
      .from('user_attempts')
      .select('*')
      .eq('user_id', userId);
    
    if (attemptsCheckError) {
      console.log('⚠️ Warning: Could not check user attempt records:', attemptsCheckError.message);
    } else {
      console.log(`📊 Found ${attemptsData?.length || 0} user attempt records`);
    }
    
    const { error: attemptsError } = await supabase
      .from('user_attempts')
      .delete()
      .eq('user_id', userId);
    
    if (attemptsError) {
      console.log('⚠️ Warning: Could not delete user attempt records:', attemptsError.message);
    } else {
      console.log('✅ User attempt records deleted');
    }
    
    // Check and delete from email_logs table
    const { data: emailData, error: emailCheckError } = await supabase
      .from('email_logs')
      .select('*')
      .eq('user_id', userId);
    
    if (emailCheckError) {
      console.log('⚠️ Warning: Could not check email log records:', emailCheckError.message);
    } else {
      console.log(`📊 Found ${emailData?.length || 0} email log records`);
    }
    
    const { error: emailError } = await supabase
      .from('email_logs')
      .delete()
      .eq('user_id', userId);
    
    if (emailError) {
      console.log('⚠️ Warning: Could not delete email log records:', emailError.message);
    } else {
      console.log('✅ Email log records deleted');
    }
    
    // Finally, delete the user from auth.users
    console.log('👤 Deleting user from auth.users...');
    const { error } = await supabase.auth.admin.deleteUser(userId);
    
    if (error) {
      console.error('❌ Failed to delete user:', error.message);
      return false;
    } else {
      console.log('✅ User deleted successfully from auth.users');
      console.log('🎉 Complete user deletion successful!');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

// Function to list all users
async function listUsers() {
  console.log('📋 Fetching all users...');
  
  try {
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Failed to fetch users:', error.message);
      return;
    }
    
    console.log(`\n📊 Found ${users.users.length} users:\n`);
    
    for (const user of users.users) {
      console.log(`👤 User: ${user.email} (${user.id})`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`   Metadata:`, user.user_metadata);
      
      // Get related data counts
      try {
        const { count: subsCount } = await supabase
          .from('subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        const { count: profileCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('id', user.id);
        
        const { count: testCount } = await supabase
          .from('test_results')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        const { count: attemptsCount } = await supabase
          .from('user_attempts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        const { count: emailCount } = await supabase
          .from('email_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        console.log(`   📊 Related records: ${subsCount || 0} subscriptions, ${profileCount || 0} profiles, ${testCount || 0} test results, ${attemptsCount || 0} attempts, ${emailCount || 0} emails`);
      } catch (e) {
        console.log(`   📊 Related records: Could not fetch`);
      }
      
      console.log('---');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Function to show detailed user information
async function showUser(userId) {
  console.log(`🔍 Fetching detailed information for user: ${userId}`);
  
  try {
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Failed to fetch users:', error.message);
      return;
    }
    
    const user = users.users.find(u => u.id === userId);
    if (!user) {
      console.error('❌ User not found with that ID');
      return;
    }
    
    console.log(`\n👤 User Details:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Created: ${user.created_at}`);
    console.log(`   Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log(`   Metadata:`, user.user_metadata);
    
    // Get related data
    console.log(`\n📊 Related Records:`);
    
    const { data: subsData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId);
    
    if (subsData && subsData.length > 0) {
      console.log(`   📋 Subscriptions (${subsData.length}):`);
      subsData.forEach(sub => {
        console.log(`      - Plan: ${sub.plan_name}, Active: ${sub.is_active}, Start: ${sub.start_date}, End: ${sub.end_date}`);
      });
    } else {
      console.log(`   📋 Subscriptions: None`);
    }
    
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId);
    
    if (profileData && profileData.length > 0) {
      console.log(`   👤 Profile (${profileData.length}):`);
      profileData.forEach(profile => {
        console.log(`      - Name: ${profile['First Name']} ${profile['Last Name']}, Exam Type: ${profile.exam_type}, Email: ${profile.email}`);
      });
    } else {
      console.log(`   👤 Profile: None`);
    }
    
    const { data: testData } = await supabase
      .from('test_results')
      .select('*')
      .eq('user_id', userId);
    
    if (testData && testData.length > 0) {
      console.log(`   📝 Test Results (${testData.length}):`);
      testData.forEach(test => {
        console.log(`      - Type: ${test.test_type}, Category: ${test.category}, Score: ${test.score}, Date: ${test.created_at}`);
      });
    } else {
      console.log(`   📝 Test Results: None`);
    }
    
    const { data: attemptsData } = await supabase
      .from('user_attempts')
      .select('*')
      .eq('user_id', userId);
    
    if (attemptsData && attemptsData.length > 0) {
      console.log(`   🎯 User Attempts (${attemptsData.length}):`);
      attemptsData.forEach(attempt => {
        console.log(`      - Type: ${attempt.test_type}, Category: ${attempt.category}, Score: ${attempt.score}, Date: ${attempt.created_at}`);
      });
    } else {
      console.log(`   🎯 User Attempts: None`);
    }
    
    const { data: emailData } = await supabase
      .from('email_logs')
      .select('*')
      .eq('user_id', userId);
    
    if (emailData && emailData.length > 0) {
      console.log(`   📧 Email Logs (${emailData.length}):`);
      emailData.forEach(email => {
        console.log(`      - Type: ${email.type}, Status: ${email.status}, Date: ${email.sent_at}`);
      });
    } else {
      console.log(`   📧 Email Logs: None`);
    }
    
    console.log('\n⚠️  This user has data in the following tables:');
    console.log('   - auth.users (main user record)');
    if (subsData && subsData.length > 0) console.log('   - subscriptions');
    if (profileData && profileData.length > 0) console.log('   - profiles');
    if (testData && testData.length > 0) console.log('   - test_results');
    if (attemptsData && attemptsData.length > 0) console.log('   - user_attempts');
    if (emailData && emailData.length > 0) console.log('   - email_logs');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Function to delete user by email
async function deleteUserByEmail(email) {
  console.log(`🔍 Looking for user with email: ${email}`);
  
  try {
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Failed to fetch users:', error.message);
      return;
    }
    
    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      console.log('❌ User not found with that email');
      return;
    }
    
    console.log(`✅ Found user: ${user.id}`);
    await deleteUser(user.id);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'list':
      await listUsers();
      break;
      
    case 'show':
      const showUserId = args[1];
      if (!showUserId) {
        console.log('❌ Please provide a user ID');
        console.log('Usage: node delete-user.js show <user-id>');
        return;
      }
      await showUser(showUserId);
      break;
      
    case 'delete':
      const userId = args[1];
      if (!userId) {
        console.log('❌ Please provide a user ID');
        console.log('Usage: node delete-user.js delete <user-id>');
        return;
      }
      await deleteUser(userId);
      break;
      
    case 'delete-email':
      const email = args[1];
      if (!email) {
        console.log('❌ Please provide an email');
        console.log('Usage: node delete-user.js delete-email <email>');
        return;
      }
      await deleteUserByEmail(email);
      break;
      
    default:
      console.log('🔧 Enhanced User Management Script');
      console.log('\nAvailable commands:');
      console.log('  list                    - List all users with record counts');
      console.log('  show <user-id>          - Show detailed user information');
      console.log('  delete <user-id>        - Delete user by ID (with full cleanup)');
      console.log('  delete-email <email>    - Delete user by email (with full cleanup)');
      console.log('\nExamples:');
      console.log('  node delete-user.js list');
      console.log('  node delete-user.js show 850cb026-a7eb-4791-b07d-a132278b1141');
      console.log('  node delete-user.js delete 850cb026-a7eb-4791-b07d-a132278b1141');
      console.log('  node delete-user.js delete-email test@example.com');
      console.log('\n💡 Tip: Use "show" command first to see what will be deleted!');
      break;
  }
}

// Run the script
main().catch(console.error); 