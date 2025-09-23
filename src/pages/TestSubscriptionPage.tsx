import React from 'react';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus';

export default function TestSubscriptionPage() {
  const { user, profile, subscription } = useSupabaseAuth();
  const {
    hasActiveSubscription,
    isSubscriptionExpired,
    canAccessFeature,
    getPlanName,
    getEndDate,
    getDaysUntilExpiry,
    getSubscriptionStatus
  } = useSubscriptionStatus();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Not Logged In</h1>
          <p className="text-gray-600">Please log in to test subscription status</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Subscription Status Test</h1>
        
        {/* User Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">User Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <p className="text-gray-900">{profile?.first_name} {profile?.last_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="text-gray-900">{user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Exam Type</label>
              <p className="text-gray-900">{profile?.exam_type}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">User ID</label>
              <p className="text-gray-900 text-xs">{user.id}</p>
            </div>
          </div>
        </div>

        {/* Subscription Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Subscription Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Plan Name</label>
              <p className="text-gray-900">{getPlanName()}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <p className="text-gray-900">{getEndDate() || 'No end date'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Days Until Expiry</label>
              <p className="text-gray-900">{getDaysUntilExpiry() || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <p className="text-gray-900">{getSubscriptionStatus()}</p>
            </div>
          </div>
        </div>

        {/* Access Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Access Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
              <span className="font-medium">Has Active Subscription</span>
              <span className={`px-3 py-1 rounded-full text-sm ${
                hasActiveSubscription ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {hasActiveSubscription ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
              <span className="font-medium">Subscription Expired</span>
              <span className={`px-3 py-1 rounded-full text-sm ${
                isSubscriptionExpired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              }`}>
                {isSubscriptionExpired ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
              <span className="font-medium">Can Access Quiz</span>
              <span className={`px-3 py-1 rounded-full text-sm ${
                canAccessFeature('quiz') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {canAccessFeature('quiz') ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
              <span className="font-medium">Can Access Practice</span>
              <span className={`px-3 py-1 rounded-full text-sm ${
                canAccessFeature('practice') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {canAccessFeature('practice') ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
              <span className="font-medium">Can Access Exams</span>
              <span className={`px-3 py-1 rounded-full text-sm ${
                canAccessFeature('exams') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {canAccessFeature('exams') ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        {/* Raw Data */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Raw Subscription Data</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(subscription, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
