#!/usr/bin/env python3
"""
Fix SupabaseAuthContext.tsx to use subscriptions table instead of user_plans
"""

import re

def fix_auth_context():
    """Fix the authentication context to use subscriptions instead of user_plans"""
    
    file_path = '/Users/joasyepidan/Documents/projects/ena/project/src/contexts/SupabaseAuthContext.tsx'
    
    # Read the current file
    with open(file_path, 'r') as f:
        content = f.read()
    
    print("🔧 Fixing SupabaseAuthContext.tsx to use subscriptions table...")
    
    # Replace user_plans with subscriptions
    content = content.replace("from('user_plans')", "from('subscriptions')")
    
    # Update the interface to match subscriptions table structure
    old_interface = """export interface UserPlan {
  id: string
  user_id: string
  plan_name: 'Prépa CM' | 'Prépa CMS' | 'Prépa CS'
  exam_type: 'CM' | 'CMS' | 'CS'
  is_active: boolean
  start_date: string
  end_date: string
  created_at: string
}"""

    new_interface = """export interface UserPlan {
  id: string
  user_id: string
  plan_name: 'Prépa CM' | 'Prépa CMS' | 'Prépa CS'
  exam_type: 'CM' | 'CMS' | 'CS'  // Derived from plan_name
  is_active: boolean
  start_date: string
  end_date: string
  created_at: string
  external_subscription_id: string | null
}"""

    content = content.replace(old_interface, new_interface)
    
    # Update the fetchUserPlans function to map subscriptions to user plans
    old_fetch_function = """  const fetchUserPlans = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user plans:', error);
        setUserPlans([]);
      } else {
        setUserPlans(data || []);
        
        // Set selected plan based on profile's selected_plan
        if (profile?.selected_plan && data) {
          const selected = data.find(plan => plan.exam_type === profile.selected_plan);
          setSelectedPlan(selected || data[0] || null);
        } else if (data && data.length > 0) {
          setSelectedPlan(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching user plans:', error);
      setUserPlans([]);
    }
  };"""

    new_fetch_function = """  const fetchUserPlans = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user plans:', error);
        setUserPlans([]);
      } else {
        // Map subscriptions to user plans format
        const userPlans = (data || []).map(sub => ({
          id: sub.id,
          user_id: sub.user_id,
          plan_name: sub.plan_name,
          exam_type: sub.plan_name === 'Prépa CM' ? 'CM' : 
                    sub.plan_name === 'Prépa CMS' ? 'CMS' : 
                    sub.plan_name === 'Prépa CS' ? 'CS' : 'CM',
          is_active: sub.is_active,
          start_date: sub.start_date,
          end_date: sub.end_date,
          created_at: sub.created_at || new Date().toISOString(),
          external_subscription_id: sub.external_subscription_id
        }));
        
        setUserPlans(userPlans);
        
        // Set selected plan based on profile's selected_plan
        if (profile?.selected_plan && userPlans.length > 0) {
          const selected = userPlans.find(plan => plan.exam_type === profile.selected_plan);
          setSelectedPlan(selected || userPlans[0] || null);
        } else if (userPlans.length > 0) {
          setSelectedPlan(userPlans[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching user plans:', error);
      setUserPlans([]);
    }
  };"""

    content = content.replace(old_fetch_function, new_fetch_function)
    
    # Update other functions that reference user_plans
    content = content.replace(
        "const { data: existingPlans } = await supabase\n        .from('user_plans')",
        "const { data: existingPlans } = await supabase\n        .from('subscriptions')"
    )
    
    content = content.replace(
        "const { error: deactivateError } = await supabase\n        .from('user_plans')",
        "const { error: deactivateError } = await supabase\n        .from('subscriptions')"
    )
    
    content = content.replace(
        "const { error } = await supabase\n        .from('user_plans')",
        "const { error } = await supabase\n        .from('subscriptions')"
    )
    
    # Write the fixed content back
    with open(file_path, 'w') as f:
        f.write(content)
    
    print("✅ SupabaseAuthContext.tsx updated successfully!")
    print("📋 Changes made:")
    print("   - Replaced user_plans table references with subscriptions")
    print("   - Updated UserPlan interface to match subscriptions structure")
    print("   - Added mapping from subscriptions to user plans format")
    print("   - Updated all CRUD operations to use subscriptions table")

if __name__ == "__main__":
    fix_auth_context()

