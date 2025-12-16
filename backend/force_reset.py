from database import SessionLocal, UserActivity
import os
import shutil

def force_reset():
    print("--- STARTING FORCE RESET ---")
    db = SessionLocal()
    try:
        # 1. DELETE FROM DB
        rows_deleted = db.query(UserActivity).delete()
        db.commit()
        print(f"✅ Database: Deleted {rows_deleted} rows from 'user_activities'.")

        # 2. DELETE FILES
        upload_dir = "./uploads"
        if os.path.exists(upload_dir):
            # Iterate and remove files
            count = 0
            for filename in os.listdir(upload_dir):
                file_path = os.path.join(upload_dir, filename)
                try:
                    if os.path.isfile(file_path) or os.path.islink(file_path):
                        os.unlink(file_path)
                        count += 1
                    elif os.path.isdir(file_path):
                        shutil.rmtree(file_path)
                        count += 1
                except Exception as e:
                    print(f"Failed to delete {file_path}. Reason: {e}")
            print(f"✅ Filesystem: Removed {count} files from '{upload_dir}'.")
        else:
            print(f"ℹ️ Filesystem: '{upload_dir}' does not exist (nothing to delete).")

    except Exception as e:
        print(f"❌ ERROR: {e}")
        db.rollback()
    finally:
        db.close()
        print("--- RESET COMPLETE ---")

if __name__ == "__main__":
    force_reset()
