#!/usr/bin/env python3
"""
Fix SupabaseAuthContext.tsx to work with current database structure
Since we can't add exam_type column right now, let's fix the code to work with what we have
"""

import re

def fix_auth_context_v2():
    """Fix the authentication context to work with current database structure"""
    
    file_path = '/Users/joasyepidan/Documents/projects/ena/project/src/contexts/SupabaseAuthContext.tsx'
    
    # Read the current file
    with open(file_path, 'r') as f:
        content = f.read()
    
    print("🔧 Fixing SupabaseAuthContext.tsx to work with current database...")
    
    # Fix 1: Remove userPlans logic and simplify to use subscriptions directly
    old_fetchUserPlans = '''  const fetchUserPlans = async () => {
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
  };'''

    new_fetchUserPlans = '''  const fetchUserPlans = async () => {
    if (!user) return;

    try {
      // Get user's profile to determine exam_type
      const { data: profileData } = await supabase
        .from('profiles')
        .select('exam_type')
        .eq('id', user.id)
        .single();

      const examType = profileData?.exam_type || 'CM';

      // Get subscriptions for this user
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching subscriptions:', error);
        setUserPlans([]);
      } else {
        // Map subscriptions to user plans format using profile's exam_type
        const userPlans = (data || []).map(sub => ({
          id: sub.id,
          user_id: sub.user_id,
          plan_name: sub.plan_name,
          exam_type: examType, // Use exam_type from profile
          is_active: sub.is_active,
          start_date: sub.start_date,
          end_date: sub.end_date,
          created_at: sub.created_at || new Date().toISOString(),
          external_subscription_id: sub.external_subscription_id
        }));
        
        setUserPlans(userPlans);
        
        // Set selected plan based on profile's exam_type
        if (userPlans.length > 0) {
          const selected = userPlans.find(plan => plan.exam_type === examType);
          setSelectedPlan(selected || userPlans[0] || null);
        }
      }
    } catch (error) {
      console.error('Error fetching user plans:', error);
      setUserPlans([]);
    }
  };'''

    content = content.replace(old_fetchUserPlans, new_fetchUserPlans)

    # Fix 2: Update addExamType to work with current structure
    old_addExamType = '''  const addExamType = async (examType: string) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      // Check if user already has this exam type
      const { data: existingPlans } = await supabase
        .from('subscriptions')
        .select('exam_type')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (existingPlans?.some(plan => plan.exam_type === examType)) {
        return { error: new Error('Vous avez déjà ce type d\'examen') };
      }

      // Create new user plan
      const planMap = {
        'CM': 'Prépa CM',
        'CMS': 'Prépa CMS',
        'CS': 'Prépa CS'
      };
      
      const planName = planMap[examType as keyof typeof planMap];
      if (!planName) {
        return { error: new Error('Type d\'examen invalide') };
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30); // 30 days from now

      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_name: planName,
          exam_type: examType,
          is_active: true,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        });

      if (!error) {
        await fetchUserPlans();
      }

      return { error };
    } catch (error) {
      console.error('Add exam type error:', error);
      return { error };
    }
  };'''

    new_addExamType = '''  const addExamType = async (examType: string) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      // Check if user already has this exam type by checking profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('exam_type')
        .eq('id', user.id)
        .single();

      if (profileData?.exam_type === examType) {
        return { error: new Error('Vous avez déjà ce type d\'examen') };
      }

      // Create new subscription
      const planMap = {
        'CM': 'Prépa CM',
        'CMS': 'Prépa CMS',
        'CS': 'Prépa CS'
      };
      
      const planName = planMap[examType as keyof typeof planMap];
      if (!planName) {
        return { error: new Error('Type d\'examen invalide') };
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30); // 30 days from now

      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_name: planName,
          is_active: true,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        });

      if (!error) {
        // Update profile with new exam type
        await updateProfile({ exam_type: examType as any });
        await fetchUserPlans();
      }

      return { error };
    } catch (error) {
      console.error('Add exam type error:', error);
      return { error };
    }
  };'''

    content = content.replace(old_addExamType, new_addExamType)

    # Fix 3: Update replaceExamType to work with current structure
    old_replaceExamType = '''  const replaceExamType = async (newExamType: string) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      // Deactivate all current plans
      const { error: deactivateError } = await supabase
        .from('subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (deactivateError) {
        console.error('Error deactivating plans:', deactivateError);
      }

      // Create new plan
      const planMap = {
        'CM': 'Prépa CM',
        'CMS': 'Prépa CMS',
        'CS': 'Prépa CS'
      };
      
      const planName = planMap[newExamType as keyof typeof planMap];
      if (!planName) {
        return { error: new Error('Type d\'examen invalide') };
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_name: planName,
          exam_type: newExamType,
          is_active: true,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        });

      if (!error) {
        // Update profile with new exam type and selected plan
        await updateProfile({ 
          exam_type: newExamType as any,
          selected_plan: newExamType as any
        });
        await fetchUserPlans();
      }

      return { error };
    } catch (error) {
      console.error('Replace exam type error:', error);
      return { error };
    }
  };'''

    new_replaceExamType = '''  const replaceExamType = async (newExamType: string) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      // Deactivate all current plans
      const { error: deactivateError } = await supabase
        .from('subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (deactivateError) {
        console.error('Error deactivating plans:', deactivateError);
      }

      // Create new plan
      const planMap = {
        'CM': 'Prépa CM',
        'CMS': 'Prépa CMS',
        'CS': 'Prépa CS'
      };
      
      const planName = planMap[newExamType as keyof typeof planMap];
      if (!planName) {
        return { error: new Error('Type d\'examen invalide') };
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_name: planName,
          is_active: true,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        });

      if (!error) {
        // Update profile with new exam type and selected plan
        await updateProfile({ 
          exam_type: newExamType as any,
          selected_plan: newExamType as any
        });
        await fetchUserPlans();
      }

      return { error };
    } catch (error) {
      console.error('Replace exam type error:', error);
      return { error };
    }
  };'''

    content = content.replace(old_replaceExamType, new_replaceExamType)

    # Write the fixed content
    with open(file_path, 'w') as f:
        f.write(content)
    
    print("✅ SupabaseAuthContext.tsx fixed successfully!")
    print("✅ Now uses profile.exam_type instead of subscription.exam_type")
    print("✅ Simplified logic to work with current database structure")

if __name__ == "__main__":
    fix_auth_context_v2()
