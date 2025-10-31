#!/usr/bin/env python3
"""
Quick verification script to check if environment variables are set correctly.
Run this to verify your .env setup before using the application.
"""

import os
import sys

try:
    from dotenv import load_dotenv
    load_dotenv()
    print("✅ python-dotenv is installed and .env file loaded")
except ImportError:
    print("⚠️  python-dotenv not installed - .env file won't auto-load")
    print("   You'll need to manually export environment variables")
except Exception as e:
    print(f"⚠️  Error loading .env: {e}")

print("\n" + "="*60)
print("ENVIRONMENT VARIABLE VERIFICATION")
print("="*60 + "\n")

# Check Python/Backend variables
print("🔧 Backend/Python Scripts:")
print("-" * 60)

supabase_url = os.getenv("SUPABASE_URL")
supabase_service_key = os.getenv("SUPABASE_SERVICE_KEY")

if supabase_url:
    if supabase_url == "https://your-project.supabase.co":
        print("❌ SUPABASE_URL is still a placeholder")
    elif "supabase.co" in supabase_url:
        print(f"✅ SUPABASE_URL: {supabase_url}")
    else:
        print(f"⚠️  SUPABASE_URL: {supabase_url} (unexpected format)")
else:
    print("❌ SUPABASE_URL not set")

if supabase_service_key:
    if supabase_service_key == "your-service-role-key":
        print("❌ SUPABASE_SERVICE_KEY is still a placeholder")
    elif len(supabase_service_key) > 20:
        print(f"✅ SUPABASE_SERVICE_KEY: {supabase_service_key[:20]}... (hidden)")
    else:
        print(f"⚠️  SUPABASE_SERVICE_KEY seems too short")
else:
    print("❌ SUPABASE_SERVICE_KEY not set")

# Check API keys
openai_key = os.getenv("OPENAI_API_KEY")
gemini_key = os.getenv("GEMINI_API_KEY")
anthropic_key = os.getenv("ANTHROPIC_API_KEY")

if openai_key:
    if openai_key == "your-openai-api-key":
        print("⚠️  OPENAI_API_KEY is still a placeholder")
    else:
        print(f"✅ OPENAI_API_KEY: Set ({openai_key[:10]}...)")
else:
    print("⚠️  OPENAI_API_KEY not set (optional)")

if gemini_key:
    if gemini_key == "your-gemini-api-key":
        print("⚠️  GEMINI_API_KEY is still a placeholder")
    else:
        print(f"✅ GEMINI_API_KEY: Set ({gemini_key[:10]}...)")
else:
    print("⚠️  GEMINI_API_KEY not set (optional)")

if anthropic_key:
    if anthropic_key == "your-anthropic-api-key":
        print("⚠️  ANTHROPIC_API_KEY is still a placeholder")
    else:
        print(f"✅ ANTHROPIC_API_KEY: Set ({anthropic_key[:10]}...)")
else:
    print("⚠️  ANTHROPIC_API_KEY not set (optional)")

# Check Frontend variables
print("\n🌐 Frontend (Vite):")
print("-" * 60)

vite_supabase_url = os.getenv("VITE_SUPABASE_URL")
vite_supabase_anon_key = os.getenv("VITE_SUPABASE_ANON_KEY")

if vite_supabase_url:
    if vite_supabase_url == "https://your-project.supabase.co":
        print("❌ VITE_SUPABASE_URL is still a placeholder")
    elif "supabase.co" in vite_supabase_url:
        print(f"✅ VITE_SUPABASE_URL: {vite_supabase_url}")
    else:
        print(f"⚠️  VITE_SUPABASE_URL: {vite_supabase_url} (unexpected format)")
else:
    print("❌ VITE_SUPABASE_URL not set")

if vite_supabase_anon_key:
    if vite_supabase_anon_key == "your-supabase-anon-key":
        print("❌ VITE_SUPABASE_ANON_KEY is still a placeholder")
    elif len(vite_supabase_anon_key) > 20:
        print(f"✅ VITE_SUPABASE_ANON_KEY: {vite_supabase_anon_key[:20]}... (hidden)")
    else:
        print(f"⚠️  VITE_SUPABASE_ANON_KEY seems too short")
else:
    print("❌ VITE_SUPABASE_ANON_KEY not set")

# Test actual Supabase connection
print("\n🔌 Testing Supabase Connection:")
print("-" * 60)

if supabase_url and supabase_service_key and supabase_url != "https://your-project.supabase.co" and supabase_service_key != "your-service-role-key":
    try:
        from supabase import create_client
        client = create_client(supabase_url, supabase_service_key)
        
        # Try a simple query to test connection
        try:
            # Try to get a count or simple query
            result = client.table("profiles").select("id", count="exact").limit(1).execute()
            print("✅ Supabase connection successful!")
            print(f"   Database is accessible")
        except Exception as e:
            error_msg = str(e)
            if "Invalid API key" in error_msg or "JWT" in error_msg:
                print("❌ Supabase connection failed: Invalid API key")
            elif "Failed to fetch" in error_msg or "network" in error_msg.lower():
                print("❌ Supabase connection failed: Network error")
                print(f"   Check your internet connection and URL: {supabase_url}")
            else:
                print(f"⚠️  Connection attempt made, but got error: {error_msg[:100]}")
    except ImportError:
        print("❌ Supabase Python client not installed")
        print("   Run: pip install supabase")
    except Exception as e:
        print(f"❌ Failed to create Supabase client: {e}")
else:
    print("⚠️  Skipping connection test (credentials not properly set)")

print("\n" + "="*60)
print("VERIFICATION COMPLETE")
print("="*60 + "\n")

# Summary
required_ok = (
    supabase_url and supabase_url != "https://your-project.supabase.co" and
    supabase_service_key and supabase_service_key != "your-service-role-key" and
    vite_supabase_url and vite_supabase_url != "https://your-project.supabase.co" and
    vite_supabase_anon_key and vite_supabase_anon_key != "your-supabase-anon-key"
)

if required_ok:
    print("✅ All required environment variables are set correctly!")
    print("   You can now run Python scripts and start the frontend.")
else:
    print("❌ Some required environment variables are missing or still have placeholder values.")
    print("   Please update your .env file with actual API keys.")
    sys.exit(1)

