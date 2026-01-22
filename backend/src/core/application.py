from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

from src.core.job import Job, ApplicationType


class ApplicationStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    NEEDS_REVIEW = "needs_review"
    SUBMITTED = "submitted"
    FAILED = "failed"
    SKIPPED = "skipped"


class ApplicationQuestion(BaseModel):
    field_name: str = ""
    question_text: str
    question_type: str = "text"
    required: bool = True
    options: list[str] = Field(default_factory=list)
    answer: Optional[str] = None
    answered_by: str = "auto"
    needs_review: bool = False
    review_reason: str = ""


class ApplicationLog(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.now)
    action: str
    details: str = ""
    screenshot_path: Optional[str] = None


class Application(BaseModel):
    id: Optional[str] = Field(default=None)
    job_id: str = Field(...)
    job_title: str = ""
    company: str = ""
    job_url: str = ""
    application_type: ApplicationType = ApplicationType.UNKNOWN
    status: ApplicationStatus = Field(default=ApplicationStatus.PENDING)
    created_at: datetime = Field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    current_step: int = 0
    total_steps: Optional[int] = None
    current_page_url: Optional[str] = None
    questions: list[ApplicationQuestion] = Field(default_factory=list)
    logs: list[ApplicationLog] = Field(default_factory=list)
    error_message: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    resume_uploaded: bool = False
    cover_letter_uploaded: bool = False
    screenshots: list[str] = Field(default_factory=list)
    questions_for_review: dict[str, str] = Field(default_factory=dict)
    
    class Config:
        use_enum_values = True
    
    @classmethod
    def from_job(cls, job: Job) -> "Application":
        return cls(
            job_id=job.id or str(hash(job.url)),
            job_title=job.title,
            company=job.company,
            job_url=job.url,
            application_type=job.application_type,
        )
    
    def start(self) -> None:
        self.status = ApplicationStatus.IN_PROGRESS
        self.started_at = datetime.now()
        self.add_log("started", "Application started")
    
    def complete(self) -> None:
        self.status = ApplicationStatus.SUBMITTED
        self.completed_at = datetime.now()
        self.add_log("submitted", "Application submitted successfully")
    
    def fail(self, error: str) -> None:
        self.status = ApplicationStatus.FAILED
        self.error_message = error
        self.completed_at = datetime.now()
        self.add_log("failed", f"Application failed: {error}")
    
    def request_review(self, reason: str) -> None:
        self.status = ApplicationStatus.NEEDS_REVIEW
        self.add_log("needs_review", f"Review needed: {reason}")
    
    def skip(self, reason: str = "") -> None:
        self.status = ApplicationStatus.SKIPPED
        self.add_log("skipped", f"Skipped: {reason}")
    
    def add_log(self, action: str, details: str = "", screenshot: str = None) -> None:
        self.logs.append(ApplicationLog(
            action=action,
            details=details,
            screenshot_path=screenshot
        ))
    
    def add_question(
        self, 
        question_text: str, 
        field_name: str = "",
        question_type: str = "text",
        required: bool = True,
        options: list[str] = None
    ) -> ApplicationQuestion:
        question = ApplicationQuestion(
            field_name=field_name,
            question_text=question_text,
            question_type=question_type,
            required=required,
            options=options or []
        )
        self.questions.append(question)
        return question
    
    def answer_question(self, question_index: int, answer: str, answered_by: str = "auto") -> None:
        if 0 <= question_index < len(self.questions):
            self.questions[question_index].answer = answer
            self.questions[question_index].answered_by = answered_by
    
    def get_unanswered_questions(self) -> list[ApplicationQuestion]:
        return [q for q in self.questions if q.answer is None and q.required]
    
    def get_questions_needing_review(self) -> list[ApplicationQuestion]:
        return [q for q in self.questions if q.needs_review]
    
    @property
    def can_retry(self) -> bool:
        return self.retry_count < self.max_retries
    
    @property
    def progress_percent(self) -> float:
        if self.total_steps and self.total_steps > 0:
            return (self.current_step / self.total_steps) * 100
        return 0.0
    
    @property
    def duration_seconds(self) -> Optional[float]:
        if self.started_at:
            end = self.completed_at or datetime.now()
            return (end - self.started_at).total_seconds()
        return None
    
    def to_summary(self) -> dict:
        return {
            "job_title": self.job_title,
            "company": self.company,
            "status": self.status,
            "questions_count": len(self.questions),
            "questions_needing_review": len(self.get_questions_needing_review()),
            "url": self.job_url,
        }
    
    def __str__(self) -> str:
        return f"Application for {self.job_title} at {self.company} [{self.status}]"
