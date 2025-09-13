from celery import Celery
from sqlalchemy.orm import Session
from ..core.config import settings
from ..core.database import SessionLocal
from ..models.submission import Submission, SubmissionStatus
from ..models.assignment import Assignment
from ..models.grade import Grade
from .latex_parser import parse_latex_submission
from .llm_service import grade_submission_questions

# Initialize Celery
celery_app = Celery(
    'grading_service',
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

# Configure Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max per task
    task_soft_time_limit=240,  # 4 minutes soft limit
)


@celery_app.task(bind=True)
def trigger_grading(self, submission_id: int):
    """
    Celery task to grade a submission asynchronously
    
    Args:
        submission_id: ID of the submission to grade
    """
    db = SessionLocal()
    
    try:
        # Update task progress
        self.update_state(state='PROGRESS', meta={'current': 0, 'total': 100})
        
        # Get submission
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if not submission:
            raise Exception(f"Submission {submission_id} not found")
        
        # Update status to processing
        submission.status = SubmissionStatus.PROCESSING
        db.commit()
        
        self.update_state(state='PROGRESS', meta={'current': 20, 'total': 100, 'status': 'Parsing LaTeX'})
        
        # Parse LaTeX file
        try:
            parsed_questions = parse_latex_submission(submission.file_path)
            submission.parsed_json = parsed_questions
            db.commit()
        except Exception as e:
            submission.status = SubmissionStatus.ERROR
            db.commit()
            raise Exception(f"LaTeX parsing failed: {str(e)}")
        
        self.update_state(state='PROGRESS', meta={'current': 40, 'total': 100, 'status': 'Loading assignment data'})
        
        # Get assignment and rubric
        assignment = db.query(Assignment).filter(Assignment.id == submission.assignment_id).first()
        if not assignment:
            raise Exception(f"Assignment {submission.assignment_id} not found")
        
        self.update_state(state='PROGRESS', meta={'current': 60, 'total': 100, 'status': 'Grading with AI'})
        
        # Grade using LLM
        try:
            grading_results = grade_submission_questions(
                questions_answers=parsed_questions,
                answer_key=assignment.answer_key_json,
                rubric=assignment.rubric_json
            )
        except Exception as e:
            submission.status = SubmissionStatus.ERROR
            db.commit()
            raise Exception(f"AI grading failed: {str(e)}")
        
        self.update_state(state='PROGRESS', meta={'current': 80, 'total': 100, 'status': 'Saving grades'})
        
        # Save grades to database
        total_score = 0
        
        # Clear existing grades for this submission
        db.query(Grade).filter(Grade.submission_id == submission_id).delete()
        
        for question_id, result in grading_results.items():
            grade = Grade(
                submission_id=submission_id,
                question_no=question_id,
                ai_score=result.score,
                ai_feedback=result.feedback,
                ai_satisfies_rubric=result.satisfies_rubric,
                final_score=result.score,  # Initially same as AI score
                final_feedback=result.feedback,  # Initially same as AI feedback
                human_reviewed=False
            )
            db.add(grade)
            total_score += result.score
        
        # Update submission
        submission.total_score = total_score
        submission.status = SubmissionStatus.GRADED
        db.commit()
        
        self.update_state(state='SUCCESS', meta={'current': 100, 'total': 100, 'status': 'Grading completed'})
        
        return {
            'submission_id': submission_id,
            'total_score': total_score,
            'questions_graded': len(grading_results)
        }
        
    except Exception as e:
        # Update submission status to error
        if 'submission' in locals():
            submission.status = SubmissionStatus.ERROR
            db.commit()
        
        # Update task state
        self.update_state(
            state='FAILURE',
            meta={'error': str(e)}
        )
        raise
    
    finally:
        db.close()


@celery_app.task
def cleanup_old_tasks():
    """Periodic task to clean up old Celery task results"""
    # This would be implemented to clean up old task results from Redis
    # For now, it's a placeholder
    pass


def get_task_status(task_id: str):
    """Get the status of a grading task"""
    result = celery_app.AsyncResult(task_id)
    
    if result.state == 'PENDING':
        return {'state': 'PENDING', 'status': 'Task is waiting to be processed'}
    elif result.state == 'PROGRESS':
        return {
            'state': 'PROGRESS',
            'current': result.info.get('current', 0),
            'total': result.info.get('total', 100),
            'status': result.info.get('status', '')
        }
    elif result.state == 'SUCCESS':
        return {
            'state': 'SUCCESS',
            'result': result.info
        }
    else:  # FAILURE
        return {
            'state': 'FAILURE',
            'error': str(result.info)
        }
