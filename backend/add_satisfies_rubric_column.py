#!/usr/bin/env python3
"""
Database migration script to add ai_satisfies_rubric column to grades table
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine, SessionLocal
from app.models.grade import Grade

def add_satisfies_rubric_column():
    """Add ai_satisfies_rubric column to grades table"""
    db = SessionLocal()
    
    try:
        # Check if column already exists
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='grades' AND column_name='ai_satisfies_rubric'
        """))
        
        if result.fetchone():
            print("Column ai_satisfies_rubric already exists in grades table")
            return
        
        # Add the column
        db.execute(text("""
            ALTER TABLE grades 
            ADD COLUMN ai_satisfies_rubric BOOLEAN DEFAULT FALSE
        """))
        
        # Update existing records - assume they don't satisfy rubric if they have feedback
        db.execute(text("""
            UPDATE grades 
            SET ai_satisfies_rubric = CASE 
                WHEN ai_score = (
                    SELECT COALESCE(
                        CAST(JSON_EXTRACT(rubric_json, CONCAT('$.', question_no, '.max_points')) AS UNSIGNED), 
                        10
                    )
                    FROM assignments a 
                    JOIN submissions s ON s.assignment_id = a.id 
                    WHERE s.id = grades.submission_id
                ) AND (ai_feedback IS NULL OR ai_feedback = '') 
                THEN TRUE 
                ELSE FALSE 
            END
        """))
        
        db.commit()
        print("Successfully added ai_satisfies_rubric column to grades table")
        
    except Exception as e:
        db.rollback()
        # For SQLite, try a different approach
        if "information_schema" in str(e):
            try:
                # SQLite approach
                db.execute(text("ALTER TABLE grades ADD COLUMN ai_satisfies_rubric BOOLEAN DEFAULT 0"))
                
                # Update existing records for SQLite
                db.execute(text("""
                    UPDATE grades 
                    SET ai_satisfies_rubric = 0
                    WHERE ai_feedback IS NOT NULL AND ai_feedback != ''
                """))
                
                db.execute(text("""
                    UPDATE grades 
                    SET ai_satisfies_rubric = 1
                    WHERE ai_feedback IS NULL OR ai_feedback = ''
                """))
                
                db.commit()
                print("Successfully added ai_satisfies_rubric column to grades table (SQLite)")
                
            except Exception as sqlite_e:
                if "duplicate column" in str(sqlite_e).lower():
                    print("Column ai_satisfies_rubric already exists in grades table")
                else:
                    print(f"Error adding column: {sqlite_e}")
                    db.rollback()
        else:
            print(f"Error adding column: {e}")
            db.rollback()
    
    finally:
        db.close()

if __name__ == "__main__":
    add_satisfies_rubric_column()
