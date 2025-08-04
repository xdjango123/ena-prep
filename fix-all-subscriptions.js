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

// Function to fix all subscriptions
async function fixAllSubscriptions() {
  console.log('🔧 Fixing all subscriptions to match profile exam types...\n');
  
  try {
    // Get all users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Failed to fetch users:', usersError.message);
      return;
    }
    
    console.log(`📊 Found ${users.users.length} users to process:\n`);
    
    let fixedCount = 0;
    let createdCount = 0;
    
    for (const user of users.users) {
      console.log(`👤 Processing user: ${user.email} (${user.id})`);
      
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.log(`   ⚠️  No profile found, skipping...`);
        continue;
      }
      
      console.log(`   📋 Profile: ${profile['First Name']} ${profile['Last Name']}, Exam Type: ${profile.exam_type}`);
      
      // Determine correct plan name based on exam type
      let planName;
      switch (profile.exam_type) {
        case 'CM': planName = 'Prépa CM'; break;
        case 'CMS': planName = 'Prépa CMS'; break;
        case 'CS': planName = 'Prépa CS'; break;
        default: 
          console.log(`   ⚠️  Unknown exam type: ${profile.exam_type}, using default CM`);
          planName = 'Prépa CM'; 
          break;
      }
      
      console.log(`   🎯 Correct plan name should be: ${planName}`);
      
      // Check current subscription
      const { data: currentSubscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      
      if (subError) {
        console.log(`   📋 No active subscription found, creating one...`);
        
        // Create new subscription
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);
        
        const { error: createError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: user.id,
            plan_name: planName,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            is_active: true,
          });
        
        if (createError) {
          console.log(`   ❌ Failed to create subscription: ${createError.message}`);
        } else {
          console.log(`   ✅ Subscription created successfully`);
          createdCount++;
        }
      } else {
        console.log(`   📋 Current subscription: ${currentSubscription.plan_name}`);
        
        if (currentSubscription.plan_name !== planName) {
          console.log(`   🔄 Updating subscription plan name...`);
          
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({ plan_name: planName })
            .eq('id', currentSubscription.id);
          
          if (updateError) {
            console.log(`   ❌ Failed to update subscription: ${updateError.message}`);
          } else {
            console.log(`   ✅ Subscription updated successfully`);
            fixedCount++;
          }
        } else {
          console.log(`   ✅ Subscription plan name is already correct`);
        }
      }
      
      console.log('---');
    }
    
    console.log(`\n🎉 Summary:`);
    console.log(`   Fixed subscriptions: ${fixedCount}`);
    console.log(`   Created subscriptions: ${createdCount}`);
    console.log(`   Total processed: ${users.users.length} users`);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Function to verify all subscriptions are correct
async function verifyAllSubscriptions() {
  console.log('🔍 Verifying all subscriptions...\n');
  
  try {
    // Get all users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Failed to fetch users:', usersError.message);
      return;
    }
    
    let correctCount = 0;
    let incorrectCount = 0;
    let missingCount = 0;
    
    for (const user of users.users) {
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        missingCount++;
        continue;
      }
      
      // Get subscription
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      
      if (subscriptionError) {
        missingCount++;
        continue;
      }
      
      // Check if plan name matches exam type
      const expectedPlanName = profile.exam_type === 'CM' ? 'Prépa CM' : 
                              profile.exam_type === 'CMS' ? 'Prépa CMS' : 
                              profile.exam_type === 'CS' ? 'Prépa CS' : 'Prépa CM';
      
      if (subscription.plan_name === expectedPlanName) {
        correctCount++;
      } else {
        incorrectCount++;
        console.log(`❌ Mismatch for ${user.email}: Profile exam_type=${profile.exam_type}, Subscription plan_name=${subscription.plan_name}`);
      }
    }
    
    console.log(`\n📊 Verification Results:`);
    console.log(`   Correct subscriptions: ${correctCount}`);
    console.log(`   Incorrect subscriptions: ${incorrectCount}`);
    console.log(`   Missing subscriptions: ${missingCount}`);
    console.log(`   Total users: ${users.users.length}`);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'fix':
      await fixAllSubscriptions();
      break;
      
    case 'verify':
      await verifyAllSubscriptions();
      break;
      
    default:
      console.log('🔧 Subscription Fix Script');
      console.log('\nAvailable commands:');
      console.log('  fix                      - Fix all subscriptions to match profile exam types');
      console.log('  verify                   - Verify all subscriptions are correct');
      console.log('\nExamples:');
      console.log('  node fix-all-subscriptions.js fix');
      console.log('  node fix-all-subscriptions.js verify');
      break;
  }
}

// Run the script
main().catch(console.error); 