from database import init_db

if __name__ == "__main__":
    print("🔄 Custom Script: Initializing Database Tables...")
    try:
        init_db()
        print("✅ Custom Script: Database tables created successfully!")
    except Exception as e:
        print(f"❌ Custom Script Error: {e}")
        # We don't exit(1) so the server can still try to start, 
        # or we could exit(1) to fail the deployment. 
        # For now, let's print and finish.
